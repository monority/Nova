Tu travailles sur NOVA.

# Step 10AL — Implement Settlement/Village Progression & Scenario Framing

## Starting point

Starting commit:

`b4a645e`

Step 10AK a produit le premier contrat de progression réellement justifié.

### Supported progression

```text
Wilderness
    ↓
Settlement
    ↓
Village
```

### Deferred progression

```text
Village
    ↓
Town       — NOT YET CONTRACTABLE
    ↓
City       — NOT YET CONTRACTABLE
    ↓
Metropolis — NOT YET CONTRACTABLE
    ↓
Autonome   — NOT YET CONTRACTABLE
```

### Existing causal contracts

#### Wilderness → Settlement

Settlement is reached when all three existing conditions are true:

```text
population >= 1
AND Food balance is positive/sustainable according to the existing model
AND an operational road network exists
```

Do not reinterpret these conditions.

#### Settlement → Village

Village is reached when:

```text
population >= 2
AND Water capacity >= 2
AND Food balance is positive/sustainable according to the existing model
```

The `2` values are not arbitrary:

* one staffed Well produces exactly 2 Water/tick;
* one Farm produces exactly 2 Food/tick;
* the first meaningful population expansion therefore has a causal capacity relationship.

Do not replace these with arbitrary population thresholds.

---

# HARD CONSTRAINT

This is an **implementation step**, but it must remain deliberately narrow.

Implement only:

1. Settlement/Village progression state derived from existing simulation state.
2. Scenario framing based on existing initial-state variables.
3. Objective display/framing.
4. Progression readability.
5. Scenario selection/start configuration if the existing architecture can support it without introducing a new simulation system.
6. Tests.
7. Browser/GPU validation.

Do NOT implement:

* Town progression;
* City progression;
* Metropolis progression;
* Autonome progression;
* new resources;
* new buildings;
* new production rules;
* new economic rules;
* new spatial rules;
* new adjacency;
* pollution;
* logistics;
* transport;
* satisfaction;
* happiness;
* technology;
* upgrades;
* XP;
* progression bonuses;
* unlock bonuses;
* arbitrary scoring.

The progression layer must **observe the simulation**, not modify it.

---

# 1. AUDIT BEFORE IMPLEMENTATION

Before changing code, inspect the existing architecture.

Locate:

* current simulation state;
* tick advancement;
* derived state/query layer;
* HUD;
* existing status/inspector UI;
* save/load;
* scenario/test infrastructure if any;
* browser test infrastructure;
* existing selectors/test IDs.

Determine the smallest clean location for:

```text
Progression
Scenario definition
Objective/framing
Progression queries
```

Do not create a new framework.

Prefer existing domain/application/query patterns.

---

# 2. ARCHITECTURAL CONTRACT

Progression must be derived from existing state.

Conceptually:

```text
Simulation State
       ↓
Progression Query
       ↓
Current Stage
Next Stage
Progress
Objective State
       ↓
UI
```

Do NOT do:

```text
Simulation
   ↓
persisted progression flags
```

unless the existing architecture already requires persistence.

The audit explicitly established:

* SAVE_VERSION = 7;
* 7 persisted top-level keys;
* no new persistent state required.

Therefore:

**Do not increment SAVE_VERSION.**

Do not add progression flags to saved simulation state.

---

# 3. PROGRESSION MODEL

Implement the smallest progression representation necessary.

The conceptual stages are:

```text
Wilderness
Settlement
Village
Town
City
Metropolis
Autonome
```

However only the first three are currently contractable.

Therefore the runtime must NOT pretend that later stages have conditions.

A valid representation could conceptually expose:

```text
currentStage
nextStage
stageStatus
progress
```

where later progression is explicitly deferred rather than represented by fake thresholds.

Use the project's existing naming conventions.

Do not invent a generic progression framework.

---

# 4. STAGE EVALUATION

Implement deterministic evaluation.

## Wilderness

Initial state before Settlement conditions are satisfied.

## Settlement

Satisfied iff:

```text
population >= 1
AND
Food balance is sustainable according to existing food model
AND
operational road network exists
```

Use the existing authoritative simulation/query logic wherever possible.

Do not duplicate production calculations if an existing query already exposes the relevant state.

## Village

Satisfied iff:

```text
population >= 2
AND
Water capacity >= 2
AND
Food balance is sustainable
```

Again, reuse existing domain/application queries.

---

# 5. IMPORTANT — FOOD BALANCE

Do not invent a new Food system for progression.

The progression query must use the same definition already used by the simulation.

If the existing code exposes:

* Food production;
* Food consumption;
* Food delta;
* survival condition;

reuse it.

There must be one authoritative interpretation of Food sustainability.

If no reusable query exists, create the smallest **read-only application query** necessary.

Do not change simulation behavior.

---

# 6. IMPORTANT — WATER CAPACITY

Village progression uses:

```text
Water capacity >= 2
```

This must correspond to the existing staffed Well production/capacity model.

Do not interpret current Water stock as capacity.

Distinguish:

```text
Water stock
```

from:

```text
Water production/capacity
```

The contract is about the existing capacity model.

---

# 7. PROGRESSION PROGRESS

The audit required five future-facing UX fields:

```text
Current stage
Next milestone
Progress toward milestone
Current blocking condition
Primary objective
```

10AK established that 4/5 can be computed from existing state and only the objective label requires scenario framing.

Implement the four computable pieces using existing state.

For `Progress toward milestone`, do not create a fake percentage if the milestone is conjunctive and no meaningful scalar exists.

Prefer a causal checklist when appropriate:

```text
Settlement
✓ Population
✓ Food sustainability
✓ Road network
```

and:

```text
Village
✓ Population >= 2
✓ Water capacity >= 2
✓ Food sustainability
```

If the existing UI conventions support a compact progress indicator, use it, but do not turn unrelated metrics into a weighted score.

---

# 8. CURRENT BLOCKING CONDITION

The progression UI should identify why the next milestone is not reached.

Examples:

```text
Settlement blocked:
- no colonist
- Food not sustainable
- no operational road network
```

or:

```text
Village blocked:
- population < 2
- Water capacity < 2
- Food not sustainable
```

Only show conditions that are actually false.

Do not invent advice or recommendations.

The system should explain state, not tell the player what political/economic strategy to choose.

---

# 9. OBJECTIVE / FRAMING

10AK established that the current runtime has no objective label.

Add the smallest objective/framing layer required by scenarios.

Conceptually:

```text
Scenario
  ↓
Objective label
  ↓
Progression UI
```

The objective must not alter simulation behavior.

Do not create an objective scoring system.

---

# 10. SCENARIO MODEL

Implement a minimal scenario representation.

A scenario is:

```text
initial state
+
existing constraints
+
objective/framing
```

It is NOT:

```text
new mechanics
```

The scenario must reuse the same simulation engine and rules.

Do not fork simulation logic per scenario.

---

# 11. SCENARIO SET

Implement only scenarios that can be represented entirely through existing state.

The six audited archetypes were:

### Scenario 1 — First Settlement

Purpose:

Establish the first sustainable settlement.

Uses existing:

* initial resources;
* buildings;
* roads;
* population;
* Food;
* Water.

Objective should map to the Settlement milestone.

---

### Scenario 2 — Water Constraint

Purpose:

Create a situation where Water capacity is the immediate limiting factor.

Use only existing Water/building/network state.

Do not add a Water-specific rule.

---

### Scenario 3 — Industrial Expansion

Purpose:

Make Workshop construction and Material production relevant.

Use existing:

* Material;
* Workshop;
* workforce;
* construction;
* Water requirement.

Do not add industrial mechanics.

---

### Scenario 4 — Spatial Efficiency

Purpose:

Make road cost and network layout relevant.

Use only:

* road cost;
* road connectivity;
* worker mobility;
* road distance.

Do not add land-efficiency mechanics.

---

### Scenario 5 — Population Expansion

Purpose:

Create a starting state where growth planning matters.

Use:

