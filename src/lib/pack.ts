// A pack travels inside the link itself: the part after "#pack=" is the pack as
// JSON, base64url-encoded. Nothing is stored on a server, and the "#" part of a
// URL is never sent to one. A pack holds prompts, lineup and settings only:
// never a key, and never anyone's picks.

import { SLOTS } from './lineup'
import type { Pack } from './types'

const PREFIX = '#pack='
const PENDING_STORE = 'vibe-eval:pending-pack'

function encode(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decode(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export function packLink(pack: Pack): string {
  const clean: Pack = { ...pack, prompts: pack.prompts.map((p) => p.trim()).filter(Boolean) }
  return `${location.origin}${location.pathname}${PREFIX}${encode(JSON.stringify(clean))}`
}

/** A pack link is untrusted input, so check its shape before using it. */
function parse(raw: string): Pack | null {
  try {
    const p = JSON.parse(raw)
    if (p?.v !== 1 || (p.mode !== 'provider' && p.mode !== 'model')) return null
    if (!Array.isArray(p.prompts) || !Array.isArray(p.lineup) || p.lineup.length !== SLOTS) return null
    const str = (x: unknown, max: number) => (typeof x === 'string' ? x.slice(0, max) : '')
    return {
      v: 1,
      mode: p.mode,
      title: str(p.title, 120),
      by: str(p.by, 60),
      system: str(p.system, 20000),
      prompts: p.prompts.slice(0, 12).map((x: unknown) => str(x, 20000)).filter(Boolean),
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
  if (!location.hash.startsWith(PREFIX)) return null
  try {
    return parse(decode(location.hash.slice(PREFIX.length)))
  } catch {
    return null
  }
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
