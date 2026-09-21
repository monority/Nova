# NOVA — Step 10I — Coupled Workplace Upkeep Audit

## Mission

Audit the new candidate discovered in Step10H:

```text
farmUpkeepDue =
  min(
    max(0, staffedFarms - 1),
    max(0, staffedWorkshops - 1)
  )
```

Current Workshop upkeep remains:

```text
workshopUpkeepDue = staffedWorkshops
```

Candidate Farm upkeep therefore becomes coupled to Workshop capacity.

The intended property is:

```text
netMaterial >= +1
```

for every configuration with at least one staffed Workshop.

This step is **audit-only**.

Do NOT implement the candidate.

The central question is:

> Does coupling Farm upkeep to Workshop count remove pathological terminal states without destroying the meaningful Farm-vs-Workshop economic pressure established by 10G and 10H?

---

# 1. Repository verification

Start:

```text
git status
git log -3 --oneline
git diff -- src/
```

Expected latest commit:

```text
17734c2 Step 10H: audit Farm upkeep threshold
```

Verify:

* `src/` untouched;
* Step10H audit preserved;
* current Farm upkeep remains zero in production;
* Workshop upkeep remains unchanged;
* SAVE_VERSION remains 4.

---

# 2. Candidate formula

Model only inside the audit harness:

```text
farmUpkeepDue =
  min(
    max(0, staffedFarms - 1),
    max(0, staffedWorkshops - 1)
  )
```

Workshop upkeep:

```text
workshopUpkeepDue = staffedWorkshops
```

Therefore:

```text
netMaterial =
  W
  - W
  - farmUpkeepDue
```

Do not simplify this mathematically before measuring the actual simulation because:

* storage clamping;
* construction timing;
* staffing;
* production ordering;
* upkeep clamping

may affect the observed trajectory.

---

# 3. Three-way baseline

Every important experiment must compare:

### BASELINE

```text
Farm upkeep = 0
```

### THRESHOLD

Step10H:

```text
Farm upkeep = max(0, F - 1)
```

### COUPLED

Step10I candidate:

```text
Farm upkeep =
min(max(0, F - 1), max(0, W - 1))
```

This comparison is mandatory.

The purpose is to determine exactly what the coupled rule changes relative to the already-audited threshold.

---

# 4. Core matrix

Run 60-tick experiments with:

```text
1F + 0W
1F + 1W
1F + 2W
1F + 3W

2F + 1W
2F + 2W
2F + 3W

3F + 1W
3F + 2W
3F + 3W
3F + 4W

4F + 1W
4F + 2W
4F + 3W
4F + 4W
```

Start:

```text
Material = 10
Food = 1000
```

Record:

```text
tick
F
W
Farm upkeep
Workshop upkeep
total upkeep
Material
Food
Food production
Material production
```

Classify each trajectory:

```text
STABLE
GROWING
MARGINALLY_STABLE
COLLAPSING
BOOM_BUST
```

---

# 5. Critical algebraic behavior

Verify experimentally the following cases.

### F = 1

```text
farmUpkeep = 0
```

regardless of W.

### F = 2

```text
farmUpkeep = min(1, W - 1)
```

Therefore:

```text
W = 0 → 0
W = 1 → 0
W = 2 → 1
W = 3 → 1
```

### F = 3

```text
farmUpkeep = min(2, W - 1)
```

Therefore:

```text
W = 0 → 0
W = 1 → 0
W = 2 → 1
W = 3 → 2
W = 4 → 2
```

Verify this against actual simulation metrics.

Do not rely only on the formula.

---

# 6. Does the candidate guarantee positive Material flow?

The candidate appears to imply:

```text
net Material = W - W - farmUpkeep
```

which suggests that additional Farm upkeep could still consume Material.

However, the candidate was proposed specifically because it should prevent the previous terminal state.

Determine experimentally:

```text
1F + 1W
2F + 2W
3F + 3W
4F + 4W
```

and compare with:

```text
2F + 1W
3F + 2W
4F + 3W
```

Do not assume positive accumulation.

Determine the actual net trajectory after:

* production;
* storage clamp;
* construction;
* upkeep.

---

# 7. The key concern: does pressure disappear?

This is the most important part of 10I.

Under the Step10H candidate:

```text
2F + 2W
```

