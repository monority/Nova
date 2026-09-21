# Step 10AA — Producer Dependency Design Audit

## Starting state

Repository starts from:

* commit `090a249` — `Step 10Z: audit construction crew economics`
* Step 10Z classified Construction Crew as **B — useful but incomplete**.
* `src/` must remain untouched.
* This is an **audit/design step only**.

## Objective

Find one concrete producer → producer dependency that can be introduced later without:

* adding a generic production framework;
* adding a new resource merely for the sake of complexity;
* creating a mandatory tax;
* creating a circular dependency;
* creating an unrecoverable bootstrap deadlock;
* duplicating Water/Food's existing roles;
* invalidating the current workforce model.

The candidate must give Construction Crew a potential **persistent economic consequence**:

```text
construction finishes earlier
        ↓
producer becomes available earlier
        ↓
required input is available earlier
        ↓
output starts earlier
        ↓
resource / population / expansion trajectory differs
```

Do not implement the candidate.

---

# 1. Current production graph

Start from the actual current graph:

```text
Farm
  → Food

Workshop
  → Material
  → Material upkeep

Well
  → Water

Material
  → construction

Food
  → survival

Water
  → growth / admission

Construction
  → Residence / Farm / Workshop / Well
```

The missing structural edge is:

```text
Producer A
  → input
  → Producer B
  → output
```

Find the smallest concrete edge that adds meaningful causality.

---

# 2. Candidate discovery

Audit at least these categories:

### A — Workshop input

Example shape:

```text
Workshop output
  ↓
input required by another producer
  ↓
producer output
```

### B — Farm input

Example shape:

```text
Material
  ↓
Farm operating input
  ↓
Food
```

However, explicitly test whether this merely becomes the rejected "Farm tax" from 10T.

### C — Well input

Example shape:

```text
Material
  ↓
Well operation
  ↓
Water
```

Explicitly test against the conclusions from 10T/10U/10P.

### D — New concrete producer building

A new producer may be considered only if it creates a dependency that cannot be represented cleanly with the existing three producer types.

If proposed, keep it concrete.

Do not create a generic producer/input system.

---

# 3. Counterfactual requirement

For each candidate, construct an audit-only model.

Measure:

* no input
* sufficient input
* partial input
* depleted input
* producer unavailable
* producer operational but unstaffed
* producer operational and staffed
* input producer operational but unstaffed
* disconnected input producer
* disconnected consumer producer

Do not add the rule to `src/`.

Model the candidate in tests/helpers or an isolated audit model.

---

# 4. Bootstrap test

Every candidate must answer:

> Can the colony bootstrap from the existing starting state?

Trace:

```text
initial resources
→ first Residence
→ first colonist
→ first producers
→ first input
→ first consumer producer
→ output
```

Explicitly test:

* zero input
* one input-producing worker
* one consumer-producing worker
* one worker total
* two workers
* three workers

Identify:

* first productive tick;
* minimum workforce;
* minimum starting stock;
* whether recovery is possible after depletion.

Any candidate requiring an unavailable future building/resource to start itself is a bootstrap deadlock.

---

# 5. Recovery / deadlock audit

For each candidate, deliberately force:

```text
input = 0
```

Then measure whether the colony can recover.

Test at least:

### A — Temporary shortage

Input reaches zero for one tick.

### B — Extended shortage

Input remains zero for several ticks.

### C — Producer loss

Input-producing workplace becomes unavailable.

### D — Workforce reassignment

Input producer loses its worker.

### E — Construction disruption

Input-producing building is under construction.

For each:

```text
Can input recover?
Can output recover?
Can population survive?
Can the player make a meaningful corrective decision?
```

Reject any candidate where the only recovery is an impossible sequence.

---

# 6. Circularity audit

Explicitly search for cycles.

For example:

```text
A needs B
B needs A
```

or indirect cycles:

```text
A → B → C → A
```

A candidate is acceptable only if the dependency graph has a clear bootstrap root using existing resources/buildings.

Do not rely on "the player probably builds it in the right order."

---

# 7. Economic pressure

The dependency must create a real choice.

Measure whether it changes:

* workforce allocation;
* construction order;
* building placement;
* production ratios;
* stock trajectory;
* expansion timing;
* recovery strategy.

Reject candidates whose only effect is:

```text
resource X decreases by N every tick
```

with no corresponding decision.

This specifically protects against repeating:

* Farm upkeep experiments 10G–10J;
* Farm input rejection in 10T;
* recurring Material demand rejection in 10U.

---

# 8. Construction Crew interaction

For every viable candidate, run:

```text
WITHOUT CREW
WITH CREW
```

The question is:

> Does completing the producer one tick earlier now create a measurable downstream advantage?

Examples of valid evidence:

```text
producer completes at tick 2
input becomes available at tick 2
consumer starts at tick 3

vs

producer completes at tick 1
input becomes available at tick 1
consumer starts at tick 2
```

If the earlier producer completion does not propagate downstream, explain why.

This is the primary reason for this audit.

---

# 9. Workforce competition

The existing workforce is type-blind across:

```text
Farm
Workshop
Well
```

A candidate must fit that model.

Measure:

```text
input worker
consumer worker
construction crew
```

as competing uses of the same colonists.

Determine whether the dependency creates a genuine opportunity cost.

Do not introduce priority systems or automatic optimization.

Manual reassignment remains the existing agency mechanism.

---

# 10. Spatial interaction

Audit whether the candidate can meaningfully interact with existing spatial rules.

Do not add new spatial mechanics.

Compare:

* same network;
* different network;
* roadless input producer;
* roadless consumer producer;
* operational but unstaffed input producer;
* operational and staffed input producer.

If the candidate is inherently global, document why.

A candidate that merely clones Water's network coverage semantics should be treated skeptically.

---

# 11. Construction ordering

Test whether the candidate makes build order matter.

Compare at least:

```text
input producer → consumer producer
consumer producer → input producer
```

and, where relevant:

```text
input producer + crew
consumer producer + crew
```

The desired property is not arbitrary punishment for the wrong order.

The desired property is:

> Build order becomes a meaningful optimization because the simulation contains a causal dependency.

---

# 12. Persistence impact

Since this is audit-only:

* no SAVE version change;
* no persisted state;
* no production framework;
* no generic dependency representation.

Document the likely persistence impact of the eventual implementation only if necessary.

Do not modify save code.

---

# 13. Candidate classification

Classify every candidate:

* **A — implementation candidate**
* **B — interesting but incomplete**
* **C — premature**
* **D — reject**

For every A candidate, provide:

1. exact input;
2. exact producer;
3. exact output;
4. bootstrap path;
5. recovery path;
6. workforce tradeoff;
7. spatial consequence;
8. Construction Crew propagation;
9. why it does not duplicate an existing gate;
10. why it is not merely a recurring tax.

There should be **at most one A candidate**.

If there is no defensible A candidate, say so.

---

# 14. Decision rule

Prefer the candidate with the smallest causal addition that creates the largest meaningful downstream consequence.

Do not optimize for feature count.

Do not introduce:

* generic InputSystem
* generic ProductionSystem
* RecipeSystem
* DependencySystem
* ResourceNetwork
* NeedSystem
* ServiceSystem
* PrioritySystem
* automation
* generalized logistics

The eventual implementation should remain concrete and local to the chosen producer.

---

# 15. Verification

Because this is audit-only:

* focused audit tests
* full Vitest
* typecheck
* lint
* build
* browser E2E
* GPU/browser verification where applicable
* deterministic audit replay
* insertion-order independence

Confirm:

```text
git diff -- src/
```

is empty.

No gameplay behavior may change.

---

# 16. Final report

Return:

```text
STEP 10AA — COMPLETE

Starting commit:
Final commit:

SRC CHANGES:
NONE

Candidate A:
...

Candidate B:
...

Candidate C:
...

Candidate D:
...

Bootstrap:
...

Recovery:
...

Circularity:
...

Workforce:
...

Spatial:
...

Construction Crew propagation:
...

Classification:
...

Chosen implementation candidate:
...

Exact future dependency:
...

Why it is not a tax:
...

Why it is not a duplicate of Food/Water:
...

Why it gives Construction Crew persistent value:
...

Rejected candidates:
...

Next implementation step:
...
```

