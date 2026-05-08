import { KEY_SESSION, KEY_TEXT_SESSION_HISTORY, normalizeEasyWordFilterLevel } from '../constants'
import { textExampleStatusAtom } from './exampleState'
import { createPersistedSessionStore } from './session-factory'
import type { TextVocabHistoryEntry, TextVocabSession } from './session-types'

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
    easyWordFilter: 0,
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
    easyWordFilter: normalizeEasyWordFilterLevel(
      session.easyWordFilter ?? (session as TextVocabSession & { filterEasy?: boolean }).filterEasy,
    ),
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

const textStore = createPersistedSessionStore({
  storageKey: KEY_SESSION,
  historyKey: KEY_TEXT_SESSION_HISTORY,
  createEmpty: createEmptyTextVocabSession,
  normalize: normalizeTextVocabSession,
  createHistoryEntry: createTextVocabHistoryEntry,
  clearEphemeralState(set) {
    set(textExampleStatusAtom, {})
  },
})

export const textVocabSessionAtom = textStore.sessionAtom
export const textVocabHistoryAtom = textStore.historyAtom
export const restoreTextVocabHistoryAtom = textStore.restoreHistoryAtom
export const deleteTextVocabHistoryEntryAtom = textStore.deleteHistoryEntryAtom
export const resetTextVocabAtom = textStore.resetAtom
export const setTextVocabSessionTitleAtom = textStore.setTitleAtom

