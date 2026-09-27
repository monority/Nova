# Step 10DE — Foundation Freeze & Product Handoff

## Objective

Formally freeze the current NOVA gameplay foundation after the completed product gates:

- 10DA — Product Experience Audit II
- 10DB — Narrow Viewport Framing Investigation & Gate
- 10DC — Visual Identity & Presentation Gate
- 10DD — Product Depth & Replayability Gate

This is **not a new gameplay implementation**.

The purpose is to establish a precise, durable baseline that future product work must build on without accidentally reopening or drifting already-settled systems.

The current product foundation has evidence for:

- healthy player-facing UX;
- accepted responsive framing;
- coherent visual identity;
- meaningful spatial decisions;
- meaningful economic decisions;
- meaningful workforce decisions;
- meaningful progression;
- meaningful temporal consequences;
- sufficient authored scenario variety;
- sufficient replayability for the current scope.

Treat those conclusions as established unless new evidence directly contradicts them.

---

# 1. Reconstruct the Frozen Foundation

Read the current implementation and the complete relevant roadmap history.

At minimum inspect:

- `docs/roadmap/`
- `docs/12-visual-direction.md`
- current domain/application/rendering code
- scenario definitions and fixtures
- economy rules
- workforce rules
- road/access rules
- progression rules
- persistence/save/hash rules
- existing product and E2E audits

Create a concise inventory of the systems that now constitute the frozen foundation.

The inventory must distinguish:

### Frozen contracts

Behavior that future work should not silently change.

### Existing implementation details

Details that can still be refactored without changing product behavior.

### Explicitly deferred directions

Previously investigated areas that are not currently justified:

- production-economy expansion;
- growth;
- external/world demand;
- other previously deferred roadmap directions.

Do not reinterpret a deferred direction as a commitment.

---

# 2. Freeze the Core Gameplay Contracts

Document the currently established contracts for:

## Economy

Include the actual current behavior for:

- Farm income;
- Well income;
- Workshop production;
- Workshop upkeep;
- Material stock;
- Storage reserve;
- same-tick income;
- affordability;
- road affordability;
- production/storage interactions.

Do not change any of these rules.

## Workforce

Document:

- residence assignment;
- workplace assignment;
- staffing;
- road-access requirement;
- mobility;
- reassignment;
- production consequences.

Do not introduce automatic allocation or new workforce behavior.

## Roads

Document:

- one-cell RoadState;
- construction;
- cost;
- operational state;
- network formation;
- connectivity;
- building access;
- workplace mobility.

Do not introduce pathfinding, vehicles, transit, or additional network mechanics.

## Progression

Document:

- Village;
- Town;
- current progression requirements;
- authored scenario relationship;
- what Town currently represents.

Do not add another progression tier.

## Persistence

Document:

- `SAVE_VERSION = 8`;
- deterministic hashing;
- persisted versus derived state;
- currently established save contracts.

Do not bump the save version.

---

# 3. Freeze the Product Experience Contracts

Document the conclusions of 10DA–10DC.

Include:

### HUD

- default-open behavior;
- non-occlusion behavior;
- responsive sizing;
- objective/palette availability.

### Camera

- current fixed framing;
- accepted narrow-viewport clipping;
- the conditions under which camera work would become justified.

### Visual language

- dark restrained palette;
- building silhouettes;
- road/network visualization;
- state-driven emissive language;
- no unnecessary bloom/gradients/cyberpunk clutter.

### Accessibility / readability

Document the currently validated interaction/readability expectations.

Do not implement visual redesigns.

---

# 4. Freeze the Scenario Contract

Inspect all 11 current scenarios.

Document:

- scenario identifiers;
- objective types;
- requirement kinds;
- progression relationship;
- scenario-specific constraints;
- expected terminal conditions.

The purpose is not to redesign the scenarios.

The purpose is to establish:

> "These scenarios define the current authored content baseline."

Do not add scenarios in this step.

Do not modify existing scenario difficulty.

Do not rebalance scenarios.

---

# 5. Establish the "Do Not Reopen Without Evidence" List

Create an explicit list of previously investigated areas that should not be reopened without new evidence.

At minimum include:

