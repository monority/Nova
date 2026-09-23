# Step 10BE — Scenario & Gameplay Content Expansion

## Mission

Starting HEAD is expected to be:

`d6c5e32`

The previous phase is intentionally frozen:

* 10BB — KEEP 2/2
* 10BC — PHASE FREEZE
* 10BD — DESIGN SPACE INSUFFICIENT
* Town remains undefined
* SAVE_VERSION remains 7
* scenario catalogue currently contains 7 scenarios

We are now leaving the audit loop.

This step is a **real gameplay/content implementation step using only existing mechanics**.

The objective:

> Make the current NOVA model produce more distinct, deliberate gameplay situations without introducing a new simulation capability.

The game should become more interesting through:

* starting conditions;
* spatial layouts;
* resource budgets;
* terrain;
* population;
* existing buildings;
* existing objectives;
* existing workforce/network/Water rules.

Do not invent a new system to make a scenario interesting.

---

# 1. HARD CONSTRAINTS

Do not modify:

* production rates;
* consumption rates;
* workforce mechanics;
* Water semantics;
* Food semantics;
* Material semantics;
* Workshop mechanics;
* road mechanics;
* terrain mechanics;
* progression mechanics;
* objective primitive types;
* persistence;
* SAVE_VERSION;
* rendering architecture.

Do not add:

* pollution;
* electricity;
* happiness;
* demand;
* zoning;
* taxes;
* wages;
* citizen personalities;
* traffic;
* road capacity;
* new resources;
* new building types;
* housing tiers;
* services;
* Town;
* new progression stages.

This step is about **content**, not capability.

---

# 2. READ CURRENT STATE

Read:

```text
docs/roadmap/Step10AT.md
docs/roadmap/Step10AU.md
docs/roadmap/Step10AV.md
docs/roadmap/Step10AW.md
docs/roadmap/Step10AX.md
docs/roadmap/Step10AY.md
docs/roadmap/Step10AZ.md
docs/roadmap/Step10BA.md
docs/roadmap/Step10BB.md
docs/roadmap/Step10BC.md
docs/roadmap/Step10BD.md
```

Also inspect:

* scenario definitions;
* scenario assembler;
* objective definitions;
* progression;
* existing scenario E2E tests;
* browser scenario selector/deep links;
* current scenario UI.

Do not repeat the old audits.

Use their conclusions as evidence.

---

# 3. CURRENT CONTENT BASELINE

The current catalogue contains 7 scenarios.

Recover the exact current names and objectives from the repository.

Classify them into their existing decision spaces.

The previous audits established approximately these families:

1. First settlement
2. Water constraint
3. Spatial efficiency
4. Population expansion
5. Industrial expansion
6. Recovery
7. Water-reserve industry

Do not rename existing scenarios merely for cosmetic reasons.

---

# 4. CONTENT GAP

The important finding from 10AZ was:

> Housing composition can create a meaningful spatial/workforce outcome using entirely existing mechanics, but that phenomenon is currently not represented as its own scenario.

The measured phenomenon was:

```text
same population
same buildings
same resources
same road count
same networks

different Residence placement

→ different Water coverage
→ different served residences
→ different workforce eligibility
→ different progression
```

This is already real gameplay.

The question is whether it deserves to become authored content.

---

# 5. FIRST NEW SCENARIO — HOUSING COMPOSITION

Design one scenario around the existing housing-composition phenomenon.

Do not add a new objective kind.

Use existing objective requirements.

The scenario should teach/discover:

> Housing placement is not merely about capacity; where Residences connect to the infrastructure network changes whether the settlement can function.

The scenario must create a meaningful decision.

A successful player should need to reason about:

* Residence placement;
* road topology;
* Water coverage;
* workforce mobility;
* existing budget.

Avoid simply requiring:

```text
build X Residences
```

The spatial relationship must be causal.

---

# 6. REQUIRED HOUSING SCENARIO SHAPE

Use a controlled setup inspired by 10AZ.

There must be at least two meaningful spatial solutions.

For example:

```text
Solution A:
connect housing to the existing serviced network

Solution B:
create another connection / infrastructure arrangement
```

