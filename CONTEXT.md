# Vibe Eval

A blind taste test for language models: a builder describes a task, several models answer the same prompts, and the builder picks favourites without knowing which model wrote what. It exists because people can't tell which model suits their own task and don't trust public benchmarks to tell them.

## Language

**Use case**:
The builder's one-sentence description of the task they want a model for.
_Avoid_: Task, scenario, brief

**Taste test**:
One complete session, from a use case through to its reveal.
_Avoid_: Eval, run, session, benchmark

**Round**:
One test prompt together with every contender's answer to it.
_Avoid_: Case, turn, question

**Contender**:
One entrant in a taste test: a specific model, served by a specific provider, at a specific reasoning effort.
_Avoid_: Candidate, competitor, model (when meaning a participant)

**Provider**:
A company that hosts a model and serves its answers; one model usually has several.
_Avoid_: Host, vendor, endpoint

**Model test**:
A taste test whose contenders are different models.
_Avoid_: Model comparison, bake-off

**Provider test**:
A taste test whose contenders are the same model served by different providers.
_Avoid_: Provider comparison, host test

**Lineup**:
The set of contenders in a taste test.
_Avoid_: Roster, model list

**Pack**:
The shareable recipe for a taste test: its prompts, lineup and settings, without anyone's picks or key.
_Avoid_: Preset, template, config, benchmark

**Pick**:
The builder's verdict on a round: one best answer, a tie because the answers can't be told apart, or none because no answer is good.
_Avoid_: Vote, rating, score

**Reveal**:
The unmasking at the end of a taste test, showing which contender wrote each answer and how the contenders compare on preference, cost and speed.
_Avoid_: Results, report, leaderboard

**Blind**:
The state, before the reveal, in which answers are shown without their contender's identity.
_Avoid_: Anonymous, masked

**Benchmaxxed**:
Community slang for a model tuned to score well on public benchmarks without being equally good at real tasks.