has:

```text
+2 Material production
-2 Workshop upkeep
-1 Farm upkeep
= -1 net
```

Actually verify the precise current ordering and observed result.

Under the coupled candidate, determine what changes.

Test:

```text
1F + 1W
2F + 2W
3F + 3W
4F + 4W
```

If the coupled rule causes every balanced Farm/Workshop configuration to accumulate indefinitely, determine whether Farm expansion has become effectively free again.

The audit must answer:

> Does the new safety constraint accidentally eliminate the economic tension that 10G/10H deliberately created?

---

# 8. Marginal Farm cost

Calculate the marginal cost of:

```text
1st Farm
2nd Farm
3rd Farm
4th Farm
```

at fixed Workshop counts:

```text
W = 1
W = 2
W = 3
W = 4
```

Produce a table:

| Farms | W=1 | W=2 | W=3 | W=4 |
| ----: | --: | --: | --: | --: |
|     1 |   ? |   ? |   ? |   ? |
|     2 |   ? |   ? |   ? |   ? |
|     3 |   ? |   ? |   ? |   ? |
|     4 |   ? |   ? |   ? |   ? |

Values must be measured Farm upkeep per tick.

Determine whether marginal Farm cost remains meaningful.

---

# 9. Marginal Workshop cost

Perform the inverse experiment.

Fix Farms:

```text
F = 1
F = 2
F = 3
F = 4
```

and increase Workshops:

```text
W = 1 → 4
```

Measure:

* Material production;
* Workshop upkeep;
* Farm upkeep;
* net Material;
* construction availability.

Determine whether adding Workshops still creates a meaningful economic benefit.

---

# 10. Bootstrap

Run the complete bootstrap sequence under all three models:

```text
BASELINE
THRESHOLD
COUPLED
```

Track:

```text
tick
population
residences
farms
workshops
Farm workers
Workshop workers
Food
Material
construction
```

Answer:

1. Can the first Farm be built?
2. Can the first Workshop be built?
3. Can Farm + Workshop coexist?
4. Can another Workshop be accumulated?
5. Can another Farm be accumulated?
6. Does the coupled candidate create a new bootstrap exploit?
7. Does it make Farm expansion effectively free?

---

# 11. Terminal-state analysis

Repeat the Step10H recovery experiment.

Start:

```text
Material = 0
```

with:

```text
1F + 1W
2F + 2W
3F + 3W
4F + 4W

2F + 1W
3F + 2W
4F + 3W
```

Determine:

* whether Material remains zero;
* whether it recovers;
* whether construction can restart;
* whether the 25-cost threshold can be reached;
* whether any irreversible state remains.

The candidate is specifically intended to eliminate the small-colony trap.

Verify whether it actually does.

---

# 12. Small-colony crest

Repeat the critical threshold analysis:

```text
Material = 24
```

for:

```text
1F + 1W
2F + 2W
3F + 3W
4F + 4W
```

Because construction occurs before upkeep, determine:

1. whether 25 can be reached;
2. whether a building can be constructed;
3. what upkeep happens afterward;
4. whether the colony remains viable.

Also test:

```text
Material = 0
```

to determine whether the next tick can create a recovery path without external intervention.

---

# 13. Spatial pressure

Repeat the 09M spatial scenarios.

At minimum:

```text
Residence closer to Farm
Residence closer to Workshop
Equal distance
```

Measure:

```text
selected workplace
Food production
Material production
Farm upkeep
Workshop upkeep
Material trajectory
Food trajectory
```

The candidate must preserve meaningful spatial consequences if possible.

Specifically determine whether moving the Residence still changes:

```text
economic outcome
```

or merely changes:

```text
Food/Material mix
```

without changing long-term viability.

---

# 14. Equal-distance ID tie-break

Create two identical scenarios:

### Scenario A

Farm gets lower ID.

### Scenario B

Workshop gets lower ID.

Same:

* geometry;
* road network;
* colonist count;
* buildings;
* resources.

Measure:

```text
Food
Material
upkeep
construction
```

Determine whether ID tie-breaking remains economically meaningful under the coupled candidate.

---

# 15. Multi-colonist pressure

Test:

