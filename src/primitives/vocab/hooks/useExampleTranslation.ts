import type { Dispatch, SetStateAction } from 'react'
import { translateSentence } from '../../../api/claude'
import type { Example } from '../../../types'

interface UseExampleTranslationArgs {
  apiKey: string
  nativeLanguage: string
  examples: Record<string, Example>
  setExamples: Dispatch<SetStateAction<Record<string, Example>>>
}

export function useExampleTranslation({
  apiKey,
  nativeLanguage,
  examples,
  setExamples,
}: UseExampleTranslationArgs) {
  async function translate(word: string) {
    const sentence = examples[word]?.sentence
    if (!sentence || !nativeLanguage) return

    setExamples(prev => ({ ...prev, [word]: { ...prev[word], translationLoading: true } }))
    try {
      const translation = await translateSentence(apiKey, sentence, nativeLanguage)
      setExamples(prev => ({ ...prev, [word]: { ...prev[word], translation, translationLoading: false } }))
    } catch {
      setExamples(prev => ({ ...prev, [word]: { ...prev[word], translationLoading: false } }))
    }
  }

  return { translate }
}
