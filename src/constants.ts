import type { JlptLevel } from './types'

export const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

// Storage keys
export const KEY_API_KEY        = 'vocab_api_key'
export const KEY_JLPT_LEVEL     = 'vocab_jlpt_level'
export const KEY_NATIVE_LANG    = 'vocab_native_language'
export const KEY_SESSION        = 'vocab_session'
export const KEY_TEXT_SESSION_HISTORY = 'vocab_text_session_history'
export const KEY_MANUAL_SESSION = 'vocab_manual_session'
export const KEY_MANUAL_SESSION_HISTORY = 'vocab_manual_session_history'
export const KEY_MANUAL_KEEP_CONTEXT = 'vocab_manual_keep_context'
export const KEY_MANUAL_CONTEXT = 'vocab_manual_context'
export const KEY_ANKI_DECK        = 'vocab_anki_deck'
export const KEY_ANKI_BACKFILL_DECK = 'vocab_anki_backfill_deck'
export const KEY_ANKI_LOOKUP_DECK = 'vocab_anki_lookup_deck'
export const KEY_ANKI_MODEL     = 'vocab_anki_model'
export const KEY_ANKI_FIELD_MAPPING = 'vocab_anki_field_mapping'
export const KEY_ANKI_IMG_TYPE  = 'vocab_img_type'


// Vocabulary allowed in example sentences for each user level
export const VOCAB_CEILING: Record<JlptLevel, string> = {
  N5: 'only N5 vocabulary',
  N4: 'only N5 vocabulary',
  N3: 'only N5–N4 vocabulary',
  N2: 'only N5–N4 vocabulary',
  N1: 'only N5–N3 vocabulary',
}

// Levels considered too easy to show for each user level
export const EASY_LEVELS: Record<JlptLevel, JlptLevel[]> = {
  N5: [],
  N4: ['N5'],
  N3: ['N5', 'N4'],
  N2: ['N5', 'N4', 'N3'],
  N1: ['N5', 'N4', 'N3', 'N2'],
}
