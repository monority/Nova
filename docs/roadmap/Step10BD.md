# Step 10BD — Labour Claim & Workforce Differentiation Design Contract

## Mission

Starting HEAD is expected to be:

`12a5d80`

Step 10BC is complete.

Decision:

> **A — PHASE FREEZE**

The current 2/2 economy is frozen.

Do not reopen the production-rate decision.

The 10BC audit identified one structural missing dependency:

> The survival economy consumes the entire workforce.

At every tested even population:

```text
P = 2, 4, 6, 8, 10, 12

required Farms + required Wells = P
spare workers = 0
```

At odd populations, the situation is worse.

Therefore a Workshop cannot become a persistent third labour claim without sacrificing a survival workplace.

This step is **design-only**.

The purpose is to determine whether a future capability can create a legitimate second labour claim without turning NOVA into an arbitrary job simulator.

Do not implement the capability.

---

# 1. HARD CONSTRAINTS

Do not modify:

* `src/domain/**`
* production constants;
* consumption constants;
* workforce assignment;
* Water;
* Food;
* Material;
* Workshop;
* roads;
* terrain;
* progression;
* objectives;
* scenarios;
* persistence;
* rendering;
* UI;
* SAVE_VERSION.

Do not:

* add new code;
* add a new resource;
* change Farm/Well/Workshop production;
* create a Town stage;
* create a Town threshold;
* add citizen personalities;
* add citizen happiness;
* add citizen needs;
* add unemployment as a new mechanic;
* add wages;
* add salaries;
* add taxes;
* add housing tiers;
* add education;
* add services;
* add electricity;
* add pollution;
* add demand;
* add zoning;
* add job priorities;
* add worker multipliers.

This is a **design contract only**.

---

# 2. READ THE RELEVANT EVIDENCE

Read:

* `docs/roadmap/Step10AO.md`
* `docs/roadmap/Step10AP.md`
* `docs/roadmap/Step10AQ.md`
* `docs/roadmap/Step10AX.md`
* `docs/roadmap/Step10AZ.md`
* `docs/roadmap/Step10BB.md`
* `docs/roadmap/Step10BC.md`

Also inspect:

* workforce domain code;
* colonist model;
* workplace assignment;
* Workshop logic;
* progression query;
* objective query.

Do not repeat historical audits unless a contradiction appears.

---

# 3. START FROM THE ACTUAL PROBLEM

Formalize the current constraint.

For a population `P`:

```text
survival labour =
    Farms required for Food
  + Wells required for Water
```

Under the frozen economy:

```text
Farm rate = 2
Well rate = 2
Colonist consumption = 1
```

Therefore:

```text
required Farms = ceil(P / 2)
required Wells = ceil(P / 2)
```

The balanced survival economy consumes:

```text
2 × ceil(P / 2)
```

workers.

For even `P`:

```text
spare = 0
```

For odd `P`:

```text
spare = -1
```

The consequence is:

> A persistent Workshop claim is currently mutually exclusive with fully staffed survival.

This is the problem to solve **if** a future Town phase is desired.

Do not solve it by changing the frozen economic rates.

---

# 4. IMPORTANT DISTINCTION — "SECOND CLAIM" IS NOT "MORE WORKERS"

Do not simply propose:

> "Add more workers."

Population is already the workforce.

The design question is:

> How can one population support a second persistent economic claim while survival remains causally valid?

This distinction matters.

Possible conceptual shapes include:

### A. Labour specialization

Some colonists could satisfy one class of work more efficiently than another.

### B. Shared labour / fractional allocation

One colonist could contribute partially to multiple workplaces.

### C. Labour productivity infrastructure

An existing or future structure could reduce the workforce required by survival.

### D. Non-labour production

Some production could occur without consuming a colonist.

### E. New workforce source

A future system could introduce another source of labour.

### F. Temporal labour

Workers could alternate between survival and industry without requiring simultaneous staffing.

Do not choose one yet.

---

# 5. EVALUATE EACH SHAPE

For each candidate A–F, analyze:

| Criterion        | Question                                             |
| ---------------- | ---------------------------------------------------- |
| Causal           | Does it create a real new cause/effect relationship? |
| Persistent       | Can it sustain a stable state?                       |
| Consequential    | Does it change downstream outcomes?                  |
| Decision-bearing | Does the player have to choose something?            |
| Spatial          | Can placement matter?                                |
| Economic         | Does it change resource/workforce reasoning?         |
| Deterministic    | Can the result remain deterministic?                 |
| Readable         | Can the player understand the result?                |
| Minimal          | Can it be expressed without a large simulation?      |
| Compatible       | Does it fit the current model?                       |
| New              | Does it create a decision not already represented?   |

Use:

```text
YES
PARTIAL
NO
```

Do not use numeric scores.

Do not produce a winner/ranking.

The purpose is to expose trade-offs.

---

# 6. TEST THE MOST IMPORTANT FAILURE MODE

A future labour system must not simply remove all tension.

Construct conceptual examples around the current P=6 colony.

Current frozen baseline:

```text
P = 6

3 Farms
3 Wells

Food:
6 production
6 consumption

Water:
6 capacity
6 need

spare:
0
```

Then ask what happens if a future mechanism allows:

```text
1 Workshop
```

without sacrificing survival.

The mechanism must create an actual decision.

Examples of valid decision shapes:

```text
industry vs expansion
industry vs reserve
industry vs construction speed
industry vs another service
industry vs spatial efficiency
```

Examples of invalid shapes:

```text
Workshop simply becomes free
Workshop magically produces more
Town threshold is simply population >= 6
player clicks "enable industry"
```

The future mechanic must create a **reason to reason**, not merely unlock a checkbox.

---

# 7. PRESERVE THE CURRENT ECONOMIC IDENTITY

The design must preserve these current properties:

### Food

Food remains a real survival pressure.

Do not turn it into an abundant background number.

### Water

Water remains a growth/service constraint.

Do not make it irrelevant.

### Material

Material remains a construction/storage resource.

Do not make industry obsolete.

### Workshop

Workshop must remain economically meaningful.

Do not transform it into a generic "Town building".

### Roads

Roads remain spatial infrastructure.

Do not bypass road access merely to enable industry.

---

# 8. TEST AGAINST EXISTING SYSTEM OWNERSHIP

The future capability must not accidentally steal another system's responsibility.

Check:

### Roads

Already own:

* connectivity;
* network membership;
* mobility;
* distance;
* Water coverage.

### Water

Owns:

* capacity;
* service;
* growth gating.

### Food

Owns:

* survival;
* population pressure.

### Workforce

Owns:

* worker assignment;
* workplace competition.

### Terrain

Owns:

* spatial refusal.

### Workshop

Owns:

* Material production/conversion.

The proposed labour capability must add something genuinely new.

---

# 9. TEST AGAINST 10AZ

10AZ demonstrated that housing composition can already create a major spatial/workforce consequence:

```text
same buildings
same population
different Residence placement
→ different Water capacity
→ different served population
→ different workforce eligibility
→ different stage
```

Do not duplicate this.

A future labour capability should operate on top of this existing spatial system.

Ask:

> Does the player have a new labour decision because of the new capability, or is this merely another way to reconnect roads/buildings?

If the latter, reject it as duplicate capability.

---

# 10. TEST AGAINST THE WORKSHOP BURST

10AO/10AP/10AQ established that the existing Workshop already has a temporary industrial role.

At 2/2:

```text
Workshop
↓
Water/workforce sacrifice
↓
temporary Material conversion
```

A future labour mechanism must therefore create a distinct state:

```text
temporary industrial burst
        ≠
persistent industrial capacity
```

Explain exactly why they are different.

If the proposed mechanism cannot produce a persistent state, it is not enough for Town.

---

# 11. DEFINE THE MINIMUM TOWN PHENOMENON

Do not define Town as:

```text
population >= N
```

Instead define Town through a causal state.

The desired shape is something like:

```text
survival economy
      +
persistent second labour claim
      +
meaningful trade-off
      ↓
stable industrial/civic settlement
```

But do not assume "industrial" is necessarily the final answer.

The step must determine whether the missing labour claim should support:

* industry;
* civic/service production;
* infrastructure;
* another future system;
* or remain unresolved.

---

# 12. DETERMINE WHETHER A NEW CAPABILITY IS ACTUALLY JUSTIFIED

At the end, choose exactly one:

### DECISION A — DESIGN CAPABILITY IS JUSTIFIED