```text
2 colonists
1 Farm
1 Workshop

3 colonists
2 Farms
1 Workshop

3 colonists
1 Farm
2 Workshops

4 colonists
2 Farms
2 Workshops

5 colonists
3 Farms
2 Workshops
```

Measure:

* employment;
* unemployment;
* production;
* upkeep;
* resource trajectory.

Determine whether worker scarcity still creates meaningful choices.

---

# 16. Long-run expansion

Run:

```text
240 ticks
```

for:

```text
1F + 1W
2F + 2W
3F + 3W
4F + 4W
```

Starting:

```text
Material = 10
Food = 1000
```

Record every construction event.

Determine whether the candidate causes:

```text
permanent growth
permanent stagnation
periodic expansion
boom/bust
```

Do not change construction rules.

---

# 17. Counterfactual opportunity cost

Construct controlled pairs where exactly one worker moves:

```text
Farm → Workshop
Workshop → Farm
```

Measure the delta:

```text
ΔFood
ΔMaterial
Δupkeep
```

The purpose is to determine whether the coupled upkeep changes the fundamental labor opportunity cost.

If:

```text
ΔFood
```

remains meaningful but:

```text
ΔMaterial
```

becomes negligible, document that.

If both remain meaningful, document it.

---

# 18. Candidate quality criteria

The candidate is considered **strong** only if it satisfies all three:

### Safety

No small-colony irreversible Material trap caused solely by Farm upkeep.

### Pressure

Additional Farms retain a measurable marginal Material cost.

### Agency

Farm-vs-Workshop and spatial assignment choices still change meaningful economic outcomes.

If any one fails, the candidate is not yet validated.

---

# 19. Classification

Choose exactly one:

### A — Valid candidate

Removes terminal states while preserving meaningful marginal pressure and spatial/labor agency.

### B — Useful safety rule but economically too weak

Improves stability but substantially removes the Farm-vs-Workshop tradeoff.

### C — Still unstable

Terminal states or bootstrap traps remain.

### D — Redundant

Existing threshold already provides the needed behavior; coupling adds no meaningful value.

### E — Wrong direction

The upkeep model itself is producing artificial constraints and should be abandoned.

Support the classification with measured results.

---

# 20. If A: implementation contract

Do not implement.

Document the exact future contract:

```text
farmUpkeepDue =
  min(
    max(0, staffedFarms - 1),
    max(0, staffedWorkshops - 1)
  )
```

Specify:

* exact phase;
* exact clamp;
* query behavior;
* UI ledger implications;
* tests;
* 60/120/240 tick regression scenarios;
* bootstrap regression;
* save/hash regression;
* determinism regression.

---

# 21. If B/C/D/E

Do not implement.

Identify the smallest next design experiment.

Do not invent another upkeep formula merely to keep iterating.

If the audit demonstrates that the coupled formula destroys the intended pressure, return to the design question:

> Should Farm upkeep exist at all, and if so, should its cost really be Material?

This is important.

Do not let successive formulas become patches whose only purpose is preventing edge cases.

---

# 22. Tests

Create:

```text
tests/coupledFarmUpkeepAudit.test.ts
```

Audit-only.

Minimum coverage:

* formula;
* baseline vs threshold vs coupled;
* marginal Farm cost;
* marginal Workshop value;
* bootstrap;
* terminal states;
* 24/25 crest;
* recovery;
* spatial pressure;
* equal-distance ID tie-break;
* multi-colonist competition;
* 240-tick expansion;
* counterfactual worker move;
* deterministic replay.

Do not modify production code.

Do not weaken existing tests.

---

# 23. Existing verification

Run:

```text
run
food
production
resource
temporal
road
transport
jobs
upkeep
```

Also:

```text
lint
typecheck
build
```

All existing tests should remain unchanged and green.

---

# 24. Persistence

Confirm:

```text
SAVE_VERSION = 4
```

No production state changes.

No persisted Farm upkeep.

No new hash fields.

Current save/load and deterministic replay remain stable.

---

# 25. Documentation

Create:

```text
docs/roadmap/Step10I.md
```

Preserve the full prompt.

Append:

```text
# As-Built / Audit Report
```

Required:

```text
1. Repository State
2. Candidate Formula
3. Baseline / Threshold / Coupled Comparison
4. Core Matrix
5. Marginal Farm Cost
6. Marginal Workshop Value
7. Bootstrap
8. Terminal States
9. 24/25 Crest
10. Spatial Pressure
11. Equal-Distance Tie-Break
12. Multi-Colonist Pressure
13. 240-Tick Expansion
14. Counterfactual Opportunity Cost
15. Candidate Quality Criteria
16. Classification
17. Design Decision
18. Verification
19. Final Scope Verdict
```

---

# 26. Scope restrictions

Do NOT modify:

```text
src/
```

Do NOT implement:

* Farm upkeep;
* coupled upkeep;
* new resources;
* new needs;
* money;
* wages;
* job priorities;
* global optimization;
* road changes;
* population changes;
* construction changes;
* storage changes;
* tick-order changes.

---

# 27. Commit discipline

Before finishing:

```text
git diff -- src/
git status
```

Expected:

```text
src/ = unchanged
```

Allowed:

```text
tests/coupledFarmUpkeepAudit.test.ts
docs/roadmap/Step10I.md
```

Commit:

```text
Step 10I: audit coupled Farm upkeep
```

---

# 28. Final report

Return:

## Repository

* starting commit;
* final commit;
* changed files;
* `src/` untouched.

## Formula

Exact candidate formula.

## Stability

60/240 tick results.

## Marginal pressure

Measured Farm and Workshop marginal costs.

## Bootstrap

Comparison of baseline / threshold / coupled.

## Terminal states

Whether they actually disappear.

## Spatial pressure

Whether 09M remains economically consequential.

## Recovery

Measured recovery boundary.

## Agency

Whether labor allocation still creates meaningful decisions.

## Classification

Exactly:

```text
A — Valid candidate
B — Useful safety rule but economically too weak
C — Still unstable
D — Redundant
E — Wrong direction
```

## Design decision

State whether the coupled upkeep rule should proceed to implementation, requires another design experiment, or should be abandoned.

## Scope verdict

Return exactly:

```text
COMPLETE — AUDIT
```

The purpose of Step10I is to prevent **formula patching** from becoming the economic design.

We need to know whether the coupled rule is actually a coherent game rule, not merely a mathematically convenient way to prevent a dead-end.



---

# As-Built / Audit Report

**Type: AUDIT. No production rule was changed.** `src/` is byte-identical to
Step 10H (`git diff -- src/` empty; `git status` shows only this file and
`tests/coupledFarmUpkeepAudit.test.ts`). Every number below is a real
`AUDIT ...` line from that suite; re-run with

```text
npx vitest run tests/coupledFarmUpkeepAudit.test.ts --reporter=verbose
```

Three upkeep models are compared on identical canonical states:

```text
BASELINE   farmUpkeepDue = 0
THRESHOLD  farmUpkeepDue = max(0, F - 1)                        (10H)
COUPLED    farmUpkeepDue = min(max(0, F-1), max(0, W-1))        (10I)
workshopUpkeepDue = W  (always)
```

All models live only inside the test (`stepWithMetrics`), inserted at the
existing phase 8b as a combined clamp. With `mode = 'baseline'` the harness is
byte-identical to `stepSimulation` (`AUDIT HARNESS_FIDELITY`), and the combined
clamp equals the sequential Workshop-then-Farm clamp
(`AUDIT CLAMP_EQUIVALENCE`). Worlds are the Step 10G/10H flat rows; Material
10 and Food 1000 unless stated.

## 1. Repository State

* starting commit `17734c2` (Step 10H), audit preserved;
* `src/` untouched (`git diff -- src/` empty);
* production Farm upkeep remains **zero**; Workshop upkeep unchanged (`W`);
* `SAVE_VERSION = 4`.

## 2. Candidate Formula

```text
farmUpkeepDue     = min( max(0, staffedFarms - 1), max(0, staffedWorkshops - 1) )
workshopUpkeepDue = staffedWorkshops
netMaterial       = W - farmUpkeepDue
```

`AUDIT FORMULA_TABLES` (verified against real simulation metrics, not the
algebra) — Farm upkeep per tick:

| F \ W | 0 | 1 | 2 | 3 | 4 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | 0 | 0 | 0 | 0 |
| 2 | 0 | 0 | 1 | 1 | 1 |
| 3 | 0 | 0 | 1 | 2 | 2 |
| 4 | 0 | 0 | 1 | 2 | 3 |

