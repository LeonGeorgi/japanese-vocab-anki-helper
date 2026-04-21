import { addNote } from './anki'
import { annotateSentence, defineWord, translateSentence } from './claude'
import { toAnkiNoteFields } from './ankiNoteFields'
import {
  KEY_ANKI_DECK, KEY_ANKI_MODEL,
  KEY_FIELD_BEFORE, KEY_FIELD_WORD, KEY_FIELD_AFTER,
  KEY_FIELD_PLAIN_WORD, KEY_FIELD_DEFINITION, KEY_FIELD_SENTENCE, KEY_FIELD_IMAGE,
} from '../constants'

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

function storedString(key: string, defaultValue: string) {
  return localStorage.getItem(key) ?? defaultValue
}

export function getStoredAnkiConfig() {
  return {
    deck: storedString(KEY_ANKI_DECK, 'Japanese'),
    model: storedString(KEY_ANKI_MODEL, 'Basic'),
    fields: {
      before: storedString(KEY_FIELD_BEFORE, 'Before'),
      word: storedString(KEY_FIELD_WORD, 'Word'),
      after: storedString(KEY_FIELD_AFTER, 'After'),
      plainWord: storedString(KEY_FIELD_PLAIN_WORD, 'WordPlain'),
      definition: storedString(KEY_FIELD_DEFINITION, 'Definition'),
      sentence: storedString(KEY_FIELD_SENTENCE, 'Sentence'),
      image: storedString(KEY_FIELD_IMAGE, 'Image'),
    },
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
