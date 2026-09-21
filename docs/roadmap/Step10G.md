# NOVA — Step 10G — Farm Upkeep Stability Audit

## Mission

Audit the candidate rule discovered in Step 10F:

```text
staffed Farm
→ 1 Material upkeep / tick
```

Current Workshop rule:

```text
staffed Workshop
→ 1 Material upkeep / tick
```

The proposed change would therefore make upkeep symmetric across staffed productive workplaces.

**This step is audit-only.**

Do NOT implement the Farm upkeep rule.

The central question is:

> Does symmetric staffed-workplace upkeep create a healthier and more meaningful economic constraint, or does it create a pathological Material starvation/death spiral?

---

# 1. Repository verification

Start with:

```text
git status
git log -3 --oneline
```

Expected latest commit:

```text
07e76b9
```

Verify:

* Step10E remains implemented;
* Step10F remains audit-only;
* `src/` is clean;
* current Workshop upkeep is unchanged;
* Farm currently has no upkeep.

Do not trust the Step10F report without checking the actual code.

---

# 2. Freeze the current baseline

Before testing the candidate, reproduce the current baseline.

Record:

```text
Material starting stock
Food starting stock
construction cost
Workshop upkeep
Farm upkeep
Workshop production
Farm production
Material storage capacity
```

Confirm the known equilibrium:

```text
1 staffed Workshop
→ +2 Material
→ -1 upkeep
→ +1 gross stock/tick
```

But because storage is:

```text
25
```

and upkeep occurs after production, the colony stabilizes at:

```text
24 Material
```

and cannot independently reach the next:

```text
25 Material construction cost
```

Reproduce this experimentally.

---

# 3. Candidate rule

Model the proposed rule **inside audit calculations/tests only**.

Do not modify production code.

Candidate:

```text
staffed Farm
→ -1 Material upkeep / tick
```

Everything else remains unchanged:

```text
Farm production = +2 Food
Workshop production = +2 Material
Food need = population × 1
Workshop upkeep = -1 Material / staffed Workshop
Farm upkeep = -1 Material / staffed Farm
```

No new persisted state.

No new resource.

No new job system.

No balancing change.

---

# 4. Core stability experiment

This is mandatory.

Create a controlled 60-tick simulation experiment for each of:

```text
1 Farm + 0 Workshop
1 Farm + 1 Workshop
2 Farms + 1 Workshop
1 Farm + 2 Workshops
2 Farms + 2 Workshops
3 Farms + 2 Workshops
2 Farms + 3 Workshops
```

For each scenario record every tick:

```text
tick
colonists
staffed farms
staffed workshops
Food
Material
Food production
Material production
Farm upkeep
Workshop upkeep
total upkeep
construction availability
Food shortage
population
```

The experiment must explicitly distinguish:

```text
production
→ upkeep
→ construction
→ next tick
```

---

# 5. 60-tick stability classification

For each scenario classify the trajectory as exactly one:

### STABLE

Material remains non-negative and the colony reaches a bounded equilibrium without losing productive capacity.

### GROWING

Material remains sustainable and the colony can repeatedly accumulate enough stock to construct additional productive capacity.

### MARGINALLY STABLE

Material remains non-negative but the colony becomes trapped near a construction threshold.

### COLLAPSING

Material reaches zero and productive capacity is progressively lost because upkeep cannot be sustained.

### BOOM/BUST

Material accumulation allows expansion, followed by repeated starvation of productive capacity.

Do not use subjective wording.

Use measured trajectories.

---

# 6. The critical 24/25 experiment

This is the most important test.

Reproduce:

```text
1 staffed Workshop
```

under the current rule.

Then model:

```text
1 staffed Farm
+ 1 staffed Workshop
```

under the candidate Farm upkeep.

Expected gross Material:

```text
Workshop +2
```

Expected total upkeep:

```text
Farm 1
Workshop 1
= 2
```

Therefore:

```text
net Material = 0/tick
```

Determine whether this creates:

```text
permanent Material equilibrium
```

and at what stock level.

Then test:

```text
2 staffed Workshops
+ 1 staffed Farm
```

and:

```text
2 staffed Workshops
+ 2 staffed Farms
```

Determine the minimum productive workplace configuration that allows:

```text
Material accumulation
```

rather than mere maintenance.

---

# 7. Construction stability

Test whether the candidate rule changes the ability to construct:

```text
Residence
Farm
Workshop
```

Measure:

```text
time-to-25 Material
time-to-next-Workshop
time-to-next-Farm
time-to-next-Residence
```

for representative configurations.

Pay particular attention to:

```text
1W
1F+1W
1F+2W
2F+2W
```

Determine whether Farm upkeep causes the economy to become permanently unable to expand.

---

# 8. Bootstrap experiment

Run the earliest settlement sequence under the candidate rule.

