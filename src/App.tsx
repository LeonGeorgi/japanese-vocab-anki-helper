import { lazy, Suspense, useEffect, useState } from 'react'
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

  const routeSessionId = location.pathname.match(/^\/session\/([^/]+)$/)?.[1] ?? null
  const textHistoryEntry = routeSessionId ? textVocabHistory.find(entry => entry.id === routeSessionId) : undefined
  const manualHistoryEntry = routeSessionId ? manualVocabHistory.find(entry => entry.id === routeSessionId) : undefined
  const draftingHistoryEntry = routeSessionId ? draftingHistory.find(entry => entry.id === routeSessionId) : undefined
  const trainingHistoryEntry = routeSessionId ? trainingHistory.find(entry => entry.id === routeSessionId) : undefined
  const routeSessionKind: VocabSessionKind | null = routeSessionId === textVocabSession.id || textHistoryEntry
    ? 'text'
    : routeSessionId === manualVocabSession.id || manualHistoryEntry
      ? 'manual'
      : routeSessionId === draftingSession.id || draftingHistoryEntry
        ? 'drafting'
      : routeSessionId === trainingSession.id || trainingHistoryEntry
        ? 'training'
      : sessionKindFromId(routeSessionId)
  const activeSessionId = routeSessionKind ? routeSessionId ?? '' : ''

  const sessionHistory = [
    ...textVocabHistory.map(entry => ({ ...entry, kind: 'text' as const })),
    ...manualVocabHistory.map(entry => ({ ...entry, kind: 'manual' as const })),
    ...draftingHistory.map(entry => ({ ...entry, kind: 'drafting' as const })),
    ...trainingHistory.map(entry => ({ ...entry, kind: 'training' as const })),
  ].sort((a, b) => b.updatedAt - a.updatedAt)

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

    if (textHistoryEntry) restoreTextVocabHistory(routeSessionId)
    else if (manualHistoryEntry) restoreManualVocabHistory(routeSessionId)
    else if (draftingHistoryEntry) restoreDraftingHistory(routeSessionId)
    else if (trainingHistoryEntry) restoreTrainingHistory(routeSessionId)
  }, [
    draftingHistoryEntry,
    draftingSession.id,
    manualHistoryEntry,
    manualVocabSession.id,
    restoreDraftingHistory,
    restoreManualVocabHistory,
    restoreTrainingHistory,
    restoreTextVocabHistory,
    routeSessionId,
    trainingHistoryEntry,
    trainingSession.id,
    textHistoryEntry,
    textVocabSession.id,
  ])
  
  function handleRestoreTextSession(id: string) {
    navigate(`/session/${id}`)
  }

  function handleRestoreManualSession(id: string) {
    navigate(`/session/${id}`)
  }

  function handleRestoreDraftingSession(id: string) {
    navigate(`/session/${id}`)
  }

  function handleRestoreTrainingSession(id: string) {
    navigate(`/session/${id}`)
  }

  function handleDeleteSession(kind: VocabSessionKind, id: string) {
    if (kind === 'text') deleteTextVocabHistoryEntry(id)
    else if (kind === 'manual') deleteManualVocabHistoryEntry(id)
    else if (kind === 'drafting') deleteDraftingHistoryEntry(id)
    else deleteTrainingHistoryEntry(id)
  }

  function handleNewSession(kind: VocabSessionKind) {
    const id = kind === 'text'
      ? resetTextVocab()
      : kind === 'manual'
        ? resetManualVocab()
        : kind === 'drafting'
          ? resetDrafting()
          : resetTraining()
    navigate(`/session/${id}`)
  }

  function handleCurrentSessionTitleChange(title: string) {
    if (routeSessionKind === 'manual') setManualSessionTitle(title)
    else if (routeSessionKind === 'drafting') setDraftingSessionTitle(title)
    else if (routeSessionKind === 'training') setTrainingSessionTitle(title)
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
        onRestoreDraftingSession={handleRestoreDraftingSession}
        onRestoreTrainingSession={handleRestoreTrainingSession}
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
              : routeSessionKind === 'drafting'
                ? draftingSession.title
              : routeSessionKind === 'training'
                ? trainingSession.title
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
                : routeSessionKind === 'training'
                  ? (
                      <TrainingPanel
                        apiKey={apiKey}
                        nativeLanguage={nativeLanguage}
                        jlptLevel={jlptLevel}
                        onNotify={notify}
                      />
                    )
                : routeSessionKind === 'drafting'
                  ? (
                      <DraftingPanel
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
