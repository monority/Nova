# NOVA — Step 10F — Labor Competition Pressure Audit

## Mission

Perform a **design + gameplay pressure audit only** of the labor competition introduced by Step 10E.

Current causal chain:

```text
colonists
→ shared labor pool
→ Farm OR Workshop employment
→ Food OR Material production
```

Step10E established the mechanical competition.

Step10F must determine whether that competition creates a **meaningful player decision**.

This is an audit.

Do not add new gameplay rules.

Do not rebalance coefficients.

Do not modify production behavior.

Do not add money, wages, happiness, commute time, additional needs, logistics, or a new job framework.

The central question is:

> **Does choosing where a colonist works create meaningful economic pressure with the current rules?**

---

# 1. Repository verification

Start by verifying the actual repository state.

Run:

```text
git status
git log -3 --oneline
```

Expected latest Step10E commit:

```text
e46c06c
```

Inspect:

* `docs/roadmap/Step10E.md`;
* `src/domain/jobs`;
* `src/domain/simulation/phases`;
* Farm production;
* Workshop production;
* Food consumption;
* Material production;
* Material upkeep;
* population admission;
* mobility assignment;
* 09M distance preference;
* current E2E tests.

Confirm that Step10E is actually implemented as reported.

Do not trust the report without checking the code.

---

# 2. Establish the current economic equations

Document the exact current rules.

At minimum:

```text
Farm staffed
→ +2 Food / tick

Farm vacant
→ +0 Food / tick

Workshop staffed
→ +2 Material / tick

Workshop vacant
→ +0 Material / tick
```

Also document:

```text
Food need
= population × 1

Workshop upkeep
= 1 Material / staffed operational Workshop / tick

Material storage
= operational Workshops × 25
```

Confirm the current construction costs and durations.

Do not modify any of these rules.

---

# 3. Establish the labor budget

Construct controlled scenarios with:

```text
1 colonist
2 colonists
3 colonists
4 colonists
```

and varying workplace capacity:

```text
1 Farm
1 Workshop

2 Farms
1 Workshop

1 Farm
2 Workshops

2 Farms
2 Workshops

3 Farms
2 Workshops

2 Farms
3 Workshops
```

Measure:

```text
colonists
Farm workers
Workshop workers
unemployed colonists
Food production
Material production
Material upkeep
Food stock
Food shortage
```

The objective is to establish the actual labor constraint.

---

# 4. Farm vs Workshop opportunity cost

Construct paired scenarios that differ by exactly one employment decision.

Example:

### Scenario A

One colonist:

```text
Farm staffed
Workshop vacant
```

Measure:

```text
Food +2
Material +0
```

### Scenario B

Same world:

```text
Farm vacant
Workshop staffed
```

Measure:

```text
Food +0
Material +2
upkeep +1
```

Do not claim one is "better".

The purpose is to expose the actual opportunity cost.

---

# 5. Food-side pressure

Determine when sacrificing a Farm worker for Workshop production creates Food shortage.

Construct scenarios where:

```text
Food stock = low
Farm capacity = limited
Workshop capacity = available
```

Then compare:

```text
Farm staffed
vs
Workshop staffed
```

Measure the resulting Food trajectory and population consequence.

Determine whether the labor decision can affect:

```text
food security
```

under the current rules.

Do not modify Food.

---

# 6. Material-side pressure

Perform the reverse experiment.

Construct scenarios where:

```text
Material stock = low
Workshop capacity = limited
Farm capacity = available
```

Compare:

```text
Farm staffed
vs
Workshop staffed
```

Measure:

* Material stock;
* construction ability;
* Workshop upkeep;
* future Farm/Residence construction;
* production continuity.

Determine whether labor allocation can affect the player's ability to construct additional productive capacity.

Again:

**observe, do not modify.**

---

# 7. Bootstrap pressure

Run the complete early-colony sequence.

Track every tick:

```text
tick
population
residences
farms
workshops
farm workers
workshop workers
Food stock
Food need
Food production
Material stock
Material production
Material upkeep
construction
```

Identify the first tick at which labor competition becomes relevant.

Then determine:

1. Can the player build both Farm and Workshop?
2. Can both be staffed?
3. If not, when does the conflict appear?
4. Does the player have enough information to understand the tradeoff?
5. Does the tradeoff disappear once another colonist arrives?

Do not change UI during this audit.

---

# 8. Spatial preference interaction

Step10E preserved 09M:

```text
eligible workplace
→ road distance
→ lowest building ID
```

Audit whether distance can now influence **economic specialization**.

Create scenarios such as:

```text
Residence
   │
   ├── Farm
   │
   └── Workshop
```

and vary the road distance to each workplace.

Measure:

* assignment;
* Food production;
* Material production;
* Food stock;
* Material stock.

Determine whether 09M now creates an economic consequence through Farm/Workshop competition.

Do not add any new distance-based rule.

---

# 9. Multi-colonist competition

Test situations where workplaces exceed available workers.

At minimum:

```text
3 colonists
2 Farms
2 Workshops
```

and:

```text
2 colonists
2 Farms
2 Workshops
```

Determine:

* which workplaces are selected;
* whether selection follows distance;
* how ID tie-breaks affect specialization;
* whether insertion order remains irrelevant;
* whether different road layouts can change the production mix.