* Residence;
* Food;
* Water;
* workforce;
* existing admission rules.

---

### Scenario 6 — Recovery

Purpose:

Start from a partially developed but constrained settlement.

Use only existing simulation state.

Do not create a recovery mechanic.

---

# 12. SCENARIO CONTRACT

Each scenario must define only data.

Conceptually:

```text
id
name
description
initialState
objective
```

If the architecture requires additional fields, keep them strictly data-only.

Do not add callbacks containing simulation logic.

Do not add scenario-specific rules.

---

# 13. SCENARIO INITIAL STATES

This is important.

Use the smallest initial states capable of expressing each scenario.

Do not inflate them with unnecessary buildings.

For each scenario:

1. define initial resources;
2. define initial buildings;
3. define initial roads;
4. define initial colonists if needed;
5. define existing assignments only if needed;
6. verify the resulting state is valid according to current simulation invariants.

Do not alter the core initial game state unless the current scenario architecture requires it.

The existing default starting state must remain unchanged.

---

# 14. SCENARIO OBJECTIVES

Use only existing objective forms identified in 10AK:

### Survival

Maintain a stable settlement.

Do not hard-code an arbitrary duration unless the audited scenario already established a justified value.

### Milestone

Reach:

```text
Settlement
```

or:

```text
Village
```

### Constraint

Reach an existing measurable state while a starting constraint remains relevant.

Do not introduce hidden scoring.

---

# 15. DEFAULT GAME VS SCENARIOS

Preserve the existing default game.

The distinction should be:

```text
Default:
existing starting state + no explicit scenario framing
```

versus:

```text
Scenario:
defined starting state + explicit objective/framing
```

The simulation rules must remain identical.

Do not duplicate the simulation engine.

---

# 16. UI IMPLEMENTATION

Inspect the current HUD and integrate progression into the existing visual language.

Do not redesign the entire interface.

The progression UI should make it possible to understand:

```text
CURRENT:
Settlement

NEXT:
Village

PROGRESS:
Population      ✓
Water capacity  ✓
Food balance    ✓

OBJECTIVE:
...

BLOCKED BY:
...
```

Use the project's existing typography, spacing, panels, tokens and interaction patterns.

Avoid:

* generic game HUD redesign;
* oversized cards;
* decorative dashboards;
* gradients;
* unrelated icons;
* excessive animations.

The progression should feel like part of NOVA, not a separate game framework.

---

# 17. DEFERRED STAGES

Do not create fake conditions for:

```text
Town
City
Metropolis
Autonome
```

The UI may communicate that further progression is not yet defined if needed.

For example:

```text
Village

Next progression:
Not yet defined
```

But choose wording consistent with the existing product tone.

Do not expose arbitrary placeholders like:

```text
Reach 10 population
```

unless that condition has been causally justified later.

---

# 18. BROWSER VALIDATION

This step changes visible gameplay/UI.

Therefore browser validation is mandatory.

Run the application in the normal browser validation environment.

Verify at minimum:

### Default start

* progression visible;
* initial stage correct;
* next milestone correct;
* blockers correct;
* no visual regression.

### Settlement transition

Create the required state.

Verify:

```text
Wilderness → Settlement
```

occurs exactly when the contract is satisfied.

### Village transition

Create the required state.

Verify:

```text
Settlement → Village
```

occurs exactly when all three conditions are satisfied.

### Failure cases

Break each individual condition and verify the stage does not advance.

### Scenario start

Launch each scenario.

Verify:

* initial state;
* objective;
* progression;
* no simulation-rule differences.

### Persistence

Save/load a scenario.

Verify:

* simulation state remains identical;
* progression is recomputed identically;
* no new persistence requirement appears.

### GPU/browser

Use the existing GPU/browser validation path where available.

---

# 19. TESTING

Add tests for:

## Progression

* Wilderness initial state;
* Settlement each condition;
* Village each condition;
* conjunctive conditions;
* deterministic evaluation;
* insertion-order invariance.

## Scenarios

For each scenario:

* valid initial state;
* objective metadata;
* same simulation rules;
* deterministic initialization.

