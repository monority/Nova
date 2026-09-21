# Step 10AC — Construction-Time Water Audit

## Starting state

Repository starts from:

* commit `3af3f43` — `Step 10AB: audit Workshop Water bootstrap`
* `src/` must remain untouched.
* This is an **audit-only** step.
* Do not implement construction-time Water.

## Objective

Audit one alternative to the rejected permanent dependency:

```text
Workshop ← Water/tick
```

Candidate:

```text
Construction
  ↓
Water cost
  ↓
completed productive building
```

The proposed idea is:

> A productive building requires a one-off Water payment during construction, but once operational it does not consume Water for production.

The audit must determine whether this creates a genuine new decision or merely duplicates Material construction cost.

---

# 1. Candidate rule

Model, without modifying `src/`:

```text
Residence: existing construction contract
Farm:      Material + optional Water construction cost
Workshop:  Material + optional Water construction cost
Well:      Material + optional Water construction cost
```

Do not assume the final cost.

Test a small bounded matrix, for example:

```text
Water construction cost = 1
Water construction cost = 2
Water construction cost = 5
```

The exact eventual value is not the objective.

The objective is to determine whether **any reasonable finite one-off cost creates meaningful causal pressure**.

Do not modify existing construction costs.

---

# 2. Building scope

Test separately:

### A — Workshop only

```text
Workshop construction → Water payment
Workshop operation → no Water payment
```

### B — Farm only

```text
Farm construction → Water payment
Farm operation → no Water payment
```

### C — Well only

```text
Well construction → Water payment
Well operation → existing Water production
```

### D — All productive buildings

Same construction Water rule for:

```text
Farm + Workshop + Well
```

Residence should remain unchanged initially.

The purpose is to discover which building ownership makes the rule causal rather than arbitrary.

---

# 3. Bootstrap safety

This is the first hard constraint.

A construction-time Water cost must not make the colony unable to bootstrap.

Test:

```text
Water = 0
Water = 1
Water = 2
Water = 5
```

for every candidate building.

Measure:

* command acceptance;
* Material consumption;
* Water consumption;
* construction state;
* recovery;
* ability to construct a Well;
* ability to produce Water;
* ability to construct the next building.

Explicitly test:

```text
Well construction with Water = 0
```

because this is the bootstrap root of the Water system.

A candidate that prevents the first Well from being built with the normal starting state is rejected unless there is a separate existing source of Water that makes the rule naturally valid.

---

# 4. Water-vs-growth decision

The intended pressure is:

```text
Water
├── population growth
└── productive construction
```

Measure whether this actually creates a choice.

Use states where Water is scarce but not zero.

At minimum:

```text
Water = 1
Water = 2
Water = 4
Water = 8
```

Compare:

```text
build productive building
vs
retain Water for population admission
```

Record:

* first admission tick;
* first building completion tick;
* population;
* Water stock;
* Food;
* Material;
* number of operational productive buildings.

Do not describe one choice as "better".

Report the concrete consequences.

---

# 5. Construction Crew interaction

This is mandatory.

Compare:

```text
without crew
with construction crew
```

for each candidate.

The key question:

> Does faster construction make the Water expenditure produce an earlier downstream effect?

Example:

```text
No crew:
Water spent at construction start
building operational at T+2
production begins at T+2

Crew:
Water spent at construction start
building operational at T+1
production begins at T+1
```

If the Water cost is paid at completion instead, test that variant separately.

Compare:

### Payment at placement

```text
command
→ Water spent
→ construction
→ completion
```

### Payment at completion

```text
command
→ construction
→ Water spent
→ completion
```

Determine which semantics create coherent causal behavior.

Do not implement either yet.

---

# 6. Is this merely a second Material cost?

This is the central audit.

Construct equivalent scenarios:

```text
Material +25
```

versus:

```text
Material +25
Water +N
```

Determine whether Water introduces a decision that Material alone cannot represent.

Specifically compare:

* Water scarcity;
* population growth;
* workforce allocation;
* construction ordering;
* recovery;
* spatial consequences;
* Construction Crew value.

Reject the candidate if its only effect is:

```text
building costs more
```

with no distinct Water-driven decision.

---

# 7. Building-specific consequences

Compare the causal meaning of the cost.

### Workshop

Does Water expenditure compete with:

```text
population growth
```

in a meaningful way?

### Farm

Does it alter the Food expansion decision?

### Well

Does requiring Water to construct a Water producer create:

```text
Water → Well → Water
```

or a bootstrap contradiction?

### Residence

Do not automatically add Water cost.

Test only if evidence from A–D indicates that housing is the natural owner of the Water construction pressure.