Again, this is an audit of existing rules.

---

# 10. Greedy assignment audit

Step10D/09L previously identified that the assignment system is deterministic but not globally optimal.

Do not fix that.

Instead determine whether Farm/Workshop competition makes that limitation **gameplay-visible**.

Construct at least one contention scenario where:

```text
Colonist A
Colonist B

Farm
Workshop
```

have different road distances.

Compare:

```text
greedy deterministic assignment
vs
theoretical minimum-distance assignment
```

Only as an observation.

Do not implement an optimizer.

Do not add a scoring system.

The report should state whether the current greedy behavior can change Food/Material production.

---

# 11. Construction feedback loop

Audit whether labor competition creates a causal loop:

```text
workers
→ production
→ resources
→ construction
→ more workplaces/housing
→ more workers required
```

Test at least:

### Loop A

Farm worker → Food → population sustainability → additional worker → Workshop.

### Loop B

Workshop worker → Material → Residence construction → additional colonist → Farm.

### Loop C

Workshop worker → Material → Farm construction → Food capacity.

Determine whether these loops already exist.

Do not create new links.

---

# 12. Identify the actual pressure classification

Classify the current labor competition into exactly one category:

### A — Strong strategic pressure

Employment choice materially affects settlement development and creates meaningful tradeoffs.

### B — Real but temporary pressure

Competition matters during bootstrap or specific resource shortages but later disappears.

### C — Deterministic assignment only

There is a mechanical competition but little meaningful economic consequence.

### D — Degenerate / dominated

One workplace type is effectively always preferable under current rules.

Do not use intuition.

Support the classification with measured scenarios.

---

# 13. Identify the smallest missing rule

If the audit finds insufficient pressure, identify **one** smallest missing causal dependency.

Potential categories for investigation:

```text
capacity
population growth
resource scarcity
workplace demand
production inputs
maintenance
construction dependency
```

These are categories, not instructions.

Do not automatically implement any of them.

For the chosen candidate, document:

1. existing state it consumes;
2. existing rule it connects to;
3. new player decision created;
4. why the rule belongs in the current roadmap phase;
5. why it does not prematurely introduce later phases;
6. minimum experiment needed to validate it.

If no new rule is justified:

```text
NO NEW RULE JUSTIFIED
```

---

# 14. UI information audit

The Step10E browser pass already fixed:

* hardcoded "assigned to Workshop";
* premature Food ledger credit.

Now inspect whether the existing UI communicates the new labor competition accurately.

Check:

* Farm staffed/vacant;
* Workshop staffed/vacant;
* colonist workplace;
* Food production;
* Material production;
* employment changes after construction;
* delayed Farm production timing.

This is an **audit only**.

Do not redesign the UI.

If the UI hides an important causal fact, document it as a future UX task.

---

# 15. Timing audit

Step10E deliberately preserved:

```text
produceFood
→ assignJobs
```

Therefore a Farm worker assigned during tick N produces Food from tick N+1.

Audit whether this creates any meaningful asymmetry with Workshops.

Measure:

```text
Farm becomes operational
→ assignment
→ first Food production
```

and compare:

```text
Workshop becomes operational
→ assignment
→ first Material production
```

Determine whether the one-tick difference is:

* harmless implementation timing;
* a meaningful gameplay rule;
* or a future inconsistency that should eventually be unified.

Do not change it during 10F.

---

# 16. Persistence and determinism

Verify:

```text
SAVE_VERSION = 4
```

and:

* employment survives save/load;
* Farm/Workshop assignments are deterministic;
* same scenario produces same state/hash;
* insertion-order changes do not alter canonical outcomes;
* derived worker counts are not persisted;
* no derived production metrics are hashed.

---

# 17. Performance audit

Step10E improved/maintained assignment performance.

Benchmark representative cases:

```text
SMALL
MEDIUM
LARGE
XL
```

with mixed Farms + Workshops.

Pay particular attention to:

```text
assignJobs
produceFood
produceMaterial
```

Do not optimize prematurely.

Only report measured regressions.

---

# 18. Tests

Create:

```text
tests/laborCompetitionPressureAudit.test.ts
```

The tests should encode the experiments rather than new gameplay rules.

Cover:

* labor budgets;
* Farm/Workshop opportunity cost;
* Food pressure;
* Material pressure;
* bootstrap;
* spatial preference;
* multi-colonist competition;
* greedy assignment;
* construction feedback loops;
* timing;
* determinism;
* persistence.

Do not modify production rules.

Do not weaken existing tests.

---

# 19. E2E / browser

Run:

```text
food
production
resource
temporal
road
transport
jobs
upkeep
```

plus the existing Farm/10E E2E scenario.

Inspect browser behavior for:

* staffing;
* workplace labels;
* Food ledger;
* Material ledger;
* assignment changes;
* delayed Farm production.

No UI implementation unless a genuine correctness bug is discovered.

---

# 20. GPU

Run GPU/browser validation if available.

Report:

* actual GPU;
* WebGL version;
* renderer;
* console/page errors.

If the environment falls back to SwiftShader again, report it accurately.

Do not alter rendering code.

---

# 21. Documentation

