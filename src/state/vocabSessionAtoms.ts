import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import {
  KEY_MANUAL_SESSION,
  KEY_MANUAL_SESSION_HISTORY,
  KEY_SESSION,
  KEY_TEXT_SESSION_HISTORY,
  KEY_DRAFTING_SESSION,
  KEY_DRAFTING_SESSION_HISTORY,
  KEY_TRAINING_SESSION,
  KEY_TRAINING_SESSION_HISTORY,
} from '../constants'
import type { DraftingFeedback, EasyWordFilterLevel, Example, TrainingAttempt, TrainingPrompt, Word } from '../types'

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

export interface TrainingSession {
  id: string
  createdAt: number
  updatedAt: number
  title: string
  queue: TrainingPrompt[]
  currentPrompt: TrainingPrompt | null
  attempts: TrainingAttempt[]
  promptCount: number
}

export interface TrainingHistoryEntry {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  session: TrainingSession
}

export interface DraftingSession {
  id: string
  createdAt: number
  updatedAt: number
  title: string
  draftText: string
  purposeText: string
  lastFeedbackDraftText: string
  feedback: DraftingFeedback | null
}

export interface DraftingHistoryEntry {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  session: DraftingSession
}

const storageOptions = { getOnInit: true }
const maxHistoryEntries = 20

const storedTextVocabSessionAtom = atomWithStorage<TextVocabSession>(KEY_SESSION, createEmptyTextVocabSession(), undefined, storageOptions)
const storedManualVocabSessionAtom = atomWithStorage<ManualVocabSession>(KEY_MANUAL_SESSION, createEmptyManualVocabSession(), undefined, storageOptions)
const storedTrainingSessionAtom = atomWithStorage<TrainingSession>(KEY_TRAINING_SESSION, createEmptyTrainingSession(), undefined, storageOptions)
const storedDraftingSessionAtom = atomWithStorage<DraftingSession>(KEY_DRAFTING_SESSION, createEmptyDraftingSession(), undefined, storageOptions)
export const textVocabHistoryAtom = atomWithStorage<TextVocabHistoryEntry[]>(KEY_TEXT_SESSION_HISTORY, [], undefined, storageOptions)
export const manualVocabHistoryAtom = atomWithStorage<ManualVocabHistoryEntry[]>(KEY_MANUAL_SESSION_HISTORY, [], undefined, storageOptions)
export const trainingHistoryAtom = atomWithStorage<TrainingHistoryEntry[]>(KEY_TRAINING_SESSION_HISTORY, [], undefined, storageOptions)
export const draftingHistoryAtom = atomWithStorage<DraftingHistoryEntry[]>(KEY_DRAFTING_SESSION_HISTORY, [], undefined, storageOptions)

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

export const trainingSessionAtom = atom(
  get => normalizeTrainingSession(get(storedTrainingSessionAtom)),
  (get, set, update: StateUpdate<TrainingSession>) => {
    const prev = normalizeTrainingSession(get(storedTrainingSessionAtom))
    const nextValue = typeof update === 'function' ? update(prev) : update
    const next = normalizeTrainingSession(nextValue, prev)

    set(storedTrainingSessionAtom, next)
    const entry = createTrainingHistoryEntry(next)
    if (entry) set(trainingHistoryAtom, historyWithEntry(get(trainingHistoryAtom), entry))
  },
)

export const restoreTrainingHistoryAtom = atom(null, (get, set, id: string) => {
  const entry = get(trainingHistoryAtom).find(item => item.id === id)
  if (!entry) return
  set(storedTrainingSessionAtom, normalizeTrainingSession({ ...entry.session, id: entry.session.id ?? entry.id }))
})

export const deleteTrainingHistoryEntryAtom = atom(null, (get, set, id: string) => {
  set(trainingHistoryAtom, get(trainingHistoryAtom).filter(entry => entry.id !== id))
  if (get(trainingSessionAtom).id === id) {
    set(storedTrainingSessionAtom, createEmptyTrainingSession())
  }
})

export const resetTrainingAtom = atom(null, (get, set) => {
  const entry = createTrainingHistoryEntry(get(trainingSessionAtom))
  if (entry) set(trainingHistoryAtom, historyWithEntry(get(trainingHistoryAtom), entry))
  const next = createEmptyTrainingSession()
  set(storedTrainingSessionAtom, next)
  return next.id
})

