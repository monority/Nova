# Step 10DA — Product Experience Audit II

## Objective

Perform a second evidence-based player-experience audit of NOVA after Step 10CZ.

Step 10CY identified a real Class-A UX problem: HUD occlusion of playable board cells.

Step 10CZ fixed that issue and repaired the browser-test baseline.

The purpose of this step is **not to invent a new gameplay mechanic** and **not to restart the roadmap audit**.

The purpose is to determine whether another concrete, player-visible product problem now exists that is worth addressing.

If a meaningful product problem is found, document the smallest concrete next improvement.

If no meaningful problem is found, explicitly freeze product work rather than manufacturing another task.

---

## Required context

Read before doing anything:

- `docs/roadmap/Step10CY.md`
- `docs/roadmap/Step10CZ.md`
- `docs/26-roadmap.md`
- current product/UI code
- current E2E suite
- current scenario catalogue
- current objective/progression implementation

Treat the current HEAD as authoritative.

Do not assume older audit conclusions still hold without checking them against current code.

---

# 1. Reconstruct the current player experience

Trace the actual player journey from a fresh launch through the available scenarios:

1. initial world presentation;
2. scenario selection;
3. objective discovery;
4. first placement;
5. housing / population;
6. workforce assignment;
7. Food / Water / Material feedback;
8. road placement and accessibility;
9. Workshop / production;
10. construction affordability;
11. progression;
12. Town;
13. scenario completion;
14. post-completion state.

Use the real UI and browser behavior.

Do not evaluate hypothetical future mechanics.

---

# 2. Verify the 10CZ fix as part of the audit

Do not simply trust the previous report.

Measure:

- playable-cell coverage at:
  - 1280×800
  - 420×740
  - 360×640
- HUD open state;
- HUD explicit hide/show behavior;
- board pointer interaction;
- objective visibility;
- palette visibility;
- placement hover;
- inspection interaction.

The expected result is:

> 0 playable cells blocked by the HUD at all required viewports.

If this fails, stop the audit and report the regression instead of looking for another product issue.

---

# 3. Audit player-facing comprehension

Measure whether the interface communicates the actual simulation facts at the moment they matter.

Check:

### Objectives

- Can the player immediately identify what they are trying to accomplish?
- Is the current constraint visible?
- Is completion state obvious?
- Is failure/rejection understandable?

### Economy

Check real flows involving:

- Food;
- Water;
- Material;
- workforce income;
- Workshop production;
- Workshop upkeep;
- construction spending;
- road spending;
- protected Storage reserve.

Do not merely check whether values exist.

Check whether a player can understand:

> what changed → why it changed → what action is available.

### Workforce

Check:

- vacant jobs;
- staffed jobs;
- reassignment;
- production consequences;
- Food/Water/Material trade-offs;
- Town workforce review.

### Spatial systems

Check:

- building placement;
- road placement;
- connectivity;
- accessibility;
- inaccessible operational buildings;
- construction feedback;
- hover feedback.

---

# 4. Audit interaction quality

Look specifically for:

- stale hover state;
- misleading status text;
- interactions that require unexplained hidden knowledge;
- controls that appear clickable but do nothing;
- actions whose rejection reason is unclear;
- UI state that becomes stale after commands;
- feedback appearing too late;
- feedback disappearing too quickly;
- pointer/event conflicts;
- viewport-specific interaction failures;
- mobile/narrow viewport interaction traps.

Do not count cosmetic preferences as product defects.

Only record a problem if it affects actual comprehension, interaction, decision-making, or usability.

---

# 5. Audit scenario quality

Inspect the current 11 scenarios.

For each scenario determine:

- what player decision it teaches/tests;
- whether that decision is visible;
- whether the scenario can be understood without external explanation;
- whether completion is clear;
- whether the scenario has a meaningful failure/recovery path;
- whether scenarios meaningfully differ;
- whether any scenario is redundant;
- whether any scenario has a hidden soft-lock;
- whether any scenario relies on accidental engine behavior.

Use browser execution where practical.

Do not redesign the scenario system in this step.

---

# 6. Audit responsive product behavior

Run actual headed browser checks at:

- 1280×800
- 420×740
- 360×640

Measure, rather than visually guessing:

- board visibility;
- HUD bounds;
- playable-cell coverage;
- objective visibility;
- palette visibility;
- button/control reachability;
- status visibility;
- panel overflow;
- body overflow;
- accidental overlap;
- usable board area.

The 10CZ non-occlusion result must remain intact.

---

# 7. Audit visual hierarchy

Evaluate the actual rendered product, not source-code aesthetics.

Check:

- what attracts attention first;
- whether objective/status/economy compete with the board;
- whether important warnings are distinguishable;
- whether the board remains the primary spatial workspace;
- whether panels are too dense;
- whether information is repeated unnecessarily;
- whether decorative UI competes with simulation information;
- whether the futuristic/maquette direction remains coherent.

Do not propose a visual redesign merely because another aesthetic would be preferable.

Aesthetic preference alone is not sufficient evidence for a step.

---

# 8. Audit product friction

Identify interactions that require unnecessary effort.

Examples of evidence:

- repeated clicks for one obvious action;
- unnecessary panel opening/closing;
- unclear relationship between two controls;
- information available only in inspection when it is required for an immediate decision;
- feedback that requires mentally combining unrelated UI fields;
- scenario instructions that omit a necessary constraint;
- placement decisions requiring trial-and-error because relevant information is hidden.

Only count measurable or reproducible friction.

---

# 9. Re-test the known product risks

Explicitly verify that the following are no longer problems:

### 10CY UX-1

HUD blocks playable cells.

Expected: resolved.

### 10CY UX-2

Housing test accepted stale `ready` state.

Expected: resolved by target-cell-specific assertion.

### Phase 7 verification drift

Expected: current browser suites all aligned with the income model.

### SAVE_VERSION drift

Expected:

```text
SAVE_VERSION = 8
```

No migration should be necessary.

---

# 10. Classify findings

Do not rank or score findings.

Classify each finding as exactly one of:

### A — Meaningful product problem

Player-visible and reproducible.

A concrete improvement is justified.

### B — Minor friction

Real but not sufficient to justify a dedicated implementation step.

Record it for later.

### C — No problem

The current behavior is coherent and intentional.

### D — New gameplay evidence

A product experience issue reveals a genuinely new gameplay problem.

If D appears, document it carefully but do not implement a gameplay mechanic in this step.

---

# 11. Decision gate

At the end, make exactly one of:

## OUTCOME A — PRODUCT IMPROVEMENT FOUND

Use this only if at least one Class-A problem is reproducible.

Define:

- exact problem;
- reproduction;
- affected viewport/scenario;
- player impact;
- root cause;
- smallest coherent fix;
- explicit non-goals;
- validation required for the next step.

Do not implement the fix in 10DA.

## OUTCOME B — PRODUCT EXPERIENCE IS HEALTHY

Use this if no Class-A problem remains.

Do not invent a roadmap item.

Explicitly state:

- what was tested;
- what is working;
- remaining minor observations;
- why they do not justify a dedicated step;
- what evidence would justify reopening product work.

## OUTCOME C — NEW GAMEPLAY EVIDENCE

Use this only if the audit reveals a genuine gameplay limitation not already covered by the frozen roadmap audits.

Document the evidence without implementing a new mechanic.

---

# 12. Strong anti-scope rules

Do NOT:

- add gameplay mechanics;
- add resources;
- add buildings;
- add currency systems;
- add transport simulation;
- add growth;
- add technology;
- add vehicles;
- add quests;
- add automation;
- add persistence fields;
- change SAVE_VERSION;
- redesign the scenario framework;
- redesign the entire HUD;
- perform a speculative visual overhaul;
- create a new abstraction merely to support the audit;
- weaken existing tests;
- delete failing assertions;
- alter simulation rules to make the UX appear better.

This is an **audit step**, not an implementation step.

---

# 13. Tests / artifacts

Create:

```text
tests/productExperienceAuditII.test.ts
docs/roadmap/Step10DA.md
```

The test file should contain deterministic checks for the measurable findings produced by the audit.

Do not create tests for subjective aesthetic opinions.

