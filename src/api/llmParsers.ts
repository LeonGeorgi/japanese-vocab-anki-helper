import type { JlptLevel, ManualVocabOption, ManualVocabResolution, Word } from '../types'
import { JLPT_LEVELS } from '../constants'

export function stripWrappingJapaneseQuotes(parts: [string, string, string]): [string, string, string] {
  const firstIndex = parts.findIndex(part => part.length > 0)
  const lastIndex = parts.findLastIndex(part => part.length > 0)
  if (firstIndex === -1 || lastIndex === -1) return parts
  if (!parts[firstIndex].startsWith('「') || !parts[lastIndex].endsWith('」')) return parts

  const next: [string, string, string] = [...parts]
  next[firstIndex] = next[firstIndex].slice(1)
  next[lastIndex] = next[lastIndex].slice(0, -1)
  return next
}

export function parseWordLines(text: string): Word[] {
  const cleaned = stripXmlLikeTags(text)
  const seen = new Set<string>()
  return cleaned
    .split('\n')
    .map(line => {
      const [word, level] = line.trim().split('|')
      return { word: word?.trim(), level: level?.trim() as JlptLevel | null }
    })
    .filter(({ word }) => word && word.length > 0 && !seen.has(word) && seen.add(word))
    .map(({ word, level }) => ({
      word,
      level: JLPT_LEVELS.includes(level as JlptLevel) ? level as JlptLevel : null,
    }))
}

export function stripXmlLikeTags(text: string): string {
  return text
    .replace(/<\/?[A-Za-z][A-Za-z0-9_-]*>/g, '')
    .trim()
}

export function stripResponseTag(text: string): string {
  const trimmed = text.trim()
  const wrapped = trimmed.match(/^<response>\s*([\s\S]*?)\s*<\/response>$/i)
  if (wrapped) return wrapped[1].trim()
  return stripXmlLikeTags(trimmed.replace(/<\/?response>/gi, ''))
}

function extractJsonObject(text: string) {
  const cleaned = stripXmlLikeTags(text)
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const candidate = fenced ?? cleaned
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  return start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate
}

function isOption(value: unknown): value is ManualVocabOption {
  if (!value || typeof value !== 'object') return false
  const option = value as Partial<ManualVocabOption>
  return typeof option.word === 'string'
    && option.word.trim().length > 0
    && typeof option.meaning === 'string'
    && option.meaning.trim().length > 0
}

export function parseManualVocabResolution(text: string, fallbackWord: string): ManualVocabResolution {
  try {
    const parsed = JSON.parse(extractJsonObject(text)) as unknown
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid resolution')
    const data = parsed as { status?: unknown; word?: unknown; meaning?: unknown; options?: unknown }

    if (data.status === 'ambiguous' && Array.isArray(data.options)) {
      const options = data.options.filter(isOption).map(option => ({
        word: option.word.trim(),
        meaning: option.meaning.trim(),
      }))
      if (options.length > 0) return { status: 'ambiguous', options }
    }

    if (data.status === 'clear' && typeof data.word === 'string' && typeof data.meaning === 'string') {
      return {
        status: 'clear',
        option: { word: data.word.trim() || fallbackWord, meaning: data.meaning.trim() },
      }
    }
  } catch {
    // Fall through to a conservative clear result.
  }

  return { status: 'clear', option: { word: fallbackWord, meaning: '' } }
}
