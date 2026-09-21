# Step 10R — Water Growth Loop Stabilization Audit

## 1. HARD RULE

This is an **AUDIT-ONLY** step.

Starting point:

* Step 10P implementation
* Step 10Q audit complete
* Starting commit: `bd57c36`
* Water is already implemented and persisted
* Do NOT modify production code under `src/`
* Do NOT introduce a new Water rule during this step
* Do NOT implement the final stabilization decision yet

The objective is to determine precisely which admission semantics are coherent for the existing Water model.

The two candidate mechanisms to compare are:

### Candidate A — Explicit Water reservation

Before admitting a colonist, reserve the Water required for that colonist.

Conceptually:

`availableWaterForAdmission = waterStock - alreadyReservedWater`

A colonist may only be admitted if its Water requirement can be covered by the remaining stock.

The audit must determine whether this requires:

* persisted reservation state,
* purely same-tick derived reservation,
* or another concrete mechanism.

Do NOT implement any of these. Only determine the minimal correct model.

### Candidate B — At most one admission per tick when Water is binding

When Water is the limiting growth resource:

* admit at most one colonist during a tick,
* consume Water according to the existing phase semantics,
* allow the next colonist on the next tick if Water remains sufficient.

Again, do NOT implement this.

The audit must determine whether this produces coherent deterministic growth without introducing artificial behavior.

---

# 2. RECONSTRUCT THE CURRENT PROBLEM

Start from the actual Step 10P/10Q implementation.

Explicitly document:

1. when Water is produced,
2. when Water is consumed,
3. when admission happens,
4. how current Water stock is checked,
5. whether multiple admissions can happen in one tick,
6. whether newly admitted colonists consume Water during that same tick,
7. whether admission uses reservation,
8. whether `waterShortage` represents:

   * current stock shortage,
   * inability to sustain current population,
   * or both.

Do not infer. Read the actual code.

---

# 3. REPRODUCE THE 10Q OVERSHOOT

Reproduce the reported scenario:

* 6 served Residences
* 1 staffed Well
* enough Food
* sufficient housing
* Water initially sufficient for current population
* one admission phase

Measure:

* population before admission,
* Water before admission,
* number of admissions,
* Water after admission,
* population after admission,
* next-tick Water production,
* next-tick Water consumption,
* shortage state.

The reported behavior is:

> population jumps to 6 in one tick and then runs permanently net −4.

Verify this exactly.

Determine the mathematical cause.

---

# 4. DEFINE THE WATER-BINDING BOUNDARY

Determine precisely when Water is actually binding.

Test at least:

| Served free residences | Current population | Water stock | Water production | Expected admission capacity |
| ---------------------: | -----------------: | ----------: | ---------------: | --------------------------: |
|                      0 |                  1 |           0 |                2 |                           0 |
|                      1 |                  1 |           0 |                2 |                           ? |
|                      2 |                  1 |           0 |                2 |                           ? |
|                      6 |                  1 |           0 |                2 |                           ? |
|                      6 |                  1 |           1 |                2 |                           ? |
|                      6 |                  1 |           2 |                2 |                           ? |
|                      6 |                  1 |           5 |                2 |                           ? |
|                      6 |                  1 |          10 |                2 |                           ? |
|                      6 |                  3 |           2 |                2 |                           ? |
|                      6 |                  3 |           5 |                2 |                           ? |

Do not assume the answers.

Derive them from the actual causal model.

---

# 5. CANDIDATE A — RESERVATION AUDIT

Model explicit Water reservation without changing production code.

Determine:

1. What exactly must be reserved?
2. At what phase would reservation conceptually occur?
3. Is reservation per colonist or per residence?
4. Is reservation transient for the current tick or persistent?
5. Can a reservation survive a failed admission?
6. Can construction/population changes invalidate it?
7. Does save/load need to persist it?
8. Does the hash need to include it?
9. Does reservation introduce a second canonical Water state?
10. Can the existing `resources.water` remain the sole canonical persisted Water stock?

Test scenarios:

### A1 — One available Water unit

* 1 served free Residence
* Water = 1
* Food sufficient

Determine whether exactly one admission occurs and whether the resulting stock is coherent.

### A2 — Five Water units

* 6 served free Residences
* Water = 5
* current population = 1

Determine the maximum coherent admissions.

### A3 — Ten Water units

* 6 served free Residences
* Water = 10
* current population = 1

