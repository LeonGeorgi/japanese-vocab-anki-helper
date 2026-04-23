import type { Dispatch, SetStateAction } from 'react'
import { useMemo } from 'react'
import { useAtom } from 'jotai'
import type { Example, Word } from '../../types'
import {
  hydrateExamples,
  manualExampleStatusAtom,
  manualVocabSessionAtom,
  toExampleStatuses,
  toStoredExamples,
} from '../../state/vocabSessionAtoms'

export function useManualVocabSession() {
  const [session, setSession] = useAtom(manualVocabSessionAtom)
  const [exampleStatuses, setExampleStatuses] = useAtom(manualExampleStatusAtom)
  const examples = useMemo(
    () => hydrateExamples(session.examples, exampleStatuses),
    [exampleStatuses, session.examples],
  )

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

  const setMeanings: Dispatch<SetStateAction<Record<string, string>>> = value => {
    setSession(prev => ({
      ...prev,
      meanings: typeof value === 'function' ? value(prev.meanings) : value,
    }))
  }

  const setContexts: Dispatch<SetStateAction<Record<string, string>>> = value => {
    setSession(prev => ({
      ...prev,
      contexts: typeof value === 'function' ? value(prev.contexts) : value,
    }))
  }

  return {
    words: session.words,
    setWords,
    examples,
    setExamples,
    meanings: session.meanings,
    setMeanings,
    contexts: session.contexts,
    setContexts,
  }
}
