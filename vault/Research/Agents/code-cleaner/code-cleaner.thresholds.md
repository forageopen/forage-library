# code-cleaner — thresholds & calibration

Single source of truth for the numbers the `code-cleaner` agent enforces. Tune
here; the agent prose refers to this file rather than repeating the values.

Every threshold below was pressure-tested against a real codebase
(`forageopen/forage-library`, ~50k-token client-side JS, unit-tested pure logic +
in-browser-verified DOM layer) before being set. The "why this number" notes are
the record of that calibration — read them before changing a value, so the same
ground isn't re-litigated from scratch.

---

## Tier 1 — hard gates (a violation blocks)

| Metric | Threshold | Unit | Tool |
|---|---|---|---|
| Module token budget | **< 180,000 tokens** | whole module, excl. generated/vendored/lockfiles | real tokenizer if present (`tiktoken` etc.), else `wc -c` ÷ 4 |
| Cognitive complexity | **< 15** | per function | ESLint `sonarjs/cognitive-complexity`, or `lizard` |
| Halstead difficulty | **< 80** | per function | `lizard -m`, or `escomplex`/`ts-complex` |
| Dead code | **0** | exported/declared but unreferenced | `knip` (JS/TS), `ts-prune`, `vulture` (py), `deadcode` (go) |
| Duplication | **no clone > 50 tokens / 5 lines** | cross-file and in-file | `jscpd --min-tokens 50 --min-lines 5` |
| `any` (explicit + unsafe flows) | **0** | explicit `any` annotations, `as any`, and `any`-derived unsafe flows | `@typescript-eslint/no-explicit-any`, `no-unsafe-*`, `tsc --strict` |

### Notes

- **Module token budget — 180k.** The whole point of the spec: a module a
  frontier model can hold in context *with room left for the task, the
  conversation, and a couple of its dependencies' interfaces*. A "module" is a
  directory with a declared public entry point (an `index`, a barrel, a
  package boundary) — not a single file. On the calibration repo the entire
  client JS **plus its whole test suite** came to ~65k tokens, so 180k is a
  comfortable ceiling, not a stretch. **120k is a defensible tighter value** and
  still passes that repo — decide per your context window.
  - Count **code files** — the languages that carry logic (`.ts .tsx .js .mjs
    .py .go .rs …`). Report co-located markup/styles/templates (`.html .css
    .svg`) as a separate parenthetical figure, not folded into the gate — the
    chars÷4 proxy is calibrated for code tokens.
- **Cognitive complexity — 15, and this is the real complexity gate.** On the
  calibration repo, cognitive < 15 flagged exactly the two functions a reviewer
  would also flag (a nested loop inside a blockquote walk; a nested
  callback→loop→try in an async overlay builder) and left flat `switch`/dispatch
  code alone. It tracks "hard to follow" far better than cyclomatic does.
- **Halstead difficulty — 80.** Deliberately loose. Expect it to be silent on
  normal code; it only fires on a genuinely monstrous single function. Cheap to
  keep as a backstop.
- **Dead code / duplication — 0, but only what a concrete tool reports.**
  "Redundant code" as a vibe is unfalsifiable and makes the agent thrash.
  `knip` + `jscpd` give a finite, checkable list. That list is the definition.
  When neither tool is installed the metric is a **GAP**, not a pass — but the
  agent may list grep-verified unreferenced exports / obvious copy-paste under
  that GAP, explicitly labelled "manual, provisional — not a tool run".
- **`any` — TypeScript projects only, and it is the hard gate.** Explicit `any`,
  `as any`, and `any`-derived unsafe flows (what `no-explicit-any` + `no-unsafe-*`
  catch) block. Test files are reported separately and do **not** count against
  the source gate — fixture-shaping casts in tests are a different risk class.
  On a plain-JS project the gate is **N/A (untyped project)** — never "0 /
  passing", which would imply a guarantee JS can't give.
- **`unknown` — advisory, not a gate.** Deliberate `unknown` at a JSON / external-
  data boundary or in a generic serializer is the *correct* type-safe choice —
  failing it punishes good code and contradicts prime directive 4. The agent
  reports explicit `unknown` only when it appears **outside** such a boundary
  (i.e. where a real type is known and was skipped), and flags those for a human
  decision rather than scoring them FAIL. None of the three listed tools flags a
  bare `unknown` anyway.

