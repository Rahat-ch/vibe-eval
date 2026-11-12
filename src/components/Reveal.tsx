import { useRef, useState } from 'react'
import { toBlob } from 'html-to-image'
import Markdown from 'react-markdown'
import { money, shortModelName } from '../lib/lineup'
import { packLink } from '../lib/pack'
import { judged, summarize, totalSpent, verdict } from '../lib/results'
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

function CopyButton({ label, text }: { label: string; text: () => string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
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

/** Puts a picture of the result card on the clipboard, ready to paste into a post. */
function CopyImageButton({ target }: { target: () => HTMLElement | null }) {
  const [state, setState] = useState<'idle' | 'copied' | 'saved' | 'failed'>('idle')
  const settle = (next: typeof state) => {
    setState(next)
    setTimeout(() => setState('idle'), 2500)
  }
  const render = async () => {
    const node = target()
    if (!node) throw new Error('No card to copy.')
    const blob = await toBlob(node, {
      pixelRatio: 2,
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      style: { margin: '0' },
    })
    if (!blob) throw new Error('Could not draw the card.')
    return blob
  }
  return (
    <button
      onClick={async () => {
        const image = render()
        try {
          // The promise is handed over unresolved: Safari only allows a clipboard
          // write that starts inside the click itself.
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })])
          settle('copied')
        } catch {
          // No image clipboard here (Firefox, or permission refused): save the file instead.
          try {
            const url = URL.createObjectURL(await image)
            const a = document.createElement('a')
            a.href = url
            a.download = 'vibe-eval-result.png'
            a.click()
            URL.revokeObjectURL(url)
            settle('saved')
          } catch {
            settle('failed')
          }
        }
      }}
    >
      {state === 'copied'
        ? 'Image copied'
        : state === 'saved'
          ? 'Image saved'
          : state === 'failed'
            ? "Couldn't make the image"
            : 'Copy card as image'}
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

  const pickLabel = (round: Round) =>
    round.pick?.kind === 'best'
      ? `You picked ${name(round.pick.contender)}`
      : round.pick?.kind === 'tie'
        ? "Couldn't tell them apart"
        : 'None were good'
  const noted = done.map((round, r) => ({ round, r })).filter(({ round }) => round.note?.trim())

  const v = verdict(pack, rounds, stats, name)
  const link = packLink(pack)
  const card = useRef<HTMLElement>(null)

  // X adds the link itself and counts it as 23 characters, so only the words need trimming.
  const shareOnX = () => {
    const tail = `\n\nBlind ${pack.mode} test on my own prompts with Vibe Eval. Run the same pack and make your own picks:`
    const room = 250 - tail.length
    const head = v.headline.length > room ? v.headline.slice(0, room - 1) + '…' : v.headline
    const intent = new URL('https://x.com/intent/post')
    intent.searchParams.set('text', head + tail)
    intent.searchParams.set('url', link)
    window.open(intent, '_blank', 'noopener')
  }
  const ranked = [...stats].sort((a, b) => b.wins - a.wins)
  const ties = done.filter((r) => r.pick?.kind === 'tie').length
  const nones = done.filter((r) => r.pick?.kind === 'none').length
  const subject =
    pack.mode === 'provider' ? `${shortModelName(models, pack.lineup[0].model)}, four providers` : 'Four models'

  return (
    <main className="reveal">
      {stopReason && <p className="banner">{stopReason}</p>}

      {/* The card is sized and styled to stand alone in a screenshot. */}
      <section className="card" aria-label="Result card" ref={card}>
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
          {done.length} prompt{done.length === 1 ? '' : 's'}, one answer each, judged blind by one person
          {ties ? ` · ${ties} tie${ties === 1 ? '' : 's'}` : ''}
          {nones ? ` · ${nones} with no good answer` : ''} · {money(totalSpent(rounds))} spent. This is a
          preference, not a measurement: a one-round gap is within chance
          {pack.mode === 'provider' ? ', and a single answer per provider can be a lucky or unlucky sample' : ''}. Treat
          it as a first look before a real eval.
        </p>
      </section>

      {noted.length > 0 && (
        <section className="notes">
          <h2>Why you picked what you picked</h2>
          <ul>
            {noted.map(({ round, r }) => (
              <li key={r}>
                <b>Round {r + 1}</b>
                <span className="sub">{pickLabel(round)}</span>
                {round.note}
              </li>
            ))}
          </ul>
          <p className="fine">
            If the same complaint shows up more than once, that is a failure worth testing for properly. The reason
            is more useful than the score.
          </p>
        </section>
      )}

      <div className="actions">
        <button onClick={shareOnX} disabled={demo} title={demo ? 'Demo results are placeholders' : undefined}>
          Share on X
        </button>
        <CopyImageButton target={() => card.current} />
        <CopyButton label="Copy pack link" text={() => link} />
        <button onClick={onAgain}>Run it again</button>
        <button onClick={onEdit}>Change the test</button>
      </div>
      <p className="fine">
        To post the card, copy it as an image, press Share on X and paste. The post carries the pack link, which
        holds your prompts, lineup and settings so anyone can rerun this test on their own key. It never includes
        your key or your picks.
      </p>

      <section>
        <h2>Round by round</h2>
        {done.map((round, r) => (
          <details className="journey" key={r}>
            <summary>
              <span>
                Round {r + 1}: {round.prompt.length > 90 ? round.prompt.slice(0, 87) + '…' : round.prompt}
              </span>
              <span className="fine">{pickLabel(round)}</span>
            </summary>
            {round.note?.trim() && <p className="journey-note">Your note: {round.note}</p>}
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
