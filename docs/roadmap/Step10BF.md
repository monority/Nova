# Step 10BF — Scenario Content Closure & Playability Audit

## Mission

Starting HEAD is expected to be:

`77d2a3a`

Step 10BE added exactly one curated scenario:

```text
housing-composition
```

Scenario catalogue:

```text
7 → 8
```

The scenario is considered causally valid and genuinely distinct.

This step is a **playability/content closure audit** for the expanded catalogue.

The goal is NOT to invent another mechanic and NOT to automatically add another scenario.

The goal is to determine:

1. whether the new `housing-composition` scenario is genuinely understandable and playable;
2. whether the 8-scenario catalogue now has sufficient content diversity;
3. whether any existing scenario has become redundant or misleading;
4. whether the new scenario exposes a real UX/readability problem;
5. whether another scenario is actually justified;
6. whether the current content phase should be closed.

This is primarily an audit, with implementation allowed only for small, clearly demonstrated content/UX defects.

---

# 1. HARD CONSTRAINTS

Do not modify:

* economic constants;
* Farm/Well/Workshop rates;
* Food/Water semantics;
* workforce rules;
* road rules;
* terrain mechanics;
* progression mechanics;
* objective kinds;
* persistence;
* SAVE_VERSION;
* Town;
* new simulation capabilities.

Do not add:

* new resources;
* new buildings;
* new citizen systems;
* new services;
* pollution;
* electricity;
* zoning;
* demand;
* happiness;
* traffic;
* road capacity;
* labour specialization;
* new workforce sources.

Do not add a ninth scenario merely to increase catalogue size.

The catalogue may remain exactly 8.

---

# 2. READ FIRST

Read:

```text
docs/roadmap/Step10AT.md
docs/roadmap/Step10BE.md
docs/roadmap/Step10BA.md
docs/roadmap/Step10BC.md
docs/roadmap/Step10BD.md
```

Also inspect the current:

* scenario catalogue;
* scenario definitions;
* scenario assembler;
* objective definitions;
* progression UI;
* scenario selection/loading;
* E2E scenario runners;
* spatial preview;
* Water labels;
* workforce diagnosis;
* failure messaging.

Do not repeat historical audits except where necessary to compare the new scenario.

---

# 3. REBUILD BEFORE BROWSER

Important repository rule from 10BE:

> Browser suites serve the built application.

Therefore:

```text
source change
↓
build
↓
browser tests
```

Never run scenario browser verification against a stale build.

Record this explicitly in the report.

---

# 4. HOUSING-COMPOSITION REAL PLAYTHROUGH

Use the actual browser.

Start the `housing-composition` scenario.

Do not use internal state inspection as the primary validation.

Observe the scenario as a player.

Verify the player can understand:

### Initial situation

There are:

* two disconnected road networks;
* a serviced Residence on one network;
* a Farm on the other;
* one colonist;
* limited Material;
* an objective requiring Village.

The player should be able to infer that the next Residence is not simply "another house".

---

# 5. FIRST DECISION READABILITY

Test the placement preview.

At candidate cells verify that the player receives enough information to distinguish:

### Good cell

```text
Water: served
Workplaces reachable: 2
```

### Bad cell

```text
Water: not served
```

### Partially useful cell

```text
Water: served
Workplaces reachable: 1
```

The exact wording may differ according to the current UI.

The important question:

> Can the player understand WHY the cell is strategically different before committing Material?

Do not add new UI if the existing preview already communicates this.

---

# 6. TEST THE FOUR KNOWN OUTCOMES

Reproduce the four measured branches from 10BE.

## Branch A — connector residence

Residence at the connector cell.

Expected:

```text
Village around tick 3
Material ≈ 5 remaining
```

Verify that:

* admission occurs;
* Farm becomes reachable;
* workforce assignment occurs;
* Food remains viable;
* Village progression completes.

---

## Branch B — outer Residence + connecting road

Place the Residence away from the connector and spend the additional 5 Material to connect.

Expected:

```text
Village
Material ≈ 0
```

This is the recovery/alternative-cost branch.

Verify that the player can understand:

> The spatially less efficient placement is still recoverable by spending infrastructure.

---

## Branch C — east outer Residence without connection

