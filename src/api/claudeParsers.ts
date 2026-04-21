import type { JlptLevel, Word } from '../types'
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
  const seen = new Set<string>()
  return text
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
