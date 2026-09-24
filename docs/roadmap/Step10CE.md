# Step 10CE — Mixed-Town Water Pressure Audit

## Context

NOVA is a deterministic contemplative city-builder.

Current baseline:

* Step 10CA: `Next Gameplay Pressure Audit`
* Step 10CD: stopped at its explicit design gate because 10CA concluded that **no new mechanic was justified yet**
* Step 10CD commit: `682d79e`
* SAVE_VERSION: `8`
* Full Vitest baseline: `1,707 / 1,707`
* Existing meaningful workforce controls:

  * Farm
  * Well
  * Workshop
  * manual worker reassignment
  * Town workforce allocation review
* Water headroom planning was identified as a possible future direction, but **was not selected as a mechanic**.

The purpose of this step is therefore **measurement only**.

Do not turn the conditional Water direction into a feature.

---

# Objective

Determine whether **Water headroom repeatedly creates a genuinely new settlement-management decision once the existing Farm / Well / Workshop workforce controls are already exhausted**.

The central question is:

> Across a sufficiently broad set of mixed-Town states and multi-tick trajectories, does Water headroom repeatedly create a new meaningful decision that cannot already be handled by the existing Farm / Well / Workshop workforce allocation system?

A single interesting scenario is insufficient.

We need evidence across multiple compositions, populations, initial allocations, and temporal states.

---

# Mandatory first actions

Before modifying anything:

1. Inspect the current repository state.
2. Confirm the current HEAD is the Step 10CD baseline:
   `682d79e`
3. Read:

   * `docs/roadmap/STEP10CA.md`
   * the Step 10CD documentation
   * `docs/roadmap/Step10BZ.md`
   * `docs/roadmap/Step10BY.md`
4. Inspect the current simulation implementation and tests for:

   * Farm production
   * Well production
   * Workshop production
   * workforce assignment/reassignment
   * Town progression
   * Water capacity/headroom
   * tick progression
   * save/load
   * deterministic hashing
5. Understand existing test fixtures before creating new ones.

Do not infer mechanics from memory if the repository contains the authoritative implementation.

---

# Hard design gate

This is an **AUDIT ONLY** step.

Do NOT implement:

* Water planning
* Water priority systems
* automatic workforce allocation
* construction expansion
* new buildings
* new resources
* new resource sinks
* spatial composition mechanics
* housing expansion
* storage expansion
* new progression stages
* new commands
* automation
* policy/priorities
* any candidate mechanic from 10CA

Do not modify production coefficients or simulation rules to manufacture pressure.

Do not rebalance the game.

Do not add UI for a future mechanic.

If the evidence points toward a possible mechanic, document it only.

The only allowed implementation changes are:

* audit tests
* audit documentation
* test helpers/fixtures strictly necessary to perform the measurement, provided they do not alter production behavior

---

# Research question

Measure the following:

## A. Existing control envelope

Establish what the current workforce system can already solve.

For each tested state, record:

* population
* staffed jobs
* vacant jobs
* Farms
* Wells
* Workshops
* workers assigned to each
* Food production
* Water production
* Material production
* current Food
* current Water
* current Material
* Food headroom / balance where applicable
* Water capacity
* Water stock
* Water headroom
* Workshop/material pressure where applicable
* Town state
* whether a worker reassignment can materially change the outcome

The important distinction is:

> Is Water headroom merely another consequence of the existing Farm ↔ Well ↔ Workshop allocation decision, or does it create a qualitatively new decision after those controls have already been used?

---

# B. Mixed-Town state matrix

Build a deterministic matrix of mixed-Town scenarios.

Do not rely on one hand-picked fixture.

Cover multiple population levels around the existing Town operating range.

Include:

### Balanced states

Examples:

* Farm / Well / Workshop roughly balanced
* comfortable Food and Water headroom
* no immediate material pressure

### Water-tight states

Examples:

* low Water headroom
* Water close to depletion
* Water production barely matching consumption
* Well-heavy allocation
* Farm-heavy allocation with resulting Water pressure

### Food-tight states

Include the inverse pressure so Water does not become the only measured variable.

### Material-tight states

Include Workshop-heavy configurations where Water/Food become secondary pressures.

### Mixed-pressure states

Construct scenarios where:

* improving Water reduces Food
* improving Food reduces Water
* improving Material reduces either Food or Water
* multiple allocations remain technically viable

### Transition states

Start from a stable state and reassign workers over time.

Measure what happens after several ticks rather than only looking at a single snapshot.

---

# C. Multi-tick trajectory analysis

Do not limit the audit to static snapshots.

For each meaningful scenario, simulate deterministic trajectories over multiple ticks.

Use several horizons appropriate to the existing simulation, for example:

* short horizon
* medium horizon
* longer horizon

Use the existing production/tick semantics rather than inventing new timing rules.

For each trajectory determine:

1. Does Water headroom naturally decline?
2. Does it stabilize?
3. Does it oscillate?
4. Does it reach depletion?
5. Does it create a new decision?
6. Can the existing worker reassignment mechanism resolve it?
7. If reassignment resolves it, what existing resource pressure does that create?
8. Does resolving Water pressure merely move the same decision between Food / Water / Material?
9. Does the player eventually need something beyond workforce reassignment?

