# Step 10Z — Construction Crew Economic Audit

## Starting state

Repository starts from:

* commit `00a6a17` — `Step 10Y: implement construction crew`
* Construction Crew implementation is considered complete.
* **Audit-only step.**
* Do **not** modify `src/`.
* Do not change game rules, persistence, UI contracts, or phase ordering.

## Objective

Determine whether Construction Crew creates a meaningful economic/strategic tradeoff now that the mechanic is implemented.

The question is not whether construction is faster.

The question is:

> Does assigning a colonist to construction measurably change the build-vs-produce decision, expansion throughput, resource trajectory, or recovery behavior?

If the answer is yes, identify the exact causal pressure.

If the answer is no, document why and identify what dependency is actually missing.

---

# 1. Current causal model

Audit the current real chain:

```text
Colonist
  ↓
Farm / Workshop / Well employment
  ↓
Food / Material / Water production

Material
  ↓
Construction
  ↓
New Residence / Farm / Workshop / Well

Construction Crew
  ↓
faster construction
  ↓
earlier operational building
  ↓
earlier staffing opportunity
  ↓
earlier production / housing / service capacity
```

The crew is temporary and manually assigned.

A crewed colonist does not produce from Farm / Workshop / Well during the construction tick.

Do not assume this tradeoff is meaningful: measure it.

---

# 2. Baseline vs crewed scenarios

Build deterministic counterfactual scenarios with identical initial state.

At minimum compare:

### A — No crew

Colonists remain assigned to normal workplaces.

### B — One construction crew

One colonist is manually reassigned to a construction site.

### C — Multiple crews

At least 2 simultaneous construction sites with 2 available colonists.

### D — Construction vs production

Compare:

```text
one additional production worker
vs
one construction worker
```

for:

* Farm
* Workshop
* Well

Where possible, use the same initial state and identical Material stock.

Record:

* construction completion tick
* population
* Food
* Material
* Water
* staffed Farms
* staffed Workshops
* staffed Wells
* operational buildings
* colonists temporarily removed from production
* first tick at which the newly completed building becomes productive
* first tick at which the newly completed Residence can admit population

---

# 3. Measure expansion throughput

Test construction chains rather than isolated buildings.

At minimum:

### Scenario 1 — One expansion

Build one new productive building.

Compare no crew vs crew.

### Scenario 2 — Sequential expansion

Build:

```text
Well → Farm → Workshop
```

or another equivalent valid sequence.

Measure the cumulative completion ticks.

### Scenario 3 — Housing expansion

Build several Residences with sufficient Water/Food capacity.

Measure:

* first new admission
* population after 60 / 120 / 240 ticks
* resource trajectories

### Scenario 4 — Parallel construction

Build 2–4 simultaneous sites.

Compare:

* no crews
* 1 crew
* 2 crews
* maximum feasible crews

Determine whether crew count scales linearly or encounters an existing bottleneck.

---

# 4. Build-vs-produce decision

This is the key audit.

Construct situations where the same colonist can either:

```text
produce Food / Material / Water
```

or:

```text
crew construction
```

Measure the opportunity cost.

For each workplace type calculate the observed delta during the construction window:

### Farm

Lost Food while crewing.

### Workshop

Lost gross Material and net Material after upkeep.

### Well

Lost Water production.

Do not invent an economic valuation.

Report the raw causal effects.

Example format:

```text
Crew 1 Workshop for 1 tick:
  construction: +1 progress
  gross Material: -2
  upkeep effect: ...
  net Material delta: ...
```

Use the actual simulation values.

---

# 5. Identify when crew is economically meaningful

Test at least these states:

### Material-rich

Large Material stock, construction available.

Question:

Does crew simply accelerate expansion?

### Material-constrained

Material close to the construction cost.

Question:

Does removing a producer to crew construction delay the next construction?

### Food-constrained

Low Food buffer.

Question:

Can crewing a Farm create a measurable survival/growth consequence?

### Water-constrained

Low Water production.

Question:

Can crewing a Well delay population growth?

### Workforce-constrained

Few colonists relative to Farms/Workshops/Wells.

Question:

Does construction crew compete directly with the existing productive workforce?

---

# 6. Recovery audit

After construction completes:

* confirm the crew is released
* confirm the colonist returns to automatic employment
* measure how quickly production recovers
* verify no persistent economic penalty remains
* verify manual assignments remain respected where applicable

Test:

```text
production → crew → completion → production
```

and:

```text
manual workplace → crew → completion
```

according to the current contract.

Do not add sticky construction roles.

---

# 7. Spatial interaction

