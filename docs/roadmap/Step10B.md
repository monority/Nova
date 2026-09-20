# NOVA — Step 10B — First Need: Food Security

## Mission

Implement **Step 10B — First Need: Food Security** from the corrected `docs/roadmap/Step10A.md`.

The corrected design is authoritative.

This step is **Phase 3 — Needs**, not a transport/logistics step.

The objective is to formalize and prove the existing Food causal chain as NOVA's first explicit need:

```text
population
  → food need
  → food stock
  → food consumption
  → satisfied / shortage
  → existing population consequence
```

Do not introduce a generic needs framework.

Do not deepen transport.

Do not redesign the economy.

---

# 1. Start with an audit

Before modifying `src/`, inspect:

* current Food state;
* `updateNeeds`;
* `produceFood`;
* `consumeFood`;
* `updatePopulation`;
* current simulation phase ordering;
* existing Food queries/debug instrumentation;
* current Food tests;
* persistence/hash/save behavior;
* existing road/mobility gates.

Explicitly verify that the corrected Step10A contract matches the current implementation.

Distinguish:

1. existing rule;
2. derived technical rule;
3. intentional Step10A rule.

If the implementation already satisfies the contract, prefer **tests and explicit documentation over unnecessary production-code changes**.

---

# 2. Authoritative Step10A rules

## 2.1 Food need

Food need is derived from population:

```text
foodNeed = population × 1
```

No persisted `foodNeed`.

No generic `Need` abstraction.

No need registry.

No extensible needs framework.

---

## 2.2 Food production

Existing rule:

```text
foodProduced = operational farms × 2
```

Production remains completely independent from:

* roads;
* road access;
* road networks;
* mobility;
* residence connectivity;
* employment mobility.

A Farm with no road must produce exactly the same Food as the same Farm with a road, all else equal.

Do not modify this rule.

---

## 2.3 Food consumption

For each tick:

```text
foodConsumed = min(foodStock, foodNeed)
```

Food stock must never become negative.

The existing all-or-nothing population consequence remains authoritative:

* enough Food → population survives;
* insufficient Food → existing famine consequence applies.

Do not introduce a second starvation/death mechanism.

Do not reinterpret shortage geographically.

---

## 2.4 Food shortage

Derive:

```text
foodShortage = foodNeed - foodConsumed
```

Therefore:

```text
foodShortage >= 0
```

and:

```text
foodShortage > 0
```

means the Food need was not fully satisfied for that tick.

This is a derived observation.

Do not persist it.

Do not add it to the canonical hash.

Do not create a new simulation state field merely to retain historical shortage.

The previously discovered issue that shortage is not observable after the tick because the stock is consumed is acknowledged but **deferred**.

Do not solve it in 10A through instrumentation or new persisted state.

---

# 3. Transport isolation is mandatory

Food must not depend on any transport concept.

The following must have **no effect whatsoever** on Food satisfaction:

* road presence;
* road absence;
* road connectivity;
* road network count;
* building road access;
* residence/work mobility;
* road distance;
* road topology;
* Workshop connectivity.

Explicitly test this.

Required equivalence scenarios include:

### A — Farm without road

Same Food production and satisfaction as baseline.

### B — Farm with road

Same Food production and satisfaction as A.

### C — Residence without road

Same Food satisfaction as equivalent connected residence.

### D — Residence with road

No Food advantage.

### E — Different road topologies

Same Food inputs must produce the same Food outcome despite different road layouts.

These tests are anti-coupling tests. They are not permission to add Food logistics.

---

# 4. Preserve existing simulation ordering

Do not reorder unrelated phases.

The established ordering remains authoritative:

```text
advanceConstruction
→ updateNeeds
→ produceFood
→ consumeFood
→ updatePopulation
→ assignJobs
→ produceMaterial
→ applyCommand
→ progressPlaced*
→ upkeepBuildings
→ advanceTime
```

Food need must be evaluated before Food consumption.

Food production must happen before consumption.

Population consequence must happen after consumption.

Do not move Material, jobs, roads, construction, or mobility phases.

---

# 5. Production-code scope

First determine whether production code actually needs modification.

Preferred outcome:

```text
existing implementation already conforms
→ add/strengthen domain tests
→ expose only necessary derived observation
→ no unnecessary simulation rewrite
```

If a source change is genuinely necessary, keep it minimal and explain exactly why.

Do NOT introduce:

* `NeedSystem`;
* `NeedType`;
* generic satisfaction interfaces;
* Food distribution;
* food networks;
* logistics;
* transport pathfinding;
* road-gated farms;
* road-gated residences;
* distance-based Food;
* food storage buildings;
* food delivery;
* food workers;
* Food maintenance;
* new economic coefficients;
* new persisted state.

