import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { IconFilter } from '@tabler/icons-react'
import type { EasyWordFilterLevel, Word, Example, GenerateOptions } from '../../types'
import {
  EASY_WORD_FILTER_LEVELS,
  JLPT_LEVELS,
  easyWordFilterLabel,
  hiddenJlptLevelsForFilter,
} from '../../constants'
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
  easyWordFilter: EasyWordFilterLevel
  nativeLanguage: string
  onFilterChange: (value: EasyWordFilterLevel) => void
  onGenerate: (word: string, options?: GenerateOptions) => void
  onTranslate: (word: string) => void
  onSplit: (word: string) => Promise<void>
  onConvertToKanji: (word: string) => Promise<void>
  onNotify: (notification: Notification) => void
}

export function VocabTable({ title = 'Vocabulary', words, examples, loading = false, apiKey, easyWordFilter, nativeLanguage, onFilterChange, onGenerate, onTranslate, onSplit, onConvertToKanji, onNotify }: Props) {
  const hiddenLevels = hiddenJlptLevelsForFilter(easyWordFilter)
  const { inAnki, refresh } = useAnkiStatus(words)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement | null>(null)
  const sliderMax = EASY_WORD_FILTER_LEVELS[EASY_WORD_FILTER_LEVELS.length - 1]
  const sliderProgress = sliderMax === 0 ? 0 : (easyWordFilter / sliderMax) * 100

  const displayedWords = useMemo(() => {
    if (hiddenLevels.length === 0) return words
    return words.filter(w => w.level === null || !hiddenLevels.includes(w.level))
  }, [words, hiddenLevels])

  const hiddenCount = words.length - displayedWords.length

  useEffect(() => {
    if (!filterOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setFilterOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [filterOpen])

  return (
    <div className="step">
      <div className="step-label">{title}</div>
      <div className={styles.section}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.filterMenu} ref={filterRef}>
              <button
                type="button"
                className={`${styles.countButton} ${filterOpen ? styles.countButtonOpen : ''}`}
                aria-haspopup="dialog"
                aria-expanded={filterOpen}
                aria-label={`Filter easy words. Currently ${easyWordFilterLabel(easyWordFilter)}`}
                onClick={() => setFilterOpen(open => !open)}
              >
                <span className={styles.count}>
                  {loading ? 'Extracting…' : `${displayedWords.length} words`}
                </span>
                <IconFilter className={styles.countIcon} stroke={1.9} />
              </button>
              {filterOpen && (
                <div className={styles.filterPopup} role="dialog" aria-label="Easy word filter">
                  <div className={styles.filterPopupHeader}>
                    <div>
                      <div className={styles.filterPopupTitle}>Easy word filter</div>
                      <div className={styles.filterPopupHint}>Hide easier JLPT words from this list.</div>
                    </div>
                    <span className={styles.filterBadge}>{easyWordFilterLabel(easyWordFilter)}</span>
                  </div>
                  <div className={styles.filterControl}>
                    <div className={styles.filterTrackWrap}>
                      <div className={styles.filterScale}>
                        <input
                          className={styles.filterSlider}
                          type="range"
                          min={0}
                          max={sliderMax}
                          step={1}
                          value={easyWordFilter}
                          aria-label="Easy word filter"
                          aria-valuetext={easyWordFilterLabel(easyWordFilter)}
                          onChange={e => onFilterChange(Number(e.target.value) as EasyWordFilterLevel)}
                          style={{ '--filter-progress': `${sliderProgress}%` } as CSSProperties}
                        />
                        <div className={styles.filterStops} aria-hidden="true">
                          <span
                            className={easyWordFilter === 0 ? styles.activeStop : ''}
                            style={{ '--stop-position': '0%' } as CSSProperties}
                          >
                            All
                          </span>
                          {JLPT_LEVELS.slice(0, sliderMax).map((level, index) => (
                            <span
                              key={level}
                              className={easyWordFilter === index + 1 ? styles.activeStop : ''}
                              style={{ '--stop-position': `${((index + 1) / sliderMax) * 100}%` } as CSSProperties}
                            >
                              {level}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {hiddenCount > 0 && <span className={styles.hiddenCount}>{hiddenCount} hidden</span>}
          </div>
        </div>
        <div className={styles.tableWrap}>
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
    </div>
  )
}