Evidence supports one specific capability shape strongly enough to proceed to a dedicated implementation contract.

Document:

```text
capability:
new causal relationship:
current limitation:
new player decision:
persistent state:
what remains unchanged:
non-goals:
```

Do not implement it.

### DECISION B — DESIGN SPACE IS INSUFFICIENT

The labour saturation is real, but no minimal capability is sufficiently justified.

Keep the phase frozen.

### DECISION C — TOWN SHOULD REMAIN UNDEFINED

The current game does not yet need a Town phase.

Record the labour saturation as evidence but do not turn it into a feature roadmap.

---

# 13. DO NOT DESIGN THE IMPLEMENTATION YET

If a capability is selected, do not specify:

* TypeScript interfaces;
* files;
* commands;
* UI components;
* persistence;
* exact constants;
* exact numerical thresholds.

This step defines the **design contract**, not the implementation contract.

The following step, if justified, will be responsible for that.

---

# 14. SCENARIO POLICY

Do not add or modify scenarios.

The catalogue remains:

```text
7 scenarios
```

A future scenario can only be designed after the capability itself has been accepted.

---

# 15. VALIDATION

Audit-only.

Run:

```text
typecheck
lint
build
```

Run only relevant existing deterministic tests if needed to validate assumptions.

Do not alter production code.

Do not create fake tests for a conceptual feature.

Browser/GPU validation is optional unless needed to verify an existing contract.

---

# 16. DOCUMENTATION

Create:

```text
docs/roadmap/Step10BD.md
```

Include:

1. Mission
2. Current labour saturation
3. Frozen economic baseline
4. Definition of the missing "second labour claim"
5. Candidate capability shapes
6. Candidate analysis
7. P=6 conceptual stress test
8. Economic identity preservation
9. System ownership analysis
10. 10AZ compatibility
11. Workshop burst distinction
12. Minimum Town phenomenon
13. Decision
14. Non-goals
15. Scenario policy
16. Validation
17. Final report

Do not modify historical roadmap documents.

---

# 17. REQUIRED FINAL REPORT

Finish with exactly:

```text
Step 10BD — COMPLETE

Starting commit: ...
Final commit: ...

Decision: A / B / C

## Frozen baseline

Farm:
Well:
Workshop:
Food:
Water:
SAVE_VERSION:
Scenario catalogue:

## Labour saturation

P=2:
P=4:
P=6:
P=8:
P=10:
P=12:

Core finding:
...

## Second labour claim

Definition:
...

Why "more population" is insufficient:
...

## Candidate capability shapes

| Shape | Causal | Persistent | Consequential | Decision-bearing | Spatial | Economic | Deterministic | Readable | Minimal | Compatible | New |
|---|---|---|---|---|---|---|---|---|---|---|---|

## P=6 stress test

Baseline:
...

Future-state requirement:
...

Required trade-off:
...

## Existing system ownership

Roads:
Water:
Food:
Material:
Workforce:
Terrain:
Workshop:

## 10AZ compatibility

...

## Workshop burst distinction

Temporary burst:
...

Persistent capability:
...

## Minimum Town phenomenon

...

## Decision

...

## Non-goals

...

## Scenarios

Catalogue unchanged: 7

## Implementation

Production code changed: NO
Mechanics changed: NO
Constants changed: NO
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

The report must make one distinction extremely clear:

> **Labour saturation is an observed structural fact. It is not by itself a justification for a particular mechanic.**

The purpose of 10BD is to determine whether a minimal, coherent capability exists that turns that fact into a meaningful new decision.

Do not force a feature if the evidence does not support one.

---

# SUCCESS CONDITION

10BD succeeds when:

* the 2/2 economy remains untouched;
* labour saturation is formally understood;
* candidate solutions are compared without implementing any;
* duplicate mechanics are rejected;
* the minimum Town phenomenon is explicit;
* the next step is either:

  * a precise capability design/implementation contract,
  * continued phase freeze,
  * or deliberate postponement of Town.

No code volume is required.

The output should be **a defensible product decision**, not a feature for feature's sake.


# Documentation (as-built) — Step 10BD

Starting commit: `12a5d80` (Step 10BC).
Final commit: this commit.

## 1. Mission

Design contract only. `src/` is untouched: no constant, rule, semantic, scenario,
objective, progression, persistence, rendering or UI change, and **no test was
added** (the step forbids inventing tests for a conceptual feature — every number
below is quoted from a committed audit). The question is whether a *minimal*
capability exists that turns the labour-saturation fact of 10BC into a meaningful
new decision, or whether the design space is insufficient.

## 2. Current labour saturation

```text
required Farms = ceil(P / 2)        required Wells = ceil(P / 2)
survival labour = 2 x ceil(P / 2)
spare = P - 2 x ceil(P / 2)
```

| P | Farms | Wells | Survival labour | Spare | Measured in |
| ---: | ---: | ---: | ---: | ---: | --- |
| 2 | 1 | 1 | 2 | **0** | `AUDIT DISCRETIONARY_LABOUR` (10BC) |
| 4 | 2 | 2 | 4 | **0** | idem |
| 6 | 3 | 3 | 6 | **0** | idem |
| 8 | 4 | 4 | 8 | **0** | idem |
| 10 | 5 | 5 | 10 | **0** | idem |
| 12 | 6 | 6 | 12 | **0** | idem |
| odd P (3, 5, 7, 9, 11) | ceil(P/2) | ceil(P/2) | P + 1 | **−1** | idem — one workplace stays vacant; the service that loses it runs a 2-unit deficit |

**Core finding:** the saturation is an *identity* of the frozen economy, not a
scenario accident. `spare = 0` at every even population and `−1` at odd ones, and
**no Workshop is staffed at any population** (10BB/10BC, measured).

## 3. Frozen economic baseline

```text
Farm 2 Food/tick · Well 2 Water/tick · Workshop 2 Material/tick gross, 1 upkeep
Food/Water 1 per colonist/tick · one colonist = one workplace, capacity 1
Residence capacity 1 · storage 25 per Workshop · SAVE_VERSION 7 · catalogue 7
```

The production-rate decision was closed in 10BB (DECISION A — KEEP 2/2) and is
**not** reopened here. The Workshop keeps its existing temporary role: a
reserve-funded conversion (10AO/10AP/10AQ).

## 4. Definition of the missing "second labour claim"

A **second claim on labour** is a state in which the colony sustains, at the same
time and for as long as the player maintains it, both

```text
(1) a fully staffed survival economy (Food and Water at balance or better), and
(2) at least one NON-survival workplace that is staffed and produces,
```

with the staffing of (2) emerging from the economy rather than from a rate
change, a free producer, or a new worker population. "Add more workers" is
explicitly **not** the answer: population already *is* the workforce, and growth
is already gated by Water capacity (10S) and Food (05B). The question is how one
population can carry a second persistent claim while survival stays causally
valid.

## 5. Candidate capability shapes

```text
A. Labour specialization          — some colonists satisfy one class of work better
B. Shared / fractional allocation — one colonist partially staffs several workplaces
C. Labour-productivity structure  — a building that reduces survival's labour need
D. Non-labour production          — production without consuming a colonist
E. New workforce source           — immigration / automation / another population
F. Temporal labour                — a worker alternates between claims over time
```

## 6. Candidate analysis

| Shape | Causal | Persistent | Consequential | Decision-bearing | Spatial | Economic | Deterministic | Readable | Minimal | Compatible | New |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A Labour specialization | YES | YES | YES | YES | PARTIAL | YES | YES | PARTIAL | **NO** | PARTIAL | YES |
| B Fractional allocation | YES | YES | YES | YES | PARTIAL | YES | **PARTIAL** | PARTIAL | **NO** | **NO** | YES |
| C Productivity structure | YES | YES | YES | PARTIAL | YES | YES | YES | YES | YES | PARTIAL | **NO** |
| D Non-labour production | YES | YES | PARTIAL | **NO** | NO | PARTIAL | YES | YES | YES | PARTIAL | **NO** |
| E New workforce source | YES | YES | YES | PARTIAL | PARTIAL | YES | YES | YES | **NO** | **NO** | **NO** |
| F Temporal labour | YES | **NO** | YES | PARTIAL | NO | YES | YES | YES | YES | YES | **NO** |

No numeric score is used and no ranking is intended; the three columns that decide
the step are **New**, **Minimal** and **Compatible**, and each shape fails at
least one of them:

* **A Labour specialization** — the only shape that adds a genuinely new decision
  (assignment under a *capability* constraint instead of assignment under
  availability alone; today every colonist is exactly interchangeable — 10AX
  measured that identity). But to change the labour arithmetic a specialist must
  cover **more than one workplace's worth of output** — which is a worker
  multiplier — or staff fractions of workplaces — which is shape B. Without one
  of those it changes *who* works where, not *whether* a third workplace can run,
  so it does not create the persistent second claim at all. It also introduces
  per-colonist identity: new persisted state plus a save migration, in a model
  whose colonist record is exactly `residence`, `workplace`, assignment mode and
  construction assignment. **Not minimal, and insufficient on its own.**
* **B Fractional allocation** — breaks the model's central staffing invariant
  ("one colonist = one workplace, capacity 1") and with it per-tick integer
  production: Water capacity, Farm output, upkeep, job capacity, mobility, the
  10S gate and every derived counter become fractional or averaged, and the 10BA
  vocabulary that was just closed ("staffed / vacant / employed") loses its
  meaning. **Not minimal, not compatible.**
* **C Productivity structure** — a structure that reduces survival's labour
  requirement is exactly the rate change 10BB rejected (Food3/Water3: the first
  sustainable Workshop at P = 6), delivered as a buildable instead of a constant.
  It is a **worker multiplier**, which the step's constraints forbid, and it
  duplicates nothing new: the decision it creates (spend Material on efficiency vs
  on expansion) is the existing Material budget decision.
* **D Non-labour production** — the "the Workshop simply becomes free" invalid
  shape (§6 of the step): it removes the tension instead of creating a decision,
  and makes the Workshop's own economic meaning vacuous.
* **E New workforce source** — "add more workers", the non-answer of §4: it
  duplicates the existing Housing + Water-gated growth loop and would need a new
  population mechanic (the model has exactly one admission path).
* **F Temporal labour** — **already implemented twice**: the Construction Crew
  (10Y/10Z: a colonist leaves their workplace and crews a site, measured as a
  one-tick, non-durable advantage) and the Workshop burst (10AQ/10BB: reassign a
  Well worker, convert a finite Water reserve; measured as reserve-bound and
  **rate-invariant**). It cannot be *persistent* at 2/2: intermittent staffing
  halves per-tick output while consumption stays per-tick, so the average is
  always a deficit — the reserve is the only buffer, which is exactly why the
  burst is bounded.

## 7. P = 6 conceptual stress test

**Baseline (frozen, measured):** 3 Farms + 3 Wells, 6 colonists — Food 6/6,
Water 6/6, spare 0, no staffed Workshop.

**Future-state requirement:** one staffed Workshop *in addition to* the fully
staffed survival economy — i.e. a 7th colonist-equivalent of labour.

**Measured price of that state at 2/2** (`AUDIT TUNED_VS_CONTROL`, 10BB): the
same seven-workplace colony with a staffed Workshop leaves a Well unstaffed, so
`waterNet = −2` permanently (capacity 4 against a population of 6). The deficit
is not a cost the player can pay down: it is the identity reappearing.

**Required trade-off (what a valid mechanism must produce):** one of
`industry vs expansion`, `industry vs reserve`, `industry vs construction speed`,
`industry vs another service`, `industry vs spatial efficiency` — a *reason to
reason*. The invalid shapes remain: the Workshop becoming free, producing more,
"Town = population ≥ 6", or a click that enables industry.

Only shapes A and B bind a real decision here, and both fail the minimality
requirement above. That is the whole tension of this step.

## 8. Economic identity preservation

| Property | Requirement | Status of every candidate |
| --- | --- | --- |
| Food | stays a survival pressure (starvation is the only death rule) | C and D soften it; A does not address it |
| Water | stays a growth/service constraint (capacity gate, 10S) | C duplicates the rate change 10BB rejected; B dilutes the gate |
| Material | stays construction/storage (25 per Workshop, 1 upkeep) | all shapes leave Material untouched, so industry stays meaningful |
| Workshop | stays economically meaningful (temporary conversion) | D makes it free; A/B make it permanently staffable |
| Roads | stay spatial infrastructure (access/mobility/distance) | every shape leaves roads alone; no shape may bypass road access to enable industry |

## 9. Existing system ownership

```text
Roads     own connectivity, network membership, mobility, distance, Water coverage
Water     owns capacity, service, growth gating
Food      owns survival and population pressure
Material  owns construction and storage (the Workshop converts)
Workforce owns worker assignment and workplace competition
Terrain   owns spatial refusal (and nothing economic)
```

A new labour capability must add something **not** owned above. Checked: A adds
capability-aware matching (new), but only becomes consequential through the
multiplier/fraction that C/B forbid; B adds partial allocation (new) but rewrites
the ownership of Water/Food/Workforce arithmetic; C/D/E add nothing new
(multiplier, free production, more workers). No candidate both adds a new decision
and leaves the ownership map intact.

## 10. 10AZ compatibility

10AZ showed that housing composition already produces a large spatial/workforce
consequence from existing rules (same buildings, same population, different
Residence placement → different coverage → different service → different workforce
eligibility → different stage), and it was classified **B — useful but
overlapping** with the existing placement/coverage/mobility contracts. Any labour
capability must therefore operate **on top of** that spatial system. Rejected as
duplicates: any shape whose effect is reachable by moving a road, a Residence or a
Well (i.e. "just reconnect the network") — that is 10AZ/09K/10P territory, not a
new labour claim.

## 11. Workshop burst distinction

```text
Temporary burst                                   Persistent capability (wanted)
---------------------------------------------     -----------------------------
funded by a finite reserve (Water 51 → 24 Material)  funded by the economy itself
created by moving a survival worker (deficit)         leaves survival fully staffed
self-limiting: the reserve drains, the storage clamps bounded only by the map
measured rate-invariant (identical at 2/2 and 2/3)    requires a different economy
readable today (Jobs, Material row, inspector)        would need the same surfaces
```

They are different states because the burst *consumes* the survival economy's
labour and reserve while the wanted state *adds* to it. The frozen model can
express the first and — measured, not assumed — cannot express the second.

## 12. Minimum Town phenomenon

```text
survival economy  (expressible today: Food balance + Water capacity + staffing)
      +