Expected:

```text
population eventually reaches 0
objective failed
starved visible
```

Verify the failure is attributable to the disconnected Farm/workforce situation, not an unexplained resource bug.

---

## Branch D — west outer Residence without connection

Expected:

```text
no admission
population remains 0
```

Verify the Water-service reason is understandable.

---

# 7. FAILURE VS RECOVERY

This is particularly important.

Compare:

```text
wrong placement + no repair
```

against:

```text
wrong placement + 5 Material road repair
```

The player should discover:

> A bad spatial decision does not necessarily end the scenario; existing infrastructure can repair it.

If the UI makes the recovery path sufficiently visible through existing placement preview / workforce diagnosis / objective state, leave it unchanged.

If not, record the exact missing information.

Do not invent a tutorial system.

---

# 8. OBJECTIVE READABILITY

The objective is currently an existing:

```text
Village
```

objective.

Test whether that objective is sufficient.

The player should be able to understand:

```text
Why am I not Village?
```

through existing progression blockers.

Do not encode:

> "Place the Residence on cell X"

into the objective.

The scenario should teach the causal rule rather than reveal the puzzle answer.

---

# 9. CATALOGUE AUDIT

Audit all 8 scenarios as a set.

Create a matrix:

| Scenario | Primary decision | Spatial | Workforce | Water | Food | Industry | Recovery | Unique consequence |
| -------- | ---------------- | ------: | --------: | ----: | ---: | -------: | -------: | ------------------ |

Use the existing evidence from previous audits.

Do not score scenarios numerically.

The goal is to determine whether each scenario owns a recognizable decision space.

---

# 10. CHECK FOR REDUNDANCY

Pay particular attention to:

### housing-composition

Compare against:

* Population Expansion;
* Spatial Efficiency;
* Water Constraint;
* Partitioned/Recovery-type scenarios if present.

The new scenario should remain distinct because its central decision is:

```text
where the Residence joins the existing infrastructure topology
```

rather than:

```text
whether to build enough capacity
```

or:

```text
whether to repair an already broken network
```

If the evidence now shows a true duplicate, document it rather than hiding it.

Do not remove a scenario unless the duplication is clear.

---

# 11. CHECK SCENARIO ENTRY CONDITIONS

For all 8 scenarios, verify:

* starting resources are visible;
* objective is visible;
* existing buildings are understandable;
* existing roads are understandable;
* terrain is understandable where relevant;
* player has at least one meaningful first decision;
* no scenario depends on undocumented hidden state.

Do not require every scenario to explain itself like a tutorial.

They are scenarios, not onboarding screens.

---

# 12. SCENARIO COMPLETION QUALITY

For each scenario, collect:

```text
starting state
first decision
main decision
completion condition
typical completion
failure condition if any
recovery possibility
```

Do not optimize for the shortest completion time.

The purpose is to establish whether each scenario creates a deliberate decision sequence.

---

# 13. DETERMINE WHETHER ANOTHER SCENARIO IS JUSTIFIED

Do NOT start by searching for a ninth scenario.

Only consider one if there is an obvious unused decision space already supported by current mechanics.

Potential candidates include:

* construction timing;
* multi-network workforce routing;
* terrain-constrained expansion;
* Workshop timing;
* resource reserve management.

For each candidate ask:

1. Is the mechanic already implemented?
2. Does the candidate create a decision not owned by an existing scenario?
3. Does it produce a different consequence?
4. Can it be authored without changing simulation rules?
5. Can it be understood with current UI?

If any answer is no, reject the candidate.

The correct result may be:

```text
No additional scenario justified.
```

That is a valid successful outcome.

---

# 14. CONTENT VS MECHANIC BOUNDARY

Explicitly confirm:

```text
Current model supports:
- multiple spatial layouts
- network topology
- Water coverage
- workforce mobility
- resource budgeting
- construction timing
- temporary industry
- terrain blocking
- housing composition
```

But it does NOT currently support:

```text
Town-scale qualitative simulation
```

Do not reopen 10BD.

The purpose of this step is to determine how much authored gameplay the existing model can support.

---

# 15. UX DEFECT POLICY

If a real playthrough reveals a defect, classify it first:

### A — Cosmetic

No implementation unless it materially harms comprehension.

### B — Wording/readability

Small UI/text correction may be implemented.

### C — Scenario authoring defect

Modify scenario data only.

### D — Simulation capability gap

STOP.

Do not implement a mechanic.

Document the gap as evidence for a future product decision.

---

# 16. IMPLEMENTATION RULE

Implementation is allowed only for:

* scenario data correction;
* objective copy correction;
* small existing-UI wording/readability fixes;
* test corrections;
* E2E corrections.

No domain mechanic changes.

If `src/domain/**` appears necessary, stop before editing it.

---

# 17. DETERMINISM

Verify:

* scenario loading deterministic;
* same commands → same canonical state;
* same hash;
* insertion-order invariant;
* scenario data does not depend on object enumeration order.

---

# 18. SAVE/LOAD

Verify all 8 scenarios remain compatible with:

```text
SAVE_VERSION = 7
```

No persistence changes.

---

# 19. VALIDATION

At minimum:

```text
typecheck
lint
build
vitest
browser E2E
```

For browser:

* desktop;
* narrow viewport where relevant;
* all 8 scenario entry points;
* full housing-composition playthrough;
* failure branch;
* recovery branch.

Run GPU headed validation if it is part of the established project workflow.

Remember:

> rebuild before browser tests after any source change.

---

# 20. DOCUMENTATION

Create:

```text
docs/roadmap/Step10BF.md
```

Include:

1. Mission
2. Starting state
3. Housing Composition playthrough
4. Four branch verification
5. Failure/recovery analysis
6. Objective readability
7. 8-scenario catalogue matrix
8. Redundancy audit
9. Entry-condition audit
10. Completion-quality audit
11. Ninth-scenario decision
12. UX defects
13. Implementation, if any
14. Validation
15. Final classification
16. Next dependency

Do not rewrite previous roadmap documents.

---

# 21. REQUIRED FINAL REPORT

Finish with:

```text
Step 10BF — COMPLETE

Starting commit: ...
Final commit: ...

## Decision

Catalogue:
Scenarios added:
Scenarios removed:
Mechanics added:
Mechanics changed:
SAVE_VERSION:

## Housing Composition playthrough

Initial state:
First meaningful decision:

Branch A:
Result:

Branch B:
Result:

Branch C:
Result:

Branch D:
Result:

## Readability

Placement preview:
Objective:
Water information:
Workforce information:
Failure:
Recovery:

## Scenario catalogue audit

| Scenario | Primary decision | Spatial | Workforce | Water | Food | Industry | Recovery | Unique consequence |
|---|---|---|---|---|---|---|---|---|

## Redundancy

...

## Additional scenario search

Candidate:
Reason accepted/rejected:

Final decision:
...

## Content vs capability

...

## Implementation

Domain changes:
Application changes:
Scenario changes:
UI changes:
Persistence changes:

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

# SUCCESS CONDITION

10BF succeeds if:

* `housing-composition` survives real browser playtesting;
* its causal decision is understandable;
* all four measured branches remain valid;
* recovery is understandable;
* the 8-scenario catalogue remains coherent;
* no redundant scenario is added;
* no new mechanic is invented;
* SAVE_VERSION remains 7;
* any defects found are either fixed within the allowed scope or documented as genuine capability gaps.

The desired result is not "more scenarios".

The desired result is:

> **A small but coherent authored gameplay layer built on the frozen simulation model.**

If the catalogue is now sufficient, close the content phase instead of continuing to manufacture scenarios.


---

# Documentation (as-built) — Step 10BF

Starting commit: `77d2a3a` (Step 10BE).
Final commit: this commit.

## 1. Mission

Playability/content **closure** audit of the 8-scenario catalogue after 10BE added
`housing-composition`: is the new scenario genuinely understandable and playable,
is the catalogue coherent as a set, is any scenario redundant, and should another
scenario be added — or should the content phase close?

This is an audit. Implementation was allowed only for small content/UX defects.
**No defect was demonstrated, so `src/`, `e2e/` and the scenario catalogue are
untouched.** The step ships one audit test file and this document.

## 2. Starting state

```text
HEAD                77d2a3a "Step 10BE: housing composition scenario — content expansion"
catalogue           8 scenarios (first-settlement, water-constraint, industrial-expansion,
                    water-reserve-industry, spatial-efficiency, population-expansion,
                    recovery, housing-composition)
