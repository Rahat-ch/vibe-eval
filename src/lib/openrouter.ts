// Every call Vibe Eval makes to OpenRouter lives in this file, written with plain
// fetch so you can read exactly what goes over the wire. There is no server:
// the browser talks to openrouter.ai directly, and the key never goes anywhere else.

import type { Contender, Endpoint, ModelInfo, Usage } from './types'
import { demoAnswer, demoPrompts } from './demo'

const API = 'https://openrouter.ai/api/v1'

/** A pseudo-key that makes every inference call return placeholder data. */
export const DEMO_KEY = 'demo'

// ---------------------------------------------------------------------------
// Key handling
//
// The key is kept in sessionStorage: it survives a refresh, is gone when the
// tab closes, and is not shared with other tabs. It is only ever sent to
// openrouter.ai, in the Authorization header.
// ---------------------------------------------------------------------------

const KEY_STORE = 'vibe-eval:key'
const VERIFIER_STORE = 'vibe-eval:pkce-verifier'

export function loadKey(): string | null {
  return sessionStorage.getItem(KEY_STORE)
}

export function saveKey(key: string) {
  sessionStorage.setItem(KEY_STORE, key)
}

export function forgetKey() {
  sessionStorage.removeItem(KEY_STORE)
  sessionStorage.removeItem(VERIFIER_STORE)
}

// ---------------------------------------------------------------------------
// Sign in with OpenRouter (OAuth PKCE)
// https://openrouter.ai/docs/guides/overview/auth/oauth
//
// 1. Make a random verifier, keep it in this tab, send its SHA-256 to OpenRouter.
// 2. OpenRouter sends the visitor back with ?code=...
// 3. Exchange code + verifier for a key. Only the tab that started the flow
//    holds the verifier, so an intercepted code is useless on its own.
// ---------------------------------------------------------------------------

function base64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function startSignIn() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)))
  sessionStorage.setItem(VERIFIER_STORE, verifier)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const params = new URLSearchParams({
    callback_url: location.origin + location.pathname,
    code_challenge: base64url(new Uint8Array(digest)),
    code_challenge_method: 'S256',
    key_label: 'Vibe Eval',
  })
  location.assign(`https://openrouter.ai/auth?${params}`)
}

/**
 * If the page was opened by OpenRouter's redirect, finish the sign-in.
 * The code is removed from the address bar before anything else happens.
 */
