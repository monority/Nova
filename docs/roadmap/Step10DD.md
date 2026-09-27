# Step 10DD — Product Depth & Replayability Gate

## Objective

Perform a product-level audit of NOVA's actual gameplay depth and replayability after the recent product-quality convergence:

- 10CY — Player Experience & Product Gap Audit
- 10CZ — HUD Non-Occlusion & E2E Baseline Repair
- 10DA — Product Experience Audit II
- 10DB — Narrow Viewport Framing Investigation & Gate
- 10DC — Visual Identity & Presentation Gate

This is a **decision gate, not an implementation step**.

The purpose is to determine whether NOVA's current foundation provides enough meaningful decision-making and replay value for its intended scope, or whether a concrete product-depth problem remains.

Do not invent a new mechanic merely because the roadmap has room for one.

---

## 1. Read the Current Product Completely

Before drawing conclusions, inspect:

- `docs/roadmap/`
- the latest roadmap/gate documents, especially Steps 10CY–10DC
- scenario catalogue and scenario fixtures
- current domain/application systems
- economy and affordability rules
- workforce allocation rules
- roads/accessibility/mobility rules
- progression and Town gate
- save/hash/versioning contracts
- current browser/E2E coverage
- current visual/rendering contracts

Reconstruct the actual player experience from the code and tests rather than relying only on roadmap prose.

The analysis must describe what the player can **actually do**, not what the project might eventually become.

---

# 2. Reconstruct the Decision Graph

Identify every meaningful player decision currently available.

At minimum examine:

### Spatial decisions

- building placement
- road placement
- network topology
- access implications
- construction timing
- limited-board tradeoffs
- alternative layouts

### Economic decisions

- building construction
- Material affordability
- income timing
- protected Storage reserve
- production capacity
- resource balance
- construction versus maintaining production

### Workforce decisions

- residence/workplace assignment
- staffing choices
- vacant versus staffed production
- worker mobility/accessibility
- reallocation as the settlement evolves

### Progression decisions

- Village → Town progression
- scenario-specific objectives
- timing of progression
- choices required to satisfy scenario conditions

### Temporal decisions

Determine whether the player must make decisions about:

- when to build
- when to assign workers
- when to expand
- when to spend resources
- when to wait
- when to trigger progression

Do not count merely clicking different UI elements as separate decisions.

A decision should count only when choosing one option meaningfully changes the resulting state, constraints, or future options.

---

# 3. Measure Decision Consequences

For each meaningful decision category, determine:

1. What changes when the player chooses differently?
2. Is the consequence persistent?
3. Is it reversible?
4. Does it create a future constraint?
5. Can two reasonable choices lead to materially different settlement states?
6. Can a poor choice create a meaningful recovery problem?
7. Does the player have enough information to understand the consequence?

Pay particular attention to the difference between:

- **mechanical possibility**
- **meaningful strategic consequence**

Do not inflate the depth assessment by counting mechanics that rarely affect decisions.

---

# 4. Scenario Diversity

Analyze the current **11 authored scenarios**.

Determine:

- what each scenario actually asks the player to optimize or satisfy;
- which systems each scenario exercises;
- how many scenarios are mechanically distinct;
- how many are variations of the same underlying solution;
- whether different scenarios encourage different layouts;
- whether different scenarios encourage different workforce allocations;
- whether scenario constraints create different economic pressures;
- whether scenario order creates meaningful progression;
- whether completing all scenarios effectively solves the game.

Create a compact scenario matrix such as:

| Scenario | Primary constraint | Spatial variation | Workforce variation | Economic variation | Progression variation |
|---|---|---|---|---|---|

Do not assign scores or rankings.

The purpose is classification and evidence, not grading.

---

# 5. Authored Variety vs Emergent Replayability

This distinction is critical.

Analyze separately:

### Authored replayability

What changes when the player chooses a different scenario?

### Emergent replayability

What changes when the player replays the same scenario or sandbox with:

