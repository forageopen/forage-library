# Output templates

Fixed shapes for each mode. Every deliverable ends with the Custodian footer from
`malaysian-media-law-custodian.md`.

---

## `assess` — exposure map

```
# Exposure assessment — <short label> — <date>

## 0. Outside the corpus
<the "Outside the corpus" block if any non-corpus law is engaged; else "None identified.">

## 1. What is being assessed
- Communication / conduct: <verbatim or precise description>
- Procedural stage: <from intake>
- Assessment requested: <what the client wants to know>

## 2. Laws potentially engaged
### In the corpus
| Provision | Offence / cause | OCR grade | First read |
### Not in the corpus (cannot analyse here)
| Law | Why it may apply |

## 3. Element-by-element
For each provision:
### <Act> s.<n> — <name>   [OCR grade, vintage flag]
- Corpus text: <quote, with quality flag>
- Elements:
  | Element | Client's facts | Met? | Turns on |
- Prosecution's easiest element to prove: <>
- Prosecution's hardest: <>
- Defences / constitutional angle: <Article 10(1)(a) framing; 10(2) grounds; statutory defences> — each with what it depends on
- Evidence Act s.114A note: <if online content — the publication presumption is not in the corpus and likely applies>

## 4. Enforcement routes
- Criminal prosecution: <prospect + note that prosecutorial discretion / selective enforcement is the largest real-world variable and is not captured by the element analysis>
- MCMC administrative: <a content-removal direction or Content Code complaint can land with no charge>
- Civil: <defamation exposure if a person / small class is identifiable — see `demand`, non-corpus>

## 5. Points I could not assess
<unreadable provisions, missing facts, case-law-dependent elements, non-corpus laws>

## 6. Ten steps ahead
<the worksheet, filled, for the client's contemplated action or for "do nothing">

## 7. What the custodian flags
- Lowest-exposure step available: <>  (not "safe" — lowest-exposure)
- What to avoid, and why (with the downstream chain): <>
- What only counsel can decide: <>

<Custodian footer>
```

---

## `review` — pre-publication filter

```
# Pre-publication review — <label> — <date>

## 0. Outside the corpus
<non-corpus laws engaged; else "None identified.">

## Draft (verbatim)
<the draft>   + medium / audience / procedural stage

## Subject-matter risk
<is the topic itself ordinary protected discourse, or inherently high-risk? one line + why>

## Framing risk
<what in the wording creates exposure — asserted imputation, state-of-mind claim,
named/small-class target, communal reading, forfeited defence>

## Classification: BLACK / RED / YELLOW / GREEN
<one line — apply the threshold test, not "touches a provision">

## Why
- WHO does this point at? <idea / system / policy / institution / named person / small class / protected office>
- WHAT does it assert as fact about them? <the imputation — fact vs comment>
- WHAT LAW could apply? <corpus provisions + non-corpus flags>
- WHAT EVIDENCE does the client hold, and does it support the assertions (vs only the subject)? <>
- Could it read as a criminal or defamatory allegation on a hostile reading? <>

## Element-by-element (corpus provisions engaged)
<abbreviated form of the assess §3 block for each provision with a realistic prospect>

## Line-by-line
| Passage | Concern | Rework toward (direction for counsel — NOT final copy) |

## Enforcement routes
- Criminal: <prospect + note on prosecutorial discretion>
- MCMC administrative: <a content-removal direction / Content Code complaint can arrive with no charge>
- Civil: <defamation exposure if a person/small class is identifiable — see `demand` mode, non-corpus>

## Points I could not assess
<case-law-dependent elements, missing facts (posting history especially), non-corpus laws, unreadable provisions>

## Ten steps ahead — "publish as drafted"
<the worksheet, filled>

## Preservation
Before any publication: archive the draft, the source list, and this reasoning
(dated, unaltered). The client's own framework (§6) calls for a "constitutional
record" — it starts now, not after a complaint.

## Residual decision
This review classifies risk. It does not clear the draft. The publish decision is
the client's and counsel's. If BLACK or RED: instruct counsel before publishing.

<Custodian footer>
```

