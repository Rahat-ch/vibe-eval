import { Fragment, useEffect } from 'react'
import type { ReactNode } from 'react'

const REPO_URL = 'https://github.com/Rahat-ch/vibe-eval'
const DISCORD = 'https://discord.com/channels/1091220969173028894/'

/** A short Discord quote, linked to its message and shown without a name. */
function Q({ to, children }: { to: string; children: ReactNode }) {
  return (
    <a className="q" href={DISCORD + to} target="_blank" rel="noreferrer">
      “{children}”
    </a>
  )
}

/** Discord-style copy: blank lines split paragraphs, **text** is bold. */
function Message({ text }: { text: string }) {
  return (
    <div className="discord">
      {text
        .trim()
        .split('\n\n')
        .map((para, i) => (
          <p key={i}>
            {para.split('\n').map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {line.split(/\*\*(.+?)\*\*/).map((part, k) => (k % 2 ? <b key={k}>{part}</b> : part))}
              </Fragment>
            ))}
          </p>
        ))}
    </div>
  )
}

const SEEDS = [
  {
    title: '“Is it benchmaxxed?”',
    where: 'The Gemini 4 Carbon thread in #models, Nov 10.',
    link: '1565049967243169842/1569661538036613141',
    quote: 'is carbon really good or benchmaxxxx…ed',
    pack: 'Gemini 4 Carbon against GPT-5.4, Claude Fable 5.2 and DeepSeek V4.1 Flash.',
    packLink:
      '/#p=PYxBDoMgEEWvQlg7WhtMk2666KKHIC4QRiRVhig2Hr8UQ5NZTP57_8trxRde8Rcuzjsm2FOtA_k7G9DraVHHgYbRyjzFR9Lyyb6SklNAr1xjQ4SuFgmcwc9InFsiO2Nj8y4I0Hk30ROAcrDF3TgqBeXjtFJwutGz2g3CqIbkdfU1GX9YbIMYNsR3Ux74iLqFcVbbBO2lvSWxoNzp-y8',
    reply:
      'Easiest way to find out for your own stuff is to try it without seeing the name. This puts Carbon next to GPT-5.4, Fable 5.2 and DeepSeek V4.1 Flash, blind. Drop in a few prompts you actually use, swap the first slot for whatever you run today, and see if you still pick Carbon. Curious what you get.',
  },
  {
    title: 'A provider complaint nobody answered',
    where: 'A provider thread in #providers, Oct 22. No replies.',
    link: '1364080318755115043/1562721600355434557',
    quote:
      'Whenever our requests to GLM 5.3 flash get routed to Open Inference we get really strange results - as if it’s a completely different model! … Forcing a different provider immediately fixes the issue.',
    pack: 'GLM 5.3 Flash on four providers: Z.AI’s own endpoint as the reference, Open Inference, Novita and Together.',
    packLink:
      '/#p=izbSUSpQ0lFy9_FVMNUzVnDLSSzOsFLILFbILFEoyUhVKCjKL8tMSS2yByoCo-hYnWilKt3ETP30nFxdoB7dNJAeoARUOK3AAqQQpCy_IDVPNzMvLbUoNS85FShjApPJA5pakoistiQ_PRVoYRGYDwQA',
    reply:
      'If you want to check this yourself: this runs GLM 5.3 Flash on Z.AI, Open Inference, Novita and Together with the provider names hidden. Paste two or three of the requests that came back strange and pick the best answer each round. It shows who wrote what at the end, and you see the cost before you start. If Open Inference loses every round, post it here.',
  },
  {
    title: 'A question that got a joke instead of an answer',
    where: '#discussion, Oct 31. The only reply was about the member’s profile picture.',
    link: '1392278974222307469/1565996531587219567',
    quote: 'are there any cheap good models where you can actually understand what they say?',
    pack: 'Four cheap models: GPT-6 Luna, Claude Haiku 5.5, GLM 5.3 Flash and DeepSeek V4.1 Flash.',
    packLink:
      '/#p=PczBDoIwDIDhVyE7ryAq6t3HWDg0UNzCGA0DTXx6y8hMdlj6f605azUprZ6WkItp7slHXbBHFwoM8UNLlJqeabUxamYK6KoXr3ADvwWUdsx2JERhWO0ys-uqzuPWE1h04wZN2Yj4x6y_sF_zk_QLDB6jlZKGAz8y6ok4Eo1V_sD7WtYHh_pU3wXmlHba9gc',
    reply:
      'Depends what you’re asking them. Here are four cheap ones side by side with the model names hidden: GPT-6 Luna, Haiku 5.5, GLM 5.3 Flash and DeepSeek V4.1 Flash. Ask the kind of thing you’d normally ask, pick the answer that’s easiest to follow, and it tells you which model that was and what it cost.',
  },
]

