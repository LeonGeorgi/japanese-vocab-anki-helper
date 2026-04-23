import type { Dispatch, SetStateAction } from 'react'
import { useMemo } from 'react'
import { useAtom } from 'jotai'
import type { Word, Example } from '../../types'
import {
  hydrateExamples,
  resetTextVocabAtom,
  textExampleStatusAtom,
  textVocabSessionAtom,
  toExampleStatuses,
  toStoredExamples,
} from '../../state/vocabSessionAtoms'

export function useTextVocabSession() {
  const [session, setSession] = useAtom(textVocabSessionAtom)
  const [exampleStatuses, setExampleStatuses] = useAtom(textExampleStatusAtom)
  const [, reset] = useAtom(resetTextVocabAtom)
  const examples = useMemo(
    () => hydrateExamples(session.examples, exampleStatuses),
    [exampleStatuses, session.examples],
  )

  const setTranscription: Dispatch<SetStateAction<string>> = value => {
    setSession(prev => ({
      ...prev,
      transcription: typeof value === 'function' ? value(prev.transcription) : value,
    }))
  }

  const setWords: Dispatch<SetStateAction<Word[]>> = value => {
    setSession(prev => ({
      ...prev,
      words: typeof value === 'function' ? value(prev.words) : value,
    }))
  }

  const setExamples: Dispatch<SetStateAction<Record<string, Example>>> = value => {
    setExampleStatuses(prevStatuses => {
      let nextExamples: Record<string, Example> = {}
      setSession(prevSession => {
        const current = hydrateExamples(prevSession.examples, prevStatuses)
        nextExamples = typeof value === 'function' ? value(current) : value
        return { ...prevSession, examples: toStoredExamples(nextExamples) }
      })
      return toExampleStatuses(nextExamples)
    })
  }

  const setFilterEasy: Dispatch<SetStateAction<boolean>> = value => {
    setSession(prev => ({
      ...prev,
      filterEasy: typeof value === 'function' ? value(prev.filterEasy) : value,
    }))
  }

  return {
    transcription: session.transcription,
    setTranscription,
    words: session.words,
    setWords,
    examples,
    setExamples,
    filterEasy: session.filterEasy,
    setFilterEasy,
    reset,
  }
}
