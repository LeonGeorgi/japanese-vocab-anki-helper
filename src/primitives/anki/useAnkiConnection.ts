import { useCallback, useEffect, useRef, useState } from 'react'
import { getAnkiConnectVersion } from '../../api/anki'

export type AnkiConnectionState = 'checking' | 'connected' | 'offline'

export function useAnkiConnection() {
  const [status, setStatus] = useState<AnkiConnectionState>('checking')
  const [version, setVersion] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const check = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setStatus('checking')
    setError(null)

    try {
      const nextVersion = await getAnkiConnectVersion()
      if (requestIdRef.current !== requestId) return
      setVersion(nextVersion)
      setStatus('connected')
    } catch (e) {
      if (requestIdRef.current !== requestId) return
      setVersion(null)
      setError(e instanceof Error ? e.message : 'Could not reach AnkiConnect')
      setStatus('offline')
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => { void check() })
  }, [check])

  return { status, version, error, retry: check }
}