Track:

```text
tick
population
Residence count
Farm count
Workshop count
staffing
Food
Material
construction
```

Answer:

1. Can the first Farm be built?
2. Can it become staffed?
3. Can the first Workshop still be built?
4. Can the colony maintain both?
5. Can it eventually build another Workshop?
6. Can it eventually build another Farm?
7. Does the candidate rule create a dead-end before the economy has enough productive capacity?

Do not alter bootstrap values.

---

# 9. Food starvation interaction

The candidate rule consumes Material, not Food.

Test whether this indirect dependency creates a new loop:

```text
Farm
→ Food
→ population survival
→ worker availability
→ Workshop
→ Material
→ Farm upkeep
```

Construct a low-Food scenario and a low-Material scenario.

Measure whether either resource can trigger:

```text
worker loss
→ production loss
→ further resource loss
```

Determine whether this is:

* a legitimate causal loop;
* a stable feedback mechanism;
* or an unintended collapse mechanism.

Do not add recovery mechanics.

---

# 10. Worker competition under symmetric upkeep

Repeat the most important Step10F competition scenarios.

Compare:

```text
Farm staffed
vs
Workshop staffed
```

with the candidate upkeep.

The expected opportunity cost becomes:

```text
Farm:
+2 Food
-1 Material

Workshop:
+2 Material
-1 Material
```

Determine whether this makes employment genuinely two-sided.

Test:

```text
1 colonist
1 Farm
1 Workshop

2 colonists
1 Farm
1 Workshop

2 colonists
2 Farms
1 Workshop

2 colonists
1 Farm
2 Workshops
```

Do not optimize assignments.

Use the existing 09M/10E assignment rules.

---

# 11. Spatial preference

Repeat the Step10F observation:

```text
Residence moved 2 columns
```

Determine whether the candidate upkeep amplifies the spatial choice.

Compare:

```text
Farm-selected colony
vs
Workshop-selected colony
```

for:

* Food;
* Material;
* total upkeep;
* construction capacity;
* long-term stock.

Also test equal-distance ID tie-breaking.

The objective is not to determine which choice is preferable.

The objective is to determine whether the candidate rule makes the spatial choice economically consequential.

---

# 12. One-tick Food timing

Step10F confirmed:

```text
Farm assignment
→ Food production visible with a one-tick stock timing difference
```

Repeat the timing test under the candidate upkeep.

Determine whether Material upkeep and Food production timing can interact to produce an artificial one-tick collapse.

Example:

```text
Farm becomes staffed
→ Food production timing
→ Material upkeep
→ stock transition
```

Document the exact phase order.

Do not reorder phases.

Do not fix timing in this step.

---

# 13. Expansion threshold analysis

Determine the minimum number of Workshops required to support:

```text
0 Farms
1 Farm
2 Farms
3 Farms
```

while still allowing Material accumulation.

Express the result as a simple table:

| Staffed Farms | Minimum Workshops for positive Material accumulation |
| ------------: | ---------------------------------------------------: |
|             0 |                                                    ? |
|             1 |                                                    ? |
|             2 |                                                    ? |
|             3 |                                                    ? |

Then determine the resulting worker requirements.

This should expose whether the candidate rule creates a structural:

```text
Farm → Workshop dependency
```

or merely a temporary bootstrap requirement.

---

# 14. Death spiral test

Construct an intentionally low-Material colony.

Example:

```text
Material = 1
staffed Farms = 1
staffed Workshops = 1
```

Run 60 ticks.

Then test:

```text
Material = 1
staffed Farms = 2
staffed Workshops = 1
```

and:

```text
Material = 1
staffed Farms = 1
staffed Workshops = 2
```

Observe:

* upkeep;
* worker retention;
* production;
* construction;
* population;
* recovery possibility.

Do not add an automatic shutdown rule.

Do not invent negative Material.

Use the existing upkeep clamp semantics.

---

# 15. Recovery test

A stability rule is incomplete without knowing whether the system can recover.

For every scenario that reaches:

```text
Material = 0
```

test whether the existing system can recover without external intervention.

Then test whether the player can recover by changing:

```text
employment
construction timing
workplace count
```

through existing commands.

Do not add new commands.

Do not add priority controls.

The audit must distinguish:

```text
irreversible collapse
```

from:

```text
recoverable shortage
```

---

# 16. Candidate rule classification

Classify the proposed Farm upkeep rule as exactly one:

### A — Strong candidate

Creates meaningful two-sided labor/resource pressure while remaining stable and recoverable.

### B — Viable but bootstrap-sensitive

Creates useful pressure but requires careful constraints or a later balancing step.

### C — Pathological

Creates frequent or structural economic collapse/death spirals.

### D — Insufficient

Adds accounting symmetry without creating meaningful additional decisions.

Support the classification with measurements.