- generic production-chain expansion;
- growth mechanics;
- external/world demand;
- broad economy expansion;
- new transportation systems;
- camera redesign;
- visual-tier expansion;
- generic gameplay-depth audits.

For each item document the evidence that currently supports leaving it frozen/deferred.

The goal is to prevent future agents from repeatedly rediscovering the same conclusions.

---

# 6. Identify Genuine Extension Seams

This section is important.

Do not propose features.

Instead, identify where future product work could attach **without destabilizing the frozen foundation**.

Examples may include:

- additional authored content;
- a new product phase built above the current simulation;
- a separate game mode;
- presentation/content expansion;
- a future system that consumes existing domain state.

Only document seams that are supported by the actual architecture.

Do not rank them.

Do not select one.

Do not implement one.

---

# 7. Architecture Drift Audit

Inspect whether the current code still respects the project's architectural intent.

Check:

- domain/application/rendering boundaries;
- deterministic state transitions;
- derived queries;
- persistence separation;
- rendering isolation;
- scenario isolation;
- testability.

Look specifically for accidental coupling introduced during the completed roadmap.

If a concrete architecture defect exists, document it.

Do not perform a broad refactor unless a correctness issue makes it necessary.

A clean architecture audit with no changes is a valid result.

---

# 8. Documentation Drift Audit

Search for stale claims across:

- roadmap documents;
- scenario documentation;
- gameplay documentation;
- comments;
- tests;
- developer-facing documentation.

Look specifically for obsolete assumptions such as:

- old `SAVE_VERSION`;
- old scenario count;
- pre-income economy descriptions;
- old affordability rules;
- obsolete progression assumptions;
- obsolete road behavior;
- old visual direction;
- deferred systems described as active.

Fix only factual documentation drift that directly conflicts with the frozen foundation.

Do not rewrite documentation for stylistic reasons.

---

# 9. Test Contract Audit

Determine whether the existing tests adequately protect the frozen foundation.

Verify that important contracts have executable coverage for:

- economy;
- affordability;
- reserve behavior;
- workforce;
- mobility;
- roads;
- progression;
- scenarios;
- persistence;
- deterministic hashing;
- player-facing product constraints.

Do not add arbitrary tests just to increase test count.

Add only tests that protect a concrete frozen contract currently lacking meaningful coverage.

---

# 10. E2E Stability

The 10DD report identified an occasional single-hover road-preview E2E race.

Investigate it briefly.

Determine whether it is:

- already sufficiently isolated;
- reproducible;
- caused by a real product problem;
- purely test synchronization.

If it is purely an E2E synchronization problem and a small deterministic hardening is clearly justified, it may be fixed.

Do not change gameplay behavior to accommodate the test.

Do not broaden this into a general Playwright refactor.

---

# 11. Foundation Freeze Document

Create:

`docs/roadmap/Step10DE.md`

The document must contain:

1. Objective
2. Frozen foundation
3. Economy contracts
4. Workforce contracts
5. Road/access contracts
6. Progression contracts
7. Persistence contracts
8. Product UX contracts
9. Visual contracts
10. Scenario baseline
11. Deferred directions
12. Do-not-reopen-without-evidence list
13. Extension seams
14. Architecture audit
15. Documentation audit
16. Test contract audit
17. E2E stability result
18. Final freeze declaration
19. Validation
20. Scope / diff audit

End with a clear statement equivalent to:

> The current NOVA foundation is frozen. Future gameplay changes require a new product objective and explicit evidence; they must not be introduced as continuation of the foundation audit sequence.

---

# 12. Optional Test Artifact

If useful, create:

`tests/foundationFreezeAudit.test.ts`

Only create this if executable assertions provide meaningful protection.

The test may validate immutable/current contracts such as:

- `SAVE_VERSION === 8`;
- scenario count;
- key economy invariants;
- deterministic behavior;
- progression boundaries;
- persistence shape.

Do not create superficial assertions solely to produce a test file.

If existing tests already provide sufficient protection, document that instead.

---

# 13. Source Changes

Prefer:

**zero `src/` changes.**

The only acceptable source changes are small, clearly justified fixes directly required by:

- a discovered correctness defect;
- documentation drift;
- or the specific E2E synchronization issue identified in 10DD.

