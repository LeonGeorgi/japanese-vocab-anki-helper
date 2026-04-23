import { useState } from 'react'
import { useAtom } from 'jotai'
import type { JlptLevel } from '../../types'
import type { Notification } from '../../hooks/useNotification'
import { useManualVocabulary } from './useManualVocabulary'
import { manualContextAtom, manualKeepContextAtom } from '../../state/settingsAtoms'
import { VocabTable } from '../../primitives/vocab/VocabTable'
import styles from './ManualVocabPanel.module.css'

interface Props {
  apiKey: string
  nativeLanguage: string
  jlptLevel: JlptLevel
  onNotify: (notification: Notification) => void
}

export function ManualVocabPanel({ apiKey, nativeLanguage, jlptLevel, onNotify }: Props) {
  const [input, setInput] = useState('')
  const [keepContext, setKeepContext] = useAtom(manualKeepContextAtom)
  const [savedContext, setSavedContext] = useAtom(manualContextAtom)
  const [context, setContext] = useState(() => keepContext === 'true' ? savedContext : '')
  const [filterEasy, setFilterEasy] = useState(false)
  const manualVocabulary = useManualVocabulary(apiKey, nativeLanguage, jlptLevel)
  const shouldKeepContext = keepContext === 'true'

  function updateContext(value: string) {
    setContext(value)
    if (shouldKeepContext) setSavedContext(value)
  }

  function updateKeepContext(checked: boolean) {
    setKeepContext(checked ? 'true' : 'false')
    setSavedContext(checked ? context : '')
  }

  async function submit() {
    const word = input.trim()
    if (!word) return
    const contextValue = context.trim()
    setInput('')
    if (shouldKeepContext) {
      setSavedContext(contextValue)
      setContext(contextValue)
    } else {
      setContext('')
      setSavedContext('')
    }
    await manualVocabulary.addInput(word, contextValue)
  }

  return (
    <>
      <div className="step">
        <div className="step-label">Manual Vocabulary</div>
        <div className={styles.section}>
          <form
            className={styles.form}
            onSubmit={e => {
              e.preventDefault()
              void submit()
            }}
          >
            <div className={styles.fields}>
              <input
                className={styles.input}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Enter a Japanese word"
              />
              <textarea
                className={styles.context}
                value={context}
                onChange={e => updateContext(e.target.value)}
                placeholder="Optional context"
                rows={3}
              />
              <label className={`filter-checkbox ${styles.keepContext}`}>
                <input
                  type="checkbox"
                  checked={shouldKeepContext}
                  onChange={e => updateKeepContext(e.target.checked)}
                />
                Keep context after generating
              </label>
            </div>
            <button className="btn btn-primary" type="submit" disabled={manualVocabulary.loading || !input.trim()}>
              {manualVocabulary.loading ? 'Checking...' : 'Generate'}
            </button>
          </form>

          {manualVocabulary.error && <div className="status-bar error">{manualVocabulary.error}</div>}

          {manualVocabulary.pendingOptions && (
            <div className={styles.options}>
              <div className={styles.optionsTitle}>Which one did you mean?</div>
              <div className={styles.optionsList}>
                {manualVocabulary.pendingOptions.map(option => (
                  <button
                    key={`${option.word}:${option.meaning}`}
                    className={styles.option}
                    onClick={() => void manualVocabulary.addResolvedOption(option)}
                  >
                    <span className={styles.optionWord}>{option.word}</span>
                    <span className={styles.optionMeaning}>{option.meaning}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {manualVocabulary.words.length > 0 && (
        <VocabTable
          title="Manual Vocabulary"
          words={manualVocabulary.words}
          examples={manualVocabulary.examples}
          apiKey={apiKey}
          jlptLevel={jlptLevel}
          filterEasy={filterEasy}
          nativeLanguage={nativeLanguage}
          onFilterChange={setFilterEasy}
          onGenerate={manualVocabulary.generate}
          onTranslate={manualVocabulary.translate}
          onSplit={manualVocabulary.split}
          onConvertToKanji={manualVocabulary.convertToKanji}
          onNotify={onNotify}
        />
      )}
    </>
  )
}
