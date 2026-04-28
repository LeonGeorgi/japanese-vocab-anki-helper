import type { JlptLevel } from '../types'
import type { GenerateOptions } from '../types'
import { VOCAB_CEILING } from '../constants'

export const OCR_SYSTEM_PROMPT = 'You are a highly precise Japanese OCR data extraction tool. Your ONLY task is to extract exact Japanese characters from images. You output strictly the raw, original text. You never translate, never summarize, and never include conversational filler.'

export const OCR_USER_PROMPT = 'Extract and transcribe all Japanese text visible in this image exactly as it appears. Maintain the original structure.'

export const EXTRACT_WORDS_SYSTEM_PROMPT = `Extract vocabulary words worth studying from Japanese text.

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

export function extractWordsPrompt(transcription: string) {
  return `Text:
"""
${transcription}
"""`
}

export const ANNOTATE_SENTENCE_SYSTEM_PROMPT = `Annotate a Japanese sentence for an Anki flashcard. The target word is given in dictionary form but may appear conjugated or inflected in the sentence.

Steps:
1. Locate the word in the sentence in its conjugated/inflected form.
2. Split the sentence into three parts using the exact text as it appears — do NOT convert anything to dictionary form:
   - BEFORE: everything before the word's occurrence
   - WORD: the word as it appears in the sentence (conjugated form, not dictionary form)
   - AFTER: everything after the word's occurrence
3. Add Anki-style furigana to all three parts:
   - Reading covers only kanji, never kana okurigana: ✓ 食[た]べる  ✗ 食べる[たべる]
   - Insert a space before a kanji group when it is directly preceded by kana: ✓ 世[よ]の 中[なか]

Examples:
<example>
  <input>
    <sentence>新しい野菜が出廻っている。</sentence>
    <word>出廻る</word>
  </input>
  <output>新[あたら]しい 野菜[やさい]が|出廻[でまわ]って|いる。</output>
</example>

<example>
  <input>
    <sentence>彼女は毎日日本語を勉強している。</sentence>
    <word>勉強する</word>
  </input>
  <output>彼女[かのじょ]は 毎日[まいにち] 日本語[にほんご]を|勉強[べんきょう]して|いる。</output>
</example>

<example>
  <input>
    <sentence>美味しかったので全部食べた。</sentence>
    <word>美味しい</word>
  </input>
  <output>|美味[おい]しかった|ので 全部[ぜんぶ] 食[た]べた。</output>
</example>

<example>
  <input>
    <sentence>毎朝牛乳を飲む習慣がある。</sentence>
    <word>飲む</word>
  </input>
  <output>毎朝[まいあさ] 牛乳[ぎゅうにゅう]を|飲[の]む|習慣[しゅうかん]がある。</output>
</example>

Return exactly one line in the format: BEFORE|WORD|AFTER
Use an empty string for missing parts, but always include both pipe characters.`

export function annotateSentencePrompt(sentence: string, word: string) {
  return `Sentence: 「${sentence}」
Dictionary-form word: 「${word}」`
}

export const FURIGANA_SYSTEM_PROMPT = `Add Anki-style furigana to all kanji in Japanese text.

Rules:
1. Format: 漢字[かんじ] — the reading covers only the kanji, never kana okurigana.

2. Spacing: if a kanji[reading] group is directly preceded by kana characters, insert a space before that kanji. Without it, Anki misattributes the ruby to the preceding kana.

3. Leave pure kana words unchanged.

Examples:
<example>
  <input>食べる</input>
  <output>食[た]べる</output>
</example>

<example>
  <input>食べる</input>
  <wrong>食べる[たべる]</wrong>
</example>

<example>
  <input>勉強する</input>
  <output>勉強[べんきょう]する</output>
</example>

<example>
  <input>勉強する</input>
  <wrong>勉強する[べんきょうする]</wrong>
</example>

<example>
  <input>世の中</input>
  <output>世[よ]の 中[なか]</output>
</example>

<example>
  <input>世の中</input>
  <wrong>世[よ]の中[なか]</wrong>
</example>

Return only the annotated text, nothing else.`

export function furiganaPrompt(text: string) {
  return `Text: ${text}`
}

export function defineWordSystemPrompt(lang: string) {
  return `Give a brief ${lang} translation or definition of a Japanese word. Return only the translation/definition, nothing else. Keep it concise (under 10 words).`
}

export function defineWordPrompt(word: string) {
  return `Japanese word: 「${word}」`
}

export function translateSentenceSystemPrompt(targetLanguage: string) {
  return `Translate the provided Japanese sentence into natural ${targetLanguage}.

Before answering, think silently about:
- what information is explicit vs. omitted in the Japanese
- the intended nuance and tone of the sentence
- how to preserve the role and sense of the key words without sounding literal or awkward
- how to make the result clear and natural for a learner reading the card

Do all analysis silently. Return only the final translation, nothing else.`
}

export function translateSentencePrompt(sentence: string) {
  return sentence
}

export const SPLIT_WORD_SYSTEM_PROMPT = `Split the provided Japanese compound word into its individual component words.
For each component, estimate its JLPT level (N5, N4, N3, N2, N1, or unknown).
Return one component per line in the format: word|LEVEL
Example output for 内科部長:
内科|N1
部長|N3

Return only the components, nothing else.`

export function splitWordPrompt(word: string) {
  return `Japanese compound word: 「${word}」`
}

export const CONVERT_WORD_TO_KANJI_SYSTEM_PROMPT = `Convert a Japanese vocabulary item to its most common kanji spelling when that is the normal way to write the word.

