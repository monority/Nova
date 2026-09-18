# NOVA — Step 08F — Material Storage Capacity & Flow Constraint

## CONTEXT

NOVA baseline:

`a309b81`

Completed:

* 08B — Material production
* 08C — Material upkeep
* 08D — Economic invariants
* 08E — Labor → production capacity

Current causal chain:

```text
Residence
→ Colonist
→ Food
→ Farm
→ Workshop
→ Worker
→ Material production
→ Material stock
→ Workshop upkeep
```

Phase 8 roadmap requires:

```text
Inputs
→ production
→ outputs
→ consumption
```

Before introducing any new physical input/resource, formalize the existing
Material storage/flow relationship.

This step MUST NOT introduce a second resource.

---

# 1. OBJECTIVE

Make Material storage an explicit bounded resource flow.

The simulation must distinguish:

```text
Material produced this tick
Material consumed this tick
Material currently stored
Material storage capacity
```

The existing Material stock remains the authoritative stored quantity.

The objective is to prevent unlimited accumulation while keeping the existing
production/upkeep causal chain intact.

---

# 2. AUTHORITATIVE RULE

Material storage capacity must be derived from existing infrastructure.

Do NOT add a new persisted:

```text
materialCapacity
```

field.

Use the existing building/capacity domain where possible.

The initial implementation should use **operational Workshops as storage capacity**.

Contract:

```text
materialStorageCapacity =
  operational Workshop count × 25
```

If there is already an authoritative capacity/catalog constant for Workshop
storage, reuse it instead of duplicating the value.

If no such constant exists, introduce exactly one named domain constant:

```text
MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP = 25
```

Do not create a generic StorageSystem.

---

# 3. WHY 25

The value 25 deliberately matches the current construction cost scale.

This is a gameplay constant for the first bounded Material store.

It is NOT:

* a new construction cost
* a new resource
* a new building
* a new upgrade
* a universal storage rule

Do not rebalance existing construction costs.

---

# 4. EMPTY / NO WORKSHOP STATE

With:

```text
operationalWorkshops = 0
```

capacity is:

```text
0
```

Existing initial Material must remain compatible with the current bootstrap
state.

IMPORTANT:

Do not silently delete or clamp the existing starting stock merely because
capacity is currently 0.

If the current game starts with Material > 0 before any Workshop exists,
preserve that state.

The storage cap applies to production flow.

Do not retroactively mutate existing starting resources.

---

# 5. PRODUCTION FLOW

Current production:

```text
productiveWorkers × 2
```

Before adding produced Material to stock:

```text
availableCapacity =
  max(0, storageCapacity - currentMaterial)
```

Then:

```text
storedProduction =
  min(producedMaterial, availableCapacity)
```

The excess is discarded.

Do NOT create:

* overflow resource
* waste resource
* debt
* negative storage
* hidden buffer
* production backlog

The discarded amount may be exposed as a derived query for tests/UI if useful,
but must NOT become persisted state.

---

# 6. UPKEEP ORDER

The phase order remains:

```text
assignJobs
→ produceMaterial
→ upkeepBuildings
→ advanceTime
```

However, the resource flow must be carefully defined.

The current production is added to storage subject to capacity.

Then upkeep consumes stored Material.

Example:

```text
capacity = 50
stock before production = 48
production = 4

stored production = 2
stock = 50

upkeep = 1

final stock = 49
```

This is intentional.

Production does NOT bypass the storage cap merely because upkeep occurs later.

Do not reorder phases to make storage easier.

---

# 7. IMPORTANT CAPACITY SEMANTICS

Capacity is based on:

```text
operational Workshops
```

NOT:

* staffed Workshops
* workers
* population
* planned buildings
* buildings under construction

Therefore:

```text
vacant operational Workshop
→ +25 storage capacity
→ upkeep 0
→ production contribution 0
```

This gives vacant infrastructure a meaningful but limited economic role.

A Workshop under construction contributes:

```text
capacity = 0
production = 0
upkeep = 0
```

until operational.

---

# 8. SAME-TICK OPERATIONAL SEMANTICS

Follow the existing lifecycle and phase contract.

A Workshop becoming operational during the simulation must use the existing
same-tick semantics.

Do not introduce a second lifecycle pass.

If the existing engine makes the building operational before the relevant
production phase, it contributes capacity that tick.

If the existing phase model makes it operational later, respect the canonical
phase order rather than inventing a special storage exception.

Document the actual observed behavior in tests.

---

# 9. STORAGE QUERY

Add a pure derived query if the project does not already have one:

```text
getMaterialStorageCapacity(state)
```

Optional useful derived queries:

```text
getMaterialStoredSpace(state)
getMaterialOverflowPerTick(state)
```

Only add the latter if directly useful to tests or existing UI.

