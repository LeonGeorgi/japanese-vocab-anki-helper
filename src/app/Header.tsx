import { useState } from 'react'
import { JLPT_LEVELS } from '../constants'
import type { AnkiConnectionState } from '../primitives/anki/useAnkiConnection'
import type { JlptLevel } from '../types'
import styles from './Header.module.css'

interface Props {
  jlptLevel: JlptLevel
  onLevelChange: (level: JlptLevel) => void
  nativeLanguage: string
  onNativeLanguageChange: (lang: string) => void
  ankiConnection: {
    status: AnkiConnectionState
    version: number | null
    error: string | null
    retry: () => void
  }
  showReset: boolean
  onReset: () => void
}

export function Header({
  jlptLevel, onLevelChange,
  nativeLanguage, onNativeLanguageChange,
  ankiConnection,
  showReset, onReset,
}: Props) {
  const [draft, setDraft] = useState(nativeLanguage)

  function commit(value: string) {
    const trimmed = value.trim()
    if (trimmed !== nativeLanguage) onNativeLanguageChange(trimmed)
  }

  const ankiLabel = ankiConnection.status === 'connected'
    ? 'Connected'
    : ankiConnection.status === 'checking'
      ? 'Checking'
      : 'Offline'
  const ankiTitle = ankiConnection.status === 'checking'
    ? 'Checking AnkiConnect'
    : ankiConnection.status === 'connected'
      ? `AnkiConnect version ${ankiConnection.version ?? 'unknown'}`
      : ankiConnection.error ?? 'AnkiConnect is not reachable'

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <h1>Vocab</h1>
        <p>Extract words from any photo</p>
      </div>
      <div className={styles.right}>
        <div className={styles.controls}>
          <div className={styles.ankiConnection} title={ankiTitle} role="status" aria-live="polite">
            <span className={`${styles.ankiConnectionDot} ${styles[ankiConnection.status]}`} aria-hidden="true" />
            <span>Anki {ankiLabel}</span>
            <button
              className={styles.ankiRetryButton}
              type="button"
              onClick={ankiConnection.retry}
              disabled={ankiConnection.status === 'checking'}
              title="Retry AnkiConnect check"
            >
              Retry
            </button>
          </div>
          <div className={styles.levelSelector}>
            <span className={styles.levelLabel}>My level</span>
            <div className={styles.levelButtons}>
              {JLPT_LEVELS.map(level => (
                <button
                  key={level}
                  className={`${styles.levelButton} ${jlptLevel === level ? styles.activeLevelButton : ''}`}
                  onClick={() => onLevelChange(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.levelSelector}>
            <span className={styles.levelLabel}>Native language</span>
            <input
              className={styles.languageInput}
              type="text"
              placeholder="e.g. English"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={e => commit(e.target.value)}
            />
          </div>
          {showReset && (
            <button className={styles.resetButton} onClick={onReset} title="Clear all data">
              Reset
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
