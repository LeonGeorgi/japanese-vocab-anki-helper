import type { Word, Example, GenerateOptions } from '../../types'
import type { Notification } from '../../hooks/useNotification'
import { useVocabRowActions } from './useVocabRowActions'
import { AnkiModal } from '../anki/AnkiModal'
import styles from './VocabRow.module.css'

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
        className={styles.menuItem}
        disabled={disabled}
        onClick={() => { setMenuOpen(false); action() }}
      >
        {label}
      </button>
    )
  }

  const hasSentence = !!example?.sentence

  return (
    <tr className={`${styles.row} ${inAnki ? styles.inAnki : ''}`}>
      <td className={styles.wordCell}>
        <div className={styles.wordMainRow}>
          <span className={styles.wordText}>{word.word}</span>
          {word.level && <span className={styles.wordLevel}>{word.level}</span>}
          <span className={`${styles.ankiBadge} ${inAnki ? styles.inAnkiBadge : ''}`} title={inAnki ? 'In Anki' : 'Not in Anki'}>✓</span>
          <button
            className={`${styles.iconButton} ${styles.kanjiButton}`}
            title="Write word in kanji"
            onClick={convertToKanji}
            disabled={kanjiLoading}
          >
            {kanjiLoading ? <span className={`spinner ${styles.kanjiSpinner}`} /> : '漢'}
          </button>
        </div>
        {kanjiError && <div className={styles.wordError}>{kanjiError}</div>}
      </td>
      <td className={styles.exampleCell}>
        {splitLoading && <span className={`spinner ${styles.exampleSpinner}`} />}
        {!splitLoading && (
          <>
            {(!hasSentence && !example?.loading) && (
              <div className={styles.exampleRow}>
                {!example && (
                  <button className={styles.generateButton} onClick={() => onGenerate(word.word)}>
                    Generate
                  </button>
                )}
                {example?.error && <span className={styles.exampleError}>{example.error}</span>}
                <div className={styles.menu} ref={menuRef}>
                  <button
                    className={styles.iconButton}
                    title="More actions"
                    onClick={() => setMenuOpen(o => !o)}
                  >
                    ···
                  </button>
                  {menuOpen && (
                    <div className={styles.menuDropdown}>
                      {menuItem('Split word', split)}
                    </div>
                  )}
                </div>
              </div>
            )}
            {example?.loading && <span className={`spinner ${styles.exampleSpinner}`} />}
            {hasSentence && (
              <div className={styles.exampleContent}>
                <div className={styles.exampleRow}>
                  <span className={styles.exampleSentence}>「{example.sentence}」</span>
                  <div className={styles.menu} ref={menuRef}>
                    <button
                      className={styles.iconButton}
                      title="More actions"
                      onClick={() => setMenuOpen(o => !o)}
                    >
                      ···
                    </button>
                    {menuOpen && (
                      <div className={styles.menuDropdown}>
                        {nativeLanguage && menuItem(
                          example.translationLoading ? 'Translating…' : 'Translate',
                          () => onTranslate(word.word),
                          example.translationLoading,
                        )}
                        {menuItem('Simpler sentence', () => onGenerate(word.word, { previousSentence: example.sentence ?? undefined, simplify: true }))}
                        {menuItem('Feedback…', () => setFeedbackOpen(o => !o))}
                        {menuItem('New example', () => onGenerate(word.word))}
                        <div className={styles.menuDivider} />
                        {menuItem('Split word', split)}
                      </div>
                    )}
                  </div>
                  <button
                    className={styles.iconButton}
                    title="Add to Anki"
                    onClick={() => setAnkiOpen(true)}
                  >
                    ＋
                  </button>
                  <button
                    className={styles.iconButton}
                    title="Quick add to Anki"
                    onClick={quickAdd}
                    disabled={quickAddLoading || inAnki}
                  >
                    {quickAddLoading ? <span className={`spinner ${styles.kanjiSpinner}`} /> : '⇥'}
                  </button>
                </div>
                {feedbackOpen && (
                  <form
                    className={styles.feedbackRow}
                    onSubmit={e => {
                      e.preventDefault()
                      submitFeedback()
                    }}
                  >
                    <input
                      ref={inputRef}
                      className={styles.feedbackInput}
                      placeholder="What to change?"
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Escape') setFeedbackOpen(false)
                      }}
                    />
                    <button
                      className={styles.iconButton}
                      type="submit"
                      disabled={!feedbackText.trim()}
                    >
                      →
                    </button>
                  </form>
                )}
                {example.translation && (
                  <div className={styles.exampleTranslation}>{example.translation}</div>
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