The alternatives do not need to have identical costs.

What matters is that the player must choose between actual consequences.

Avoid a puzzle with only one legal solution unless the constraint itself is the intended lesson.

---

# 7. SECOND CONTENT OPPORTUNITY

Find one additional scenario from already-proven mechanics.

Candidates include:

### A. Network topology

Use existing roads/networks to create:

* separated districts;
* reconnection decisions;
* workforce mobility consequences.

### B. Terrain + infrastructure

Use existing blocked cells to create a meaningful spatial layout.

Terrain must remain only:

```text
blocked / buildable
```

No terrain modifiers.

### C. Housing ahead of services

Use existing Residence capacity and Water capacity to create a timing decision.

### D. Workforce competition

Use existing Farm/Well/Workshop competition.

Do not change workforce rules.

### E. Construction scheduling

Use Construction Crew and construction order to create a timing decision.

Choose only one additional scenario if it produces a genuinely distinct decision space.

Do not add scenarios simply to increase the catalogue number.

---

# 8. SCENARIO DISTINCTNESS TEST

For every proposed new scenario, compare it against all existing scenarios.

A new scenario must change at least one of:

* the dominant decision;
* the causal consequence;
* the spatial reasoning;
* the recovery strategy;
* the objective interpretation.

It must not merely change:

* starting Material;
* number of buildings;
* map size;
* cosmetic layout.

Use actual replay evidence.

For each candidate:

```text
dominant decision:
existing scenario overlap:
new consequence:
recovery path:
objective:
```

---

# 9. NO ARTIFICIAL DIFFICULTY

Do not create difficulty by:

* starving the player arbitrarily;
* setting impossible budgets;
* hiding the only valid solution;
* using unexplained blocked cells;
* making construction fail repeatedly;
* requiring brute-force search.

The player should be able to understand the causal reason for failure.

---

# 10. OBJECTIVES

Use only the existing objective system.

Existing objective kinds are closed.

Do not add:

```text
"place Residence here"
"connect this exact cell"
"have perfect network"
```

unless the existing objective model already supports the underlying requirement naturally.

Prefer objectives that express the consequence rather than the solution.

For example:

```text
Reach Village
```

can be valid if the scenario's spatial challenge determines whether Village is reachable.

Do not encode the puzzle solution into the objective.

---

# 11. SCENARIO START STATES

Scenario state must remain declarative.

Do not add scenario-specific simulation rules.

Allowed starting-state differences include existing supported state such as:

* buildings;
* roads;
* colonists;
* resources;
* terrain;
* world dimensions;
* objective;
* existing configuration.

No new runtime mechanic may be hidden inside scenario loading.

---

# 12. CONTENT SHOULD USE THE EXISTING WORLD

Prefer compact, readable scenarios.

The player should be able to understand the relevant geography from the board.

Do not create huge maps just to make them feel more complex.

The map should communicate:

```text
what is connected
what is blocked
where housing can go
where services can reach
where workers can travel
```

---

# 13. UI / READABILITY

Inspect the real browser for each new scenario.

Verify:

* scenario identity is visible;
* objective is visible;
* relevant starting conditions are understandable;
* terrain is readable when used;
* placement feedback remains useful;
* Water/service information is understandable;
* workforce diagnosis remains understandable;
* no new UI is required to understand the scenario.

If the scenario cannot be understood with the existing UI, do not immediately add UI.

First determine whether the scenario itself is poorly authored.

---

# 14. IMPLEMENTATION

After the design audit, implement the selected new scenario(s).

Expected implementation surface should remain primarily:

```text
scenario definitions
scenario fixtures if required
scenario tests
E2E scenarios
roadmap documentation
```

Avoid touching domain mechanics.

If implementation requires domain changes, stop and report that the scenario has exposed a genuine capability gap rather than quietly adding mechanics.

---

# 15. SCENARIO CATALOGUE

Do not decide the final number in advance.

The catalogue may become:

```text
7 → 8
```

or:

```text
7 → 9
```

only if the scenarios are genuinely distinct.

It is acceptable to add only one.

It is also acceptable to add zero if no candidate survives the distinctness test.

