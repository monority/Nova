# NOVA — Step 10E — Farm Employment & Worker Competition

## Mission

Implement the missing causal rule identified by the Step 10D audit:

> **A Farm requires an assigned worker to produce Food, and Farm workers compete with Workshop workers for the same colonist labor pool.**

Current asymmetry:

```text
Farm     → produces Food without worker
Workshop → requires worker for Material production
```

Step 10E removes that asymmetry with the smallest coherent rule.

The intended causal chain becomes:

```text
colonists
→ employment competition
→ Farm / Workshop staffing
→ Food / Material production
```

This is a **targeted employment extension**, not a generic job-system rewrite.

---

# 1. Start with repository audit

Before editing:

```text
git status
git log -1 --oneline
```

Inspect the current state after the Step 10D audit and its performance correction.

Confirm:

* current `assignJobs` behavior;
* Workshop staffing;
* current Farm production;
* `getProductiveWorkerCount`;
* Workshop job capacity;
* Farm state/lifecycle;
* population/residence assignment;
* mobility eligibility;
* current road access requirements;
* current Food production tests;
* current Material production tests;
* current employment tests;
* canonical save/hash implementation.

Do not assume the audit report is sufficient; verify the actual implementation.

---

# 2. Authoritative Step10E rule

A Farm is productive only when:

```text
operational
AND
staffed
```

A staffed Farm produces:

```text
Food = 2 / tick
```

An operational but vacant Farm produces:

```text
Food = 0 / tick
```

A Farm under construction produces:

```text
Food = 0 / tick
```

A Farm's worker is a normal colonist and competes directly with Workshop workers.

There is only one labor pool.

---

# 3. Farm job capacity

Each operational Farm has:

```text
jobCapacity = 1
```

Do not introduce multiple workers per Farm.

Do not add Farm-specific workforce state if staffing can be derived from the existing colonist workplace assignment.

Prefer the existing canonical relation:

```text
ColonistState.workplaceId
```

rather than adding:

```text
farmWorkers
```

or another persisted reverse index.

Reverse worker counts must remain derived.

---

# 4. Employment competition

The existing employment system currently assigns colonists to eligible Workshops.

Extend the existing assignment logic so that eligible workplaces include:

```text
operational Farm
operational Workshop
```

Both have capacity:

```text
1 colonist
```

The same eligibility rules established by 09K/09M remain authoritative:

* colonist must have a valid residence;
* workplace must be operational;
* residence/workplace mobility connectivity must hold;
* road access/mobility requirements already established remain unchanged.

Do not create a second employment system for Farms.

---

# 5. Assignment determinism

Employment assignment must remain deterministic.

When multiple workplaces compete for a colonist, preserve a deterministic ordering.

The current 09M spatial preference remains authoritative:

```text
eligible workplace
→ road-network distance
→ deterministic ID tie-break
```

However, the implementation must explicitly define how Farm vs Workshop candidates enter that selection.

Do NOT silently introduce:

* building-type priority;
* "always prefer Farm";
* "always prefer Workshop";
* economic optimization;
* global maximum-productivity optimization.

If two workplaces have equal effective distance:

```text
building ID
```

remains the deterministic tie-break unless the existing implementation already has a more specific documented rule.

Document the exact candidate ordering.

---

# 6. Important: avoid greedy-design drift

The audit previously identified that the employment system is deterministic but not globally optimal.

Do not solve that problem here.

Keep:

```text
deterministic local assignment
```

not:

```text
global labor optimization
```

Do not implement:

* maximum Food;
* maximum Material;
* maximum total output;
* minimum total commute;
* Hungarian algorithm;
* min-cost matching;
* global workforce optimizer.

Those are future design questions.

Step10E only expands the existing employment model to Farms.

---

# 7. Production rules

Change only the Farm production precondition.

Current conceptual rule:

```text
operational Farm → Food ×2
```

New rule:

```text
operational Farm
AND staffed Farm
→ Food ×2
```