## Regression

Existing tests must remain green.

Do not remove or weaken tests.

---

# 20. DETERMINISM

Explicitly verify:

```text
same scenario
same initial state
same simulation
same progression
same hash
```

Also verify:

```text
different insertion order
→ same simulation
→ same progression
```

Progression must never depend on:

* object iteration order;
* UI order;
* rendering;
* wall clock;
* random values;
* scenario list order.

---

# 21. SAVE/LOAD

SAVE_VERSION must remain:

```text
7
```

Do not add migration.

Scenario/progression state should not be persisted unless absolutely required by existing architecture.

Prefer:

```text
saved simulation state
+
scenario identifier if already supported by architecture
→
recompute progression
```

If adding a scenario identifier would require persistence and therefore violate the 10AK contract, stop and report the architectural issue rather than silently modifying the save format.

---

# 22. QA / AUDIT AFTER IMPLEMENTATION

After implementation, perform a final audit.

Verify:

### Simulation

* no economic rule changed;
* no resource rate changed;
* no building cost changed;
* no road rule changed;
* no workforce rule changed;
* no admission rule changed;
* no Water rule changed;
* no Food rule changed.

### Progression

* only observes existing state;
* no hidden scoring;
* no arbitrary thresholds;
* no progression bonuses.

### Scenarios

* only modify starting state/framing;
* no scenario-specific simulation logic;
* no new mechanics.

### Architecture

* no unnecessary framework;
* no duplicated simulation;
* domain/application/rendering boundaries preserved.

---

# 23. Required commands

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Then run the existing browser/GPU validation suite.

Report exact counts.

---

# 24. Required report

Create:

`docs/roadmap/Step10AL.md`

Structure:

```text
STEP 10AL — IMPLEMENT SETTLEMENT/VILLAGE PROGRESSION & SCENARIO FRAMING

Starting commit:
Final commit:

1. Architecture audit
2. Progression implementation
3. Settlement contract
4. Village contract
5. Blocker computation
6. Progression UI
7. Scenario model
8. Scenario definitions
9. Objective/framing
10. Deferred stages
11. Browser validation
12. Determinism
13. Save/load
14. Test results
15. Final QA
16. Files changed
17. Final assessment
18. Next dependency
```

Explicitly list every modified file.

---

# 25. SUCCESS CRITERIA

Step 10AL is complete only if:

```text
[ ] Wilderness → Settlement works from existing state
[ ] Settlement → Village works from existing state
[ ] No arbitrary progression thresholds introduced
[ ] Blockers are derived from existing state
[ ] Objective/framing exists
[ ] Scenario data uses only existing simulation rules
[ ] Default game remains unchanged
[ ] Town/City/Metropolis/Autonome remain deferred
[ ] SAVE_VERSION remains 7
[ ] No new persisted simulation state
[ ] Determinism preserved
[ ] Insertion-order invariance preserved
[ ] Save/load preserved
[ ] All existing tests pass
[ ] New progression/scenario tests pass
[ ] Typecheck passes
[ ] Lint passes
[ ] Build passes
[ ] Browser validation passes
[ ] GPU validation passes where applicable
[ ] Final QA confirms no economic mechanic changed
```

If any success criterion fails, fix it before declaring the step complete.

---

# Final principle

The implementation must follow this rule:

> **Progression observes the simulation; it does not manufacture progression through new mechanics.**

The player should now have an explicit framing for what they are accomplishing, while the underlying NOVA simulation remains exactly the system already validated through Steps 10AI and 10AK.

Do not use this step to solve the deferred `Town → City → Metropolis → Autonome` problem.

That problem remains intentionally open for a future design step once the simulation produces enough causal state to support it.

---
# STEP 10AL — IMPLEMENT SETTLEMENT/VILLAGE PROGRESSION & SCENARIO FRAMING (report)

Implementation step. The progression layer OBSERVES the simulation: no domain
rule, resource rate, cost, admission rule or spatial rule was touched. Every
value below is measured from the real runtime or from the new deterministic
tests.

