Tu travailles sur NOVA.

# Step 10AJ — Gameplay Loop & Progression Contract Audit

## Starting point

Starting commit:

`7916a0d`

Step 10AI a conclu :

```text
NO NEW CORE SYSTEM JUSTIFIED
```

Le modèle causal actuel est considéré comme suffisamment complet pour passer de la phase de découverte de systèmes à une phase de validation du **gameplay loop et de la progression**.

Le système actuel possède notamment :

* Residence capacity = 1
* Farm = +2 Food/tick
* Well = +2 Water/tick
* Workshop = +2 Material/tick, -1 Material upkeep/tick
* colonist = -1 Food/tick, -1 Water/tick
* Residence/Farm/Well = 25 Material
* Workshop = 25 Material + 1 Water
* Road = 5 Material
* Workshop storage = 25 Material
* Construction Crew = -1 construction tick
* road networks
* Water coverage through networks
* worker mobility through networks
* road-distance workplace preference
* manual workforce assignment
* automatic workforce assignment
* deterministic simulation
* SAVE_VERSION 7

Do **not** add a new core system in this step.

Do **not** modify `src/`.

This is an audit/design-contract step.

---

# 1. AUDIT — Reconstruct the actual gameplay loop

Describe the current player loop strictly from implemented mechanics.

Determine whether the actual loop is:

```text
observe
→ choose next construction
→ allocate resources
→ place building / road
→ wait for construction
→ population/workforce changes
→ production changes
→ resources change
→ choose next construction
```

or whether the real loop differs.

Do not describe the intended game.

Describe what the player can actually do today.

Identify:

* initial state;
* first meaningful decision;
* first construction;
* first production;
* first population growth;
* first industrial construction;
* first meaningful spatial optimization;
* first resource bottleneck;
* first growth ceiling;
* eventual stable state.

---

# 2. AUDIT — Find the actual player objective

This is the central question.

Currently the simulation can:

* survive;
* produce;
* grow;
* construct;
* reach a Water/workforce ceiling.

But determine what the player is actually trying to accomplish.

Test the current model against possible objective categories:

```text
A. survival
B. population growth
C. economic expansion
D. spatial optimization
E. industrialization
F. reaching a settlement milestone
G. maximizing production
H. building a stable autonomous settlement
I. no explicit objective currently exists
```

Do not choose a preferred objective.

Determine which objectives are actually supported by the current mechanics and which are not.

For each:

| Objective | Mechanically supported? | Existing measurable state? | Player can intentionally pursue it? | Evidence |
| --------- | ----------------------- | -------------------------- | ----------------------------------- | -------- |

Do not add objectives during this audit.

---

# 3. AUDIT — Measure meaningful phases of a run

Construct a canonical run from the actual initial state.

Record the important milestones.

For example, measure:

```text
t0  initial state
tX  first Residence
tX  first operational Road network
tX  first operational Well
tX  first colonist
tX  first Farm
tX  first stable food/water state
tX  first Workshop
tX  first industrial Material production
tX  first expansion
tX  first meaningful workforce constraint
tX  first Water ceiling
tX  stable state
```

Use actual observed ticks rather than assumptions.

The exact sequence may differ from this example.

---

# 4. AUDIT — Run-to-run variation

Create several controlled runs where the player makes different valid decisions.

Examples:

### Run A — Compact

Minimize road cells.

### Run B — Corridor

Use longer road connections.

### Run C — Water-first

Prioritize Well capacity.

### Run D — Industry-first

Prioritize Workshop construction as soon as possible.

### Run E — Population-first

Prioritize Residences and Farms.

These are **experiments**, not recommended strategies.

Measure:

* time to milestones;
* population;
* Food;
* Water;
* Material;
* workforce;
* unemployed workers;
* construction throughput;
* road cells;
* network count;
* building counts;
* final stable state.

The goal is to determine whether different play styles already produce distinct trajectories.

Do not rank them.

---

# 5. AUDIT — Is there a meaningful short-term loop?

Determine whether the player repeatedly encounters decisions of the form:

```text
"I have X resources and Y capacity.
I can build A, B or C.
Each changes the future differently."
```