Therefore:

```text
vacant Farm → 0 Food
staffed Farm → 2 Food
```

Do not modify:

* Food need;
* Food consumption;
* starvation;
* population admission;
* Food stock semantics;
* Food coefficient;
* road/transport Food rules.

Food remains completely independent of roads except insofar as existing **employment mobility eligibility** already determines whether a colonist can work at a workplace.

That distinction must remain explicit.

---

# 8. Workshop behavior

Do not regress Workshop behavior.

An operational staffed Workshop still:

```text
produces Material ×2
```

An operational vacant Workshop:

```text
produces Material ×0
```

Existing Workshop upkeep behavior remains unchanged unless the current code makes upkeep explicitly depend on staffing.

Do not change Workshop upkeep semantics in this step.

The purpose is to introduce **labor competition**, not to rebalance Workshop economics.

---

# 9. Critical scenarios

Implement deterministic tests for at least the following.

## A — Farm alone

```text
1 operational Farm
0 colonists
```

Expected:

```text
Food production = 0
```

---

## B — Farm + one eligible colonist

```text
1 Farm
1 colonist
```

Expected:

```text
Farm staffed = 1
Food production = 2
```

---

## C — Workshop + one colonist

Existing behavior must remain unchanged.

---

## D — Farm + Workshop + one colonist

Two workplaces compete for one worker.

Verify:

* exactly one workplace is staffed;
* the other remains vacant;
* exactly one production chain receives labor;
* assignment follows the documented deterministic spatial/ID rule.

Do not choose an economically "better" workplace.

---

## E — Farm + Workshop + two colonists

Expected:

```text
Farm staffed = 1
Workshop staffed = 1
```

assuming both are eligible.

Both production chains operate.

---

## F — Multiple Farms + Workshops

Test at least:

```text
2 Farms + 1 Workshop + 2 colonists
1 Farm + 2 Workshops + 2 colonists
2 Farms + 2 Workshops + 2 colonists
```

Verify capacity and deterministic assignment.

---

## G — Construction state

A Farm under construction must not receive a worker as an operational workplace.

After becoming operational:

```text
next eligible assignment tick
→ worker can be assigned
→ Food production resumes
```

Do not create a special Farm construction rule.

---

## H — Mobility disconnect

Disconnect a Farm from the colonist's residence network.

Expected:

```text
Farm workplace assignment becomes invalid
→ colonist becomes available for reassignment
→ Farm production = 0
```

When connectivity returns:

```text
next assignment phase
→ eligible again
→ deterministic reassignment
```

Do not add Food logistics.

---

## I — Spatial preference

With two eligible workplaces:

```text
Farm A
Workshop B
```

vary their road-network distance while keeping everything else equal.

Verify that 09M's spatial preference remains authoritative.

This must affect **which workplace receives the colonist**, not introduce a new production-distance rule.

---

## J — Road isolation

Food production must still not directly depend on road access.

A Farm's production changes only because:

```text
worker eligibility
```

changes through the existing employment/mobility contract.

Do not introduce:

```text
Farm → road → Food
```

as a new causal chain.

---

# 10. Derived employment queries

If existing queries expose:

```text
productive workers
employment
job capacity
```

extend them minimally to recognize Farm employment.

Prefer generic derived counting over new persisted counters.

Examples of useful derived observations:

```text
productiveFarmWorkers
productiveWorkshopWorkers
vacantOperationalFarms
vacantOperationalWorkshops
```

Only expose what is actually useful for tests/debugging.

Do not create a generic statistics framework.

Do not persist these values.

Do not hash these values.

---

# 11. Phase ordering

Do not change the established high-level simulation ordering unnecessarily.

The relevant sequence remains conceptually:

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

However, because Food production currently occurs **before** `assignJobs`, inspect the existing timing contract carefully.

This is critical.

Do not blindly move `produceFood`.

Determine whether the current architecture expects employment assignments to affect production in the same tick or the next tick.

