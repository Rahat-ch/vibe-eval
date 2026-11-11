# Vibe Eval

A blind taste test for language models. Paste your own prompts, get four answers with the names hidden, pick the one you like, then see who wrote it and what it cost.

**Try it:** https://vibe-eval.rahatcodes.com (sign in with OpenRouter, or press "Try the demo" for a walkthrough with placeholder answers and no account).

It runs two kinds of test on the same screen:

- **Provider test.** One model, served by four different providers. *Does it matter who serves it?*
- **Model test.** The model you use now against three others. *Is yours still the one you'd pick?*

Built as a take-home for OpenRouter's Community Lead, Developer Relations role.

## The pain

**You can't tell what you're getting from a model until you try it on your own prompts, and almost nobody does.**

### Where I hit it

I built the recommendation box in Bento, an anime tracking app: you type a mood and get seven shows with a reason for each. It shipped on GPT-5.4 because that was the model we already used. I never ran a comparison. We were a tiny team shipping before a convention, and comparing models meant writing test prompts, wiring up several APIs and reading a pile of output, so "it works" won. I still can't tell you whether a model at a tenth of the price would have done as well.

### Where others hit it

I read OpenRouter's Discord (about 60,000 members) and X for the same pain. Two versions of it kept coming up.

**"Which model?" has no trusted answer.** People don't believe leaderboards; the Discord's word for a model tuned to its benchmarks is *benchmaxxed*.

