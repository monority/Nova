# Step 10AT — Content & Readability Closure Audit

## CONTEXTE

Starting commit: `ed1b446` — Step 10AS complete.

The current economy is now considered frozen and healthy:

* Farm: 2 Food/tick
* Well: 2 Water/tick
* Workshop: 2 Material/tick gross
* Workshop upkeep: 1 Material/tick
* Food: 1/colonist/tick
* Water: 1/colonist/tick
* Residence capacity: 1
* Residence/Farm/Well: 25 Material
* Workshop: 25 Material + 1 Water
* Road: 5 Material
* Construction: 2 ticks / 1 with Construction Crew
* Workshop storage: 25 Material
* Initial Material: 100
* Initial Food: 100
* Initial Water: 0
* SAVE_VERSION: 7

The current scenario catalogue contains 7 scenarios.

The current progression contract supports:

* Wilderness
* Settlement
* Village

Town and later stages remain deferred.

The important finding from 10AS is that the opening economy already produces multiple meaningful trajectories from the same initial stock:

* viable but stagnant Settlement,
* starvation depending on construction order,
* Village through the industrial bootstrap.

No economic tuning is currently justified.

This step is therefore a **phase-boundary audit**, not a new mechanics step.

---

# PRIMARY QUESTION

Is the current implemented game loop sufficiently:

* readable,
* coherent,
* discoverable,
* scenario-differentiated,
* internally consistent,
* and visually understandable

that the frozen simulation can now serve as a stable foundation for future expansion?

Do not add new mechanics unless the audit demonstrates a concrete missing capability that cannot be solved by existing UI/content.

---

# STEP 1 — AUDIT THE COMPLETE SCENARIO CATALOGUE

Audit all 7 scenarios as they exist in the current implementation:

1. First settlement
2. Water constraint
3. Spatial efficiency
4. Population expansion
5. Industrial expansion
6. Recovery
7. Water-reserve-industry

For each scenario record:

* starting state,
* objective,
* first meaningful decision,
* principal bottleneck,
* expected player action,
* failure mode,
* recovery path,
* completion state,
* completion time where deterministic,
* distinctness from the other scenarios.

Do not judge them by their names.

Judge them by actual state transitions.

---

# STEP 2 — SCENARIO DISTINCTNESS MATRIX

Build a factual matrix across the 7 scenarios.

Columns:

* first decision
* Material bottleneck
* Food bottleneck
* Water capacity
* Water reserve
* workforce mobility
* construction order
* spatial layout
* failure mode
* recovery
* objective interpretation
* temporal pressure

Mark whether each scenario actually exercises that axis.

Then identify:

* genuinely distinct scenarios,
* scenarios sharing the same causal decision,
* scenarios that differ mainly through initial state,
* scenarios whose differences are primarily framing.

Do not remove scenarios automatically.

The purpose is to understand the current content topology.

---

# STEP 3 — OBJECTIVE READABILITY AUDIT

For every scenario, verify that a player can answer from the UI:

1. What am I trying to achieve?
2. What is currently blocking me?
3. What resource is constraining me?
4. What action can change the state?
5. Am I progressing?
6. Have I completed the objective?
7. If I fail, is the failure understandable?
8. If recovery is possible, is the recovery path observable?

Use the actual browser UI.

Do not infer readability from test IDs or implementation details.

---

# STEP 4 — PROGRESSION READABILITY

Audit:

**Wilderness → Settlement → Village**

Verify that the progression panel correctly communicates:

### Wilderness

Why the colony has not settled.

### Settlement

What is currently missing to reach Village.

### Village

What has actually been achieved and what the system currently considers the next stage.

Because Town is intentionally undefined, do not fabricate a Town placeholder condition.

The UI must distinguish:

* a defined next stage,
* a blocked defined stage,
* an undefined future stage.

---

# STEP 5 — RESOURCE SEMANTICS AUDIT

Recheck the resource information after 10AR.

For Material verify:

* current stock,
* Workshop storage,
* storage cap,
* production,
* upkeep,
* construction affordability.

For Water verify the distinctions introduced in 10AR:

* capacity,
* balance,
* stock/reserve,
* service,
* draining,
* shortage,
* no reserve.

For Food verify:

* current stock,
* production,
* consumption,
* deficit,
* recovery/failure.

Look specifically for labels where:

> a stock state is described as a production/capacity state,

or where:

> a production/capacity state is described as a stock state.

Fix only concrete wording/query inconsistencies.

Do not add new mechanics.

---

