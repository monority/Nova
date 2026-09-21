# NOVA — Step 10H — Farm Upkeep Threshold Audit

## Mission

Audit the smallest constraint proposed by Step10G:

```text
farmUpkeepDue = max(0, staffedFarms - 1)
```

Interpretation:

```text
0 staffed Farms → 0 upkeep
1 staffed Farm  → 0 upkeep
2 staffed Farms → 1 upkeep
3 staffed Farms → 2 upkeep
4 staffed Farms → 3 upkeep
```

Workshop upkeep remains:

```text
staffedWorkshops × 1 Material / tick
```

This step is **audit-only**.

Do not implement the rule.

The question is:

> Does making the first staffed Farm upkeep-free preserve the useful two-sided labor pressure while removing the bootstrap fragility identified in Step10G?

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
a3bc801 Step 10G: audit Farm upkeep stability
```

Verify:

* `src/` untouched;
* Step10G audit intact;
* current production still has no Farm upkeep;
* Workshop upkeep unchanged;
* SAVE_VERSION remains 4.

Do not modify production code.

---

# 2. Candidate rule

Model only in the audit harness:

```text
farmUpkeepDue = max(0, staffedFarms - 1)
```

Exact candidate economics:

```text
Farm:
  +2 Food
  -0 Material for first staffed Farm
  -1 Material for each additional staffed Farm

Workshop:
  +2 Material
  -1 Material upkeep
```

Therefore:

```text
Farm upkeep = max(0, F - 1)
Workshop upkeep = W

Net Material = W - max(0, F - 1)
```

Do not assume this formula is correct until experimentally verified.

---

# 3. Baseline comparison

For every experiment, compare three states:

```text
BASELINE
Current game — no Farm upkeep

CANDIDATE
Farm upkeep = max(0, F - 1)

