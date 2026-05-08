import { expect, test } from 'vitest'
import { draftingHistoryTitle, createEmptyDraftingSession, isDraftingFeedbackStale, isEmptyDraftingSession } from '../src/state/vocabSessionAtoms'

test('createEmptyDraftingSession starts blank', () => {
  const session = createEmptyDraftingSession()
  expect(session.id.startsWith('drafting_')).toBe(true)
  expect(session.draftText).toBe('')
  expect(session.purposeText).toBe('')
  expect(session.lastFeedbackDraftText).toBe('')
  expect(session.feedback).toBeNull()
})

test('draftingHistoryTitle prefers explicit title, then draft text, then purpose', () => {
  const base = createEmptyDraftingSession()
  expect(draftingHistoryTitle({ ...base, title: ' My draft ' })).toBe('My draft')
  expect(draftingHistoryTitle({ ...base, draftText: '一行目です\n二行目' })).toBe('一行目です')
  expect(draftingHistoryTitle({ ...base, purposeText: 'short apology email' })).toBe('Drafting: short apology email')
})

test('isEmptyDraftingSession only treats untouched sessions as empty', () => {
  const base = createEmptyDraftingSession()
  expect(isEmptyDraftingSession(base)).toBe(true)
  expect(isEmptyDraftingSession({ ...base, purposeText: 'Self-introduction' })).toBe(false)
  expect(isEmptyDraftingSession({ ...base, draftText: 'こんにちは。' })).toBe(false)
  expect(isEmptyDraftingSession({
    ...base,
    feedback: {
      summary: 'Good start',
      strengths: [],
      improvements: [],
      annotations: [],
    },
  })).toBe(false)
})

test('isDraftingFeedbackStale tracks whether the draft changed after feedback', () => {
  const base = createEmptyDraftingSession()
  expect(isDraftingFeedbackStale(base)).toBe(false)
  expect(isDraftingFeedbackStale({
    ...base,
    draftText: '今日は雨です。',
    lastFeedbackDraftText: '今日は雨です。',
    feedback: {
      summary: 'Looks fine.',
      strengths: [],
      improvements: [],
      annotations: [],
    },
  })).toBe(false)
  expect(isDraftingFeedbackStale({
    ...base,
    draftText: '今日は雨でした。',
    lastFeedbackDraftText: '今日は雨です。',
    feedback: {
      summary: 'Looks fine.',
      strengths: [],
      improvements: [],
      annotations: [],
    },
  })).toBe(true)
})
