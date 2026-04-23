import type { ImageTextRequest, LlmModelInfo, LlmProviderDefinition, TextRequest } from '../types'
import { recordLlmUsage } from '../usageTracker'

const OPENAI_API = 'https://api.openai.com/v1'

function buildHeaders(apiKey: string) {
  return {
    authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  }
}

async function extractErrorMessage(response: Response): Promise<string> {
  const err = await response.json().catch(() => ({}))
  return (err as { error?: { message?: string } }).error?.message ?? `API error ${response.status}`
}

function parseChoiceContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (!item || typeof item !== 'object') return ''
        const block = item as { type?: string; text?: string }
        return block.type === 'text' && typeof block.text === 'string' ? block.text : ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

interface ParsedChatCompletion {
  content: string
  finishReason: string | null
  usage: {
    inputTokens: number
    outputTokens: number
    reasoningTokens: number
  }
}

async function parseChatCompletion(response: Response): Promise<ParsedChatCompletion> {
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }
  const data = await response.json() as {
    choices?: Array<{ message?: { content?: unknown }; finish_reason?: string | null }>
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      completion_tokens_details?: {
        reasoning_tokens?: number
      }
    }
  }
  return {
    content: parseChoiceContent(data.choices?.[0]?.message?.content).trim(),
    finishReason: data.choices?.[0]?.finish_reason ?? null,
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
    },
  }
}

function toLabel(modelId: string): string {
  return modelId
}

function isUsefulChatModel(modelId: string): boolean {
  if (/^(text-embedding|whisper|tts|dall-e|omni-moderation|gpt-image-)/.test(modelId)) return false
  return /^(gpt-|o1|o3|o4)/.test(modelId)
}

async function fetchModelList(apiKey: string): Promise<LlmModelInfo[]> {
  const response = await fetch(`${OPENAI_API}/models`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
  })
  if (!response.ok) {
    throw new Error(`Model list unavailable (${response.status})`)
  }
  const data = await response.json() as { data?: Array<{ id: string }> }
  const models = (data.data ?? [])
    .map(model => model.id)
    .filter(isUsefulChatModel)
    .sort((a, b) => a.localeCompare(b))
    .map(id => ({
      id,
      label: toLabel(id),
      provider: 'openai' as const,
    }))
  return models
}

function supportsOnlyCompletionTokens(errorMessage: string): boolean {
  return errorMessage.includes("Unsupported parameter: 'max_tokens'")
    || errorMessage.includes("Use 'max_completion_tokens' instead")
}

function supportsOnlyMaxTokens(errorMessage: string): boolean {
  return errorMessage.includes("Unsupported parameter: 'max_completion_tokens'")
    || errorMessage.includes("Use 'max_tokens' instead")
}

function reasoningEffortFromThinkingTokens(thinkingTokens?: number): 'minimal' | 'low' | 'medium' | 'high' | undefined {
  if (!thinkingTokens || thinkingTokens <= 0) return undefined
  if (thinkingTokens <= 512) return 'minimal'
  if (thinkingTokens <= 3072) return 'low'
  return 'medium'
}

async function chatCompletionWithTokenFallback(
  apiKey: string,
  payload: {
    model: string
    messages: Array<{ role: string; content: unknown }>
    reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high'
  },
  maxCompletionTokens: number,
): Promise<Response> {
  const request = (tokenField: 'max_completion_tokens' | 'max_tokens') =>
    fetch(`${OPENAI_API}/chat/completions`, {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify({
        ...payload,
        [tokenField]: maxCompletionTokens,
      }),
    })

  // Prefer max_completion_tokens for newer model families.
  const first = await request('max_completion_tokens')
  if (first.ok) return first

  const firstErrorMessage = await extractErrorMessage(first)
  if (supportsOnlyMaxTokens(firstErrorMessage)) {
    const retry = await request('max_tokens')
    if (retry.ok) return retry
    throw new Error(await extractErrorMessage(retry))
  }
  if (supportsOnlyCompletionTokens(firstErrorMessage)) {
    // Already used max_completion_tokens, preserve original error for clarity.
    throw new Error(firstErrorMessage)
  }
  throw new Error(firstErrorMessage)
}

function createOpenAiClient(apiKey: string) {
  function recordUsage(
    req: { model: string; feature: TextRequest['feature'] | ImageTextRequest['feature']; mode: 'text' | 'vision'; context?: Record<string, number> },
    parsed: ParsedChatCompletion,
  ) {
    recordLlmUsage({
      provider: 'openai',
      model: req.model,
      feature: req.feature,
      mode: req.mode,
      inputTokens: parsed.usage.inputTokens,
      outputTokens: parsed.usage.outputTokens,
      reasoningTokens: parsed.usage.reasoningTokens,
      context: req.context ?? {},
    })
  }

  return {
    async listModels() {
      if (!apiKey) throw new Error('Enter an API key to load models.')
      return fetchModelList(apiKey)
    },

    async completeText(req: TextRequest) {
      const completionBudget = req.maxTokens + Math.max(req.thinkingTokens ?? 0, 0)
      const payload = {
        model: req.model,
        reasoning_effort: reasoningEffortFromThinkingTokens(req.thinkingTokens),
        messages: [
          ...(req.system ? [{ role: 'system', content: req.system }] : []),
          { role: 'user', content: req.prompt },
        ],
      }

      const response = await chatCompletionWithTokenFallback(
        apiKey,
        payload,
        completionBudget,
      )
      const parsed = await parseChatCompletion(response)
      recordUsage({ model: req.model, feature: req.feature, mode: 'text', context: req.context }, parsed)
      if (parsed.finishReason !== 'length') return parsed.content

      // If output was truncated, retry once with a larger completion budget and less reasoning.
      const retryResponse = await chatCompletionWithTokenFallback(
        apiKey,
        { ...payload, reasoning_effort: 'minimal' },
        Math.max(completionBudget * 2, req.maxTokens + 4096),
      )
      const retried = await parseChatCompletion(retryResponse)
      recordUsage({ model: req.model, feature: req.feature, mode: 'text', context: req.context }, retried)
      return retried.content
    },

    async completeFromImage(req: ImageTextRequest) {
      const response = await chatCompletionWithTokenFallback(
        apiKey,
        {
          model: req.model,
          messages: [
            ...(req.system ? [{ role: 'system', content: req.system }] : []),
            {
              role: 'user',
              content: [
                { type: 'text', text: req.prompt },
                {
                  type: 'image_url',
                  image_url: { url: `data:${req.mimeType};base64,${req.imageBase64}` },
                },
              ],
            },
          ],
        },
        req.maxTokens,
      )
      const parsed = await parseChatCompletion(response)
      recordUsage({ model: req.model, feature: req.feature, mode: 'vision', context: req.context }, parsed)
      return parsed.content
    },
  }
}

export const openAiProvider: LlmProviderDefinition = {
  id: 'openai',
  label: 'OpenAI',
  apiKeyLabel: 'OpenAI API key',
  apiKeyPlaceholder: 'sk-...',
  apiKeyCreateUrl: 'https://platform.openai.com/api-keys',
  pricingUrl: 'https://platform.openai.com/docs/pricing',
  defaultTextModel: 'gpt-4o-mini',
  defaultVisionModel: 'gpt-4o-mini',
  createClient: createOpenAiClient,
}