export const setTrainingSessionTitleAtom = atom(null, (_get, set, title: string) => {
  const value = title.trimStart()
  set(trainingSessionAtom, prev => ({ ...prev, title: value }))
})

export const draftingSessionAtom = atom(
  get => normalizeDraftingSession(get(storedDraftingSessionAtom)),
  (get, set, update: StateUpdate<DraftingSession>) => {
    const prev = normalizeDraftingSession(get(storedDraftingSessionAtom))
    const nextValue = typeof update === 'function' ? update(prev) : update
    const next = normalizeDraftingSession(nextValue, prev)

    set(storedDraftingSessionAtom, next)
    const entry = createDraftingHistoryEntry(next)
    if (entry) set(draftingHistoryAtom, historyWithEntry(get(draftingHistoryAtom), entry))
  },
)

export const restoreDraftingHistoryAtom = atom(null, (get, set, id: string) => {
  const entry = get(draftingHistoryAtom).find(item => item.id === id)
  if (!entry) return
  set(storedDraftingSessionAtom, normalizeDraftingSession({ ...entry.session, id: entry.session.id ?? entry.id }))
})

export const deleteDraftingHistoryEntryAtom = atom(null, (get, set, id: string) => {
  set(draftingHistoryAtom, get(draftingHistoryAtom).filter(entry => entry.id !== id))
  if (get(draftingSessionAtom).id === id) {
    set(storedDraftingSessionAtom, createEmptyDraftingSession())
  }
})

export const resetDraftingAtom = atom(null, (get, set) => {
  const entry = createDraftingHistoryEntry(get(draftingSessionAtom))
  if (entry) set(draftingHistoryAtom, historyWithEntry(get(draftingHistoryAtom), entry))
  const next = createEmptyDraftingSession()
  set(storedDraftingSessionAtom, next)
  return next.id
})

