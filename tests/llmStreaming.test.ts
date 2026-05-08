import { describe, expect, it } from 'vitest'
import { parseAnthropicStreamEvent } from '../src/llm/providers/anthropic'
import { parseOpenAiStreamEvent } from '../src/llm/providers/openai'
import { parseSseStream, type SseEvent } from '../src/llm/providers/sse'

function streamFromChunks(chunks: string[]) {
  const encoder = new TextEncoder()
  let index = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(chunks[index]))
      index += 1
    },
  })
}

async function collectSseEvents(chunks: string[]) {
  const events: SseEvent[] = []
  for await (const event of parseSseStream(streamFromChunks(chunks))) {
    events.push(event)
  }
  return events
}

describe('streaming SSE parsing', () => {
  it('reassembles SSE events across chunk boundaries', async () => {
    const events = await collectSseEvents([
      'event: content_block_del',
      'ta\ndata: {"delta":{"type":"text_delta","text":"Hel',
      'lo"}}\n\n',
      'data: [DONE]\n\n',
    ])

    expect(events).toEqual([
      {
        event: 'content_block_delta',
        data: '{"delta":{"type":"text_delta","text":"Hello"}}',
      },
      {
        event: 'message',
        data: '[DONE]',
      },
    ])
  })

  it('extracts OpenAI deltas and done markers from stream events', () => {
    const delta = parseOpenAiStreamEvent({
      event: 'message',
      data: '{"choices":[{"delta":{"content":"こんにちは"}}]}',
    })
    const done = parseOpenAiStreamEvent({
      event: 'message',
      data: '[DONE]',
    })

    expect(delta).toEqual({
      delta: 'こんにちは',
      finishReason: null,
      usage: null,
      done: false,
    })
    expect(done).toEqual({
      delta: '',
      finishReason: 'stop',
      usage: null,
      done: true,
    })
  })

  it('extracts Anthropic text deltas and usage metadata from stream events', () => {
    const delta = parseAnthropicStreamEvent({
      event: 'content_block_delta',
      data: '{"delta":{"type":"text_delta","text":"学"}}',
    })
    const usage = parseAnthropicStreamEvent({
      event: 'message_delta',
      data: '{"usage":{"input_tokens":12,"output_tokens":7,"cache_creation_input_tokens":3,"cache_read_input_tokens":1}}',
    })

    expect(delta).toEqual({
      delta: '学',
      usage: null,
    })
    expect(usage).toEqual({
      delta: '',
      usage: {
        inputTokens: 12,
        outputTokens: 7,
        cacheWriteTokens: 3,
        cacheReadTokens: 1,
      },
    })
  })
})