Create:

```text
docs/roadmap/Step10F.md
```

This is an **audit report**, not an implementation specification.

Required sections:

```text
1. Scope
2. Current Labor Contract
3. Labor Budget Measurements
4. Farm vs Workshop Opportunity Cost
5. Food Pressure
6. Material Pressure
7. Bootstrap
8. Spatial Preference
9. Multi-Colonist Competition
10. Greedy Assignment
11. Construction Feedback Loops
12. Timing
13. UI Information Audit
14. Pressure Classification
15. Smallest Missing Causal Rule
16. Deferred Mechanics
17. Verification
18. Final Design Decision
```

Use concrete measurements.

Do not write generic statements such as "the economy feels balanced."

---

# 22. Explicit scope exclusions

Do NOT implement:

* new resource;
* new need;
* money;
* wages;
* happiness;
* workplace demand;
* worker productivity modifiers;
* worker specialization;
* global job optimization;
* commute time;
* congestion;
* food logistics;
* food transport;
* new Farm mechanics;
* new Workshop mechanics;
* generic job abstraction;
* generic needs framework;
* coefficient rebalance.

---

# 23. Commit discipline

This is an **audit step**.

Before starting:

```text
git status
git log -3 --oneline
```

Do not modify `src/`.

Allowed changes:

```text
tests/laborCompetitionPressureAudit.test.ts
docs/roadmap/Step10F.md
```

and strictly necessary audit-only files.

Do not commit until the audit is complete and reviewed.

Suggested commit:

```text
Step 10F: audit labor competition pressure
```

---

# 24. Final report

Return:

## A. Repository

* starting commit;
* final commit;
* clean/dirty status;
* files changed.

## B. Current equations

Report the actual Farm/Workshop production and labor rules.

## C. Measurements

Provide concrete values for:

* 1/2/3/4 colonists;
* mixed workplace counts;
* Food pressure;
* Material pressure;
* bootstrap;
* spatial competition.

## D. Opportunity cost

Show at least one controlled Farm-vs-Workshop comparison.

## E. Feedback loops

Report which construction/economic loops actually exist.

## F. Greedy assignment

State whether the existing deterministic greedy assignment can alter economic output.

Do not optimize it.

## G. Timing

Report the observed Farm vs Workshop production timing.

## H. UI

Report whether the existing UI accurately exposes the labor competition.

## I. Pressure classification

Choose exactly one:

```text
A — Strong strategic pressure
B — Real but temporary pressure
C — Deterministic assignment only
D — Degenerate / dominated
```

Support it with measurements.

## J. Smallest missing rule

Either:

```text
NO NEW RULE JUSTIFIED
```

or identify exactly one candidate rule.

Do not implement it.

## K. Verification

Report:

* Vitest;
* lint;
* typecheck;
* build;
* E2E;
* determinism;
* persistence/hash;
* performance;
* GPU/browser.

## L. Scope verdict

Return exactly:

```text
COMPLETE — AUDIT
```

or:

```text
BLOCKED
```

Do not begin the candidate next gameplay rule.

The purpose of Step10F is to determine whether **Farm vs Workshop labor competition has become a real gameplay constraint**, not merely whether the employment code works.


---

# Documentation (as-built) — Step 10F audit report

**Type: AUDIT.** No production rule was changed. `src/` is byte-identical to
Step 10E (`git status` shows only `tests/laborCompetitionPressureAudit.test.ts`
and this file). All numbers below are produced by that suite and printed as
`AUDIT ...` lines; re-run with
`npx vitest run tests/laborCompetitionPressureAudit.test.ts --reporter=verbose`.

All measurements use **Material stock 0** unless a stock is stated, so that
storage-capacity effects are visible rather than masked by the 100 bootstrap
stock.

## 1. Scope

Audit of the labour competition introduced by Step 10E:

```text
colonists -> shared labour pool -> Farm OR Workshop employment
          -> Food OR Material
```

Central question: **does choosing where a colonist works create meaningful
economic pressure under the current rules?**

Out of scope (verified untouched): coefficients, needs, money/wages,
happiness, commute, logistics, capacity rules, storage rules, job framework,
optimisation. No `src/` file was modified.

## 2. Current Labor Contract (verified in src, not taken from the report)

| Rule | Value | Source |
| --- | --- | --- |
| Farm operational + staffed | `+2 Food/tick` | `FOOD_PER_FARM_PER_TICK = 2` |
| Farm operational + vacant | `+0 Food/tick` | `countStaffedOperationalFarms` |
| Workshop operational + staffed | `+2 Material/tick` | `MATERIAL_PER_WORKER_PER_TICK = 2` |
| Workshop operational + vacant | `+0 Material/tick` | `countStaffedOperationalWorkshops` |
| Job capacity | `1` per Farm, `1` per Workshop | `FARM_JOB_CAPACITY`, `WORKSHOP_JOB_CAPACITY` |
| Food need | `population × 1` | `FOOD_PER_COLONIST_PER_TICK = 1` |
| Material upkeep | `1` per **staffed operational Workshop** per tick | `MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK = 1` |
| Material storage | `25` per **operational Workshop** (staffing-independent) | `MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP = 25` |
| Building cost | `25` each (Residence, Farm, Workshop) | `BUILDING_CATALOG` |
| Construction | `2` ticks; placed on tick T → operational T+1 | `constructionTicks` |
| Road | `5`/cell | `ROAD_CONSTRUCTION_COST` |
| Admission | free operational Residence **and** Food left after consumption | `updatePopulation` |
| Selection | 09M: road distance, then lowest building id, type-blind | `assignJobs` |