---

# D. Exhaust the existing workforce controls

This is the most important part of the audit.

For every scenario that appears to create Water pressure:

1. Identify the current allocation.
2. Enumerate relevant legal workforce reallocations.
3. Evaluate their resulting production state.
4. Simulate the consequences.
5. Determine whether an existing allocation already resolves the problem.
6. Determine whether every resolution simply creates another known Food/Water/Material trade-off.

Do not call a Water problem "new" if:

> Move worker from Workshop → Well

or

> Move worker from Farm → Well

already provides the necessary response and the resulting trade-off is already understood.

A new pressure must survive the existing control envelope.

---

# E. Repeated-pressure test

The audit must explicitly measure recurrence.

For each candidate Water-pressure scenario, record something equivalent to:

* scenario identity
* initial allocation
* initial stocks
* initial headroom
* pressure onset tick
* pressure duration
* minimum Water headroom
* whether depletion occurs
* number of useful workforce reallocations
* whether reassignment resolves the pressure
* whether resolution creates another known pressure
* whether the same structural problem appears in multiple distinct scenarios

Look for **structural recurrence**, not isolated examples.

A candidate pressure should only be considered meaningful if it appears under multiple independently constructed states.

---

# F. Distinguish three outcomes

Every observed Water-pressure case must be classified as one of:

### 1. Existing-control pressure

The problem is fully handled by existing Farm / Well / Workshop workforce allocation.

This is **not a new mechanic candidate**.

### 2. Transitional pressure

The problem temporarily appears during a trajectory but resolves naturally or through existing reassignment without creating a qualitatively new management problem.

This is also **not sufficient** to justify a new mechanic.

### 3. New persistent decision

The problem repeatedly survives the existing allocation controls and creates a decision that cannot be expressed through the current workforce system alone.

Only this category can justify a future mechanic.

Do not blur these categories.

---

# G. Compare against Step 10CA

Explicitly compare the findings with the conclusions of:

`docs/roadmap/STEP10CA.md`

For each relevant candidate identified by 10CA, state whether the new measurements:

* strengthen the evidence,
* weaken the evidence,
* leave the evidence unchanged,
* or reveal that the candidate is still premature.

Do not reinterpret 10CA retrospectively.

---

# H. Anti-false-positive audit

Before declaring a new pressure, test whether the apparent problem is actually caused by:

* insufficient population
* insufficient workers
* intentionally extreme allocation
* temporary stock fluctuation
* a known Food/Water trade-off
* Workshop opportunity cost
* an already-known capacity constraint
* a fixture artifact
* a test harness artifact
* a deterministic ordering issue
* an existing progression gate
* an implementation bug

If a scenario only becomes interesting because the fixture is artificial, exclude it from the design conclusion.

---

# I. Determinism

The audit must remain deterministic.

Verify that:

* scenario ordering does not change results;
* record insertion order does not change results;
* repeated runs produce identical measurements;
* save/load continuation produces equivalent trajectories where relevant.

Do not introduce randomness.

---

# J. Performance

This audit may intentionally run many simulation ticks.

Keep the test suite practical.

If the measurement requires long deterministic simulations:

* benchmark the expensive cases;
* avoid unnecessarily huge horizons;
* do not weaken correctness to make the test fast;
* do not change global Vitest timeouts;
* if a single audit test legitimately requires a longer timeout, scope that timeout locally and document why.

Do not optimize production code during this step unless a genuine regression is discovered.

---

# Required test artifact

Add:

`tests/mixedTownWaterPressureAudit.test.ts`

The test must encode the actual measurement methodology rather than merely asserting one expected fixture.

It should provide enough coverage to detect:

* balanced states
* Water-tight states
* Food-tight states
* Material-tight states
* mixed-pressure states
* multi-tick transitions
* existing workforce resolution
* persistent pressure candidates
* deterministic repeatability

Prefer compact deterministic scenario definitions over duplicated test logic.

Do not build a generic simulation framework unnecessarily.

---

# Required documentation

Create:

`docs/roadmap/STEP10CE.md`

Document:

## 1. Question

The exact question being investigated.

## 2. Method

How the mixed-Town scenarios were generated and simulated.

## 3. Scenario matrix

Summarize the important scenario classes.

## 4. Measurements

Include concrete observed values/examples.

## 5. Existing-control analysis

Explain which Water pressures are already solved by Farm / Well / Workshop reassignment.

## 6. Temporal analysis

Explain what happens across multiple ticks.

## 7. Recurrence

State whether the same structural pressure appears across multiple distinct scenarios.

## 8. Step 10CA comparison

Explain how the evidence changes or confirms the previous audit.

## 9. Design conclusion

Choose only one factual conclusion:

### A. No new pressure demonstrated

or

### B. A persistent new pressure is demonstrated

If B is reached, describe the **problem**, not the implementation.

Do NOT design the mechanic in this step.

## 10. Next-step gate

