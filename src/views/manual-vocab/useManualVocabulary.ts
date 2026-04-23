import { useState } from 'react'
import type { GenerateOptions, JlptLevel, ManualVocabOption } from '../../types'
import { generateManualExample, resolveManualVocab } from '../../api/claude'
import { useManualVocabSession } from './useManualVocabSession'
import { useExampleTranslation } from '../../primitives/vocab/hooks/useExampleTranslation'
import { useKanjiConversion } from '../../primitives/vocab/hooks/useKanjiConversion'
import { useWordSplitting } from '../../primitives/vocab/hooks/useWordSplitting'
import {
  addUniqueWord,
  emptyLoadingExample,
  exampleWithError,
  exampleWithSentence,
  renameRecordKey,
} from '../../primitives/vocab/hooks/vocabStateHelpers'

export function useManualVocabulary(apiKey: string, nativeLanguage: string, jlptLevel: JlptLevel) {
  const {
    words,
    setWords,
    examples,
    setExamples,
    meanings,
    setMeanings,
    contexts,
    setContexts,
  } = useManualVocabSession()
  const [pendingContext, setPendingContext] = useState('')
  const [pendingOptions, setPendingOptions] = useState<ManualVocabOption[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addInput(input: string, context = '') {
    const word = input.trim()
    if (!word) return
    const cleanContext = context.trim()
    setLoading(true)
    setError(null)
    setPendingOptions(null)
    setPendingContext(cleanContext)
    try {
      const resolution = await resolveManualVocab(apiKey, word, nativeLanguage, cleanContext)
      if (resolution.status === 'ambiguous') {
        setPendingOptions(resolution.options)
        return
      }
      await addResolvedOption(resolution.option, cleanContext)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resolve vocabulary')
    } finally {
      setLoading(false)
    }
  }

  async function addResolvedOption(option: ManualVocabOption, context = pendingContext) {
    const word = option.word.trim()
    if (!word) return
    const cleanContext = context.trim()
    setPendingOptions(null)
    setPendingContext('')
    setWords(prev => addUniqueWord(prev, word))
    setMeanings(prev => ({ ...prev, [word]: option.meaning }))
    setContexts(prev => ({ ...prev, [word]: cleanContext }))
    await generate(word, {}, option.meaning, cleanContext)
  }

  async function generate(word: string, options: GenerateOptions = {}, meaningOverride?: string, contextOverride?: string) {
    setExamples(prev => ({ ...prev, [word]: emptyLoadingExample() }))
    try {
      const sentence = await generateManualExample(
        apiKey,
        word,
        jlptLevel,
        options,
        meaningOverride ?? meanings[word],
        contextOverride ?? contexts[word],
      )
      setExamples(prev => ({ ...prev, [word]: exampleWithSentence(sentence) }))
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed'
      setExamples(prev => ({ ...prev, [word]: exampleWithError(message) }))
    }
  }

  const translationTask = useExampleTranslation({ apiKey, nativeLanguage, examples, setExamples })
  const wordSplitting = useWordSplitting({ apiKey, setWords })
  const kanjiConversion = useKanjiConversion({
    apiKey,
    sourceText: '',
    setWords,
    onWordRenamed: (original, replacement) => {
      setExamples(prev => renameRecordKey(prev, original, replacement))
      setMeanings(prev => renameRecordKey(prev, original, replacement))
      setContexts(prev => renameRecordKey(prev, original, replacement))
    },
  })

  return {
    words,
    examples,
    pendingOptions,
    loading,
    error,
    addInput,
    addResolvedOption,
    generate,
    translate: translationTask.translate,
    split: wordSplitting.split,
    convertToKanji: kanjiConversion.convertToKanji,
  }
}