Queries must be:

* pure
* deterministic
* derived
* non-persisted
* non-hashed

Do not persist storage capacity.

---

# 10. PRODUCTION QUERY CONSISTENCY

The simulation and queries must agree.

If:

```text
getMaterialProductionPerTick(state)
```

already exists, it describes the amount that WOULD be produced before storage
clamping.

Do not silently change its semantic meaning.

Distinguish:

```text
gross production
```

from:

```text
stored production
```

If necessary, name a second derived query explicitly rather than changing an
existing query's contract.

---

# 11. ECONOMIC MODEL

The resulting flow is:

```text
productiveWorkers × 2
          ↓
   gross production
          ↓
   storage capacity
          ↓
    stored Material
          ↓
     upkeep × 1
          ↓
   remaining Material
```

This creates a bounded stock without introducing another resource.

---

# 12. EXAMPLES

## Example A — empty storage

```text
capacity = 25
stock = 0
production = 2
upkeep = 1
```

After production:

```text
stock = 2
```

After upkeep:

```text
stock = 1
```

---

## Example B — storage almost full

```text
capacity = 25
stock = 24
production = 4
upkeep = 1
```

Stored production:

```text
1
```

After production:

```text
25
```

After upkeep:

```text
24
```

---

## Example C — full storage

```text
capacity = 25
stock = 25
production = 4
upkeep = 1
```

Stored production:

```text
0
```

After upkeep:

```text
24
```

---

## Example D — empty stock recovery

```text
capacity = 25
stock = 0
workers = 1
staffedWorkshop = 1
```

Production:

```text
+2
```

Upkeep:

```text
-1
```

Final:

```text
stock = 1
```

Recovery still works.

---

## Example E — several Workshops

```text
4 operational Workshops
4 productive workers

capacity = 100
production = 8
upkeep = 4
net = +4
```

---

# 13. CAPACITY SCALING

Verify:

```text
0 operational Workshops → 0 capacity
1 operational Workshop  → 25 capacity
2 operational Workshops → 50 capacity
4 operational Workshops → 100 capacity
```

Capacity must not depend on staffing.

---

# 14. NO CAPACITY FOR FUTURE BUILDINGS

The following contribute zero:

```text
planned Workshop
under-construction Workshop
disabled Workshop
abandoned Workshop
```

Only operational Workshops contribute.

This follows the canonical construction lifecycle.

---

# 15. STARTING MATERIAL

Do NOT modify the existing initial resource setup merely to accommodate the
new capacity system.

If the existing state starts with:

```text
Material = X
```

preserve it.

The storage system must be introduced without invalidating the existing
bootstrap state.

If this exposes an actual contradiction in the existing canonical state,
STOP and report it rather than silently changing initialization.

---

# 16. NON-NEGATIVE GUARANTEE

After every tick:

```text
Material >= 0
```

and:

```text
Material <= storageCapacity
```

EXCEPT for a pre-existing bootstrap state that intentionally starts above
the derived capacity.

Once the first normal production/storage phase occurs, the stored resource
must obey the capacity constraint.

Do not use negative overflow.

---

# 17. UPKEEP INTERACTION

Preserve all 08C rules.

Upkeep remains:

```text
staffedOperationalWorkshops × 1
```

A Workshop's storage contribution is independent from staffing.

Therefore:

```text
vacant Workshop:
capacity +25
upkeep 0
production 0
```

and:

```text
staffed Workshop:
capacity +25
upkeep 1
production contribution +2 per worker
```

Do not introduce a capacity upkeep cost.

---

# 18. DETERMINISM

Storage clamping must be deterministic.

No:

```text
Math.random()
Date.now()
performance.now()
```

No iteration order may influence the final result.

Capacity is an integer aggregate.

Production, capacity and stock must remain integer-valued.

No decimal resource quantities.

---

# 19. PERSISTENCE

No new SimulationState fields.

Do not persist:

```text
storageCapacity
storedSpace
overflow
grossProduction
storedProduction
```

unless one of these already exists as canonical state.

SAVE_VERSION remains:

```text
4
```

Hash contract must remain unchanged unless the existing canonical stock field
itself changes.

The stock value is already part of canonical state, so its normal deterministic
mutation is expected.

---

# 20. SAVE / LOAD

Test:

```text
state
→ save
→ load
```

with:

* empty storage
* partially filled storage
* full storage
* multiple Workshops

The loaded state must equal the original state.

Hash must match.

---

# 21. UNIT TESTS

Add focused tests covering:

### Storage

1. zero operational Workshops → capacity 0
2. one operational Workshop → capacity 25
3. two operational Workshops → capacity 50
4. four operational Workshops → capacity 100
5. vacant Workshop still contributes capacity
6. under-construction Workshop contributes zero capacity