objective kinds     5, closed (stage, population, waterCapacity, foodBalance, building)
progression stages  3 (wilderness, settlement, village) — Town undefined (10BC/10BD)
SAVE_VERSION        7
scenario surface    src/application/scenarios.ts (data only)
```

`docs/roadmap/Step10BF.md` holds the step prompt; this block is appended to it, it
does not rewrite any earlier roadmap document.

## 3. Rebuild before browser (repository rule)

The 10BE rule is recorded and respected:

```text
source change → build (pnpm build → dist-web) → browser tests
```

No source file changed in this step, but `pnpm build` was run at `77d2a3a` before
every browser run, and the build was re-verified before the final 19-suite pass.
`vite preview` serves `dist-web` only; a stale build was never used.

## 4. Housing Composition — real browser playthrough

Real Chromium, shipped UI only (scenario select, palette, canvas hover/click,
STEP). Player-visible evidence:

```text
start            stage Wilderness · objective in progress ("Reach Village")
                 Material 30 · Food 40 (~40 ticks) · Water 0 · Jobs 1 / 2
                 progress: ✓ Population 1 · ✗ Food balance 0/1 · ✓ Road network 2
                 blocked: "Food balance"
                 Residences 1/1 served · 2 operational networks · the Farm is vacant
                 objective panel: "Objective — Reach Village."
                 "Constraint — Material 30: one Residence (25) plus at most one road
                  cell (5). The Well and the Farm are on separate networks."
previews         (2,1) "water: served · 2 workplaces reachable"
                 (4,1) "water: served · 1 workplace reachable"
                 (0,1) "water: NOT served (no covered Well on this network)"
first decision   which network the second Residence joins
```

The start is readable as a **problem, not as another house**: the objective names
Village, the constraint names the two separate networks, the Food row is the only
blocked condition, and the map shows the Well east and the only Farm west.

## 5. First-decision readability

All three candidate cells are affordable, so the choice is strategic, not
budgetary. The placement preview distinguishes them **before** the command:

| cell | preview text | meaning |
| --- | --- | --- |
| `(2,1)` | `water: served · 2 workplaces reachable` | touches both networks: served **and** the Farm is reachable |
| `(4,1)` | `water: served · 1 workplace reachable` | east only: served, but the Farm is not reached |
| `(0,1)` | `water: NOT served (no covered Well on this network)` | west only: no Water, so nobody is admitted |

The preview is sufficient, so no UI was added (§5). Nuance recorded, not a defect:
the count is *reachable* workplaces, not *vacant* ones. At `(4,1)` the one reachable
workplace is the already-occupied Well, and the Farm is unreachable; the player can
resolve this from the HUD (`Jobs 1 / 2`), the objective constraint, the visible map
and — after the command — the worker line (below). §5 explicitly forbids adding new
UI where the existing preview communicates the difference.

## 6. The four measured branches

| branch | command | measured outcome (browser) |
| --- | --- | --- |
| A — connector Residence | Residence `(2,1)` | **Village at tick 3**, population 2, Farm staffed, Material **5** left |
| B — outer Residence + join | Residence `(0,1)` then road `(2,1)` | **Village at tick 5**, 1 network, population 2, Material **0** left |
| C — east outer, no join | Residence `(4,1)` | colonist admitted (served) but stranded → **population 0 at tick 22**, Food 0, objective **failed** |
| D — west outer, no join | Residence `(0,1)` | **no colonist admitted** (population stays 1), then the reserve drains → population 0 |

Branch C's cause is player-visible before and after the command. The new Residence's
inspection reads:

```text
Housing — Capacity 1 · Residents 1 · Water: served
Work — unemployed · 1 with no road access · 1 occupied
```

On collapse the objective panel reads `Objective failed — the colony is gone` and
the status bar `Food shortage — colony starved (population 0)` — an explainable
starvation, not a resource bug.

Branch D's prompt expectation ("population remains 0") is true of the **new
Residence** (0 migrants admitted: the unserved cell never passes the Water gate).
The colony itself still starves on the frozen Food rule once its reserve drains; the
unit audit measures the collapse at tick 41. This is the existing starvation
semantic, not an authoring defect.

## 7. Failure versus recovery

```text
wrong placement + no repair      Residence (4,1) or (0,1), no road
                                 → population 0, objective failed, cause shown