Do not add weak content to satisfy a quota.

---

# 16. REAL PLAYTHROUGH

For every new scenario, play it using the actual browser.

Record:

```text
initial state
first meaningful decision
major decision points
objective completion
failure/recovery if applicable
completion tick
final population
final resources
```

The point is to validate the scenario as a game, not merely as a data structure.

---

# 17. DETERMINISM

For each new scenario verify:

```text
same scenario
same commands
same result
same canonical state
same hash
```

Also verify insertion-order invariance where applicable.

Scenario loading must not introduce nondeterministic state.

---

# 18. SAVE/LOAD

Verify that the new scenarios remain compatible with the current persistence model.

Do not change:

```text
SAVE_VERSION = 7
```

Scenario identity/framing must remain outside persisted simulation state unless the existing architecture already requires otherwise.

---

# 19. BROWSER VALIDATION

Run the real browser suite.

For new scenarios:

* desktop;
* narrow viewport;
* relevant interaction sequence;
* objective completion;
* refusal/error feedback;
* recovery where applicable.

Do not settle for unit tests alone.

---

# 20. GPU VALIDATION

If the normal project workflow includes the headed GPU suite, run it.

Expected:

```text
Chromium
WebGL
NVIDIA RTX 3070
headed
```

Do not modify rendering code for this step.

The purpose is regression validation.

---

# 21. DOCUMENTATION

Create:

```text
docs/roadmap/Step10BE.md
```

Include:

1. Mission
2. Starting baseline
3. Existing scenario catalogue
4. Content gap
5. Candidate scenario analysis
6. Housing Composition scenario design
7. Second scenario candidate analysis
8. Distinctness analysis
9. Implementation
10. Browser playthroughs
11. Determinism
12. Save/load
13. Validation
14. Final classification
15. Next dependency

---

# 22. REQUIRED FINAL REPORT

Finish with:

```text
Step 10BE — COMPLETE

Starting commit: ...
Final commit: ...

## Decision

Scenario(s) added:
Scenario catalogue:
New mechanics:
New objective kinds:

## Existing content baseline

...

## Housing Composition

Scenario:
Objective:
Initial state:
Core decision:
Alternative solutions:
Causal consequence:
Completion:
Recovery:
Why distinct:

## Second scenario

Scenario:
Objective:
Core decision:
Causal consequence:
Completion:
Why distinct:

## Scenario distinctness

| Scenario | Dominant decision | Existing overlap | New consequence | Distinct |
|---|---|---|---|---|

## Implementation

Domain changes:
Application changes:
Scenario changes:
UI changes:
Persistence changes:
SAVE_VERSION:

## Real playthroughs

For each new scenario:

Start:
First decision:
Major decisions:
Completion:
Final population:
Final resources:
Failure/recovery:

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

A / B / C

## Next dependency

...
```

---

# 23. SUCCESS CONDITION

10BE succeeds if the current frozen model becomes **more playable without becoming more complex at the simulation level**.

Specifically:

* 2/2 remains untouched;
* no Town is invented;
* no new mechanics are added;
* no new objective primitive is added;
* at least one existing mechanic is turned into stronger authored gameplay;
* every new scenario has a distinct causal decision;
* the scenario is actually playable in the browser;
* failure and recovery, where applicable, are understandable;
* deterministic behavior remains intact;
* SAVE_VERSION remains 7.

The key principle:

> **We are now testing how much game NOVA can extract from its existing model before deciding that the model itself needs to grow.**

Do not add mechanics to make this step look important.


# Documentation (as-built) — Step 10BE

Starting commit: `d6c5e32` (Step 10BD).
Final commit: this commit.

## 1. Mission

Leave the audit loop and make the frozen model produce more deliberate gameplay
**with content only**: no new mechanic, no new resource, no new objective kind, no
rate change, no Town, SAVE_VERSION 7. The only simulation surface touched is the
declarative scenario catalogue (plus tests, E2E and this document).

## 2. Starting baseline

