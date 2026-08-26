# PROJECT_ARCHITECTURE.md

> Project-specific facts. The agnostic *process* contract lives in `CLAUDE.md` (the active
> profile's process chapter plus the shared sections) and `AGENTS.md` (implementer).
> This file is the single source of truth for everything those two files deliberately refuse to guess:
> stack versions, commands, API contract, runtime wiring, directory map.

## Contract with CLAUDE.md / AGENTS.md — DO NOT VIOLATE

1. **Command names are an API.** The process chapter and shared sections of `CLAUDE.md`, and `AGENTS.md` Steps 3–4, reference toolchain commands **by name**:
   `test`, `test (focused)`, `typecheck`, `lint`, `format`, `format:check`, `coverage`. The § Toolchain table below
   MUST define every one of these names, each carried **verbatim in the row's first cell** — the contract name IS
   the label, not a description of it (`typecheck`, never "Type-check"); rows outside this list keep human labels.
   If you rename one, you break the process contract. If a tool genuinely
   doesn't exist for this stack, keep the row and mark it `TODO` / `N/A` with a reason — never silently drop it.
2. **The structural model must match CLAUDE.md.** § Conventions (Layering) below realizes the architecture decision
   taken in `CLAUDE.md § Architecture`. The layer→directory map must reflect the **same** chosen
   branch (flat MVCS / domain-partitioned / other). A divergence here silently misroutes every file the implementer
   creates.
3. **Coverage floor appears once, here, and matches CLAUDE.md.** The § Testing line anchored **Project floor:**
   MUST equal the **Project floor** row in `CLAUDE.md § Coverage Targets` (and the `coverage` command, if it embeds
   a threshold, uses the same number). One number, two files, two fixed anchors — keep the labels exact.
4. **Layer names are fixed vocabulary.** Model / View / Controller(orchestration) / Service / Client are used verbatim
   across all three files. Don't introduce synonyms here ("presenter", "gateway", "repository") without updating the
   other two — prefer not to.
5. **Secrets boundary is absolute.** § Auth & Secrets must restate the no-secret-in-frontend rule; it is asserted in
   both `CLAUDE.md` and `AGENTS.md` and cannot be relaxed by a project fact.
6. **Model names live only in § Model Roster.** `CLAUDE.md` and `AGENTS.md` refer to models by role
   ("the Designer's model") and resolve them in the roster below — the only place a concrete model name may
   appear. Record changes with `/update-models-roster`; never inline a model name into a process file.
   A **tier substitution** — a roster tier temporarily unavailable, so a role runs below it — is recorded
   in the roster's substitution block, in prose, and never by editing a `Current model` cell: the cell
   states the tier this project wants, the block states what is actually running and until when.

## Overview

- **Type:** CLI orchestrator (Node ≥ 24, TypeScript, ESM) for multi-agent TDD loops defined in `loops/*.yaml`. It spawns one agent session per loop step, re-executes each step's mechanical exit checks (`done_when`) itself, and owns state transitions and phase-boundary git snapshots. Implementation started: the `mcfly` binary (commander entrypoint + `fly` scaffold subcommand, COINE-65) is the first feature; only the Controller layer exists so far.
- **Primary library / framework:** `@anthropic-ai/claude-agent-sdk` for driving design-side agent sessions (chosen over the raw Messages API — the loops assume harness semantics: tools, permissions, session state). `zod` validates every external boundary. No UI framework — the View is terminal output.
- **Secrets boundary:** the orchestrator holds no provider credentials. Each harness CLI it spawns authenticates itself outside this repo. No secret may appear in source, env files, `loops/`, `.ai/plans/` artifacts, or orchestrator logs.

## Stack

Pinned from the manifest:

| Concern         | Choice | Version | Status |
|-----------------|--------|---------|--------|
| Language        | TypeScript | 6.0.3 | installed — pinned `~6.0.3`, see § Non-Obvious Traps |
| Runtime         | Node.js | ≥ 24 | required via `engines` + `engine-strict` |
| Build tool      | tsc (`tsconfig.build.json`) | 6.0.3 | installed |
| Dev runner      | tsx | 4.23.12 | installed |
| Agent sessions  | @anthropic-ai/claude-agent-sdk | 0.3.246 | installed — 0.x, minor-pinned (`^0.3.246`) |
| CLI framework   | commander | 15.0.0 | installed — exact pin (approved in COINE-65) |
| Subprocess      | execa | 10.0.1 | installed |
| Git             | simple-git | 3.36.0 | installed |
| YAML parsing    | yaml | 2.9.0 | installed |
| Schema/validation | zod | 4.4.3 | installed |
| Lint            | eslint + typescript-eslint | 10.9.1 / 8.68.0 | installed — type-aware, `strictTypeChecked` |
| Runtime type hardening | @total-typescript/ts-reset | 0.6.1 | installed (types-only) |
| Test runner     | vitest | 4.1.11 | installed |
| Formatter       | Prettier | — | NOT INSTALLED (deliberate — § Open Follow-ups) |
| Coverage provider | @vitest/coverage-v8 | — | NOT INSTALLED (deliberate — § Open Follow-ups) |
| Env/config      | dotenv | — | NOT INSTALLED (deliberate — no runtime secrets consumed) |
| UI framework    | — | — | N/A (CLI) |
| Package manager | npm (`engine-strict`, `save-exact` via `.npmrc`) | — | — |

The three `NOT INSTALLED` rows are deliberate exclusions decided at init: do not import or
install them from a plan; each has an entry in § Open Follow-ups with what resolving it touches.

## Toolchain

> `CLAUDE.md` and `AGENTS.md` reference this section by name. Keep command names exact (Contract §1):
> the first cell of a contract row is the name itself, checked literally by `verify-kit`.

| Action          | Command | Status |
|-----------------|---------|--------|
| Install         | `npm install` | ✅ |
| Dev run         | `npm run dev` | ✅ |
| Build           | `npm run build` | ✅ |
| lint            | `npm run lint` | ✅ |
| typecheck       | `npm run typecheck` | ✅ |
| test            | `npm run test` | ✅ |
| test (focused)  | `npx vitest run <path-or-pattern>` | ✅ |
| Test (watch)    | `npm run test:watch` | ✅ |
| coverage        | TODO — needs `@vitest/coverage-v8` (deliberately NOT INSTALLED, § Open Follow-ups) | TODO |
| format          | TODO — no formatter installed (deliberate, § Open Follow-ups) | TODO |
| format:check    | TODO — no formatter installed (deliberate, § Open Follow-ups) | TODO |

Scope caveats:

- `test (focused)` filters by file path or name pattern, e.g. `npx vitest run tests/main.test.ts`.
- `typecheck` covers `src/` **and** `tests/` (root `tsconfig.json`); `build` compiles `src/` only (`tsconfig.build.json`).
- npm blocks esbuild's postinstall script by default (install-scripts approval); the toolchain is verified working without it — approve it only if a tool actually breaks.

## Model Roster

> Referenced **by role** from `CLAUDE.md` and `AGENTS.md` — the only place concrete model names
> live (Contract §6). The roster is the **union across profiles**; the active profile uses its
> subset (two-role: Architect + Implementer · pipeline: Designer, Test-Writer, Verifier +
> Implementer · autopilot: Designer, its four reviewer roles — all resolving to the Verifier
> row — and its production roles on the production rows recorded via `/update-models-roster`
> before the first flight). Update with `/update-models-roster`: new names come from the user,
> never from an agent's memory.

| Role | Capability profile (what to pick) | Current model |
|------|-----------------------------------|---------------|
| Architect | strongest reasoning tier — the two-role profile's single design-side role (design, tests, review) | Claude Fable 5 |
| Designer | strongest reasoning tier available — spec decisions propagate downstream | Claude Fable 5 |
| Verifier | strong review tier — checklist verification against a written reference | Claude Opus 5 |
| Test-Writer | cost-efficient tier — mechanical transcription of a precise inventory | Claude Sonnet 5 |
| Implementer | external code-gen agent, governed by `AGENTS.md` | Codex |

### Tier substitutions (temporary)

> A roster tier can become unavailable — quota exhausted, access revoked, provider outage. When it
> does, the role keeps its row above (that is the tier this project wants) and the substitution is
> recorded here, one line per role, by the user's decision — never by an agent's own assumption.
> The process chapters read this block: with a line here, a role whose session model doesn't match
> its row proceeds and declares the substitution; with no line, it stops. Every design-side
> artifact produced under a substitution records it too (`plan_template.md` header row, testplan
> Log), because that record must stay true after the substitution is lifted.

## Open Follow-ups (deferred — don't forget)

- **Formatter undecided** — Prettier deliberately NOT INSTALLED, so `format` / `format:check` don't exist and the review phase's format gate reduces to `lint`. Resolving touches: `package.json` scripts, the two § Toolchain rows, and possibly eslint stylistic rules (conflict cleanup).
- **Coverage provider missing** — `@vitest/coverage-v8` deliberately NOT INSTALLED: the 90% floor is declared but not yet measurable. Resolving touches: `package.json`, the § Toolchain `coverage` row, vitest config (provider + threshold wired to the floor).
- **Runtime config** — dotenv NOT INSTALLED: the orchestrator consumes no env config yet. Revisit when per-project configuration (target repo paths, notification channels) materializes.
- **Loop YAML schema** — `loops/*.yaml` are hand-validated today; the zod schema that makes them a real contract lands with the first parsing feature. Record it in § API Contract when it exists.

## Runtime Wiring (CRITICAL)

> The single most error-prone fact in the project. Get this wrong and it fails silently.

- **DO use:** `@anthropic-ai/claude-agent-sdk` to drive design-side agent sessions (model, tool allowlist, permission mode, streamed events via its async iterator). `execa` for every other process: the implementer's CLI, test runs, typechecks. `simple-git` for phase-boundary snapshots.
- **DO NOT use:** the raw Anthropic Messages API (`@anthropic-ai/sdk`) for sessions — it is the tempting default, but it bypasses the harness semantics the loops assume (tools, file access, permissions, session state). Do not hand-spawn the interactive CLI for jobs the SDK covers.
- **DO NOT trust session-reported results:** every mechanical check a `done_when` names (exit codes, diffs, counts, artifact state lines) is re-executed by the orchestrator's own process — a pasted log is a claim, not evidence (Linear COINE-59).
- **Order-sensitive protocol (if any):** the SDK's session event stream. Vocabulary TODO — pin it here with the first Client wrapper.

```
TODO: paste the actual session-client wrapper signature + event mapping here once
src/client/ materializes, so the implementer follows it verbatim instead of
reconstructing it.
```

## API Contract

> **Normative source:** N/A — this project exposes and consumes no backend HTTP API.

- **Base URL / env var:** N/A.
- **Auth:** N/A — see § Auth & Secrets (harness CLIs authenticate themselves).
- **Primary endpoints:** N/A. The external surfaces are: the loop YAML schema (internal contract, zod — TODO, lands with the first parsing feature), the agent-session SDK (§ Runtime Wiring), and spawned CLIs' exit codes and stdio.
- **Streaming event schema:** the SDK session event stream — TODO, pinned in § Runtime Wiring with the first Client wrapper.
- **Error shape:** for subprocesses, branch on **exit code** and parsed stdio, never on human-readable message text. TODO: error envelope per wrapper as each Client materializes.
- **Success / collection envelope:** N/A.
- **Tool-call protocol:** N/A.

## Testing

- Tests live in `tests/`, mirroring `src/`: `src/<path>/<unit>.ts` → `tests/<path>/<unit>.test.ts` (current example: `src/controller/fly.ts` → `tests/controller/fly.test.ts`; `tests/main.test.ts` is the subprocess e2e for the entrypoint and imports nothing from `src/`).
- Priority units: the Service layer (loop parsing, state machine, check running, prompt composition) and the Client wrappers (error mapping, schema validation) — they match the high-target rows in `CLAUDE.md § Coverage Targets`.
- Excluded from coverage: type-only files (`src/reset.d.ts`) and third-party internals — matches `CLAUDE.md` "What NOT to Test".
- **Project floor:** 90% — must equal the **Project floor** row in `CLAUDE.md § Coverage Targets` (Contract §3).
- Runner config: none yet — vitest defaults (node environment, globals **off**: explicit `import { test, expect } from 'vitest'`). Coverage provider NOT INSTALLED (§ Open Follow-ups).
- Integration/DOM env opt-in: N/A — node environment only.

## Auth & Secrets

- No provider key, credential, or secret in: source, any env file in the repo, `loops/` data, `.ai/plans/` artifacts, or logs the orchestrator writes.
- No client-public env prefix exists (there is no frontend); every env var is plain non-secret config, and none may carry a credential.
- Secrets live only in: the spawned harness CLIs' own auth stores — each authenticates itself outside this repo; the orchestrator never receives, forwards, or persists a credential.
- Auth flow detail: N/A — the orchestrator performs no authentication of its own.

## Conventions

- **Layering.** Realizes `CLAUDE.md § Architecture` (flat MVCS — decision A). Concrete map:

  | Layer                      | Lives in | Holds |
  |----------------------------|----------|-------|
  | Model                      | (future) `src/model/` | loop/outcome types, zod schemas, state-machine types |
  | View                       | (future) `src/view/`  | terminal rendering of runs and reports — no logic, no I/O beyond output |
  | Controller (orchestration) | `src/controller/` | CLI command handlers: argv → Service calls → View |
  | Service                    | (future) `src/service/` | orchestration core: loop runner, state machine, check runner, prompt composition |
  | Client (transport)         | (future) `src/client/` | one wrapper per external system: agent sessions (SDK), subprocesses (execa), git (simple-git) |

  Dependency direction `View → Controller → Service → Client → backend`; never skip or invert an existing layer.
  Today `src/` holds `main.ts` (commander entrypoint) and `src/controller/` (first materialized layer, `fly.ts`);
  the remaining layer directories materialize with the first feature that needs them.

- **File-placement rule:** by layer role. One Client per external system (agent session, subprocess, git) — never merge them. Business logic never enters `src/client/`. A new file goes in the directory of the layer its plan assigns; no assigned layer and no sibling → STOP and ask.
- **Import alias:** none — relative ESM imports, always with the `.js` extension (NodeNext).
- **Other project conventions:** `loops/` is runtime data (loop YAML + `loops/prompts/*.md`), read and schema-validated at load, never imported as code; prompt paths inside a loop file are relative to that file. Naming: `camelCase` functions, `PascalCase` types/classes, `SCREAMING_SNAKE_CASE` constants.

## Non-Obvious Traps

- **ESM NodeNext extension trap** — relative imports must end in `.js` even inside `.ts` files (`import { main } from '../src/main.js'`). A bare or `.ts` extension fails typecheck/resolution. Bites every new file.
- **`erasableSyntaxOnly`** — `enum`, `namespace`, and constructor parameter properties are compile errors by config. Model closed sets as union literals with a zod schema beside them.
- **`as` is banned** — lint rule `consistent-type-assertions: never`; combined with ts-reset (`JSON.parse` returns `unknown`), the only path for external data is a schema `parse`. An `eslint-disable` is the visible, greppable escape — use only with a stated reason.
- **TypeScript pinned `~6.0.3`** — typescript-eslint 8.68.0 declares peer `typescript >=4.8.4 <6.1.0`; installing TS 7 breaks `npm install` (ERESOLVE). Bump only when typescript-eslint's peer range allows it.
- **Agent SDK is 0.x** — `^0.3.246` pins the minor (caret on 0.x): API may change on every minor. Check the changelog before any bump; upgrades are deliberate, not routine.
- **npm install-scripts approval** — esbuild's postinstall is blocked by default; `tsx` and `vitest` verified working regardless. `npm install-scripts approve esbuild` only if a tool actually breaks.
- **`loops/` is invisible to the type-checker** — YAML and prompt files carry no types; every guarantee about them comes from zod validation at load, not from `tsc`.

## Documentation

- ADRs: `docs/adr/` (directory), registered in `docs/adr/README.md` (index). Neither exists yet — both are created with the first ADR.
- TODO: record the stack decision (TypeScript + agent-session SDK over the Go/PHP/Python alternatives, with the reasoning) as ADR-0001.
- `README.md` at the repo root holds the project overview, repo map, and toolchain summary.
