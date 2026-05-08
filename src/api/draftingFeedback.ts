import type { DraftingAnnotation, DraftingAnnotationSeverity } from '../types'

export interface DraftingSentence {
  index: number
  text: string
  startOffset: number
  endOffset: number
}

export interface DraftingAnchorAnnotation {
  severity: DraftingAnnotationSeverity
  reason: string
  suggestion: string
  quote: string
  occurrence: number
  sentenceIndex: number
}

export interface DraftingPreviewSegment {
  text: string
  annotation: DraftingAnnotation | null
}

export interface DraftingAnchorResolutionIssue {
  annotation: DraftingAnchorAnnotation
  sentence: DraftingSentence | null
  candidates: Array<{ occurrence: number; startOffset: number; endOffset: number; text: string }>
}

export interface ResolvedDraftingAnnotations {
  annotations: DraftingAnnotation[]
  unresolved: DraftingAnchorResolutionIssue[]
}

const sentenceBoundary = /[。！？!?]/u

function pushSentence(sentences: DraftingSentence[], text: string, startOffset: number, endOffset: number) {
  if (!text) return
  sentences.push({
    index: sentences.length,
    text,
    startOffset,
    endOffset,
  })
}

export function segmentDraftingSentences(text: string): DraftingSentence[] {
  if (!text) return []

  const sentences: DraftingSentence[] = []
  let start = 0
  let buffer = ''

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (char === '\r') continue

    buffer += char

    if (char === '\n') {
      pushSentence(sentences, buffer, start, index + 1)
      start = index + 1
      buffer = ''
      continue
    }

    if (sentenceBoundary.test(char)) {
      const next = text[index + 1] ?? ''
      if (next !== '\n') {
        pushSentence(sentences, buffer, start, index + 1)
        start = index + 1
        buffer = ''
      }
    }
  }

  pushSentence(sentences, buffer, start, text.length)
  return sentences
}

export function sentenceTableForPrompt(text: string): Array<{ sentenceIndex: number; text: string }> {
  return segmentDraftingSentences(text).map(sentence => ({
    sentenceIndex: sentence.index,
    text: sentence.text,
  }))
}

function findQuoteMatches(sentence: DraftingSentence, quote: string) {
  const matches: Array<{ occurrence: number; startOffset: number; endOffset: number; text: string }> = []
  if (!quote) return matches

  let occurrence = 1
  let searchStart = 0
  while (searchStart <= sentence.text.length) {
    const localIndex = sentence.text.indexOf(quote, searchStart)
    if (localIndex === -1) break
    matches.push({
      occurrence,
      startOffset: sentence.startOffset + localIndex,
      endOffset: sentence.startOffset + localIndex + quote.length,
      text: quote,
    })
    occurrence += 1
    searchStart = localIndex + Math.max(1, quote.length)
  }

  return matches
}

export function resolveDraftingAnnotations(
  sourceText: string,
  anchors: DraftingAnchorAnnotation[],
): ResolvedDraftingAnnotations {
  const sentences = segmentDraftingSentences(sourceText)
  const parsed: DraftingAnnotation[] = []
  const unresolved: DraftingAnchorResolutionIssue[] = []

  for (const anchor of anchors) {
    const sentence = sentences[anchor.sentenceIndex] ?? null
    if (!sentence) {
      unresolved.push({ annotation: anchor, sentence: null, candidates: [] })
      continue
    }

    const candidates = findQuoteMatches(sentence, anchor.quote)
    const match = candidates.find(candidate => candidate.occurrence === anchor.occurrence)
    if (!match) {
      unresolved.push({ annotation: anchor, sentence, candidates })
      continue
    }

    parsed.push({
      ...anchor,
      startOffset: match.startOffset,
      endOffset: match.endOffset,
    })
  }

  parsed.sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset)

  const annotations: DraftingAnnotation[] = []
  for (const annotation of parsed) {
    const previous = annotations[annotations.length - 1]
    if (previous && annotation.startOffset < previous.endOffset) continue
    if (annotation.startOffset < 0 || annotation.endOffset > sourceText.length || annotation.startOffset >= annotation.endOffset) continue
    annotations.push(annotation)
  }

  return { annotations, unresolved }
}

export function buildDraftingPreviewSegments(
  sourceText: string,
  annotations: DraftingAnnotation[],
): DraftingPreviewSegment[] {
  if (!sourceText) return []

  const segments: DraftingPreviewSegment[] = []
  let cursor = 0

  for (const annotation of annotations) {
    if (annotation.startOffset > cursor) {
      segments.push({
        text: sourceText.slice(cursor, annotation.startOffset),
        annotation: null,
      })
    }

    segments.push({
      text: sourceText.slice(annotation.startOffset, annotation.endOffset),
      annotation,
    })
    cursor = annotation.endOffset
  }

  if (cursor < sourceText.length) {
    segments.push({
      text: sourceText.slice(cursor),
      annotation: null,
    })
  }

  return segments.filter(segment => segment.text.length > 0)
}