function Seed({ s }: { s: (typeof SEEDS)[number] }) {
  return (
    <article className="seed">
      <h3>{s.title}</h3>
      <p className="fine">
        {s.where}{' '}
        <a href={DISCORD + s.link} target="_blank" rel="noreferrer">
          Message
        </a>
      </p>
      <blockquote>“{s.quote}”</blockquote>
      <p>
        <b>Pack:</b> {s.pack} <a href={s.packLink}>Open the pack</a>
      </p>
      <p className="label">Drafted reply</p>
      <Message text={s.reply} />
    </article>
  )
}

const LAUNCH_POST = `
**Bring Your Own Bench**

For the last few weeks some of you have been posting tests other people can rerun when you debate models.

• [member] thought [model] was worse on [provider], and ran it blind against three other providers. [pack]
• [member] put their private coding bench up against [model]. [pack]
• [member] wanted to know if a cheaper model could do [task]. [pack]

These are packs: a link with a few prompts from something you really do, and four models or four providers of one model. Whoever opens it gets four answers with the model names hidden, picks the best, then sees who wrote what and what it cost. It runs in your browser on your own key, with a spend cap you set.

**This thread is where they go.**
• Got a private bench? Post it as a pack: the link, one line on what it tests, your result.
• Ran someone else's? Reply with your result, especially if you disagree.
• Changed the prompts or the lineup? That's a repack. Post the new link.

**Who's behind it.** I'm Rahat, I work on community at OpenRouter, and I built the tool. It's still rough. What the first testers asked for and what's fixed so far: [list].

**It's not a leaderboard.** Five prompts judged by one person is a preference. There won't be an official ranking.

**Packs so far**
[index, each credited to its author]
`

const EVENT_POST = `
**Repack Day: [model] is on the API**

[model] just landed. Before this thread decides whether it's benchmaxxed, try it on something real.

**For the next 48 hours**
• Open any pack in the index, swap [model] into the lineup, run it and post your result.
• Got your own pack? Repack it with [model] and post the link.

On [day] I'll post a roundup of which packs it won, which it lost, and the reasons people gave. No overall score.

[link to the pack thread]
`

const SECTIONS = [
  ['noticed', 'What I noticed'],
  ['initiative', 'The initiative'],
  ['seeding', 'Seeding'],
  ['runs', 'How it runs'],
  ['copy', 'The copy'],
  ['success', 'Success'],
  ['beyond', 'X and Reddit'],
  ['tool', 'Not built yet, and open questions'],
]