```text
STEP 10AL — IMPLEMENT SETTLEMENT/VILLAGE PROGRESSION & SCENARIO FRAMING

Starting commit: b4a645e ("Step 10AK: progression & scenario design contract audit")
Final commit:    this commit

1  Architecture audit: the smallest clean location is one application query
   (`getProgression`) plus one data-only scenario module (`scenarios.ts`); the
   controller gained a single `load(state)` method; no new framework.
2  Progression implementation: derived stages Wilderness/Settlement/Village,
   conjunctive conditions, blockers, explicit deferral. Nothing persisted.
3  Settlement contract: population >= 1 AND Food balance AND an operational road
   network — proven to flip exactly once all three hold.
4  Village contract: population >= 2 AND Water capacity >= 2 AND Food balance —
   where 2 is `COLONISTS_PER_STAFFED_WELL` (= Water per Well, model-produced).
5  Blocker computation: only false conditions are listed, measured per state.
6  Progression UI: Stage / Next / Objective / checklist / Blocked by, in the
   existing panel language; verified in the browser.
7  Scenario model: data only (id, name, description, objective, resources,
   buildings, roads, colonists) + one shared deterministic assembler.
8  Scenario definitions: 6 scenarios, measured starting stage and blockers.
9  Objective/framing: an objective label per scenario, purely presentational.
10 Deferred stages: Village shows "not yet defined"; no fake Town conditions.
11 Browser validation: 13/13 suites pass (12 existing + the new progression one).
12 Determinism: same state -> same progression; insertion-order invariant.
13 Save/load: SAVE_VERSION 7, 7 persisted keys, no scenario/progression state;
   progression recomputed after reload.
14 Test results: 66 files / 1276 tests (+2 files, +19 tests); typecheck, lint, build.
15 Final QA: no economic/spatial/workforce/admission rule changed (domain untouched).
16 Files changed: listed below.
17 Final assessment: all success criteria met; two measured reachability findings.
18 Next dependency: the deferred Town+ design step and the opening-budget question.
```

## 1. Architecture audit

| layer | location | role |
| --- | --- | --- |
| canonical state | `src/domain/simulation/state.ts` | immutable state, 7 saved keys |
| tick advancement | `src/domain/simulation/step.ts` | 9-phase tick, unchanged |
| derived queries | `src/application/queries/*` | pure read models (resources, placement, network, inspection) |
| HUD | `src/app/main.ts` + `index.html` | presentation only |
| controller | `src/app/gameController.ts` | owns the state, the only mutation path |
| persistence | `src/application/persistence/save.ts` | SAVE_VERSION 7 |
| E2E | `e2e/*Run.mjs` | real browser suites |

Chosen locations (no new framework):

* **progression**: `src/application/queries/progression.ts`, an application query in the
  existing style (`getProgression`, `getSettlementConditions`, `getVillageConditions`);
* **scenario definition**: `src/application/scenarios.ts`, a data module plus one shared
  deterministic assembler (`createScenarioState`);
* **scenario loading**: a single `load(state)` method on the existing controller;
* **UI**: rows added inside the existing `#nova-ui` panel, using the existing tokens.

The alternative (persisted progression flags) was rejected exactly as Step 10AK required.

## 2. Progression implementation

```text
getProgression(state) -> {
  stage: 'wilderness' | 'settlement' | 'village',
  stageLabel, nextStage, nextStageLabel,
  conditions     (current stage checklist),
  nextConditions (next stage checklist),
  blockers       (labels of the unmet next conditions),
  deferred       (true once no transition is contracted)
}
```

* pure and deterministic: it reads `getPopulationCount`, `isFoodSupplySustainable`,
  `getFoodProductionPerTick`, `getFoodConsumptionPerTick`, `getWaterProductionPerTick`,
  `getRoadNetworks` — no new calculation of its own;
* the Food condition is the authoritative `isFoodSupplySustainable` (one definition);
* Water is read as derived CAPACITY, never as the stock;
* Town/City/Metropolis/Autonome are not represented at all: `nextStage` is `null` and
  `deferred` is `true` from Village on.