```text
economy            2/2 frozen (10BB: KEEP 2/2 — the rate decision is not reopened)
phase              10BC: A — PHASE FREEZE (Town undefined, no threshold invented)
capability         10BD: B — DESIGN SPACE IS INSUFFICIENT (no minimal labour claim)
catalogue          7 scenarios (10AL → 10AQ)
objective kinds    5, closed (stage, population, waterCapacity, foodBalance, building)
SAVE_VERSION       7
```

## 3. Existing scenario catalogue (recovered from the repository)

| id | dominant decision | family |
| --- | --- | --- |
| `first-settlement` | construction order/geometry from an empty map | opening |
| `water-constraint` | a Well now vs housing/capacity order | growth gate |
| `industrial-expansion` | a Workshop that cannot be run (limit tutorial) | industry |
| `water-reserve-industry` | convert a Water reserve into Material (order is terminal if reversed) | industry |
| `spatial-efficiency` | an exact 55-Material road budget | placement cost |
| `population-expansion` | housing ahead of Water capacity | growth gate |
| `recovery` | repair a stranded Farm (roads) vs duplicate it (a second Farm) | repair |

No existing scenario's dominant decision is *where housing connects*; and (measured
in the new test) **no catalogue scenario started on two networks** before this
step.

## 4. Content gap

10AZ measured a phenomenon that uses existing mechanics only: with the same
population, buildings, resources, road count and networks, **the network the next
Residence joins** decides coverage → admitted population → workplace eligibility →
progression. 10AZ classified it **B — useful but overlapping** and added nothing,
because at that time its consequence (blocked growth) and recovery (a 5-Material
link) were owned by `water-constraint` and `recovery`, and its exact claim had no
objective primitive. Two things changed since: 10BA shipped the **placement spatial
preview** (the decision is now readable *before* the command), and 10BD closed the
capability question (no minimal mechanic is justified), so the product's next move
is content.

**Policy note (documented, not silent).** 10BC §11 said "do not add scenarios" and
recommended a capability step next; this step's mission supersedes that direction
by product decision. The rationale 10BC protected is respected: no mechanic is
claimed, and §8's distinctness test (below) is the gate that replaces "wait for a
new mechanic".

## 5. Candidate scenario analysis (§7 of the step)

| candidate | verdict | evidence |
| --- | --- | --- |
| A. Network topology | **chosen, refined to housing topology** | the only catalogue start with two networks; the new Residence's network is a decision no scenario owns (10AZ measured, 10BA made readable) |
| B. Terrain + infrastructure | rejected | 10AW measured that the terrain world's decision space is a strict **subset** of its open-map twin (`onlyWithTerrain = []`); the chokepoint already exists as `TERRAIN_CHOKEPOINT_FIXTURE` (deep link), and promoting it would make terrain product content against 10AV/10AW |
| C. Housing ahead of services | rejected | `population-expansion` owns housing-vs-capacity (`waterCapacity 4` objective) |
| D. Workforce competition | rejected | `industrial-expansion` and `water-reserve-industry` own the scarce-worker/Workshop allocation |
| E. Construction scheduling | rejected | no existing objective primitive can force a crew decision (a tick threshold would be arbitrary), and 10Z measured the crew's payoff as a single non-durable tick |

Per §15 ("acceptable to add only one") exactly **one** scenario was added; the
rejections are recorded rather than padded into the catalogue.

## 6. Housing Composition scenario design

```text
id          housing-composition
name        Housing composition
description two road networks stand side by side without touching: the Well
            serves the east side, the colony's only Farm stands alone on the west
objective   Reach Village.      (existing primitive: { kind: 'stage', stage: 'village' })
constraint  Material 30: one Residence (25) plus at most one road cell (5);
            the Well and the Farm are on separate networks
start       roads (1,1) and (3,1)  ·  Residence (3,0), Well (3,2), Farm (1,2)
            1 colonist · Material 30 · Food 40 · Water 0 · 12x12 · no terrain
```

Start state (measured): two networks, the Well staffed (capacity 2), the Residence
served, **Food production 0** (the Farm is on the other network), stage Wilderness,
objective in progress with the blocker `Food balance`, reserve 40 Food.

