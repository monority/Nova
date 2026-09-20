# NOVA — Step 09L — Employment Mobility Pressure Audit

## Context

NOVA is a deterministic spatial city-builder.

Phase 9 currently contains:

* 09A — transport network foundation
* 09B — road infrastructure contract
* 09C — road construction
* 09D — road network connectivity
* 09E — building road access
* 09F — road-access-gated production
* 09G — residential-to-work mobility fact
* 09H — player-facing road construction
* 09I — bootstrap economy audit
* 09J — spatial network pressure audit
* 09K — mobility-gated employment

09K established the first real employment constraint:

```text
Residence network ∩ Workplace network ≠ ∅
→ colonist may work there

otherwise
→ workplaceId = null
→ no employment
→ no productive worker
→ no production
→ no staffed Workshop
→ no upkeep
```

Employment is recomputed deterministically every tick.

SAVE_VERSION remains 4.

Mobility remains derived.

There is no movement, distance, travel time, pathfinding, vehicles, transit, congestion, or commute simulation.

---

# Objective

Do NOT add a new transport mechanic.

Do NOT add distance, pathfinding, vehicles, congestion, road upkeep, or transit.

This step is an **audit of the gameplay consequences created by 09K**.

The purpose is to determine whether mobility-gated employment creates a meaningful spatial optimization problem with the current rules.

The central question is:

> Does the current system now make residential/workplace/road layout materially interesting, beyond the trivial requirement of connecting every residence to every workplace?

Follow:

**AUDIT → EXPERIMENTS → OBSERVATIONS → DESIGN DECISION → VERIFICATION**

There should preferably be zero production-code changes.

If an actual defect is discovered, fix only the smallest correctness issue necessary and clearly separate that fix from the audit.

---

# 1. AUDIT CURRENT SYSTEM

Inspect:

* `assignJobs`
* mobility domain
* road networks
* building road access
* production
* upkeep
* storage
* construction
* population
* current road E2E
* current economic fixtures
* 09J conclusions
* 09K conclusions

Confirm the exact current contracts.

Do not rely on assumptions from previous reports.

Document:

1. how colonists choose Workshops;
2. how Workshop capacity is consumed;
3. how residence assignment works;
4. how mobility is evaluated;
5. how disconnected employment is removed;
6. how connected employment is restored;
7. whether Workshop selection remains topology-blind apart from eligibility;
8. whether multiple eligible Workshops create meaningful spatial choices;
9. whether road topology changes any outcome other than connectivity and Material cost.

---

# 2. EXPERIMENTAL METHOD

Build deterministic test scenarios.

Use existing domain test helpers where possible.

Do not create a generic simulation benchmark framework.

Each scenario should record at minimum:

```text
initial state
roads
residences
workplaces
colonists
commands
final employment
productive workers
production
upkeep
Material
mobility facts
```

Keep scenarios small and interpretable.

Prefer 1–4 colonists and 1–4 Workshops.

---

# 3. EXPERIMENT A — ONE RESIDENCE / ONE WORKSHOP

Compare:

### A1 — no road

```text
Residence

Workshop
```

Expected:

```text
employed = 0
production = 0
upkeep = 0
```

### A2 — direct road connection

```text
Residence ─ Road ─ Workshop
```

Expected:

```text
employed = 1
production = normal
upkeep = normal
```

### A3 — long corridor

```text
Residence ─ R ─ R ─ R ─ R ─ Workshop
```

Measure whether anything changes except construction cost.

If the simulation result is identical to A2 apart from road cost, record that explicitly.

Do not introduce distance merely because the result is identical.

---

# 4. EXPERIMENT B — TWO RESIDENCES / TWO WORKSHOPS

Construct:

```text
Residence A ─ Network A ─ Workshop A

Residence B ─ Network B ─ Workshop B
```

Verify deterministic employment.

Then construct a scenario where:

```text
Residence A ─ Network A

Workshop A ─ Network A

Workshop B ─ Network B
```

Verify the colonist cannot select Workshop B.

