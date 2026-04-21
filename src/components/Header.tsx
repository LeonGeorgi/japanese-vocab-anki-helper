import { useState } from 'react'
import { JLPT_LEVELS } from '../constants'
import type { JlptLevel } from '../types'

interface Props {
  jlptLevel: JlptLevel
  onLevelChange: (level: JlptLevel) => void
  nativeLanguage: string
  onNativeLanguageChange: (lang: string) => void
  showReset: boolean
  onReset: () => void
}

export function Header({
  jlptLevel, onLevelChange,
  nativeLanguage, onNativeLanguageChange,
  showReset, onReset,
}: Props) {
  const [draft, setDraft] = useState(nativeLanguage)

  function commit(value: string) {
    const trimmed = value.trim()
    if (trimmed !== nativeLanguage) onNativeLanguageChange(trimmed)
  }

  return (
    <header className="header">
      <div>
        <h1>Vocab</h1>
        <p>Extract words from any photo</p>
      </div>
      <div className="header-right">
        <div className="header-controls">
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
              onKeyDown={e => e.key === 'Enter' && commit(draft)}
            />
          </div>
        </div>
        {showReset && (
          <button className="btn-reset" onClick={onReset} title="Clear all data">
            Reset
          </button>
        )}
      </div>
    </header>
  )
}
