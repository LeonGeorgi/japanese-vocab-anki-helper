import { useEffect, useMemo, useState } from 'react'
import { useAtom } from 'jotai'
import { listAvailableLlmModels } from '../api/llm'
import {
  getLlmProvider,
  llmProviders,
  type LlmProviderId,
} from '../llm'
import { AnkiModelSelect } from '../primitives/anki/AnkiSelectors'
import { useAnkiModelFields } from '../primitives/anki/useAnkiModelFields'
import {
  fieldMappingForModelFields,
  mergeFieldMappingValue,
  removeFieldMappingForFields,
  type AnkiFieldMappingValue,
} from '../api/ankiNoteFields'
import {
  ankiDeckAtom,
  ankiFieldMappingAtom,
  ankiImageTypeAtom,
  ankiLookupDeckAtom,
  ankiModelAtom,
} from '../state/ankiAtoms'
import { llmProviderAtom, llmTextModelAtom, llmVisionModelAtom } from '../state/settingsAtoms'
import styles from './AppSettingsDialog.module.css'

interface Props {
  apiKey: string
  onApiKeyChange: (key: string) => void
  onClose: () => void
}

const mappingOptions: { value: AnkiFieldMappingValue; label: string }[] = [
  { value: 'unchanged', label: 'Unmapped' },
  { value: 'before', label: 'Before target word' },
  { value: 'word', label: 'Target word with furigana' },
  { value: 'after', label: 'After target word' },
  { value: 'plainWord', label: 'Plain target word' },
  { value: 'definition', label: 'Word definition' },
  { value: 'sentence', label: 'Sentence translation' },
  { value: 'image', label: 'Image' },
]

