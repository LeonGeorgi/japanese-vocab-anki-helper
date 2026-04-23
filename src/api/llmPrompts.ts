import type { JlptLevel } from '../types'
import type { GenerateOptions } from '../types'
import { VOCAB_CEILING } from '../constants'

export const OCR_SYSTEM_PROMPT = 'You are a highly precise Japanese OCR data extraction tool. Your ONLY task is to extract exact Japanese characters from images. You output strictly the raw, original text. You never translate, never summarize, and never include conversational filler.'

export const OCR_USER_PROMPT = 'Extract and transcribe all Japanese text visible in this image exactly as it appears. Maintain the original structure.'

export function extractWordsPrompt(transcription: string) {
  return `Extract vocabulary words worth studying from the following Japanese text.

Text:
"""
${transcription}
"""

Rules:
- Split text on grammatical particles (は、が、を、に、で、と、も、の、へ、から、まで、より、など、か、ね、よ、な、さ、って、じゃ、や). Exclude the particles themselves.
- Keep kanji compound words intact — never split a compound into individual kanji (e.g. 勉強、日本語、東京 each stay as one entry).
- Return only content words (nouns, verbs in dictionary form, i-adjectives in plain form, na-adjectives, adverbs). Exclude pronouns, copulas, and auxiliary verbs.
- Skip only the most universally trivial words that every learner knows from day one (e.g. 私、これ、それ、あれ、です、ます、ある、いる、する、来る、行く、見る、言う、人、日本、今、年). Include everything else, even if it seems basic.
- Remove duplicates.
- For each word, estimate its JLPT level (N5, N4, N3, N2, N1). If unsure or not applicable, write "unknown".
- Return one entry per line in this exact format: word|LEVEL
- Example lines: 勉強する|N5  /  醸造|N1  /  hello|unknown
- No numbering, no explanations, nothing else.`
}

export function annotateSentencePrompt(sentence: string, word: string) {
  return `Annotate a Japanese sentence for an Anki flashcard. The target word is given in dictionary form but may appear conjugated or inflected in the sentence.

Sentence: 「${sentence}」
Dictionary-form word: 「${word}」

Steps:
1. Locate the word in the sentence in its conjugated/inflected form.
2. Split the sentence into three parts using the exact text as it appears — do NOT convert anything to dictionary form:
   - BEFORE: everything before the word's occurrence
   - WORD: the word as it appears in the sentence (conjugated form, not dictionary form)
   - AFTER: everything after the word's occurrence
3. Add Anki-style furigana to all three parts:
   - Reading covers only kanji, never kana okurigana: ✓ 食[た]べる  ✗ 食べる[たべる]
   - Insert a space before a kanji group when it is directly preceded by kana: ✓ 世[よ]の 中[なか]

Examples (sentence → single output line, pipe-separated):
「新しい野菜が出廻っている。」/ 出廻る →
新[あたら]しい 野菜[やさい]が|出廻[でまわ]って|いる。

「彼女は毎日日本語を勉強している。」/ 勉強する →
彼女[かのじょ]は 毎日[まいにち] 日本語[にほんご]を|勉強[べんきょう]して|いる。

「美味しかったので全部食べた。」/ 美味しい →
|美味[おい]しかった|ので 全部[ぜんぶ] 食[た]べた。

「毎朝牛乳を飲む習慣がある。」/ 飲む →
毎朝[まいあさ] 牛乳[ぎゅうにゅう]を|飲[の]む|習慣[しゅうかん]がある。

Return exactly one line in the format: BEFORE|WORD|AFTER
Use an empty string for missing parts, but always include both pipe characters.`
}

export function furiganaPrompt(text: string) {
  return `Add Anki-style furigana to all kanji in the following Japanese text.

Rules:
1. Format: 漢字[かんじ] — the reading covers only the kanji, never kana okurigana.
   ✓ 食[た]べる  ✓ 勉強[べんきょう]する
   ✗ 食べる[たべる]  ✗ 勉強する[べんきょうする]

2. Spacing: if a kanji[reading] group is directly preceded by kana characters, insert a space before that kanji. Without it, Anki misattributes the ruby to the preceding kana.
   ✓ 世[よ]の 中[なか]   (space before 中 because の precedes it)
   ✗ 世[よ]の中[なか]    (wrong — Anki applies なか to の中)

3. Leave pure kana words unchanged.

Return only the annotated text, nothing else.

Text: ${text}`
}

export function defineWordPrompt(word: string, lang: string) {
  return `Give a brief ${lang} translation or definition of the Japanese word「${word}」. Return only the translation/definition, nothing else. Keep it concise (under 10 words).`
}

export function translateSentencePrompt(sentence: string, targetLanguage: string) {
  return `Translate the following Japanese sentence into ${targetLanguage}. Return only the translation, nothing else.\n\n${sentence}`
}

