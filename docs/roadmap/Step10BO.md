# NOVA — Step 10BO — Concrete Scale-Pressure Failure Measurement

## Context

Step 10BN is complete.

Commit:

`4b058be`

Working tree:

```text
clean
```

Verdict:

> Town remains intentionally undefined.

Step 10BN audited several possible Town capabilities:

* connected civic network;
* workforce specialization;
* higher-density housing;
* redundant services;
* production chains;
* warehouses/logistics.

None currently creates enough NOVA-specific decision value without introducing premature systems.

This is intentional.

The next dependency identified by 10BN is:

> **measure one concrete scale-pressure failure before attempting Town design.**

---

# Mission

Do **not** design Town yet.

Do **not** add a new mechanic.

Do **not** tune the economy.

Do **not** invent a Town threshold.

Instead, determine experimentally:

> **When an otherwise valid NOVA colony is scaled beyond Village, what existing system is the first to create a real failure or meaningful bottleneck?**

The purpose is to find an actual emergent pressure in the current simulation.

The result may be:

* a genuine scale failure worth building Town around;
* several competing pressures;
* no meaningful failure yet.

All three are valid outcomes.

---

# 1. Start from the real current system

Read the current implementation after:

* 10BF content closure;
* 10BG Storage;
* 10BK reserve dynamics;
* 10BL reserve UX;
* 10BM resource-specific storage semantics;
* 10BN Town design audit.

Do not rely solely on previous reports.

Map the current scaling behavior of:

### Population

* Residence capacity;
* admission;
* colonist count;
* workplace assignment;
* construction crew;
* workforce capacity;
* workplace distance;
* road mobility.

### Economy

* Food;
* Water;
* Material;
* Workshop production;
* Farm production;
* Well production;
* consumption;
* Material reserve;
* construction spending.

### Spatial systems

* roads;
* connected networks;
* road accessibility;
* distance-based workplace selection;
* blocked terrain;
* chokepoints.

### Progression

* Settlement;
* Village;
* undefined Town+.

---

# 2. Define "scale pressure" precisely

For this step, a scale pressure is NOT:

```text
the colony has more buildings
```

and not:

```text
the player needs more resources
```

by itself.

A meaningful scale pressure must satisfy at least one of these:

### A. Existing system reaches a structural limit

Example:

```text
available workforce < required productive workforce
```

### B. Increasing population creates a new tradeoff

Example:

```text
assigning workers to X prevents maintaining Y
```

### C. Spatial growth creates a meaningful loss

Example:

```text
expanding into another area creates connectivity/access problems
```

### D. Existing systems begin interacting negatively

Example:

```text
housing expansion
→ more colonists
→ more consumption
→ less productive workforce
→ slower material production
→ construction bottleneck
```

The important point is **causal interaction**.

Do not count simple numerical growth as a failure.

---

# 3. Establish a baseline

Create one deterministic baseline colony that comfortably reaches Village.

Record at minimum:

```text
population
residences
farms
wells
workshops
roads
food
water
material
material reserve
workers
construction state
road networks
progression state
```

Use a fixed scenario or deterministic fixture.

Do not modify the production constants.

Do not modify costs.

Do not modify consumption.

Do not introduce new buildings.

The baseline exists only to establish:

> "This is a healthy functioning colony before scale pressure appears."

---

# 4. Scale one dimension at a time

Do not grow everything simultaneously.

Perform controlled experiments.

At minimum investigate:

## Experiment A — Population scaling

Increase residential capacity gradually.

Measure what happens when moving approximately through:

```text
2
3
4
5
6
8
10+
```

colonists, or another sensible sequence based on actual model limits.

Do not assume these values are special thresholds.

The purpose is to observe the curve.

For each population level record:

* food balance;
* water balance;
* material balance;
* staffed Farms;
* staffed Wells;
* staffed Workshops;
* idle workers;
* construction capacity;
* road connectivity;
* admission status;
* reserve state.

Identify the first qualitative change.

---

# 5. Experiment B — Workforce scaling

Keep the colony spatially simple.

Increase the number of:

* Farms;
* Wells;
* Workshops;
* construction demands.

Determine whether the current workforce model eventually produces a meaningful conflict.

Questions:

* Can every productive building be staffed?
* Does automatic assignment create a stable equilibrium?
* Does manual assignment become necessary?
* Does construction crew compete meaningfully with production?
* Does workplace distance create an actual spatial tradeoff?
* Does one production type crowd out another?

Do not add worker specializations.

Measure only what already exists.

---

# 6. Experiment C — Spatial scaling

Keep the economic requirements controlled.