---

## Tier 2 — conditional gates (apply only where the premise holds)

| Metric | Threshold | Applies when | Tool |
|---|---|---|---|
| CRAP | **< 25** | the module already has a test file | coverage (`c8`/`nyc`/`vitest --coverage`) × cyclomatic |
| Mutation score | **0 survivors** on public surface + core logic | the module already has a test file | `stryker`, `mutmut`, `go test -run` mutation harness |

### Notes

- Both need coverage data, and both are only meaningful for code that has been
  **chosen for unit testing**. On the calibration repo, 10 of 37 source files
  (including the 3 largest) have no tests *by design* — they are the DOM / Worker
  / canvas layer, verified in a real browser because jsdom cannot faithfully
  exercise them (the project's own bug log shows a jsdom-only suite would report
  green for every bug it actually shipped).
- For an untested module: the agent reports it as a **unit-test candidate** if it
  looks like pure logic, or **respects a declared two-layer strategy** (see
  `test-strategy` below) and does not count coverage against it. It never
  responds to a low CRAP / high survivor count by generating tests to move the
  number — see the oracle rule in the agent prose.
- CRAP math: `CRAP(m) = cc(m)² · (1 − cov(m))³ + cc(m)`. At 100% coverage this
  collapses to `cc(m)`, so a Tier-2 pass on a fully-covered method is already
  implied by the cyclomatic advisory below — CRAP only does independent work when
  coverage is partial.

---

## Tier 3 — advisory (reported, never blocks)

| Metric | Reference value | Why advisory |
|---|---|---|
| Cyclomatic complexity | flag ≥ **12**; list the 8–11 band separately | At < 8 (the original ask) it flags flat `switch`/`if`-dispatch parsers and serializers where the number is inflated but the code is trivial to read — ~5 of 14 functions in one clean, tested, pure module on the calibration repo. Gate at 12; treat 8–11 as informational. |
| Lines of code per file | **< 200** | Line count doesn't separate a long flat mapper from a short deeply-nested knot. On the calibration repo the 1,141-line outlier is a single cohesive factory closure over ~30 DOM refs + ~15 state vars; "fixing" it means threading a ~45-field context object through 6 files — pure indirection. Complexity + module budget already catch what matters. Report it; let a human decide. |
| Coverage % | report per module | Feeds CRAP. Not a target in itself — chasing the last few percent is where an agent starts inventing expected values. |
| Explicit `unknown` (TS) | flag only outside a data boundary / serializer | At a JSON or external-data edge it's the correct choice; flagging it there punishes good code. Only a report line where a real type was known and skipped. |

---

## Escape hatch

A function may carry `// complexity-exempt: <reason>` (or the block-comment
equivalent for the language). It suppresses the **cognitive** and **cyclomatic**
gates for that function only.

A single `any` may carry `// any-exempt: <reason>` when the real type is genuinely
unexpressible — a recursive `z.lazy` discriminated union, a `.d.ts` gap in a
dependency, a generic that TS can't infer. This is rare; a boundary belongs in
`unknown`, not an exempted `any`.

Every exemption — pre-existing or newly added — is listed in the audit report for
human sign-off. Adding one is a judgement call the agent must justify in its run
summary. An exemption count that keeps climbing is a signal the threshold is
wrong, not that the code is fine — flag that.

---

## Per-project overrides

A project may add `.code-cleaner.json` at its root:

```json
{
  "moduleTokenBudget": 120000,
  "cognitiveMax": 15,
  "cyclomaticGate": 12,
  "jscpd": { "minTokens": 50, "minLines": 5 },
  "test-strategy": "two-layer",
  "two-layer-verified": ["assets/js/vault/viewer-pane.js", "assets/js/**/app.js"],
  "moduleRoots": ["assets/js", "scripts"],
  "exclude": ["**/vendor/**", "**/*.generated.*"]
}
```

- `test-strategy: "unit"` (default) — every pure-logic module is expected to have
  unit tests; Tier 2 applies wherever tests exist and untested pure modules are
  flagged as candidates.
- `test-strategy: "two-layer"` — the project verifies some modules in a real
  browser / integration harness instead. Paths matching `two-layer-verified` are
  exempt from Tier 2 and from the unit-test-candidate nudge; the agent notes them
  as "verified out-of-band" instead.
