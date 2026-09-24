# Step 10CF — Town Decision Frontier Audit

## Context

NOVA is a deterministic contemplative city-builder.

Current baseline:

* Step 10CA — Next Gameplay Pressure Audit
* Step 10CD — design gate correctly stopped implementation
* Step 10CE — Mixed-Town Water Pressure Audit
* Current commit: `3dc1862`
* SAVE_VERSION: `8`
* Full Vitest baseline: `1,712 / 1,712`
* Browser regression: passed
* GPU/WebGL2 regression: passed on NVIDIA RTX 3070

The current Town simulation already contains:

* Farms → Food
* Wells → Water
* Workshops → Material
* worker assignment
* worker reassignment
* road/accessibility constraints
* Town progression
* deterministic ticking
* save/load
* deterministic hashing

Recent audits established:

### Step 10CA

No new mechanic was justified.

### Step 10CE

Water pressure is recurrent when Well capacity is below need, but existing workforce controls resolve it:

* Farm → Well increases Water capacity while reducing Food production.
* Workshop → Well increases Water capacity while reducing Material production.

Therefore Water pressure is currently an **existing-control pressure**, not a new persistent settlement-management decision.

---

# Objective

Determine whether the current Town simulation contains **any recurring decision frontier beyond the existing Farm / Well / Workshop workforce allocation system**.

The central question is:

> Across a broad deterministic set of Town states and multi-tick trajectories, is there a recurring situation where all existing workforce allocation choices are insufficient, undesirable in a qualitatively new way, or unable to express the next meaningful settlement-management decision?

This is an audit.

It is **not** a feature-design step.

---

# Hard design gate

Do NOT implement any new gameplay mechanic.

Specifically do not add:

* Water planning
* Food planning
* Material planning
* automatic workforce allocation
* priority systems
* new buildings
* housing
* construction expansion
* new resources
* resource sinks
* storage
* population growth
* new progression stages
* new commands
* policies
* automation
* spatial expansion mechanics
* transportation mechanics
* new UI concepts
* balancing changes

Do not alter existing production coefficients.

Do not alter tick semantics.

Do not modify progression rules.

Do not modify persistence.

Do not modify SAVE_VERSION.

Only audit infrastructure, tests, fixtures, and documentation may be added.

If the evidence does not reveal a new pressure, that is a valid and expected outcome.

---

# Mandatory first actions

Before modifying anything:

1. Inspect `git status`.
2. Confirm HEAD is:
   `3dc1862`
3. Read:

   * `docs/roadmap/STEP10CA.md`
   * `docs/roadmap/STEP10CE.md`
   * Step 10CD documentation
   * `docs/roadmap/Step10BZ.md`
   * `docs/roadmap/Step10BY.md`
4. Inspect current simulation/domain/application boundaries.
5. Inspect the existing audit tests.
6. Understand the current workforce, production, roads/accessibility, progression, tick, persistence and hashing contracts.

Do not rely on assumptions from previous conversation summaries when the repository contains authoritative evidence.

---

# Core concept: decision frontier

For this audit, define the **decision frontier** as the boundary where:

> every currently legal workforce allocation either maintains a viable settlement state, creates a known trade-off that the player can intentionally manage, or fails to provide a meaningful new choice.

We are looking for cases where the player reaches a qualitatively different problem.

Do not classify "one resource becomes low" as a new problem by itself.

Do not classify "another worker would be useful" as a new problem.

Do not classify "all resources cannot be maximized simultaneously" as a new problem.

Those are already inherent in the three-way workforce economy.

---

# A. Enumerate the current control envelope

Build a deterministic representation of the meaningful current controls.

At minimum account for:

* worker assigned to Farm
* worker assigned to Well
* worker assigned to Workshop
* worker vacancy where legal
* legal reassignment between existing jobs
* operational/accessibility constraints
* Town progression state

For each tested state, determine what outcomes are reachable using only those controls.

The purpose is not to expose a new player-facing system.

It is to understand the existing decision space.

---

# B. Population frontier sweep

Run deterministic Town simulations across a meaningful range of population levels.

Do not select only the population where the current system looks interesting.

Include:

* low Town populations
* balanced Town populations
* populations near workforce saturation
* populations beyond the comfortable three-resource allocation range
* higher populations only as far as the existing simulation can meaningfully represent them without inventing new mechanics

For each population, test multiple workforce compositions.

Record:

* population
* staffed workers
* vacant workers
* Farm workers
* Well workers
* Workshop workers
* Food production
* Water production
* Material production
* current stocks
* capacity/headroom
* road/accessibility state where relevant
* Town state
* whether reassignment remains useful
* whether any state cannot be materially improved by an existing reassignment

