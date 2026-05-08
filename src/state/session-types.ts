import type { DraftingFeedback, EasyWordFilterLevel, TrainingAttempt, TrainingPrompt, Word } from '../types'

export interface BaseSession {
  id: string
  createdAt: number
  updatedAt: number
  title: string
}

export interface SessionHistoryEntry<TSession extends BaseSession> {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  session: TSession
}

export interface StoredExample {
  sentence: string | null
  translation: string | null
}

export interface ExampleStatus {
  loading: boolean
  error: string | null
  translationLoading: boolean
}

export interface TextVocabSession extends BaseSession {
  transcription: string
  words: Word[]
  examples: Record<string, StoredExample>
  easyWordFilter: EasyWordFilterLevel
}

export type TextVocabHistoryEntry = SessionHistoryEntry<TextVocabSession>

export interface ManualVocabSession extends BaseSession {
  words: Word[]
  examples: Record<string, StoredExample>
  meanings: Record<string, string>
  contexts: Record<string, string>
}

export type ManualVocabHistoryEntry = SessionHistoryEntry<ManualVocabSession>

export interface TrainingSession extends BaseSession {
  queue: TrainingPrompt[]
  currentPrompt: TrainingPrompt | null
  attempts: TrainingAttempt[]
  promptCount: number
}

export type TrainingHistoryEntry = SessionHistoryEntry<TrainingSession>

export interface DraftingSession extends BaseSession {
  draftText: string
  purposeText: string
  lastFeedbackDraftText: string
  feedback: DraftingFeedback | null
}

export type DraftingHistoryEntry = SessionHistoryEntry<DraftingSession>