This matches the §5 expectations exactly. `AUDIT COUPLED_NET_IDENTITY`
verifies the closed form for every tested configuration:

```text
net = max(1, W - F + 1)   for W >= 1
net = 0                   for W = 0
```

## 3. Baseline / Threshold / Coupled Comparison

`AUDIT NET_BY_MODEL` (net Material/tick):

| Scenario | BASELINE | THRESHOLD | COUPLED | coupled farm upkeep | coupled workshop upkeep |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1F+0W | 0 | 0 | 0 | 0 | 0 |
| 1F+1W | +1 | +1 | +1 | 0 | 1 |
| 1F+2W | +2 | +2 | +2 | 0 | 2 |
| 1F+3W | +3 | +3 | +3 | 0 | 3 |
| 2F+1W | +1 | 0 | **+1** | 0 | 1 |
| 2F+2W | +2 | +1 | +1 | 1 | 2 |
| 2F+3W | +3 | +2 | +2 | 1 | 3 |
| 3F+1W | +1 | −1 | **+1** | 0 | 1 |
| 3F+2W | +2 | 0 | **+1** | 1 | 2 |
| 3F+3W | +3 | +1 | +1 | 2 | 3 |
| 3F+4W | +4 | +2 | +2 | 2 | 4 |
| 4F+1W | +1 | −2 | **+1** | 0 | 1 |
| 4F+2W | +2 | −1 | **+1** | 1 | 2 |
| 4F+3W | +3 | 0 | **+1** | 2 | 3 |
| 4F+4W | +4 | +1 | +1 | 3 | 4 |

`AUDIT BALANCED_THRESHOLD_VS_COUPLED`: for every balanced `F = W` config the
threshold and coupled rules are **identical** (net +1, ends 24 / 47 / 70 / 70).
The coupling changes only the `F > W` rows, where it clamps the tax at `W - 1`.

## 4. Core Matrix

`AUDIT CORE_MATRIX_60` — 60 ticks, all 15 scenarios × 3 models, zero
Food-shortage ticks and no capacity loss. Coupled classifications:

| Scenario | net | F | W | material end | class |
| --- | ---: | ---: | ---: | ---: | --- |
| 1F+0W | 0 | 1 | 0 | 10 | MARGINALLY_STABLE |
| 1F+1W | +1 | 1 | 1 | 24 | GROWING |
| 1F+2W | +2 | 1 | 2 | 49 | GROWING |
| 1F+3W | +3 | 1 | 3 | 74 | GROWING |
| 2F+1W | +1 | 2 | 1 | 24 | GROWING |
| 2F+2W | +1 | 2 | 2 | 47 | GROWING |
| 2F+3W | +2 | 2 | 3 | 72 | GROWING |
| 3F+1W | +1 | 3 | 1 | 24 | GROWING |
| 3F+2W | +1 | 3 | 2 | 47 | GROWING |
| 3F+3W | +1 | 3 | 3 | 70 | GROWING |
| 3F+4W | +2 | 3 | 4 | 95 | GROWING |
| 4F+1W | +1 | 4 | 1 | 24 | GROWING |
| 4F+2W | +1 | 4 | 2 | 47 | GROWING |
| 4F+3W | +1 | 4 | 3 | 70 | GROWING |
| 4F+4W | +1 | 4 | 4 | 93 | GROWING |

The `+1` floor is visible: **the net Material rate is pinned at 1 for every
configuration with `F >= W`**, and grows only once `W > F`.

## 5. Marginal Farm Cost

`AUDIT MARGINAL_FARM_UPKEEP` (Farm upkeep / tick) and
`AUDIT MARGINAL_FARM_COST` (marginal, i.e. delta vs the previous Farm):

| Farms | W=1 | W=2 | W=3 | W=4 |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | 0 | 0 | 0 |
| 2 | 0 | 1 | 1 | 1 |
| 3 | 0 | 1 | 2 | 2 |
| 4 | 0 | 1 | 2 | 3 |

| Marginal cost | W=1 | W=2 | W=3 | W=4 |
| ---: | ---: | ---: | ---: | ---: |
| 1st Farm | 0 | 0 | 0 | 0 |
| 2nd Farm | **0** | 1 | 1 | 1 |
| 3rd Farm | **0** | **0** | 1 | 1 |
| 4th Farm | **0** | **0** | **0** | 1 |

