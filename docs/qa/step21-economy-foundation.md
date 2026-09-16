# QA — Step 21 Economy Foundation

Date: 2026-09-16

## Scope verification (all NOT implemented, as required)

```text
households: NO
workers: NO
markets: NO
trade: NO
logistics: NO
power grid: NO
civilization stages: NO
persistence: NO
state hash: NO
new terrain: NO
```

New systems: economy only (food + energy + materials).

## Architecture

Created:

```text
src/domain/economy/resource-costs.ts       — constants + CONSTRUCTION_COSTS + EVOLVE_COST
src/application/queries/to-resource-summary.ts — pure player-facing projection
tests/unit/economy-foundation.test.ts      — 10 focused tests
docs/21-economy-foundation.md              — resource model reference
docs/qa/step21-economy-foundation.md       — this report
```

Modified:

```text
src/domain/economy/economy-state.ts                  — energy/materials state, production, spend
src/domain/economy/index.ts                          — public API export
src/domain/simulation/simulation-state.ts            — tick integration + autonomous cost deduction
src/domain/development/development-system.ts         — affordability gating + capped road extension
src/domain/construction/placement.ts                 — 'insufficient_materials' reason
src/domain/construction/roads.ts                     — 'insufficient_materials' reason
src/domain/city/services.ts                          — 'insufficient_materials' reason
src/application/commands/construction.ts             — affordability check + material deduction
src/application/scenarios/create-initial-settlement.ts — contract starting values 180/120/300
src/app/composition/App.tsx                          — RESOURCES readout (toResourceSummary)
tests/unit/construction-commands.test.ts             — funded runtime fixture
tests/unit/road-commands.test.ts                     — funded runtime fixture
tests/e2e/nova.spec.ts                               — resource summary smoke test
```

## Economy

```text
Food:      farm +8/day, 0.1/person/day, start 180
Energy:    service +12/day, 1/building/day + 1/20 people/day, start 120
Materials: settlement +6/day, construction only, start 300
Costs:     house 20, farm 20, apartment 35, evolve 15, road 5, community 30
Shortage:  deterministic clamp, construction rejected/deferred, never negative
```

## UX

Compact header readout reusing `population-readout` style.
`CONSTRAINED` flag appended on food/energy shortage.
No dashboard, no neon, no gamified badges.

## Tests

New: 10/10 pass (`economy-foundation.test.ts`).
Full unit suite: 74/74 pass (25 files).
E2E: resource summary smoke test added (FOOD 180 / ENERGY 120 / MATERIALS 300).

## Validation

(Recorded after implementation — see final tool output.)

```text
pnpm typecheck: PASS (tsc -b, no errors)
pnpm lint: PASS (eslint, no errors)
pnpm test: PASS (25 files, 74 tests)
pnpm build: PASS (Vite 227ms, 799KB chunk warning only)
pnpm test:e2e:gpu: PASS (5/5, 5.9s, RTX3070 ANGLE/D3D11)
```

## Production changes

```text
Production behavior changed: YES
New systems: economy only
Behavior: manual construction now costs materials; autonomous development
defers when materials are insufficient; settlement starts at 180/120/300.
```

## Final status

PASS — Economy Foundation implemented
