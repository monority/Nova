# NOVA — Step 08G — Construction Affordability Under Bounded Material

## CONTEXT

Baseline:

```text
1f431d8
```

Parent:

```text
a309b81
```

Completed:

* 08B — Material production
* 08C — Material upkeep
* 08D — Economic invariants
* 08E — Labor → production capacity
* 08F — Bounded Material storage

Current Material rules:

```text
productiveWorkers × 2
        ↓
gross Material production
        ↓
storage capacity
        ↓
stored Material
        ↓
Workshop upkeep × 1
```

Storage capacity:

```text
operational Workshops × 25
```

Construction cost:

```text
Residence = 25 Material
Farm      = 25 Material
Workshop  = 25 Material
```

Workshop upkeep:

```text
1 Material / staffed operational Workshop / tick
```

Workshop production:

```text
2 Material / productive worker / tick
```

---

# 1. IMPORTANT DISCOVERY FROM 08F

08F deliberately exposed and documented this state:

```text
1 operational + staffed Workshop
capacity = 25
production = +2
upkeep = -1
```

At the end of a normal tick:

```text
24 Material
```

Therefore:

```text
24 < 25 construction cost
```

The colony can become permanently unable to construct another building.

This is a real economic deadlock.

It is NOT a test failure.

It is NOT a reason to weaken the test.

It is a contradiction between:

```text
bounded storage
+
construction cost
+
production rate
+
upkeep timing
```

Step 08G exists specifically to resolve this contradiction.

---

# 2. PRIMARY OBJECTIVE

Make construction remain reachable from the existing production economy.

The following must remain unchanged:

```text
Workshop storage capacity = 25
Workshop production       = 2 / worker
Workshop upkeep           = 1 / staffed Workshop
Construction cost         = 25
```

Do NOT solve the problem by:

* increasing storage capacity
* decreasing construction cost
* increasing production
* decreasing upkeep
* adding a new resource
* adding a warehouse
* adding money
* adding debt

The solution must come from **correct resource-flow / command timing semantics**.

---

# 3. FIRST TASK — AUDIT THE CURRENT COMMAND ORDER

Before changing code, trace exactly:

```text
player construction command
→ affordability check
→ Material deduction
→ simulation tick
→ production
→ upkeep
→ advanceTime
```

Determine precisely when construction occurs relative to:

```text
produceMaterial
upkeepBuildings
advanceTime
```

Do not infer this from UI behavior.

Trace the actual application/domain call graph.

Inspect:

* construction command/handler
* affordability query
* resource deduction
* simulation tick
* phase execution
* UI action
* tests covering construction

Document the actual order in:

```text
docs/roadmap/Step08G.md
```

---

# 4. CORE DESIGN PRINCIPLE

Construction is a player-triggered Material consumer.

Upkeep is a recurring simulation Material consumer.

Production is a simulation Material producer.

These consumers do NOT necessarily need identical timing.

The important invariant is:

```text
A player must be able to spend Material when the economy has legitimately
produced enough Material to pay the construction cost.
```

The bounded storage system must not accidentally make a valid production
path permanently unable to reach the construction threshold.

---

# 5. PREFERRED SOLUTION

Prefer fixing the **resource-flow timing**, not the numerical balance.

Specifically investigate whether construction can legitimately consume Material
from the current tick's production before recurring upkeep drains the same stock.

A valid model is:

```text
start tick
    ↓
existing Material
    ↓
production
    ↓
player construction transaction
    ↓
upkeep
    ↓
end tick
```

However:

**DO NOT blindly reorder global simulation phases.**

The existing canonical phase order is a contract.

If construction currently occurs outside the simulation tick, preserve that
architecture and instead make the command operate against the correct
authoritative resource availability.

---

# 6. DO NOT INTRODUCE A RESERVATION SYSTEM

Do NOT add:

* Material reservations
* pending construction resources
* construction escrow
* deferred costs
* transaction queues
* resource futures
* generic transaction engine

The solution must remain local and deterministic.

---

# 7. IMPORTANT: DO NOT CREATE NEGATIVE MATERIAL

Even with corrected timing:

```text
Material >= 0
```

must remain invariant.

Construction must atomically:

1. verify affordability;
2. deduct exactly 25;
3. create/update the construction state.

On failure:

```text
stock unchanged
building state unchanged
```

---

# 8. IMPORTANT: DO NOT BYPASS STORAGE

Construction must NOT consume:

```text
gross production
```

that was never actually stored.

For example:

```text
capacity = 25
stock = 24
gross production = 4
```

If storage rules produce:

```text
stored production = 1
```

then authoritative available Material is:

```text
25
```

not:

```text
28
```

Construction may consume the actual available 25.

It must never consume hypothetical overflow.

---

# 9. THE CRITICAL SCENARIO

Create a deterministic regression scenario:

Initial:

```text
1 operational Workshop
1 productive worker
Material = 24
```

Next production:

```text
+2 gross
capacity = 25
+1 stored
```

Stock reaches:

```text
25
```

The colony must be capable of initiating a 25-Material construction transaction
at the valid point in the flow.

After construction:

```text
Material = 0
```

Then normal simulation continues.

Do not artificially inject Material.

Do not modify the starting state.

Do not disable upkeep.

---

# 10. CONSTRUCTION TYPES

The solution must work consistently for:

```text
Residence = 25
Farm      = 25
Workshop  = 25
```

Do not special-case Workshop construction.

---

# 11. CONSTRUCTION + UPKEEP INTERACTION

Test a case where:

```text
stock reaches 25
```

and construction consumes all 25.

Then:

```text
upkeep
```

must see the actual remaining stock.

If stock is:

```text
0
```

then upkeep must consume:

```text
0
```

under the existing 08C partial-clamp semantics.

Do NOT create debt.

Do NOT disable the Workshop.

Do NOT throw.

This preserves:

```text
upkeepDue = 1
available = 0
actualUpkeep = 0
```

---

# 12. MULTIPLE WORKSHOPS

Also verify that the fix remains correct with:

```text
2 operational Workshops
2 productive workers
capacity = 50
production = 4
upkeep = 2
```

and with:

```text
2 operational Workshops
1 productive worker
capacity = 50
production = 2
upkeep = 1
```

Construction must remain deterministic.

Do not introduce priority between buildings unless the existing system already
has one.

---

# 13. AFFORDABILITY QUERY

Inspect the existing construction affordability query.

Its meaning must remain:

```text
canConstruct(state, type)
```

means:

```text
current authoritative Material >= construction cost
```

Do not change it to:

```text
current + future production >= cost
```

unless the existing architecture explicitly models construction at a simulation
phase where that future production is already authoritative.

Never make the affordability query predict future ticks.

---

# 14. ATOMICITY

The construction transaction must remain atomic.

Valid:

```text
check 25
→ deduct 25
→ mutate construction state
```

Invalid:

```text
deduct 25
→ discover invalid building
→ rollback
```

No partial mutation.

---

# 15. DETERMINISM

The same:

```text
state
+
commands
+
configuration
```

must produce exactly the same:

```text
state
+
hash
```

after the relevant tick sequence.

No:

```text
Math.random()
Date.now()
performance.now()
```

No unstable collection ordering.

---

# 16. TESTS

Add a dedicated suite:

```text
tests/constructionMaterialFlow.test.ts
```

Minimum cases:

### A — Reach construction threshold

1. 24 Material + valid production reaches 25
2. construction succeeds at 25
3. exactly 25 Material is consumed

### B — No hypothetical overflow

4. gross production above capacity does not make construction affordable
   before stored Material reaches the required amount
5. construction cannot spend discarded overflow

### C — Atomic failure

6. insufficient Material → no construction
7. stock unchanged on failure
8. building state unchanged on failure

### D — Upkeep

9. construction at 25 → stock 0
10. upkeep clamps to available stock
11. no negative Material
12. Workshop remains operational

### E — All building types

13. Residence
14. Farm
15. Workshop

### F — Multiple Workshops

16. 2 Workshop capacity
17. 2-worker production
18. 1-worker production
19. upkeep interaction

### G — Determinism

20. repeated replay identical
21. hash identical

### H — Persistence

22. save/load after construction
23. save/load after production
24. save/load after construction + upkeep

---

# 17. REGRESSION TEST

Keep the existing 08F test:

```text
single-workshop end-of-tick equilibrium = 24
```

Do NOT delete it merely because 08G changes construction accessibility.

The test should continue documenting the economic state when no construction
occurs.

Add a separate test proving that the state can transition through:

```text
24
→ production
→ 25 available
→ construction
→ 0
```

This distinction is important.

---

# 18. E2E

Extend the existing headless E2E infrastructure.

Add one focused scenario:

```text
single Workshop
→ 24 Material
→ next production
→ construction becomes affordable
→ construct Residence
→ Material = 0
```

Verify the DOM.

Then verify:

```text
Workshop remains operational
upkeep does not produce negative Material
```

Also run all existing:

* jobs
* production
* resource
* food
* upkeep

E2E suites.

No new UI.

---

# 19. UI

Do NOT create a new panel.

Do NOT create a construction tutorial.

Do NOT add warnings.

Existing status text may remain unchanged.

Only modify UI if the current implementation becomes factually incorrect
because of the corrected transaction timing.

---

# 20. PERSISTENCE

SAVE_VERSION must remain:

```text
4
```

Do not introduce:

```text
reservedMaterial
pendingMaterial
constructionFunds
```

No new persisted state.

Save/load and hash semantics must remain deterministic.

---

# 21. OUT OF SCOPE

Do NOT implement:

* new resource
* warehouse
* storage building
* storage upgrade
* money
* salaries
* prices
* trade
* demand
* market
* transport
* logistics
* roads
* technology
* production chains
* second upkeep resource
* generic transaction framework
* generic resource framework
* capacity rebalance
* production rebalance
* construction-cost rebalance
* upkeep rebalance

---

# 22. IMPORTANT FAILURE CONDITION

If the existing architecture makes it impossible to resolve the deadlock through
correct transaction timing without changing one of the frozen numerical rules:

**STOP.**

Do not invent a workaround.

Do not silently change:

```text
25 capacity
25 construction cost
2 production
1 upkeep
```

Report the exact architectural contradiction and the smallest possible design
decision required.

---

# 23. ACCEPTANCE CRITERIA

Step 08G is COMPLETE only when:

* [ ] construction timing is explicitly documented
* [ ] Material production remains bounded
* [ ] construction consumes only authoritative stored Material
* [ ] construction can be reached from the single-Workshop economy
* [ ] no numerical rebalance was introduced
* [ ] no hypothetical future production is used for affordability
* [ ] no overflow is spendable
* [ ] construction remains atomic
* [ ] Material never becomes negative
* [ ] upkeep remains unchanged
* [ ] all three building types work
* [ ] multiple Workshops work
* [ ] existing 08F equilibrium test remains
* [ ] new reachability regression exists
* [ ] save/load passes
* [ ] hash passes
* [ ] deterministic replay passes
* [ ] all existing tests pass
* [ ] E2E passes
* [ ] lint passes
* [ ] typecheck passes
* [ ] build passes
* [ ] no new persistent state
* [ ] SAVE_VERSION remains 4
* [ ] no scope creep

---

# 24. FINAL REPORT

Return:

1. commit hash
2. parent commit
3. exact construction call graph
4. exact timing semantics
5. files modified
6. production changes
7. tests added
8. total test count
9. E2E results
10. lint
11. typecheck
12. build
13. SAVE_VERSION
14. save/hash verification
15. determinism verification
16. screenshot inspection
17. numerical rules confirmed unchanged
18. any architectural contradiction
19. scope violations

If all checks pass:

```text
Step 08G COMPLETE
```

Commit:

```text
Step 08G: resolve bounded material construction flow
```

Do not begin 08H in the same task.

---

# 25. AS-BUILT — AUDIT + IMPLEMENTATION RECORD

## 25.1 Actual pre-08G order (audit of §3)

Call graph (application → domain):

```text
canvas pointerup (src/app/main.ts)
→ UI pre-check validatePlacement (rest stock >= 25)
→ controller.dispatch(placeBuilding)
→ dispatchCommand (src/application/simulation/dispatch.ts)
→ stepSimulation(state, command)
    Phase 1: applyCommand        (validates + deducts against PRE-tick stock)
    Phase 2: advanceConstruction
    Phase 3: updateNeeds
    Phase 4: produceFood
    Phase 5: consumeFood
    Phase 6: updatePopulation
    Phase 7: assignJobs
    Phase 8: produceMaterial      (gross, clamped by storage capacity)
    Phase 8b: upkeepBuildings     (partial clamp, never negative)
    Phase 9: advanceTime
```

Deadlock mechanism: the 1-staffed-Workshop fixed point is end-of-tick
stock 24 (24 + stored 1 − upkeep 1). Stock 25 exists only mid-tick between
produceMaterial and upkeepBuildings, but applyCommand ran as Phase 1
against pre-tick stock, so 24 < 25 rejected the construction forever.
No §22 STOP was needed: the deadlock is a timing artifact, resolvable
without touching any frozen number.

## 25.2 Post-08G order (no frozen number changed)

```text
Phase 1–7:   (unchanged: construction progress, needs, food, population, jobs)
Phase 8:     produceMaterial      (unchanged)
Phase 8a:    applyCommand        (moved; validates + deducts against
              post-production stock, stored overflow never spendable)
             + progressPlacedBuilding (one catch-up slot, 2-tick contract kept)
Phase 8b:    upkeepBuildings     (unchanged; sees post-construction stock)
Phase 9:     advanceTime         (unchanged)
```

Affordability query semantics unchanged (rest-stock truth). The UI click
handler dispatches through an insufficient hover only when
rest + authoritative stored production of the current tick covers the cost;
all other rejections still refuse without advancing the simulation.

## 25.3 Verification (all green at commit)

* vitest 239/239 (16 files),incl. new tests/constructionMaterialFlow.test.ts
  (25 tests: A1–3, B4–5, C6–8, D9–12, E13–15, F16–19, G20–21, H22–24,
  catalog frozen); 08F 24-equilibrium test kept.
* E2E headless ALL PASS: upkeep (incl. new scenario L: 24 + 1 stored →
  Residence → 0, upkeep due 1 clamped to 0, Workshop operational),
  jobs, production, resource, food.
* lint 0, typecheck 0, build OK, SAVE_VERSION 4, no new persisted state,
  hash/determinism round-trips pass, screenshot 09-construction.png OK.

