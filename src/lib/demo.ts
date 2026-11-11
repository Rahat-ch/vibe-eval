// Demo mode lets someone click through a whole taste test without an OpenRouter
// account. The catalog (models, providers, prices) is real; the answers, speeds
// and costs below are placeholders and are labelled as such on screen.

import type { AnswerResult, AskOptions } from './openrouter'

const STYLES = [
  (p: string) =>
    `**Short answer.** Here is a direct reply to "${clip(p)}".\n\nIt gets to the point in two sentences and stops. Some people prefer this.`,
  (p: string) =>
    `Great question! Let me walk through "${clip(p)}" step by step.\n\n1. First, the context you need.\n2. Then the main idea.\n3. Finally, a caveat worth knowing.\n\nIn summary, this reply is thorough but takes a while to arrive at its conclusion.`,
  (p: string) =>
    `For "${clip(p)}":\n\n- One clear recommendation\n- The reason behind it\n- What to try if it does not work\n\nThis reply is structured and medium length.`,
  (p: string) =>
    `Regarding "${clip(p)}", the answer depends on a few things, and this reply spends most of its words hedging before it commits to anything specific.`,
]

function clip(s: string) {
  return s.length > 60 ? s.slice(0, 57) + '...' : s
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export async function demoAnswer(opts: AskOptions): Promise<AnswerResult> {
  const seed = hash(opts.contender.model + opts.contender.provider + opts.prompt)
  const totalSec = 0.8 + (seed % 1700) / 1000
  await new Promise((resolve, reject) => {
    const t = setTimeout(resolve, totalSec * 1000)
    opts.signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  }).catch(() => {})
  const text = `_Placeholder answer (demo mode)._\n\n${STYLES[seed % STYLES.length](opts.prompt)}`
  const completionTokens = Math.round(text.length / 4) + 40
  return {
    text,
    finishReason: 'stop',
    firstWordSec: totalSec * 0.4,
    totalSec,
    servedBy: undefined,
    usage: {
      cost: 0.0002 + (seed % 90) / 100000,
      promptTokens: Math.round((opts.prompt.length + opts.system.length) / 4) + 12,
      completionTokens,
      reasoningTokens: seed % 3 === 0 ? 0 : 40 + (seed % 200),
      cachedTokens: 0,
    },
  }
}

export async function demoPrompts(useCase: string, count: number): Promise<string[]> {
  await new Promise((r) => setTimeout(r, 600))
  return [
    `A simple request for: ${useCase}`,
    `A typical, everyday request for: ${useCase}`,
    `A long, messy request with extra detail for: ${useCase}`,
    `An ambiguous request that could mean two things for: ${useCase}`,
    `An edge case that might trip a model up for: ${useCase}`,
  ].slice(0, count)
}
