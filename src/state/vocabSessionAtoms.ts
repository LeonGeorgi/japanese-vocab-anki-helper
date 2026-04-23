import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { KEY_MANUAL_SESSION, KEY_SESSION } from '../constants'
import type { Example, Word } from '../types'

export interface StoredExample {
  sentence: string | null
  translation: string | null
}

export interface ExampleStatus {
  loading: boolean
  error: string | null
  translationLoading: boolean
}

export interface TextVocabSession {
  transcription: string
  words: Word[]
  examples: Record<string, StoredExample>
  filterEasy: boolean
}

export interface ManualVocabSession {
  words: Word[]
  examples: Record<string, StoredExample>
  meanings: Record<string, string>
  contexts: Record<string, string>
}

export const emptyTextVocabSession: TextVocabSession = {
  transcription: '',
  words: [],
  examples: {},
  filterEasy: false,
}

export const emptyManualVocabSession: ManualVocabSession = {
  words: [],
  examples: {},
  meanings: {},
  contexts: {},
}

const storageOptions = { getOnInit: true }

export const textVocabSessionAtom = atomWithStorage<TextVocabSession>(KEY_SESSION, emptyTextVocabSession, undefined, storageOptions)
export const manualVocabSessionAtom = atomWithStorage<ManualVocabSession>(KEY_MANUAL_SESSION, emptyManualVocabSession, undefined, storageOptions)

export const textExampleStatusAtom = atom<Record<string, ExampleStatus>>({})
export const manualExampleStatusAtom = atom<Record<string, ExampleStatus>>({})

export const resetTextVocabAtom = atom(null, (_get, set) => {
  set(textVocabSessionAtom, emptyTextVocabSession)
  set(textExampleStatusAtom, {})
})

export function toStoredExamples(examples: Record<string, Example>): Record<string, StoredExample> {
  return Object.fromEntries(
    Object.entries(examples).map(([word, example]) => [
      word,
      { sentence: example.sentence, translation: example.translation ?? null },
    ]),
  )
}

export function toExampleStatuses(examples: Record<string, Example>): Record<string, ExampleStatus> {
  return Object.fromEntries(
    Object.entries(examples).map(([word, example]) => [
      word,
      {
        loading: example.loading,
        error: example.error,
        translationLoading: example.translationLoading,
      },
    ]),
  )
}

export function hydrateExamples(
  storedExamples: Record<string, StoredExample>,
  statuses: Record<string, ExampleStatus>,
): Record<string, Example> {
  return Object.fromEntries(
    Object.entries(storedExamples).map(([word, example]) => {
      const status = statuses[word]
      return [
        word,
        {
          sentence: example.sentence,
          translation: example.translation,
          loading: status?.loading ?? false,
          error: status?.error ?? null,
          translationLoading: status?.translationLoading ?? false,
        },
      ]
    }),
  )
}