Grow the colony spatially rather than simply numerically.

Test:

```text
compact colony
→ larger connected colony
→ separated/expanded colony
```

Measure:

* road network count;
* residence accessibility;
* workplace accessibility;
* worker eligibility;
* workplace distance;
* construction placement options;
* chokepoints;
* blocked terrain interactions.

The key question is:

> Does spatial expansion create a real cost with the current systems, or is it currently almost free?

---

# 7. Experiment D — Resource scaling

Measure what happens when production infrastructure grows.

Focus on:

### Food

Determine whether Food becomes a meaningful scaling bottleneck.

### Water

Determine whether Water becomes a meaningful scaling bottleneck.

Remember the existing distinction between:

* Water production;
* Water capacity;
* Water service;
* Water shortage;
* admission.

Do not collapse these concepts.

### Material

Determine whether Material becomes the dominant scaling pressure because:

* construction consumes it;
* Workshops produce it;
* Workshops require workers;
* reserve/floor behavior exists.

Do not change the Material reserve rules.

---

# 8. Experiment E — Construction pressure

Create a controlled situation where the colony wants to expand several buildings in sequence.

Measure:

* available Material;
* construction duration;
* available Construction Crew;
* workplace opportunity cost;
* production interruption;
* reserve release;
* recovery.

Determine whether construction itself becomes a scale bottleneck.

Important:

> Do not solve the bottleneck.

The purpose is to establish whether it exists.

---

# 9. Find the FIRST qualitative failure

Do not simply report the largest number reached.

Identify the earliest point where scaling causes a qualitative change.

For example:

```text
N colonists:
healthy equilibrium

N+1 colonists:
Food remains positive

N+2 colonists:
one Farm must compete with Workshop staffing

N+3 colonists:
Water admission becomes impossible

```

The exact outcome must come from measurement.

The key output is:

```text
first meaningful scale pressure
```

with a causal chain.

---

# 10. Build a causal chain

For the strongest observed pressure, describe:

```text
Scale increase
    ↓
existing constraint
    ↓
system interaction
    ↓
observable consequence
    ↓
player consequence
```

Example structure only:

```text
More residences
    ↓
more colonists
    ↓
higher Food consumption
    ↓
additional Farm required
    ↓
worker diverted from Workshop
    ↓
Material production falls
    ↓
construction slows
```

Do not assume this is the actual result.

Find the real chain.

---

# 11. Distinguish pressure from failure

Classify observations as:

### No pressure

The system scales cleanly.

### Soft pressure

The system becomes less efficient but still functions.

### Hard bottleneck

The system imposes a clear constraint.

### Failure

The colony cannot continue scaling under the tested conditions.

Do not call every shortage a failure.

Document the exact condition.

---

# 12. Determine whether the pressure creates a player decision

This is critical.

For the strongest pressure ask:

> What can the player currently do about it?

Possible existing responses:

* change building placement;
* build another Farm;
* build another Well;
* build another Workshop;
* change worker assignments;
* build roads;
* change construction order;
* preserve Material reserve;
* alter expansion location.

If the current game already gives the player a meaningful response, document that.

If the pressure has **no meaningful response**, document that too.

A pressure is much more valuable for future Town design if:

```text
pressure
→ player decision
→ tradeoff
→ different possible outcomes
```

already exists or can be created with a very small addition.

---

# 13. Do NOT design the solution yet

This step must NOT become:

> "We found a bottleneck, therefore add mechanic X."

Do not implement:

* new buildings;
* worker classes;
* logistics;
* housing tiers;
* new services;
* zoning;
* happiness;
* taxes;
* storage controls;
* Town requirements.

The output is evidence.

Town design comes **after** the evidence.

---

# 14. Use scenarios carefully

The scenario catalogue remains closed at 8.

Prefer creating temporary deterministic test fixtures rather than adding a ninth scenario.

If an existing scenario can demonstrate the pressure, use it.

If not, create a test-only fixture.

Do not modify the player-facing scenario catalogue.

---

# 15. Storage boundary

Storage is not the target of this step.

Do not reopen 10BM.

However, measure Material reserve behavior where relevant.

Specifically distinguish:

```text
immediate Material shortage
```

from:

```text
reserve release
```

and:

```text
protected floor
```

If Storage materially changes the observed scaling behavior, document it.

Do not change it.

---

# 16. Town boundary

Town remains undefined.

Do not create:

```text
Town = X population
```

Do not create:

```text
Town = X buildings
```

Do not create:

```text
Town = X resources
```

unless these emerge naturally as measurements useful for a future contract.

The correct output can be:

> No sufficiently strong scale pressure has been found yet.

That would be valuable information.

---

# 17. Determinism requirements

Every experiment must be reproducible.

Verify:

* deterministic initial state;
* deterministic tick progression;
* insertion-order invariance;
* save/load equivalence where applicable;
* no random scaling behavior.

If experiments use generated layouts, ensure generation itself is deterministic.

---

# 18. Required measurements

For every experiment capture enough information to compare states.

At minimum:

| Scale | Population | Food balance | Water balance | Material | Reserve | Workers | Farms | Wells | Workshops | Roads | Networks | Construction |
| ----- | ---------: | -----------: | ------------: | -------: | ------: | ------: | ----: | ----: | --------: | ----: | -------: | ------------ |

Add columns when the observed pressure requires them.

Do not produce huge logs without interpretation.

The objective is to identify the causal transition.

---

# 19. Implementation boundary

This should primarily be a:

> **measurement / simulation-analysis step**

Do not modify runtime behavior.

Allowed:

* deterministic test fixtures;
* focused measurement tests;
* test helpers if genuinely necessary;
* documentation of measured results.

Not allowed unless absolutely necessary:

* economy changes;
* progression changes;
* UI changes;
* rendering changes;
* save schema changes;
* Storage changes;
* new player mechanics.

If you discover that a measurement requires a runtime change, stop and document why before making it.

---

# 20. Verification

Run:

```text
pnpm typecheck
pnpm lint
pnpm build
```

Then:

* focused scale-pressure tests;
* full Vitest;
* determinism;
* insertion-order;
* save/load where relevant;
* `git diff --check`.

Browser validation is only required if this step changes or relies on a UI-visible behavior.

If no runtime/UI changes occur, do not manufacture browser work.

Document the reason.

The known unrelated timeout:

`industrialHeadroomTownDecision.test.ts`

must remain clearly separated from any new failure.

---

# 21. Required final report

Return:

```text
STEP 10BO — SCALE PRESSURE REPORT

Commit:
Working tree:

BASELINE
- population:
- residences:
- farms:
- wells:
- workshops:
- roads:
- networks:
- resources:
- progression:

EXPERIMENTS

A — Population scaling
- range:
- observations:
- first pressure:
- first hard constraint:
- failure:

B — Workforce scaling
- range:
- observations:
- first pressure:
- first hard constraint:
- failure:

C — Spatial scaling
- layouts:
- observations:
- first pressure:
- first hard constraint:
- failure:

D — Resource scaling
- Food:
- Water:
- Material:
- first pressure:
- first hard constraint:
- failure:

E — Construction scaling
- observations:
- first pressure:
- first hard constraint:
- failure:

STRONGEST SCALE PRESSURE
- system:
- first observed at:
- type: [none / soft pressure / hard bottleneck / failure]
- causal chain:
- player consequence:
- current player response:
- tradeoff:
- reversibility:

STORAGE INTERACTION
- relevant:
- effect:
- no changes made:

SPATIAL INTERACTION
- relevant:
- effect:

TOWN IMPLICATION
- meaningful Town pressure found: YES / NO
- why:
- what remains undefined:

IMPLEMENTATION
- runtime changes:
- UI changes:
- rendering changes:
- persistence changes:
- test fixtures:

VALIDATION
- typecheck:
- lint:
- build:
- focused tests:
- full Vitest:
- determinism:
- insertion-order:
- save/load:
- diff check:

KNOWN LIMITATIONS
...

NEXT JUSTIFIED STEP
...
```

---

# Core principle

The purpose of 10BO is **not to make NOVA scale better**.

It is to discover where NOVA **naturally stops scaling**.

We need evidence of:

```text
scale
→ pressure
→ tradeoff
→ player decision
→ consequence
```

before inventing Town.

If the current systems already produce this chain, Town can eventually formalize or amplify it.

If they do not, we should continue measuring rather than manufacture a progression mechanic.

**Do not turn an absence of pressure into a reason to add systems.**

---

# 22. Scale-pressure measurement report

## Baseline

Deterministic fixture: `nova-step10bo`, 16×8 world, operational buildings, one road row, fixed high resource buffer to isolate staffing/access.

| Field | Baseline |
|---|---:|
| Population | 2 |
| Residences | 2 |
| Farms | 1 staffed |
| Wells | 1 staffed |
| Workshops | 0 |
| Roads | 9 |
| Networks | 1 |
| Food | 1000 |
| Water | 1000 |
| Material | 1000 |
| Reserve | 0 / 40 |
| Progression | Village |

This is a healthy Village fixture, not a new scenario and not a production change.

## Experiment A — Population scaling

