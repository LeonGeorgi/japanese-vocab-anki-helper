export type LlmProviderId = 'anthropic' | 'openai'

export interface LlmModelInfo {
  id: string
  label: string
  provider: LlmProviderId
  deprecated?: boolean
}

export type LlmFeature =
  | 'extract_words'
  | 'transcribe_image'
  | 'annotate_sentence'
  | 'add_furigana'
  | 'define_word'
  | 'translate_sentence'
  | 'split_word'
  | 'convert_word_to_kanji'
  | 'generate_example'
  | 'resolve_manual_vocab'
  | 'generate_manual_example'

export interface TextRequest {
  model: string
  feature: LlmFeature
  prompt: string
  maxTokens: number
  thinkingTokens?: number
  system?: string
  context?: Record<string, number>
}

export interface ImageTextRequest {
  model: string
  feature: LlmFeature
  imageBase64: string
  mimeType: string
  prompt: string
  system?: string
  maxTokens: number
  context?: Record<string, number>
}

export interface LlmProviderClient {
  listModels(): Promise<LlmModelInfo[]>
  completeText(req: TextRequest): Promise<string>
  completeFromImage(req: ImageTextRequest): Promise<string>
}

export interface LlmProviderDefinition {
  id: LlmProviderId
  label: string
  apiKeyLabel: string
  apiKeyPlaceholder: string
  apiKeyCreateUrl: string
  pricingUrl: string
  defaultTextModel: string
  defaultVisionModel: string
  createClient(apiKey: string): LlmProviderClient
}

export interface LlmSettings {
  provider: LlmProviderId
  apiKey: string
  textModel: string
  visionModel: string
}
