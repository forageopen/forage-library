# Example audit — xd-to-figma

This is the first dogfood run of `code-cleaner`, 2026-08-31. It was executed by a
general-purpose Claude agent operating solely from `code-cleaner.md` +
`code-cleaner.thresholds.md` (the native `code-cleaner` subagent wasn't
registered yet), auditing `C:\Users\Adam\Desktop\apps\xd-to-figma` — a TypeScript
npm-workspaces monorepo.

Kept here as a worked example of:
- the report format,
- how the agent behaves when 4 of 6 hard-gate analyzers aren't installed (it
  reports gaps, never guesses or silently passes),
- the kind of real findings it surfaces (dead `capability-matrix.ts`, avoidable
  `as any` casts, a cross-package duplicated tree-walker).

**The run also surfaced 6 spec ambiguities** (see the "Spec followability note"
at the end). All 6 were fixed afterward in `code-cleaner.md` /
`code-cleaner.thresholds.md` — so a couple of details below (how `unknown` is
scored, the `### GAP:` heading under Tier 1, token budget over `.html`/`.css`)
describe the *pre-fix* behaviour. The findings themselves stand.

---

# code-cleaner audit — xd-to-figma — 2026-08-31

## Summary

**FAIL — explicit `any` in 2 modules (`packages/ir`, `apps/desktop`).** 4 of 6 Tier-1 metrics could not be measured (no analyzer installed) — reported as GAP, not pass. Module token budget: PASS for all 7 modules (largest is ~4% of budget). Test suite green (30/30), all 7 workspaces typecheck clean under `strict`.

Module boundaries used: the 7 npm-workspace packages, each with a `package.json` entry point — `packages/{xd-parser,ir,migration-package,figma-mapper,validation}`, `apps/desktop`, `apps/figma-plugin`. `migration-package` has a second public entry (`./deserialize` subpath). `scripts/` is **not** a module (no entry point) — measured for completeness only. No `.code-cleaner.json` at root → defaults apply (budget 180,000; cognitive 15; cyclomatic gate 12; jscpd 50 tok / 5 ln; `test-strategy: unit`).

Token estimate method: **chars ÷ 4** (no tokenizer library present — no `tiktoken`/`gpt-tokenizer` in the project).

Target is **not a git repository** (`git status` → "not a git repository") — noted, continued.

Read-only compliance: zero file edits, zero installs, zero git operations. `tsc --noEmit` and `vitest run` (no `--coverage`) were run; both write only to their own caches under `node_modules/`.

## Modules

| module | tokens | budget | status |
|--------|-------:|-------:|--------|
| packages/xd-parser | 2,898 | 180,000 | PASS |
| packages/ir | 8,259 | 180,000 | PASS |
| packages/migration-package | 1,675 | 180,000 | PASS |
| packages/figma-mapper | 3,507 | 180,000 | PASS |
| packages/validation | 3,869 | 180,000 | PASS |
| apps/desktop | 4,397 *(7,206 incl. index.html + style.css)* | 180,000 | PASS |
| apps/figma-plugin | 2,962 *(4,302 incl. ui.html; incl. build.mjs)* | 180,000 | PASS |

Non-module: `scripts/generate-synthetic-fixtures.mjs` — ~2,023 tokens. Whole-repo non-test source ≈ 27,600 tokens (TS/JS) / ≈ 31,750 (incl. HTML+CSS). Every module also passes the tighter 120,000 value from the thresholds notes (≥14× headroom).

## Tier 1 — hard gates

### PASS: module token budget
All 7 modules ≤ 4.6% of the 180,000 ceiling. Nothing close.

### FAIL: `any` (explicit annotations) — `packages/ir`, `apps/desktop`

Non-test source (3 sites):
- `packages/ir/src/schema.ts:234` — `export const IRNodeSchema: z.ZodType<any> = z.discriminatedUnion(...)`
  The intended type is `z.ZodType<IRNode>`; zod's recursive `z.lazy` discriminated union resists it (comment at lines 209–212 explains). Best fix is a **documented exemption**, not a blind `unknown` swap — see Exemptions.
