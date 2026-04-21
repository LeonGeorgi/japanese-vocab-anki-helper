import { expect, test } from 'vitest'
import { toAnkiNoteFields } from '../src/api/ankiNoteFields'

test('toAnkiNoteFields maps generated card data through configured Anki field names', () => {
  expect(
    toAnkiNoteFields(
      {
        before: 'FrontBefore',
        word: 'FrontWord',
        after: 'FrontAfter',
        plainWord: 'Plain',
        definition: 'WordTranslation',
        sentence: 'SentenceTranslation',
        image: 'Picture',
      },
      {
        before: '毎日[まいにち]',
        word: '勉強[べんきょう]する',
        after: '。',
        plainWord: '勉強する',
        definition: 'to study',
        sentence: 'I study every day.',
      },
      '<img src="study.png">',
    ),
  ).toEqual({
      FrontBefore: '毎日[まいにち]',
      FrontWord: '勉強[べんきょう]する',
      FrontAfter: '。',
      Plain: '勉強する',
      WordTranslation: 'to study',
      SentenceTranslation: 'I study every day.',
      Picture: '<img src="study.png">',
    })
})