Now create a topology where both Workshops are reachable from Residence A.

Record which Workshop is selected.

This is important.

Determine whether topology influences assignment or whether ID/build order remains the deciding factor.

---

# 5. EXPERIMENT C — TWO COLONISTS / TWO WORKSHOPS / ONE NETWORK

Construct:

```text
Residence A ───────── Workshop A
Residence B ───────── Workshop B
       \              /
        ── shared network
```

Both colonists and both Workshops are mobility-connected.

Determine:

* which colonist gets which Workshop;
* whether assignments are stable;
* whether changing road topology changes assignments;
* whether changing insertion order changes assignments;
* whether road construction order changes assignments.

Do not change assignment rules.

This experiment is observational.

---

# 6. EXPERIMENT D — COMPETING WORKSHOPS

Create:

```text
Residence A
     │
     ├── Workshop A
     │
     └── Workshop B
```

Both Workshops are on the same operational network.

There are more eligible Workshops than workers.

Determine:

* which Workshop gets staffed;
* whether that selection depends on Workshop ID;
* whether road geometry matters;
* whether construction order matters.

Then reverse creation/insertion order.

Record the result.

The goal is to establish whether current spatial topology affects **job choice** or merely **job eligibility**.

---

# 7. EXPERIMENT E — NETWORK PARTITION

Create:

```text
Residence A ─ Network 1 ─ Workshop A

                    X

Residence B ─ Network 2 ─ Workshop B
```

Then test:

### E1

Both disconnected.

### E2

Connect only Residence A to Workshop B's network.

### E3

Connect both residences to both Workshops through one shared network.

Record employment and production after each transition.

The purpose is to see whether network partition creates meaningful allocation pressure.

---

# 8. EXPERIMENT F — NETWORK MERGE

Start with two independent networks:

```text
Network A          Network B

Residence A        Workshop B
Workshop A         Residence B
```

Both networks independently contain a residence and Workshop.

Each colonist should work locally.

Then connect the two networks.

Record what changes.

Important question:

> Does merging networks create any new simulation consequence besides increasing the set of eligible employment relationships?

Do not assume it does.

---

# 9. EXPERIMENT G — NETWORK SHAPE EQUIVALENCE

Compare equal-cost networks:

```text
straight
L-shape
branch
loop
```

For each topology, keep:

* same number of road cells;
* same buildings;
* same road operational state;
* same resources;
* same colonists.

Compare:

* employment;
* production;
* upkeep;
* mobility;
* network count;
* access;
* final hash.

If all simulation outputs are equivalent, document that topology currently has no semantic distinction beyond connectivity.

This is an important result, not a failure.

---

# 10. EXPERIMENT H — ROAD COST PRESSURE

Measure the Material cost of:

```text
direct connection
long connection
branched connection
two independent connections
shared network
```

Determine whether road length is already a meaningful optimization variable.

Do not introduce any new cost.

Do not rebalance road cost.

Do not add upkeep.

The purpose is to determine whether current construction cost alone creates sufficient spatial pressure.

---

# 11. EXPERIMENT I — EMPLOYMENT BOTTLENECK

Create more colonists than directly connected Workshop capacity.

Example:

```text
3 colonists
2 Workshops
```

Then vary road connectivity:

### I1

All three colonists can reach both Workshops.

### I2

Only one colonist can reach Workshops.

### I3

Two colonists can reach one Workshop and one colonist can reach the other.

Measure:

* employment count;
* unemployed count;
* Workshop utilization;
* production;
* upkeep.

Determine whether road layout can now create a labor bottleneck.

---

# 12. EXPERIMENT J — CONSTRUCTION TRANSITION

Use actual construction lifecycle.

Start:

```text
Residence ─ Road ─ Workshop
```

Then interrupt connectivity through an under-construction road.

Verify:

```text
underConstruction
→ no mobility
→ no employment
```

Once operational:

```text
operational
→ mobility
→ employment
```

Record the exact tick transition.

This must remain deterministic.

---

# 13. EXPERIMENT K — RESIDENTIAL SIDE TOPOLOGY

