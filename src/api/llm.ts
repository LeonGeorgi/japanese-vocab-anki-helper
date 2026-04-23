import { getDefaultStore } from 'jotai'
import type { GenerateOptions, JlptLevel, ManualVocabResolution, Word } from '../types'
import { createLlmClient, type LlmFeature, type LlmModelInfo } from '../llm'
import { llmProviderAtom, llmTextModelAtom, llmVisionModelAtom } from '../state/settingsAtoms'
import {
  OCR_SYSTEM_PROMPT,
  OCR_USER_PROMPT,
  annotateSentencePrompt,
  convertWordToKanjiPrompt,
  defineWordPrompt,
  extractWordsPrompt,
  furiganaPrompt,
  generateExamplePrompt,
  generateManualExamplePrompt,
  resolveManualVocabPrompt,
  splitWordPrompt,
  translateSentencePrompt,
} from './llmPrompts'
import { parseManualVocabResolution, parseWordLines, stripWrappingJapaneseQuotes } from './llmParsers'
import { selectExampleContext } from './exampleContext'

function resolveLlmRuntime(apiKey: string) {
  const store = getDefaultStore()
  const provider = store.get(llmProviderAtom)
  return {
    textModel: store.get(llmTextModelAtom),
    visionModel: store.get(llmVisionModelAtom),
    client: createLlmClient({
      provider,
      apiKey,
    }),
  }
}

export async function listAvailableLlmModels(apiKey: string): Promise<LlmModelInfo[]> {
  const store = getDefaultStore()
  const provider = store.get(llmProviderAtom)
  const client = createLlmClient({ provider, apiKey })
  return client.listModels()
}

const CACHE_PREFIX = 'vocab_cache:'
const inflight = new Map<string, Promise<string>>()

function cached(key: string, fetcher: () => Promise<string>, force = false): Promise<string> {
  const storageKey = CACHE_PREFIX + key
  if (force) {
    localStorage.removeItem(storageKey)
    inflight.delete(key)
  }
  const stored = localStorage.getItem(storageKey)
  if (stored !== null) return Promise.resolve(stored)
  if (!inflight.has(key)) {
    inflight.set(key, fetcher().then(result => {
      localStorage.setItem(storageKey, result)
      inflight.delete(key)
      return result
    }).catch(err => {
      inflight.delete(key)
      throw err
    }))
  }
  return inflight.get(key)!
}

async function callTextModel(
  apiKey: string,
  feature: LlmFeature,
  prompt: string,
  maxTokens: number,
  thinkingTokens: number = 0,
  context?: Record<string, number>,
): Promise<string> {
  const { client, textModel } = resolveLlmRuntime(apiKey)
  return client.completeText({
    model: textModel,
    feature,
    prompt,
    maxTokens,
    thinkingTokens,
    context,
  })
}

export async function transcribeImage(
  apiKey: string,
  base64: string,
  mimeType: string
): Promise<string> {
  const { client, visionModel } = resolveLlmRuntime(apiKey)
  return client.completeFromImage({
    model: visionModel,
    feature: 'transcribe_image',
    imageBase64: base64,
    mimeType,
    prompt: OCR_USER_PROMPT,
    system: OCR_SYSTEM_PROMPT,
    maxTokens: 4096,
  })
}

export async function extractWords(
  apiKey: string,
  transcription: string,
): Promise<Word[]> {
  const text = await callTextModel(apiKey,
    'extract_words',
    extractWordsPrompt(transcription),
    1024, 2048,
    { sourceTextLength: transcription.length },
  )

  return parseWordLines(text)
}

export async function annotateSentence(
  apiKey: string,
  sentence: string,
  word: string,
  force = false,
): Promise<[string, string, string]> {
  const key = `annotate:${sentence}:${word}`
  const raw = await cached(key, () => callTextModel(
    apiKey,
    'annotate_sentence',
    annotateSentencePrompt(sentence, word),
    512, 1024,
    { sentenceLength: sentence.length, wordLength: word.length },
  ), force)
  const answerLine = raw.trim().split('\n').filter(l => l.includes('|')).pop() ?? ''
  const [before = '', wordPart = word, after = ''] = answerLine.split('|')
  return stripWrappingJapaneseQuotes([before, wordPart, after])
}

