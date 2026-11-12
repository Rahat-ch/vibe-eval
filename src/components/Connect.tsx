import { useState } from 'react'
import { DEMO_KEY, saveKey, startSignIn } from '../lib/openrouter'
import { parkPack } from '../lib/pack'
import type { Pack } from '../lib/types'

interface Props {
  pack: Pack
  opened: boolean
  error: string
  onKey: (key: string) => void
}

export function Connect({ pack, opened, error, onKey }: Props) {
  const [pasting, setPasting] = useState(false)
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState(false)

  const signIn = () => {
    setBusy(true)
    // Keep an opened pack across the trip to openrouter.ai and back.
    if (opened) parkPack(pack)
    startSignIn()
  }

  const submitPasted = () => {
    const key = pasted.trim()
    if (!key) return
    saveKey(key)
    onKey(key)
  }

  return (
    <main className="connect">
      <div className="mystery" aria-hidden="true">
        {['A', 'B', 'C', 'D'].map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <p className="eyebrow">A blind taste test for language models</p>
      <h1>
        Is it benchmaxxed?
        <br />
        Taste it blind.
      </h1>
      <p className="lede">
        A leaderboard can't tell you how a model handles your prompts, or whether the provider serving it is giving
        you the full-strength version. Paste your own prompts, get four answers with the names hidden, and pick
        the one you like. Then see who wrote it and what it cost.
      </p>

      <ol className="steps">
        <li>
          <span className="tag">Model test</span>
          <b>Your model against three others.</b>
          <span>Is yours still the one you'd pick?</span>
        </li>
        <li>
          <span className="tag">Provider test</span>
          <b>One model, four providers.</b>
          <span>Can you tell them apart?</span>
        </li>
      </ol>

      {opened && (
        <p className="opened">
          You opened a pack{pack.title ? `: “${pack.title}”` : ''}
          {pack.by ? ` by ${pack.by}` : ''}, with {pack.prompts.length} prompt{pack.prompts.length === 1 ? '' : 's'}.
          Connect to run it on your own key.
        </p>
      )}

      {error && <p className="error">Sign-in failed: {error}</p>}

      <div className="actions">
        <button className="primary" onClick={signIn} disabled={busy}>
          {busy ? 'Opening OpenRouter…' : 'Connect OpenRouter'}
        </button>
        <button onClick={() => onKey(DEMO_KEY)}>Try the demo</button>
      </div>

      <p className="fine">
        Connecting creates an OpenRouter key for this page, billed to your own credits. It is kept in this browser
        tab only, sent nowhere except openrouter.ai, and forgotten when you close the tab or press Disconnect. A
        typical five-prompt test costs a few cents; you set a budget before each one. The demo needs no account and
        uses placeholder answers.
      </p>

      {pasting ? (
        <form
          className="paste"
          onSubmit={(e) => {
            e.preventDefault()
            submitPasted()
          }}
        >
          <input
            type="password"
            autoComplete="off"
            placeholder="sk-or-v1-…"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            aria-label="OpenRouter API key"
          />
          <button type="submit" disabled={!pasted.trim()}>
            Use this key
          </button>
        </form>
      ) : (
        <button className="link" onClick={() => setPasting(true)}>
          Paste a key instead
        </button>
      )}
    </main>
  )
}
