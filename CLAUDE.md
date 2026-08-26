@.ai/process/pipeline.md

# CLAUDE.md

> **Read `.ai/PROJECT_ARCHITECTURE.md` in full before writing any plan, test, or review.**
> Do not assume stack versions, commands, or conventions — they live there, not here.
> Line 1 of this file imports the **process chapter** — the active profile's roles and phases,
> shipped verbatim and never edited; `/switch-profile` swaps it. This file adds the shared
> process sections and the project overlay. PROJECT_ARCHITECTURE.md is the *facts* contract
> (project-specific).

## Architecture

Every part of the app is organized along an **MVC structure enriched by a Client layer and a Service layer**. The client/service half is the global standard: `ExternalAPI → ApiClient (transport) → ApiService (business logic) → Application` — so no component or adapter ever talks to transport directly.

**Layers and their roles:**

- **Model** — domain types, schemas, and state (client store + server cache). Data and the rules over it. Depends on nothing.
- **View** — presentational layer. Render state, raise intent; no fetching, no business logic. (Compose primitives — don't wrap them in a parallel UI framework.) Here the View is terminal output: run reports and status rendering.
- **Controller (orchestration)** — turns View intent into Service calls and Model updates, then feeds the View. In this stack: the CLI command handlers (argv parsing → Service calls → rendered report).
- **Service** — business logic for a backend service: composes Client calls, maps transport/error envelopes to the domain, applies app rules. Once a Service exists, the orchestration layer talks to it rather than reaching the Client directly.
- **Client** — transport only: requests, stream/response parsing, schema validation at the boundary, error-envelope decoding. One per backend service. Directory layout & placement rule → `PROJECT_ARCHITECTURE.md § Conventions`.

**Dependency direction:** `View → Controller → Service → Client → backend`, **for the layers that exist**. The Model is referenced across layers and depends on none. Don't skip or invert an *existing* layer (the View never reaches the Client directly — it always goes through the orchestration layer). A layer that hasn't materialized yet is not a pass-through to fabricate: until a Service exists, the orchestration layer may call the Client directly — see *Semantics over labels*.

**Semantics over labels.** MVC is the *guiding structure*, not a renaming scheme. Name each unit for what it is — `adapter`, `hook`, `store`, `client`, `service` — never a literal `Controller.ts`. Where a construct has no 1:1 MVC counterpart, keep honest semantics: the runtime orchestration construct *fulfils* the Controller role, so a dedicated controller is introduced **only when** the existing orchestration genuinely doesn't cover the need (YAGNI). The Service follows the same rule: it is part of the target structure (the global `Client → Service` standard), but a distinct Service module materializes **when there's business logic to hold** — until then orchestration may call the Client directly; don't fabricate a pass-through layer to satisfy the diagram. Reliability / transport-state handling is *orchestration*, **not** domain business logic. Never force a 1:1 MVC↔framework mapping.

The concrete layer→directory map is a project fact: **`.ai/PROJECT_ARCHITECTURE.md § Conventions`**. This section owns the principle; that one owns the placement.

## Toolchain & Commands

All commands, versions, and tool invocations (package manager, test runner, linter, type-checker, dev/build server, codegen, doc lookup) are defined in **`.ai/PROJECT_ARCHITECTURE.md § Toolchain`**.
Use exactly those — never assume a binary or a flag set. If a command is missing there, ask before inventing one.

## Non-Obvious Traps

This project has footguns that are not discoverable from reading a single file. The details are in `.ai/PROJECT_ARCHITECTURE.md`, but be aware they exist before you touch related code:

- **ESM NodeNext extensions** — relative imports must carry the `.js` extension even inside `.ts` files; the wrong extension breaks resolution.
- **`erasableSyntaxOnly` is on** — `enum`, `namespace`, and parameter properties are compile errors; use union literals plus zod.
- **Type assertions are banned** — lint forbids `as`; external data enters only through a schema `parse`, and `JSON.parse` returns `unknown`.
- **TypeScript is deliberately pinned below 6.1** — the lint toolchain's peer range; bumping it breaks `npm install`.
- **The agent-session SDK is 0.x** — its API drifts across minors; the dependency range pins the minor on purpose.
- **`loops/` is runtime data, not code** — YAML and prompt files are invisible to the type-checker; they are validated at load, never imported.

## Test Philosophy

Tests are a specification, not a formality. This section binds whoever designs the test
inventory and whoever judges the tests against it — the process chapter (line 1) names the
roles and the phases:

- **Happy path + every failure path** — if something can go wrong, test that it fails correctly.
- **Boundary values** — 0, 1, max, max+1, null, undefined, empty string, empty array, negative.
- **Async states** — pending, resolved, rejected, aborted, partial/out-of-order chunk, timeout.
- **Auth** — test both authorized AND unauthorized for every guarded call; test token-expiry path.
- **Validation** — every schema rule, valid and invalid input, including edge combos.
- **State transitions** — before/during/after of any state change.
- **Side effects** — requests fired, aborts called, events emitted, cache invalidated, callbacks invoked exactly once.
- **Table-driven tests** for variants — never duplicate test bodies.
- **Never test the framework or the library** — test YOUR adapter, YOUR mapping, YOUR error handling.

## What NOT to Test (and why)

- **Third-party / headless primitives you don't own** — snapshot/render tests on them are high-maintenance and low-value: they break on cosmetic changes and assert library behavior you don't own. Test the **orchestration, mapping, and handlers** that feed them instead. Here that means the wrapped externals themselves — the agent-session SDK, subprocess execution (execa), git plumbing (simple-git), YAML parsing internals: test OUR wrappers' mapping and error handling, never the library's own behavior.
- **Pure presentational wrappers** with no logic — covered by type-checking, not unit tests. Here: type-only files (`src/reset.d.ts`).

> If you disagree with an exclusion, raise it — don't silently test around it.

## Coverage Targets

> Baseline defaults below — adjust per project, but justify any reduction. Keep the **Project floor**
> row label verbatim — it is the anchor the floor is checked against `PROJECT_ARCHITECTURE.md § Testing`.

| Layer                                              | Target  | Rationale                          |
|----------------------------------------------------|---------|------------------------------------|
| Domain logic (loop parsing, state machine, check running, prompt composition) | 95%+    | Where bugs cost the most           |
| Client layer (session/subprocess/git wrappers, schema validation, error mapping) | 90%+    | The external boundary is the failure boundary |
| CLI handlers & report rendering (with branching logic) | 80%+    | Real logic, worth covering         |
| Type-only files / third-party internals            | excluded | See "What NOT to Test"            |
| **Project floor**                                  | **90%** | Non-negotiable minimum             |

Track with the `coverage` command in `§ Toolchain`.

## Conventions

- Use the project's scaffolding/codegen commands for new files where they exist (`§ Toolchain`); otherwise follow sibling-file structure.
- Check sibling files before inventing a new pattern.
- Don't add dependencies or create new top-level directories without user approval.
- Descriptive naming — never `data()`, `handle()`, `tmp`.
- Test placement follows **`PROJECT_ARCHITECTURE.md § Testing`** (co-location where the stack supports it).
- API responses are validated at the boundary (schema parse), never blind-cast from `any`/`unknown`.

## Reference

- Stack, versions, toolchain, API contract, runtime wiring, library specifics: **`.ai/PROJECT_ARCHITECTURE.md`**.
- Library docs: always confirm against the **installed version**, not memory. For the agent-session SDK (0.x, fast-drifting) check the official Anthropic Agent SDK docs and changelog against the pinned minor; for everything else use the official docs of the lockfile version.
- Per-feature artifacts go in `.ai/plans/`; their templates live in `.ai/templates/` — the
  active profile's chapter (line 1) says which are in play.