- `apps/desktop/src/renderer/main.ts:90` — `(n as any).children.map(...)` inside `renderLayersTree`'s `renderNode`.
  Avoidable: the `hasChildren` guard on the line above (`"children" in n`) already narrows to the group/symbolInstance union members, whose `children` is typed.
- `apps/desktop/src/renderer/main.ts:127` — `const n = found.node as any;` inside `renderProperties`.
  Fix: discriminate on `found.kind` (`"artboard"` vs `"node"`) and use `IRArtboard` / `IRNode`, or split into typed branches.

Test source (informational — not counted against the source gate): ~19 `any` sites across 6 test files — `packages/ir/src/build.test.ts` (~11), `packages/figma-mapper/src/mapper.test.ts` (4), `packages/{validation/src/fidelity,ir/src/synthetic-fixtures,xd-parser/src/parser}.test.ts` and `apps/figma-plugin/src/pipeline.test.ts` (1 each). All are fixture-shaping casts (`as any` on partial IR nodes, `nodes: any[]` walker params).

### NEEDS HUMAN DECISION: `unknown` (explicit annotations)

~26 explicit `unknown` annotations in non-test source. **Every one is at a JSON / external-data boundary or in a generic serializer** — i.e. the type-safe choice the thresholds notes themselves endorse:
- `packages/xd-parser/src/types.ts` — 9× `[key: string]: unknown` index signatures + 4× `Record<string, unknown>` (deliberate modeling of the un-schema'd `.xd` object graph).
- `packages/xd-parser/src/manifest.ts` — `parseManifest(rootRaw: unknown)` (2,25,64,10), `packages/xd-parser/src/parser.ts:40` — `readJson<unknown>`.
- `packages/ir/src/build.ts:56,74` — `as Record<string, unknown>` when reading `raw.…meta.ux`.
- `packages/migration-package/src/hash.ts:4,8,11–13` — `canonicalStringify(value: unknown)` / `sortKeysDeep` (correct type for a JSON walker).
- `apps/desktop/src/renderer/main.ts:116` — `propRow(k: string, v: unknown)` (stringifies its arg).

Spec conflict (see followability note): the metric is named "`any` / `unknown`" @ 0, but the three tools it lists (`no-explicit-any`, `no-unsafe-*`, `tsc --strict`) flag only `any` and `any`-derived flows — none flags a deliberate `unknown`. Auto-failing these would penalize the code that is doing the right thing, against prime directive 4. **Reported for sign-off, not scored as FAIL.**

### GAP: cognitive complexity — not measured
No `eslint`+`sonarjs` and no `lizard` installed. This is the thresholds file's designated "real complexity gate" and it is dark. See advisory appendix for the functions a tool run should look at first (no numbers — not measured).

### GAP: Halstead difficulty — not measured
No `lizard -m` / `ts-complex` / `escomplex`.

### GAP: dead code — not measured (no `knip` / `ts-prune`)
Metric is a GAP. Manual `grep` (not a tool substitute — provisional) found exported symbols with **zero references repo-wide**:
- `packages/figma-mapper/src/transform.ts:41` — `export function identityAt(x, y)` — 0 references. Conceptually duplicates `IDENTITY_TRANSFORM` (`packages/ir/src/build.ts:24`).
- `packages/ir/src/capability-matrix.ts` — `CAPABILITY_MATRIX` (line 33) plus types `CapabilityEntry` / `CapabilityStatus` / `Evidence`, exported through the `ir` barrel, imported by **no consumer or test**. The file header's claim that the desktop UI is "checked against it" is stale — `apps/desktop/src/renderer/main.ts` builds its capability summary from `node.conversionStatus` counts. The whole file (66 LOC / ~1,987 tokens) is code-dead (a doc artifact in `.ts`).
- `packages/ir/src/schema.ts:98` — `export type IREffect` — 0 references (its `EffectSchema` source is used; the alias is not).
- `apps/desktop/src/renderer/main.ts:88` — `renderNode` inner arrow takes `depth`, threads it through recursion, never reads it. Unused parameter.

### GAP: duplication — not measured (no `jscpd`)
Metric is a GAP. Manual candidates a `jscpd --min-tokens 50 --min-lines 5` run would likely surface:
- Recursive "yield node then recurse `children`" walker repeated 5–6×: `walkNodes` (`packages/migration-package/src/build.ts:11`), `walk` (`packages/validation/src/fidelity.ts:23`), inline `walk` + `findInChildren` (`apps/desktop/src/renderer/main.ts:57,70`), inline child recursion in `packages/figma-mapper/src/mapper.ts:187` and `packages/validation/src/svg-renderer.ts:151`.
- `escapeXml` (`packages/validation/src/svg-renderer.ts:15`) vs `escapeHtml` (`apps/desktop/src/renderer/main.ts:112`) — near-identical entity-escape chains.
- `mimeFor` (`apps/desktop/src/main/index.ts:21`) copied verbatim into `apps/figma-plugin/src/pipeline.test.ts:16` and `packages/migration-package/src/build.test.ts:15`.

### N/A: none
Project is TypeScript — the `any`/`unknown` gate applies (it is not an untyped project).

## Tier 2 — conditional (tested modules only)

Modules with a test file: `xd-parser`, `ir`, `migration-package`, `figma-mapper`, `validation`, `figma-plugin`. Untested: **`apps/desktop`**.

### GAP: CRAP — not computed
Needs coverage data. No coverage provider installed (`@vitest/coverage-v8` / `-istanbul` absent); `vitest run --coverage` on v4 would trigger an install, which audit mode forbids. Cyclomatic input also unavailable (no tool). Both factors dark.

### GAP: mutation score — not computed
No `stryker.conf.*`, `stryker` not installed. Not scaffolded (audit mode).

### Unit-test candidates (pure logic, no tests)
- `apps/desktop/src/renderer/main.ts` — `nodeById`, `findInChildren`, `statusCounts`, `round`, `escapeHtml` are pure and testable, but currently inline in the DOM module. Extract-and-test candidates.

### Verified out-of-band (recommendation — no `test-strategy` declared)
- `apps/desktop` — DOM renderer + Electron-main IPC; not unit-testable without a browser/Electron harness.
- `apps/figma-plugin/src/code.ts` — the `figma.*` executor; not testable without the Figma runtime. `pipeline.test.ts` covers the pipeline up to this boundary.

The project declares no `test-strategy`, so these are not config-backed exemptions. **Recommend adding `.code-cleaner.json` with `test-strategy: "two-layer"` and `two-layer-verified: ["apps/desktop/**", "apps/figma-plugin/src/code.ts"]`** to make the intent explicit and stop future audits flagging them.

## Advisory appendix

### Cyclomatic ≥ 12
GAP — no `lizard` / `gocyclo` / eslint `complexity`. Not measured.

### Cyclomatic 8–11 (informational)
GAP — not measured.

### Files over 200 LOC (non-test source)
| file | LOC |
|---|--:|
| packages/ir/src/build.ts | 509 |
| apps/desktop/src/renderer/main.ts | 296 |
| apps/figma-plugin/src/code.ts | 292 |
| packages/ir/src/schema.ts | 274 |
| packages/figma-mapper/src/mapper.ts | 246 |
| packages/xd-parser/src/types.ts | 214 |

All are flat structures (schema declarations, dispatch switches, sequential IR-field assembly), not deep nesting. Per the thresholds notes this metric is advisory precisely because line count doesn't distinguish these from a knotted function. No split recommended on LOC alone.

### Coverage by module
GAP — no coverage provider. Not measured.

### Informal structure notes (eyeball only — NOT a measured metric, listed to prioritize a future cognitive-complexity run)
First places a tool should check: `convertText` and `convertShape` in `packages/ir/src/build.ts`; `mapNode` in `packages/figma-mapper/src/mapper.ts` (7-case switch, ~110 ln); `createLeafOrGroup` in `apps/figma-plugin/src/code.ts` (7-case switch, ~120 ln, per-case create + error handling); `renderNode` in `packages/validation/src/svg-renderer.ts` (per-shape image/no-image sub-branches); `renderProperties` in `apps/desktop/src/renderer/main.ts` (long node-kind if/else ladder). Most are flat dispatch — likely cognitive-OK, cyclomatic-noisy — but this cannot be confirmed without the tool.

## Exemptions (need human sign-off)

**None present.** `grep` for `complexity-exempt` across all source → 0 hits.

One should probably be added: `packages/ir/src/schema.ts:234` `IRNodeSchema: z.ZodType<any>` — zod cannot statically type a recursive discriminated union built with `z.lazy`; `z.ZodType<IRNode>` produces a circular-reference error. A `// complexity-exempt`-style annotation documenting the zod limitation is more honest than the bare `any`. Human decision required.

## Gaps (not measured)

| metric | why | tool that would measure it |
|---|---|---|
| Cognitive complexity | no analyzer installed | `eslint` + `eslint-plugin-sonarjs` (`sonarjs/cognitive-complexity`), or `lizard` |
| Halstead difficulty | no analyzer installed | `lizard -m`, `ts-complex`, `escomplex` |
| Cyclomatic complexity (Tier 3) | no analyzer installed | `lizard`, `eslint` (`complexity` rule) |
| Dead code | `knip` / `ts-prune` not installed | `knip` (preferred) or `ts-prune` |
| Duplication | `jscpd` not installed | `jscpd --min-tokens 50 --min-lines 5` |
| CRAP (Tier 2) | no coverage provider; install forbidden in audit | `@vitest/coverage-v8` + `vitest run --coverage`, then `cc² · (1−cov)³ + cc` |
| Mutation score (Tier 2) | no `stryker` / config | `@stryker-mutator/core` + `@stryker-mutator/vitest-runner` |
| Coverage % (Tier 3) | no coverage provider installed | `@vitest/coverage-v8` |

---

## Spec followability note (from the run — all 6 since fixed)

1. **`unknown` in the Tier-1 "`any` / `unknown`" gate was under-specified.** All three tools the row named detect only `any` and `any`-derived flows — none flags a deliberate `unknown`. A literal "0 explicit `unknown`" reading fails `packages/xd-parser`'s `[key: string]: unknown` raw-format types, which are the *correct* way to model an unvalidated external format — colliding with prime directive 4. → **Fixed:** `any` is the hard gate; `unknown` is advisory, flagged only outside a data boundary.
2. **`vitest run --coverage` triggers an install on v4** when no provider is present — forbidden in audit mode. → **Fixed:** spec now says don't pass `--coverage` without a provider; report CRAP/coverage as a GAP.
3. **Dead-code / duplication: "the tool's list is the definition" vs. a real grep finding.** With neither tool installed the metric is a GAP, but `grep` surfaced concretely unreferenced exports. → **Fixed:** provisional manual findings allowed under the GAP line, explicitly labelled, for dead-code/duplication only.
4. **Module token budget over `.html` / `.css`.** "Sum `wc -c` over source files" literally includes markup; chars÷4 is a code-token proxy. → **Fixed:** count code files for the gate; markup/styles in a parenthetical.
5. **Report format had `### FAIL:` / `### PASS:` under Tier 1 but no `### GAP:` form** — yet an unmeasurable hard gate has to appear in Tier 1, not only in the trailing Gaps section. → **Fixed:** `### GAP:` heading added to the format.
6. **`fix` mode's "exactly one module" vs. cross-module coupling.** Several findings here (consumer-side `any` casts driven by an upstream union; a `walk` duplicated across 4 packages) are only cleanly fixable as a cross-module change the spec had no mode for. → **Fixed:** `fix` now records these as "blocked cross-module findings" with a recommended multi-module plan, without executing them.