The key conclusion must be causal, not cosmetic:

> Which concrete producer dependency makes earlier construction create a downstream economic difference that persists beyond the single construction tick?

Do not implement it in Step 10AA.



---

## As-Built / Audit Report

**Type: AUDIT / DESIGN (Step 10AA) — producer dependency.** `src/` is untouched
(`git diff -- src/` empty). Evidence comes from
`tests/producerDependencyDesignAudit.test.ts` (24 tests); every number below is a
real `AUDIT ...` line. Candidate rules are modelled **in the audit file only**,
as a phase-exact mirror of `stepSimulation` (asserted byte-identical when the
rule is disabled).

### Repository

* starting commit `090a249` (Step 10Z);
* production code changed: **none**;
* tests added: `tests/producerDependencyDesignAudit.test.ts` (24);
* docs changed: this file.

### 1. Current production graph

`AUDIT PRODUCTION_GRAPH`:

```text
Farm -> Food                 Workshop -> Material (+ 1/tick upkeep per staffed Workshop)
Well -> Water                Material -> construction
Food -> survival             Water -> growth/admission
Construction -> Residence / Farm / Workshop / Well
```

Existing producer inputs: workforce (1 colonist each), 09E road access, the
25-Material storage cap. The missing edge is `Producer A -> input -> Producer B`.

### 2. Candidate discovery

`AUDIT CANDIDATES` — six concrete shapes were examined:

| id | shape | verdict |
| --- | --- | --- |
| A1 | Well → Water → Workshop → Material (1 Water per staffed Workshop per tick) | the live candidate |
| A2 | Farm → Food → Workshop (workers fed at work) | reject — turns a production choice into starvation |
| B1 | Workshop → Material → Farm (tools) | reject — the Step 10T "Farm tax" |
| B2 | Well → Water → Farm (irrigation) | reject — survival spiral (re-measured) |
| C1 | Workshop → Material → Well (pump parts) | B — the 10U recurring-Material shape |
| D1 | new producer building | C — needs a new output resource |

A spatial clone (Workshop requires a Well on its road network) was rejected: it
merely re-uses the 10P coverage semantics.

### 3. Counterfactual matrix

`AUDIT MATRIX_WORKSHOP_WATER` (3 colonists, farm + workshop + well):

| case | Material | staffed Workshops | Water |
| --- | --- | --- | --- |
| no input (`rule none`) | 1 | 1 | 0 |
| sufficient input | 99 | 1 | 98 |
| **depleted input** | **0** | **0** | 0 |
| producer unavailable | 0 | 0 | 0 |
| consumer unstaffed | 0 | 0 | 0 |

`AUDIT MATRIX_WELL_MATERIAL` and `AUDIT MATRIX_FARM_WATER` give the same shape
for their producers. The gate is all-or-nothing per producer, so an unpaid plant
is **idle**: no output and no upkeep.

### 4. Bootstrap

`AUDIT MINIMUM_WORKFORCE`: the chain Farm + Well + Workshop needs **three**
colonists (1 colonist → only the farm runs, Material 0; 2 → farm + workshop,
Material 3; 3 → all three links).

`AUDIT CIRCULARITY`: with Water 0 and a staffed Well the Well **still produces**
(`wellProductiveAtZeroWater: true`), so there is no runtime production lock. The
route cycle `Water → Workshop → Material → Well` passes through **construction**
(a 25-Material build), not through runtime production, so the dependency graph
for production stays acyclic.

`AUDIT BOOTSTRAP_WORKSHOP_WATER`: the intended order works
(initial 100 Material → Residence → colonist → Well → Water → Workshop).
**But** a colony with no operational Well and 0 Material could never produce
Material again, so the candidate needs a bootstrap rule — and the Step 10P-style
exemption ("the input is inactive until the colony owns an operational Well")
has a measured cost, see §11.

### 5. Recovery / deadlock