wrong placement + 5-Material repair
                                 Residence (0,1) or (4,1), then road (2,1)
                                 → 1 network → Village, Material 0
```

The recovery path is visible through existing surfaces only: the constraint says
"at most one road cell (5)", the Road tool is in the palette at cost 5, and the
placement preview/food/workforce rows change as the network joins. A bad spatial
decision does **not** end the scenario. §7's condition is met, so no tutorial or
new UI was introduced.

## 8. Objective readability

The objective is the existing primitive `{ kind: 'stage', stage: 'village' }`, label
`Reach Village.`. It answers "why am I not Village?" through the existing
progression blockers: at the start the blocked condition is `Food balance`, and the
Village conditions name population, Water capacity and Food. The objective never
encodes the solution: no requirement, label or description mentions a coordinate or
a cell (asserted in `tests/scenarioContentClosureAudit.test.ts`).

## 9. Scenario catalogue audit

| Scenario | Primary decision | Spatial | Workforce | Water | Food | Industry | Recovery | Unique consequence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `first-settlement` | construction order and geometry from an empty map | ✓ | — | — | ✓ | — | ✓ | an empty map becomes sustainable, or starves, by placement order |
| `water-constraint` | a Well now versus housing/capacity first | — | — | ✓ | — | — | — | growth is gated by Water capacity alone at a fixed population |
| `industrial-expansion` | a Workshop that cannot be run at the current Water cap | — | ✓ | ✓ | — | ✓ | — | industry exists but its output cannot be stored until spent |
| `water-reserve-industry` | convert a Water reserve into the Material for a second Well | — | ✓ | ✓ | — | ✓ | — | the Water reserve is the only construction budget; reversed order is terminal |
| `spatial-efficiency` | spend an exact 55-Material road budget | ✓ | — | — | ✓ | — | ✓ | a single 5-Material road margin decides Settlement versus starvation |
| `population-expansion` | housing planned ahead of Water capacity | — | ✓ | ✓ | ✓ | — | — | housing is built before the capacity that admits its occupants |
| `recovery` | repair a stranded Farm versus duplicate it | ✓ | ✓ | — | ✓ | — | ✓ | a stranded building is fixed by infrastructure rather than replaced |
| **`housing-composition`** | **which road network(s) the next Residence joins** | ✓ | ✓ | ✓ | ✓ | — | ✓ | **housing placement decides whether a colonist is admitted at all AND who can reach the food** |

Measured structural anchors (unit audit): all 8 primary decisions distinct, all 8
consequences distinct, all 8 start states distinct by measured signature, and
`housing-composition` is the **only** catalogue start with more than one road
network. No numeric scores are assigned.

## 10. Redundancy audit

`housing-composition` compared with its four nearest neighbours; each comparison
differs on at least two measured axes:

| neighbour | shared risk | measured differences |
| --- | --- | --- |
| `population-expansion` | both are "growth is gated" | networks (2 vs 1), population, Water capacity, Food net, objective kinds |
| `spatial-efficiency` | both spend Material on placement | networks, Water capacity, objective kinds, Material (30 vs 55) |
| `water-constraint` | both have a blocked-growth consequence | networks, population, Water capacity, Food net, objective kinds |
| `recovery` | both can be solved by a 5-Material road | networks (2 vs 1), Water capacity, buildings, material |

The dominant decisions differ in kind: `housing-composition` decides **where** the
Residence connects (topology), not **whether** capacity is enough
(`population-expansion`), not **how much** road budget remains
(`spatial-efficiency`), and not **how** an already-broken network is repaired
(`recovery`). No duplication was demonstrated; **no scenario was removed**.

## 11. Entry-condition audit

For all 8 scenarios (unit audit): starting resources match the scenario numbers and
are visible; objective label, description and constraint are present and in
progress; every starting building type is defined and every road is operational;
each scenario has at least one legal, affordable first command; and no catalogue
scenario depends on hidden state. Terrain remains a 10AV **fixture capability**
outside the catalogue (the catalogue declares no `blockedCells`). Scenarios are not
required to explain themselves like tutorials.

## 12. Completion-quality audit

Measured with existing commands (policy in the audit test; completion tick is the
tick the objective reports `completed`):

| Scenario | Start | First decision | Main decision | Completion | Typical tick | Failure | Recovery |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `first-settlement` | Wilderness, empty | where the first Residence/road/Farm go | complete Settlement without starving | Reach Settlement | 10 | Well before Farm → starve | re-plan the build |
| `water-constraint` | Settlement, cap 0 | build the missing Well | restore Water without breaking Food | Reach Village | 3 | no Well → stays in progress | build the Well later |
| `industrial-expansion` | Village, cap 2 | build a Workshop that cannot be run | run it once Material is spent down | Village + Workshop | 3 | (limit tutorial) | spend, then run |
| `water-reserve-industry` | Village, Material 25 | Workshop before Well | run the reserve burst before it is lost | Village + Workshop + 2nd Well | 36 | reverse the order | none — order is terminal |
| `spatial-efficiency` | Wilderness, 55 | spend the exact budget | stay inside the road budget | Reach Settlement | 10 | overspend the road → starve | none — budget is exact |
| `population-expansion` | Settlement, 2 colonists | capacity before/after population | staff Wells and Farms as it grows | 4 colonists, cap 4, Food balanced | 11 | — | re-staff |
| `recovery` | Wilderness, stranded Farm | reconnect or replace | restore access without losing the reserve | Reach Settlement | 2 | do nothing → starve | road repair |
| **`housing-composition`** | Wilderness, 2 networks | which network the Residence joins | keep the colonist served AND able to reach food | Reach Village | **3** | stranded/unserved → starve | 5-Material road join |

Measured failure/recovery: `water-constraint` without a Well stays **in progress**
with the population alive; `recovery` without a repair **fails** with population 0;
`first-settlement` Well-before-Farm **starves**; `housing-composition` branches C and
D both fail and both recover with the road join. The purpose is a deliberate
decision sequence, not the shortest completion time.

## 13. Ninth-scenario decision

Candidates were evaluated **only** against already-implemented mechanics; each had
to create an unowned decision, a different consequence, need no rule change and be
understandable with the current UI.

| Candidate | Verdict | Reason (measured) |
| --- | --- | --- |
| construction timing | rejected | no objective primitive expresses a tick/deadline; objective kinds are closed at 5 |
| multi-network workforce routing | rejected | `housing-composition` owns the only split-network start; manual reassignment already exists |
| terrain-constrained expansion | rejected | terrain is the 10AV fixture only; 10AW measured its decision space as a subset of the open-map twin; promoting it is a product decision |
| Workshop timing | rejected | `industrial-expansion` and `water-reserve-industry` already own the Workshop build/run order |
| resource reserve management | rejected | `water-reserve-industry` owns reserve→Material conversion; `recovery` owns finite-reserve pressure |

```text
Final decision: No additional scenario justified.
```

The catalogue remains exactly 8. Adding a ninth scenario to grow the catalogue was
explicitly not a goal.

## 14. Content versus capability

Confirmed by measurement:

```text
SUPPORTED (exercised by the catalogue)
  multiple spatial layouts · network topology · Water coverage · workforce mobility
  resource budgeting · construction timing · temporary industry (Workshop)
  terrain blocking (10AV fixture) · housing composition