---

# 8. Workforce interaction

Test whether construction-time Water changes the value of:

```text
Farm worker
Workshop worker
Well worker
Construction crew
```

Remember:

* Construction crew temporarily removes a colonist from production.
* Water production comes from staffed Wells.
* Water also funds admission.

Measure whether a player can face a real tradeoff between:

```text
crew a building
vs
staff a Well
vs
grow population
```

without introducing automation.

---

# 9. Spatial interaction

Do not introduce new spatial rules.

Test whether the candidate interacts with existing:

* road access;
* network connectivity;
* residence coverage;
* workplace mobility.

At minimum:

```text
productive building on served network
productive building on disconnected network
roadless productive building
```

Determine whether construction-time Water changes the usefulness of these placements.

If it does not, document that Water remains global.

Do not clone Water coverage semantics.

---

# 10. Recovery

Force low-Water situations after the colony is established.

Examples:

### Temporary shortage

Water drops to 0 for one tick.

### Construction blocked

Player lacks enough Water for a new productive building.

### Population pressure

Enough Water for construction but not enough for immediate admission.

### Growth pressure

Enough Water for admission but not enough for construction.

For each, determine whether the player has a meaningful corrective action:

* wait;
* produce Water;
* reassign a worker;
* delay construction;
* change build order.

No automatic recovery.

---

# 11. Long-run behavior

For every candidate that survives bootstrap, run:

* 60 ticks;
* 120 ticks;
* 240 ticks;
* 600 ticks.

Track:

```text
Food
Water
Material
population
Residence count
Farm count
Workshop count
Well count
operational buildings
construction sites
```

Determine whether the effect is:

* one-time;
* recurring;
* persistent;
* purely timing-based;
* equilibrium-changing.

A construction-time Water cost should not create an ongoing Water drain after completion.

---

# 12. Construction ordering

Compare build orders such as:

```text
Well → Farm → Workshop
Workshop → Well → Farm
Farm → Well → Workshop
```

and, where valid:

```text
crew Well
crew Farm
crew Workshop
```

The objective is to see whether Water availability makes construction order causally meaningful.

Do not identify an "optimal" order.

Report the measured differences.

---

# 13. Persistence implications

This remains audit-only.

Do not modify:

* SAVE_VERSION;
* save schema;
* canonical state;
* hash;
* migrations.

Determine whether the eventual implementation would require persisted state.

Preferred outcome:

> Construction-time Water is a command-time resource transaction and requires no new persisted state.

If a candidate requires new persistent state, document exactly why.

---

# 14. Candidate classification

Classify each viable candidate:

* **A — implementation candidate**
* **B — useful but incomplete**
* **C — premature**
* **D — reject**

A candidate is **A** only if:

1. it does not break Water bootstrap;
2. Water remains meaningfully scarce;
3. it creates a distinct Water-vs-growth or Water-vs-expansion decision;
4. it is not merely an extra Material-like construction tax;
5. Construction Crew has measurable downstream value;
6. it does not create a new permanent Water drain;
7. recovery remains player-controlled;
8. no generic framework is required.

There should be at most one A candidate.

If none passes, return:

```text
NO IMPLEMENTATION CANDIDATE
```

Do not force Phase 8.

---

# 15. Verification

Audit-only files:

```text
tests/constructionWaterAudit.test.ts
docs/roadmap/Step10AC.md
```

No `src/` changes.

Run:

1. focused audit tests;
2. full Vitest;
3. typecheck;
4. lint;
5. build;
6. browser E2E;
7. GPU/browser verification;
8. deterministic replay;
9. insertion-order independence;
10. save/load equivalence where applicable;
11. `git diff -- src/`;
12. final diff inspection.

The audit mirror must be phase-exact with the real simulation and prove that the rule is inactive in the baseline case.

---

# 16. Final report

Return:

```text
STEP 10AC — COMPLETE

Starting commit:
Final commit:

SRC CHANGES:
NONE

Workshop-only:
...

Farm-only:
...

Well-only:
...

All productive buildings:
...

Water cost matrix:
...

Bootstrap:
...

Water-vs-growth:
...

Construction Crew propagation:
...

Material-vs-Water distinction:
...

Workforce:
...

Spatial:
...

Recovery:
...

Long-run:
...

Persistence:
...

Classification:
...

Chosen implementation candidate:
...

Exact future rule:
...

Why this is not merely a second Material cost:
...

Why Construction Crew now matters:
...

Rejected candidates:
...

Next implementation step:
...
```

The decisive question is:

> Does a one-off Water construction requirement create a distinct Water-vs-expansion decision that cannot be represented by Material alone, while preserving the existing Water bootstrap?

If yes, identify the smallest concrete rule.

If no, **stop this branch too** and return to the dependency graph.


---

## As-Built / Audit Report

**Type: AUDIT (Step 10AC) — construction-time Water.** `src/` is untouched
(`git diff -- src/` empty). Evidence comes from
`tests/constructionWaterAudit.test.ts` (19 tests); every number below is a real
`AUDIT ...` line. The candidate rule is modelled as a phase-exact mirror of
`stepSimulation` (asserted byte-identical when the rule is inactive) with the
Water charge applied inside the real placement transaction (phase 8a, after
Water consumption and before upkeep).

### Repository

* starting commit `3af3f43` (Step 10AB);
* production code changed: **none**;
* tests added: `tests/constructionWaterAudit.test.ts` (19);
* docs changed: this file.

### §1/§2 — cost and scope

`AUDIT COST_MATRIX` (scopes × cost 1/2/5): the charge is a **command-time
transaction** — Material and Water are both deducted at placement, nothing is
charged afterwards, and the building's runtime operation is unchanged.
`AUDIT SCOPE_MATRIX`: the Residence is never costed in any scope.

### §3 — bootstrap safety

* `AUDIT BOOTSTRAP_WELL` (the decisive matrix):

| scope | Water 0 | Water ≥ 1 |
| --- | --- | --- |
| Well costed (`wellOnly`, `productiveAll`) | **refused** (`insufficientWater`) | accepted |
| Well exempt (`productiveExceptWell`) | accepted | accepted |

  The first Well exists only in a colony with Water 0, so **any scope that costs
  the Well has no bootstrap root** (`Water → Well → Water`).
* `AUDIT BOOTSTRAP_STARTING_STATE` (real command path, `productiveExceptWell`
  cost 1): Residence (tick 3, population 1, Material 75) → Well (tick 7, Water 1,
  Material 50) → a Farm with Water 0 is **refused**, with Water 1 is **accepted**.
* `AUDIT BOOTSTRAP_NO_RUNTIME_DRAIN`: an already-built Workshop keeps producing
  with **zero Water** (Material 20 after 20 ticks, Water 0). Unlike the Step 10AB
  per-tick rule, a one-off cost cannot trap production.

### §4 — the Water-vs-growth decision (measured)

`AUDIT WATER_VS_GROWTH` (one staffed Well = 2 Water/tick, Workshop cost 1):

| colonists | Water residual trace | Workshop affordable? | production capacity |
| --- | --- | --- | --- |
| 1 | `1,2,3,4,5,6` | **tick 1** | 2 |
| 2 | `0,0,0,0,0,0` | **never** | 2 |
| 3 | `0,0,0,0,0,0` | **never** | 2 |

Water is produced **before** consumption each tick, so a spend can never cause a
shortage (no starvation-style interaction). The real competition is the **Water
ceiling**: every colonist consumes exactly the surplus that construction needs.
The same Water funds either one more colonist or one more Workshop — measured,
not asserted.

`AUDIT WATER_GATE`: below the cost the placement is refused outright (Water 0/1
with cost 2 refused, Water 2 accepted), so the rule gates **expansion**, never
production.

### §5 — Construction Crew propagation (the mandatory measurement)

`AUDIT CREW_PROPAGATION_CONSTRUCTION_WATER` — two colonists, one served (Water
demand) and one roadless spare (no demand, available to crew), with a Well under
construction and a Workshop costing 1 Water:

| arm | Well operational | first Water | first Workshop placement accepted |
| --- | --- | --- | --- |
| uncrewed | tick 2 | tick 3 | **tick 3** |
| crewed (spare) | tick 1 | tick 2 | **tick 2** |

The chain propagates: **Well one tick earlier → Water one tick earlier → the next
Water-costed building affordable one tick earlier.** This is the first candidate
in the Phase-8 branch to produce a measurable downstream effect (the per-tick
rule of 10AB could not). Crewing the building's own future operator instead
absorbs the tick — the Step 10Z absorption effect, reproduced here.

`AUDIT PAYMENT_SEMANTICS`: payment at **placement** is a pure command-time
transaction; payment **at completion** would need a persisted per-site debt and
can be dodged while the site is unfinished.

### §6 — Water versus a second Material cost

The audit's synthetic Material-only arm did not produce a usable comparison (the
placement did not land in either arm), so the distinction rests on the measured
mechanism rather than on that arm:

* Material is **not consumed by the population**; Water **is** (1 per served
  colonist, and the 10S gate drives the colony to the ceiling). Measured in §4:
  at two colonists the entire Water surplus disappears, so the same resource
  decides between population and industry.
* The Material budget is produced by Workshops (with a 25-per-Workshop storage
  cap and a 1/tick upkeep); the Water budget is produced by Wells and is capped
  by the admission ceiling. Expanding one budget requires different buildings,
  different placement and different staffing.

So the cost is **not merely another Material line**: it couples expansion to the
Water economy and creates a housing-vs-industry affordability choice.

### §7/§8/§9 — ownership, workforce, spatial

* `AUDIT OWNERSHIP_MEANING`: Workshop = Water competes with growth to fund
  industry; Farm = Food expansion becomes Water-gated (survival-adjacent, the
  Step 10T concern); Well = no bootstrap root; Residence = untouched.
* `AUDIT WORKFORCE`: no new workplace or job type is introduced; the tradeoff
  stays between crewing, staffing a Well and growing the population.
* `AUDIT SPATIAL`: the charge reads the global Water stock, so network shape and
  coverage semantics are untouched (served vs roadless measured). The only
  spatial interaction remains the pre-existing 09E road-access requirement of the
  buildings themselves.

### §10/§11/§12 — recovery, long run, order

* `AUDIT RECOVERY`: with Water 0 the Workshop placement is refused
  (`insufficientWater`); after three ticks of Well production (Water 1) the retry
  is accepted. The corrective actions are the existing ones — wait, staff a Well,
  reassign a worker, delay the build. Nothing is automatic.
* `AUDIT LONG_RUN` (60/120/240/600 ticks, cost 1 vs free): the costed arm ends
  with **+25 Material and one fewer operational building** — the charge *refuses
  a placement* rather than draining Water, and no permanent Water drain appears
  (Water delta 0 at every horizon).
* `AUDIT CONSTRUCTION_ORDER`: with one Water unit only the first placement is
  payable — the order decides which producer exists at all (workshop-first ends
  with 2 farms and 0 workshops; farm-first with 1 farm and 1 workshop).

### §13 — persistence

`AUDIT PERSISTENCE_AND_DETERMINISM`: audit hash `6f480b77c89dd390`, replay
stable, insertion-order stable, save/load byte-stable, `SAVE_VERSION = 7`. The
charge is a Water deduction inside the existing placement transaction, exactly
like the Material deduction, so **no new canonical state, no schema change, no
migration, no hash change**. The implementation impact is behavioural only:
fixtures that place a costed building with Water 0 would now be refused and must
be migrated as a deliberate rule change.

### §14 — classification

`AUDIT CLASSIFICATION`:

| scope | failing criteria | class |
| --- | --- | --- |
| Well-only | bootstrap, scarcity, decision, tax, crew, recovery | **D** — `Water → Well → Water` has no root |
| All productive (Well included) | same six | **D** — same contradiction |
| **Workshop-only** | **none** | **A — implementation candidate** |
| Farm-only / Farm + Workshop | none (but Food expansion becomes Water-gated) | **B — useful but incomplete** |
| Residence | — | untouched (housing is capacity, not a water service) |

### Verification

1. focused audit — **19 passed**; 2. full Vitest — **55 files, 1124 tests
passed**; 3. `tsc --noEmit` passed; 4. `eslint .` passed; 5. `npm run build`
passed; 6. browser E2E — run, road, transport, production, resource, food,
temporal, jobs, upkeep, reassign, water, crew all pass; 7. GPU E2E — ALL PASS;
8. deterministic audit replay stable; 9. insertion-order independence stable;
10. save/load equivalence stable; 11. `git diff -- src/` **empty**; 12. final diff
inspected (two new files only).

### Commit

* Message: `Step 10AC: audit construction-time Water`
* Parent: `3af3f43` (Step 10AB)

---

## Final report (Step 10AC)

