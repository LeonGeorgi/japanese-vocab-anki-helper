import { useCallback, useRef, useState } from 'react'
import styles from './TranscriptionStep.module.css'

interface Props {
  apiKey: string
  transcription: string
  transcribing: boolean
  extracting: boolean
  hasWords: boolean
  transcribeError: string | null
  error: string | null
  onTranscribe: (base64: string, mimeType: string) => Promise<void>
  onChange: (value: string) => void
  onExtract: () => void
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function isHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name)
  )
}

async function normalizeFile(file: File): Promise<File> {
  if (!isHeic(file)) return file
  const { default: heic2any } = await import('heic2any')
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 }) as Blob
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
}

export function TranscriptionStep({
  apiKey,
  transcription,
  transcribing,
  extracting,
  hasWords,
  transcribeError,
  error,
  onTranscribe,
  onChange,
  onExtract,
}: Props) {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [converting, setConverting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const rows = Math.max(4, Math.min(20, transcription.split('\n').length + 2))

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/') && !isHeic(file)) return
    setConverting(isHeic(file))
    try {
      const normalized = await normalizeFile(file)
      setImageFile(normalized)
      setImageUrl(URL.createObjectURL(normalized))
    } finally {
      setConverting(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }, [handleFile])

  async function handleTranscribeClick() {
    if (!imageFile) {
      fileInputRef.current?.click()
      return
    }
    const base64 = await fileToBase64(imageFile)
    await onTranscribe(base64, imageFile.type)
  }

  function handleRemoveImage() {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageFile(null)
    setImageUrl(null)
  }

  return (
    <div className="step">
      <div
        className={`${styles.box} ${dragOver ? styles.dragOver : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className={styles.toolbar}>
          <div className={styles.attachment}>
            {imageUrl ? (
              <img src={imageUrl} className={styles.previewImg} alt="Uploaded" />
            ) : (
              <div className={styles.emptyPreview}>Image</div>
            )}
            <div className={styles.attachmentText}>
              <div className={styles.attachmentTitle}>
                {imageFile ? imageFile.name : 'Transcribe from image'}
              </div>
              <div className={styles.attachmentMeta}>
                {imageFile ? 'Image attached for re-transcription' : 'Drop, paste, or choose an image'}
              </div>
            </div>
          </div>
          <div className={styles.toolbarActions}>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={handleTranscribeClick}
              disabled={transcribing || converting || !apiKey}
            >
              {converting
                ? <><span className="spinner" /> Converting...</>
                : transcribing
                  ? <><span className="spinner" /> Transcribing...</>
                  : imageFile
                    ? transcription ? 'Re-transcribe' : 'Transcribe'
                    : 'Choose image'
              }
            </button>
            {imageFile && (
              <button className="btn btn-ghost" type="button" onClick={handleRemoveImage}>
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            className={styles.fileInput}
            onChange={e => e.target.files?.[0] && void handleFile(e.target.files[0])}
          />
        </div>
        <textarea
          className={styles.text}
          value={transcription}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder="Paste or type text here…"
          spellCheck={false}
        />
        {!imageFile && (
          <div className={styles.dropHint}>Drop an image here or use Transcribe image</div>
        )}
      </div>
      {transcribeError && (
        <div className="status-bar error" style={{ marginTop: 12 }}>{transcribeError}</div>
      )}
      <div className="step-actions">
        <button
          className="btn btn-primary"
          onClick={onExtract}
          disabled={extracting || !transcription.trim()}
        >
          {extracting
            ? <><span className="spinner" /> Extracting…</>
            : hasWords ? 'Re-extract vocabulary' : 'Extract vocabulary'
          }
        </button>
      </div>
      {error && (
        <div className="status-bar error" style={{ marginTop: 12 }}>{error}</div>
      )}
    </div>
  )
}