`Step10DA.md` must contain:

1. prompt/specification;
2. current product reconstruction;
3. 10CZ verification;
4. player journey findings;
5. comprehension findings;
6. interaction findings;
7. scenario findings;
8. responsive measurements;
9. visual/product findings;
10. classified findings;
11. decision gate;
12. next-step recommendation only if justified;
13. explicit non-goals;
14. validation results.

---

# 14. Validation

Because this is an evidence/audit step, perform the following:

### Focused

```bash
pnpm vitest run tests/productExperienceAuditII.test.ts
```

### Full

```bash
pnpm vitest run
```

### Static

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
git diff --check
```

### Browser

Run the relevant headed E2E/product flows.

At minimum verify:

- scenario selection;
- placement;
- housing;
- workforce;
- roads;
- progression;
- Town;
- product audit;
- all currently maintained browser suites.

Required viewports:

```text
1280×800
420×740
360×640
```

### GPU

Run the existing headed GPU/WebGL2 verification.

Expected hardware path:

```text
NVIDIA RTX 3070
WebGL2
hardware accelerated
```

Do not claim GPU validation unless it actually ran.

---

# 15. Final diff audit

Before committing:

```bash
git status --short
git diff --stat
git diff --check
git diff --name-only
```

Confirm that only intended files changed.

Do NOT touch:

```text
AGENTS.md
docs/roadmap/Step10BO - Copy.md
docs/roadmap/Step10BT.md
```

Do not modify unrelated project files.

---

# 16. Commit

If the implementation is complete and validation passes, commit:

```text
Step 10DA: Product Experience Audit II
```

Do not push.

---

# Final report

Return:

- outcome A/B/C;
- concrete findings;
- evidence;
- affected scenarios/viewports;
- whether a next implementation step is justified;
- tests;
- browser;
- responsive;
- GPU;
- typecheck;
- lint;
- build;
- diff-check;
- commit hash;
- changed files;
- confirmation that no gameplay/persistence/SAVE_VERSION changes were made.

The key principle:

> Do not create work because NOVA needs a next step.
> Create work only when the player experience provides evidence that the next step is necessary.

---

## As-Built

Audit only. `src/` is unchanged; the artefacts are
`tests/productExperienceAuditII.test.ts` (deterministic measurable facts) and
this record. Evidence: the headed product walkthrough
(`e2e/productAuditRun.mjs`), the full maintained browser suite set, and the
GPU/WebGL2 run.

### Current Product Reconstruction

Fresh launch to completion, from the real UI:

- **World + HUD**: paused 12x12 board, NOVA header with HIDE/SHOW, inspection
  panel, PLAY/PAUSE/STEP + speed, the `Residence/Farm/Workshop/Well · 25` and
  `Road · 5` palette, scenario select, Stage/Next + checklist + objective.
- **Scenario select** loads an authored start state and shows
  `Scenario — <name>: <objective>`; the objective label **and** constraint are
  rendered on separate lines.
- **Objective discovery**: `Objective in progress — m / n (blockers)`; the
  checklist shows each unmet condition with its measured detail.
- **First placement**: the hover names the cell, the exact cost and (when
  covered) the same-tick/income/reserve breakdown, or the precise refusal.
- **Housing/population, workforce, Food/Water/Material, roads/access,
  Workshop/production, affordability, progression, Town, completion**: all
  exercised through the existing browser suites (housing, jobs, upkeep,
  farm-well-allocation, water, production, transport, road, progression,
  town-gate) — all green.
- **Post-completion**: `Objective complete` persists; the Town capability line
  names the active workforce review; no misleading "next" affordance.

### 10CZ Verification

Re-measured, not trusted:

| Viewport | HUD panel | Playable cells covered | HUD default | Objective | Palette |
| --- | --- | --- | --- | --- | --- |
| 1280x800 | 286px | **0** | open | visible | usable |
| 420x740 | 244px | **0** | open | visible | usable |
| 360x640 | 210px | **0** | open | visible | usable |

No body/panel overflow, positive canvas at all three viewports, zero
console/page errors. Explicit HIDE/SHOW and the collapsed board-clickability are
verified by `e2e/spatialReadabilityAudit.mjs` (all pass). Hover, placement and
inspection work at every viewport via the product walkthrough. **The 10CZ
non-occlusion result is intact.**

### Player Journey Findings

| Stage | What the player sees | Verdict |
| --- | --- | --- |
| Launch/scenario | scenario framing status, objective + constraint | clear (C) |
| Objective state | `in progress m/n (blockers)` / `Objective complete` / `Objective failed — the colony is gone` | clear (C) |
| Inspect | building type, status, workers, upkeep, production/income | clear (C) |
| Construct | labelled costs, hover cost + shortfall + cause | clear (C) |
| Workforce | `jobs x/y`, staffed/vacant, `Move worker` with eligible targets and mode | clear (C) |
| Food/Water/Material | HUD rows, per-tick rates, `served`, production-blocked-by-road, causal status line | clear (C) |
| Roads/access | `water: served / NOT served`, `N workplaces reachable` | clear (C) |
| Progression/Town | Stage/Next, checklist, blockers, Town capability line | clear (C) |
| Completion | persisted `Objective complete`, scenario boundary | intentional (C) |

### Comprehension Findings

- **Objective**: unambiguous; completion and failure strings are distinct and
  persistent.
- **Economy** (`what changed → why → what action`): the causal status line names
  the cause (`N colonists consumed N food`, `N worker produced 2 material`,
  `upkeep 1` / `upkeep shortfall — paid 0/1`, `Reserve +N material`); the hover
  names cost, shortfall and why (material, water, terrain, occupancy); the
  inspection names per-building production, income, upkeep and storage. The
  deterministic numbers are pinned by the new test (income 1/1/2, upkeep 1,
  cap 25, reserve 15, hub 50/30/40).
- **Workforce**: vacant vs staffed and the manual/automatic mode are visible;
  the reassignment targets list eligibility. The Farm/Well/Workshop trade-off
  is legible in the inspection rows.
- **Spatial**: road access vs mobility connectivity vs service are distinguished
  in the placement preview and inspection.
- No comprehension defect was found (C).

### Interaction Findings

- Hover feedback always names the target cell (`cell x,y …`), so feedback can
  no longer be confused with a stale prior cell.
- Refusals are specific (`insufficient material (a/b)`, `insufficient water
  (a/b)`, `blocked by terrain`, `occupied`, `road already exists here`).
- The palette exposes `aria-pressed`; the HUD toggle exposes `aria-expanded`
  and keeps the status line visible when collapsed.
- **Minor (B):** `e2e/roadAffordabilityRun.mjs` failed once during this audit's
  sweep with an empty status (`shortfall feedback bad: ""`) and then passed on
  two consecutive re-runs. This is the known single-hover/causal-status race in
  older E2E scripts (hardened in 10CZ for housing/food/upkeep), not a product
  defect: the same fixture re-run passes deterministically. Recorded as test
  reliability debt.

### Scenario Findings

All 11 scenarios load and are legible without external explanation; each has a
label, a framing sentence, a starting constraint and a closed-set requirement.

- `first-settlement`, `spatial-efficiency` — introduction/opening economy;
- `water-constraint`, `recovery` — Food/Water pressure and a road repair with a
  real terminal failure path;
- `industrial-expansion`, `water-reserve-industry` — the storage/clamp and the
  Water->Material conversion;
- `population-expansion`, `housing-composition` — housing composition and two
  disconnected networks (a genuine spatial decision, including a stranded
  failure path);
- `town-threshold`, `town-balance`, `town-connection` — Town via a staffed
  Workshop plus Water/Food conditions.

No scenario was found redundant, soft-locked, dependent on accidental engine
behaviour, or unclear about completion. The catalogue covers introduction,
learning, pressure, mastery and variety.

### Responsive Measurements

Measured board bounds (cell centres): 1280x800 x∈[310,970] y∈[255,619];
420x740 x∈[-95,515] y∈[236,572]; 360x640 x∈[-84,444] y∈[204,495].

- HUD occlusion: **0** cells at all three viewports (10CZ intact).
- Overflow: `scrollWidth <= clientWidth + 1` at all three; canvas positive.
- Controls: palette, scenario select, HUD toggle and hover/placement work at all
  three viewports.
- **Minor (B):** at 420/360 the 12-wide board is wider than the viewport
  (`minX` -95 / -84, `maxX` 515 / 444), so the extreme columns clip off-screen
  under the fixed camera. The board centre and every scenario's central
  decision cells remain reachable, and all narrow-viewport suites pass; the
  clipping predates this audit and is the fixed-camera framing, not HUD
  occlusion. Recorded as a known narrow-viewport limitation.

### Visual / Product Findings

- The board remains the primary workspace: the HUD is a fitted top-left panel
  (286/244/210px) that no longer overlaps it.
- Warnings are distinguishable: `#ui-blocked` is red-tinted, the status line is
  teal, objective/constraint are gold, stats are neutral.
