# Malaysian Media Law Custodian

A Claude Code subagent that does **structured issue-spotting and risk triage**
for a client's exposure under Malaysian media, speech, content, defamation,
sedition and communications law. It works from the **COMMANDER / DATASETS /
Malaysian Acts** corpus.

It produces **risk maps and questions for a lawyer** — never "you're fine"
verdicts, never final court/police/press copy. It is an **internal tool for
whoever advises the client**, not a client-facing service, and not a substitute
for a Malaysian advocate & solicitor.

## Honest scope — what this is and isn't

**Is:** a discipline harness. It forces element-by-element analysis, an explicit
"what I could not assess" section, a ten-steps-ahead chain before any
recommendation, and a hard separation between "the corpus says X" and "the law
is X". On the dogfood run it did competent issue-spotting on a policy-criticism
post — the right provisions, the right weak points, the right questions for
counsel.

**Isn't:** a "virtual legal partner", despite the name. Three structural limits:

1. **No case law.** Malaysian speech law is mostly about how courts have read
   "seditious tendency", "offensive in character", fair comment, Article 10(2)
   proportionality. The agent marks every one of those "turns on case law, not in
   the corpus" — it can spot the issue but resolve none of them.
2. **A thin, stale, mis-labelled corpus.** "Media law" overstates it — the corpus
   has no PPPA 1984, no Defamation Act, no Film Censorship Act, and half its files
   (Companies Act 1965, Education Act, Employment Act, Income Tax Act…) aren't
   media law at all. What it has that matters — CMA, Penal Code, Sedition,
   Copyright, Evidence — is frozen at 2006 and partly OCR-mangled.
3. **Nothing here is lawyer-verified.** The corpus manifest, the "what changed
   since 2006" notes, the defence lists — all of it is a non-lawyer model's
   training-time recollection. Some is probably imprecise.

Treat its output as a well-organised first pass that tells a Malaysian lawyer
where to look — not as an answer.

**Operator note:** offering this to a paying client as "legal advice" or a
"virtual legal partner" may engage the Legal Profession Act 1976 (unauthorized
practice). Get advice on that framing before making it a service.

## Read this first — the corpus has real limits

The 18 Acts in `COMMANDER/DATASETS/Malaysian Acts/` are official reprints
**frozen at 1 January 2006** — about 20 years stale — and the OCR quality varies.
Findings from going through them:

1. **Three files are materially OCR-degraded** — `Communications and Multimedia
   Act 1998`, `Companies Commission of Malaysia Act 2001`, `Criminal Procedure
   Code (Revised 1999)`. Digits are stripped (`(1)` → `()`, `1968` → `968`) and
   whitespace is collapsed (`liabletoafinenotexceeding…`). **CMA 1998 — the most
   important media-law Act — is one of them.** Subsection numbers and penalty
   figures in these files cannot be trusted without checking the official source.

2. **Everything is pre-2006.** Not in the corpus, and central to media work
   (dates/scope below are pointers to verify, not settled facts):
   - **Evidence Act s.114A** — the online-publication presumption, decisive in
     almost every content prosecution
   - **Sedition Act post-2006 amendment(s)** — heavier penalties, online reach,
     court powers over online material
   - **CMA 1998 post-2006 amendments** — including a substantial 2024–2025 package
   - **Copyright Act post-2006 amendments** — the ISP / takedown / DRM regime

3. **Whole laws are missing.** No **Printing Presses and Publications Act 1984**
   (the core print-media statute), no **Defamation Act 1957** (civil defamation —
   the corpus has only criminal defamation in the Penal Code), no **PDPA 2010**,
   no **Film Censorship Act 2002**, no **Official Secrets Act 1972**, no
   **Companies Act 2016** (the 1965 Act in the corpus is repealed).

4. **No case law, no Federal Constitution text, no MCMC subsidiary instruments.**

The agent is designed to handle all of this: it grades every file, flags every
stale or degraded citation, declares missing laws at the top of every
deliverable, and routes anything consequential to counsel. `corpus-manifest.md`
and `corpus-gaps.md` are where that knowledge lives.

**If this corpus is going to be relied on for real client work, the priority
additions are:** PPPA 1984, Defamation Act 1957, PDPA 2010, Film Censorship Act
2002, and clean current-consolidated copies of the CMA 1998, Penal Code, Sedition
Act and Evidence Act from `lom.agc.gov.my`.

