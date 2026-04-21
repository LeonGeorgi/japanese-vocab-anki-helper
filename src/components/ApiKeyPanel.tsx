import { useState } from 'react'

interface Props {
  apiKey: string
  onSave: (key: string) => void
}

export function ApiKeyPanel({ apiKey, onSave }: Props) {
  const [open, setOpen] = useState(!apiKey)
  const [input, setInput] = useState('')

  function save() {
    if (!input) return
    onSave(input)
    setInput('')
    setOpen(false)
  }

  return (
    <div className="api-key-section">
      <button className="api-key-toggle" onClick={() => setOpen(o => !o)}>
        <span>Anthropic API Key</span>
        <span className="status">
          <span className={`dot ${apiKey ? 'set' : ''}`} />
          {apiKey ? 'Set' : 'Not set'}
        </span>
      </button>
      {open && (
        <div className="api-key-form">
          <input
            type="password"
            placeholder="sk-ant-..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
          />
          <button className="btn btn-primary" onClick={save} disabled={!input}>
            Save
          </button>
        </div>
      )}
    </div>
  )
}
