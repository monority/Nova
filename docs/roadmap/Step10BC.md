# Step 10BC — Phase Freeze & Town Dependency Contract

## Mission

Starting HEAD is expected to be:

`c7a66d7`

Step 10BB is complete and the economic tuning decision is CLOSED:

> **DECISION A — KEEP 2/2**

Do **not** reopen the Farm/Well production-rate debate.

This step is a **design/architecture freeze audit only**.

The goal is to turn the completed 10AJ→10BB evidence into an explicit phase boundary:

1. freeze the current economic baseline;
2. freeze the current causal contracts that are now considered stable;
3. formally record why Town is **not yet contractable**;
4. identify the smallest genuinely new capability that could make Town meaningful;
5. distinguish a true capability dependency from content, scenario, UX, or tuning work;
6. choose the next phase direction without implementing it.

**No implementation.**

---

# 1. HARD CONSTRAINTS

Do not modify:

* `src/domain/**`
* production constants
* consumption constants
* workforce rules
* Water semantics
* Material semantics
* Food semantics
* construction rules
* road rules
* terrain rules
* progression rules
* objective evaluation
* scenario catalogue
* persistence
* `SAVE_VERSION`
* rendering
* UI

Do not:

* tune Farm/Well rates;
* add Town;
* add Town thresholds;
* invent new resources;
* invent pollution;
* invent electricity;
* invent happiness;
* invent zoning;
* invent demand;
* invent taxes;
* invent housing classes;
* invent services;
* invent population identities;
* add another scenario merely to manufacture a reason for a feature;
* modify existing scenarios;
* turn a qualitative hypothesis into a mechanic.

This is an **audit-only** step.

Expected:

```text
src/ unchanged
```

Documentation/tests may be added only if they are strictly required to record the audit.

---

# 2. READ FIRST

Read the relevant completed roadmap documents, especially:

* `docs/roadmap/Step10AJ.md`
* `docs/roadmap/Step10AK.md`
* `docs/roadmap/Step10AL.md`
* `docs/roadmap/Step10AM.md`
* `docs/roadmap/Step10AN.md`
* `docs/roadmap/Step10AO.md`
* `docs/roadmap/Step10AP.md`
* `docs/roadmap/Step10AQ.md`
* `docs/roadmap/Step10AR.md`
* `docs/roadmap/Step10AS.md`
* `docs/roadmap/Step10AT.md`
* `docs/roadmap/Step10AU.md`
* `docs/roadmap/Step10AV.md`
* `docs/roadmap/Step10AW.md`
* `docs/roadmap/Step10AX.md`
* `docs/roadmap/Step10AY.md`
* `docs/roadmap/Step10AZ.md`
* `docs/roadmap/Step10BA.md`
* `docs/roadmap/Step10BB.md`

Also inspect the current implementation only to understand existing contracts.

Do not repeat already-closed audits unless a contradiction is discovered.

---

# 3. CURRENT FROZEN BASELINE

Treat the following as the current product baseline.

## Economy

```text
Farm production = 2 Food/tick
Well production = 2 Water/tick
Workshop production = 2 Material/tick
Workshop upkeep = 1 Material/tick
```

Colonist consumption:

```text
1 Food/tick
1 Water/tick
```

Residence capacity:

```text
1 colonist
```

Workshop storage:

```text
25 Material
```

Construction:

```text
Residence = 25 Material
Farm      = 25 Material
Well      = 25 Material
Workshop  = 25 Material + 1 Water
Road      = 5 Material
```

Construction duration:

```text
2 ticks
```

Construction Crew:

```text
+1 construction progress/tick
```

## Workforce

Workplaces are:

```text
Farm
Well
Workshop
```

Capacity:

```text
1 worker / workplace
```

Automatic assignment remains deterministic.

Manual workplace assignment remains supported.

Construction Crew remains mutually exclusive with workplace assignment.

## Roads

One-cell infrastructure.

