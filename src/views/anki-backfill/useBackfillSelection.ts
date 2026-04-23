import { useMemo, useState } from 'react'
import type { BackfillNote } from '../../api/ankiBackfill'

export function useBackfillSelection(notes: BackfillNote[]) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const selectedNotes = useMemo(
    () => notes.filter(note => selectedIds.has(note.id)),
    [notes, selectedIds],
  )

  const allSelected = notes.length > 0 && selectedIds.size === notes.length

  function selectNotes(nextNotes: BackfillNote[]) {
    setSelectedIds(new Set(nextNotes.map(note => note.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function toggleSelected(noteId: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(noteId)) next.delete(noteId)
      else next.add(noteId)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(notes.map(note => note.id)))
  }

  return {
    selectedCount: selectedIds.size,
    selectedNotes,
    allSelected,
    selectNotes,
    clearSelection,
    toggleSelected,
    toggleAll,
    isSelected: (noteId: number) => selectedIds.has(noteId),
  }
}
