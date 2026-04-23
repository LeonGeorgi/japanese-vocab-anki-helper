import type { AnkiFieldNames, GeneratedAnkiFields } from './ankiCard'

export type AnkiGeneratedFieldKey = keyof GeneratedAnkiFields | 'image'
export type AnkiFieldMappingValue = AnkiGeneratedFieldKey | 'empty' | 'untouched'
export type AnkiFieldMapping = Record<string, AnkiFieldMappingValue>

const defaultFieldNames: Record<AnkiGeneratedFieldKey, string> = {
  before: 'Before',
  word: 'Word',
  after: 'After',
  plainWord: 'WordPlain',
  definition: 'Definition',
  sentence: 'Sentence',
  image: 'Image',
}

const fieldNameHints: Record<AnkiGeneratedFieldKey, string[]> = {
  before: ['before'],
  word: ['word'],
  after: ['after'],
  plainWord: ['wordplain', 'plainword', 'plain'],
  definition: ['definition', 'meaning', 'translation'],
  sentence: ['sentence', 'sentencetranslation'],
  image: ['image', 'picture', 'photo'],
}

export function toAnkiNoteFields(
  fieldMapping: AnkiFieldMapping,
  generatedFields: GeneratedAnkiFields,
  imageFieldValue = '',
) {
  const fields: Record<string, string> = {}
  for (const [fieldName, source] of Object.entries(fieldMapping)) {
    if (source === 'untouched') continue
    fields[fieldName] = valueForSource(source, generatedFields, imageFieldValue)
  }
  return fields
}

export function fieldMappingForModelFields(
  fieldNames: string[],
  storedMapping: AnkiFieldMapping,
): AnkiFieldMapping {
  return Object.fromEntries(
    fieldNames.map(fieldName => [fieldName, storedMapping[fieldName] ?? inferredFieldMappingValue(fieldName)]),
  )
}

export function mergeFieldMappingValue(
  fieldMapping: AnkiFieldMapping,
  fieldName: string,
  value: AnkiFieldMappingValue,
): AnkiFieldMapping {
  return { ...fieldMapping, [fieldName]: value }
}

export function removeFieldMappingForFields(
  fieldMapping: AnkiFieldMapping,
  fieldNames: string[],
): AnkiFieldMapping {
  const next = { ...fieldMapping }
  for (const fieldName of fieldNames) {
    delete next[fieldName]
  }
  return next
}

export function ankiFieldNamesFromMapping(
  fieldMapping: AnkiFieldMapping,
  modelFields: string[] = [],
): AnkiFieldNames {
  const modelMapping = modelFields.length > 0 ? fieldMappingForModelFields(modelFields, fieldMapping) : fieldMapping
  const fallbackToDefaults = Object.keys(modelMapping).length === 0
  return {
    before: fieldNameForSource(modelMapping, 'before', fallbackToDefaults),
    word: fieldNameForSource(modelMapping, 'word', fallbackToDefaults),
    after: fieldNameForSource(modelMapping, 'after', fallbackToDefaults),
    plainWord: fieldNameForSource(modelMapping, 'plainWord', fallbackToDefaults),
    definition: fieldNameForSource(modelMapping, 'definition', fallbackToDefaults),
    sentence: fieldNameForSource(modelMapping, 'sentence', fallbackToDefaults),
    image: fieldNameForSource(modelMapping, 'image', fallbackToDefaults),
  }
}

function fieldNameForSource(fieldMapping: AnkiFieldMapping, source: AnkiGeneratedFieldKey, fallbackToDefaults: boolean): string {
  return Object.entries(fieldMapping).find(([, value]) => value === source)?.[0] ?? (fallbackToDefaults ? defaultFieldNames[source] : '')
}

function inferredFieldMappingValue(fieldName: string): AnkiFieldMappingValue {
  const normalized = normalizeFieldName(fieldName)
  const source = Object.entries(fieldNameHints).find(([, hints]) => hints.includes(normalized))?.[0]
  return source ? source as AnkiGeneratedFieldKey : 'untouched'
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.toLocaleLowerCase().replace(/[^a-z0-9]/g, '')
}

function valueForSource(
  source: Exclude<AnkiFieldMappingValue, 'untouched'>,
  generatedFields: GeneratedAnkiFields,
  imageFieldValue: string,
): string {
  if (source === 'empty') return ''
  if (source === 'image') return imageFieldValue
  return generatedFields[source]
}