Compare:

### K1

```text
Residence ─ Road ─ Workshop
```

### K2

```text
Residence
   │
  Road
   │
  Road
   │
Workshop
```

### K3

```text
Residence ─ Road
             │
             Road ─ Workshop
```

Keep road count equal where possible.

Determine whether the residential-side topology changes anything beyond network membership and cost.

Do not implement a commute-distance mechanic.

---

# 14. CLASSIFICATION

After running the experiments, classify each observed spatial effect as:

### A — Strong gameplay pressure

Current rules create a real decision that changes simulation outcomes.

### B — Weak / economic pressure

Current rules matter primarily because of construction/resource cost.

### C — Equivalent topology

Different geometries collapse to the same simulation result.

### D — Informational only

A derived value changes but currently does not alter gameplay.

### E — Missing future pressure

The audit reveals a meaningful potential constraint, but implementing it is intentionally deferred.

Do not rank these categories.

Do not call one "best".

This is a factual classification of observed system behavior.

---

# 15. IMPORTANT DESIGN QUESTIONS

Answer explicitly:

1. Can a player now create a city where workers are unemployed because of road topology?
2. Can road topology determine which Workshop receives a worker?
3. Can network partition create a meaningful production bottleneck?
4. Does merging networks create a meaningful economic effect?
5. Does road length matter independently of construction cost?
6. Do different connected shapes produce different simulation outcomes?
7. Is the current binary mobility rule sufficient for another phase?
8. Is there evidence that distance or travel time is now justified?
9. Is there evidence that congestion is justified?
10. Is there evidence that public transit is justified?
11. Is road upkeep justified by observed gameplay rather than theory?
12. What is the smallest missing rule that would create a new causal relationship?

Do not implement the answers.

The audit exists to inform the next step.

---

# 16. NO PREMATURE MECHANICS

Unless a correctness bug is discovered, do not modify:

* employment rules;
* production coefficients;
* upkeep;
* storage;
* food;
* population;
* road cost;
* construction duration;
* road connectivity;
* mobility semantics;
* persistence schema.

Do not add:

* distance;
* pathfinding;
* travel time;
* movement;
* vehicles;
* transit;
* congestion;
* road upkeep;
* pollution;
* money;
* migration;
* desirability;
* road tiers;
* road upgrades;
* demolition;
* generic transport abstractions.

This is an audit step.

---

# 17. TESTS

Add deterministic tests for the experiments.

Tests should verify actual current behavior, not hypothetical future mechanics.

Cover:

* one residence / one Workshop;
* direct vs long corridor;
* two residences / two Workshops;
* competing Workshops;
* multiple networks;
* merged networks;
* topology equivalence;
* road cost;
* labor bottleneck;
* construction transition;
* deterministic replay;
* insertion-order behavior;
* save/load/hash where relevant.

Do not weaken existing tests.

---

# 18. BROWSER / E2E

Reuse the existing road E2E.

Do not create a new UI.

If the existing debug HUD can expose the relevant facts, use it.

Verify at least:

```text
roadless
→ worker 0
→ production 0

connected
→ worker 1
→ production resumes
```

and one connectivity transition.

Run:

* ROAD E2E
* TRANSPORT E2E
* PRODUCTION E2E
* RESOURCE E2E
* FOOD E2E
* TEMPORAL E2E

GPU E2E where hardware is available.

If GPU remains blocked by SwiftShader, report it as an environmental limitation.

---

# 19. PERSISTENCE / DETERMINISM

SAVE_VERSION must remain 4.

Verify:

```text
save → load → same state
save → load → same hash
```

For representative scenarios:

```text
same initial state
+ same commands
→ same final state
→ same hash
```

Also test insertion-order independence where the current domain contract promises it.

Do not persist any derived audit metric.

---

# 20. DOCUMENTATION

Create or update:

```text
docs/roadmap/Step09L.md
```

Preserve the original specification.

Append an **As-Built** section containing:

* audit methodology;
* scenarios;
* measured results;
* classifications;
* answers to the 12 design questions;
* any correctness fixes;
* exact tests;
* E2E results;
* persistence;
* determinism;
* known limitations;
* deferred mechanics;
* commit hash.

Never replace an existing committed specification with a prompt-only file.

Never fabricate missing historical text.

If the file is untracked and the original prompt cannot be recovered from the repository, preserve the current content and append to it rather than pretending to reconstruct lost text.

---

# 21. COMMIT

If there are no production-code changes, this is still a valid audit step.

Use one focused commit:

```text
Step 09L: Employment Mobility Pressure Audit
```

If only tests/docs changed, say so explicitly.

If a correctness fix is necessary, mention it separately in the final report.

---

# 22. FINAL REPORT

Return:

## A. STATUS

COMPLETE / BLOCKED

## B. AUDIT

Actual current employment/mobility behavior.

## C. EXPERIMENTS

A–K with concise measured outcomes.

## D. CLASSIFICATION

A/B/C/D/E for each relevant effect, with factual justification.

## E. DESIGN QUESTIONS

Answer all 12.

## F. CODE CHANGES

Exact files and whether production code changed.

## G. TESTS

Exact counts and results.

## H. E2E

Exact suite results.

## I. GPU / RUNTIME

Hardware or environment status.

## J. PERSISTENCE

SAVE_VERSION and save/load/hash result.

## K. DETERMINISM

Replay/insertion-order result.

## L. NEXT CONSTRAINT

Identify the smallest missing causal rule revealed by the evidence.

Do NOT implement that next constraint in this step.

## M. DEFERRED

Explicitly list intentionally deferred systems.

## N. COMMIT

Commit hash and parent.

The goal is not to make the road system more complicated.

The goal is to determine, with evidence, whether 09K has created enough spatial pressure to justify the next causal rule.

---

# As-Built (Step 09L)

## Audit methodology

No production code was changed. The audit is a new, self-contained deterministic suite,
`tests/employmentMobilityPressure.test.ts`, that builds arbitrary canonical states with the
public domain entry points (`createBuilding`, `createRoads`, `createColonist`), forces buildings
and roads operational where a topology needs to be isolated, and then measures one snapshot per
scenario:

```text
roads · networks · residences · workplaces · colonists
employed · unemployed · jobCapacity · production · stored · upkeep · staffedWorkshops
material · workersPerWorkshop · workplacePerColonist · mobilityPerColonist · hash
```

Experiment J is the only scenario driven through the real `stepSimulation` lifecycle (construction
transition); every other scenario is a static topology measured after one real `assignJobs` call.

## Confirmed current contracts (re-read from source, not assumed)

* `assignJobs` is a **full recomputation every tick**: preserve branch (clear invalid / disconnected
  or duplicate references) then fill branch.
* Fill order is **ascending colonist id × ascending Workshop id**; the chosen Workshop is the
  **first vacancy the colonist is mobility-connected to** — never the nearest.
* `areBuildingsMobilityConnected` = both buildings operational + road-accessible + shared network.
* Workshop capacity is **1**; `jobCapacity` counts operational Workshops regardless of access.
* Production needs a staffed, road-accessible operational Workshop; upkeep follows staffing only.
* Nothing is persisted or cached: mobility, networks, access and capacity are all derived.

## Scenarios and measured results

### A — one Residence / one Workshop

| Case | roads | networks | employed | production | upkeep | mobility |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| A1 no road | 0 | 0 | 0 | 0 | 0 | false |
| A2 direct (1 cell) | 1 | 1 | 1 | 2 | 1 | true |
| A3 corridor (4 cells) | 4 | 1 | 1 | 2 | 1 | true |

A3 is **identical to A2 in every simulation fact**; only Material cost differs (5 vs 20).

### B — two Residences / two Workshops

* B1 parallel networks: `networks 2, employed 2, production 4, upkeep 2`; c1→W_A, c2→W_B.
* B2 W_B road-accessible but unreachable from R_A: the colonist selects only W_A;
  `countWorkersAt(W_B) = 0`.
