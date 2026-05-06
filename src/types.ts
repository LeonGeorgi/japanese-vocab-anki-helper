export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

export interface Word {
  word: string
  level: JlptLevel | null
}

export interface Example {
  sentence: string | null
  loading: boolean
  error: string | null
  translation: string | null
  translationLoading: boolean
}

export interface GenerateOptions {
  previousSentence?: string
  simplify?: boolean
  feedback?: string
}

export interface ManualVocabOption {
  word: string
  meaning: string
}

export type ManualVocabResolution =
  | { status: 'clear'; option: ManualVocabOption }
  | { status: 'ambiguous'; options: ManualVocabOption[] }

export interface TrainingPrompt {
  noteId: number
  word: string
  definition: string
  promptTranslation: string
  referenceSentence: string
}

export interface TrainingEvaluationScores {
  accuracy: number
  grammar: number
  naturalness: number
  targetWordUse: number
  overall: number
}

export interface TrainingEvaluation {
  scores: TrainingEvaluationScores
  summary: string
  strengths: string[]
  improvements: string[]
  betterAnswer: string
}

export interface TrainingAttempt {
  prompt: TrainingPrompt
  answer: string
  evaluation: TrainingEvaluation
  answeredAt: number
}