# STEP 6 — INDUSTRIAL UI AUDIT

Inspect both:

### Industrial Expansion

and

### Water-reserve-industry

Verify that the player can understand the difference between:

* having Material,
* having Workshop storage,
* producing Material,
* spending Water to run the Workshop,
* temporarily draining Water,
* recovering Water,
* completing the industrial objective.

The 25 Material Workshop storage cap must be visible wherever the existing UI makes industrial production understandable.

Do not add charts or complex dashboards.

Use the existing visual language.

---

# STEP 7 — OPENING ECONOMY DISCOVERABILITY

Audit the default 100-Material opening in the browser.

The player should be able to discover, through normal interaction:

* construction costs,
* road cost,
* resource consequences,
* Water requirements,
* workforce requirements,
* the existence of the 5-Material opening gap,
* the fact that order matters.

Do not reveal the optimal solution as a tutorial.

The goal is **legibility**, not removing the puzzle.

If something is genuinely invisible, add the smallest existing-style hint/label/inspection value necessary.

Do not create a tutorial system.

---

# STEP 8 — FAILURE AND RECOVERY READABILITY

Audit the existing failure states.

At minimum inspect:

* Food collapse,
* Water shortage,
* inaccessible workforce,
* stalled construction,
* Water-reserve industrial depletion,
* recoverable vs terminal states.

For each determine whether the UI communicates:

* what happened,
* why it happened,
* whether the state can recover,
* what existing action can restore the missing capability.

Do not change failure mechanics.

---

# STEP 9 — BROWSER VISUAL AUDIT

Perform a real browser audit, not only automated assertions.

Check:

* HUD hierarchy,
* resource readability,
* progression panel,
* objective panel,
* scenario presentation,
* construction feedback,
* building inspection,
* colonist reassignment,
* Water status,
* Material storage cap,
* mobile/responsive behavior if applicable,
* no clipping/overlap,
* no misleading stale values,
* no contradictory labels.

Use headed browser validation.

If GPU/browser validation is available in the project workflow, run it.

Record screenshots or other evidence only where the project workflow already supports them.

---

# STEP 10 — DETERMINE WHETHER CONTENT PHASE IS CLOSED

Classify the current state:

### A — CLOSED

The simulation, scenarios, objectives and UI are coherent enough that further work should move to a new product capability.

### B — MINOR REFINEMENT

One or more concrete readability/content issues remain, but no new mechanic is required.

### C — CONTENT GAP

The existing rules are sound, but the scenario catalogue lacks meaningful content that cannot be created by reframing existing states.

### D — SYSTEM GAP

A missing causal capability is required before the game can progress beyond the current phase.

If D, identify the minimum missing capability.

Do not implement it automatically.

---

# STEP 11 — ARCHITECTURAL CHECKPOINT

Audit the architecture before the next phase.

Verify:

* domain remains deterministic,
* application queries remain pure,
* scenarios remain declarative,
* objectives remain data/query driven,
* derived state is not persisted,
* SAVE_VERSION remains 7,
* insertion-order invariance remains true,
* no scenario contains hidden mechanics,
* no scenario bypasses normal simulation rules.

If the architecture is clean, explicitly freeze it as a baseline.

Do not refactor merely for aesthetic reasons.

---

# STEP 12 — NEXT-PHASE OPTIONS

Based on evidence, identify which of these is actually justified:

### Option A — More content using existing mechanics

Only if measurable scenario/content gaps remain.

### Option B — Terrain / obstacles

Only if spatial differentiation is now genuinely the limiting factor and the evidence from Partitioned Valley supports it.

Do not implement terrain in this step.

### Option C — New economic capability

Only if the audit identifies a concrete missing causal relationship.

### Option D — Presentation refinement

If the simulation is sufficient but the player cannot currently understand its causal state.

### Option E — Phase freeze

If the current simulation is coherent and no evidence justifies additional work.

Choose based on evidence, not roadmap momentum.

---

# IMPLEMENTATION RULE

Only implement fixes discovered by this audit.

Allowed:

* labels,
* inspection text,
* existing scenario copy,
* objective descriptions,
* existing derived query exposure,
* existing UI presentation,
* test coverage.

Not allowed:

* economic tuning,
* new buildings,
* new resources,
* new mechanics,
* terrain,
* obstacles,
* logistics,
* pollution,
* adjacency,
* density,
* service radius,
* new objective types,
* new persistence,
* Town implementation.

---

# REQUIRED VALIDATION

Run:

* full Vitest
* typecheck
* lint
* build
* determinism
* insertion-order
* save/load
* browser E2E
* headed browser audit
* GPU validation

Existing regressions from 10AQ/10AR must remain covered:

* Well reassignment appears in UI and command validation.
* Water semantics distinguish reserve depletion from true shortage.
* Material storage cap is visible.
* Industrial objectives complete correctly.
* SAVE_VERSION remains 7.

---

# FINAL REPORT

Return exactly:

```text
STEP 10AT — FINAL REPORT

Starting commit:
Final commit:

SCENARIO CATALOGUE
- Scenarios audited:
- Distinct causal spaces:
- Overlaps:
- Weak/ambiguous scenarios:

OBJECTIVE READABILITY
- Questions answerable:
- Issues found:
- Fixes:

PROGRESSION READABILITY
- Wilderness:
- Settlement:
- Village:
- Town:
- Issues:
- Fixes:

RESOURCE SEMANTICS
- Material:
- Food:
- Water:
- Issues:
- Fixes:

INDUSTRIAL READABILITY
- Industrial Expansion:
- Water-reserve-industry:
- Issues:
- Fixes:

OPENING DISCOVERABILITY
- 100 Material opening:
- Order pressure:
- Cost visibility:
- Issues:
- Fixes:

FAILURE / RECOVERY
- Food:
- Water:
- Workforce:
- Construction:
- Industry:
- Issues:
- Fixes:

BROWSER AUDIT
- Desktop:
- Responsive:
- Headed:
- GPU:
- Visual issues:

ARCHITECTURE
- Domain:
- Application:
- Scenarios:
- Objectives:
- Persistence:
- SAVE_VERSION:
- Determinism:
- Insertion-order:

PHASE CLASSIFICATION
- A/B/C/D:
- Evidence:

IMPLEMENTATION
- Files:
- Domain changes:
- Economic changes:
- Persistence:
- SAVE_VERSION:

VALIDATION
- Tests:
- Typecheck:
- Lint:
- Build:
- Determinism:
- Insertion-order:
- Save/load:
- Browser:
- GPU:

NEXT-PHASE OPTIONS
- Existing-mechanics content:
- Terrain/obstacles:
- New economic capability:
- Presentation refinement:
- Phase freeze:

NEXT DEPENDENCY:
```

## HARD CONSTRAINTS

Do NOT:

* tune the economy,
* change production/consumption,
* implement Town,
* implement terrain,
* add obstacles,
* add logistics,
* add new resources/buildings,
* add new objective types,
* add persistence,
* invent tutorials,
* reveal an optimal opening,
* create scenario-specific mechanics,
* reopen already-closed audits without a concrete regression.

The central question is:

> **Is the current 2/2 simulation + 7 scenarios + Wilderness/Settlement/Village progression a coherent product foundation, or is there a concrete readability/content/system gap that must be addressed before freezing this phase?**

Use the browser and measured simulation state as the final authority.

```

Après **10AT**, je ne pousserais plus automatiquement vers un `10AU` de plus. Si le rapport sort **A — CLOSED**, ce sera un vrai point de bascule : on pourra alors choisir consciemment entre **nouvelle capacité spatiale (terrain/obstacles)**, autre capacité causale, ou consolidation visuelle, au lieu de continuer les audits économiques indéfiniment.
```


---

# Documentation (as-built) — Step 10AT

Starting commit: `ed1b446` (Step 10AS).
Final commit: this commit.

**Outcome: `A — CLOSED`.** The simulation, the 7 scenarios, the objectives and the
UI are coherent enough to freeze this phase as the product foundation. Three
concrete **readability** defects were found by the real-browser audit and fixed
inside this step (before the fixes the honest classification was B — minor
refinement). Two of them were presentation-geometry defects as well. **No
economic value, domain rule, objective kind, scenario resource or persisted field
changed; `SAVE_VERSION` stays 7.**

---

## 1. MEASURED — the catalogue, by state transition

Every scenario was started and driven to its objective with real
`placeBuilding` / `placeRoads` / `reassignColonist` commands.