## 3. Settlement contract

```text
SETTLEMENT  population >= 1  AND  Food production >= Food consumption  AND  an operational
            road network exists
```

Measured transitions (unit tests + browser):

| state | population | food | roads | stage |
| --- | --- | --- | --- | --- |
| fresh default | 0 | ✗ | ✗ | Wilderness |
| 1 colonist + road, no Farm | 1 ✓ | ✗ | ✓ | Wilderness (blocker: Food balance) |
| Recovery scenario (stranded Farm) | 1 ✓ | ✗ | ✓ | Wilderness (blocker: Food balance) |
| Recovery scenario + 3 connector road cells | 1 ✓ | ✓ | ✓ | **Settlement** |
| 1 colonist + Farm + road | 1 ✓ | ✓ | ✓ | **Settlement** (blockers: Population 2, Water capacity 2) |

Browser proof: the Recovery scenario stayed Wilderness across 4 ticks, then reached
Settlement after the real road drag `(2,1) -> (4,1)` and 4 ordinary ticks.

## 4. Village contract

```text
VILLAGE  population >= 2  AND  Water capacity >= 2  AND  Food production >= Food consumption
```

`2` is not an arbitrary number: `COLONISTS_PER_STAFFED_WELL = WATER_PER_WELL_PER_TICK`
(one Well produces 2 Water per tick; a served colonist consumes 1), so the population
threshold and the capacity threshold are the same model-produced quantity.

| state | population | Water capacity | food | stage |
| --- | --- | --- | --- | --- |
| 2 colonists + Farm, no Well | 2 ✓ | 0 ✗ | ✓ | Settlement (blocker: Water capacity 2) |
| 2 colonists + Farm + Well | 2 ✓ | 2 ✓ | ✓ | **Village** |
| Water stock 500, no Well | 1 | 0 ✗ | ✓ | Settlement (stock is not capacity) |
| 1 colonist + two Wells | 1 ✗ | 2 ✓ | ✗ | Village conditions independently evaluated; the state itself is Wilderness because Settlement's Food condition also fails |

Browser proof: the `water-constraint` scenario started in Settlement with the single blocker
`Water capacity 2` (checklist showing `✗ Water capacity 2`); after a real Well placement at
`(3,2)` and 6 ticks the stage was Village, `next` read `not yet defined`, and the blocker line
was empty.

## 5. Blocker computation

Blockers are the unmet conditions of the next stage, in declaration order, with no advice text:

| state | blockers |
| --- | --- |
| fresh default | `Population 1, Food balance, Road network` |
| Recovery start | `Food balance` |
| repaired Recovery | `Population 2, Water capacity 2` |
| water-constraint start | `Water capacity 2` |
| Village | *(empty)* |

## 6. Progression UI

Added inside the existing panel (no redesign, no new visual language):

```text
Stage:  Settlement        Next:  Village
Objective — Reach Village: restore Water capacity without losing the Food balance.
✗ Population 2 — 1 colonist
✗ Water capacity 2 — capacity 0 / tick
✓ Food balance — 2 / 2 Food per tick
Blocked by — Population 2, Water capacity 2
```

Test ids: `progression`, `progression-stage`, `progression-next`, `progression-objective`,
`progression-progress`, `progression-blocked`, plus `scenario-select`. The palette row, palette
labels and canvas geometry were left untouched, so the pointer-to-cell mapping the existing E2E
suites depend on is unchanged (verified by the 12 pre-existing suites passing).

## 7. Scenario model

```text
ScenarioDefinition = { id, name, description, objective, resources, buildings, roads, colonists }
```

* pure data: no callbacks, no rules, no modifiers, no scenario-specific simulation;
* one shared assembler (`createScenarioState`) builds a canonical state with the same domain
  constructors the game uses (`createBuilding`, `createRoads`, `createColonist`) and the same
  deterministic `assignJobs` phase; operational flags are applied as data;
* the default game (`createDefaultState`) is the unchanged `createInitialState`.

## 8. Scenario definitions

