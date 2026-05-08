import { expect, test } from 'vitest'
import {
  easyWordFilterLabel,
  hiddenJlptLevelsForFilter,
  normalizeEasyWordFilterLevel,
} from '../src/constants'

test('hiddenJlptLevelsForFilter returns the expected JLPT slices', () => {
  expect(hiddenJlptLevelsForFilter(0)).toEqual([])
  expect(hiddenJlptLevelsForFilter(1)).toEqual(['N5'])
  expect(hiddenJlptLevelsForFilter(2)).toEqual(['N5', 'N4'])
  expect(hiddenJlptLevelsForFilter(3)).toEqual(['N5', 'N4', 'N3'])
  expect(hiddenJlptLevelsForFilter(4)).toEqual(['N5', 'N4', 'N3', 'N2'])
})

test('easyWordFilterLabel summarizes the active slider state', () => {
  expect(easyWordFilterLabel(0)).toBe('Hide nothing')
  expect(easyWordFilterLabel(1)).toBe('Hide N5')
  expect(easyWordFilterLabel(4)).toBe('Hide N2 + N3 + N4 + N5')
})

test('normalizeEasyWordFilterLevel migrates legacy and out-of-range values', () => {
  expect(normalizeEasyWordFilterLevel(false)).toBe(0)
  expect(normalizeEasyWordFilterLevel(true)).toBe(1)
  expect(normalizeEasyWordFilterLevel(-2)).toBe(0)
  expect(normalizeEasyWordFilterLevel(3)).toBe(3)
  expect(normalizeEasyWordFilterLevel(99)).toBe(4)
})