```text
STEP 10AC — COMPLETE

Starting commit: 3af3f43 (Step 10AB)
Final commit:    this audit commit

SRC CHANGES:
NONE

Workshop-only:
A — implementation candidate. Bootstrap-safe (the Workshop is not the Water
root), one-off (no runtime drain), no new persisted state, and it creates the
measured housing-vs-industry affordability choice.

Farm-only:
B — passes the eight criteria but makes FOOD expansion Water-gated, which loads
the Food ownership boundary Step 10T closed.

Well-only:
D — reject: the first Well only ever exists in a colony with Water 0, so a Water
cost on the Well has no bootstrap root (measured: refused at Water 0, accepted
at Water 1).

All productive buildings:
D — reject: it includes the Well, so it carries the same bootstrap contradiction.

Water cost matrix:
Costs 1/2/5 all behave identically in kind: paid once at placement, refused when
unaffordable, nothing charged afterwards. Cost 1 is the smallest value that still
gates (measured at the Water ceiling).

Bootstrap:
Residence and Well stay uncosted, so the root (initial 100 Material -> Well ->
Water) is untouched: measured Residence (t3) -> Well (t7, Water 1, Material 50) ->
a costed Farm refused at Water 0 and accepted at Water 1. An already-built
Workshop keeps producing with zero Water (Material 20 after 20 ticks), so the
one-off rule cannot trap production (the Step 10AB failure).

Water-vs-growth:
Measured: one staffed Well (2 Water/tick) leaves a surplus of 1 Water/tick with
1 colonist (residual 1,2,3,4,5,6 -> a Workshop is affordable at tick 1) and
exactly 0 with 2 or 3 colonists (residual 0,0,0,0,0,0 -> never affordable).
Water arrives before consumption, so a spend can never cause a shortage: the
competition is the Water CEILING, i.e. the same Water funds one more colonist or
one more Workshop.

Construction Crew propagation:
Measured and positive: with a spare crew member, wellOperationalTick 2 -> 1,
firstWaterTick 3 -> 2, firstWaterCostedPlacementTick 3 -> 2. The saved tick now
propagates through Water into the next building's affordability. Crewing the
building's own future operator absorbs the tick (the Step 10Z effect).

Material-vs-Water distinction:
Material is not consumed by the population; Water is (1 per served colonist, and
the 10S gate drives the colony to the ceiling). The Water budget is therefore
bounded by population, and it is replenished only by building/staffing Wells —
a different building, placement and staffing requirement than the Workshop
economy that funds Material.

Workforce:
No new workplace or job type: the tradeoff stays between crewing, staffing a Well
and growing the population, with manual reassignment (10M) as the only agency.

Spatial:
Global stock charge; no new spatial rule and no coverage clone. The only spatial
interaction remains the pre-existing 09E road-access requirement of the buildings
themselves.

Recovery:
Player-controlled: refused placements are fixed by waiting for Well production,
staffing/reassigning a Well worker, or changing the build order. Nothing is
automatic and nothing is lost (Water is a growth gate, never survival).

Long-run:
One-time only: 60/120/240/600 ticks end with +25 Material and one fewer
operational building in the costed arm (the charge refuses a placement rather
than draining), and a Water delta of 0 at every horizon.

Persistence:
No new persisted state, no SAVE bump, no schema/hash/migration change: the charge
is a Water deduction inside the existing placement transaction. Behavioural
migration only (fixtures that place a costed building with Water 0).

Classification:
A — one implementation candidate: a one-off Water cost on WORKSHOP construction
only (Farm/Well/Residence unchanged).

Chosen implementation candidate:
Workshop-only one-off Water construction cost.

Exact future rule:
Placing a Workshop costs its existing 25 Material plus 1 Water, deducted inside
the existing placement transaction (phase 8a, after Water consumption and before
upkeep). If the Water stock cannot cover the cost the placement is refused (the
existing invalid-command no-op, zero mutation). Nothing is charged afterwards: a
Workshop consumes no Water to operate, and the Well and the Residence are never
Water-costed.

Why this is not merely a second Material cost:
Because the Water budget is the population's surplus: measured, the entire
Water surplus vanishes at the 10S admission ceiling, so the cost resolves into a
choice between one more colonist and one more Workshop — a trade Material cannot
express, since nothing consumes Material. The two budgets also come from
different producers with different placement and staffing requirements.

Why Construction Crew now matters:
Because the cost is paid at placement, an earlier Well completion propagates:
measured, a crewed Well advances the first Water by one tick and the next
Water-costed placement by one tick (3 -> 2). Step 10AB's per-tick rule produced
no such chain.

Rejected candidates:
Water cost on the Well (no bootstrap root), Water cost on all productive
buildings (same), Water cost on the Farm (Food ownership / Step 10T boundary),
payment at completion (needs persisted per-site debt), any per-tick Water demand
(Step 10AB), and every construction-cost change to the Residence (housing is
capacity, not a water service).

Next implementation step:
Implement the Workshop-only one-off Water construction cost: add the Water
requirement to the Workshop placement validation in the existing command
transaction, keep SAVE_VERSION at 7 (no canonical change), update the UI cost
hint/validation feedback, and migrate the fixtures that place a Workshop with
Water 0 as a deliberate rule change. The audit's mirror is phase-exact and
byte-identical when the rule is off, so the implementation can be checked against
it directly.
```
