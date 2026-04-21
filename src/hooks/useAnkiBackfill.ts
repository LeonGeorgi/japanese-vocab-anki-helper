import { useMemo, useState } from 'react'
import { findNotesWithEmptyField, getNotesInfo, updateNoteFields } from '../api/anki'
import type { BackfillNote, BackfillSummary } from '../api/ankiBackfill'
import { toBackfillNote } from '../api/ankiBackfill'
import { defineWord, translateSentence } from '../api/claude'
import type { AnkiFieldNames } from '../api/ankiCard'
import type { FillStatus } from '../api/ankiBackfill'

export function useAnkiBackfill(apiKey: string, nativeLanguage: string, fieldNames: AnkiFieldNames) {
  const [notes, setNotes] = useState<BackfillNote[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [filling, setFilling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedCount = selectedIds.size
  const allSelected = notes.length > 0 && selectedIds.size === notes.length

  const selectedNotes = useMemo(
    () => notes.filter(note => selectedIds.has(note.id)),
    [notes, selectedIds],
  )

  async function loadMissingTranslations(deck: string, model: string) {
    setLoading(true)
    setError(null)
    setNotes([])
    setSelectedIds(new Set())
    try {
      const noteIds = await findNotesWithEmptyField(deck, model, fieldNames.sentence)
      const noteInfo = await getNotesInfo(noteIds)
      const nextNotes = noteInfo
        .map(note => toBackfillNote(note, fieldNames))
        .filter(note => note.sentence.length > 0 && note.plainWord.length > 0)
      setNotes(nextNotes)
      setSelectedIds(new Set(nextNotes.map(note => note.id)))
      return nextNotes.length
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load Anki cards'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
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

  function updateNoteStatus(noteId: number, status: FillStatus, errorMessage: string | null = null) {
    setNotes(prev => prev.map(note => (
      note.id === noteId ? { ...note, status, error: errorMessage } : note
    )))
  }

  async function fillSelected(): Promise<BackfillSummary> {
    if (!selectedNotes.length) return { completed: 0, failed: 0 }

    setFilling(true)
    let completed = 0
    let failed = 0
    const lang = nativeLanguage || 'English'

    for (const note of selectedNotes) {
      updateNoteStatus(note.id, 'loading')
      try {
        const [sentenceTranslation, wordDefinition] = await Promise.all([
          translateSentence(apiKey, note.sentence, lang),
          defineWord(apiKey, note.plainWord, lang),
        ])
        await updateNoteFields(note.id, {
          [fieldNames.sentence]: sentenceTranslation,
          [fieldNames.definition]: wordDefinition,
        })
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
    selectedCount,
    allSelected,
    loading,
    filling,
    error,
    loadMissingTranslations,
    fillSelected,
    toggleSelected,
    toggleAll,
    isSelected: (noteId: number) => selectedIds.has(noteId),
  }
}
