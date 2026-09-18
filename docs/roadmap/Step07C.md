# NOVA — Step 07C — Implement Jobs / Workplace Assignment

## Context

Step 07B — Jobs / Workplace Design Contract is COMPLETE and READY FOR IMPLEMENTATION.

Implement exactly that contract.

Do not redesign or reinterpret the mechanics.

The target causal loop is:

```text
Residence
→ Colonist
→ Workshop
→ Employment
→ Construction Material
→ More Buildings
```

The existing Farm loop remains unchanged:

```text
Farm
→ +2 Food / tick
```

### HARD CONSTRAINT

**Do not make Farm worker-dependent.**

Do not modify:

* Farm output;
* Farm operational semantics;
* Farm worker requirements;
* Farm staffing;
* Farm capacity;
* Farm production timing.

Farm remains worker-independent exactly as in Step 06B.

---

# 0. Implementation order

Work in this order:

1. forecast correction;
2. domain state/schema;
3. Workshop building;
4. deterministic job assignment;
5. material production;
6. simulation phase ordering;
7. persistence/hash;
8. minimal UI;
9. unit tests;
10. real-browser E2E;
11. playability pass;
12. visual inspection;
13. headed GPU regression if environment supports it;
14. final audit.

Do not skip the browser/playability phase.

---

# 1. Forecast correction first

Fix the issue identified in Step 07A.

Current forecast ignores production.

Implement the contract:

```text
population = 0
→ forecast = null

population > 0
AND production >= consumption
→ sustainable

population > 0
AND production < consumption
→ floor(food / (consumption - production))
```

The finite forecast must represent the number of ticks until Food reaches zero under the current net rate.

Do not persist this value.

Do not hash it.

Do not add simulation state.

Prefer:

```text
getFoodTicksRemaining(state)
isFoodSupplySustainable(state)
```

or the smallest equivalent API.

Keep the existing UI numeric Food value intact so existing E2E parsing does not break.

Expected UI semantics:

```text
Food: 103 · sustainable
```

when production >= consumption.

For a declining stock:

```text
Food: 5 · ~5 ticks
```

Use wording consistent with the existing UI.

Add focused tests for:

* population 0;
* production 0;
* production < consumption;
* production = consumption;
* production > consumption;
* exact finite forecast;
* no mutation.

---

# 2. Colonist employment state

Extend the canonical colonist state from:

```text
{
  id,
  residenceId
}
```

to:

```text
{
  id,
  residenceId,
  workplaceId: string | null
}
```

Do not introduce:

* `Job` entities;
* `Worker` entities;
* `EmploymentSystem`;
* generic workforce abstractions;
* labor stock;
* employment events.

One concrete use case does not justify generic abstractions.

---

# 3. Workshop building

Add:

```text
BuildingType = ... | 'workshop'
```

Workshop contract:

* construction cost: 25 material;
* construction duration: 2 ticks;
* housing capacity: 0;
* operational status required;
* job capacity: 1.

Use the existing building lifecycle.

Do not create a second construction mechanism.

Do not add a generic workplace interface unless the compiler/domain structure absolutely requires the smallest concrete representation.

The catalog should remain the source of truth for the Workshop's construction properties.

---

# 4. Job assignment

Implement one pure deterministic phase:

```text
assignJobs(state)
```

The algorithm is exactly:

### Step 1 — remove invalid assignments

Any colonist whose `workplaceId` refers to:

* a missing building;
* a non-operational building;
* a non-workshop building;

must become:

```text
workplaceId = null
```

### Step 2 — preserve valid assignments

Existing valid assignments must remain unchanged.

Do not churn employment every tick.

### Step 3 — assign unemployed colonists

Sort:

* unemployed colonists by colonist ID ascending;
* available operational Workshops by building ID ascending.

Fill available Workshop slots in that order.

Each Workshop has capacity 1.

### Step 4 — leave surplus unemployed

If there are more colonists than jobs:

```text
remaining colonists → workplaceId = null
```

If there are more Workshops than colonists:

```text
remaining Workshops → vacant
```

No randomness.

No distance.

No proximity.

