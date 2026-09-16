# NOVA — Step 0 — Foundation Reset

## Objective

Step 0 establishes the technical foundation of NOVA: one canonical simulation state, an explicit deterministic tick, explicit phase order, application-level commands/queries/persistence, and a deterministic verification suite. No new gameplay mechanics beyond the documented housing → colonist causal chain.

## Initial architecture

The repository contained **only documentation** (`docs/`, 32 documents) and `roadmap/step0.md`. No source code, no `package.json`, no tests, no git history. There was nothing to audit, preserve or migrate: Step 0 was executed as a greenfield reconstruction strictly following the consolidated documentation.

## Problems found

- No code existed at all (no entry point, no canonical state, no simulation, no persistence).
- No tooling existed (no typecheck, lint, test or build).
- No git history.

## Target architecture

```text
src/
├── domain/
│   ├── world/          # grid, bounds, cell keys (docs/05)
│   ├── building/       # lifecycle: underConstruction → operational (docs/06)
│   ├── population/     # colonist identity + residence (docs/07)
│   ├── housing/        # derived capacity/occupancy + deterministic iteration
│   └── simulation/     # canonical state, commands, phases, step, hash
└── application/
    ├── commands/       # dispatchCommand (single sanctioned mutation path)
    ├── queries/        # renderSnapshot + inspection projections
    └── persistence/    # versioned save/load over canonical state
```

Dependency direction enforced: `application → domain` only. Domain imports nothing from application, UI or rendering. No rendering/ui layers yet — none exist to preserve; they are deferred to the first rendering step.

## Implementation

- Tooling: TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), ESLint (typescript-eslint recommended), Vitest, `tsc` build emitting to `dist/`.
- Canonical state (`SimulationState`): deterministic world config (seed, dimensions), explicit `time.tick`, `buildings`/`colonists` records, integer ID counters.
- Simulation API: `stepSimulation(state, command?)` — pure, non-mutating, no wall clock, no randomness.
- Explicit phase order:
  1. `applyCommand` — validated placement (bounds, free cell, known type); invalid command = explicit no-op.
  2. `advanceConstruction` — decrement remaining; 0 ⇒ `operational`.
  3. `updatePopulation` — colonist created and assigned iff an operational unoccupied residence exists; lowest building id first.
  4. `advanceTime` — `tick + 1`.
- Deterministic serialization (`canonicalJson`: sorted keys) and FNV-1a 64-bit canonical hash over UTF-16 code units (environment-independent).
- Persistence: `{ format: 'nova-save', version: 1, state }`; load validates shape, rejects wrong format/version, malformed JSON, unexpected state fields (round-trip canonical re-serialization check).
- Housing occupancy is derived from `colonist.residenceId` (single source of truth; no duplicated resident pointer on buildings).
- All collection iteration sorted by key; stable deterministic IDs (`building-N`, `colonist-N`) from canonical counters — never random, never generated from insertion order.

## Domain model

- `WorldConfig { seed, width, height }` — buildable bounds only (terrain variables intentionally absent until a system consumes them).
- `BuildingState { id, type, x, y, status: underConstruction|operational, constructionRemaining }` + deterministic catalog: `residence` = 2 construction ticks, capacity 1.
- `ColonistState { id, residenceId | null }` — no needs/employment (later phases).
- `SimulationState { config, time, buildings, colonists, counters }`.

## Simulation

Real phase order (see Implementation). A newly operational residence admits its colonist in the same tick (phase 2 → phase 3), documented and tested.

## Determinism

Verified guarantees:
- same initial state + same command sequence ⇒ same canonical hash (tested repeat scenario);
- key insertion order never affects serialization/hash;
- no `Math.random`, `Date.now`, `new Date()`, unordered iteration anywhere in `src`;
- hash independent of environment (code-unit based, no `TextEncoder`).

## Persistence

Verified: save/load round-trip preserves canonical state and hash; simulation continued from a loaded state is hash-identical to continued simulation from the original; snapshots of loaded state equal snapshots of original; unsupported version, wrong format, malformed JSON and extra state fields all rejected.

## Tests

25 tests, 5 files:
- `tests/state.test.ts` — initial state, config validation, deterministic serialization/hash.
- `tests/simulation.test.ts` — tick advancement, no input mutation, full causal scenario, invalid placement no-ops, lifecycle gating, stable admission tie-break, inspection queries, shape stability.
- `tests/determinism.test.ts` — mandatory repeat scenario (level 4), insertion-order invariance, divergence on different commands.
- `tests/persistence.test.ts` — round-trip, post-load behavioral equivalence, version/format rejection, unexpected-field rejection, snapshot equivalence.
- `tests/renderSnapshot.test.ts` — snapshot derivation, no canonical mutation.

## Verification

```text
lint:         PASS (eslint, 0 errors)
typecheck:    PASS (tsc --noEmit, strict)
test:         PASS (25/25)
build:        PASS (tsc -p tsconfig.build.json → dist/, smoke-run from dist OK)
determinism:  PASS (hash-identical repeated scenario)
persistence:  PASS (round-trip + post-load equivalence + rejection tests)
E2E:          NOT RUN — no browser app exists yet
visual:       BLOCKED — no UI/renderer exists yet; nothing to observe
madge:        PASS (no circular dependency, 20 files)
```

## Remaining issues

- No UI/rendering layer: the render snapshot projection exists and is tested, but nothing consumes it yet. Visual verification is impossible until the first rendering step.
- No git repository initialized at Step 0 start (recommended before Step 1).

## Deferred features

- zones, roads, road influence, autonomous development
- needs, services, food/water/power, jobs, money, production
- transport, vehicles, technology, UI, Three.js renderer, camera/controls, E2E/GPU validation
- colonist depth beyond identity + residence

## Architectural decisions

1. **Greenfield reconstruction** — repo empty; docs fully define target; nothing to preserve.
2. **Records + sorted iteration** instead of insertion-ordered maps — canonical determinism explicit at every iteration site.
3. **Occupancy derived from colonists**, not stored on buildings — one source of truth for the residence relationship.
4. **Invalid command = explicit no-op** returning unchanged state with a reason — deterministic, no exceptions crossing the phase boundary.
5. **FNV-1a 64-bit over UTF-16 code units** — avoids `TextEncoder` (environment-agnostic), sufficient for canonical comparison; revisit only if hash-based deduplication at scale is ever needed.
6. **Colonist admitted same tick as operational completion** — follows phase order (construction before population); documented in tests.
7. **No generic service/event/manager abstractions** — per abstraction rule; `dispatchCommand` is the only boundary function.
