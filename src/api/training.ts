import { findNotesByQuery, getNotesInfo, type AnkiNoteInfo } from './anki'
import { plainAnkiText } from './ankiBackfill'
import type { AnkiFieldNames } from './ankiCard'
import { generateManualExample, translateSentence } from './llm'
import type { JlptLevel, TrainingPrompt } from '../types'

interface TrainingCandidate {
  noteId: number
  word: string
  definition: string
}

function fieldValue(note: AnkiNoteInfo, fieldName: string) {
  return fieldName ? note.fields[fieldName]?.value ?? '' : ''
}

function shuffle<T>(values: T[]): T[] {
  const next = [...values]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

function plainAnkiFieldText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasRequiredTrainingFields(fieldNames: AnkiFieldNames) {
  return !!fieldNames.before && !!fieldNames.word && !!fieldNames.after && !!fieldNames.plainWord && !!fieldNames.sentence
}

export async function loadTrainingPrompts(
  apiKey: string,
  nativeLanguage: string,
  jlptLevel: JlptLevel,
  deck: string,
  model: string,
  fieldNames: AnkiFieldNames,
  count: number,
): Promise<TrainingPrompt[]> {
  if (!hasRequiredTrainingFields(fieldNames)) {
    throw new Error('Configure Anki mapping for before, word, after, plain word, and sentence first.')
  }

  const query = `deck:"${deck}" note:"${model}" ${fieldNames.sentence}:_*`
  const noteIds = await findNotesByQuery(query)
  if (!noteIds.length) return []

  const sampledIds = shuffle(noteIds).slice(0, Math.max(count * 3, count))
  const notes = await getNotesInfo(sampledIds)
  const candidates = shuffle(notes.map(note => toTrainingCandidate(note, fieldNames)))
    .filter((candidate): candidate is TrainingCandidate => !!candidate)
    .slice(0, count)

  return Promise.all(
    candidates.map(candidate => buildTrainingPrompt(apiKey, nativeLanguage, jlptLevel, candidate)),
  )
}

function toTrainingCandidate(note: AnkiNoteInfo, fieldNames: AnkiFieldNames): TrainingCandidate | null {
  const word = fieldValue(note, fieldNames.word)
  const definition = plainAnkiFieldText(fieldValue(note, fieldNames.definition))
  const plainWord = plainAnkiText(fieldValue(note, fieldNames.plainWord) || word)

  if (!plainWord) return null

  return {
    noteId: note.noteId,
    word: plainWord,
    definition,
  }
}

async function buildTrainingPrompt(
  apiKey: string,
  nativeLanguage: string,
  jlptLevel: JlptLevel,
  candidate: TrainingCandidate,
): Promise<TrainingPrompt> {
  const referenceSentence = await generateManualExample(
    apiKey,
    candidate.word,
    jlptLevel,
    {},
    candidate.definition,
  )
  const promptTranslation = await translateSentence(
    apiKey,
    referenceSentence,
    nativeLanguage || 'English',
    candidate.word,
  )

  return {
    noteId: candidate.noteId,
    word: candidate.word,
    definition: candidate.definition,
    promptTranslation,
    referenceSentence,
  }
}
