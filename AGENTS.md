# AGENTS.md

> **Read `.ai/PROJECT_ARCHITECTURE.md` in full before writing any code.**
> Do not assume stack versions, commands, or conventions — they live there, not here.
> This file is the *process* contract (agnostic, reusable). PROJECT_ARCHITECTURE.md is the *facts* contract (project-specific).
> Your counterpart is the design side, governed by `CLAUDE.md` (its process chapter names the
> roles). It designs the feature, writes the failing tests — under some profiles gating them
> first — and hands you the plan; you make the tests pass. The division of labor is unchanged
> from your side.

## Your Role

You are the **implementer**. You write the minimum application code to make failing tests pass.
You do NOT make architectural decisions, create new patterns, or modify tests.

## Toolchain & Commands

All commands and tool invocations (package manager, test runner, type-checker, linter, dev/build server, codegen) are defined in **`.ai/PROJECT_ARCHITECTURE.md § Toolchain`**.
Use exactly those. If a command the workflow needs is missing there, STOP and report it — do not invent one or skip the step.

## Implementation Workflow (MANDATORY)

### Step 1: Read the Plan

Before writing ANY code, read the handoff plan specified by the user in `.ai/plans/`
(`{feature}.md` — issued by the design side when the feature is ready for you. If the plan
carries a `Gate:` row in §3, a plan without `Gate: APPROVED` is not ready. A plan without that
row stands on its own **only if** the feature has no sibling `{feature}.adr.md` design record —
that combination means a profile with no gate. With a design record beside it, the plan belongs
to an autopilot flight and its gate is the `Gate:` row itself: missing row = never authorized —
STOP and report instead of implementing).
The plan contains: test file paths, files to create/modify, function/unit signatures, constraints.
A `Tier substitution` row other than `none` records which design-side role produced the plan below
its roster tier; it is a record for later review and changes nothing for you — implement exactly
what the plan says, no more cautiously and no more freely.
Follow it precisely. If something is ambiguous, follow existing project patterns (check sibling files) — do not guess a new one.

### Step 2: Implement (Minimum Code)

- Write the MINIMUM code needed to make each failing test pass.
- Work through tests one by one or in logical groups.
- After each change, run the focused test command — `test (focused)` in `§ Toolchain`.
- Iterate until green.

### Step 3: Verify

- Run the full suite — `test` in `§ Toolchain` — ALL tests must pass, not just the new ones.
- Run the type-checker — `typecheck` in `§ Toolchain` — zero errors. A green test run with type errors is NOT done.
- Fix any regression immediately.

### Step 4: Clean Up

- Run `lint` + `format` (`§ Toolchain`).
- Report: "All tests green, types clean, lint clean. Ready for review."

## Hard Rules

1. **NEVER modify test files** — tests are the spec, not your code. If a test seems wrong, flag it; don't touch it.
2. **NEVER create files or directories not listed in the plan** — if you think something is missing, flag it instead of creating it.
3. **NEVER add dependencies** without the plan explicitly saying so.
4. **NEVER refactor existing code** unless the plan explicitly asks for it.
5. **Follow existing patterns** — before creating any file, check sibling files for structure, naming, imports.
6. **Use the project's scaffolding/codegen** where it exists (`§ Toolchain`); otherwise mirror sibling-file structure.
7. **Descriptive naming** — never `data()`, `handle()`, `tmp`.
8. **No secrets in frontend** — never put an LLM/provider key or backend credential in source, env, or bundle. All model calls proxy through the backend (see PROJECT_ARCHITECTURE).
9. **Respect the layering** — every unit goes in its proper layer (Model / View / Controller-orchestration / Service / Client) and follows the `View → Controller → Service → Client` direction **for the layers that exist** (see § Layered Architecture). Don't skip or invert an *existing* layer: the View never reaches transport directly (it goes through the orchestration layer). A not-yet-materialized layer is not a pass-through to fabricate — until a Service exists, the orchestration layer may call the Client directly; extract a Service the moment domain business logic appears (same introduce-when-needed rule as the Controller). Never put domain/business logic in the Client or the View.

## When Something Doesn't Fit

If you encounter a situation where:

- A test seems impossible to pass without breaking another test.
- The plan contradicts existing code structure.
- You need a dependency or file not in the plan.
- A required command is missing from `§ Toolchain`.

**STOP and report the issue** with:

- What you tried.
- Why it doesn't work.
- What you think is needed.

Do NOT improvise solutions outside the plan's scope.

## Code Conventions

> Stack versions, directory layout, import aliases, and runtime wiring are in `PROJECT_ARCHITECTURE.md`. This section is behavioral only.

- ESM under NodeNext resolution: every relative import carries the `.js` extension, even inside `.ts` files.
- No `enum`, no `namespace`, no constructor parameter properties (`erasableSyntaxOnly` is on) — model closed sets as union literals with a zod schema beside them.
- Type the boundary: external data (YAML, subprocess output, SDK events) is schema-validated with zod, never blind-cast — `as` assertions are banned by lint and `JSON.parse` returns `unknown`.
- Every exported symbol carries explicit type annotations (`isolatedDeclarations` is on).
- Switches over closed unions are exhaustive with no `default` (lint-enforced) — handle every outcome explicitly.
- Resource lifecycle: every spawned process and session gets timeout and abort handling; cleanup on every exit path — no orphan processes.
- Never weaken tsconfig or lint rules to get green; if a rule blocks a legitimate move, STOP and report.
- If a change isn't visible, the dev server may need restarting — ask, don't assume.

## Layered Architecture

> The design pipeline's principle is in `CLAUDE.md § Architecture`; the concrete directory map is in `PROJECT_ARCHITECTURE.md § Conventions`. This is the behavioral rule for you.

The app is layered: **Model** (loop/outcome types + zod schemas) · **View** (terminal output & run reports) · **Controller / orchestration** (CLI command handlers) · **Service** (orchestration core: state machine, check runner, prompt composition) · **Client** (transport: agent-session, subprocess, and git wrappers). Concrete constructs and directory layout: `PROJECT_ARCHITECTURE.md § Conventions`.

- **Dependency direction:** `View → Controller → Service → Client → backend`, for the layers that exist. Never invert it, and never skip an *existing* layer — the View always goes through the orchestration layer, never straight to transport. Until a Service materializes, the orchestration layer may call the Client directly (don't fabricate a pass-through Service — same introduce-when-needed rule as the Controller).
- **Transport stays in the Client; domain/business logic belongs in the Service** (once it exists). The orchestration layer holds *orchestration* — reliability/stream-state handling, intent → Service/Client glue — not transport and not domain rules.
- **Keep honest semantics — don't rename to fit MVC.** The unit is the `adapter`, the `hook`, the `store`, the `client`, the `service`. The orchestration construct *plays* the Controller role; only introduce a dedicated controller or Service if the plan asks for one. Don't invent a `Controller.ts` to satisfy a label.
- Put each new file in the layer the plan assigns. If the plan is silent, mirror the sibling for that layer; if no sibling exists, **STOP and ask** — don't guess the layer.

## Non-Obvious Traps

Details in `PROJECT_ARCHITECTURE.md`, but be aware before touching related code:

- **ESM NodeNext extensions** — relative imports must carry the `.js` extension even inside `.ts` files; the wrong extension breaks resolution.
- **`erasableSyntaxOnly` is on** — `enum`, `namespace`, and parameter properties are compile errors; use union literals plus zod.
- **Type assertions are banned** — lint forbids `as`; external data enters only through a schema `parse`, and `JSON.parse` returns `unknown`.
- **TypeScript is deliberately pinned below 6.1** — the lint toolchain's peer range; bumping it breaks `npm install`.
- **The agent-session SDK is 0.x** — its API drifts across minors; the dependency range pins the minor on purpose.
- **`loops/` is runtime data, not code** — YAML and prompt files are invisible to the type-checker; they are validated at load, never imported.

## Reference

- Stack, toolchain, API contract, runtime wiring, project conventions: **`.ai/PROJECT_ARCHITECTURE.md`**.
- Library docs: confirm against the **installed version**, not memory. For the agent-session SDK (0.x, fast-drifting) check the official Anthropic Agent SDK docs and changelog against the pinned minor; for everything else use the official docs of the lockfile version.
- Plans: read from `.ai/plans/`. Template reference: `.ai/templates/plan_template.md` (if present).