- Information is not duplicated: economic facts live in the HUD rows and the
  inspection, each with one authoritative source.
- No decorative element competes with simulation information; the maquette
  direction is coherent (dark ground, gold accents, luminous road/selection
  treatment).
- No visual defect was found that affects comprehension (C). Aesthetic
  preferences were deliberately not recorded.

### Classified Findings

- **A — meaningful product problem: none reproduced.**
- **B — minor friction / known limitations (recorded, no dedicated step
  justified now):**
  - B1 narrow-viewport board clipping (fixed camera; central decision cells
    still reachable; all narrow suites pass).
  - B2 `roadAffordabilityRun` transient empty-status failure (E2E hover race,
    passes on re-run).
- **C — no problem:** objective/status feedback, economy causality, workforce
  legibility, roads/access, scenario catalogue, responsive HUD behaviour,
  visual hierarchy, persistence (`SAVE_VERSION` 8).
- **D — new gameplay evidence: none.** No product-experience issue revealed a
  gameplay limitation not already covered by the frozen roadmap audits.

### Decision Gate

**OUTCOME B — PRODUCT EXPERIENCE IS HEALTHY.**

No Class-A problem is reproducible. The 10CY problem was fixed and verified;
the comprehension, interaction, scenario, responsive and visual checks all
pass; the two remaining observations are minor and pre-existing (B1) or test
reliability (B2).