The implementation must choose **one deterministic timing contract**, document it, and test it.

Preferred approach:

* preserve the existing phase order if possible;
* if this means newly assigned Farm workers become productive on the next tick, document that explicitly;
* do not reorder the entire simulation merely to make same-tick Farm production convenient.

Do not accidentally change Workshop timing while solving Farm staffing.

---

# 12. Food timing contract

The final implementation must make this observable and deterministic.

Test:

```text
Farm becomes operational
→ employment assignment
→ Farm production
```

and determine exactly which tick receives the first `+2 Food`.

The same timing must hold across replay.

Do not introduce a special-case Farm catch-up.

---

# 13. Persistence

Preserve:

```text
SAVE_VERSION = 4
```

Do not persist:

* Farm worker count;
* Farm staffing boolean;
* productive Farm count;
* vacant Farm count;
* derived employment metrics.

The authoritative persisted relationship remains:

```text
ColonistState.workplaceId
```

if that is already the canonical employment state.

Save/load must reconstruct the same derived Farm staffing.

Hash must remain stable.

---

# 14. Determinism

Verify:

* repeated simulation produces identical state;
* repeated simulation produces identical hash;
* reversed record insertion order does not alter assignment where canonical ordering is expected;
* equal-distance Farm/Workshop competition resolves deterministically;
* save/load preserves employment assignment;
* reconnect/disconnect replay is identical.

No:

```text
Date.now()
Math.random()
unordered-object iteration
```

may influence assignment.

---

# 15. Performance

The Step10D audit found and corrected a serious assignment/network performance issue.

Do not regress it.

In particular:

* do not recompute road networks independently for every workplace pair;
* reuse the existing precomputed network/access structures;
* preserve the current optimized assignment path;
* benchmark representative fixtures if assignment logic changes materially.

At minimum compare:

```text
SMALL
MEDIUM
LARGE
```

and verify no obvious regression.

If a new algorithm is slower, explain why before keeping it.

---

# 16. Tests

Create or extend the most appropriate employment/Food test suites.

Do not duplicate existing tests unnecessarily.

Minimum coverage:

### Farm production

* vacant Farm = 0;
* staffed Farm = 2;
* under-construction Farm = 0.

### Competition

* 1 colonist / Farm + Workshop;
* 2 colonists / Farm + Workshop;
* multiple Farms;
* multiple Workshops;
* mixed workplace capacities.

### Mobility

* disconnected Farm loses worker;
* reconnect restores eligibility;
* under-construction workplace unavailable.

### Spatial preference

* distance preference;
* deterministic ID tie-break;
* Farm/Workshop competition.

### Timing

* first productive tick;
* no accidental same-tick regression of existing Workshop production.

### Determinism

* replay;
* save/load;
* insertion-order scenarios.

### Food regression

All Step10A Food rules remain valid.

---

# 17. E2E / browser

Run the existing relevant E2E suite.

At minimum:

```text
Food
Production
Resource
Temporal
Road
Transport
Jobs
Upkeep
```

Important:

The Step10D audit identified that Jobs/Upkeep E2E deferrals may now be stale because the player-facing road palette exists.

If those suites are now executable, run them.

Do not leave an obsolete "deferred because no route palette" explanation in the final report.

If UI behavior exposes Farm staffing, verify it in-browser.

Do not create a new UI merely for this step.

---

# 18. GPU

Run the GPU/browser verification if available.

Expected:

* no WebGL errors;
* no rendering regressions;
* Farm/Workshop visual state remains coherent if staffing is represented visually.

If the current renderer does not visually distinguish staffed/vacant Farms, that is not automatically a reason to add UI.

---

# 19. Documentation

Create:

```text
docs/roadmap/Step10E.md
```

Document:

1. existing asymmetry;
2. Step10E design decision;
3. Farm workplace contract;
4. labor competition;
5. deterministic assignment;
6. timing contract;
7. mobility interaction;
8. production consequences;
9. persistence;
10. performance;
11. tests;
12. E2E;
13. deferred issues.