| scenario | starting state (stage, pop, Material, Food, Water, capacity, buildings/roads) | requirements | completed at | finishing state |
| --- | --- | --- | --- | --- |
| First settlement | wilderness, 0, 100, 100, 0, cap 0, 0/0 | stage | tick 10 | settlement, pop 1 |
| Water constraint | settlement, 2, 100, 50, 0, cap 0, 3/3 | stage | tick 3 | village, pop 2 |
| Industrial expansion | village, 2, 100, 50, 10, cap 2, 4/3 | stage + building | tick 3 | village, pop 2 |
| Water reserve industry | village, 2, **25**, 50, **51**, cap 2, 4/4 | stage + building + building | tick 36 | village, pop 2 |
| Spatial efficiency | wilderness, 0, **55**, 100, 0, cap 0, 0/0 | stage | tick 10 | settlement, pop 1 |
| Population expansion | settlement, 2, 100, 100, 0, cap 0, 5/7 | population + waterCapacity + foodBalance | tick 11 | village, pop 4 |
| Recovery | wilderness, 1, 30, **30**, 0, cap 0, 2/1 | stage | tick 2 | settlement, pop 1 |

Measured failure modes (wrong play, same commands only):

| scenario | wrong play | measured outcome |
| --- | --- | --- |
| Recovery | do nothing | **population 0 at tick 31**, objective `failed` |
| First settlement | Well before Farm | **population 0 at tick 104**, objective stays `in_progress` (that scenario starts empty — see §8) |
| Water constraint | never build a Well | pop 2, objective `in_progress` forever (growth blocked, nobody dies) |

## 2. MEASURED — distinctness matrix

The axes the audit checked: first decision · Material bottleneck · Food
bottleneck · Water capacity · Water reserve · workforce mobility · construction
order · spatial layout · failure mode · recovery · objective interpretation ·
temporal pressure.

| scenario | axes exercised (from the measured state) | class |
| --- | --- | --- |
| First settlement | Material (100), construction order, geometry, failure (starvation) | genuinely distinct |
| Water constraint | Water **capacity**, existing population, housing-vs-Water timing | genuinely distinct |
| Spatial efficiency | Material **exactly 55**, road budget, geometry, failure | genuinely distinct |
| Population expansion | housing ahead of capacity (3 requirements), Food balance, growth timing | genuinely distinct |
| Industrial expansion | the 25-per-Workshop **storage** cap above the stock, a Workshop that cannot be run | limit tutorial (B/10AM) |
| Recovery | Food deficit, road repair vs replacement, a recoverable opening | distinct consequence, overlapping decision shape (B/10AM) |
| Water reserve industry | **Water reserve → Material conversion**, terminal build order, Material 25 | genuinely distinct |

Overlaps recorded (not defects): Recovery and Water reserve industry both offer a
"connect / duplicate" construction; Population expansion and Water reserve
industry both build a second Well (only the latter must *manufacture* it);
Industrial expansion and Water reserve industry both place a Workshop (only the
latter runs it as the objective); First settlement and Spatial efficiency share
the objective "reach Settlement" and differ by the Material budget;
Industrial expansion vs Water reserve industry differ mostly through the initial
stock (100/10 vs 25/51).

## 3. MEASURED — objective readability (real browser)

`e2e/readabilityAudit.mjs` (new suite, registered as `pnpm test:e2e:readability`)
loads all 7 scenarios and reads the rendered text. For every scenario the player
can answer the eight questions from the visible UI:

| question | visible source (rendered) | measured |
| --- | --- | --- |
| 1 what am I trying to achieve? | `Objective — <label>` | non-empty for all 7 |
| 2 what is blocking me? | `Objective in progress — n / m (blockers)` + `Blocked by — …` | non-empty for all 7 |
| 3 what resource constrains me? | `Constraint — …` + the Material/Food/Water rows | non-empty for all 7 |
| 4 what action changes the state? | the palette (every button shows its cost) + the checklist conditions | `Residence · 25 / Farm · 25 / Workshop · 25 / Well · 25 / Road · 5` |
| 5 am I progressing? | the ✓/✗ checklist + the `n / m` counter | present for all 7 |
| 6 have I completed it? | `Objective complete` | reached by all 7 in the browser flows |
| 7 if I fail, is it understandable? | `Objective failed — the colony is gone` + the Food row | measured on Recovery |
| 8 is recovery observable? | the unmet condition flips to ✓ (e.g. `✗ Water capacity 2` → `✓`) | measured on Water constraint → Village |

