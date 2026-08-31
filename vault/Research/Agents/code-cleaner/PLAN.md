# Code Cleaner Agent — Plan

## Context

Adam wants a reusable Claude Code subagent that drives a codebase toward a fixed
set of quality thresholds. The original spec was a flat list of hard numbers
(100% coverage, CRAP < 25, 0 surviving mutants, 0 redundant code, LOC/file < 500,
cc < 22, …). The concern he raised: is enforcing this feasible, or does it
produce a destructive agent that mangles good code to satisfy counters?

To answer that we studied a real, representative codebase —
`forageopen/forage-library` (local clone at
`OneDrive/Documents/Claude/forage library`, read only, nothing committed or
pushed). It is a ~50k-token client-side JS app: 37 non-test source files, ~5,090
LOC, a `node --test` unit suite (~1,660 LOC) over the pure-logic modules, no
coverage or mutation tooling, DOM/Worker/canvas layers verified in a real browser
instead (documented deliberately in `doc/RETROSPECTIVE-VERIFICATION-STRATEGY.md`).

### What the case study showed, metric by metric

| Metric | Behaviour on forage-library | Verdict |
|---|---|---|
| **Module token budget < 180k** | Whole client JS **+ tests** ≈ 65k tokens. Passes with 2.5–3x headroom, and correctly says "this codebase *is* reason-about-able in one pass." | **Good hard gate.** Could even tighten to ~90–120k. |
| **LOC/file < 200** | Fails on 6 files; `viewer-pane.js` (1,141) fails 5.7x. That file is one `createViewerPane` factory closing over ~30 DOM refs + ~15 mutable state vars + ~40 inner fns. Splitting it means threading a ~45-field context object (or class) through 6 files — abstraction with no correctness or readability gain. `document-model.js` (415) *does* split cleanly (token path / DOM path). Metric is right ~30% of the time here, harmful ~70%. | **Advisory only.** Report, never block. |
| **Cyclomatic < 8** | Flags ~5 of 14 functions in the clean, tested, pure `document-model.js` alone — nearly all flat `switch(token.type)` / `if (tag === …)` dispatch, where cc inflates but the code is trivial to read. "Fix" = convert to lookup tables; sometimes clearer, often just relocates branching into data. | **Miscalibrated at 8.** Either raise to ~12 or make advisory. |
| **Cognitive < 15** | Flags only the 2 genuinely gnarly functions (nested blockquote loop in `appendElementBlocks`; nested-callback-loop-try in `ensurePdfPhotoOverlays`). Leaves the flat dispatch alone. | **This is the right complexity gate.** |
| **Halstead difficulty < 80** | Nothing in the codebase approaches it. Silent. | Keep — cheap, catches only true monsters. Expect no hits. |
| **CRAP < 25** | Needs coverage, which doesn't exist. 10 files (incl. the 3 biggest) have zero tests by design. CRAP on `viewer-pane.js`'s cc-15 click handler at 0% ≈ 240. Satisfying it means jsdom tests for DOM glue — and the project's own bug log shows a jsdom-only suite "would report green for every bug actually shipped." | **Only meaningful once a unit is chosen for unit-testing.** Scope to modules that already have a test file. |
| **Mutation: 0 survivors** | Same, amplified. Fine for `document-model.js` etc. Not achievable for the DOM layer without heavy brittle mocking — and that is exactly where the oracle problem bites ("correct behaviour of `applyDocView` for a PPTX in dark mode" is a product decision). | Measured + reported for already-tested modules only. Never drives new tests. |
| **`any` / `unknown` = 0** | Vacuously passes: zero TypeScript, no tsconfig. Measures nothing; the real type risk (untyped `marked` token trees, DOM node shapes) is invisible to it. | **Hard gate in TS projects only.** No-op elsewhere — don't report it as "passing." |
| **Dead code / redundant = 0** | A few small real hits (local `escapeHtml`, repeated progress-bar guard blocks). `knip` + `jscpd` give a short honest list. | Keep as hard gate, backed by concrete tooling + a duplication threshold. |

### Overall feasibility verdict

- Applied as **hard auto-fix gates** to this real codebase, the original spec
  would trigger a large refactor of `viewer-pane.js` and the DOM layer, most of
  it driven by the **three most miscalibrated metrics** (LOC/file, cyclomatic<8,
  CRAP), much of it making the code more abstract without making it more correct
  or readable. That is the "destructive agent" risk, and it is real.
- The metrics that behave well here: **module token budget, cognitive
  complexity, Halstead, dead-code/duplication with real tooling.**
- The genuinely high-risk move is coupling **coverage / 0-surviving-mutants to
  agent-authored tests** on an integration layer — a codebase can rationally
  decide *not* to unit-test that layer (forage-library did, on evidence), and an
  agent chasing the number there writes tests that are worse than none.

### Design conclusions carried into the agent

- **Audit first, fix one module at a time, never author a behavioural oracle.**
- Re-tier the gates (below) so the well-behaved metrics block and the proxies
  only inform.
- CRAP + mutation are computed **only for modules that already have a test
  file**; for an untested module the agent reports "looks like pure logic, no
  tests — candidate for unit testing" and stops, and respects a project that
  declares a two-layer (unit + in-browser) strategy.

## Thresholds (re-tiered)

