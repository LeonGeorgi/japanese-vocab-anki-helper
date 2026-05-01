import { getDefaultStore } from 'jotai'
import { createLlmClient, type LlmFeature } from '../llm'
import { llmProviderAtom, llmTextModelAtom, llmVisionModelAtom } from '../state/settingsAtoms'

const CACHE_PREFIX = 'vocab_cache:'
const inflight = new Map<string, Promise<string>>()

export function resolveLlmRuntime(apiKey: string) {
  const store = getDefaultStore()
  const provider = store.get(llmProviderAtom)
  return {
    textModel: store.get(llmTextModelAtom),
    visionModel: store.get(llmVisionModelAtom),
    client: createLlmClient({ provider, apiKey }),
  }
}

export function cached(key: string, fetcher: () => Promise<string>, force = false): Promise<string> {
  const storageKey = CACHE_PREFIX + key
  if (force) {
    localStorage.removeItem(storageKey)
    inflight.delete(key)
  }
  const stored = localStorage.getItem(storageKey)
  if (stored !== null) return Promise.resolve(stored)
  if (!inflight.has(key)) {
    inflight.set(
      key,
      fetcher()
        .then(result => {
          localStorage.setItem(storageKey, result)
          inflight.delete(key)
          return result
        })
        .catch(err => {
          inflight.delete(key)
          throw err
        }),
    )
  }
  return inflight.get(key)!
}

export async function callTextModel(
  apiKey: string,
  feature: LlmFeature,
  prompt: string,
  maxTokens: number,
  thinkingTokens: number = 0,
  system?: string,
  context?: Record<string, number>,
): Promise<string> {
  const { client, textModel } = resolveLlmRuntime(apiKey)
  return client.completeText({ model: textModel, feature, prompt, maxTokens, thinkingTokens, system, context })
}
