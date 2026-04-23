import { anthropicProvider } from './providers/anthropic'
import { openAiProvider } from './providers/openai'
import type { LlmProviderDefinition, LlmProviderId, LlmSettings } from './types'

const PROVIDERS: Record<LlmProviderId, LlmProviderDefinition> = {
  anthropic: anthropicProvider,
  openai: openAiProvider,
}

export const llmProviders = Object.values(PROVIDERS)
export const defaultLlmProvider = anthropicProvider.id

export function getLlmProvider(providerId: LlmProviderId): LlmProviderDefinition {
  return PROVIDERS[providerId]
}

export function createLlmClient(settings: Pick<LlmSettings, 'provider' | 'apiKey'>) {
  return getLlmProvider(settings.provider).createClient(settings.apiKey)
}

export type { LlmFeature, LlmModelInfo, LlmProviderDefinition, LlmProviderId, LlmSettings } from './types'
