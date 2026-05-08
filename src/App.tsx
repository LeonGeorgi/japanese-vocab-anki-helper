import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { useNotification } from './hooks/useNotification'
import { useAnkiConnection } from './primitives/anki/useAnkiConnection'
import { isAnkiBackfillEnabled } from './featureFlags'
import { apiKeyAtom, jlptLevelAtom, nativeLanguageAtom, themePreferenceAtom } from './state/settingsAtoms'
import { settingsDialogOpenAtom } from './state/uiAtoms'
import {
  deleteDraftingHistoryEntryAtom,
  deleteManualVocabHistoryEntryAtom,
  deleteTrainingHistoryEntryAtom,
  deleteTextVocabHistoryEntryAtom,
  draftingHistoryAtom,
  draftingSessionAtom,
  manualVocabHistoryAtom,
  manualVocabSessionAtom,
  resetDraftingAtom,
  resetManualVocabAtom,
  resetTrainingAtom,
  restoreDraftingHistoryAtom,
  restoreManualVocabHistoryAtom,
  restoreTrainingHistoryAtom,
  resetTextVocabAtom,
  setDraftingSessionTitleAtom,
  setManualVocabSessionTitleAtom,
  setTrainingSessionTitleAtom,
  setTextVocabSessionTitleAtom,
  restoreTextVocabHistoryAtom,
  trainingHistoryAtom,
  trainingSessionAtom,
  textVocabHistoryAtom,
  textVocabSessionAtom,
} from './state/vocabSessionAtoms'
import { Header } from './app/Header'
import { AppSidebar } from './app/AppSidebar'
import { AppSettingsDialog } from './app/AppSettingsDialog'
import { TextVocabPanel } from './views/text-vocab/TextVocabPanel'
import { ManualVocabPanel } from './views/manual-vocab/ManualVocabPanel'
import { DraftingPanel } from './views/drafting/DraftingPanel'
import { TrainingPanel } from './views/training/TrainingPanel'
import { StatsPage } from './views/stats/StatsPage'
import styles from './app/App.module.css'

const AnkiBackfillPanel = isAnkiBackfillEnabled
  ? lazy(() => import('./views/anki-backfill/AnkiBackfillPanel').then(module => ({ default: module.AnkiBackfillPanel })))
  : null

type VocabSessionKind = 'text' | 'manual' | 'drafting' | 'training'
const sessionKinds: VocabSessionKind[] = ['text', 'manual', 'drafting', 'training']

function sessionKindFromId(id: string | null): VocabSessionKind | null {
  if (!id) return null
  if (id.startsWith('text_')) return 'text'
  if (id.startsWith('manual_')) return 'manual'
  if (id.startsWith('drafting_')) return 'drafting'
  if (id.startsWith('training_')) return 'training'
  return null
}

