<p align="center">
  <img src="assets/icon.png" alt="McFly Loop — pixel-art DeLorean icon" width="160">
</p>

# McFly Loop

A deterministic orchestrator for multi-agent TDD loops: the human starts a run
and is called back only when it ends. Everything between those two moments —
session spawning, exit-condition checking, state transitions, phase-boundary
snapshots — is owned by a non-LLM program, not by the models themselves.

**Status: early implementation.** The loop syntax and its safety analysis
exist; orchestrator code has started with the `mcfly` CLI scaffold — the
`fly` subcommand is the first implemented feature (COINE-65).

## Concept

A *loop* is a YAML file describing a multi-agent workflow as a graph of steps.
Each step declares:

- `role` — who runs it (Designer, Test-Writer, Verifier, Implementer);
- `model` / `harness` — what runs it (e.g. Claude Code, Codex CLI);
- `goal` — a one-line deterministic objective;
- `done_when` — the hard perimeter: machine-checkable exit conditions
  (exit codes, diffs, counts, artifact state lines), keyed by outcome;
- `next` — outcome → step routing, same keys as `done_when`;
- `prompt` — a path to a Markdown file carrying only the behavior the checks
  cannot express.

Each session receives the loop-wide `rules`, its step's `goal` and `done_when`,
and its prompt. A step is finished when the conditions of exactly one outcome
are all true; the orchestrator re-runs the mechanical checks itself and never
trusts self-reported results.

The reference loop is `loops/pipeline_loop.yaml`: a five-step TDD pipeline
(design → write_tests → verify_gate → implement → verify_review) with a hard
wall between test authorship and implementation, an approval gate before any
code is written, and an escalation policy for the scarce top-tier model.

## Repository layout

```
loops/                  Loop definitions
  pipeline_loop.yaml    Reference loop (5-step TDD pipeline with gate)
  prompts/              Per-role prompt files referenced by the loops
src/                    Orchestrator source — `mcfly` CLI entrypoint + Controller layer
tests/                  Vitest test suite
```

## Toolchain

Node ≥ 24, TypeScript locked down as far as it goes: strictest `tsconfig`
(including `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`erasableSyntaxOnly`, `isolatedDeclarations`), `typescript-eslint`
`strictTypeChecked` with type assertions (`as`) banned and exhaustive
switches enforced, `ts-reset`, and zod validation at every external boundary.

| Command             | Purpose                              |
| ------------------- | ------------------------------------ |
| `npm run check`     | typecheck + lint + tests, in order   |
| `npm run typecheck` | `tsc` over `src` and `tests`         |
| `npm run lint`      | ESLint (type-aware)                  |
| `npm run test`      | Vitest, single run                   |
| `npm run dev`       | Run `src/main.ts` via tsx            |
| `npm run build`     | Compile `src` to `dist`              |

## Tracking

Work is tracked on Linear, project **McFly Loop** (team Coiné). The security
analysis of the autonomous-run scenario lives in issues COINE-59…64, labeled
*To Be Grilled*: each one is written to seed a grilling session on a design
decision not yet made.

The pipeline loop derives from the internal Notion page
[Pipeline Loop](https://app.notion.com/p/coine/Pipeline-Loop-3c8b99010086817ab86ff4cdc5daff34).
