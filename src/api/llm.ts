import { getDefaultStore } from 'jotai'
import type { DraftingFeedback, GenerateOptions, JlptLevel, ManualVocabResolution, TrainingEvaluation, TrainingPrompt, Word } from '../types'
import { createLlmClient, type LlmFeature, type LlmModelInfo } from '../llm'
import { llmProviderAtom, llmTextModelAtom, llmVisionModelAtom } from '../state/settingsAtoms'
import {
  repairDraftingAnnotationPrompt,
  repairDraftingAnnotationSystemPrompt,
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
  generateTrainingPromptPrompt,
  generateTrainingPromptSystemPrompt,
  resolveManualVocabSystemPrompt,
  resolveManualVocabPrompt,
  reviewTrainingAnswerPrompt,
  reviewTrainingAnswerSystemPrompt,
  reviewDraftingTextPrompt,
  reviewDraftingTextSystemPrompt,
  splitWordPrompt,
  translateSentenceSystemPrompt,
  translateSentencePrompt,
} from './llmPrompts'
import { parseDraftingFeedback, parseDraftingRepairChoice, parseManualVocabResolution, parseTrainingEvaluation, parseWordLines, stripResponseTag, stripWrappingJapaneseQuotes, stripXmlLikeTags } from './llmParsers'
import { resolveDraftingAnnotations, sentenceTableForPrompt, type DraftingAnchorAnnotation, type DraftingAnchorResolutionIssue } from './draftingFeedback'
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
  system?: string,
  context?: Record<string, number>,
): Promise<string> {
  const { client, textModel } = resolveLlmRuntime(apiKey)
  return client.completeText({
    model: textModel,
    feature,
    prompt,
    maxTokens,
    thinkingTokens,
    system,
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

export function generateTrainingPrompt(
  apiKey: string,
  jlptLevel: JlptLevel,
  prompt: TrainingPrompt,
): Promise<string> {
  return callTextModel(
    apiKey,
    'generate_training_prompt',
    generateTrainingPromptPrompt(prompt),
    256,
    1024,
    generateTrainingPromptSystemPrompt(prompt.words, jlptLevel),
    {
      targetCount: prompt.words.length,
      totalWordLength: prompt.words.reduce((sum, word) => sum + word.length, 0),
      totalMeaningLength: prompt.definitions.reduce((sum, meaning) => sum + meaning.length, 0),
    },
  ).then(stripResponseTag)
}

export async function reviewTrainingAnswer(
  apiKey: string,
  nativeLanguage: string,
  promptTranslation: string,
  words: string[],
  definitions: string[],
  referenceSentence: string,
  learnerAnswer: string,
): Promise<TrainingEvaluation> {
  const lang = nativeLanguage || 'English'
  const raw = await callTextModel(
    apiKey,
    'review_training_answer',
    reviewTrainingAnswerPrompt(lang, promptTranslation, words, definitions, referenceSentence, learnerAnswer),
    512,
    1024,
    reviewTrainingAnswerSystemPrompt(lang),
    {
      promptLength: promptTranslation.length,
      targetCount: words.length,
      totalWordLength: words.reduce((sum, word) => sum + word.length, 0),
      referenceLength: referenceSentence.length,
      answerLength: learnerAnswer.length,
    },
  )
  return parseTrainingEvaluation(raw)
}

export async function reviewDraftingText(
  apiKey: string,
  nativeLanguage: string,
  jlptLevel: JlptLevel,
  purposeText: string,
  draftText: string,
): Promise<DraftingFeedback> {
  const lang = nativeLanguage || 'English'
  const sentences = sentenceTableForPrompt(draftText)
  const raw = await requestDraftingFeedbackRaw(apiKey, lang, jlptLevel, purposeText, draftText, sentences)
  const parsed = parseDraftingFeedback(raw)
  if (!parsed) throw new Error('Drafting feedback could not be parsed cleanly. The AI response was likely truncated. Please try again.')

  let resolution = resolveDraftingAnnotations(draftText, parsed.annotations)
  if (resolution.unresolved.length > 0) {
    const repaired = await Promise.all(
      resolution.unresolved.map(issue => repairDraftingAnnotation(apiKey, issue)),
    )
    const repairable = repaired.filter((value): value is { original: DraftingAnchorAnnotation; repaired: DraftingAnchorAnnotation } => value !== null)
    if (repairable.length > 0) {
      const repairedByKey = new Map(
        repairable.map(item => [draftingAnchorKey(item.original), item.repaired]),
      )
      const nextAnchors = parsed.annotations.map(annotation =>
        repairedByKey.get(draftingAnchorKey(annotation)) ?? annotation,
      )
      resolution = resolveDraftingAnnotations(draftText, nextAnchors)
    }
  }

  return {
    summary: parsed.summary,
    strengths: parsed.strengths,
    improvements: parsed.improvements,
    annotations: resolution.annotations,
  }
}

async function requestDraftingFeedbackRaw(
  apiKey: string,
  nativeLanguage: string,
  jlptLevel: JlptLevel,
  purposeText: string,
  draftText: string,
  sentences: Array<{ sentenceIndex: number; text: string }>,
) {
  const { maxTokens, thinkingTokens } = draftingFeedbackBudget(draftText, purposeText, sentences.length)

  return callTextModel(
    apiKey,
    'review_drafting_text',
    reviewDraftingTextPrompt(nativeLanguage, jlptLevel, purposeText, draftText, sentences),
    maxTokens,
    thinkingTokens,
    reviewDraftingTextSystemPrompt(nativeLanguage, jlptLevel),
    {
      draftLength: draftText.length,
      purposeLength: purposeText.length,
      sentenceCount: sentences.length,
      draftingMaxTokens: maxTokens,
      draftingThinkingTokens: thinkingTokens,
    },
  )
}

function draftingFeedbackBudget(
  draftText: string,
  purposeText: string,
  sentenceCount: number,
) {
  const totalLength = draftText.length + purposeText.length

  const maxTokens = Math.min(
    7000,
    Math.max(
      4200,
      3200
        + Math.ceil(totalLength * 0.75)
        + sentenceCount * 40,
    ),
  )

  const thinkingTokens = Math.min(
    1536,
    Math.max(
      512,
      512 + Math.ceil(totalLength * 0.12),
    ),
  )

  return { maxTokens, thinkingTokens }
}

async function repairDraftingAnnotation(
  apiKey: string,
  issue: DraftingAnchorResolutionIssue,
) {
  if (!issue.sentence || issue.candidates.length === 0) return null

  const raw = await callTextModel(
    apiKey,
    'review_drafting_text',
    repairDraftingAnnotationPrompt(issue),
    64,
    0,
    repairDraftingAnnotationSystemPrompt(),
    {
      sentenceLength: issue.sentence.text.length,
      candidateCount: issue.candidates.length,
      quoteLength: issue.annotation.quote.length,
    },
  )

  const occurrence = parseDraftingRepairChoice(raw)
  if (!occurrence || !issue.candidates.some(candidate => candidate.occurrence === occurrence)) return null

  return {
    original: issue.annotation,
    repaired: {
      ...issue.annotation,
      occurrence,
    },
  }
}

function draftingAnchorKey(annotation: DraftingAnchorAnnotation) {
  return [
    annotation.severity,
    annotation.quote,
    annotation.occurrence,
    annotation.sentenceIndex,
    annotation.reason,
    annotation.suggestion,
  ].join('::')
}