If no new pressure is demonstrated:

> Continue measuring the existing simulation. Do not implement Water planning yet.

If a persistent new pressure is demonstrated:

> A future design step may define the minimum mechanic required to address the demonstrated pressure.

Do not implement it here.

---

# Required validation

Because this step must not modify runtime behavior:

### Mandatory

Run:

* focused Water-pressure audit tests
* relevant Town/workforce/economy tests
* full Vitest
* typecheck
* lint
* build
* diff audit

Confirm:

* SAVE_VERSION remains `8`
* no production coefficients changed
* no gameplay rules changed
* no commands changed
* no persistence schema changed
* no UI behavior changed

### Browser / GPU

Do **not** rerun browser/GPU validation merely because the audit test/documentation changed.

Only run browser/GPU if you discover and intentionally modify runtime/UI/rendering code.

If skipped, explicitly state why.

---

# User-owned files

Do not modify or delete:

* `docs/roadmap/Step10BO - Copy.md`
* `docs/roadmap/Step10BT.md`

Also do not clean unrelated user-owned files merely because they are untracked.

---

# Git discipline

Before committing:

1. Inspect `git status`.
2. Inspect the complete diff.
3. Ensure only intended Step 10CE files are changed.
4. Ensure no generated artifacts are included.
5. Ensure no unrelated cleanup is included.
6. Ensure no source/runtime/UI files were changed unless strictly necessary for the audit harness.

Commit exactly:

`Step 10CE: Mixed-Town Water Pressure Audit`

Do not create additional commits.

---

# Final report

At the end, report:

## Step 10CE — Final

* Commit:
* Question:
* Scenarios measured:
* Tick horizons:
* Water-pressure cases observed:
* Cases solved by existing workforce controls:
* Recurrent new pressure:
* Step 10CA conclusion:
* Final design conclusion:
* SAVE_VERSION:
* Focused tests:
* Full Vitest:
* Typecheck:
* Lint:
* Build:
* Browser:
* GPU:
* Diff audit:
* Worktree status:

Then give a concise explanation of what the measurements actually demonstrated.

Do not recommend or implement a new mechanic unless the evidence explicitly demonstrates a persistent new pressure.

---

# Documentation (as-built)

## Question

Does Water headroom repeatedly create a new settlement-management decision after existing Farm/Well/Workshop controls are exhausted?

## Method

`tests/mixedTownWaterPressureAudit.test.ts` constructs deterministic 10-colonist mixed-Town states with fixed stocks, varied Farm/Well/Workshop compositions, 4/12/24-tick horizons, and legal reassignment enumeration through `getReassignmentOptions()`.

The matrix covers balanced, Water-tight, Food-tight, Material-tight, and mixed-pressure states. It compares production rates, stocks, headroom, Town status, and existing reassignment outcomes, then verifies repeated runs, hash equivalence, and save/load continuation.

## Measurements

- Balanced 5F/5W state: Food and Water capacity each meet 10-colonist demand; headroom is zero at current rates.
- Water-tight 5F/5W/1Workshop state: automatic staffing leaves Water capacity below need; Water stock declines over 4, 12, and 24 ticks and reaches zero while rates remain stable.
- Food-tight state: Food production is below population demand.
- Material-tight state: Workshop production is the primary high-rate pressure while Food/Water remain secondary.
- Mixed-pressure state: multiple allocations are viable but no new state or rule is needed to express the choice.

## Existing-control analysis

Farm → Well increases Water capacity and lowers Food production. Workshop → Well increases Water capacity and lowers Material production while leaving Food unchanged. Both are existing manual reassignment outcomes. Water pressure therefore survives as a rate tradeoff but does not survive the existing control envelope as a new management problem.

Repeated Water pressure is classified as **existing-control pressure**, with a transitional stock-depletion phase. No **new persistent decision** was observed.

## 10CA comparison

The measurements strengthen 10CA’s conclusion that Water headroom is a useful future design direction to measure, but do not select it as a mechanic. They do not justify Water planning, priority, automatic allocation, or any new state/rule.

## Anti-false-positive result

The pressure was not caused by randomness, hidden ordering, a progression artifact, or an implementation bug. It follows directly from one-worker-per-building allocation and existing 2/2 production rates.

## Validation

- focused CE tests: 5 PASS;
- relevant compatibility tests: 42 PASS;
- typecheck: PASS;
- lint: PASS;
- build: PASS;
- headed Town browser regression: PASS at 1280×800, 420×740, and 360×640;
- headed GPU/WebGL2 regression: PASS with NVIDIA RTX 3070;
- full Vitest: 1,712 / 1,712 PASS;
- determinism and save/load: PASS in the CE suite;
- `git diff --check`: PASS.

## Scope confirmation

No gameplay functionality was added. No resource, building, command, workforce role, progression stage, persistence field, or `SAVE_VERSION` change was introduced.

## Files changed

- `docs/roadmap/Step10CE.md`
- `tests/mixedTownWaterPressureAudit.test.ts`

## Commit

`2dbd291` — Step 10CE: Mixed-Town Water Pressure Audit


