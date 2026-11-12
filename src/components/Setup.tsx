import { useEffect, useState } from 'react'
import { MAX_TOKENS, emptyPack, estimateCost, money } from '../lib/lineup'
import { isHealthy, writePrompts } from '../lib/openrouter'
import type { Contender, Endpoint, Mode, ModelInfo, Pack } from '../lib/types'

interface Props {
  authKey: string
  pack: Pack
  opened: boolean
  setPack: (update: Pack | ((p: Pack) => Pack)) => void
  budget: number
  setBudget: (n: number) => void
  models: ModelInfo[]
  endpoints: Record<string, Endpoint[] | undefined>
  catalogError: string
  /** Why OpenRouter refused a contender last time, keyed by "model|provider". */
  rejections: Record<string, string>
  onStart: () => void
}

const perMillion = (price: number) => {
  const n = price * 1e6
  return n < 0.1 ? `$${n.toFixed(3)}` : `$${n.toFixed(2)}`
}

/** A text box that only commits once it holds a real model id. */
function ModelInput({ value, models, onCommit, label }: {
  value: string
  models: ModelInfo[]
  onCommit: (id: string) => void
  label: string
}) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  const valid = (id: string) => models.length === 0 || models.some((m) => m.id === id)
  return (
    <input
      className="model-input"
      list="model-ids"
      aria-label={label}
      value={text}
      spellCheck={false}
      onChange={(e) => {
        setText(e.target.value)
        if (e.target.value !== value && valid(e.target.value) && models.length) onCommit(e.target.value)
      }}
      onBlur={() => !valid(text) && setText(value)}
    />
  )
}

