import type { Dispatch, SetStateAction } from 'react'
import { splitWord } from '../api/claude'
import type { Word } from '../types'
import { replaceWordWithComponents } from './vocabStateHelpers'

interface UseWordSplittingArgs {
  apiKey: string
  setWords: Dispatch<SetStateAction<Word[]>>
}

export function useWordSplitting({ apiKey, setWords }: UseWordSplittingArgs) {
  async function split(original: string) {
    const components = await splitWord(apiKey, original)
    setWords(prev => replaceWordWithComponents(prev, original, components))
  }

  return { split }
}