Do not introduce new spatial rules.

Simply test whether existing road/network constraints alter the value of faster construction.

Compare:

* construction of a building on an already useful network
* construction of a building that still requires road/network access before it becomes useful
* construction of a disconnected building

Determine whether Construction Crew currently interacts with:

```text
construction speed
vs
network availability
vs
workplace eligibility
```

If faster construction does not change the usable-production timing in a case, document why.

---

# 8. Long-run audit

Run at least:

* 60 ticks
* 120 ticks
* 240 ticks
* 600 ticks

for representative crew/no-crew scenarios.

Track:

```text
population
Food
Material
Water
Residence count
Farm count
Workshop count
Well count
operational construction sites
```

The purpose is to distinguish:

* temporary timing advantage
* persistent population/resource advantage
* purely cosmetic speed-up

Do not introduce new mechanics if the effect is only temporal.

---

# 9. Counterfactual classification

Classify Construction Crew using the existing audit vocabulary:

* **A — fundamental**
* **B — useful but incomplete**
* **C — premature**
* **D — contradictory / unnecessary**

The classification must be evidence-based.

Do not force Construction Crew into category A merely because it was implemented.

Explain:

1. what concrete decision it creates;
2. what existing system it interacts with;
3. what measurable outcome changes;
4. what remains unaffected.

---

# 10. Search for the next dependency

Only after the measurements, inspect the simulation graph again.

Specifically determine whether the next missing pressure is:

* production dependency
* additional essential service
* settlement expansion consequence
* spatial efficiency
* workforce specialization
* infrastructure consequence
* progression/stage consequence
* something else discovered by the measurements

Do **not** automatically select one of these.

The audit should derive the next dependency from evidence.

---

# 11. Determinism and architecture

Because this is audit-only:

* no `src/` modifications
* no new persisted state
* no SAVE version change
* no new framework
* no new generic abstraction

Add only:

```text
tests/constructionCrewEconomicAudit.test.ts
docs/roadmap/Step10Z.md
```

or equivalent audit-only files following the repository's existing convention.

Tests must be deterministic.

Verify:

* insertion-order independence
* replay/hash stability
* save/load equivalence where relevant
* no `Date.now()`
* no `Math.random()`

---

# 12. Performance

Measure representative runs, but do not optimize anything in this step.

Record whether Construction Crew introduces any measurable simulation overhead.

Compare:

```text
baseline
vs
1 crew
vs
multiple crews
```

If performance is unchanged, document why.

---

# 13. Verification protocol

Run in this order:

1. audit current implementation
2. focused economic audit tests
3. full Vitest
4. typecheck
5. lint
6. build
7. browser E2E
8. GPU/browser verification where applicable
9. deterministic replay
10. save/load/insertion-order checks
11. inspect `git diff`
12. confirm `src/` is untouched

The final repository must remain clean except for the intentional audit files/commit.

---

# 14. Final report

Return a concise senior-level report containing:

```text
STEP 10Z — COMPLETE

Starting commit:
Final commit:

SRC CHANGES:
NONE

Construction Crew economic effect:
...

No-crew vs crew:
...

Farm opportunity cost:
...

Workshop opportunity cost:
...

Well opportunity cost:
...

Expansion throughput:
...

Long-run effect:
...

Spatial interaction:
...

Recovery:
...

Determinism:
...

Performance:
...

Tests:
...

Classification:
A / B / C / D

Why:
...

Next dependency:
...

Why this is the next dependency:
...
```

The most important output is **not the number of tests**.

The most important output is the causal conclusion:

> What does Construction Crew now make the player choose between, and what does that reveal about the next missing system?

Do not implement the next system in Step 10Z.



---

## As-Built / Audit Report

**Type: AUDIT (Step 10Z) — construction crew economic effect.** `src/` is
untouched (`git diff -- src/` empty). Evidence comes from
`tests/constructionCrewEconomicAudit.test.ts` (20 tests); every number below is
a real `AUDIT ...` line.

### Repository

* starting commit `00a6a17` (Step 10Y);
* production code changed: **none**;
* tests added: `tests/constructionCrewEconomicAudit.test.ts` (20);
* docs changed: this file.

### 1. Current causal model

`AUDIT CAUSAL_MODEL` + `AUDIT ONE_TICK_WINDOW`:

```text
Colonist -> Farm/Workshop/Well employment -> Food/Material/Water
Material -> construction -> new Residence/Farm/Workshop/Well
Construction Crew -> +1 progress on the assignment tick -> building operational 1 tick earlier
```