export function splitWordPrompt(word: string) {
  return `Split the Japanese compound word 「${word}」 into its individual component words.
For each component, estimate its JLPT level (N5, N4, N3, N2, N1, or unknown).
Return one component per line in the format: word|LEVEL
Example output for 内科部長:
内科|N1
部長|N3

Return only the components, nothing else.`
}

export function convertWordToKanjiPrompt(transcription: string, word: string) {
  return `Convert the Japanese vocabulary item 「${word}」 to its most common kanji spelling when that is the normal way to write this word.

Use the source context to resolve the intended word and meaning:
"""
${transcription}
"""

Rules:
- Preserve the same dictionary form, part of speech, and meaning.
- If the word is already in its common kanji spelling, return it unchanged.
- If the word is usually written in kana, has no standard kanji spelling, or is ambiguous from context, return it unchanged.
- Return only the vocabulary item, with no explanation, quotes, spaces, or punctuation.`
}

export function generateExamplePrompt(
  transcription: string,
  word: string,
  jlptLevel: JlptLevel,
  previousSentence?: string,
  simplify?: boolean,
  feedback?: string,
) {
  const vocabConstraint = simplify
    ? 'only N5 vocabulary (the most basic, common words possible)'
    : `only ${VOCAB_CEILING[jlptLevel]}`

  const previousBlock = previousSentence
    ? `Previous attempt: 「${previousSentence}」\n`
    : ''

  const revisionInstruction = feedback
    ? `The learner's feedback on the previous sentence: "${feedback}"\nRevise the sentence to address this feedback.`
    : simplify
      ? 'The previous sentence was too difficult. Generate a simpler version.'
      : 'Generate a fresh example.'

  return `The following text shows how「${word}」is used in context:
"""
${transcription}
"""

Using that context, identify the exact meaning and grammatical role of「${word}」. Then write ONE short Japanese sentence that uses「${word}」with that same meaning and grammatical role.

${previousBlock}${revisionInstruction}

The sentence must:
- Be about a different topic (not related to the source text above).
- Use ${vocabConstraint} for every word except「${word}」itself. Do not use any difficult or uncommon vocabulary.
- Be 8–18 Japanese characters long. Short and punchy, suitable for an Anki i+1 card front.
- If the word is usually written in kanji, include it in kanji form.

Return only the Japanese sentence, nothing else.`
}

export function resolveManualVocabPrompt(word: string, targetLanguage: string, context?: string) {
  const contextBlock = context?.trim()
    ? `\nOptional learner-provided context:\n"""\n${context.trim()}\n"""\n`
    : ''

  return `A Japanese learner heard or remembered the vocabulary item「${word}」.
${contextBlock}
The context may be empty. Use it only if it helps identify the intended word or meaning.

Decide whether this vocabulary item is clear enough to generate a useful study sentence.

Rules:
- In most cases, treat the word as clear. Do not ask for clarification just because a word has several dictionary senses.
- Only mark it ambiguous when there are genuinely different common Japanese words/readings/meanings that fit the same written or heard form and choosing one would likely produce the wrong card.
- If clear, return the most useful dictionary-form vocabulary item and a short ${targetLanguage} meaning.
- If ambiguous, return 2-5 likely options, each with the vocabulary item and a short ${targetLanguage} meaning.

Return JSON only, with one of these shapes:
{"status":"clear","word":"...","meaning":"..."}
{"status":"ambiguous","options":[{"word":"...","meaning":"..."},{"word":"...","meaning":"..."}]}`
}

export function generateManualExamplePrompt(
  word: string,
  jlptLevel: JlptLevel,
  options: GenerateOptions = {},
  meaning?: string,
  context?: string,
) {
  const { previousSentence, simplify, feedback } = options

  const vocabConstraint = simplify
    ? 'only N5 vocabulary (the most basic, common words possible)'
    : `only ${VOCAB_CEILING[jlptLevel]}`

  const meaningBlock = meaning
    ? `Intended meaning: ${meaning}\n`
    : ''

  const contextBlock = context?.trim()
    ? `Learner-provided context: ${context.trim()}\n`
    : ''

  const previousBlock = previousSentence
    ? `Previous attempt: 「${previousSentence}」\n`
    : ''

  const revisionInstruction = feedback
    ? `The learner's feedback on the previous sentence: "${feedback}"\nRevise the sentence to address this feedback.`
    : simplify
      ? 'The previous sentence was too difficult. Generate a simpler version.'
      : 'Generate a fresh example.'

  return `Write ONE short Japanese example sentence for the vocabulary item「${word}」.

${meaningBlock}${contextBlock}${previousBlock}${revisionInstruction}

The sentence must:
- Use「${word}」with the intended meaning.
- Use ${vocabConstraint} for every word except「${word}」itself. Do not use any difficult or uncommon vocabulary.
- Be 8–18 Japanese characters long. Short and punchy, suitable for an Anki i+1 card front.
- If the word is usually written in kanji, include it in kanji form.

Return only the Japanese sentence, nothing else.`
}