The marginal Farm cost is **zero for every Farm beyond the W-th** (all bold
cells). `AUDIT NET_VS_F_AT_W1 = [1,1,1,1]`, `W2 = [2,1,1,1]`,
`W3 = [3,2,1,1]`: at one staffed Workshop the net is `+1` for 1, 2, 3 or 4
Farms — **Farm expansion is completely free at the margin.**

`AUDIT PRESSURE_LOSS_W_LT_F` quantifies the loss against the 10H threshold:

| Config | threshold farm tax | coupled farm tax | threshold net | coupled net |
| --- | ---: | ---: | ---: | ---: |
| 2F+1W | 1 | **0** | 0 | **+1** |
| 3F+1W | 2 | **0** | −1 | **+1** |
| 4F+1W | 3 | **0** | −2 | **+1** |
| 3F+2W | 2 | **1** | 0 | **+1** |
| 4F+2W | 3 | **1** | −1 | **+1** |
| 4F+3W | 3 | **2** | 0 | **+1** |

## 6. Marginal Workshop Value

`AUDIT MARGINAL_WORKSHOP` (net Material/tick as W grows, per fixed F):

| F | W=1 | W=2 | W=3 | W=4 |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 2 | 3 | 4 |
| 2 | 1 | 1 | 2 | 3 |
| 3 | 1 | 1 | 1 | 2 |
| 4 | 1 | 1 | 1 | 1 |

Under the coupling, adding a Workshop while `W <= F` raises Workshop upkeep by
1 **and** Farm upkeep by 1, exactly cancelling the `+2` gross production: the
marginal net value of a Workshop is **zero until `W > F`**. Workshops still add
storage (25 each), but they add no net Material income in the
`W <= F` region — the inverse of the Farm result.

## 7. Bootstrap

`AUDIT BOOTSTRAP_ALL` / `AUDIT BOOTSTRAP_ANSWERS` — the real command chain
`R1 -> road -> Farm -> road -> Workshop -> 20 ticks`:

| | BASELINE | THRESHOLD | COUPLED |
| --- | ---: | ---: | ---: |
| material after placing W1 | 15 | 15 | 15 |
| after 20 drain ticks | 15 | 15 | 15 |
| final | 15 | 15 | 15 |
| new exploit | — | — | **false** |

```text
1. First Farm built?             yes
2. First Workshop built?         yes
3. Farm + Workshop coexist?      yes
4. Another Workshop accumulated? no (same 1-colonist dead-end as baseline)
5. Another Farm accumulated?     no (same)
6. New bootstrap exploit?        no
7. Farm expansion free?          yes (structurally, but not reachable here)
```

The coupled rule is baseline-identical at bootstrap because with one colonist
only the Farm is staffed (`W = 0` → cap 0). `AUDIT BOOTSTRAP_TWO_WORKSHOPS`:
two Workshops reach +1/tick and 49 Material.

## 8. Terminal States

`AUDIT RECOVERY_FROM_ZERO` (60 ticks from Material 0):

| Config | coupled net | coupled end | coupled recovered | threshold recovered |
| --- | ---: | ---: | --- | --- |
| 1F+1W | +1 | 24 | yes | yes |
| 2F+2W | +1 | 47 | yes | yes |
| 3F+3W | +1 | 60 | yes | yes |
| 4F+4W | +1 | 60 | yes | yes |
| 2F+1W | +1 | 24 | **yes** | **no** |
| 3F+2W | +1 | 47 | **yes** | **no** |
| 4F+3W | +1 | 60 | **yes** | **no** |
| 4F+1W | +1 | 24 | **yes** | **no** |

The coupled rule **does eliminate the terminal states**. Every configuration
with at least one staffed Workshop recovers from Material 0 on the first tick.
`AUDIT NO_WORKSHOP_NO_MATERIAL` confirms the only non-recovering case is
`W = 0`, which has no Material production at all — identical to baseline, not
a Farm-upkeep trap.

## 9. 24/25 Crest

`AUDIT CREST_24` (Material 24, coupled):