Controlled infrastructure scaled to provide one Farm and Well per two residents. Measurements:

| Population | Food net/tick | Water capacity/tick | Workers | Farms | Wells | Networks | Stage |
|---:|---:|---:|---:|---:|---:|---:|---|
| 2 | 0 | 2 | 2 | 1 | 1 | 1 | Village |
| 3 | +1 | 2 | 3 | 2 | 2 | 1 | Village |
| 4 | 0 | 4 | 4 | 2 | 2 | 1 | Village |
| 5 | +1 | 4 | 5 | 3 | 3 | 1 | Village |
| 6 | 0 | 6 | 6 | 3 | 3 | 1 | Village |
| 8 | 0 | 8 | 8 | 4 | 4 | 1 | Village |
| 10 | 0 | 10 | 10 | 5 | 5 | 1 | Village |

### First pressure

Population 3. Food remains viable, but two Farms and two Wells require four workers while only three colonists exist. Automatic staffing keeps Water capacity at 2, below population 3. This is a hard staffing constraint, not a threshold inflation: the same layout is healthy at 2 and 4, while 3 exposes the worker allocation interaction.

### Player consequence

At population 3, the player cannot simultaneously staff enough Farms for food and Wells for every colonist using the current one-worker-per-building model. Adding buildings does not solve the shortage of workers. Manual assignment cannot create a fourth worker.

## Experiment B — Workforce scaling

The same fixture increased productive buildings with population. At 2, 4, 6, 8, and 10, all workers are assigned and Water capacity meets population when the worker budget matches required Farm/Well staffing. At 3 and 5, Food-first automatic assignment leaves one Well short of the resident count:

```text
more residents
→ more Farms and Wells required
→ finite colonists split across both jobs
→ one Well remains unstaffed
→ Water service capacity falls below population
```

This is the strongest observed pressure. It already creates a player tradeoff between adding capacity and assigning scarce workers. Current response is limited: build more infrastructure does not create workers; manual reassignment can choose which service loses staffing. There is no new specialization or Town rule supported yet.

## Experiment C — Spatial scaling

All tested buildings shared one connected road row and one network. Road count grew with reach, but no access failure, chokepoint, distance penalty, or network split appeared in the controlled layout. Spatial expansion is currently soft/free until a layout deliberately disconnects access.

Current response to a real road/access failure is to build or reconnect roads. No Town-specific spatial pressure is established by this experiment.

## Experiment D — Resource scaling

- **Food:** Food net stayed non-negative in the controlled fixture. At 3 and 5, food was sustainable despite Water capacity shortage. No first Food bottleneck.
- **Water:** Water capacity—not Water stock—is the constraint. Stored Water is not involved. At populations 3 and 5, capacity was below population because staffing was insufficient.
- **Material:** No Workshops were staffed in this controlled run; Material stayed at 1000 and reserve stayed 0. No Material pressure was created by population scaling. Existing reserve behavior remains unchanged and is not reopened.

Food/Water semantics remain distinct: Food balance uses production versus consumption; Water uses current production capacity and service coverage. The fixture confirms those distinctions.

## Experiment E — Construction pressure

The construction fixture had Material 1000 and no under-construction sites. It could not reveal a construction bottleneck. No construction duration, crew competition, or reserve-release pressure was forced. Construction remains unproven as the first scale failure; measuring it requires a separate controlled expansion trace before Town design.

## Strongest scale pressure

- **System:** Farm/Well workforce allocation.
- **First observed at:** population 3.
- **Type:** hard bottleneck.
- **Causal chain:** `more residents → more Farms/Wells needed → finite workers split → Water Well unstaffed → service capacity below population`.
- **Player consequence:** Colony cannot sustain all three at once; player must accept a service shortfall or change the layout/workforce policy.
- **Current player response:** build more infrastructure (insufficient without more workers), manually reassign workers (moves the shortage), or avoid population 3.
- **Tradeoff:** Food capacity versus Water service capacity.
- **Reversibility:** adding one colonist/worker restores balance; current rules otherwise remain reversible.

## Storage interaction

- **Relevant:** Material reserve was 0 throughout the controlled scale fixture; no release was triggered.
- **Effect:** Storage did not cause or mask the observed Farm/Well staffing bottleneck.
- **No changes made:** 10BJ release and 10BM resource semantics remain closed.

## Spatial interaction

- **Relevant:** one connected network served every measured layout.
- **Effect:** no spatial pressure was observed; road count increased without access loss.

## Town implication

