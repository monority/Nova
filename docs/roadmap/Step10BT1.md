# NOVA — Step 10BT — Workforce Allocation Decision Expression

## Context

Step 10BS is complete and committed as `b64c058`.

It established the first genuinely meaningful existing economic decision in NOVA:

> **At five workers, Farm/Well workforce allocation creates a persistent, reversible Food ↔ Water trade-off.**

Measured outcomes include:

* Farm-heavy: `3 Farms / 2 Wells`;
* Well-heavy: `2 Farms / 3 Wells`;
* different Food and Water headroom;
* the difference persists;
* the difference is reversible;
* manual reassignment can intentionally produce the different allocations.

Other candidate loops were rejected as insufficient:

* growth-first vs production-first converges after eight ticks;
* Workshop vs Residence under the tested three-worker constraint produced no meaningful downstream investment loop;
* Construction Crew creates a temporary productive loss but recovers deterministically.

Therefore:

**Do not add a new economic mechanic.**

The current objective is to determine whether the existing Farm/Well decision is actually expressed well enough in the product for a player to understand and act on it.

---

# Objective

Turn the existing Farm/Well workforce trade-off into a clearly understandable player-facing decision **without changing the underlying simulation rules**.

The player should be able to understand:

1. that workforce is limited;
2. which workers are assigned;
3. which productive workplaces are vacant;
4. why a workplace is vacant;
5. how changing an assignment changes Food/Water production;
6. what the current Food and Water headroom is;
7. that the allocation can be changed manually;
8. that the consequence is economic rather than merely cosmetic.

This is an **expression/UX step**, not a workforce redesign.

---

# Core design principle

The system already contains the mechanic.

Do not invent a new mechanic to make it visible.

The goal is:

> **Expose the causal chain that already exists.**

The intended chain is approximately:

`limited workforce → Farm/Well assignment → production mix → Food/Water headroom → future admission/sustainability`

The UI should make this chain understandable without requiring the player to infer it from unrelated numbers.

---

# Mandatory AUDIT before implementation

Inspect the current implementation and identify:

* authoritative workforce assignment state;
* `getWorkplaceWorkforceDiagnosis()` from 10BQ;
* workplace inspection UI;
* existing worker assignment controls;
* current Food display;
* current Water capacity/balance display;
* existing production/resource feedback;
* existing responsive HUD;
* current RenderSnapshot/UI architecture;
* any existing derived economic queries.

Do not duplicate simulation predicates in the UI.

Do not create a second source of truth.

Reuse authoritative derived selectors/queries wherever possible.

---

# UX problem to solve

Construct a representative five-worker settlement where both of these states are possible:

### State A — Farm-heavy

```text
3 Farms
2 Wells
```

### State B — Well-heavy

```text
2 Farms
3 Wells
```

The simulation rules must remain identical.

The UI must make the resulting difference understandable.

Do not label either configuration as "optimal", "better", "recommended", "correct", or similar.

The player should instead see factual consequences such as:

* number of staffed Farms;
* number of staffed Wells;
* vacant eligible workplaces;
* Food production;
* Water production;
* Food balance/headroom;
* Water capacity/headroom;
* worker assignment state.

---

# UX investigation

Before changing UI, inspect what already exists.

Determine whether the current product already exposes enough information.

If information is already visible but poorly connected, prefer improving hierarchy/wording/context over adding another panel.

Avoid:

* dashboards;
* cards;
* modal management screens;
* generic strategy-game overlays;
* large new panels;
* decorative UI;
* duplicated resource statistics.

NOVA should remain a compact, readable simulation interface.

---

# Required player-facing behavior

## 1. Workforce state

When inspecting a productive workplace, the player must be able to understand:

* whether it is staffed;
* who is assigned;
* if vacant, why;
* whether an eligible worker exists;
* whether all eligible workers are already assigned elsewhere.

10BQ's authoritative diagnosis must remain the source.

Do not rewrite its semantics.

---

## 2. Assignment action

The existing manual assignment mechanism should remain the primary action.

The player must be able to:

* inspect a worker/workplace;
* change a manual assignment;
* observe the resulting assignment;
* see the corresponding economic consequence.

Do not add priority sliders.

Do not add workforce classes.

Do not add professions.

Do not add worker specialization.

---

## 3. Economic consequence

After changing a Farm/Well assignment, the UI must make the resulting change discoverable.

Use existing resource displays and derived production information where available.

The player should be able to answer:

> "If I move this worker from the Farm to the Well, what changed?"

The answer should be observable from the current UI without requiring source-code knowledge.

Do not introduce speculative projections or forecasts.

Show actual current state/production, not predicted future state, unless a projection already exists and is authoritative.

---

# 4. Food / Water relationship

Inspect the current Food and Water presentation.

Where appropriate, improve the information hierarchy so the player can distinguish:

* current stock;
* production;
* consumption;
* Water capacity;
* current Water headroom/balance;
* relevant workforce contribution.

Do not alter the underlying definitions.

Recall the intentional semantic distinction:

* Water **service** determines whether a Residence is served;
* Water **capacity** determines how much population the colony can support;
* Well staffing affects Water production/capacity according to existing rules;
* Water service does not require Well staffing.

Do not collapse these concepts into a single "Water" metric.

---

# 5. Vacancy / contention

Use the existing 10BQ diagnosis.

For example, the UI may communicate a state equivalent to:

> `Worker — none · no worker available: all eligible workers assigned`

Exact wording may be refined after inspecting the existing UI, but preserve the causal distinction.

Do not turn every vacancy into "workforce shortage".

A workplace can be:

* under construction;
* inaccessible;
* eligible with an available worker;
* eligible but all eligible workers assigned;
* staffed.

Those states must remain distinguishable.

---

# 6. Decision readability

The player should not need to memorize hidden rules.

For the representative five-worker fixture, verify that a player can understand:

### Farm-heavy

* 3 Farms staffed;
* 2 Wells staffed;
* resulting Food/Water state.

### Well-heavy

* 2 Farms staffed;
* 3 Wells staffed;
* resulting Food/Water state.

Do not call one better.

The point is that they are **different controllable economic states**.

---

# Spatial expression

10BR found no material difference in the controlled distributed-geometry fixture.

Do not add a logistics mechanic to fix this.

Instead, verify whether the existing spatial placement and road-network information is understandable when workforce allocation is being changed.

At minimum test:

* compact productive area;
* separated productive area on the same eligible network;
* distinct road networks where existing accessibility rules matter.

The purpose is not to create a new spatial rule.

It is to ensure the UI correctly communicates the existing spatial eligibility constraints.

---

# Responsive requirements

Validate the final UI at:

* `1280 × 800`;
* `420 × 740`;
* `360 × 640`.

At each size:

* no accidental horizontal overflow;
* no clipped inspection content;
* worker/diagnosis text remains readable;
* assignment controls remain usable;
* Food/Water information remains understandable;
* existing HUD remains intact.

Do not solve responsive issues by introducing a large new responsive subsystem.

Reuse existing layout conventions.

---

# Browser validation

Because this step changes player-facing UI, real browser validation is mandatory.

Use headed Chromium.

Verify at least:

## Scenario 1 — Five-worker Farm/Well decision

Start from a deterministic five-worker fixture.

Verify:

1. current allocation is visible;
2. a Farm inspection exposes worker state;
3. a Well inspection exposes worker state;
4. vacant workplace diagnosis is correct where applicable;
5. manual reassignment is possible;
6. assignment changes;
7. Food/Water production/state changes accordingly;
8. the player can observe the consequence.

## Scenario 2 — Reverse decision

Perform the reverse reassignment.

Verify that:

* allocation changes back;
* resource production/state changes back;
* no hidden persistent state was introduced.

## Scenario 3 — Construction Crew

Assign a worker to Construction Crew.

Verify:

* workplace staffing updates;
* workforce availability updates;
* construction state remains correct;
* completion restores normal staffing semantics.

## Scenario 4 — Inaccessible workplace

Verify the UI does not incorrectly report worker contention when the actual cause is accessibility.

## Scenario 5 — Responsive

Repeat the relevant inspection/assignment flow at:

* 1280×800;
* 420×740;
* 360×640.

---

# GPU validation

Run the existing headed GPU workflow.

Verify:

* WebGL2;
* NVIDIA GPU path;
* no rendering regressions;
* no UI overlay/rendering synchronization issues.

Use the actual supported local workflow already established by the project.

Do not introduce a new GPU test framework.

---

# Testing requirements

Add focused tests for the new UI/decision-expression behavior where appropriate.

At minimum cover:

### A — Farm-heavy state

Correct staffing and economic display.

### B — Well-heavy state

Correct staffing and economic display.

### C — Manual reassignment

The displayed state follows the authoritative simulation state.

### D — Contention