Determine whether all remaining housing can be admitted or whether another limit is necessary.

### A4 — Production and admission same tick

Verify whether Water produced during `produceWater` can legitimately be reserved for admission during that same tick.

### A5 — Existing population consumption

Ensure Water required by existing colonists is not accidentally consumed twice or displaced by admission reservation.

---

# 6. CANDIDATE B — ONE ADMISSION PER TICK

Model the alternative semantics without implementing them.

Determine:

1. When Water is binding, can only one colonist be admitted per tick?
2. Does that remove the overshoot?
3. Does it create a new artificial growth bottleneck?
4. Does growth converge toward Water production capacity?
5. Does it behave differently when Water stock has accumulated?
6. Does it behave differently when several residences become available simultaneously?
7. Is the rule dependent on Water specifically or could it be expressed generically?

Test:

### B1 — 6 served residences, Water 0

Observe growth over 20 ticks.

### B2 — 6 served residences, Water 5

Observe growth over 20 ticks.

### B3 — 6 served residences, Water 20

Determine whether one-admission-per-tick unnecessarily throttles an already-funded population increase.

### B4 — Water-producing Well construction

Ensure the first colonist bootstrap remains possible.

---

# 7. DIRECT COMPARISON

Create an audit matrix:

| Property                            | Reservation | One admission/tick |
| ----------------------------------- | ----------- | ------------------ |
| Prevents overshoot                  | ?           | ?                  |
| Uses actual Water stock             | ?           | ?                  |
| Preserves accumulated Water         | ?           | ?                  |
| Handles multiple free Residences    | ?           | ?                  |
| Requires new canonical state        | ?           | ?                  |
| Requires persistence changes        | ?           | ?                  |
| Requires hash changes               | ?           | ?                  |
| Deterministic                       | ?           | ?                  |
| Spatially coherent                  | ?           | ?                  |
| Economically coherent               | ?           | ?                  |
| Minimal architectural impact        | ?           | ?                  |
| Compatible with current phase order | ?           | ?                  |
| Can express funded rapid growth     | ?           | ?                  |
| Creates artificial bottleneck       | ?           | ?                  |

Do not declare a winner by intuition.

Use the simulation evidence.

---

# 8. TEST THE FUNDAMENTAL INVARIANT

Determine what the correct Water admission invariant should be.

Possible candidates include:

### Invariant A

> No colonist may be admitted unless one Water unit is available for that colonist.

### Invariant B

> Admission may never cause Water to become negative.

### Invariant C

> After admission and consumption, Water must remain non-negative.

### Invariant D

> A population increase must be backed by Water stock or same-tick Water production.

### Invariant E

> The colony may temporarily have Water shortage after growth, provided existing colonists survive.

Do not assume all are simultaneously correct.

Determine which invariant(s) are actually required by the existing design.

---

# 9. EXISTING COLONIST VS NEW COLONIST

This distinction is critical.

Audit separately:

### Existing colonist

Water consumption is a survival/resource flow.

### New colonist

Water is a growth/admission requirement.

Determine whether these should compete for the exact same Water stock during the same tick.

Test:

* population 1
* Water 1
* one free served Residence
* Water production 0
* Food sufficient

Determine whether:

1. the existing colonist consumes the Water first and admission is blocked,
2. admission consumes it first,
3. both are conceptually reserved before consumption,
4. another ordering is required.

Repeat with:

* Water 2
* Water 3
* Water production 2

The goal is to make the resource priority explicit rather than accidental.

---

# 10. POPULATION FEEDBACK

Run long simulations for both candidate models.

At minimum:

* 1 staffed Well
* 6 served Residences
* sufficient Food production
* no Workshop unless needed
* 120 ticks
* 240 ticks
* 600 ticks

Record:

* population,
* Water stock,
* Water production,
* Water consumption,
* admissions,
* shortage,
* Food stock,
* worker allocation.

Determine whether the population:

* converges,
* oscillates,
* overshoots,
* permanently starves Water,
* reaches a stable equilibrium,
* or becomes housing-limited.

---

# 11. WORKFORCE FEEDBACK

Water itself consumes workforce capacity.

Test:

* 1 Farm + 1 Well
* 2 Farms + 1 Well
* 1 Workshop + 1 Well
* 1 Farm + 1 Workshop + 1 Well
* manual Farm → Well
* manual Workshop → Well