No player assignment command.

No skill system.

No priority system beyond deterministic ID ordering.

---

# 5. Employment invariants

The implementation must guarantee:

```text
employedColonists <= colonists
```

and:

```text
employedColonists <= operationalWorkshopCapacity
```

and:

```text
one colonist <= one workplace
```

and:

```text
one Workshop <= one worker
```

and:

```text
non-operational Workshop => zero valid workers
```

and:

```text
jobs never create colonists
```

---

# 6. Material production

Implement the concrete production contract:

```text
+2 construction material
per employed colonist
per simulation tick
```

This is direct resource production.

Do NOT create a stored `labor` resource.

Do NOT create:

* production recipes;
* efficiency;
* worker skill;
* productivity modifiers;
* upgrades;
* bonuses;
* caps;
* logistics.

Multiple workers add linearly:

```text
0 workers → +0
1 worker  → +2
2 workers → +4
3 workers → +6
...
```

Workers produce directly into the existing construction-material stock.

Material remains:

```text
finite before production
unbounded after production
```

unless an existing invariant says otherwise.

---

# 7. Workerless Workshop

An operational Workshop with no assigned worker produces:

```text
+0 material
```

An under-construction Workshop produces:

```text
+0 material
```

A non-existent Workshop produces:

```text
+0 material
```

There must be no hidden autonomous production.

---

# 8. Food interaction

Jobs must not alter the existing food rules.

Food remains:

```text
consumption = population × 1
```

Farm production remains:

```text
production = operationalFarms × 2
```

Employment does not:

* feed colonists;
* admit colonists;
* prevent starvation;
* alter food consumption.

If starvation removes colonists, those colonists must not produce construction material afterward in the same tick.

---

# 9. Exact phase order

The final simulation order must be:

```text
applyCommand
→ advanceConstruction
→ updateNeeds
→ produceFood
→ consumeFood
→ updatePopulation
→ assignJobs
→ produceMaterial
→ advanceTime
```

This ordering is authoritative.

### Consequences

#### New colonist

If admitted on tick N:

```text
updatePopulation
→ assignJobs
→ produceMaterial
```

Therefore:

```text
admitted N
→ assigned N
→ produces N
```

#### Newly operational Workshop

If construction completes on tick N:

```text
advanceConstruction
→ assignJobs
→ produceMaterial
```

Therefore:

```text
operational N
→ staffed N
→ produces N
```

#### Starvation

If starvation occurs on tick N:

```text
consumeFood
→ updatePopulation
```

removes colonists before:

```text
assignJobs
→ produceMaterial
```

Therefore:

```text
starvation N
→ workers removed
→ no death-tick material output
```

Add explicit unit tests for all three cases.

---

# 10. Persistence version

`workplaceId` changes the persisted `ColonistState`.

Therefore:

```text
SAVE_VERSION = 4
```

must be used.

Implement validation for:

```text
workplaceId === null
```

or:

```text
typeof workplaceId === 'string'
```

Reject invalid values.

Do not invent migration.

Existing v3 saves must be explicitly rejected, following the repository's established versioning policy.

Test:

* v4 round-trip;
* invalid workplaceId;
* v3 rejection;
* behavioral equivalence after round-trip;
* hash equivalence after round-trip.

The canonical hash must include employment state automatically through the canonical simulation state.

Do not create a second hash mechanism.

---

# 11. Determinism and immutability

The new phases must remain pure.

No:

```text
Math.random()
Date.now()
performance.now()
```

in the simulation domain.

No mutation of input state.

Use deterministic ordering.

Repeated identical simulations must produce identical:

* colonist assignments;
* material;
* building states;
* hashes.

Add explicit determinism tests.

---

# 12. Minimal UI

Implement only the Step 07B UI contract.

### HUD

Add:

```text
Jobs: employed / total capacity
```

Example:

```text
Jobs: 1 / 2
```

### Workshop inspection

When inspecting a Workshop:

```text
Jobs — Capacity 1 · Workers 0/1
```

or:

```text
Jobs — Capacity 1 · Workers 1/1
```

### Causal status

When employment changes, show a concise causal message.

