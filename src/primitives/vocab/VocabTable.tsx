import { useMemo } from 'react'
import { useAtom } from 'jotai'
import type { Word, Example, JlptLevel, GenerateOptions } from '../../types'
import { EASY_LEVELS } from '../../constants'
import { ankiLookupDeckAtom } from '../../state/ankiAtoms'
import { useAnkiStatus } from '../anki/useAnkiStatus'
import { VocabRow } from './VocabRow'
import styles from './VocabTable.module.css'

type Notification = { type: 'success' | 'error'; message: string }

interface Props {
  title?: string
  words: Word[]
  examples: Record<string, Example>
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

export function VocabTable({ title = '3 — Vocabulary', words, examples, apiKey, jlptLevel, filterEasy, nativeLanguage, onFilterChange, onGenerate, onTranslate, onSplit, onConvertToKanji, onNotify }: Props) {
  const easyLevels = EASY_LEVELS[jlptLevel]
  const [lookupDeck, setLookupDeck] = useAtom(ankiLookupDeckAtom)
  const { inAnki, refresh } = useAnkiStatus(words)

  const displayedWords = useMemo(() => {
    if (!filterEasy || easyLevels.length === 0) return words
    return words.filter(w => w.level === null || !easyLevels.includes(w.level))
  }, [words, filterEasy, easyLevels])

  const hiddenCount = words.length - displayedWords.length

  function copyAll() {
    navigator.clipboard.writeText(displayedWords.map(w => w.word).join('\n'))
  }

  return (
    <div className="step">
      <div className="step-label">{title}</div>
      <div className={styles.section}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.count}>{displayedWords.length} words</span>
            {hiddenCount > 0 && <span className={styles.hiddenCount}>{hiddenCount} hidden</span>}
            <label className={styles.lookupDeckLabel}>
              Lookup deck
              <input
                className={styles.lookupDeckInput}
                value={lookupDeck}
                onChange={e => setLookupDeck(e.target.value)}
              />
            </label>
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
            <button className="btn btn-ghost" onClick={copyAll}>
              Copy all
            </button>
          </div>
        </div>
        <table className={styles.table}>
          <tbody>
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
