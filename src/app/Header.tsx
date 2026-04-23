import { useState } from 'react'
import type { AnkiConnectionState } from '../primitives/anki/useAnkiConnection'
import styles from './Header.module.css'

interface Props {
  ankiConnection: {
    status: AnkiConnectionState
    version: number | null
    error: string | null
    retry: () => void
  }
  onNewSession: (kind: 'text' | 'manual') => void
}

export function Header({
  ankiConnection,
  onNewSession,
}: Props) {
  const [newSessionOpen, setNewSessionOpen] = useState(false)
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
        <p>Create Japanese Anki cards</p>
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
          <div className={styles.newSessionMenu}>
            <button
              className={styles.resetButton}
              onClick={() => setNewSessionOpen(open => !open)}
              title="Start a new session"
              aria-expanded={newSessionOpen}
            >
              New session
            </button>
            {newSessionOpen && (
              <div className={styles.newSessionPopover}>
                <button
                  type="button"
                  onClick={() => {
                    setNewSessionOpen(false)
                    onNewSession('text')
                  }}
                >
                  Text vocab
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewSessionOpen(false)
                    onNewSession('manual')
                  }}
                >
                  Manual vocab
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
