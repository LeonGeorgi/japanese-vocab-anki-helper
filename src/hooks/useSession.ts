import { useState, useEffect } from 'react'
import type { Word, Example } from '../types'
import { KEY_SESSION } from '../constants'

interface Session {
  transcription: string
  words: Word[]
  examples: Record<string, Example>
  filterEasy: boolean
}

function loadSession(): Partial<Session> {
  try {
    const raw = localStorage.getItem(KEY_SESSION)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistSession(session: Session) {
  // Strip transient loading/error states before writing
  const clean: Session = {
    ...session,
    examples: Object.fromEntries(
      Object.entries(session.examples).map(([word, ex]) => [
        word,
        { sentence: ex.sentence, loading: false, error: null, translation: ex.translation ?? null, translationLoading: false },
      ])
    ),
  }
  localStorage.setItem(KEY_SESSION, JSON.stringify(clean))
}

export function useSession() {
  const saved = loadSession()

  const [transcription, setTranscription] = useState(saved.transcription ?? '')
  const [words, setWords] = useState<Word[]>(saved.words ?? [])
  const [examples, setExamples] = useState<Record<string, Example>>(saved.examples ?? {})
  const [filterEasy, setFilterEasy] = useState(saved.filterEasy ?? false)

  useEffect(() => {
    persistSession({ transcription, words, examples, filterEasy })
  }, [transcription, words, examples, filterEasy])

  function reset() {
    localStorage.removeItem(KEY_SESSION)
    setTranscription('')
    setWords([])
    setExamples({})
    setFilterEasy(false)
  }

  return {
    transcription, setTranscription,
    words, setWords,
    examples, setExamples,
    filterEasy, setFilterEasy,
    reset,
  }
}
