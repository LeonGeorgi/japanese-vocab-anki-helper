import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { createPortal } from 'react-dom'
import { addNote, storeMediaFileData } from '../../api/anki'
import { generateAnkiFields, type GeneratedAnkiFields } from '../../api/ankiCard'
import { fieldMappingForModelFields, type AnkiFieldMapping, type AnkiFieldMappingValue } from '../../api/ankiNoteFields'
import {
  ankiDeckAtom,
  ankiFieldMappingAtom,
  ankiImageTypeAtom,
  ankiModelAtom,
} from '../../state/ankiAtoms'
import { settingsDialogOpenAtom } from '../../state/uiAtoms'
import { useAnkiModelFields } from './useAnkiModelFields'

interface Props {
  apiKey: string
  word: string
  sentence: string
  translation: string | null
  nativeLanguage: string
  onClose: () => void
}

export function AnkiModal({ apiKey, word, sentence, translation, nativeLanguage, onClose }: Props) {
  const [deck, setDeck] = useAtom(ankiDeckAtom)
  const [model] = useAtom(ankiModelAtom)
  const setSettingsOpen = useSetAtom(settingsDialogOpenAtom)
  const [imgType, setImgType] = useAtom(ankiImageTypeAtom)
  const [fieldMapping] = useAtom(ankiFieldMappingAtom)
  const [pastedImage, setPastedImage] = useState<string | null>(null)
  const { fields: modelFields, error: modelFieldsError } = useAnkiModelFields(model, Object.keys(fieldMapping))
  const resolvedFieldMapping = useMemo(
    () => modelFields.length > 0 ? fieldMappingForModelFields(modelFields, fieldMapping) : fieldMapping,
    [fieldMapping, modelFields],
  )
  const mappedTextFields = useMemo(
    () => Object.entries(resolvedFieldMapping).filter(([, source]) => source !== 'unchanged' && source !== 'image'),
    [resolvedFieldMapping],
  )
  const imageFieldNames = useMemo(
    () => Object.entries(resolvedFieldMapping)
      .filter(([, source]) => source === 'image')
      .map(([fieldName]) => fieldName),
    [resolvedFieldMapping],
  )

  const [generatedFields, setGeneratedFields] = useState<GeneratedAnkiFields | null>(null)
  const [fieldValueOverrides, setFieldValueOverrides] = useState<Record<string, string>>({})
  const [fieldsLoading, setFieldsLoading] = useState(true)

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const mappedFieldValues = useMemo(
    () => generatedFields ? fieldsForMappedTextFields(resolvedFieldMapping, generatedFields) : {},
    [generatedFields, resolvedFieldMapping],
  )

  const fetchFields = useCallback(async (force = false) => {
    setFieldsLoading(true)
    const fields = await generateAnkiFields(apiKey, word, sentence, translation, nativeLanguage, force)
    setGeneratedFields(fields)
    setFieldValueOverrides({})
    setFieldsLoading(false)
  }, [apiKey, nativeLanguage, sentence, word, translation])

  useEffect(() => {
    queueMicrotask(() => { void fetchFields() })
  }, [fetchFields])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handlePaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (!item) return
    const blob = item.getAsFile()
    if (!blob) return
    const reader = new FileReader()
    reader.onload = () => setPastedImage(reader.result as string)
    reader.readAsDataURL(blob)
  }

  async function handleAdd() {
    setStatus('loading')
    setError(null)
    try {
      let imageFieldValue = ''
      if (pastedImage) {
        const ext = pastedImage.split(';')[0].split('/')[1] ?? 'png'
        const base64 = pastedImage.split(',')[1]
        const filename = `vocab_${word}_${Date.now()}.${ext}`
        await storeMediaFileData(filename, base64)
        imageFieldValue = `<img src="${filename}">`
      }
      const noteFields = { ...mappedFieldValues }
      for (const [fieldName, value] of Object.entries(fieldValueOverrides)) {
        if (noteFields[fieldName] === undefined) continue
        noteFields[fieldName] = value
      }
      for (const fieldName of imageFieldNames) {
        noteFields[fieldName] = imageFieldValue
      }
      await addNote(deck, model, noteFields)
      setStatus('success')
      onClose()
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Failed to add note')
    }
  }

  const query = imgType === 'clipart' ? `${word} イラスト` : word
  const googleImagesUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`
  const mappedFieldCount = mappedTextFields.length + imageFieldNames.length

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add to Anki</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-row-2">
            <div className="modal-field">
              <label className="modal-label">Deck</label>
              <input className="modal-input" value={deck} onChange={e => setDeck(e.target.value)} />
            </div>
            <div className="modal-field">
              <label className="modal-label">Mapping</label>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  onClose()
                  setSettingsOpen(true)
                }}
              >
                Open Settings
              </button>
            </div>
          </div>

          <div className="modal-fields-grid">
            {modelFieldsError && <span className="modal-field-hint">{modelFieldsError}</span>}
            {mappedFieldCount === 0 && (
              <span className="modal-field-hint">No mapped fields for this note type.</span>
            )}
            {mappedTextFields.map(([fieldName]) => (
              <CardContentField
                key={fieldName}
                label={fieldName}
                value={fieldValueOverrides[fieldName] ?? mappedFieldValues[fieldName] ?? ''}
                onChange={value => setFieldValueOverrides(prev => ({ ...prev, [fieldName]: value }))}
                loading={fieldsLoading}
              />
            ))}
          </div>

          <div className="modal-image-section">
            <div className="modal-image-header">
              <div className="modal-image-header-row">
                <div className="img-type-toggle">
                  <button
                    className={`btn ${imgType === 'photo' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setImgType('photo')}
                  >Photo</button>
                  <button
                    className={`btn ${imgType === 'clipart' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setImgType('clipart')}
                  >Illustration</button>
                </div>
              </div>
              <a
                className="btn btn-ghost modal-image-search"
                href={googleImagesUrl}
                target="_blank"
                rel="noopener noreferrer"
              >Search Google Images ↗</a>
            </div>
            <div
              className={`paste-area ${pastedImage ? 'has-image' : ''}`}
              onPaste={handlePaste}
              tabIndex={0}
            >
              {pastedImage ? (
                <>
                  <img src={pastedImage} alt="pasted" className="paste-preview" />
                  <button className="paste-clear" onClick={() => setPastedImage(null)}>✕</button>
                </>
              ) : (
                <span className="paste-hint">Paste image here (Ctrl+V / ⌘V)</span>
              )}
            </div>
          </div>

          {status === 'error' && <div className="modal-error">{error}</div>}
          {status === 'success' && <div className="modal-success">Card added successfully.</div>}
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-ghost"
            onClick={() => fetchFields(true)}
            disabled={fieldsLoading}
            title="Regenerate furigana and definition"
          >
            ↺ Regenerate
          </button>
          <div className="modal-footer-right">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={fieldsLoading || status === 'loading' || status === 'success'}
            >
              {status === 'loading' ? 'Adding…' : status === 'success' ? 'Added' : 'Add to Anki'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

interface CardContentFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  loading?: boolean
}

function CardContentField({ label, value, onChange, loading }: CardContentFieldProps) {
  return (
    <label className="modal-field">
      <span className="modal-label">{label}</span>
      <input
        className="modal-input"
        type="text"
        value={loading ? 'Loading...' : value}
        onChange={e => onChange(e.target.value)}
        disabled={loading}
      />
    </label>
  )
}

function fieldsForMappedTextFields(
  fieldMapping: AnkiFieldMapping,
  generatedFields: GeneratedAnkiFields,
): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const [fieldName, source] of Object.entries(fieldMapping)) {
    if (source === 'unchanged' || source === 'image') continue
    fields[fieldName] = generatedValueForSource(source, generatedFields)
  }
  return fields
}

function generatedValueForSource(source: Exclude<AnkiFieldMappingValue, 'unchanged'>, generatedFields: GeneratedAnkiFields): string {
  if (source === 'image') return ''
  return generatedFields[source]
}
