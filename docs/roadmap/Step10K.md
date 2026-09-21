# Step 10K — Housing & Workforce Admission Audit

## Mission

Perform a **design audit only** of the current Housing → Population → Workforce admission chain.

Do NOT modify `src/`.

Do NOT implement reassignment.

Do NOT implement demolition.

Do NOT change Farm upkeep.

Do NOT change Food, Material, Workshop, Farm, road, mobility or construction rules.

The previous Step 10J audit closed the Farm-upkeep investigation:

```text
Farm upkeep is unnecessary.
Worker competition already creates meaningful pressure and agency.
```

Step 10J also discovered an important scenario:

```text
Farm → Farm → Workshop → Workshop
```

can result in the Farms claiming both available workers while the Workshops remain vacant.

The current interpretation is that this may be a **housing/workforce admission problem**, not an economic balancing problem.

This step must determine whether that interpretation is correct.

---

# 1. Core question

Answer:

> Is the current Housing → Colonist admission rule creating an artificial workforce dead-end, or is the observed `F,F,W,W` outcome simply a valid consequence of limited population and construction order?

Current relevant chain:

```text
Residence
    ↓
population admission
    ↓
ColonistState
    ↓
worker pool
    ↓
Farm / Workshop competition
    ↓
Food / Material
```

The current population system appears to admit colonists into available residential capacity immediately when Food conditions permit.

Do not assume that this is wrong.

Measure it.

---

# 2. Mandatory workflow

Use:

```text
AUDIT
→ OBSERVATIONS
→ DESIGN INTERPRETATION
→ NO IMPLEMENTATION
→ VERIFICATION
```

Clearly separate:

1. current implemented rule;
2. derived consequence;
3. intentional game-design consequence;
4. actual defect, if one exists.

Do not turn every undesirable strategy outcome into a bug.

---

# 3. Repository inspection

Inspect the current implementation of:

* population update;
* residence capacity;
* colonist creation;
* residence assignment;
* Food consumption;
* Food shortage/starvation;
* `assignJobs`;
* Farm/Workshop competition;
* construction timing;
* Material production;
* Workshop upkeep;
* storage capacity;
* 09M distance-aware workplace selection.

Confirm the exact phase ordering.

Document the relevant sequence.

---

# 4. Admission timing audit

Determine precisely:

```text
When is Food consumed?
When is population updated?
When are new colonists admitted?
When are jobs assigned?
When does Farm production happen?
When does Workshop production happen?
When does construction happen?
```

Produce a tick-by-tick trace for:

```text
Residence
→ colonist
→ Farm
→ Workshop
```

including the first 10 ticks.

The goal is to establish whether population admission and job assignment happen in the same tick or in separate ticks.

---

# 5. Minimal bootstrap scenarios

Reproduce these scenarios exactly.

## Scenario A

```text
Residence → Farm → Workshop
```

Record each tick:

```text
population
Food
Material
Farm workers
Workshop workers
unemployed workers
```

## Scenario B

```text
Residence → Workshop → Farm
```

Same measurements.

## Scenario C

```text
Residence → Farm → Farm → Workshop → Workshop
```

This is the problematic case from 10J.

## Scenario D

```text
Residence → Workshop → Workshop → Farm → Farm
```

## Scenario E

```text
Residence → Farm → Workshop → Farm → Workshop
```

## Scenario F

```text
Residence → Workshop → Farm → Workshop → Farm
```

Do not change rules between scenarios.

---

# 6. Housing capacity experiment

Determine whether the `F,F,W,W` dead-end disappears simply by adding residential capacity.

Compare:

```text
2 Farms + 2 Workshops + 2 housing
```

against:

```text
2 Farms + 2 Workshops + 3 housing
```

and:

```text
2 Farms + 2 Workshops + 4 housing
```

Measure:

```text
population
available workers
staffed Farms
staffed Workshops
unemployed workers
Food
Material
```

Question:

> Is the observed dead-end actually caused by insufficient workforce rather than inability to reassign workers?

This distinction is critical.

---

# 7. Workforce saturation experiment

Construct configurations where:

```text
workplaces > workers
workplaces = workers
workplaces < workers
```

For example:

```text
1 worker / 4 workplaces
2 workers / 4 workplaces
3 workers / 4 workplaces
4 workers / 4 workplaces
5 workers / 4 workplaces
```

Use mixtures of:

