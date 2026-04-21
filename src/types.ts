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
