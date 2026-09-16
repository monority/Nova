# NOVA — 21 Economy Foundation

Date: 2026-09-16
Status: implemented (Step 21)

## Resource model

Three explicit MVP resources, immutable transitions, no string-keyed maps:

```text
food      — population constraint
energy    — building + population constraint
materials — construction constraint (no continuous population consumption)
```

Domain files:

```text
src/domain/economy/resource-costs.ts  — MVP constants + construction costs
src/domain/economy/economy-state.ts   — state, production, consumption, spend
src/domain/economy/index.ts           — public economy API
```

## Starting values (contract)

```text
food: 180
energy: 120
materials: 300
```

`createEconomyState()` still returns zeros (empty world).
`createInitialEconomyState()` returns contract values, used by `createInitialSettlement`.
No households/workers: existing aggregate `PopulationState.total` preserved.

## Production

```text
food:      farm → +8 / day (preserved)
energy:    community service → +12 / day (contract Generator rate)
materials: settlement source → +6 / day (contract basic source rate)
```

Materials come from a settlement-level trickle, not an extraction chain.
This is an explicit MVP simplification.

## Consumption

```text
food:   0.1 / person / day (preserved)
energy: 1 / building / day + 1 / 20 people / day
materials: construction only, no passive drain
```

Shortages are clamped states, never negative:

```text
foodShortage   = max(0, consumed - available)
energyShortage = max(0, consumed - available)
```

## Construction costs (centralized)

```text
house: 20 materials
farm: 20 materials
apartment (new): 35 materials
house → apartment evolution: 15 materials
road: 5 materials
community service: 30 materials
```

Costs live in `CONSTRUCTION_COSTS` / `EVOLVE_COST`.
Manual placement checks affordability first and returns
`insufficient_materials` instead of placing.
Autonomous development skips unaffordable options and caps road
extension by remaining materials.
Autonomous deltas are deducted in `advanceSimulationTick`
via `measureDevelopmentCost`, so ticks never produce negative materials.

## Tick integration

```text
tick
 → clock
 → population
 → economy (production/consumption + trickle)
 → development (gated by affordability)
 → deduct autonomous material cost
```

Resources update on simulation ticks only, never per render frame.

## UI representation

Pure projection `toResourceSummary(state)` → `{ food, energy, materials, shortages, constrained }`.
Header readout (existing `population-readout` style, no new HUD language):

```text
RESOURCES — FOOD 180 · ENERGY 120 · MATERIALS 300 (· CONSTRAINED when shortage)
```

Failed construction exposes `insufficient_materials` at the command
boundary; no fake causal narrative is generated (Step 18/19 rule kept).

## Deterministic guarantees

Same seed + same commands → same resource state.
No `Date.now()`, no unseeded random, no renderer input.
Covered by `economy-foundation.test.ts` identity test.

## Known limitations (future economy, not this step)

```text
households / workers, wages, markets, trade, logistics,
power grids, industrial chains, taxes, money,
civilization stages, persistence, canonical state hash, new terrain
```