export function GrowthPlan() {
  useEffect(() => {
    document.title = 'Bring Your Own Bench: a growth plan for the OpenRouter Discord'
  }, [])

  return (
    <div className="page">
      <header className="top">
        <a className="brand" href="/">
          Vibe Eval
        </a>
        <nav>
          <a href="/">Taste test</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            Source
          </a>
        </nav>
      </header>

      <main className="plan">
        <p className="eyebrow">Growth plan for the OpenRouter Discord</p>
        <h1>Bring Your Own Bench</h1>
        <p className="lede">
          The OpenRouter Discord has lively discussions about models, providers and nerfs. I want to give people a way
          to make their case with their own use cases instead of leaderboards.
        </p>

        <div className="summary">
          <p>
            <b>What I noticed.</b> The community lives in the per-model threads in #models. People don’t trust
            leaderboards and keep private benches, but nobody else can run them, so the same debate restarts at
            every release.
          </p>
          <p>
            <b>The idea.</b> In Part 1 I built <a href="/">Vibe Eval</a>, a blind taste test for models. A{' '}
            <b>pack</b> is a test saved as a link: a few prompts and four models, or four providers of one model.
            Members turn their private bench into a pack, others rerun it, and if they disagree they change it and
            post it back as a <b>repack</b>. When a new model lands, everyone repacks.
          </p>
          <p>
            <b>How it rolls out.</b> Seed packs into debates already happening, ask a few regulars to make their
            own, then post it in #models so it comes as a community thing. Time it for when new models are close.
          </p>
          <p>
            <b>The number.</b> By week 8, half of member packs have a result posted by someone other than the
            author.
          </p>
        </div>

        <nav className="toc" aria-label="Sections">
          {SECTIONS.map(([id, label], i) => (
            <a key={id} href={`#${id}`}>
              {i + 1}. {label}
            </a>
          ))}
        </nav>

        <section id="noticed">
          <h2>1. What I noticed</h2>
          <p className="fine">
            I read the server from Nov 9 to 11. Quotes link to the message without names; you need to be a member to
            open them.
          </p>

          <ul className="stats">
            <li>
              <b>71,000</b>
              <span>messages in #models, across 76 threads</span>
            </li>
            <li>
              <b>86%</b>
              <span>of them are in 14 threads</span>
            </li>
            <li>
              <b>4 of 55</b>
              <span>showcase posts got a reply</span>
            </li>
          </ul>

          <ul>
            <li>
              <b>The community lives in #models.</b> One thread per model, started by regulars within minutes of a
              release.
            </li>
            <li>
              <b>They don’t trust leaderboards.</b>{' '}
              <Q to="1565049967243169842/1569661538036613141">is carbon really good or benchmaxxxx…ed</Q>
            </li>
            <li>
              <b>Their fix is a private bench.</b>{' '}
              <Q to="1565049967243169842/1565138454063489065">
                benchmarks are useless anyways … Need to create your own private benchmark
              </Q>
            </li>
            <li>
              <b>Private benches stay private.</b> A claim is one person’s screenshot, and it’s buried within hours
              in threads of 14,000+ messages.
            </li>
            <li>
              <b>Showcase posts get almost no replies.</b> A pack gives builders another way to share what they’re building
              and get feedback, because people can run it.
            </li>
          </ul>

          <details className="more">
            <summary>More from the read</summary>
            <ul>
              <li>
                People answer each other fast. One member asked if a two-model setup made sense and had three answers
                in 30 minutes.
              </li>
              <li>
                They already borrow each other’s tests. One member’s go-to prompt is{' '}
                <Q to="1569424744523108392/1569499899878449203">shamelessly stolen</Q> from another regular.
              </li>
              <li>
                Private benches carry weight:{' '}
                <Q to="1569907200405667870/1570041503013670973">
                  a lot of people called that model benchmaxxed … but I have seen it hold up well in private benches
                </Q>
              </li>
              <li>
                Which provider to use is word of mouth:{' '}
                <Q to="1560930094762033162/1566254117091803197">yeah I’ll block deepinfra just in case</Q>
              </li>
              <li>
                Testing costs money:{' '}
                <Q to="1569424744523108392/1569479015885185117">
                  still have to try this model myself just scared it’ll evaporate my usage
                </Q>
              </li>
              <li>
                Provider problems in #providers often get no answer. We’d probably need to revisit that later, and
                this plan doesn’t try to. It’s part of why Part 1 has a provider test.
              </li>
            </ul>
          </details>
        </section>

        <section id="initiative">
          <h2>2. The initiative</h2>
          <ul>
            <li>
              <b>Post, rerun, repack.</b> Post a pack with your result. Others run it on their own key and reply. If
              you disagree, change it and post the repack.
            </li>
            <li>
              <b>Repack Day.</b> When a new model reaches the API, everyone swaps it into their packs for 48 hours.
            </li>
            <li>
              <b>Pack keepers.</b> Members whose packs get rerun most get a role and repack on release day.
            </li>
            <li>
              <b>Packs get a reply.</b> I rerun new member packs and reply to interesting posts, and so do others on
              the DevRel team. People who post and get a reply come back: in a{' '}
              <a href="https://scilit.com/publications/e55a84674ccee8717d6305c0584b0fe7" target="_blank" rel="noreferrer">
                study of 2,777 newcomers to newsgroups
              </a>
              , 56% of those whose first post got a reply posted again, against 44% of those who got none.
            </li>
            <li>
              <b>Where.</b> One post in <code>#models</code> whose first message is the list of packs. It moves to
              its own channel once the list is too long to scan, which I’d expect at around 25 packs.
            </li>
          </ul>
          <p>There’s no leaderboard and no overall winner. Each pack is one person’s use case.</p>

          <details className="more">
            <summary>Keeper credits and staff’s role</summary>
            <ul>
              <li>
                <b>Keeper credits (a proposal).</b> On a big release each keeper gets a small credit to repack their
                pack. They wrote the prompts, so they judge the answers. The tool’s default budget is $1 a test, so
                ten keepers is about $10 a release.
              </li>
              <li>
                <b>What staff do.</b> Give out the pack keeper role and the credits. Add new packs to the list in
                the first message of the thread.
              </li>
              <li>
                <b>What staff don’t do.</b> Declare a winner. Results come from members, so nobody can say OpenRouter
                is ranking models or favouring one.
              </li>
            </ul>
          </details>
        </section>

        <section id="seeding">
          <h2>3. Seeding</h2>
          <p>
            Weeks 1 and 2 are replies to real debates. I built a pack for three real messages and drafted the
            replies (none posted). Each one answers the question first, since people who pitch tools here get shut
            down. They’d go out from my staff account, so it’s clear who is posting.
          </p>
          <Seed s={SEEDS[0]} />
          <details className="more">
            <summary>Two more seeds, from #providers and #discussion</summary>
            {SEEDS.slice(1).map((s) => (
              <Seed key={s.link} s={s} />
            ))}
            <p>
              Most seeds will be in the model threads. These two are elsewhere because nobody gave them a real
              answer. Pack prompts are left empty because the member’s own prompts are the point.
            </p>
          </details>
        </section>

        <section id="runs">
          <h2>4. How it runs</h2>
          <p>Seed in weeks 1 to 2, reach out in weeks 2 to 3, post in week 3 or 4.</p>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Week 1</th>
                  <th>Week 8</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Where</th>
                  <td>Replies in existing threads.</td>
                  <td>One post in #models, or its own channel.</td>
                </tr>
                <tr>
                  <th>Who makes packs</th>
                  <td>Me, one per debate.</td>
                  <td>Members. Keepers repack on each release.</td>
                </tr>
                <tr>
                  <th>Repack Day</th>
                  <td>Hasn’t happened yet.</td>
                  <td>A script posts the call and keepers follow up.</td>
                </tr>
                <tr>
                  <th>Who replies to packs</th>
                  <td>Me.</td>
                  <td>Keepers and other members, with me and the DevRel team.</td>
                </tr>
                <tr>
                  <th>My time</th>
                  <td>Daily, writing seed replies.</td>
                  <td>About two hours a week.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <ul>
            <li>
              <b>Automated.</b> Packs and result cards come from the tool. A script watches OpenRouter’s public model
              list and posts the Repack Day call.
            </li>
            <li>
              <b>Human.</b> Seed replies, outreach, rerunning and replying to new packs (me and the DevRel team),
              picking keepers, granting credits, keeping the list current, moderation.
            </li>
            <li>
              <b>Member-owned.</b> The packs, repacks and results. By week 8, keepers lead Repack Day.
            </li>
            <li>
              <b>If I’m away a week,</b> posting and repacking carry on, the script makes the release call, and the
              DevRel team and keepers keep replying to new packs. The list and new keepers wait. Credits need a
              second staff member who can grant them.
            </li>
          </ul>

          <details className="more">
            <summary>Week by week</summary>
            <ol className="timeline">
              <li>
                <b>Week 0.</b> Ship the tool changes in section 8.
              </li>
              <li>
                <b>Weeks 1 to 2: seed.</b> Reply to live debates with a pack built for each. No announcement yet.
              </li>
              <li>
                <b>Weeks 2 to 3: reach out.</b> Ask people who ran a seed pack, or already talk about their private
                bench, to turn it into a pack. Help if they want, and note what they want changed. Goal: five to eight
                member packs.
              </li>
              <li>
                <b>Week 3 or 4: post.</b> Once there are member packs to show, ideally when a new model is close.
              </li>
              <li>
                <b>Weeks 4 to 6: first Repack Day.</b> The first pack authors become keepers. Credits go out if
                approved.
              </li>
              <li>
                <b>Weeks 6 to 8: hand over.</b> Keepers lead Repack Day. I decide whether it gets its own channel.
                Between releases, a provider track (one model on four providers) for the “is it nerfed or is it the
                provider?” debates.
              </li>
            </ol>
          </details>
        </section>

        <section id="copy">
          <h2>5. The copy</h2>
          <p>
            When I read the server, <code>#general</code> was angry about billing, so the copy is plain, says I
            built the tool, and promises nothing that isn’t approved. I’d only name members who agree to it.
          </p>

          <h3>Launch announcement</h3>
          <p className="fine">Posted in #models. This message is also the list of packs.</p>
          <Message text={LAUNCH_POST} />

          <h3>Event promotion: the first Repack Day</h3>
          <p className="fine">
            Posted in the new model’s thread and the pack thread when the model reaches the API. It runs for
            48 hours.
          </p>
          <Message text={EVENT_POST} />
        </section>

        <section id="success">
          <h2>6. Success</h2>
          <p className="number">
            By week 8, <b>half of member packs</b> have a result posted by someone other than the author.
          </p>
          <ul>
            <li>For comparison, about 7% of showcase posts get any reply today.</li>
            <li>
              <b>First check, before the post:</b> at least three of my first ten seed replies get a result or a real
              reply. If not, I change the approach before posting.
            </li>
            <li>
              <b>What I’d change:</b> if packs get few reruns, I push for keeper credits and try a free way in, like
              posting four unnamed answers in Discord for people to vote on. If reruns come but few new packs, I build packs with people.
            </li>
          </ul>

          <details className="more">
            <summary>Other week-8 numbers</summary>
            <ul>
              <li>25 packs from at least 15 members.</li>
              <li>
                Half of pack authors are not top posters. Today ten people write 58% of #general and 71% of
                #discussion.
              </li>
              <li>Ten results in 48 hours on the first Repack Day.</li>
              <li>Three in ten authors posted a second pack or a repack.</li>
            </ul>
            <p>
              I’d count by hand once a week from what’s posted. The tool has no server or tracking, so I can’t count
              pack opens, and I’d keep it that way.
            </p>
          </details>

          <details className="more">
            <summary>What I’d change, in full</summary>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>If I see</th>
                    <th>It probably means</th>
                    <th>I would</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Seed replies get nothing</td>
                    <td>The tool doesn’t help with the debate</td>
                    <td>Ask regulars why and fix the tool before posting</td>
                  </tr>
                  <tr>
                    <td>Packs posted, few reruns</td>
                    <td>It costs too much or takes too long</td>
                    <td>Push for keeper credits, and try posting four unnamed answers in Discord for a vote</td>
                  </tr>
                  <tr>
                    <td>Reruns, few new packs</td>
                    <td>Making a pack is too hard</td>
                    <td>Build packs with people and offer starter packs to repack</td>
                  </tr>
                  <tr>
                    <td>Only top posters take part</td>
                    <td>It looks like it’s only for regulars</td>
                    <td>Invite showcase posters to make a pack from their project</td>
                  </tr>
                  <tr>
                    <td>Someone starts a standings sheet</td>
                    <td>It’s turning into a leaderboard</td>
                    <td>Repeat that packs can’t be compared, and keep staff out of it</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <section id="beyond">
          <h2>7. X and Reddit</h2>
          <ul>
            <li>
              <b>Packs go anywhere.</b> A pack is a link, so it can be posted on any site. The result card can be
              copied as an image and pasted straight into a post.
            </li>
            <li>
              <b>X.</b> After each Repack Day, OpenRouter posts which packs the new model won and lost, with a pack
              link anyone can rerun. Members can use the “Share on X” button already on the result card.
            </li>
            <li>
              <b>Reddit.</b> The same debates happen in Reddit threads every time a model drops: is it benchmaxxed,
              is it nerfed, which provider. I’d reply in those threads with a pack for that model, the same way I
              seed in Discord. Anyone with an OpenRouter key can run it, and the Discord pack thread is where they
              post what they got.
            </li>
          </ul>
        </section>

        <section id="tool">
          <h2>8. Not built yet, and open questions</h2>
          <details className="more">
            <summary>Tool changes before the public post (not built)</summary>
            <ul>
              <li>
                <b>Swap-in link.</b> Opens any pack with a new model in one slot, so a repack is one click.
              </li>
              <li>
                <b>One-line result</b> you can paste into Discord as text.
              </li>
              <li>
                <b>Prompts as plain text,</b> readable before you connect a key.
              </li>
              <li>
                <b>Public pack warning.</b> Anyone with the link can read the prompts, so no customer data or keys.
              </li>
              <li>
                <b>Release script</b> that posts the repack call when a model shows up on the API.
              </li>
              <li>
                <b>Maybe later, a CLI.</b> If seeding and outreach show people want one, that’s a future campaign.
              </li>
            </ul>
          </details>
          <details className="more" id="limits">
            <summary>What I haven’t checked</summary>
            <ul>
              <li>
                I sampled the big threads. The counts are thread totals; what I say people do comes from the most
                recent few hundred messages in each.
              </li>
              <li>I don’t know if OpenRouter can grant credits to specific accounts.</li>
              <li>The targets are mine, set against this server’s numbers. Two hours a week is an estimate.</li>
              <li>I’d read the server again before posting anything.</li>
            </ul>
          </details>
        </section>
      </main>

      <footer className="foot">
        Part 2 of a take-home for OpenRouter. Part 1 is the <a href="/">blind taste test</a>;{' '}
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          read the code
        </a>
        .
      </footer>
    </div>
  )
}
