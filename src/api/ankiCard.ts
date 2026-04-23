import { getDefaultStore } from 'jotai'
import { addNote } from './anki'
import { annotateSentence, defineWord, translateSentence } from './claude'
import { toAnkiNoteFields } from './ankiNoteFields'
import {
  ankiDeckAtom,
  ankiFieldMappingAtom,
  ankiModelAtom,
} from '../state/ankiAtoms'

export interface GeneratedAnkiFields {
  before: string
  word: string
  after: string
  plainWord: string
  definition: string
  sentence: string
}

export interface AnkiFieldNames {
  before: string
  word: string
  after: string
  plainWord: string
  definition: string
  sentence: string
  image: string
}

export function getStoredAnkiConfig() {
  const store = getDefaultStore()
  return {
    deck: store.get(ankiDeckAtom),
    model: store.get(ankiModelAtom),
    fields: store.get(ankiFieldMappingAtom),
  }
}

export async function generateAnkiFields(
  apiKey: string,
  word: string,
  sentence: string,
  translation: string | null,
  nativeLanguage: string,
  force = false,
): Promise<GeneratedAnkiFields> {
  const lang = nativeLanguage || 'English'
  const [[before, annotatedWord, after], definition, sentenceTranslation] = await Promise.all([
    annotateSentence(apiKey, sentence, word, force),
    defineWord(apiKey, word, lang, force),
    translation ? Promise.resolve(translation) : translateSentence(apiKey, sentence, lang),
  ])

  return {
    before,
    word: annotatedWord,
    after,
    plainWord: word,
    definition,
    sentence: sentenceTranslation,
  }
}

export async function quickAddAnkiCard(
  apiKey: string,
  word: string,
  sentence: string,
  translation: string | null,
  nativeLanguage: string,
) {
  const { deck, model, fields } = getStoredAnkiConfig()
  const generatedFields = await generateAnkiFields(apiKey, word, sentence, translation, nativeLanguage)
  await addNote(deck, model, toAnkiNoteFields(fields, generatedFields))
}