Determine whether stabilized Water growth produces a coherent workforce equilibrium.

Do not introduce any new workforce priority.

---

# 12. SPATIAL FEEDBACK

Verify that the stabilization model preserves the existing spatial rule:

`Road → Network → Well coverage → Residence served → population growth`

Test:

1. connected Well,
2. disconnected Well,
3. roadless Well,
4. Well disconnected after population growth,
5. reconnection after shortage,
6. multiple Wells on separate networks,
7. multiple Wells on one network.

Determine whether either candidate accidentally turns Water into a global resource.

It must remain spatially covered exactly as in 10P/10Q unless evidence demonstrates a problem.

---

# 13. BOOTSTRAP

Re-run the complete bootstrap:

`Residence → road → Well → operational Well → colonist → Well staffing → Water production → growth`

Verify:

* no first-colonist deadlock,
* no requirement for a staffed Well before the first Water service exists,
* no infinite free growth,
* deterministic behavior.

Explicitly document the intentional deviation from Step 10O:

> operational + road-accessible Well provides service coverage even while vacant; staffing gates production, not coverage.

Do not change this rule in 10R.

Only determine whether it remains coherent after stabilization.

---

# 14. WATER SHORTAGE

Confirm that Water shortage still means:

* existing colonists survive,
* admission stops,
* Food shortage remains the population-loss mechanism,
* Water does not kill existing colonists.

Test recovery:

1. create Water shortage,
2. construct/connect/staff another Well,
3. produce Water,
4. verify admission resumes.

Determine whether either candidate changes recovery behavior.

---

# 15. SAVE / HASH / DETERMINISM IMPACT

For Candidate A and Candidate B separately, determine:

* whether new persisted state would be required,
* whether SAVE_VERSION would need to change,
* whether hashes would change,
* whether migration would be required,
* whether replay remains deterministic.

This is an architecture audit only.

Do not modify save code.

---

# 16. PERFORMANCE

Measure the current admission loop and determine whether either candidate would materially increase complexity.

Do not optimize prematurely.

Explicitly look for:

* repeated residence scans,
* repeated Water calculations,
* new per-colonist BFS,
* new per-pair network calculations.

The desired complexity should remain close to the existing population/residence scan.

---

# 17. BROWSER VERIFICATION

Run the existing browser suite.

Additionally verify visually/behaviorally:

1. Water HUD,
2. Well inspection,
3. roadless Well,
4. connected Well,
5. Water stock changes,
6. admission blocked by Water,
7. admission resumes after Water becomes available.

No visual redesign.

---

# 18. ARCHITECTURE AUDIT

Confirm:

* Water remains concrete.
* No generic Need abstraction.
* No generic Service abstraction.
* No generic reservation framework.
* No new workforce framework.
* No Water storage.
* No Water upkeep.
* No pipes.
* No travel simulation.
* No Water logistics.
* No Farm Water input.
* No Farm upkeep.
* No new workforce priority.

If reservation appears necessary, determine whether it can remain a concrete Water-specific mechanism.

Do not generalize it.

---

# 19. DESIGN CLASSIFICATION

Classify the current Water admission model and the two candidates separately:

### A — Fundamental / must resolve

### B — Useful but incomplete

### C — Premature

### D — Contradictory / should reject

Provide evidence for each classification.

Do not implement the chosen model.

---

# 20. NEXT DEPENDENCY

At the end, determine exactly what should happen next.

Possible outcomes:

### Outcome 1

Reservation is required → next step should implement concrete Water reservation/admission semantics.

### Outcome 2

One-admission-per-tick is sufficient → next step should implement that concrete rule.

### Outcome 3

Current model is coherent enough → close Water stabilization and proceed to the next economic dependency.

### Outcome 4

Neither candidate is sufficient → identify the minimal third model, but do not implement it.

Do not jump to Food storage, Granary, Farm input, money, vehicles, or other systems until the Water growth boundary is resolved.

---

# 21. FILES

Read and audit at minimum:

* `src/domain/water/water.ts`
* `src/domain/simulation/phases.ts`
* `src/domain/simulation/step.ts`
* `src/domain/jobs/jobs.ts`
* `src/domain/resource/resource.ts`
* `src/domain/building/building.ts`
* `src/application/persistence/save.ts`
* relevant population/admission code
* relevant Water tests
* `docs/roadmap/Step10O.md`
* `docs/roadmap/Step10P.md`
* `docs/roadmap/Step10Q.md`