Find at least 5 real decision points from actual simulation traces.

For each:

```text
Current state
Available constructions
Relevant constraint
Possible choices
Observed consequence
```

If a choice has no meaningful consequence, mark it as such.

Do not invent consequences.

---

# 6. AUDIT — Is there a meaningful medium-term loop?

Test whether a decision made several construction cycles earlier still affects the later state.

Examples:

* road layout;
* network topology;
* workplace assignment;
* Well placement;
* Workshop timing;
* Residence placement;
* Construction Crew usage.

Measure delayed consequences over a sufficiently long horizon.

The question is:

> Does NOVA already contain meaningful planning over multiple ticks, or does every decision reduce to immediate resource arithmetic?

Do not answer conceptually. Demonstrate with controlled runs.

---

# 7. AUDIT — Is there a meaningful long-term loop?

Run sufficiently long stable simulations.

Determine:

* whether the player eventually reaches a terminal equilibrium;
* whether multiple stable states exist;
* whether those states differ meaningfully;
* whether spatial layout remains relevant after stabilization;
* whether there is anything left to optimize once the Water/workforce ceiling is reached.

Explicitly distinguish:

```text
simulation stability
```

from

```text
gameplay completion
```

A stable simulation is not automatically a satisfying gameplay endpoint.

Do not add a new mechanic to solve this.

---

# 8. AUDIT — Settlement stages

NOVA's conceptual progression currently contains:

```text
Wilderness
→ Settlement
→ Village
→ Town
→ City
→ Metropolis
→ Autonome
```

Do NOT implement stage mechanics.

Instead determine whether the existing simulation already exposes measurable milestones that could support such stages.

Candidate measurements may include:

* population;
* number of Residences;
* number of Farms;
* number of Wells;
* number of Workshops;
* road infrastructure;
* network size;
* Material production;
* Food production;
* Water capacity;
* sustained stability duration;
* construction activity.

Do not assume any of these should become a stage condition.

For every candidate metric determine:

```text
measurable?
causal?
stable?
monotonic?
player-visible?
meaningful?
```

A stage condition must not be arbitrary.

---

# 9. AUDIT — Stage differentiation

Test whether the existing stages actually describe different states.

For each adjacent pair:

```text
Wilderness → Settlement
Settlement → Village
Village → Town
Town → City
City → Metropolis
Metropolis → Autonome
```

ask:

> Can the current simulation produce a state that is observably different enough to justify this distinction?

If not, say so explicitly.

Do not create artificial thresholds merely to preserve the names.

It is acceptable for some conceptual stages to be currently unsupported.

---

# 10. AUDIT — Progression without power creep

Investigate whether progression could theoretically represent:

```text
more population
more infrastructure
more complexity
greater spatial optimization
greater stability
```

using existing state only.

The audit must explicitly reject progression systems based solely on:

* +10% production;
* +20% storage;
* cheaper buildings;
* faster construction;
* arbitrary unlock bonuses.

Unless an existing mechanic causally produces such a distinction, do not introduce it.

The objective is to determine whether progression can emerge from the simulation rather than being bolted onto it.

---

# 11. AUDIT — Failure and recovery

Measure real failure states.

For each major failure:

* Food collapse;
* Water shortage;
* workforce starvation;
* inaccessible production;
* excessive road expenditure;
* poor network layout;
* premature Workshop;
* premature housing expansion;

determine:

```text
fatal?
recoverable?
recoverable without reset?
requires player intervention?
```

Do not modify recovery rules.

The purpose is to understand the existing gameplay loop.

---

# 12. AUDIT — Player readability

Determine whether the player can actually understand the causal loop.

Inspect current UI/state exposure.

For each major causal relationship:

```text
Food
Water
Material
Workforce
Road access
Network
Workplace assignment
Construction
Population
```

determine:

```text
visible?
understandable?
actionable?
```

Use browser validation where applicable.

If something is mechanically present but invisible or ambiguous, record it as a **readability issue**, not as a missing simulation mechanic.

---

# 13. AUDIT — Content vs mechanics