| forced failure | result |
| --- | --- |
| temporary shortage (1 tick) | `AUDIT RECOVERY_TEMPORARY`: Material 50 → 49; the plant resumes next tick |
| extended shortage | `AUDIT RECOVERY_EXTENDED`: the population survives (Water is a growth gate, not survival); the manual correction was rejected by the existing `workplaceOccupied` rule, and recovery is via a free workplace |
| producer loss (Well removed) | `AUDIT RECOVERY_LOSSES`: Material still flows (47) via the exemption — the Well-less colony is never locked |
| workforce loss | the Well worker moves away; the Workshoid idles but the colony survives |
| under-construction producer | contributes no Water and no coverage, matching the existing lifecycle |

`AUDIT LIMIT_CYCLE` is the important one. At the **10S admission maximum** the
net Water per tick is exactly the Workshop's demand, so the plant alternates:

```text
tick 1 staffed 0 material 0     tick 6 staffed 1 material 3
tick 2 staffed 1 material 1     tick 7 staffed 0 material 3
tick 3 staffed 0 material 1     tick 8 staffed 1 material 4
```

Material still flows (one per two ticks) and the colony is **never locked** —
the population can never outgrow the production the admission gate let in. But
industry output is halved at the growth ceiling: that is the growth-vs-industry
pressure, measured.

### 6. Circularity

No runtime cycle (§4). The only cycle in the graph runs through construction and
is therefore escapable: a staffed Well produces Water even at Water 0, and a
Well-less colony still runs its Workshops under the bootstrap rule.

### 7. Economic pressure (the decision)

`AUDIT ALLOCATION_DECISION` + `AUDIT INFRASTRUCTURE_RATIO`:

```text
one Well (2 Water/tick) supports:  2 colonists  OR  1 colonist + 1 Workshop  OR  2 Workshops
2 staffed Workshops with 1 Well  -> only ONE is ever paid (Material 4, not 8)
```

The input turns Water from a single-sink growth resource into a **two-sink
allocation**: every staffed Workshop is one colonist's worth of Water capacity
that the colony does not get to grow into. That is a decision with a measurable
building-ratio consequence, not a uniform drain.

### 8. Construction Crew propagation

`AUDIT CREW_PROPAGATION_WORKSHOP_WATER`: a Water-limited colony with a second
Well under construction, crewed by a spare colonist that is *not* the future
operator (excluding the 10Z absorption effect):

```text
uncrewed: firstPaidTick 2, material at horizon 6
crewed:   firstPaidTick 2, material at horizon 6   -> delta 0
```

`AUDIT CREW_PROPAGATION_MATRIX` over 12 ticks: `none` delta 0,
`workshopWater` delta 0, `wellMaterial` delta 0.

**Causal finding:** a producer dependency raises the *ceiling* of the crew's
value from "one construction tick" to "at most one downstream producer tick" —
and even that only while the downstream producer is input-starved. In NOVA the
extra Water is exactly what the admission gate spends, so the surplus is
absorbed by growth and the horizon difference washes out (the Step 10Z result,
now with an explicit reason). The dependency does **not** make a single tick
compound.

### 9. Workforce

`AUDIT WORKFORCE_COMPETITION`: the chain uses the same type-blind colonists —
input worker (Well), consumer worker (Workshop) and the crew all compete, and on
a crew tick the Workshop is unstaffed (`farms 1, workshops 0, wells 1`). Minimum
viable chain: three colonists (§4). No priority system or automatic
optimization is introduced; manual reassignment (10M) stays the only agency
mechanism.

### 10. Spatial

`AUDIT SPATIAL_BEHAVIOUR`: the candidate is **inherently global** — Water is a
stock, not a coverage set, so no new spatial rule is added and no network shape
is rewarded. The only spatial interaction is the pre-existing 09E requirement
that both producers have road access to be staffed at all.

### 11. Build order — the blocking finding

`AUDIT BUILD_ORDER` (Workshop injected before a Well vs after):

```text
Workshop first (t1), Well second (t4):  first Workshop output at tick 2   (3 free ticks)
Well first (t1), Workshop second (t4):  first Workshop output at tick 5
```

Under the bootstrap exemption the Workshop **runs for free until the first Well
exists**, so the rule inverts its own intent: the optimal opening is to build
industry first and delay Water. Without the exemption the opposite failure
appears: a colony that spends its 100 starting Material on residences and owns
no Well can never produce Material again — an unrecoverable deadlock, because
building a Well needs 25 Material and only Workshops make Material.

