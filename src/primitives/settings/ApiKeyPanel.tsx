import { useState } from 'react'
import styles from './ApiKeyPanel.module.css'

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
    <div className={styles.section}>
      <button className={styles.toggle} onClick={() => setOpen(o => !o)}>
        <span>Anthropic API Key</span>
        <span className={styles.status}>
          <span className={`${styles.dot} ${apiKey ? styles.set : ''}`} />
          {apiKey ? 'Set' : 'Not set'}
        </span>
      </button>
      {open && (
        <form
          className={styles.form}
          onSubmit={e => {
            e.preventDefault()
            save()
          }}
        >
          <input
            className={styles.input}
            type="password"
            placeholder="sk-ant-..."
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary" type="submit" disabled={!input}>
            Save
          </button>
        </form>
      )}
    </div>
  )
}