Add only:

* `tests/waterGrowthStabilizationAudit.test.ts`
* `docs/roadmap/Step10R.md`

Do not modify production code.

---

# 22. VERIFICATION

Run:

* all tests,
* the new audit tests,
* lint,
* typecheck,
* build,
* browser E2E,
* relevant GPU/browser verification if available.

Expected result:

* all existing tests remain green,
* new audit tests green,
* `src/` unchanged.

---

# 23. FINAL REPORT

End `docs/roadmap/Step10R.md` with exactly this structure:

```text
Step 10R COMPLETE — AUDIT

Repository

Starting commit:
Final commit:

Production code changed:
Tests added:
Docs changed:

Current Water admission model

Exact current semantics:
Exact overshoot mechanism:

Water-binding boundary

...

Candidate A — Reservation

...

Candidate B — One admission per tick

...

Existing-colonist vs new-colonist ordering

...

Population feedback

...

Workforce feedback

...

Spatial feedback

...

Bootstrap

...

Water shortage / recovery

...

Persistence / migration

...

Determinism

...

Performance

...

Browser verification

...

Architecture audit

...

Design classification

Current model: A/B/C/D
Candidate A: A/B/C/D
Candidate B: A/B/C/D

Reason:

Next dependency

...

Scope verdict

COMPLETE — AUDIT

Final confirmations:

- src/ unchanged
- no Water storage
- no Water upkeep
- no Farm upkeep
- no Water logistics
- no pipes
- no travel simulation
- no generic Need framework
- no generic Service framework
- no generic reservation framework
- no new workforce priority
- Water remains canonical persisted state
- coverage remains derived
- Food remains the survival gate
- Water does not kill existing colonists
- deterministic save/load remains intact
- replay remains deterministic
- SAVE_VERSION remains 6 unless the audit proves a future implementation would require a version change
```

## Important

Do not implement the stabilization.

Do not choose a mechanism before running the comparative simulations.

The purpose of Step 10R is to turn the 10Q observation

> "population jumps to the served housing cap and permanently outruns Water"

into a precise, test-backed admission invariant.

Only after that invariant is established should the implementation step begin.



---

## As-Built / Audit Report

**Type: AUDIT (Step 10R) — Water growth-loop stabilization.** `src/` is
untouched (`git diff -- src/` empty). Evidence comes from
`tests/waterGrowthStabilizationAudit.test.ts` (21 tests); every number below is
a real `AUDIT ...` line. Three admission models plus a fourth minimal model are
compared in an audit-only tick mirror that is byte-identical to
`stepSimulation` for the current model (`AUDIT HARNESS_FIDELITY`).

### Repository

* starting commit `bd57c36` (Step 10Q);
* final commit = this audit commit;
* production code changed: **none**;
* tests added: `tests/waterGrowthStabilizationAudit.test.ts` (21);
* docs changed: this file.

### Current Water admission model

`AUDIT CURRENT_SEMANTICS`:

```text
production : produceWater, before consumeFood / consumeWater / admission
consumption: consumeWater, before admission; need = served colonists x 1
admission  : updatePopulation, after consumeWater
water check: shortage = (servedColonists > 0 && stock < need) at consumeWater
multiple admissions per tick: yes
new colonist consumes same tick: no
reservation: no
shortage meaning: current stock below CURRENT served need, not future
                  sustainability
```

**Exact overshoot mechanism:** the admission loop fills every served free
Residence while (a) the colony is not currently in deficit and (b) Food > 0;
the admitted colonists are only charged on the next tick.

`AUDIT OVERSHOOT_REPRODUCTION` (6 served Residences, 1 staffed Well): from
`population 1 / water 0 / production 2 / need 1` one tick yields
`population 6 / water 1 / need 6 / shortage true / net -4`, i.e. **5 admissions
in one tick**, reproduced exactly.

### Water-binding boundary

`AUDIT WATER_BINDING_BOUNDARY` (current model, one tick):

| free served Residences | population | stock | admissions | population after | shortage after |
| ---: | ---: | ---: | ---: | ---: | --- |
| 0 | 1 | 0 | 0 | 1 | false |
| 1 | 1 | 0 | 1 | 2 | true |
| 2 | 1 | 0 | 2 | 3 | true |
| 6 | 1 | 0 | **6** | 7 | true |
| 6 | 1 | 1 | **6** | 7 | true |
| 6 | 1 | 2 | **6** | 7 | true |
| 6 | 1 | 5 | **6** | 7 | true |
| 6 | 1 | 10 | **6** | 7 | false |
| 6 | 3 | 2 | **6** | 9 | true |
| 6 | 3 | 5 | **6** | 9 | true |