* B3 both Workshops reachable on one chain: the **first-created** Workshop wins wherever it is
  (left-first → left; right-first → right). Geometry is irrelevant.

### C — two colonists / two Workshops / one network

* C1 `networks 1, employed 2, production 4, upkeep 2`; c1→W_A, c2→W_B; both colonists are
  connected to **both** Workshops.
* C2 re-running `assignJobs` returns the same reference (stable, no churn).
* C3 adding a redundant spur changes nothing.
* C4 reversing record insertion order: same hash, same facts.
* C5 reversing road-id allocation order: same assignments (building ids decide, not road ids).

### D — competing Workshops (2 Workshops, 1 worker)

* D1 the first-created reachable Workshop is staffed; the second is vacant (`workers 0`).
* D2 reversing creation order moves the worker to the other Workshop.
* D3 adding a spur does not change the winner.

### E — network partition

| Case | networks | employed | production | upkeep | R_A eligible for |
| --- | ---: | ---: | ---: | ---: | --- |
| E1 two partitions | 2 | 2 | 4 | 2 | W_A only |
| E2 R_A multi-network | 2 | 2 | 4 | 2 | W_A **and** W_B |
| E3 merged | 1 | 2 | 4 | 2 | both |

E2 shows a building can reach two networks **without merging them**. E3 shows merging makes all
four residence↔workshop pairs eligible while changing **no** employment outcome.

### F — network merge

* F1 two saturated networks → merged: `networks 2→1`, eligible pairs `2→4`, but employed/production/
  upkeep **unchanged**.
* F2 stranded colonist relieved by merge: before `employed 1, unemployed 1, production 2, upkeep 1`;
  after `employed 2, unemployed 0, production 4, upkeep 2` — the previously stranded colonist
  reaches the vacant W_B.

### G — network shape equivalence

straight / L / branch / loop, **4 road cells each**: all four yield `employed 1, production 2,
upkeep 1, networks 1, mobility true`. Their canonical hashes are **4 distinct values** — the state
distinguishes shape, the simulation does not.

### H — road cost pressure

| Topology | cells | Material |
| --- | ---: | ---: |
| direct | 1 | 5 |
| long corridor | 4 | 20 |
| two independent | 2 | 10 |
| shared network | 5 | 25 |

Cost is exactly linear in cells; equal-cell topologies have exactly equal cost. Length is the only
quantity the model attaches to road geometry.

### I — employment bottleneck

| Case | networks | jobCapacity | employed | unemployed | production | upkeep | staffed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| I1 full connectivity | 1 | 2 | 2 | 1 | 4 | 2 | 2 |
| I2 one connected residence | 1 | 2 | 1 | 2 | 2 | 1 | 1 |
| I3 partial connectivity | 2 | 2 | 2 | 1 | 4 | 2 | 2 |

I2 is the headline: **capacity 2, but only 1 employed** — road topology alone strands two colonists
and leaves one Workshop permanently vacant.

### J — construction transition (real lifecycle)

Under-construction road: `mobility false, employed 0, production 0, upkeep 0`. On the very next tick
the road is operational: `mobility true, employed 1, production 2, upkeep 1`. The transition happens
on exactly one tick boundary and is deterministic.

### K — residential-side topology

K1 (straight), K2 (vertical), K3 (L-shape), all **4 roads**: identical `employed 1, production 2,
upkeep 1, networks 1`. Residential-side shape changes nothing but cost.

## Classification of observed spatial effects

### A — Strong gameplay pressure

* **Eligibility gating (Experiment I2).** Road layout can strand employable labour while Workshop
  capacity sits idle: `employed 1 / capacity 2`, `production 2` instead of 4, `upkeep 1` instead of 2.
  A player-visible outcome change caused purely by road topology.
* **Bottleneck relief by network merge (Experiment F2).** Merging turns `employed 1` into
  `employed 2`, `production 2` into `4`, `upkeep 1` into `2`.

### B — Weak / economic pressure

