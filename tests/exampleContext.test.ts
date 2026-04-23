import { describe, expect, it } from 'vitest'
import { selectExampleContext } from '../src/api/exampleContext'

describe('selectExampleContext', () => {
  it('selects neighboring context for a unique exact sentence match', () => {
    const text = '今日は雨です。駅で本を読む。明日は晴れる。'
    const result = selectExampleContext(text, '読む')

    expect(result.usedFallback).toBe(false)
    expect(result.method).toBe('exact')
    expect(result.text).toContain('駅で本を読む。')
    expect(result.text).toContain('今日は雨です。')
    expect(result.text).toContain('明日は晴れる。')
  })

  it('falls back when exact matching is ambiguous', () => {
    const text = '本を読む。新聞を読む。'
    const result = selectExampleContext(text, '読む')

    expect(result.usedFallback).toBe(true)
    expect(result.method).toBe('fallback')
    expect(result.text).toBe(text)
  })

  it('uses relaxed matching when a unique stem-like anchor is found', () => {
    const text = '猫が走っている。犬は寝ている。'
    const result = selectExampleContext(text, '走る')

    expect(result.usedFallback).toBe(false)
    expect(result.method).toBe('relaxed')
    expect(result.text).toContain('猫が走っている。')
  })

  it('falls back when relaxed matching is also ambiguous', () => {
    const text = '彼は食べた。私は食べている。'
    const result = selectExampleContext(text, '食べる')

    expect(result.usedFallback).toBe(true)
    expect(result.method).toBe('fallback')
    expect(result.text).toBe(text)
  })
})
