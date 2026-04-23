import { lazy, Suspense } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { Navigate, NavLink, Route, Routes } from 'react-router'
import { useNotification } from './hooks/useNotification'
import { useAnkiConnection } from './hooks/useAnkiConnection'
import { isAnkiBackfillEnabled } from './featureFlags'
import { apiKeyAtom, jlptLevelAtom, nativeLanguageAtom } from './state/settingsAtoms'
import { resetTextVocabAtom, textVocabSessionAtom } from './state/vocabSessionAtoms'
import { Header } from './components/Header'
import { ApiKeyPanel } from './components/ApiKeyPanel'
import { TextVocabPanel } from './components/TextVocabPanel'
import { ManualVocabPanel } from './components/ManualVocabPanel'
import './App.css'

const AnkiBackfillPanel = isAnkiBackfillEnabled
  ? lazy(() => import('./components/AnkiBackfillPanel').then(module => ({ default: module.AnkiBackfillPanel })))
  : null

export default function App() {
  const [apiKey, setApiKey] = useAtom(apiKeyAtom)
  const [jlptLevel, setJlptLevel] = useAtom(jlptLevelAtom)
  const [nativeLanguage, setNativeLanguage] = useAtom(nativeLanguageAtom)

  const { notification, notify } = useNotification()
  const ankiConnection = useAnkiConnection()
  const textVocabSession = useAtomValue(textVocabSessionAtom)
  const resetTextVocab = useSetAtom(resetTextVocabAtom)

  const hasData = !!textVocabSession.transcription || textVocabSession.words.length > 0

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
        ankiConnection={ankiConnection}
        showReset={hasData}
        onReset={resetTextVocab}
      />
      <div className="app-tabs">
        <NavLink to="/" end className={({ isActive }) => `app-tab ${isActive ? 'active' : ''}`}>
          Text Vocab
        </NavLink>
        <NavLink to="/manual-vocab" className={({ isActive }) => `app-tab ${isActive ? 'active' : ''}`}>
          Manual Vocab
        </NavLink>
        {isAnkiBackfillEnabled && (
          <NavLink to="/anki-backfill" className={({ isActive }) => `app-tab ${isActive ? 'active' : ''}`}>
            Anki Backfill
          </NavLink>
        )}
      </div>
      <ApiKeyPanel apiKey={apiKey} onSave={setApiKey} />
      <Routes>
        <Route
          path="/"
          element={
            <TextVocabPanel
              apiKey={apiKey}
              nativeLanguage={nativeLanguage}
              jlptLevel={jlptLevel}
              onNotify={notify}
            />
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
        {AnkiBackfillPanel && (
          <Route
            path="/anki-backfill"
            element={
              <Suspense fallback={null}>
                <AnkiBackfillPanel
                  apiKey={apiKey}
                  nativeLanguage={nativeLanguage}
                  onNotify={notify}
                />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
