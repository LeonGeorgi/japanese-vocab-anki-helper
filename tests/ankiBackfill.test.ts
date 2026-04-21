import { expect, test } from 'vitest'
import { plainAnkiText, toBackfillNote } from '../src/api/ankiBackfill'
import type { AnkiNoteInfo } from '../src/api/anki'

const fieldNames = {
  before: 'Before',
  word: 'Word',
  after: 'After',
  plainWord: 'WordPlain',
  definition: 'Definition',
  sentence: 'Sentence',
  image: 'Image',
}

function note(fields: Record<string, string>): AnkiNoteInfo {
  return {
    noteId: 42,
    modelName: 'Japanese',
    tags: [],
    fields: Object.fromEntries(
      Object.entries(fields).map(([name, value], order) => [name, { value, order }]),
    ),
  }
}

test('plainAnkiText removes html tags, furigana readings, and spacing', () => {
  expect(
    plainAnkiText(' 毎日[まいにち]<br> 勉強[べんきょう]する '),
  ).toBe('毎日勉強する')
})

test('toBackfillNote combines front fields into a plain sentence', () => {
  expect(
    toBackfillNote(note({
      Before: '毎日[まいにち]',
      Word: '勉強[べんきょう]する',
      After: '。',
      WordPlain: '勉強する',
    }), fieldNames),
  ).toEqual({
      id: 42,
      before: '毎日[まいにち]',
      word: '勉強[べんきょう]する',
      after: '。',
      plainWord: '勉強する',
      sentence: '毎日勉強する。',
      status: 'idle',
      error: null,
    })
})

test('toBackfillNote falls back to plain target word when WordPlain is empty', () => {
  expect(
    toBackfillNote(note({
      Before: '',
      Word: '飲[の]む',
      After: '',
      WordPlain: '',
    }), fieldNames).plainWord,
  ).toBe('飲む')
})
