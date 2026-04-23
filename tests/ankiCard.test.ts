import { getDefaultStore } from 'jotai'
import { beforeEach, expect, test, vi } from 'vitest'
import { ankiFieldNamesFromMapping, removeFieldMappingForFields, toAnkiNoteFields } from '../src/api/ankiNoteFields'
import { quickAddAnkiCard } from '../src/api/ankiCard'
import {
  ankiDeckAtom,
  ankiFieldMappingAtom,
  ankiModelAtom,
} from '../src/state/ankiAtoms'

const {
  addNoteMock,
  getModelFieldNamesMock,
  annotateSentenceMock,
  defineWordMock,
  translateSentenceMock,
} = vi.hoisted(() => ({
  addNoteMock: vi.fn(),
  getModelFieldNamesMock: vi.fn(),
  annotateSentenceMock: vi.fn(),
  defineWordMock: vi.fn(),
  translateSentenceMock: vi.fn(),
}))

vi.mock('../src/api/anki', () => ({
  addNote: addNoteMock,
  getModelFieldNames: getModelFieldNamesMock,
}))

vi.mock('../src/api/llm', () => ({
  annotateSentence: annotateSentenceMock,
  defineWord: defineWordMock,
  translateSentence: translateSentenceMock,
}))

beforeEach(() => {
  addNoteMock.mockReset()
  getModelFieldNamesMock.mockReset()
  annotateSentenceMock.mockReset()
  defineWordMock.mockReset()
  translateSentenceMock.mockReset()
})

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

test('quickAddAnkiCard resolves model fields and adds both definition and sentence translation', async () => {
  const store = getDefaultStore()
  store.set(ankiDeckAtom, 'Japanese')
  store.set(ankiModelAtom, 'Japanese Basic')
  store.set(ankiFieldMappingAtom, {
    Definition: 'definition',
    Sentence: 'sentence',
    Word: 'plainWord',
  })

  getModelFieldNamesMock.mockResolvedValue(['Word', 'Meaning', 'SentenceTranslation'])
  annotateSentenceMock.mockResolvedValue(['毎日', '勉強する', '。'])
  defineWordMock.mockResolvedValue('to study')

  await quickAddAnkiCard(
    'test-api-key',
    '勉強する',
    '毎日勉強する。',
    'I study every day.',
    'English',
  )

  expect(translateSentenceMock).not.toHaveBeenCalled()
  expect(addNoteMock).toHaveBeenCalledWith(
    'Japanese',
    'Japanese Basic',
    {
      Word: '勉強する',
      Meaning: 'to study',
      SentenceTranslation: 'I study every day.',
    },
  )
})