Explicitly document that this is **not** a generic job framework.

Also document the distinction:

```text
Food is not road-gated.
Farm employment may be mobility-gated because employment already is.
```

This distinction is essential.

---

# 20. Scope exclusions

Do NOT implement:

* generic Job interface;
* generic Need framework;
* Food logistics;
* Farm delivery;
* food transport;
* food storage redesign;
* new Food coefficient;
* new Farm upkeep;
* money;
* wages;
* worker happiness;
* worker commute time;
* congestion;
* vehicles;
* transit;
* global employment optimization;
* demolition;
* new road tiers;
* new persistence version.

Those remain deferred.

---

# 21. Final audit

Before commit, inspect:

```text
git diff
git status
```

Confirm:

* no unrelated Phase 9 changes;
* no accidental Food logistics;
* no generic abstraction;
* no persisted derived fields;
* no coefficient rebalance;
* no test weakening;
* no stale E2E deferrals that are now executable.

---

# 22. Commit

If all gates pass:

```text
Step 10E: farm employment and worker competition
```

Do not begin the next step.

---

# 23. Final report

Return:

## A. Design

* exact Farm staffing rule;
* exact competition rule;
* exact timing rule.

## B. Implementation

* files changed;
* production code changes;
* test changes;
* documentation.

## C. Economy

Show concrete examples:

```text
Farm staffed   → +2 Food/tick
Farm vacant    → +0 Food/tick
Workshop staffed → +2 Material/tick
Workshop vacant  → +0 Material/tick
```

and at least one mixed Farm/Workshop competition scenario.

## D. Mobility

Explain exactly how Farm employment interacts with the existing mobility contract.

Confirm no new Food transport rule exists.

## E. Determinism

Report:

* replay;
* insertion order;
* save/load;
* hash.

## F. Performance

Report representative assignment timings and whether Step10D performance was preserved.

## G. Verification

Report:

* Vitest total;
* lint;
* typecheck;
* build;
* Food E2E;
* Jobs E2E;
* Upkeep E2E;
* Road/Transport E2E;
* GPU/browser status.

## H. Persistence

Confirm:

```text
SAVE_VERSION = 4
new persisted fields = 0
derived employment fields persisted = 0
```

## I. Deferred

Explicitly list anything not implemented.

## J. Scope verdict

Return exactly:

```text
COMPLETE
```

or:

```text
BLOCKED
```

Do not start the next gameplay step.


---

# Documentation (as-built) — Step 10E

Status: **COMPLETE**. Farm employment and worker competition are implemented,
tested, documented and verified. This is a **targeted employment extension,
not a generic job framework**: no `Job` interface, no `Need` framework, no
`EmploymentSystem`, no persisted workforce, no optimisation.

## 1. The asymmetry that existed before

```text
Workshop: operational AND staffed -> Material ×2 ; if vacant -> ×0
Farm    : operational             -> Food ×2     ; no worker involved
```

One labour pool existed, but it only fed Material. Food was a free gift from
land, which is why the Step 10D coherence audit flagged the missing causal
link. Step 10E removes the asymmetry with the smallest possible rule.

## 2. Step10E design decision

Only the **precondition** of Farm production changed:

```text
before: operational Farm             -> Food ×2
after : operational Farm AND staffed -> Food ×2
```

The Farm's worker is an ordinary colonist from the existing pool, so the
causal chain becomes:

```text
colonists -> employment competition -> Farm/Workshop staffing -> Food/Material
```

## 3. Farm workplace contract

| Function | Rule |
| --- | --- |
| `FARM_JOB_CAPACITY` | `1` (exactly like a Workshop; never more) |
| `isOperationalFarm(b)` | `b.type === 'farm' && b.status === 'operational'` |
| `isOperationalWorkplace(b)` | `isOperationalWorkshop(b) || isOperationalFarm(b)` |
| `jobCapacityOf(b)` | `isOperationalWorkplace(b) ? 1 : 0` |
| `getJobCapacity(state)` | operational Farms + Workshops |
| `isEmployed(state, c)` | `workplaceId` resolves to an operational **Farm or Workshop** |

