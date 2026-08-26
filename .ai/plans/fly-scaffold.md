# Plan: fly-scaffold

> **Status:** DONE — 2026-08-26 (review passed on the Designer's model, escalation trigger 1)
>
> `RED` tests written and failing — gated per the pipeline chapter — ready for implementation ·
> `DONE` implemented and review-passed (set by the review phase, with its date).
>
> **Design side:** tests and this plan are done, from the gated testplan.
> **Implementer:** make the listed tests pass, nothing more.
>
> **Tier substitution:** none
>
> **Phase 5 note — escalation trigger 1 applies.** This feature materializes the Controller
> layer (`src/controller/`) for the first time and introduces the CLI-binary surface, so the
> review phase runs on the Designer's model (`PROJECT_ARCHITECTURE.md § Model Roster`), not the
> Verifier's.

## 1. Goal

Make the `mcfly` CLI invocable end-to-end for the first time (Linear **COINE-65**). `mcfly fly`
prints one of five fixed flight phrases — chosen uniformly at random — on stdout and exits 0;
every wrong invocation (no subcommand, unknown subcommand, excess argument) reports on stderr and
exits 1; `mcfly --help` prints the program help on stdout. The command deliberately does nothing
else: it is the first atomic feature of the CLI, and its real purpose is to materialize the
Controller layer plus the injectable-randomness seam that later features build on. A **Trip** (a
single execution of a Loop, per the `CONTEXT.md` glossary) is what `fly` will eventually start;
the **Task** argument is out of scope here.

## 2. Affected Layers & Units

**Architectural event:** `src/controller/` materializes with this feature — it is the first
directory of the layer map in `PROJECT_ARCHITECTURE.md § Conventions` to exist. No Service and no
Client are introduced: phrase selection is stateless orchestration with no domain rules to hold,
so per `CLAUDE.md § Architecture` ("Semantics over labels") the orchestration layer stands alone
here. Do not fabricate a pass-through Service.

| Layer                      | Unit | New / Modified |
|----------------------------|------|----------------|
| Model                      | — not touched | — |
| View                       | — not touched (terminal output is a single `console.log` in the action handler) | — |
| Controller (orchestration) | `src/controller/fly.ts` | new |
| Controller (orchestration) | `src/main.ts` | modified |
| Service                    | — not touched | — |
| Client (transport)         | — not touched | — |

Outside the layer map, one manifest change is required: `package.json` (see §4.3).

## 3. Tests (the spec — already written and RED)

- **Source testplan:** `.ai/plans/fly-scaffold.testplan.md`
- **Test files:**
  - `tests/controller/fly.test.ts` — covers the pure selection logic through the `RandomSource`
    seam: the frozen phrase list and its order; the value→phrase mapping at boundaries
    (`0`, `0.9999999`) and mid-bucket; the side effect that the random source is consulted
    exactly once; the `RangeError` failure path when the source returns `1`, `-0.1`, or `NaN`
    (class **and** exact message asserted).
  - `tests/main.test.ts` — subprocess e2e covering the five CLI invocations: `fly` (exit 0,
    phrase on stdout, clean stderr), no subcommand (exit 1, usage on stderr), unknown command
    (exit 1, `error: unknown command 'foo'` + the `--help` pointer), `--help` (exit 0, usage and
    the `fly` description on stdout), and `fly extra` (exit 1, `too many arguments`). It imports
    nothing from `src/` — it spawns the real entrypoint.
- **Run this slice:** `npx vitest run tests/`
- **RED verified:** yes — all 9 inventory rows fail. Rows 5–9 fail on their asserts (the
  placeholder entrypoint exits 0 with no output for every invocation); rows 1–4 fail at module
  load because `src/controller/fly.ts` does not exist. Reproduced at the gate.
- **Green target: 17 tests, 2 files.** `tests/controller/fly.test.ts` expands to 12 cases
  (1 + 7 table cases + 1 + 3 table cases) and `tests/main.test.ts` to 5. A run reporting fewer
  than 17 means a test was dropped, not that the slice is smaller than it looks.
- **Gate:** APPROVED — 2026-08-26, all six gate checks passed (`CLAUDE.md`, Phase 3). The gate
  additionally verified the §4 shapes below against the real toolchain: `typecheck` clean, `lint`
  clean, 17/17 green. The probe was reverted before this plan was issued.

## 4. Implementation Spec

The two files below are **verified shapes**, not sketches: the gate ran exactly this code in the
repo and got a clean `typecheck`, a clean `lint`, and 17/17 green. Deviating is allowed only if
you keep all three.

### 4.1 `src/controller/fly.ts` (new)

```ts
export type RandomSource = () => number;

export const FLY_PHRASES: readonly string[] = [
  'Warming up the time circuits...',
  "Roads? Where we're going, we don't need roads.",
  'Great Scott!',
  'The flux capacitor is fluxing.',
  'Setting destination time...',
];

export function runFly(random: RandomSource): string {
  const value = random();
  const phrase = FLY_PHRASES[Math.floor(value * FLY_PHRASES.length)];

  if (phrase === undefined) {
    throw new RangeError(`RandomSource returned ${String(value)}, expected [0, 1)`);
  }

  return phrase;
}
```

- **Mirror:** none — this is the first file in `src/controller/`. Follow `src/main.ts` for import
  style and the naming rules in `PROJECT_ARCHITECTURE.md § Conventions`
  (`camelCase` functions, `PascalCase` types, `SCREAMING_SNAKE_CASE` constants).
- **Flow:** the single `if (phrase === undefined)` is deliberately **both** guards at once. With
  `noUncheckedIndexedAccess` on, the index lookup already yields `string | undefined`, and every
  out-of-contract value lands there: `1` → index 5, `-0.1` → index -1, `NaN` → index `NaN`,
  `Infinity` → index `Infinity` — all `undefined`. One branch therefore satisfies §2.1's "written
  so `NaN` fails it (test for NOT-in-range)" **and** narrows `phrase` to `string` without an
  assertion, leaving no untestable dead branch. Do not split it into a separate range check plus
  a redundant undefined check — the second branch would be unreachable and untested.
- **Message construction:** `String(value)` is required, not cosmetic — see §5.

### 4.2 `src/main.ts` (modified — replaced wholesale)

```ts
#!/usr/bin/env node
import { Command } from 'commander';

import { runFly } from './controller/fly.js';

const program = new Command();

program
  .name('mcfly')
  .description('Deterministic orchestrator for multi-agent TDD loops')
  .showHelpAfterError('(add --help for additional information)');

program
  .command('fly')
  .description('Start a trip (scaffold, does nothing yet)')
  .action(() => {
    console.log(runFly(Math.random));
  });

program.parse();
```

- The placeholder `export function main(): string` is **deleted**. The entrypoint exports
  nothing; `npm run dev` (`tsx src/main.ts`) still works because the file is executed, not
  imported.
- Every string above is frozen by testplan §2.1 and asserted by rows 5–9. The three commander
  behaviors the tests rely on are **defaults verified against commander 15.0.0**, not
  configuration you need to add: help-on-stderr-and-exit-1 when a subcommand-bearing program is
  called with no arguments (row 6), `error: unknown command 'foo'` (row 7), and
  `error: too many arguments for 'fly'` (row 9). Only `showHelpAfterError` is explicit — commander
  does not add that pointer by default, and row 7 asserts it.
- `.name('mcfly')` is explicit on purpose: the argv-derived default would leak the script filename
  under `tsx` and under `dist/`, breaking the `Usage: mcfly` assert in rows 6 and 8.

### 4.3 `package.json` (modified)

- Add the binary: `"bin": { "mcfly": "dist/main.js" }`.
- Add the dependency: `npm install commander@15.0.0`. `.npmrc` has `save-exact=true`, so this
  writes the exact pin `"commander": "15.0.0"` — leave it exact, do not widen it to a caret range.
  Version 15.0.0 was approved in COINE-65 and confirmed published at the gate.

## 5. Constraints (DO / DO NOT)

- **DO use `String(value)` inside the `RangeError` template literal.** `strictTypeChecked` turns
  off `allowNumber` on `@typescript-eslint/restrict-template-expressions`, so the bare
  `${value}` interpolation of a number is a **lint error** — the gate hit it. `String(value)`
  produces byte-identical output for the three tested inputs (`1`, `-0.1`, `NaN`), so the asserted
  messages are unaffected.
- **DO NOT reach for `as` or `!` to settle the index lookup.** `consistent-type-assertions` is set
  to `never` and `no-non-null-assertion` ships in `strictTypeChecked`: both are lint errors. The
  `phrase === undefined` narrowing in §4.1 is the sanctioned path, and an `eslint-disable` here
  would be a review finding.
- **DO keep the `.js` extension** on `./controller/fly.js` — NodeNext resolution, the trap
  documented in `PROJECT_ARCHITECTURE.md § Non-Obvious Traps`. A bare or `.ts` specifier fails.
- **DO annotate both exports explicitly** — `isolatedDeclarations` is on: `FLY_PHRASES` needs its
  `readonly string[]` annotation and `runFly` its `: string` return type, exactly as written.
- **DO NOT add `.version()`**, a `--task` option, or any second subcommand. Not in the COINE-65
  contract, not covered by a test (YAGNI).
- **DO NOT give `runFly` a default parameter** (`random: RandomSource = Math.random`). The caller
  injects `Math.random`; a default would let a later caller silently bypass the seam.
- **DO NOT create `src/service/`, `src/model/`, or `src/client/`.** See §2 — this feature
  materializes the Controller layer only.
- **DO NOT spy on or stub `Math.random` anywhere in `src/`.** Determinism belongs to the seam.
- **DO NOT touch the staged deletion of `loops/base_loop.yaml`.** It is pre-existing working-tree
  state from a rename to `loops/pipeline_loop.yaml`, unrelated to this feature — leave it as it
  is and keep it out of this feature's commit.

## 6. Definition of Done

- [ ] All tests in §3 green — **17 passing, 2 files**, via the full suite (`npm run test`), not
      just the slice.
- [ ] `typecheck` clean (`npm run typecheck`, zero errors) — it covers `src/` **and** `tests/`.
- [ ] `lint` clean (`npm run lint`, zero errors). **Neither `format` nor `format:check` applies:**
      Prettier is deliberately NOT INSTALLED, so both rows are `TODO` in
      `PROJECT_ARCHITECTURE.md § Toolchain` and the format gate reduces to `lint` for this
      feature. This is the plan's standing answer to `AGENTS.md` Step 4 — do **not** stop and
      report the missing command, and do **not** install a formatter to satisfy the checkbox.
- [ ] Layering respected: both units in `src/controller/`, no Service/Client/Model created, the
      entrypoint reaches the Controller and nothing lower.
- [ ] No code beyond what the tests require (YAGNI) — §5 lists the specific temptations.
- [ ] **Extra gate for this feature (binary surface, untestable from the suite):**
      `npm run build` succeeds and `dist/main.js` carries `#!/usr/bin/env node` on line 1, with
      `package.json` declaring `"bin": { "mcfly": "dist/main.js" }`.
- [ ] No secrets introduced; no external input is consumed by this feature, so no boundary schema
      is required (`Math.random` is not external input).