No gameplay implementation.

No economy changes.

No new mechanics.

No rendering changes.

No camera changes.

No scenario redesign.

No progression changes.

No persistence changes.

No `SAVE_VERSION` change.

---

# 14. Validation

Run the complete validation suite.

At minimum:

- focused Step 10DE tests if created;
- full Vitest;
- typecheck;
- ESLint;
- production build;
- `git diff --check`;
- relevant Playwright/product suites;
- responsive browser verification where affected;
- GPU/WebGL2 verification if source/rendering is touched;
- existing guardrail/diff checks.

Report exact observed results.

Do not claim validation that was not actually executed.

---

# 15. Final Diff Audit

Before committing:

```bash
git status --short
git diff --stat
git diff --check
git diff
```

Verify:

- only intended files changed;
- no accidental gameplay changes;
- no economy changes;
- no persistence changes;
- no rendering changes;
- `SAVE_VERSION = 8`;
- no scenario changes;
- no user-owned files modified;
- no temporary artifacts;
- no generated screenshots/artifacts accidentally committed.

Leave these untouched if present:

- `AGENTS.md`
- `docs/roadmap/Step10BO - Copy.md`
- `docs/roadmap/Step10BT.md`

If absent, do not recreate them.

---

# 16. Commit

If validation passes, create exactly one commit:

`Step 10DE: Freeze NOVA Foundation and Product Handoff`

Do not push.

---

# Final Report

Return:

## Step 10DE — Foundation Freeze & Product Handoff

### 1. Outcome
- Foundation frozen / exceptions if any

### 2. Frozen contracts
- Economy
- Workforce
- Roads/access
- Progression
- Persistence
- UX
- Visuals
- Scenarios

### 3. Deferred directions
- ...

### 4. Do-not-reopen list
- ...

### 5. Extension seams
- ...

### 6. Architecture audit
- ...

### 7. Documentation drift
- ...

### 8. Test coverage
- ...

### 9. E2E stability
- ...

### 10. Validation
- focused
- full Vitest
- typecheck
- lint
- build
- browser
- GPU
- diff/guardrails

### 11. Files changed
- ...

### 12. Source changes
Explicitly state whether `src/` changed.

### 13. Commit
- exact commit hash
- `Step 10DE: Freeze NOVA Foundation and Product Handoff`

### 14. Scope confirmation
Explicitly confirm:

- no new gameplay mechanic;
- no economy redesign;
- no workforce redesign;
- no road redesign;
- no progression redesign;
- no scenario redesign;
- no rendering redesign;
- no camera redesign;
- `SAVE_VERSION = 8`;
- no push.

Do not automatically propose another audit after this step.

The next NOVA step, if any, should begin from a **new explicit product objective**, not another foundation-quality audit.

---

# Foundation Freeze Document (as-built)

## 1. Objective

Formally freeze the current NOVA gameplay foundation after the product gates
10DA–10DD, record the frozen contracts, the deferred directions and the
do-not-reopen list, audit architecture/documentation/test drift, and hand off.
`src/` behavior is unchanged: the only source edits are two stale documentation
comments; the only test/e2e edits are one stale test name and a deterministic
E2E synchronization hardening.

## 2. Frozen Foundation (inventory)

**Frozen contracts** (future work must not silently change):

- tick pipeline order and phase responsibilities (`domain/simulation/step.ts`);
- economy constants and rules (below);
- workforce assignment/mobility rules;
- road lifecycle, cost, network and access rules;
- progression conditions and objective semantics;
- `SAVE_VERSION = 8`, migration chain and canonical hashing;
- domain/application -> Three.js boundary (domain and application are
  Three.js-free; the renderer consumes a `RenderSnapshot`);
- HUD non-occlusion default and the fixed camera framing (10CZ/10DB);
- the 11 authored scenarios and the closed requirement-kind set.

**Refactorable implementation details** (no product behavior change): internal
module structure, private helpers, non-exported constants, test organization,
e2e harness details, comment wording.

**Explicitly deferred directions**: production economy (10CW), settlement
growth (10CL), external/world demand (10CM), transport/vehicles/technology
(roadmap Phases 9/11/12), camera/board framing (10DB), visual-tier expansion
(10DC).

