import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { KEY_LLM_USAGE } from '../constants'
import type { LlmFeature, LlmProviderId } from '../llm/types'

const storageOptions = { getOnInit: true }
const MAX_ENTRIES = 4000

export interface LlmUsageEntry {
  id: string
  timestamp: number
  provider: LlmProviderId
  model: string
  feature: LlmFeature
  mode: 'text' | 'vision'
  inputTokens: number
  outputTokens: number
  totalTokens: number
  reasoningTokens: number
  context: Record<string, number>
}

export interface NewLlmUsageEntry {
  provider: LlmProviderId
  model: string
  feature: LlmFeature
  mode: 'text' | 'vision'
  inputTokens: number
  outputTokens: number
  reasoningTokens?: number
  context?: Record<string, number>
}

export const llmUsageEntriesAtom = atomWithStorage<LlmUsageEntry[]>(
  KEY_LLM_USAGE,
  [],
  undefined,
  storageOptions,
)

export const addLlmUsageEntryAtom = atom(
  null,
  (get, set, entry: NewLlmUsageEntry) => {
    const nextEntry: LlmUsageEntry = {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      provider: entry.provider,
      model: entry.model,
      feature: entry.feature,
      mode: entry.mode,
      inputTokens: Math.max(0, Math.trunc(entry.inputTokens)),
      outputTokens: Math.max(0, Math.trunc(entry.outputTokens)),
      totalTokens: Math.max(0, Math.trunc(entry.inputTokens + entry.outputTokens)),
      reasoningTokens: Math.max(0, Math.trunc(entry.reasoningTokens ?? 0)),
      context: entry.context ?? {},
    }

    const current = get(llmUsageEntriesAtom)
    const withNext = [nextEntry, ...current]
    set(llmUsageEntriesAtom, withNext.slice(0, MAX_ENTRIES))
  },
)

export const clearLlmUsageEntriesAtom = atom(
  null,
  (_, set) => set(llmUsageEntriesAtom, []),
)