Two timing facts that matter below:

* `produceFood` runs **before** `assignJobs`, so Farm output lags one tick;
* `assignJobs` runs **before** `produceMaterial`, so Material is same-tick.

## 3. Labor Budget Measurements

`rowWorld` places residences on row y=0, workplaces on row y=2, one road row
y=1, so every residence is mobility-connected to every workplace.

| pop | F | W | farmW | shopW | unemp | vacant | foodProd | matProd | upkeep | netFood | netMat |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 0 | 1 | 0 | 0 | 0 | 2 | 0 | 0 | +1 | 0 |
| 1 | 0 | 1 | 0 | 1 | 0 | 0 | 0 | 2 | 1 | −1 | +1 |
| 1 | 1 | 1 | 1 | 0 | 0 | 1 | 2 | 0 | 0 | +1 | 0 |
| 2 | 1 | 1 | 1 | 1 | 0 | 0 | 2 | 2 | 1 | 0 | +1 |
| 2 | 2 | 1 | 2 | 0 | 0 | 1 | 4 | 0 | 0 | +2 | 0 |
| 2 | 1 | 2 | 1 | 1 | 0 | 1 | 2 | 2 | 1 | 0 | +1 |
| 2 | 2 | 2 | 2 | 0 | 0 | 2 | 4 | 0 | 0 | +2 | 0 |
| 3 | 2 | 2 | 2 | 1 | 0 | 1 | 4 | 2 | 1 | +1 | +1 |
| 3 | 3 | 2 | 3 | 0 | 0 | 2 | 6 | 0 | 0 | +3 | 0 |
| 3 | 2 | 3 | 2 | 1 | 0 | 2 | 4 | 2 | 1 | +1 | +1 |
| 4 | 2 | 2 | 2 | 2 | 0 | 0 | 4 | 4 | 2 | 0 | +2 |
| 4 | 3 | 2 | 3 | 1 | 0 | 1 | 6 | 2 | 1 | +2 | +1 |
| 4 | 2 | 3 | 2 | 2 | 0 | 1 | 4 | 4 | 2 | 0 | +2 |

Findings:

* **Labour is the binding limit only while workplaces > colonists.**
  `2c/2F+2W`, `3c/3F+2W`, `2c/1F+2W`: every colonist is employed, workplaces
  stay vacant.
* At or below parity every workplace is staffed and **extra colonists are
  unemployed**: `4c/1F+1W` → employed 2, unemployed 2, jobCapacity 2.
* The Food rule is a strict ratio: **2 colonists per staffed Farm**.
  `1F/2c` → netFood 0 (net 0/tick measured over 5 ticks); `f*2 c / f F` →
  netFood 0 for f = 1,2,3; `1F/3c` → netFood −1.
* The 09M distance order decides the mix in every asymmetric row: `2c/2F+1W`
  staffs the two Farms (the nearest columns), not one of each.

## 4. Farm vs Workshop Opportunity Cost

Paired worlds, one employment decision apart (Residence with both workplaces
attached to its single contact cell, so the choice is made by id):

| Branch | farmW | shopW | foodProd | matProd | upkeep | netFood | netMaterial |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Farm staffed | 1 | 0 | **2** | 0 | **0** | +1 | 0 |
| Workshop staffed | 0 | 1 | 0 | **2** | **1** | −1 | −1 |

(The `netMaterial = −1` reading is for a stock above the single Workshop's
25 capacity, where stored production is 0 and only upkeep applies.)

* The two branches are **exactly mutually exclusive and equal in magnitude**:
  `2 Food XOR 2 Material` from the same colonist. Neither is "better" in
  general — Food is existential, Material is developmental.
* The fork is **forced only while colonists < workplaces**: with 1 colonist
  and 1F+1W, exactly one workplace is staffed and the other stays vacant
  (employed 1, vacant 1). With 2 colonists both are staffed (vacant 0).
* **The fork is asymmetric in cost**: only the Workshop branch pays upkeep
  (1 vs 0). Food is the only resource that is free to hold and free to
  produce apart from labour.

## 5. Food Pressure

Same world, low reserve, worker on one side or the other:

| Reserve | Branch | Food after 10 ticks | Population |
| --- | --- | --- | --- |
| 6 | Farm staffed | **16** | 1 |
| 6 | Workshop staffed | **0** | **0** |

The Workshop branch starves the colony on **tick 7** with a reserve of 6
(measured shortage tick exactly 7). With a reserve of 100 and 30 ticks the
difference is a slope, not survival: Farm 130 vs Workshop 70, population 1
either way (gap 60 = 2/tick).

Conclusion: **the labour decision can decide survival, but only against a
reserve shorter than the colony's remaining need.** Food pressure is a
function of the reserve, not of the mix: it is a bootstrap/shortage
phenomenon.

## 6. Material Pressure

