# NOVA — Current Project State

> **Authority:** this file describes the repository's actual implementation state. It is not a product wish-list.

## Purpose

`STATE.md` is the operational snapshot for humans and coding agents.

It answers:

- What exists?
- What is currently being worked on?
- What is validated?
- What is known to be incomplete?
- What is the next approved implementation boundary?

## Rules

1. Never invent state.
2. Update this document only from observed repository evidence.
3. Distinguish implemented, tested, partially implemented, planned and unknown.
4. Do not mark a feature complete because its code exists; completion requires its acceptance criteria and validation.
5. Historical details belong in step reports or Git history, not here.
6. If the state is stale or contradictory, inspect the repository before continuing.

## Project Identity

- Product: NOVA
- Genre: 3D stylized city-builder / civilization-builder
- Initial mode: Sandbox
- MVP target: complete Age 1 + beginning of Age 2
- Primary gameplay: build → produce → store → distribute → consume → analyse → optimise → develop → milestone → new age

## Repository State

> Observed 2026-10-07. HEAD `87f862e` (Step001 money migration).

- Branch: `master`
- HEAD: `87f862e` — test(nova): migrate audit suites to Step001 money model
- Worktree: DIRTY — 9 modified test files, uncommitted (pre-date this docs pass; see Step001)
- Package manager: `pnpm`
- Runtime/toolchain: Node + Vite + Vitest + Playwright + ESLint + `tsc --noEmit`; strict TypeScript; single runtime dependency `three`
- Build status: NOT RERUN in this pass (HEAD commit message claims `vite build` succeeds)
- Test status: MIXED — `tsc` clean, `eslint` clean, `vitest run` 339 failed / 1538 passed (1877) — expected mid-Step001 pattern, see Step001
- E2E status: NOT RUN in this pass (27 Playwright scripts in `e2e/`, real-browser via `vite preview`)

## Implementation State

Observed values only (HEAD `87f862e`, 2026-10-07).

| Area | Status | Evidence |
|---|---|---|
| Repository foundation | Implemented | pnpm, strict TS, Vite, Vitest, Playwright, ESLint; scripts in `package.json` |
| Deterministic world | Implemented (mechanism) | fixed tick (`domain/simulation/step.ts`), seeded world (`domain/world/grid.ts`), `determinism.test.ts`; full-suite signal red for unrelated Step001 reasons |
| Camera / navigation | Implemented | `src/renderer/three/` (scene, camera, reconcile); real-browser E2E in `e2e/` |
| Construction | Implemented | `domain/building/building.ts`, `domain/road/road.ts`, placement queries; costs in Money (Step001) |
| Population | Partial | individual `ColonistState` + manual reassignment (`domain/population/colonist.ts`, `domain/jobs/jobs.ts`); aggregate-first pending (Step000 D3) |
| Needs | Partial | binary `fed` / `shortage` signals (`domain/simulation/phases.ts`); no progressive satisfaction/QoL bands |
| Production | Partial | 3 direct producers, no input chains, no maintenance-as-input (`domain/simulation/phases.ts`) |
| Storage | Implemented | `domain/storage/storage.ts`; Food/Water capacity; Money uncapped and accounted, not stored |
| Logistics | Partial | road network + building access contract (`domain/network/network.ts`, `domain/road/road.ts`); aggregate flow effects unverified (Step000 gap #8) |
| Analysis | Implemented | inspection/diagnosis queries (`application/queries/inspection.ts`) |
| Economy | In progress | Money treasury (tax + commerce), maintenance on operational buildings (`domain/resource/resource.ts`); baseline constants validated by user 2026-10-07; suite red mid-migration (Step001) |
| Environment | Missing | no pollution/environment system in `src/domain` |
| Technology | Missing | no technology system in `src/domain` |
| Age 1 | Partial | Settlement → Village → Town capability stages; Town intentionally undefined (Step000) |
| Age 2 beginning | Missing | deferred, no code |
| Persistence | Implemented | `SAVE_VERSION = 9`, migrations 4–8 (`application/persistence/save.ts`); version assertions part of red Step001 suite |
| Performance | Partial | hotspot fixes landed (road BFS/adjacency); no recorded benchmark baseline in docs |

## Known Issues

Only reproducible issues with evidence.

- Step001 money migration incomplete: `vitest run` 339 failed / 1538 passed (1877), uniform old-model-expectation pattern (Material costs, SAVE_VERSION 6/7 assertions). Details in `roadmap/Step001-money-migration.md`.
- Worktree dirty: 9 modified test files, uncommitted (pre-date the 2026-10-07 docs pass).
- Day-0 colony size decided 2026-10-07 (D2, Option A): 10-inhabitant canonical start; ~100 = MVP scale target via growth. Code migration of the start (currently empty world + 1-colonist bootstrap) is pending implementation.
- Manual colonist reassignment deprecated as soon as the aggregate model (D3) is frozen (D4, 2026-10-07).

## Deferred Scope

Unless explicitly promoted by a product decision, these remain post-MVP:

- advanced diplomacy;
- complex BOT civilizations;
- advanced warfare;
- large-scale colonization;
- complete world economy;
- full resource catalogue;
- scenarios/challenges;
- multiplayer;
- individual citizen simulation;
- individual courier simulation;
- advanced finance;
- factions.

## Current Approved Step

`Step001 — Money Migration` (`docs/roadmap/Step001-money-migration.md`, in progress).
Close-out boundary: finish the 9-file test migration, commit, full green suite, build + E2E, product review of the D1 remainder. Step000 D2–D4 remain open and out of scope.

## Update Protocol

After a meaningful implementation step:

1. inspect Git state;
2. inspect changed files;
3. run required validation;
4. update only facts supported by evidence;
5. record the next approved step;
6. commit the state change together with the relevant work when appropriate.
