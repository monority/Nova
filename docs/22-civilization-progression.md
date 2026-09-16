# NOVA — 22 Civilization Progression

Date: 2026-09-16
Status: implemented (Step 22)

## Stages

Four stages, contract thresholds (`docs/20-product-contract.md`):

```text
WILDERNESS  — default, no conditions met
SETTLEMENT  — population >= 20 AND houses >= 1
VILLAGE     — population >= 50
TOWN        — population >= 500
```

## Evaluation rule

Pure function `evaluateCivilizationStage({ population, houses })`.
Condition order matters: town → village → settlement → wilderness.
The stage is a projection of current state, not stored progression:
no history, no lock, no XP.

Housing stock counts `house` + `apartment` (densified houses remain
housing stock, otherwise densification could regress the stage).

## Architecture

```text
src/domain/civilization/civilization-stage.ts — type, thresholds, evaluator
src/domain/civilization/index.ts               — public API
src/application/queries/to-civilization-stage.ts — projection + transition
```

No simulation loop change, no tick change, no renderer ownership.
Stage computed on demand from `SimulationState` (`toCivilizationStage`),
exactly like the Step 21 resource summary.

## Transitions

`detectStageTransition(previous, current)` returns
`{ previous, current, tick }` or null.
`projectStageTransitionGroup` wraps a real transition as a feed group
(`SETTLEMENT ESTABLISHED`, `VILLAGE ESTABLISHED`, `TOWN ESTABLISHED`).
The group carries no selectable object; feed click is a no-op for it.
No EventManager, no replay, no persisted history.

## UI

Header readout reusing `population-readout` style:

```text
STAGE — WILDERNESS / SETTLEMENT / VILLAGE / TOWN
```

Transitions appear in RECENT CHANGES. No badge gamifié, no XP bar,
no popup, no modal.

## Voluntarily out of scope

Households, workers, wellbeing, unlocks, quests, new resources,
new buildings, persistence, state hash, terrain. Population model
unchanged (`total` + `growthProgress`); economy untouched.