persistent second labour claim   (NOT expressible at 2/2: no labour exists)
      +
meaningful trade-off             (expressible today: Material/space/reserve/order)
      ↓
stable industrial/civic settlement
```

The middle term is the missing one, and it is missing for a *structural* reason:
the economy's labour identity leaves nothing to claim. Whether the eventual claim
should serve industry, a civic/service producer, infrastructure or something else
is **left open** — nothing in the evidence picks one, and picking one now would be
choosing a feature rather than proving a dependency.

## 13. Decision

```text
DECISION B — DESIGN SPACE IS INSUFFICIENT
```

Labour saturation is real and formally understood, but no minimal capability is
sufficiently justified to become an implementation contract: the shapes that
would create a new decision (A specialization matching, B fractional allocation)
require either a forbidden multiplier/free producer or a rewrite of the staffing
invariant, and the shapes that are minimal (C, D, E, F) either add nothing new or
already exist. The substance of Decision C also holds — nothing in the current
game *requires* a Town phase — but the finding here is narrower and more useful:
the design space on top of the frozen 2/2 economy is insufficient, so the phase
stays frozen.

This does **not** close Town forever. It establishes the price list: a future
phase change needs the product to accept ONE of these families explicitly, each of
which is a *different economy*, not a minimal capability:

```text
(i)   productivity / multipliers      (a rate or a structure that raises output
                                       per worker — 10BB measured the thresholds:
                                       Food3 or Water3 gives the first sustainable
                                       Workshop at P = 6, 3/3 at P = 3)