- different building placement;
- different road topology;
- different workforce assignments;
- different construction order;
- different resource timing;
- different recovery choices?

Determine whether the current system creates genuinely different valid settlement trajectories or whether there is effectively one solved sequence with cosmetic variation.

Do not assume that a large theoretical state space means meaningful replayability.

---

# 6. Layout Diversity

Use deterministic experiments/fixtures where useful.

Investigate whether the 12×12 board permits materially different viable layouts.

Test representative alternatives rather than attempting brute-force enumeration.

Examples:

- compact versus distributed buildings;
- centralized versus separated road networks;
- different Workshop/Farm/Well arrangements;
- different residence/workplace configurations;
- different construction orders.

Determine:

- whether alternatives are actually viable;
- whether they produce different economic/workforce consequences;
- whether road topology creates meaningful spatial decisions;
- whether the current board is functionally spacious or effectively solved.

Do not add mechanics to manufacture complexity.

---

# 7. Workforce Diversity

Analyze the workforce system as an actual decision space.

Determine:

- number of meaningful allocation states;
- whether multiple allocations can be viable;
- whether allocations create different production outcomes;
- whether road mobility meaningfully constrains choices;
- whether reassignment is strategically relevant;
- whether the system tends toward one obvious allocation;
- whether workforce decisions interact with spatial decisions.

Distinguish:

> "There are many possible assignments"

from:

> "There are many strategically meaningful assignments."

Only the latter counts as meaningful depth.

---

# 8. Economic Depth

Analyze the existing economy without proposing new resources or production chains.

Cover:

- Material income;
- Farm/Well income;
- Workshop production/upkeep;
- Storage reserve;
- building affordability;
- road affordability;
- same-tick income;
- production capacity;
- workforce availability;
- starvation/recovery behavior;
- progression costs/requirements.

Determine whether the player faces genuine tradeoffs or mostly executes a predictable economic loop.

Explicitly identify:

- bottlenecks;
- temporary bottlenecks;
- permanent bottlenecks;
- recoverable mistakes;
- irreversible mistakes;
- solved states.

---

# 9. Temporal Depth

Determine whether time changes the decision landscape.

Ask:

- Does acting now versus later matter?
- Does delaying construction create meaningful consequences?
- Does workforce reassignment have timing consequences?
- Does the settlement enter different states depending on construction order?
- Can the player intentionally recover from an inefficient early state?
- Does progression timing matter?

Do not interpret mere tick progression as temporal depth.

Temporal depth exists only if timing changes meaningful choices or consequences.

---

# 10. Failure, Recovery, and Dead Ends

Inspect actual failure states.

Determine:

- what constitutes a bad strategic state;
- whether the player can recover;
- whether recovery itself requires decisions;
- whether failure teaches the player something;
- whether scenarios can become effectively solved/unsolved;
- whether restarting is necessary;
- whether the game can trap the player in a state without meaningful choices.

Document concrete examples from deterministic tests where possible.

---

# 11. The "Solved Game" Test

Perform a deliberate audit of whether NOVA can be effectively solved.

Ask:

> After understanding the current rules, can a player reproduce essentially the same successful strategy across most scenarios?

If yes, document precisely why.

If no, identify which systems prevent a single dominant solution.

Do not turn this into a subjective statement such as "the game feels repetitive."

Use observable evidence:

- identical build sequences;
- identical workforce allocations;
- identical road structures;
- identical resource bottlenecks;
- scenario-specific deviations;
- materially different successful states.

---

# 12. Product Scope Test

Keep the intended scope in mind.

NOVA is not automatically required to become:

- a large-scale city simulator;
- a complex logistics game;
- a production-chain simulator;
- a procedurally generated sandbox;
- a multiplayer game;
- a content-heavy strategy game.

A small deterministic contemplative city-builder can intentionally have limited mechanical depth.

The question is therefore:

> Is the current depth insufficient for NOVA's intended experience?