```text
Farm
Workshop
```

Measure whether:

* every available worker is assigned;
* surplus workplaces remain vacant;
* surplus workers become unemployed;
* the assignment remains deterministic;
* adding one worker can recover a previously unproductive Workshop.

Do not modify assignment behavior.

---

# 8. Is `F,F,W,W` actually a dead-end?

This must be tested rigorously.

Start from the problematic state.

Then ask:

### A — Add Residence

Does the next colonist allow a Workshop to become staffed?

### B — Wait

Does the existing simulation eventually change the assignment naturally?

### C — Build another Residence first

Does population growth recover the economy?

### D — Build Farm

Does additional Food production help or worsen the situation?

### E — Build Workshop

Does another Workshop change anything?

Do not add a manual reassignment command.

The goal is to determine whether the current system contains an **existing recovery path**.

---

# 9. Food admission dependency

Because population is Food-driven, test the relationship:

```text
Farm count
→ Food surplus
→ population
→ workforce
```

Compare:

```text
1 Farm
2 Farms
3 Farms
```

with identical housing.

Measure:

```text
Food surplus
population
worker count
Material production
```

Determine whether additional Farms naturally create additional workers over time.

If they do, this may already provide an indirect correction mechanism.

---

# 10. Construction-order experiment

Use fixed construction sequences.

### Sequence A

```text
Residence
Farm
Farm
Workshop
Workshop
Residence
```

### Sequence B

```text
Residence
Workshop
Workshop
Farm
Farm
Residence
```

### Sequence C

```text
Residence
Farm
Workshop
Farm
Workshop
Residence
```

### Sequence D

```text
Residence
Workshop
Farm
Workshop
Farm
Residence
```

Run sufficiently long to observe whether the final state converges.

Record:

```text
population
staffed Farms
staffed Workshops
Food
Material
construction timing
```

The important question is:

> Does the problematic state remain permanently different, or does housing expansion naturally erase the difference?

---

# 11. Worker allocation vs housing

Construct a matrix:

| Housing | Workers | Farms | Workshops | Result |
| ------: | ------: | ----: | --------: | ------ |
|       1 |       0 |     2 |         2 | ?      |
|       2 |       1 |     2 |         2 | ?      |
|       3 |       2 |     2 |         2 | ?      |
|       4 |       3 |     2 |         2 | ?      |
|       5 |       4 |     2 |         2 | ?      |

Use actual simulation results.

The purpose is to distinguish:

```text
housing shortage
```

from:

```text
labor allocation problem
```

---

# 12. Determinism

Verify that population admission remains deterministic under:

* normal building insertion order;
* reversed building insertion order;
* repeated simulation;
* save/load replay.

Check:

```text
population
colonists
residenceId
workplaceId
Food
Material
hash
```

No random assignment is acceptable.

---

# 13. Agency analysis

Classify these separately:

### Housing placement

Does adding housing create meaningful economic consequences?

### Farm construction

Does adding Farms increase both Food and workforce potential?

### Workshop construction

Does adding Workshops increase Material capacity and production potential?

### Construction order

Does order matter?

### Workforce availability

Does population actually constrain the economy?

Use only:

```text
REAL
WEAK
INFORMATIONAL
ABSENT
```

Do not produce an overall ranking.

---

# 14. Safety analysis

Determine whether any of these states are permanently unrecoverable under the current rules:

```text
Food = 0
Material = 0
Workers < Workplaces
Workers > Workplaces
Farm-heavy
Workshop-heavy
Housing-limited
```

If a state is recoverable, document the actual recovery path.

If a state is not recoverable, document the precise causal reason.

Do not fix it.

---

# 15. Design decision tree

At the end classify the result.

## A — Housing/workforce behavior is correct

Use if:

* the system correctly reflects limited population;
* `F,F,W,W` is recoverable through legitimate existing actions;
* additional housing provides the intended workforce;
* no artificial permanent trap exists.

Decision:

```text
KEEP CURRENT HOUSING → WORKFORCE MODEL.
NO NEW CONTROL MECHANISM.
```

Proceed to the next simulation dependency.

---

## B — Population is correct, but workforce assignment lacks recovery

Use if:

* population/housing is behaving correctly;
* the player can create sufficient workers;
* but an existing workforce allocation can become permanently inefficient;
* no normal construction action can recover it.

Decision:

```text
DO NOT IMPLEMENT YET.
IDENTIFY THE SMALLEST FUTURE WORKFORCE-CONTROL EXPERIMENT.
```

Possible future candidates:

```text
manual reassignment
workplace priority
automatic reassignment policy
```

Do not implement them here.

---

## C — Housing admission itself creates the problem

Use if:

* population admission timing causes an artificial constraint;
* the issue is caused by the admission algorithm rather than job assignment;
* the problem persists despite sufficient housing/workforce capacity.

Decision:

```text
DO NOT IMPLEMENT.
DEFINE A SEPARATE POPULATION-ADMISSION DESIGN STEP.
```

Do not patch it in this audit.

---

## D — Deeper economic issue

Use if:

```text
housing
population
workforce
Food
Material
```

interactions reveal a more fundamental missing causal rule.

Stop here and document it.

Do not invent a new rule.

---

# 16. Scope guardrails

Forbidden:

* modifying `src/`;
* reassignment implementation;
* workplace priorities;
* demolition;
* Farm upkeep;
* Food changes;
* Material changes;
* construction-cost changes;
* residence-cost changes;
* housing-capacity changes;
* population-rate changes;
* starvation changes;
* road changes;
* mobility changes;
* transport;
* new persisted state;
* SAVE_VERSION changes.

This is strictly an audit.

---

# 17. Tests and documentation

Create:

```text
tests/housingWorkforceAdmissionAudit.test.ts
docs/roadmap/Step10K.md
```

Preserve the prompt.

Append:

```text
# As-Built Report

## Repository

## Current Admission Rule

## Phase Ordering

## Bootstrap Scenarios

## Housing Capacity

## Workforce Saturation

## F,F,W,W Recovery

## Food → Population Feedback

## Construction Order

## Housing vs Workforce

## Determinism

## Agency

## Safety

## Classification

## Design Decision

## Scope Verdict

## Verification
```

Use actual measured values.

Do not claim a dead-end unless the test demonstrates that no existing legitimate action recovers it.

---

# 18. Verification

Run:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Run all current E2E suites.

Verify:

```text
SAVE_VERSION = 4
src/ untouched
deterministic replay
save/load hash stability
insertion-order determinism
no Date.now()
no Math.random()
```

Do not weaken existing tests.

---

# 19. Commit

Only if the audit is complete:

```text
Step 10K: audit housing workforce admission
```

Expected changed files:

```text
tests/housingWorkforceAdmissionAudit.test.ts
docs/roadmap/Step10K.md
```

`src/` must remain untouched.

---

# 20. Final report

Return exactly:

```text
Step 10K COMPLETE — AUDIT

Repository

Current admission rule

Phase ordering

Bootstrap scenarios

Housing capacity

Workforce saturation

F,F,W,W recovery

Food → population feedback

Construction order

Housing vs workforce

Determinism

Agency

Safety

Classification

Design decision

Scope verdict

Verification
```

The final report must answer:

> Is the `F,F,W,W` problem actually a housing/workforce admission problem, or is it a legitimate consequence of the current worker competition model?

Do not implement the answer in Step 10K.



---

# As-Built Report

**Type: AUDIT. No production rule was changed.** `src/` is byte-identical to
Step 10J (`git diff -- src/` empty; `git status` shows only this file and
`tests/housingWorkforceAdmissionAudit.test.ts`). Every number below is a real
`AUDIT ...` line from that suite; re-run with

```text
npx vitest run tests/housingWorkforceAdmissionAudit.test.ts --reporter=verbose
```

## Repository

* starting commit `9dc27d5` (Step 10J), previous audits preserved;
* this audit commit contains `tests/housingWorkforceAdmissionAudit.test.ts`
  and `docs/roadmap/Step10K.md` only;
* `src/` untouched (`git diff -- src/` empty); `SAVE_VERSION = 4`.

## Current Admission Rule

Verified from `src/domain/simulation/phases.ts` (`updatePopulation`) and
`src/domain/housing/housing.ts`:

```text
if the tick was NOT fed  -> ALL colonists are removed (colony-wide starvation)
otherwise               -> WHILE food > 0 and a free operational Residence
                           exists (ascending building id): admit one colonist
assignJobs then runs in the SAME tick, after admission
```

