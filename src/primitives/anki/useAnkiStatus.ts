import { useState, useEffect, useCallback } from 'react'
import { useAtomValue } from 'jotai'
import type { Word } from '../../types'
import { findNotes } from '../../api/anki'
import { ankiFieldNamesFromMapping } from '../../api/ankiNoteFields'
import { ankiFieldMappingAtom, ankiLookupDeckAtom } from '../../state/ankiAtoms'

export function useAnkiStatus(words: Word[]) {
  const deck = useAtomValue(ankiLookupDeckAtom)
  const fieldMapping = useAtomValue(ankiFieldMappingAtom)
  const fieldName = ankiFieldNamesFromMapping(fieldMapping).plainWord
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
