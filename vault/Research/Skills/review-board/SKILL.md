---
name: review-board
description: Runs the FRD Review Board — invokes all four Tier-A domain custodians (obgyn-custodian, pharmacology-custodian, bioinformatics-custodian, biotechnologist-custodian) against a hypothesis in parallel, aggregates their verdicts under a strict rule, and persists the result as a real `review` node linked from the hypothesis. Implements the "REVIEW BOARD" node from ADR-021's own pipeline diagram, deferred until enough custodians existed to make aggregation meaningful. Use when asked to "review", "run the review board on", or "aggregate custodian verdicts for" a specific hypothesis.
---

# FRD Review Board

Aggregates the four proven Tier-A Domain Custodians' independent, jurisdiction-bounded verdicts on one hypothesis into a single `Review Status`. This is orchestration, not a new reviewer — it never opines on a hypothesis's content itself; it only invokes the real custodians and merges what they say.

## Steps

**1. Read the hypothesis and its evidence trail directly.** Given a hypothesis id (argument to this skill, or ask which hypothesis if not given — this is a case where guessing which hypothesis to review would be wrong, not a reversible call to make silently):
   - `data/graph/hypothesis/<id>.md` — the hypothesis node itself (candidate-chain fields: target/ingredient/delivery/mechanism/risk, prior/posterior).
   - Follow its `links` where `relation == "has_evidence"` to `data/graph/evidence/<target_id>.md` for each linked evidence record.

**2. Invoke all four Tier-A custodians in parallel — one message, four `Agent` tool calls**, each given the hypothesis id and told to read the real files themselves (don't paraphrase the hypothesis into the prompt as a substitute — every custodian's own instructions already require reading real data, per `.ai/rules/CUSTODIAN-REVIEW-PROTOCOL.md`):
   - `obgyn-custodian` (Clinical Custodian)
   - `pharmacology-custodian`
   - `bioinformatics-custodian` (Computational/System Custodian)
   - `biotechnologist-custodian` (Biotechnology Custodian)

Each returns its fixed 9-field structure: CLAIM, DOMAIN, EVIDENCE, CONFIDENCE, ASSUMPTIONS, CONFLICTS, MISSING VARIABLES, RISKS, RECOMMENDATION (Accept/Revise/Reject/Escalate).

**3. Aggregate under the strict rule** (`.ai/DECISIONS.md`, explicit user decision — not a Builder judgment call):
- Any custodian returns **Reject** or **Escalate** → aggregated status **`BLOCKED`**.
- Else, any custodian returns **Revise** → aggregated status **`NEEDS REVISION`**.
- All four return **Accept** → aggregated status **`ACCEPTED`**.

If a custodian's DOMAIN field says the claim is outside its jurisdiction (a valid, complete review per its own hard limits), that custodian's RECOMMENDATION is excluded from the aggregation, not treated as a missing Accept — note this explicitly in the review node if it happens.

**4. Write a new `review` node** at `data/graph/review/<review-id>.md` (generate `<review-id>` as `review-<hypothesis-id-suffix>-<YYYYMMDD>`, matching the existing `hyp-`/`ev-` id conventions). Frontmatter shape (matches the generic `Node` schema, `sidecar/models.py` — no schema change, `variables` is the designed escape hatch, ADR-008):

```yaml
id: review-<...>
schema_version: '1'
node_type: review
title: Review of <hypothesis title>
variables:
  hypothesis_id: <hypothesis id>
  aggregated_status: ACCEPTED | NEEDS REVISION | BLOCKED
  reviewed_at: <ISO 8601 UTC timestamp>
  custodian_verdicts:
    - custodian: obgyn-custodian
      recommendation: Accept | Revise | Reject | Escalate | Out-of-jurisdiction
      confidence: High | Medium | Low | Unknown
      claim: <one sentence>
      summary: <1-3 sentence summary of its finding>
    - custodian: pharmacology-custodian
      ...
    - custodian: bioinformatics-custodian
      ...
    - custodian: biotechnologist-custodian
      ...
links: []
provenance: null
created: <ISO 8601 UTC timestamp>
---

<Full per-custodian detail in the body — enough that a human reading just this
file understands each verdict without needing the original agent transcripts.>
```

**5. Link the hypothesis to the review.** Edit `data/graph/hypothesis/<id>.md`'s `links` list, appending `{target_id: <review-id>, relation: has_review}` — mirrors the existing `has_evidence` link direction exactly, so a future `hypothesis_get` extension (Phase 2, separate task) can walk it the same way it already walks evidence links.

**6. Log the run to `.ai/reviews/REVIEW.md`** (newest-first, matching every custodian's own first-run entry this session) — what was reviewed, each custodian's verdict in brief, the aggregated status and why, and an assessment of whether the Review Board mechanism itself worked as designed (did it catch something, did custodians converge or diverge, anything surprising).

**7. Update `.ai/state/CURRENT.md` and `PROGRESS.md`** per `DEFINITION-OF-DONE.md`'s existing "update project state" step — this closes real open items if `bioinformatics-custodian`/`biotechnologist-custodian` are getting their first proof runs as part of this.

## Hard limits

- This skill orchestrates; it never generates its own opinion on the hypothesis's clinical/biological/computational content. If all four custodians say Accept, the aggregated status is ACCEPTED even if something about the hypothesis still seems off to you — that's a future Safety Custodian/Tier B Cross-Domain Reviewer's job (both still unbuilt, ADR-021), not this skill's.
- Never edit a custodian's own verdict when aggregating — quote/summarize faithfully, don't soften a Reject into a Revise or round a Low confidence up.
- Never invent a fifth "virtual" custodian opinion to fill a gap if a custodian call fails — report the failure and either retry that one custodian or aggregate with a noted gap, never silently proceed as if it said Accept.