---

# 17. Smallest next experiment

If the candidate is:

```text
A
```

do NOT implement it yet.

Specify the smallest implementation step required next.

That implementation step must include:

* exact rule;
* exact phase;
* exact resource transaction;
* exact tests;
* 60-tick stability regression;
* bootstrap regression;
* persistence/determinism checks.

If the candidate is:

```text
B or C
```

identify the smallest additional constraint needed to make the rule safe.

Do not implement that constraint.

If the candidate is:

```text
D
```

reject the rule and return to the roadmap dependency analysis.

---

# 18. No speculative balancing

Do NOT alter:

* Farm production;
* Workshop production;
* Food need;
* Material upkeep;
* construction costs;
* storage capacity;
* colonist capacity;
* residence capacity;
* tick order;
* job assignment;
* road rules;
* distance rules.

The audit must test the candidate **as proposed**.

---

# 19. Tests

Create:

```text
tests/farmUpkeepStabilityAudit.test.ts
```

Tests should model the candidate rule without changing production code.

Minimum coverage:

* 60-tick single-workplace;
* 60-tick mixed workplace;
* 24/25 equilibrium;
* construction threshold;
* bootstrap;
* Food interaction;
* worker competition;
* spatial preference;
* timing;
* minimum Workshop count;
* death spiral;
* recovery;
* determinism.

Do not weaken existing tests.

---

# 20. E2E

Run the existing suites:

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

No new gameplay E2E is required unless the audit harness needs one.

Confirm that the current production behavior remains unchanged because the candidate has **not been implemented**.

---

# 21. Performance

Benchmark the audit calculations separately from the real simulation.

Do not contaminate production performance measurements with a new hypothetical production rule.

If the audit harness becomes expensive, report its cost separately.

The existing 10D access-derivation residue remains a known issue and must not be "fixed" as part of 10G.

---

# 22. Persistence and determinism

Because this is audit-only:

```text
SAVE_VERSION = 4
```

must remain unchanged.

Verify:

* no new persisted state;
* no new hash fields;
* current save/load unchanged;
* current deterministic replay unchanged.

---

# 23. Documentation

Create:

```text
docs/roadmap/Step10G.md
```

Preserve the complete prompt.

Append:

```text
# As-Built / Audit Report
```

Required sections:

```text
1. Scope
2. Baseline Reproduction
3. Candidate Rule
4. 60-Tick Stability
5. 24/25 Experiment
6. Construction Stability
7. Bootstrap
8. Food Interaction
9. Worker Competition
10. Spatial Preference
11. Timing
12. Expansion Threshold
13. Death Spiral
14. Recovery
15. Candidate Classification
16. Smallest Next Experiment
17. Verification
18. Final Design Decision
```

Use actual measured trajectories.

---

# 24. Commit discipline

This remains an audit.

Allowed:

```text
tests/farmUpkeepStabilityAudit.test.ts
docs/roadmap/Step10G.md
```

Do not modify `src/`.

Before finishing:

```text
git diff -- src/
git status
```

Confirm:

```text
src/ = unchanged
```

Commit:

```text
Step 10G: audit Farm upkeep stability
```

---

# 25. Final report

Return:

## Repository

* starting commit;
* final commit;
* files changed;
* `src/` untouched.

## Candidate

```text
Farm upkeep = 1 Material / staffed Farm / tick
```

## Stability

Provide measured 60-tick results.

## Critical equilibrium

Explain exactly what happens around:

```text
24 Material
25 Material
```

under the candidate.

## Expansion

Show minimum Workshops required for:

```text
0 / 1 / 2 / 3 Farms
```

to accumulate Material.

## Death spiral

State whether one exists and under which configurations.

## Recovery

State whether shortages are recoverable using existing player actions.

## Labor pressure

State whether Farm vs Workshop becomes genuinely two-sided.

## Spatial pressure

State whether 09M distance preference gains additional economic significance.

## Classification

Choose exactly:

```text
A — Strong candidate
B — Viable but bootstrap-sensitive
C — Pathological
D — Insufficient
```

## Next step

If A:

```text
CANDIDATE VALIDATED — IMPLEMENTATION MAY BE PROPOSED
```

If B/C:

```text
CANDIDATE REQUIRES FURTHER DESIGN
```

If D:

```text
CANDIDATE REJECTED
```

## Scope verdict

Return exactly:

```text
COMPLETE — AUDIT
```

The purpose of Step10G is **not to make Farms consume Material**.

It is to determine, with a 60-tick stability experiment, whether that proposed rule is safe enough and causally useful enough to justify an eventual implementation.


---

# As-Built / Audit Report

**Type: AUDIT. No production rule was changed.** `src/` is byte-identical to
Step 10F (`git diff -- src/` is empty; `git status` shows only this file and
`tests/farmUpkeepStabilityAudit.test.ts`). Every number below is produced by
that suite and printed as `AUDIT ...` lines; re-run with