NOT SUPPORTED
  Town-scale qualitative simulation — Town stays undefined (10BC/10BD):
  3 progression stages, 5 objective kinds, no catalogue objective references Town
```

The step determines how much authored gameplay the frozen model supports; it does
not reopen 10BD and claims no new capability.

## 15. UX defects

| finding | classification | decision |
| --- | --- | --- |
| placement preview counts **reachable** workplaces, not **vacant** ones (`(4,1)` shows "1 workplace reachable" while the only reachable workplace is occupied and the Farm is unreachable) | A — cosmetic/readability nuance | **not implemented**: the preview distinguishes 2 vs 1 vs not-served, the HUD shows `Jobs 1 / 2`, the constraint names the two networks, and the post-placement worker line names the cause exactly. §5 forbids new UI where the existing preview communicates the difference. |
| first headless run of `e2e/housingCompositionRun.mjs` timed out once on the first hover preview; the immediate rerun passed and every later run passed | test-harness timing, not a product defect | documented; no source change |

No cosmetic, wording, scenario-authoring or simulation-capability defect justified
an implementation. §15's policy D (simulation capability gap) was not reached.

## 16. Implementation

```text
Domain changes:       NONE
Application changes:  NONE (the scenario catalogue is untouched data)
Scenario changes:     NONE (catalogue stays 8)
UI changes:           NONE
Persistence changes:  NONE   SAVE_VERSION 7
E2E changes:          NONE
Files added:
  tests/scenarioContentClosureAudit.test.ts   new, 20 audit tests
