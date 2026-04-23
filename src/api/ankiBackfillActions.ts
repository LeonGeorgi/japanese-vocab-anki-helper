import { findNotesWithEmptyField, getNotesInfo, updateNoteFields } from './anki'
import type { AnkiFieldNames } from './ankiCard'
import type { BackfillNote } from './ankiBackfill'
import { toBackfillNote } from './ankiBackfill'
import { defineWord, translateSentence } from './llm'

export async function loadBackfillCandidates(
  deck: string,
  model: string,
  fieldNames: AnkiFieldNames,
): Promise<BackfillNote[]> {
  const noteIds = await findNotesWithEmptyField(deck, model, fieldNames.sentence)
  const noteInfo = await getNotesInfo(noteIds)
  return noteInfo
    .map(note => toBackfillNote(note, fieldNames))
    .filter(note => note.sentence.length > 0 && note.plainWord.length > 0)
}

export async function fillBackfillNote(
  apiKey: string,
  note: BackfillNote,
  nativeLanguage: string,
  fieldNames: AnkiFieldNames,
) {
  const [sentenceTranslation, wordDefinition] = await Promise.all([
    translateSentence(apiKey, note.sentence, nativeLanguage),
    defineWord(apiKey, note.plainWord, nativeLanguage),
  ])

  await updateNoteFields(note.id, {
    [fieldNames.sentence]: sentenceTranslation,
    [fieldNames.definition]: wordDefinition,
  })
}
