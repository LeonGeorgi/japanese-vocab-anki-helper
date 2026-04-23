import type { JlptLevel } from '../../types'
import type { Notification } from '../../hooks/useNotification'
import { ImageStep } from './ImageStep'
import { TranscriptionStep } from './TranscriptionStep'
import { VocabTable } from '../../primitives/vocab/VocabTable'
import { useTextVocabulary } from './useTextVocabulary'

interface Props {
  apiKey: string
  nativeLanguage: string
  jlptLevel: JlptLevel
  onNotify: (notification: Notification) => void
}

export function TextVocabPanel({
  apiKey,
  nativeLanguage,
  jlptLevel,
  onNotify,
}: Props) {
  const textVocabulary = useTextVocabulary(apiKey, nativeLanguage, jlptLevel)

  return (
    <>
      <ImageStep
        apiKey={apiKey}
        hasTranscription={!!textVocabulary.transcription}
        transcribing={textVocabulary.transcribeLoading}
        error={textVocabulary.transcribeError}
        onTranscribe={textVocabulary.transcribe}
      />
      <TranscriptionStep
        transcription={textVocabulary.transcription}
        extracting={textVocabulary.wordsLoading}
        hasWords={textVocabulary.words.length > 0}
        error={textVocabulary.wordsError}
        onChange={textVocabulary.updateTranscription}
        onExtract={textVocabulary.extract}
      />
      {textVocabulary.words.length > 0 && (
        <VocabTable
          words={textVocabulary.words}
          examples={textVocabulary.examples}
          apiKey={apiKey}
          jlptLevel={jlptLevel}
          filterEasy={textVocabulary.filterEasy}
          nativeLanguage={nativeLanguage}
          onFilterChange={textVocabulary.setFilterEasy}
          onGenerate={textVocabulary.generate}
          onTranslate={textVocabulary.translate}
          onSplit={textVocabulary.split}
          onConvertToKanji={textVocabulary.convertToKanji}
          onNotify={onNotify}
        />
      )}
    </>
  )
}
