import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { KEY_MANUAL_SESSION, KEY_MANUAL_SESSION_HISTORY, KEY_SESSION, KEY_TEXT_SESSION_HISTORY } from '../constants'
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
  title: string
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
  id: string
  createdAt: number
  updatedAt: number
  title: string
  words: Word[]
  examples: Record<string, StoredExample>
  meanings: Record<string, string>
  contexts: Record<string, string>
}

export interface ManualVocabHistoryEntry {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  session: ManualVocabSession
}

const storageOptions = { getOnInit: true }
const maxHistoryEntries = 20

const storedTextVocabSessionAtom = atomWithStorage<TextVocabSession>(KEY_SESSION, createEmptyTextVocabSession(), undefined, storageOptions)
const storedManualVocabSessionAtom = atomWithStorage<ManualVocabSession>(KEY_MANUAL_SESSION, createEmptyManualVocabSession(), undefined, storageOptions)
export const textVocabHistoryAtom = atomWithStorage<TextVocabHistoryEntry[]>(KEY_TEXT_SESSION_HISTORY, [], undefined, storageOptions)
export const manualVocabHistoryAtom = atomWithStorage<ManualVocabHistoryEntry[]>(KEY_MANUAL_SESSION_HISTORY, [], undefined, storageOptions)

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
  const next = createEmptyTextVocabSession()
  set(storedTextVocabSessionAtom, next)
  set(textExampleStatusAtom, {})
  return next.id
})

export const setTextVocabSessionTitleAtom = atom(null, (_get, set, title: string) => {
  const value = title.trimStart()
  set(textVocabSessionAtom, prev => ({ ...prev, title: value }))
})

export const manualVocabSessionAtom = atom(
  get => normalizeManualVocabSession(get(storedManualVocabSessionAtom)),
  (get, set, update: StateUpdate<ManualVocabSession>) => {
    const prev = normalizeManualVocabSession(get(storedManualVocabSessionAtom))
    const nextValue = typeof update === 'function' ? update(prev) : update
    const next = normalizeManualVocabSession(nextValue, prev)

    set(storedManualVocabSessionAtom, next)
    const entry = createManualVocabHistoryEntry(next)
    if (entry) set(manualVocabHistoryAtom, historyWithEntry(get(manualVocabHistoryAtom), entry))
  },
)

export const restoreManualVocabHistoryAtom = atom(null, (get, set, id: string) => {
  const entry = get(manualVocabHistoryAtom).find(item => item.id === id)
  if (!entry) return
  set(storedManualVocabSessionAtom, normalizeManualVocabSession({ ...entry.session, id: entry.session.id ?? entry.id }))
  set(manualExampleStatusAtom, {})
})

export const deleteManualVocabHistoryEntryAtom = atom(null, (get, set, id: string) => {
  set(manualVocabHistoryAtom, get(manualVocabHistoryAtom).filter(entry => entry.id !== id))
  if (get(manualVocabSessionAtom).id === id) {
    set(storedManualVocabSessionAtom, createEmptyManualVocabSession())
    set(manualExampleStatusAtom, {})
  }
})

export const resetManualVocabAtom = atom(null, (get, set) => {
  const entry = createManualVocabHistoryEntry(get(manualVocabSessionAtom))
  if (entry) set(manualVocabHistoryAtom, historyWithEntry(get(manualVocabHistoryAtom), entry))
  const next = createEmptyManualVocabSession()
  set(storedManualVocabSessionAtom, next)
  set(manualExampleStatusAtom, {})
  return next.id
})

export const setManualVocabSessionTitleAtom = atom(null, (_get, set, title: string) => {
  const value = title.trimStart()
  set(manualVocabSessionAtom, prev => ({ ...prev, title: value }))
})

export function createEmptyTextVocabSession(): TextVocabSession {
  const now = Date.now()
  return {
    id: createTextSessionId(),
    createdAt: now,
    updatedAt: now,
    title: '',
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
    title: session.title ?? previous?.title ?? '',
    transcription: session.transcription ?? '',
    words: session.words ?? [],
    examples: session.examples ?? {},
    filterEasy: session.filterEasy ?? false,
  }
}

function createTextSessionId(): string {
  return `text_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createEmptyManualVocabSession(): ManualVocabSession {
  const now = Date.now()
  return {
    id: createManualSessionId(),
    createdAt: now,
    updatedAt: now,
    title: '',
    words: [],
    examples: {},
    meanings: {},
    contexts: {},
  }
}

function normalizeManualVocabSession(
  session: ManualVocabSession,
  previous?: ManualVocabSession,
): ManualVocabSession {
  const now = Date.now()
  return {
    id: session.id ?? previous?.id ?? createManualSessionId(),
    createdAt: session.createdAt ?? previous?.createdAt ?? now,
    updatedAt: previous && session !== previous ? now : session.updatedAt ?? now,
    title: session.title ?? previous?.title ?? '',
    words: session.words ?? [],
    examples: session.examples ?? {},
    meanings: session.meanings ?? {},
    contexts: session.contexts ?? {},
  }
}

function createManualSessionId(): string {
  return `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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
): TextVocabHistoryEntry[]
function historyWithEntry(
  history: ManualVocabHistoryEntry[],
  entry: ManualVocabHistoryEntry,
): ManualVocabHistoryEntry[]
function historyWithEntry<T extends { id: string }>(
  history: T[],
  entry: T,
): T[] {
  return [
    entry,
    ...history.filter(item => item.id !== entry.id),
  ].slice(0, maxHistoryEntries)
}

function isEmptyTextVocabSession(session: TextVocabSession): boolean {
  return !session.transcription.trim() && session.words.length === 0
}

function textVocabHistoryTitle(session: TextVocabSession): string {
  if (session.title.trim()) return session.title.trim().slice(0, 72)

  const firstLine = session.transcription.trim().split(/\r?\n/).find(Boolean)
  if (firstLine) return firstLine.slice(0, 72)

  const words = session.words.slice(0, 4).map(word => word.word).join(', ')
  return words || 'Untitled session'
}

function createManualVocabHistoryEntry(session: ManualVocabSession): ManualVocabHistoryEntry | null {
  if (isEmptyManualVocabSession(session)) return null
  return {
    id: session.id,
    title: manualVocabHistoryTitle(session),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    session,
  }
}

function isEmptyManualVocabSession(session: ManualVocabSession): boolean {
  return session.words.length === 0
}

function manualVocabHistoryTitle(session: ManualVocabSession): string {
  if (session.title.trim()) return session.title.trim().slice(0, 72)

  const words = session.words.slice(0, 4).map(word => word.word).join(', ')
  return words || 'Untitled manual session'
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