---

# 6. Tests

Create or complete:

```text
tests/foodSecurity.test.ts
```

Cover at minimum:

### Contract tests

1. Food need = population × 1.
2. Zero population produces zero need.
3. Food production = operational farms × 2.
4. Food production occurs independently of roads.
5. Consumption is bounded by available stock.
6. Food stock never becomes negative.
7. Full stock satisfies the need.
8. Partial stock produces a positive shortage.
9. Zero stock produces a full shortage.
10. Existing famine consequence is triggered exactly according to the established rule.
11. No second starvation mechanism exists.
12. Food-derived observations do not alter canonical state.

### Transport anti-coupling tests

13. Farm without road.
14. Same Farm with road.
15. Residence without road.
16. Same Residence with road.
17. Different road topology with identical Food inputs.
18. Food result is identical across those transport variants.

### Determinism

19. Same initial state + same commands → identical Food result.
20. Repeated replay → identical canonical state and hash.

Do not weaken existing tests to make these pass.

If existing Food tests already cover some cases, reuse or strengthen them rather than duplicating unnecessarily.

---

# 7. Persistence and hash audit

Verify explicitly:

* `SAVE_VERSION` remains `4`;
* no new persisted Food field is introduced;
* `foodNeed` is derived;
* `foodShortage` is derived;
* canonical save output remains stable;
* hash remains deterministic;
* save/load round-trip remains identical;
* replay remains identical.

If a derived Food query is exposed for testing/debugging, ensure it is not serialized or hashed.

---

# 8. Browser / E2E verification

Run the relevant existing E2E suite.

At minimum verify:

* Food production;
* Food consumption;
* population progression;
* starvation/famine;
* resource behavior;
* temporal progression;
* road/transport regression.

If the application exposes enough player-facing information to make Food behavior visually inspectable, perform a browser verification.

Do not invent a new UI merely to satisfy this step.

If GPU verification is available, run it.

If GPU execution is blocked by the known SwiftShader/ANGLE environment, report it as environmental rather than changing NOVA to accommodate it.

---

# 9. Full regression

Run:

```text
unit tests
lint
typecheck
build
relevant E2E
determinism checks
save/load + hash checks
```

Expected baseline is the current **453 tests**, plus the Step10A additions.

No existing test may be deleted or weakened without explicit justification.

---

# 10. Documentation

Update `docs/roadmap/Step10A.md` with an **As-Built** section only after implementation and verification.

Do not overwrite the design contract.

The document must preserve:

* original corrected intent;
* implementation result;
* exact tests added;
* regression totals;
* persistence/hash result;
* determinism result;
* E2E result;
* any production-code changes and why;
* known deferred issue: shortage is not retained after consumption.

If `Step10A-1.md` is only a temporary correction report, do not silently replace or delete it. Keep documentation history coherent.

---

# 11. Commit discipline

Before implementation:

```text
inspect git status
inspect current Step10A.md
confirm only the corrected design is being executed
```

During implementation:

```text
do not overwrite existing committed roadmap history
do not modify unrelated steps
do not start Step10B
```

At completion:

* inspect diff;
* ensure no accidental transport changes;
* ensure no accidental economic redesign;
* ensure no generated artifacts are committed;
* commit only the completed Step10A scope.

Commit message:

```text
Step 10A: formalize food security need
```

---

# 12. Final report

Return a concise but complete final report containing:

## A. Design audit

* What Food rules already existed.
* What Step10A formally establishes.
* Confirmation that Food remains transport-independent.

## B. Implementation

List every modified file and explain why.

Explicitly state whether `src/` changed.

## C. Food contract

Report verified values/rules:

```text
foodNeed = population × 1
foodProduced = operational farms × 2
foodConsumed = min(stock, need)
foodShortage = need - consumed
```

## D. Transport isolation

Report the Farm/residence/road-topology equivalence scenarios.

## E. Verification

Report:

* Vitest total;
* lint;
* typecheck;
* build;
* E2E;
* determinism;
* save/load;
* hash;
* GPU/browser status.

## F. Persistence

Confirm:

```text
SAVE_VERSION = 4
new persisted fields = 0
new hashed fields = 0
```

## G. Deferred work

Explicitly confirm that 10A did NOT introduce:

* food logistics;
* road-gated Food;
* distance-based Food;
* generic needs;
* new starvation mechanism;
* food instrumentation/history.

The discovered post-consumption `foodShortage` observability issue remains deferred.

## H. Scope verdict

State one of:

```text
COMPLETE
```

or

```text
BLOCKED
```

Do not begin Step10B.

The purpose of Step10A is to establish the **first explicit need and its causal chain**, while proving that Food remains independent of the transport system established in Phase 9.