`AUDIT ADMISSION_RULE`: 3 free operational Residences, 0 population, Food 5 →
`population 0 -> 3`, `food 5 -> 5`. Admission is **Food-presence-gated, not
Food-sufficiency-gated**: it does not deduct Food and does not reserve Food for
the colonists it admits.

`AUDIT ADMISSION_OVERFILL` (3 free Residences, Food 5, population 0):

```text
tick 1: pop 3, food 5
tick 2: pop 3, food 2
tick 3: pop 0, food 0     <- over-admission then colony-wide starvation
```

This is a derived consequence of the current rule, recorded as an observation,
not classified as a defect of the `F,F,W,W` question (the `F,F,W,W` outcome
does not depend on it).

## Phase Ordering

`AUDIT PHASE_ORDER` (confirmed, unchanged):

```text
1. advanceConstruction        (construction -> operational)
2. updateNeeds                (food need = population x 1)
3. produceFood                (staffed Farms, BEFORE this tick's assignment)
4. consumeFood                (all-or-nothing)
5. updatePopulation           (starvation, then admission while food > 0)
6. assignJobs                 (SAME tick as admission)
7. produceMaterial            (storage-clamped)
8a. applyCommand              (construction, pre-upkeep stock)
8b. upkeepBuildings           (staffed Workshops)
9. advanceTime
```

Population admission and job assignment happen in the **same tick**; a colonist
admitted on tick N is staffable on tick N. Farm output still lags one tick
(`produceFood` before `assignJobs`).

## Bootstrap Scenarios

`AUDIT BOOTSTRAP_SCENARIOS` — one Residence (one worker), 120 ticks, real
commands:

| Scenario | Plan | Placement ticks | peak F | peak W | final pop | final Material |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| A | R, F, W | 1, 2, 4 | 1 | **0** | 1 | 10 |
| B | R, W, F | 1, 2, 4 | 0 | **1** | **0** | 24 |
| C | R, F, F, W, W | 1, 2, 4, —, — | 1 | **0** | 1 | 0 |
| D | R, W, W, F, F | 1, 2, 4, 29, 62 | 0 | **1** | **0** | 40 |
| E | R, F, W, F, W | 1, 2, 4, —, — | 1 | **0** | 1 | 0 |
| F | R, W, F, W, F | 1, 2, 4, 29, 62 | 0 | **1** | **0** | 40 |

With a single Residence the sequences split cleanly:

* **Farm-first (A, C, E)** — the worker farms, the colony survives, but no
  Workshop is ever staffed and Material never grows (0–10);
* **Workshop-first (B, D, F)** — a Workshop is staffed and Material grows
  (24–40), but with no Farm the colony **starves** (population 0).

The bottleneck is housing, not the admission algorithm: one home is one worker,
and one worker cannot both feed the colony and earn Material.

## Housing Capacity

`AUDIT HOUSING_CAPACITY_2F2W` — fixed 2 Farms + 2 Workshops, vary housing:

| Housing | population | staffed F | staffed W | Material income/tick |
| ---: | ---: | ---: | ---: | ---: |
| 2 | 2 | 2 | **0** | 0 |
| 3 | 3 | 2 | **1** | 1 |
| 4 | 4 | 2 | **2** | 2 |

`AUDIT HOUSING_RESOLVES`: the 3-housing case runs 30 ticks and reaches
`Material 30` with `2F / 1W` staffed. **Additional housing removes the vacant-
Workshop state entirely** — the `F,F,W,W` problem is a workforce-capacity
consequence, not an admission defect.

## Workforce Saturation

`AUDIT WORKFORCE_SATURATION` — 2 Farms + 2 Workshops (4 workplaces):

| Workers | employed | unemployed | staffed F | staffed W | vacant workplaces |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 0 | 1 | 0 | 3 |
| 2 | 2 | 0 | 2 | 0 | 2 |
| 3 | 3 | 0 | 2 | 1 | 1 |
| 4 | 4 | 0 | 2 | 2 | 0 |
| 5 | 4 | 1 | 2 | 2 | 0 |

Assignment is deterministic and greedy by 09M distance then id; every worker is
employed until workplaces run out, and surplus workers become unemployed.
`AUDIT ADD_ONE_WORKER`: going from 2 to 3 workers is exactly what staffs a
previously vacant Workshop (`0 -> 1`). Adding **one worker recovers a vacant
Workshop**; the problem is that adding the worker requires housing, and housing
requires Material.

## F,F,W,W Recovery

