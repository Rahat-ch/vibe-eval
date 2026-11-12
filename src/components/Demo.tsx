import { useEffect } from 'react'

const REPO_URL = 'https://github.com/Rahat-ch/vibe-eval'
// Served from GitHub because it supports seeking; the copy on this site is the fallback.
const VIDEO = 'https://raw.githubusercontent.com/Rahat-ch/vibe-eval/master/public/demo.mp4'

export function Demo() {
  useEffect(() => {
    document.title = 'Vibe Eval: demo'
  }, [])

  return (
    <div className="page">
      <header className="top">
        <a className="brand" href="/">
          Vibe Eval
        </a>
        <nav>
          <a href="/">Taste test</a>
          <a href="/growth-plan">Growth plan</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            Source
          </a>
        </nav>
      </header>

      <main className="plan demo">
        <p className="eyebrow">Demo</p>
        <h1>Vibe Eval in six minutes</h1>
        <p className="lede">
          A walkthrough of the blind taste test: signing in with OpenRouter, running a model test on real prompts,
          the reveal, and the pack link.
        </p>
        <video controls playsInline preload="metadata">
          <source src={VIDEO} type="video/mp4" />
          <source src="/demo.mp4" type="video/mp4" />
        </video>
        <p className="fine">
          <a href="/">Try it yourself</a>, or read the <a href="/growth-plan">growth plan</a> built on it.
        </p>
      </main>
    </div>
  )
}