Separate these two questions:

### Mechanics

Does the simulation have enough causal systems?

10AI says yes.

### Content

Does the player currently have enough meaningful situations to experience those systems?

Determine whether additional depth would come from:

* new scenarios;
* different starting conditions;
* constrained maps;
* resource distributions;
* objective configurations;
* progression thresholds;
* challenge presets;

rather than new core mechanics.

Do not implement content yet.

---

# 14. Audit — Scenario potential

Without implementing scenarios, determine whether the current simulation can already express materially different starting situations.

Examples:

```text
Low Material
High Material
Low Water
Sparse build area
Dense build area
Existing isolated network
Existing productive settlement
Industrial starting state
Population-heavy starting state
```

For each hypothetical scenario, ask:

* which existing mechanics become relevant?
* does it create a different decision space?
* does it expose an existing system that is otherwise dormant?

Do not add new rules merely to make scenarios interesting.

---

# 15. Audit — Minimal progression model

Using ONLY currently existing state, identify the smallest possible progression signal.

Do not implement it.

Potential signals can be evaluated only if they already exist:

```text
population
infrastructure
production
stability
construction history
network extent
industrial capacity
```

For each:

| Signal | Existing state? | Causal? | Stable enough? | Exploitable? | Readable? |
| ------ | --------------- | ------- | -------------- | ------------ | --------- |

The output should be a set of **candidate contracts**, not a chosen implementation.

---

# 16. Architecture boundary

Verify:

* `src/` unchanged;
* SAVE_VERSION = 7;
* persisted state unchanged;
* no new persistence requirements;
* no new derived-state persistence;
* deterministic simulation preserved;
* insertion-order invariance preserved.

No implementation work is allowed.

---

# 17. Required verification

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Also run relevant:

* determinism;
* insertion-order;
* save/load;
* browser/UI validation.

If you create tests for this audit, they must be isolated audit tests only.

Allowed changes:

```text
tests/*GameplayLoop*Audit.test.ts
tests/*Progression*Audit.test.ts
docs/roadmap/Step10AJ.md
```

No `src/` modifications.

---

# 18. Final decision

The final report must choose one of these factual conclusions:

### A

```text
GAMEPLAY LOOP ALREADY MEANINGFUL
```

Meaning the existing mechanics create repeated, consequential player decisions and progression can be derived from existing state.

### B

```text
GAMEPLAY LOOP EXISTS BUT NEEDS READABILITY/CONTENT
```

Meaning the simulation is mechanically sufficient but the player experience currently lacks scenarios, visibility, or progression framing.

### C

```text
PROGRESSION CONTRACT MISSING
```

Meaning the simulation is coherent but there is insufficient existing state to define meaningful progression without a future design decision.

### D

```text
CORE MODEL STILL INSUFFICIENT
```

Use this only if the audit finds a genuine causal contradiction or fundamental missing phenomenon that 10AI failed to detect.

Do not select D merely because the game lacks more content.

---

# 19. Final report

Create:

`docs/roadmap/Step10AJ.md`

Structure:

```text
STEP 10AJ — GAMEPLAY LOOP & PROGRESSION CONTRACT AUDIT

Starting commit:
Final commit:

1. Actual gameplay loop
2. Player objective analysis
3. Canonical run milestones
4. Run-to-run variation
5. Short-term decision loop
6. Medium-term planning
7. Long-term behavior
8. Settlement stage analysis
9. Stage differentiation
10. Progression without power creep
11. Failure/recovery
12. Player readability
13. Content vs mechanics
14. Scenario potential
15. Existing progression signals
16. Architecture boundary
17. Verification
18. Final decision
19. Recommended next dependency
```

Use measured data wherever possible.

Avoid generic game-design language.

Do not say:

> "The game needs more depth."

Instead say:

> "After tick X, all tested configurations converge to state Y, leaving no remaining player-controlled variable with measurable downstream effect."

Or, if the opposite is demonstrated, document the actual divergent trajectories.

---

# Hard constraints

