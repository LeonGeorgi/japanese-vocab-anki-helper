import { AnkiFieldSelect } from './AnkiSelectors'

interface AnkiFieldProps {
  name: string
  onNameChange: (value: string) => void
  fieldOptions: string[]
  fieldsLoading: boolean
  value: string
  onValueChange: (value: string) => void
  multiline?: boolean
  loading?: boolean
}

interface AnkiFieldNameInputProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  loading: boolean
}

export function AnkiField({ name, onNameChange, fieldOptions, fieldsLoading, value, onValueChange, multiline, loading }: AnkiFieldProps) {
  return (
    <div className="anki-field-row">
      <AnkiFieldNameInput value={name} onChange={onNameChange} options={fieldOptions} loading={fieldsLoading} />
      {loading ? (
        <div className="modal-back-loading">
          <span className="spinner" style={{ width: 14, height: 14 }} />
          <span>Fetching...</span>
        </div>
      ) : multiline ? (
        <textarea className="modal-textarea" value={value} onChange={e => onValueChange(e.target.value)} rows={3} />
      ) : (
        <input className="modal-input" value={value} onChange={e => onValueChange(e.target.value)} />
      )}
    </div>
  )
}

export function AnkiFieldNameInput({ value, onChange, options, loading }: AnkiFieldNameInputProps) {
  return (
    <AnkiFieldSelect
      className="anki-field-name"
      value={value}
      onChange={onChange}
      options={options}
      loading={loading}
    />
  )
}