The crew window is **exactly one tick per site**: uncrewed completion tick 2,
crewed completion tick 1. A crewed colonist holds no workplace for that whole
tick and is released at the end of it. There is no sticky construction role.

### 2. Baseline vs crewed

`AUDIT PRODUCE_VS_CREW` (one farm + one workshop + two colonists, one extra
production worker vs one crew): producers give Food `+1` on the tick, the crew
gives Food `-1` and completes the site. The exchange is always
**one tick of one producer's output for one tick of earlier completion**.

### 3. Opportunity cost per workplace (the key measurement)

| producer crewed | control tick | crewed tick | opportunity cost | why |
| --- | --- | --- | --- | --- |
| Farm | Food `+1` | Food `-1` | **2 Food** | the farm is vacant: no output, consumption unchanged |
| Workshop | Material `+1` | Material `0` | **1 net Material** (gross 2) | a vacant Workshop also pays **no** upkeep, so 1 of the 2 lost Material is saved |
| Well | Water `+1` | Water `-1` | **2 Water** | production lost, consumption unchanged |

`AUDIT COST_FARM`, `AUDIT COST_WORKSHOP`, `AUDIT COST_WELL`. The workshop case
is the notable one: the real cost is the *net* contribution, not the gross
output, because upkeep follows staffing.

### 4. Expansion throughput

`AUDIT SEQUENTIAL_CHAIN` (Well → Farm → Workshop, one producer, each site
crewed): completion ticks `[2,2,2]` uncrewed vs `[1,1,1]` crewed —
**3 cumulative ticks saved for 3 ticks of the only producer's output**.

`AUDIT PARALLEL_CONSTRUCTION` (two sites, two colonists):

| crews | completion ticks | staffed after one tick |
| --- | --- | --- |
| 0 | `[2,2]` | farm 1, workshop 1 |
| 1 | `[1,2]` | farm **0**, workshop 1 |
| 2 | `[1,1]` | farm **0**, workshop **0** |

Crew count scales with *colonists*, and each crew is paid for directly out of
production staffing. (The browser UI issues one command per tick, so the
2-crew row needs two scripted assignments in one state; the domain supports N.)

`AUDIT HOUSING_EXPANSION` (a Residence that gates the next admission, Water
capacity 4, housing capacity 3): first admission tick **3 uncrewed vs 2
crewed**, and then population `4` at 60/120/240/600 ticks in **both** variants,
with a permanent Food difference of `-3` in the crewed run.

### 5. When the crew is meaningful

* **Material-rich** (`AUDIT STATE_MATERIAL_RICH`): completion `2 → 1` and the
  Material stock after 6 ticks is `994` uncrewed vs `995` crewed — the crew
  tick discards output that the storage clamp would have dropped anyway **and
  saves one upkeep**, so the crew is *free* (even marginally profitable) here.
* **Material-constrained** (`AUDIT STATE_MATERIAL_CONSTRAINED`): the next
  25-cost build is affordable after **22 ticks uncrewed vs 23 crewed**; the
  Material trace is `[1..8]` vs `[0..7]`. Crewing costs the next build a tick.
* **Food-constrained** (`AUDIT STATE_FOOD_CONSTRAINED`): a 2-Food buffer with
  one farmer traces `3,4,5,…` uncrewed vs `1,0,1,2,…` crewed — the crewed
  colony touches Food `0` (one tick from starvation) without starving.
* **Water-constrained** (`AUDIT STATE_WATER_CONSTRAINED`): Water `20 → 20`
  uncrewed vs `20 → 18` crewed (net 0 vs `-2`).
* **Workforce-constrained** (`AUDIT STATE_WORKFORCE_CONSTRAINED`): with no
  unemployed colonist, staffed farms `1 → 0` on the crew tick.

### 6. Recovery

`AUDIT RECOVERY`: the crew is released at the end of the completion tick
(`constructionAssignmentId: null`, farm staffed `0` that tick) and the colonist
is re-employed automatically on the next tick (workplace `building-2`, mode
`automatic`). `AUDIT RECOVERY_MANUAL`: a manual workplace override is cleared
by crewing (`manual → automatic`) and is **not** restored — the 10Y contract
makes no promise, and no sticky construction role exists.

### 7. Spatial interaction

`AUDIT SPATIAL_INTERACTION` (three colonists, one farmer + spares, new Well):

| case | completion tick | first staffed tick |
| --- | --- | --- |
| 2 colonists, no crew | 2 | 2 |
| 2 colonists, the **only** spare crews | **1** | 2 — the saved tick is absorbed |
| 3 colonists, no crew | 2 | 2 |
| 3 colonists, one of two spares crews | **1** | **1** — the saved tick converts |

