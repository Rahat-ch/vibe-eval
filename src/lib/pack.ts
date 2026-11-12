// A pack travels inside the link itself, after "#p=". Nothing is stored on a
// server, and the "#" part of a URL is never sent to one. A pack holds prompts,
// lineup and settings only: never a key, and never anyone's picks.
//
// To keep the link short the pack is written in a compact form (a positional
// array, with the shared model stated once in a provider test), compressed with
// deflate, then base64url-encoded. Older "#pack=" links, which were plain JSON,
// still open.

import { Inflate, deflateSync } from 'fflate'
import { SLOTS } from './lineup'
import type { Pack } from './types'

const PREFIX = '#p='
const OLD_PREFIX = '#pack='
const PENDING_STORE = 'vibe-eval:pending-pack'
/** A link is untrusted, so refuse one that inflates past this many bytes. */
const MAX_BYTES = 300_000

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

function inflate(bytes: Uint8Array): string {
  const chunks: Uint8Array[] = []
  let size = 0
  const stream = new Inflate((chunk) => {
    size += chunk.length
    if (size > MAX_BYTES) throw new Error('Pack link is too large.')
    chunks.push(chunk)
  })
  stream.push(bytes, true)
  const all = new Uint8Array(size)
  let at = 0
  for (const c of chunks) {
    all.set(c, at)
    at += c.length
  }
  return new TextDecoder().decode(all)
}

/** [2, mode, title, by, system, prompts, lineup]. */
function compact(pack: Pack): unknown[] {
  const lineup =
    pack.mode === 'provider'
      ? [pack.lineup[0].model, pack.lineup.map((c) => [c.provider, c.effort])]
      : pack.lineup.map((c) => [c.model, c.provider, c.effort])
  return [2, pack.mode === 'provider' ? 'p' : 'm', pack.title, pack.by, pack.system, pack.prompts, lineup]
}

/** Turn the compact form back into the plain shape that parse() checks. */
function expand(raw: string): string {
  const a = JSON.parse(raw)
  if (!Array.isArray(a) || a[0] !== 2) throw new Error('Unknown pack format.')
  const mode = a[1] === 'p' ? 'provider' : 'model'
  const lineup =
    mode === 'provider'
      ? a[6][1].map((c: unknown[]) => ({ model: a[6][0], provider: c[0], effort: c[1] }))
      : a[6].map((c: unknown[]) => ({ model: c[0], provider: c[1], effort: c[2] }))
  return JSON.stringify({ v: 1, mode, title: a[2], by: a[3], system: a[4], prompts: a[5], lineup })
}

export function packLink(pack: Pack): string {
  const clean: Pack = { ...pack, prompts: pack.prompts.map((p) => p.trim()).filter(Boolean) }
  const bytes = deflateSync(new TextEncoder().encode(JSON.stringify(compact(clean))), { level: 9 })
  return `${location.origin}${location.pathname}${PREFIX}${toBase64Url(bytes)}`
}

/** A pack link is untrusted input, so check its shape before using it. */
function parse(raw: string): Pack | null {
  try {
    const p = JSON.parse(raw)
    if (p?.v !== 1 || (p.mode !== 'provider' && p.mode !== 'model')) return null
    if (!Array.isArray(p.prompts) || !Array.isArray(p.lineup) || p.lineup.length !== SLOTS) return null
    const str = (x: unknown, max: number) => (typeof x === 'string' ? x.slice(0, max) : '')
    const prompts: string[] = p.prompts.slice(0, 12).map((x: unknown) => str(x, 20000)).filter(Boolean)
    return {
      v: 1,
      mode: p.mode,
      title: str(p.title, 120),
      by: str(p.by, 60),
      system: str(p.system, 20000),
      // A pack can ship a lineup with no prompts, for the person opening it to fill in.
      prompts: prompts.length ? prompts : [''],
      lineup: p.lineup.map((c: any) => ({
        model: str(c?.model, 200),
        provider: str(c?.provider, 200),
        effort: str(c?.effort, 20),
      })),
    }
  } catch {
    return null
  }
}

export function packFromLocation(): Pack | null {
  const hash = location.hash
  try {
    if (hash.startsWith(PREFIX)) return parse(expand(inflate(fromBase64Url(hash.slice(PREFIX.length)))))
    if (hash.startsWith(OLD_PREFIX)) {
      return parse(new TextDecoder().decode(fromBase64Url(hash.slice(OLD_PREFIX.length))))
    }
  } catch {
    // A broken or tampered link is treated as no pack at all.
  }
  return null
}

// Signing in sends the visitor to openrouter.ai and back, which would lose the
// pack in the address bar. Park it in this tab's storage across the round trip.

export function parkPack(pack: Pack) {
  sessionStorage.setItem(PENDING_STORE, JSON.stringify(pack))
}

export function unparkPack(): Pack | null {
  const raw = sessionStorage.getItem(PENDING_STORE)
  sessionStorage.removeItem(PENDING_STORE)
  return raw ? parse(raw) : null
}