Example:

```text
Colonist assigned to Workshop
```

When material is produced:

```text
1 worker produced 2 material
```

Compose this with existing causal messages rather than replacing them incorrectly.

Example:

```text
2 colonists consumed 2 food · 2 workers produced 4 material
```

Do not create a generic notification system.

Do not add a dashboard.

Do not redesign the HUD.

---

# 13. Renderer

Give Workshops a distinct visual treatment from Residences and Farms.

Reuse the existing renderer architecture.

The renderer may distinguish:

```text
residence
farm
workshop
```

based only on the canonical RenderSnapshot.

Do not introduce invented simulation data.

Keep the visual treatment simple.

The important requirement is:

> A player should be able to distinguish Workshop from Residence and Farm immediately.

---

# 14. Unit tests

Add focused tests for the Jobs contract.

At minimum:

### Workshop

* catalog values;
* construction lifecycle;
* cost;
* operational state.

### Employment

* no colonists → no assignments;
* no Workshops → all unemployed;
* one colonist / one Workshop;
* multiple colonists / one Workshop;
* one colonist / multiple Workshops;
* multiple colonists / multiple Workshops;
* deterministic ID ordering;
* existing assignment preservation;
* invalid assignment cleanup;
* non-operational Workshop cannot employ;
* one worker maximum per Workshop.

### Material

* zero workers → zero output;
* one worker → +2;
* multiple workers → additive;
* exact tick timing;
* newly admitted colonist produces same tick;
* newly operational Workshop produces same tick;
* starvation removes worker before production;
* no food does not independently generate workers;
* production is uncapped.

### Integration

Test:

```text
housing
→ colonist
→ workshop
→ employment
→ material
→ additional construction
```

### Determinism

Run equivalent states through the same tick sequence and compare:

* complete state;
* assignments;
* resources;
* canonical hash.

### Immutability

Verify input state remains unchanged.

---

# 15. E2E — mandatory real-browser playability

Create:

```text
e2e/jobsRun.mjs
```

and an appropriate package script.

Use the real UI.

Do not directly mutate `window.__nova` to create gameplay state.

Scenario:

### Phase A — housing

1. Fresh game.
2. Place Residence.
3. Advance ticks until operational.
4. Verify colonist admission.
5. Verify causal arrival feedback.

### Phase B — Workshop

6. Place Workshop.
7. Advance until operational.
8. Verify Workshop inspection.
9. Verify job capacity.

### Phase C — employment

10. Advance one tick.
11. Verify colonist receives Workshop assignment.
12. Verify HUD Jobs count.
13. Verify causal employment feedback.

### Phase D — material

14. Capture material.
15. Advance one tick.
16. Verify exact:

```text
materialDelta = +2
```

for one worker.

17. Advance several ticks.
18. Verify:

```text
materialDelta = 2 × workerCount × tickCount
```

### Phase E — construction loop

19. Spend material on another building.
20. Verify construction is accepted because of worker-generated material.
21. Verify material deduction is exact.

### Phase F — surplus colonists

Create a state with:

```text
colonists > workshop capacity
```

using only legitimate gameplay.

Verify:

* some colonists employed;
* remaining colonists unemployed;
* no duplicate assignments.

### Phase G — surplus jobs

Create:

```text
workshop capacity > colonists
```

Verify:

* remaining Workshop slots are vacant;
* no phantom workers.

### Phase H — starvation

Where practical:

1. Let Food reach shortage.
2. Verify colonists disappear.
3. Verify employment disappears.
4. Verify material production becomes zero.
5. Verify no death-tick material is produced.

All checks must come from the real browser state/UI.

---

# 16. Playability gate

Do not declare the step COMPLETE merely because tests pass.

Perform a blind first-time-player pass.

Ask:

1. Can I identify a Workshop?
2. Can I understand that it creates a job?
3. Can I understand that a colonist occupies that job?
4. Can I understand that the worker produces material?
5. Can I understand why material increased?
6. Can I understand why an unemployed colonist remains unemployed?
7. Can I understand why a Workshop remains vacant?
8. Can I understand what happens when the colony starves?
9. Can I understand the relationship between Food and Jobs?
10. Can I understand how labor enables further construction?

