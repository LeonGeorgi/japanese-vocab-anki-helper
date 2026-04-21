const ANKI_CONNECT = 'http://127.0.0.1:8765'

async function invokeAnki<T>(action: string, params?: Record<string, unknown>): Promise<T> {
  let response: Response
  try {
    response = await fetch(ANKI_CONNECT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, version: 6, params }),
    })
  } catch {
    throw new Error('Could not reach AnkiConnect. Is Anki running?')
  }
  const data = await response.json() as { error: string | null; result: T }
  if (data.error) throw new Error(data.error)
  return data.result
}

export async function addNote(
  deckName: string,
  modelName: string,
  fields: Record<string, string>,
): Promise<void> {
  let response: Response
  try {
    response = await fetch(ANKI_CONNECT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addNote',
        version: 6,
        params: {
          note: {
            deckName,
            modelName,
            fields,
            options: { allowDuplicate: false },
            tags: ['vocab'],
          },
        },
      }),
    })
  } catch {
    throw new Error('Could not reach AnkiConnect. Is Anki running?')
  }
  const data = await response.json() as { error: string | null; result: number | null }
  if (data.error) throw new Error(data.error)
}

export async function findNotes(deck: string, fieldName: string, words: string[]): Promise<Set<string>> {
  if (!words.length) return new Set()
  const actions = words.map(word => ({
    action: 'findNotes',
    params: { query: `deck:"${deck}" ${fieldName}:${word}` },
  }))
  let response: Response
  try {
    response = await fetch(ANKI_CONNECT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'multi', version: 6, params: { actions } }),
    })
  } catch {
    return new Set()
  }
  const data = await response.json() as { result: number[][] }
  const found = new Set<string>()
  data.result.forEach((noteIds, i) => {
    if (noteIds.length > 0) found.add(words[i])
  })
  return found
}

export interface AnkiNoteInfo {
  noteId: number
  modelName: string
  tags: string[]
  fields: Record<string, { value: string; order: number }>
}

export async function findNotesWithEmptyField(deck: string, model: string, fieldName: string): Promise<number[]> {
  return invokeAnki<number[]>('findNotes', {
    query: `deck:"${deck}" note:"${model}" -${fieldName}:_*`,
  })
}

export async function getNotesInfo(noteIds: number[]): Promise<AnkiNoteInfo[]> {
  if (!noteIds.length) return []
  return invokeAnki<AnkiNoteInfo[]>('notesInfo', { notes: noteIds })
}

export async function updateNoteFields(noteId: number, fields: Record<string, string>): Promise<void> {
  await invokeAnki<null>('updateNoteFields', {
    note: {
      id: noteId,
      fields,
    },
  })
}

export async function getModelNames(): Promise<string[]> {
  return invokeAnki<string[]>('modelNames')
}

export async function getModelFieldNames(modelName: string): Promise<string[]> {
  return invokeAnki<string[]>('modelFieldNames', { modelName })
}

export async function storeMediaFileData(filename: string, base64: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(ANKI_CONNECT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'storeMediaFile',
        version: 6,
        params: { filename, data: base64 },
      }),
    })
  } catch {
    throw new Error('Could not reach AnkiConnect. Is Anki running?')
  }
  const data = await response.json() as { error: string | null }
  if (data.error) throw new Error(data.error)
}
