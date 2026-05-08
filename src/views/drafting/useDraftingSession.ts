import type { Dispatch, SetStateAction } from 'react'
import { useAtom } from 'jotai'
import type { DraftingFeedback } from '../../types'
import {
  draftingSessionAtom,
  isDraftingFeedbackStale,
} from '../../state/vocabSessionAtoms'

export function useDraftingSession() {
  const [session, setSession] = useAtom(draftingSessionAtom)

  const setDraftText: Dispatch<SetStateAction<string>> = value => {
    setSession(prev => ({
      ...prev,
      draftText: typeof value === 'function' ? value(prev.draftText) : value,
    }))
  }

  const setPurposeText: Dispatch<SetStateAction<string>> = value => {
    setSession(prev => ({
      ...prev,
      purposeText: typeof value === 'function' ? value(prev.purposeText) : value,
    }))
  }

  const setFeedback: Dispatch<SetStateAction<DraftingFeedback | null>> = value => {
    setSession(prev => ({
      ...prev,
      feedback: typeof value === 'function' ? value(prev.feedback) : value,
    }))
  }

  const setLastFeedbackDraftText: Dispatch<SetStateAction<string>> = value => {
    setSession(prev => ({
      ...prev,
      lastFeedbackDraftText: typeof value === 'function' ? value(prev.lastFeedbackDraftText) : value,
    }))
  }

  return {
    session,
    draftText: session.draftText,
    purposeText: session.purposeText,
    feedback: session.feedback,
    lastFeedbackDraftText: session.lastFeedbackDraftText,
    feedbackStale: isDraftingFeedbackStale(session),
    setDraftText,
    setPurposeText,
    setFeedback,
    setLastFeedbackDraftText,
  }
}
