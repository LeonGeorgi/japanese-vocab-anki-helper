import { useState } from 'react'
import { JLPT_LEVELS } from '../constants'
import type { AnkiConnectionState } from '../hooks/useAnkiConnection'
import type { JlptLevel } from '../types'

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
    <header className="header">
      <div className="header-brand">
        <h1>Vocab</h1>
        <p>Extract words from any photo</p>
      </div>
      <div className="header-right">
        <div className="header-controls">
          <div className="anki-connection" title={ankiTitle} role="status" aria-live="polite">
            <span className={`anki-connection-dot ${ankiConnection.status}`} aria-hidden="true" />
            <span>Anki {ankiLabel}</span>
            <button
              className="anki-retry-btn"
              type="button"
              onClick={ankiConnection.retry}
              disabled={ankiConnection.status === 'checking'}
              title="Retry AnkiConnect check"
            >
              Retry
            </button>
          </div>
          <div className="jlpt-selector">
            <span className="jlpt-label">My level</span>
            <div className="jlpt-buttons">
              {JLPT_LEVELS.map(level => (
                <button
                  key={level}
                  className={`jlpt-btn ${jlptLevel === level ? 'active' : ''}`}
                  onClick={() => onLevelChange(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div className="jlpt-selector">
            <span className="jlpt-label">Native language</span>
            <input
              className="language-input"
              type="text"
              placeholder="e.g. English"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={e => commit(e.target.value)}
            />
          </div>
          {showReset && (
            <button className="btn-reset" onClick={onReset} title="Clear all data">
              Reset
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
