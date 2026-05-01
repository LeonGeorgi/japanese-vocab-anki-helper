import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { JlptLevel } from '../types'
import { defaultLlmProvider, getLlmProvider, type LlmProviderId } from '../llm'
import {
  KEY_API_KEY,
  KEY_JLPT_LEVEL,
  KEY_LLM_API_KEYS,
  KEY_LLM_PROVIDER,
  KEY_LLM_TEXT_MODEL,
  KEY_LLM_VISION_MODEL,
  KEY_MANUAL_CONTEXT,
  KEY_MANUAL_KEEP_CONTEXT,
  KEY_NATIVE_LANG,
} from '../constants'

const storageOptions = { getOnInit: true }
const defaultProviderInfo = getLlmProvider(defaultLlmProvider)
type LlmApiKeys = Record<LlmProviderId, string>

function initialLlmApiKeys(): LlmApiKeys {
  if (typeof window === 'undefined') return { anthropic: '', openai: '' }

  // One-time migration path from legacy single-provider key storage.
  const legacyAnthropicKey = window.localStorage.getItem(KEY_API_KEY) ?? ''
  return {
    anthropic: legacyAnthropicKey,
    openai: '',
  }
}

export const llmProviderAtom = atomWithStorage<LlmProviderId>(KEY_LLM_PROVIDER, defaultLlmProvider, undefined, storageOptions)
export const llmApiKeysAtom = atomWithStorage<LlmApiKeys>(KEY_LLM_API_KEYS, initialLlmApiKeys(), undefined, storageOptions)
export const llmTextModelAtom = atomWithStorage(KEY_LLM_TEXT_MODEL, defaultProviderInfo.defaultTextModel, undefined, storageOptions)
export const llmVisionModelAtom = atomWithStorage(KEY_LLM_VISION_MODEL, defaultProviderInfo.defaultVisionModel, undefined, storageOptions)
export const apiKeyAtom = atom(
  get => get(llmApiKeysAtom)[get(llmProviderAtom)] ?? '',
  (get, set, nextApiKey: string) => {
    const provider = get(llmProviderAtom)
    const currentKeys = get(llmApiKeysAtom)
    if (currentKeys[provider] === nextApiKey) return
    set(llmApiKeysAtom, { ...currentKeys, [provider]: nextApiKey })
  },
)
export const jlptLevelAtom = atomWithStorage<JlptLevel>(KEY_JLPT_LEVEL, 'N3', undefined, storageOptions)
export const nativeLanguageAtom = atomWithStorage(KEY_NATIVE_LANG, '', undefined, storageOptions)
export const manualKeepContextAtom = atomWithStorage<boolean>(KEY_MANUAL_KEEP_CONTEXT, false, undefined, storageOptions)
export const manualContextAtom = atomWithStorage(KEY_MANUAL_CONTEXT, '', undefined, storageOptions)