| scenario | starting state | objective | measured start stage | blockers |
| --- | --- | --- | --- | --- |
| First settlement | 100/100/0, nothing built | Reach Settlement. | Wilderness | Population 1, Food balance, Road network |
| Water constraint | 2 Residences + Farm + 3 roads, 2 colonists, 100 Material | Reach Village: restore Water capacity without losing the Food balance. | Settlement | Water capacity 2 |
| Industrial expansion | Village (2 Residences + Farm + Well) + 100 Material | Reach Village and build a Workshop: industry costs Water and a worker. | **Village** | — |
| Spatial efficiency | 55 Material, nothing built | Reach Settlement on a 55-Material budget (Residence + road + Farm). | Wilderness | Population 1, Food balance, Road network |
| Population expansion | 2 operational + 2 building Residences, 1 Farm, 2 colonists | Grow the settlement to 4 colonists with Water capacity 4 and Food balanced. | Settlement | Water capacity 2 |
| Recovery | Residence + stranded Farm + 1 road, 1 colonist, 30 Material, 30 Food | Reach Settlement by connecting the stranded Farm to the network. | Wilderness | Food balance |

All six were verified in the browser: scenario id, displayed objective, measured stage and
building count. `first-settlement` hashes identically to the default game (same starting state,
plus framing only).

## 9. Objective/framing

The objective is a **label**: it is displayed, never evaluated. No scoring, no bonus, no unlock.
It maps to existing objective forms only (milestone / constraint):

* `Reach Settlement.` — milestone;
* `Reach Village: restore Water capacity...` — milestone with the constraint named;
* `Reach Settlement on a 55-Material budget` — constraint (the budget is the existing resource);
* `Grow the settlement to 4 colonists with Water capacity 4 and Food balanced` — constraint on
  model-produced quantities (4 = 2 x 2 staffed Wells);
* `Reach Settlement by connecting the stranded Farm` — milestone.

## 10. Deferred stages

From Village the panel shows `Next: not yet defined` and no blocker line. No `Town`, `City`,
`Metropolis` or `Autonome` condition exists in the code, no placeholder threshold was added, and
`getProgression` returns `deferred: true`.

## 11. Browser validation

```text
progression:  ALL PASS (new suite, 12 checks)
run, production, temporal, water, food, resource, reassign, crew, road, transport, jobs, upkeep:
              ALL PASS (12 / 12 pre-existing suites, unchanged after the UI addition)
GPU:          ALL PASS (e2e/gpuRun.mjs)
```

The new suite verifies: the default start (Wilderness, 3 blockers, no objective); all six scenario
starts; a failure case (unrepaired Recovery stays Wilderness); the Wilderness → Settlement
transition on a real repair; the Settlement → Village transition on a real Well placement; the
deferred label; deterministic recomputation; the save boundary; and the restored free play.

## 12. Determinism

* `getProgression` returns byte-identical JSON for the same state (measured);
* reversing `buildings` / `roads` / `colonists` insertion order leaves both the canonical hash
  and the progression JSON unchanged (measured);
* progression never reads object iteration order as a rule source: all thresholds come from
  counts and derived rates;
* the browser suite re-reads `__nova.progression()` twice and requires identical output.

## 13. Save/load

```text
SAVE_VERSION: 7 (unchanged, no migration)
persisted keys: 7 (buildings, colonists, config, counters, resources, roads, time)
scenario/progression fields in the save: none (verified by string search)
```

Scenario framing is UI state; the progression is recomputed from canonical state. A reload returns
to free play with the progression recomputed — no new persistence requirement appeared, so the
Step 10AK contract holds.

## 14. Test results

```text
Vitest:      66 files / 1276 tests passed (before 64 / 1257)
             +2 files, +19 tests: tests/progression.test.ts (11), tests/scenarios.test.ts (8)
Typecheck:   passed
Lint:        passed
Build:       passed
Determinism: tests/determinism.test.ts passed
Save/load:   tests/persistence.test.ts passed
Invariants:  tests/economicInvariants.test.ts passed
Browser:     13 / 13 suites pass
GPU:         ALL PASS
```

