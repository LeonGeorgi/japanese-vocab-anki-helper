import type { EasyWordFilterLevel, JlptLevel } from './types'

export const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
export const EASY_WORD_FILTER_LEVELS: EasyWordFilterLevel[] = [0, 1, 2, 3, 4]

// Storage keys
export const KEY_API_KEY        = 'vocab_api_key'
export const KEY_LLM_API_KEYS   = 'vocab_llm_api_keys'
export const KEY_LLM_PROVIDER   = 'vocab_llm_provider'
export const KEY_LLM_TEXT_MODEL = 'vocab_llm_text_model'
export const KEY_LLM_VISION_MODEL = 'vocab_llm_vision_model'
export const KEY_LLM_USAGE      = 'vocab_llm_usage'
export const KEY_JLPT_LEVEL     = 'vocab_jlpt_level'
export const KEY_NATIVE_LANG    = 'vocab_native_language'
export const KEY_SESSION        = 'vocab_session'
export const KEY_TEXT_SESSION_HISTORY = 'vocab_text_session_history'
export const KEY_MANUAL_SESSION = 'vocab_manual_session'
export const KEY_MANUAL_SESSION_HISTORY = 'vocab_manual_session_history'
export const KEY_TRAINING_SESSION = 'vocab_training_session'
export const KEY_TRAINING_SESSION_HISTORY = 'vocab_training_session_history'
export const KEY_DRAFTING_SESSION = 'vocab_drafting_session'
export const KEY_DRAFTING_SESSION_HISTORY = 'vocab_drafting_session_history'
export const KEY_MANUAL_KEEP_CONTEXT = 'vocab_manual_keep_context'
export const KEY_MANUAL_CONTEXT = 'vocab_manual_context'
export const KEY_THEME = 'vocab_theme'
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

export function hiddenJlptLevelsForFilter(level: EasyWordFilterLevel): JlptLevel[] {
  return JLPT_LEVELS.slice(0, level)
}

export function easyWordFilterLabel(level: EasyWordFilterLevel): string {
  if (level === 0) return 'Hide nothing'
  const hiddenLevels = hiddenJlptLevelsForFilter(level)
  return `Hide ${hiddenLevels.slice().reverse().join(' + ')}`
}

export function normalizeEasyWordFilterLevel(value: unknown): EasyWordFilterLevel {
  if (typeof value === 'number' && Number.isInteger(value)) {
    if (value <= 0) return 0
    if (value >= 4) return 4
    return value as EasyWordFilterLevel
  }

  // Legacy boolean migration from the old checkbox-based filter.
  if (value === true) return 1
  return 0
}