```text
npx vitest run tests/farmUpkeepStabilityAudit.test.ts --reporter=verbose
```

The candidate rule was **modelled inside the test file**, never in `src/`,
by `stepWithMetrics` — an exact mirror of `stepSimulation` that inserts the
Farm upkeep at phase 8b as a combined clamp:

```text
due  = staffed Workshops + staffed Farms
paid = min(stock, due)
```

Two facts make this faithful:

* with the candidate disabled, `stepWithMetrics` is **byte-identical** to
  `stepSimulation` for 4 audited worlds × 25 ticks (`AUDIT HARNESS_FIDELITY`);
* `min(stock,a) + min(stock-min(stock,a),b) === min(stock,a+b)`, so a
  sequential Workshop-then-Farm deduction is numerically identical
  (`AUDIT CLAMP_EQUIVALENCE`). Deduction order cannot change the audit.

Audit worlds use wide flat rows: Residences on `y = 0`, workplaces on `y = 2`,
one operational road row `y = 1`, so every Residence is mobility-connected to
every workplace and its own-column workplace is at road distance 0. Core
60-tick runs start from **Material 10, Food 1000** so Material dynamics are
visible and the Food rule does not confound them.

## 1. Scope

Audit of the candidate rule discovered in Step 10F:

```text
staffed operational Farm -> 1 Material upkeep / tick
```

Central question: **does symmetric staffed-workplace upkeep create a healthier,
more meaningful economic constraint, or a pathological Material starvation /
death spiral?**

Out of scope (verified untouched): Farm/Workshop production, Food need,
Workshop upkeep, construction costs, storage, capacities, tick order, job
assignment, road rules, distance rules, save format. No `src/` file modified,
no persisted state added, no new command.

## 2. Baseline Reproduction

Constants re-read from `src` (not from the Step 10F report):

| Rule | Value | Source |
| --- | --- | --- |
| Material storage | `25` per operational Workshop | `MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP` |
| Workshop upkeep | `1` per staffed operational Workshop | `MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK` |
| Farm production | `+2 Food` per staffed operational Farm | `FOOD_PER_FARM_PER_TICK` |
| Workshop production | `+2 Material` per road-connected staffed worker | `MATERIAL_PER_WORKER_PER_TICK` |
| Build cost | `25` (Residence/Farm/Workshop), `2` ticks | `BUILDING_CATALOG` |
| Farm upkeep | **absent** | `materialUpkeepDueForTick` counts Workshops only |

`AUDIT CONSTANTS` → `{"materialStorage":25,"workshopUpkeep":1,"foodPerFarm":2,"materialPerWorker":2}`.

Baseline 1-staffed-Workshop equilibrium reproduced exactly
(`AUDIT BASELINE_ONE_WORKSHOP`):

```text
gross +2, upkeep 1, net +1/tick, capacity 25
tick20 = 20, tick24 = 24, tick40 = 24, canAfford25AtRest = false
```

A staffed Farm currently costs zero Material
(`AUDIT BASELINE_FARM_UPKEEP_ZERO`): `materialStart 10 -> materialAfter30 10`.

## 3. Candidate Rule

```text
staffed operational Farm -> 1 Material upkeep / tick   (audit model only)
```

No new persisted state, no new resource, no new job system, no coefficient
change. The candidate was inserted at the **exact phase** the Workshop upkeep
occupies (step.ts phase 8b, after `produceMaterial` and the player transaction,
before `advanceTime`), with the existing partial clamp: `paid = min(stock, due)`,
never negative, no deactivation, no debt.

The resulting identity, verified in every scenario, is:

```text
net Material / tick = 2 x staffed Workshops - staffed Workshops - staffed Farms
                    = staffed Workshops - staffed Farms
```

(while below the storage cap; near the cap the storage clamp reduces stored
production and the arithmetic is tighter — see §5).

## 4. 60-Tick Stability

`AUDIT CORE_60_TICK` — candidate ON, Material start 10, Food 1000, 60 ticks,
zero Food-shortage ticks in every scenario:

| Scenario | pop | staffed F | staffed W | gross Mat | total upkeep | net Mat | Mat end | storage | classification |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1F+0W | 1 | 1 | 0 | 0 | 1 | **−1** | 0 | 0 | MARGINALLY_STABLE |
| 1F+1W | 2 | 1 | 1 | 2 | 2 | **0** | 10 | 25 | MARGINALLY_STABLE |
| 2F+1W | 3 | 2 | 1 | 2 | 3 | **−1** | 0 | 25 | MARGINALLY_STABLE |
| 1F+2W | 3 | 1 | 2 | 4 | 3 | **+1** | 47 | 50 | GROWING |
| 2F+2W | 4 | 2 | 2 | 4 | 4 | **0** | 10 | 50 | MARGINALLY_STABLE |
| 3F+2W | 5 | 3 | 2 | 4 | 5 | **−1** | 0 | 50 | MARGINALLY_STABLE |
| 2F+3W | 5 | 2 | 3 | 6 | 5 | **+1** | 70 | 75 | GROWING |