**The decision.** The next Residence must be (a) served — or its colonist is never
admitted — and (b) on a network that can reach the Farm — or the admitted colonist
is unemployed and the colony eats its reserve. Both conditions are satisfied by a
cell adjacent to **both** roads; any other placement needs the remaining 5 Material
spent on a road that joins the networks. The alternatives do not cost the same,
which is exactly what §6 allows.

| choice (all legal, all 25 Material) | outcome |
| --- | --- |
| `(2,1)` — touches both networks | served **and** reaches the Farm → Village at tick 3, 5 Material spare |
| `(0,1)` or `(4,1)` + join the networks with `(2,1)` | Village, 0 Material left (recovery path) |
| `(4,1)` without joining | the colonist is admitted but stranded → **population 0 at tick 22** (cause visible: Food 0/tick, objective failed) |
| `(0,1)` without joining | no colonist is admitted at all → population 0 (Food 0/tick) |

Not a single-cell trap: three serviced cells exist, two strategies complete the
scenario, the cheapest one is discoverable from the placement preview, and a wrong
choice is recoverable with the remaining budget.

## 7. Second scenario candidate analysis

No second scenario was added. The candidate list and the reasons are §5 above; the
strongest runner-up (terrain + infrastructure) fails the distinctness bar on
10AW's measured subset result, and the remaining candidates are owned by existing
scenarios. §15 explicitly permits adding only one, or none.

## 8. Distinctness analysis (§8)

| Scenario | Dominant decision | Existing overlap | New consequence | Distinct |
| --- | --- | --- | --- | --- |
| first-settlement | build order/geometry from empty | — | — | (existing) |
| water-constraint | build a Well now vs housing first | new scenario's *consequence* overlaps (blocked growth) | — | (existing) |
| industrial-expansion | run a Workshop that 2/2 cannot sustain | — | — | (existing) |
| water-reserve-industry | convert a reserve into Material | — | — | (existing) |
| spatial-efficiency | exact road budget for a fixed build | new scenario also spends Material on placement | — | (existing) |
| population-expansion | housing ahead of Water capacity | both are "growth is gated" | — | (existing) |
| recovery | repair a stranded building vs duplicate it | new scenario can also be solved by a 5-Material join | — | (existing) |
| **housing-composition** (new) | **which network(s) the next Residence joins** | consequence/recovery semantics are existing (10P/09K/roads) | **housing placement decides whether a colonist is admitted at all and whether anyone can reach the food; first catalogue start on two networks** | **yes** |

