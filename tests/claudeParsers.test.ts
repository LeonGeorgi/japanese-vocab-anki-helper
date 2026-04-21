import { expect, test } from 'vitest'
import { parseWordLines, stripWrappingJapaneseQuotes } from '../src/api/claudeParsers'

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
