import { expect, test } from 'vitest'
import { ankiFieldNamesFromMapping, removeFieldMappingForFields, toAnkiNoteFields } from '../src/api/ankiNoteFields'

test('toAnkiNoteFields maps generated card data through configured Anki note fields', () => {
  expect(
    toAnkiNoteFields(
      {
        FrontBefore: 'before',
        FrontWord: 'word',
        FrontAfter: 'after',
        Plain: 'plainWord',
        WordTranslation: 'definition',
        SentenceTranslation: 'sentence',
        Picture: 'image',
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

test('toAnkiNoteFields omits unchanged fields', () => {
  expect(
    toAnkiNoteFields(
      {
        Word: 'plainWord',
        ExistingField: 'unchanged',
      },
      {
        before: '',
        word: '',
        after: '',
        plainWord: '勉強する',
        definition: '',
        sentence: '',
      },
    ),
  ).toEqual({
    Word: '勉強する',
  })
})

test('ankiFieldNamesFromMapping does not invent names for explicitly unchanged fields', () => {
  expect(
    ankiFieldNamesFromMapping({
      Before: 'before',
      Word: 'word',
      Sentence: 'unchanged',
    }).sentence,
  ).toBe('')
})

test('removeFieldMappingForFields clears only selected model fields', () => {
  expect(
    removeFieldMappingForFields(
      {
        Word: 'plainWord',
        Sentence: 'sentence',
        OtherModelField: 'definition',
      },
      ['Word', 'Sentence'],
    ),
  ).toEqual({
    OtherModelField: 'definition',
  })
})
