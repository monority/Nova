# NOVA — Step 08D — Economic Invariants & Balance Verification

## CONTEXT

Step 08B introduced the first material production loop.

Step 08C introduced recurring Material upkeep:

* Material production = workers × 2
* Material upkeep = staffed operational Workshops × 1
* upkeep occurs after production
* vacant Workshops cost 0
* insufficient Material clamps to 0
* no building degradation/deactivation
* no debt
* recovery is automatic
* no new persisted state
* SAVE_VERSION remains 4

08C is COMPLETE and committed at:

`4b10d6e`

Do not modify the economic rules established by 08B/08C.

This step is a verification/hardening step.

---

# 1. OBJECTIVE

Make the current economic invariants explicit and executable.

The goal is NOT to add a new economic mechanic.

The goal is to ensure that future changes cannot silently violate:

* Food conservation
* Material conservation
* production limits
* upkeep limits
* non-negative resources
* staffing/workshop relationship
* deterministic simulation
* phase ordering
* construction costs
* recovery behavior

Prefer executable tests over new runtime abstractions.

---

# 2. AUTHORITATIVE ECONOMIC MODEL

For every simulation tick:

## Food

```text
foodProduction = farms × 2
foodConsumption = population × 1

netFood = foodProduction - foodConsumption
```

Use the existing starvation/admission semantics.

Do not redesign Food.

## Material

```text
materialProduction = workers × 2

staffedOperationalWorkshops =
  operational Workshops with at least one assigned worker

materialUpkeep = staffedOperationalWorkshops × 1

netMaterial =
  materialProduction - materialUpkeep
```

Current architecture guarantees:

```text
staffedOperationalWorkshops <= workers
```

Therefore:

```text
materialUpkeep <= materialProduction
```

and:

```text
netMaterial >= 0
```

This is an invariant of the CURRENT design.

Do not turn this into a new generic economic framework.

---

# 3. REQUIRED INVARIANTS

Add tests for the following invariants.

## INV-01 — Material never negative

For any valid simulation state:

```text
material >= 0
```

Test this across representative states.

## INV-02 — Upkeep never exceeds production

For valid states:

```text
upkeep <= materialProduction
```

because:

```text
staffedWorkshops <= workers
```

## INV-03 — Vacant Workshop has zero upkeep

```text
operational + vacant Workshop
=> upkeep = 0
```

## INV-04 — Under-construction Workshop has zero upkeep

```text
under construction Workshop
=> upkeep = 0
```

## INV-05 — Non-Workshop buildings have zero upkeep

Residence and Farm must not contribute to Material upkeep.

## INV-06 — One worker cannot staff multiple Workshops

Verify using the existing assignment/job invariants.

Do NOT modify assignJobs unless a real invariant violation exists.

## INV-07 — Production scales linearly

```text
1 worker => 2 Material
2 workers => 4 Material
4 workers => 8 Material
```

## INV-08 — Upkeep scales linearly

```text
1 staffed Workshop => 1 Material
2 staffed Workshops => 2 Material
4 staffed Workshops => 4 Material
```

## INV-09 — Net Material scales linearly

When every worker staffs exactly one Workshop:

```text
1 worker => +1 Material/tick
2 workers => +2 Material/tick
4 workers => +4 Material/tick
```

## INV-10 — Zero workers

```text
workers = 0
upkeep = 0
production = 0
```

Material must not decrease.

## INV-11 — Recovery

With:

```text
material = 0
workers > 0
staffedWorkshops > 0
```

the next tick must produce positive Material.

## INV-12 — Construction cost remains authoritative

Existing construction costs remain:

```text
Residence = 25
Farm      = 25
Workshop  = 25
```

Do not rebalance them.

## INV-13 — Construction does not create hidden upkeep

A Workshop must not start costing Material before becoming operational.

## INV-14 — Determinism

Same initial state + same commands + same config:

```text
=> identical final state
=> identical hash
```

---

# 4. PHASE ORDER CONTRACT

The current phase order is authoritative.

Verify that the relevant economic sequence remains:

```text
assignJobs
→ produceMaterial
→ upkeepBuildings
→ advanceTime
```

Do not reorder phases.

Do not introduce recursive same-tick simulation.

Do not create a second production/upkeep pass.

Add a regression test if practical.

---

# 5. ECONOMIC BALANCE MATRIX

Create a compact test matrix covering:

| Workers | Staffed WS | Material production | Upkeep | Net |
| ------: | ---------: | ------------------: | -----: | --: |
|       0 |          0 |                   0 |      0 |   0 |
|       1 |          0 |                   2 |      0 |  +2 |
|       1 |          1 |                   2 |      1 |  +1 |
|       2 |          0 |                   4 |      0 |  +4 |
|       2 |          1 |                   4 |      1 |  +3 |
|       2 |          2 |                   4 |      2 |  +2 |
|       4 |          0 |                   8 |      0 |  +8 |
|       4 |          2 |                   8 |      2 |  +6 |
|       4 |          4 |                   8 |      4 |  +4 |

