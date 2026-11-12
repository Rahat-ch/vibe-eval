# Vibe Eval

A blind taste test for language models. Paste your own prompts, get four answers with the names hidden, pick the one you like, then see who wrote it and what it cost.

**Try it:** https://vibe-eval.pages.dev (sign in with OpenRouter, or press "Try the demo" for placeholder answers and no account).

**Watch the demo (6 min):** https://vibe-eval.pages.dev/demo

**Part 2, the growth plan:** https://vibe-eval.pages.dev/growth-plan

## Run it locally

```sh
pnpm install
pnpm dev
```

Open the printed localhost address. There is nothing to configure.

## The pain

**You can't tell what you're getting from a model for your use case until you try it on your own prompts.**

I built the recommendation box in Bento, an anime tracking app. It shipped on GPT-5.4 because that was the model we already used. We were a tiny team shipping before a convention, and comparing models meant writing test prompts, wiring up several APIs and reading a pile of output, so "it works" was what we had to lean on.

Who has this problem: developers using a model that works, who haven't compared it to others that may work better or cost less.

I read OpenRouter's Discord and searched X for the same pain. Two versions kept coming up.

**Which model?** People don't trust leaderboards. The Discord's word for a model tuned to its benchmarks is *benchmaxxed*.

- "is carbon really good or benchmaxxxx…ed" ([#models](https://discord.com/channels/1091220969173028894/1565049967243169842/1569661538036613141))

**Which provider?** Most people don't know it's a question. When I built this, DeepSeek V4.1 Flash 1017 had 47 endpoints on OpenRouter, with standard-tier input prices spanning about 75x.

- "Whenever our requests to GLM 5.3 flash get routed to Open Inference we get really strange results - as if it's a completely different model! … Forcing a different provider immediately fixes the issue." ([#providers](https://discord.com/channels/1091220969173028894/1364080318755115043/1562721600355434557); no reply)
- "Same model, very different results depending on who serves it … Pin your provider." ([X](https://x.com/foodtruckbench/status/2115801579639263613))
- "Thought DeepSeek V4.1 Flash-1017 had been nerfed, so I checked my OpenRouter logs. The quality drop lined up almost perfectly with a provider switch." ([X](https://x.com/etale_sheaf/status/2116880420159770654))

In the Discord, people block providers "just in case" on someone else's say-so. Half the threads in the #providers forum have never had a reply.

(Discord quotes are linked without names; you need to be a member of the server to open them.)

## Why this approach

I built a quick way to check different models and providers against the prompts you already have, to find out whether another model, or another provider of the same model, would work better or cost less.

- **Why a web page.** It's the fastest way to share an idea and find out whether it's useful: nothing to install, one-button sign-in, and a result you can link to. A CLI is the next step if the idea holds up.
- **Why the benchmaxxed hook.** People ask "is it benchmaxxed?" about every new model, so the model test opens first.
- **Why not OpenRouter's chat page.** It already compares models side by side. This adds two things: the test is blind, and it can compare one model across four providers.

What it does:

- **Model test.** Your current model against three others.
- **Provider test.** One model, served by four providers.
- For each prompt you pick the best answer and can say why in one line. Then it shows who wrote each answer, what it cost and how fast it was. A pack link lets anyone rerun the test on their own key.

What the result is worth:

- **A first look, not a proper eval.** Five prompts, one answer each, one judge. A 3 to 2 split is within chance, and the result card says so.
- **The reasons carry over into a real eval.** If "ignored the mood" shows up three times, that's a failure you can write a proper test for.

What I deliberately didn't build:

- **No judge model.** A judge you haven't checked against your own labels is worse than none.
- **No leaderboard.** Five rounds from one person can't support one.
- **No repeat runs.** They would show how much of a gap is luck, at three times the cost.
- **No multi-turn, tools or files.** This is a real gap: tool calling is where people report providers differing.

## Technical choices

- **Model selection.** The provider test defaults to DeepSeek V4.1 Flash 1017, the model in most of the complaints above, with DeepSeek's own endpoint as the reference. The model test defaults to GPT-5.4 (what I use), Claude Fable 5.2, Gemini 3.8 Flash and DeepSeek V4.1 Flash 1017, a price spread of more than 50x on input. Each runs at its default reasoning effort.
- **Routing.** Pinned: `provider: { only: ["<endpoint>"], allow_fallbacks: false }`. A silent fallback would mean judging a different contender than the label says.
- **Fallbacks.** None. A failed contender sits the round out, and the reveal counts the failure.
- **Streaming.** Used to measure time to first word, but answers are only shown once all four have finished. Usage arrives in a chunk *after* the one carrying `finish_reason`, so the reader keeps going until the stream closes.
- **Everything else.** Browser-only, plain `fetch`, no backend. Every call is in [`src/lib/openrouter.ts`](src/lib/openrouter.ts). A 3,000-token output cap and a $1 default budget limit the spend.

## Learnings

- **I planned the wrong tool first.** My first plan was a blind model comparison only. Two independent AI reviewers read the Discord and raised the same objections: OpenRouter's chat page already does side-by-side, and my own research ranked provider variance above model choice. I added the provider test. Having the plan reviewed before building was time well spent.
- **Streaming broke the blind test.** Showing answers as they stream shows which contender is fastest and which paused to reason, which is enough to guess who is who. Answers now appear together.
- **A pick without a reason is half a result.** The Parlance Labs evals course I'm taking is built on writing down what went wrong. My tool recorded which answer won and dropped the reason. I added one optional line per round.

## How I built it

Built with Claude Code as the coding agent, using the OpenRouter MCP server for live model, endpoint and docs lookups.

## License

MIT
