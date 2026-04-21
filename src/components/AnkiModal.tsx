import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { addNote, storeMediaFileData } from '../api/anki'
import { generateAnkiFields } from '../api/ankiCard'
import { toAnkiNoteFields } from '../api/ankiNoteFields'
import { AnkiField, AnkiFieldNameInput } from './AnkiField'
import { AnkiModelSelect } from './AnkiSelectors'
import { useAnkiModelFields } from '../hooks/useAnkiModelFields'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  KEY_ANKI_DECK, KEY_ANKI_MODEL, KEY_ANKI_IMG_TYPE,
  KEY_FIELD_BEFORE, KEY_FIELD_WORD, KEY_FIELD_AFTER,
  KEY_FIELD_PLAIN_WORD, KEY_FIELD_DEFINITION, KEY_FIELD_SENTENCE, KEY_FIELD_IMAGE,
} from '../constants'

interface Props {
  apiKey: string
  word: string
  sentence: string
  translation: string | null
  nativeLanguage: string
  onClose: () => void
}

export function AnkiModal({ apiKey, word, sentence, translation, nativeLanguage, onClose }: Props) {
  const [deck, setDeck] = useLocalStorage(KEY_ANKI_DECK, 'Japanese')
  const [model, setModel] = useLocalStorage(KEY_ANKI_MODEL, 'Basic')
  const [imgType, setImgType] = useLocalStorage<'photo' | 'clipart'>(KEY_ANKI_IMG_TYPE, 'photo')
  const [pastedImage, setPastedImage] = useState<string | null>(null)

  const [fieldBeforeName, setFieldBeforeName] = useLocalStorage(KEY_FIELD_BEFORE, 'Before')
  const [fieldWordName, setFieldWordName] = useLocalStorage(KEY_FIELD_WORD, 'Word')
  const [fieldAfterName, setFieldAfterName] = useLocalStorage(KEY_FIELD_AFTER, 'After')
  const [fieldPlainWordName, setFieldPlainWordName] = useLocalStorage(KEY_FIELD_PLAIN_WORD, 'WordPlain')
  const [fieldDefinitionName, setFieldDefinitionName] = useLocalStorage(KEY_FIELD_DEFINITION, 'Definition')
  const [fieldSentenceName, setFieldSentenceName] = useLocalStorage(KEY_FIELD_SENTENCE, 'Sentence')
  const [fieldImageName, setFieldImageName] = useLocalStorage(KEY_FIELD_IMAGE, 'Image')
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

  const [fieldBefore, setFieldBefore] = useState('')
  const [fieldWord, setFieldWord] = useState('')
  const [fieldAfter, setFieldAfter] = useState('')
  const [fieldPlainWord, setFieldPlainWord] = useState(word)
  const [fieldDefinition, setFieldDefinition] = useState('')
  const [fieldSentence, setFieldSentence] = useState('')
  const [fieldsLoading, setFieldsLoading] = useState(true)

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const fetchFields = useCallback(async (force = false) => {
    setFieldsLoading(true)
    const fields = await generateAnkiFields(apiKey, word, sentence, translation, nativeLanguage, force)
    setFieldBefore(fields.before)
    setFieldWord(fields.word)
    setFieldAfter(fields.after)
    setFieldDefinition(fields.definition)
    setFieldSentence(fields.sentence)
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
      await addNote(deck, model, toAnkiNoteFields({
        before: fieldBeforeName,
        word: fieldWordName,
        after: fieldAfterName,
        plainWord: fieldPlainWordName,
        definition: fieldDefinitionName,
        sentence: fieldSentenceName,
        image: fieldImageName,
      }, {
        before: fieldBefore,
        word: fieldWord,
        after: fieldAfter,
        plainWord: fieldPlainWord,
        definition: fieldDefinition,
        sentence: fieldSentence,
      }, imageFieldValue))
      setStatus('success')
      onClose()
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Failed to add note')
    }
  }

  const query = imgType === 'clipart' ? `${word} イラスト` : word
  const googleImagesUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`

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
              <label className="modal-label">Model</label>
              <AnkiModelSelect value={model} onChange={setModel} />
            </div>
          </div>

          <div className="modal-fields-grid">
            {modelFieldsError && <span className="modal-field-hint">{modelFieldsError}</span>}
            <AnkiField name={fieldBeforeName} onNameChange={setFieldBeforeName} fieldOptions={modelFields} fieldsLoading={modelFieldsLoading} value={fieldBefore} onValueChange={setFieldBefore} loading={fieldsLoading} />
            <AnkiField name={fieldWordName} onNameChange={setFieldWordName} fieldOptions={modelFields} fieldsLoading={modelFieldsLoading} value={fieldWord} onValueChange={setFieldWord} loading={fieldsLoading} />
            <AnkiField name={fieldAfterName} onNameChange={setFieldAfterName} fieldOptions={modelFields} fieldsLoading={modelFieldsLoading} value={fieldAfter} onValueChange={setFieldAfter} loading={fieldsLoading} />
            <AnkiField name={fieldPlainWordName} onNameChange={setFieldPlainWordName} fieldOptions={modelFields} fieldsLoading={modelFieldsLoading} value={fieldPlainWord} onValueChange={setFieldPlainWord} />
            <AnkiField name={fieldDefinitionName} onNameChange={setFieldDefinitionName} fieldOptions={modelFields} fieldsLoading={modelFieldsLoading} value={fieldDefinition} onValueChange={setFieldDefinition} loading={fieldsLoading} />
            <AnkiField name={fieldSentenceName} onNameChange={setFieldSentenceName} fieldOptions={modelFields} fieldsLoading={modelFieldsLoading} value={fieldSentence} onValueChange={setFieldSentence} loading={fieldsLoading} />
          </div>

          <div className="modal-image-section">
            <div className="modal-image-header">
              <div className="modal-image-header-row">
                <AnkiFieldNameInput value={fieldImageName} onChange={setFieldImageName} options={modelFields} loading={modelFieldsLoading} />
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
