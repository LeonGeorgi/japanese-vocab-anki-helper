import { useState } from 'react'
import { useAtom } from 'jotai'
import { AnkiFieldSelect, AnkiModelSelect } from '../primitives/anki/AnkiSelectors'
import { useAnkiModelFields } from '../primitives/anki/useAnkiModelFields'
import {
  ankiDeckAtom,
  ankiFieldAfterAtom,
  ankiFieldBeforeAtom,
  ankiFieldDefinitionAtom,
  ankiFieldImageAtom,
  ankiFieldPlainWordAtom,
  ankiFieldSentenceAtom,
  ankiFieldWordAtom,
  ankiImageTypeAtom,
  ankiLookupDeckAtom,
  ankiModelAtom,
} from '../state/ankiAtoms'
import styles from './AppSettingsDialog.module.css'

interface Props {
  apiKey: string
  onApiKeyChange: (key: string) => void
  onClose: () => void
}

export function AppSettingsDialog({ apiKey, onApiKeyChange, onClose }: Props) {
  const [apiKeyDraft, setApiKeyDraft] = useState('')
  const [deck, setDeck] = useAtom(ankiDeckAtom)
  const [lookupDeck, setLookupDeck] = useAtom(ankiLookupDeckAtom)
  const [model, setModel] = useAtom(ankiModelAtom)
  const [imageType, setImageType] = useAtom(ankiImageTypeAtom)
  const [fieldBeforeName, setFieldBeforeName] = useAtom(ankiFieldBeforeAtom)
  const [fieldWordName, setFieldWordName] = useAtom(ankiFieldWordAtom)
  const [fieldAfterName, setFieldAfterName] = useAtom(ankiFieldAfterAtom)
  const [fieldPlainWordName, setFieldPlainWordName] = useAtom(ankiFieldPlainWordAtom)
  const [fieldDefinitionName, setFieldDefinitionName] = useAtom(ankiFieldDefinitionAtom)
  const [fieldSentenceName, setFieldSentenceName] = useAtom(ankiFieldSentenceAtom)
  const [fieldImageName, setFieldImageName] = useAtom(ankiFieldImageAtom)

  const fieldNameValues = [
    fieldBeforeName,
    fieldWordName,
    fieldAfterName,
    fieldPlainWordName,
    fieldDefinitionName,
    fieldSentenceName,
    fieldImageName,
  ]
  const { fields: modelFields, loading: modelFieldsLoading, error: modelFieldsError } = useAnkiModelFields(model, fieldNameValues)

  function saveApiKey() {
    if (!apiKeyDraft) return
    onApiKeyChange(apiKeyDraft)
    setApiKeyDraft('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${styles.dialog}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Settings</span>
          <button className="modal-close" type="button" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <section className={styles.section}>
            <div className={styles.sectionTitle}>API</div>
            <label className="modal-field">
              <span className="modal-label">Anthropic API key</span>
              <span className={styles.status}>
                <span className={`${styles.statusDot} ${apiKey ? styles.statusSet : ''}`} />
                {apiKey ? 'Set' : 'Not set'}
              </span>
              <form
                className={styles.apiKeyRow}
                onSubmit={e => {
                  e.preventDefault()
                  saveApiKey()
                }}
              >
                <input
                  className="modal-input"
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKeyDraft}
                  onChange={e => setApiKeyDraft(e.target.value)}
                />
                <button className="btn btn-primary" type="submit" disabled={!apiKeyDraft}>
                  Save
                </button>
              </form>
            </label>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>Anki Cards</div>
            <div className="modal-row-2">
              <label className="modal-field">
                <span className="modal-label">Add deck</span>
                <input className="modal-input" value={deck} onChange={e => setDeck(e.target.value)} />
              </label>
              <label className="modal-field">
                <span className="modal-label">Lookup deck</span>
                <input className="modal-input" value={lookupDeck} onChange={e => setLookupDeck(e.target.value)} />
              </label>
            </div>
            <div className="modal-row-2">
              <label className="modal-field">
                <span className="modal-label">Model</span>
                <AnkiModelSelect value={model} onChange={setModel} />
              </label>
              <div className="modal-field">
                <span className="modal-label">Default image type</span>
                <div className={styles.imageTypeToggle}>
                  <button
                    type="button"
                    className={`btn ${imageType === 'photo' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setImageType('photo')}
                  >
                    Photo
                  </button>
                  <button
                    type="button"
                    className={`btn ${imageType === 'clipart' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setImageType('clipart')}
                  >
                    Illustration
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.fieldGrid}>
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
                <span className="modal-label">Plain word</span>
                <AnkiFieldSelect value={fieldPlainWordName} onChange={setFieldPlainWordName} options={modelFields} loading={modelFieldsLoading} />
              </label>
              <label className="modal-field">
                <span className="modal-label">Definition</span>
                <AnkiFieldSelect value={fieldDefinitionName} onChange={setFieldDefinitionName} options={modelFields} loading={modelFieldsLoading} />
              </label>
              <label className="modal-field">
                <span className="modal-label">Sentence</span>
                <AnkiFieldSelect value={fieldSentenceName} onChange={setFieldSentenceName} options={modelFields} loading={modelFieldsLoading} />
              </label>
              <label className="modal-field">
                <span className="modal-label">Image</span>
                <AnkiFieldSelect value={fieldImageName} onChange={setFieldImageName} options={modelFields} loading={modelFieldsLoading} />
              </label>
            </div>
            {modelFieldsError && <span className="modal-field-hint">{modelFieldsError}</span>}
          </section>
        </div>

        <div className="modal-footer">
          <span />
          <div className="modal-footer-right">
            <button className="btn btn-primary" type="button" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
