import { useCallback, useEffect, useMemo, useState } from 'react'
import { getModelNames } from '../api/anki'

export function useAnkiModels(currentModel: string) {
  const [models, setModels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setModels(await getModelNames())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Anki note types')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => { void refresh() })
  }, [refresh])

  const options = useMemo(() => {
    if (!currentModel || models.includes(currentModel)) return models
    return [currentModel, ...models]
  }, [currentModel, models])

  return { models: options, loading, error, refresh }
}
