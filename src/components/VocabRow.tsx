import type { Word, Example, GenerateOptions } from '../types'
import type { Notification } from '../hooks/useNotification'
import { useVocabRowActions } from '../hooks/useVocabRowActions'
import { AnkiModal } from './AnkiModal'

interface Props {
  word: Word
  example: Example | undefined
  apiKey: string
  nativeLanguage: string
  inAnki: boolean
  onGenerate: (word: string, options?: GenerateOptions) => void
  onTranslate: (word: string) => void
  onSplit: (word: string) => Promise<void>
  onConvertToKanji: (word: string) => Promise<void>
  onAnkiClose: () => void
  onNotify: (notification: Notification) => void
}

export function VocabRow({ word, example, apiKey, nativeLanguage, inAnki, onGenerate, onTranslate, onSplit, onConvertToKanji, onAnkiClose, onNotify }: Props) {
  const {
    feedbackOpen,
    setFeedbackOpen,
    feedbackText,
    setFeedbackText,
    inputRef,
    menuOpen,
    setMenuOpen,
    menuRef,
    ankiOpen,
    setAnkiOpen,
    splitLoading,
    kanjiLoading,
    kanjiError,
    quickAddLoading,
    submitFeedback,
    split,
    convertToKanji,
    quickAdd,
  } = useVocabRowActions({
    word,
    example,
    apiKey,
    nativeLanguage,
    onGenerate,
    onSplit,
    onConvertToKanji,
    onAnkiClose,
    onNotify,
  })

  function menuItem(label: string, action: () => void, disabled = false) {
    return (
      <button
        className="row-menu-item"
        disabled={disabled}
        onClick={() => { setMenuOpen(false); action() }}
      >
        {label}
      </button>
    )
  }

  const hasSentence = !!example?.sentence

  return (
    <tr className={`vocab-row ${inAnki ? 'in-anki' : ''}`}>
      <td className="vocab-word-cell">
        <div className="word-main-row">
          <span className="word-text">{word.word}</span>
          {word.level && <span className="word-level">{word.level}</span>}
          <span className={`anki-badge ${inAnki ? 'in-anki' : ''}`} title={inAnki ? 'In Anki' : 'Not in Anki'}>✓</span>
          <button
            className="btn-regenerate btn-kanji"
            title="Write word in kanji"
            onClick={convertToKanji}
            disabled={kanjiLoading}
          >
            {kanjiLoading ? <span className="spinner kanji-spinner" /> : '漢'}
          </button>
        </div>
        {kanjiError && <div className="word-error">{kanjiError}</div>}
      </td>
      <td className="vocab-example-cell">
        {splitLoading && <span className="spinner example-spinner" />}
        {!splitLoading && (
          <>
            {(!hasSentence && !example?.loading) && (
              <div className="example-row">
                {!example && (
                  <button className="btn-generate" onClick={() => onGenerate(word.word)}>
                    Generate
                  </button>
                )}
                {example?.error && <span className="example-error">{example.error}</span>}
                <div className="row-menu" ref={menuRef}>
                  <button
                    className="btn-regenerate"
                    title="More actions"
                    onClick={() => setMenuOpen(o => !o)}
                  >
                    ···
                  </button>
                  {menuOpen && (
                    <div className="row-menu-dropdown">
                      {menuItem('Split word', split)}
                    </div>
                  )}
                </div>
              </div>
            )}
            {example?.loading && <span className="spinner example-spinner" />}
            {hasSentence && (
              <div className="example-content">
                <div className="example-row">
                  <span className="example-sentence">「{example.sentence}」</span>
                  <div className="row-menu" ref={menuRef}>
                    <button
                      className="btn-regenerate"
                      title="More actions"
                      onClick={() => setMenuOpen(o => !o)}
                    >
                      ···
                    </button>
                    {menuOpen && (
                      <div className="row-menu-dropdown">
                        {nativeLanguage && menuItem(
                          example.translationLoading ? 'Translating…' : 'Translate',
                          () => onTranslate(word.word),
                          example.translationLoading,
                        )}
                        {menuItem('Simpler sentence', () => onGenerate(word.word, { previousSentence: example.sentence ?? undefined, simplify: true }))}
                        {menuItem('Feedback…', () => setFeedbackOpen(o => !o))}
                        {menuItem('New example', () => onGenerate(word.word))}
                        <div className="row-menu-divider" />
                        {menuItem('Split word', split)}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn-regenerate btn-anki"
                    title="Add to Anki"
                    onClick={() => setAnkiOpen(true)}
                  >
                    ＋
                  </button>
                  <button
                    className="btn-regenerate btn-anki"
                    title="Quick add to Anki"
                    onClick={quickAdd}
                    disabled={quickAddLoading || inAnki}
                  >
                    {quickAddLoading ? <span className="spinner kanji-spinner" /> : '⇥'}
                  </button>
                </div>
                {feedbackOpen && (
                  <form
                    className="feedback-row"
                    onSubmit={e => {
                      e.preventDefault()
                      submitFeedback()
                    }}
                  >
                    <input
                      ref={inputRef}
                      className="feedback-input"
                      placeholder="What to change?"
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Escape') setFeedbackOpen(false)
                      }}
                    />
                    <button
                      className="btn-regenerate"
                      type="submit"
                      disabled={!feedbackText.trim()}
                    >
                      →
                    </button>
                  </form>
                )}
                {example.translation && (
                  <div className="example-translation">{example.translation}</div>
                )}
              </div>
            )}
          </>
        )}
        {ankiOpen && example?.sentence && (
          <AnkiModal
            apiKey={apiKey}
            word={word.word}
            sentence={example.sentence}
            translation={example.translation}
            nativeLanguage={nativeLanguage}
            onClose={() => { setAnkiOpen(false); onAnkiClose() }}
          />
        )}
      </td>
    </tr>
  )
}
