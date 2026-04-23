import { atomWithStorage } from 'jotai/utils'
import {
  KEY_ANKI_BACKFILL_DECK,
  KEY_ANKI_DECK,
  KEY_ANKI_IMG_TYPE,
  KEY_ANKI_LOOKUP_DECK,
  KEY_ANKI_MODEL,
  KEY_FIELD_AFTER,
  KEY_FIELD_BEFORE,
  KEY_FIELD_DEFINITION,
  KEY_FIELD_IMAGE,
  KEY_FIELD_PLAIN_WORD,
  KEY_FIELD_SENTENCE,
  KEY_FIELD_WORD,
} from '../constants'

const storageOptions = { getOnInit: true }

export const ankiDeckAtom = atomWithStorage(KEY_ANKI_DECK, 'Japanese', undefined, storageOptions)
export const ankiBackfillDeckAtom = atomWithStorage(KEY_ANKI_BACKFILL_DECK, 'Japanese', undefined, storageOptions)
export const ankiLookupDeckAtom = atomWithStorage(KEY_ANKI_LOOKUP_DECK, 'Japanese', undefined, storageOptions)
export const ankiModelAtom = atomWithStorage(KEY_ANKI_MODEL, 'Basic', undefined, storageOptions)
export const ankiImageTypeAtom = atomWithStorage<'photo' | 'clipart'>(KEY_ANKI_IMG_TYPE, 'photo', undefined, storageOptions)

export const ankiFieldBeforeAtom = atomWithStorage(KEY_FIELD_BEFORE, 'Before', undefined, storageOptions)
export const ankiFieldWordAtom = atomWithStorage(KEY_FIELD_WORD, 'Word', undefined, storageOptions)
export const ankiFieldAfterAtom = atomWithStorage(KEY_FIELD_AFTER, 'After', undefined, storageOptions)
export const ankiFieldPlainWordAtom = atomWithStorage(KEY_FIELD_PLAIN_WORD, 'WordPlain', undefined, storageOptions)
export const ankiFieldDefinitionAtom = atomWithStorage(KEY_FIELD_DEFINITION, 'Definition', undefined, storageOptions)
export const ankiFieldSentenceAtom = atomWithStorage(KEY_FIELD_SENTENCE, 'Sentence', undefined, storageOptions)
export const ankiFieldImageAtom = atomWithStorage(KEY_FIELD_IMAGE, 'Image', undefined, storageOptions)
