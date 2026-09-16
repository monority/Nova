# NOVA — 23 Canonical Simulation Tick + State Hash

Date: 2026-09-16
Status: implemented (Step 23)

## Tick definition

```text
1 simulation tick = 1 simulated day
30 ticks = 1 month
360 ticks = 1 year
```

Single source: `SIMULATION_TIME` in `simulation-clock.ts`
(`TICKS_PER_DAY`, `DAYS_PER_MONTH`, `DAYS_PER_YEAR`, `SECONDS_PER_DAY`).

## Render frame vs simulation tick

The renderer runs at display rate (rAF). The domain advances whole days.
`SimulationRuntime` accumulates real seconds × speed into whole ticks
(`BASE_TICKS_PER_SECOND = 1`: speed N runs N ticks per real second).
A 0.25 s frame bound prevents spiral-of-death stalls; excess is reported
as `droppedRealSeconds` / `droppedSimulationTicks`, never silently lost.

Speeds change only the number of ticks per real second — never tick math.

## Canonical order

`CANONICAL_TICK_PHASES` in `simulation-state.ts`:

```text
Commands
   ↓
Accessibility
   ↓
Production
   ↓
Consumption
   ↓
Housing
   ↓
Construction
   ↓
Events
   ↓
Canonical State
   ↓
State Hash
```

Mapping onto existing systems:

```text
commands      → player commands apply synchronously at the commit
                boundary (runtime.commitState), never mid-tick
accessibility → road access derived on demand (validation, scoring,
                coverage); no cached accessibility state exists
production    → farm/service/settlement output in advanceEconomy
consumption   → food/energy consumption in advanceEconomy
housing       → capacity-capped growth in advancePopulation
construction  → affordability-gated advanceDevelopment + cost deduction
events        → pure projections (projectUrbanChanges,
                projectStageTransitionGroup), never stored
hash          → getSimulationStateHash on demand, never stored
```

Autonomous development cadence: `DEVELOPMENT_INTERVAL_TICKS = 10` days
(same real-time pacing as before at 1x: previously 600 sub-second ticks).

## Canonical state

`toCanonicalSimulationState` (`domain/simulation/canonical-state.ts`):

Included — everything that determines the simulation future:

```text
tick, seed, world (dims + all cells), population, economy stocks,
buildings, roads, zones (+ cells), services, id sequences, stage
```

Excluded:

```text
React state, Three.js objects, camera, DOM, callbacks, functions,
occupancy map (rebuilt from buildings/roads/services),
per-tick flow values (recomputed), UI state, wall-clock time
```

The stage is recomputed during canonicalization (single source: evaluator).
The world is fully expanded so any simulation-relevant terrain change
moves the hash, while seed + dimensions document regeneration.

## Serialization

Explicit construction order + `JSON.stringify`. All collections sorted by
stable ID (zone cells by y/x). Floats normalized to 6 decimals (`round6`);
non-finite values throw instead of hashing silently.

```text
logical same state + different insertion order = same bytes
```

## Hash

FNV-1a 32-bit over the canonical bytes → 8 lowercase hex chars.
Sync, zero-dependency, renderer/React/browser independent.
Divergence detector, not a cryptographic proof.

API: `getSimulationStateHash(state)`.

## STEP and speeds

`STEP` = exactly +1 tick = +1 day at any speed.
Pause / 1× / 2× / 5× / 20× / 100× / STEP / RESET preserved.
Header now shows canonical time: `YEAR x / DAY y · TICK n · status`.

## Determinism strategy

Seeded RNG only at world generation; no `Date.now()`,
`performance.now()`, `Math.random`, browser, DOM or Three.js input in
the tick path. Deterministic tie-breaks everywhere (position, then ID).
Floats normalized at the canonical boundary.

## Known limits

- Float math is unchanged engine-wide; only the canonical boundary
  normalizes (documented, no fixed-point rewrite per spec).
- `droppedSimulationTicks` counts ticks intentionally skipped after a
  stall instead of freezing the client (reported, never silent).
- Persistence (SaveGameV1) is Step 24, not this step.
