import { useMemo } from 'react'
import type { Word, Example, JlptLevel, GenerateOptions } from '../../types'
import { EASY_LEVELS } from '../../constants'
import { useAnkiStatus } from '../anki/useAnkiStatus'
import { VocabRow } from './VocabRow'
import styles from './VocabTable.module.css'

type Notification = { type: 'success' | 'error'; message: string }

interface Props {
  title?: string
  words: Word[]
  examples: Record<string, Example>
  loading?: boolean
  apiKey: string
  jlptLevel: JlptLevel
  filterEasy: boolean
  nativeLanguage: string
  onFilterChange: (value: boolean) => void
  onGenerate: (word: string, options?: GenerateOptions) => void
  onTranslate: (word: string) => void
  onSplit: (word: string) => Promise<void>
  onConvertToKanji: (word: string) => Promise<void>
  onNotify: (notification: Notification) => void
}

export function VocabTable({ title = 'Vocabulary', words, examples, loading = false, apiKey, jlptLevel, filterEasy, nativeLanguage, onFilterChange, onGenerate, onTranslate, onSplit, onConvertToKanji, onNotify }: Props) {
  const easyLevels = EASY_LEVELS[jlptLevel]
  const { inAnki, refresh } = useAnkiStatus(words)

  const displayedWords = useMemo(() => {
    if (!filterEasy || easyLevels.length === 0) return words
    return words.filter(w => w.level === null || !easyLevels.includes(w.level))
  }, [words, filterEasy, easyLevels])

  const hiddenCount = words.length - displayedWords.length

  return (
    <div className="step">
      <div className="step-label">{title}</div>
      <div className={styles.section}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.count}>
              {loading ? 'Extracting…' : `${displayedWords.length} words`}
            </span>
            {hiddenCount > 0 && <span className={styles.hiddenCount}>{hiddenCount} hidden</span>}
          </div>
          <div className={styles.headerRight}>
            {easyLevels.length > 0 && (
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filterEasy}
                  onChange={e => onFilterChange(e.target.checked)}
                />
                Hide {easyLevels.join('/')} words
              </label>
            )}
          </div>
        </div>
        <table className={styles.table}>
          <tbody>
            {loading && displayedWords.length === 0 && Array.from({ length: 4 }, (_, index) => (
              <tr key={`skeleton-${index}`} className={styles.skeletonRow}>
                <td className={styles.skeletonWordCell}>
                  <div className={styles.skeletonWord} aria-hidden="true" />
                </td>
                <td className={styles.skeletonExampleCell}>
                  <div className={styles.skeletonLine} aria-hidden="true" />
                  <div className={styles.skeletonLineShort} aria-hidden="true" />
                </td>
              </tr>
            ))}
            {displayedWords.map((word, i) => (
              <VocabRow
                key={i}
                word={word}
                example={examples[word.word]}
                apiKey={apiKey}
                nativeLanguage={nativeLanguage}
                inAnki={inAnki.has(word.word)}
                onGenerate={onGenerate}
                onTranslate={onTranslate}
                onSplit={onSplit}
                onConvertToKanji={onConvertToKanji}
                onAnkiClose={refresh}
                onNotify={onNotify}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