## 3. Economy Contracts

- Farm worker +1 / Well worker +1 / Workshop worker +2 Material per tick
  (income is **derived**, credited before commands, bypasses the production cap).
- Workshop production 2 Material/tick (staffed + operational + road-accessible),
  upkeep 1 Material/tick when staffed.
- Material production inflow is capped at 25 per operational Workshop; the
  stock itself is never clamped retroactively; income may exceed the cap.
- Storage hub capacities Food 50 / Water 30 / Material 40; only Material
  overflow enters it; 15 Material is the protected floor, released for **building
  commands only**.
- Affordability: `validatePlacement` accepts | stock + this-tick stored
  production + income completes it | the protected reserve completes it
  (buildings only). Road affordability never uses the reserve.
- Costs: building 25 Material (Workshop +1 Water, one-off), road 5 per cell.
- Food/Water: Farm 2 Food/tick, Well 2 Water/tick, colonist needs 1 Food and
  1 Water/tick; starvation is terminal (all-or-nothing feeding).

## 4. Workforce Contracts

- One colonist holds exactly one job; employment is mobility-gated (residence
  must reach the workplace through the operational road network).
- Automatic deterministic assignment by distance, with manual override
  (`reassignColonist`); deterministic tie-breaking.
- Production/income require an operational, road-accessible, staffed workplace;
  a crewed colonist is skipped by production/income for the construction tick.
- Construction crews are manual (`assignConstructionCrew`) and save-persisted.

## 5. Road / Access Contracts

- One road per cell; placement is atomic and costs 5 normalized cells; roads
  progress over 2 ticks (1 with a crew) and are operational afterwards.
- Operational roads form networks (orthogonal adjacency) that grant building
  road access and enable workplace production; mobility connectivity between a
  residence and a workplace gates employment.
- No pathfinding, routing, vehicles, transit or logistics simulation.

## 6. Progression Contracts

- Wilderness: population 0.
- Settlement: population >= 1, Food production >= consumption, an operational
  road network exists.
- Village: population >= 2, Water capacity >= 2 (one staffed Well), Food
  balanced.
- Town: Village conditions plus a staffed operational Workshop.
- Progression is **derived only** (never stored/persisted/hashed); scenario
  objectives are declarative and use exactly five requirement kinds
  (`stage`, `population`, `waterCapacity`, `foodBalance`, `building`).

## 7. Persistence Contracts

- `SAVE_VERSION = 8`; `MIGRATABLE_SAVE_VERSION = 7`; migrate v4-v7 forward.
- Persisted: config, time, resources, storage, buildings, colonists, roads,
  counters (8 top-level state keys). Derived: progression, objectives,
  scenario identity, incomes, capacities, coverage (never persisted or hashed).
- Deterministic canonical hashing over canonical state.

## 8. Product UX Contracts

- HUD default-open with a deterministic non-occlusion fit (0 playable cells
  covered at 1280x800 / 420x740 / 360x640); explicit HIDE/SHOW wins.
- Objective label + constraint, `Objective in progress — m / n (blockers)` /
  `Objective complete` / `Objective failed`; palette, simulation controls,
  scenario select and status line remain reachable at all viewports.
- Hover names the cell, the cost and the shortfall cause; refusals are specific;
  inspection exposes the authoritative production/income/upkeep values.

## 9. Visual Contracts

- Dark restrained maquette: background `#0b0e13`, ground `#14181f`, grid
  `#2a3140`, gold `#d9a441`, status teal `#7fd1c8`, blocked red `#d98f8f`.
- Building identity (`entityViews.ts`): Residence box gold, Farm box green,
  Workshop cylinder staffed blue / vacant dim blue and taller, Well cylinder
  teal; under construction = short grey; roads grey then slate with a
  connection-derived marking; colonists teal markers.
- No bloom, gradients, holograms, decorative roads, camera mechanics or
  animations. Fixed camera, only `aspect` changes on resize.

## 10. Scenario Baseline

