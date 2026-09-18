# NOVA — Step 05C — Implement Food Need

## Context

Step 05A established that production is premature.

Step 05B is now complete and its design contract is **READY FOR IMPLEMENTATION**.

The contract defines the smallest meaningful food/need loop:

```text
Colonist exists
  ↓
Food need = 1 unit / colonist / tick
  ↓
Consumption phase
  ↓
Food stock decreases
  ↓
Food shortage
  ↓
Entire colony starves
  ↓
Population = 0
  ↓
Food = 0 blocks further admission
```

Do NOT redesign this mechanic during implementation.

The goal of this step is to implement exactly this contract, minimally, deterministically, and without introducing generic economy/needs abstractions.

---

# 0. First action — persist the completed design contract

Before modifying source code:

Replace the current template content of:

```text
docs/roadmap/Step05B.md
```

with the completed Step 05B design contract produced during the audit.

Do not alter its decisions while copying it into the roadmap document.

Then continue with implementation.

---

# 1. Re-read the authoritative contract and repository

Before coding, inspect:

```text
docs/roadmap/Step05B.md
docs/00-CMD.md
docs/02-game-design.md
docs/03-core-loop.md
docs/07-population.md
docs/08-economy.md
docs/09-economy-foundation.md
docs/11-time-and-events.md
docs/18-save-game.md
docs/22-canonical-simulation.md
docs/26-roadmap.md
docs/29-design-rules.md
```

Then inspect the current implementation and tests around:

```text
src/domain/resource/
src/domain/population/
src/domain/simulation/
src/application/
src/app/
tests/
e2e/
```

Do not assume file names or APIs if the repository differs.

---

# 2. Non-negotiable design constraints

Implement exactly these semantics.

## ResourceStock

Current:

```ts
{
  construction: number
}
```

becomes:

```ts
{
  construction: number
  food: number
}
```

Food:

* integer;
* finite;
* never negative;
* initial value = `100`;
* no maximum/cap yet;
* no production;
* no passive decay;
* no wall-clock dependency.

Add the smallest concrete constants/functions necessary:

```text
INITIAL_FOOD = 100
FOOD_PER_COLONIST_PER_TICK = 1
hasSufficientFood(...)
deductFood(...)
```

Follow the existing Step 04 resource implementation style.

Do NOT introduce:

```text
ResourceSystem
ResourceManager
GenericResource<T>
EconomyEngine
```

---

# 3. Food need semantics

Do NOT add a need field to `ColonistState`.

Do NOT add a stored `foodNeed`.

The need is derived:

```text
foodRequirement = colonistCount × FOOD_PER_COLONIST_PER_TICK
```

With the current constant:

```text
foodRequirement = colonistCount
```

The Need → Consumption → Outcome distinction must remain structurally explicit.

Use separate pure phases/functions corresponding to:

```text
updateNeeds
consumeFood
updatePopulation
```

The need itself does not need persistence.

Do NOT introduce generic:

```text
Need<T>
NeedSystem
ConsumptionSystem<T>
```

There is currently only one concrete need.

---

# 4. Canonical tick order

The current order is:

```text
applyCommand
→ advanceConstruction
→ updatePopulation
→ advanceTime
```

Change it to:

```text
applyCommand
→ advanceConstruction
→ updateNeeds
→ consumeFood
→ updatePopulation
→ advanceTime
```

The exact implementation may use another internal representation if it preserves these semantics.

Important:

* `fed` is an intra-tick value;
* it must NOT be stored in `SimulationState`;
* it must NOT be persisted;
* it must NOT become part of the canonical hash.

A later phase depending on the consumption result must receive that result explicitly.

---

# 5. Consumption rules

Every tick:

```text
population = number of colonists
requiredFood = population × FOOD_PER_COLONIST_PER_TICK
```

If:

```text
population === 0
```

then:

```text
food consumption = 0
fed = true / no-shortage
```

and food remains unchanged.

If:

```text
food >= requiredFood
```

then:

```text
food -= requiredFood
fed = true
```

If:

```text
food < requiredFood
```

then:

```text
food = 0
fed = false
```

The shortage branch must not throw.

Food deduction must remain pure and atomic.

Negative inputs must continue to be rejected consistently with the existing resource helpers.

---

# 6. Starvation consequence

On the first tick where:

```text
food < requiredFood
```

the entire colony starves.

Result:

```text
food = 0
colonists = []
```

All residence assignments are therefore naturally freed.

