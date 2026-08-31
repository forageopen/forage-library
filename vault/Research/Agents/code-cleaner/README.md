# code-cleaner

A Claude Code subagent that measures a codebase against a fixed quality bar and,
on explicit request, closes one module's gaps at a time — without degrading good
code to satisfy a counter, and without ever becoming the author of what the code
is supposed to do.

## Files

| File | Purpose |
|---|---|
| `code-cleaner.md` | The agent definition (system prompt + frontmatter). |
| `code-cleaner.thresholds.md` | The numbers, the tiering, and the calibration rationale. Tune here — the agent reads it at the start of every run. |
| `PLAN.md` | Design doc: why each threshold is set where it is, the case study it was calibrated against, what was rejected and why. |
| `example-audit.md` | A real audit run (the `xd-to-figma` monorepo), kept as a worked example of the output format and of how the agent handles missing tooling. |

## Install

The agent has to live in a Claude Code agents directory to be loadable. This
folder is the editable source; deploy with a copy:

```powershell
Copy-Item "$HOME\Desktop\code-cleaner-agent\code-cleaner.md","$HOME\Desktop\code-cleaner-agent\code-cleaner.thresholds.md" "$HOME\.claude\agents\"
```

Then **restart Claude Code** (or run `/agents`) so the registry picks it up. After
that:

```
> use the code-cleaner agent to audit this repo
> code-cleaner: fix packages/ir --only complexity
```

For a single project instead of globally, copy the two files into that repo's
`.claude/agents/` directory.

## How it works

### Two modes

- **`audit`** (default) — read-only. Detects the toolchain, maps modules, runs
  every analyzer that's already installed, and reports where the codebase stands.
  Never edits, installs, or changes git state. Anything it can't measure is
  reported as an explicit **gap**, never a silent pass or a guessed number.
- **`fix <module>`** — structural refactors on **one** module: extract functions,
  delete dead/duplicate code, tighten types off `any`, split a file only when the
  pieces are genuinely independent. Never writes a test that asserts what a
  result *should* be. Re-audits the module and shows before/after.

### The tiers

| Tier | Metrics | Behaviour |
|---|---|---|
| **1 — hard gate** | module token budget < 180k · cognitive complexity < 15 · Halstead < 80 · dead code = 0 · duplication (no clone > 50 tok / 5 ln) · explicit `any` = 0 (TS only) | A violation blocks. |
| **2 — conditional** | CRAP < 25 · 0 surviving mutants | Only for modules that already have a test file. Never drives new agent-authored tests. |
| **3 — advisory** | cyclomatic (flag ≥ 12) · LOC/file < 200 · coverage % · explicit `unknown` | Reported, never blocks. |

### Why these numbers (short version)

The original spec asked for `cc < 8`, `LOC/file < 200` as a hard gate, `100%`
coverage, and `any`/`unknown = 0`. Tested against a real ~50k-token codebase
(`forageopen/forage-library`), three of those proved miscalibrated:

- **`cc < 8`** flagged flat `switch`/dispatch parsers where the number is
  inflated but the code is trivial to read. → cyclomatic is now advisory,
  gated at 12; **cognitive complexity < 15** is the real complexity gate (it
  flagged exactly the functions a reviewer would).
- **`LOC/file < 200`** would force a cohesive 1,100-line closure to be split into
  fragments that all need the same 45-variable context. → advisory only. The
  **module token budget** is the real "reason about it in one pass" cap.
- **`100% coverage` / `0 mutants`** on an integration layer pushes toward
  brittle jsdom tests that pass while real bugs ship. → conditional on a module
  already having tests; the agent never invents an oracle to move the number.

Full reasoning, per metric, is in `PLAN.md` and the notes in
`code-cleaner.thresholds.md`.

### Prime directives (never violated, either mode)

1. Never author an assertion of expected behaviour — 0 surviving mutants means
   nothing if the agent wrote both the code and the oracle.
2. `audit` makes zero changes.
3. `fix` touches exactly one module; cross-module work is reported, not executed.
4. Never degrade code to pass a gate — prefer a documented exemption.
5. Never install tooling without `--setup-tooling` (and then back up configs +
   state the rollback first).
6. `any` blocks, `unknown` doesn't; both are TypeScript-only.

## Per-project overrides

Drop a `.code-cleaner.json` at a repo root:

```json
{
  "moduleTokenBudget": 120000,
  "cyclomaticGate": 12,
  "test-strategy": "two-layer",
  "two-layer-verified": ["apps/desktop/**", "src/**/*.dom.ts"],
  "moduleRoots": ["src", "scripts"],
  "exclude": ["**/vendor/**", "**/*.generated.*"]
}
```

`test-strategy: "two-layer"` tells the agent that the listed paths are verified
in a real browser / integration harness, so it won't count coverage against them
or nag about missing unit tests.

## Status

Built and calibrated 2026-08-31. Dogfooded once against `xd-to-figma` (see
`example-audit.md`); that run surfaced six spec ambiguities, all since fixed in
`code-cleaner.md` / `code-cleaner.thresholds.md`. Not yet used in anger for a
`fix` pass.

Benchmarked 2026-08-31 against `davila7/claude-code-templates` `code-reviewer`.
Ours already led on rigor and scope discipline (calibrated thresholds, the
token-budget metric, the oracle-problem handling, the audit/fix split). Two
packaging ideas borrowed: **repo-size scaling in `audit`** (small → full; medium
→ deep metrics on Tier-1 + high-churn only; large → cheap metrics + ask which
module to deep-audit) and an explicit **`GATE: BLOCK / PASS`** line on the
report. Not borrowed: the per-language bug checklist (that's `/code-review`
scope) or the SOLID/DRY buzzword sections.
