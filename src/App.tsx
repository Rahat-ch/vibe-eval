import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Connect } from './components/Connect'
import { Reveal } from './components/Reveal'
import { RoundView } from './components/RoundView'
import { Setup } from './components/Setup'
import { DEFAULT_BUDGET, MAX_TOKENS, emptyPack, pickOneProvider, pickProviderSpread } from './lib/lineup'
import {
  DEMO_KEY,
  ask,
  finishSignIn,
  forgetKey,
  listEndpoints,
  listModels,
  loadKey,
  lookUpProvider,
} from './lib/openrouter'
import { packFromLocation, unparkPack } from './lib/pack'
import { totalSpent } from './lib/results'
import type { Endpoint, ModelInfo, Pack, Pick, Round } from './lib/types'

export const REPO_URL = 'https://github.com/Rahat-ch/vibe-eval'

type Stage = 'setup' | 'rounds' | 'reveal'

function shuffled(n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

export default function App() {
  const [key, setKey] = useState<string | null>(() => loadKey())
  const [authError, setAuthError] = useState('')
  const [stage, setStage] = useState<Stage>('setup')
  const [pack, setPack] = useState<Pack>(() => packFromLocation() ?? unparkPack() ?? emptyPack('provider'))
  const [opened] = useState(() => packFromLocation() !== null)
  const [budget, setBudget] = useState(DEFAULT_BUDGET)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [endpoints, setEndpoints] = useState<Record<string, Endpoint[] | undefined>>({})
  const [catalogError, setCatalogError] = useState('')
  const [rounds, setRounds] = useState<Round[]>([])
  const [current, setCurrent] = useState(0)
  const [stopReason, setStopReason] = useState('')
  // Contenders OpenRouter refused in round one, keyed by "model|provider".
  const [rejections, setRejections] = useState<Record<string, string>>({})

  // The round engine reads and writes this ref so that answers arriving from
  // four requests at once never work from a stale copy of the rounds.
  const roundsRef = useRef<Round[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const publish = () => setRounds(roundsRef.current.map((r) => ({ ...r, answers: [...r.answers] })))

  // Finish "Sign in with OpenRouter" if we were just redirected back.
  const signInStarted = useRef(false)
  useEffect(() => {
    if (signInStarted.current) return
    signInStarted.current = true
    finishSignIn()
      .then((k) => k && setKey(k))
      .catch((e) => setAuthError(e.message))
  }, [])

  useEffect(() => {
    listModels()
      .then(setModels)
      .catch((e) => setCatalogError(e.message))
  }, [])

  // Load the providers for every model in the lineup, then fill in any
  // contender that has no provider yet (or names one that no longer exists).
  const modelIds = useMemo(() => [...new Set(pack.lineup.map((c) => c.model).filter(Boolean))], [pack.lineup])
  const requested = useRef(new Set<string>())
  useEffect(() => {
    for (const id of modelIds) {
      if (requested.current.has(id)) continue
      requested.current.add(id)
      listEndpoints(id)
        .then((list) => setEndpoints((prev) => ({ ...prev, [id]: list })))
        .catch(() => setEndpoints((prev) => ({ ...prev, [id]: [] })))
    }
  }, [modelIds])

  useEffect(() => {
    if (stage !== 'setup') return
    setPack((p) => {
      let changed = false
      let spread: string[] | null = null
      const lineup = p.lineup.map((c, i) => {
        const list = endpoints[c.model]
        if (!list?.length || list.some((e) => e.tag === c.provider)) return c
        changed = true
        if (p.mode === 'provider') {
          spread ??= pickProviderSpread(c.model, list)
          return { ...c, provider: spread[i] ?? list[0].tag }
        }
        return { ...c, provider: pickOneProvider(c.model, list) }
      })
      return changed ? { ...p, lineup } : p
    })
  }, [endpoints, pack.lineup, pack.mode, stage])

  // ---- The round engine ---------------------------------------------------

  const startRound = useCallback(
    (index: number) => {
      const round = roundsRef.current[index]
      if (!round || round.status !== 'waiting' || !key) return

      // Spend guard: no new round starts once the budget is used up.
      if (totalSpent(roundsRef.current) >= budget) {
        roundsRef.current = roundsRef.current.slice(0, index)
        setStopReason(`Stopped before round ${index + 1}: the $${budget.toFixed(2)} budget was reached.`)
        publish()
        return
      }

      round.status = 'running'
      publish()
      const signal = abortRef.current?.signal
      let remaining = pack.lineup.length
      pack.lineup.forEach((contender, i) => {
        ask({ key, contender, system: pack.system, prompt: round.prompt, maxTokens: MAX_TOKENS, signal }).then(
          (result) => {
            if (signal?.aborted) return
            round.answers[i] = { contender: i, ...result }
            remaining -= 1
            if (remaining === 0) {
              // A contender refused outright in round one will be refused every
              // round. Stop now and say why, before more is spent.
              const refused = round.answers.filter((a) => a.rejected)
              if (index === 0 && refused.length) {
                abortRef.current?.abort()
                setRejections(
                  Object.fromEntries(
                    refused.map((a) => {
                      const c = pack.lineup[a.contender]
                      return [`${c.model}|${c.provider}`, a.error ?? 'OpenRouter refused this request.']
                    }),
                  ),
                )
                setStage('setup')
                return
              }
              // Only now are the answers shown, in a fresh random order, so
              // neither speed nor position gives a contender away.
              round.order = shuffled(pack.lineup.length)
              round.status = 'ready'
            }
            publish()
          },
        )
      })
    },
    [key, pack, budget],
  )

  // Run the round being judged, and warm up the next one while it is read.
  useEffect(() => {
    if (stage !== 'rounds') return
    const here = rounds[current]
    if (here?.status === 'waiting') startRound(current)
    if (here?.status === 'ready' && rounds[current + 1]?.status === 'waiting') startRound(current + 1)
  }, [stage, rounds, current, startRound])

  // If the budget cut the test short, go to the reveal once nothing is left to judge.
  useEffect(() => {
    if (stage === 'rounds' && current >= rounds.length) setStage('reveal')
  }, [stage, current, rounds.length])

  const begin = () => {
    const prompts = pack.prompts.map((p) => p.trim()).filter(Boolean)
    setPack({ ...pack, prompts })
    abortRef.current = new AbortController()
    roundsRef.current = prompts.map((prompt) => ({ prompt, status: 'waiting' as const, answers: [], order: [] }))
    setStopReason('')
    setRejections({})
    setCurrent(0)
    publish()
    setStage('rounds')
    window.scrollTo(0, 0)
  }

  const setPick = (pick: Pick) => {
    roundsRef.current[current].pick = pick
    publish()
  }

  const finish = () => {
    abortRef.current?.abort()
    setStage('reveal')
    window.scrollTo(0, 0)
  }

  const next = () => {
    if (current + 1 >= roundsRef.current.length) finish()
    else {
      setCurrent(current + 1)
      window.scrollTo(0, 0)
    }
  }

  // At the reveal, confirm who served each answer from OpenRouter's own record.
  const lookedUp = useRef(new Set<string>())
  useEffect(() => {
    if (stage !== 'reveal' || !key) return
    for (const round of roundsRef.current) {
      for (const answer of round.answers) {
        const id = answer?.generationId
        if (!id || lookedUp.current.has(id)) continue
        lookedUp.current.add(id)
        lookUpProvider(key, id).then((provider) => {
          if (!provider) return
          answer.servedBy = provider
          publish()
        })
      }
    }
  }, [stage, key])

  const backToSetup = () => {
    abortRef.current?.abort()
    setStage('setup')
    window.scrollTo(0, 0)
  }

  const disconnect = () => {
    abortRef.current?.abort()
    forgetKey()
    setKey(null)
    setStage('setup')
  }

  const demo = key === DEMO_KEY

  return (
    <div className="page">
      <header className="top">
        <button className="brand" onClick={key ? backToSetup : undefined}>
          Vibe Eval
        </button>
        <nav>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            Source
          </a>
          {key && (
            <>
              <span className={`chip ${demo ? 'chip-demo' : ''}`}>{demo ? 'Demo mode' : 'Connected'}</span>
              <button className="link" onClick={disconnect}>
                {demo ? 'Leave demo' : 'Disconnect'}
              </button>
            </>
          )}
        </nav>
      </header>

      {demo && (
        <p className="banner">
          Demo mode: models, providers and prices are real, but every answer, speed and cost is a placeholder.
        </p>
      )}

      {!key ? (
        <Connect pack={pack} opened={opened} error={authError} onKey={setKey} />
      ) : stage === 'setup' ? (
        <Setup
          authKey={key}
          pack={pack}
          opened={opened}
          setPack={setPack}
          budget={budget}
          setBudget={setBudget}
          models={models}
          endpoints={endpoints}
          catalogError={catalogError}
          rejections={rejections}
          onStart={begin}
        />
      ) : stage === 'rounds' && rounds[current] ? (
        <RoundView
          round={rounds[current]}
          index={current}
          total={rounds.length}
          contenders={pack.lineup.length}
          spent={totalSpent(rounds)}
          budget={budget}
          onPick={setPick}
          onNext={next}
          onFinish={finish}
        />
      ) : stage === 'reveal' ? (
        <Reveal
          pack={pack}
          rounds={rounds}
          models={models}
          endpoints={endpoints}
          demo={demo}
          stopReason={stopReason}
          onAgain={begin}
          onEdit={backToSetup}
        />
      ) : null}

      <footer className="foot">
        No server, no tracking. Your key stays in this tab and is only sent to openrouter.ai.{' '}
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          Read the code
        </a>
        .
      </footer>
    </div>
  )
}
