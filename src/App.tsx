import { Navigate, NavLink, Route, Routes } from 'react-router'
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
import { ManualVocabPanel } from './components/ManualVocabPanel'
import './App.css'

export default function App() {
  const [apiKey, setApiKey] = useLocalStorage(KEY_API_KEY, '')
  const [jlptLevel, setJlptLevel] = useLocalStorage<JlptLevel>(KEY_JLPT_LEVEL, 'N3')
  const [nativeLanguage, setNativeLanguage] = useLocalStorage(KEY_NATIVE_LANG, '')

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
        <NavLink to="/" end className={({ isActive }) => `app-tab ${isActive ? 'active' : ''}`}>
          Text Vocab
        </NavLink>
        <NavLink to="/manual-vocab" className={({ isActive }) => `app-tab ${isActive ? 'active' : ''}`}>
          Manual Vocab
        </NavLink>
        <NavLink to="/anki-backfill" className={({ isActive }) => `app-tab ${isActive ? 'active' : ''}`}>
          Anki Backfill
        </NavLink>
      </div>
      <ApiKeyPanel apiKey={apiKey} onSave={setApiKey} />
      <Routes>
        <Route
          path="/"
          element={
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
          }
        />
        <Route
          path="/manual-vocab"
          element={
            <ManualVocabPanel
              apiKey={apiKey}
              nativeLanguage={nativeLanguage}
              jlptLevel={jlptLevel}
              onNotify={notify}
            />
          }
        />
        <Route
          path="/anki-backfill"
          element={
            <AnkiBackfillPanel
              apiKey={apiKey}
              nativeLanguage={nativeLanguage}
              onNotify={notify}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