export function addFurigana(apiKey: string, text: string, force = false): Promise<string> {
  return cached(`furigana:${text}`, () => callTextModel(
    apiKey,
    'add_furigana',
    furiganaPrompt(text),
    256,
    0,
    { textLength: text.length },
  ), force)
}

export function defineWord(
  apiKey: string,
  word: string,
  targetLanguage: string,
  force = false,
): Promise<string> {
  const lang = targetLanguage || 'English'
  return cached(`define:${word}:${lang}`, () => callTextModel(
    apiKey,
    'define_word',
    defineWordPrompt(word, lang),
    64,
    0,
    { wordLength: word.length },
  ), force)
}

export function translateSentence(
  apiKey: string,
  sentence: string,
  targetLanguage: string,
): Promise<string> {
  const key = `translate:${sentence}:${targetLanguage}`
  return cached(key, () => callTextModel(
    apiKey,
    'translate_sentence',
    translateSentencePrompt(sentence, targetLanguage),
    128,
    0,
    { sentenceLength: sentence.length },
  ))
}

export async function splitWord(apiKey: string, word: string): Promise<Word[]> {
  const text = await callTextModel(
    apiKey,
    'split_word',
    splitWordPrompt(word),
    128,
    0,
    { wordLength: word.length },
  )
  return parseWordLines(text)
}

export async function convertWordToKanji(
  apiKey: string,
  transcription: string,
  word: string,
): Promise<string> {
  const text = await cached(`kanji:${transcription}:${word}`, () => callTextModel(
    apiKey,
    'convert_word_to_kanji',
    convertWordToKanjiPrompt(transcription, word),
    64,
    0,
    { sourceTextLength: transcription.length, wordLength: word.length },
  ))
  return text.trim().split(/\s+/)[0] || word
}

export function generateExample(
  apiKey: string,
  transcription: string,
  word: string,
  jlptLevel: JlptLevel,
  options: GenerateOptions = {}
): Promise<string> {
  const { previousSentence, simplify, feedback } = options
  const selectedContext = selectExampleContext(transcription, word)
  return callTextModel(
    apiKey,
    'generate_example',
    generateExamplePrompt(selectedContext.text, word, jlptLevel, previousSentence, simplify, feedback),
    256,
    1024,
    {
      sourceTextLength: transcription.length,
      contextTextLength: selectedContext.text.length,
      contextFallback: selectedContext.usedFallback ? 1 : 0,
      contextMethodExact: selectedContext.method === 'exact' ? 1 : 0,
      contextMethodRelaxed: selectedContext.method === 'relaxed' ? 1 : 0,
      wordLength: word.length,
    },
  )
}

export async function resolveManualVocab(
  apiKey: string,
  word: string,
  targetLanguage: string,
  context?: string,
): Promise<ManualVocabResolution> {
  const cleanWord = word.trim()
  const lang = targetLanguage || 'English'
  const raw = await callTextModel(
    apiKey,
    'resolve_manual_vocab',
    resolveManualVocabPrompt(cleanWord, lang, context),
    512,
    0,
    { wordLength: cleanWord.length, contextLength: context?.length ?? 0 },
  )
  return parseManualVocabResolution(raw, cleanWord)
}

export function generateManualExample(
  apiKey: string,
  word: string,
  jlptLevel: JlptLevel,
  options: GenerateOptions = {},
  meaning?: string,
  context?: string,
): Promise<string> {
  return callTextModel(
    apiKey,
    'generate_manual_example',
    generateManualExamplePrompt(word, jlptLevel, options, meaning, context),
    256,
    1024,
    { wordLength: word.length, meaningLength: meaning?.length ?? 0, contextLength: context?.length ?? 0 },
  )
}
