import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  apiKey: string
  hasTranscription: boolean
  transcribing: boolean
  error: string | null
  onTranscribe: (base64: string, mimeType: string) => Promise<void>
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

export function ImageStep({ apiKey, hasTranscription, transcribing, error, onTranscribe }: Props) {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [converting, setConverting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (file) handleFile(file)
  }, [handleFile])

  // Global paste listener for clipboard images
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (imageUrl) return
      const file = Array.from(e.clipboardData?.files ?? []).find(
        f => f.type.startsWith('image/') || isHeic(f)
      )
      if (file) handleFile(file)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [imageUrl, handleFile])

  async function handleTranscribeClick() {
    if (!imageFile) return
    const base64 = await fileToBase64(imageFile)
    await onTranscribe(base64, imageFile.type)
  }

  function handleRemove() {
    setImageFile(null)
    setImageUrl(null)
  }

  return (
    <div className="step">
      <div className="step-label">
        1 — Image <span className="step-optional">optional</span>
      </div>

      {!imageUrl ? (
        <div
          className={`upload-area ${dragOver ? 'drag-over' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {converting ? (
            <span className="spinner" style={{ width: 24, height: 24 }} />
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
          <p className="upload-title">{converting ? 'Converting…' : 'Drop an image here'}</p>
          {!converting && (
            <p className="upload-sub">click to browse · paste from clipboard</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="preview-section">
          <img src={imageUrl} className="preview-img" alt="Uploaded" />
          <div className="step-actions">
            <button className="btn btn-ghost" onClick={handleRemove}>
              Remove
            </button>
            <button
              className="btn btn-primary"
              onClick={handleTranscribeClick}
              disabled={transcribing || !apiKey}
            >
              {transcribing
                ? <><span className="spinner" /> Transcribing…</>
                : hasTranscription ? 'Re-transcribe' : 'Transcribe'
              }
            </button>
          </div>
          {error && (
            <div className="status-bar error" style={{ marginTop: 12 }}>{error}</div>
          )}
        </div>
      )}
    </div>
  )
}