A completely roadless Well is never staffed (`firstStaffedTick: -1`): the saved
tick is invisible.

**This is the central causal finding of the audit:** the crew saves a
construction tick, but that tick only becomes *usable production* when a
**different** available colonist can staff the new building during the crew
tick. `assignJobs` excludes the crew member for the whole crew tick, so crewing
the very colonist who would operate the new building moves only the completion
tick, not the productive tick. For a Residence (capacity, no operator needed)
the saved tick always converts into an earlier admission.

### 8. Long run

`AUDIT LONG_RUN` (scripted 6-building growth, crew vs no-crew):

| ticks | population | food | material | water | operational |
| --- | --- | --- | --- | --- | --- |
| 60 | 6 / 6 | −19 | 0 | +1 | 0 |
| 120 | 6 / 6 | −19 | 0 | +1 | 0 |
| 240 | 6 / 6 | −19 | 0 | +1 | 0 |
| 600 | 6 / 6 | −19 | 0 | +1 | 0 |

The timing advantage is **transient**: population, Material and operational
building counts are identical at every horizon, and the only permanent
difference is the crew's opportunity cost (Food `-19` over 600 ticks).

### 9. Classification

```text
Construction Crew: B — useful but incomplete
```

1. **Decision it creates**: exchange one tick of a chosen producer's output
   (2 Food / 1 net Material / 2 Water) for one tick of a chosen building's
   completion — *"spend output now to finish this sooner"*, with a real
   counter-pressure when Material or Food is tight.
2. **Systems it interacts with**: workforce allocation (`assignJobs`),
   Water admission, housing capacity, and Material accumulation/upkeep.
3. **Measurable outcome that changes**: construction completion (`-1` tick),
   first admission when a Residence is the growth gate (`-1` tick), and first
   *usable production* (`-1` tick **only** with a different available worker).
4. **What remains unaffected**: long-run population, Material and building
   counts (identical at 60/120/240/600), every production/cost rule, and the
   resource equilibria (only the opportunity cost differs).

