import styles from './TranscriptionStep.module.css'

interface Props {
  transcription: string
  extracting: boolean
  hasWords: boolean
  error: string | null
  onChange: (value: string) => void
  onExtract: () => void
}

export function TranscriptionStep({
  transcription,
  extracting,
  hasWords,
  error,
  onChange,
  onExtract,
}: Props) {
  const rows = Math.max(4, Math.min(20, transcription.split('\n').length + 2))

  return (
    <div className="step">
      <div className="step-label">2 — Transcription</div>
      <div className={styles.box}>
        <textarea
          className={styles.text}
          value={transcription}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder="Paste or type text here…"
          spellCheck={false}
        />
      </div>
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