FULL UPKEEP
Farm upkeep = F
```

The FULL UPKEEP model is the Step10G candidate.

The purpose is to demonstrate exactly what the threshold changes.

Do not modify the actual simulation.

---

# 4. 60-tick matrix

Run 60-tick simulations with:

```text
1F + 0W
1F + 1W
2F + 1W
2F + 2W
3F + 2W
3F + 3W
4F + 3W
4F + 4W
```

Start with:

```text
Material = 10
Food = 1000
```

Record:

```text
tick
staffed farms
staffed workshops
Farm upkeep
Workshop upkeep
total upkeep
Material
Food
Food production
Material production
```

Classify:

```text
STABLE
GROWING
MARGINALLY_STABLE
COLLAPSING
BOOM_BUST
```

Use the same definitions as Step10G.

---

# 5. Mathematical threshold verification

Verify experimentally:

```text
F = 0 → farm upkeep 0
F = 1 → farm upkeep 0
F = 2 → farm upkeep 1
F = 3 → farm upkeep 2
F = 4 → farm upkeep 3
```

Then determine:

```text
net Material = W - max(0, F - 1)
```

for the complete tested matrix.

Specifically determine whether:

```text
W >= F
```

is still sufficient for positive accumulation.

Also determine whether:

```text
W = F - 1
```

becomes the new equilibrium boundary.

---

# 6. Bootstrap experiment

Run the real early-colony sequence.

Track:

```text
tick
population
residences
farms
workshops
staffed farms
staffed workshops
Food
Material
construction
```

Compare:

```text
baseline
full Farm upkeep
threshold Farm upkeep
```

Answer:

1. Can the first Farm be built?
2. Can it be staffed?
3. Can the first Workshop be built?
4. Can Farm + Workshop coexist sustainably?
5. Can the colony accumulate toward another Workshop?
6. Can the colony accumulate toward another Farm?
7. Does the candidate avoid the Step10G bootstrap trap?

---

# 7. First-Farm invariance

The central hypothesis is:

> The first Farm should behave exactly as it does today from a Material-upkeep perspective.

Verify:

```text
1 staffed Farm
```

under:

```text
baseline
candidate
```

produces identical:

* Material trajectory;
* Food trajectory;
* staffing;
* construction availability.

Any difference here must be explained.

---

# 8. Second-Farm pressure

Then add a second staffed Farm.

Compare:

```text
1F
2F
```

under the candidate.

The intended pressure is:

```text
1F → no Farm upkeep
2F → 1 Material upkeep
3F → 2 Material upkeep
```

Determine whether the second Farm creates a real marginal Material cost.

Measure the resulting construction threshold.

---

# 9. Farm expansion pressure

Run:

```text
1F → 2F → 3F → 4F
```

while keeping Workshop count controlled.

For each additional Farm determine:

```text
marginal Food gained
marginal Material upkeep
marginal worker required
```

The objective is to determine whether additional Farms become an actual economic choice rather than free capacity.

---

# 10. Workshop expansion pressure

Run the inverse:

```text
1W → 2W → 3W → 4W
```

with controlled Farm counts.

Determine:

* Material accumulation;
* storage thresholds;
* construction timing;
* Food sustainability;
* worker competition.

Do not rebalance Workshop upkeep.

---

# 11. Food vs Material opportunity cost

Compare:

```text
1F + 1W
```

and:

```text
2F + 1W
1F + 2W
```

under the candidate.

For each measure:

```text
Food production
Material production
Farm upkeep
Workshop upkeep
net Material
Food surplus/shortage
```

Determine whether the second Farm now has a measurable opportunity cost.

---

# 12. Spatial pressure

Repeat the Step10F spatial experiment.

Use:

```text
Residence
Farm
Workshop
```

with different road distances.

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

Test:

### Farm preference

Residence is closer to Farm.

### Workshop preference

Residence is closer to Workshop.

### Equal distance

ID tie-break determines workplace.

The objective is to determine whether the candidate produces a meaningful spatial specialization pressure without introducing a new rule.

Do not change 09M.

---

# 13. Multi-colonist competition

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

* employed;
* unemployed;
* Farm workers;
* Workshop workers;
* Food;
* Material;
* upkeep.

Determine whether the candidate creates meaningful marginal choices as the settlement grows.

---

# 14. Construction feedback

Test:

```text
Farm
→ Food
→ population
→ worker
→ Workshop
→ Material
→ additional Farm
```

and:

```text
Workshop
→ Material
→ Farm
→ Food
→ population
→ worker
```

Determine whether the threshold rule produces:

* a stable growth loop;
* a one-way Farm → Workshop dependency;
* a Workshop → Farm dependency;
* or mutually reinforcing growth.

Do not introduce new dependencies.

---

# 15. 60-tick expansion test

Run a longer controlled test:

```text
120 ticks
```

for:

```text
1F + 1W
2F + 2W
3F + 3W
4F + 4W
```

Starting Material:

```text
10
```

Record every construction event.

Determine whether the candidate colony:

```text
accumulates
stalls
oscillates
```

around the 25 Material construction threshold.

This is important because the 60-tick Step10G experiment showed that equilibrium alone does not tell the whole story: the construction phase occurs before upkeep.

---

# 16. 24/25 crest behavior

Explicitly reproduce:

```text
Material = 24
```

with:

```text
2F + 2W
```

under the candidate.

Verify whether:

1. production occurs;
2. construction sees the pre-upkeep Material;
3. a 25-cost building can be constructed;
4. upkeep then reduces the remaining Material;
5. the colony continues or becomes trapped.

Repeat for:

```text
3F + 3W
```

and:

```text
2F + 3W
```

Do not alter phase ordering.

---

# 17. Recovery

Test:

```text
Material = 0
```

with:

```text
1F + 1W
2F + 2W
3F + 2W
2F + 3W
```

Determine whether the candidate can recover naturally.

Expected question:

```text
Does W > F restore positive Material flow?
```

Verify rather than assume.

Also test:

```text
W = F
```

and:

```text
W < F
```

to identify the actual recovery boundary.

---

# 18. Death spiral / terminal state

Repeat the Step10G terminal-state analysis.

Determine whether:

```text
W <= F - 1
```

creates a permanent Material trap.

Then determine whether the player can escape through existing actions:

* changing employment through existing topology;
* constructing another Workshop;
* constructing another Farm;
* waiting.

No new commands.

No priority system.

No demolition.

---

# 19. UI information audit

Because this remains hypothetical, do not modify UI.

Determine whether current UI could explain:

```text
Farm count
Workshop count
worker allocation
Material pressure
```

if the rule were eventually implemented.

Specifically record whether the existing HUD can distinguish:

```text
Farm upkeep
Workshop upkeep
```

or whether the ledger would need a future update.

This is a future UX finding, not implementation work.

---

# 20. Candidate classification

Classify the threshold rule exactly one:

### A — Valid candidate

Removes bootstrap fragility while preserving meaningful marginal Farm pressure.

### B — Valid but requires another constraint

Useful pressure exists, but another causal rule is needed before implementation.

### C — Insufficient

The threshold eliminates too much of the intended economic pressure.

### D — Pathological

The threshold still creates structural instability or irreversible traps.

Support the classification with measurements.

---

# 21. Design decision

If classification is:

```text
A
```

then conclude:

```text
CANDIDATE VALIDATED — IMPLEMENTATION MAY BE PROPOSED
```

and specify the exact implementation contract.

If:

```text
B
```

identify the smallest missing constraint.

If:

```text
C
```

reject the threshold.

If:

```text
D
```

reject the whole Farm-upkeep direction.

Do not implement anything in 10H.

---

# 22. Implementation contract if validated

Only if A, document the future implementation precisely:

```text
farmUpkeepDue = max(0, staffedFarms - 1)
```

Expected phase:

```text
phase 8b upkeepBuildings
```

Expected transaction:

```text
Material -= min(Material, farmUpkeepDue)
```

Do not actually add it.

Specify required regression tests:

* first Farm remains upkeep-free;
* second Farm costs 1;
* third Farm costs 2;
* Workshop upkeep unchanged;
* no negative Material;
* construction-before-upkeep crest preserved;
* save/hash unchanged;
* deterministic replay;
* bootstrap;
* 60/120 tick stability.

---

# 23. Tests

Create:

```text
tests/farmUpkeepThresholdAudit.test.ts
```

Audit-only.

Minimum coverage:

* formula;
* baseline/full-upkeep/candidate comparison;
* 60-tick matrix;
* bootstrap;
* first-Farm invariance;
* second-Farm marginal cost;
* spatial preference;
* multi-colonist competition;
* 120-tick expansion;
* 24/25 crest;
* recovery;
* terminal state;
* determinism.

Do not modify production tests to accommodate hypothetical behavior.

---

# 24. Existing verification

Run all existing suites:

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

They must remain green because `src/` is unchanged.

Also run:

```text
lint
typecheck
build
```

---

# 25. Persistence / determinism

Confirm:

```text
SAVE_VERSION = 4
```

No production state changes.

No new persisted fields.

No new hash fields.

Current save/load and deterministic replay remain identical.

---

# 26. Documentation

Create:

```text
docs/roadmap/Step10H.md
```

Preserve this prompt completely.

Append:

```text
# As-Built / Audit Report
```

Required sections:

```text
1. Repository State
2. Candidate Formula
3. Baseline Comparison
4. 60-Tick Matrix
5. Mathematical Threshold
6. Bootstrap
7. First-Farm Invariance
8. Second-Farm Pressure
9. Farm Expansion
10. Workshop Expansion
11. Labor Opportunity Cost
12. Spatial Pressure
13. Multi-Colonist Competition
14. Construction Feedback
15. 120-Tick Expansion
16. 24/25 Crest
17. Recovery
18. Terminal State
19. UI Audit
20. Classification
21. Implementation Contract
22. Verification
23. Final Design Decision
```

Use actual measurements.

---

# 27. Scope restrictions

Do NOT modify:

```text
src/
```

Do NOT implement:

* Farm upkeep;
* generic workplace upkeep;
* new resources;
* new needs;
* money;
* wages;
* productivity modifiers;
* job priorities;
* global optimization;
* new transport rules;
* road upkeep;
* population rules;
* construction costs;
* storage capacity;
* tick ordering.

---

# 28. Commit discipline

Before completion:

```text
git diff -- src/
git status
```

Expected:

```text
src/ = unchanged
```

Allowed files:

```text
tests/farmUpkeepThresholdAudit.test.ts
docs/roadmap/Step10H.md
```

Commit:

```text
Step 10H: audit Farm upkeep threshold
```

---

# 29. Final report

Return:

## Repository

* starting commit;
* final commit;
* files changed;
* confirmation `src/` untouched.

## Formula

```text
farmUpkeepDue = max(0, staffedFarms - 1)
```

## Stability

60-tick and 120-tick results.

## Threshold

Minimum Workshop count required to support:

```text
1 / 2 / 3 / 4 Farms
```

under the candidate.

## Bootstrap

Whether the first Farm remains safe.

## Marginal pressure

Whether each additional Farm creates real Material cost.

## Spatial pressure

Whether 09M becomes economically meaningful.

## Recovery

Whether shortages remain recoverable.

## Terminal states

Whether any irreversible traps remain.

## Classification

Exactly one:

```text
A — Valid candidate
B — Valid but requires another constraint
C — Insufficient
D — Pathological
```

## Design decision

If A:

```text
CANDIDATE VALIDATED — IMPLEMENTATION MAY BE PROPOSED
```

Otherwise explain the smallest required design change.

## Scope verdict

Return exactly:

```text
COMPLETE — AUDIT
```

The purpose of 10H is to determine whether **one upkeep-free Farm is a principled threshold**, rather than simply a patch for the bootstrap problem discovered in 10G.



---

# As-Built / Audit Report

**Type: AUDIT. No production rule was changed.** `src/` is byte-identical to
Step 10G (`git diff -- src/` empty; `git status` shows only this file and
`tests/farmUpkeepThresholdAudit.test.ts`). Every number below is a real
`AUDIT ...` line from that suite; re-run with

```text
npx vitest run tests/farmUpkeepThresholdAudit.test.ts --reporter=verbose
```

Three upkeep models are compared on identical canonical states:

```text
BASELINE   farmUpkeepDue = 0
CANDIDATE  farmUpkeepDue = max(0, staffedFarms - 1)     (the threshold)
FULL       farmUpkeepDue = staffedFarms                  (Step 10G candidate)
```

All models are implemented only inside the test (`stepWithMetrics`), inserted
at the existing phase 8b as a combined clamp `paid = min(stock, W + farmDue)`.
With `mode = 'baseline'` the harness is byte-identical to `stepSimulation`
(`AUDIT HARNESS_FIDELITY`), and the combined clamp equals the sequential
Workshop-then-Farm clamp (`AUDIT CLAMP_EQUIVALENCE`). Worlds are the Step 10G
flat rows: Residences `y=0`, workplaces `y=2`, one road row `y=1`; Material 10,
Food 1000 unless stated.

## 1. Repository State

* starting commit `a3bc801` (Step 10G), audit intact;
* `src/` untouched (`git diff -- src/` empty);
* production still has **no** Farm upkeep (`materialUpkeepDueForTick` counts
  staffed Workshops only);
* Workshop upkeep unchanged (`1` per staffed operational Workshop);
* `SAVE_VERSION = 4`.

## 2. Candidate Formula

```text
farmUpkeepDue = max(0, staffedFarms - 1)
```

`AUDIT FARM_UPKEEP_LADDER`:

| F | farmUpkeepDue |
| ---: | ---: |
| 0 | 0 |
| 1 | 0 |
| 2 | 1 |
| 3 | 2 |
| 4 | 3 |

`AUDIT FORMULA_VERIFICATION` confirms, for the whole 8-row matrix,
`farmUpkeepDue = max(0, F-1)` and
`net = W - max(0, F - 1)` to the unit.

## 3. Baseline Comparison

Net Material per tick for the 60-tick matrix:

| Scenario | BASELINE net | CANDIDATE net | FULL net |
| --- | ---: | ---: | ---: |
| 1F+0W | 0 | **0** | −1 |
| 1F+1W | +1 | **+1** | 0 |
| 2F+1W | +1 | **0** | −1 |
| 2F+2W | +2 | **+1** | 0 |
| 3F+2W | +2 | **0** | −1 |
| 3F+3W | +3 | **+1** | 0 |
| 4F+3W | +3 | **0** | −1 |
| 4F+4W | +4 | **+1** | 0 |

The candidate sits exactly between baseline (Farm free) and full upkeep (Farm
fully taxed): it removes the `F = 1` tax entirely and charges `1` for every
Farm beyond the first.

## 4. 60-Tick Matrix

`AUDIT MATRIX_60_TICK` — candidate, 60 ticks, zero Food-shortage ticks in all
8 scenarios and all 3 models:

| Scenario | pop | F | W | gross Mat | farm upkeep | workshop upkeep | total | net | Mat end | class |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1F+0W | 1 | 1 | 0 | 0 | 0 | 0 | 0 | **0** | 10 | MARGINALLY_STABLE |
| 1F+1W | 2 | 1 | 1 | 2 | 0 | 1 | 1 | **+1** | 24 | GROWING |
| 2F+1W | 3 | 2 | 1 | 2 | 1 | 1 | 2 | **0** | 10 | MARGINALLY_STABLE |
| 2F+2W | 4 | 2 | 2 | 4 | 1 | 2 | 3 | **+1** | 47 | GROWING |
| 3F+2W | 5 | 3 | 2 | 4 | 2 | 2 | 4 | **0** | 10 | MARGINALLY_STABLE |
| 3F+3W | 6 | 3 | 3 | 6 | 2 | 3 | 5 | **+1** | 70 | GROWING |
| 4F+3W | 7 | 4 | 3 | 6 | 3 | 3 | 6 | **0** | 10 | MARGINALLY_STABLE |
| 4F+4W | 8 | 4 | 4 | 8 | 3 | 4 | 7 | **+1** | 70 | GROWING |

`AUDIT ACCUMULATION_BOUNDARY` makes the pattern exact:

```text
W >= F  -> net >= +1 -> GROWING
W = F-1 -> net = 0   -> MARGINALLY_STABLE
W < F-1 -> net < 0   -> MARGINALLY_STABLE (drains to 0)
```

Under the FULL model every `W = F` row was `MARGINALLY_STABLE`; under the
threshold every `W = F` row is `GROWING` (except `W = F = 0`). The Step 10G
regressions (`1F+1W`, `2F+2W`, `3F+3W`, `4F+4W`) are all repaired.

## 5. Mathematical Threshold

Verified (`AUDIT FORMULA_VERIFICATION`, `AUDIT ACCUMULATION_BOUNDARY`):

```text
F = 0 -> 0    F = 1 -> 0    F = 2 -> 1    F = 3 -> 2    F = 4 -> 3
net Material = W - max(0, F - 1)
```

* `W >= F` is sufficient for positive accumulation — **true**, `net >= +1`.
* `W = F - 1` becomes the **new equilibrium boundary** (net exactly 0).
* `W < F - 1` is net-negative and drains toward 0.

## 6. Bootstrap

`AUDIT BOOTSTRAP_BASELINE / _FULL / _CANDIDATE` run the real command chain
`R1 -> road -> Farm -> (wait) -> road -> Workshop -> (wait ×20) -> try R2`:

| Step | BASELINE | CANDIDATE | FULL |
| --- | ---: | ---: | ---: |
| place F1 | 45 | 45 | 45 |
| farm staffed | 45 | 45 | 44 |
| place W1 | 15 | 15 | 11 |
| after 20 drain ticks | **15** | **15** | **0** |
| try R2 | rejected | rejected | rejected |

`AUDIT BOOTSTRAP_ANSWERS`:

```text
1. First Farm built?                 yes
2. First Farm staffed?               yes
3. First Workshop built?             yes
4. Farm + Workshop coexist?          yes (the single Farm is upkeep-free)
5. Accumulate toward another Workshop? no under this 1-colonist chain (same as baseline)
6. Accumulate toward another Farm?     no under this 1-colonist chain (same as baseline)
7. Step10G bootstrap trap avoided?   YES
candidateMaterialEnd = 15 = baselineMaterialEnd ; fullMaterialEnd = 0
```

The threshold makes the single-Farm bootstrap **byte-identical to today's
baseline**: the drain to 0 disappears, and the remaining 15 < 25 dead-end is
pre-existing baseline behaviour, not introduced by the rule.
`AUDIT BOOTSTRAP_TWO_WORKSHOPS`: two Workshops reach +1/tick and 49 Material;
the first tick is a storage-clamp transient (stock 35 > capacity 25), then
steady `+1`.

## 7. First-Farm Invariance

Verified (`AUDIT FIRST_FARM_INVARIANCE_1F0W`, `_1F1W`, `AUDIT FIRST_FARM_WHY`):
`1F+0W` and `1F+1W` produce a Material, Food, staffing and construction-
availability trajectory **identical to baseline** over 60 ticks (canonical
state and hash equal). Reason: `max(0, 1 - 1) = 0`. The first Farm is exactly
as free as it is today; any difference would have been a bug.

## 8. Second-Farm Pressure

`AUDIT SECOND_FARM_MARGINAL` / `_FLIP` (1F+1W vs 2F+1W):

| | 1F+1W | 2F+1W | marginal |
| --- | ---: | ---: | ---: |
| Food production | 2 | 4 | **+2 Food** |
| Farm upkeep | 0 | 1 | **+1 Material** |
| Workers | 2 | 3 | **+1 worker** |
| net Material | +1 | 0 | **−1** |
| class | GROWING | MARGINALLY_STABLE | |

The second Farm is the first one that pays, and it flips the colony from
`+1` accumulation to a flat plateau at fixed W. The marginal cost is real,
simultaneous on Material and labor, and lands exactly on the boundary
(`W = F - 1`).

## 9. Farm Expansion

`AUDIT FARM_EXPANSION_W2` (W fixed at 2):

| F | workers | Food prod | farm upkeep | net Material |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 3 | 2 | 0 | +2 |
| 2 | 4 | 4 | 1 | +1 |
| 3 | 5 | 6 | 2 | 0 |
| 4 | 6 | 8 | 3 | −1 |

Every added Farm: **+2 Food, +1 Material upkeep, +1 worker, −1 net Material.**
Beyond `F = W + 1` extra Farms become net-negative: additional Farms are a real
economic choice, not free capacity.

## 10. Workshop Expansion

`AUDIT WORKSHOP_EXPANSION_F2` (F fixed at 2):

| W | storage | farm upkeep | workshop upkeep | net Material | Food net |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 25 | 1 | 1 | 0 | +1 |
| 2 | 50 | 1 | 2 | +1 | 0 |
| 3 | 75 | 1 | 3 | +2 | −1 |
| 4 | 100 | 1 | 4 | +3 | −2 |

Workshop expansion is the only way to raise both net Material and storage, but
Food becomes negative from `W = 3` at `F = 2`, so Material growth past that
point requires more Farms (which then need their own Workshops). Workshop
upkeep was not rebalanced.

## 11. Labor Opportunity Cost

`AUDIT OPPORTUNITY_COST`:

| Config | Food prod | Material prod | farm upkeep | workshop upkeep | net Material | Food net |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1F+1W | 2 | 2 | 0 | 1 | **+1** | 0 |
| 2F+1W | 4 | 2 | 1 | 1 | **0** | +1 |
| 1F+2W | 2 | 4 | 0 | 2 | **+2** | −1 |

The second Farm has a measurable opportunity cost: it converts a `+1` Material
colony into a `0` Material colony while adding `+1` Food surplus. The first
Farm is still free, so the early Food-vs-Material fork is unchanged from
baseline; the pressure begins at the **second** Farm.

## 12. Spatial Pressure

`AUDIT SPATIAL_PRESSURE` — identical buildings/roads, only the Residence moves:

| Case | staffed | Food prod | Material prod | farm upkeep | workshop upkeep | Food end | Material end | starvation |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Farm preference | Farm | 2 | 0 | **0** | 0 | 70 | 20 | no |
| Workshop preference | Workshop | 0 | 2 | 0 | **1** | 0 | 24 | **yes** |
| Equal distance, Farm first (id) | Farm | 2 | 0 | **0** | 0 | — | — | no |
| Equal distance, Workshop first (id) | Workshop | 0 | 2 | 0 | **1** | — | — | yes |

09M remains unchanged, but the threshold makes the spatial choice consequential
in two ways at once: it still decides Food survival vs Material, and the
equal-distance **id tie-break now also decides whether the colony pays 0 or 1
Material** (the first staffed Farm is free, a staffed Workshop is not). The
spatial lever is economically meaningful without any new rule.

## 13. Multi-Colonist Competition

`AUDIT MULTI_COLONIST`:

| Scenario | employed | unemployed | farm workers | workshop workers | farm upkeep | workshop upkeep | net Material |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2c 1F+1W | 2 | 0 | 1 | 1 | 0 | 1 | +1 |
| 3c 2F+1W | 3 | 0 | 2 | 1 | 1 | 1 | 0 |
| 3c 1F+2W | 3 | 0 | 1 | 2 | 0 | 2 | +2 |
| 4c 2F+2W | 4 | 0 | 2 | 2 | 1 | 2 | +1 |
| 5c 3F+2W | 5 | 0 | 3 | 2 | 2 | 2 | 0 |

The marginal choices grow with the settlement: every additional Farm worker
buys `+2 Food` at `−1 net Material`, every additional Workshop worker buys
`+2 Material` at `−1 net Material` (upkeep) plus storage. The threshold keeps
the two types genuinely comparable without type priority.

## 14. Construction Feedback

`AUDIT LOOP_FARM_TO_WORKSHOP` / `LOOP_WORKSHOP_TO_FARM` / `FARM_CEILING_W1`:

```text
1W alone:            net +1, Food net −1   (starves unless Food is buffered)
1W + free Farm:      net +1, Food net  0   (Farm fixes Food at no Material cost)
1W + F Farms:        F=1 net +1, F=2 net 0, F=3 net −1, F=4 net −2
```

* `Farm -> Food -> population -> worker -> Workshop -> Material` **closes**:
  the free first Farm removes the Food bottleneck without taxing Material.
* `Workshop -> Material -> more Farms` is **one-way bounded**: each extra Farm
  beyond `W` is net-negative, so Material cannot be converted into unbounded
  Food. The dependency direction is `Farm needs Workshop`, not the reverse.

## 15. 120-Tick Expansion

`AUDIT EXPANSION_120_TICK` (Material 10, Food 4000, no commands):

| Config | net/tick | first crest ≥ 25 | Mat end | crest end | storage | class |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1F+1W | +1 | tick 13 | 24 | 25 | 25 | GROWING |
| 2F+2W | +1 | tick 11 | 47 | 50 | 50 | GROWING |
| 3F+3W | +1 | tick 9 | 70 | 75 | 75 | GROWING |
| 4F+4W | +1 | tick 7 | 93 | 100 | 100 | GROWING |

All `W = F` configurations **accumulate** (no stall, no oscillation) and reach
the 25 construction crest. `AUDIT EXPANSION_120_MODELS_2F2W`: baseline crests
at tick 6 (end 48), candidate at tick 11 (end 47), FULL never crests (end 10).

## 16. 24/25 Crest

`AUDIT CREST_24_25` — Material 24, candidate:

| Config | production | crest | upkeep | rest after upkeep | timed build |
| --- | ---: | ---: | ---: | ---: | --- |
| 2F+2W | 4 | 28 | 3 | **25** | **accepted** |
| 3F+3W | 6 | 30 | 5 | **25** | **accepted** |
| 2F+3W | 6 | 30 | 4 | **26** | **accepted** |

Phase order is untouched: production fills the stock, phase 8a (`applyCommand`)
sees the crest and accepts the 25-cost building, then phase 8b charges upkeep.
At `W = F` the threshold now rests at the 25 threshold and can convert it,
which the FULL model could not do.

## 17. Recovery

`AUDIT RECOVERY_FROM_ZERO` (Material 0, 60 ticks):

| Config | W | F | net/tick | Mat end | recovered |
| --- | ---: | ---: | ---: | ---: | --- |
| 1F+1W | 1 | 1 | +1 | 24 | **yes** |
| 2F+2W | 2 | 2 | +1 | 47 | **yes** |
| 2F+3W | 3 | 2 | +2 | 71 | **yes** |
| 3F+2W | 2 | 3 | 0 | 0 | no |
| 3F+1W | 1 | 3 | −1 | 0 | no |

Recovery boundary is exactly `W >= F`. The Step 10G recovery failure
(`2F+2W` stuck at 0) is repaired.

## 18. Terminal State

`AUDIT TERMINAL_SMALL` (240 ticks from Material 0):

```text
F2W1  net 0  Mat end 0  crest 2  escaped false
F3W2  net 0  Mat end 0  crest 4  escaped false
F4W3  net 0  Mat end 0  crest 6  escaped false
```

`W <= F - 1` at Material 0 is a **permanent Material trap** for small colonies:
net 0, capacity retained, no accumulation. `AUDIT TERMINAL_LARGE_CREST` bounds
it — the crest from 0 is `2W`, so:

```text
W = 12, F = 13 -> crest 24 -> not buildable  (terminal)
W = 13, F = 14 -> crest 26 -> buildable      (escapes via the 8a crest)
```

`AUDIT TERMINAL_PLAYER_ACTION`: at `2F+1W` (Material 0) a 25-cost Workshop is
rejected, and only `placeBuilding` / `placeRoads` exist — **no demolish, no
unassign**. For `W <= 12` the trap is irreversible with existing player
actions.

Residual trap band versus Step 10G:

```text
BASELINE   net = W            -> no terminal Material trap
CANDIDATE  net = W - max(0,F-1) -> trap only at W <= F-1 (small W)
FULL       net = W - F        -> trap at W <= F
```

The threshold narrows the trap by exactly one Workshop per Farm and confines
the remaining terminal states to `W <= 12`, but does **not** eliminate them.

## 19. UI Audit

`AUDIT UI_INFORMATION` (no UI changed):

```text
getMaterialUpkeepPerTick(state) = 2          (staffed Workshops only)
candidate farmUpkeep            = 1
candidate workshopUpkeep        = 2
candidate totalUpkeep           = 3
getNetMaterialPerTick(state)    = 2          (under-reports by the Farm tax)
Farm inspection keys: id,type,status,cell,constructionRemaining,
                      constructionDuration,housingCapacity,occupiedHousing
