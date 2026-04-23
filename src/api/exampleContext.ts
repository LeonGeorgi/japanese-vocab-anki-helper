interface SelectedContext {
  text: string
  usedFallback: boolean
  method: 'exact' | 'relaxed' | 'fallback'
}

const MAX_CONTEXT_LENGTH = 700

function splitSentenceUnits(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, '\n')
  const pieces = normalized.split(/(?<=[。！？!?])|\n+/u)
  return pieces.map(piece => piece.trim()).filter(Boolean)
}

function normalizeLookup(text: string): string {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/\s+/g, '')
    .replace(/[「」『』（）()［］【】〈〉《》・、。,，．。：:！!？?'"`~-]/gu, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function buildAnchors(word: string): string[] {
  const normalizedWord = normalizeLookup(word)
  const anchors = [normalizedWord]

  const suffixes = ['する', 'くる', 'る', 'う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む', 'い', 'だ', 'な']
  for (const suffix of suffixes) {
    if (normalizedWord.endsWith(suffix) && normalizedWord.length - suffix.length >= 2) {
      anchors.push(normalizedWord.slice(0, -suffix.length))
    }
  }

  const kanjiRuns = word.match(/[\p{Script=Han}々〆ヶ]+/gu) ?? []
  for (const run of kanjiRuns) {
    const normalizedRun = normalizeLookup(run)
    if (normalizedRun.length >= 1) anchors.push(normalizedRun)
  }

  return unique(anchors).filter(anchor => anchor.length >= 2 || /[\p{Script=Han}]/u.test(anchor))
}

function buildContextFromUnits(units: string[], centerIndex: number): string {
  const parts = [
    units[centerIndex - 1],
    units[centerIndex],
    units[centerIndex + 1],
  ].filter(Boolean)
  const joined = parts.join('\n')
  if (joined.length <= MAX_CONTEXT_LENGTH) return joined

  const center = units[centerIndex] ?? ''
  if (center.length >= MAX_CONTEXT_LENGTH) return center.slice(0, MAX_CONTEXT_LENGTH)
  return joined.slice(0, MAX_CONTEXT_LENGTH)
}

export function selectExampleContext(transcription: string, word: string): SelectedContext {
  const cleanText = transcription.trim()
  const cleanWord = word.trim()
  if (!cleanText || !cleanWord) return { text: cleanText, usedFallback: true, method: 'fallback' }

  const units = splitSentenceUnits(cleanText)
  if (units.length === 0) return { text: cleanText, usedFallback: true, method: 'fallback' }

  const exactMatches = units
    .map((unit, index) => ({ index, unit }))
    .filter(({ unit }) => unit.includes(cleanWord))

  if (exactMatches.length === 1) {
    return {
      text: buildContextFromUnits(units, exactMatches[0].index),
      usedFallback: false,
      method: 'exact',
    }
  }
  if (exactMatches.length > 1) {
    return { text: cleanText, usedFallback: true, method: 'fallback' }
  }

  const anchors = buildAnchors(cleanWord)
  if (anchors.length === 0) return { text: cleanText, usedFallback: true, method: 'fallback' }

  const relaxedMatches = units
    .map((unit, index) => ({ index, normalized: normalizeLookup(unit) }))
    .filter(({ normalized }) => anchors.some(anchor => normalized.includes(anchor)))

  if (relaxedMatches.length === 1) {
    return {
      text: buildContextFromUnits(units, relaxedMatches[0].index),
      usedFallback: false,
      method: 'relaxed',
    }
  }

  return { text: cleanText, usedFallback: true, method: 'fallback' }
}