| From Material 10, 15 ticks | Material | Upkeep | Storage | Food |
| --- | --- | --- | --- | --- |
| Workshop staffed | **24** | 1 | 25 | 85 |
| Farm staffed | **10** | 0 | 0 | 115 |

The Workshop is the **only** path to Material; the Farm branch's stock is
frozen (and the Farm branch pays no upkeep at all). This is the mirror image
of §5, and the two are the same fork seen from opposite sides.

### The 24-vs-25 equilibrium (critical finding)

A single staffed Workshop, capacity 25, refilling from 0:

```text
after 20 ticks: 20
after 24 ticks: 24
after 40 ticks: 24   (stalls)
storage 25, upkeep 1, storedProduction 1, buildCost 25, affordable: false
```

At 24 the remaining space is 1, so stored production (1) exactly cancels
upkeep (1): **net 0/tick, permanently one unit short of the 25 build cost.**
A one-Workshop colony can therefore never afford its next building.

**A second operational Workshop (capacity 50) breaks the deadlock:**
gross 4, upkeep 2, net +2/tick → 25 reached in 13 ticks (Material 26).

Once labour is available, the binding constraint is therefore **storage
capacity plus upkeep**, not labour: `4c/1F+2W` → farmWorkers 1,
workshopWorkers 2, unemployed 1, storage 50, netMaterial +2 while space
remains.

## 7. Bootstrap

Real command chain (residence → road → farm → workshop), bootstrap Material
100, all values measured per tick:

| label | tick | pop | F | W | farmW | shopW | unemp | Food | foodProd | Material | upkeep |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 100 | 0 | 100 | 0 |
| place R | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 100 | 0 | 75 | 0 |
| place road | 2 | 1 | 0 | 0 | 0 | 0 | 1 | 100 | 0 | 65 | 0 |
| place F | 3 | 1 | 1 | 0 | 0 | 0 | 1 | 99 | 0 | 40 | 0 |
| step | 4 | 1 | 1 | 0 | **1** | 0 | 0 | 98 | 2 | 40 | 0 |
| step | 5 | 1 | 1 | 0 | 1 | 0 | 0 | 99 | 2 | 40 | 0 |
| place W | 6 | 1 | 1 | 1 | **1** | **0** | 0 | 100 | 2 | 15 | 0 |
| step | 9 | 1 | 1 | 1 | 1 | 0 | 0 | 103 | 2 | 15 | 0 |

Answers to §7's five questions:

1. **Can the player build both?** Yes — R 25 + 1 road 5 + F 25 + W 25 = 80 ≤ 100.
2. **Can both be staffed?** **No.** One colonist, capacity 2.
3. **When does the conflict appear?** The tick the second workplace becomes
   operational (tick 6 here, right after its 2-tick construction), and it
   persists until a second colonist exists.
4. **Does the player have enough information?** Partially — see §13. The HUD
   shows `jobs 1 / 2` and `vacantOperationalFarms`, and the Farm inspection
   line states `producing +2/tick (staffed)` or `vacant, producing +0/tick`,
   but nothing tells the player that the *Farm* took the worker and the
   *Workshop* is the one standing idle, nor that the Farm's output will arrive
   one tick later.
5. **Does it disappear with another colonist?** **Yes, immediately** — adding
   a Residence and admitting a second colonist yields
   `{farmWorkers 1, workshopWorkers 1}` (vacant 0). The tradeoff lasts exactly
   one population step.

## 8. Spatial Preference

`nearType` = the type sharing the residence's contact cell (distance 0); the
other sits 1, 3 or 6 road steps away:

| near | farSteps | farmW | shopW | foodProd | matProd |
| --- | --- | --- | --- | --- | --- |
| Farm | 1 / 3 / 6 | 1 | 0 | 2 | 0 |
| Workshop | 1 / 3 / 6 | 0 | 1 | 0 | 2 |

Identical buildings and identical roads, only the **Residence moved two
columns**:

| Residence column | farmW | shopW | foodProd | matProd |
| --- | --- | --- | --- | --- |
| Farm column | 1 | 0 | 2 | 0 |
| Workshop column | 0 | 1 | 0 | 2 |

**09M now has an economic consequence**: a movement of one building across two
cells flips the colony's entire output from Food to Material. But it is not a
*player decision* — the player places buildings, and the assignment then
follows geometry automatically.

## 9. Multi-Colonist Competition

| Case | Order | farmW | shopW | unemp | vacant | foodProd | matProd |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3c / 2F+2W | farm first | 2 | 1 | 0 | 1 | 4 | 2 |
| 3c / 2F+2W | workshop first | 1 | 2 | 0 | 1 | 2 | 4 |
| 2c / 2F+2W | farm first | 2 | 0 | 0 | 2 | **4** | **0** |
| 2c / 2F+2W | workshop first | 0 | 2 | 0 | 2 | **0** | **4** |

* Selection follows distance; with the row layout both colonists share the two
  nearest columns, which the type created **first** occupies.
* **The id tie-break changes the production mix**: equal-distance pair, one
  colonist → farm created first staffs the Farm (2 Food, 0 Material); workshop
  created first staffs the Workshop (0 Food, 2 Material).
