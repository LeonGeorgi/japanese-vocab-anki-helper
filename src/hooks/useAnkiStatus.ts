import { useState, useEffect, useCallback } from 'react'
import type { Word } from '../types'
import { findNotes } from '../api/anki'
import { useLocalStorage } from './useLocalStorage'
import { KEY_ANKI_LOOKUP_DECK, KEY_FIELD_PLAIN_WORD } from '../constants'

export function useAnkiStatus(words: Word[]) {
  const [deck] = useLocalStorage(KEY_ANKI_LOOKUP_DECK, 'Japanese')
  const [fieldName] = useLocalStorage(KEY_FIELD_PLAIN_WORD, 'WordPlain')
  const [inAnki, setInAnki] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    const found = await findNotes(deck, fieldName, words.map(w => w.word))
    setInAnki(found)
  }, [deck, fieldName, words])

  useEffect(() => {
    queueMicrotask(() => { void refresh() })
  }, [refresh])

  return { inAnki, refresh }
}