Issue found and fixed: the checklist and the objective can show two different
Water thresholds side by side (Village needs capacity 2, Population expansion's
objective needs capacity 4). They are labelled distinctly
(`Water capacity 2` vs the objective's `Water capacity 4`), so this is recorded
as **not a defect** — no change.

## 4. MEASURED — progression readability

| stage | rendered | measured contract |
| --- | --- | --- |
| Wilderness | `Stage: Wilderness`, `Next: Settlement`, three ✗ conditions + `Blocked by — …` | `nextStage: settlement`, 3 unmet conditions |
| Settlement | `Stage: Settlement`, `Next: Village`, `✗ Water capacity 2` + blocked line | `nextStage: village`, 1 unmet condition |
| Village | `Stage: Village`, `Next: not yet defined (this is the current final stage)`, checklist all ✓, blocked line empty | `nextStage: null`, `deferred: true`, 0 unmet conditions, no Town condition fabricated |

**Fixed**: the undefined future stage used to read only `not yet defined`, which
is indistinguishable from "the game forgot to define it". It now names the
situation (Village is the current final stage) while still inventing no Town
condition.

## 5. MEASURED — resource semantics

**Material** (all five concepts separated, verified against the queries the UI
renders): stock 100 → 75 after the Workshop; storage capacity 0 → 25; production
0 → 2 when staffed; stored production 0 → 2 below the cap and **0 above it**;
upkeep 0 → 1; net 0 → 1; construction affordability from the shared predicate.

**Water** (the 10AR contract, unchanged): `inactive` (no operational Well, 4
scenarios), `supplied` (capacity ≥ need with a reserve, both industrial
scenarios), `noService`, `noReserve`, `draining`, `shortage` all reachable and
covered by `waterRun` / `industrialRun`.

**Food**: stock 30 with production 0 and consumption 1 → `~30 ticks` and
`sustainable: false`; stock 50 with production 2 = consumption 2 →
`sustainable` and no forecast; collapse → population 0.

**Issues found and fixed**

1. **The Workshop inspection did not speak the language the other producers
   use.** The Farm said `Food production — producing +2/tick (staffed)`, the Well
   said `Water production — …`, and the Workshop said only
   `Jobs — Capacity 1 · Workers 0/1 · upkeep 0 (vacant)` — no production, no
   storage. It now reads
   `Material production — vacant, producing +0/tick · jobs 0/1 · upkeep 0 (vacant) · storage 25`
   or `Material production — producing +2/tick (staffed) · jobs 1/1 · upkeep 1/tick · storage 25`
   (and `Material production — not operational yet · jobs 0/0` under
   construction), so stock, storage, production and upkeep are separable at a
   glance — the 10AS "storage 25 · full" HUD suffix and this line now agree.
2. **A food collapse was a one-frame message.** The Food row showed `0` and the
   next tick's status message overwrote "colony starved". It now keeps
   ` · starved` (the existing UI flag) so the failure state persists, matching
   the Water and Material rows naming their own states.

## 6. MEASURED — industrial readability

| | Industrial expansion | Water reserve industry |
| --- | --- | --- |
| Material / Water | 100 / 10 | 25 / 51 |
| storage before the Workshop | 0 (none exists) | 0 |
| Workshop affordable at tick 0 | yes (25 + 1 Water) | yes |
| objective | Village + Workshop (2 requirements) | Village + Workshop + second Well (3) |
| what the Workshop can add | **nothing** (the stock is 4× the 25 cap: gross 2, stored 0) | **the next building** (the stock fits under the cap) |
| Water row at start | `10 · served` | `51 · served` |
| the industrial lesson | the storage cap bounds industry until the stores are spent | the reserve is the only construction budget |

The 25-per-Workshop storage cap is now visible in three places that already
existed: the HUD Material suffix (10AS), the Workshop inspection line (this step)
and the objective constraint text (10AS). No charts, no dashboard.

## 7. MEASURED — opening discoverability

| what the player must discover | how it is discoverable | measured |
| --- | --- | --- |
| construction costs | every palette button is labelled with its Material cost | `Residence · 25`, `Farm · 25`, `Workshop · 25`, `Well · 25`, `Road · 5` |
| the Workshop's extra Water | the button label plus the hover refusal | `requires 1 water` on refusal, cost 1 |
| resource consequences | the HUD rows (stock, storage, Food forecast, Water state) | all four rows carry a state label |
| workforce requirements | `Jobs: n / capacity` + the inspector's worker line | `Jobs: 0 / 1` visible from the start |
| the 5-Material gap | the hover text at the fifth purchase | `insufficient material (20/25)` and `(0/5)` measured in the browser |
| that order matters | the measured outcomes themselves (10AS) | no tutorial added |

**No tutorial and no hint text was added**: the puzzle stays a puzzle, the
information needed to reason about it is visible, and the optimal opening is not
revealed.

## 8. MEASURED — failure and recovery

| state | what happened | why (visible) | terminal? | recovery (visible) |
| --- | --- | --- | --- | --- |
| Food collapse | `Objective failed — the colony is gone`, Food `0 · starved`, `Colonists: 0` | the status line named the shortage; the Food row now keeps the state | terminal (no producers and no re-admission) | none — measured by running it |
| Water shortage | Water row ` · shortage` / ` · reserve 0` | `No water service — population cannot grow`, or the burst's `draining` → `shortage` | no (nobody dies) | staff/connect a Well (the checklist flips to ✓) |
| Inaccessible workforce | `Jobs: 0 / 1` with `Colonists: 1` | the inspector lists every reassignment target with an eligibility reason (`not connected`, `occupied`, `not operational`) | no | a road cell or a reassignment |
| Stalled construction | the hover refuses with the exact shortfall | `insufficient material (20/25)` (+ `insufficientResources`) | no | manufacture Material (10AS bootstrap) |
| Industrial water depletion | `draining` then `shortage` | the Water row + the Workshop line's upkeep | no | return the worker: the state becomes `noReserve` |

**Recorded, not fixed** (would need history, which is forbidden): a scenario that
*starts empty* (`failsWithoutColonists: false`) cannot report its objective as
failed after a later collapse, because the momentary contract cannot tell "died"
from "not started yet". The state is still visible (`Colonists: 0`, Food
` · starved`); the objective honestly stays `in_progress`. This is the 10AN
trade-off, unchanged.

## 9. BROWSER VISUAL AUDIT

Performed with the real browser, headless **and headed**, plus GPU:

* **Desktop 1280×800**: panel 398 px wide, the board's cells stay clear of it,
  no clipping, no overlap; HUD hierarchy (title → inspection → controls →
  palette → scenario → progression → stats → status) is readable; every row
  carries its own state label; no stale values across scenario loads; zero
  console/page errors.
* **420×740**: no horizontal overflow, panel 398 px, everything visible.
* **360×640**: no horizontal overflow; the palette wraps to two rows (acceptable)
  and the panel content is taller than the window — **fixed** by making the
  overlay scroll (`max-height: calc(100vh - 32px)`, `overflow-y: auto`,
  `box-sizing: border-box`) instead of running past the viewport.
* **Presentation-geometry defect found and fixed**: with a long inspection line
  the overlay widened from 398 px to past 422 px and *covered the board's
  top-left cells*, which are real click targets (the `road` suite's diagonal-drag
  check caught it by dragging from cell (0,0)). `#selected-building` is now
  capped at 320 px like the other text blocks, so the overlay can no longer grow
  over the board.
* **Recorded, not fixed**: at 360 px width the overlay covers the board
  completely (the game is desktop-first; no mobile requirement exists), and the
  overlay's right edge is ~8 px from the board's first cell centre at 1280 px
  (the cell remains clickable).
* **GPU**: `GPU E2E` PASS in headed mode with a hardware renderer.

Screenshots: `artifacts/readability/01-default-opening.png`,
`02-scenario-panels.png`, `03-village-panel.png`, `04-inspections.png`,
`05-failure.png`, `06-responsive-{1280,420,360}.png`.

## 10. PHASE CLASSIFICATION

```text
A — CLOSED
```

Before this audit's fixes the honest classification was **B — minor refinement**
(three readability defects, no mechanic required). All three are fixed inside
this step, verified in the browser, and pinned by tests, so the phase is closed:

* 7 scenarios, each measured to complete its objective and each with a distinct
  first decision (5 genuinely distinct, 2 limited-tutorial/scenario-B by the
  10AM criteria);
* the eight objective questions and the three progression states are answerable
  from the rendered UI;
* every resource row separates the concepts it conflates elsewhere (stock /
  storage / production / upkeep for Material; capacity / balance / reserve /
  service / shortage for Water; stock / forecast / collapse for Food);
* failure and recovery are visible, and the one un-reportable case is a
  documented consequence of the no-history contract, not a defect;
* no missing causal capability was found.

## 11. ARCHITECTURAL CHECKPOINT (frozen)

```text
domain deterministic                     PASS (hash equality over 30 ticks, two runs)
application queries pure                 PASS (repeated objective/progression reads identical)
scenarios declarative                    PASS (exactly the 8 declared keys, resources food/material/water only)
objectives data/query driven             PASS (closed requirement set, 5 kinds)
derived state never persisted            PASS (7 save keys; no scenario/progression/objective/waterSupply/storage)
SAVE_VERSION                             7 (unchanged)
insertion-order invariance               PASS (reversed record order, same canonical hash)
no hidden mechanics in scenarios         PASS (no scenario-only bypass; every scenario runs the same stepSimulation)
economic constants                       Farm 2 · Well 2 · storage 25 (unchanged)
```

**This baseline is frozen.** No refactor was performed for aesthetics.

## 12. NEXT-PHASE OPTIONS

| option | justified by evidence? | evidence |
| --- | --- | --- |
| A — more content on existing mechanics | **no** | the candidates are exhausted: Partitioned valley is B (10AR), Food glut / Standing industry were absorbed by Water reserve industry (10AQ), and this audit found no scenario gap |
| B — terrain / obstacles | **only as a conscious capability decision** | it is the single thing that would make Partitioned valley distinct (10AR) and the only spatial differentiation left; it is a NEW mechanic and was not implemented |
| C — new economic capability | **no** | no concrete missing causal relationship was measured (10AS/10AT) |
| D — presentation refinement | **worked, now closed** | this audit's three defects were presentation issues; they are fixed and pinned |
| E — phase freeze | **yes** | the simulation is coherent, the catalogue is distinct, the UI answers the player's questions, and nothing measured justifies more work in this phase |

The evidence-based answer is **Option E — phase freeze**, with Option B recorded
as the next *capability* decision to be taken deliberately (not by roadmap
momentum).

## 13. IMPLEMENTATION

```text
modified: src/app/main.ts        (Workshop inspection names production/jobs/upkeep/storage;
                                  Food row keeps `· starved`; undefined next stage names the final stage)
          index.html             (#selected-building capped at 320px so the overlay cannot
                                  widen over the board; #nova-ui scrolls instead of clipping)
          e2e/jobsRun.mjs        (4 Workshop-inspection expectations updated to the new contract)
          e2e/progressionRun.mjs (the deferred-next-stage expectation)
          package.json           (test:e2e:readability)
added:    tests/contentReadabilityClosureAudit.test.ts (12 tests)
          e2e/readabilityAudit.mjs                     (the browser readability audit)
          docs/roadmap/Step10AT.md
domain changes:      none
economic changes:    none
scenario data:       unchanged
persistence:         none
SAVE_VERSION:        7
```

## 14. VALIDATION

```text
pnpm typecheck   PASS
pnpm lint        PASS
pnpm build       PASS
pnpm test        75 files / 1388 tests PASS   (74 / 1376 before: +1 audit file, +12 tests)
determinism      PASS
insertion-order  PASS
save/load        PASS
browser          15 / 15 suites ALL PASS (headless) — the 14 existing suites plus
                 the new readability audit
headed           readability audit PASS (real window, screenshots)
GPU              GPU E2E ALL PASS (headed, hardware renderer)
```

Regressions from 10AQ/10AR/10AS explicitly re-verified: Well reassignment appears
in the UI and in command validation (`reassign`, `industrial` suites + the audit's
contract check); the Water semantics distinguish reserve depletion from a true
shortage (`waterRun`, `industrialRun`, the audit); the Material storage cap is
visible (`progressionRun`, `industrialRun`, the audit); the industrial objectives
complete correctly (`progressionRun`, `industrialRun`); `SAVE_VERSION` is 7
(`progressionRun`, `industrialRun`, the audit).

---

## 15. FINAL REPORT

```text
STEP 10AT — FINAL REPORT

Starting commit: ed1b446 (Step 10AS)
Final commit:    this commit

SCENARIO CATALOGUE
- Scenarios audited: 7, each started and driven to its objective with real commands
- Distinct causal spaces: 5 genuinely distinct (First settlement order/geometry,
  Water constraint capacity restoration, Spatial efficiency exact road budget,
  Population expansion housing ahead of capacity, Water reserve industry resource
  conversion with a terminal order)
- Overlaps: Recovery shares the connect/duplicate shape with Water reserve
  industry; Population expansion and Water reserve industry both build a Well;
  both industrial scenarios place a Workshop; First settlement and Spatial
  efficiency share the "reach Settlement" objective and differ by budget
- Weak/ambiguous scenarios: none removed; Industrial expansion is deliberately a
  limit tutorial (B by the 10AM criteria), Recovery is B (distinct consequence,
  overlapping decision)

OBJECTIVE READABILITY
- Questions answerable: 8 of 8, for all 7 scenarios, from the rendered UI
- Issues found: the checklist and the objective can show two different Water
  thresholds side by side (labelled distinctly — recorded, not a defect)
- Fixes: none needed

PROGRESSION READABILITY
- Wilderness: three unmet conditions + blocked line
- Settlement: the single unmet Village condition (Water capacity 2)
- Village: deferred, no next stage, all current conditions met
- Town: not fabricated — the undefined future stage now reads
  "not yet defined (this is the current final stage)"
- Issues: the undefined stage was indistinguishable from an omission
- Fixes: that label

RESOURCE SEMANTICS
- Material: stock / storage / production / stored / upkeep / net / affordability
  all separated; the Workshop inspection now names production, jobs, upkeep and
  the 25 storage
- Food: stock / production / consumption / forecast / balance / collapse, with a
  persistent `starved` label after a collapse
- Water: capacity / balance / reserve / service / shortage (the 10AR contract)
- Issues: the Workshop inspection omitted production and storage; a collapse was
  a one-frame message
- Fixes: both, in the existing visual language

INDUSTRIAL READABILITY
- Industrial expansion: Material 100 (4x the cap) — the Workshop can be built but
  cannot add to the stores (measured gross 2, stored 0)
- Water-reserve-industry: Material 25 / Water 51 — the Workshop manufactures the
  next building
- Issues: the cap was visible only in the HUD before this step; now it is in the
  HUD, the inspection and the objective constraint
- Fixes: the Workshop inspection line

OPENING DISCOVERABILITY
- 100 Material opening: every purchase cost is on the palette button; the hover
  names the exact shortfall
- Order pressure: measured in 10AS (settle / stall / starve / Village)
- Cost visibility: full
- Issues: none outstanding; no tutorial added and the optimal opening is not
  revealed
- Fixes: none

FAILURE / RECOVERY
- Food: collapse terminal, visible as `starved` + objective failed
- Water: shortage blocks growth, never kills; `draining` → `shortage` → `noReserve`
- Workforce: `Jobs: 0/1` plus the inspector's eligibility reasons
- Construction: the hover names `insufficient material (20/25)`
- Industry: reserve depletion is recoverable by returning the worker
- Issues: a scenario that starts empty cannot report a later collapse as failed
  (the 10AN no-history trade-off)
- Fixes: the persistent Food `starved` label

BROWSER AUDIT
- Desktop: 1280x800, panel 398px, no clipping/overlap, no stale values
- Responsive: 420x740 and 360x640 without horizontal overflow; the overlay now
  scrolls instead of running past a short viewport
- Headed: readability audit PASS with screenshots
- GPU: ALL PASS (hardware renderer)
- Visual issues: the overlay could widen over the board's top-left cells (fixed);
  the overlay covers the board at 360px width (recorded, desktop-first product)

ARCHITECTURE
- Domain: deterministic, unchanged
- Application: queries pure
- Scenarios: declarative, no hidden resources or bypasses
- Objectives: data/query driven, closed requirement set
- Persistence: no derived state stored (7 keys)
- SAVE_VERSION: 7
- Determinism: PASS
- Insertion-order: PASS

PHASE CLASSIFICATION
- A/B/C/D: A — CLOSED (B before this step's three readability fixes)
- Evidence: every scenario completes and fails as measured; the 8 questions and
  3 progression states are answerable from the UI; resource concepts are
  separated; architecture is clean and frozen

IMPLEMENTATION
- Files: src/app/main.ts, index.html, e2e/jobsRun.mjs, e2e/progressionRun.mjs,
  package.json, tests/contentReadabilityClosureAudit.test.ts,
  e2e/readabilityAudit.mjs, docs/roadmap/Step10AT.md
- Domain changes: none
- Economic changes: none
- Persistence: none
- SAVE_VERSION: 7

VALIDATION
- Tests: 75 files / 1388 tests PASS
- Typecheck: PASS
- Lint: PASS
- Build: PASS
- Determinism: PASS
- Insertion-order: PASS
- Save/load: PASS
- Browser: 15/15 suites ALL PASS (headless) + headed readability audit PASS
- GPU: ALL PASS (headed, hardware renderer)

NEXT-PHASE OPTIONS
- Existing-mechanics content: not justified (no measured content gap)
- Terrain/obstacles: the only remaining spatial differentiation; a new mechanic,
  to be decided deliberately
- New economic capability: not justified (no missing causal relationship)
- Presentation refinement: this audit's issues are fixed and pinned
- Phase freeze: JUSTIFIED — this is the evidence-based outcome

NEXT DEPENDENCY:
A conscious product decision, not another audit: either freeze the 2/2 content
phase as the foundation and start a new capability (terrain/obstacles is the only
one the evidence supports), or keep refining presentation with no measured gap.
```