not:

> Can we add more mechanics?

If the current scope is coherent and the available decisions are meaningful, explicitly treat that as evidence against further mechanic expansion.

---

# 13. Decision Gate

The audit must finish with exactly one of these outcomes.

## A — CONCRETE PRODUCT DEPTH PROBLEM

Use this only if there is reproducible evidence that the current experience lacks a meaningful decision dimension required by the product direction.

Document:

- the exact problem;
- affected systems/scenarios;
- reproducible evidence;
- why existing systems cannot already address it;
- the smallest plausible next product improvement.

Do **not** implement the improvement in Step 10DD.

The next step must be a separately scoped implementation proposal.

---

## B — CURRENT DEPTH SUFFICIENT / FOUNDATION CAN FREEZE

Use this if:

- the current decisions are meaningful;
- multiple valid states/strategies exist where intended;
- scenarios provide sufficient authored variation;
- spatial/workforce/economic systems interact coherently;
- replayability is appropriate to the intended scope;
- no concrete depth defect is reproducible.

Explicitly document why adding another mechanic at this point would be speculative rather than evidence-driven.

This outcome should be treated as a legitimate product conclusion, not as a failure to find work.

---

## C — PRODUCT DIRECTION REQUIRED

Use this only if the audit identifies a meaningful limitation but the evidence does not establish one clearly justified next mechanic.

Document the concrete evidence and the possible product directions without selecting or ranking one.

No implementation.

---

# 14. Required Tests / Audit Artifact

Create:

`tests/productDepthReplayabilityAudit.test.ts`

The test suite should encode the audit's deterministic findings where practical.

Prefer assertions about:

- scenario catalogue coverage;
- distinct decision dimensions;
- viable alternative layouts;
- workforce alternatives;
- economic consequences;
- progression differences;
- recovery behavior;
- deterministic state divergence;
- replayability evidence.

Do not create fake numerical "depth scores."

Do not weaken existing tests.

Do not modify gameplay behavior merely to make the audit pass.

---

# 15. Documentation

Create:

`docs/roadmap/Step10DD.md`

Include:

1. Objective
2. Product baseline
3. Current decision graph
4. Decision consequence analysis
5. Scenario diversity matrix
6. Authored vs emergent replayability
7. Layout diversity
8. Workforce diversity
9. Economic depth
10. Temporal depth
11. Failure/recovery analysis
12. Solved-game analysis
13. Product-scope assessment
14. Evidence
15. Decision Gate: A / B / C
16. If A: smallest next product improvement, explicitly not implemented
17. If B: explicit foundation-freeze rationale
18. If C: documented product-direction options
19. Validation
20. Final scope audit

Be precise and evidence-driven.

---

# 16. Browser Verification

Because this is a player-experience/product audit, perform real headed-browser verification where relevant.

Use the existing standard viewports:

- 1280×800
- 420×740
- 360×640

Verify representative scenarios and decision flows rather than relying exclusively on unit tests.

Confirm that the product-depth conclusions match actual player-visible behavior.

Do not introduce UI changes.

---

# 17. GPU Verification

Run the existing headed GPU/WebGL2 verification if the audit exercises the rendered game.

Expected hardware baseline:

- NVIDIA RTX 3070
- WebGL2
- hardware rendering
- no browser/WebGL errors

Do not modify rendering code.

---

# 18. Full Validation

At the end, run the project's complete validation suite.

At minimum:

- focused Step 10DD tests;
- full Vitest suite;
- TypeScript/typecheck;
- ESLint;
- production build;
- existing diff/guardrail checks;
- relevant Playwright/browser suites;
- responsive verification;
- GPU/WebGL2 verification where applicable.

Report exact observed counts/results.

Do not claim success without actually running the command.

---

# 19. Scope Guardrails

Step 10DD is an **audit only**.

Do NOT:

- add gameplay mechanics;
- add resources;
- add buildings;
- add production chains;
- alter economy rules;
- alter workforce rules;
- alter roads;
- alter progression;
- alter scenarios;
- alter persistence;
- change `SAVE_VERSION`;
- change rendering;
- redesign the HUD;
- change camera behavior;
- change product rules to improve audit results.

Source changes should be limited to deterministic audit/test instrumentation if genuinely necessary.

Prefer zero `src/` changes.

Do not delete or weaken existing tests.

Do not modify unrelated files.

Do not touch user-owned/untracked files.

In particular, leave these untouched if present:

- `AGENTS.md`
- `docs/roadmap/Step10BO - Copy.md`
- `docs/roadmap/Step10BT.md`

If those files are absent, do not recreate them.

---

# 20. Final Diff Audit

Before committing:

- inspect `git status`;
- inspect the complete diff;
- verify only intended files changed;
- verify no gameplay/economy/persistence/rendering changes slipped in;
- verify `SAVE_VERSION` remains `8`;
- verify no user-owned files were modified;
- verify no temporary artifacts remain.

---

# 21. Commit

If and only if all validation passes, create exactly one commit:

`Step 10DD: Product Depth and Replayability Gate`

Do **not** push.

---

# Final Report

Return:

## Step 10DD — Product Depth & Replayability Gate

### 1. Outcome
A / B / C

### 2. Product findings
- ...

### 3. Decision graph
- ...

### 4. Scenario diversity
- ...

### 5. Replayability
- ...

### 6. Layout / workforce / economy / temporal depth
- ...

### 7. Failure and recovery
- ...

### 8. Solved-game analysis
- ...

### 9. Evidence
- ...

### 10. Validation
- focused tests
- full Vitest
- typecheck
- lint
- build
- browser
- GPU
- diff/guardrails

### 11. Files changed
- ...

### 12. Commit
- exact commit hash
- `Step 10DD: Product Depth and Replayability Gate`

### 13. Scope confirmation
Explicitly confirm:

- no gameplay implementation;
- no economy changes;
- no persistence changes;
- no rendering changes;
- `SAVE_VERSION = 8`;
- no unrelated files;
- no push.

Do not propose Step 10DE automatically unless the evidence from this gate establishes a concrete next direction.

---

## As-Built

Audit only. `src/` is unchanged; the artefacts are
`tests/productDepthReplayabilityAudit.test.ts` (15 deterministic decision-depth
checks) and this record. Browser evidence: the headed product audit and the
scenario/workforce/economic suites.

### 1. Product Baseline

- 11 authored scenarios + the terrain-chokepoint fixture;
- economy: Farm +1 / Well +1 / Workshop +2 Material income per employed
  colonist, Workshop production 2 and upkeep 1, Material production cap 25 per
  operational Workshop, protected Storage reserve 15 (buildings only);
- workforce: one colonist per job, mobility-gated assignment, manual
  reassignment;
- roads: placement cost 5, operational networks grant building road access and
  mobility connectivity;
- progression: Wilderness → Settlement → Village → Town (Town = staffed
  Workshop), plus scenario objectives;
- `SAVE_VERSION = 8`; deterministic hashing; 1862 tests green.

### 2. Current Decision Graph

- **Spatial** — where to place Residence/Farm/Well/Workshop; where to run roads;
  one network vs several; how much board to spend on connectivity.
- **Economic** — what to build with limited Material; when to spend vs hold;
  whether to spend the 15-floor protected reserve; production vs upkeep.
- **Workforce** — which job the colonist(s) take; automatic vs manual override;
  reallocation as the settlement grows; accessible vs inaccessible workplaces.
- **Progression** — when to satisfy Village/Town conditions; scenario objectives.
- **Temporal** — build order, construction time (2 ticks, 1 with a crew),
  income timing (same-tick inflow), when to reassign, when to wait.

### 3. Decision Consequence Analysis

