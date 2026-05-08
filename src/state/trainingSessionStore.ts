import type { TrainingAttempt, TrainingPrompt } from '../types'
import { KEY_TRAINING_SESSION, KEY_TRAINING_SESSION_HISTORY } from '../constants'
import { createPersistedSessionStore } from './session-factory'
import type { TrainingHistoryEntry, TrainingSession } from './session-types'

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
    queue: normalizeTrainingPromptList(session.queue ?? previous?.queue ?? []),
    currentPrompt: session.currentPrompt === undefined
      ? normalizeTrainingPrompt(previous?.currentPrompt ?? null)
      : normalizeTrainingPrompt(session.currentPrompt),
    attempts: normalizeTrainingAttempts(session.attempts ?? previous?.attempts ?? []),
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

const trainingStore = createPersistedSessionStore({
  storageKey: KEY_TRAINING_SESSION,
  historyKey: KEY_TRAINING_SESSION_HISTORY,
  createEmpty: createEmptyTrainingSession,
  normalize: normalizeTrainingSession,
  createHistoryEntry: createTrainingHistoryEntry,
})

export const trainingSessionAtom = trainingStore.sessionAtom
export const trainingHistoryAtom = trainingStore.historyAtom
export const restoreTrainingHistoryAtom = trainingStore.restoreHistoryAtom
export const deleteTrainingHistoryEntryAtom = trainingStore.deleteHistoryEntryAtom
export const resetTrainingAtom = trainingStore.resetAtom
export const setTrainingSessionTitleAtom = trainingStore.setTitleAtom