```text
cost = 5 Material
duration = 2 ticks
```

Axis-aligned drag remains the construction interaction.

No road stacking.

No demolition.

Road networks are derived.

## Water

Freeze these semantics:

```text
capacity = staffed + operational + road-accessible Wells × 2

service = operational Residence on a network covered by an
          operational + road-accessible Well

reserve = canonical resources.water

balance = capacity - population need
```

Staffing is intentionally **not** required for coverage.

This bootstrap behavior is deliberate and CLOSED.

## Terrain

Terrain is currently only a spatial restriction:

```text
blocked cell:
- no building
- no road
- immutable
- no productivity modifier
- no bonus
```

No terrain economics.

No terrain resources.

No elevation.

No fertility.

No pollution.

No biomes.

No excavation.

## Progression

Current supported stages:

```text
Wilderness
Settlement
Village
```

Current progression contract:

### Settlement

```text
population >= 1
Food balance
operational road network
```

### Village

```text
population >= 2
Water capacity >= 2
Food balance
```

Village is currently the final implemented stage.

Town+ remains undefined.

## Objectives

Current objective system is closed and data-driven.

No historical state is inferred.

No new objective kind is justified by this step.

## Persistence

```text
SAVE_VERSION = 7
```

Derived state is not persisted.

Scenario/progression/objective framing is not persisted.

---

# 4. FIRST TASK — VERIFY THE FREEZE

Perform a lightweight audit that confirms the current baseline still matches the documented 10BB decision.

Do not rerun every historical test.

Verify:

* production constants;
* consumption constants;
* Water constants;
* Workshop upkeep;
* storage;
* SAVE_VERSION;
* progression stages;
* scenario catalogue count;
* no unexpected source modifications.

Report:

```text
Baseline freeze:
Farm = 2
Well = 2
Workshop = 2/1
Food consumption = 1
Water consumption = 1
SAVE = 7
Scenario catalogue = 7
Town = undefined
```

If any value differs from 10BB, STOP and report the discrepancy before making any decision.

---

# 5. DEFINE WHAT "TOWN" WOULD HAVE TO MEAN

Do not choose a threshold yet.

Instead, define the minimum **qualitative phenomenon** required for Town to deserve implementation.

Use this principle:

> Town must change what the player has to reason about, not merely increase the number of buildings, roads, colonists, resources, or ticks.

A candidate Town phenomenon must satisfy all of:

1. **Causal**

   * existing or explicitly identified future mechanic causes it.

2. **Persistent**

   * it survives long enough to affect strategy;
   * not merely a transient Workshop burst.

3. **Consequential**

   * different player choices produce different downstream states.

4. **Readable**

   * the player can understand why the state exists.

5. **Non-arbitrary**

   * it cannot simply be “population >= 6” unless that threshold corresponds to an actual causal change.

6. **Decision-bearing**

   * the player must make a meaningful choice because of it.

7. **Reproducible**

   * it survives deterministic replay.

Do not call a quantitative increase qualitative.

---

# 6. AUDIT CURRENT CANDIDATES

Audit the current system against these possible Town phenomena.

## A. More population

Ask:

> Does going from P=2/4 to P=6/8 introduce a new type of decision?

Expected conclusion should distinguish:

```text
scale increase
```

from:

```text
new gameplay capability
```

Do not treat scale alone as Town.

---

## B. More roads

Ask:

> Does a larger road network introduce a new causal rule?

Current expectation:

Roads increase:

* connectivity;
* distance;
* Material expenditure;
* spatial options.

But there is no congestion, capacity, traffic, or infrastructure load.

Therefore determine whether this is merely quantitative.

---

## C. More Workshops

Ask:

> Does having multiple Workshops change the economic rules?

Current Workshop behavior:

```text
production = 2
upkeep = 1
storage = 25
```

Determine whether multiple Workshops create any emergent qualitative state under frozen 2/2.

Do not invent one.

---

## D. Housing composition

