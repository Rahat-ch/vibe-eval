import Markdown from 'react-markdown'
import { money } from '../lib/lineup'
import type { Pick, Round } from '../lib/types'

interface Props {
  round: Round
  index: number
  total: number
  contenders: number
  spent: number
  budget: number
  onPick: (pick: Pick) => void
  onNote: (note: string) => void
  onNext: () => void
  onFinish: () => void
}

const LETTERS = 'ABCDEFGH'

export function RoundView({ round, index, total, contenders, spent, budget, onPick, onNote, onNext, onFinish }: Props) {
  const arrived = round.answers.filter(Boolean).length
  const last = index + 1 >= total
  const answered = round.answers.filter((a) => a && !a.error).length

  return (
    <main className="round">
      <div className="round-head">
        <p className="eyebrow">
          Round {index + 1} of {total}
        </p>
        <p className="fine">
          Spent {money(spent)} of {money(budget)}
        </p>
      </div>
      <blockquote className="prompt">{round.prompt}</blockquote>

      {round.status !== 'ready' ? (
        // While contenders are still writing, only a combined count is shown.
        // Showing each answer as it arrived would reveal which one was fastest.
        <div className="waiting" role="status">
          <div className="dots" aria-hidden="true">
            {Array.from({ length: contenders }, (_, i) => (
              <span key={i} className={i < arrived ? 'in' : ''} />
            ))}
          </div>
          <p>
            {arrived} of {contenders} answers in. They appear together, in random order, once the last one finishes.
          </p>
        </div>
      ) : (
        <>
          <div className="answers">
            {round.order.map((contender, position) => {
              const answer = round.answers[contender]
              const chosen = round.pick?.kind === 'best' && round.pick.contender === contender
              if (answer.error) {
                return (
                  <div className="answer failed" key={position}>
                    <span className="letter">{LETTERS[position]}</span>
                    <p className="fine">This contender failed to answer and sits this round out.</p>
                  </div>
                )
              }
              return (
                <div className={`answer ${chosen ? 'chosen' : ''}`} key={position}>
                  <span className="letter">{LETTERS[position]}</span>
                  <div className="md">
                    <Markdown>{answer.text}</Markdown>
                  </div>
                  <button
                    className="pick-hint"
                    aria-pressed={chosen}
                    aria-label={`Pick answer ${LETTERS[position]}`}
                    onClick={() => onPick({ kind: 'best', contender })}
                  >
                    {chosen ? 'Your pick' : `Pick ${LETTERS[position]}`}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="verdicts">
            <span>Or:</span>
            <button
              aria-pressed={round.pick?.kind === 'tie'}
              disabled={answered < 2}
              onClick={() => onPick({ kind: 'tie' })}
            >
              Can't tell them apart
            </button>
            <button aria-pressed={round.pick?.kind === 'none'} onClick={() => onPick({ kind: 'none' })}>
              None of these are good
            </button>
          </div>

          {/* The pick says which answer won. The note says why, which is the part you can act on. */}
          {round.pick && (
            <label className="why">
              <span>
                {round.pick.kind === 'best'
                  ? 'Why? What did the others get wrong?'
                  : round.pick.kind === 'tie'
                    ? 'Anything they all got right or wrong?'
                    : 'What was wrong with them?'}{' '}
                <i>Optional, one line.</i>
              </span>
              <input
                value={round.note ?? ''}
                maxLength={200}
                placeholder="e.g. the others recommended shows that don't match the mood"
                onChange={(e) => onNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onNext()}
              />
            </label>
          )}

          <div className="actions">
            <button className="primary" disabled={!round.pick} onClick={onNext}>
              {last ? 'See the reveal' : 'Next round'}
            </button>
            {!last && (
              <button className="link" onClick={onFinish}>
                End the test here
              </button>
            )}
          </div>
        </>
      )}
    </main>
  )
}