Classification comparison against the current rule
(`AUDIT CLASSIFICATION_COMPARISON`):

| Scenario | Baseline class (Mat end) | Candidate class (Mat end) |
| --- | --- | --- |
| 1F+0W | MARGINALLY_STABLE (10) | MARGINALLY_STABLE (0) |
| 1F+1W | MARGINALLY_STABLE (24) | MARGINALLY_STABLE (10) |
| 2F+1W | MARGINALLY_STABLE (24) | MARGINALLY_STABLE (0) |
| 1F+2W | GROWING (48) | GROWING (47) |
| **2F+2W** | **GROWING (48)** | **MARGINALLY_STABLE (10)** |
| **3F+2W** | **GROWING (48)** | **MARGINALLY_STABLE (0)** |
| 2F+3W | GROWING (72) | GROWING (70) |

The candidate never drives Material negative in any 60-tick run
(`AUDIT NO_NEGATIVE_MATERIAL`). No scenario `COLLAPSING`, none `BOOM/BUST`.

Findings:

* the candidate converts every **`Workshops <= Farms`** configuration into a
  non-accumulating plateau (net `<= 0`), and only `Workshops > Farms`
  accumulates;
* two configurations that GROW under the current rule — **2F+2W** and
  **3F+2W** — regress to MARGINALLY_STABLE. This is the single structural
  change the candidate introduces;
* `1F+0W` (a lone farm, one colonist) becomes Material-negative and drains its
  whole reserve to 0 because the farm needs no Workshop to be staffed.

## 5. 24/25 Experiment

`AUDIT CRITICAL_1F1W`: 1 staffed Farm + 1 staffed Workshop gives
`grossMaterial 2`, `farmUpkeep 1`, `workshopUpkeep 1`, `totalUpkeep 2`,
`netMaterial 0`. From material 0 the stock stays 0 for the whole run.

`AUDIT CRITICAL_1F1W_AT_24`: starting at 24 the candidate does **not** rest at
24. Near the 25 storage cap the clamp cuts stored production to 1:

```text
rest 24 -> produceMaterial stores min(2, 25-24)=1 -> crest 25 -> upkeep 2 -> rest 23
rest 23 -> produceMaterial stores min(2, 25-23)=2 -> crest 25 -> upkeep 2 -> rest 23
```

So the candidate's rest equilibrium for 1F+1W is **23**, one lower than the
current rule's 24, and its crest still reaches 25 every tick. Because phase 8a
(`applyCommand`) precedes phase 8b (upkeep), a player can still build on the
crest tick: `AUDIT CRITICAL_1F1W_AT_24` confirms the timed build is accepted.

Minimum accumulating configuration (`AUDIT MIN_ACCUMULATION`, 60 ticks):

| Farms | Workshops | colonists | net at start | Mat end | classification |
| ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 1 | 2 | 0 | 0 | MARGINALLY_STABLE |
| 1 | 2 | 3 | +1 | 47 | GROWING |
| 1 | 3 | 4 | +2 | 71 | GROWING |
| 2 | 2 | 4 | 0 | 0 | MARGINALLY_STABLE |
| 2 | 3 | 5 | +1 | 60 | GROWING |
| 2 | 4 | 6 | +2 | 94 | GROWING |
| 3 | 3 | 6 | 0 | 0 | MARGINALLY_STABLE |
| 3 | 4 | 7 | +1 | 60 | GROWING |

`AUDIT CRITICAL_2W1F_VS_2W2F`: 2W+1F net `+1` (Mat end 47); 2W+2F net `0`
(Mat end 0). The boundary is exact: **`net > 0` iff `Workshops > Farms`**.

## 6. Construction Stability

`AUDIT CONSTRUCTION_TIME_TO_25` measures ticks until the phase-8a crest first
reaches 25 (the tick a build would be accepted), from Material 0:

| Config | Baseline ticks | Candidate ticks |
| --- | ---: | ---: |
| 1W | 24 | 24 |
| 1F+1W | 24 | **never** |
| 1F+2W | 12 | 22 |
| 2F+2W | 12 | **never** |
| 2F+3W | 8 | 20 |

`AUDIT CONSTRUCTION_EXPANSION_MATRIX`:

```text
F0W1 = 24   F1W1 = never   F1W2 = 22
F2W2 = never   F2W3 = 20   F3W3 = never   F3W4 = 18
```