There is **no** `farmWorkers`, no staffing boolean, no persisted reverse
index. Staffing is always *derived* from the canonical relation
`ColonistState.workplaceId`:

```ts
countStaffedOperationalFarms(state)  // mirror of countStaffedOperationalWorkshops
  = operational farms with countWorkersAt(state, farm.id) > 0
```

## 4. Labor competition

`assignJobs` builds ONE merged candidate pool:

```text
operational Farms ∪ operational Workshops   (ascending building id)
```

A colonist takes at most one workplace. Capacity 1 per workplace is enforced
structurally: the ascending colonist-id scan plus the `takenWorkplaceIds` set
can never place two colonists in one workplace. Both production chains draw
from the same pool, so hiring a farmer costs a workshop worker and vice versa.

## 5. Deterministic assignment (no type priority)

09M stays authoritative and is now type-blind:

```text
eligible workplace (operational, free, mobility-connected to the residence)
  -> smallest operational road distance        (09M)
  -> lowest building id                        (tie-break only)
```

There is **no** building-type priority, no "prefer Farm", no "prefer
Workshop", no economic or global optimisation, no Hungarian/min-cost matching,
no commute minimisation. An existing assignment is preserved when it is still
eligible and still among the nearest (no churn). Verified by
`tests/farmEmployment.test.ts` (D1/D2/D3, I1): the nearest workplace wins even
when it is the higher id, and an equal-distance Farm/Workshop pair is resolved
by id alone.

## 6. Timing contract (phase order deliberately unchanged)

```text
advanceConstruction -> updateNeeds -> produceFood -> consumeFood
  -> updatePopulation -> assignJobs -> produceMaterial -> applyCommand
  -> progressPlaced* -> upkeepBuildings -> advanceTime
```

`produceFood` (phase 4) runs **before** `assignJobs` (phase 7), so it reads the
assignment written by the **previous** tick:

> **A Farm staffed on tick N produces from tick N+1.**

The phase order was deliberately **not** reordered for same-tick convenience
(§11), so Workshop Material timing is untouched: `assignJobs` then
`produceMaterial` still act in the same tick. The contract is asserted in
`tests/farmEmployment.test.ts` G1/G2 and observed end-to-end in the browser
(`e2e/jobsRun.mjs` scenario 7, `e2e/productionRun.mjs` phase E).

## 7. Mobility interaction (and the explicit Food/roads distinction)

Employment eligibility is unchanged since 09K: the colonist needs a valid
residence, the workplace must be operational, and residence↔workplace must be
mobility-connected on the operational road network. Farms simply join that
rule.

> **Food is not road-gated. Farm employment is mobility-gated because
> employment already is.**

There is no `Farm -> road -> Food` causal chain, no food logistics, no
delivery, no transport of food. A Farm's output changes only because **worker
eligibility** changed. `tests/farmEmployment.test.ts` J1/J2 assert that a
road-connected but unstaffed Farm still produces `0`, and H1/H2 assert that
breaking/reconnecting the shared contact unstaffs/restaffs the Farm through
`assignJobs` alone.

## 8. Production consequences

| State | Output |
| --- | --- |
| Farm operational + staffed | `+2 Food/tick` |
| Farm operational + vacant | `+0 Food/tick` |
| Farm under construction | `+0 Food/tick` |
| Workshop operational + staffed | `+2 Material/tick` |
| Workshop operational + vacant | `+0 Material/tick` |

Workshop upkeep semantics were **not** changed. Food need, consumption,
starvation, admission, stock semantics and the `2` coefficient are unchanged.

Because every farmer eats 1 and produces 2, one staffed Farm nets `+1/tick` and
sustains a total population of **two**; a second idle colonist makes the colony
net `0/tick`. This is the measured 10E economics (`e2e/productionRun.mjs`
phase G).