| Config | production | crest | upkeep | rest after upkeep | timed build |
| --- | ---: | ---: | ---: | ---: | --- |
| 1F+1W | 1 | 25 | 1 | 24 | accepted |
| 2F+2W | 4 | 28 | 3 | 25 | accepted |
| 3F+3W | 6 | 30 | 5 | 25 | accepted |
| 4F+4W | 8 | 32 | 7 | 25 | accepted |

`AUDIT CREST_FROM_ZERO`: at Material 0 every `F = W` config reaches
`materialAfter1 = 1` and recovers. The 8a-before-8b crest contract is intact.

## 10. Spatial Pressure

`AUDIT SPATIAL_PRESSURE` (unchanged 09M; only the Residence moves):

| Case | staffed | Food prod | Material prod | farm upkeep | workshop upkeep | Food end | starvation |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Farm preference | Farm | 2 | 0 | 0 | 0 | 70 | no |
| Workshop preference | Workshop | 0 | 2 | 0 | 1 | 0 | **yes** |

The spatial choice still decides Food survival vs Material and still changes
long-term viability: the Farm branch survives with 0 upkeep; the Workshop
branch accumulates Material but starves. Spatial agency is preserved.

## 11. Equal-Distance Tie-Break

`AUDIT SPATIAL_PRESSURE` (id tie-break):

| Tie-break | staffed | farm upkeep | workshop upkeep | total upkeep |
| --- | --- | ---: | ---: | ---: |
| Farm lower id | Farm | 0 | 0 | **0** |
| Workshop lower id | Workshop | 0 | 1 | **1** |

The id tie-break still changes the mix (Food vs Material) **and** the Material
upkeep (0 vs 1), because the single free first Farm is upkeep-free while a
Workshop always pays. ID ordering remains economically meaningful.

## 12. Multi-Colonist Pressure

`AUDIT MULTI_COLONIST`:

| Scenario | employed | unemployed | farm workers | workshop workers | farm upkeep | workshop upkeep | net |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2c 1F+1W | 2 | 0 | 1 | 1 | 0 | 1 | +1 |
| 3c 2F+1W | 3 | 0 | 2 | 1 | 0 | 1 | +1 |
| 3c 1F+2W | 3 | 0 | 1 | 2 | 0 | 2 | +2 |
| 4c 2F+2W | 4 | 0 | 2 | 2 | 1 | 2 | +1 |
| 5c 3F+2W | 5 | 0 | 3 | 2 | 1 | 2 | +1 |

Worker scarcity still matters (every colonist is employed in these fixtures),
and the Food/Material mix still follows the assignment; the Material *upkeep*
side is flat for the farm-heavy rows.

## 13. 240-Tick Expansion

`AUDIT EXPANSION_240` (Material 10, Food 8000, no commands):

| Config | net | first crest ≥ 25 | material end | storage | class |
| --- | ---: | ---: | ---: | ---: | --- |
| 1F+1W | +1 | tick 13 | 24 | 25 | GROWING |
| 2F+2W | +1 | tick 11 | 47 | 50 | GROWING |
| 3F+3W | +1 | tick 9 | 70 | 75 | GROWING |
| 4F+4W | +1 | tick 7 | 93 | 100 | GROWING |

`AUDIT EXPANSION_240_UNBALANCED`: the configurations the threshold left
stalled now grow permanently — `2F+1W` (threshold end 10 →
coupled end 24), `3F+2W` (10 → 47), `4F+3W` (10 → 70). The coupled rule
produces **permanent growth** in every tested configuration; no stagnation,
no oscillation, no boom/bust.

## 14. Counterfactual Opportunity Cost

`AUDIT OPPORTUNITY_COST_WORKER_MOVE` — one worker moves Workshop → Farm in a
2-colonist / 2-Farm / 1-Workshop world (only the second Residence moves):

| | at Workshop | at Farm |
| --- | ---: | ---: |
| Food production | 2 | 4 |
| Material production | 2 | 0 |
| total upkeep | 1 | 0 |

```text
ΔFood      = +2
ΔMaterial  = -2 gross  (Δnet = -1)
Δupkeep    = -1  (workshop upkeep lost; farm side unchanged)
```

The fundamental labour opportunity cost survives: moving a worker to a Farm
still buys `+2 Food` at the cost of `+2 Material` and one unit of net income.
The thing the coupling removes is the *extra Farm upkeep* on top of that, not
the labour trade itself.