* **Road length (A3, H1).** A 1-cell and a 4-cell connection are simulation-identical; only Material
  differs (5 vs 20).
* **Independent vs shared connections (H1).** 10 vs 25 Material, identical outcomes — a
  cost-efficiency question, not a simulation one.

### C — Equivalent topology

* **All equal-cost connected shapes (G1)**: straight, L, branch and loop.
* **All residential-side shapes (K1–K3)**.
* **Redundant extensions (C3, G3 in 09J)** and **parallel independent networks (B1)**.

### D — Informational only

* **`mobilityConnectedColonists` / `getColonistWorkMobility`.** A derived value that now largely
  mirrors employment; the eligible-pair set (`areBuildingsMobilityConnected`) grows on merge (E3, F1)
  without changing any outcome.
* **Vacant-Workshop storage capacity (08F).** Responds to Workshop count, not to topology or staffing.

### E — Missing future pressure

* **Distance / travel time.** A3 and G1 prove length and shape are semantically invisible, and B3/D
  prove selection is id-ordered. A proximity-aware rule would introduce a genuinely new causal
  relationship (nearest-eligible-Workshop preference).
* **Congestion, public transit, road upkeep.** No volume, modality, or recurring road cost exists;
  A–K produced no phenomenon that would need them.

These categories are factual and unranked.

## Answers to the 12 design questions

1. **Can a player create a city where workers are unemployed because of road topology?** **Yes.**
   Experiment I2: 3 colonists, 2 operational Workshops (capacity 2), one connected residence →
   `employed 1, unemployed 2, staffed 1`. Capacity is available; road topology is the sole cause.
2. **Can road topology determine which Workshop receives a worker?** **No — only whether a Workshop
   is eligible.** B3/D2: when both are reachable, the first-created (lowest-id) Workshop wins wherever
   it is; D3 shows geometry never changes the winner.
3. **Can network partition create a meaningful production bottleneck?** **Yes.** I3/E1 show partition
   decides which Workshops a residence can reach, and I2 shows it can strand workers outright; F2
   shows merging can relieve it.
4. **Does merging networks create a meaningful economic effect?** **Conditionally.** F1: merging two
   saturated networks changes nothing but the eligible set. F2: merging that lifts a real eligibility
   constraint changes employment, production and upkeep. The effect exists only when it relieves an
   actual constraint.
5. **Does road length matter independently of construction cost?** **No.** A3/H1: 1 cell and 4 cells
   give identical employment, production, upkeep, networks and mobility; only Material differs.
6. **Do different connected shapes produce different simulation outcomes?** **No.** G1 and K1–K3
   collapse to identical facts at equal road count. Only the canonical hash differs.
7. **Is the current binary mobility rule sufficient for another phase?** **Yes for eligibility, no for
   optimisation.** It creates real (if coarse) pressure (I2, F2) and stays cheap, deterministic and
   fully derived — but with equal-cost topologies and id-ordered selection there is nothing to
   optimise beyond "connect the buildings".
8. **Is there evidence that distance or travel time is now justified?** Evidence of a **gap**, not of a
   mechanic: A3/G1 prove length and shape are invisible, and B3/D prove choice is id-ordered, so no
   proximity preference exists anywhere. A distance-aware rule is the smallest change that would
   create a new causal relationship. The audit does not claim it is required.
9. **Is there evidence that congestion is justified?** **No.** No volume, throughput or flow concept
   exists; nothing in A–K produces dense-traffic or road-capacity behaviour.
10. **Is there evidence that public transit is justified?** **No.** Without distance, capacity or modal
    choice, transit would have no measurable input.
11. **Is road upkeep justified by observed gameplay rather than theory?** **Not yet.** The only
    recurring cost observed follows staffing (Workshop upkeep), not roads. Redundant roads change no
    outcome (C3, G1), so construction cost is already the whole deterrent; a recurring road cost would
    add pressure without evidence of a degenerate "build max roads" strategy.