## 9. Derived employment queries (§10)

Added, all pure and all *derived only*:

```ts
getProductiveFarmWorkerCount(state)  // = countStaffedOperationalFarms
getVacantOperationalFarmCount(state) // operational farms − staffed farms
```

`getProductiveWorkerCount` deliberately stayed Workshop/Material-scoped so the
UI sentence "X workers produced Y material" keeps its contract. Nothing is
persisted or hashed.

The browser stats surface gained three **diagnostic-only** fields mirroring the
existing 09M workshop precedent: `farmIds`, `staffedFarmIds`,
`vacantOperationalFarms`.

## 10. Persistence

```text
SAVE_VERSION             = 4   (unchanged)
new persisted fields     = 0
derived fields persisted = 0
authoritative relation   = ColonistState.workplaceId
```

Farm staffing is reconstructed after load purely from `workplaceId`, so the
hash stays stable (`tests/farmEmployment.test.ts` persistence block and
`tests/persistence.test.ts`).

## 11. Determinism

No `Date.now()`, no `Math.random()`, no unordered-object iteration influences
assignment (buildings and colonists are iterated by canonical ascending id).
Verified: repeated simulation → identical canonical string **and** identical
hash; save/load round-trip preserves employment and hash; equal-distance
Farm/Workshop competition resolves identically on replay; disconnect/reconnect
replays identically.

## 12. Performance (§15) — the 10D result preserved

The 10D optimisation is intact: `assignJobs` derives the 09D road networks
**once per call** and each 09E building access **once per building**, then the
per-pair predicates read those cached records
(`areAccessesConnected`, `getDistanceBetweenAccesses`,
`getBuildingRoadAccessWithNetworks`). Extending the pool to Farms added no
per-pair re-derivation.

Measured on this machine (same fixtures as the 10D §8 benchmark, which runs in
`tests/seniorCoherenceAudit.test.ts`):

| Fixture | 10D baseline (after correction) | 10E measured |
| --- | --- | --- |
| SMALL-10 (pop 3, 5 roads) | 0.36 ms | **0.05 ms/tick** |
| MEDIUM-100 (pop 33, 50 roads) | ~1.5 ms | **0.37 ms/tick** |
| LARGE-500 (pop 166, 200 roads) | ~23 ms | **1.59 ms/tick** |
| XL-1000 (pop 333, 400 roads) | ~85 ms | **9.26 ms/tick** |
| LARGE-500 `assignJobs` alone | 22.9 ms (was 6269 ms) | **14.6 ms** |
| LARGE-500 `produceFood` alone | 0.2 ms | **2.4 ms** |
| LARGE-500 `produceMaterial` alone | 17 ms | **15.8 ms** |
| STRESS-5000 hash / save | 11 ms / 2.7 ms | 74.8 ms / 12.0 ms |

No quadratic behaviour was introduced. Honest note: `produceFood` rose from
~0.2 ms to ~2.4 ms at LARGE-500 because staffing is now counted per farm
(`countStaffedOperationalFarms` mirrors `countStaffedOperationalWorkshops`,
i.e. `O(farms × colonists)`), and that work moved onto the Food path. At the
design scale it is ~2 ms of a ~1.6 ms/tick budget share and it is the same
*shape* of work the Material path already did. It is recorded here as a known,
measured residual rather than hidden.

## 13. Tests (§16)

New suite `tests/farmEmployment.test.ts` (23 tests) covers the mandated
scenarios: **A** vacant Farm = 0, **B** staffed Farm = 2, **C** Workshop
unchanged (staffed 2 / vacant 0), **D** Farm+Workshop+1 colonist (exactly one
staffed, distance-then-id, no type priority), **E** +2 colonists (both
staffed), **F** mixed capacities (2F+1W, 1F+2W, 2F+2W with 2 colonists),
**G** construction state and first productive tick, **H** mobility
disconnect/reconnect, **I** spatial preference across types, **J** Food is not
road-gated, plus job-capacity/inspection contracts, determinism, save/load and
performance-guarded invariants.

