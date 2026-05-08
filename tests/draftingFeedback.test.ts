import { expect, test } from 'vitest'
import { buildDraftingPreviewSegments, resolveDraftingAnnotations, segmentDraftingSentences, sentenceTableForPrompt } from '../src/api/draftingFeedback'

test('segmentDraftingSentences splits on Japanese punctuation and line breaks', () => {
  expect(segmentDraftingSentences('今日は雨です。明日も雨？\nでも出かけます！')).toEqual([
    { index: 0, text: '今日は雨です。', startOffset: 0, endOffset: 7 },
    { index: 1, text: '明日も雨？\n', startOffset: 7, endOffset: 13 },
    { index: 2, text: 'でも出かけます！', startOffset: 13, endOffset: 21 },
  ])
})

test('sentenceTableForPrompt is more compact than the legacy token table on a representative draft', () => {
  const draft = '今日は日本語の作文を書きます。少し長い文章ですが、自然にしたいです。\n先生に見せる前に直したいです。'
  const sentenceTable = JSON.stringify(sentenceTableForPrompt(draft))
  const legacyTokenTable = JSON.stringify(Array.from(draft).map((text, index) => ({ index, text })))
  expect(sentenceTable.length).toBeLessThan(legacyTokenTable.length)
})

test('resolveDraftingAnnotations resolves exact quotes, repeated quotes, and sentence-specific duplicates', () => {
  const draft = 'はい、はい。いいです。\nはい、やります。'
  const result = resolveDraftingAnnotations(draft, [
    {
      severity: 'warning',
      quote: 'はい',
      occurrence: 2,
      sentenceIndex: 0,
      reason: 'Second one feels repetitive.',
      suggestion: 'Drop one repetition.',
    },
    {
      severity: 'error',
      quote: 'はい',
      occurrence: 1,
      sentenceIndex: 2,
      reason: 'This reply mismatches the intended tone.',
      suggestion: 'Use a softer phrase.',
    },
  ])

  expect(result.unresolved).toEqual([])
  expect(result.annotations).toEqual([
    {
      severity: 'warning',
      quote: 'はい',
      occurrence: 2,
      sentenceIndex: 0,
      reason: 'Second one feels repetitive.',
      suggestion: 'Drop one repetition.',
      startOffset: 3,
      endOffset: 5,
    },
    {
      severity: 'error',
      quote: 'はい',
      occurrence: 1,
      sentenceIndex: 2,
      reason: 'This reply mismatches the intended tone.',
      suggestion: 'Use a softer phrase.',
      startOffset: 12,
      endOffset: 14,
    },
  ])
})

test('resolveDraftingAnnotations reports unresolved quotes and drops overlaps conservatively', () => {
  const draft = '同じ言葉を同じ言葉で言いました。'
  const result = resolveDraftingAnnotations(draft, [
    {
      severity: 'warning',
      quote: '同じ言葉',
      occurrence: 1,
      sentenceIndex: 0,
      reason: 'First phrase is repetitive.',
      suggestion: 'Vary the wording.',
    },
    {
      severity: 'error',
      quote: '言葉を同じ',
      occurrence: 1,
      sentenceIndex: 0,
      reason: 'This overlapping span should be dropped.',
      suggestion: 'Shorten it.',
    },
    {
      severity: 'warning',
      quote: 'ありません',
      occurrence: 1,
      sentenceIndex: 0,
      reason: 'Not found.',
      suggestion: 'Drop it.',
    },
  ])

  expect(result.annotations).toEqual([
    {
      severity: 'warning',
      quote: '同じ言葉',
      occurrence: 1,
      sentenceIndex: 0,
      reason: 'First phrase is repetitive.',
      suggestion: 'Vary the wording.',
      startOffset: 0,
      endOffset: 4,
    },
  ])
  expect(result.unresolved).toHaveLength(1)
  expect(result.unresolved[0].annotation.quote).toBe('ありません')
})

test('buildDraftingPreviewSegments creates contiguous annotated and plain spans', () => {
  expect(buildDraftingPreviewSegments('abcdef', [
    {
      severity: 'warning',
      quote: 'bc',
      occurrence: 1,
      sentenceIndex: 0,
      reason: 'awkward',
      suggestion: 'improve',
      startOffset: 1,
      endOffset: 3,
    },
    {
      severity: 'error',
      quote: 'e',
      occurrence: 1,
      sentenceIndex: 0,
      reason: 'wrong',
      suggestion: 'fix',
      startOffset: 4,
      endOffset: 5,
    },
  ])).toEqual([
    { text: 'a', annotation: null },
    {
      text: 'bc',
      annotation: {
        severity: 'warning',
        quote: 'bc',
        occurrence: 1,
        sentenceIndex: 0,
        reason: 'awkward',
        suggestion: 'improve',
        startOffset: 1,
        endOffset: 3,
      },
    },
    { text: 'd', annotation: null },
    {
      text: 'e',
      annotation: {
        severity: 'error',
        quote: 'e',
        occurrence: 1,
        sentenceIndex: 0,
        reason: 'wrong',
        suggestion: 'fix',
        startOffset: 4,
        endOffset: 5,
      },
    },
    { text: 'f', annotation: null },
  ])
})
