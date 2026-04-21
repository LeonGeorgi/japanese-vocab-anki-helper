import { useState } from 'react'
import type { GenerateOptions, JlptLevel } from '../types'
import { convertWordToKanji, extractWords, generateExample, splitWord, transcribeImage, translateSentence } from '../api/claude'
import { useSession } from './useSession'

export function useTextVocabWorkflow(apiKey: string, nativeLanguage: string, jlptLevel: JlptLevel) {
  const [transcribeLoading, setTranscribeLoading] = useState(false)
  const [transcribeError, setTranscribeError] = useState<string | null>(null)
  const [wordsLoading, setWordsLoading] = useState(false)
  const [wordsError, setWordsError] = useState<string | null>(null)

  const session = useSession()
  const {
    transcription, setTranscription,
    setWords,
    examples, setExamples,
  } = session

  async function transcribe(base64: string, mimeType: string) {
    setTranscribeLoading(true)
    setTranscribeError(null)
    setTranscription('')
    setWords([])
    setExamples({})
    try {
      setTranscription(await transcribeImage(apiKey, base64, mimeType))
    } catch (e) {
      setTranscribeError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setTranscribeLoading(false)
    }
  }

  async function extract() {
    setWordsLoading(true)
    setWordsError(null)
    setWords([])
    setExamples({})
    try {
      setWords(await extractWords(apiKey, transcription))
    } catch (e) {
      setWordsError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setWordsLoading(false)
    }
  }

  async function generate(word: string, options: GenerateOptions = {}) {
    setExamples(prev => ({
      ...prev,
      [word]: { sentence: null, loading: true, error: null, translation: null, translationLoading: false },
    }))
    try {
      const sentence = await generateExample(apiKey, transcription, word, jlptLevel, options)
      setExamples(prev => ({
        ...prev,
        [word]: { sentence, loading: false, error: null, translation: null, translationLoading: false },
      }))
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Failed'
      setExamples(prev => ({
        ...prev,
        [word]: { sentence: null, loading: false, error, translation: null, translationLoading: false },
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
    const kanjiWord = await convertWordToKanji(apiKey, transcription, original)
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
  }

  function updateTranscription(value: string) {
    setTranscription(value)
    setWords([])
    setExamples({})
  }

  return {
    ...session,
    transcribeLoading,
    transcribeError,
    wordsLoading,
    wordsError,
    transcribe,
    extract,
    generate,
    translate,
    split,
    convertToKanji,
    updateTranscription,
  }
}
