import type { Example, Word } from '../../../types'

export function emptyLoadingExample(): Example {
  return { sentence: null, loading: true, error: null, translation: null, translationLoading: false }
}

export function exampleWithSentence(sentence: string): Example {
  return { sentence, loading: false, error: null, translation: null, translationLoading: false }
}

export function exampleWithError(error: string): Example {
  return { sentence: null, loading: false, error, translation: null, translationLoading: false }
}

export function addUniqueWord(words: Word[], word: string): Word[] {
  if (words.some(existing => existing.word === word)) return words
  return [...words, { word, level: null }]
}

export function replaceWord(words: Word[], original: string, replacement: string): Word[] {
  const idx = words.findIndex(word => word.word === original)
  if (idx === -1) return words

  const next = [...words]
  next[idx] = { ...next[idx], word: replacement }
  return next
}

export function replaceWordWithComponents(words: Word[], original: string, components: Word[]): Word[] {
  const idx = words.findIndex(word => word.word === original)
  if (idx === -1) return words
  return [...words.slice(0, idx), ...components, ...words.slice(idx + 1)]
}

export function renameRecordKey<T>(record: Record<string, T>, original: string, replacement: string): Record<string, T> {
  const existing = record[original]
  if (!existing) return record

  const rest = { ...record }
  delete rest[original]
  return { ...rest, [replacement]: existing }
}
