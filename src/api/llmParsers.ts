import type { DraftingFeedback, JlptLevel, ManualVocabOption, ManualVocabResolution, TrainingEvaluation, Word } from '../types'
import type { DraftingAnchorAnnotation } from './draftingFeedback'
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

function clampScore(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return 3
  return Math.max(1, Math.min(5, Math.round(numeric)))
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

export function parseTrainingEvaluation(text: string): TrainingEvaluation {
  try {
    const parsed = JSON.parse(extractJsonObject(text)) as unknown
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid evaluation')
    const data = parsed as {
      scores?: Record<string, unknown>
      summary?: unknown
      strengths?: unknown
      improvements?: unknown
      betterAnswer?: unknown
    }

    const strengths = Array.isArray(data.strengths)
      ? data.strengths.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 3)
      : []
    const improvements = Array.isArray(data.improvements)
      ? data.improvements.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 3)
      : []

    return {
      scores: {
        accuracy: clampScore(data.scores?.accuracy),
        grammar: clampScore(data.scores?.grammar),
        naturalness: clampScore(data.scores?.naturalness),
        targetWordUse: clampScore(data.scores?.targetWordUse),
        overall: clampScore(data.scores?.overall),
      },
      summary: typeof data.summary === 'string' && data.summary.trim() ? data.summary.trim() : 'Reasonable attempt.',
      strengths,
      improvements,
      betterAnswer: typeof data.betterAnswer === 'string' && data.betterAnswer.trim()
        ? data.betterAnswer.trim()
        : '',
    }
  } catch {
    return {
      scores: {
        accuracy: 3,
        grammar: 3,
        naturalness: 3,
        targetWordUse: 3,
        overall: 3,
      },
      summary: 'Evaluation could not be parsed cleanly.',
      strengths: [],
      improvements: ['Try again for a clearer AI evaluation.'],
      betterAnswer: '',
    }
  }
}

function clampNonNegativeInteger(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(numeric) || numeric < 0) return null
  return numeric
}

function sanitizeDraftingAnnotations(value: unknown): DraftingAnchorAnnotation[] {
  if (!Array.isArray(value)) return []

  const parsed: DraftingAnchorAnnotation[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const annotation = item as Record<string, unknown>
    const occurrence = clampNonNegativeInteger(annotation.occurrence)
    const sentenceIndex = clampNonNegativeInteger(annotation.sentenceIndex)
    const severity = annotation.severity
    const quote = typeof annotation.quote === 'string' ? annotation.quote : ''
    const reason = typeof annotation.reason === 'string' ? annotation.reason.trim() : ''
    const suggestion = typeof annotation.suggestion === 'string' ? annotation.suggestion.trim() : ''

    if (!quote) continue
    if (occurrence === null || occurrence <= 0) continue
    if (sentenceIndex === null) continue
    if (severity !== 'warning' && severity !== 'error') continue
    if (!reason) continue

    parsed.push({
      severity,
      quote,
      occurrence,
      sentenceIndex,
      reason,
      suggestion,
    })
  }

  return parsed
}

export function parseDraftingFeedback(text: string): (Omit<DraftingFeedback, 'annotations'> & { annotations: DraftingAnchorAnnotation[] }) | null {
  try {
    const parsed = JSON.parse(extractJsonObject(text)) as unknown
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid drafting feedback')
    const data = parsed as {
      summary?: unknown
      strengths?: unknown
      improvements?: unknown
      annotations?: unknown
    }

    const summary = typeof data.summary === 'string' && data.summary.trim()
      ? data.summary.trim()
      : 'Feedback generated.'

    const strengths = Array.isArray(data.strengths)
      ? data.strengths.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 5)
      : []

    const improvements = Array.isArray(data.improvements)
      ? data.improvements.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 5)
      : []

    return {
      summary,
      strengths,
      improvements,
      annotations: sanitizeDraftingAnnotations(data.annotations),
    }
  } catch {
    return null
  }
}

export function parseDraftingRepairChoice(text: string): number | null {
  try {
    const parsed = JSON.parse(extractJsonObject(text)) as unknown
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid repair choice')
    const occurrence = clampNonNegativeInteger((parsed as { occurrence?: unknown }).occurrence)
    if (occurrence === null || occurrence <= 0) return null
    return occurrence
  } catch {
    return null
  }
}
