import type { Dispatch, SetStateAction } from 'react'
import { convertWordToKanji } from '../api/claude'
import type { Word } from '../types'
import { replaceWord } from './vocabStateHelpers'

interface UseKanjiConversionArgs {
  apiKey: string
  sourceText: string
  setWords: Dispatch<SetStateAction<Word[]>>
  onWordRenamed: (original: string, replacement: string) => void
}

export function useKanjiConversion({
  apiKey,
  sourceText,
  setWords,
  onWordRenamed,
}: UseKanjiConversionArgs) {
  async function convertToKanji(original: string) {
    const kanjiWord = await convertWordToKanji(apiKey, sourceText, original)
    if (!kanjiWord || kanjiWord === original) return

    setWords(prev => replaceWord(prev, original, kanjiWord))
    onWordRenamed(original, kanjiWord)
  }

  return { convertToKanji }
}
