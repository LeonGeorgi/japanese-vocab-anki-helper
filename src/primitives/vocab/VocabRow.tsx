import type { Word, Example, GenerateOptions } from '../../types'
import type { Notification } from '../../hooks/useNotification'
import {
  IconCheck,
  IconCards,
  IconDotsVertical,
  IconLanguage,
  IconSend,
  IconSquareRoundedPlus,
} from '@tabler/icons-react'
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
    sentenceMenuOpen,
    setSentenceMenuOpen,
    sentenceMenuRef,
    wordMenuOpen,
    setWordMenuOpen,
    wordMenuRef,
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
        onClick={() => { setSentenceMenuOpen(false); setWordMenuOpen(false); action() }}
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
          <div className={styles.wordLabelGroup}>
            <span className={styles.wordText}>{word.word}</span>
            {word.level && <span className={styles.wordLevel}>{word.level}</span>}
          </div>
          <div className={styles.wordMeta}>
            <span className={`${styles.ankiBadge} ${inAnki ? styles.inAnkiBadge : ''}`} title={inAnki ? 'In Anki' : 'Not in Anki'}>
              <IconCheck className={styles.badgeIcon} stroke={2.4} />
            </span>
            <div className={styles.menu} ref={wordMenuRef}>
              <button
                className={styles.iconButton}
                title="Word actions"
                aria-label="Word actions"
                onClick={() => setWordMenuOpen(o => !o)}
              >
                <IconDotsVertical className={styles.buttonIcon} stroke={1.8} />
              </button>
              {wordMenuOpen && (
                <div className={styles.menuDropdown}>
                  {menuItem(
                    kanjiLoading ? 'Converting…' : 'Write in kanji',
                    convertToKanji,
                    kanjiLoading,
                  )}
                  {menuItem('Split word', split, splitLoading)}
                </div>
              )}
            </div>
          </div>
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
              </div>
            )}
            {example?.loading && <span className={`spinner ${styles.exampleSpinner}`} />}
            {hasSentence && (
              <div className={styles.exampleContent}>
                <div className={styles.exampleRow}>
                  <span className={styles.exampleSentence}>「{example.sentence}」</span>
                  <div className={styles.actionGroup}>
                    {nativeLanguage && (
                      <button
                        className={styles.iconButton}
                        title="Translate sentence"
                        aria-label="Translate sentence"
                        onClick={() => onTranslate(word.word)}
                        disabled={example.translationLoading}
                      >
                        {example.translationLoading ? <span className={`spinner ${styles.kanjiSpinner}`} /> : <IconLanguage className={styles.buttonIcon} stroke={1.8} />}
                      </button>
                    )}
                    <button
                      className={`${styles.iconButton} ${styles.iconButtonPrimary}`}
                      title="Add to Anki"
                      aria-label="Add to Anki"
                      onClick={() => setAnkiOpen(true)}
                    >
                      <IconCards className={styles.buttonIcon} stroke={1.8} />
                    </button>
                    <button
                      className={styles.iconButton}
                      title="Quick add to Anki"
                      aria-label="Quick add to Anki"
                      onClick={quickAdd}
                      disabled={quickAddLoading || inAnki}
                    >
                      {quickAddLoading ? <span className={`spinner ${styles.kanjiSpinner}`} /> : <IconSquareRoundedPlus className={styles.buttonIcon} stroke={1.8} />}
                    </button>
                  </div>
                  <div className={styles.menu} ref={sentenceMenuRef}>
                    <button
                      className={styles.iconButton}
                      title="More actions"
                      aria-label="More actions"
                      onClick={() => setSentenceMenuOpen(o => !o)}
                    >
                      <IconDotsVertical className={styles.buttonIcon} stroke={1.8} />
                    </button>
                  {sentenceMenuOpen && (
                    <div className={styles.menuDropdown}>
                      {menuItem('Simpler sentence', () => onGenerate(word.word, { previousSentence: example.sentence ?? undefined, simplify: true }))}
                      {menuItem('Feedback…', () => setFeedbackOpen(o => !o))}
                      {menuItem('New example', () => onGenerate(word.word))}
                      <div className={styles.menuDivider} />
                      {menuItem(
                        kanjiLoading ? 'Converting…' : 'Write in kanji',
                        convertToKanji,
                        kanjiLoading,
                      )}
                      {menuItem('Split word', split, splitLoading)}
                    </div>
                  )}
                  </div>
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
                      <IconSend className={styles.buttonIcon} stroke={1.8} />
                    </button>
                  </form>
                )}
                {example.translationLoading && (
                  <div className={styles.translationSkeleton} aria-hidden="true" />
                )}
                {!example.translationLoading && example.translation && (
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