## Files

| File | Purpose |
|---|---|
| `malaysian-media-law-custodian.md` | The agent (system prompt + frontmatter). |
| `corpus-manifest.md` | Per-Act inventory: OCR grade, media-law tier, key provisions, what has changed since 2006. Agent reads it first, every run. |
| `corpus-gaps.md` | The media laws absent from the corpus and why each matters. |
| `client-intake-template.md` | What the agent must know about the client's situation before advising — exact words, procedural stage, targets, evidence, posting history. |
| `output-templates.md` | Fixed output shapes for each mode. |
| `example-review.md` | A worked `review`-mode run, kept as a reference. |

All five `.md` files except this README and `example-review.md` deploy together
to the agents directory — the agent reads the other four as siblings.

## Install

The agent must sit in a Claude Code agents directory. This folder is the editable
source; deploy with a copy:

```powershell
$dst = "$HOME\.claude\agents"
New-Item -ItemType Directory -Force $dst | Out-Null
Copy-Item "$HOME\Desktop\malaysian-media-law-custodian\*.md" $dst
```

Then **restart Claude Code** (or run `/agents`) so it registers. After that:

```
> use the malaysian-media-law-custodian agent to assess this post: "<verbatim text>"
> malaysian-media-law-custodian: review <draft>
> malaysian-media-law-custodian: brief CMA s.233
> malaysian-media-law-custodian: matrix — charge under CMA s.233(1)(a)
```

For one project only, copy the `.md` files into that project's `.claude/agents/`.

## Modes

- **`assess <communication | scenario>`** — full exposure map: every provision
  engaged, element-by-element against the client's facts, defences, enforcement
  routes (criminal / MCMC administrative / civil), and a ten-steps-ahead chain.
- **`review <draft>`** — pre-publication risk filter. Separates subject-matter
  risk from framing risk; classifies BLACK / RED / YELLOW / GREEN on a
  realistic-prospect threshold, not "touches a provision".
- **`brief <Act | section>`** — structured digest of a provision + front-line
  facts (arrestable / bailable / limitation) + a what-has-changed web check.
- **`matrix <allegation | charge>`** — prosecution element matrix and defence hooks.
- **`demand <statement | letter of demand>`** — the civil-defamation lane
  (Defamation Act 1957, outside the corpus — leans hard on "instruct counsel").
- **`intake`** — run the client intake and flag blocking unknowns.

## What it will not do

- Give a "this is legal" / "safe to publish" verdict — it produces a risk map;
  the decision stays with the client and counsel.
- Produce ready-to-send public statements, caution-interview answers, letters, or
  court filings — only "DRAFT — for counsel review".
- Predict outcomes, odds, or sentences.
- Treat its corpus (or any web source) as authority — every legally-operative
  point carries a "verify before relying" flag.
- Proceed on a paraphrase, or without knowing the procedural stage.

## Model

Set to **`sonnet`** in the frontmatter (matches the current default). This is
high-stakes reasoning — run it at high / xhigh effort, and if `opus` is available
on your plan, switch the `model:` line to it for the analysis modes.

## Status

Built 2026-08-31 against the COMMANDER corpus as it stood that day. Dogfooded
once (a `review`-mode test — see `example-review.md`); that run surfaced spec
contradictions (the `review` template was missing required sections, the BLACK
criterion was circular, the corpus-vs-web rule didn't cover an unreadable
source) and practitioner gaps (no civil-defamation lane, no prosecutorial-
discretion treatment, no MCMC-administrative route). All folded in. Not yet used
for a live matter. The corpus additions in the box above should happen before it is.

`example-review.md` is kept as a worked example; a few of its cross-references
(e.g. "the review template omits §4/§5") describe the pre-fix templates.

Benchmarked 2026-08-31 against `davila7/claude-code-templates` `legal-advisor`
(a GDPR/CCPA template drafter — different domain). Ours already led on honesty
about limits (corpus grading, "corpus is not the law" as structure) and scope
(never final copy vs. its "complete privacy policy + disclaimer footer"). One
idea borrowed: a consolidated **PAUSE — get human confirmation before
continuing** block after the prime directives, concentrating stop-criteria that
were spread across three sections. Not borrowed: final-document drafting,
footer-only disclaimers, or `Use PROACTIVELY` auto-firing.
