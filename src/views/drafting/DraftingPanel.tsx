import { useState } from 'react'
import { IconAlertTriangle, IconBulb, IconSparkles } from '@tabler/icons-react'
import { reviewDraftingText } from '../../api/llm'
import type { JlptLevel } from '../../types'
import type { Notification } from '../../hooks/useNotification'
import { DraftingFeedbackPreview } from './DraftingFeedbackPreview'
import { useDraftingSession } from './useDraftingSession'
import styles from './DraftingPanel.module.css'

interface Props {
  apiKey: string
  nativeLanguage: string
  jlptLevel: JlptLevel
  onNotify: (notification: Notification) => void
}

export function DraftingPanel({ apiKey, nativeLanguage, jlptLevel, onNotify }: Props) {
  const {
    draftText,
    purposeText,
    feedback,
    lastFeedbackDraftText,
    feedbackStale,
    setDraftText,
    setPurposeText,
    setFeedback,
    setLastFeedbackDraftText,
  } = useDraftingSession()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReview() {
    const trimmedDraft = draftText.trim()
    if (!trimmedDraft) return
    if (!apiKey.trim()) {
      setError('Enter an API key in Settings to use AI feedback.')
      onNotify({ type: 'error', message: 'Enter an API key in Settings to use AI feedback.' })
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const nextFeedback = await reviewDraftingText(apiKey, nativeLanguage, jlptLevel, purposeText, draftText)
      setFeedback(nextFeedback)
      setLastFeedbackDraftText(draftText)
      onNotify({ type: 'success', message: 'Drafting feedback updated.' })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to generate drafting feedback'
      setError(message)
      onNotify({ type: 'error', message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="step">
        <div className={styles.editorCard}>
          <div className={styles.editorHeader}>
            <div>
              <div className="step-label">Drafting</div>
              <div className={styles.editorIntro}>Write Japanese, then ask for feedback when you are ready.</div>
            </div>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void handleReview()}
              disabled={submitting || !draftText.trim()}
            >
              {submitting ? 'Reviewing...' : 'Get feedback'}
            </button>
          </div>

          <div className={styles.editorFields}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Purpose</span>
              <textarea
                className={styles.purposeInput}
                value={purposeText}
                onChange={e => setPurposeText(e.target.value)}
                placeholder="What is this text trying to do? For example: casual diary entry, polite email, short self-introduction."
                rows={3}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Draft</span>
              <textarea
                className={styles.draftInput}
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                placeholder="Write your Japanese draft here…"
                rows={10}
                spellCheck={false}
              />
            </label>
          </div>
        </div>
      </div>

      {error && <div className="status-bar error">{error}</div>}

      {feedbackStale && (
        <div className={`status-bar ${styles.staleBar}`}>
          <IconAlertTriangle className={styles.statusIcon} stroke={1.8} />
          The draft changed after the last review. The annotated copy below still reflects the previous version.
        </div>
      )}

      {feedback && (
        <>
          <div className="step">
            <div className={styles.feedbackCard}>
              <div className={styles.feedbackHeader}>
                <div>
                  <div className={styles.feedbackTitle}>AI feedback</div>
                  <div className={styles.feedbackSummary}>{feedback.summary}</div>
                </div>
              </div>

              <div className={styles.feedbackColumns}>
                <section className={styles.feedbackColumn}>
                  <div className={styles.columnTitle}>
                    <IconSparkles className={styles.inlineIcon} stroke={1.8} />
                    What works
                  </div>
                  {feedback.strengths.length > 0 ? (
                    <ul className={styles.list}>
                      {feedback.strengths.map(item => <li key={item}>{item}</li>)}
                    </ul>
                  ) : (
                    <div className={styles.emptyCopy}>No specific strengths were listed this time.</div>
                  )}
                </section>

                <section className={styles.feedbackColumn}>
                  <div className={styles.columnTitle}>
                    <IconBulb className={styles.inlineIcon} stroke={1.8} />
                    What to improve
                  </div>
                  {feedback.improvements.length > 0 ? (
                    <ul className={styles.list}>
                      {feedback.improvements.map(item => <li key={item}>{item}</li>)}
                    </ul>
                  ) : (
                    <div className={styles.emptyCopy}>No major improvements were listed.</div>
                  )}
                </section>
              </div>
            </div>
          </div>

          <div className="step">
            <div className={styles.feedbackCard}>
              <div className={styles.previewHeader}>
                <div>
                  <div className={styles.feedbackTitle}>Annotated copy</div>
                  <div className={styles.previewHint}>Yellow marks suboptimal phrasing. Red marks incorrect Japanese. Click a highlight to open its comment.</div>
                </div>
              </div>

              <div className={styles.previewShell}>
                <DraftingFeedbackPreview
                  sourceText={lastFeedbackDraftText}
                  annotations={feedback.annotations}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