Record actual observations.

If one minimal causal UX correction is necessary, implement only that correction.

Do not turn this into a UI redesign.

---

# 17. Food forecast verification

Specifically verify the corrected forecast.

Test these real states:

```text
population = 0
```

Expected:

```text
no finite forecast
```

```text
production < consumption
```

Expected:

```text
finite remaining ticks
```

```text
production = consumption
```

Expected:

```text
sustainable
```

```text
production > consumption
```

Expected:

```text
sustainable
```

The forecast must not claim a finite starvation time when the colony has non-negative net Food flow.

---

# 18. Visual inspection

Regenerate screenshots for:

1. fresh game;
2. colonist + Workshop;
3. employed Workshop;
4. material production;
5. surplus-job state;
6. unemployment state;
7. starvation.

Actually inspect the screenshots if the environment allows it.

Evaluate:

* hierarchy;
* readability;
* Workshop differentiation;
* Jobs counter;
* inspection information;
* causal status;
* Food forecast;
* overlap;
* contrast;
* accidental clutter.

Do not claim visual inspection unless the images were actually read.

---

# 19. GPU regression

If headed Windows Chromium is available:

Run the existing GPU validation.

Confirm:

* WebGL2;
* NVIDIA renderer;
* no SwiftShader;
* no console errors;
* no page errors.

Do not claim a new GPU result if the environment only permits headless SwiftShader.

Existing Step 06B GPU evidence remains valid if a fresh headed run is impossible, but clearly distinguish old evidence from this step.

---

# 20. Validation order

Run:

```text
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e:food
npm run test:e2e:resource
npm run test:e2e:temporal
npm run test:e2e:production
npm run test:e2e:jobs
npm run test:e2e
```

Use the repository's actual script names if they differ.

Then run GPU validation if available.

No previous behavior may regress.

---

# 21. Scope protection

Do NOT add:

* money;
* income;
* demand;
* markets;
* logistics;
* transport;
* worker skills;
* efficiency;
* happiness;
* morale;
* commuting;
* distance;
* job priorities;
* player-controlled employment;
* Farm staffing;
* generic workplace frameworks;
* generic workforce frameworks;
* labor resource;
* recipes;
* upgrades;
* production chains;
* storage caps;
* second population need.

Do not implement the next economic layer.

The only new economic relationship is:

```text
employed colonist
→ +2 construction material / tick
```

---

# 22. Final report

Return:

# Step 07C — COMPLETE / PARTIAL / BLOCKED

## Implementation

List exact files and changes.

## Jobs contract implemented

Report:

* Workshop;
* capacity;
* employment state;
* assignment algorithm;
* material output;
* tick order.

## Forecast

Report the new net-aware semantics.

## Persistence

Report version and validation.

## Tests

Exact unit/typecheck/lint/build results.

## E2E

Report:

* real browser;
* real clicks;
* scenarios;
* exact material deltas;
* console/page errors.

## Playability

Include a table:

| Question                                     | Result | Evidence |
| -------------------------------------------- | ------ | -------- |
| Workshop identifiable                        |        |          |
| Job purpose understandable                   |        |          |
| Colonist assignment understandable           |        |          |
| Material production understandable           |        |          |
| Unemployment understandable                  |        |          |
| Vacant jobs understandable                   |        |          |
| Starvation interaction understandable        |        |          |
| Construction enabled by labor understandable |        |          |

## Visual inspection

Only claim it if screenshots were actually inspected.

## GPU

Clearly distinguish fresh validation from previous Step 06B evidence.

## Scope integrity

Confirm that Farm remained worker-independent and that no future systems were introduced.

## Final decision

Only return:

```text
COMPLETE
```

if:

* implementation matches the 07B contract;
* unit tests pass;
* typecheck/lint/build pass;
* real-browser Jobs E2E passes;
* previous E2Es remain green;
* playability gate passes;
* no unexplained causal UX defect remains.

Otherwise return:

```text
PARTIAL
```

or:

```text
BLOCKED
```

with the exact reason.

