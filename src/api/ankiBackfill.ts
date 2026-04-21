import type { AnkiNoteInfo } from './anki'
import type { AnkiFieldNames } from './ankiCard'

export type FillStatus = 'idle' | 'loading' | 'done' | 'error'

export interface BackfillNote {
  id: number
  before: string
  word: string
  after: string
  plainWord: string
  sentence: string
  status: FillStatus
  error: string | null
}

export interface BackfillSummary {
  completed: number
  failed: number
}

export function plainAnkiText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)\]/g, '')
    .replace(/\s+/g, '')
    .trim()
}

function fieldValue(note: AnkiNoteInfo, fieldName: string) {
  return note.fields[fieldName]?.value ?? ''
}

export function toBackfillNote(note: AnkiNoteInfo, fieldNames: AnkiFieldNames): BackfillNote {
  const before = fieldValue(note, fieldNames.before)
  const word = fieldValue(note, fieldNames.word)
  const after = fieldValue(note, fieldNames.after)
  const plainWord = fieldValue(note, fieldNames.plainWord) || plainAnkiText(word)
  const sentence = plainAnkiText(`${before}${word}${after}`)

  return {
    id: note.noteId,
    before,
    word,
    after,
    plainWord,
    sentence,
    status: 'idle',
    error: null,
  }
}
