import { lazy, Suspense, useEffect, useState } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { useNotification } from './hooks/useNotification'
import { useAnkiConnection } from './primitives/anki/useAnkiConnection'
import { isAnkiBackfillEnabled } from './featureFlags'
import { apiKeyAtom, jlptLevelAtom, nativeLanguageAtom } from './state/settingsAtoms'
import { settingsDialogOpenAtom } from './state/uiAtoms'
import {
  deleteManualVocabHistoryEntryAtom,
  deleteTextVocabHistoryEntryAtom,
  manualVocabHistoryAtom,
  manualVocabSessionAtom,
  resetManualVocabAtom,
  restoreManualVocabHistoryAtom,
  resetTextVocabAtom,
  setManualVocabSessionTitleAtom,
  setTextVocabSessionTitleAtom,
  restoreTextVocabHistoryAtom,
  textVocabHistoryAtom,
  textVocabSessionAtom,
} from './state/vocabSessionAtoms'
import { Header } from './app/Header'
import { AppSidebar } from './app/AppSidebar'
import { AppSettingsDialog } from './app/AppSettingsDialog'
import { TextVocabPanel } from './views/text-vocab/TextVocabPanel'
import { ManualVocabPanel } from './views/manual-vocab/ManualVocabPanel'
import styles from './app/App.module.css'

const AnkiBackfillPanel = isAnkiBackfillEnabled
  ? lazy(() => import('./views/anki-backfill/AnkiBackfillPanel').then(module => ({ default: module.AnkiBackfillPanel })))
  : null

type VocabSessionKind = 'text' | 'manual'

function sessionKindFromId(id: string | null): VocabSessionKind | null {
  if (!id) return null
  if (id.startsWith('text_')) return 'text'
  if (id.startsWith('manual_')) return 'manual'
  return null
}