* **Insertion order is irrelevant for a fixed order**: two identical builds
  produce identical canonical strings and hashes; staffing counts are stable.

## 10. Greedy Assignment

Contention fixture: colonist A's residence touches two networks (the main one
with the Farm and colonist B, plus a private stub with the Workshop), so both
workplaces are eligible for A (tie at distance 0 → lowest id) and only the
Farm is eligible for B.

| | employed | unemployed | farmW | shopW | matProd | upkeep |
| --- | --- | --- | --- | --- | --- | --- |
| Greedy (measured) | **1** | **1** | 1 | 0 | **0** | 0 |
| A→Workshop, B→Farm (not implemented) | 2 | 0 | 1 | 1 | **2** | 1 |

Total-commute case (`A: Farm 0, Workshop 2`; `B: Farm 1, Workshop 1`):
greedy assigns `colonist-1 → building-3`, `colonist-2 → building-4`
(total 2) where the swap would give 1.

**Yes — the deterministic greedy pass can change economic output**: in the
contention case it leaves a colonist idle and forfeits 2 Material/tick. It is
also not distance-optimal. It is, however, deterministic and stable. **Not
optimised here** (§10, §22).

## 11. Construction Feedback Loops

* **Loop A (Farm → Food → population → Workshop) does NOT close.** Farm-first
  from bootstrap: R1 25 + road 5 + Farm 25 + Workshop 25 = 80 → Material 20.
  The Farm feeds the colony (`netFood +1`, Food 104) but Food is not a
  construction input, so the 25-cost second Residence is **rejected** and the
  population stays at 1. The loop stops.
* **Loop B (Workshop → Material → Residence → colonist) closes, but only with
  TWO Workshops.** With one Workshop the stock stalls at 24 < 25 (§6), so the
  chain is dead. With two (capacity 50): Material 11 → 25 in 14 ticks →
  Residence built → `pop 2`, **both Workshops staffed**.
* **Loop C (Material → Farm → Food) exists but is worker-gated.** A Farm built
  while every colonist is employed stays **vacant** (`farmWorkers 0`,
  `foodProd 0`); the gate lifts only when a free colonist appears
  (`farmWorkers 1, workshopWorkers 1`).
* **Assignment re-evaluation creates a self-balancing effect.** After the
  second Colonist exists and a Farm is built on the second residence's
  contact, the Farm (distance 0) **takes the worker off the farther
  Workshop**: the colony settles at `1 Farm + 1 Workshop`, `netFood 0`,
  `netMaterial +1`. Building nearer workplaces is how the mix is steered.

So the causal loop that actually exists is:

```text
Workshop worker -> Material -> (2nd Workshop -> capacity 50) -> Residence
  -> colonist -> (Farm on a contact cell) -> Food -> keeps that colonist alive
```

## 12. Timing

* Both types become **staffed on the same tick** (tick 4 in the command
  fixture).
* **Material is same-tick**: with stock 0, capacity 25 and the Workshop
  staffed on tick 4, Material is 1 at tick 4 (2 produced − 1 upkeep).
* **Food lags one tick in the stock**: on the first staffed tick the Food
  delta is **−1** (eaten, nothing produced); the next tick is **+1**.
  `foodProductionForTick` already reports 2 on the staffing tick because it
  reads the assignment.
* Verdict: **harmless implementation timing, but a real observability wart.**
  It is not a gameplay rule the player can exploit (there is no way to act on
  it), yet it means the Food ledger and the Farm inspection panel are one tick
  optimistic relative to the Food stock. A future unification (move
  `produceFood` after `assignJobs`) would remove the wart, but it would also
  change Workshop/Farm symmetry and every documented bootstrap number, so it
  must not be done as a side effect.

## 13. UI Information Audit

* **Per-building staffing is derivable for both types** (`countWorkersAt`)
  and the Farm inspection line correctly distinguishes
  `producing +2/tick (staffed)` from `vacant, producing +0/tick` (fixed in
  10E).
* **The domain inspection query has no staffing field.** Keys are
  `id, type, status, cell, constructionRemaining, constructionDuration,
  housingCapacity, occupiedHousing` — no `workers`/`staffed`. The app layer
  composes staffing itself.
* **Aggregate employment is type-blind.** The HUD's `jobs x / y` merges Farm
  and Workshop jobs. A player sees `1 / 2` without knowing *which* workplace
  is idle; that requires clicking each building.
* **The assignment sentence is type-aware** (10E fix): it says
  `Colonist assigned to Farm` / `Workshop` / `Farm and Workshop`.
* **Diagnostic-only stats** expose `farmIds`, `staffedFarmIds`,
  `vacantOperationalFarms` (never persisted or hashed).

Documented as future UX work, **not implemented**: a per-type job breakdown in
the HUD (e.g. `jobs 1/2 · farm 1/1 · workshop 0/1`), and an explicit
"next-tick production" hint on the Farm panel.

## 14. Pressure Classification

**B — Real but temporary pressure.**

Evidence for "real":

* with colonists < workplaces the fork is **forced** — `2 Food XOR 2 Material`
  from the same colonist (§4);
* it is consequential in both directions: it can **kill the colony**
  (reserve 6 + Workshop staffed → starvation on tick 7, §5) and it can
  **freeze development** (no staffed Workshop → Material frozen at 10, and a
  one-Workshop colony stalls at 24 < 25, §6);