| Check | Rule | Tier |
|---|---|---|
| Module token budget | < 180k tokens, whole module (excl. generated/vendored) | **hard gate** |
| Cognitive complexity | < 15 per function | **hard gate** + escape hatch |
| Halstead difficulty | < 80 per function | **hard gate** (expected silent) |
| Dead code | 0 (`knip` / `ts-prune` / coverage-confirmed) | **hard gate** |
| Duplication | no `jscpd` clone > 50 tokens / 5 lines | **hard gate** |
| `any` / `unknown` | 0 | **hard gate — TS projects only**; N/A (not "pass") elsewhere |
| Cyclomatic complexity | < 12 per function | **gate at 12**, report the 8–12 band |
| CRAP | < 25 per method | gate **only for modules with an existing test file** |
| Mutation | 0 survivors on public surface + core logic | measured + reported for already-tested modules; never drives new tests |
| Coverage | measured, reported, feeds CRAP | **not gated** |
| Lines of code per file | < 200 | **advisory** — reported, never blocks |
| Behavioural assertions | human-owned; agent reports gaps, never invents an oracle | **invariant** |

Escape hatch: `// complexity-exempt: <reason>` on a function suppresses the
cognitive/cyclomatic gate for it; every exemption is listed in the audit report
for Adam's sign-off.

## Deliverable

- `C:\Users\Adam\.claude\agents\code-cleaner.md` — global agent, TS/JS toolchain
  by default, detects and adapts for other stacks, says "cannot measure X here"
  rather than guessing.
- `C:\Users\Adam\.claude\agents\code-cleaner.thresholds.md` — the table above as
  the single source of truth, tunable without touching the agent prose. Includes
  the per-metric calibration notes from the case study so the numbers aren't
  re-litigated from scratch later.

No repo code is touched by this task; the agent operates per-invocation on
whatever project it runs in.

## Agent design

### Two modes

1. **`audit`** (default, strictly read-only)
   - Detect toolchain, test strategy (`unit` vs declared `two-layer`), and which
     analyzers are available.
   - Run every available analyzer; for anything unmeasurable emit an explicit gap
     line ("no mutation testing configured"), never a silent pass.
   - Report: per-module token count; per-function cognitive/cyclomatic/Halstead
     with the hard-fail set separated from the advisory band; dead code; `jscpd`
     clones; `any`/`unknown` (TS only); CRAP and mutation survivors **for tested
     modules only**, with untested-but-pure modules listed as unit-test
     candidates; every `complexity-exempt`; per-file LOC as an advisory appendix.
   - Zero edits, installs, or config changes.

2. **`fix <module> [--only <metric-class>]`**
   - Exactly one module per invocation.
   - Structural refactors only: extract function/predicate, dispatch tables,
     split a file *when the pieces are genuinely independent* (the
     `document-model.js` case, not the `viewer-pane.js` case), delete dead /
     duplicate code, tighten types off `any`/`unknown`.
   - May add test scaffolding and characterization tests **explicitly labelled
     golden-master**, but must not author an assertion of expected behaviour that
     doesn't already exist or that Adam hasn't confirmed. An uncoverable-without-
     an-oracle branch is reported, not guessed.
   - Re-runs the audit for that module, shows before/after.
   - Leaves a summary of every judgement call (each new exemption, each
     characterization assumption, each file split and why it's safe).

### Missing tooling

`fix` installs/configures a missing analyzer **only** with `--setup-tooling`;
otherwise it reports the gap and stops. Per Adam's standing preference, tooling
setup backs up each touched config file first and states the rollback path.

### Guardrails baked into the agent prose

- Never `fix` more than one module; never present a diff larger than one module.
- Never author behavioural assertions; never chase coverage/mutation on a module
  the project's declared strategy says is verified in-browser.
- Prefer leaving a large cohesive closure intact over splitting it to hit
  LOC/file (advisory anyway).
- Always surface exemptions, characterization assumptions, and file splits.
- Mutation runs are time-boxed; report partial results rather than block.

## Open defaults (change on review)

- Module token budget: **180k**. Case study suggests **120k** would still pass
  forage-library comfortably and be a stronger "fits with room for the task"
  guarantee — flagged for Adam's call.
- Cyclomatic gate: **12** (was 8; 8 proven miscalibrated on dispatch code).
- Cognitive gate: **15**.
- `jscpd`: **50 tokens / 5 lines**.
- Escape hatch: **enabled**.

## Verification

1. Create the two files.
2. `audit` against `forage library` (the case-study repo) and confirm:
   - module token budget passes with the reported headroom,
   - cognitive gate flags ~2 functions, cyclomatic advisory band lists the
     dispatch functions, Halstead silent,
   - `any`/`unknown` reported as **N/A (plain JS)**, not "0 / passing",
   - CRAP/mutation reported only for modules with a `.test.mjs`, and
     `viewer-pane.js` / `app.js` / `ribbon.js` listed as in-browser-verified per
     the retrospective, not as coverage failures,
   - LOC/file appears only in the advisory appendix,
   - zero edits made.
3. `audit` against a TS project (`Desktop\apps\video-recorder`) and confirm the
   `any`/`unknown` gate is now live and the TS complexity tooling runs.
4. `fix <a small pure module> --only complexity` and confirm the diff is confined
   to that module, before/after audit shown, judgement calls listed.
5. `fix` without `--setup-tooling` refuses to install and reports the gap.

## Not doing

- No CI wiring, pre-commit hook, or scheduled runs (later, via `update-config`).
- No whole-codebase enforcement pass.
- No changes to the forage-library repo — study only.