Water does **not** bind admission in the current model except through the
current-deficit check: any number of served free Residences is filled as long
as the colony was not already in deficit.

### Candidate A — Reservation

`AUDIT RESERVATION_DESIGN`: reserve one Water unit per admitted colonist, for
this tick only, inside `updatePopulation` after `consumeWater`; a transient
same-tick counter with no new canonical state, no persistence, no hash change
and no second Water state. `resources.water` stays the sole canonical stock.

* `AUDIT RESERVATION_A1`: 1 existing colonist, stock 1, 1 free Residence ->
  exactly **1** admission; `water after 2`, net 0.
* `AUDIT RESERVATION_A2_A3`: 6 served Residences, stock 5 -> 5 admissions;
  stock 10 -> 5 admissions (housing cap). Funded rapid growth is preserved up
  to the housing cap.
* `AUDIT RESERVATION_A4`: same-tick production is spendable (stock 0, staffed
  Well -> 1 admission).
* `AUDIT RESERVATION_A5`: existing colonists consume first (post-consumption
  stock). Shortage (3 served, stock 0) blocks; surplus (stock 5) admits.

**Bootstrap requirement (finding):** Candidate A needs the same first-colonist
exemption as the current gate. With a Well but zero colonists, `stock - 0 < 1`
blocks the first admission and the Well can never be staffed — a deadlock. The
audit harness therefore carries the exemption for all gated candidates.

### Candidate B — One admission per tick

* `AUDIT ONE_PER_TICK_B1_B2`: exactly **1** admission on the first tick for
  stock 0 and stock 5; over 20 ticks population 4 (stock 0) / 6 (stock 5).
* `AUDIT ONE_PER_TICK_B3`: with stock 20 it still admits only **1** on the
  first tick — an already-funded population increase is throttled.
* `AUDIT ONE_PER_TICK_B4`: the bootstrap first colonist still works (gate off
  without a Well).

### Existing-colonist vs new-colonist ordering

`AUDIT EXISTING_VS_NEW`: in every tested case the existing colonist's need is
consumed first and the surplus (or the same-tick production) funds admission;
shortage blocks. The four cases all admit 1 new colonist. The priority is
therefore **existing consumption -> admission**, implicit rather than
reserved.

### Population feedback

`AUDIT POPULATION_FEEDBACK` (6 served Residences, 1 staffed Well, stock 0,
120/240/600 ticks):

| Model | population | net/tick | shortage |
| --- | ---: | ---: | --- |
| current | 6 | **−4** | true |
| reservation | 3 | **−1** | true |
| onePerTick | 4 | **−2** | true |
| headroom (third model) | 2 | **0** | false |

**None of current/reservation/one-per-tick converges to a sustainable
population**; each overshoots Water production and stays in permanent deficit
(the colony survives, since Water never kills). Only production-headroom
converges to the Water production capacity.

`AUDIT COMPARISON_MATRIX` (stock 5, 120 ticks): current 6/−4, reservation
6/−4, onePerTick 6/−4, headroom **2/0**. `AUDIT COMPARISON_NOTES`:
reservation uses stock, still overshoots, needs the bootstrap exemption;
one-per-tick throttles funded growth; headroom converges to production; **no
candidate needs new canonical state**.

### Workforce feedback

`AUDIT WORKFORCE_FEEDBACK` (reservation, 1 starting colonist, 120 ticks):
every mix (1F+1W, 2F+1W, 1Shop+1W, 1F+1Shop+1W) ends at population 1 with
`staffedWells 0` and a shortage — the single colonist takes the nearer
Farm/Workshop and the Well stays vacant, so no Water is produced and no growth
occurs. Stabilized growth requires the player to allocate a colonist to the
Well (no new priority rule is needed; manual reassignment already covers it).

### Spatial feedback

`AUDIT SPATIAL_FEEDBACK`: disconnected networks serve only `building-1`
(population 1); reconnecting serves `building-1, building-3` (population 2);
a roadless Well serves nothing. The reservation model does **not** turn Water
into a global resource — coverage stays exactly as in 10P/10Q.

