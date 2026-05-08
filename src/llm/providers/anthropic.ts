import type { ImageTextRequest, LlmModelInfo, LlmProviderDefinition, StreamTextHandlers, TextRequest } from '../types'
import { recordLlmUsage } from '../usageTracker'
import { parseJsonSseData, parseSseStream, type SseEvent } from './sse'

const ANTHROPIC_API = 'https://api.anthropic.com/v1'
const ANTHROPIC_VERSION = '2023-06-01'
const ANTHROPIC_BROWSER_HEADER = 'anthropic-dangerous-direct-browser-access'
const MIN_THINKING_BUDGET_TOKENS = 1024

function buildHeaders(apiKey: string, withJsonContent = true) {
  return {
    ...(withJsonContent ? { 'content-type': 'application/json' } : {}),
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    [ANTHROPIC_BROWSER_HEADER]: 'true',
  }
}

interface ParsedAnthropicUsage {
  inputTokens: number
  outputTokens: number
  cacheWriteTokens: number
  cacheReadTokens: number
}

interface AnthropicStreamEventData {
  type?: string
  delta?: {
    type?: string
    text?: string
  }
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}

function usageFromAnthropicEvent(data?: AnthropicStreamEventData['usage']): ParsedAnthropicUsage | null {
  if (!data) return null
  return {
    inputTokens: data.input_tokens ?? 0,
    outputTokens: data.output_tokens ?? 0,
    cacheWriteTokens: data.cache_creation_input_tokens ?? 0,
    cacheReadTokens: data.cache_read_input_tokens ?? 0,
  }
}

async function parseResponse(
  response: Response,
  req: { model: string; feature: TextRequest['feature'] | ImageTextRequest['feature']; mode: 'text' | 'vision'; context?: Record<string, number> },
): Promise<string> {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ?? `API error ${response.status}`
    )
  }
  const data = await response.json() as {
    content: Array<{ type: string; text: string }>
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
  const usage = usageFromAnthropicEvent(data.usage) ?? {
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
  }
  recordLlmUsage({
    provider: 'anthropic',
    model: req.model,
    feature: req.feature,
    mode: req.mode,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    reasoningTokens: 0,
    context: {
      cacheWriteInputTokens: usage.cacheWriteTokens,
      cacheReadInputTokens: usage.cacheReadTokens,
      ...(req.context ?? {}),
    },
  })
  return data.content.find(block => block.type === 'text')?.text ?? ''
}

export function parseAnthropicStreamEvent(event: SseEvent): {
  delta: string
  usage: ParsedAnthropicUsage | null
} | null {
  const data = parseJsonSseData<AnthropicStreamEventData>(event)
  if (!data) return null
  if (event.event === 'content_block_delta' && data.delta?.type === 'text_delta') {
    return {
      delta: data.delta.text ?? '',
      usage: usageFromAnthropicEvent(data.usage),
    }
  }
  if (event.event === 'message_start' || event.event === 'message_delta' || event.event === 'message_stop') {
    return {
      delta: '',
      usage: usageFromAnthropicEvent(data.usage),
    }
  }
  return null
}

function normalizeLabel(id: string, displayName?: string) {
  if (displayName && displayName.trim().length > 0) return displayName
  return id
}

function normalizeThinkingBudget(thinkingTokens?: number) {
  if (!thinkingTokens || thinkingTokens <= 0) return 0
  return Math.max(MIN_THINKING_BUDGET_TOKENS, thinkingTokens)
}

async function fetchModelList(apiKey: string): Promise<LlmModelInfo[]> {
  const response = await fetch(`${ANTHROPIC_API}/models`, {
    method: 'GET',
    headers: buildHeaders(apiKey, false),
  })
  if (!response.ok) {
    throw new Error(`Model list unavailable (${response.status})`)
  }
  const data = await response.json() as {
    data?: Array<{ id: string; display_name?: string; type?: string }>
  }
  const models = (data.data ?? [])
    .filter(model => model.id && (!model.type || model.type === 'model'))
    .map(model => ({
      id: model.id,
      label: normalizeLabel(model.id, model.display_name),
      provider: 'anthropic' as const,
    }))
  return models
}