export function Setup(props: Props) {
  const { pack, setPack, models, endpoints, budget, setBudget } = props
  const [useCase, setUseCase] = useState('')
  const [writing, setWriting] = useState(false)
  const [writeError, setWriteError] = useState('')
  const [showSystem, setShowSystem] = useState(Boolean(pack.system))
  // Prompts a model wrote, by their exact text. Editing one changes its text, so it stops being a draft.
  const [drafts, setDrafts] = useState<Set<string>>(() => new Set())

  const setMode = (mode: Mode) => {
    if (mode === pack.mode) return
    setPack((p) => ({ ...emptyPack(mode), title: p.title, by: p.by, system: p.system, prompts: p.prompts }))
  }

  const setContender = (i: number, patch: Partial<Contender>) =>
    setPack((p) => ({ ...p, lineup: p.lineup.map((c, j) => (j === i ? { ...c, ...patch } : c)) }))

  // In a provider test every slot runs the same model.
  const setSharedModel = (model: string) =>
    setPack((p) => ({ ...p, lineup: p.lineup.map(() => ({ model, provider: '', effort: '' })) }))

  const setPrompt = (i: number, text: string) =>
    setPack((p) => ({ ...p, prompts: p.prompts.map((x, j) => (j === i ? text : x)) }))

  const generate = async () => {
    setWriting(true)
    setWriteError('')
    try {
      const prompts = await writePrompts(props.authKey, useCase.trim())
      setDrafts((d) => new Set([...d, ...prompts]))
      setPack((p) => ({ ...p, prompts: [...p.prompts.filter((x) => x.trim()), ...prompts] }))
    } catch (e) {
      setWriteError(e instanceof Error ? e.message : String(e))
    } finally {
      setWriting(false)
    }
  }

  const prompts = pack.prompts.filter((p) => p.trim())
  const untouched = prompts.filter((p) => drafts.has(p)).length
  const ready = pack.lineup.every((c) => c.model && c.provider)
  const duplicates =
    new Set(pack.lineup.map((c) => `${c.model}|${c.provider}|${c.effort}`)).size < pack.lineup.length
  const estimate = estimateCost(pack, endpoints, models)
  const sharedModel = pack.lineup[0].model

  const problem = !prompts.length
    ? 'Add at least one prompt.'
    : !ready
      ? 'Waiting for the provider list…'
      : duplicates
        ? 'Two contenders are identical. Change a provider, model or effort.'
        : ''

  return (
    <main className="setup">
      <datalist id="model-ids">
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </datalist>

      {props.opened && (
        <p className="opened">
          Loaded from a pack link{pack.title ? `: “${pack.title}”` : ''}
          {pack.by ? ` by ${pack.by}` : ''}. Change anything you like before running it.
        </p>
      )}
      {Object.keys(props.rejections).length > 0 && (
        <p className="banner">
          The test stopped in round one because OpenRouter refused a contender, so every round would have failed the
          same way. Pick a different provider for it below, or change the account setting it mentions.
        </p>
      )}
      {props.catalogError && <p className="error">Couldn't load the model list: {props.catalogError}</p>}

      <section>
        <h2>1. What are you testing?</h2>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={pack.mode === 'provider'} onClick={() => setMode('provider')}>
            <b>Provider test</b>
            <span>One model, four providers. Does it matter who serves it?</span>
          </button>
          <button role="tab" aria-selected={pack.mode === 'model'} onClick={() => setMode('model')}>
            <b>Model test</b>
            <span>Your current model against three others. Would you switch?</span>
          </button>
        </div>
      </section>

      <section>
        <h2>2. The lineup</h2>
        {pack.mode === 'provider' && (
          <label className="field">
            <span>Model</span>
            <ModelInput value={sharedModel} models={models} onCommit={setSharedModel} label="Model to test" />
          </label>
        )}
        <div className="lineup">
          {pack.lineup.map((c, i) => {
            const list = endpoints[c.model]
            const info = models.find((m) => m.id === c.model)
            const efforts = info?.reasoning?.supported_efforts ?? []
            const rejection = props.rejections[`${c.model}|${c.provider}`]
            return (
              <div className="slot" key={i}>
                <span className="slot-label">
                  {pack.mode === 'model' && i === 0 ? 'Your current model' : `Contender ${i + 1}`}
                </span>
                {pack.mode === 'model' && (
                  <ModelInput
                    value={c.model}
                    models={models}
                    onCommit={(model) => setContender(i, { model, provider: '', effort: '' })}
                    label={`Model for contender ${i + 1}`}
                  />
                )}
                <select
                  aria-label={`Provider for contender ${i + 1}`}
                  value={c.provider}
                  disabled={!list?.length}
                  onChange={(e) => setContender(i, { provider: e.target.value })}
                >
                  {!list && <option value="">Loading providers…</option>}
                  {list && !list.length && <option value="">No providers found</option>}
                  {list?.map((e) => (
                    <option key={e.tag} value={e.tag}>
                      {e.tag} · {perMillion(e.promptPrice)} in, {perMillion(e.completionPrice)} out
                      {isHealthy(e) ? '' : ' · degraded'}
                    </option>
                  ))}
                </select>
                {efforts.length > 0 && (
                  <select
                    aria-label={`Reasoning effort for contender ${i + 1}`}
                    value={c.effort}
                    onChange={(e) => setContender(i, { effort: e.target.value })}
                  >
                    <option value="">
                      Reasoning: model default
                      {info?.reasoning?.default_effort ? ` (${info.reasoning.default_effort})` : ''}
                    </option>
                    {efforts.map((e) => (
                      <option key={e} value={e}>
                        Reasoning: {e}
                      </option>
                    ))}
                  </select>
                )}
                {rejection && <p className="error">OpenRouter refused this contender: {rejection}</p>}
              </div>
            )
          })}
        </div>
        <p className="fine">
          Each contender is pinned to its provider. If that provider fails, the contender sits the round out; it is
          never quietly swapped for another. Prices are per million tokens.
        </p>
      </section>

      <section>
        <h2>3. Your prompts</h2>
        <p className="fine">
          Use real inputs from your own task: the messages your product actually receives, and above all the ones
          that have gone wrong before. Easy prompts make every contender look the same. Each prompt is one round.
        </p>
        {pack.prompts.map((p, i) => (
          <div className="prompt-row" key={i}>
            <div>
              <textarea
                rows={3}
                placeholder={`Prompt ${i + 1}`}
                aria-label={`Prompt ${i + 1}`}
                value={p}
                onChange={(e) => setPrompt(i, e.target.value)}
              />
              {drafts.has(p) && (
                <p className="draft-note">
                  <span className="tag">Draft</span> Written by a model. Edit it to sound like what your users
                  really send.
                </p>
              )}
            </div>
            {pack.prompts.length > 1 && (
              <button
                className="link"
                aria-label={`Remove prompt ${i + 1}`}
                onClick={() => setPack((x) => ({ ...x, prompts: x.prompts.filter((_, j) => j !== i) }))}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button onClick={() => setPack((p) => ({ ...p, prompts: [...p.prompts, ''] }))}>Add a prompt</button>

        <div className="generate">
          <label htmlFor="use-case">
            No prompts to hand? Describe your use case and a model will draft five to edit. Generated prompts are
            tidier and easier than real ones, so treat them as a starting point.
          </label>
          <div className="generate-row">
            <input
              id="use-case"
              placeholder="e.g. recommend anime from a mood, with a one-line reason for each"
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && useCase.trim() && !writing && generate()}
            />
            <button onClick={generate} disabled={!useCase.trim() || writing}>
              {writing ? 'Drafting…' : 'Draft some for me'}
            </button>
          </div>
          {writeError && <p className="error">{writeError}</p>}
        </div>

        {showSystem ? (
          <label className="field">
            <span>System prompt, sent to every contender (optional)</span>
            <textarea
              rows={4}
              value={pack.system}
              onChange={(e) => setPack((p) => ({ ...p, system: e.target.value }))}
            />
          </label>
        ) : (
          <button className="link" onClick={() => setShowSystem(true)}>
            Add a system prompt
          </button>
        )}
      </section>

      <section>
        <h2>4. Run it</h2>
        <div className="pack-meta">
          <label className="field">
            <span>Name this pack (optional)</span>
            <input
              value={pack.title}
              maxLength={120}
              placeholder="e.g. Anime recs, hard cases"
              onChange={(e) => setPack((p) => ({ ...p, title: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Your handle (optional)</span>
            <input
              value={pack.by}
              maxLength={60}
              placeholder="shown when you share the pack"
              onChange={(e) => setPack((p) => ({ ...p, by: e.target.value }))}
            />
          </label>
        </div>

        <div className="estimate">
          {prompts.length === 0 ? (
            <p>Add a prompt to see what this test will cost.</p>
          ) : (
            <p>
              <b>
                {prompts.length} round{prompts.length === 1 ? '' : 's'}, {prompts.length * pack.lineup.length}{' '}
                answers.
              </b>{' '}
              Expect about <b>{money(estimate.typical)}</b>, and no more than {money(estimate.ceiling)} if every
              answer ran to the {MAX_TOKENS.toLocaleString()}-token cap.
            </p>
          )}
          <label>
            Stop if spend passes $
            <input
              type="number"
              min={0.05}
              step={0.05}
              value={budget}
              onChange={(e) => setBudget(Math.max(0.05, Number(e.target.value) || 0.05))}
              aria-label="Budget in dollars"
            />
          </label>
        </div>

        <div className="actions">
          <button className="primary" disabled={Boolean(problem)} onClick={props.onStart}>
            Start the blind taste test
          </button>
          {problem && <span className="fine">{problem}</span>}
          {!problem && untouched > 0 && (
            <span className="fine">
              {untouched} of {prompts.length} prompts {untouched === 1 ? 'is an unedited draft' : 'are unedited drafts'}
              . The result will say more with real ones.
            </span>
          )}
        </div>
      </section>
    </main>
  )
}