## 15. Candidate Quality Criteria

§18 requires Safety **and** Pressure **and** Agency:

| Criterion | Result | Evidence |
| --- | --- | --- |
| **Safety** — no small-colony irreversible Material trap from Farm upkeep | **PASS** | §8: every `W >= 1` config recovers from 0; net `>= +1` |
| **Pressure** — additional Farms keep a measurable marginal Material cost | **FAIL** | §5: marginal cost 0 for every Farm beyond the W-th; net pinned at `+1` for all `F >= W` |
| **Agency** — Farm-vs-Workshop and spatial choices change outcomes | **PASS** | §10–§14: survival vs starvation, 0 vs 1 upkeep, ΔFood +2 / Δnet −1 |

The candidate is not strong: it buys safety by deleting the marginal cost it
was meant to impose. The safety and the pressure are mutually exclusive by
construction — the trap lived exactly at `F > W`, which is exactly where the
coupling zeroes the tax.

Two secondary degeneracies follow from the same clamp:

* at `W = 1` the net is `+1` for **any** number of Farms ([1,1,1,1]);
* adding a Workshop while `W <= F` has **zero** net Material value (§6),
  because the coupling raises the Farm tax in lockstep with the new Workshop
  upkeep.

## 16. Classification

* not **A**: Pressure fails.
* not **C**: terminal states are actually gone; safety passes.
* not **D**: the coupling is not redundant — it repairs four recovery failures
  (`2F+1W`, `3F+2W`, `4F+3W`, `4F+1W`) that the threshold left terminal.
* not **E**: the model still preserves bootstrap identity, spatial agency and
  the labour opportunity cost; it is weak, not directionally wrong.

The rule is a real safety improvement whose cost is the disappearance of the
marginal Farm tax in the entire `F > W` region.

### Classification: **B — Useful safety rule but economically too weak**

## 17. Design Decision

```text
DO NOT IMPLEMENT — RETURN TO THE DESIGN QUESTION
```

The coupled formula is a coherent safety rule, but it is also exactly the
"formula patch" Step 10I warns against: it guarantees `net >= +1` by capping
the Farm tax precisely where the tax did its work, so each successive formula
(10H threshold → 10I coupling) has only moved or masked the edge case rather
than deciding what the cost *means*. It should not proceed to implementation.

Smallest next design experiment (not another upkeep formula):

> **Audit whether Farm upkeep should exist at all, and whether its cost should
> really be Material.**

Concretely, re-run the Step 10G/10H/10I fixture matrix against the **baseline**
(no Farm upkeep) using the §18 criteria, now that Step 10E has already made a
Farm consume a worker. Measure whether 10E's worker competition alone provides
the Pressure that the Material upkeep was intended to add. If it does, Farm
upkeep is redundant and should be abandoned; if it does not, the next design
step must choose a cost that is *not* trivially coupled to Workshop count
(for example a cost that does not scale with `W`), rather than adding another
`min(...)` to the same Material ledger.

This keeps 10G/10H/10I as a closed, evidence-backed exploration and prevents
the upkeep formula from becoming the economic design by accident.

## 18. Verification

* `src/` untouched: `git diff --stat -- src/` empty.
* `npx tsc --noEmit` clean; `npx eslint tests/coupledFarmUpkeepAudit.test.ts`
  clean; `npm run build` succeeds.
* `npx vitest run` → **35 files, 679 tests passed** (26 new audit tests;
  existing tests unchanged).
* E2E (headless): `run` 11 pass, `food` 12, `production` 12, `resource` 12,
  `temporal` 17, `road` 15, `transport` 10, `jobs` 21, `upkeep` 35 — all green.
* `AUDIT PERSISTENCE`: `SAVE_VERSION 4`, zero new persisted fields.
* `AUDIT DETERMINISM`: coupled replay hash-stable (`cf42d03bf4779c1c`).
* `AUDIT PRODUCTION_UNCHANGED`: baseline-mode harness replay byte-identical to
  `stepSimulation` over 60 ticks.
* `AUDIT UI_LEDGER`: `getMaterialUpkeepPerTick` counts Workshops only (2) vs a
  coupled total of 3; a future coupled rule would require a ledger update.

## 19. Final Scope Verdict

```text
COMPLETE — AUDIT
```