(ii)  fractional / partial staffing   (break "one colonist = one workplace")
(iii) a new labour source             (immigration / automation: a second
                                       population path)
(iv)  a second resource whose claim is labour-independent
```

## 14. Non-goals

```text
no new resource · no rate change · no Town stage or threshold · no personality,
happiness, needs or education · no unemployment mechanic · no wages, salaries or
taxes · no housing tiers · no services · no electricity · no pollution · no demand
· no zoning · no job priorities · no worker multipliers · no fractional staffing
· no immigration/automation · no scenario change · no UI change · no persistence
change · no SAVE_VERSION change · no implementation of any candidate shape
```

## 15. Scenario policy

Catalogue unchanged: **7**. No scenario was added or modified, and none may be
designed before a capability is accepted — scenarios are never proof that a
mechanic is missing (10AZ already demonstrated the reverse).

## 16. Validation

```text
typecheck PASS · lint PASS · build PASS
Vitest 84 files / 1575 tests PASS (unchanged from 10BC — no code, no test added)
determinism PASS · insertion-order PASS · save/load PASS
browser 18 / 18 suites headless ALL PASS
GPU E2E ALL PASS (headed)
src/ unchanged · SAVE_VERSION 7 · catalogue 7
```

---

## 17. Final report

```text
Step 10BD — COMPLETE