Both horns were measured; neither is acceptable as-is. This is why the candidate
is **B, not A**: it needs a bootstrap rule that is both deadlock-free and free of
the inverted incentive (a scoped rule, a construction-time precondition, or an
explicitly documented tradeoff).

### 12. Persistence impact

`AUDIT PERSISTENCE_AND_DETERMINISM`: audit hash `84e0adbe5db707f7`, replay stable,
insertion-order stable, save/load byte-stable, `SAVE_VERSION = 7`. A future
implementation needs **no new persisted state** (the input is derived from the
staffed-producer count and the existing stock), so no SAVE bump is implied by
the dependency itself.

### 13. Classification

```text
A — implementation candidate:   NONE (no candidate is defensible without first
                                resolving the bootstrap-rule tension in §11)
B — interesting but incomplete: Workshop <- Water (1 Water per staffed
                                operational Workshop per tick)
C — premature:                  new producer building (needs a new output resource)
D — reject:                     Farm <- Material (10T tax), Farm <- Water
                                (survival spiral), Workshop <- Food (survival
                                duplicate), Well <- Material (10U recurring
                                Material shape), spatial coverage clone (10P)
```

The B candidate, in full:

1. **exact input** — 1 Water per staffed operational Workshop per tick, paid
   from the Water stock, all-or-nothing per producer;
2. **exact producer** — the existing Workshop (no new building);
3. **exact output** — unchanged: 2 Material per staffed Workshop per tick;
4. **bootstrap path** — 100 Material → Residence → first colonist → Well
   (25 Material, no Water required) → Water 2/tick → Workshop (25 Material);
   the rule must guarantee recovery for a Well-less colony (open item, §11);
5. **recovery path** — the population never starves from a Water shortage
   (10P); recovery is manual reassignment (10M) freeing a workplace, or more
   Wells; the admission gate makes an over-populated lock impossible;
6. **workforce tradeoff** — a three-link chain needs three colonists; the input
   worker, the consumer worker and the crew compete for the same pool;
7. **spatial consequence** — none added; global stock allocation only;
8. **Construction Crew propagation** — bounded to one downstream producer tick,
   measured 0 in the tested fixtures because the Water surplus is absorbed by
   growth;
9. **why it does not duplicate a gate** — it adds no survival rule and no
   admission rule; it creates a **competing demand** on the existing Water
   stock, which is the only way to produce an allocation decision without a new
   resource;
10. **why it is not merely a tax** — the demand is optional and allocative: the
    player chooses how many Workshops to staff and how many Wells to build, and
    the same Water buys either colonists or industry (measured: 1 Well = 2
    colonists *or* 1 colonist + 1 Workshop *or* 2 Workshops).

### 14. Verification

1. audited the current implementation (source read, no edits);
2. focused audit tests — **24 passed**;
3. full Vitest — **53 files, 1089 tests passed**;
4. `tsc --noEmit` — passed; 5. `eslint .` — passed; 6. `npm run build` — passed;
7. browser E2E — run, road, transport, production, resource, food, temporal,
   jobs, upkeep, reassign, water, crew: **all pass**;
8. GPU E2E — ALL PASS;
9. deterministic audit replay — stable;
10. insertion-order independence — stable;
11. `git diff` inspected;
12. `git diff -- src/` — **empty**.

### 15. Commit

* Message: `Step 10AA: audit producer dependency design`
* Parent: `090a249` (Step 10Z)

---

## Final report (Step 10AA)

