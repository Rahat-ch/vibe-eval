// Turning a finished taste test into the reveal: per-contender numbers, a
// one-line verdict, and a plain-text summary to paste elsewhere.

import { money } from './lineup'
import type { Pack, Round } from './types'

export interface Stats {
  contender: number
  wins: number
  answered: number
  failed: number
  avgCost: number | null
  avgFirstWord: number | null
  avgTotal: number | null
  avgReasoning: number | null
}

function avg(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

export function judged(rounds: Round[]): Round[] {
  return rounds.filter((r) => r.pick)
}

export function summarize(pack: Pack, rounds: Round[]): Stats[] {
  const done = judged(rounds)
  return pack.lineup.map((_, i) => {
    const answers = done.map((r) => r.answers[i]).filter(Boolean)
    const ok = answers.filter((a) => !a.error)
    return {
      contender: i,
      wins: done.filter((r) => r.pick?.kind === 'best' && r.pick.contender === i).length,
      answered: ok.length,
      failed: answers.length - ok.length,
      avgCost: avg(ok.flatMap((a) => (a.usage ? [a.usage.cost] : []))),
      avgFirstWord: avg(ok.flatMap((a) => (a.firstWordSec != null ? [a.firstWordSec] : []))),
      avgTotal: avg(ok.flatMap((a) => (a.totalSec != null ? [a.totalSec] : []))),
      avgReasoning: avg(ok.flatMap((a) => (a.usage ? [a.usage.reasoningTokens] : []))),
    }
  })
}

export function totalSpent(rounds: Round[]): number {
  return rounds.reduce((sum, r) => sum + r.answers.reduce((s, a) => s + (a?.usage?.cost ?? 0), 0), 0)
}

export interface Verdict {
  headline: string
  detail: string
}

function times(a: number, b: number): string {
  const ratio = a / b
  return ratio >= 10 ? `${Math.round(ratio)}x` : `${ratio.toFixed(1)}x`
}

/**
 * The verdict only says what the picks support. With a handful of rounds this
 * is a first impression, not a measurement, and the wording stays that modest.
 */
export function verdict(pack: Pack, rounds: Round[], stats: Stats[], name: (i: number) => string): Verdict {
  const done = judged(rounds)
  const n = done.length
  if (!n) return { headline: 'No rounds were judged.', detail: '' }

  const ties = done.filter((r) => r.pick?.kind === 'tie').length
  const nones = done.filter((r) => r.pick?.kind === 'none').length
  const ranked = [...stats].sort((a, b) => b.wins - a.wins)
  const [first, second] = ranked
  const priced = stats.filter((s) => s.avgCost != null && s.answered > 0)
  const cheapest = [...priced].sort((a, b) => a.avgCost! - b.avgCost!)[0]
  const priciest = [...priced].sort((a, b) => b.avgCost! - a.avgCost!)[0]
  const rounds_ = n === 1 ? 'round' : 'rounds'

  if (nones > n / 2) {
    return {
      headline: `None of these were good enough in ${nones} of ${n} ${rounds_}.`,
      detail: 'This lineup may not suit the task. Try different contenders or sharper prompts.',
    }
  }

  if (ties >= n / 2 || first.wins === 0) {
    const what = pack.mode === 'provider' ? 'providers' : 'models'
    return {
      headline: `You couldn't tell the ${what} apart in ${ties} of ${n} ${rounds_}.`,
      detail:
        cheapest && priciest && cheapest !== priciest
          ? `If they taste the same, take the cheapest: ${name(cheapest.contender)} at ${money(cheapest.avgCost!)} per answer, ${times(priciest.avgCost!, cheapest.avgCost!)} less than ${name(priciest.contender)}.`
          : 'If they taste the same, take the cheapest or the fastest.',
    }
  }

  const leaders = ranked.filter((s) => s.wins === first.wins)
  if (leaders.length === 2) {
    return {
      headline: `A split decision: ${name(first.contender)} and ${name(second.contender)} each won ${first.wins} of ${n} ${rounds_}.`,
      detail: 'Run a few more prompts to separate them, or let cost and speed decide.',
    }
  }
  if (leaders.length > 2) {
    return {
      headline: `No clear favourite: ${leaders.length} contenders each won ${first.wins} of ${n} ${rounds_}.`,
      detail: 'Your picks were spread evenly. Run more prompts, or let cost and speed decide.',
    }
  }

  let detail = ''
  if (first.avgCost != null && cheapest && priciest && cheapest !== priciest) {
    if (first.contender === cheapest.contender) {
      detail = `It was also the cheapest: ${money(first.avgCost)} per answer, ${times(priciest.avgCost!, first.avgCost)} less than ${name(priciest.contender)}.`
    } else if (first.contender === priciest.contender) {
      detail = `It was also the most expensive: ${money(first.avgCost)} per answer, ${times(first.avgCost, cheapest.avgCost!)} more than ${name(cheapest.contender)}.`
    } else {
      detail = `It cost ${money(first.avgCost)} per answer; the range was ${money(cheapest.avgCost!)} to ${money(priciest.avgCost!)}.`
    }
  }
  if (pack.mode === 'model' && first.contender !== 0) {
    detail = `${detail} Your current model, ${name(0)}, won ${stats[0].wins}.`.trim()
  }
  return { headline: `You preferred ${name(first.contender)} in ${first.wins} of ${n} ${rounds_}.`, detail }
}

function pad(s: string, n: number) {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

/** Plain text for pasting into Discord: a code block, since Discord has no tables. */
export function textSummary(
  pack: Pack,
  rounds: Round[],
  stats: Stats[],
  name: (i: number) => string,
  link: string,
): string {
  const v = verdict(pack, rounds, stats, name)
  const n = judged(rounds).length
  const kind = pack.mode === 'provider' ? 'provider test' : 'model test'
  const width = Math.max(...stats.map((s) => name(s.contender).length), 9)
  const rows = [...stats]
    .sort((a, b) => b.wins - a.wins)
    .map(
      (s) =>
        `${pad(name(s.contender), width)}  ${pad(`${s.wins}/${n}`, 5)}  ${pad(s.avgCost != null ? money(s.avgCost) : '-', 9)}  ${s.avgTotal != null ? s.avgTotal.toFixed(1) + 's' : '-'}`,
    )
  return [
    `**Vibe Eval, blind ${kind}${pack.title ? `: ${pack.title}` : ''}**`,
    v.headline,
    v.detail,
    '```',
    `${pad('contender', width)}  ${pad('picks', 5)}  ${pad('$/answer', 9)}  time`,
    ...rows,
    '```',
    `Run the same pack on your own prompts and key: ${link}`,
  ]
    .filter(Boolean)
    .join('\n')
}