Use the 10AZ evidence.

Ask whether housing composition currently creates a genuinely new rule or merely exercises:

* Water coverage;
* road connectivity;
* workforce mobility.

Record the conclusion without reopening 10AZ.

---

## E. Terrain

Use the 10AU→10AW evidence.

Ask whether terrain currently creates a new qualitative mechanic.

Expected distinction:

```text
terrain = spatial constraint
```

not:

```text
terrain = new economic system
```

Do not expand terrain in this step.

---

## F. Industrial headroom

Use 10AO/10AP/10BB.

The decisive fact is:

```text
2/2:
P=6 cannot sustain discretionary Workshop
without sacrificing a Well.

Food3:
P=6 can sustain Workshop,
but introduces broad Food surplus and rebaseline blast radius.

Water3:
P=6 can sustain Workshop,
but changes Water capacity economics and progression.

3/3:
P=3 can sustain Workshop,
which radically changes early-game pressure.
```

Record why the current decision is:

```text
KEEP 2/2
```

and why this does **not** imply that the industrial capability is useless.

The Workshop remains a temporary/burst conversion mechanism under the frozen economy.

---

# 7. IDENTIFY THE MISSING DEPENDENCY

This is the most important part of the step.

Do not answer:

> "What feature would be cool?"

Answer:

> "What causal capability is missing such that Town cannot yet represent a genuinely different phase?"

Consider only dependencies supported by existing evidence.

Possible categories:

### Category 1 — Civic/service capability

A new service that creates a new constraint or trade-off.

Example shape:

```text
population growth
        ↓
service demand
        ↓
spatial placement
        ↓
new constraint
```

But do not invent a specific service yet unless evidence justifies it.

### Category 2 — Economic transformation

A resource or production relationship that creates a new strategic conversion.

The existing Workshop is insufficient if it merely converts Water into Material temporarily.

### Category 3 — Infrastructure capacity

A road/network capability where infrastructure itself becomes a constrained resource beyond simple Material cost.

Again, do not invent congestion unless justified.

### Category 4 — Housing differentiation

Different residential forms creating different capacity/service trade-offs.

Do not add this now.

### Category 5 — Spatial specialization

Terrain/resource/land roles that create mutually exclusive spatial decisions.

Current terrain is intentionally not enough.

### Category 6 — External supply

A planet-level dependency that changes what can be built/maintained.

Do not implement electricity/imports/etc. here.

The task is only to determine whether one of these categories is actually required.

---

# 8. MINIMUM CAPABILITY TEST

For every candidate missing dependency, score it descriptively using:

| Criterion     | Question                                                         |
| ------------- | ---------------------------------------------------------------- |
| Causal        | Does it create a new cause/effect relationship?                  |
| Persistent    | Can it produce a stable state?                                   |
| Consequential | Does it change downstream outcomes?                              |
| Spatial       | Does placement matter differently because of it?                 |
| Economic      | Does it alter resource/workforce reasoning?                      |
| Readable      | Can current UI expose its state?                                 |
| Non-arbitrary | Does it arise from the simulation rather than a threshold?       |
| New decision  | Does it create a decision not already owned by another mechanic? |

Do **not** assign numeric scores.

Use:

```text
YES
PARTIAL
NO
```

The purpose is classification, not ranking.

---

# 9. AVOID THE "EVERYTHING NEEDS A NEW MECHANIC" TRAP

Explicitly test whether Town could be created from content alone.

Examples:

* higher starting population;
* larger map;
* more buildings;
* different terrain layout;
* different road budget;
* another Workshop;
* another Residence.

If these only produce larger versions of existing decisions, classify them as:

```text
content variation, not Town capability
```

Likewise, do not manufacture a Town threshold merely because the progression UI currently has a missing next stage.

---

# 10. PHASE BOUNDARY DECISION

Choose exactly one:

### DECISION A — PHASE FREEZE

Current mechanics are sufficient for the current phase.

