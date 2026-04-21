import { useState, useCallback } from 'react'

export function useLocalStorage(key: string, defaultValue: string): [string, (value: string) => void]
export function useLocalStorage<T extends string>(key: string, defaultValue: T): [T, (value: T) => void]
export function useLocalStorage<T extends string>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => (localStorage.getItem(key) as T) ?? defaultValue)

  const set = useCallback((newValue: T) => {
    setValue(newValue)
    localStorage.setItem(key, newValue)
  }, [key])

  return [value, set]
}