export default function App() {
  const [apiKey, setApiKey] = useAtom(apiKeyAtom)
  const [jlptLevel, setJlptLevel] = useAtom(jlptLevelAtom)
  const [nativeLanguage, setNativeLanguage] = useAtom(nativeLanguageAtom)
  const [settingsOpen, setSettingsOpen] = useAtom(settingsDialogOpenAtom)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()
  const { notification, notify } = useNotification()
  const ankiConnection = useAnkiConnection()
  const textVocabSession = useAtomValue(textVocabSessionAtom)
  const textVocabHistory = useAtomValue(textVocabHistoryAtom)
  const manualVocabSession = useAtomValue(manualVocabSessionAtom)
  const manualVocabHistory = useAtomValue(manualVocabHistoryAtom)
  const resetTextVocab = useSetAtom(resetTextVocabAtom)
  const resetManualVocab = useSetAtom(resetManualVocabAtom)
  const restoreTextVocabHistory = useSetAtom(restoreTextVocabHistoryAtom)
  const deleteTextVocabHistoryEntry = useSetAtom(deleteTextVocabHistoryEntryAtom)
  const restoreManualVocabHistory = useSetAtom(restoreManualVocabHistoryAtom)
  const deleteManualVocabHistoryEntry = useSetAtom(deleteManualVocabHistoryEntryAtom)
  const setTextSessionTitle = useSetAtom(setTextVocabSessionTitleAtom)
  const setManualSessionTitle = useSetAtom(setManualVocabSessionTitleAtom)

  const routeSessionId = location.pathname.match(/^\/session\/([^/]+)$/)?.[1] ?? null
  const textHistoryEntry = routeSessionId ? textVocabHistory.find(entry => entry.id === routeSessionId) : undefined
  const manualHistoryEntry = routeSessionId ? manualVocabHistory.find(entry => entry.id === routeSessionId) : undefined
  const routeSessionKind: VocabSessionKind | null = routeSessionId === textVocabSession.id || textHistoryEntry
    ? 'text'
    : routeSessionId === manualVocabSession.id || manualHistoryEntry
      ? 'manual'
      : sessionKindFromId(routeSessionId)
  const activeSessionId = routeSessionKind ? routeSessionId ?? '' : ''

  const sessionHistory = [
    ...textVocabHistory.map(entry => ({ ...entry, kind: 'text' as const })),
    ...manualVocabHistory.map(entry => ({ ...entry, kind: 'manual' as const })),
  ].sort((a, b) => b.updatedAt - a.updatedAt)

  useEffect(() => {
    if (!routeSessionId) return
    if (window.location.pathname !== `/session/${routeSessionId}`) return
    if (routeSessionId === textVocabSession.id || routeSessionId === manualVocabSession.id) return

    if (textHistoryEntry) restoreTextVocabHistory(routeSessionId)
    else if (manualHistoryEntry) restoreManualVocabHistory(routeSessionId)
  }, [
    manualHistoryEntry,
    manualVocabSession.id,
    restoreManualVocabHistory,
    restoreTextVocabHistory,
    routeSessionId,
    textHistoryEntry,
    textVocabSession.id,
  ])

  function handleRestoreTextSession(id: string) {
    navigate(`/session/${id}`)
  }

  function handleRestoreManualSession(id: string) {
    navigate(`/session/${id}`)
  }

  function handleDeleteSession(kind: VocabSessionKind, id: string) {
    if (kind === 'text') deleteTextVocabHistoryEntry(id)
    else deleteManualVocabHistoryEntry(id)
  }

  function handleNewSession(kind: VocabSessionKind) {
    const id = kind === 'text' ? resetTextVocab() : resetManualVocab()
    navigate(`/session/${id}`)
  }

  function handleCurrentSessionTitleChange(title: string) {
    if (routeSessionKind === 'manual') setManualSessionTitle(title)
    else if (routeSessionKind === 'text') setTextSessionTitle(title)
  }

  return (
    <div className={styles.shell}>
      {notification && (
        <div className={`${styles.siteNotification} ${notification.type === 'success' ? styles.success : styles.error}`}>
          {notification.message}
        </div>
      )}
      <AppSidebar
        entries={sessionHistory}
        activeSessionId={activeSessionId}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        onOpenSettings={() => setSettingsOpen(true)}
        onRestoreTextSession={handleRestoreTextSession}
        onRestoreManualSession={handleRestoreManualSession}
        onDeleteSession={handleDeleteSession}
        showAnkiBackfill={isAnkiBackfillEnabled}
        jlptLevel={jlptLevel}
        onLevelChange={setJlptLevel}
        nativeLanguage={nativeLanguage}
        onNativeLanguageChange={setNativeLanguage}
      />
      <main className={styles.main}>
        <Header
          ankiConnection={ankiConnection}
          onNewSession={handleNewSession}
          currentSessionTitle={
            routeSessionKind === 'manual'
              ? manualVocabSession.title
              : routeSessionKind === 'text'
                ? textVocabSession.title
                : null
          }
          onCurrentSessionTitleChange={handleCurrentSessionTitleChange}
        />
        <Routes>
          <Route path="/" element={<Navigate to={`/session/${textVocabSession.id}`} replace />} />
          <Route
            path="/session/:sessionId"
            element={
              routeSessionKind === 'manual'
                ? (
                    <ManualVocabPanel
                      apiKey={apiKey}
                      nativeLanguage={nativeLanguage}
                      jlptLevel={jlptLevel}
                      onNotify={notify}
                    />
                  )
                : routeSessionKind === 'text'
                  ? (
                      <TextVocabPanel
                        apiKey={apiKey}
                        nativeLanguage={nativeLanguage}
                        jlptLevel={jlptLevel}
                        onNotify={notify}
                      />
                    )
                  : <Navigate to={`/session/${textVocabSession.id}`} replace />
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
          <Route path="*" element={<Navigate to={`/session/${textVocabSession.id}`} replace />} />
        </Routes>
      </main>
      {settingsOpen && (
        <AppSettingsDialog
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
