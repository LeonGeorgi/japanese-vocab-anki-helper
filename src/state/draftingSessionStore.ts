import { KEY_DRAFTING_SESSION, KEY_DRAFTING_SESSION_HISTORY } from '../constants'
import type { DraftingSession, DraftingHistoryEntry } from './session-types'
import { createPersistedSessionStore } from './session-factory'

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

const draftingStore = createPersistedSessionStore({
  storageKey: KEY_DRAFTING_SESSION,
  historyKey: KEY_DRAFTING_SESSION_HISTORY,
  createEmpty: createEmptyDraftingSession,
  normalize: normalizeDraftingSession,
  createHistoryEntry: createDraftingHistoryEntry,
})

export const draftingSessionAtom = draftingStore.sessionAtom
export const draftingHistoryAtom = draftingStore.historyAtom
export const restoreDraftingHistoryAtom = draftingStore.restoreHistoryAtom
export const deleteDraftingHistoryEntryAtom = draftingStore.deleteHistoryEntryAtom
export const resetDraftingAtom = draftingStore.resetAtom
export const setDraftingSessionTitleAtom = draftingStore.setTitleAtom