The new scenario changes the **dominant decision** and the **spatial reasoning**
(§8's sufficient axes); it does not merely change starting Material, building
count, map size or cosmetics. Measured anchors: it is the only 2-network catalogue
start; at 10AZ time no catalogue scenario started split; and the three candidate
cells produce three different placement previews before any command
(`water: served · 2 workplaces reachable` / `water: served · 1 workplace reachable`
/ `water: NOT served`).

## 9. Implementation

```text
src/application/scenarios.ts   +1 declarative scenario (housing-composition)
tests/housingCompositionScenario.test.ts   new, 13 tests (start, solutions, failures,
                                           recovery, determinism, persistence, architecture)
tests/scenarios.test.ts        catalogue 8 + the progression/blocker expectation row
tests/contentReadabilityClosureAudit.test.ts   completion policy, matrix row,
                                           genuinelyDistinct 6, row counts 8
tests/{industrialContentCoDesign, industrialHeadroomAudit, industrialHeadroomTownDecision,
       nextCausalCapabilityDiscovery, openingEconomyScenarioStateAudit,
       phaseFreezeTownDependencyAudit, spatialWorkforceReadability,
       terrainContentScenarioIntegrationAudit, terrainSpatialInput,
       waterSemanticsPartitionAudit, housingCompositionScenarioAudit}   catalogue-size
                                           pins refreshed (each annotated with why)
e2e/housingCompositionRun.mjs  new browser playthrough suite (+ npm run test:e2e:housing)
e2e/readabilityAudit.mjs       catalogue-size assertion 7 → 8
package.json                   the new E2E script
docs/roadmap/Step10BE.md       this document
```

No domain file, no constant, no objective kind, no persistence, no renderer and no
UI file changed. The only production file touched is the declarative scenario
catalogue.

## 10. Browser playthroughs (real browser, `e2e/housingCompositionRun.mjs`)

```text
start            stage wilderness · objective in_progress (blocker "Reach Village")
                 material 30 · food 40 · Residences 1/1 served · Jobs 1/2 · 2 networks
previews         (2,1) "water: served · 2 workplaces reachable"
                 (4,1) "water: served · 1 workplace reachable"
                 (0,1) "water: NOT served (no covered Well on this network)"
first decision   where the second Residence goes
bridge solution  Residence (2,1) → admitted + Farm staffed → Village at tick 3,
                 population 2, 5 Material left
failure          Residence (4,1), no join → population 0 at tick 22, food 0,
                 objective failed ("starved")
recovery         Residence (0,1) then road (2,1) → 1 network → Village at tick 5,
                 0 Material left
narrow           420x740 and 360x640: no horizontal overflow, board usable,
                 scenario identity and framing still readable
```

## 11. Determinism

Same scenario assembled twice → identical canonical hash; the same command sequence
replayed twice → identical hash; and the derived reads (networks, coverage,
capacity, objective state) are invariant under a permuted **road** list (road ids
follow authoring order, so the hash is not the axis there — documented in the
test).

## 12. Save/load

Round-trip after a playthrough returns the identical hash, `SAVE_VERSION` stays 7,
and the scenario framing (`housing-composition`) is **not** present in the save: the
new content is starting state only, and every derived value (coverage, networks,
objective, progression) remains unpersisted.

## 13. Validation

```text
typecheck PASS · lint PASS · build PASS
Vitest 85 files / 1588 tests PASS (+1 file / +13 tests; 84/1575 before)
determinism PASS · insertion-order (derived) PASS · save/load PASS
browser 19 / 19 suites headless ALL PASS (18 existing + e2e/housingCompositionRun.mjs)
GPU E2E ALL PASS (headed: Chromium, WebGL, NVIDIA RTX 3070)
catalogue 7 → 8 · objective kinds unchanged (5) · SAVE_VERSION 7 · no domain change
```

## 14. Final classification

**A — content added, distinct and playable.** One scenario was authored from a
phenomenon the audits had already measured (10AZ) and made readable (10BA); its
dominant decision and spatial reasoning are new to the catalogue, its objective
uses an existing primitive, its failure is visible and recoverable, and no
mechanic, resource, objective kind, constant or persistence behaviour changed. That
it *reuses* coverage/mobility/road semantics is the point of a content step: the
simulation was not asked to grow.

## 15. Next dependency

Content, again — and only if a candidate passes the same distinctness bar. The
catalogue now covers opening/order, growth gates, industry, repair, placement cost
and housing topology; the recorded openings are: a `Terrain chokepoint` scenario
(needs a product decision to make terrain content, and 10AW measured its decision
space as a subset), a partitioned-valley scenario (10AR: B, deferred, and its
decision is still not expressible as an objective), and any future capability work
(10BD's price list). No Town, no new mechanic and no objective kind is justified by
this step.

---

## 16. Final report

```text
Step 10BE — COMPLETE

Starting commit: d6c5e32 (Step 10BD)
Final commit:    this commit

## Decision

Scenario(s) added: 1 — `housing-composition` (Housing composition)
Scenario catalogue: 7 → 8
New mechanics: NO
New objective kinds: NO (stage only)

## Existing content baseline

7 scenarios: first-settlement (order/geometry), water-constraint (Well vs housing),
industrial-expansion (a Workshop 2/2 cannot sustain), water-reserve-industry
(reserve → Material conversion), spatial-efficiency (exact road budget),
population-expansion (housing ahead of capacity), recovery (repair vs duplicate a
stranded Farm). No scenario's dominant decision was housing topology, and none
started on two networks (measured).

## Housing Composition

Scenario: `housing-composition` — two road networks that do not touch; the Well
and its serviced Residence on the east side, the only Farm alone on the west side.
Objective: `stage: village` (existing primitive; the consequence, not the solution).
Initial state: roads (1,1) and (3,1); Residence (3,0), Well (3,2), Farm (1,2);
1 colonist; Material 30, Food 40, Water 0; 12x12; no terrain. Start is Wilderness,
objective in progress, blocker `Food balance`.
Core decision: which network(s) the next Residence joins — it must be water-served
(for the second colonist to be admitted at all) and able to reach the Farm (for
that colonist to produce food).
Alternative solutions: (a) a cell adjacent to both roads — served and reaches the
Farm, 25 Material, Village at tick 3; (b) any other placement plus a 5-Material
road joining the networks — Village, 0 Material left.
Causal consequence: coverage (10P) decides admission; mobility (09K) decides
employment; the Food reserve decides survival — all existing rules.
Completion: bridge cell at tick 3 (measured in the browser and in unit tests).
Recovery: the wrong placement is recoverable with the remaining 5 Material (a road
join), measured from both failure shapes.
Why distinct: the dominant decision (housing topology) and the spatial reasoning
are new; it is the only 2-network catalogue start; the placement preview
distinguishes the candidates before the command.

## Second scenario

Scenario: NONE.
Objective: —
Core decision: —
Causal consequence: —
Completion: —
Why distinct: the runners-up are either owned by existing scenarios
(housing-vs-capacity, scarce-worker allocation), not forceable with an existing
objective primitive (construction scheduling), or measured as a subset decision
space (terrain, 10AW — and the chokepoint already exists as a fixture).

## Scenario distinctness

| Scenario | Dominant decision | Existing overlap | New consequence | Distinct |
|---|---|---|---|---|
| first-settlement | build order/geometry | — | — | (existing) |
| water-constraint | Well now vs housing first | blocked growth | — | (existing) |
| industrial-expansion | run an unsustainably staffed Workshop | — | — | (existing) |
| water-reserve-industry | reserve → Material conversion | — | — | (existing) |
| spatial-efficiency | exact road budget | Material-on-placement | — | (existing) |
| population-expansion | housing ahead of capacity | growth gating | — | (existing) |
| recovery | repair vs duplicate a stranded building | a 5-Material join | — | (existing) |
| housing-composition (new) | which network the next Residence joins | coverage/mobility/road semantics are existing | housing placement decides admission AND who can reach the food; first 2-network start | YES |

## Implementation

Domain changes: NONE
Application changes: NONE (the scenario catalogue is data)
Scenario changes: +1 declaration (`housing-composition`); no existing scenario edited
UI changes: NONE
Persistence changes: NONE
SAVE_VERSION: 7 (unchanged)

## Real playthroughs

housing-composition —
Start: Wilderness, objective in progress, Material 30, Food 40, 2 networks,
1 Residence served, the Farm vacant and unreachable.
First decision: where the second Residence goes (preview: served + 2 workplaces at
(2,1); served + 1 at (4,1); not served at (0,1)).
Major decisions: the placement cell; whether to spend the last 5 Material joining
the networks.
Completion: tick 3 (bridge cell) — Village, population 2, Farm staffed, 5 Material left.
Final population: 2. Final resources: Material 5, Food 37, Water 3.
Failure/recovery: (4,1) without a join → population 0 at tick 22 with `starved`
visible; (0,1) then road (2,1) → Village at tick 5 with 0 Material left.

## Validation

typecheck: PASS
lint: PASS
build: PASS
tests: 85 files / 1588 tests PASS (+1 file / +13 tests)
determinism: PASS
insertion-order: PASS (derived reads invariant under a permuted road list)
save/load: PASS (round-trip hash identical; framing not persisted)
browser: 19 / 19 suites headless ALL PASS
GPU: ALL PASS (headed: Chromium, WebGL, NVIDIA RTX 3070)

## Final classification

A — content added, distinct and playable, with the frozen model untouched.

## Next dependency

Content only, gated by the same distinctness test. Recorded openings: a terrain
chokepoint scenario (needs a product decision to make terrain content; 10AW
measured its decision space as a subset), a partitioned-valley scenario (10AR: B,
deferred, still not expressible as an objective), and any capability work (10BD's
price list). No Town, no new mechanic, no new objective kind.
```
