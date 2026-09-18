# NOVA — Step 08E — Production Capacity & Labor Constraint

## CONTEXT

NOVA is currently at:

* Step 08B — Material production
* Step 08C — Operational Workshop upkeep
* Step 08D — Economic invariants and verification

Current baseline:

`d94766d`

Previous committed baseline:

`4b10d6e`

Step 08D is COMPLETE.

All existing tests, E2E, lint, typecheck and build are green.

This step continues Phase 8 — Production Economy.

The roadmap contract is:

```text
Inputs
→ production
→ outputs
→ consumption
```

The project already has:

```text
Residence
→ Colonist
→ Food
→ Farm
→ Workshop
→ Worker
→ Material
→ Upkeep
```

The next step must deepen the existing production relationship without introducing unrelated economic systems.

---

# 1. OBJECTIVE

Formalize the relationship:

```text
Workshop capacity
→ Worker assignment
→ productive labor
→ Material production
```

The important rule is:

> A Workshop produces Material only when it has productive labor.

The current system already models worker assignment and Workshop staffing.

Step 08E must make that relationship explicit, deterministic and regression-safe.

This is NOT a new resource.

This is NOT a new gameplay layer.

This is NOT a new economic abstraction.

---

# 2. AUTHORITATIVE RULES

The existing production rule remains:

```text
Material production = productive workers × 2
```

A productive worker is a worker assigned to an operational Workshop.

Therefore:

```text
productiveWorkers <= totalWorkers
```

and:

```text
productiveWorkers <= operationalWorkshopCapacity
```

Material production is therefore:

```text
materialProduction =
  productiveWorkers × 2
```

Do not change the production coefficient.

It remains:

```text
2 Material / productive worker / tick
```

---

# 3. WORKSHOP CAPACITY

Use the existing Workshop job/capacity model.

Do NOT create a second capacity system.

If the existing model defines:

```text
Workshop capacity = 1 worker
```

preserve it.

If the existing domain already derives capacity differently, reuse that canonical rule.

The invariant must be:

```text
assigned productive workers
<= total Workshop job capacity
```

No worker may generate production without an actual valid Workshop assignment.

---

# 4. VACANT WORKSHOP

A vacant operational Workshop:

```text
production contribution = 0
upkeep = 0
```

It remains available for staffing.

No hidden production.

No hidden upkeep.

This preserves the 08C rule.

---

# 5. WORKSHOP UNDER CONSTRUCTION

A Workshop that is not yet operational:

```text
production = 0
upkeep = 0
```

Construction does not imply production capacity.

The lifecycle remains:

```text
planned
→ under construction
→ operational
```

Only operational buildings contribute to simulation capacity.

---

# 6. STAFFING

Use existing `assignJobs`.

Do NOT redesign job assignment.

Do NOT add a new worker state.

Do NOT add:

* `productive`
* `working`
* `productionWorker`
* `workplaceId`
* `laborEfficiency`

unless one of these already exists in the canonical domain.

The existing assignment relationship is authoritative.

---

# 7. PRODUCTION

Verify and, only if necessary, minimally adapt the production pipeline so that:

```text
productiveWorkers
→ Material production
```

The production phase must not infer workers from population alone.

Example:

```text
Population = 4
Workers = 4
Operational Workshops = 2
Workshop capacity = 1 each

productiveWorkers = 2

Material production = 4
```

NOT:

```text
Material production = 8
```

because two workers have no productive workplace.

---

# 8. IMPORTANT DISTINCTION

Do not confuse:

```text
worker
```

with:

```text
productive worker
```

A colonist can exist without working.

A worker can exist only if assigned according to the existing job rules.

Only workers actually assigned to operational Workshop capacity contribute to Material production.

The exact existing `assignJobs` contract remains authoritative.

---

# 9. ECONOMIC RELATIONSHIP

The complete current Material loop becomes:

```text
Colonists
   ↓
available workers
   ↓
Workshop capacity
   ↓
productive workers
   ↓
Material production
   ↓
Material stock
   ↓
Workshop upkeep
```

For the current Workshop model:

```text
production = productiveWorkers × 2
upkeep = staffedOperationalWorkshops × 1
```

Therefore, when every productive worker staffs one Workshop:

```text
net Material = productiveWorkers
```

This is a consequence of the existing rules.

Do not introduce a new balancing coefficient.

---

# 10. EDGE CASES

Tests must cover:

### Case A — zero Workshops

```text
workers > 0
operational Workshops = 0

production = 0
upkeep = 0
```

### Case B — one vacant Workshop

```text
workers = 0
operational Workshops = 1

production = 0
upkeep = 0
```

### Case C — one staffed Workshop

```text
productiveWorkers = 1

production = 2
upkeep = 1
net = +1
```

### Case D — two Workshops, one worker

```text
productiveWorkers = 1

production = 2
upkeep = 1
net = +1
```

The second Workshop is vacant and therefore free.

### Case E — two Workshops, two workers

```text
productiveWorkers = 2

production = 4
upkeep = 2
net = +2
```

### Case F — excess population

Example:

```text
population = 5
workers = 5
Workshop capacity = 2

productiveWorkers = 2
production = 4
```

Unassigned workers produce nothing.

### Case G — Workshop under construction

Workers cannot generate production from it.

### Case H — starvation

Population reaches zero.

Expected:

```text
workers = 0
productiveWorkers = 0
production = 0
upkeep = 0
```

Existing starvation behavior remains authoritative.

---

# 11. MATERIAL CONSERVATION

Preserve all 08C invariants.

For every valid state:

```text
Material >= 0
```

and:

```text
upkeep <= production
```

