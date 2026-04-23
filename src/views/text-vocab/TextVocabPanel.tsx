import type { JlptLevel } from '../../types'
import type { Notification } from '../../hooks/useNotification'
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
      <TranscriptionStep
        apiKey={apiKey}
        transcription={textVocabulary.transcription}
        transcribing={textVocabulary.transcribeLoading}
        extracting={textVocabulary.wordsLoading}
        hasWords={textVocabulary.words.length > 0}
        transcribeError={textVocabulary.transcribeError}
        error={textVocabulary.wordsError}
        onTranscribe={textVocabulary.transcribe}
        onChange={textVocabulary.updateTranscription}
        onExtract={textVocabulary.extract}
      />
      {(textVocabulary.words.length > 0 || textVocabulary.wordsLoading) && (
        <VocabTable
          words={textVocabulary.words}
          examples={textVocabulary.examples}
          loading={textVocabulary.wordsLoading}
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
