import { atomWithStorage } from 'jotai/utils'
import {
  KEY_ANKI_BACKFILL_DECK,
  KEY_ANKI_DECK,
  KEY_ANKI_FIELD_MAPPING,
  KEY_ANKI_IMG_TYPE,
  KEY_ANKI_LOOKUP_DECK,
  KEY_ANKI_MODEL,
} from '../constants'
import type { AnkiFieldMapping } from '../api/ankiNoteFields'

const storageOptions = { getOnInit: true }

export const defaultAnkiFieldMapping: AnkiFieldMapping = {
  Before: 'before',
  Word: 'word',
  After: 'after',
  WordPlain: 'plainWord',
  Definition: 'definition',
  Sentence: 'sentence',
  Image: 'image',
}

export const ankiDeckAtom = atomWithStorage(KEY_ANKI_DECK, 'Japanese', undefined, storageOptions)
export const ankiBackfillDeckAtom = atomWithStorage(KEY_ANKI_BACKFILL_DECK, 'Japanese', undefined, storageOptions)
export const ankiLookupDeckAtom = atomWithStorage(KEY_ANKI_LOOKUP_DECK, 'Japanese', undefined, storageOptions)
export const ankiModelAtom = atomWithStorage(KEY_ANKI_MODEL, 'Basic', undefined, storageOptions)
export const ankiImageTypeAtom = atomWithStorage<'photo' | 'clipart'>(KEY_ANKI_IMG_TYPE, 'photo', undefined, storageOptions)
export const ankiFieldMappingAtom = atomWithStorage<AnkiFieldMapping>(KEY_ANKI_FIELD_MAPPING, defaultAnkiFieldMapping, undefined, storageOptions)
