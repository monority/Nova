# NOVA — Step 10CA — Next Gameplay Pressure Audit

## Baseline

* Previous step: `Step 10BZ — Simulation Contract Freeze`
* Baseline commit: `0614429`
* SAVE_VERSION: `8`

---

# Objective

Determine, using the **actual current NOVA simulation**, what the next meaningful gameplay pressure should be.

This is a **design + simulation audit**, not an implementation step.

The purpose is to identify one concrete next problem that the player should eventually have to solve while preserving the simplicity and deterministic character of the current simulation.

Do **not** implement the resulting gameplay mechanic in this step.

---

# 1. Absolute scope

This step must NOT add:

* new resources;
* new buildings;
* new workforce roles;
* new commands;
* new automation;
* new progression stages;
* new logistics systems;
* transportation;
* pollution;
* happiness;
* population needs;
* maintenance systems;
* research;
* technology trees;
* events;
* disasters;
* randomization;
* new UI concepts;
* persistence fields;
* SAVE_VERSION changes.

Do not "prototype" a mechanic in production code.

The only permitted source changes are:

* focused audit tests;
* deterministic measurement fixtures;
* minimal test-only helpers;
* documentation.

If the current implementation contains a genuine correctness problem discovered during the audit, document it separately. Do not expand scope into fixing unrelated behavior.

---

# 2. Start from the actual simulation

Read the implementation and the current roadmap before designing anything.

Do not assume the roadmap is authoritative where the code says otherwise.

Reconstruct the current playable simulation:

### Existing production

* Farm → Food
* Well → Water
* Workshop → Material

### Existing workforce

* colonists;
* manual workplace assignment;
* Farm / Well / Workshop allocation;
* reassignment.

### Existing spatial model

* settlement grid;
* buildings;
* roads;
* road networks;
* building accessibility.

### Existing progression

* Village;
* Town;
* Town workforce allocation review.

### Existing persistence

* save/load;
* deterministic hashing;
* `SAVE_VERSION = 8`.

Identify what the player can currently optimize and what consequences those decisions create.

---

# 3. Build a current gameplay pressure map

Create a deterministic audit fixture representing a healthy settlement around the current Town boundary.

Use actual simulation rules.

Measure at least:

| Dimension   | Measure                                 |
| ----------- | --------------------------------------- |
| Population  | current population                      |
| Workforce   | assigned / unassigned                   |
| Farms       | staffed / total                         |
| Wells       | staffed / total                         |
| Workshops   | staffed / total                         |
| Food        | stock + production rate                 |
| Water       | stock + capacity + production/headroom  |
| Material    | stock + production rate + storage       |
| Roads       | networks / accessible buildings         |
| Progression | current stage + blockers                |
| Town        | condition + workforce review capability |

Then identify:

1. What can the player currently improve?
2. What can the player currently sacrifice?
3. What can become constrained?
4. What becomes irrelevant once Town is reached?
5. What resources accumulate without a meaningful downstream consequence?
6. What decisions disappear after the player solves the initial workforce allocation?

Do not invent answers before measuring them.

---

# 4. Measure the current three-way decision

Reproduce the established 10BU-style allocation experiment using the current implementation.

At a representative workforce size, measure:

### Baseline

Farm / Well / Workshop balanced.

### Farm-heavy

Move one Workshop worker to Farm.

### Well-heavy

Move one Workshop worker to Well.

### Workshop-heavy

Move one Farm or Well worker to Workshop.

Record:

* Food production;
* Water production;
* Material production;
* resulting stocks;
* capacity/headroom;
* progression consequences;
* Town consequences.

The goal is to determine **how long this decision remains meaningful after Town**.

Do not change coefficients.

---

# 5. Identify dead-end resources

For every existing resource:

## Food

Determine:

* where it is produced;
* where it is consumed;
* whether its stock can become strategically meaningful;
* whether its production can create a future constraint using only current rules.

## Water

Determine:

* production;
* capacity;
* current consumption;
* headroom;
* whether increasing Water currently creates a meaningful trade-off.

## Material

Determine:

* production;
* storage;
* current sinks;
* whether stock accumulation eventually stops being meaningful.

Do not add sinks.

The question is purely:

> Which existing resource currently has the weakest gameplay consequence, and why?

Support the answer with measurements from the actual simulation.

---

# 6. Identify the current spatial pressure

Audit the existing road/accessibility system.

Measure:

* number of road networks;
* buildings per network;
* accessible versus inaccessible buildings;
* production changes caused by accessibility;
* consequences of splitting a network;
* consequences of reconnecting a network.

Determine whether spatial placement currently creates an actual optimization problem or merely a validity requirement.

Important distinction:

> A system being spatially represented does not automatically mean it creates meaningful spatial strategy.

Do not add pathfinding or transportation.

---

# 7. Identify the current temporal pressure

Run deterministic simulations over multiple ticks.

Use at least:

* balanced allocation;
* Farm-heavy allocation;
* Well-heavy allocation;
* Workshop-heavy allocation.

Measure resource trajectories.

Look for:

* stock accumulation;
* depletion;
* saturation;
* stable equilibrium;
* irreversible drift;
* thresholds;
* periods where allocation matters;
* periods where allocation becomes irrelevant.

The key question:

> Does the current simulation force the player to think beyond the current tick?

If yes, document exactly why.

If no, document where the system becomes effectively static.

---

# 8. Find the first qualitatively new problem

Do NOT select the next feature because it is familiar from other city-builders.

Instead, identify the first point where the current player can reasonably say:

> "I can't simply keep doing the same thing. I need to make a different kind of decision."

Classify candidate pressures into categories:

### A — Workforce pressure

More workers competing for existing roles.

### B — Resource pressure

Existing resources becoming insufficient or strategically constrained.

### C — Spatial pressure

Placement/accessibility becoming a meaningful trade-off.

### D — Temporal pressure

A decision becoming different depending on future consequences.

### E — Capacity pressure

Existing capacities becoming limiting.

### F — Progression pressure

A future milestone requiring preparation.

Do not create these pressures artificially.

Determine which categories already emerge naturally from the current rules and which do not.

---

# 9. Generate candidate next pressures

Produce **at least three candidate pressures**, but do not implement them.

For each candidate document:

### Candidate name

Short descriptive name.

### Player problem

What decision would the player actually face?

### Existing foundation

Which current systems support it?

### New state required

What would need to be added?

### New rules required

What simulation behavior would change?

### Player decision

What would the player choose between?

### Trade-off

What is gained and what is sacrificed?

### Persistence impact

Would SAVE_VERSION or save data need to change?

### UI impact

Would existing UI suffice, or would a new presentation concept be required?

### Determinism impact

Would the feature introduce ordering/randomness concerns?

### Failure mode

How could the feature become busywork instead of strategy?

---

# 10. Score candidates without creating a ranking

Do not produce a "best feature" ranking.

Instead, evaluate each candidate independently against these dimensions:

| Dimension             | Question                                            |
| --------------------- | --------------------------------------------------- |
| Existing-system reuse | How much current simulation can support it?         |
| Decision quality      | Does it create an actual choice rather than a task? |
| Trade-off clarity     | Are consequences understandable?                    |
| Spatial relevance     | Does it use NOVA's grid meaningfully?               |
| Temporal relevance    | Does it create planning beyond one tick?            |
| Complexity            | How much new state/rules are required?              |
| Persistence cost      | Does save format need changes?                      |
| UI cost               | Can current presentation communicate it?            |
| Determinism risk      | Does it complicate deterministic simulation?        |
| Exploit risk          | Can it be trivially optimized or ignored?           |

Use qualitative descriptions such as:

* low;
* moderate;
* substantial;
* high.

Do not calculate a total score.

Do not rank the candidates.

The purpose is to expose trade-offs, not select a winner numerically.

---

# 11. Determine the smallest meaningful next mechanic

After documenting the candidates, identify the **minimum new mechanic** required to create the first qualitatively new player decision.

This must satisfy:

1. It builds directly on existing NOVA systems.
2. It creates a genuine trade-off.
3. It does not require a large subsystem.
4. It does not introduce unnecessary abstraction.
5. It preserves deterministic simulation.
6. It can be explained to the player simply.
7. It produces consequences visible in the existing simulation.
8. It does not turn NOVA into a conventional resource spreadsheet.
9. It has a clear reason to exist after Town.
10. It can be implemented as one coherent future step.

This is a design conclusion only.

**Do not implement it.**

---

# 12. Explicit anti-feature audit

Before finalizing the recommendation, test the candidate against these failure modes:

### Spreadsheet inflation

Does it merely add another number/resource?

### Busywork

Does it require repetitive manual actions without meaningful decisions?

### Fake complexity

Does it create complexity without creating a new consequence?