Farm inspection has an upkeep field: false
```

The current ledger (`materialUpkeep`, `netMaterial`, the per-building
inspector) is Workshop-scoped. If Farm upkeep were ever implemented, the HUD
would need a distinct Farm-upkeep line (and the per-building Farm panel would
need to explain `max(0, F-1)`), otherwise the displayed net would silently
over-state income. This is a future UX finding only.

## 20. Classification

Evidence:

* **First Farm invariance:** byte-identical to baseline (§7).
* **Bootstrap:** identical to baseline; Step 10G trap removed (§6).
* **Marginal pressure:** each additional Farm costs `1` Material and `1` worker
  and `−1` net Material (§8, §9, §13).
* **Regressions repaired:** `1F+1W`, `2F+2W`, `3F+3W`, `4F+4W` all GROWING
  again; FULL left them MARGINALLY_STABLE (§4, §15).
* **Residual trap:** `W = F - 1` at Material 0 is terminal for `W <= 12`, with
  no existing player escape (§18).

The threshold does what it was proposed to do and preserves the intended
pressure, but it shifts the trap boundary rather than removing it, so a further
constraint is required before it is safe.

### Classification: **B — Valid but requires another constraint**

## 21. Implementation Contract

Not applicable as written — classification is **B**, so the rule must not be
implemented yet. (For the record, if it ever were: phase `8b`
`upkeepBuildings`, transaction `Material -= min(Material, W + max(0, F - 1))`,
no new state; regression tests would be first-Farm-free, second-Farm-1,
third-Farm-2, Workshop unchanged, no negative Material, crest preserved,
save/hash unchanged, deterministic replay, bootstrap, 60/120-tick.)

**Smallest missing constraint** (to be audited in a future step, not
implemented here): cap the Farm tax by the Workshop surplus above the first
Workshop:

```text
farmUpkeepDue = min( max(0, staffedFarms - 1), max(0, staffedWorkshops - 1) )
```

This preserves the threshold’s marginal pressure while guaranteeing
`net >= +1` for every configuration:

```text
W >= F -> farmDue = F-1        -> net = W - (F-1) >= 1
W <  F -> farmDue = max(0,W-1) -> net = W - (W-1)  = 1
```

so no `W = F - 1` terminal state remains. It is the same idea as the
first-Farm exemption, applied to the first Workshop’s output.

## 22. Verification

* `src/` untouched: `git diff --stat -- src/` empty.
* `npx tsc --noEmit` clean; `npx eslint tests/farmUpkeepThresholdAudit.test.ts`
  clean; `npm run build` succeeds.
* `npx vitest run` → **34 files, 653 tests passed** (32 new audit tests;
  existing tests not modified to accommodate hypothetical behavior).
* E2E (headless): `run` 11 pass, `food` 12, `production` 12, `resource` 12,
  `temporal` 17, `road` 15, `transport` 10, `jobs` 21, `upkeep` 35 — all green
  (production unchanged, `src/` untouched).
* `AUDIT PERSISTENCE`: `SAVE_VERSION 4`, zero new persisted fields.
* `AUDIT DETERMINISM`: candidate replay hash-stable (`4f78e84d3598a3cc`).
* `AUDIT PRODUCTION_UNCHANGED`: baseline-mode harness replay is byte-identical
  to `stepSimulation` over 60 ticks.

## 23. Final Design Decision

```text
CANDIDATE REQUIRES ANOTHER CONSTRAINT
```

One upkeep-free Farm is a **principled** threshold: it is
baseline-identical for the first Farm, it is not a mere patch for the Step 10G
bootstrap (it also repairs the `W = F` mid-game regressions), and it makes
every additional Farm a real Material/labor decision. It is not yet
**sufficient**: the boundary simply moved from `W <= F` to `W <= F - 1`, and
small colonies at `W = F - 1` with Material 0 remain irreversibly trapped. The
smallest fix is the workshop-capped Farm tax given in §21.

## Scope verdict

```text
COMPLETE — AUDIT
```
