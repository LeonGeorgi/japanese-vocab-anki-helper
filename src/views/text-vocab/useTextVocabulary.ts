import type { GenerateOptions, JlptLevel } from '../../types'
import { generateExample } from '../../api/llm'
import { useTextVocabSession } from './useTextVocabSession'
import { useExampleTranslation } from '../../primitives/vocab/hooks/useExampleTranslation'
import { useImageTranscription } from './useImageTranscription'
import { useKanjiConversion } from '../../primitives/vocab/hooks/useKanjiConversion'
import { useWordExtraction } from './useWordExtraction'
import { useWordSplitting } from '../../primitives/vocab/hooks/useWordSplitting'
import { emptyLoadingExample, exampleWithError, exampleWithSentence, renameRecordKey } from '../../primitives/vocab/hooks/vocabStateHelpers'

export function useTextVocabulary(apiKey: string, nativeLanguage: string, jlptLevel: JlptLevel) {
  const session = useTextVocabSession()
  const {
    transcription, setTranscription,
    setWords,
    examples, setExamples,
  } = session

  function clearVocabulary() {
    setWords([])
    setExamples({})
  }

  async function generate(word: string, options: GenerateOptions = {}) {
    setExamples(prev => ({ ...prev, [word]: emptyLoadingExample() }))
    try {
      const sentence = await generateExample(apiKey, transcription, word, jlptLevel, options)
      setExamples(prev => ({ ...prev, [word]: exampleWithSentence(sentence) }))
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Failed'
      setExamples(prev => ({ ...prev, [word]: exampleWithError(error) }))
    }
  }

  const transcriptionTask = useImageTranscription({ apiKey, setTranscription, clearVocabulary })
  const extractionTask = useWordExtraction({ apiKey, transcription, setWords, clearExamples: () => setExamples({}) })
  const translationTask = useExampleTranslation({ apiKey, nativeLanguage, examples, setExamples })
  const wordSplitting = useWordSplitting({ apiKey, setWords })
  const kanjiConversion = useKanjiConversion({
    apiKey,
    sourceText: transcription,
    setWords,
    onWordRenamed: (original, replacement) => {
      setExamples(prev => renameRecordKey(prev, original, replacement))
    },
  })

  function updateTranscription(value: string) {
    setTranscription(value)
    clearVocabulary()
  }

  return {
    ...session,
    transcribeLoading: transcriptionTask.loading,
    transcribeError: transcriptionTask.error,
    wordsLoading: extractionTask.loading,
    wordsError: extractionTask.error,
    transcribe: transcriptionTask.transcribe,
    extract: extractionTask.extract,
    generate,
    translate: translationTask.translate,
    split: wordSplitting.split,
    convertToKanji: kanjiConversion.convertToKanji,
    updateTranscription,
  }
}
