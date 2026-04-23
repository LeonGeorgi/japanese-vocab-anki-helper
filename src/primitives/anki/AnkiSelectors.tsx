import { useAnkiModels } from './useAnkiModels'

interface AnkiModelSelectProps {
  value: string
  onChange: (value: string) => void
}

interface AnkiFieldSelectProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  loading: boolean
  className?: string
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

export function AnkiFieldSelect({ value, onChange, options, loading, className = 'modal-input' }: AnkiFieldSelectProps) {
  return (
    <select className={className} value={value} onChange={e => onChange(e.target.value)}>
      {options.length === 0 && <option value={value}>{loading ? 'Loading...' : value}</option>}
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  )
}