Town remains deferred.

Next work should be a consciously selected new capability, not another economic audit.

### DECISION B — CAPABILITY IDENTIFIED

A specific missing causal capability is sufficiently justified to become the next design-contract step.

Do not implement it.

State exactly:

```text
capability
why current mechanics cannot express it
what causal relationship it introduces
what it must NOT do
```

### DECISION C — NO CAPABILITY YET

Evidence is insufficient to justify introducing anything.

Remain frozen and do not create artificial roadmap work.

---

# 11. SCENARIO POLICY

Do not add scenarios.

The current catalogue remains:

```text
7 scenarios
```

A future scenario may only be added after a new mechanic exists and demonstrates a distinct decision space.

Do not use scenarios as proof that a missing mechanic exists.

---

# 12. UX POLICY

Do not modify UI.

The current UX closure from 10BA remains accepted.

Do not reopen:

* served wording;
* colony-wide served count;
* placement spatial preview;
* workforce diagnosis;
* HUD collapse;
* terrain legend.

Only record them as closed evidence where relevant.

---

# 13. VALIDATION

Because this is audit-only, perform only the minimum validation necessary to prove the repository remains healthy.

Run:

```text
typecheck
lint
build
```

Run the relevant deterministic baseline checks.

Do not create large new test suites merely to make the step look substantial.

If browser verification is useful for confirming an existing contract, use the real browser.

If GPU rendering is exercised, use the real headed GPU path.

Do not modify production code to make the audit pass.

---

# 14. DOCUMENTATION

Create:

```text
docs/roadmap/Step10BC.md
```

The document must contain:

1. Scope
2. Starting commit
3. Frozen baseline
4. Town definition
5. Candidate audit
6. Missing dependency analysis
7. Capability matrix
8. Content-vs-capability analysis
9. Scenario policy
10. Decision
11. Deferred items
12. Validation
13. Final report

Do not rewrite historical roadmap documents.

---

# 15. REQUIRED FINAL REPORT

Finish the step with exactly this structure:

```text
Step 10BC — COMPLETE

Starting commit: ...
Final commit: ...

Decision: A / B / C

## Frozen baseline

Farm:
Well:
Workshop:
Food consumption:
Water consumption:
SAVE_VERSION:
Scenario catalogue:
Current final stage:

## Town contract

What Town would need to represent:

...

What does NOT qualify as Town:

...

## Candidate audit

Population:
Roads:
Workshops:
Housing composition:
Terrain:
Industrial headroom:

## Missing dependency

...

## Capability matrix

| Candidate | Causal | Persistent | Consequential | Spatial | Economic | Readable | Non-arbitrary | New decision |
|---|---|---|---|---|---|---|---|---|

## Content vs capability

...

## Scenarios

Catalogue unchanged: 7

## Implementation

Production code changed: NO
Mechanics changed: NO
SAVE_VERSION changed: NO

## Validation

typecheck:
lint:
build:
tests:
determinism:
insertion-order:
save/load:
browser:
GPU:

## Final classification

...

## Next dependency

...
```

The final report must clearly separate:

* what is already supported;
* what is merely quantitative;
* what is genuinely missing;
* what is intentionally deferred.

Do not sneak a feature proposal into implementation.

---

# 16. SUCCESS CONDITION

10BC is successful if, at the end:

* 2/2 remains frozen;
* no economic constants changed;
* no mechanics changed;
* no scenario was added;
* no Town threshold was invented;
* the current phase boundary is explicit;
* the missing dependency, if any, is causally justified;
* the next step is obvious without another generic audit.

The desired outcome is **clarity**, not code volume.


# Documentation (as-built) — Step 10BC

Starting commit: `c7a66d7` (Step 10BB).
Final commit: this commit.

## 1. Scope

