import { useState } from 'react'
import { NavLink } from 'react-router'
import { JLPT_LEVELS } from '../constants'
import type { ManualVocabHistoryEntry, TextVocabHistoryEntry } from '../state/vocabSessionAtoms'
import type { JlptLevel } from '../types'
import styles from './AppSidebar.module.css'

type SidebarSessionEntry =
  | (TextVocabHistoryEntry & { kind: 'text' })
  | (ManualVocabHistoryEntry & { kind: 'manual' })

interface Props {
  entries: SidebarSessionEntry[]
  activeSessionId: string
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  onOpenSettings: () => void
  onRestoreTextSession: (id: string) => void
  onRestoreManualSession: (id: string) => void
  onDeleteSession: (kind: 'text' | 'manual', id: string) => void
  showAnkiBackfill: boolean
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

const otherLanguageValue = '__other__'

interface LanguageOption {
  code: string
  fallbackName: string
}

const commonLanguages = [
  { code: 'en', fallbackName: 'English' },
  { code: 'zh-Hans', fallbackName: 'Mandarin Chinese' },
  { code: 'es', fallbackName: 'Spanish' },
  { code: 'hi', fallbackName: 'Hindi' },
  { code: 'ar', fallbackName: 'Arabic' },
  { code: 'bn', fallbackName: 'Bengali' },
  { code: 'pt', fallbackName: 'Portuguese' },
  { code: 'ru', fallbackName: 'Russian' },
  { code: 'de', fallbackName: 'German' },
  { code: 'fr', fallbackName: 'French' },
  { code: 'ko', fallbackName: 'Korean' },
  { code: 'it', fallbackName: 'Italian' },
  { code: 'tr', fallbackName: 'Turkish' },
  { code: 'vi', fallbackName: 'Vietnamese' },
  { code: 'id', fallbackName: 'Indonesian' },
  { code: 'pl', fallbackName: 'Polish' },
  { code: 'nl', fallbackName: 'Dutch' },
  { code: 'th', fallbackName: 'Thai' },
]

function browserLanguageOptions(): LanguageOption[] {
  if (typeof navigator === 'undefined') return []

  return uniqueLanguageOptionsByCode(
    navigator.languages.map(language => ({
      code: language,
      fallbackName: language,
    })),
  )
}

function uniqueLanguageOptionsByCode(values: LanguageOption[]): LanguageOption[] {
  const seen = new Set<string>()
  return values.filter(value => {
    const key = value.code.toLocaleLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function baseLanguageCode(code: string): string {
  return code.toLocaleLowerCase().split('-')[0]
}

function languageOptionValue(option: LanguageOption): string {
  return languageAutonym(option)
}

function languageAutonym(option: LanguageOption): string {
  if (typeof Intl.DisplayNames !== 'function') return option.fallbackName
  return new Intl.DisplayNames([option.code], { type: 'language' }).of(option.code) ?? option.fallbackName
}

export function AppSidebar({
  entries,
  activeSessionId,
  collapsed,
  onCollapsedChange,
  onOpenSettings,
  onRestoreTextSession,
  onRestoreManualSession,
  onDeleteSession,
  showAnkiBackfill,
  jlptLevel,
  onLevelChange,
  nativeLanguage,
  onNativeLanguageChange,
}: Props) {
  const browserLanguages = browserLanguageOptions()
  const commonLanguageOptions = commonLanguages.filter(language =>
    !browserLanguages.some(browserLanguage => baseLanguageCode(browserLanguage.code) === baseLanguageCode(language.code))
  )
  const knownLanguages = [...browserLanguages, ...commonLanguageOptions]
  const matchingKnownLanguage = knownLanguages.find(language =>
    languageOptionValue(language).toLocaleLowerCase() === nativeLanguage.toLocaleLowerCase()
  )
  const [customLanguage, setCustomLanguage] = useState(nativeLanguage)
  const [customLanguageOpen, setCustomLanguageOpen] = useState(() => !matchingKnownLanguage && !!nativeLanguage)
  const selectedLanguage = customLanguageOpen
    ? otherLanguageValue
    : matchingKnownLanguage
      ? matchingKnownLanguage.code
      : nativeLanguage
      ? otherLanguageValue
      : ''

  function commitNativeLanguage(value: string) {
    const trimmed = value.trim()
    if (trimmed !== nativeLanguage) onNativeLanguageChange(trimmed)
  }

  function selectNativeLanguage(value: string) {
    if (value === otherLanguageValue) {
      setCustomLanguage(nativeLanguage)
      setCustomLanguageOpen(true)
      return
    }
    setCustomLanguageOpen(false)
    const selectedOption = knownLanguages.find(language => language.code === value)
    commitNativeLanguage(selectedOption ? languageOptionValue(selectedOption) : value)
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
              <select
                className={styles.input}
                value={selectedLanguage}
                onChange={e => selectNativeLanguage(e.target.value)}
              >
                <option value="">Choose language</option>
                {browserLanguages.length > 0 && (
                  <optgroup label="Browser languages">
                    {browserLanguages.map(language => (
                      <option key={language.code} value={language.code}>
                        {languageAutonym(language)}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Other common languages">
                  {commonLanguageOptions.map(language => (
                    <option key={language.code} value={language.code}>
                      {languageAutonym(language)}
                    </option>
                  ))}
                </optgroup>
                <option value={otherLanguageValue}>Other</option>
              </select>
              {selectedLanguage === otherLanguageValue && (
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Enter language"
                  value={customLanguage}
                  onChange={e => setCustomLanguage(e.target.value)}
                  onBlur={e => commitNativeLanguage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
                />
              )}
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
                  className={`${styles.entry} ${entry.id === activeSessionId ? styles.activeEntry : ''}`}
                >
                  <button
                    type="button"
                    className={styles.entryMain}
                    onClick={() => {
                      if (entry.kind === 'text') onRestoreTextSession(entry.id)
                      else onRestoreManualSession(entry.id)
                    }}
                  >
                    <div className={styles.entryTitle}>{entry.title}</div>
                    <div className={styles.entryMeta}>
                      {entry.kind === 'text' ? 'Text vocab' : 'Manual vocab'} · {entry.session.words.length} words · {dateFormatter.format(entry.updatedAt)}
                    </div>
                  </button>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    title="Delete session"
                    onClick={() => onDeleteSession(entry.kind, entry.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.footer}>
        <NavLink
          to="/stats"
          className={({ isActive }) => `${styles.footerLink} ${isActive ? styles.activeFooterLink : ''}`}
          title="Usage stats"
        >
          <span className={styles.footerIcon}>Σ</span>
          {!collapsed && <span>Usage stats</span>}
        </NavLink>
        {showAnkiBackfill && (
          <NavLink
            to="/anki-backfill"
            className={({ isActive }) => `${styles.footerLink} ${isActive ? styles.activeFooterLink : ''}`}
            title="Anki Backfill"
          >
            <span className={styles.footerIcon}>A</span>
            {!collapsed && <span>Anki Backfill</span>}
          </NavLink>
        )}
      </div>
    </aside>
  )
}
