import { useMemo } from 'react'
import type { AnkiFieldNames } from '../api/ankiCard'
import { AnkiFieldSelect, AnkiModelSelect } from './AnkiSelectors'
import { useAnkiBackfill } from '../hooks/useAnkiBackfill'
import { useAnkiModelFields } from '../hooks/useAnkiModelFields'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  KEY_ANKI_BACKFILL_DECK, KEY_ANKI_MODEL,
  KEY_FIELD_BEFORE, KEY_FIELD_WORD, KEY_FIELD_AFTER,
  KEY_FIELD_PLAIN_WORD, KEY_FIELD_DEFINITION, KEY_FIELD_SENTENCE,
} from '../constants'

type Notification = { type: 'success' | 'error'; message: string }

interface Props {
  apiKey: string
  nativeLanguage: string
  onNotify: (notification: Notification) => void
}

export function AnkiBackfillPanel({ apiKey, nativeLanguage, onNotify }: Props) {
  const [deck, setDeck] = useLocalStorage(KEY_ANKI_BACKFILL_DECK, 'Japanese')
  const [model, setModel] = useLocalStorage(KEY_ANKI_MODEL, 'Basic')
  const [fieldBeforeName, setFieldBeforeName] = useLocalStorage(KEY_FIELD_BEFORE, 'Before')
  const [fieldWordName, setFieldWordName] = useLocalStorage(KEY_FIELD_WORD, 'Word')
  const [fieldAfterName, setFieldAfterName] = useLocalStorage(KEY_FIELD_AFTER, 'After')
  const [fieldPlainWordName, setFieldPlainWordName] = useLocalStorage(KEY_FIELD_PLAIN_WORD, 'WordPlain')
  const [fieldDefinitionName, setFieldDefinitionName] = useLocalStorage(KEY_FIELD_DEFINITION, 'Definition')
  const [fieldSentenceName, setFieldSentenceName] = useLocalStorage(KEY_FIELD_SENTENCE, 'Sentence')
  const fieldNameValues = [
    fieldBeforeName,
    fieldWordName,
    fieldAfterName,
    fieldPlainWordName,
    fieldDefinitionName,
    fieldSentenceName,
  ]
  const { fields: modelFields, loading: modelFieldsLoading, error: modelFieldsError } = useAnkiModelFields(model, fieldNameValues)

  const fieldNames: AnkiFieldNames = useMemo(() => ({
    before: fieldBeforeName,
    word: fieldWordName,
    after: fieldAfterName,
    plainWord: fieldPlainWordName,
    definition: fieldDefinitionName,
    sentence: fieldSentenceName,
    image: '',
  }), [fieldAfterName, fieldBeforeName, fieldDefinitionName, fieldPlainWordName, fieldSentenceName, fieldWordName])

  const backfill = useAnkiBackfill(apiKey, nativeLanguage, fieldNames)

  async function handleLoadMissingTranslations() {
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
      <div className="backfill-section">
        <div className="backfill-settings">
          <label className="modal-field">
            <span className="modal-label">Deck</span>
            <input className="modal-input" value={deck} onChange={e => setDeck(e.target.value)} />
          </label>
          <label className="modal-field">
            <span className="modal-label">Model</span>
            <AnkiModelSelect value={model} onChange={setModel} />
          </label>
          <label className="modal-field">
            <span className="modal-label">Before</span>
            <AnkiFieldSelect value={fieldBeforeName} onChange={setFieldBeforeName} options={modelFields} loading={modelFieldsLoading} />
          </label>
          <label className="modal-field">
            <span className="modal-label">Word</span>
            <AnkiFieldSelect value={fieldWordName} onChange={setFieldWordName} options={modelFields} loading={modelFieldsLoading} />
          </label>
          <label className="modal-field">
            <span className="modal-label">After</span>
            <AnkiFieldSelect value={fieldAfterName} onChange={setFieldAfterName} options={modelFields} loading={modelFieldsLoading} />
          </label>
          <label className="modal-field">
            <span className="modal-label">Plain Word</span>
            <AnkiFieldSelect value={fieldPlainWordName} onChange={setFieldPlainWordName} options={modelFields} loading={modelFieldsLoading} />
          </label>
          <label className="modal-field">
            <span className="modal-label">Word Translation</span>
            <AnkiFieldSelect value={fieldDefinitionName} onChange={setFieldDefinitionName} options={modelFields} loading={modelFieldsLoading} />
          </label>
          <label className="modal-field">
            <span className="modal-label">Sentence Translation</span>
            <AnkiFieldSelect value={fieldSentenceName} onChange={setFieldSentenceName} options={modelFields} loading={modelFieldsLoading} />
          </label>
          {modelFieldsError && <span className="modal-field-hint backfill-field-hint">{modelFieldsError}</span>}
        </div>

        <div className="backfill-actions">
          <button className="btn btn-ghost" onClick={handleLoadMissingTranslations} disabled={backfill.loading || backfill.filling}>
            {backfill.loading ? 'Searching...' : 'Find Missing'}
          </button>
          <button className="btn btn-primary" onClick={handleFillSelected} disabled={backfill.filling || backfill.selectedCount === 0}>
            {backfill.filling ? 'Filling...' : `Fill Selected (${backfill.selectedCount})`}
          </button>
        </div>

        {backfill.error && <div className="status-bar error">{backfill.error}</div>}

        {backfill.notes.length > 0 && (
          <div className="backfill-list">
            <label className="backfill-select-all">
              <input type="checkbox" checked={backfill.allSelected} onChange={backfill.toggleAll} />
              Select all
            </label>
            {backfill.notes.map(note => (
              <label key={note.id} className={`backfill-card ${note.status}`}>
                <input
                  type="checkbox"
                  checked={backfill.isSelected(note.id)}
                  onChange={() => backfill.toggleSelected(note.id)}
                  disabled={backfill.filling}
                />
                <div className="backfill-card-body">
                  <div className="backfill-card-title">{note.plainWord}</div>
                  <div className="backfill-card-sentence">「{note.sentence}」</div>
                  {note.error && <div className="example-error">{note.error}</div>}
                </div>
                <span className="backfill-card-status">
                  {note.status === 'loading' && <span className="spinner kanji-spinner" />}
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
