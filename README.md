# Vibe Eval

A little tool for "vibe evals". Sometimes you just want to quickly see how a few models handle your prompts before testing them out in your app.

Vibe Eval lets you test your prompts blind against different models.

**Try it:** https://vibe-eval.rahatcodes.com (sign in with OpenRouter)

## How it works

1. Pick the models you want to compare.
2. Paste in a few of your own prompts.
3. Get one answer from each model, with the names hidden.
4. Pick the answer you like best, and optionally say why.
5. See which model wrote each answer, what it cost and how fast it was.

You can also test one model across different providers, and share a link so others can rerun the same test.

It runs entirely in the browser, with no server and no tracking. Press "Try the demo" to see it with placeholder answers and no account.

## Run it locally

```sh
pnpm install
pnpm dev
```

Open the printed localhost address. There is nothing to configure.

## License

MIT