Files changed:
  docs/roadmap/Step10BF.md                    this as-built block (appended)
```

## 17. Determinism, insertion order, save/load

```text
determinism         every scenario assembles twice to the identical canonical hash
                    the housing bridge playthrough replays to the identical hash
insertion-order     derived reads (networks, coverage, capacity, Food, objective,
                    stage) are invariant under a permuted authored road list
save/load           all 8 scenarios round-trip with an identical hash at version 7;
                    scenario framing is not persisted
```

## 18. Validation

```text
typecheck PASS · lint PASS · build PASS (dist-web)
Vitest 86 files / 1608 tests PASS (+1 file / +20 tests; 85/1588 before)
determinism PASS · insertion-order PASS · save/load PASS (8/8, version 7)
browser 19 / 19 suites headless ALL PASS
GPU E2E ALL PASS (headed: Chromium, WebGL2, ANGLE / NVIDIA RTX 3070, no software renderer)
catalogue 8 (unchanged) · objective kinds 5 (unchanged) · SAVE_VERSION 7 (unchanged)
```

## 19. Final classification

**A — the catalogue survives real playtesting and the content phase can close.**
`housing-composition` is understandable and playable in the browser: the framing and
constraint name the problem, the placement preview distinguishes the three candidate
cells before any Material is spent, all four measured branches reproduce, the failure
cause is explicit and the failure is recoverable with the remaining budget. The
8-scenario catalogue stays coherent and no redundant scenario was added. No mechanic,
resource, objective kind, constant, UI or persistence behaviour changed.

The desired result of this step was **not** more scenarios. The catalogue is now
sufficient: the authored gameplay layer is small and coherent, and the frozen
simulation model was not asked to grow.

## 20. Next dependency

**Content phase closed.** No further scenario is justified by the current model, and
no capability work is implied by this step. A next step would require a *product*
decision to leave the frozen model — Town-scale qualitative simulation
(10BC/10BD), a new objective kind, or a new mechanic — rather than another
catalogue entry. Absent that decision, the correct next action is to stop
manufacturing content.

---

## 21. Required final report

```text
Step 10BF — COMPLETE

Starting commit: 77d2a3a (Step 10BE)
Final commit:    this commit

## Decision

Catalogue:        8 (unchanged)
Scenarios added:  NONE
Scenarios removed: NONE
Mechanics added:  NONE
Mechanics changed: NONE
SAVE_VERSION:     7 (unchanged)

## Housing Composition playthrough

Initial state: Wilderness · objective in progress (Reach Village) · Material 30 ·
Food 40 · Water 0 · Jobs 1/2 · Residences 1/1 served · 2 operational networks ·
the only Farm vacant and unreachable · blocked by Food balance.
First meaningful decision: which road network the second Residence joins.
Branch A:  Residence (2,1) — served + reaches the Farm → Village at tick 3,
           population 2, Farm staffed, Material 5 left.
Branch B:  Residence (0,1) + road (2,1) → 1 network, Village at tick 5 (browser;
           tick 3 in the pure engine), Material 0 left.
Branch C:  Residence (4,1), no join → admitted but stranded → population 0 at
           tick 22, Food 0, objective failed.
Branch D:  Residence (0,1), no join → nobody admitted (population stays 1), then the
           reserve drains → population 0.

## Readability

