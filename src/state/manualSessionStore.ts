import { KEY_MANUAL_SESSION, KEY_MANUAL_SESSION_HISTORY } from '../constants'
import { manualExampleStatusAtom } from './exampleState'
import { createPersistedSessionStore } from './session-factory'
import type { ManualVocabHistoryEntry, ManualVocabSession } from './session-types'

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

const manualStore = createPersistedSessionStore({
  storageKey: KEY_MANUAL_SESSION,
  historyKey: KEY_MANUAL_SESSION_HISTORY,
  createEmpty: createEmptyManualVocabSession,
  normalize: normalizeManualVocabSession,
  createHistoryEntry: createManualVocabHistoryEntry,
  clearEphemeralState(set) {
    set(manualExampleStatusAtom, {})
  },
})

export const manualVocabSessionAtom = manualStore.sessionAtom
export const manualVocabHistoryAtom = manualStore.historyAtom
export const restoreManualVocabHistoryAtom = manualStore.restoreHistoryAtom
export const deleteManualVocabHistoryEntryAtom = manualStore.deleteHistoryEntryAtom
export const resetManualVocabAtom = manualStore.resetAtom
export const setManualVocabSessionTitleAtom = manualStore.setTitleAtom