11 authored scenarios (frozen ids, in catalogue order): `first-settlement`,
`water-constraint`, `industrial-expansion`, `water-reserve-industry`,
`spatial-efficiency`, `population-expansion`, `recovery`, `housing-composition`,
`town-threshold`, `town-balance`, `town-connection` (+ the terrain-chokepoint
fixture). Each has a label, framing sentence, starting constraint and a closed
requirement set; failure paths exist (starvation; unresolved recovery; stranded
housing-composition).

## 11. Deferred Directions

| Direction | Decision | Evidence |
| --- | --- | --- |
| Production economy (Phase 8) | DEFERRED | 10CW — no input/chain/sink/specialization/efficiency decision |
| Settlement growth (Phase 10) | DEFERRED | 10CL/10CM/10CN — repeats existing pressure, no qualitative break |
| External/world demand | DEFERRED | 10CM — homogeneous board, no documented external concept |
| Transport movement/logistics (Phase 9) | BLOCKED | 10CX — needs a movement reason (Phase 8 chain or external demand) |
| Vehicles (Phase 11) | BLOCKED | needs transport demand (docs/29 rule 17) |
| Technology (Phase 12) | BLOCKED | needs constraints worth solving (docs/29 rule 18) |
| Camera/board framing | ACCEPTED/FROZEN | 10DB — outer-column clipping at narrow, centre + all scenario cells reachable |
| Visual-tier expansion | NOT JUSTIFIED | 10DC — no Class-A presentation problem |

## 12. Do-Not-Reopen-Without-Evidence List

1. **Generic production-chain expansion** — 10CW measured no input, no chain,
   no sink and no new decision.
2. **Growth mechanics** — 10CL/10CM/10CN found no scale-induced qualitative
   break and no player-visible sink/demand.
3. **External/world demand** — 10CM found no documented world concept with a
   causal role.
4. **Broad economy expansion / new currency / markets / pricing** — Phase 7
   completed the income -> expenditure -> affordability loop; no missing
   decision (10CU/10CT/10CS).
5. **New transportation systems** — 10CX: network + accessibility exist;
   movement/logistics has no justified reason.
6. **Camera redesign** — 10DB froze the fixed framing as an accepted
   characteristic.
7. **Visual-tier expansion (post-processing/shadows/animations)** — 10DC found
   the presentation healthy; a new tier would be a deliberate art decision.
8. **Generic gameplay-depth audits** — 10DD measured meaningful spatial,
   economic, workforce, progression and temporal decisions; another audit would
   rediscover the same conclusion.
9. **HUD redesign** — 10CZ/10DA/10DC: non-occlusion, hierarchy and identity are
   coherent.

## 13. Extension Seams

Where future product work could attach without destabilizing the foundation
(documented, not selected, not ranked):

- **Additional authored content** — new scenarios/objectives using the existing
  five requirement kinds and existing domain constructors (data-only seam,
  already exercised by every scenario).
- **Presentation/content expansion** — richer rendering that consumes the
  existing `RenderSnapshot` without changing simulation rules (renderer is
  isolated by the Three.js boundary guard).
- **A new product phase above the simulation** — a new explicit product
  objective that consumes existing derived queries (progression, resources,
  workforce, affordances) without altering economy/workforce/road/progression
  contracts.
- **Mode-level framing** — the controller + scenario assembler already isolate
  initial-state assembly, so a different starting-state/mode would not change
  the simulation.

Anything that changes simulation rules (a new decision dimension) requires a
new explicit product objective first, per the freeze declaration.

## 14. Architecture Audit

Clean. `src/domain/**` and `src/application/**` contain **no** Three.js imports
(now enforced by `tests/foundationFreezeAudit.test.ts`); the renderer consumes
an immutable `RenderSnapshot`; progression/objective/scenario state is derived
and never persisted or hashed; persistence is isolated in
`application/persistence`; scenarios are data assembled with domain
constructors; the tick pipeline is deterministic. No accidental coupling was
found during the roadmap. No refactor performed.

## 15. Documentation Audit

Fixed only factual drift that conflicts with the frozen foundation:

- `src/application/queries/objective.ts` — comment said `SAVE_VERSION stays 7`;
  corrected to 8.
- `src/application/queries/progression.ts` — comment said `SAVE_VERSION stays 7`;
  corrected to 8.