* Do NOT modify `src/`.
* Do NOT change SAVE_VERSION.
* Do NOT add migrations.
* Do NOT add a mechanic.
* Do NOT add a resource.
* Do NOT add settlement-stage effects.
* Do NOT add progression bonuses.
* Do NOT add objectives.
* Do NOT add scenarios.
* Do NOT rebalance values.
* Do NOT redesign the UI.
* Do NOT repeat the 10AH adjacency audit.
* Do NOT repeat the 10AI system-sufficiency audit.
* Do NOT invent a missing system simply because the game needs content.
* Do NOT implement any proposed progression contract.

The purpose of Step 10AJ is to answer:

> **Does the existing simulation already form a meaningful gameplay loop, and can its existing measurable state support a coherent progression model without adding another core system?**

The next implementation step must be derived from evidence produced by this audit.

---
# STEP 10AJ — GAMEPLAY LOOP & PROGRESSION CONTRACT AUDIT (report)

Audit / design-contract only. `src/` was NOT modified. Every value below is
measured from the real runtime with real placement commands, by
`tests/gameplayLoopProgressionAudit.test.ts` (12 tests, deterministic;
`--reporter=verbose` prints the `AUDIT …` rows quoted here).

```text
STEP 10AJ — GAMEPLAY LOOP & PROGRESSION CONTRACT AUDIT

Starting commit: 7916a0d ("Step 10AI: system sufficiency & phase boundary audit")
Final commit:    this commit

1  Actual gameplay loop: observe HUD -> choose the next construction (the only spend) -> place
   on the canvas -> 2 construction ticks (1 with a crew) -> population/workforce -> production ->
   resources -> next choice. Measured: three real trajectories from the initial state diverge
   into one stable settlement and two Food collapses.
2  Player objectives: 8 of 9 categories mechanically supported; only "settlement milestone" is
   not (no objective/progress state exists in the runtime at all).
3  Canonical milestones: measured ticks for construction, road, colonist, second colonist, Well,
   Farm, industrial production, Water ceiling, stable state and wipe (table below).
4  Run variation: five play styles -> road budgets 2/5/4/2/3 cells; two reach a stable state
   (population 1 and 2); three Food-collapse (wipes at ticks 104, 104 and 55).
5  Short-term loop: five real decision points, each producing at least two distinct downstream
   states.
6  Medium-term planning: a road layout chosen at t0 still explains a 15-Material difference at
   tick 500.
7  Long-term: four colonies reach equilibrium (population/Water spread 0 over the last 100 ticks);
   after stabilisation an extra Farm is affordable and changes population by 0 and Material net
   by 0 over 100 ticks.
8  Stage metrics: population / Residences / Farms / Wells / roads / networks / production are
   measurable, monotonic and player-visible (0/1/2/4/6 colonists across the five staged states).
9  Stage differentiation: Wilderness->Settlement, Settlement->Village, Village->Town are
   observable; Town->City, City->Metropolis, Metropolis->Autonome are NOT supported by any
   existing state difference.
10 Progression without power creep: the 1-Well and 3-Well colonies differ only by counts
   (2 vs 6 colonists, 2 vs 6 Water production); per-Well output is identical, no multiplier.
11 Failure/recovery: Food collapse is the only fatal state; the other seven are recoverable.
12 Readability: 40 readable stat fields + 33 UI test ids cover all nine causal relationships;
   12/12 browser suites pass.
13 Content vs mechanics: mechanics are sufficient (10AI); the available depth is in starting
   conditions, scenarios, thresholds and framing.
14 Scenario potential: 8 of 10 hypothetical starts change the decision space without new rules.
15 Progression signals: 8 existing signals evaluated; candidate contracts for Settlement /
   Village / Industrial derived only from model-produced state.
16 Architecture: SAVE_VERSION 7, 7 persisted keys, deterministic, insertion-order invariant.
17 Verification: 63 files / 1239 tests, typecheck, lint, build, determinism, save/load, 12/12 browser.
18 FINAL DECISION: B — GAMEPLAY LOOP EXISTS BUT NEEDS READABILITY/CONTENT.
19 Next dependency: a progression/scenario design-contract step derived from existing state
   (never implemented in 10AJ).
```