function createAnthropicClient(apiKey: string) {
  return {
    async listModels() {
      if (!apiKey) throw new Error('Enter an API key to load models.')
      return fetchModelList(apiKey)
    },

    async completeText(req: TextRequest) {
      const thinkingBudget = normalizeThinkingBudget(req.thinkingTokens)
      const response = await fetch(`${ANTHROPIC_API}/messages`, {
        method: 'POST',
        headers: buildHeaders(apiKey),
        body: JSON.stringify({
          model: req.model,
          max_tokens: thinkingBudget + req.maxTokens,
          thinking: thinkingBudget > 0
            ? { type: 'enabled', budget_tokens: thinkingBudget }
            : undefined,
          system: req.system,
          messages: [{ role: 'user', content: req.prompt }],
        }),
      })
      return parseResponse(response, {
        model: req.model,
        feature: req.feature,
        mode: 'text',
        context: req.context,
      })
    },

    async streamText(req: TextRequest, handlers: StreamTextHandlers = {}) {
      const thinkingBudget = normalizeThinkingBudget(req.thinkingTokens)
      const response = await fetch(`${ANTHROPIC_API}/messages`, {
        method: 'POST',
        headers: buildHeaders(apiKey),
        body: JSON.stringify({
          model: req.model,
          max_tokens: thinkingBudget + req.maxTokens,
          stream: true,
          thinking: thinkingBudget > 0
            ? { type: 'enabled', budget_tokens: thinkingBudget }
            : undefined,
          system: req.system,
          messages: [{ role: 'user', content: req.prompt }],
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(
          (err as { error?: { message?: string } }).error?.message ?? `API error ${response.status}`
        )
      }
      if (!response.body) {
        throw new Error('Streaming response body was unavailable.')
      }

      let content = ''
      let usage: ParsedAnthropicUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheWriteTokens: 0,
        cacheReadTokens: 0,
      }

      for await (const event of parseSseStream(response.body)) {
        const parsed = parseAnthropicStreamEvent(event)
        if (!parsed) continue
        if (parsed.delta) {
          content += parsed.delta
          handlers.onDelta?.(parsed.delta)
        }
        if (parsed.usage) usage = parsed.usage
      }

      recordLlmUsage({
        provider: 'anthropic',
        model: req.model,
        feature: req.feature,
        mode: 'text',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        reasoningTokens: 0,
        context: {
          cacheWriteInputTokens: usage.cacheWriteTokens,
          cacheReadInputTokens: usage.cacheReadTokens,
          ...(req.context ?? {}),
        },
      })

      return content
    },

    async completeFromImage(req: ImageTextRequest) {
      const response = await fetch(`${ANTHROPIC_API}/messages`, {
        method: 'POST',
        headers: buildHeaders(apiKey),
        body: JSON.stringify({
          model: req.model,
          max_tokens: req.maxTokens,
          system: req.system,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: req.mimeType, data: req.imageBase64 } },
              { type: 'text', text: req.prompt },
            ],
          }],
        }),
      })
      return parseResponse(response, {
        model: req.model,
        feature: req.feature,
        mode: 'vision',
        context: req.context,
      })
    },
  }
}

export const anthropicProvider: LlmProviderDefinition = {
  id: 'anthropic',
  label: 'Anthropic',
  apiKeyLabel: 'Anthropic API key',
  apiKeyPlaceholder: 'sk-ant-...',
  apiKeyCreateUrl: 'https://console.anthropic.com/settings/keys',
  pricingUrl: 'https://docs.anthropic.com/en/docs/about-claude/pricing',
  defaultTextModel: 'claude-sonnet-4-6',
  defaultVisionModel: 'claude-sonnet-4-6',
  createClient: createAnthropicClient,
}
