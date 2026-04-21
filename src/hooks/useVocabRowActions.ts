import { useEffect, useRef, useState } from 'react'
import type { Example, GenerateOptions, Word } from '../types'
import { quickAddAnkiCard } from '../api/ankiCard'
import type { Notification } from './useNotification'

interface UseVocabRowActionsArgs {
  word: Word
  example: Example | undefined
  apiKey: string
  nativeLanguage: string
  onGenerate: (word: string, options?: GenerateOptions) => void
  onSplit: (word: string) => Promise<void>
  onConvertToKanji: (word: string) => Promise<void>
  onAnkiClose: () => void
  onNotify: (notification: Notification) => void
}

export function useVocabRowActions({
  word,
  example,
  apiKey,
  nativeLanguage,
  onGenerate,
  onSplit,
  onConvertToKanji,
  onAnkiClose,
  onNotify,
}: UseVocabRowActionsArgs) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [ankiOpen, setAnkiOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [splitLoading, setSplitLoading] = useState(false)
  const [kanjiLoading, setKanjiLoading] = useState(false)
  const [kanjiError, setKanjiError] = useState<string | null>(null)
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (feedbackOpen) inputRef.current?.focus()
  }, [feedbackOpen])

  useEffect(() => {
    if (!menuOpen) return
    function onMouseDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [menuOpen])

  function submitFeedback() {
    const text = feedbackText.trim()
    if (!text) return
    onGenerate(word.word, { previousSentence: example?.sentence ?? undefined, feedback: text })
    setFeedbackText('')
    setFeedbackOpen(false)
  }

  async function split() {
    setMenuOpen(false)
    setSplitLoading(true)
    try {
      await onSplit(word.word)
    } finally {
      setSplitLoading(false)
    }
  }

  async function convertToKanji() {
    setKanjiLoading(true)
    setKanjiError(null)
    try {
      await onConvertToKanji(word.word)
    } catch (e) {
      setKanjiError(e instanceof Error ? e.message : 'Failed to convert word')
    } finally {
      setKanjiLoading(false)
    }
  }

  async function quickAdd() {
    if (!example?.sentence) return
    setQuickAddLoading(true)
    try {
      await quickAddAnkiCard(apiKey, word.word, example.sentence, example.translation, nativeLanguage)
      onNotify({ type: 'success', message: 'Added to Anki.' })
      onAnkiClose()
    } catch (e) {
      onNotify({ type: 'error', message: e instanceof Error ? e.message : 'Failed to add note' })
    } finally {
      setQuickAddLoading(false)
    }
  }

  return {
    feedbackOpen,
    setFeedbackOpen,
    feedbackText,
    setFeedbackText,
    inputRef,
    menuOpen,
    setMenuOpen,
    menuRef,
    ankiOpen,
    setAnkiOpen,
    splitLoading,
    kanjiLoading,
    kanjiError,
    quickAddLoading,
    submitFeedback,
    split,
    convertToKanji,
    quickAdd,
  }
}
