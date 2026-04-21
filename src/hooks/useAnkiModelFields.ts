import { useCallback, useEffect, useMemo, useState } from 'react'
import { getModelFieldNames } from '../api/anki'

export function useAnkiModelFields(model: string, currentFields: string[]) {
  const [fields, setFields] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!model) {
      setFields([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      setFields(await getModelFieldNames(model))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load fields for this note type')
      setFields([])
    } finally {
      setLoading(false)
    }
  }, [model])

  useEffect(() => {
    queueMicrotask(() => { void refresh() })
  }, [refresh])

  const options = useMemo(() => {
    const next = [...fields]
    for (const field of currentFields) {
      if (field && !next.includes(field)) next.unshift(field)
    }
    return next
  }, [currentFields, fields])

  return { fields: options, loading, error, refresh }
}