---

# C. Allocation-space sweep

For representative population levels, systematically inspect legal allocations.

Do not rely solely on hand-picked allocations.

Where practical, enumerate the integer allocation space:

`Farm workers + Well workers + Workshop workers <= staffed workforce`

Respect actual job capacity and operational rules.

For each allocation:

1. simulate the state;
2. record production;
3. evaluate Food/Water/Material trajectory;
4. identify legal neighboring reallocations;
5. determine whether any reallocation improves the relevant pressure;
6. classify the resulting decision.

This should reveal whether the current three-way workforce system already spans the meaningful decision space.

Do not build a permanent generic optimizer.

Use the smallest deterministic audit helper necessary.

---

# D. Multi-resource simultaneous pressure

Explicitly test states where several resources are under pressure at the same time.

Examples:

### Food + Water

Can both pressures be handled by moving workers between Farm and Well?

### Food + Material

Can the existing Farm ↔ Workshop trade-off express the decision?

### Water + Material

Can the existing Well ↔ Workshop trade-off express it?

### Food + Water + Material

This is especially important.

Determine whether the simultaneous three-resource conflict is:

1. simply the existing three-way workforce trade-off, or
2. a qualitatively new settlement-management problem.

Do not label a three-way conflict "new" merely because no allocation maximizes all three resources.

---

# E. Temporal frontier

Static allocation analysis is insufficient.

For representative states, simulate trajectories over multiple horizons.

Use the existing tick semantics.

At minimum include:

* 4 ticks
* 12 ticks
* 24 ticks

Use longer horizons only where useful.

For each trajectory determine:

* resource stock evolution;
* capacity/headroom evolution;
* whether pressure appears;
* when it appears;
* whether reassignment resolves it;
* whether reassignment merely transfers pressure between existing resources;
* whether the state cycles;
* whether the player can repeatedly stabilize the settlement with existing controls;
* whether the system eventually reaches a state where existing controls no longer express a meaningful response.

---

# F. Stability versus unavoidable failure

Distinguish carefully between:

### Stable trade-off

The player must choose between Food, Water and Material, but can maintain the settlement by choosing an allocation.

This is existing gameplay.

### Temporary pressure

A resource temporarily declines but can be corrected using existing reassignment.

This is existing gameplay.

### Oscillating trade-off

The player may need to reassign workers repeatedly between known resources.

This may indicate temporal pressure, but it is not automatically a new mechanic.

Measure it before drawing conclusions.

### Unavoidable frontier

Every legal existing allocation eventually produces an unacceptable outcome, or a meaningful management decision appears that cannot be represented by workforce allocation alone.

This is the only category potentially interesting for a future mechanic.

---

# G. Spatial pressure audit

Do not implement spatial mechanics.

However, determine whether the existing road/accessibility system creates an actual decision frontier.

Measure states involving:

* inaccessible productive buildings;
* multiple road networks where relevant;
* buildings becoming operational/non-operational through existing rules;
* workforce allocation interacting with accessibility;
* Workshop/Farm/Well placement constraints already represented by the simulation.

Ask:

> Does spatial configuration currently create a decision that cannot be represented through the existing workforce system?

Do not invent hypothetical construction mechanics.

Only measure behavior already present.

If spatial effects are merely binary operational constraints with no meaningful choice, document that.

---

# H. Progression pressure audit

Town already exists as progression.

Determine whether the current Town state itself creates any unresolved decision pressure.

Inspect:

* what Town unlocks;
* whether existing Town capability changes the decision space;
* whether Town creates a new recurring management problem;
* whether progression currently terminates meaningful decision-making.

Do not design the next progression stage.

Do not add one.

---

# I. Decision quality classification

Every interesting state must be classified.

Use these categories:

### Existing allocation decision

Resolved through Farm / Well / Workshop reassignment.

### Existing spatial decision

Already represented by current road/accessibility mechanics.

### Existing temporal decision

Pressure exists but remains manageable using existing controls.

### Transitional artifact

Interesting only because of a particular fixture, initial stock, or transient state.

### New persistent frontier

A recurring problem survives the current control envelope and represents a qualitatively new decision.

Only the last category can justify a future mechanic.

---

# J. Recurrence requirement

A single pathological state is insufficient.

If a potential new frontier is discovered, reproduce it through:

* multiple populations;
* multiple allocations;
* multiple initial stock states;
* multiple temporal trajectories;
* at least one independently constructed scenario.

If the phenomenon disappears when the fixture changes, classify it as an artifact or transitional state.

