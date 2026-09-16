# QA — Step 22 Civilization Progression

Date: 2026-09-16

## Scope verification

Implemented:

```text
CivilizationStage
stage thresholds
pure evaluator
simulation/snapshot integration (projection)
stage transition detection
RECENT CHANGES integration
compact stage readout
unit tests
transition tests
E2E smoke adjustment
documentation
```

Not implemented (as required):

```text
households
workers
jobs
wages
wellbeing
happiness
migration
markets
trade
logistics
power grid
technology tree
unlock tree
quests
achievements
XP
level system
new resources
new buildings
new terrain
persistence
SaveGameV1
state hash
canonical command log
performance instrumentation
```

## Architecture

Created:

```text
src/domain/civilization/civilization-stage.ts
src/domain/civilization/index.ts
src/application/queries/to-civilization-stage.ts
tests/unit/civilization-stage.test.ts (11 tests)
docs/22-civilization-progression.md
docs/qa/step22-civilization-progression.md (this report)
```

Modified:

```text
src/app/composition/App.tsx        — STAGE readout, stage group in feed, selection guard
tests/e2e/nova.spec.ts             — stage readout smoke test (WILDERNESS)
```

## Civilization model

```text
Wilderness: population < 20 or no house
Settlement: population >= 20 and houses >= 1
Village: population >= 50
Town: population >= 500
```

## Transitions

Detected by pure state comparison, single group per transition,
stable key `tick:STAGE:stage`, correct tick, no event when unchanged.

## UX

Stage visible in header next to population/resources.
Transitions surface in RECENT CHANGES as `X ESTABLISHED`.
No causal claim, no gamification.

## Tests

New: 11/11 pass. Full unit suite: 85/85 pass (26 files).
E2E: stage smoke test added.

## Validation

```text
pnpm typecheck: PASS (tsc -b, no errors)
pnpm lint: PASS (eslint, no errors)
pnpm test: PASS (26 files, 85 tests)
pnpm build: PASS (Vite, 799KB chunk warning only)
pnpm test:e2e:gpu: PASS (6/6, RTX3070 ANGLE/D3D11)
```

## Production changes

```text
Production behavior changed: YES (additive readout + feed only)
New systems: civilization progression readout
Simulation rules changed: NO
Economy changed: NO
```

## Contract impact

Stage thresholds match `docs/20-product-contract.md` simplified table
(population/houses only). Full contract stage conditions (food/energy
sources, coverage, wellbeing windows) remain future scope; documented
in `docs/22-civilization-progression.md`. No contract file modified.

## Final status

PASS — Civilization Progression implemented
