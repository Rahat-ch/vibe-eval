// The vocabulary here follows CONTEXT.md: taste test, round, contender, pick, reveal, pack.

export type Mode = 'provider' | 'model'

/** One entrant: a model, served by one pinned provider, at one reasoning effort. */
export interface Contender {
  model: string
  /** Full endpoint slug, e.g. "deepinfra/fp8". Empty until the model's endpoints load. */
  provider: string
  /** Reasoning effort, or "" to use the model's own default. */
  effort: string
}

/** The shareable recipe for a taste test. Never holds a key or anyone's picks. */
export interface Pack {
  v: 1
  mode: Mode
  title: string
  by: string
  system: string
  prompts: string[]
  lineup: Contender[]
}

export interface ModelInfo {
  id: string
  name: string
  /** USD per token */
  promptPrice: number
  completionPrice: number
  reasoning?: {
    mandatory?: boolean
    supported_efforts?: string[]
    default_effort?: string
  }
}

export interface Endpoint {
  tag: string
  providerName: string
  quantization: string
  promptPrice: number
  completionPrice: number
  status: number
  uptime: number | null
}

export interface Usage {
  cost: number
  promptTokens: number
  completionTokens: number
  reasoningTokens: number
  cachedTokens: number
}

/** What happened to one contender's request in one round. */
export interface Answer {
  contender: number
  text: string
  error?: string
  generationId?: string
  finishReason?: string
  usage?: Usage
  /** Seconds from sending the request to the first visible word. */
  firstWordSec?: number
  /** Seconds from sending the request to the end of the stream. */
  totalSec?: number
  /** Provider name reported by OpenRouter's generation record, looked up at the reveal. */
  servedBy?: string
}

/** The builder's verdict on a round. */
export type Pick = { kind: 'best'; contender: number } | { kind: 'tie' } | { kind: 'none' }

export interface Round {
  prompt: string
  status: 'waiting' | 'running' | 'ready'
  answers: Answer[]
  /** Display order: position -> contender index. Shuffled so position says nothing. */
  order: number[]
  pick?: Pick
}
