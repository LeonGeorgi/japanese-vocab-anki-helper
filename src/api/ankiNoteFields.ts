import type { AnkiFieldNames, GeneratedAnkiFields } from './ankiCard'

export function toAnkiNoteFields(
  fieldNames: AnkiFieldNames,
  generatedFields: GeneratedAnkiFields,
  imageFieldValue = '',
) {
  return {
    [fieldNames.before]: generatedFields.before,
    [fieldNames.word]: generatedFields.word,
    [fieldNames.after]: generatedFields.after,
    [fieldNames.plainWord]: generatedFields.plainWord,
    [fieldNames.definition]: generatedFields.definition,
    [fieldNames.sentence]: generatedFields.sentence,
    [fieldNames.image]: imageFieldValue,
  }
}
