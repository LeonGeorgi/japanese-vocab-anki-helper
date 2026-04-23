import { useMemo } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import type { AnkiFieldNames } from '../../api/ankiCard'
import { ankiFieldNamesFromMapping, fieldMappingForModelFields } from '../../api/ankiNoteFields'
import { useAnkiBackfill } from './useAnkiBackfill'
import { useAnkiModelFields } from '../../primitives/anki/useAnkiModelFields'
import {
  ankiBackfillDeckAtom,
  ankiFieldMappingAtom,
  ankiModelAtom,
} from '../../state/ankiAtoms'
import styles from './AnkiBackfillPanel.module.css'

type Notification = { type: 'success' | 'error'; message: string }

interface Props {
  apiKey: string
  nativeLanguage: string
  onNotify: (notification: Notification) => void
}

export function AnkiBackfillPanel({ apiKey, nativeLanguage, onNotify }: Props) {
  const [deck, setDeck] = useAtom(ankiBackfillDeckAtom)
  const model = useAtomValue(ankiModelAtom)
  const fieldMapping = useAtomValue(ankiFieldMappingAtom)
  const { fields: modelFields, error: modelFieldsError } = useAnkiModelFields(model, Object.keys(fieldMapping))

  const fieldNames: AnkiFieldNames = useMemo(
    () => ankiFieldNamesFromMapping(
      modelFields.length > 0 ? fieldMappingForModelFields(modelFields, fieldMapping) : fieldMapping,
      modelFields,
    ),
    [fieldMapping, modelFields],
  )

  const backfill = useAnkiBackfill(apiKey, nativeLanguage, fieldNames)

  async function handleLoadMissingTranslations() {
    const missingFields = requiredBackfillFields(fieldNames)
    if (missingFields.length > 0) {
      onNotify({ type: 'error', message: `Configure Anki mapping for ${missingFields.join(', ')} first.` })
      return
    }

    try {
      const found = await backfill.loadMissingTranslations(deck, model)
      onNotify({ type: 'success', message: `Found ${found} cards without sentence translations.` })
    } catch (e) {
      onNotify({ type: 'error', message: e instanceof Error ? e.message : 'Failed to load Anki cards' })
    }
  }

  async function handleFillSelected() {
    const { completed, failed } = await backfill.fillSelected()
    onNotify({
      type: failed > 0 ? 'error' : 'success',
      message: failed > 0 ? `Updated ${completed} cards, ${failed} failed.` : `Updated ${completed} cards.`,
    })
  }

  return (
    <div className="step">
      <div className="step-label">Anki Translation Backfill</div>
      <div className={styles.section}>
        <div className={styles.settings}>
          <label className="modal-field">
            <span className="modal-label">Deck</span>
            <input className="modal-input" value={deck} onChange={e => setDeck(e.target.value)} />
          </label>
          <label className="modal-field">
            <span className="modal-label">Model</span>
            <input className="modal-input" value={model} readOnly />
          </label>
          {modelFieldsError && <span className={`modal-field-hint ${styles.fieldHint}`}>{modelFieldsError}</span>}
        </div>

        <div className={styles.actions}>
          <button className="btn btn-ghost" onClick={handleLoadMissingTranslations} disabled={backfill.loading || backfill.filling}>
            {backfill.loading ? 'Searching...' : 'Find Missing'}
          </button>
          <button className="btn btn-primary" onClick={handleFillSelected} disabled={backfill.filling || backfill.selectedCount === 0}>
            {backfill.filling ? 'Filling...' : `Fill Selected (${backfill.selectedCount})`}
          </button>
        </div>

        {backfill.error && <div className="status-bar error">{backfill.error}</div>}

        {backfill.notes.length > 0 && (
          <div className={styles.list}>
            <label className={styles.selectAll}>
              <input type="checkbox" checked={backfill.allSelected} onChange={backfill.toggleAll} />
              Select all
            </label>
            {backfill.notes.map(note => (
              <label key={note.id} className={`${styles.card} ${styles[note.status] ?? ''}`}>
                <input
                  type="checkbox"
                  checked={backfill.isSelected(note.id)}
                  onChange={() => backfill.toggleSelected(note.id)}
                  disabled={backfill.filling}
                />
                <div className={styles.body}>
                  <div className={styles.title}>{note.plainWord}</div>
                  <div className={styles.sentence}>「{note.sentence}」</div>
                  {note.error && <div className={styles.cardError}>{note.error}</div>}
                </div>
                <span className={styles.status}>
                  {note.status === 'loading' && <span className={`spinner ${styles.spinner}`} />}
                  {note.status === 'done' && 'Done'}
                  {note.status === 'error' && 'Failed'}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function requiredBackfillFields(fieldNames: AnkiFieldNames): string[] {
  return [
    ['before', fieldNames.before],
    ['word', fieldNames.word],
    ['after', fieldNames.after],
    ['plain word', fieldNames.plainWord],
    ['definition', fieldNames.definition],
    ['sentence', fieldNames.sentence],
  ].filter(([, value]) => !value).map(([label]) => label)
}
