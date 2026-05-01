import { getDefaultStore } from 'jotai'
import type { GenerateOptions, JlptLevel, ManualVocabResolution, Word } from '../types'
import { createLlmClient, type LlmModelInfo } from '../llm'
import { llmProviderAtom } from '../state/settingsAtoms'
import {
  ANNOTATE_SENTENCE_SYSTEM_PROMPT,
  CONVERT_WORD_TO_KANJI_SYSTEM_PROMPT,
  EXTRACT_WORDS_SYSTEM_PROMPT,
  FURIGANA_SYSTEM_PROMPT,
  OCR_SYSTEM_PROMPT,
  OCR_USER_PROMPT,
  SPLIT_WORD_SYSTEM_PROMPT,
  annotateSentencePrompt,
  convertWordToKanjiPrompt,
  defineWordSystemPrompt,
  defineWordPrompt,
  extractWordsPrompt,
  furiganaPrompt,
  generateExamplePrompt,
  generateExampleSystemPrompt,
  generateManualExamplePrompt,
  generateManualExampleSystemPrompt,
  resolveManualVocabSystemPrompt,
  resolveManualVocabPrompt,
  splitWordPrompt,
  translateSentenceSystemPrompt,
  translateSentencePrompt,
} from './llmPrompts'
import { parseManualVocabResolution, parseWordLines, stripResponseTag, stripWrappingJapaneseQuotes, stripXmlLikeTags } from './llmParsers'
import { selectExampleContext } from './exampleContext'
import { cached, callTextModel, resolveLlmRuntime } from './llmRuntime'


export async function listAvailableLlmModels(apiKey: string): Promise<LlmModelInfo[]> {
  const store = getDefaultStore()
  const provider = store.get(llmProviderAtom)
  const client = createLlmClient({ provider, apiKey })
  return client.listModels()
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
    EXTRACT_WORDS_SYSTEM_PROMPT,
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
    ANNOTATE_SENTENCE_SYSTEM_PROMPT,
    { sentenceLength: sentence.length, wordLength: word.length },
  ), force)
  const answerLine = stripXmlLikeTags(raw).split('\n').filter(l => l.includes('|')).pop() ?? ''
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
    FURIGANA_SYSTEM_PROMPT,
    { textLength: text.length },
  ).then(stripXmlLikeTags), force)
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
    defineWordPrompt(word),
    64,
    0,
    defineWordSystemPrompt(lang),
    { wordLength: word.length },
  ).then(stripXmlLikeTags), force)
}

export function translateSentence(
  apiKey: string,
  sentence: string,
  targetLanguage: string,
  keyword?: string,
): Promise<string> {
  const cleanedKeyword = keyword?.trim() || ''
  const key = `translate:${sentence}:${targetLanguage}:${cleanedKeyword}`
  return cached(key, () => callTextModel(
    apiKey,
    'translate_sentence',
    translateSentencePrompt(sentence, cleanedKeyword),
    128,
    0,
    translateSentenceSystemPrompt(targetLanguage),
    { sentenceLength: sentence.length, keywordLength: cleanedKeyword.length },
  ).then(stripXmlLikeTags))
}

export async function splitWord(apiKey: string, word: string): Promise<Word[]> {
  const text = await callTextModel(
    apiKey,
    'split_word',
    splitWordPrompt(word),
    128,
    0,
    SPLIT_WORD_SYSTEM_PROMPT,
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
    CONVERT_WORD_TO_KANJI_SYSTEM_PROMPT,
    { sourceTextLength: transcription.length, wordLength: word.length },
  ).then(stripXmlLikeTags))
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
    generateExamplePrompt(selectedContext.text, word, previousSentence, simplify, feedback),
    1024,
    1024,
    generateExampleSystemPrompt(word, jlptLevel),
    {
      sourceTextLength: transcription.length,
      contextTextLength: selectedContext.text.length,
      contextFallback: selectedContext.usedFallback ? 1 : 0,
      contextMethodExact: selectedContext.method === 'exact' ? 1 : 0,
      contextMethodRelaxed: selectedContext.method === 'relaxed' ? 1 : 0,
      wordLength: word.length,
    },
  ).then(stripResponseTag)
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
    resolveManualVocabPrompt(cleanWord, context),
    512,
    0,
    resolveManualVocabSystemPrompt(lang),
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
    generateManualExamplePrompt(word, options, meaning, context),
    256,
    1024,
    generateManualExampleSystemPrompt(word, jlptLevel),
    { wordLength: word.length, meaningLength: meaning?.length ?? 0, contextLength: context?.length ?? 0 },
  ).then(stripResponseTag)
}