| Decision | What changes | Persistent? | Reversible? | Future constraint? |
| --- | --- | --- | --- | --- |
| Build a Farm vs Well vs Workshop | which resource grows; income 1/1/2; Workshop upkeep 1 | yes (stock/rate) | yes (rebuild/assign) | yes (needs access + worker) |
| Road topology | network count; building access; mobility gating | yes | yes (roads are permanent but redundant roads only cost Material) | yes |
| Worker allocation | production and income per tick | yes | yes (Move worker) | yes (only one job per colonist) |
| Spend protected reserve | +25 budget now, reserve floor kept at 15 | yes | no (Material spent) | yes (less reserve later) |
| Build order / timing | same-tick affordability, upkeep timing | yes | partly | yes |
| Ignore food pressure | terminal starvation | yes | no | game over for the colony |

Measured consequences (new test): a single colonist on a Farm, Well or Workshop
yields three different production/income/upkeep profiles; the same start with
the colonist reassigned to Farm or Well diverges in Food, Water and canonical
hash within 4 ticks; a roadless workplace has 0 employment and 0 production
while the connected one produces 2.

### 4. Scenario Diversity Matrix

| Scenario | Primary constraint | Spatial variation | Workforce variation | Economic variation | Progression variation |
| --- | --- | --- | --- | --- | --- |
| first-settlement | reach Settlement from empty | full freedom | none (0 colonists) | Material 100 budget | Wilderness → Settlement |
| water-constraint | add Water capacity | fixed layout, place a Well | 2 colonists, Farm holds one | Material 100, Water 0 | Settlement → Village |
| industrial-expansion | Village + Workshop | fit a Workshop near access | needs a hand admission caps | Material 100 **above** the 25 cap, Water 10 | Village objective |
| water-reserve-industry | Workshop + 2nd Well | Workshop then Well | manual burst reassignment | Material 25, Water 51 (Water→Material conversion) | Village objective |
| spatial-efficiency | Settlement on an exact budget | Residence + one road cell + Farm | none | Material 55 exactly | Wilderness → Settlement |
| population-expansion | 4 colonists, Water 4, Food balanced | 2 Wells + 2 Farms layout | staff 4 workplaces | Material 100 | Settlement shape |
| recovery | reconnect the stranded Farm | repair 2 road cells | Farm staffing | Material 30 / Food 30 finite | Wilderness (terminal if unresolved) |
| housing-composition | Village with two networks | bridge vs east vs west choice | 1 colonist, 2nd admitted | Material 30 (Residence + ≤1 road) | Village; failure path = collapse |
| town-threshold | Town | place a Workshop on an existing network | staff it with the idle 4th colonist | Material 30, Water 5 | Village → Town |
| town-balance | Town | developed layout | balanced allocation | tight budget | Village → Town |
| town-connection | Town | connectivity focus | staffing via access | tight budget | Village → Town |

Requirement signatures (stage/building/population/waterCapacity/foodBalance)
are **5+ distinct** across the 11 scenarios, and one scenario requires no
building while the industrial scenarios require a specific Workshop. There is no
single build that satisfies every scenario.

### 5. Authored vs Emergent Replayability

- **Authored** — switching scenarios changes the starting state, budget, layout
  constraints, workforce availability and objective; the matrix above shows the
  variation is real (5+ distinct requirement signatures, distinct constraints).
- **Emergent** — within a scenario/sandbox the player can vary placement, road
  topology, allocation and build order. Measured: compact vs distributed
  layouts are both viable (both reach one connected network, full staffing and
  nominal production) while differing in road structure (4 vs 7 road cells);
  bridging two networks changes the network count and the access a cell will
  grant; reassigning the colonist changes the Food/Water trajectory and hash.

So both authored and emergent variation exist, but the emergent space is
constraint-driven rather than combinatorially large — appropriate to scope.

### 6. Layout Diversity