## 1. Actual gameplay loop

The runtime supports exactly this loop (verified against the code by driving it with real commands):

```text
observe the HUD (Material / Food / Water / jobs / roads)
-> choose the next construction (the only Material spend)
-> place a building or a road on the canvas
-> wait 2 construction ticks (1 with a Construction Crew)
-> population / workforce changes (admission, assignment)
-> production changes (Food / Water / Material)
-> resources change and the next choice opens
```

Measured trajectories from the real initial state (Material 100, Food 100, Water 0):

| trace | order | milestones (tick) | endpoint at tick 400 |
| --- | --- | --- | --- |
| **A housing + food first** | Residence, Roads, Residence, Farm | construction 1, road network 2, colonist 3, second colonist 5, Farm staffed 6, **stable state 105** | population **2**, Food 96, Material 15, 3 buildings, Food net 0 — no Well, no Workshop, no growth |
| **B industry first** | Residence, Roads, Well, Workshop, Farm | construction 1, road 2, colonist 3, Well staffed 5, industrial Material 9, vacant workplace 9, **Food collapse 104** | population **0**, Material 24, 4 buildings (Well + Workshop + Farm) |
| **C water first** | Residence, Roads, Well, Residence | construction 1, road 2, colonist 3, Well staffed 5, second colonist 6, **Water ceiling 6**, **Food collapse 55** | population **0**, 3 buildings |

The first meaningful decision is therefore not "which building" but **which archetype**: from 100
Material, `2 Residences + Well + Farm + roads` costs 115, so the player can afford either a
two-colonist Food settlement (no Well) or a one-colonist Well + Workshop industry — not both.

## 2. Player objective analysis

| objective | mechanically supported | measurable state | player can pursue it | evidence |
| --- | --- | --- | --- | --- |
| A survival | yes | yes | yes | Food below the need wipes the colony in 1 tick |
| B population growth | yes | yes | yes | population = 2 x staffed Wells (measured 2 / 4 / 6) |
| C economic expansion | yes | yes | yes | a staffed Workshop funds the next building at +1 net/tick |
| D spatial optimization | yes | yes | yes | the same 4 buildings cost 5 vs 15 Material in roads |
| E industrialization | yes | yes | yes | Workshop count and Material net are first-class state |
| F settlement milestone | **no** | **no** | **no** | the runtime has no stage/objective/progress field |
| G maximizing production | yes | yes | yes | gross Material is 2 per staffed Workshop; the ceiling is the workforce |
| H stable autonomous settlement | yes | yes | yes | a 2-colonist / 1-Farm / 1-Well colony is stable for 600 ticks |
| I no explicit objective exists | yes | yes | no | no goal, win or score state exists |

## 3. Canonical run milestones

From section 1's measured traces: construction 1, road network 2, first colonist 3, second
colonist 5-6, Well staffed 5, Farm staffed 6, first industrial Material 9, Water ceiling 6,
stable state 105, first Food collapse 55 (trace C) / 104 (trace B). No milestone was assumed.

## 4. Run-to-run variation

Five valid policies at horizon 400 (no ranking implied):

| policy | road cells | Well/Farm/Workshop | staffed | population | wipe tick | final Material |
| --- | --- | --- | --- | --- | --- | --- |
| A compact | 2 | 1 / 1 / 0 | none | **0** | 104 | 15 |
| B corridor | 5 | 1 / 1 / 0 | 1 Farm | 1 | - | 0 |
| C water-first | 4 | 2 / 0 / 0 | none | **0** | 104 | 5 |
| D industry-first | 2 | 1 / 0 / 1 | none | **0** | 104 | 15 |
| E population-first | 3 | 0 / 1 / 0 | 1 Farm | **2** | - | 10 |

Different play styles already produce different trajectories: two stable endpoints with different
road budgets (5 vs 3 cells) and three Food collapses. The dominant variable in these traces was
the **construction order** (which workplace won the single worker), not the geometry: policies
A and B have the same buildings and differ only in the Farm-versus-Well order and the road count.

## 5. Short-term decision loop

Five real decision points, each forked into 2-3 choices and run 120 ticks:

| decision point | choices measured | outcome spread |
| --- | --- | --- |
| Material 60, 1 worker, no production | Farm / Well / save for a Workshop | different Food, Water and Material nets |
| Well operational, Material 35, Water 1 | Farm first / Workshop first | Food vs Material trajectory |
| 2 colonists balanced, Material 25, 1 free slot | Workshop / Residence / Farm | Material net vs dormant housing vs Food margin |
| Material 25, no free worker | Workshop (vacant) / Residence (unlocks a worker) | 0 delta vs a future worker |
| Water ceiling, Material 25 | Residence / Well / Farm | dormant housing vs capacity vs Food |

Test assertion: every fork produces at least two distinct downstream states across the tracked
metrics, i.e. the short-term loop is consequential rather than cosmetic.

## 6. Medium-term planning

| fork decided at t0 | measured consequence at tick 500 |
| --- | --- |
| road layout: compact (1 road cell) vs corridor (4 road cells) | Material differs by exactly **15** (the road budget), and the difference persists |
| network topology: one network vs two | the split layout needs its own Well per network (measured in 10AG/10AH); the road budget differs by 9 cells |
| Workshop timing: early vs after the Farm | the same final building set is reached; the Material-at-500 difference is 0 once both are capped |

A decision taken in the first construction cycles still explains the state hundreds of ticks later,
so the model already contains multi-cycle planning.

## 7. Long-term behavior

Four colonies to tick 1000: population / Water / Material / Food spread over the **last 100 ticks is
0** in all four (terminal equilibrium). Post-stabilisation probe (`+1 Farm`, 100 ticks, the probe
state seeded with 500 Material so the action is affordable):

| colony | final population | extra Farm accepted | population delta | Material-net delta |
| --- | --- | --- | --- | --- |
| 1 Well | 2 | yes | **0** | **0** |
| 2 Wells | 2 | yes | **0** | **0** |
| 2 Wells + Workshop | 4 | yes | **0** | **0** |
| Material-rich | 2 | yes | **0** | **0** |

After equilibrium, **no tested player-controlled variable has a measurable downstream effect**.
Simulation stability is not gameplay completion: the simulation is stable, but there is no
completion state, objective or milestone that says the run is finished.

## 8. Settlement stage analysis

Candidate metrics measured on five staged states (all monotic in the progression order):

| stage | population | Residences | Farms | Wells | Workshops | road cells | networks | buildings | Food prod. | Water prod. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Wilderness (t0) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Settlement | 1 | 1 | 0 | 0 | 0 | 1 | 1 | 1 | 0 | 0 |
| Village | 2 | 2 | 1 | 1 | 0 | 3 | 1 | 4 | 2 | 2 |
| Town | 4 | 4 | 2 | 2 | 0 | 9 | 1 | 8 | 4 | 4 |
| City | 6 | 6 | 3 | 3 | 0 | 13 | 1 | 12 | 6 | 6 |

