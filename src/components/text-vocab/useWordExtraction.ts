import type { Dispatch, SetStateAction } from 'react'
import { useState } from 'react'
import { extractWords } from '../../api/claude'
import type { Word } from '../../types'

interface UseWordExtractionArgs {
  apiKey: string
  transcription: string
  setWords: Dispatch<SetStateAction<Word[]>>
  clearExamples: () => void
}

export function useWordExtraction({
  apiKey,
  transcription,
  setWords,
  clearExamples,
}: UseWordExtractionArgs) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function extract() {
    setLoading(true)
    setError(null)
    setWords([])
    clearExamples()
    try {
      setWords(await extractWords(apiKey, transcription))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, extract }
}
