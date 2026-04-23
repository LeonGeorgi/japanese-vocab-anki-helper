import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { KEY_MANUAL_SESSION, KEY_SESSION, KEY_TEXT_SESSION_HISTORY } from '../constants'
import type { Example, Word } from '../types'

type StateUpdate<T> = T | ((prev: T) => T)

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
  id: string
  createdAt: number
  updatedAt: number
  transcription: string
  words: Word[]
  examples: Record<string, StoredExample>
  filterEasy: boolean
}

export interface TextVocabHistoryEntry {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  session: TextVocabSession
}

export interface ManualVocabSession {
  words: Word[]
  examples: Record<string, StoredExample>
  meanings: Record<string, string>
  contexts: Record<string, string>
}

export const emptyManualVocabSession: ManualVocabSession = {
  words: [],
  examples: {},
  meanings: {},
  contexts: {},
}

const storageOptions = { getOnInit: true }
const maxHistoryEntries = 20

const storedTextVocabSessionAtom = atomWithStorage<TextVocabSession>(KEY_SESSION, createEmptyTextVocabSession(), undefined, storageOptions)
export const manualVocabSessionAtom = atomWithStorage<ManualVocabSession>(KEY_MANUAL_SESSION, emptyManualVocabSession, undefined, storageOptions)
export const textVocabHistoryAtom = atomWithStorage<TextVocabHistoryEntry[]>(KEY_TEXT_SESSION_HISTORY, [], undefined, storageOptions)

export const textExampleStatusAtom = atom<Record<string, ExampleStatus>>({})
export const manualExampleStatusAtom = atom<Record<string, ExampleStatus>>({})

export const textVocabSessionAtom = atom(
  get => normalizeTextVocabSession(get(storedTextVocabSessionAtom)),
  (get, set, update: StateUpdate<TextVocabSession>) => {
    const prev = normalizeTextVocabSession(get(storedTextVocabSessionAtom))
    const nextValue = typeof update === 'function' ? update(prev) : update
    const next = normalizeTextVocabSession(nextValue, prev)

    set(storedTextVocabSessionAtom, next)
    const entry = createTextVocabHistoryEntry(next)
    if (entry) set(textVocabHistoryAtom, historyWithEntry(get(textVocabHistoryAtom), entry))
  },
)

export const restoreTextVocabHistoryAtom = atom(null, (get, set, id: string) => {
  const entry = get(textVocabHistoryAtom).find(item => item.id === id)
  if (!entry) return
  set(storedTextVocabSessionAtom, normalizeTextVocabSession({ ...entry.session, id: entry.session.id ?? entry.id }))
  set(textExampleStatusAtom, {})
})

export const deleteTextVocabHistoryEntryAtom = atom(null, (get, set, id: string) => {
  set(textVocabHistoryAtom, get(textVocabHistoryAtom).filter(entry => entry.id !== id))
  if (get(textVocabSessionAtom).id === id) {
    set(storedTextVocabSessionAtom, createEmptyTextVocabSession())
    set(textExampleStatusAtom, {})
  }
})

export const resetTextVocabAtom = atom(null, (get, set) => {
  const entry = createTextVocabHistoryEntry(get(textVocabSessionAtom))
  if (entry) set(textVocabHistoryAtom, historyWithEntry(get(textVocabHistoryAtom), entry))
  set(storedTextVocabSessionAtom, createEmptyTextVocabSession())
  set(textExampleStatusAtom, {})
})

export function createEmptyTextVocabSession(): TextVocabSession {
  const now = Date.now()
  return {
    id: createTextSessionId(),
    createdAt: now,
    updatedAt: now,
    transcription: '',
    words: [],
    examples: {},
    filterEasy: false,
  }
}

function normalizeTextVocabSession(
  session: TextVocabSession,
  previous?: TextVocabSession,
): TextVocabSession {
  const now = Date.now()
  return {
    id: session.id ?? previous?.id ?? createTextSessionId(),
    createdAt: session.createdAt ?? previous?.createdAt ?? now,
    updatedAt: previous && session !== previous ? now : session.updatedAt ?? now,
    transcription: session.transcription ?? '',
    words: session.words ?? [],
    examples: session.examples ?? {},
    filterEasy: session.filterEasy ?? false,
  }
}

function createTextSessionId(): string {
  return `text_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function createTextVocabHistoryEntry(session: TextVocabSession): TextVocabHistoryEntry | null {
  if (isEmptyTextVocabSession(session)) return null
  return {
    id: session.id,
    title: textVocabHistoryTitle(session),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    session,
  }
}

function historyWithEntry(
  history: TextVocabHistoryEntry[],
  entry: TextVocabHistoryEntry,
): TextVocabHistoryEntry[] {
  return [
    entry,
    ...history.filter(item => item.id !== entry.id),
  ].slice(0, maxHistoryEntries)
}

function isEmptyTextVocabSession(session: TextVocabSession): boolean {
  return !session.transcription.trim() && session.words.length === 0
}

function textVocabHistoryTitle(session: TextVocabSession): string {
  const firstLine = session.transcription.trim().split(/\r?\n/).find(Boolean)
  if (firstLine) return firstLine.slice(0, 72)

  const words = session.words.slice(0, 4).map(word => word.word).join(', ')
  return words || 'Untitled session'
}

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
