import { expect, test } from 'vitest'
import {
  addUniqueWord,
  renameRecordKey,
  replaceWord,
  replaceWordWithComponents,
} from '../src/primitives/vocab/hooks/vocabStateHelpers'

test('addUniqueWord adds missing words and keeps existing words unchanged', () => {
  const words = [{ word: '勉強', level: null }]

  expect(addUniqueWord(words, '読む')).toEqual([
    { word: '勉強', level: null },
    { word: '読む', level: null },
  ])
  expect(addUniqueWord(words, '勉強')).toBe(words)
})

test('replaceWord updates the matching word in place', () => {
  expect(
    replaceWord([
      { word: 'たべる', level: null },
      { word: '読む', level: 'N5' },
    ], 'たべる', '食べる'),
  ).toEqual([
    { word: '食べる', level: null },
    { word: '読む', level: 'N5' },
  ])
})

test('replaceWordWithComponents swaps one word for split components', () => {
  expect(
    replaceWordWithComponents([
      { word: '日本語学校', level: null },
      { word: '行く', level: 'N5' },
    ], '日本語学校', [
      { word: '日本語', level: 'N5' },
      { word: '学校', level: 'N5' },
    ]),
  ).toEqual([
    { word: '日本語', level: 'N5' },
    { word: '学校', level: 'N5' },
    { word: '行く', level: 'N5' },
  ])
})

test('renameRecordKey moves an existing record value to the new key', () => {
  expect(renameRecordKey({ たべる: 'eat', 読む: 'read' }, 'たべる', '食べる')).toEqual({
    食べる: 'eat',
    読む: 'read',
  })
})
