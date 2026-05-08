import { findNotesByQuery, getNotesInfo, type AnkiNoteInfo } from './anki'
import { plainAnkiText } from './ankiBackfill'
import type { AnkiFieldNames } from './ankiCard'
import { generateTrainingPrompt as requestTrainingPrompt, streamGenerateTrainingPrompt as requestStreamingTrainingPrompt, streamTranslateSentence, translateSentence } from './llm'
import type { StreamTextHandlers } from '../llm/types'
import type { JlptLevel, TrainingPrompt } from '../types'

export interface TrainingCandidate {
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

  const sampledIds = shuffle(noteIds).slice(0, Math.max(count * 8, count))
  const notes = await getNotesInfo(sampledIds)
  const candidates = shuffle(notes.map(note => toTrainingCandidate(note, fieldNames)))
    .filter((candidate): candidate is TrainingCandidate => !!candidate)
    .slice(0, Math.max(count * 3, count))

  return buildTrainingPromptQueue(candidates, count)
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

export function buildTrainingPromptQueue(
  candidates: TrainingCandidate[],
  count: number,
): TrainingPrompt[] {
  const prompts: TrainingPrompt[] = []
  let offset = 0

  while (prompts.length < count && offset < candidates.length) {
    const remainingPrompts = count - prompts.length
    const remainingCandidates = candidates.length - offset
    const maxGroupSize = Math.min(3, remainingCandidates - Math.max(0, remainingPrompts - 1))
    if (maxGroupSize <= 0) break

    let groupSize = desiredTrainingGroupSize(prompts.length, maxGroupSize)
    if (remainingPrompts === 1) {
      groupSize = Math.min(3, remainingCandidates)
    }

    const group = candidates.slice(offset, offset + groupSize)
    offset += groupSize

    prompts.push({
      id: createTrainingPromptId(),
      noteIds: group.map(candidate => candidate.noteId),
      words: group.map(candidate => candidate.word),
      definitions: group.map(candidate => candidate.definition),
      promptTranslation: '',
      referenceSentence: '',
    })
  }

  return prompts
}

function desiredTrainingGroupSize(index: number, maxGroupSize: number) {
  const pattern = [1, 2, 1, 3]
  return Math.max(1, Math.min(pattern[index % pattern.length], maxGroupSize))
}

function createTrainingPromptId() {
  return `training_prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export async function generateTrainingPrompt(
  apiKey: string,
  nativeLanguage: string,
  jlptLevel: JlptLevel,
  prompt: TrainingPrompt,
): Promise<TrainingPrompt> {
  const referenceSentence = await requestTrainingPrompt(apiKey, jlptLevel, prompt)
  const promptTranslation = await translateSentence(
    apiKey,
    referenceSentence,
    nativeLanguage || 'English',
    prompt.words.join('、'),
  )

  return {
    ...prompt,
    promptTranslation,
    referenceSentence,
  }
}

export async function streamTrainingPrompt(
  apiKey: string,
  nativeLanguage: string,
  jlptLevel: JlptLevel,
  prompt: TrainingPrompt,
  handlers: {
    onReferenceDelta?: (delta: string) => void
    onTranslationDelta?: (delta: string) => void
  } = {},
): Promise<TrainingPrompt> {
  const referenceHandlers: StreamTextHandlers = { onDelta: handlers.onReferenceDelta }
  const translationHandlers: StreamTextHandlers = { onDelta: handlers.onTranslationDelta }
  const referenceSentence = await requestStreamingTrainingPrompt(apiKey, jlptLevel, prompt, referenceHandlers)
  const promptTranslation = await streamTranslateSentence(
    apiKey,
    referenceSentence,
    nativeLanguage || 'English',
    translationHandlers,
    prompt.words.join('、'),
  )

  return {
    ...prompt,
    promptTranslation,
    referenceSentence,
  }
}
