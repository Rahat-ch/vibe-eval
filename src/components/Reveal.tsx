import { useState } from 'react'
import Markdown from 'react-markdown'
import { money, shortModelName } from '../lib/lineup'
import { packLink } from '../lib/pack'
import { judged, summarize, textSummary, totalSpent, verdict } from '../lib/results'
import type { Endpoint, ModelInfo, Pack, Round } from '../lib/types'

interface Props {
  pack: Pack
  rounds: Round[]
  models: ModelInfo[]
  endpoints: Record<string, Endpoint[] | undefined>
  demo: boolean
  stopReason: string
  onAgain: () => void
  onEdit: () => void
}

const LETTERS = 'ABCDEFGH'
const secs = (n: number | null | undefined) => (n == null ? '–' : `${n.toFixed(1)}s`)

function CopyButton({ label, text, disabled }: { label: string; text: () => string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      disabled={disabled}
      onClick={async () => {
        await navigator.clipboard.writeText(text())
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  )
}

export function Reveal({ pack, rounds, models, endpoints, demo, stopReason, onAgain, onEdit }: Props) {
  const done = judged(rounds)
  const stats = summarize(pack, rounds)
  const endpointOf = (i: number) => endpoints[pack.lineup[i].model]?.find((e) => e.tag === pack.lineup[i].provider)

  // What a contender is called depends on the test: in a provider test the
  // model is the same for all four, so the provider is the name.
  const name = (i: number) => {
    const c = pack.lineup[i]
    if (pack.mode === 'model') return shortModelName(models, c.model)
    const e = endpointOf(i)
    if (!e) return c.provider
    const sameProvider = pack.lineup.filter((_, j) => endpointOf(j)?.providerName === e.providerName).length > 1
    return sameProvider ? c.provider : e.providerName
  }
  const detail = (i: number) => {
    const c = pack.lineup[i]
    const e = endpointOf(i)
    const effort = c.effort || models.find((m) => m.id === c.model)?.reasoning?.default_effort
    return [
      pack.mode === 'model' ? `via ${e?.providerName ?? c.provider}` : null,
      e && e.quantization !== 'unknown' ? e.quantization : null,
      effort ? `${effort} reasoning${c.effort ? '' : ' (default)'}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }

  const v = verdict(pack, rounds, stats, name)
  const link = packLink(pack)
  const ranked = [...stats].sort((a, b) => b.wins - a.wins)
  const ties = done.filter((r) => r.pick?.kind === 'tie').length
  const nones = done.filter((r) => r.pick?.kind === 'none').length
  const subject =
    pack.mode === 'provider' ? `${shortModelName(models, pack.lineup[0].model)}, four providers` : 'Four models'

  return (
    <main className="reveal">
      {stopReason && <p className="banner">{stopReason}</p>}

      {/* The card is sized and styled to stand alone in a screenshot. */}
      <section className="card" aria-label="Result card">
        <p className="eyebrow">
          Vibe Eval · blind {pack.mode} test{demo ? ' · DEMO, placeholder data' : ''}
        </p>
        <p className="card-subject">
          {pack.title || subject}
          {pack.title ? ` · ${subject}` : ''}
        </p>
        <h1>{v.headline}</h1>
        {v.detail && <p className="lede">{v.detail}</p>}

        <table>
          <thead>
            <tr>
              <th>Contender</th>
              <th className="num">Picks</th>
              <th className="num">Cost / answer</th>
              <th className="num">First word</th>
              <th className="num">Full answer</th>
              <th className="num">Reasoning tokens</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s) => (
              <tr key={s.contender}>
                <td>
                  <b>{name(s.contender)}</b>
                  {pack.mode === 'model' && s.contender === 0 && <span className="tag">current</span>}
                  <span className="sub">{detail(s.contender)}</span>
                  {s.failed > 0 && (
                    <span className="sub warn">
                      failed {s.failed} of {done.length}
                    </span>
                  )}
                </td>
                <td className="num">
                  <span className="bar" style={{ width: `${(s.wins / Math.max(done.length, 1)) * 100}%` }} />
                  {s.wins} of {done.length}
                </td>
                <td className="num">{s.avgCost == null ? '–' : money(s.avgCost)}</td>
                <td className="num">{secs(s.avgFirstWord)}</td>
                <td className="num">{secs(s.avgTotal)}</td>
                <td className="num">{s.avgReasoning == null ? '–' : Math.round(s.avgReasoning)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="fine">
          {done.length} round{done.length === 1 ? '' : 's'} judged blind on your own prompts
          {ties ? ` · ${ties} tie${ties === 1 ? '' : 's'}` : ''}
          {nones ? ` · ${nones} with no good answer` : ''} · {money(totalSpent(rounds))} spent. A handful of rounds
          is a first impression, not a benchmark.
        </p>
      </section>

      <div className="actions">
        <CopyButton label="Copy pack link" text={() => link} />
        <CopyButton
          label="Copy results as text"
          disabled={demo}
          text={() => textSummary(pack, rounds, stats, name, link)}
        />
        <button onClick={onAgain}>Run it again</button>
        <button onClick={onEdit}>Change the test</button>
      </div>
      <p className="fine">
        The pack link holds your prompts, lineup and settings, so anyone can rerun this test on their own key. It
        does not include your key or your picks.
      </p>

      <section>
        <h2>Round by round</h2>
        {done.map((round, r) => (
          <details className="journey" key={r}>
            <summary>
              <span>
                Round {r + 1}: {round.prompt.length > 90 ? round.prompt.slice(0, 87) + '…' : round.prompt}
              </span>
              <span className="fine">
                {round.pick?.kind === 'best'
                  ? `You picked ${name(round.pick.contender)}`
                  : round.pick?.kind === 'tie'
                    ? "Couldn't tell them apart"
                    : 'None were good'}
              </span>
            </summary>
            <div className="answers revealed">
              {round.order.map((contender, position) => {
                const a = round.answers[contender]
                const chosen = round.pick?.kind === 'best' && round.pick.contender === contender
                return (
                  <div className={`answer ${chosen ? 'chosen' : ''} ${a.error ? 'failed' : ''}`} key={position}>
                    <span className="letter">{LETTERS[position]}</span>
                    <p className="who">
                      <b>{name(contender)}</b>
                      <span className="sub">{detail(contender)}</span>
                    </p>
                    {a.error ? (
                      <p className="error">Failed: {a.error}</p>
                    ) : (
                      <div className="md">
                        <Markdown>{a.text}</Markdown>
                      </div>
                    )}
                    {/* The journey: what this one answer went through. */}
                    <dl>
                      {a.servedBy && (
                        <>
                          <dt>Served by</dt>
                          <dd>{a.servedBy}</dd>
                        </>
                      )}
                      {a.usage && (
                        <>
                          <dt>Tokens in / out</dt>
                          <dd>
                            {a.usage.promptTokens} / {a.usage.completionTokens}
                          </dd>
                          <dt>Reasoning tokens</dt>
                          <dd>{a.usage.reasoningTokens}</dd>
                          <dt>Cost</dt>
                          <dd>{money(a.usage.cost)}</dd>
                        </>
                      )}
                      <dt>First word / done</dt>
                      <dd>
                        {secs(a.firstWordSec)} / {secs(a.totalSec)}
                      </dd>
                      {a.finishReason && a.finishReason !== 'stop' && (
                        <>
                          <dt>Finish reason</dt>
                          <dd>{a.finishReason}</dd>
                        </>
                      )}
                    </dl>
                  </div>
                )
              })}
            </div>
          </details>
        ))}
      </section>
    </main>
  )
}