Rules:
- Preserve the same dictionary form, part of speech, and meaning.
- If the word is already in its common kanji spelling, return it unchanged.
- If the word is usually written in kana, has no standard kanji spelling, or is ambiguous from context, return it unchanged.
- Return only the vocabulary item, with no explanation, quotes, spaces, or punctuation.`

export function convertWordToKanjiPrompt(transcription: string, word: string) {
  return `Vocabulary item: 「${word}」

Context:
"""
${transcription}
"""`
}

export function generateExampleSystemPrompt(
  word: string,
  jlptLevel: JlptLevel,
) {
  const vocabConstraint = `only ${VOCAB_CEILING[jlptLevel]}`

  return `Write ONE short Japanese sentence using「${word}」with the same meaning and grammatical role as in the provided context.

The sentence must:
- use ${vocabConstraint} for every word except「${word}」itself
- be 5–15 Japanese characters long
- stand on its own as a clear i+1 card
- not closely copy the source sentence
- usually use a different framing, participants, or situation from the source text, unless staying closer clearly makes a better i+1 card
- feel natural and specific, not literary, quirky, or overly dramatic
- use kanji if that is the normal way to write「${word}」

Use your full thinking budget before answering. Think silently first about the meaning, role, surface form, and 2-3 possible sentence ideas. Then choose the best idea and write the final sentence. Do not output your thinking.

<example>
  <input>
    <word>増える</word>
    <context>そのことばを知らない人が増えてきた。</context>
  </input>
  <output>
    <thinking>
Meaning: 「増える」 = to increase
Role: intransitive verb
Surface form: 増えた
Ideas: この町で知らない人が増えた / 店のお客が増えた / クラスの生徒が増えた
Best idea: 店のお客が増えた
    </thinking>
    <response>店のお客が増えた。</response>
  </output>
</example>`
}

export function generateExamplePrompt(
  transcription: string,
  word: string,
  previousSentence?: string,
  simplify?: boolean,
  feedback?: string,
) {
  const previousBlock = previousSentence
    ? `Previous attempt: 「${previousSentence}」\n`
    : ''

  const revisionInstruction = feedback
    ? `The learner's feedback on the previous sentence: "${feedback}"\nRevise the sentence to address this feedback.`
    : simplify
      ? 'The previous sentence was too difficult. Generate a simpler version.'
      : 'Generate the best example.'

  return `<input>
  <word>${word}</word>
  <context>${transcription}</context>
</input>

${previousBlock}${revisionInstruction}${simplify ? `\nUse only N5 vocabulary (the most basic, common words possible) for every word except「${word}」itself.` : ''}`
}

export function resolveManualVocabPrompt(word: string, context?: string) {
  return context?.trim()
    ? `Vocabulary item: 「${word}」

Context:
"""
${context.trim()}
"""`
    : `Vocabulary item: 「${word}」`
}

export function resolveManualVocabSystemPrompt(targetLanguage: string) {
  return `A Japanese learner heard or remembered a Japanese vocabulary item.
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

export function generateManualExampleSystemPrompt(
  word: string,
  jlptLevel: JlptLevel,
) {
  const vocabConstraint = `only ${VOCAB_CEILING[jlptLevel]}`

  return `Write ONE short Japanese example sentence for the vocabulary item「${word}」.

The sentence must:
- use「${word}」with the intended meaning
- use ${vocabConstraint} for every word except「${word}」itself
- be 5–15 Japanese characters long
- stand on its own as a clear i+1 card
- feel natural and specific, not literary, quirky, or overly dramatic
- use kanji if that is the normal way to write「${word}」

Use your full thinking budget before answering. Think silently first about the meaning, role, surface form, and 2-3 possible sentence ideas. Then choose the best idea and write the final sentence. Do not output your thinking.

<example>
  <input>
    <word>増える</word>
    <context>そのことばを知らない人が増えてきた。</context>
  </input>
  <output>
    <thinking>
Meaning: 「増える」 = to increase
Role: intransitive verb
Surface form: 増えた
Ideas: この町で知らない人が増えた / 店のお客が増えた / クラスの生徒が増えた
Best idea: 店のお客が増えた
    </thinking>
    <response>店のお客が増えた。</response>
  </output>
</example>`
}

export function generateManualExamplePrompt(
  word: string,
  options: GenerateOptions = {},
  meaning?: string,
  context?: string,
) {
  const { previousSentence, simplify, feedback } = options

  const previousBlock = previousSentence
    ? `Previous attempt: 「${previousSentence}」\n`
    : ''

  const revisionInstruction = feedback
    ? `The learner's feedback on the previous sentence: "${feedback}"\nRevise the sentence to address this feedback.`
    : simplify
      ? 'The previous sentence was too difficult. Generate a simpler version.'
      : 'Generate the best example.'

  const inputLines = [
    '<input>',
    `  <word>${word}</word>`,
    ...(meaning ? [`  <meaning>${meaning}</meaning>`] : []),
    ...(context?.trim() ? [`  <context>${context.trim()}</context>`] : []),
    '</input>',
  ]

  return `${inputLines.join('\n')}\n\n${previousBlock}${revisionInstruction}${simplify ? `\nUse only N5 vocabulary (the most basic, common words possible) for every word except「${word}」itself.` : ''}`
}
