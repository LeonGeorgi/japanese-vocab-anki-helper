import { describe, expect, it } from 'vitest'
import { buildTrainingPromptQueue, type TrainingCandidate } from '../src/api/training'
import { generateTrainingPromptPrompt, reviewTrainingAnswerPrompt } from '../src/api/llmPrompts'
import type { TrainingPrompt } from '../src/types'

describe('training prompt queue', () => {
  it('mixes single and multi-vocab prompts while leaving later prompts ungenerated', () => {
    const candidates: TrainingCandidate[] = [
      { noteId: 1, word: '増える', definition: 'increase' },
      { noteId: 2, word: '習慣', definition: 'habit' },
      { noteId: 3, word: '続ける', definition: 'continue' },
      { noteId: 4, word: '準備', definition: 'preparation' },
      { noteId: 5, word: '確かめる', definition: 'check' },
      { noteId: 6, word: '工夫', definition: 'device' },
      { noteId: 7, word: '間に合う', definition: 'make it in time' },
    ]

    const prompts = buildTrainingPromptQueue(candidates, 4)

    expect(prompts).toHaveLength(4)
    expect(prompts.map(prompt => prompt.words.length)).toEqual([1, 2, 1, 3])
    expect(prompts.every(prompt => prompt.promptTranslation === '' && prompt.referenceSentence === '')).toBe(true)
    expect(prompts.flatMap(prompt => prompt.words)).toEqual([
      '増える',
      '習慣',
      '続ける',
      '準備',
      '確かめる',
      '工夫',
      '間に合う',
    ])
  })

  it('includes all required vocabulary when building generation and review prompts', () => {
    const prompt: TrainingPrompt = {
      id: 'prompt_1',
      noteIds: [1, 2],
      words: ['増える', '習慣'],
      definitions: ['increase', 'habit'],
      promptTranslation: '',
      referenceSentence: '',
    }

    const generationPrompt = generateTrainingPromptPrompt(prompt)
    const reviewPrompt = reviewTrainingAnswerPrompt(
      'English',
      'As the number of customers increased, studying every day became a habit.',
      prompt.words,
      prompt.definitions,
      '客が増えたので、毎日勉強する習慣がついた。',
      '客が増えたので、毎日勉強する習慣になった。',
    )

    expect(generationPrompt).toContain('<word>増える</word>')
    expect(generationPrompt).toContain('<word>習慣</word>')
    expect(generationPrompt).toContain('<meaning>increase</meaning>')
    expect(generationPrompt).toContain('<meaning>habit</meaning>')
    expect(reviewPrompt).toContain('"word":"増える"')
    expect(reviewPrompt).toContain('"word":"習慣"')
    expect(reviewPrompt).toContain('"meaning":"increase"')
    expect(reviewPrompt).toContain('"meaning":"habit"')
  })
})