Design/architecture **freeze audit only**. `src/` is untouched: no constant,
rule, semantic, scenario, objective, progression, persistence, rendering or UI
change. The step adds one lean audit file
(`tests/phaseFreezeTownDependencyAudit.test.ts`, 14 tests) and this document.
It does not re-run the historical audits; it verifies their conclusions and
records the phase boundary.

## 2. Starting commit

`c7a66d7` — Step 10BB (industrial headroom & Town tuning decision gate), which
closed the Farm/Well production-rate debate with **DECISION A — KEEP 2/2**.
That decision is not reopened here.

## 3. Frozen baseline (re-read from the code, `AUDIT FROZEN_BASELINE`)

```text
Farm production        2 Food/tick        Well production      2 Water/tick
Workshop production    2 Material/tick    Workshop upkeep      1 Material/tick
Food consumption       1 / colonist/tick  Water consumption    1 / colonist/tick
Residence capacity     1 colonist         Workshop storage     25 Material
Residence / Farm / Well 25 Material       Workshop             25 Material + 1 Water
Road                   5 Material, 2 ticks
Construction           2 ticks (1 with a Construction Crew)
SAVE_VERSION           7                  Scenario catalogue   7 (+1 test fixture)
Stages                 Wilderness → Settlement → Village (Town undefined)
Objective kinds        5 (stage, population, waterCapacity, foodBalance, building)
```

`AUDIT SOURCE_DRIFT`: 15 domain files, 35 source files, 8 terrain readers, **no**
`TerrainSystem` / `WaterSystem` / `ServiceSystem` / `TownSystem` / `BiomeSystem` /
`DemandSystem` / `TaxSystem` / `ZoningSystem`, **no** Town stage, condition,
value or helper (the single mention of the word is the deliberate deferral
comment in `progression.ts`). Nothing differs from 10BB — no discrepancy to
report, so the decision work proceeds.

The two closed semantics anchors were re-verified rather than re-audited:
Water (`AUDIT WATER_ANCHOR`) — coverage follows an operational road-accessible
Well (2 served Residences) while capacity stays `staffed Wells x 2`; Terrace
(`AUDIT TERRAIN_ANCHOR`) — a never-targeted blocked set leaves the 60-tick
trajectory byte-identical, both placement validators refuse `terrainBlocked`, and
no production modifier exists.

## 4. Town definition (the minimum qualitative phenomenon)

Town must change **what the player has to reason about**, not how much of the
same exists. A candidate Town phenomenon must be **causal, persistent,
consequential, readable, non-arbitrary, decision-bearing and reproducible**
(§5 of the step).

What does **not** qualify as Town: more population, more buildings, more road
cells, more stored Material, a bigger map, a richer starting stock, or a
transient Workshop burst. Measured anchor (`AUDIT PROGRESSION_ANCHOR`): the
progression contract has **no** next stage after Village (`nextStage null`,
`deferred true`, 0 next conditions) and nothing about Town is persisted.

## 5. Candidate audit (§6)

```text
A. More population   — QUANTITATIVE. AUDIT CANDIDATE_POPULATION: the legal action
   set is IDENTICAL at P=2 and P=8 (residence/farm/well/workshop + roads all
   legal, `true,true,true,true`); only the counts differ. No new decision type.
B. More roads        — QUANTITATIVE. AUDIT CANDIDATE_ROADS: one shared access
   cell and three dedicated access cells with the same topology give identical
   networks, coverage, capacity and employment (1 vs 3 road cells; Material is
   the only difference). There is no congestion, load, capacity or traffic rule.
C. More Workshops    — QUANTITATIVE (and worker-bound). AUDIT CANDIDATE_WORKSHOPS:
   storage scales linearly (0 → 50 for two), and at 2/2 the second Workshop is
   only staffable by vacating survival workplaces (measured: 2 staffed Workshops
   with 2 vacant survival workplaces at P=4; spare workers 0). No rule changes.
D. Housing composition — REAL BUT OWNED BY EXISTING RULES (10AZ, closed).
   AUDIT CANDIDATE_HOUSING: the identical four buildings give capacity 2 / served
   2 / employed 2 / Village on one composition and capacity 0 / served 0 /
   employed 1 / not-Village on the other; the difference is produced by the
   existing placement, 09D network, 10P coverage and 09K mobility contracts, and
   it is reachable with the existing placement command.
E. Terrain           — SPATIAL CONSTRAINT ONLY (10AU→10AW, closed). Refuses
   buildings and roads, immutable, no productivity/bonus/economic role; its
   decision space is a strict subset of the open map.
F. Industrial headroom — CLOSED AS A TUNING QUESTION (10BB, decision A). At 2/2
   no population sustains a staffed Workshop (measured: spare 0 at even P, −1 at
   odd P, 0 staffed Workshops at P=2…12); the Workshop stays a temporary,
   reserve-funded conversion, which does not make it useless.
```

