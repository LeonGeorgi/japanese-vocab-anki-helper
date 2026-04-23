import { atomWithStorage } from 'jotai/utils'
import type { JlptLevel } from '../types'
import { KEY_API_KEY, KEY_JLPT_LEVEL, KEY_MANUAL_CONTEXT, KEY_MANUAL_KEEP_CONTEXT, KEY_NATIVE_LANG } from '../constants'

const storageOptions = { getOnInit: true }

export const apiKeyAtom = atomWithStorage(KEY_API_KEY, '', undefined, storageOptions)
export const jlptLevelAtom = atomWithStorage<JlptLevel>(KEY_JLPT_LEVEL, 'N3', undefined, storageOptions)
export const nativeLanguageAtom = atomWithStorage(KEY_NATIVE_LANG, '', undefined, storageOptions)
export const manualKeepContextAtom = atomWithStorage<'true' | 'false'>(KEY_MANUAL_KEEP_CONTEXT, 'false', undefined, storageOptions)
export const manualContextAtom = atomWithStorage(KEY_MANUAL_CONTEXT, '', undefined, storageOptions)