Classification key — apply the **threshold test**: "is there a *realistic
prospect* of a charge, a letter of demand, or an administrative direction",
**not** "does the wording touch a provision" (almost any pointed political post
touches CMA s.233 or the Sedition Act on its face).
- **BLACK** — realistic prospect: an asserted factual accusation of crime,
  corruption, or deliberate bad faith against a named person or a small
  identifiable class; a threat or incitement; content on the Rulers, or a
  communal / religious attack; an allegation that police / prosecutors / courts
  fabricated evidence; disclosure of possibly-protected government information.
  **Stop; counsel before publishing.**
- **RED** — a serious factual allegation about a person or institution, or policy
  criticism pushed to a factual accusation of deliberate wrongdoing, where the
  target is diffuse or the imputation is arguably opinion ("this minister
  deliberately designed this to harm people"). Rework toward system/policy
  framing or hold for review.
- **YELLOW** — idea / system / policy / institution analysis, no named-person
  factual accusation. Tighten fact vs observation vs inference vs opinion vs
  prediction vs allegation labelling. Publishable at the client's own risk.
- **GREEN** — no target, no serious factual imputation. Low risk. Still not a
  clearance.

---

## `brief` — provision digest

```
# Brief — <Act> s.<n> <name> — <date>

## Corpus text  [OCR grade | reprint vintage: amendments to 1 Jan 2006]
<quote>

## Elements
<numbered>

## Penalty (as in the corpus — verify)
<quote> — flagged: penalty figures in this Act have <likely / certainly> changed since 2006

## Front-line facts (web check where possible — else "unverified")
- Arrestable / seizable: <>
- Bailable: <>
- Limitation period: <>
- Compoundable: <>

## Related provisions
<in-corpus cross-refs, flagged if from a Grade D file>

## Likely position now (web check — <domains checked>)
<what a check of lom.agc.gov.my / mcmc.gov.my indicates has changed; or "not checked / source unreadable">

## Verify before relying
<list>

<Custodian footer>
```

---

## `demand` — civil defamation lane

Runs largely **outside the corpus** (Defamation Act 1957, common law). Output
leans hard on "instruct counsel".

```
# Defamation review — <label> — <date>

## 0. Outside the corpus
This matter is governed by the Defamation Act 1957 and common law, neither in the
corpus. The below is orientation only; a Malaysian defamation practitioner must
review before the client acts or replies.

## Posture
- Client is: potential DEFENDANT (published something) / potential PLAINTIFF (something published about them)
- If a letter of demand has been received: from whom, dated, response window, demands made

## The statement
- Verbatim words · where published · by/to whom · when · still up?

## Identification
<is the client / the target individually identifiable, or only as a class?>

## Imputation
<what it means to a reasonable reader · fact or comment>

## Defences potentially in play (all non-corpus — for counsel)
| Defence | Fits here? | Depends on |
| justification / truth | | |
| fair comment on a matter of public interest | | |
| qualified privilege | | |
| responsible-publication (Reynolds-type) privilege | | |
| offer of amends | | |
| apology in mitigation | | |

## If replying to a demand
- Risks of replying without counsel · risks of apologising (admission) vs not
- Preservation steps
- Any reply produced here is "DRAFT — for counsel review" only

## Limitation
<non-corpus — verify>

<Custodian footer>
```

---

## `matrix` — prosecution element matrix

Table layout adapted from `Law Legal Protection.md` §6.D (client input, not
authority). Every element also gets a case-law flag.

```
# Prosecution matrix — <charge / allegation> — <date>

| Limb / element | Exact evidence the prosecution needs | Statutory element (Act s.n) | Client's response | Constitutional / defence angle | Easiest or hardest to prove |

## Questions to force the prosecution to answer
<the "which exact communication / which words / which limb / where is the intent" set>

## Weakest link in the prosecution case
<the element least supported by the facts as known>

## What the client must NOT do
<statements/actions that would supply a missing element or an admission>

<Custodian footer>
```