## 6. Missing dependency analysis (§7)

The single structural fact the whole audit keeps returning to
(`AUDIT DISCRETIONARY_LABOUR`, P = 2…12): **the survival economy consumes every
colonist** — `spare = 0` at even populations and `−1` at odd ones (one workplace
permanently vacant) — so there is no labour the colony does not strictly need,
and no persistent state in which a second activity can exist.

That narrows the missing dependency to a **shape**, not a feature:

```text
a PERSISTENT second claim on a resource the colony already saturates
(labour, and only labour is saturated: Material accumulates, Water is a gate,
 space costs Material but is never scarce)
```

Six categories were classified (no numeric scores; YES / PARTIAL / NO):

* **Civic/service capability** — the shape closest to what the model lacks, and
  the one place where a real service already exists (Water, 10P). But every other
  instance is closed evidence: Food distribution (10AG), power coverage (10X: a
  Water clone, C), sanitation (D), education (C, no consumer), shelter quality
  (10V/10W: no independent consequence).
* **Economic transformation** — the Workshop's conversion is real but temporary
  and reserve-bound; the recurring producer input was rejected twice
  (10T/10U, 10AA/10AB) and replaced by a one-off construction cost (10AD);
  10BB measured the burst as rate-invariant.
* **Infrastructure capacity** — no such rule exists (measured above).
* **Housing differentiation** — 10V/10W: no independent consequence.
* **Spatial specialization** — terrain is a subset of the open map (10AW).
* **External supply** — no external state exists in the runtime (10AK: Autonomy
  has no referent); a planet-level dependency would be a new subsystem rather
  than a dependency of this model, and was never measured.

## 7. Capability matrix (§8)

| Candidate | Causal | Persistent | Consequential | Spatial | Economic | Readable | Non-arbitrary | New decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Civic/service capability | PARTIAL | YES | YES | YES | PARTIAL | YES | PARTIAL | **NO** |
| Economic transformation | PARTIAL | NO | YES | NO | YES | YES | PARTIAL | **NO** |
| Infrastructure capacity | NO | NO | NO | PARTIAL | PARTIAL | YES | NO | **NO** |
| Housing differentiation | PARTIAL | YES | PARTIAL | YES | PARTIAL | PARTIAL | PARTIAL | **NO** |
| Spatial specialization | PARTIAL | YES | PARTIAL | YES | PARTIAL | YES | NO | **NO** |
| External supply | PARTIAL | PARTIAL | PARTIAL | NO | PARTIAL | NO | NO | PARTIAL |

No row is all-YES, and **no row claims a new decision** — the decisive criterion
fails for every category. The evidence therefore justifies *no* capability today;
what it justifies is the direction (a second claim on saturated labour).

## 8. Content versus capability (§9)

`AUDIT CONTENT_VS_CAPABILITY`: a lean start (P = 2, 1 Farm, 1 Well, Material 25,
Food 50) and a rich start (P = 6, 3 Farms, 3 Wells, 1 Workshop, Material 500,
Food 500, Water 200, 24×10 map) share the same catalog prices, the same
progression condition set and the same legal action types; only quantities
differ — and the rich start is still bounded by the same 2/2 identity
(`spare ≤ 0`). Content variation (population, map size, buildings, terrain
layout, road budget, another Workshop or Residence) therefore produces **larger
versions of existing decisions, not Town capability**, and no threshold may be
manufactured merely because the progression UI has an empty next stage.