The 12x12 board permits materially different viable layouts: the compact and
distributed colonies above both reach full staffing and production, and the
housing-composition scenario's bridge/east/west options are genuinely different
states (one merges the networks and serves the west cell, the others do not).
The board is functionally spacious for the current building set (10DB measured
clipping only at the narrow viewport, not a layout limitation). Roads create a
meaningful spatial decision because network membership gates both service and
employment.

### 7. Workforce Diversity

The system is not "many assignments, one obvious answer":

- one colonist across Farm/Well/Workshop = three distinct production profiles
  (Food 2 / Water 2 / Material 2) with different income (1/1/2) and upkeep (0/0/1);
- mobility gates eligibility, so placement restricts which jobs are reachable —
  a roadless workplace is 0 employment and 0 production;
- at population ≥2 the Farm/Well/Workshop trade-off is the documented live
  decision (10CA) and reassignment changes the resource trajectory
  (measured divergence + different hash);
- accessibility means the same buildings can be staffed or idle depending on
  the layout, coupling workforce and spatial decisions.

### 8. Economic Depth

The player faces real trade-offs, not just a fixed loop:

- **Bottlenecks**: one Material production cap (25/Workshop) bounds stored
  output; the Workshop needs 1 Water + a worker + access; a stored Material
  reserve (15-floor) can fund a building but never a road.
- **Temporary bottlenecks**: Water headroom (admission gate), a stranded Farm
  (5-Material road repair), and the industrial burst (Water → Material).
- **Permanent/terminal**: starvation wipes the colony — the one irreversible
  failure, and it is visible (Food 0 → population 0).
- **Solved states**: once income outpaces upkeep, the sandbox's Material
  becomes non-scarce (documented in 10CW/10CL); tension is front-loaded and the
  scenarios restore it with tight budgets.

Measured: below the cap a staffed Workshop nets +3/tick (stored 2 + income 2 −
upkeep 1); at the cap stored production is 0 yet income still grows the stock;
the reserve makes a Residence affordable from Storage but never a road.

### 9. Temporal Depth

Time changes the decision landscape:

- buildings take 2 ticks to become operational (1 with a construction crew, at
  the cost of one tick of income — measured in 10CZ);
- upkeep and production only start once operational and staffed;
- same-tick affordability makes waiting for the crest a real choice;
- build order matters: the 10AS opening leaves the same 23 Material regardless
  of order, but the recovery scenario is terminal unless the Farm is reconnected,
  and the industrial scenario requires the Workshop before the Well.

### 10. Failure, Recovery, and Dead Ends

- **Terminal**: starvation (food 0 → population 0 same tick; measured) and the
  unresolved recovery/housing-collapse paths.
- **Recoverable**: a stranded workplace is fixed with a 5-Material road
  (measured: 0 → 2 production); a deficit refills from stored production +
  income once the flow resumes; a below-cost build can be gated by same-tick
  inflow.
- Recovery itself is a decision (which building/road to fund first with a tight
  budget), and failure is legible (the HUD names the shortage and the status
  line names the cause). No scenario traps the player without meaningful
  choices while colonists are alive.

### 11. Solved-Game Analysis

NOVA is **not** solvable by one repeated strategy across the catalogue:

- requirement signatures are 5+ distinct; `first-settlement` needs no building
  while the industrial scenarios require a Workshop and
  `water-reserve-industry` additionally requires the Water→Material burst and a
  second Well;
- `housing-composition` is decided by road topology, `recovery` by repairing a
  stranded Farm, `population-expansion` by Water/Food capacity;
- the sandbox does have a dominant *pattern* — build the production set, then
  allocate workers to the binding bottleneck — which is the intended
  contemplative loop, not a defect.

Observable evidence rather than a feeling: distinct objectives, distinct
starting budgets, distinct required buildings, and measured divergent states
from different allocations/layouts.

### 12. Product-Scope Assessment