## 15. Final QA

| check | result |
| --- | --- |
| no economic rule changed | `git diff src/domain` is empty; only app/UI/exports added |
| no resource rate / cost changed | catalog untouched (25 Material, 1 Water, 5 per road) |
| no workforce / admission / Water / Food rule changed | domain untouched |
| progression observes only | pure query, proven to leave `serializeCanonicalState` unchanged |
| no hidden scoring | only conditions + labels; no weights, no percentages |
| no arbitrary thresholds | 1 (first admission) and 2 (= Water per staffed Well) both model-produced |
| scenarios data-only | 8 data keys per scenario; shared assembler; no fork |
| no new mechanics | no new building, resource, bonus, UI redesign or framework |
| domain/application/rendering boundaries | progression is an application query; the UI reads it |

Two measured findings worth carrying forward (both reported, neither "fixed", because that would
require a balance or design decision outside this step):

1. **The default 100-Material opening cannot reach Village.** The minimum Village costs 105
   (`2 x 25` Residences + `25` Well + `25` Farm + `5` for the single road cell that can serve
   four buildings). The contract is correct and the transition works — it is exercised through the
   scenario starts.
2. **The three Settlement conditions are not independent.** Food sustainability requires a
   staffed Farm, which requires both a population and a road network, so the Food condition
   implies the other two. The population and road blockers therefore only appear together with
   the Food blocker; the panel lists exactly the false conditions either way.

## 16. Files changed

Added:

```text
src/application/queries/progression.ts   derived progression query (stages, conditions, blockers)
src/application/scenarios.ts             data-only scenario definitions + shared assembler
tests/progression.test.ts                11 tests
tests/scenarios.test.ts                  8 tests
e2e/progressionRun.mjs                   new browser suite (port 4185)
```

Modified:

```text
src/index.ts                             export the two new modules
src/app/gameController.ts                add load(state) (scenario loading)
src/app/main.ts                          progression render + scenario selector + __nova hooks
index.html                               progression panel + scenario select + styles
package.json                             test:e2e:progression script
docs/roadmap/Step10AL.md                 this report
```

Untouched: every file under `src/domain/`, `src/renderer/`, `src/application/queries/*` (other
than the new file), `src/application/persistence/`, and all pre-existing tests and E2E suites.

## 17. Final assessment

```text
[x] Wilderness -> Settlement works from existing state
[x] Settlement -> Village works from existing state
[x] No arbitrary progression thresholds introduced
[x] Blockers are derived from existing state
[x] Objective/framing exists
[x] Scenario data uses only existing simulation rules
[x] Default game remains unchanged
[x] Town/City/Metropolis/Autonome remain deferred
[x] SAVE_VERSION remains 7
[x] No new persisted simulation state
[x] Determinism preserved
[x] Insertion-order invariance preserved
[x] Save/load preserved
[x] All existing tests pass (1276 total)
[x] New progression/scenario tests pass (19)
[x] Typecheck passes
[x] Lint passes
[x] Build passes
[x] Browser validation passes (13 / 13)
[x] GPU validation passes
[x] Final QA confirms no economic mechanic changed
```

The player now has explicit framing — current stage, next milestone, a causal checklist, the
blocking conditions and a scenario objective — while the simulation remains exactly the system
validated through Steps 10AI–10AK.

## 18. Next dependency

1. **Town and beyond (design, not implementation).** The deferred `Village -> Town` needs a state
   a larger colony has and a Town does not; the 10AK audit showed the extra capacity is currently
   dormant, so this remains a design question.
2. **The opening budget (content/tuning decision, not taken here).** Measured: the default start
   is 5 Material short of the minimum Village (100 vs 105). Options are a scenario-provided start
   (already possible today), or a future balance decision — never a new mechanic.
3. **Scenario reachability review.** The `population-expansion` objective (4 colonists with Water
   capacity 4 and Food balanced) costs exactly the 100 Material it grants; a content pass could
   confirm each scenario's objective is comfortably reachable rather than exact.

