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
      <p className="eyebrow">A blind taste test for language models</p>
      <h1>Does it matter who serves your model?</h1>
      <p className="lede">
        The same model is hosted by a dozen providers at different prices, speeds and levels of compression. Paste
        your own prompts, get four answers with the names hidden, and pick the one you like. Then see who wrote it
        and what it cost.
      </p>

      <ol className="steps">
        <li>
          <b>Provider test.</b> One model, four providers. Can you tell them apart?
        </li>
        <li>
          <b>Model test.</b> The model you use now against three others. Is yours still the one you'd pick?
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
