import { useState } from 'react'
import type { JlptLevel } from '../types'
import type { Notification } from '../hooks/useNotification'
import { useManualVocabWorkflow } from '../hooks/useManualVocabWorkflow'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { KEY_MANUAL_CONTEXT, KEY_MANUAL_KEEP_CONTEXT } from '../constants'
import { VocabTable } from './VocabTable'

interface Props {
  apiKey: string
  nativeLanguage: string
  jlptLevel: JlptLevel
  onNotify: (notification: Notification) => void
}

export function ManualVocabPanel({ apiKey, nativeLanguage, jlptLevel, onNotify }: Props) {
  const [input, setInput] = useState('')
  const [keepContext, setKeepContext] = useLocalStorage<'true' | 'false'>(KEY_MANUAL_KEEP_CONTEXT, 'false')
  const [savedContext, setSavedContext] = useLocalStorage(KEY_MANUAL_CONTEXT, '')
  const [context, setContext] = useState(() => keepContext === 'true' ? savedContext : '')
  const [filterEasy, setFilterEasy] = useState(false)
  const workflow = useManualVocabWorkflow(apiKey, nativeLanguage, jlptLevel)
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
    await workflow.addInput(word, contextValue)
  }

  return (
    <>
      <div className="step">
        <div className="step-label">Manual Vocabulary</div>
        <div className="manual-vocab-section">
          <form
            className="manual-vocab-form"
            onSubmit={e => {
              e.preventDefault()
              void submit()
            }}
          >
            <div className="manual-vocab-fields">
              <input
                className="manual-vocab-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Enter a Japanese word"
              />
              <textarea
                className="manual-vocab-context"
                value={context}
                onChange={e => updateContext(e.target.value)}
                placeholder="Optional context"
                rows={3}
              />
              <label className="filter-checkbox manual-keep-context">
                <input
                  type="checkbox"
                  checked={shouldKeepContext}
                  onChange={e => updateKeepContext(e.target.checked)}
                />
                Keep context after generating
              </label>
            </div>
            <button className="btn btn-primary" type="submit" disabled={workflow.loading || !input.trim()}>
              {workflow.loading ? 'Checking...' : 'Generate'}
            </button>
          </form>

          {workflow.error && <div className="status-bar error">{workflow.error}</div>}

          {workflow.pendingOptions && (
            <div className="manual-options">
              <div className="manual-options-title">Which one did you mean?</div>
              <div className="manual-options-list">
                {workflow.pendingOptions.map(option => (
                  <button
                    key={`${option.word}:${option.meaning}`}
                    className="manual-option"
                    onClick={() => void workflow.addResolvedOption(option)}
                  >
                    <span className="manual-option-word">{option.word}</span>
                    <span className="manual-option-meaning">{option.meaning}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {workflow.words.length > 0 && (
        <VocabTable
          title="Manual Vocabulary"
          words={workflow.words}
          examples={workflow.examples}
          apiKey={apiKey}
          jlptLevel={jlptLevel}
          filterEasy={filterEasy}
          nativeLanguage={nativeLanguage}
          onFilterChange={setFilterEasy}
          onGenerate={workflow.generate}
          onTranslate={workflow.translate}
          onSplit={workflow.split}
          onConvertToKanji={workflow.convertToKanji}
          onNotify={onNotify}
        />
      )}
    </>
  )
}
