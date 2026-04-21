import { useEffect, useState } from 'react'

export type Notification = { type: 'success' | 'error'; message: string }

export function useNotification(timeoutMs = 3500) {
  const [notification, setNotification] = useState<Notification | null>(null)

  useEffect(() => {
    if (!notification) return
    const timeout = window.setTimeout(() => setNotification(null), timeoutMs)
    return () => window.clearTimeout(timeout)
  }, [notification, timeoutMs])

  return { notification, notify: setNotification }
}
