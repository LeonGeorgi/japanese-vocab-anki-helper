import { useAnkiModels } from './useAnkiModels'

interface AnkiModelSelectProps {
  value: string
  onChange: (value: string) => void
}

export function AnkiModelSelect({ value, onChange }: AnkiModelSelectProps) {
  const { models, loading, error } = useAnkiModels(value)

  return (
    <>
      <select className="modal-input" value={value} onChange={e => onChange(e.target.value)}>
        {models.length === 0 && <option value={value}>{loading ? 'Loading...' : value}</option>}
        {models.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
      {error && <span className="modal-field-hint">{error}</span>}
    </>
  )
}