export const setDraftingSessionTitleAtom = atom(null, (_get, set, title: string) => {
  const value = title.trimStart()
  set(draftingSessionAtom, prev => ({ ...prev, title: value }))
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

export function createEmptyTrainingSession(): TrainingSession {
  const now = Date.now()
  return {
    id: createTrainingSessionId(),
    createdAt: now,
    updatedAt: now,
    title: '',
    queue: [],
    currentPrompt: null,
    attempts: [],
    promptCount: 0,
  }
}

function normalizeTrainingSession(
  session: TrainingSession,
  previous?: TrainingSession,
): TrainingSession {
  const now = Date.now()
  return {
    id: session.id ?? previous?.id ?? createTrainingSessionId(),
    createdAt: session.createdAt ?? previous?.createdAt ?? now,
    updatedAt: previous && session !== previous ? now : session.updatedAt ?? now,
    title: session.title ?? previous?.title ?? '',
    queue: session.queue ?? previous?.queue ?? [],
    currentPrompt: session.currentPrompt === undefined ? previous?.currentPrompt ?? null : session.currentPrompt,
    attempts: session.attempts ?? previous?.attempts ?? [],
    promptCount: session.promptCount ?? previous?.promptCount ?? 0,
  }
}

function createTrainingSessionId(): string {
  return `training_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function createTrainingPromptId(): string {
  return `training_prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeTrainingPrompt(prompt: TrainingPrompt | null | undefined): TrainingPrompt | null {
  if (!prompt || typeof prompt !== 'object') return null

  const legacyPrompt = prompt as TrainingPrompt & {
    noteId?: number
    word?: string
    definition?: string
  }

  const words = Array.isArray(prompt.words)
    ? prompt.words.map(word => typeof word === 'string' ? word.trim() : '').filter(Boolean)
    : typeof legacyPrompt.word === 'string' && legacyPrompt.word.trim()
      ? [legacyPrompt.word.trim()]
      : []

  if (words.length === 0) return null

  const noteIds = Array.isArray(prompt.noteIds)
    ? prompt.noteIds.map(noteId => Number.isInteger(noteId) ? noteId : 0).slice(0, words.length)
    : typeof legacyPrompt.noteId === 'number'
      ? [legacyPrompt.noteId]
      : []

  while (noteIds.length < words.length) noteIds.push(0)

  const definitions = Array.isArray(prompt.definitions)
    ? prompt.definitions.map(definition => typeof definition === 'string' ? definition.trim() : '').slice(0, words.length)
    : typeof legacyPrompt.definition === 'string'
      ? [legacyPrompt.definition.trim()]
      : []

  while (definitions.length < words.length) definitions.push('')

  return {
    id: typeof prompt.id === 'string' && prompt.id.trim() ? prompt.id : createTrainingPromptId(),
    noteIds,
    words,
    definitions,
    promptTranslation: typeof prompt.promptTranslation === 'string' ? prompt.promptTranslation : '',
    referenceSentence: typeof prompt.referenceSentence === 'string' ? prompt.referenceSentence : '',
  }
}

function normalizeTrainingPromptList(prompts: TrainingPrompt[]): TrainingPrompt[] {
  return prompts
    .map(prompt => normalizeTrainingPrompt(prompt))
    .filter((prompt): prompt is TrainingPrompt => !!prompt)
}

function normalizeTrainingAttempts(attempts: TrainingAttempt[]): TrainingAttempt[] {
  return attempts.flatMap(attempt => {
    const prompt = normalizeTrainingPrompt(attempt.prompt)
    if (!prompt) return []
    return [{
      ...attempt,
      prompt,
    }]
  })
}

export function createEmptyDraftingSession(): DraftingSession {
  const now = Date.now()
  return {
    id: createDraftingSessionId(),
    createdAt: now,
    updatedAt: now,
    title: '',
    draftText: '',
    purposeText: '',
    lastFeedbackDraftText: '',
    feedback: null,
  }
}

function normalizeDraftingSession(
  session: DraftingSession,
  previous?: DraftingSession,
): DraftingSession {
  const now = Date.now()
  return {
    id: session.id ?? previous?.id ?? createDraftingSessionId(),
    createdAt: session.createdAt ?? previous?.createdAt ?? now,
    updatedAt: previous && session !== previous ? now : session.updatedAt ?? now,
    title: session.title ?? previous?.title ?? '',
    draftText: session.draftText ?? previous?.draftText ?? '',
    purposeText: session.purposeText ?? previous?.purposeText ?? '',
    lastFeedbackDraftText: session.lastFeedbackDraftText ?? previous?.lastFeedbackDraftText ?? '',
    feedback: session.feedback === undefined ? previous?.feedback ?? null : session.feedback,
  }
}

function createDraftingSessionId(): string {
  return `drafting_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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
function historyWithEntry(
  history: TrainingHistoryEntry[],
  entry: TrainingHistoryEntry,
): TrainingHistoryEntry[]
function historyWithEntry(
  history: DraftingHistoryEntry[],
  entry: DraftingHistoryEntry,
): DraftingHistoryEntry[]
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

function createTrainingHistoryEntry(session: TrainingSession): TrainingHistoryEntry | null {
  if (isEmptyTrainingSession(session)) return null
  return {
    id: session.id,
    title: trainingHistoryTitle(session),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    session,
  }
}

function isEmptyTrainingSession(session: TrainingSession): boolean {
  return session.promptCount === 0 && session.attempts.length === 0 && !session.currentPrompt
}

function trainingHistoryTitle(session: TrainingSession): string {
  if (session.title.trim()) return session.title.trim().slice(0, 72)
  const currentWords = session.currentPrompt?.words.filter(Boolean) ?? []
  if (currentWords.length > 0) return `Training: ${currentWords.join(' + ')}`.slice(0, 72)
  const firstAttemptWords = session.attempts[0]?.prompt.words.filter(Boolean) ?? []
  if (firstAttemptWords.length > 0) return `Training: ${firstAttemptWords.join(' + ')}`.slice(0, 72)
  return 'Untitled training session'
}

function createDraftingHistoryEntry(session: DraftingSession): DraftingHistoryEntry | null {
  if (isEmptyDraftingSession(session)) return null
  return {
    id: session.id,
    title: draftingHistoryTitle(session),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    session,
  }
}

export function isEmptyDraftingSession(session: DraftingSession): boolean {
  return !session.draftText.trim() && !session.purposeText.trim() && !session.feedback
}

export function draftingHistoryTitle(session: DraftingSession): string {
  if (session.title.trim()) return session.title.trim().slice(0, 72)
  const firstLine = session.draftText.trim().split(/\r?\n/).find(Boolean)
  if (firstLine) return firstLine.slice(0, 72)
  const purpose = session.purposeText.trim()
  if (purpose) return `Drafting: ${purpose}`.slice(0, 72)
  return 'Untitled drafting session'
}

export function isDraftingFeedbackStale(session: DraftingSession): boolean {
  return !!session.feedback && session.lastFeedbackDraftText !== session.draftText
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