Do NOT implement:

* partial rationing;
* one-colonist-at-a-time death;
* priority ordering;
* grace periods;
* random death;
* per-colonist survival;
* deficit tracking.

This is intentionally all-or-nothing.

The consequence occurs in the same simulation tick as the shortage.

---

# 7. Admission gating

Existing admission behavior remains:

* operational residence;
* available housing capacity;
* ascending residence ID ordering.

Add the food viability condition:

```text
food > 0
```

A colonist may only be admitted when food is available.

Important temporal rule:

> A colonist admitted during tick N is first consumed/fed on tick N+1.

Do not accidentally make a newly admitted colonist consume food twice or consume in the same tick as admission.

This must follow the canonical phase order:

```text
consumeFood
→ population/admission
```

---

# 8. Persistence

Change:

```text
SAVE_VERSION = 2
```

to:

```text
SAVE_VERSION = 3
```

Persist:

```text
resources.food
```

Validation:

* finite;
* integer;
* `>= 0`;
* required in v3;
* unexpected malformed values rejected.

Explicitly reject v2 saves.

Do NOT create a v2 → v3 migration.

Do NOT silently infer:

```text
food = 100
```

for an old save.

Follow the existing `SaveValidationError` / unsupported-version conventions.

Verify:

```text
serialize → load
```

preserves canonical state exactly.

Also verify behavioral equivalence after loading.

---

# 9. Hash / determinism

Food must automatically become part of the canonical simulation state/hash.

Verify:

```text
same state → same hash
same state + same command → same next state
food change → hash change
population change → hash change
```

Starvation must be deterministic.

Do not introduce:

```text
Math.random()
Date.now()
performance.now()
wall-clock state
browser state
```

The `fed` intra-tick value must not be serialized or hashed independently.

---

# 10. Application/UI

Keep the existing architecture.

Do not introduce a new UI framework or resource subsystem.

The existing resource query should expose food.

Add to the existing HUD:

```text
Food: <value>
```

using the real simulation state/query.

Do not hardcode the displayed value.

Expose minimal read-only E2E diagnostics through the existing:

```text
window.__nova
```

Add:

```text
food
foodStatus
```

only if that matches the existing diagnostic structure.

`foodStatus` should be derived from real state, not duplicated simulation logic.

At minimum, the UI must make a shortage understandable.

Example acceptable presentation:

```text
Food: 0 — colony starved
```

Do not build:

* food dashboards;
* charts;
* per-colonist hunger bars;
* forecasts;
* resource panels;
* production UI.

---

# 11. Tests

Extend the existing tests rather than creating redundant infrastructure.

## Required unit/integration coverage

### Initial state

Verify:

```text
construction = 100
food = 100
colonists = 0
```

Two identical initial states must produce identical hashes.

### One colonist

Verify exactly:

```text
food(t+1) = food(t) - 1
```

while fed.

### Multiple colonists

Verify:

```text
2 colonists → -2 food/tick
4 colonists → -4 food/tick
```

### Exact boundary

For:

```text
food === population
```

the tick is fed:

```text
food → 0
colonists survive
```

### Shortage

For:

```text
food < population
```

verify:

```text
food → 0
colonists → 0
residences freed
```

in the same tick.

### No population

Verify:

```text
population = 0
```

does not consume food.

### Admission gating

Verify no colonist is admitted when:

```text
food = 0
```

### Newly admitted colonist

Verify the colonist admitted on tick N does not consume food until tick N+1.

### Determinism

Repeat identical scenarios and compare:

* state;
* hash;
* starvation result.

### Immutability

Verify `stepSimulation()` does not mutate its input.

### Persistence

Verify:

* v3 round-trip;
* v2 rejected;
* missing food rejected;
* invalid food rejected;
* canonical hash preserved;
* render snapshot preserved;
* continued simulation behavior preserved.

### Regression

All Step 04 tests must continue passing.

---

# 12. E2E

Create:

```text
e2e/foodRun.mjs
```

Follow the existing `resourceRun.mjs` architecture.

Use:

* real browser;
* real clicks;
* real simulation;
* real STEP;
* real PLAY/PAUSE;
* existing diagnostics only for observation/assertion.

Do not duplicate simulation logic inside the E2E script.

Scenario:

### A. Initial

Assert:

```text
food = 100
construction = 100
colonists = 0
```

Screenshot:

```text
artifacts/food/01-initial.png
```

### B. Build four residences

Use the real UI.