- "are there any cheap good models where you can actually understand what they say?" ([#discussion](https://discord.com/channels/1091220969173028894/1392278974222307469/1565996531587219567); nobody answered the question)
- "is carbon really good or benchmaxxxx…ed" ([#models](https://discord.com/channels/1091220969173028894/1565049967243169842/1569661538036613141))

**"Which provider?" is worse, because most people don't know it's a question.** One open-weight model can be hosted by dozens of companies at different prices, speeds and levels of compression (quantization), all under the same model name. When I built this, DeepSeek V4.1 Flash 1017 had 47 endpoints on OpenRouter, with standard-tier input prices spanning about 75x.

- "Whenever our requests to GLM 5.3 flash get routed to Open Inference we get really strange results - as if it's a completely different model! … Forcing a different provider immediately fixes the issue." ([#providers](https://discord.com/channels/1091220969173028894/1364080318755115043/1562721600355434557); no reply)
- "it must be measurable" ([#models](https://discord.com/channels/1091220969173028894/1560930094762033162/1566128939137503415), in a conversation about comparing the same model across providers)
- A member proposing community ratings for provider and model combinations, because when one provider keeps failing and another doesn't, "there is no obvious feedback mechanism" ([#feedback-and-requests](https://discord.com/channels/1091220969173028894/1569034085483942129); no reply)
- "Same model, very different results depending on who serves it … Pin your provider." ([X](https://x.com/foodtruckbench/status/2115801579639263613))
- "Picking the best inference provider for an open model is surprisingly hard" ([X](https://x.com/vincentzed_cuda/status/2115772888296861969))
- "Thought DeepSeek V4.1 Flash-1017 had been nerfed, so I checked my OpenRouter logs. The quality drop lined up almost perfectly with a provider switch." ([X](https://x.com/etale_sheaf/status/2116880420159770654))

In the Discord, the working fix is folklore: people block providers "just in case" on someone else's say-so. Across the channels I read, provider variance was the most widely reported problem with building on LLMs, and the forum made for it is close to silent: half its threads have never had a reply.

(Discord quotes are linked but not attributed by name; you need to be a member of the server to open them.)

## Why this approach

### What I built

1. **Sign in with OpenRouter.** One button; no key to paste.
2. **Choose a provider test or a model test,** and adjust the four contenders. A contender is a model, pinned to one provider, at one reasoning effort.
3. **Paste your own prompts,** the real messages your product receives. If you have none, describe your use case and a model writes five to start from.
4. **See the cost first.** An estimate before you start, a running total, and a budget that stops the test.
5. **Judge blind.** For each prompt the four answers appear together, in random order, labelled A to D. Pick the best, say you can't tell them apart, or say none are good.
6. **The reveal.** Which contender you preferred, with cost per answer, speed and reasoning tokens for each, and the full journey of every answer: which provider served it, tokens in and out, cost, time to first word.
7. **Share it as a pack.** A link that carries the prompts, lineup and settings, so anyone can rerun the same test on their own key.

The provider test is the point. If you can't tell four providers apart, take the cheapest one and stop paying extra. If one is clearly worse, you've found in five minutes what people in the Discord argue about for weeks.

### What I deliberately didn't build

- **No judge model and no automatic scoring.** The Discord regulars distrust LLM judges, and their own answer to benchmaxxing is private benchmarks on their own prompts. This is a faster way to do that, not a replacement for judgement. The trade-off is that a blind pick can reward style over correctness.
- **No leaderboard and no stored results.** Five rounds from one person is a first impression, not a benchmark, and the reveal says so. Aggregating picks would claim more than the data supports.
- **No server, database or accounts.** It's a static page. Results live in the tab; sharing is a link or copied text.
- **No multi-turn chat, tools or file inputs.** One prompt, one answer. That leaves out agent and tool-calling workloads, which is a real gap: those are exactly where people report providers differing.
- **No live streaming on screen.** My first design streamed answers side by side. It looked great and broke the test, because speed gives contenders away. See Learnings.
- **Not a copy of OpenRouter's chat page,** which already compares models side by side on one message. What it doesn't do is hide the names, pin each provider, or compare one model across providers.

## Technical choices

**Browser-only, plain `fetch`.** OpenRouter's API allows cross-origin calls, so there is no backend. Every call is in [`src/lib/openrouter.ts`](src/lib/openrouter.ts), written without an SDK so the file shows exactly what goes over the wire. For a tool meant to teach, that mattered more than convenience.

**Sign-in with OAuth PKCE.** The page sends a hashed one-time secret to OpenRouter, the visitor approves, and the page exchanges the returned code for a key. The key is kept in `sessionStorage` (this tab only, gone when it closes), sent only to `openrouter.ai`, and the code is stripped from the address bar immediately. That key has no spending cap of its own, which is why the app has its own budget.

**Routing: pinned, on purpose.** Each request sends `provider: { only: ["<endpoint>"], allow_fallbacks: false }`. Normally OpenRouter's routing and fallbacks are the feature. In a taste test they're a bug: a silent fallback means judging a different contender than the label says.

**Fallbacks: none, also on purpose.** If a pinned provider fails, that contender is marked failed and sits the round out. Failures are counted in the reveal, because "this provider failed two of five" is a finding.

**Streaming: used, not shown.** Answers are read as a stream to measure time to first word and total time, but they're only displayed once all four have finished. The usage figures (cost, reasoning tokens, cached tokens) arrive in a final chunk *after* the one carrying `finish_reason`, so the reader keeps going until the stream closes.

**Default lineups.**
- *Provider test:* DeepSeek V4.1 Flash 1017, the model in most of the complaints above. Slot one is DeepSeek's own endpoint as the reference; the other three are the cheapest healthy provider at each quantization, picked from the live endpoint list.
- *Model test:* your current model (GPT-5.4 by default, because that's mine), Claude Fable 5.2, Gemini 3.8 Flash and DeepSeek V4.1 Flash 1017. That's a price spread of more than 50x on input.
- Defaults skip "flex" and "priority" service tiers and providers that are currently degraded.

**Reasoning effort is part of the contender.** Each one runs at its model's default unless you change it, and the reveal states the effort and the reasoning tokens used. Forcing everyone to "low" would be cheaper and would handicap models built to think.

**Prompt writing.** "Write some for me" uses GPT-6 Luna with a JSON schema (`response_format`) and `provider: { require_parameters: true }`, so the request only goes to a provider that supports structured output. It's small, cheap, and every one of its endpoints supports schemas.

**Spend guard.** Every answer has a 3,000-token output cap, which bounds the worst case. The app shows an estimate and a ceiling before starting, tracks real spend from each response's `usage.cost`, and won't start a new round once the budget (default $1) is passed.

**Packs live in the link.** The part of the URL after `#` holds the pack as base64 JSON. Browsers never send that part to a server. A pack is checked for shape and size when opened, and never contains a key or anyone's picks.

**Who served it.** The reveal confirms each answer's provider from OpenRouter's generation record (`GET /api/v1/generation`), not from what the app asked for.

## Learnings

**I planned the wrong tool first.** My first plan was a blind *model* comparison. Two independent reviews, each reading the live Discord, came back with the same objections: OpenRouter's chat page already does side-by-side, and my own research ranked provider variance above model choice. The blind engine stayed; the provider test became the lead. Having the plan attacked before building was the best hour I spent.

**Streaming broke the blind test.** Showing answers as they stream tells you which contender is fastest and which one paused to reason, which is enough to guess identities. Answers now arrive together behind a single "3 of 4 in" counter. I gave up the nicest-looking part of the demo to keep the test honest.

**"Low reasoning for everyone" isn't fair, it's a handicap.** I'd planned to equalise effort to keep rounds quick. Reviewers pointed out that it cripples models designed to reason and that the Discord already argues about this. Effort became a visible property of each contender.

**The cheapest endpoint isn't the default you want.** My first default-picker sorted by price and chose "flex" tier endpoints: cheap, and deliberately slow. A model test that quietly runs one contender on a slow tier is unfair in a way nobody would notice. Defaults now skip service tiers.

**The same model has more than one name.** I first pointed the provider test at `deepseek/deepseek-v4.1-flash` and found DeepSeek doesn't serve that slug itself, so there was no reference endpoint. The dated slug, `deepseek-v4.1-flash-1017`, has DeepSeek's own endpoint and is the one people were actually posting about. I only caught it by re-reading the posts I was citing.

**Usage comes after the end.** In a stream, cost and token counts arrive after the chunk that says the answer is finished. A reader that stops at `finish_reason` shows every answer as free. One thread in the Discord's help forum took four days to reach exactly this answer.

**My own account refused my reference contender.** On the first live run, DeepSeek's own endpoint failed all five rounds. My OpenRouter privacy settings exclude providers that train on prompts, and that endpoint is one of them, so OpenRouter refused the pinned request before it ran. Normal routing hides this by quietly choosing another provider; pinning exposes it. The app now stops in round one when a contender is refused outright, sends you back to the lineup, and shows OpenRouter's reason under that contender, instead of letting it fail every round and explaining at the end.

**The record of who served an answer isn't there straight away.** The generation lookup returned nothing for the first few seconds after a stream ended, so the reveal retries it and fills in "served by" as the records appear.

**A browser-held key needs its own guardrails.** The PKCE flow has no option to cap the key it creates, so the cap had to live in the app: an estimate, a ceiling, and a budget stop.

## Run it locally

```sh
pnpm install
pnpm dev
```

Open the printed localhost address. Sign-in works on localhost. There are no environment variables and nothing to configure.

## Share a pack

After a test, "Copy pack link" gives you a URL that reproduces your prompts, lineup and settings. Post it anywhere; whoever opens it runs the same test on their own key and makes their own picks.

## Layout

```
src/lib/openrouter.ts   every OpenRouter call: sign-in, catalog, pinned streaming request, generation lookup
src/lib/lineup.ts       default contenders and the cost estimate
src/lib/pack.ts         pack links
src/lib/results.ts      scoring, the verdict, the text summary
src/components/         the four screens: connect, setup, round, reveal
CONTEXT.md              the project's vocabulary (taste test, round, contender, pick, reveal, pack)
```

## License

MIT