* greedy assignment can forfeit real output (idle colonist, −2 Material/tick,
  §10).

Evidence for "temporary":

* the conflict appears exactly when the second workplace completes (tick 6)
  and **disappears at the next population step** (2 colonists + 1F+1W → both
  staffed, vacant 0, §7);
* at or above parity there is no decision left: every workplace is staffed
  (`4c/2F+2W` → farmW 2, shopW 2, vacant 0), so the labour split is fully
  determined and pressure transfers to storage capacity + upkeep (§3, §6);
* the mix is decided by geometry and creation order, not by an employment
  choice the player makes (§8, §9).

Not C (the consequences are material, not cosmetic) and not D (neither type
dominates: Food-only bootstrap cannot build, Material-only bootstrap starves).

## 15. Smallest Missing Causal Rule

The measured asymmetry that keeps the fork from being a *strategic* choice is
in §4: **the Farm branch has no upkeep (0) while the Workshop branch pays 1
Material/tick.** Food is free to hold and free to produce other than labour,
so the two branches differ only in what they output, never in what they cost.

One candidate rule (documented only — **not implemented**):

> **A staffed operational Farm costs `1 Material/tick`, i.e. generalize
> `MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK` to "per staffed workplace".**

1. **Existing state it consumes:** the Material stock and the derived staffed
   Farm count (`countStaffedOperationalFarms`) — both already exist.
2. **Existing rule it connects to:** `materialUpkeepDueForTick` (the 08C
   upkeep phase), unchanged in shape.
3. **New player decision:** running a Farm now competes for Material as well
   as labour, so the Farm/Workshop fork becomes two-sided instead of
   output-only; a colony at the 24 equilibrium must weigh Food against
   construction.
4. **Why it belongs in this phase:** it is the same "remove the asymmetry"
   motive as 10E (Farms had no worker; now Farms have no maintenance), applied
   to the one remaining asymmetry the audit measured, for the cost of one
   constant and one clause — no new system.
5. **Why it does not prematurely introduce later phases:** no money, wages,
   logistics, needs, productivity or new resource; it reuses the existing
   upkeep mechanic and the existing Material stock.
6. **Minimum experiment to validate it:** a bootstrap fixture with
   1 Farm + 1 Workshop + 2 colonists and Material near 0, stepped 60 ticks,
   asserting (a) the colony does not enter a Material death spiral, (b) the
   Food side still reaches a stable equilibrium, and (c) the one-Workshop
   equilibrium moves off 24 in a way that does not make the 25 build cost
   unreachable. If (c) fails, the candidate must be rejected or paired with a
   capacity change — i.e. **it is not obviously safe and needs its own step.**

Because classification B is acceptable at the current scale and the candidate
has an identified stability risk, **no new rule is required for the current
roadmap phase.**

## 16. Deferred Mechanics

Anything not in the current contract, explicitly **not** implemented:
money · wages · happiness · workplace demand · productivity modifiers ·
specialisation · global job optimisation · commute time · congestion · food
logistics/transport · food storage redesign · new Farm or Workshop mechanics ·
generic job/need framework · coefficient rebalance · save-version change.
Additionally deferred from this audit: the HUD per-type job breakdown (§13),
the Farm "next-tick production" hint (§13), unification of the Farm/Workshop
production timing (§12), and the `assignJobs` per-building access cost
(§17).

## 17. Verification

* **Vitest:** 32 files, **583 tests passing** (39 of them this audit).
* **lint:** clean. **typecheck:** clean. **build:** succeeds.
* **`src/` unchanged**: `git status` lists only the audit test and this file.
* **E2E/browser (headless)**: `run.mjs`, food, production, resource, temporal,
  road, transport, jobs, upkeep → **ALL PASS** (jobs includes the 10E
  Farm staffing/vacant/competition scenario), zero console/page errors.
* **GPU:** browser side passes (canvas, WebGL2, `three.js r186`, no errors) but
  the hardware-renderer assertion **FAILS**: this environment resolves to
  `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader
  driver)` — a software renderer. Reported accurately; no rendering code was
  touched.
* **Determinism/persistence:** `SAVE_VERSION = 4`; save/load round-trip
  identical canonical string **and** hash; repeated runs byte-identical;
  repeated `assignJobs` produces no churn; no derived worker metric appears in
  the serialized state.
* **Performance** (clustered mixed Farms+Workshops fixture, connected):

| Case | Workplaces | Residences | assignJobs | per tick |
| --- | --- | --- | --- | --- |
| SMALL | 10 | 5 | 0.51 ms | 0.66 ms |
| MEDIUM | 100 | 40 | 17.05 ms | 51.66 ms |
| LARGE | 400 | 150 | 362.41 ms | 2649.54 ms |
| XL | 1000 | 400 | 2381.38 ms | not run (hash 34.79 ms) |

This fixture is shaped differently from the 10D row benchmark (many separate
road networks, so `getBuildingRoadAccessWithNetworks` scans networks/roads per
building), so these numbers are **not** comparable with the 10D table.
The `O(buildings × roads)` access derivation is the dominant cost and matches
the quadratic residue the 10D report already documented. No optimisation was
attempted (audit only); full ticks are not run at LARGE/XL for the same reason
10D skipped the STRESS tick.