NOVA is a small, deterministic, contemplative city-builder/progression puzzle.
Its intended depth is "understand the causal chain, plan a small settlement,
optimise a tight budget", not a production-chain or logistics simulator. Within
that scope the current decisions are meaningful and the authored scenarios
supply the pressure the sandbox does not sustain indefinitely. Limited
mechanical breadth is therefore intentional, consistent with the frozen
roadmap (10CL/10CM/10CW DEFER, 10CX/10CN FREEZE).

### 13. Classified Findings

- **A — concrete product-depth problem: none.** No dimension required by the
  product direction is missing: spatial, workforce, economic, progression and
  temporal decisions all exist with persistent, partly reversible consequences
  and legible feedback.
- **B — minor observations (recorded, no step justified):**
  - B1 the sandbox's Material tension is front-loaded (income eventually
    outpaces upkeep) — documented in 10CW/10CL; the scenarios restore pressure.
  - B2 occasional E2E flake in older suites' single-hover road-preview waits
    (`jobs`, `reassign`, `road-affordability`); passes on re-run and is test
    reliability, not gameplay.
- **C — intentional / acceptable:** limited mechanical breadth for the intended
  contemplative scope; authored scenarios as the primary variety source.
- **D — new product direction: none demonstrated.**

### 14. Evidence

- `tests/productDepthReplayabilityAudit.test.ts` — 15 deterministic checks
  (sections above).
- Headed browser: product audit PASS; progression, housing, upkeep, water, road,
  town-gate, workforce-contention, farm-well-allocation PASS; `jobs` passed on
  re-run (B2).
- GPU/WebGL2 PASS (NVIDIA RTX 3070).

### 15. Decision Gate

**B — CURRENT DEPTH SUFFICIENT / FOUNDATION CAN FREEZE.**

The current decisions are meaningful, multiple valid states and layouts exist
where intended, the authored scenarios provide sufficient variation, and the
spatial/workforce/economic/progression systems interact coherently. No concrete
depth defect is reproducible.

### 16. (A) Smallest Next Product Improvement

Not applicable (Outcome B). Nothing is proposed for implementation.

### 17. (B) Foundation-Freeze Rationale

Adding another mechanic now would be speculative rather than evidence-driven:

- no dimension of the decision graph is missing or unprofitable;
- the sandbox's front-loaded tension and the scenario budgets already create
  the intended pressure;
- every prior growth/demand/production/transport direction was investigated and
  deferred for lack of a demonstrated new decision (10CL/10CM/10CW/10CX);
- the product direction (small deterministic contemplative builder) is served by
  the current depth.

### 18. (C) Product-Direction Options

Not applicable (Outcome B). No unresolved direction choices are recorded.

### 19. Validation

- focused: `tests/productDepthReplayabilityAudit.test.ts` — **15/15 PASS**
- full Vitest: **1862 passed / 0 failed (116 files)** (10DC baseline 1847 + 15)
- typecheck: PASS; lint: PASS; production build: PASS; `git diff --check`: clean
- browser (headed): product audit + progression, housing, upkeep, water, road,
  town-gate, workforce-contention, farm-well-allocation PASS; `jobs` PASS on
  re-run; viewports 1280x800 / 420x740 / 360x640
- GPU/WebGL2: PASS — NVIDIA GeForce RTX 3070 (unmasked), WebGL2, hardware path,
  zero console/page errors
- `SAVE_VERSION` remains **8**

### 20. Final Scope Audit

- Changed files: `tests/productDepthReplayabilityAudit.test.ts` (new) and
  `docs/roadmap/Step10DD.md` (this as-built, force-added).
- No `src/` change; no gameplay, economy, workforce, road, progression,
  scenario, persistence, rendering, HUD or camera change; `SAVE_VERSION` stays 8.
- `AGENTS.md` untouched; `docs/roadmap/Step10BO - Copy.md` and
  `docs/roadmap/Step10BT.md` are absent (nothing recreated); no temporary
  artifacts.

Commit: `Step 10DD: Product Depth and Replayability Gate`
