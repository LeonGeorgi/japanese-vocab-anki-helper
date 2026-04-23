import { getDefaultStore } from 'jotai'
import { addLlmUsageEntryAtom, type NewLlmUsageEntry } from '../state/llmUsageAtoms'

export function recordLlmUsage(entry: NewLlmUsageEntry) {
  getDefaultStore().set(addLlmUsageEntryAtom, entry)
}