Starting commit: 12a5d80 (Step 10BC)
Final commit:    this commit

Decision: B

## Frozen baseline

Farm: 2 Food/tick
Well: 2 Water/tick
Workshop: 2 Material/tick gross, 1 upkeep, 25 storage
Food: 1 / colonist / tick (survival pressure, all-or-nothing)
Water: 1 / served colonist / tick (capacity 2 per staffed Well; growth gate)
SAVE_VERSION: 7
Scenario catalogue: 7

## Labour saturation

P=2: 1 Farm + 1 Well = 2 workers, spare 0
P=4: 2 + 2 = 4, spare 0
P=6: 3 + 3 = 6, spare 0
P=8: 4 + 4 = 8, spare 0
P=10: 5 + 5 = 10, spare 0
P=12: 6 + 6 = 12, spare 0
(odd P: ceil(P/2) + ceil(P/2) = P + 1 workplaces for P colonists, spare −1, one
workplace permanently vacant and one service 2 units short; measured)

Core finding: the saturation is an identity of the frozen economy — no population
leaves a colonist the survival infrastructure does not occupy, and no Workshop is
staffed at any population (10BB/10BC, measured). A persistent Workshop claim is
mutually exclusive with fully staffed survival, and the price at P = 6 is exactly
a permanent 2-unit Water deficit (waterNet −2, 10BB `TUNED_VS_CONTROL`).

## Second labour claim

Definition: a state in which the colony sustains, simultaneously and for as long
as the player maintains it, a fully staffed survival economy AND at least one
staffed non-survival workplace that produces — with that staffing emerging from
the economy, not from a rate change, a free producer or a new worker population.

Why "more population" is insufficient: population already IS the workforce, and
growth is already gated by Water capacity (10S) and Food (05B), so more
population changes how many colonists exist, never how many claims one colonist
can carry — the ratio `spare = 0` is scale-invariant (measured at P = 2…12).

## Candidate capability shapes

| Shape | Causal | Persistent | Consequential | Decision-bearing | Spatial | Economic | Deterministic | Readable | Minimal | Compatible | New |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A Labour specialization | YES | YES | YES | YES | PARTIAL | YES | YES | PARTIAL | NO | PARTIAL | YES |
| B Fractional allocation | YES | YES | YES | YES | PARTIAL | YES | PARTIAL | PARTIAL | NO | NO | YES |
| C Productivity structure | YES | YES | YES | PARTIAL | YES | YES | YES | YES | YES | PARTIAL | NO |
| D Non-labour production | YES | YES | PARTIAL | NO | NO | PARTIAL | YES | YES | YES | PARTIAL | NO |
| E New workforce source | YES | YES | YES | PARTIAL | PARTIAL | YES | YES | YES | NO | NO | NO |
| F Temporal labour | YES | NO | YES | PARTIAL | NO | YES | YES | YES | YES | YES | NO |

## P=6 stress test

Baseline: 3 Farms + 3 Wells, 6 colonists, Food 6/6, Water 6/6, spare 0, no staffed
Workshop (measured).

Future-state requirement: one staffed Workshop in addition to a fully staffed
survival economy — a 7th colonist-equivalent of labour.

Required trade-off: a real reason to reason (industry vs expansion / reserve /
construction speed / another service / spatial efficiency), never a free
Workshop, a larger output, "Town = population >= 6", or a click that enables
industry. Measured price of the state at 2/2: the same seven-workplace colony
must leave a Well unstaffed — a permanent 2-unit Water deficit; the identity
reappears rather than being paid down.

## Existing system ownership