The candidate makes Farm upkeep a **strict prerequisite of Workshop surplus**:
each additional staffed Farm requires one additional staffed Workshop just to
hold the line, plus one more to grow. Farm upkeep never makes a `Workshops >
Farms` colony unable to expand; it makes every `Workshops <= Farms` colony
permanently unable to expand from a zero/near-zero reserve.

## 7. Bootstrap

`AUDIT BOOTSTRAP_CANDIDATE` / `AUDIT BOOTSTRAP_BASELINE` run the earliest real
command chain: `R1 -> road -> Farm -> (wait) -> road -> Workshop -> (wait)`,
bootstrap stock 100.

| Step | Candidate Material | Baseline Material |
| --- | ---: | ---: |
| place R1 | 75 | 75 |
| road (1,1) | 70 | 70 |
| place F1 | 45 | 45 |
| farm staffed (wait 1) | 44 | 45 |
| road (2,1) | 37 | 40 |
| place W1 | **11** | **15** |
| after 20 drain ticks | **0** | **15** |
| try R2 (cost 25) | **rejected** | **rejected** |
| final | 0 | 15 |

`AUDIT BOOTSTRAP_ANSWERS`:

```text
1. Can the first Farm be built?           yes
2. Can it become staffed?                 yes
3. Can the first Workshop still be built? yes
4. Can the colony maintain both?          only one can be staffed (1 colonist)
5. Can it build another Workshop?         no (Material < 25)
6. Can it build another Farm?             no
7. Dead-end before enough capacity?       yes
```

The candidate does **not** create the bootstrap dead-end (the current rule is
already stuck at 15 < 25 with one colonist), but it **drains the residual
reserve to 0** while the baseline leaves the 15-unit buffer in place. A
two-Workshop bootstrap still escapes under the candidate
(`AUDIT BOOTSTRAP_TWO_WORKSHOPS`): one staffed Workshop, net `+1`, Material 49
after 45 ticks, construction available.

## 8. Food Interaction

`AUDIT FOOD_LOW_CANDIDATE` / `AUDIT FOOD_LOW_BASELINE`: a 3-colonist colony
with 1 Farm (Food need `3`, Food production `2`, net `−1`) and Food 4 starves
on **tick 4 under both rules**:

```text
candidate foodTrace [3,2,1,0,0,...]  populationTrace [3,3,3,3,0,...]
baseline  starvationTick 4           populationEnd 0
```

The candidate does not move the starvation tick: Farm upkeep consumes Material,
not Food.

`AUDIT MATERIAL_LOW_NO_STARVATION`: Material 0, 1F+1W, 2 colonists, Food 50 —
`foodShortageTicks 0`, `populationEnd 2`, `farmStillStaffed 1`. Unpaid upkeep
clamps to stock and has **no production consequence**: it never disables a Farm
or a worker.

`AUDIT LOOP_DIRECTIONALITY`: Food slope `0/tick`, Material floor/ceiling `0`,
conclusion `low Material does not reduce Food output or worker count`.

The proposed chain

```text
Farm -> Food -> population survival -> worker availability
     -> Workshop -> Material -> Farm upkeep
```

is therefore **ACYCLIC**. Material shortfall cannot feed back into Food: the
only consequence of unpaid upkeep is a lower Material stock. Low Food collapses
the colony (pre-existing behaviour), but low Material does not.

## 9. Worker Competition

`AUDIT FORK_TWO_SIDED` (one colonist, one Farm, one Workshop, equal distance):

| Branch | Food prod | Material prod | total upkeep | net Material |
| --- | ---: | ---: | ---: | ---: |
| Farm staffed | **+2** | 0 | **1** | −1 |
| Workshop staffed | 0 | **+2** | **1** | +1 |

Under the current rule the Farm branch paid 0 upkeep; under the candidate both
branches pay 1 Material. The choice becomes genuinely two-sided:
`Farm = +2 Food and −1 Material`, `Workshop = +2 Material and −1 Material`.

`AUDIT COMPETITION_SCENARIOS`:

| Scenario | staffed F | staffed W | Food prod | Material prod | total upkeep | net Material |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 colonist, 1F+1W | 1 | 0 | 2 | 0 | 1 | −1 |
| 2 colonists, 1F+1W | 1 | 1 | 2 | 2 | 2 | 0 |
| 2 colonists, 2F+1W | 2 | 0 | 4 | 0 | 2 | −2 |
| 2 colonists, 1F+2W | 1 | 1 | 2 | 2 | 2 | 0 |

A colonist who chooses the Farm now forgoes Material *twice*: once through the
lost Workshop output, and once through the Farm's own upkeep.

## 10. Spatial Preference

`AUDIT SPATIAL_TWO_COLUMN`: identical buildings and roads; only the Residence
moves two columns, changing which workplace is nearest.