---

# K. Anti-feature audit

For every possible future mechanic implied by the measurements, ask:

* Does it solve a demonstrated recurring problem?
* Or does it merely make the spreadsheet larger?
* Does it introduce busywork?
* Does it duplicate workforce allocation?
* Does it bypass workforce allocation?
* Does it require automation?
* Does it require new UI complexity?
* Does it create a resource treadmill?
* Does it create persistence burden?
* Does it threaten determinism?
* Does it exist only because we intentionally manufacture scarcity?

Do not design the mechanic.

Only document whether the evidence supports a future design investigation.

---

# L. Determinism

Verify:

* repeated audit runs produce identical measurements;
* allocation enumeration order does not alter results;
* record insertion order does not alter results;
* save/load continuation is equivalent;
* hashes remain stable.

Do not introduce randomness.

---

# M. Performance

The allocation-space sweep may produce many deterministic simulations.

Keep it practical.

* Avoid enormous exhaustive searches.
* Use representative population ranges where full enumeration is unnecessary.
* Benchmark expensive sections.
* Do not modify production code solely for this audit.
* Do not change global Vitest timeout configuration.
* If one legitimate audit test requires additional time, use a scoped timeout and document it.

---

# Required test artifact

Create:

`tests/townDecisionFrontierAudit.test.ts`

The test should encode the actual audit methodology.

It should cover:

* population sweep;
* representative allocation-space sweep;
* three-resource simultaneous pressure;
* 4/12/24 tick trajectories;
* existing workforce reassignment resolution;
* spatial/accessibility interaction;
* Town progression interaction;
* deterministic replay;
* save/load equivalence;
* identification/classification of candidate frontiers.

Do not create a large reusable simulation framework.

Keep the audit-specific infrastructure local and understandable.

---

# Required documentation

Create:

`docs/roadmap/STEP10CF.md`

Structure:

## 1. Question

State the decision-frontier question precisely.

## 2. Baseline

Document:

* commit `3dc1862`
* SAVE_VERSION 8
* current workforce model
* relevant previous audit conclusions

## 3. Method

Explain:

* population sweep;
* allocation enumeration;
* stock states;
* temporal horizons;
* spatial/accessibility checks;
* progression checks.

## 4. Measured states

Provide representative concrete measurements.

## 5. Decision frontier findings

Classify observed pressures using:

* Existing allocation decision
* Existing spatial decision
* Existing temporal decision
* Transitional artifact
* New persistent frontier

## 6. Recurrence

Explain which findings repeat across independent states.

## 7. Step 10CA / 10CE comparison

Explicitly state whether the new evidence:

* strengthens,
* weakens,
* or leaves unchanged

the previous conclusions.

## 8. Design conclusion

Choose exactly one:

### A. No new persistent decision frontier demonstrated

or

### B. A new persistent decision frontier is demonstrated

If B:

* describe the problem;
* provide evidence;
* do not design or implement the mechanic.

## 9. Next-step gate

If A:

> Continue measuring the simulation before adding a new mechanic.

If B:

> A separate design step may define the minimum mechanic required to address the demonstrated frontier.

---

# Validation

Because this is an audit-only step:

## Mandatory

Run:

* focused 10CF tests;
* relevant economy/workforce/Town/accessibility tests;
* full Vitest;
* typecheck;
* lint;
* build;
* `git diff --check`.

Confirm:

* SAVE_VERSION remains `8`;
* no production coefficients changed;
* no tick semantics changed;
* no command behavior changed;
* no resource behavior changed;
* no building behavior changed;
* no progression behavior changed;
* no persistence schema changed;
* no UI behavior changed.

## Browser / GPU

Do not skip these automatically.

Because the audit explicitly examines existing spatial/accessibility and Town behavior, run the existing Town browser regression and GPU/WebGL2 regression if the audit exercises those runtime paths.

However, do not modify runtime/UI code merely to make the audit possible.

Report exactly what was run.

---

# User-owned files

Do not modify or delete:

* `docs/roadmap/Step10BO - Copy.md`
* `docs/roadmap/Step10BT.md`

Do not perform unrelated cleanup.

---

# Git discipline

Before commit:

1. `git status`
2. inspect complete diff;
3. verify only intended Step 10CF files changed;
4. verify no generated artifacts;
5. verify no gameplay/runtime/UI changes;
6. verify user-owned files untouched.

Expected implementation artifacts should normally be limited to:

* `tests/townDecisionFrontierAudit.test.ts`
* `docs/roadmap/STEP10CF.md`

Commit exactly:

`Step 10CF: Town Decision Frontier Audit`

Create **one commit only**.

Do not push unless explicitly requested.

---

# Final report

Return:

## Step 10CF — Final

* Commit:
* Baseline:
* Population range:
* Allocation states measured:
* Temporal horizons:
* Existing allocation pressures:
* Existing spatial pressures:
* Existing temporal pressures:
* Candidate new frontiers:
* Recurrence evidence:
* Step 10CA conclusion:
* Step 10CE conclusion:
* Final design conclusion:
* SAVE_VERSION:
* Focused tests:
* Relevant compatibility:
* Full Vitest:
* Typecheck:
* Lint:
* Build:
* Browser:
* GPU:
* Diff audit:
* Worktree status:

Then explain, briefly and factually, what the measurements demonstrated.

Do not invent a mechanic.

Do not recommend a mechanic unless the audit demonstrates a persistent new decision frontier.

---

# Documentation (as-built)

## Question

Does the current Town simulation contain a recurring decision frontier beyond Farm/Well/Workshop workforce allocation?

## Baseline

Baseline was `3dc1862`, `SAVE_VERSION = 8`, with 1,712/1,712 full Vitest passing. Existing 10CA/10CE conclusions remain authoritative: Water pressure is recurrent but solved by existing workforce controls, and no new mechanic had been selected.

## Method

`tests/townDecisionFrontierAudit.test.ts` provides a local deterministic audit fixture. It sweeps populations 4, 6, 8, 10, and 12; enumerates small Farm/Well/Workshop allocation envelopes; measures simultaneous Food/Water/Material pressure; simulates 4/12/24-tick horizons; checks legal reassignment recovery; compares connected and split road layouts; verifies Town state; and checks replay hashes plus save/load continuation.

## Measured states

- Population sweep: worker use saturates at the six available jobs in the balanced fixture; larger populations retain unassigned workers rather than exposing a new rule.
- Allocation sweep: Farm/Well/Workshop counts vary Water, Food, and Material rates across legal neighboring allocations; no additional state is needed to represent the choice.
- Three-resource pressure: Workshop → Well raises Water capacity and lowers Material production while leaving Food unchanged.
- Temporal horizons: Water stock can decline and reach zero, but rates remain stable and existing reassignment resolves the pressure by moving the known tradeoff.
- Spatial layout: a split road row creates two networks, but measured building-access and staffing effects remain an existing eligibility constraint.
- Town: existing Town gate and workforce review remain readable and deterministic.

## Decision frontier findings

- **Existing allocation decision:** all observed Food/Water/Material tradeoffs.
- **Existing spatial decision:** connectivity/accessibility constraints.
- **Existing temporal decision:** stock decline and reassignment recovery.
- **Transitional artifact:** low-stock depletion in deliberately low-stock fixtures.
- **New persistent frontier:** none demonstrated.

## Recurrence

The same structural tradeoff recurs across population levels, allocation compositions, and 4/12/24-tick trajectories. It does not survive the existing control envelope as a qualitatively new decision. No independently constructed scenario produced a new frontier.

## 10CA / 10CE comparison

The new evidence strengthens both prior conclusions:

- 10CA: no new mechanic is justified.
- 10CE: Water pressure is existing-control pressure, not a new persistent decision.

No prior conclusion is reinterpreted or weakened.

## Design conclusion

### A. No new persistent decision frontier demonstrated

The current Town model already expresses the meaningful decision through Farm/Well/Workshop allocation, manual reassignment, Construction Crew, and existing spatial eligibility. The audit found no recurring problem that those controls cannot express.

## Next-step gate

Continue measuring the simulation before adding a new mechanic. A future design step requires new evidence that a persistent frontier survives all existing controls; this audit does not authorize Water planning, priorities, automation, new buildings, progression, or UI.

## Validation

- focused CF tests: 6 PASS;
- relevant compatibility tests: 42 PASS;
- typecheck: PASS;
- lint: PASS;
- build: PASS;
- full Vitest: 1,718 / 1,718 PASS;
- browser/GPU: existing Town regression and GPU workflow passed in preceding 10CE validation; no runtime/UI code changed in 10CF;
- determinism/save-load: PASS in the CF suite;
- `git diff --check`: PASS.

## Scope confirmation

No gameplay functionality was added. No resource, building, command, workforce role, progression stage, persistence field, or `SAVE_VERSION` change was introduced.

## Files changed

- `docs/roadmap/Step10CF.md`
- `tests/townDecisionFrontierAudit.test.ts`

## Commit

`2a90d38` — Step 10CF: Town Decision Frontier Audit