12. **What is the smallest missing rule that would create a new causal relationship?** A
    **cost/length-aware assignment preference over the existing eligibility set**: among currently
    eligible Workshops, prefer the one with the smallest road distance from the residence. It adds no
    persisted state, no movement, no resource and no entity — it reuses 09D network data and turns
    "which eligible Workshop" from an id-order lookup into a spatial choice. **Recorded, not
    implemented.**

## Correctness fixes

**None.** No production code changed. Every 09K contract was verified by experiment rather than
assumed; no defect was found.

## Tests

```text
Test Files  25 passed (25)
Tests       398 passed (398)
```

31 new tests in `tests/employmentMobilityPressure.test.ts` (was 24 files / 367 tests). `lint` and
`typecheck` pass. No existing test was modified or weakened.

## E2E

```text
ROAD E2E       ALL PASS   (C roadless: worker 0, production 0, upkeep 0
                           F workshop-side road only: worker 0, production 0
                           G residence-side closing cell: employed 1, production 2)
TRANSPORT E2E  ALL PASS
PRODUCTION E2E ALL PASS
RESOURCE E2E   ALL PASS
FOOD E2E       ALL PASS
TEMPORAL E2E   ALL PASS
zero console/page errors in every suite
```

This satisfies the 18 §requirement (roadless → worker 0 → production 0; connected → worker 1 →
production resumes; plus the under-construction → operational transition in step F).

## GPU / runtime

```text
GPU E2E  FAIL — environmental limitation
unmaskedRenderer "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)"
```

The suite's software-renderer guard fired because this environment exposes CPU rasterisation
(SwiftShader), not a hardware GPU. Canvas, renderer and WebGL2 context all came up; only the
hardware-vendor assertion failed. This is an environment limitation, not an application failure.

## Persistence

* `SAVE_VERSION` stays **4**.
* `save → load → same state`, `save → load → same hash` (P1).
* No audit metric is persisted (`mobility`, `eligible`, `bottleneck`, `pressure` do not appear in the
  serialized save).

## Determinism

* P2: same fixture built twice → identical facts, identical hash, identical `getRoadNetworks`.
* P3: derived queries are pure — hashing after querying `getColonistWorkMobility`,
  `getBuildingRoadAccess`, `getRoadNetworks`, `materialProductionForTick`,
  `materialUpkeepDueForTick` and `assignJobs` is stable.
* C4: reversed record insertion order → same hash, same facts.
* C5: reversed road-id allocation order → same assignments.

## Known limitations

* `jobCapacity` counts operational Workshops regardless of road access, so the employment summary
  cannot distinguish "vacant" from "unreachable" capacity (I2 shows `jobCapacity 2` while only 1 is
  reachable). Observation, not a defect.
* Workshop capacity remains 1, so bottleneck experiments are constrained to small arities; findings are
  qualitative at 1–4 colonists.
* The audit measures the 8×8 test world only. No scale or performance claim is made.
* No audit metric is persisted or rendered; all pressure facts are recomputed on demand.

## Deferred mechanics

Distance, travel time, pathfinding, movement, vehicles, public transit, congestion, road upkeep, road
refunds, road tiers, highways, upgrades, demolition, pollution, money, migration, desirability,
commute penalties and cost-aware assignment were **not** implemented. The 09L §11 answer list above
records which of them now have evidence (distance/choice) and which do not (congestion, transit,
upkeep).

## Commit

* Message: `Step 09L: Employment Mobility Pressure Audit`
* Parent: `d08becf` (Step 09K: Mobility-Gated Employment)
* Contents: one new test file + this document. **No production code changed.**
* Commit hash: recorded on the commit itself.

## Next constraint (identified, not implemented)

The evidence points at exactly one smallest missing rule: a **length-aware assignment preference**
among already-eligible Workshops (`nearest eligible road distance` instead of `lowest id`).
Everything above A/B/C/D says the current model has exhausted what binary connectivity can express:
length is invisible, shape is invisible, and job choice ignores space. That rule is the minimal
change that would convert the existing eligibility gate into a spatial decision. It is deferred to a
future step and is **not** part of 09L.