Roads: connectivity, network membership, mobility, distance, Water coverage — a
labour capability must not bypass road access to enable industry.
Water: capacity, service, growth gating — untouched by every candidate, diluted by
fractional allocation.
Food: survival and population pressure — softened by productivity structures.
Material: construction and storage, converted by the Workshop — untouched, so
industry stays meaningful.
Workforce: worker assignment and workplace competition — the only system every
candidate touches; none adds to it without breaking its exclusivity invariant.
Terrain: spatial refusal only — no candidate gives it an economic role.
Workshop: the temporary conversion role — preserved unless it becomes free.

## 10AZ compatibility

10AZ's housing-composition consequence is already produced by placement + 09D
networks + 10P coverage + 09K mobility, and was classified B (useful but
overlapping). A labour capability must operate on top of that spatial system;
any shape whose effect is reachable by moving a road, a Residence or a Well is a
duplicate of existing mechanics and is rejected.

## Workshop burst distinction

Temporary burst: funded by a finite reserve, created by moving a survival worker,
self-limiting (the reserve drains and the 25-per-Workshop storage clamps), and
measured rate-invariant (24 Material over 60 ticks at both 2/2 and 2/3).

Persistent capability: would be funded by the economy itself, would leave survival
fully staffed, and would be bounded only by the map — measured impossible at 2/2
because intermittent staffing halves per-tick output while consumption stays
per-tick, so the average is always a deficit and the reserve is the only buffer.

## Minimum Town phenomenon

survival economy (expressible today) + persistent second labour claim (NOT
expressible at 2/2) + meaningful trade-off (expressible today) → a stable
industrial/civic settlement. The middle term is the missing one, for a structural
reason rather than a content reason. Which purpose the eventual claim should serve
(industry, a civic/service producer, infrastructure, something else) is left
explicitly open — the evidence picks none.

## Decision

B — DESIGN SPACE IS INSUFFICIENT. Labour saturation is real and formally
understood, but no minimal capability is sufficiently justified: the shapes that
would create a new decision (A specialization matching, B fractional allocation)
need a forbidden multiplier/free producer or a rewrite of the staffing invariant,
and the minimal shapes (C, D, E, F) either add nothing new or already exist. The
phase stays frozen. This does not close Town forever: it establishes the price
list — a future phase change must explicitly accept ONE of (i) productivity /
multipliers (10BB measured the thresholds: Food3 or Water3 → first sustainable
Workshop at P = 6, 3/3 → P = 3), (ii) fractional/partial staffing, (iii) a new
labour source, or (iv) a second resource whose claim is labour-independent. Each
of those is a different economy, not a minimal capability.

## Non-goals

no new resource, no rate change, no Town stage/threshold, no personalities,
happiness, needs or education, no unemployment mechanic, no wages/salaries/taxes,
no housing tiers, no services, no electricity, no pollution, no demand, no
zoning, no job priorities, no worker multipliers, no fractional staffing, no
immigration/automation, no scenario change, no UI change, no persistence change,
no SAVE_VERSION change, no implementation of any candidate shape.

## Scenarios

Catalogue unchanged: 7

## Implementation

Production code changed: NO
Mechanics changed: NO
Constants changed: NO
SAVE_VERSION changed: NO

## Validation

typecheck: PASS
lint: PASS
build: PASS
tests: 84 files / 1575 tests PASS (unchanged; no code and no test added)
determinism: PASS
insertion-order: PASS
save/load: PASS
browser: 18 / 18 suites headless ALL PASS
GPU: ALL PASS (headed)

## Final classification

ALREADY SUPPORTED: the frozen 2/2 economy, survival/growth gating, the Workshop's
temporary conversion, the Construction Crew as temporal labour, the spatial
workforce system (10AZ), and terrain as spatial refusal.
MERELY QUANTITATIVE: population, roads, Workshops, storage, map size.
GENUINELY MISSING: a *persistent* second labour claim — impossible under the
frozen labour identity, and only obtainable by accepting one of the four
different-economy families above.
INTENTIONALLY DEFERRED: Town (undefined), the production-rate tuning (10BB), the
housing-composition scenario (10AZ, B), and every candidate shape of this step.

## Next dependency

Not another generic audit: a product decision between (a) shipping content on the
frozen model, or (b) explicitly accepting one of the four different-economy
families — at which point a dedicated capability contract (the 10BD-designated
next step) must specify it, and only then may a mechanic, a Town contract and a
scenario be designed.
```