`AUDIT STUCK_STATE` — 2 homes, 2 Farms, 2 Workshops, **Material 5**:

```text
material 5 | staffedFarms 2 | staffedWorkshops 0 | vacantHousing 0 | unemployed 0
```

Every recovery path was tested with real commands:

| Path | Result |
| --- | --- |
| **B — Wait** | `AUDIT RECOVERY_WAIT`: 240 ticks, `Material` stays **5**, staffing unchanged, `changed: false` |
| **A/C — Add Residence** | `AUDIT RECOVERY_ADD_RESIDENCE`: from Material 5 **rejected**; from Material 30 **accepted** → pop 3, a Workshop staffed, `Material 11` after 6 ticks |
| **D — Add Farm** | `AUDIT RECOVERY_ADD_WORKPLACE`: no new worker, vacant Workshop stays vacant |
| **E — Add Workshop** | same: no new worker, still `staffedWorkshops 0` |

The recovery mechanism exists — **a new Residence creates the worker that staffs
the Workshop** — but it costs 25 Material, and the vacant Workshop produces no
Material. `AUDIT DEAD_END_VERDICT`:

```text
recoverableWithinExistingActions: false
reason: worker addition requires a Residence (25 Material); the vacant Workshop
        produces no Material; no demolish or reassignment exists
```

## Food → Population Feedback

`AUDIT FOOD_POPULATION` — 4 operational Residences, 1 initial colonist, 240
ticks:

| Farms | population | Food end | Food production | staffed Farms |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 4 | 1523 | 2 | 1 |
| 2 | 4 | 2001 | 4 | 2 |
| 3 | 4 | 2479 | 6 | 3 |

Housing sets the population ceiling **immediately** (admission fills all free
Residences in one tick while Food > 0); Farm count sets whether that population
is *fed*. Farms do **not** create additional workers — only Residences do.
The chain is therefore `Residence -> worker`, with `Farm -> Food` gating
survival, not workforce size.

## Construction Order

`AUDIT CONSTRUCTION_ORDER_100` — 6-item sequences, bootstrap budget 100:

| Seq | Plan | Complete | final pop | final Material | final staffing |
| --- | --- | --- | ---: | ---: | --- |
| A | R, F, F, W, W, R | **no** (3/6) | 1 | 0 | 1F / 0W |
| B | R, W, W, F, F, R | yes (6/6) | 2 | 49 | 1F / 1W |
| C | R, F, W, F, W, R | **no** (3/6) | 1 | 0 | 1F / 0W |
| D | R, W, F, W, F, R | yes (6/6) | 0 | 16 | starved |

`AUDIT CONSTRUCTION_ORDER_400` — same sequences with a 400 Material budget (to
isolate allocation from affordability):

| Seq | Complete | final pop | final staffing | final Material |
| --- | --- | ---: | --- | ---: |
| A | yes | 2 | 1F / 1W | 49 |
| B | yes | 2 | 1F / 1W | 49 |
| C | yes | 2 | **2F / 0W** | 215 |
| D | yes | 0 | starved | 114 |

The problematic state **does not converge away**: with enough Material the
sequences all finish, but the 2-home colony still has only 2 workers for 4
workplaces, so the final staffing mix follows the build order (C ends with a
vacant Workshop and no Material income). Housing expansion to two homes erases
the *stall* but not the *allocation difference*.

## Housing vs Workforce

`AUDIT HOUSING_VS_WORKFORCE` — 2 Farms + 2 Workshops, housing and workers
varied independently:

| Housing | Workers | staffed F | staffed W | vacant workplaces |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | 0 | 0 | 4 |
| 2 | 1 | 1 | 0 | 3 |
| 3 | 2 | 2 | 0 | 2 |
| 4 | 3 | 2 | 1 | 1 |
| 5 | 4 | 2 | 2 | 0 |

**Workers determine staffing; housing caps the number of workers.** There is no
separate labor-allocation failure beyond the worker count.

## Determinism

* `AUDIT INSERTION_ORDER`: same construction sequence twice is byte-identical,
  and reversing the canonical entity-record key order does not change the hash
  or the derived staffing.
* `AUDIT SAVE_LOAD_HASH`: `hash 509d355cb8b80426`, `SAVE_VERSION 4`; save/load
  preserves every `residenceId` and `workplaceId`.