These are verification fixtures, not new balancing rules.

---

# 6. FOOD / MATERIAL ISOLATION

Verify that Material upkeep does not accidentally alter Food behavior.

Run combined scenarios:

### Scenario A

```text
workers > 0
food stable
material stable
```

Both systems must evolve independently.

### Scenario B

Starvation:

```text
population -> 0
workers -> 0
```

Expected:

```text
food follows existing starvation rules
material production = 0
material upkeep = 0
```

No additional Material penalty.

### Scenario C

Material = 0 while Food is healthy.

Expected:

* food continues normally
* workers continue existing production behavior
* material recovers
* no population penalty

Do not introduce coupling between Food and Material.

---

# 7. QUERY CONSISTENCY

Verify that:

```text
getMaterialUpkeepPerTick(state)
```

matches the actual upkeep applied by the simulation.

Verify that:

```text
getNetMaterialPerTick(state)
```

matches:

```text
materialProduction - materialUpkeep
```

Queries must remain:

* pure
* deterministic
* derived
* non-persistent
* non-hashed

Avoid duplicated formulas where practical.

If the current implementation has unavoidable duplicated arithmetic, do not introduce a generic abstraction merely to remove two lines of duplication.

---

# 8. SAVE / HASH REGRESSION

Explicitly verify:

```text
SAVE_VERSION === 4
```

No new state fields.

Round-trip:

```text
state
→ save
→ load
```

must preserve the exact simulation state.

Hash must remain stable across save/load.

Queries such as upkeep and net Material must NOT become persisted/hash state.

---

# 9. E2E

Extend existing E2E only where necessary.

Use the existing headless Chromium architecture.

Verify real DOM behavior.

Minimum regression scenarios:

### E2E-A — vacant Workshop

Workshop visible and operational.

No worker assigned.

Expected:

```text
upkeep = 0
```

### E2E-B — staffed Workshop

One worker assigned.

Expected:

```text
produced 2
upkeep 1
```

### E2E-C — scaling

Two workers / two staffed Workshops.

Expected:

```text
produced 4
upkeep 2
net +2
```

### E2E-D — recovery

Start from Material = 0 with workers.

Expected:

```text
production continues
upkeep is paid
Material becomes positive
```

### E2E-E — starvation

Population reaches zero.

Expected:

```text
workers = 0
upkeep = 0
```

No additional failure state.

Do not add new UI for these tests.

---

# 10. RUNTIME CODE

Avoid introducing a new:

* EconomySystem
* EconomyEngine
* BalanceEngine
* ResourceManager
* ConservationSystem
* GenericInvariantFramework

This step is primarily about tests and explicit contracts.

Production code should only change if required to expose a genuinely missing invariant or deterministic query.

Prefer:

```text
tests > comments > abstractions
```

Do not refactor working code merely for aesthetic reasons.

---

# 11. NO NEW GAMEPLAY

This step MUST NOT introduce:

* money
* taxes
* salaries
* prices
* trade
* demand
* power
* water
* repairs
* degradation
* building destruction
* additional resources
* additional upkeep types
* additional population needs
* new building types
* new progression mechanics
* new state fields

08D is verification/hardening only.

---

# 12. ACCEPTANCE CRITERIA

Step 08D is COMPLETE only if:

* [ ] Material non-negative invariant tested
* [ ] Upkeep <= production invariant tested
* [ ] Vacant Workshop = 0 upkeep tested
* [ ] Under-construction Workshop = 0 upkeep tested
* [ ] Residence/Farm = 0 upkeep tested
* [ ] staffing relationship tested
* [ ] production scaling tested
* [ ] upkeep scaling tested
* [ ] net Material scaling tested
* [ ] zero-worker freeze tested
* [ ] recovery tested
* [ ] construction costs unchanged
* [ ] phase ordering protected
* [ ] Food/Material isolation tested
* [ ] query/simulation consistency tested
* [ ] SAVE_VERSION remains 4
* [ ] save/load round-trip passes
* [ ] hash remains stable
* [ ] determinism regression passes
* [ ] E2E regression passes
* [ ] existing test suite remains green
* [ ] lint passes
* [ ] typecheck passes
* [ ] build passes

No unnecessary production abstraction has been introduced.

---

# 13. VALIDATION COMMANDS

Run the project's canonical commands.

At minimum:

```text
vitest
lint
typecheck
build
```

Run the relevant headless Chromium E2E suites.

Inspect generated screenshots if the existing E2E pipeline produces them.

---

# 14. FINAL REPORT

Report:

1. commit hash
2. files modified
3. tests added
4. tests changed
5. total test result
6. E2E result
7. lint result
8. typecheck result
9. build result
10. SAVE_VERSION confirmation
11. hash/save confirmation
12. determinism confirmation
13. whether production code changed
14. whether any scope violation was detected

If all checks pass:

```text
Step 08D COMPLETE
```

Commit message:

```text
Step 08D: harden economic invariants
```

Do not proceed to another gameplay feature inside this step.

