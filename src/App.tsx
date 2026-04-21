import { useState } from 'react'
import type { JlptLevel } from './types'
import { KEY_API_KEY, KEY_JLPT_LEVEL, KEY_NATIVE_LANG } from './constants'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useNotification } from './hooks/useNotification'
import { useTextVocabWorkflow } from './hooks/useTextVocabWorkflow'
import { Header } from './components/Header'
import { ApiKeyPanel } from './components/ApiKeyPanel'
import { ImageStep } from './components/ImageStep'
import { TranscriptionStep } from './components/TranscriptionStep'
import { VocabTable } from './components/VocabTable'
import { AnkiBackfillPanel } from './components/AnkiBackfillPanel'
import './App.css'

type AppTab = 'vocab' | 'anki-backfill'

export default function App() {
  const [apiKey, setApiKey] = useLocalStorage(KEY_API_KEY, '')
  const [jlptLevel, setJlptLevel] = useLocalStorage<JlptLevel>(KEY_JLPT_LEVEL, 'N3')
  const [nativeLanguage, setNativeLanguage] = useLocalStorage(KEY_NATIVE_LANG, '')
  const [activeTab, setActiveTab] = useState<AppTab>('vocab')

  const { notification, notify } = useNotification()
  const vocab = useTextVocabWorkflow(apiKey, nativeLanguage, jlptLevel)

  const hasData = !!vocab.transcription || vocab.words.length > 0

  return (
    <div className="app">
      {notification && (
        <div className={`site-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      <Header
        jlptLevel={jlptLevel}
        onLevelChange={setJlptLevel}
        nativeLanguage={nativeLanguage}
        onNativeLanguageChange={setNativeLanguage}
        showReset={hasData}
        onReset={vocab.reset}
      />
      <div className="app-tabs">
        <button
          className={`app-tab ${activeTab === 'vocab' ? 'active' : ''}`}
          onClick={() => setActiveTab('vocab')}
        >
          Text Vocab
        </button>
        <button
          className={`app-tab ${activeTab === 'anki-backfill' ? 'active' : ''}`}
          onClick={() => setActiveTab('anki-backfill')}
        >
          Anki Backfill
        </button>
      </div>
      <ApiKeyPanel apiKey={apiKey} onSave={setApiKey} />
      {activeTab === 'vocab' && (
        <>
          <ImageStep
            apiKey={apiKey}
            hasTranscription={!!vocab.transcription}
            transcribing={vocab.transcribeLoading}
            error={vocab.transcribeError}
            onTranscribe={vocab.transcribe}
          />
          <TranscriptionStep
            transcription={vocab.transcription}
            extracting={vocab.wordsLoading}
            hasWords={vocab.words.length > 0}
            error={vocab.wordsError}
            onChange={vocab.updateTranscription}
            onExtract={vocab.extract}
          />
          {vocab.words.length > 0 && (
            <VocabTable
              words={vocab.words}
              examples={vocab.examples}
              apiKey={apiKey}
              jlptLevel={jlptLevel}
              filterEasy={vocab.filterEasy}
              nativeLanguage={nativeLanguage}
              onFilterChange={vocab.setFilterEasy}
              onGenerate={vocab.generate}
              onTranslate={vocab.translate}
              onSplit={vocab.split}
              onConvertToKanji={vocab.convertToKanji}
              onNotify={notify}
            />
          )}
        </>
      )}
      {activeTab === 'anki-backfill' && (
        <AnkiBackfillPanel
          apiKey={apiKey}
          nativeLanguage={nativeLanguage}
          onNotify={notify}
        />
      )}
    </div>
  )
}