### Existing-suite migration (unavoidable re-baselining)

Farms no longer produce for free, so every fixture that relied on farm Food had
to change. Eight suites were migrated and **no assertion was deleted without
its premise disappearing**; where a measured value changed, the number and the
reason are both updated:

| Suite | Strategy |
| --- | --- |
| `storageCapacity`, `upkeep`, `laborCapacity` | material-focused: a pre-stocked food buffer replaces free-farm food, so population/staffing/material numbers stay meaningful |
| `economicInvariants` | food-focused: staffed-farm injection (`withStaffedFarms`) + re-derived balances |
| `bootstrapEconomy` (E1) | Farm is now **vacant** (the lone worker stays on the Workshop): Food declines `-1/tick` instead of rising |
| `foodSecurity`, `production`, `jobs` | updated for worker-gated Food |
| `foodSecurityPressureAudit` (10C) | **re-baselined**: its 10C findings are explicitly marked superseded (free-farm production, boom-bust with zero population, "roads never matter") and replaced by the 10E findings |
| `seniorCoherenceAudit` (10D) | two §5/§7 tests updated: farms produce 0 when unstaffed |

`tests/helpers.ts` gained `withStaffedFarms(state)`, which injects a cost-free
farmer (road + operational residence + colonist) for each unstaffed operational
Farm — the 10E analogue of the existing `withRoadsForWorkshops` precedent.

## 14. E2E / browser (§17) — stale deferrals removed

`e2e/jobsRun.mjs` and `e2e/upkeepRun.mjs` carried a Step 09F deferral claiming
*"browser cannot construct roads (no road palette UI)"*. That explanation is
**now false** (09H shipped the road palette) and has been **removed**. Both
suites now run for real, building their road connections through the real
palette, and both **PASS**. Consequences of running them:

* `jobsRun.mjs`: 7 scenarios, including a new **Step 10E scenario 7** (staffed
  farm inspection text, vacant farm with no road, and one-colonist
  Farm-vs-Workshop competition resolved by 09M distance).
* `upkeepRun.mjs`: material drains that used idle farms now use **roads**
  (5 each, no upkeep, no food), because idle farms are no longer a free food
  source under 10E.
* `productionRun.mjs`: re-written for the worker-gated rule — residence →
  road (mobility) → farm → employment → Food, proving `+1 Food/tick` with one
  colonist and `0 Food/tick` (one farm = two people) with two.

Two UI coherence defects surfaced by these runs and were fixed in `main.ts`:

1. the assignment sentence always said *"Colonist assigned to Workshop"* even
   for a Farm — it now reports the type(s) that actually hold workers;
2. the Food ledger derived `consumed` from the *current* assignment, which
   credited next-tick production early and misreported *"1 colonist consumed 3
   food"* on the first productive tick — the inflow is now derived from the
   measured stock delta, so it reads *"1 colonist consumed 1 food"*.

Playwright results (headless): `run.mjs`, food, production, resource, temporal,
road, transport, jobs, upkeep → **ALL PASS**, zero console/page errors. The
Farm inspection line now states `producing +2/tick (staffed)` or
`vacant, producing +0/tick`.

## 15. GPU (§18)

`e2e/gpuRun.mjs` **FAILS in this environment only**: headless Chromium falls
back to `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))`, i.e. a
software renderer, and the suite deliberately requires a hardware (NVIDIA)
renderer. The non-renderer assertions all pass (canvas present, WebGL2
available, `three.js r186` renderer active, no console/page errors), and
`run.mjs` confirms WebGL init. **No rendering code was touched by Step 10E**
and no staffing state is drawn, so this is an environment limitation, not a
regression.

## 16. Deferred (explicitly not implemented, §20)