| Residence position | staffed | Food after 40 | Material after 40 | upkeep | Food shortage |
| --- | --- | ---: | ---: | ---: | --- |
| at Farm column | Farm | 70 | 0 | 1 | no |
| at Workshop column | Workshop | 0 | 24 | 1 | **yes** |

The 09M distance preference already decided survival vs Material before this
step; the candidate adds a Material cost to the *food-safe* branch, so the
spatial choice is now economically consequential on **both** resources.

`AUDIT SPATIAL_ID_TIE`: with both workplaces at equal distance, creation order
still flips the output mix (Farm first → +2 Food / 0 Material; Workshop first →
0 Food / +2 Material), but under the candidate **both mixes pay exactly 1
upkeep**, so the tie-break no longer changes the Material cost, only the mix.

## 11. Timing

`AUDIT TIMING_PHASE_ORDER` (Material 60, farm placed at tick 2):

```text
tick 3 (staffed):  staffedFarms 1 | foodProduction 0 | farmUpkeep 1 | Material 5 -> 4
tick 4:            staffedFarms 1 | foodProduction 2 | farmUpkeep 1 | Material 4 -> 3
```

`produceFood` runs before `assignJobs`, so a Farm newly staffed on tick T pays
its upkeep on **tick T** but delivers its first Food on **tick T+1**. Phase
order is preserved; nothing was reordered.

`AUDIT TIMING_NO_ONE_TICK_COLLAPSE`: Material 1, 1F+0W, Food 3 —

```text
materialTrace [0,0,0,0,...]   foodTrace [4,5,6,7,...]   foodShortageTicks 0
```

The one-tick lead cannot create an artificial collapse: the Farm is already
staffed before the first upkeep tick, so its Food arrives before the colony can
starve on it.

## 12. Expansion Threshold

`AUDIT EXPANSION_THRESHOLD_TABLE` — minimum staffed Workshops for positive
Material accumulation (crest reaches 25 within 60 ticks):

| Staffed Farms | Minimum Workshops for positive Material accumulation |
| ---: | ---: |
| 0 | **1** |
| 1 | **2** |
| 2 | **3** |
| 3 | **4** |

`AUDIT EXPANSION_WORKER_REQUIREMENTS` (one worker per workplace):

| Farms | Workshops | required workers | net Material/tick |
| ---: | ---: | ---: | ---: |
| 0 | 1 | **1** | +1 |
| 1 | 2 | **3** | +1 |
| 2 | 3 | **5** | +1 |
| 3 | 4 | **7** | +1 |

This is a **structural Farm -> Workshop dependency**, not a temporary bootstrap
requirement: every staffed Farm permanently requires an extra staffed Workshop
to keep net Material non-negative. The Food ratio (2 colonists per Farm) means
workers are consumed on both sides, so the dependency is on workers *and*
Material.

## 13. Death Spiral

The candidate consumes Material only, and unpaid upkeep clamps to stock without
deactivating anything, so a Material-driven death spiral has no mechanism.

`AUDIT DEATH_SPIRAL` (60 ticks from Material 1, Food 4000):

| Scenario | Mat min | Mat end | staffed start | staffed end | capacity lost | pop end |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| 1F+1W | 1 | 1 | 2 | 2 | no | 2 |
| 2F+1W | 0 | 0 | 3 | 3 | no | 3 |
| 1F+2W | 2 | 47 | 3 | 3 | no | 3 |
| 2F+2W | 1 | 1 | 4 | 4 | no | 4 |

`AUDIT DEATH_SPIRAL_FLOORS`: `F1W2 47`, `F1W1 1`, `F2W1 0`, `F2W2 1`.

**No death spiral exists.** The failure mode is a **permanent Material trap**,
not a collapse: productive capacity is fully retained and the colony keeps
eating, but `Workshops <= Farms` can never accumulate. Collapse only occurs
through the pre-existing Food rule, which the candidate does not touch.

## 14. Recovery

`AUDIT RECOVERY_FROM_ZERO` (60 ticks from Material 0):

| Scenario | net/tick | Material end | recovered |
| --- | ---: | ---: | --- |
| F1W1 | 0 | 0 | no |
| F2W1 | −1 | 0 | no |
| F1W2 | +1 | 47 | **yes** |
| F2W3 | +1 | 60 | **yes** |

**Recoverable shortage:** `Workshops > Farms` recovers with no player input.

**Irreversible trap:** `Workshops <= Farms` at Material 0 does not recover.
`AUDIT RECOVERY_PLAYER_ACTION` shows the only recovery lever is construction
timing: at Material 24 with `2F+2W` the crest tick accepts a 25-cost Workshop
(build succeeds, stock → 0), after which `W > F` accumulates. `AUDIT
RECOVERY_IRREVERSIBLE` shows a colony already at Material 0 with `2F+2W` cannot
afford the 25-cost Workshop, and there is **no demolish command and no unassign
command** in the simulation, so no existing player action can escape. The trap
is terminal once the reserve reaches 0.

