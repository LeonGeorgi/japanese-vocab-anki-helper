import type { AnkiConnectionState } from '../primitives/anki/useAnkiConnection'
import styles from './Header.module.css'

interface Props {
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
  ankiConnection,
  showReset, onReset,
}: Props) {
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