Verify construction affordability and resulting colonists.

Screenshot:

```text
artifacts/food/02-colonists-fed.png
```

### C. Consumption

Advance ticks.

Assert the food delta equals the current colonist population on every fed tick.

Assert:

```text
food >= 0
```

### D. Shortage

Continue until the shortage occurs.

Assert:

```text
food = 0
colonists = 0
```

and residences are vacant.

Screenshot:

```text
artifacts/food/03-shortage.png
```

### E. Post-starvation

Advance additional ticks.

Assert:

```text
food = 0
colonists = 0
```

and no new colonist is admitted.

Screenshots:

```text
artifacts/food/04-after-starvation.png
artifacts/food/05-rejected-growth.png
```

### F. Runtime health

Assert:

```text
console errors = 0
page errors = 0
```

Use the same real-browser strategy already established in Steps 02–04.

---

# 13. GPU regression

Do not create a new GPU architecture.

Run the existing GPU E2E after implementation.

It must still verify:

```text
WebGL2
NVIDIA GPU
software renderer = false
```

and the existing Step 04 behavior.

If the GPU E2E can naturally include the food scenario without making the script unnecessarily complex, extend it.

Otherwise keep `foodRun.mjs` as the authoritative food E2E and use the GPU suite as regression coverage.

Do not claim visual/GPU success without actual runtime evidence.

---

# 14. Screenshots

Verify that all expected screenshots:

* exist;
* are non-empty;
* have valid dimensions.

Do not claim visual inspection unless the images were actually inspected.

It is acceptable for the final report to state:

```text
Visual inspection: NOT EXECUTED
```

if no image-reading capability is available.

---

# 15. Validation order

Run validation in this order:

### Phase 1 — focused

```text
food/resource unit tests
simulation tests
persistence tests
determinism tests
```

Fix failures before continuing.

### Phase 2 — static

```text
pnpm lint
pnpm typecheck
pnpm build
```

### Phase 3 — food E2E

```text
pnpm test:e2e:food
```

or the repository's equivalent command.

### Phase 4 — regression E2E

Run:

```text
resource E2E
temporal E2E
GPU E2E
```

using the repository's existing commands.

### Phase 5 — full suite

Run the complete test suite.

Do not stop at unit tests.

---

# 16. Scope protection

Do NOT modify unrelated systems.

Explicitly out of scope:

* production;
* jobs;
* workers;
* money;
* markets;
* water;
* power;
* logistics;
* transport;
* generic need framework;
* generic resource framework;
* stock caps;
* migration tooling;
* save upgrade tooling;
* per-colonist need meters;
* rationing;
* starvation history/events;
* new UI framework;
* unrelated renderer refactors.

If implementation appears to require one of these, stop and report the architectural conflict instead of silently expanding scope.

---

# 17. Final audit

After implementation and validation, inspect the final diff.

Verify:

* food is part of canonical state;
* no hidden mutable state exists;
* no random/time dependency exists;
* need/consumption/outcome remain distinct;
* admission is still deterministic;
* starvation is deterministic;
* v2 saves are explicitly rejected;
* Step 04 behavior remains intact;
* UI uses real state;
* E2E uses real browser behavior;
* no unrelated refactor slipped in.

Also check that the implementation still reads coherently as a city-builder simulation:

```text
housing
→ colonist
→ need
→ consumption
→ scarcity
→ population consequence
```

without pretending that production already exists.

---

# 18. Final report

Return a concise but evidence-based report containing:

## Implementation

Files changed and what changed.

## Semantics

Confirm:

```text
1 food / colonist / tick
all-or-nothing feeding
shortage → colony starvation
food = 0 → no admission
new colonist → first consumption next tick
```

## Persistence

Confirm:

```text
v3
v2 rejected
food validated
round-trip
hash
behavioral equivalence
```

## Tests

Give exact results.

## E2E

Give exact results for:

* food E2E;
* resource E2E;
* temporal E2E;
* GPU E2E;
* full suite.

Include exact browser/GPU evidence where available.

## Screenshots

List actual screenshot files and dimensions.

Do not claim visual inspection unless actually performed.

## Diff hygiene

Confirm no unrelated files/features were changed.

## Final status

Use exactly one:

```text
COMPLETE
```

only if all acceptance criteria are genuinely verified.

Otherwise:

```text
PARTIAL
```

or

```text
BLOCKED
```

with the exact missing evidence.

Do not declare COMPLETE merely because the code compiles.