It is not **A**: the effect never persists, so it does not change any
equilibrium. It is not **C/D** either: the mechanic works, is reachable, and
produces a real (if narrow) advantage in surplus-labor windows — the housing
case is a genuine 1-tick-earlier admission. It is **B** because its payoff
depends on a condition the economy rarely supplies (a *surplus* worker who is
not the building's future operator) and because nothing in the model rewards
time.

### 10. Next dependency (derived from the measurements)

The measurements say: **labor is the binder, and time has no value.**

* The crew competes directly with staffing (`state_MATERIAL_CONSTRAINED`,
  `STATE_WORKFORCE_CONSTRAINED`, `PARALLEL_CONSTRUCTION`).
* Its saved tick converts only when a *different* worker exists
  (`SPATIAL_INTERACTION`).
* Nothing converts a saved tick into a durable advantage
  (`LONG_RUN`, `HOUSING_EXPANSION`).

The missing pressure is therefore a system in which **the order/completion of
one building changes what another building can do** — i.e. a **production
dependency / producer-to-producer chain (roadmap Phase 8: inputs → production →
outputs → consumption)**. That is the smallest system that would (a) make
construction timing propagate instead of washing out, (b) give the workforce a
second allocation axis beyond head-count, and (c) give the crew a persistent
payoff.

Guardrail from the closed branches: Step 10T rejected *Farm ← Water* and Step
10U rejected recurring Material upkeep as an **input tax**, and the 10X audit
rejected a generic chain. So the next step must be an **audit of one concrete
producer-to-producer dependency** (an existing output consumed by an existing
producer), checked for circularity/deadlock and for whether it converts timing
into a durable advantage — not a generic input framework, and not a new
resource.

The strongest alternatives, and why they are weaker: *workforce specialization*
changes who works where but not whether time matters; *settlement progression*
and *shelter quality* were already closed by 10V/10W as having no consumer;
*transport* stays deferred per 09N.

### 11. Determinism and architecture

`AUDIT DETERMINISM`: replay hash `f3d5e12179d33afe`, replay stable,
insertion-order stable, save/load byte-stable, `SAVE_VERSION = 7`. No `src/`
modification, no new persisted state, no SAVE bump, no new framework or generic
abstraction; no `Date.now()`/`Math.random()` anywhere in the audit.

### 12. Performance

`AUDIT PERFORMANCE` (8 colonists, 12 buildings, 4 sites, 600 ticks):
0 crews 617.6 ms, 1 crew 708.1 ms, 4 crews 676.8 ms — variation is run-to-run
noise; crew cost does not scale with crew count, because crew presence is a
single derived set built once per `advanceConstruction` (O(colonists + sites)).

### 13. Verification protocol

1. audited the current implementation (source read, no edits);
2. focused economic audit tests — **20 passed**;
3. full Vitest — **52 files, 1065 tests passed**;
4. `tsc --noEmit` — passed;
5. `eslint .` — passed;
6. `npm run build` — passed;
7. browser E2E — run 12/12, road 15/15, transport 10/10, production 12/12,
   resource 12/12, food 12/12, temporal 19/19, jobs 21/21, upkeep 35/35,
   reassign 7/7, water 7/7, crew 11/11;
8. GPU E2E (`gpuRun.mjs`) — ALL PASS;
9. deterministic replay — stable;
10. save/load/insertion-order — stable;
11. `git diff` inspected;
12. `git diff -- src/` — **empty**.

### 14. Final report

```text
STEP 10Z — COMPLETE

Starting commit: 00a6a17 (Step 10Y)
Final commit:    this audit commit

SRC CHANGES:
NONE

Construction Crew economic effect:
One tick of one producer's output buys one tick of one building's completion.
The window is exactly one tick per site and the crew is released at the end of it.

No-crew vs crew:
Uncrewed completion tick 2 vs crewed tick 1 (one tick saved, always).
The crew member produces nothing on the crew tick.

Farm opportunity cost:
2 Food (control +1, crewed -1). Staffed farms 1 -> 0 on the crew tick.

Workshop opportunity cost:
1 NET Material (gross 2, upkeep 1 saved: a vacant Workshop pays no upkeep).

Well opportunity cost:
2 Water (control +1, crewed -1).

Expansion throughput:
Sequential Well -> Farm -> Workshop: [2,2,2] uncrewed vs [1,1,1] crewed (3 ticks for 3 producer ticks).
Parallel (2 sites, 2 colonists): 0 crews [2,2], 1 crew [1,2], 2 crews [1,1]; each crew is paid out of production staffing.
Housing gate: first admission tick 3 -> 2.

Long-run effect:
Population, Material and operational building counts identical at 60/120/240/600 ticks.
Only permanent difference is the opportunity cost (Food -19 over 600 ticks). Purely temporal.

Spatial interaction:
The saved construction tick converts into usable production ONLY when a DIFFERENT
available worker can staff the new building during the crew tick; crewing the
future operator moves only the completion tick. A roadless building absorbs the
saved tick entirely. A Residence (capacity, no operator) always converts it.

Recovery:
Clean: released at the end of the completion tick, re-employed automatically the
next tick. A manual workplace override is cleared by crewing and not restored.

Determinism:
replay hash f3d5e12179d33afe, replay/insertion-order/save-load stable, SAVE_VERSION 7.

Performance:
600 ticks: 0 crews 617.6 ms, 1 crew 708.1 ms, 4 crews 676.8 ms (noise; no scaling with crew count).

Tests:
focused 20 passed; full 52 files / 1065 tests; typecheck, lint, build pass;
browser suites 12/15/10/12/12/12/19/21/35/7/7/11 all pass; GPU E2E pass.

Classification:
B — useful but incomplete

Why:
It is a real manual decision with a measured cost (2 Food / 1 net Material /
2 Water) and a measured gain (one tick of completion, one tick of earlier
admission, one tick of earlier usable production when a different worker is
available), but the gain never becomes persistent, and it converts only under a
surplus-labor condition the economy rarely supplies. It does not change any
equilibrium, so it is not fundamental; it is not premature or contradictory,
because it works and is reachable.

Next dependency:
A production dependency — one concrete producer consuming another existing
producer's output (roadmap Phase 8: inputs -> production -> outputs -> consumption).

Why this is the next dependency:
The measurements show the binding constraints are labor and capacity, and that
NOTHING in the current model converts construction timing into a durable
advantage: production is instantaneous per tick, growth is Water/housing
capacity-gated, and surpluses are clamped or consumed. A producer-to-producer
dependency is the smallest system that makes completion ORDER matter, which is
exactly the missing condition that would give the crew (and construction timing
in general) a persistent payoff. Prior audits close the shortcuts: 10T rejected
Farm <- Water and 10U rejected recurring upkeep as input taxes, and 10X rejected
a generic chain, so the next step must audit ONE concrete chain for circularity
and deadlock before any implementation.
```

### Commit

* Message: `Step 10Z: audit construction crew economics`
* Parent: `00a6a17` (Step 10Y)