### Production clamp

7. stock below capacity → full production stored
8. stock near capacity → production clamped
9. stock at capacity → zero production stored
10. overflow is not persisted
11. Material never becomes negative

### Upkeep interaction

12. production then upkeep
13. full storage + upkeep frees space for next tick
14. recovery from zero still works
15. upkeep remains based on staffed Workshops, not capacity

### Consistency

16. production query remains gross production
17. storage capacity query matches simulation
18. deterministic replay
19. save/load round-trip
20. hash stability

Do not rewrite existing 08B–08E tests.

---

# 22. E2E

Use the existing headless Chromium infrastructure.

No new UI.

Verify the actual DOM.

### E2E-A — storage capacity

One operational Workshop.

Verify the existing UI/status can expose the capacity only if a current UI
surface already exists for it.

Do NOT create a new dashboard just for this step.

### E2E-B — production clamp

Fill Material close to capacity.

Run production.

Verify Material does not exceed capacity.

### E2E-C — full storage

At capacity:

production is clamped.

After upkeep:

stock decreases.

Next production tick can fill the freed space.

### E2E-D — vacant Workshop

Operational but vacant:

capacity increases.

upkeep remains 0.

production remains 0.

### E2E-E — under construction

No capacity.

No production.

No upkeep.

### E2E-F — recovery

Material = 0.

Workers > 0.

Production and upkeep continue.

Material recovers normally.

Inspect screenshots produced by the existing E2E pipeline.

---

# 23. UI

Do NOT add a new panel.

Do NOT add a storage dashboard.

Do NOT add notifications.

If the current Material display has an established place for:

```text
Material X / Capacity Y
```

it may be extended minimally.

Otherwise, keep capacity as a domain/query/test concept for this step.

The player's existing causal status remains authoritative.

---

# 24. ARCHITECTURAL GUARDRAILS

Do NOT create:

* StorageSystem
* InventorySystem
* WarehouseSystem
* ResourceManager
* GenericCapacitySystem
* ResourceFlowEngine
* EconomyEngine

Do not generalize storage for future resources.

There is currently only one stored economic resource: Material.

One use case does not justify a generic framework.

---

# 25. OUT OF SCOPE

Do NOT implement:

* new resources
* input goods
* food storage changes
* warehouses
* storage buildings
* storage upgrades
* logistics
* transport
* roads
* trade
* markets
* money
* prices
* demand
* power
* water
* degradation
* repairs
* destruction
* production efficiency
* worker fatigue
* technology
* new buildings
* SAVE_VERSION bump
* new persistent state
* generic resource framework

---

# 26. ACCEPTANCE CRITERIA

Step 08F is COMPLETE only when:

* [ ] Material storage is bounded by operational Workshop capacity
* [ ] capacity = operational Workshops × 25
* [ ] vacant Workshop contributes capacity
* [ ] staffed Workshop contributes the same capacity
* [ ] under-construction Workshop contributes 0
* [ ] production is clamped to available storage
* [ ] overflow is discarded deterministically
* [ ] upkeep remains unchanged
* [ ] production → storage → upkeep order is preserved
* [ ] Material never becomes negative
* [ ] normal Material never exceeds capacity
* [ ] recovery remains possible
* [ ] no new resource exists
* [ ] no new persistent state exists
* [ ] SAVE_VERSION = 4
* [ ] save/load passes
* [ ] hash remains deterministic
* [ ] replay deterministic
* [ ] existing tests remain green
* [ ] new tests pass
* [ ] E2E passes
* [ ] lint passes
* [ ] typecheck passes
* [ ] build passes
* [ ] screenshots inspected
* [ ] no scope creep

---

# 27. IMPORTANT IMPLEMENTATION RULE

Before modifying anything:

1. inspect the existing Material/resource implementation;
2. inspect the Workshop/building catalog;
3. inspect existing construction lifecycle;
4. inspect production phase;
5. inspect current resource queries;
6. inspect existing E2E resource/production tests.

If the repository already contains a storage capacity concept that satisfies
this contract, reuse it.

If the repository's current starting stock contradicts a zero-Workshop capacity,
DO NOT silently rebalance the starting stock.

Report the contradiction.

The goal is to implement the smallest correct change.

---

# 28. FINAL REPORT

Report:

1. commit hash
2. parent commit
3. files modified
4. production code changes
5. tests added
6. total tests
7. E2E scenarios
8. lint
9. typecheck
10. build
11. SAVE_VERSION
12. save/hash verification
13. determinism verification
14. screenshot inspection
15. any bootstrap/capacity contradiction
16. scope violations

If all checks pass:

```text
Step 08F COMPLETE
```

Commit:

```text
Step 08F: bound material storage flow
```

Do not begin 08G in the same task.

