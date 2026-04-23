import type { Dispatch, SetStateAction } from 'react'
import { useState } from 'react'
import { transcribeImage } from '../../api/claude'

interface UseImageTranscriptionArgs {
  apiKey: string
  setTranscription: Dispatch<SetStateAction<string>>
  clearVocabulary: () => void
}

export function useImageTranscription({
  apiKey,
  setTranscription,
  clearVocabulary,
}: UseImageTranscriptionArgs) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function transcribe(base64: string, mimeType: string) {
    setLoading(true)
    setError(null)
    setTranscription('')
    clearVocabulary()
    try {
      setTranscription(await transcribeImage(apiKey, base64, mimeType))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, transcribe }
}