## 15. Candidate Classification

`AUDIT CLASSIFICATION_EVIDENCE` (candidate vs baseline, core scenarios):

```text
regressed scenarios : 2F+2W, 3F+2W   (GROWING -> MARGINALLY_STABLE)
trapped scenarios   : 1F+0W, 1F+1W, 2F+1W, 2F+2W, 3F+2W
collapses           : 0
boom/bust           : 0
```

Evidence summary:

* **Adds real pressure.** Net Material becomes `Workshops - Farms`; the
  Farm/Workshop fork becomes two-sided; 09M distance preference gains a second
  economic axis (§9, §10).
* **No death spiral.** Material never goes negative; capacity is never lost;
  low Material never starves the colony (§8, §13).
* **Not A.** A requires "stable and recoverable". `Workshops <= Farms` at
  Material 0 is an irreversible, unrecoverable trap with no player lever, and
  two previously-growing configurations regress.
* **Not D.** The rule clearly changes decisions and outcomes; it is not mere
  accounting symmetry.
* **Not C.** There is no structural collapse or death spiral; the failure is a
  net-zero plateau with capacity and population retained.

### Classification: **B — Viable but bootstrap-sensitive**

Creates useful two-sided labour/resource pressure, but its `Workshops <= Farms`
net-zero band is a bootstrap-sensitive, irreversible Material trap once the
reserve reaches 0.

## 16. Smallest Next Experiment

Because the candidate is **B**, the rule must not be implemented as proposed.
The smallest additional constraint that removes the trap while keeping the
pressure is a **bootstrap floor on Farm upkeep**:

```text
farmUpkeepDue = max(0, staffedFarms - 1)
```

Rationale: the first staffed Farm is the one that establishes Food survival; it
should not also create a permanent Material deficit. Under this constraint the
net becomes `Workshops - max(0, Farms - 1)`, so `Workshops >= Farms` always
accumulates (`+1`), the `2F+2W` / `3F+2W` regressions disappear, and each
*additional* Farm still costs one Material — the two-sided pressure survives.

The smallest next experiment (do **not** implement yet) is:

1. model `max(0, staffedFarms - 1)` in the same audit harness;
2. re-run the 60-tick core matrix and require every `Workshops >= Farms - 1`
   configuration to reach a 25 crest;
3. re-run the bootstrap chain and require the two-Workshop and one-Farm
   sequences both to escape before Material 0;
4. re-run the 24/25 experiment and confirm the crest is still reachable from
   rest at the new equilibrium;
5. re-run the death-spiral / recovery matrix from Material 0 and require every
   configuration to recover without a new command;
6. confirm SAVE_VERSION and the canonical hash are unchanged (no new state).

Alternative acceptable constraint (larger scope): add a demolish or unassign
command so `Workshops <= Farms` is escapable. This is out of scope for an
audit and is listed only as the fallback if the bootstrap floor is rejected.

## 17. Verification

* `src/` untouched: `git diff --stat -- src/` empty.
* `npx tsc --noEmit` clean.
* `npx eslint tests/farmUpkeepStabilityAudit.test.ts` clean.
* `npx vitest run` → **33 files, 621 tests passed** (38 new audit tests; no
  existing test weakened).
* E2E (headless): `run` 11 pass, `food` 12, `production` 12, `resource` 12,
  `temporal` 17, `road` 15, `transport` 10, `jobs` 21, `upkeep` 35 — all pass.
* `AUDIT PERSISTENCE`: `SAVE_VERSION 4`, zero new persisted fields.
* `AUDIT DETERMINISM`: candidate replay hash-stable (`774c28a61a5530b4`).
* `AUDIT PRODUCTION_UNCHANGED`: baseline harness replay is byte-identical to
  `stepSimulation` replay over 60 ticks.
* `AUDIT PERF_HARNESS_VS_PRODUCTION`: production 200 ticks `164.88 ms`
  (0.824 ms/tick); candidate harness 200 ticks `182.70 ms` (0.913 ms/tick,
  ~11% harness-only overhead). The 10D access-derivation residue was not
  touched.

## 18. Final Design Decision

```text
CANDIDATE REQUIRES FURTHER DESIGN
```

Farm upkeep symmetry is causally useful — it makes labour allocation and 09M
spatial choice economically two-sided — but as proposed it converts every
`Workshops <= Farms` colony into a permanent, unrecoverable Material trap once
the reserve reaches 0, and regresses two currently-growing configurations. It
must not be implemented until the bootstrap floor (`max(0, staffedFarms - 1)`)
or an equivalent escape is designed and separately audited.

## Scope verdict

```text
COMPLETE — AUDIT
```
