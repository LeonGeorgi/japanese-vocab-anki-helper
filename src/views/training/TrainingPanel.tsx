import { useMemo, useState } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { IconArrowRight, IconCards, IconReload } from '@tabler/icons-react'
import { generateTrainingPrompt, loadTrainingPrompts } from '../../api/training'
import { reviewTrainingAnswer } from '../../api/llm'
import type { JlptLevel } from '../../types'
import { ankiFieldNamesFromMapping, fieldMappingForModelFields } from '../../api/ankiNoteFields'
import {
  ankiFieldMappingAtom,
  ankiLookupDeckAtom,
  ankiModelAtom,
} from '../../state/ankiAtoms'
import { trainingSessionAtom } from '../../state/vocabSessionAtoms'
import { useAnkiModelFields } from '../../primitives/anki/useAnkiModelFields'
import styles from './TrainingPanel.module.css'

type Notification = { type: 'success' | 'error'; message: string }

interface Props {
  apiKey: string
  nativeLanguage: string
  jlptLevel: JlptLevel
  onNotify: (notification: Notification) => void
}

export function TrainingPanel({ apiKey, nativeLanguage, jlptLevel, onNotify }: Props) {
  const [session, setSession] = useAtom(trainingSessionAtom)
  const [deck, setDeck] = useAtom(ankiLookupDeckAtom)
  const model = useAtomValue(ankiModelAtom)
  const fieldMapping = useAtomValue(ankiFieldMappingAtom)
  const { fields: modelFields, error: modelFieldsError } = useAnkiModelFields(model, Object.keys(fieldMapping))
  const fieldNames = useMemo(
    () => ankiFieldNamesFromMapping(
      modelFields.length > 0 ? fieldMappingForModelFields(modelFields, fieldMapping) : fieldMapping,
      modelFields,
    ),
    [fieldMapping, modelFields],
  )

  const [batchSize, setBatchSize] = useState(() => Math.max(session.promptCount, 5) || 5)
  const [answer, setAnswer] = useState('')
  const [loadingPrompts, setLoadingPrompts] = useState(false)
  const [loadingNextPrompt, setLoadingNextPrompt] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const currentPrompt = session.currentPrompt
  const lastAttempt = session.attempts[session.attempts.length - 1] ?? null
  const currentAttempt = currentPrompt
    ? lastAttempt?.prompt.id === currentPrompt.id ? lastAttempt : null
    : lastAttempt
  const promptWordLabel = currentPrompt?.words.join(' ・ ') ?? ''
  const promptDefinitionLabel = currentPrompt
    ? currentPrompt.words
      .map((word, index) => {
        const definition = currentPrompt.definitions[index]?.trim()
        return definition ? `${word}: ${definition}` : ''
      })
      .filter(Boolean)
      .join(' · ')
    : ''

  async function handleLoadPrompts() {
    if (!apiKey.trim()) {
      onNotify({ type: 'error', message: 'Enter an API key in Settings to generate training prompts.' })
      return
    }

    try {
      setLoadingPrompts(true)
      const prompts = await loadTrainingPrompts(deck, model, fieldNames, batchSize)
      if (!prompts.length) {
        onNotify({ type: 'error', message: 'No usable training cards found in that deck and model.' })
        return
      }
      const [first, ...rest] = prompts
      const initialPrompt = await generateTrainingPrompt(apiKey, nativeLanguage, jlptLevel, first)
      setSession(prev => ({
        ...prev,
        currentPrompt: initialPrompt,
        queue: rest,
        attempts: [],
        promptCount: prompts.length,
      }))
      setAnswer('')
      onNotify({ type: 'success', message: `Started ${prompts.length} training prompts. Each next prompt will be generated on demand.` })
    } catch (e) {
      onNotify({ type: 'error', message: e instanceof Error ? e.message : 'Failed to load training prompts' })
    } finally {
      setLoadingPrompts(false)
    }
  }

  async function handleSubmit() {
    const trimmed = answer.trim()
    if (!currentPrompt || !trimmed) return
    if (!apiKey.trim()) {
      onNotify({ type: 'error', message: 'Enter an API key in Settings to use AI grading.' })
      return
    }

    try {
      setSubmitting(true)
      const evaluation = await reviewTrainingAnswer(
        apiKey,
        nativeLanguage,
        currentPrompt.promptTranslation,
        currentPrompt.words,
        currentPrompt.definitions,
        currentPrompt.referenceSentence,
        trimmed,
      )

      setSession(prev => ({
        ...prev,
        attempts: [
          ...prev.attempts,
          {
            prompt: currentPrompt,
            answer: trimmed,
            evaluation,
            answeredAt: Date.now(),
          },
        ],
      }))
      onNotify({ type: 'success', message: 'Answer graded.' })
    } catch (e) {
      onNotify({ type: 'error', message: e instanceof Error ? e.message : 'Failed to grade answer' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleNextPrompt() {
    if (!currentPrompt) return
    const [nextPrompt, ...rest] = session.queue
    if (!nextPrompt) {
      setSession(prev => ({
        ...prev,
        currentPrompt: null,
        queue: [],
      }))
      setAnswer('')
      return
    }
    if (!apiKey.trim()) {
      onNotify({ type: 'error', message: 'Enter an API key in Settings to generate the next prompt.' })
      return
    }

    try {
      setLoadingNextPrompt(true)
      const hydratedPrompt = nextPrompt.promptTranslation && nextPrompt.referenceSentence
        ? nextPrompt
        : await generateTrainingPrompt(apiKey, nativeLanguage, jlptLevel, nextPrompt)
      setSession(prev => ({
        ...prev,
        currentPrompt: hydratedPrompt,
        queue: rest,
      }))
      setAnswer('')
    } catch (e) {
      onNotify({ type: 'error', message: e instanceof Error ? e.message : 'Failed to generate the next prompt' })
    } finally {
      setLoadingNextPrompt(false)
    }
  }

  const remainingCount = (currentPrompt ? 1 : 0) + session.queue.length

  return (
    <>
      <div className="step">
        <div className="step-label">Training</div>
        <div className={styles.section}>
          <div className={styles.controls}>
            <label className="modal-field">
              <span className="modal-label">Deck</span>
              <input className="modal-input" value={deck} onChange={e => setDeck(e.target.value)} />
            </label>
            <label className="modal-field">
              <span className="modal-label">Model</span>
              <input className="modal-input" value={model} readOnly />
            </label>
            <label className="modal-field">
              <span className="modal-label">Prompts</span>
              <input
                className="modal-input"
                type="number"
                min={1}
                max={20}
                value={batchSize}
                onChange={e => setBatchSize(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              />
            </label>
          </div>

          {modelFieldsError && <div className="status-bar error">{modelFieldsError}</div>}

          <div className={styles.actions}>
            <button className="btn btn-ghost" onClick={() => void handleLoadPrompts()} disabled={loadingPrompts}>
              <IconReload className={styles.inlineIcon} stroke={1.8} />
              {loadingPrompts ? 'Starting...' : 'Start round'}
            </button>
            <div className={styles.progress}>
              <IconCards className={styles.inlineIcon} stroke={1.8} />
              {remainingCount > 0 ? `${remainingCount} remaining` : 'No prompts loaded'}
            </div>
          </div>
        </div>
      </div>

      {currentPrompt && (
        <div className="step">
          <div className={styles.promptCard}>
            <div className={styles.promptHeader}>
              <div>
                <div className={styles.promptLabel}>Target vocab</div>
                <div className={styles.promptWord}>{promptWordLabel}</div>
                {promptDefinitionLabel && <div className={styles.promptDefinition}>{promptDefinitionLabel}</div>}
              </div>
              <div className={styles.promptMeta}>Translate into Japanese</div>
            </div>
            <div className={styles.promptText}>{currentPrompt.promptTranslation}</div>

            <label className="modal-field">
              <span className="modal-label">Your answer</span>
              <textarea
                className={styles.answerInput}
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Write your Japanese sentence here"
                rows={4}
              />
            </label>

            <div className={styles.answerActions}>
              <button className="btn btn-primary" onClick={() => void handleSubmit()} disabled={submitting || loadingNextPrompt || !answer.trim()}>
                {submitting ? 'Grading...' : 'Grade answer'}
              </button>
              {currentAttempt && (
                <button className="btn btn-ghost" onClick={() => void handleNextPrompt()} disabled={loadingNextPrompt}>
                  {loadingNextPrompt ? 'Generating...' : 'Next prompt'}
                  <IconArrowRight className={styles.inlineIcon} stroke={1.8} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!currentPrompt && session.promptCount > 0 && (
        <div className="step">
          <div className={styles.feedbackCard}>
            <div className={styles.feedbackTitle}>Round complete</div>
            <div className={styles.summary}>
              You answered {session.attempts.length} of {session.promptCount} prompts.
            </div>
          </div>
        </div>
      )}

      {currentAttempt && (
        <div className="step">
          <div className={styles.feedbackCard}>
            <div className={styles.feedbackTitle}>AI feedback</div>
            <div className={styles.scoreGrid}>
              <ScoreChip label="Accuracy" value={currentAttempt.evaluation.scores.accuracy} />
              <ScoreChip label="Grammar" value={currentAttempt.evaluation.scores.grammar} />
              <ScoreChip label="Naturalness" value={currentAttempt.evaluation.scores.naturalness} />
              <ScoreChip label="Target vocab" value={currentAttempt.evaluation.scores.targetWordUse} />
              <ScoreChip label="Overall" value={currentAttempt.evaluation.scores.overall} />
            </div>

            <div className={styles.summary}>{currentAttempt.evaluation.summary}</div>

            <div className={styles.feedbackColumns}>
              <div>
                <div className={styles.columnTitle}>What worked</div>
                {currentAttempt.evaluation.strengths.length > 0 ? (
                  <ul className={styles.list}>
                    {currentAttempt.evaluation.strengths.map(item => <li key={item}>{item}</li>)}
                  </ul>
                ) : (
                  <div className={styles.emptyCopy}>No standout strengths were listed.</div>
                )}
              </div>
              <div>
                <div className={styles.columnTitle}>What to improve</div>
                {currentAttempt.evaluation.improvements.length > 0 ? (
                  <ul className={styles.list}>
                    {currentAttempt.evaluation.improvements.map(item => <li key={item}>{item}</li>)}
                  </ul>
                ) : (
                  <div className={styles.emptyCopy}>No major fixes were listed.</div>
                )}
              </div>
            </div>

            {currentAttempt.evaluation.betterAnswer && (
              <div className={styles.modelAnswer}>
                <div className={styles.columnTitle}>Suggested answer</div>
                <div className={styles.modelSentence}>{currentAttempt.evaluation.betterAnswer}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function ScoreChip({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.scoreChip}>
      <span>{label}</span>
      <strong>{value}/5</strong>
    </div>
  )
}
