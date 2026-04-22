import { useState } from 'react'
import type { GenerateOptions, JlptLevel, ManualVocabOption } from '../types'
import { convertWordToKanji, generateManualExample, resolveManualVocab, splitWord, translateSentence } from '../api/claude'
import { useManualVocabSession } from './useManualVocabSession'

export function useManualVocabWorkflow(apiKey: string, nativeLanguage: string, jlptLevel: JlptLevel) {
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
    setWords(prev => (
      prev.some(existing => existing.word === word) ? prev : [...prev, { word, level: null }]
    ))
    setMeanings(prev => ({ ...prev, [word]: option.meaning }))
    setContexts(prev => ({ ...prev, [word]: cleanContext }))
    await generate(word, {}, option.meaning, cleanContext)
  }

  async function generate(word: string, options: GenerateOptions = {}, meaningOverride?: string, contextOverride?: string) {
    setExamples(prev => ({
      ...prev,
      [word]: { sentence: null, loading: true, error: null, translation: null, translationLoading: false },
    }))
    try {
      const sentence = await generateManualExample(
        apiKey,
        word,
        jlptLevel,
        options,
        meaningOverride ?? meanings[word],
        contextOverride ?? contexts[word],
      )
      setExamples(prev => ({
        ...prev,
        [word]: { sentence, loading: false, error: null, translation: null, translationLoading: false },
      }))
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed'
      setExamples(prev => ({
        ...prev,
        [word]: { sentence: null, loading: false, error: message, translation: null, translationLoading: false },
      }))
    }
  }

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

  async function split(original: string) {
    const components = await splitWord(apiKey, original)
    setWords(prev => {
      const idx = prev.findIndex(w => w.word === original)
      if (idx === -1) return prev
      return [...prev.slice(0, idx), ...components, ...prev.slice(idx + 1)]
    })
  }

  async function convertToKanji(original: string) {
    const kanjiWord = await convertWordToKanji(apiKey, '', original)
    if (!kanjiWord || kanjiWord === original) return

    setWords(prev => {
      const idx = prev.findIndex(w => w.word === original)
      if (idx === -1) return prev
      const next = [...prev]
      next[idx] = { ...next[idx], word: kanjiWord }
      return next
    })

    setExamples(prev => {
      const existing = prev[original]
      if (!existing) return prev
      const rest = { ...prev }
      delete rest[original]
      return { ...rest, [kanjiWord]: existing }
    })

    setMeanings(prev => {
      const existing = prev[original]
      if (!existing) return prev
      const rest = { ...prev }
      delete rest[original]
      return { ...rest, [kanjiWord]: existing }
    })

    setContexts(prev => {
      const existing = prev[original]
      if (!existing) return prev
      const rest = { ...prev }
      delete rest[original]
      return { ...rest, [kanjiWord]: existing }
    })
  }

  return {
    words,
    examples,
    pendingOptions,
    loading,
    error,
    addInput,
    addResolvedOption,
    generate,
    translate,
    split,
    convertToKanji,
  }
}