export function AppSettingsDialog({ apiKey, onApiKeyChange, onClose }: Props) {
  const [apiKeyDraft, setApiKeyDraft] = useState('')
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; label: string }>>([])
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [page, setPage] = useState<'general' | 'fields'>('general')
  const [provider, setProvider] = useAtom(llmProviderAtom)
  const [textModel, setTextModel] = useAtom(llmTextModelAtom)
  const [visionModel, setVisionModel] = useAtom(llmVisionModelAtom)
  const [deck, setDeck] = useAtom(ankiDeckAtom)
  const [lookupDeck, setLookupDeck] = useAtom(ankiLookupDeckAtom)
  const [model, setModel] = useAtom(ankiModelAtom)
  const [imageType, setImageType] = useAtom(ankiImageTypeAtom)
  const [fieldMapping, setFieldMapping] = useAtom(ankiFieldMappingAtom)
  const providerInfo = getLlmProvider(provider)
  const hasApiKey = apiKey.trim().length > 0

  const { fields: modelFields, loading: modelFieldsLoading, error: modelFieldsError } = useAnkiModelFields(model, Object.keys(fieldMapping))
  const resolvedFieldMapping = fieldMappingForModelFields(modelFields, fieldMapping)
  const modelOptions = useMemo(() => {
    if (!hasApiKey) return []
    const options = [...availableModels]
    if (textModel && !options.some(option => option.id === textModel)) options.unshift({ id: textModel, label: textModel })
    if (visionModel && !options.some(option => option.id === visionModel)) options.unshift({ id: visionModel, label: visionModel })
    return options
  }, [availableModels, hasApiKey, textModel, visionModel])

  useEffect(() => {
    if (!hasApiKey) return
    let cancelled = false
    void listAvailableLlmModels(apiKey)
      .then(models => {
        if (cancelled) return
        setModelsError(null)
        setAvailableModels(models.map(modelInfo => ({ id: modelInfo.id, label: modelInfo.label })))
      })
      .catch(err => {
        if (cancelled) return
        setModelsError(err instanceof Error ? err.message : 'Failed to load models')
        setAvailableModels([])
      })
    return () => {
      cancelled = true
    }
  }, [apiKey, hasApiKey, provider])

  function saveApiKey() {
    if (!apiKeyDraft) return
    onApiKeyChange(apiKeyDraft)
    setApiKeyDraft('')
  }

  function clearApiKey() {
    onApiKeyChange('')
    setApiKeyDraft('')
    setModelsError(null)
    setAvailableModels([])
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${styles.dialog}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Settings</span>
          <button className="modal-close" type="button" onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <nav className={styles.settingsNav} aria-label="Settings sections">
            <button
              type="button"
              className={`${styles.navButton} ${page === 'general' ? styles.activeNavButton : ''}`}
              onClick={() => setPage('general')}
            >
              General
            </button>
            <button
              type="button"
              className={`${styles.navButton} ${page === 'fields' ? styles.activeNavButton : ''}`}
              onClick={() => setPage('fields')}
            >
              Field mapping
            </button>
          </nav>

          <div className={`modal-body ${styles.content}`}>
            {page === 'general' && (
              <>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}>API</div>
                  <label className="modal-field">
                    <span className="modal-label">Provider</span>
                    <select
                      className="modal-input"
                      value={provider}
                      onChange={e => {
                        const nextProvider = e.target.value as LlmProviderId
                        const nextProviderInfo = getLlmProvider(nextProvider)
                        setProvider(nextProvider)
                        setTextModel(nextProviderInfo.defaultTextModel)
                        setVisionModel(nextProviderInfo.defaultVisionModel)
                      }}
                    >
                      {llmProviders.map(providerOption => (
                        <option key={providerOption.id} value={providerOption.id}>
                          {providerOption.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="modal-field">
                    <span className="modal-label">{providerInfo.apiKeyLabel}</span>
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
                        placeholder={providerInfo.apiKeyPlaceholder}
                        value={apiKeyDraft}
                        onChange={e => setApiKeyDraft(e.target.value)}
                      />
                      <button className="btn btn-primary" type="submit" disabled={!apiKeyDraft}>
                        Save
                      </button>
                      <button
                        className={`btn btn-ghost ${styles.removeKeyButton}`}
                        type="button"
                        onClick={clearApiKey}
                        disabled={!hasApiKey}
                      >
                        Remove
                      </button>
                    </form>
                  </label>
                  <a
                    className={styles.pricingLink}
                    href={providerInfo.apiKeyCreateUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Create {providerInfo.label} API key
                  </a>
                  <div className="modal-row-2">
                    <label className="modal-field">
                      <span className="modal-label">Text model</span>
                      <select
                        className="modal-input"
                        value={hasApiKey ? textModel : ''}
                        onChange={e => setTextModel(e.target.value)}
                        disabled={!hasApiKey}
                      >
                        {!hasApiKey && <option value="">Enter API key first</option>}
                        {modelOptions.map(option => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="modal-field">
                      <span className="modal-label">Vision model</span>
                      <select
                        className="modal-input"
                        value={hasApiKey ? visionModel : ''}
                        onChange={e => setVisionModel(e.target.value)}
                        disabled={!hasApiKey}
                      >
                        {!hasApiKey && <option value="">Enter API key first</option>}
                        {modelOptions.map(option => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <a
                    className={styles.pricingLink}
                    href={providerInfo.pricingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View {providerInfo.label} API pricing
                  </a>
                  {!hasApiKey && <span className="modal-field-hint">Enter an API key to load models.</span>}
                  {hasApiKey && modelsError && <span className="modal-field-hint">{modelsError}</span>}
                </section>

                <section className={styles.section}>
                  <div className={styles.sectionTitle}>Anki</div>
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
                </section>
              </>
            )}

            {page === 'fields' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div>
                    <div className={styles.sectionTitle}>Field mapping</div>
                    <p className={styles.sectionHint}>Choose what each field in the selected Anki note type should receive.</p>
                  </div>
                  <div className={styles.fieldControls}>
                    <label className={styles.modelField}>
                      <span className="modal-label">Model</span>
                      <AnkiModelSelect value={model} onChange={setModel} />
                    </label>
                    <button
                      type="button"
                      className={styles.resetMappingButton}
                      onClick={() => setFieldMapping(prev => removeFieldMappingForFields(prev, modelFields))}
                      disabled={modelFieldsLoading || modelFields.length === 0}
                    >
                      Reset mapping
                    </button>
                  </div>
                </div>

                {modelFieldsError && <span className="modal-field-hint">{modelFieldsError}</span>}
                {modelFields.length === 0 && (
                  <div className={styles.emptyFields}>
                    {modelFieldsLoading ? 'Loading note fields...' : 'No fields found for this model.'}
                  </div>
                )}
                {modelFields.length > 0 && (
                  <div className={styles.mappingList}>
                    {modelFields.map(fieldName => (
                      <label key={fieldName} className={styles.mappingRow}>
                        <span className={styles.ankiFieldName}>{fieldName}</span>
                        <select
                          className={`modal-input ${resolvedFieldMapping[fieldName] === 'unchanged' ? styles.unmappedSelect : ''}`}
                          value={resolvedFieldMapping[fieldName]}
                          onChange={e => setFieldMapping(prev =>
                            mergeFieldMappingValue(prev, fieldName, e.target.value as AnkiFieldMappingValue),
                          )}
                        >
                          {mappingOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
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