- `tests/scenarioContentClosureAudit.test.ts` — test name said "all 8 scenarios"
  while the test already iterates every catalogue scenario; renamed to "every
  scenario".

Historical roadmap step documents (`docs/roadmap/Step*.md`) were deliberately
left as historical records; `docs/26-roadmap.md` remains the authoritative
phase list (Phases 8-12 unimplemented/deferred). No stylistic rewrites.

## 16. Test Contract Audit

Existing coverage already protects the economy, affordability, reserve,
workforce, mobility, roads, progression, scenarios, persistence, hashing and
player-facing constraints (117 files / 1872 tests). `tests/foundationFreezeAudit.test.ts`
(10 tests) adds exactly the protections that were not pinned together:

- persistence: `SAVE_VERSION = 8`, migration chain `[4,5,6,7]`, 8-key state,
  derived state absent from the save, save/load hash round-trip;
- economy constants (income/upkeep/cap/reserve/storage/needs/costs);
- progression boundary (Wilderness -> Settlement, Town = Staffed Workshop);
- the frozen 11-scenario id list and the closed requirement-kind set;
- deterministic replay to the same hash;
- **the domain/application Three.js boundary** (source scan).

No superficial assertions or depth scores were added.

## 17. E2E Stability Result

The 10DD-observed race is the known single-hover wait: several older suites
waited for a generic `ready` after ONE `mouse.move` while the simulation clock
kept ticking, so a per-tick causal status could overwrite the hover. This is
pure test synchronization, not a product problem (the same interaction works
when the mouse keeps moving, which real players do). Deterministic hardening was
applied to the two remaining suites with that pattern (`e2e/jobsRun.mjs`,
`e2e/reassignRun.mjs`): the placement/road waits now re-issue the pointer move
while waiting. Result: `jobs` 3/3 PASS and `reassign` 2/2 PASS. No gameplay
behavior changed.

## 18. Final Freeze Declaration

> **The current NOVA foundation is frozen.** The economy, workforce, roads/
> access, progression, persistence, product UX, visual language and the 11
> authored scenarios are the established product baseline. Future gameplay
> changes require a new product objective and explicit evidence; they must not
> be introduced as a continuation of the foundation audit sequence. A later
> phase (production, growth, transport, vehicles, technology) is not committed
> by its presence in the roadmap; each remains deferred/blocked until evidence
> satisfies its reopening terms.

## 19. Validation

- focused: `tests/foundationFreezeAudit.test.ts` — **10/10 PASS**
- full Vitest: **1872 passed / 0 failed (117 files)** (10DD baseline 1862 + 10)
- typecheck: PASS; lint: PASS; production build: PASS; `git diff --check`: clean
- browser (headed): product audit PASS; housing, progression, town-gate,
  upkeep, water, road, spatial-readability, industrial, readability PASS;
  `jobs` 3/3 and `reassign` 2/2 PASS after hardening; viewports 1280x800 /
  420x740 / 360x640
- GPU/WebGL2: PASS — NVIDIA GeForce RTX 3070 (unmasked), WebGL2, hardware path,
  zero console/page errors
- `SAVE_VERSION` remains **8**

## 20. Scope / Diff Audit

- `src/application/queries/objective.ts` — stale comment 7 -> 8 (documentation
  only).
- `src/application/queries/progression.ts` — stale comment 7 -> 8
  (documentation only).
- `tests/scenarioContentClosureAudit.test.ts` — stale test name corrected
  (no assertion changed).
- `tests/foundationFreezeAudit.test.ts` — new freeze guard (10 tests).
- `e2e/jobsRun.mjs`, `e2e/reassignRun.mjs` — E2E synchronization hardening
  (test only).
- `docs/roadmap/Step10DE.md` — this freeze document (force-added).
- No gameplay, economy, workforce, road, progression, scenario, persistence,
  rendering or camera change. `SAVE_VERSION = 8`. `AGENTS.md` untouched;
  `docs/roadmap/Step10BO - Copy.md` and `docs/roadmap/Step10BT.md` are absent
  (not recreated); no generated artifacts committed.

Commit: `Step 10DE: Freeze NOVA Foundation and Product Handoff`
