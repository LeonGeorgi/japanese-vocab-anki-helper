import { atom, type Setter, type WritableAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { BaseSession, SessionHistoryEntry } from './session-types'

type StateUpdate<T> = T | ((prev: T) => T)

interface SessionStoreConfig<
  TSession extends BaseSession,
  THistoryEntry extends SessionHistoryEntry<TSession>,
> {
  storageKey: string
  historyKey: string
  createEmpty: () => TSession
  normalize: (session: TSession, previous?: TSession) => TSession
  createHistoryEntry: (session: TSession) => THistoryEntry | null
  clearEphemeralState?: (set: Setter) => void
}

const storageOptions = { getOnInit: true }
const maxHistoryEntries = 20

function historyWithEntry<T extends { id: string }>(history: T[], entry: T): T[] {
  return [
    entry,
    ...history.filter(item => item.id !== entry.id),
  ].slice(0, maxHistoryEntries)
}

export function createPersistedSessionStore<
  TSession extends BaseSession,
  THistoryEntry extends SessionHistoryEntry<TSession>,
>({
  storageKey,
  historyKey,
  createEmpty,
  normalize,
  createHistoryEntry,
  clearEphemeralState,
}: SessionStoreConfig<TSession, THistoryEntry>) {
  const storedSessionAtom = atomWithStorage<TSession>(storageKey, createEmpty(), undefined, storageOptions)
  const historyAtom = atomWithStorage<THistoryEntry[]>(historyKey, [], undefined, storageOptions)

  const sessionAtom = atom(
    get => normalize(get(storedSessionAtom)),
    (get, set, update: StateUpdate<TSession>) => {
      const prev = normalize(get(storedSessionAtom))
      const nextValue = typeof update === 'function' ? update(prev) : update
      const next = normalize(nextValue, prev)

      set(storedSessionAtom, next)
      const entry = createHistoryEntry(next)
      if (entry) set(historyAtom, historyWithEntry(get(historyAtom), entry))
    },
  )

  const restoreHistoryAtom = atom(null, (get, set, id: string) => {
    const entry = get(historyAtom).find(item => item.id === id)
    if (!entry) return
    set(storedSessionAtom, normalize({ ...entry.session, id: entry.session.id ?? entry.id }))
    clearEphemeralState?.(set)
  })

  const deleteHistoryEntryAtom = atom(null, (get, set, id: string) => {
    set(historyAtom, get(historyAtom).filter(entry => entry.id !== id))
    if (get(sessionAtom).id === id) {
      set(storedSessionAtom, createEmpty())
      clearEphemeralState?.(set)
    }
  })

  const resetAtom: WritableAtom<null, [], string> = atom(null, (get, set) => {
    const entry = createHistoryEntry(get(sessionAtom))
    if (entry) set(historyAtom, historyWithEntry(get(historyAtom), entry))
    const next = createEmpty()
    set(storedSessionAtom, next)
    clearEphemeralState?.(set)
    return next.id
  })

  const setTitleAtom = atom(null, (_get, set, title: string) => {
    const value = title.trimStart()
    set(sessionAtom, prev => ({ ...prev, title: value }))
  })

  return {
    sessionAtom,
    historyAtom,
    restoreHistoryAtom,
    deleteHistoryEntryAtom,
    resetAtom,
    setTitleAtom,
  }
}
