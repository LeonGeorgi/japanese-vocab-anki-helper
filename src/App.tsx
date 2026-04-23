import { lazy, Suspense } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { Navigate, NavLink, Route, Routes } from 'react-router'
import { useNotification } from './hooks/useNotification'
import { useAnkiConnection } from './primitives/anki/useAnkiConnection'
import { isAnkiBackfillEnabled } from './featureFlags'
import { apiKeyAtom, jlptLevelAtom, nativeLanguageAtom } from './state/settingsAtoms'
import { resetTextVocabAtom, textVocabSessionAtom } from './state/vocabSessionAtoms'
import { Header } from './app/Header'
import { ApiKeyPanel } from './primitives/settings/ApiKeyPanel'
import { TextVocabPanel } from './views/text-vocab/TextVocabPanel'
import { ManualVocabPanel } from './views/manual-vocab/ManualVocabPanel'
import styles from './app/App.module.css'

const AnkiBackfillPanel = isAnkiBackfillEnabled
  ? lazy(() => import('./views/anki-backfill/AnkiBackfillPanel').then(module => ({ default: module.AnkiBackfillPanel })))
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
    <div className={styles.app}>
      {notification && (
        <div className={`${styles.siteNotification} ${notification.type === 'success' ? styles.success : styles.error}`}>
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
      <div className={styles.tabs}>
        <NavLink to="/" end className={({ isActive }) => `${styles.tab} ${isActive ? styles.activeTab : ''}`}>
          Text Vocab
        </NavLink>
        <NavLink to="/manual-vocab" className={({ isActive }) => `${styles.tab} ${isActive ? styles.activeTab : ''}`}>
          Manual Vocab
        </NavLink>
        {isAnkiBackfillEnabled && (
          <NavLink to="/anki-backfill" className={({ isActive }) => `${styles.tab} ${isActive ? styles.activeTab : ''}`}>
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