export async function finishSignIn(): Promise<string | null> {
  const url = new URL(location.href)
  const code = url.searchParams.get('code')
  if (!code) return null
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  history.replaceState(null, '', url.pathname + url.search + url.hash)

  const verifier = sessionStorage.getItem(VERIFIER_STORE)
  sessionStorage.removeItem(VERIFIER_STORE)
  if (!verifier) throw new Error('Sign-in was started in another tab. Please try again.')

  const res = await fetch(`${API}/auth/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  const { key } = await res.json()
  saveKey(key)
  return key
}

// ---------------------------------------------------------------------------
// Catalog: models and the providers that serve them
// ---------------------------------------------------------------------------

function headers(key: string): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    // These two put the app's name on the visitor's OpenRouter activity page.
    'HTTP-Referer': location.origin,
    'X-OpenRouter-Title': 'Vibe Eval',
  }
  if (key && key !== DEMO_KEY) h.Authorization = `Bearer ${key}`
  return h
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body?.error?.message ?? `OpenRouter returned ${res.status}`
  } catch {
    return `OpenRouter returned ${res.status}`
  }
}

let modelCache: Promise<ModelInfo[]> | null = null

export function listModels(): Promise<ModelInfo[]> {
  modelCache ??= fetch(`${API}/models`)
    .then(async (res) => {
      if (!res.ok) throw new Error(await errorMessage(res))
      const { data } = await res.json()
      return (data as any[]).map((m) => ({
        id: m.id,
        name: m.name,
        promptPrice: Number(m.pricing?.prompt ?? 0),
        completionPrice: Number(m.pricing?.completion ?? 0),
        reasoning: m.reasoning ?? undefined,
      }))
    })
    .catch((e) => {
      modelCache = null
      throw e
    })
  return modelCache
}

const endpointCache = new Map<string, Promise<Endpoint[]>>()

/** The providers serving one model right now, cheapest first. */
export function listEndpoints(model: string): Promise<Endpoint[]> {
  let cached = endpointCache.get(model)
  if (!cached) {
    cached = fetch(`${API}/models/${model}/endpoints`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await errorMessage(res))
        const { data } = await res.json()
        const endpoints: Endpoint[] = (data.endpoints as any[]).map((e) => ({
          tag: e.tag,
          providerName: e.provider_name,
          quantization: e.quantization ?? 'unknown',
          promptPrice: Number(e.pricing?.prompt ?? 0),
          completionPrice: Number(e.pricing?.completion ?? 0),
          status: e.status ?? 0,
          uptime: e.uptime_last_30m ?? null,
        }))
        return endpoints.sort((a, b) => blended(a) - blended(b))
      })
      .catch((e) => {
        endpointCache.delete(model)
        throw e
      })
    endpointCache.set(model, cached)
  }
  return cached
}

/** A single number for sorting by price: one part input to one part output. */
export function blended(e: { promptPrice: number; completionPrice: number }) {
  return e.promptPrice + e.completionPrice
}

export function isHealthy(e: Endpoint) {
  return e.status === 0 && (e.uptime === null || e.uptime >= 90)
}

// ---------------------------------------------------------------------------
// One contender answering one prompt
// ---------------------------------------------------------------------------

export interface AnswerResult {
  text: string
  error?: string
  generationId?: string
  finishReason?: string
  usage?: Usage
  firstWordSec?: number
  totalSec?: number
  servedBy?: string
}

export interface AskOptions {
  key: string
  contender: Contender
  system: string
  prompt: string
  maxTokens: number
  signal?: AbortSignal
}

/**
 * Send one prompt to one contender and read the streamed reply.
 *
 * The request pins the provider: `only` names the exact endpoint and
 * `allow_fallbacks: false` stops OpenRouter from quietly using another one.
 * In a taste test a silent swap would mean judging the wrong contender, so a
 * failure is reported as a failure.
 */
export async function ask(opts: AskOptions): Promise<AnswerResult> {
  if (opts.key === DEMO_KEY) return demoAnswer(opts)

  const { contender } = opts
  const messages = [
    ...(opts.system.trim() ? [{ role: 'system', content: opts.system }] : []),
    { role: 'user', content: opts.prompt },
  ]
  const body = {
    model: contender.model,
    messages,
    stream: true,
    // Reasoning tokens count against this cap too, so it bounds what one answer can cost.
    max_tokens: opts.maxTokens,
    ...(contender.effort ? { reasoning: { effort: contender.effort } } : {}),
    provider: { only: [contender.provider], allow_fallbacks: false },
  }

  const started = performance.now()
  const result: AnswerResult = { text: '' }
  try {
    const res = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: headers(opts.key),
      body: JSON.stringify(body),
      signal: opts.signal,
    })
    if (!res.ok || !res.body) {
      result.error = await errorMessage(res)
      return result
    }
    result.servedBy = res.headers.get('X-Provider-Name') ?? undefined

    // Server-sent events: lines of `data: {json}`, blank lines between events,
    // `: comment` lines as keep-alives, and a final `data: [DONE]`.
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += value
      let newline: number
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') continue
        let chunk: any
        try {
          chunk = JSON.parse(data)
        } catch {
          continue
        }

        // A stream can fail after it has started: still HTTP 200, with an error inside.
        if (chunk.error) result.error = chunk.error.message ?? 'The provider returned an error.'
        if (chunk.id) result.generationId = chunk.id

        const choice = chunk.choices?.[0]
        const piece: string | undefined = choice?.delta?.content
        if (piece) {
          result.firstWordSec ??= (performance.now() - started) / 1000
          result.text += piece
        }
        if (choice?.finish_reason) result.finishReason = choice.finish_reason

        // Usage arrives in its own chunk AFTER the one carrying finish_reason.
        // Stopping at finish_reason would lose the cost and token counts.
        if (chunk.usage) {
          result.usage = {
            cost: Number(chunk.usage.cost ?? 0),
            promptTokens: chunk.usage.prompt_tokens ?? 0,
            completionTokens: chunk.usage.completion_tokens ?? 0,
            reasoningTokens: chunk.usage.completion_tokens_details?.reasoning_tokens ?? 0,
            cachedTokens: chunk.usage.prompt_tokens_details?.cached_tokens ?? 0,
          }
        }
      }
    }
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e)
  }
  result.totalSec = (performance.now() - started) / 1000

  if (!result.error && !result.text.trim()) {
    result.error =
      result.finishReason === 'length'
        ? 'No visible answer: reasoning used the whole output cap.'
        : 'The provider returned an empty answer.'
  }
  return result
}

/**
 * Look up which provider OpenRouter recorded for a finished generation.
 * The record can take a moment to appear, so a 404 is retried a few times.
 */
export async function lookUpProvider(key: string, generationId: string): Promise<string | undefined> {
  if (key === DEMO_KEY) return undefined
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${API}/generation?id=${encodeURIComponent(generationId)}`, {
        headers: headers(key),
      })
      if (res.ok) {
        const { data } = await res.json()
        return data?.provider_name ?? undefined
      }
      if (res.status !== 404) return undefined
    } catch {
      return undefined
    }
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
  }
  return undefined
}

// ---------------------------------------------------------------------------
// "Write some for me": turn a use case into test prompts
// ---------------------------------------------------------------------------

const PROMPT_WRITER = 'openai/gpt-6-luna'

export async function writePrompts(key: string, useCase: string, count = 5): Promise<string[]> {
  if (key === DEMO_KEY) return demoPrompts(useCase, count)

  const res = await fetch(`${API}/chat/completions`, {
    method: 'POST',
    headers: headers(key),
    body: JSON.stringify({
      model: PROMPT_WRITER,
      max_tokens: 2000,
      reasoning: { effort: 'low' },
      messages: [
        {
          role: 'system',
          content:
            'You write test inputs for comparing language models. Given a use case, write realistic ' +
            'messages that a real user of that product would send. Vary them: an easy one, a typical ' +
            'one, a long or messy one, an ambiguous one, and one edge case. Write only the user ' +
            'message itself, in the voice of the user. Do not number them or explain them.',
        },
        { role: 'user', content: `Use case: ${useCase}\n\nWrite ${count} test prompts.` },
      ],
      // Structured output: the reply must be JSON matching this schema...
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'test_prompts',
          strict: true,
          schema: {
            type: 'object',
            properties: { prompts: { type: 'array', items: { type: 'string' } } },
            required: ['prompts'],
            additionalProperties: false,
          },
        },
      },
      // ...and the request may only go to a provider that supports it.
      provider: { require_parameters: true },
    }),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  const parsed = JSON.parse(json.choices[0].message.content)
  const prompts = (parsed.prompts as string[]).map((p) => p.trim()).filter(Boolean)
  if (!prompts.length) throw new Error('The model returned no prompts. Try a more specific use case.')
  return prompts.slice(0, count)
}
