import { useMemo } from 'react'
import type { Word, Example, JlptLevel, GenerateOptions } from '../types'
import { EASY_LEVELS, KEY_ANKI_LOOKUP_DECK } from '../constants'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useAnkiStatus } from '../hooks/useAnkiStatus'
import { VocabRow } from './VocabRow'

type Notification = { type: 'success' | 'error'; message: string }

interface Props {
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

export function VocabTable({ words, examples, apiKey, jlptLevel, filterEasy, nativeLanguage, onFilterChange, onGenerate, onTranslate, onSplit, onConvertToKanji, onNotify }: Props) {
  const easyLevels = EASY_LEVELS[jlptLevel]
  const [lookupDeck, setLookupDeck] = useLocalStorage(KEY_ANKI_LOOKUP_DECK, 'Japanese')
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
      <div className="step-label">3 — Vocabulary</div>
      <div className="words-section">
        <div className="words-header">
          <div className="words-header-left">
            <span className="count">{displayedWords.length} words</span>
            {hiddenCount > 0 && <span className="hidden-count">{hiddenCount} hidden</span>}
            <label className="lookup-deck-label">
              Lookup deck
              <input
                className="lookup-deck-input"
                value={lookupDeck}
                onChange={e => setLookupDeck(e.target.value)}
              />
            </label>
          </div>
          <div className="words-header-right">
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
        <table className="vocab-table">
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