## 9. Scenario policy (§11)

Catalogue unchanged: **7**. No scenario was added, none modified. Per policy, a
future scenario may only be added after a new mechanic exists and demonstrates a
distinct decision space; scenarios are never used as proof that a mechanic is
missing (10AZ already showed the reverse: a real phenomenon with no distinct
scenario).

## 10. Decision (§10)

```text
DECISION A — PHASE FREEZE
```

The current mechanics are sufficient for the current phase. Town remains
deferred. Because no category passes the capability test (§7), the C-condition
("no capability justified") is also satisfied — but the boundary is now
**explicit**, so the next work is a conscious product choice rather than another
audit:

* either ship content on the frozen model (10AZ's housing phenomenon is
  content-blocked, not readability- or capability-blocked), or
* spend exactly **one** capability step on the identified direction — a
  persistent second claim on saturated labour — knowing that every concrete
  instance of it so far has been classified C or D, and that it must be
  specified before it is implemented.

Nothing in this step authorises implementation, a Town threshold, a rate change,
or a new resource.

## 11. Deferred items

```text
Town stage, Town threshold, Town condition        — deferred (needs a capability)
Production-rate tuning (Food3 / Water3 / Food3+Water3) — rejected for now (10BB)
Housing-composition scenario                      — classified B, not added (10AZ)
Terrain legend / HUD occlusion follow-ups         — closed in 10BA
A "sustainably staffed Workshop" UI indicator     — noted only (10BB §12)
External supply / planet-level dependency         — never measured; not justified
```

## 12. Validation

```text
typecheck PASS · lint PASS · build PASS
Vitest 84 files / 1575 tests PASS (+1 file / +14 tests; 83/1561 before)
determinism PASS · insertion-order PASS · save/load PASS
browser 18 / 18 suites headless ALL PASS
GPU E2E ALL PASS (headed)
src/ unchanged · SAVE_VERSION 7 · catalogue 7
```

---

## 13. Final report