Generic `Job` interface · generic `Need` framework · Food logistics, Farm
delivery, food transport, food storage redesign · new Food coefficient · new
Farm upkeep · money · wages · worker happiness · commute time · congestion ·
vehicles · transit · global employment optimisation · demolition · new road
tiers · new persistence version. Also **not** added: any new UI beyond the
existing inspection line and diagnostic stats.

## 17. Final report

### A. Design
* **Farm staffing rule** — a Farm produces Food iff `status === 'operational'`
  **and** `countWorkersAt(state, farm.id) > 0`. Capacity is exactly 1.
* **Competition rule** — one merged candidate pool (operational Farms ∪
  operational Workshops), selected by 09M: smallest operational road distance
  from the residence, tie-broken by lowest building id. No type priority.
* **Timing rule** — phase order unchanged; `produceFood` reads the previous
  tick's assignment, so a Farm staffed on tick N produces from tick N+1.
  Workshop Material remains same-tick.

### B. Implementation
* Production code: `src/domain/jobs/jobs.ts`, `src/domain/simulation/phases.ts`,
  `src/domain/mobility/mobility.ts`, `src/domain/road/road.ts`,
  `src/application/queries/resources.ts`, `src/app/main.ts`.
* Tests: new `tests/farmEmployment.test.ts` (23) and
  `tests/seniorCoherenceAudit.test.ts` (10D, 29); migrated
  `tests/{storageCapacity,upkeep,laborCapacity,economicInvariants,bootstrapEconomy,foodSecurity,production,jobs,foodSecurityPressureAudit}.test.ts`
  plus `tests/helpers.ts`.
* E2E: `e2e/{productionRun,jobsRun,upkeepRun}.mjs`.
* Documentation: this file.

### C. Economy
```text
Farm staffed     -> +2 Food/tick
Farm vacant      -> +0 Food/tick
Workshop staffed -> +2 Material/tick
Workshop vacant  -> +0 Material/tick
```
Mixed competition (one colonist, Farm at road distance 0, Workshop at distance
1, both operational and reachable): the **Farm** is staffed, Food `+2`, Material
`0`. Two colonists staff both: Food `+2` and Material `+2` together. Two
colonists on one staffed Farm: Food net `0/tick` for 10 consecutive ticks.

### D. Mobility
Eligibility is 09K unchanged (valid residence, operational workplace,
mobility-connected) and now covers Farms. **No new Food transport rule
exists**: no `Farm -> road -> Food` chain, no delivery, no logistics. Removing
the shared road contact unstaffs the Farm (`assignJobs` → unemployed,
production `0`); restoring it restaffs on the next assignment phase.

### E. Determinism
Replay → identical canonical string and hash. Insertion order → same
assignment. Save/load → same employment and same hash. Equal-distance
Farm/Workshop → lowest id wins, every run. Reconnect/disconnect replay →
identical.

### F. Performance
SMALL 0.05 ms/tick · MEDIUM 0.37 ms/tick · LARGE 1.59 ms/tick · XL 9.26 ms/tick.
`assignJobs` at LARGE-500: 14.6 ms vs the 10D post-correction 22.9 ms (and
6269 ms before 10D). The 10D precomputed-network/access path is preserved; no
new quadratic. `produceFood` rose 0.2 ms → 2.4 ms at LARGE-500 (per-farm
staffing count now on the Food path) — measured and reported, not hidden.

### G. Verification
* Vitest: **544 tests / 31 files, all passing**.
* `pnpm lint`: clean. `pnpm typecheck`: clean. `pnpm build`: succeeds.
* E2E: `run.mjs`, food, production, resource, temporal, road, transport, jobs,
  upkeep → **ALL PASS** (jobs/upkeep deferrals removed and executed).
* GPU: browser/WebGL checks pass; the hardware-renderer assertion fails on
  SwiftShader in this headless environment (not a code regression).

### H. Persistence
```text
SAVE_VERSION = 4
new persisted fields = 0
derived employment fields persisted = 0
```

### I. Deferred
See §16 above.

### J. Scope verdict
```text
COMPLETE
```
