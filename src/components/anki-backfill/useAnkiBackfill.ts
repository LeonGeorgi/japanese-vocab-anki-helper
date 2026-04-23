import { useState } from 'react'
import { fillBackfillNote, loadBackfillCandidates } from '../../api/ankiBackfillActions'
import type { BackfillNote, BackfillSummary } from '../../api/ankiBackfill'
import type { AnkiFieldNames } from '../../api/ankiCard'
import type { FillStatus } from '../../api/ankiBackfill'
import { useBackfillSelection } from './useBackfillSelection'

export function useAnkiBackfill(apiKey: string, nativeLanguage: string, fieldNames: AnkiFieldNames) {
  const [notes, setNotes] = useState<BackfillNote[]>([])
  const [loading, setLoading] = useState(false)
  const [filling, setFilling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selection = useBackfillSelection(notes)

  async function loadMissingTranslations(deck: string, model: string) {
    setLoading(true)
    setError(null)
    setNotes([])
    selection.clearSelection()
    try {
      const nextNotes = await loadBackfillCandidates(deck, model, fieldNames)
      setNotes(nextNotes)
      selection.selectNotes(nextNotes)
      return nextNotes.length
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load Anki cards'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  function updateNoteStatus(noteId: number, status: FillStatus, errorMessage: string | null = null) {
    setNotes(prev => prev.map(note => (
      note.id === noteId ? { ...note, status, error: errorMessage } : note
    )))
  }

  async function fillSelected(): Promise<BackfillSummary> {
    if (!selection.selectedNotes.length) return { completed: 0, failed: 0 }

    setFilling(true)
    let completed = 0
    let failed = 0
    const lang = nativeLanguage || 'English'

    for (const note of selection.selectedNotes) {
      updateNoteStatus(note.id, 'loading')
      try {
        await fillBackfillNote(apiKey, note, lang, fieldNames)
        completed += 1
        updateNoteStatus(note.id, 'done')
      } catch (e) {
        failed += 1
        updateNoteStatus(note.id, 'error', e instanceof Error ? e.message : 'Failed')
      }
    }

    setFilling(false)
    return { completed, failed }
  }

  return {
    notes,
    selectedCount: selection.selectedCount,
    allSelected: selection.allSelected,
    loading,
    filling,
    error,
    loadMissingTranslations,
    fillSelected,
    toggleSelected: selection.toggleSelected,
    toggleAll: selection.toggleAll,
    isSelected: selection.isSelected,
  }
}