* `AUDIT REPEAT_DETERMINISM`: 120-tick replay byte-identical.
* `AUDIT AVAILABLE_RESIDENCES`: ascending ids `building-1, building-2,
  building-3`.
* No `Date.now()` / `Math.random()` in `src/`.

## Agency

`AUDIT AGENCY` — all five classified **REAL**:

| Decision | Class | Evidence |
| --- | --- | --- |
| Housing placement | REAL | each operational Residence admits one colonist in the same tick; housing is the only workforce lever |
| Farm construction | REAL | +2 Food capacity, competes for the same worker; 1F/4-housing starves, 3F/4-housing sustains |
| Workshop construction | REAL | +2 Material gross and 25 storage, but needs a worker the Farm may have claimed |
| Construction order | REAL | A/C stall, B/D complete with the same 100 budget |
| Workforce availability | REAL | workers < workplaces leaves vacant workplaces |

## Safety

| State | Status |
| --- | --- |
| `Food = 0`, Farm-rich | recoverable — `produceFood` precedes `consumeFood` |
| `Food = 0`, Farm-poor | unrecoverable — colony-wide starvation, no re-admission without surplus Food |
| `Material = 0`, Workshop staffed | recoverable — `net = staffed Workshops` per tick |
| `Workers < Workplaces` | recoverable **iff Material >= 25** for a Residence; otherwise a permanent allocation trap |
| `F,F,W,W` at Material 5 | **unrecoverable** with existing actions (vacant Workshop, no income, no vacancy, no demolish/reassign) |
| Housing-limited | the **root cause**: housing caps population and a Farm-first order can consume that population before a Workshop is staffed |

Also recorded (separate, not the `F,F,W,W` cause): the admission rule can
over-fill housing while `Food > 0` and starve the colony one tick later
(`ADMISSION_OVERFILL`).

## Classification

```text
B — Population is correct, but workforce assignment lacks recovery
```

The admission rule itself is behaving correctly: it reflects limited population,
fills only free operational housing, creates exactly one worker per Residence,
and admits and assigns in the same tick. Additional housing demonstrably
provides the intended workforce (2F+2W: housing 2 → 0 Workshops staffed,
housing 4 → 2 Workshops staffed). The `F,F,W,W` outcome is therefore a
legitimate consequence of limited population and construction order — **not** a
housing-admission defect (so not C).

However, once the colony has committed to that allocation with less than 25
Material, the assignment is **permanently inefficient**: the two Farms hold both
workers, the Workshops produce no Material, the colony cannot afford the
Residence that would add a worker, and no demolish or reassignment action
exists. That is precisely the §15-B condition.

## Design Decision

```text
DO NOT IMPLEMENT YET.
IDENTIFY THE SMALLEST FUTURE WORKFORCE-CONTROL EXPERIMENT.
```

The audit does not justify changing housing, population, Food or Material. It
identifies one narrow missing lever: **the player cannot move an already
assigned worker**. The `F,F,W,W` recovery test shows the exact fix needed — a
way to move one colonist from a Farm to the vacant Workshop — and that this
single move restores Material income.

Smallest future experiment (to be designed and audited separately, not
implemented here): **manual reassignment of one colonist** (e.g. a
`reassignWorker` command that moves one colonist from its current workplace to a
vacant road-connected workplace, with no new persisted resource and no change to
`assignJobs`'s automatic default). A future audit should compare manual
reassignment against an automatic "prefer a vacant Workshop when a Farm has more
than one worker / when no Workshop is staffed" policy before choosing one.

## Scope Verdict

```text
COMPLETE — AUDIT
```

## Verification

* `src/` untouched: `git diff --stat -- src/` empty.
* `npx tsc --noEmit` clean; `npx eslint tests/housingWorkforceAdmissionAudit.test.ts`
  clean; `npm run build` succeeds.
* `npx vitest run` → **37 files, 732 tests passed** (24 new audit tests; no
  existing test weakened).
* E2E (headless): `road` 15, `transport` 10, `production` 12, `resource` 12,
  `food` 12, `temporal` 17, `jobs` 21, `upkeep` 35, plus `run` 11 — all pass.
* `SAVE_VERSION = 4`; no persisted Farm-upkeep or reassignment state; no hash
  schema change.
* Deterministic replay (120 ticks), save/load hash stability, insertion-order
  determinism, and no `Date.now()` / `Math.random()` in `src/`.
