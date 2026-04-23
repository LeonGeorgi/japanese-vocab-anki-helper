import { useState } from 'react'
import { JLPT_LEVELS } from '../constants'
import type { TextVocabHistoryEntry } from '../state/vocabSessionAtoms'
import type { JlptLevel } from '../types'
import styles from './AppSidebar.module.css'

interface Props {
  entries: TextVocabHistoryEntry[]
  activeTextSessionId: string
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  onCreateTextSession: () => void
  onRestoreTextSession: (id: string) => void
  onDeleteTextSession: (id: string) => void
  apiKey: string
  onApiKeyChange: (key: string) => void
  jlptLevel: JlptLevel
  onLevelChange: (level: JlptLevel) => void
  nativeLanguage: string
  onNativeLanguageChange: (language: string) => void
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function AppSidebar({
  entries,
  activeTextSessionId,
  collapsed,
  onCollapsedChange,
  onCreateTextSession,
  onRestoreTextSession,
  onDeleteTextSession,
  apiKey,
  onApiKeyChange,
  jlptLevel,
  onLevelChange,
  nativeLanguage,
  onNativeLanguageChange,
}: Props) {
  const [apiKeyDraft, setApiKeyDraft] = useState('')
  const [nativeLanguageDraft, setNativeLanguageDraft] = useState(nativeLanguage)

  function saveApiKey() {
    if (!apiKeyDraft) return
    onApiKeyChange(apiKeyDraft)
    setApiKeyDraft('')
  }

  function commitNativeLanguage(value: string) {
    const trimmed = value.trim()
    if (trimmed !== nativeLanguage) onNativeLanguageChange(trimmed)
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          {!collapsed && (
            <>
              <div className={styles.title}>Sessions</div>
              <div className={styles.count}>{entries.length}</div>
            </>
          )}
          <button
            type="button"
            className={styles.collapseButton}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => onCollapsedChange(!collapsed)}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>
        {!collapsed && (
          <button
            type="button"
            className={`btn btn-primary ${styles.saveButton}`}
            onClick={onCreateTextSession}
          >
            New session
          </button>
        )}
      </div>

      {!collapsed && (
        <div className={styles.content}>
          <section className={styles.settings}>
            <div className={styles.sectionTitle}>Settings</div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Anthropic API key</span>
              <div className={styles.apiKeyStatus}>
                <span className={`${styles.statusDot} ${apiKey ? styles.statusSet : ''}`} />
                {apiKey ? 'Set' : 'Not set'}
              </div>
              <form
                className={styles.apiKeyForm}
                onSubmit={e => {
                  e.preventDefault()
                  saveApiKey()
                }}
              >
                <input
                  className={styles.input}
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKeyDraft}
                  onChange={e => setApiKeyDraft(e.target.value)}
                />
                <button className="btn btn-primary" type="submit" disabled={!apiKeyDraft}>
                  Save
                </button>
              </form>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Native language</span>
              <input
                className={styles.input}
                type="text"
                placeholder="e.g. English"
                value={nativeLanguageDraft}
                onChange={e => setNativeLanguageDraft(e.target.value)}
                onBlur={e => commitNativeLanguage(e.target.value)}
              />
            </label>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>My level</span>
              <div className={styles.levelButtons}>
                {JLPT_LEVELS.map(level => (
                  <button
                    key={level}
                    type="button"
                    className={`${styles.levelButton} ${jlptLevel === level ? styles.activeLevelButton : ''}`}
                    onClick={() => onLevelChange(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>History</div>
            <div className={styles.count}>{entries.length}</div>
          </div>
          {entries.length === 0 ? (
            <div className={styles.empty}>No saved sessions yet.</div>
          ) : (
            <div className={styles.list}>
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className={`${styles.entry} ${entry.id === activeTextSessionId ? styles.activeEntry : ''}`}
                >
                  <button
                    type="button"
                    className={styles.entryMain}
                    onClick={() => onRestoreTextSession(entry.id)}
                  >
                    <div className={styles.entryTitle}>{entry.title}</div>
                    <div className={styles.entryMeta}>
                      Text vocab · {entry.session.words.length} words · {dateFormatter.format(entry.updatedAt)}
                    </div>
                  </button>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    title="Delete session"
                    onClick={() => onDeleteTextSession(entry.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
