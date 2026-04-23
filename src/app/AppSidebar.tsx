import { useEffect, useState } from 'react'
import { JLPT_LEVELS } from '../constants'
import type { TextVocabHistoryEntry } from '../state/vocabSessionAtoms'
import type { JlptLevel } from '../types'
import styles from './AppSidebar.module.css'

interface Props {
  entries: TextVocabHistoryEntry[]
  activeTextSessionId: string
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  onOpenSettings: () => void
  onRestoreTextSession: (id: string) => void
  onDeleteTextSession: (id: string) => void
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
  onOpenSettings,
  onRestoreTextSession,
  onDeleteTextSession,
  jlptLevel,
  onLevelChange,
  nativeLanguage,
  onNativeLanguageChange,
}: Props) {
  const [nativeLanguageDraft, setNativeLanguageDraft] = useState(nativeLanguage)

  useEffect(() => {
    setNativeLanguageDraft(nativeLanguage)
  }, [nativeLanguage])

  function commitNativeLanguage(value: string) {
    const trimmed = value.trim()
    if (trimmed !== nativeLanguage) onNativeLanguageChange(trimmed)
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.iconButton}
            title="Settings"
            onClick={onOpenSettings}
          >
            ⚙
          </button>
          <button
            type="button"
            className={styles.iconButton}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => onCollapsedChange(!collapsed)}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className={styles.content}>
          <section className={styles.quickSettings}>
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

          <div className={styles.sectionTitle}>History</div>
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