export default function App() {
  const [apiKey, setApiKey] = useAtom(apiKeyAtom)
  const [jlptLevel, setJlptLevel] = useAtom(jlptLevelAtom)
  const [nativeLanguage, setNativeLanguage] = useAtom(nativeLanguageAtom)
  const [themePreference] = useAtom(themePreferenceAtom)
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
  const draftingSession = useAtomValue(draftingSessionAtom)
  const draftingHistory = useAtomValue(draftingHistoryAtom)
  const trainingSession = useAtomValue(trainingSessionAtom)
  const trainingHistory = useAtomValue(trainingHistoryAtom)
  const resetTextVocab = useSetAtom(resetTextVocabAtom)
  const resetManualVocab = useSetAtom(resetManualVocabAtom)
  const resetDrafting = useSetAtom(resetDraftingAtom)
  const resetTraining = useSetAtom(resetTrainingAtom)
  const restoreTextVocabHistory = useSetAtom(restoreTextVocabHistoryAtom)
  const deleteTextVocabHistoryEntry = useSetAtom(deleteTextVocabHistoryEntryAtom)
  const restoreManualVocabHistory = useSetAtom(restoreManualVocabHistoryAtom)
  const deleteManualVocabHistoryEntry = useSetAtom(deleteManualVocabHistoryEntryAtom)
  const restoreDraftingHistory = useSetAtom(restoreDraftingHistoryAtom)
  const deleteDraftingHistoryEntry = useSetAtom(deleteDraftingHistoryEntryAtom)
  const restoreTrainingHistory = useSetAtom(restoreTrainingHistoryAtom)
  const deleteTrainingHistoryEntry = useSetAtom(deleteTrainingHistoryEntryAtom)
  const setTextSessionTitle = useSetAtom(setTextVocabSessionTitleAtom)
  const setManualSessionTitle = useSetAtom(setManualVocabSessionTitleAtom)
  const setDraftingSessionTitle = useSetAtom(setDraftingSessionTitleAtom)
  const setTrainingSessionTitle = useSetAtom(setTrainingSessionTitleAtom)
  const currentSessions = {
    text: textVocabSession,
    manual: manualVocabSession,
    drafting: draftingSession,
    training: trainingSession,
  }
  const sessionHistories = {
    text: textVocabHistory,
    manual: manualVocabHistory,
    drafting: draftingHistory,
    training: trainingHistory,
  }
  const deleteSessionByKind = {
    text: deleteTextVocabHistoryEntry,
    manual: deleteManualVocabHistoryEntry,
    drafting: deleteDraftingHistoryEntry,
    training: deleteTrainingHistoryEntry,
  }
  const resetSessionByKind = {
    text: resetTextVocab,
    manual: resetManualVocab,
    drafting: resetDrafting,
    training: resetTraining,
  }
  const setSessionTitleByKind = {
    text: setTextSessionTitle,
    manual: setManualSessionTitle,
    drafting: setDraftingSessionTitle,
    training: setTrainingSessionTitle,
  }

  const routeSessionId = location.pathname.match(/^\/session\/([^/]+)$/)?.[1] ?? null
  const routeSessionKind = routeSessionId
    ? sessionKinds.find(kind =>
      currentSessions[kind].id === routeSessionId
      || sessionHistories[kind].some(entry => entry.id === routeSessionId),
    ) ?? sessionKindFromId(routeSessionId)
    : null
  const restorableSessionKind = routeSessionId
    ? sessionKinds.find(kind => sessionHistories[kind].some(entry => entry.id === routeSessionId)) ?? null
    : null
  const activeSession = routeSessionKind ? currentSessions[routeSessionKind] : null
  const activeSessionId = routeSessionKind && routeSessionId ? routeSessionId : ''
  const sessionHistory = [
    ...textVocabHistory.map(entry => ({ ...entry, kind: 'text' as const })),
    ...manualVocabHistory.map(entry => ({ ...entry, kind: 'manual' as const })),
    ...draftingHistory.map(entry => ({ ...entry, kind: 'drafting' as const })),
    ...trainingHistory.map(entry => ({ ...entry, kind: 'training' as const })),
  ].sort((a, b) => b.updatedAt - a.updatedAt)
  const sessionPanels: Record<VocabSessionKind, ReactNode> = {
    text: (
      <TextVocabPanel
        apiKey={apiKey}
        nativeLanguage={nativeLanguage}
        jlptLevel={jlptLevel}
        onNotify={notify}
      />
    ),
    manual: (
      <ManualVocabPanel
        apiKey={apiKey}
        nativeLanguage={nativeLanguage}
        jlptLevel={jlptLevel}
        onNotify={notify}
      />
    ),
    drafting: (
      <DraftingPanel
        apiKey={apiKey}
        nativeLanguage={nativeLanguage}
        jlptLevel={jlptLevel}
        onNotify={notify}
      />
    ),
    training: (
      <TrainingPanel
        apiKey={apiKey}
        nativeLanguage={nativeLanguage}
        jlptLevel={jlptLevel}
        onNotify={notify}
      />
    ),
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function applyTheme() {
      const resolvedTheme = themePreference === 'system'
        ? media.matches ? 'dark' : 'light'
        : themePreference
      document.documentElement.dataset.theme = resolvedTheme
      document.documentElement.style.colorScheme = resolvedTheme
    }

    applyTheme()
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [themePreference])

  useEffect(() => {
    if (!routeSessionId) return
    if (window.location.pathname !== `/session/${routeSessionId}`) return
    if (
      routeSessionId === textVocabSession.id
      || routeSessionId === manualVocabSession.id
      || routeSessionId === draftingSession.id
      || routeSessionId === trainingSession.id
    ) return
    if (restorableSessionKind === 'text') restoreTextVocabHistory(routeSessionId)
    else if (restorableSessionKind === 'manual') restoreManualVocabHistory(routeSessionId)
    else if (restorableSessionKind === 'drafting') restoreDraftingHistory(routeSessionId)
    else if (restorableSessionKind === 'training') restoreTrainingHistory(routeSessionId)
  }, [
    draftingSession.id,
    manualVocabSession.id,
    restorableSessionKind,
    restoreDraftingHistory,
    restoreManualVocabHistory,
    restoreTextVocabHistory,
    restoreTrainingHistory,
    routeSessionId,
    textVocabSession.id,
    trainingSession.id,
  ])

  function handleRestoreSession(id: string) {
    navigate(`/session/${id}`)
  }

  function handleDeleteSession(kind: VocabSessionKind, id: string) {
    deleteSessionByKind[kind](id)
  }

  function handleNewSession(kind: VocabSessionKind) {
    navigate(`/session/${resetSessionByKind[kind]()}`)
  }

  function handleCurrentSessionTitleChange(title: string) {
    if (!routeSessionKind) return
    setSessionTitleByKind[routeSessionKind](title)
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
        onRestoreSession={handleRestoreSession}
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
          currentSessionTitle={activeSession?.title ?? null}
          onCurrentSessionTitleChange={handleCurrentSessionTitleChange}
        />
        <Routes>
          <Route path="/" element={<Navigate to={`/session/${textVocabSession.id}`} replace />} />
          <Route
            path="/session/:sessionId"
            element={routeSessionKind ? sessionPanels[routeSessionKind] : <Navigate to={`/session/${textVocabSession.id}`} replace />}
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
          <Route path="/stats" element={<StatsPage />} />
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
