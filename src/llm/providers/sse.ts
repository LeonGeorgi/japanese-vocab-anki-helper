export interface SseEvent {
  event: string
  data: string
}

export async function* parseSseStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let boundaryIndex = findSseBoundary(buffer)
      while (boundaryIndex >= 0) {
        const rawBlock = buffer.slice(0, boundaryIndex)
        buffer = buffer.slice(boundaryIndex + boundaryLengthAt(buffer, boundaryIndex))
        const event = parseSseBlock(rawBlock)
        if (event) yield event
        boundaryIndex = findSseBoundary(buffer)
      }
    }

    buffer += decoder.decode()
    const finalEvent = parseSseBlock(buffer)
    if (finalEvent) yield finalEvent
  } finally {
    reader.releaseLock()
  }
}

function findSseBoundary(buffer: string) {
  const windows = ['\r\n\r\n', '\n\n']
  let earliest = -1
  for (const window of windows) {
    const index = buffer.indexOf(window)
    if (index >= 0 && (earliest === -1 || index < earliest)) earliest = index
  }
  return earliest
}

function boundaryLengthAt(buffer: string, index: number) {
  return buffer.startsWith('\r\n\r\n', index) ? 4 : 2
}

function parseSseBlock(block: string): SseEvent | null {
  const trimmed = block.trim()
  if (!trimmed) return null

  let event = 'message'
  const dataLines: string[] = []

  for (const line of trimmed.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      event = line.slice(6).trim() || 'message'
      continue
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (dataLines.length === 0) return null
  return { event, data: dataLines.join('\n') }
}

export function parseJsonSseData<T>(event: SseEvent): T | null {
  try {
    return JSON.parse(event.data) as T
  } catch {
    return null
  }
}
