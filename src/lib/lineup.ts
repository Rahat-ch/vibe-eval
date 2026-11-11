// Choosing default contenders, and estimating what a taste test will cost.

import { isHealthy } from './openrouter'
import type { Contender, Endpoint, ModelInfo, Pack } from './types'

export const SLOTS = 4

/** Every answer is capped at this many output tokens, reasoning included. */
export const MAX_TOKENS = 3000

export const DEFAULT_BUDGET = 1

export const PROVIDER_TEST_MODEL = 'deepseek/deepseek-v4.1-flash-1017'

/** Slot one is "the model you use now"; change it to yours. */
export const MODEL_TEST_MODELS = [
  'openai/gpt-5.4',
  'anthropic/claude-fable-5.2',
  'google/gemini-3.8-flash',
  'deepseek/deepseek-v4.1-flash-1017',
]

// Some providers sell the same endpoint at other service tiers: "flex" is
// cheaper and slower, "priority" dearer and faster. Defaults stick to the
// standard tier; any tier can still be chosen by hand.
const TIERS = new Set(['flex', 'priority', 'fast', 'ultrafast', 'turbo', 'batch'])

function standardTier(endpoints: Endpoint[]): Endpoint[] {
  const standard = endpoints.filter((e) => !TIERS.has(e.tag.split('/').pop()!))
  return standard.length ? standard : endpoints
}

const FIRST_PARTY: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  deepseek: 'DeepSeek',
  'x-ai': 'xAI',
  mistralai: 'Mistral',
}

function makerEndpoint(model: string, pool: Endpoint[]): Endpoint | undefined {
  const maker = FIRST_PARTY[model.split('/')[0]]
  return maker ? pool.find((e) => e.providerName.startsWith(maker)) : undefined
}

/**
 * Default providers for a provider test: the model maker's own endpoint as the
 * reference when it has one, then the cheapest healthy provider at each
 * quantization (how much the model's weights are compressed). That spread is
 * where differences are likeliest to show.
 */
export function pickProviderSpread(model: string, endpoints: Endpoint[]): string[] {
  const candidates = standardTier(endpoints)
  const healthy = candidates.filter(isHealthy)
  const pool = healthy.length >= SLOTS ? healthy : candidates
  const picked: Endpoint[] = []
  const seenQuant = new Set<string>()
  const seenProvider = new Set<string>()
  const take = (e: Endpoint) => {
    picked.push(e)
    seenProvider.add(e.providerName)
  }

  const own = makerEndpoint(model, pool)
  if (own) take(own)

  for (const e of pool) {
    if (picked.length >= SLOTS) break
    if (e.quantization === 'unknown' || seenQuant.has(e.quantization) || seenProvider.has(e.providerName)) continue
    seenQuant.add(e.quantization)
    take(e)
  }
  // Not enough distinct quantizations: fill from the most expensive end, then anything left.
  for (const e of [...pool].reverse()) {
    if (picked.length >= SLOTS) break
    if (!seenProvider.has(e.providerName)) take(e)
  }
  for (const e of pool) {
    if (picked.length >= SLOTS) break
    if (!picked.includes(e)) picked.push(e)
  }
  return picked.map((e) => e.tag)
}

/**
 * Default provider for one model in a model test: the model maker's own
 * endpoint when there is one, otherwise the cheapest healthy provider.
 */
export function pickOneProvider(model: string, endpoints: Endpoint[]): string {
  if (!endpoints.length) return ''
  const candidates = standardTier(endpoints)
  const healthy = candidates.filter(isHealthy)
  const pool = healthy.length ? healthy : candidates
  const own = makerEndpoint(model, pool)
  return (own || pool[0]).tag
}

export function emptyPack(mode: Pack['mode']): Pack {
  const lineup: Contender[] =
    mode === 'provider'
      ? Array.from({ length: SLOTS }, () => ({ model: PROVIDER_TEST_MODEL, provider: '', effort: '' }))
      : MODEL_TEST_MODELS.map((model) => ({ model, provider: '', effort: '' }))
  return { v: 1, mode, title: '', by: '', system: '', prompts: [''], lineup }
}

// ---------------------------------------------------------------------------
// Cost estimate
// ---------------------------------------------------------------------------

/** Rough guess at output tokens per answer, reasoning included. */
const TYPICAL_OUTPUT_TOKENS = 700

export interface Estimate {
  typical: number
  /** If every answer ran to the output cap. */
  ceiling: number
}

export function estimateCost(
  pack: Pack,
  endpointsByModel: Record<string, Endpoint[] | undefined>,
  models: ModelInfo[],
): Estimate {
  let typical = 0
  let ceiling = 0
  for (const c of pack.lineup) {
    const endpoint = endpointsByModel[c.model]?.find((e) => e.tag === c.provider)
    const model = models.find((m) => m.id === c.model)
    const inPrice = endpoint?.promptPrice ?? model?.promptPrice ?? 0
    const outPrice = endpoint?.completionPrice ?? model?.completionPrice ?? 0
    for (const prompt of pack.prompts) {
      if (!prompt.trim()) continue
      // About four characters per token is close enough for an estimate.
      const inputTokens = (prompt.length + pack.system.length) / 4 + 20
      typical += inputTokens * inPrice + TYPICAL_OUTPUT_TOKENS * outPrice
      ceiling += inputTokens * inPrice + MAX_TOKENS * outPrice
    }
  }
  return { typical, ceiling }
}

export function money(n: number): string {
  if (n === 0) return '$0'
  if (n < 0.01) return `$${n.toFixed(4)}`
  if (n < 1) return `$${n.toFixed(3)}`
  return `$${n.toFixed(2)}`
}

/** "Anthropic: Claude Fable 5.2" -> "Claude Fable 5.2" */
export function shortModelName(models: ModelInfo[], id: string): string {
  const name = models.find((m) => m.id === id)?.name
  return name ? name.split(': ').pop()! : id
}