### UI debt

Does it require a large new dashboard merely to understand the mechanic?

### Automation pressure

Would the player immediately want an automatic system to manage it?

### Resource treadmill

Does it simply create:

`resource A → resource B → resource C → resource A`

without strategic choice?

### Existing-system bypass

Does it make Farm/Well/Workshop/workforce allocation irrelevant?

### Progression shortcut

Does it accidentally bypass Village/Town conditions?

### Determinism degradation

Does it require unnecessary randomness or ordering-dependent behavior?

Reject or redesign candidates that primarily exhibit these failure modes.

---

# 13. Tests

Because this is an audit step, tests must validate the **measurement**, not a future mechanic.

Create:

`tests/nextGameplayPressureAudit.test.ts`

Tests should verify the deterministic fixtures used to produce the report.

At minimum:

* baseline settlement fixture;
* Farm-heavy allocation;
* Well-heavy allocation;
* Workshop-heavy allocation;
* multi-tick trajectories;
* stock/rate/headroom measurements;
* Town state;
* road/accessibility state;
* save/load equivalence;
* insertion-order determinism.

The test suite must fail if the measured current behavior changes unexpectedly.

Do not add speculative tests for mechanics that do not yet exist.

---

# 14. Documentation

Create:

`docs/roadmap/STEP10CA.md`

Structure:

## Step 10CA — Next Gameplay Pressure Audit

### Baseline

`0614429`

### Current simulation

Describe the as-built systems.

### Current decision space

What the player can currently control.

### Three-way workforce experiment

Provide measured results.

### Resource pressure

Food / Water / Material analysis.

### Spatial pressure

Road/accessibility analysis.

### Temporal pressure

Multi-tick analysis.

### Capacity pressure

Current capacity constraints.

### Progression pressure

Village/Town consequences.

### Candidate pressures

At least three, each independently evaluated.

### Failure-mode audit

Explain which candidate risks spreadsheet inflation, busywork, fake complexity, etc.

### Minimum meaningful next mechanic

Describe the proposed future mechanic without implementing it.

### Why it belongs after Town

Explain what changes for the player after reaching Town.

### Implementation boundary

State what the future implementation would need to add, but do not add it now.

### Validation

Record exact test results.

### Scope confirmation

Explicitly state:

> Step 10CA is an audit/design step. No gameplay functionality was added.

---

# 15. Browser/GPU validation

No gameplay/UI changes should occur.

Therefore:

* headed browser regression is optional unless the audit fixture requires browser execution;
* GPU validation is not required if no rendering code changes;
* do not fabricate browser/GPU results.

If tests or the existing audit workflow require browser verification, run it and report it accurately.

At minimum run:

* focused audit tests;
* relevant existing simulation tests;
* full Vitest;
* typecheck;
* lint;
* build;
* `git diff --check`.

---

# 16. User-owned files

Do not modify:

* `docs/roadmap/Step10BO - Copy.md`
* `docs/roadmap/Step10BT.md`

They must remain untouched and untracked.

---

# 17. Commit

Commit exactly:

`Step 10CA: Next Gameplay Pressure Audit`

Do not amend:

* `0614429`;
* any previous commit.

Do not include unrelated files.

Before committing, verify:

```text
git status
git diff --check
git diff --stat
git status --short
```

Confirm the user-owned roadmap files remain untouched and untracked.

---

# 18. Final report

Return:

* commit hash;
* files changed;
* current measured gameplay pressure;
* three-way workforce measurements;
* resource analysis;
* spatial analysis;
* temporal analysis;
* capacity/progression analysis;
* candidate pressures;
* independent trade-off evaluation;
* failure-mode audit;
* minimum meaningful next mechanic;
* exact validation results;
* explicit statement that no gameplay functionality was added.

Do not implement the proposed next mechanic during 10CA.

The purpose of this step is to answer one question rigorously:

> **What is the next genuinely meaningful problem NOVA should make the player solve?**

---

# Documentation (as-built)

## Current gameplay pressure map

The deterministic Town-boundary fixture reached Town with 10 population, 6 staffed Farms, 3 staffed Wells, 1 staffed Workshop, Food production 12/tick against consumption 10/tick, Water capacity 6/tick, one connected road network, and Town workforce review available. Town currently guarantees a staffed Workshop and Food balance, but it does not require Water capacity to cover every population worker.

The existing pressure is therefore:

- Food is balanced in the measured Town fixture.
- Water remains a capacity/headroom concern because 3 staffed Wells provide capacity 6 against need 10.
- Material remains a rate/stock concern rather than a new sink.
- The three-way workforce allocation remains the clearest current decision.
- Road representation is an eligibility constraint; the controlled split did not create a new production cost.
- Multi-tick rates remain stable while stocks change, so the current game has limited temporal pressure beyond allocation and recovery.

## Current three-way decision

At the representative workforce size, moving a Workshop worker to a Farm raised Food and reduced Material; moving a Workshop worker to a Well raised Water and reduced Material. Reversing the Farm move restored the original Material rate. The decision is persistent, reversible, and already visible through the Town workforce review.

## Candidate next pressures

### Candidate A — Water headroom planning

- **Player problem:** choose whether to allocate a scarce worker to Food, Water, or Material while Town does not require full population Water coverage.
- **Existing foundation:** Well capacity, Water admission/headroom, manual Farm/Well/Workshop allocation, Town gate.
- **New state required:** none for a first derived capability; no canonical state is required.
- **New rules required:** none for the candidate as currently measured; a future mechanic would need an explicit Water planning consequence.
- **Player decision:** accept lower current headroom for Food/Material or rebalance toward Water.
- **Trade-off:** population/service security versus production/construction capacity.
- **Persistence/UI/determinism:** no persistence change is inherently required; existing allocation UI can express it; deterministic if based on current rates.
- **Failure mode:** a speculative forecast or hidden penalty could turn Water into a spreadsheet tax.

### Candidate B — Construction/expansion preparation

- **Player problem:** decide when to divert a worker to Construction Crew versus preserve current Food/Water/Material rates.
- **Existing foundation:** Construction Crew, Material production/upkeep, building construction costs, Town workforce review.
- **New state required:** none for the existing temporary trade-off.
- **New rules required:** a future capability would need a persistent multi-step construction consequence, which is not currently justified.
- **Player decision:** accept temporary production loss for faster expansion.
- **Trade-off:** current rates versus earlier capacity.
- **Persistence/UI/determinism:** current command and derived UI are sufficient; no new state is needed for a design-only extension.
- **Failure mode:** repetitive crew toggling or a predictable delay with no strategic consequence.

### Candidate C — Spatial network composition

- **Player problem:** decide whether to expand along one connected road network or accept disconnected/inaccessible production.
- **Existing foundation:** roads, networks, building access, mobility-gated assignment, distance-first assignment.
- **New state required:** none for a first candidate; any transport/logistics layer would be a new subsystem.
- **New rules required:** spatial accessibility already exists; a new rule would require evidence of a meaningful layout trade-off beyond validity.
- **Player decision:** reconnect, cluster, or accept lower staffing.
- **Trade-off:** compactness/accessibility versus expansion room.
- **Persistence/UI/determinism:** existing UI and canonical road state can express it; deterministic ordering already exists.
- **Failure mode:** adding logistics before a measured spatial optimization problem.

## Minimum meaningful next mechanic

No new mechanic is justified yet. The smallest honest next step is a **Water headroom planning capability** only if a future audit demonstrates that the current Town state repeatedly forces a Water-versus-Food/Material choice at a larger scale. It should begin as derived feedback over existing Well capacity, Water need, and allocation state, not as a new resource, penalty, or persistence field.

Town workforce review already makes the existing three-way choice actionable; Candidate B is temporary and self-recovering; Candidate C is currently validity rather than strategy. The recommended next action is therefore another measurement/design gate, not implementation.

## Scope confirmation

Step 10CA is an audit/design step. No gameplay functionality was added. No resource, building, command, workforce role, progression stage, persistence field, or `SAVE_VERSION` change was introduced.

## Files changed

- `docs/roadmap/Step10CA.md`
- `tests/nextGameplayPressureAudit.test.ts`

## Validation

- focused CA tests: 5 PASS;
- relevant compatibility set: 42 PASS;
- typecheck: PASS;
- lint: PASS;
- build: PASS;
- full Vitest: 1,701 / 1,703 PASS; two unrelated existing 5-second timeouts in `industrialHeadroomTownDecision.test.ts` and `productionRatioTuningAudit.test.ts`;
- browser/GPU: not rerun; no runtime/UI change;
- `git diff --check`: PASS when invoked directly; shell wrapper emitted a non-content exit anomaly.

## Commit

`0996485` — Step 10CA: audit next gameplay pressure

