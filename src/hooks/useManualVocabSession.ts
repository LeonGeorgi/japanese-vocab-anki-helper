import { useEffect, useState } from 'react'
import type { Example, Word } from '../types'
import { KEY_MANUAL_SESSION } from '../constants'

interface ManualVocabSession {
  words: Word[]
  examples: Record<string, Example>
  meanings: Record<string, string>
  contexts: Record<string, string>
}

function loadSession(): Partial<ManualVocabSession> {
  try {
    const raw = localStorage.getItem(KEY_MANUAL_SESSION)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistSession(session: ManualVocabSession) {
  const clean: ManualVocabSession = {
    ...session,
    examples: Object.fromEntries(
      Object.entries(session.examples).map(([word, example]) => [
        word,
        {
          sentence: example.sentence,
          loading: false,
          error: null,
          translation: example.translation ?? null,
          translationLoading: false,
        },
      ]),
    ),
  }
  localStorage.setItem(KEY_MANUAL_SESSION, JSON.stringify(clean))
}

export function useManualVocabSession() {
  const saved = loadSession()

  const [words, setWords] = useState<Word[]>(saved.words ?? [])
  const [examples, setExamples] = useState<Record<string, Example>>(saved.examples ?? {})
  const [meanings, setMeanings] = useState<Record<string, string>>(saved.meanings ?? {})
  const [contexts, setContexts] = useState<Record<string, string>>(saved.contexts ?? {})

  useEffect(() => {
    persistSession({ words, examples, meanings, contexts })
  }, [words, examples, meanings, contexts])

  return {
    words,
    setWords,
    examples,
    setExamples,
    meanings,
    setMeanings,
    contexts,
    setContexts,
  }
}