```text
Step 10BC — COMPLETE

Starting commit: c7a66d7 (Step 10BB)
Final commit:    this commit

Decision: A

## Frozen baseline

Farm: 2 Food/tick
Well: 2 Water/tick
Workshop: 2 Material/tick gross, 1 upkeep/tick, 25 storage
Food consumption: 1 / colonist / tick
Water consumption: 1 / served colonist / tick
SAVE_VERSION: 7
Scenario catalogue: 7 (+1 test fixture)
Current final stage: Village

## Town contract

What Town would need to represent:
a state that changes what the player must reason about — causal, persistent,
consequential, readable, non-arbitrary, decision-bearing and reproducible —
i.e. a persistent second claim on a resource the colony already saturates
(measured: labour is the only saturated one; `spare = 0` at even P and `−1` at
odd P for P = 2…12, and no Workshop is ever staffed at 2/2).

What does NOT qualify as Town:
more population, more buildings, more road cells, more stored Material, a bigger
map, a richer starting stock, a transient Workshop burst — measured: the legal
action set is identical at P = 2 and P = 8, one or three access road cells give
identical flows, and a second Workshop is linear in storage and worker-bound.

## Candidate audit

Population: QUANTITATIVE — identical action set at P=2 and P=8; scale only.
Roads: QUANTITATIVE — no capacity/load/congestion rule; 1 vs 3 access cells give
identical networks, coverage, capacity and employment.
Workshops: QUANTITATIVE and worker-bound — storage scales linearly (0 → 50) and
the second Workshop is only staffable by vacating survival workplaces at 2/2.
Housing composition: REAL BUT OWNED BY EXISTING RULES — the same four buildings
give capacity 2 / Village or capacity 0 / not-Village; produced by placement,
09D networks, 10P coverage and 09K mobility (10AZ: B, no scenario added).
Terrain: SPATIAL CONSTRAINT ONLY — refuses buildings and roads, immutable, no
modifier; its decision space is a strict subset of the open map (10AW).
Industrial headroom: CLOSED AS A TUNING QUESTION — 2/2 sustains no Workshop at
any population; the tuning options were rejected (10BB, decision A); the
Workshop stays a temporary reserve-funded conversion.

## Missing dependency

A persistent second claim on saturated labour. The model's only always-saturated
resource is labour (Material accumulates, Water is a gate, space costs Material
but is never scarce), so every candidate phase change must either consume labour
in a new, persistent way or accept being quantitative. No concrete instance of
that shape is justified by the evidence: the civic/service category holds the
shape (Water is the one implemented service) but each further instance is closed
(10AG, 10X, 10V/10W), the economic-transformation shape is temporary and
reserve-bound (10AA/10AB, 10AD, 10BB), infrastructure capacity does not exist in
the model, housing differentiation has no independent consequence, spatial
specialization is a subset, and external supply has no referent in the runtime
(10AK).

## Capability matrix

| Candidate | Causal | Persistent | Consequential | Spatial | Economic | Readable | Non-arbitrary | New decision |
|---|---|---|---|---|---|---|---|---|
| Civic/service capability | PARTIAL | YES | YES | YES | PARTIAL | YES | PARTIAL | NO |
| Economic transformation | PARTIAL | NO | YES | NO | YES | YES | PARTIAL | NO |
| Infrastructure capacity | NO | NO | NO | PARTIAL | PARTIAL | YES | NO | NO |
| Housing differentiation | PARTIAL | YES | PARTIAL | YES | PARTIAL | PARTIAL | PARTIAL | NO |
| Spatial specialization | PARTIAL | YES | PARTIAL | YES | PARTIAL | YES | NO | NO |
| External supply | PARTIAL | PARTIAL | PARTIAL | NO | PARTIAL | NO | NO | PARTIAL |

## Content vs capability

Content variation — higher starting population, larger map, more buildings,
different terrain layout, different road budget, another Workshop or Residence —
produces larger versions of existing decisions and no new rule (measured: the
same catalog prices, the same progression condition set, the same legal action
types, and the same `spare ≤ 0` identity). It is classified as content variation,
not Town capability, and no threshold was invented to fill the empty next stage.

## Scenarios

Catalogue unchanged: 7

## Implementation

Production code changed: NO
Mechanics changed: NO
SAVE_VERSION changed: NO

## Validation

typecheck: PASS
lint: PASS
build: PASS
tests: 84 files / 1575 tests PASS (+1 file / +14 tests)
determinism: PASS
insertion-order: PASS
save/load: PASS
browser: 18 / 18 suites headless ALL PASS
GPU: ALL PASS (headed)

## Final classification

ALREADY SUPPORTED: the frozen 2/2 economy, Water semantics (10AY), terrain as
spatial input (10AU-AW), the 5 objective kinds, the 3 stages, the 7 scenarios,
and the 10BA UX surfaces.
MERELY QUANTITATIVE: population, roads, Workshops, storage, map size, starting
stock, a second Workshop or Residence.
GENUINELY MISSING: a persistent second claim on saturated labour (a phase
capability, not a service instance).
INTENTIONALLY DEFERRED: Town (no threshold), the production-rate tuning (10BB),
the housing-composition scenario (10AZ, classification B), a per-Workshop
"sustainably staffed" indicator, external supply.

## Next dependency

A product decision, not another audit: either ship content on the frozen model
(10AZ's housing phenomenon is content-blocked only) or authorise exactly one
capability step for "a persistent second claim on saturated labour", specified
before implementation. No Town threshold, no rate change and no new resource is
authorised by this step.
```
