# QA — Step 23 Canonical Simulation Tick + State Hash

Date: 2026-09-16

## Scope verification

Implemented:

```text
canonical simulation tick
tick = 1 simulated day
render frame / simulation tick separation
explicit phase order
canonical state
canonical serialization
stable collection ordering
state hash
determinism tests
STEP alignment
speed alignment
documentation
```

Not implemented (as required):

```text
SaveGameV1
autosave
manual save
load
localStorage
IndexedDB
households
workers
jobs
wellbeing
markets
trade
logistics
power grid
new buildings
new resources
new terrain
biomes
128x128 world
technology tree
quests
achievements
XP
performance instrumentation
major renderer changes
```

## Canonical tick

Tick definition: 1 tick = 1 day (`SIMULATION_TIME`, 30/360 month/year).
Tick order: `CANONICAL_TICK_PHASES` (commands → … → hash), mapped onto
existing systems; empty phases are explicit identity steps.
STEP behavior: exactly +1 tick / +1 day at any speed.
Speed behavior: N× = N ticks per real second; tick math untouched.

## Canonical state

Included: tick, seed, world cells, population, economy stocks, buildings,
roads, zones, services, sequences, recomputed stage.
Excluded: React/Three/camera/DOM/callbacks/UI/wall-clock, occupancy map
(rebuilt), per-tick flows (recomputed).

## Serialization

Explicit field order, ID-sorted collections, 6-decimal float
normalization, insertion-order insensitive (tested).

## Hash

Algorithm/API: FNV-1a 32-bit, `getSimulationStateHash(state)`.
Output format: 8 lowercase hex chars.
Determinism: same seed + commands + ticks = same hash (1/10/100 ticks
tested); any real difference (population, food, position, type, road,
zone, tick) changes it.

## Tests

New: 9/9 pass (`canonical-simulation.test.ts`).
Rewritten for new time model: `simulation-clock.test.ts`,
`simulation-runtime.test.ts`.
Full unit suite: 94/94 pass (27 files).
E2E: STEP assertion aligned to canonical time (DAY 02 / TICK 1).

## Validation

```text
pnpm typecheck: PASS (tsc -b, no errors)
pnpm lint: PASS (eslint, no errors)
pnpm test: PASS (27 files, 94 tests)
pnpm build: PASS (Vite, 799KB chunk warning only)
pnpm test:e2e:gpu: PASS (6/6, RTX3070 ANGLE/D3D11)
```

## Production changes

```text
Production behavior changed: YES (time model)
Tick math: 1 tick now advances 1 full day (population +60/day cap,
economy daily rates, development every 10 days)
Pacing preserved: dev cadence and speeds feel identical in real time
Simulation rules changed: pacing units only, no new gameplay
```

## Contract impact

Implements contract §3.1 units/clock and §3.2 tick order structurally.
Known remaining gap (pre-existing, documented in 20.1): the population
growth formula and housing model differ from the contract's wellbeing
equation — unchanged by this step on purpose. No contract file modified.

## Final status

PASS — Canonical Simulation Tick + State Hash implemented