provided staffing is derived from valid Workshop assignments.

Do not introduce a state where upkeep can exceed production through normal gameplay.

The existing partial-payment clamp remains as a defensive invariant.

---

# 12. PHASE ORDER

Do not change the canonical phase order.

It remains:

```text
assignJobs
→ produceMaterial
→ upkeepBuildings
→ advanceTime
```

Production must observe assignments from the current tick.

Upkeep must observe the same current-tick staffing.

No recursive same-tick simulation.

No duplicate production pass.

No hidden phase.

---

# 13. QUERIES

If the project already has production queries, reuse them.

If required, expose only genuinely useful derived queries such as:

```text
getProductiveWorkerCount(state)
```

This query must be:

* pure
* deterministic
* derived
* non-persisted
* non-hashed

Do not create:

```text
ProductionSystem
ProductionEngine
LaborEngine
CapacityManager
EconomicEngine
```

unless an equivalent abstraction already exists and is required by the architecture.

Prefer the smallest implementation.

---

# 14. PERSISTENCE

No new SimulationState field.

No new serialized field.

No SAVE_VERSION change.

SAVE_VERSION remains:

```text
4
```

Do not persist productive worker count.

Do not persist production rate.

Do not persist Workshop capacity if it is already derived from the building catalog/domain.

Everything must remain derivable from canonical state.

---

# 15. DETERMINISM

Same:

```text
initial state
+ commands
+ configuration
```

must produce:

```text
same final state
same hash
```

No:

```text
Math.random()
Date.now()
performance.now()
```

No unordered iteration affecting simulation output.

No mutable singleton simulation state.

---

# 16. TESTS

Add focused tests for:

1. zero Workshops → zero production
2. vacant Workshop → zero production
3. one staffed Workshop → 2 Material
4. two staffed Workshops → 4 Material
5. two Workshops / one worker → 2 Material
6. excess workers cannot produce without capacity
7. under-construction Workshop → zero production
8. starvation → zero production/upkeep
9. productive worker count equals actual valid assignments
10. production query equals simulation production
11. existing upkeep remains correct
12. Material conservation remains correct
13. determinism
14. save/hash regression

Do not rewrite the existing 08C tests.

Extend them only where a direct regression relationship exists.

---

# 17. E2E

Use the existing headless Chromium E2E architecture.

Do not create new UI.

Verify the real DOM.

### E2E-A

No operational Workshop:

```text
production = 0
upkeep = 0
```

### E2E-B

One operational vacant Workshop:

```text
production = 0
upkeep = 0
```

### E2E-C

One worker + one operational Workshop:

```text
production = 2
upkeep = 1
net = +1
```

### E2E-D

Two workers + two operational Workshops:

```text
production = 4
upkeep = 2
net = +2
```

### E2E-E

More workers than Workshop capacity.

Verify that excess workers do not generate Material.

### E2E-F

Workshop under construction.

Verify no production before operational lifecycle state.

### E2E-G

Starvation.

Verify:

```text
population = 0
workers = 0
production = 0
upkeep = 0
```

No additional failure state.

Inspect screenshots where the existing E2E pipeline provides them.

---

# 18. UI

Do not create a new dashboard.

Existing causal status should remain sufficient.

If the current status already displays:

```text
X workers produced Y material · upkeep Z
```

ensure `X` corresponds to actual productive workers.

Do not display population as workers when some workers are unassigned.

Workshop inspection should continue to distinguish:

```text
staffed → upkeep 1/tick
vacant → upkeep 0
```

No new panel.

No new notification system.

---

# 19. OUT OF SCOPE

Absolutely do not implement:

* Money
* Salaries
* Taxes
* Trade
* Prices
* Demand
* Power
* Water
* Transport
* Roads
* Vehicles
* Technology
* New resources
* New needs
* Building degradation
* Repairs
* Building destruction
* Production efficiency
* Worker fatigue
* Worker wages
* Production inputs as a new resource
* Generic production framework
* Generic economy framework
* New persisted state
* SAVE_VERSION bump
* UI dashboard

This step is strictly about making the existing:

```text
Workshop → worker → production
```

causal relationship explicit and regression-safe.

---

# 20. ACCEPTANCE CRITERIA

Step 08E is COMPLETE only when:

* [ ] production is based on actual productive Workshop assignments
* [ ] population alone cannot generate Material
* [ ] Workshop capacity limits productive workers
* [ ] vacant Workshop produces 0
* [ ] under-construction Workshop produces 0
* [ ] one productive worker produces 2 Material
* [ ] two productive workers produce 4 Material
* [ ] excess workers produce nothing without capacity
* [ ] upkeep remains unchanged
* [ ] zero workers => zero production/upkeep
* [ ] starvation remains unchanged
* [ ] no new state field
* [ ] SAVE_VERSION remains 4
* [ ] save/load remains stable
* [ ] hash remains stable
* [ ] deterministic replay remains stable
* [ ] existing 08B/08C/08D tests remain green
* [ ] new unit tests pass
* [ ] E2E passes
* [ ] lint passes
* [ ] typecheck passes
* [ ] build passes
* [ ] no scope creep
* [ ] screenshots inspected where available

---

# 21. FINAL REPORT

Report:

1. commit hash
2. parent commit
3. files modified
4. production code changes
5. tests added
6. total test count
7. E2E scenarios
8. lint
9. typecheck
10. build
11. SAVE_VERSION
12. save/hash verification
13. determinism verification
14. screenshot inspection
15. scope violations, if any

If all checks pass:

```text
Step 08E COMPLETE
```

Commit:

```text
Step 08E: formalize productive labor constraint
```

Do not start 08F in the same task.