## 18. Final Design Decision

The labour competition is **mechanically real and economically consequential
during bootstrap and shortage, and it disappears once population reaches
workplace parity**. It is a **B — real but temporary pressure** layer: a sharp,
legible early bottleneck (one pioneer can feed the colony or fund its
construction, never both, and a single Workshop cannot even fund the next
building) followed by a state where labour is slack and the binding constraint
is Workshop storage capacity plus upkeep.

Step 10E is therefore **sufficient for the current roadmap phase**. No new
gameplay rule is implemented. One candidate for a future step is documented in
§15 (symmetric staffed-Farm upkeep), together with the stability experiment it
would require first.

---

## Final report

### A. Repository
* Starting commit: `e46c06c` (Step 10E), clean tree.
* Final commit: the Step 10F audit commit (this file + the audit test).
* Files changed: `tests/laborCompetitionPressureAudit.test.ts` (new, 39 tests),
  `docs/roadmap/Step10F.md` (this report appended to the prompt). `src/`
  untouched.

### B. Current equations
Farm staffed `+2 Food/tick`, vacant `+0`; Workshop staffed `+2 Material/tick`,
vacant `+0`; Food need `pop × 1`; upkeep `1` per staffed operational Workshop;
storage `25` per operational Workshop; cost `25` per building, `5` per road
cell; construction 2 ticks (placed T → operational T+1); capacity 1 per Farm
and per Workshop; selection = distance then lowest id, type-blind.

### C. Measurements
Full tables in §3 (13 combinations), §5 (reserve 6 / 100), §6 (Material 10,
the 24 equilibrium, capacity 50), §7 (tick table t0–t9), §8 (distance sweep +
one-building lever), §9 (2c/3c × 2F+2W × both creation orders).

### D. Opportunity cost
Same colonist, same world: `Farm staffed → +2 Food, 0 Material, upkeep 0`
versus `Workshop staffed → 0 Food, +2 Material, upkeep 1`. Exactly
`2 XOR 2`, with upkeep only on the Material side.

### E. Feedback loops
Loop A (Farm → Food → population → Workshop) **does not close** from bootstrap
(Material 20 < 25 for the Residence). Loop B (Workshop → Material → Residence
→ colonist) **closes only with two Workshops** (Material 11 → 25 in 14 ticks →
`pop 2`, both Workshops staffed). Loop C (Material → Farm → Food) exists but is
**worker-gated**. A newly built nearer Farm **pulls a worker off a farther
Workshop**, so the colony self-balances to 1 Farm + 1 Workshop
(`netFood 0`, `netMaterial +1`).

### F. Greedy assignment
**Yes, it can alter economic output.** In the measured contention fixture greedy
leaves one colonist idle (farmW 1, shopW 0, matProd 0, upkeep 0) where
`A→Workshop, B→Farm` would staff both (matProd 2, upkeep 1); it is also not
distance-optimal (total 2 vs 1 in the swap case). It remains deterministic and
stable. Not optimised.

### G. Timing
Both types are staffed on the same tick. Material is **same-tick** (Material 1
on the staffing tick from stock 0, capacity 25). Food **lags one tick in the
stock** (first staffed tick delta −1, next +1) while the query reports 2
immediately. Verdict: harmless implementation timing, but an observability wart
and a candidate for future unification — not changed here.

### H. UI
The Farm/Workshop inspection line correctly distinguishes staffed from vacant
(10E fix) and the assignment sentence is type-aware. Gaps documented, not
implemented: the domain inspection query has no staffing field (the app composes
it), the HUD `jobs x / y` merges Farm and Workshop jobs so the player cannot see
*which* workplace is idle without clicking it, and nothing signals the
one-tick-delayed Farm Food.

### I. Pressure classification
```text
B — Real but temporary pressure
```
Forced and consequential while colonists < workplaces (survival and
construction both hinge on it, and greedy assignment can forfeit output), then
gone at parity, where storage capacity + upkeep become the binding constraint.

### J. Smallest missing rule
One candidate documented, **not implemented**: make a staffed operational Farm
cost `1 Material/tick` (generalize the existing upkeep constant to "per staffed
workplace"), which would make the Farm/Workshop fork two-sided. Its stability
experiment (Material near 0, 1F+1W+2c, 60 ticks, checking for a Material death
spiral and that the 25 build cost stays reachable from the new equilibrium) is
specified in §15 and would need its own step. Within the current phase,
**no new rule is required.**

### K. Verification
Vitest 32 files / 583 tests passing (39 new) · lint clean · typecheck clean ·
build succeeds · E2E run/food/production/resource/temporal/road/transport/
jobs/upkeep ALL PASS · determinism, save/load and hash verified with
`SAVE_VERSION = 4` and no derived fields persisted · performance measured
(SMALL 0.51 ms assignJobs / 0.66 ms per tick … XL 2381.38 ms assignJobs, no
full tick) · GPU: browser checks pass, hardware-renderer assertion fails on
SwiftShader in this headless environment.

### L. Scope verdict
```text
COMPLETE — AUDIT
```
