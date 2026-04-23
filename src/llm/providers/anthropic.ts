import type { ImageTextRequest, LlmModelInfo, LlmProviderDefinition, TextRequest } from '../types'
import { recordLlmUsage } from '../usageTracker'

const ANTHROPIC_API = 'https://api.anthropic.com/v1'
const ANTHROPIC_VERSION = '2023-06-01'
const ANTHROPIC_BROWSER_HEADER = 'anthropic-dangerous-direct-browser-access'

function buildHeaders(apiKey: string, withJsonContent = true) {
  return {
    ...(withJsonContent ? { 'content-type': 'application/json' } : {}),
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    [ANTHROPIC_BROWSER_HEADER]: 'true',
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
  const inputTokens = data.usage?.input_tokens ?? 0
  const outputTokens = data.usage?.output_tokens ?? 0
  const cacheWriteTokens = data.usage?.cache_creation_input_tokens ?? 0
  const cacheReadTokens = data.usage?.cache_read_input_tokens ?? 0
  recordLlmUsage({
    provider: 'anthropic',
    model: req.model,
    feature: req.feature,
    mode: req.mode,
    inputTokens,
    outputTokens,
    reasoningTokens: 0,
    context: {
      cacheWriteInputTokens: cacheWriteTokens,
      cacheReadInputTokens: cacheReadTokens,
      ...(req.context ?? {}),
    },
  })
  return data.content.find(block => block.type === 'text')?.text ?? ''
}

function normalizeLabel(id: string, displayName?: string) {
  if (displayName && displayName.trim().length > 0) return displayName
  return id
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
      const response = await fetch(`${ANTHROPIC_API}/messages`, {
        method: 'POST',
        headers: buildHeaders(apiKey),
        body: JSON.stringify({
          model: req.model,
          max_tokens: (req.thinkingTokens ?? 0) + req.maxTokens,
          thinking: req.thinkingTokens && req.thinkingTokens > 0
            ? { type: 'enabled', budget_tokens: req.thinkingTokens }
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