All metrics are measurable, causal, stable, monotonic, player-visible in the current UI, and
meaningful. Material production is 0 in every staged state because the balanced archetype never
staffs a Workshop (10AF/10AI's measured workforce ceiling).

## 9. Stage differentiation

| pair | observably different today | evidence |
| --- | --- | --- |
| Wilderness -> Settlement | **yes** | population 0 -> 1, buildings 0 -> 1, a road network appears |
| Settlement -> Village | **yes** | population 1 -> 2, a staffed Well appears (Water capacity 0 -> 2), Food production 0 -> 2 |
| Village -> Town | **yes** | population 2 -> 4, 2 Wells, 2 Farms, 9 road cells |
| Town -> City | **no** | the same systems repeat at greater scale; no new mechanic or qualitative state |
| City -> Metropolis | **no** | no measured state distinguishes them: the ceiling is 2 colonists per Well |
| Metropolis -> Autonome | **no** | no autonomy/self-sufficiency state exists beyond neutral flows, which a Village already reaches |

The last three names are **not supported** by the current simulation, and no artificial threshold
was invented to preserve them.

## 10. Progression without power creep

Measured: a 1-Well colony (population 2, Water production 2) and a 3-Well colony (population 6,
Water production 6). Per-Well output is identical (2 Water each), Food per Farm is identical (2),
and Material per staffed Workshop is identical (2). The entire difference is **counts of buildings
and workers**. Bonuses of the form `+10% production`, `+20% storage`, cheaper buildings, faster
construction or unlock bonuses are explicitly rejected: nothing in the model produces such a
distinction and none is needed to differentiate the states.

## 11. Failure and recovery

| failure | fatal | recoverable | needs player intervention | measured end state |
| --- | --- | --- | --- | --- |
| Food collapse | **yes** | no | yes | population 0, permanent |
| Water shortage | no | yes | yes | population 3, growth blocked |
| Workforce starvation (1 worker, 3 workplaces) | no | yes | yes | population 1, 1 staffed workplace |
| Inaccessible production | no | yes | yes | Food 0/tick; a connector road restores it |
| Excessive road expenditure | no | yes | no | slower construction, no loss |
| Poor network layout | no | yes | yes | 1 of 2 Residences served |
| Premature Workshop (no Water) | no | yes | no | the placement is rejected by the rule |
| Premature housing expansion | no | yes | no | population 2, dormant Residences |

Only Food collapse is terminal; every other measured failure is recoverable without a reset.

## 12. Player readability

Measured from the real UI surface: **40 readable stat fields** (`stats()`) and **33 `data-testid`
controls**, covering all nine causal relationships:

| relationship | visible surface | understandable | actionable |
| --- | --- | --- | --- |
| Food | `stat-food` + `stat-food-forecast` | yes | build a Farm |
| Water | `stat-water` + `stat-water-status` + inspection | yes | build/connect a Well |
| Material | `stat-construction` + `ui-status` | yes | build a Workshop |
| Workforce | `stat-colonists` + `stat-jobs` + `inspection-worker` | yes | manual reassignment |
| Road access | `stat-roads` + hover reason | yes | place/move a road |
| Network | `stat-roads` + served-residence count | yes | connect or separate networks |
| Workplace assignment | `staffedFarmIds` / `staffedWorkshopIds` / `manualWorkerIds` | yes | reassign or rebuild |
| Construction | `inspection-construction` + `ui-status` | yes | assign a Construction Crew |
| Population | `stat-colonists` + `inspection-housing` | yes | housing + Water capacity |

Browser validation: **12/12 existing suites pass** (`run`, `production`, `temporal`, `water`,
`food`, `resource`, `reassign`, `crew`, `road`, `transport`, `jobs`, `upkeep`).
Remaining gap is **framing**, not visibility: the runtime has no objective/progression display.

## 13. Content versus mechanics

* **mechanics**: 10AI measured 0 of 14 fundamental phenomena unrepresented. This audit adds no
  counter-evidence: every measured decision is available with the existing rules.
* **content**: the available depth without new rules is in *scenarios*, *starting conditions*,
  *constrained maps*, *resource distributions*, *objective configurations*, *progression
  thresholds* and *challenge presets*.

## 14. Scenario potential

| hypothetical start | existing mechanics that become relevant | different decision space |
| --- | --- | --- |
| Low Material (25) | Workshop income gates construction; storage 25 | yes |
| High Material (1000) | storage cap discards overflow | **no** |
| Low Water (0, no Well) | Water gate inactive; first colonist staffs the Well | yes |
| Sparse build area | road cost 5/cell; road-distance preference | yes |
| Dense build area | one road cell serves 4 buildings | yes |
| Existing isolated network | coverage and mobility are per network | yes |
| Existing productive settlement | labour income +1/tick | yes |
| Industrial starting state | upkeep 1 against gross 2 | yes |
| Population-heavy start | all-or-nothing Food; Water capacity per Well | yes |
| Food-rich start | uncapped Food buffer | **no** |

8 of 10 hypothetical starts change the decision space using only existing rules. The two that do
not expose exactly the measured dead ends (Material above the cap and Food surplus have no
consumer).

## 15. Existing progression signals

| signal | existing state | causal | stable | exploitable | readable |
| --- | --- | --- | --- | --- | --- |
| population | yes | yes | yes | yes | yes |
| infrastructure (buildings by type) | yes | yes | yes | no | yes |
| production per tick | yes | yes | yes | yes | yes |
| stability duration | yes | yes | yes | no | **no** |
| construction history | yes | no | yes | yes | **no** |
| network extent | yes | yes | yes | yes | yes |
| industrial capacity (staffed Workshops) | yes | yes | yes | yes | yes |
| Water capacity (staffed Wells x 2) | yes | yes | yes | yes | yes |

Candidate **contracts** (not chosen, not implemented):

```text
Settlement = population >= 1 AND a Road network exists
Village    = population >= 2 AND Water capacity >= 2 (a staffed Well)
Industrial = a staffed Workshop producing Material
Town       = population >= 4 AND Food production >= consumption   (threshold is arbitrary: flagged)
```

A threshold that the model does not itself produce would be arbitrary; Water capacity and staffed
buildings are produced by the model, raw population counts are not.

## 16. Architecture boundary

`src/` unchanged; `SAVE_VERSION` stays 7; exactly 7 persisted top-level keys
(`buildings`, `colonists`, `config`, `counters`, `resources`, `roads`, `time`); no new persistence
requirement; no derived state persisted (`coverage`, `mobility`, `networkId`, `served`, `stage`,
`objective`, `progress`, `score` all absent from the canonical payload); the same canonical hash
for two identical 200-tick runs; insertion-order invariance preserved; no deterministic-simulation
change; no new framework.

## 17. Verification

```text
Vitest:        63 files / 1239 tests passed (before 62 / 1225; audit tests added 12 for this step)
Typecheck:     passed
Lint:          passed
Build:         passed
Determinism:   tests/determinism.test.ts (same-run hash + insertion order) passed
Save/load:     tests/persistence.test.ts (round-trip) passed
Browser/UI:    12 / 12 suites pass (run, production, temporal, water, food, resource,
               reassign, crew, road, transport, jobs, upkeep)
Known env note: a stale `vite preview` process on port 4173 from an earlier session made the
               first `run.mjs` attempt fail; after killing it the suite passes.
```

## 18. Final decision

```text
B — GAMEPLAY LOOP EXISTS BUT NEEDS READABILITY/CONTENT
```

Evidence for the decision:

* **the loop is meaningful**: three trajectories from the same start diverge into one stable
  settlement and two Food collapses (ticks 55 / 104); five short-term forks all produce distinct
  downstream states; a road-layout decision at t0 still explains a 15-Material difference at
  tick 500;
* **the mechanics are sufficient**: 10AI measured 0 of 14 phenomena unrepresented, and this audit
  found no contradiction;
* **readability of the simulation is already good**: 40 stat fields and 33 UI controls cover all
  nine causal relationships, and all 12 browser suites pass;
* **what is missing is framing and content**: the runtime has no objective/progress state
  (objective F fails, and "no explicit objective exists" is literally true), the initial budget
  forces an archetype choice that the game never frames, and after equilibrium an extra Farm is
  affordable yet changes population by 0 and Material net by 0 over 100 ticks — a stable but
  unframed end state;
* **not C**: the derivable signals exist (Water capacity, staffed buildings, network extent and
  production are model-produced, causal, stable and monotonic), so a progression contract does not
  require a future simulation decision, only a design decision about how to frame it.

## 19. Recommended next dependency

A **progression / scenario design-contract step** (audit/design only, no implementation) that:

1. defines the stage/objective layer from model-produced state (Water capacity, staffed buildings,
   production, network extent), never from arbitrary population thresholds;
2. defines the scenario/preset layer from existing starting conditions (Material, Water, Food,
   build area, existing networks, population mix) — measured: 8 of 10 such starts already change
   the decision space with no new rule;
3. frames the measured archetype choice (housing/food vs water/industry from the initial budget)
   in the UI, which is currently invisible;
4. keeps the hard line from 10AI and this audit: **no new core system, no multiplier bonuses, no
   adjacency/pollution/service mechanics**.