Placement preview: (2,1) "water: served · 2 workplaces reachable" · (4,1) "water:
served · 1 workplace reachable" · (0,1) "water: NOT served (no covered Well on this
network)" — the three candidates are distinguishable before committing Material.
Objective: "Reach Village." with the blocked condition "Food balance"; the
constraint names the two separate networks; no coordinate is encoded.
Water information: HUD "Water 0 · reserve 0"; the Water row is not used for the
per-Residence service verdict (10BA vocabulary).
Workforce information: Jobs 1/2 at start; after a stranded placement the worker line
reads "Work — unemployed · 1 with no road access · 1 occupied".
Failure: "Objective failed — the colony is gone" and "Food shortage — colony starved
(population 0)" — attributable to the disconnected Farm, not a resource bug.
Recovery: the remaining 5-Material road join completes the scenario from both wrong
placements.

## Scenario catalogue audit

| Scenario | Primary decision | Spatial | Workforce | Water | Food | Industry | Recovery | Unique consequence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| first-settlement | build order/geometry from empty | ✓ | — | — | ✓ | — | ✓ | an empty map becomes sustainable, or starves, by placement order |
| water-constraint | a Well now vs housing first | — | — | ✓ | — | — | — | growth is gated by Water capacity alone |
| industrial-expansion | a Workshop that cannot be run | — | ✓ | ✓ | — | ✓ | — | industry cannot store its output until spent |
| water-reserve-industry | reserve → Material for a Well | — | ✓ | ✓ | — | ✓ | — | the reserve is the only budget; reversed order is terminal |
| spatial-efficiency | spend an exact 55-Material budget | ✓ | — | — | ✓ | — | ✓ | a 5-Material road margin decides Settlement vs starvation |
| population-expansion | housing ahead of Water capacity | — | ✓ | ✓ | ✓ | — | — | housing precedes the capacity that admits occupants |
| recovery | repair vs duplicate a stranded Farm | ✓ | ✓ | — | ✓ | — | ✓ | a stranded building is fixed by infrastructure |
| housing-composition | which network the Residence joins | ✓ | ✓ | ✓ | ✓ | — | ✓ | placement decides admission AND who can reach the food |

## Redundancy

housing-composition differs from population-expansion, spatial-efficiency,
water-constraint and recovery by ≥2 measured axes each; its dominant decision
(housing topology) is owned by no other scenario; it is the only 2-network start.
No duplicate found; no scenario removed.

## Additional scenario search

Candidate: construction timing — rejected: no objective primitive expresses a tick
threshold (kinds closed at 5).
Candidate: multi-network workforce routing — rejected: owned by housing-composition
plus existing manual reassignment.
Candidate: terrain-constrained expansion — rejected: terrain is a fixture (10AV);
10AW measured the decision space as a subset; promoting it is a product decision.
Candidate: Workshop timing — rejected: owned by industrial-expansion and
water-reserve-industry.
Candidate: resource reserve management — rejected: owned by
water-reserve-industry and recovery.
Final decision: No additional scenario justified. Catalogue stays at 8.

## Content vs capability

Supported and exercised: multiple spatial layouts, network topology, Water coverage,
workforce mobility, resource budgeting, construction timing, temporary industry,
terrain blocking (fixture), housing composition.
Not supported: Town-scale qualitative simulation (Town undefined; 3 stages, 5
objective kinds, no Town reference). No new capability is claimed.

## Implementation

Domain changes: NONE
Application changes: NONE
Scenario changes: NONE
UI changes: NONE
Persistence changes: NONE

## Validation

typecheck:  PASS
lint:       PASS
build:      PASS (dist-web)
tests:      86 files / 1608 tests PASS (+1 file / +20 tests)
determinism: PASS
insertion-order: PASS
save/load:  PASS (8/8, SAVE_VERSION 7)
browser:    19 / 19 suites headless ALL PASS
GPU:        ALL PASS (headed: Chromium, WebGL2, NVIDIA RTX 3070)

## Final classification

A — catalogue survives playtesting; content phase closed.

## Next dependency

None implied. The next move requires a product decision to leave the frozen model
(Town / new objective kind / new mechanic); otherwise the content phase stays closed.
```