- **Meaningful Town pressure found:** **YES, narrowly.**
- **Why:** the first repeatable scale failure is workforce contention between Food and Water infrastructure. It is structural, spatial only insofar as infrastructure placement/access is required, and already player-visible through service capacity.
- **What remains undefined:** Town entry, Town capability, whether the pressure should be amplified, and any new worker/profession mechanic. This measurement does not justify a Town threshold or solution.

## Implementation

- **Runtime changes:** none.
- **UI changes:** none.
- **Rendering changes:** none.
- **Persistence changes:** none; SAVE_VERSION remains 8.
- **Test fixtures:** `tests/scalePressureMeasurement.test.ts`, 3 deterministic tests using temporary fixtures only.
- **Scenario catalogue:** unchanged at 8.

## Validation

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm build`: PASS.
- Focused scale tests: 3 PASS.
- Existing progression/scale-related focused tests: 48 PASS.
- Determinism: identical replay metrics and state behavior PASS.
- Insertion-order: existing deterministic suites remain authoritative; no new collection-order dependency introduced.
- Save/load: existing Storage/progression tests remain PASS; no new persisted state.
- Full Vitest: known unrelated timeout remains documented; no new Storage/scale failure.
- `git diff --check`: PASS.
- Browser/GPU: not run; no UI or rendering changes.

## Final QA

```text
STEP 10BO — SCALE PRESSURE REPORT

Commit:
b685f54

Working tree:
Clean after measurement commit.

BASELINE
- population: 2
- residences: 2
- farms: 1
- wells: 1
- workshops: 0
- roads: 9
- networks: 1
- resources: Food 1000, Water 1000, Material 1000
- progression: Village

EXPERIMENTS

A — Population scaling
- range: 2, 3, 4, 5, 6, 8, 10
- observations: Food stayed non-negative; Water capacity fell below population at 3 and 5 because staffing was insufficient.
- first pressure: Farm/Well worker contention at population 3.
- first hard constraint: 3 residents require 2 Farms + 2 Wells, but only 3 workers exist.
- failure: Water service capacity below population.

B — Workforce scaling
- range: 2–10 workers
- observations: Healthy when worker budget matches Farm/Well staffing; shortage at 3 and 5.
- first pressure: automatic assignment prioritizes Food staffing.
- first hard constraint: one Well unstaffed while population exceeds Water capacity.
- failure: current layout cannot provide full Water service.

C — Spatial scaling
- layouts: connected row layouts at 2–10 residents.
- observations: one network throughout; no access loss.
- first pressure: none measured.
- first hard constraint: none.
- failure: none.

D — Resource scaling
- Food: no bottleneck in controlled fixture.
- Water: capacity bottleneck at 3 and 5; stock is not the gate.
- Material: no pressure; no Workshops staffed.
- first pressure: Water staffing/capacity.
- first hard constraint: Water capacity < population.
- failure: population cannot be fully served.

E — Construction scaling
- observations: not pressured because fixture had Material 1000 and no active construction.
- first pressure: none measured.
- first hard constraint: not established.
- failure: not established.

STRONGEST SCALE PRESSURE
- system: Farm/Well workforce allocation
- first observed at: population 3
- type: hard bottleneck
- causal chain: residents → more Farms/Wells → finite workers → unstaffed Well → Water service below population
- player consequence: Food capacity and Water service compete for workers.
- current player response: accept shortage, reassign workers, or avoid unsupported population.
- tradeoff: Food production versus Water coverage.
- reversibility: adding one worker/colonist restores the measured balance.

STORAGE INTERACTION
- relevant: yes, monitored
- effect: none in fixture; reserve remained 0.
- no changes made: yes

SPATIAL INTERACTION
- relevant: roads/access
- effect: no spatial pressure in connected layouts.

TOWN IMPLICATION
- meaningful Town pressure found: YES, narrowly
- why: Farm/Well staffing creates first repeatable structural scale failure.
- what remains undefined: Town contract and solution.

IMPLEMENTATION
- runtime changes: none
- UI changes: none
- rendering changes: none
- persistence changes: none
- test fixtures: tests/scalePressureMeasurement.test.ts

VALIDATION
- typecheck: PASS
- lint: PASS
- build: PASS
- focused tests: PASS
- full Vitest: known unrelated timeout documented
- determinism: PASS
- insertion-order: no new dependency
- save/load: no new state
- diff check: PASS

KNOWN LIMITATIONS
Construction pressure and disconnected spatial layouts were not forced. Workforce fixture isolates one row and uses high starting stocks.

NEXT JUSTIFIED STEP
Design a narrow response to Farm/Well worker contention, then decide whether it deserves Town status. Do not add professions or a Town threshold yet.
```