### Bootstrap

`AUDIT BOOTSTRAP_RECOVERY`: the first colonist is admitted (population 1) with
no Well; the intentional Step 10O deviation is unchanged —
`operational + road-accessible Well -> coverage; staffing -> production only`.
All gated candidates require the first-colonist exemption; the current model
gets it for free because `need = 0` at zero population.

### Water shortage / recovery

Water shortage keeps existing colonists alive (population 3 survives) and stops
admission; Food shortage remains the only loss mechanism. Recovery by adding
Water (stock 20) resumes growth to the housing cap. Neither candidate changes
the survival semantics.

### Persistence / migration

`AUDIT PERSISTENCE_IMPACT`: `SAVE_VERSION = 6`; neither candidate needs new
persisted state, a version bump, a hash change or a migration — both are
same-tick derived admission rules. Save/load round-trips unchanged.

### Determinism

The audit mirror is deterministic and byte-identical to `stepSimulation` for
the current model. No `Date.now()` / `Math.random()` in `src/`. All candidates
are pure functions of canonical state plus the tick's derived coverage.

### Performance

`AUDIT PERFORMANCE` (120 residences / 40 Well-capable workplaces / 60
colonists, 3 ticks): current 1378 ms, reservation 1664 ms, one-per-tick 807 ms.
All models stay within the existing population/residence scan; reservation adds
only an integer comparison per admission. No new BFS, no per-pair Water
calculation.

### Browser verification

`e2e/waterRun.mjs` passes 7/7 with zero console/page errors (Water HUD, Well
inspection, roadless Well, connected Well, stock changes, admission block,
admission resume). All other E2E suites remain green (`reassign` 7, `run` 11,
`road` 15, `transport` 10, `production` 12, `resource` 12, `food` 12,
`temporal` 17, `jobs` 21, `upkeep` 35).

### Architecture audit

Water remains concrete; no generic Need/Service/reservation/workforce
abstraction; no Water storage, upkeep, pipes, logistics or travel simulation;
no Farm Water input or upkeep; no new workforce priority. Reservation is a
concrete Water-specific same-tick counter if chosen, not a framework.

### Design classification

```text
Current model: D — Contradictory
Candidate A (reservation): B — Useful but incomplete
Candidate B (one admission/tick): C — Premature
Minimal third model (production-headroom): A — Fundamental / must resolve
```

Reason:

* **Current (D):** the admission gate does not actually gate Water; it fills
  every served free Residence and leaves the colony permanently above Water
  production (`net −4` forever), contradicting the stated growth-gate intent.
* **Reservation (B):** uses the stock, removes the worst overshoot (6 -> 3),
  needs no new state — but still settles in a permanent deficit (`net −1`) and
  needs a bootstrap exemption to avoid a first-colonist deadlock.
* **One admission/tick (C):** throttles funded growth even with a large
  reserve, still overshoots (`net −2`), and fixes the symptom rather than the
  invariant — a premature artificial bottleneck.
* **Production-headroom (A):** admitting only while Water production capacity
  covers the resulting need (with the existing bootstrap exemption) converges
  to `population 2 / net 0 / no shortage` — the self-limiting loop the design
  intended, with no new canonical state.

### Next dependency

**Outcome 4 — neither candidate is sufficient; implement the minimal third
model.** The next step should implement a concrete Water admission invariant
based on **production headroom**:

```text
a colonist may be admitted only while
  Water production capacity >= served need + admissions this tick + 1
with the existing first-colonist bootstrap exemption
```

This is a concrete Water-specific rule, needs no persisted reservation state
and no `SAVE_VERSION` change, and turns the Water growth gate into the intended
self-limiting loop. The accumulated stock remains a buffer for temporary
disruptions rather than a way to fund a permanent deficit. Do not implement it
in 10R.

### Scope verdict

```text
COMPLETE — AUDIT
```

Final confirmations:

```text
- src/ unchanged
- no Water storage
- no Water upkeep
- no Farm upkeep
- no Water logistics
- no pipes
- no travel simulation
- no generic Need framework
- no generic Service framework
- no generic reservation framework
- no new workforce priority
- Water remains canonical persisted state
- coverage remains derived
- Food remains the survival gate
- Water does not kill existing colonists
- deterministic save/load remains intact
- replay remains deterministic
- SAVE_VERSION remains 6 (no candidate needs a version change)
```
