import type { GenerateOptions, JlptLevel, Word } from '../types'
import {
  OCR_SYSTEM_PROMPT,
  OCR_USER_PROMPT,
  annotateSentencePrompt,
  convertWordToKanjiPrompt,
  defineWordPrompt,
  extractWordsPrompt,
  furiganaPrompt,
  generateExamplePrompt,
  splitWordPrompt,
  translateSentencePrompt,
} from './claudePrompts'
import { parseWordLines, stripWrappingJapaneseQuotes } from './claudeParsers'

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

function buildHeaders(apiKey: string) {
  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
    'anthropic-dangerous-direct-browser-access': 'true',
  }
}

async function parseResponse(response: Response): Promise<string> {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ?? `API error ${response.status}`
    )
  }
  const data = await response.json() as { content: Array<{ type: string; text: string }> }
  return data.content.find(b => b.type === 'text')?.text ?? ''
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

async function callHaiku(apiKey: string, prompt: string, maxTokens: number, thinkingTokens: number = 0): Promise<string> {
  const response = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      //model: 'claude-haiku-4-5-20251001',
      model: 'claude-sonnet-4-6',
      max_tokens: thinkingTokens + maxTokens,
      thinking: thinkingTokens > 0 ? {
        type: "enabled",
        budget_tokens: thinkingTokens,
      } : undefined,
      messages: [{ role: 'user', content: prompt }],
    })
  })
  return parseResponse(response)
}

export async function transcribeImage(
  apiKey: string,
  base64: string,
  mimeType: string
): Promise<string> {
  const response = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: OCR_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
            {
              type: 'text',
              text: OCR_USER_PROMPT,
            },
          ],
        }
      ],
    }),
  })
  return parseResponse(response)
}

export async function extractWords(
  apiKey: string,
  transcription: string,
): Promise<Word[]> {
  const text = await callHaiku(apiKey,
    extractWordsPrompt(transcription),
    1024, 2048)

  return parseWordLines(text)
}

export async function annotateSentence(
  apiKey: string,
  sentence: string,
  word: string,
  force = false,
): Promise<[string, string, string]> {
  const key = `annotate:${sentence}:${word}`
  const raw = await cached(key, () => callHaiku(
    apiKey,
    annotateSentencePrompt(sentence, word),
    512, 1024,
  ), force)
  const answerLine = raw.trim().split('\n').filter(l => l.includes('|')).pop() ?? ''
  const [before = '', wordPart = word, after = ''] = answerLine.split('|')
  return stripWrappingJapaneseQuotes([before, wordPart, after])
}

export function addFurigana(apiKey: string, text: string, force = false): Promise<string> {
  return cached(`furigana:${text}`, () => callHaiku(
    apiKey,
    furiganaPrompt(text),
    256,
  ), force)
}

export function defineWord(
  apiKey: string,
  word: string,
  targetLanguage: string,
  force = false,
): Promise<string> {
  const lang = targetLanguage || 'English'
  return cached(`define:${word}:${lang}`, () => callHaiku(
    apiKey,
    defineWordPrompt(word, lang),
    64,
  ), force)
}

export function translateSentence(
  apiKey: string,
  sentence: string,
  targetLanguage: string,
): Promise<string> {
  const key = `translate:${sentence}:${targetLanguage}`
  return cached(key, () => callHaiku(
    apiKey,
    translateSentencePrompt(sentence, targetLanguage),
    128,
  ))
}

export async function splitWord(apiKey: string, word: string): Promise<Word[]> {
  const text = await callHaiku(
    apiKey,
    splitWordPrompt(word),
    128,
  )
  return parseWordLines(text)
}

export async function convertWordToKanji(
  apiKey: string,
  transcription: string,
  word: string,
): Promise<string> {
  const text = await cached(`kanji:${transcription}:${word}`, () => callHaiku(
    apiKey,
    convertWordToKanjiPrompt(transcription, word),
    64,
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
  return callHaiku(
    apiKey,
    generateExamplePrompt(transcription, word, jlptLevel, previousSentence, simplify, feedback),
    256,
    1024,
  )
}