```text
STEP 10AA — COMPLETE

Starting commit: 090a249 (Step 10Z)
Final commit:    this audit commit

SRC CHANGES:
NONE

Candidate A:
none defensible yet.

Candidate B:
Workshop <- Water: 1 Water per staffed operational Workshop per tick, paid from
the Water stock, all-or-nothing (an unpaid plant is idle: no output, no upkeep).
Models measured in tests/producerDependencyDesignAudit.test.ts only.

Candidate C:
A new concrete producer building — premature: every existing output already has
a producer, so a new producer requires a new output resource and a new sink.

Candidate D:
Farm <- Material (Step 10T tax), Farm <- Water (survival spiral), Workshop <-
Food (survival duplicate), Well <- Material (Step 10U recurring-Material shape),
and a spatial coverage clone of the 10P Well network.

Bootstrap:
Residence -> colonist -> Well (no Water needed) -> Water -> Workshop is valid.
MINIMUM_WORKFORCE: the Farm+Well+Workshop chain needs three colonists.
A Well-less colony at 0 Material can never produce Material again, so a bootstrap
rule is mandatory; the Step 10P-style exemption is deadlock-free but INVERTS the
incentive (a Workshop built before the first Well runs free for those ticks).

Recovery:
Temporary shortage: the plant idles for the tick and resumes (material 50 -> 49).
Extended shortage: the population survives (10P: Water is a growth gate, not
survival). Producer loss: the exemption keeps Material flowing (Well-less colony
never locked). Admission maximum: a stable paid/unpaid limit cycle (Material
still flows, one per two ticks) — never a deadlock, because the 10S gate never
admits more population than the Water production can serve.

Circularity:
No runtime production cycle. The route cycle Water -> Workshop -> Material ->
Well runs through CONSTRUCTION (a 25-Material build), and a staffed Well
produces Water even at Water 0, so there is no mutual production dependency.

Workforce:
Input worker (Well), consumer worker (Workshop) and the crew compete for the same
type-blind colonists; a crew tick leaves the Workshop unstaffed. Three colonists
are the minimum viable chain. Manual reassignment (10M) remains the only agency.

Spatial:
Inherently global (a stock allocation). No new spatial rule, no network shape is
rewarded; the only spatial interaction is the pre-existing 09E road-access
requirement of the producers themselves.

Construction Crew propagation:
Bounded. Over 12 ticks the measured material delta is 0 for rule none, 0 for
Workshop<-Water and 0 for Well<-Material: a dependency raises the crew's ceiling
from "one construction tick" to "at most one downstream producer tick", and only
while that producer is input-starved. In NOVA the extra Water is exactly what the
admission gate spends, so the surplus is absorbed by growth.

Classification:
No A candidate; one B (Workshop <- Water); one C (new producer); five D.

Chosen implementation candidate:
None yet. Workshop <- Water is the only candidate worth implementing, and it is
blocked on one narrow question: which bootstrap rule is both deadlock-free and
free of the measured inverted incentive.

Exact future dependency:
Well -> Water -> Workshop -> Material: a staffed operational Workshop consumes
1 Water per tick. No new resource, no new building, no new persisted state.

Why it is not a tax:
The demand is optional and allocative. The same 2 Water/tick buys 2 colonists, or
1 colonist + 1 Workshop, or 2 Workshops, and the player chooses the ratio by
staffing and by building Wells; a staffed Workshop at the admission maximum
halves its own output (measured limit cycle), so the choice is visible in the
trajectory, not a uniform decrement.

Why it is not a duplicate of Food/Water:
It adds no survival rule (Food) and no admission rule (Water): the 10S gate and
the 10P shortage semantics are untouched. It creates a competing DEMAND on the
existing Water stock, which is the only way to obtain an allocation decision
without inventing a resource.

Why it gives Construction Crew persistent value:
It raises the crew's ceiling from a purely transient tick to a possible one-tick
permanent downstream producer-tick — but the audit measured 0 in the fixtures it
could build, because the freed Water is spent by the admission gate. The honest
conclusion is that the dependency makes the crew *capable* of persistence without
demonstrating it; the value remains bounded at one tick.

Rejected candidates:
Farm <- Material (10T tax), Farm <- Water (survival spiral), Workshop <- Food
(starvation risk), Well <- Material (10U recurring Material), new producer (new
resource), spatial coverage clone (10P duplication).

Next implementation step:
A narrow bootstrap-rule audit for Workshop <- Water: resolve the tension between
the unrecoverable Well-less deadlock and the inverted "industry before Water"
incentive (candidates: a scoped rule that only gates Workshops built after the
first operational Well, a construction-time precondition, or an explicitly
documented accepted tradeoff). Only after that rule is fixed should the
dependency be implemented — and the implementation step must keep the promise of
§6: no runtime cycle, no deadlock, no new persisted state.
```