The 10BQ diagnosis remains correct.

### E — Accessibility

Accessibility diagnosis remains distinct.

### F — Construction Crew

Temporary worker removal is represented correctly.

### G — Save/load

After save/load, the same derived workforce/economic information is displayed.

No new persisted UI state.

### H — Determinism

Equivalent simulation inputs produce equivalent displayed derived data.

---

# Architecture constraints

The following must NOT be introduced:

* a second workforce state;
* UI-owned worker assignment state;
* duplicated eligibility predicates;
* duplicated production calculations;
* persisted diagnosis;
* persisted UI selection solely to support this feature;
* new workforce abstractions without a concrete need;
* generic dashboard architecture;
* generalized economic analytics framework.

Use the current architecture.

If an existing derived query is insufficient, extend it narrowly and document why.

---

# Persistence

Do not change:

* `SAVE_VERSION`;
* ColonistState;
* workforce assignment semantics;
* StorageHub;
* scenario definitions.

Derived diagnostic and economic presentation data must be recomputed from authoritative state after load.

---

# No mechanic expansion

Explicitly do NOT add:

* worker priority;
* Food priority;
* Water priority;
* profession;
* specialization;
* worker skill;
* morale;
* happiness;
* logistics;
* warehouse behavior;
* new resources;
* new buildings;
* new progression;
* Town;
* production chains;
* new scenario.

This step exists because the mechanic already exists.

---

# Required final audit

After implementation, answer:

## 1. Can the player see the decision?

Can the player identify the Farm/Well allocation?

## 2. Can the player understand the consequence?

Can they observe the resulting Food/Water state?

## 3. Can the player act?

Can they manually change the allocation using the existing controls?

## 4. Can the player understand why a workplace is vacant?

Does 10BQ's diagnosis remain correct and distinct?

## 5. Is the decision reversible?

Verify the allocation can be changed in both directions.

## 6. Is the decision still deterministic?

Verify repeated runs, insertion order and save/load.

## 7. Did UX improve without mechanic expansion?

Confirm no new simulation rules were introduced.

---

# Success criterion

The step succeeds if the following statement becomes true:

> **A player can discover, understand, and deliberately change the existing Farm ↔ Well workforce trade-off using the current game systems, without needing hidden knowledge of the implementation.**

The simulation itself should remain unchanged.

---

# Verification

Run all applicable:

1. focused workforce/UI tests;
2. relevant economic tests;
3. relevant persistence tests;
4. relevant scenario tests;
5. typecheck;
6. lint;
7. build;
8. full Vitest;
9. `git diff --check`;
10. headed Chromium E2E;
11. headed GPU/WebGL2 validation.

Report any unrelated pre-existing failures separately.

Do not fix unrelated failures unless they are actually caused by this step.

---

# Final QA / bilan

Produce `docs/roadmap/Step10BT.md`.

It must contain:

## 1. AUDIT

Current authoritative systems inspected.

## 2. DESIGN DECISION

What UX problem was identified and why the chosen presentation solves it without changing simulation rules.

## 3. IMPLEMENTATION

Exact files/components/derived queries changed.

## 4. PLAYER FLOW

Describe the complete Farm/Well reassignment flow.

## 5. ECONOMIC EXPRESSION

Show the measured Farm-heavy and Well-heavy states and their observable Food/Water consequences.

Do not rank them.

## 6. CONTENTION

Confirm the 10BQ diagnosis remains authoritative and distinct from accessibility/construction states.

## 7. RESPONSIVE

Report results at:

* 1280×800;
* 420×740;
* 360×640.

## 8. BROWSER/GPU

Report headed Chromium and GPU/WebGL2 results.

## 9. DETERMINISM/PERSISTENCE

Report repeated-run, insertion-order and save/load equivalence.

## 10. REGRESSION

Confirm:

* no workforce rule changes;
* no resource rule changes;
* no progression changes;
* no Storage changes;
* no scenario catalogue changes;
* no persistence schema changes;
* no Town design.

## 11. REMAINING LIMITATION

Be explicit about anything the current system still does not communicate or model.

Do not disguise missing mechanics as UX problems.

## 12. NEXT STEP

Do not automatically propose a new mechanic.

Determine whether the next justified step is:

* further UX refinement;
* a new economic measurement;
* a concrete simulation design problem;
* or a phase/design audit.

Town remains undefined unless the evidence now independently justifies opening it.

---

# Commit requirements

Commit the completed step with a clear message such as:

`Step 10BT: express workforce allocation decision`

Do not modify, stage, delete or commit the pre-existing user-owned files:

* `docs/roadmap/Step10BO - Copy.md`
* `docs/roadmap/Step10BT.md`

Important:

The second file name may already exist as a user-owned untracked file.

Before creating or replacing `docs/roadmap/Step10BT.md`, inspect its status carefully.

If it is already present and untracked/user-owned, **do not overwrite it**. Use a different report filename only after explicitly documenting the collision, or stop and report the collision before committing.

The final working tree must be clean except for the pre-existing user-owned untracked files.

---

# Definition of done

Step 10BT is complete only when:

* the existing Farm/Well decision is exposed clearly;
* no new simulation mechanic is introduced;
* manual reassignment remains the action mechanism;
* Food/Water consequences are observable;
* 10BQ workforce diagnosis remains correct;
* accessibility and construction states remain distinct;
* responsive layouts pass;
* headed browser validation passes;
* headed GPU/WebGL2 validation passes;
* focused and full tests pass, aside from explicitly documented unrelated failures;
* persistence/determinism remain intact;
* a complete QA/bilan is written;
* the commit is created;
* user-owned untracked files remain untouched.

## Core principle

> **The first meaningful mechanic does not need more mechanics. It needs to become legible.**

Make the existing decision visible, understandable and actionable before adding another layer of simulation.

---

# Documentation (as-built)

## Implementation

Added `getFarmWellAllocationSummary()` to the existing resource-query layer. It derives population/employment, staffed/capacity Farms and Wells, vacant jobs, Food balance, and Water headroom from existing authoritative queries. It is presentation-only and is not persisted, hashed, or used by assignment.

Added one existing-HUD row:

```text
Allocation: Farms X/Y · Wells A/B · Food +/-N/tick · Water headroom +/-N
```

The row exposes actual current consequences without adding a dashboard, priority control, or speculative projection. Existing 10BQ diagnosis and manual reassignment remain the action path.

Added `e2e/farmWellAllocationRun.mjs` and the `test:e2e:farm-well-allocation` command. The E2E uses a localhost-only serialized fixture through the existing `window.__nova` test hook; it is disabled for non-localhost hosts and is not player-facing.

## Required final audit

### 1. Can the player see the decision?

Yes. The HUD exposes staffed Farm/Well allocation and vacant capacity beside the existing Jobs total.

### 2. Can the player understand the consequence?

Yes. The HUD shows actual Food balance and Water headroom derived from the same simulation queries used by production and admission. It does not predict future state.

### 3. Can the player act?

Yes. Selecting a staffed workplace still exposes eligible reassignment targets. Moving a worker changes the HUD allocation and Food/Water values immediately.

### 4. Is this a new mechanic?

No. Assignment, capacity, production, Water semantics, persistence, and progression are unchanged.

## Browser scenarios

- Five-worker Well-heavy state: passed.
- Farm and Well inspection: passed.
- Manual reassignment: passed; the valid reverse move changed `2/3 Farms · 3/3 Wells` to `3/3 Farms · 2/3 Wells`.
- Food/Water consequence: passed; Food changed from `-1/tick` to `+1/tick` and Water headroom from `+1` to `-1`.
- Responsive 1280×800, 420×740, and 360×640: passed with no body or HUD overflow.
- Construction/accessibility diagnosis: existing 10BQ focused coverage remains authoritative; semantics were not changed.
- GPU/WebGL2: passed through the existing headed GPU workflow.

## Regression safety

- no workforce rules changed;
- no progression changes;
- no resource production/consumption changes;
- no Storage changes;
- no scenario catalogue changes;
- no persistence or `SAVE_VERSION` changes;
- no worker priorities, professions, logistics, or new buildings.

## Verification

- focused Step 10BT1 tests: 4 PASS;
- focused workforce/economic compatibility set: 16 PASS;
- relevant resource/progression/inspection/persistence set: 84 PASS;
- typecheck: PASS;
- lint: PASS;
- build: PASS;
- headed Farm/Well allocation E2E: PASS;
- headed GPU/WebGL2 E2E: PASS;
- full Vitest: 1,676 / 1,676 PASS;
- determinism: PASS in focused save/load and replay tests;
- insertion-order: PASS through unchanged sorted derivations;
- save/load: PASS;
- `git diff --check`: PASS.

## Commit

`3d44c6d` — Step 10BT: express workforce allocation decision