### Next-Step Recommendation

None. No implementation step is justified by this audit. In particular: do not
add gameplay, resources, buildings, transport, growth, technology or quests;
do not redesign the HUD, scenario framework or camera speculatively. Reopening
product work would require new evidence:

- a reproducible Class-A interaction/comprehension defect (not a preference);
- or a decision that narrow-viewport board clipping now matters as a product
  goal (which would justify a camera-fit change, not a mechanic);
- or B2 recurring often enough to treat the E2E hover race as a maintenance
  problem worth a focused test-hardening step.

### Explicit Non-Goals

No gameplay mechanic, resource, building, currency, transport, growth,
technology, vehicle, quest, automation or persistence field; no
`SAVE_VERSION` change; no scenario-framework redesign; no full-HUD redesign; no
speculative visual overhaul; no new abstraction to support the audit; no
weakened tests.

### Validation

- focused: `tests/productExperienceAuditII.test.ts` — **15/15 PASS**
- full Vitest: **1829 passed / 0 failed (113 files)**
- typecheck: PASS; lint: PASS; production build: PASS; `git diff --check`: clean
- product audit (headed): PASS — 0 covered cells at 1280x800 / 420x740 /
  360x640, HUD open, objective/palette usable, zero console/page errors
- browser suites (headed): housing, readability, progression, industrial,
  upkeep, jobs, food, crew, reassign, spatial-readability, road,
  road-affordability (passed on re-run; see B2), reserve-affordability, water,
  production, transport, town-gate, terrain, terrain-readability, resource,
  temporal, workforce-contention, farm-well-allocation — all pass
- GPU/WebGL2: PASS — NVIDIA GeForce RTX 3070 (unmasked), WebGL2, stable scene,
  zero console/page errors
- `SAVE_VERSION` remains **8**; no gameplay or persistence change was made.

Commit: `Step 10DA: Product Experience Audit II`
