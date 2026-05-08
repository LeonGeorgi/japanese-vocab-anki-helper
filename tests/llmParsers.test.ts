import { expect, test } from 'vitest'
import { parseDraftingFeedback, parseDraftingRepairChoice, parseManualVocabResolution, parseWordLines, stripResponseTag, stripWrappingJapaneseQuotes, stripXmlLikeTags } from '../src/api/llmParsers'

test('stripWrappingJapaneseQuotes removes only balanced outer Japanese quotes across split parts', () => {
  expect(
    stripWrappingJapaneseQuotes(['「前', '語', '後」']),
  ).toEqual(['前', '語', '後'])

  expect(
    stripWrappingJapaneseQuotes(['', '「語', '後」']),
  ).toEqual(['', '語', '後'])
})

test('stripWrappingJapaneseQuotes leaves unbalanced quotes unchanged', () => {
  expect(
    stripWrappingJapaneseQuotes(['「前', '語', '後']),
  ).toEqual(['「前', '語', '後'])

  expect(
    stripWrappingJapaneseQuotes(['前', '語', '後」']),
  ).toEqual(['前', '語', '後」'])
})

test('parseWordLines trims words, drops duplicates, and normalizes unknown levels', () => {
  expect(
    parseWordLines(' 勉強する | N5\n醸造|N1\n勉強する|N5\nhello|unknown\n|N3'),
  ).toEqual([
      { word: '勉強する', level: 'N5' },
      { word: '醸造', level: 'N1' },
      { word: 'hello', level: null },
    ])
})

test('parseWordLines ignores echoed xml-like tags', () => {
  expect(
    parseWordLines('<output>\n勉強する|N5\n醸造|N1\n</output>'),
  ).toEqual([
    { word: '勉強する', level: 'N5' },
    { word: '醸造', level: 'N1' },
  ])
})

test('parseManualVocabResolution parses clear and ambiguous JSON responses', () => {
  expect(
    parseManualVocabResolution('{"status":"clear","word":"橋","meaning":"bridge"}', 'はし'),
  ).toEqual({
    status: 'clear',
    option: { word: '橋', meaning: 'bridge' },
  })

  expect(
    parseManualVocabResolution('```json\n{"status":"ambiguous","options":[{"word":"橋","meaning":"bridge"},{"word":"箸","meaning":"chopsticks"}]}\n```', 'はし'),
  ).toEqual({
    status: 'ambiguous',
    options: [
      { word: '橋', meaning: 'bridge' },
      { word: '箸', meaning: 'chopsticks' },
    ],
  })
})

test('parseManualVocabResolution falls back to a clear result when JSON is invalid', () => {
  expect(parseManualVocabResolution('not json', 'はし')).toEqual({
    status: 'clear',
    option: { word: 'はし', meaning: '' },
  })
})

test('stripResponseTag unwraps response tags when present', () => {
  expect(stripResponseTag('<response>店のお客が増えた。</response>')).toBe('店のお客が増えた。')
  expect(stripResponseTag(' <response>\n店のお客が増えた。\n</response> ')).toBe('店のお客が増えた。')
  expect(stripResponseTag('<output><response>店のお客が増えた。</response></output>')).toBe('店のお客が増えた。')
  expect(stripResponseTag('店のお客が増えた。')).toBe('店のお客が増えた。')
})

test('stripXmlLikeTags removes generic xml-like wrappers', () => {
  expect(stripXmlLikeTags('<output><word>橋</word></output>')).toBe('橋')
  expect(stripXmlLikeTags(' <thinking>\nIdea A\n</thinking> ')).toBe('Idea A')
})

test('parseDraftingFeedback parses valid drafting feedback JSON', () => {
  expect(parseDraftingFeedback(`{
    "summary": "Strong overall draft.",
    "strengths": ["Clear structure"],
    "improvements": ["Tighten the ending"],
    "annotations": [
      {
        "severity": "warning",
        "quote": "今日は",
        "occurrence": 1,
        "sentenceIndex": 0,
        "reason": "Slightly awkward opening.",
        "suggestion": "Use a more natural opener."
      },
      {
        "severity": "error",
        "quote": "で",
        "occurrence": 1,
        "sentenceIndex": 0,
        "reason": "Wrong particle.",
        "suggestion": "Replace it with に."
      }
    ]
  }`)).toEqual({
    summary: 'Strong overall draft.',
    strengths: ['Clear structure'],
    improvements: ['Tighten the ending'],
    annotations: [
      {
        severity: 'warning',
        quote: '今日は',
        occurrence: 1,
        sentenceIndex: 0,
        reason: 'Slightly awkward opening.',
        suggestion: 'Use a more natural opener.',
      },
      {
        severity: 'error',
        quote: 'で',
        occurrence: 1,
        sentenceIndex: 0,
        reason: 'Wrong particle.',
        suggestion: 'Replace it with に.',
      },
    ],
  })
})

test('parseDraftingFeedback drops invalid and overlapping annotations but keeps top-level feedback', () => {
  expect(parseDraftingFeedback(`{
    "summary": "Reasonable draft.",
    "strengths": ["Clear intent"],
    "improvements": ["Fix the middle sentence"],
    "annotations": [
      {
        "severity": "warning",
        "quote": "変な言い方",
        "occurrence": 1,
        "sentenceIndex": 0,
        "reason": "Awkward phrase.",
        "suggestion": "Shorten it."
      },
      {
        "severity": "error",
        "quote": "",
        "occurrence": 1,
        "sentenceIndex": 0,
        "reason": "Empty quote.",
        "suggestion": "This one should be dropped."
      },
      {
        "severity": "warning",
        "quote": "句",
        "occurrence": 0,
        "sentenceIndex": 0,
        "reason": "Bad occurrence.",
        "suggestion": "Drop this too."
      },
      {
        "severity": "maybe",
        "quote": "句",
        "occurrence": 1,
        "sentenceIndex": 0,
        "reason": "Unknown severity.",
        "suggestion": "Drop this too."
      }
    ]
  }`)).toEqual({
    summary: 'Reasonable draft.',
    strengths: ['Clear intent'],
    improvements: ['Fix the middle sentence'],
    annotations: [
      {
        severity: 'warning',
        quote: '変な言い方',
        occurrence: 1,
        sentenceIndex: 0,
        reason: 'Awkward phrase.',
        suggestion: 'Shorten it.',
      },
    ],
  })
})

test('parseDraftingFeedback returns null when the response is not usable JSON', () => {
  expect(parseDraftingFeedback('not json at all')).toBeNull()
})

test('parseDraftingRepairChoice returns a valid repaired occurrence number', () => {
  expect(parseDraftingRepairChoice('{"occurrence":2}')).toBe(2)
  expect(parseDraftingRepairChoice('{"occurrence":0}')).toBeNull()
  expect(parseDraftingRepairChoice('not json')).toBeNull()
})
