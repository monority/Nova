# NOVA — Step 10BZ — Simulation Contract Freeze & Boundary Audit

## Baseline

* Previous step: `Step 10BY — Core Simulation Hardening`
* Baseline commit: `2f0670e`
* SAVE_VERSION: `8`

## Objective

Freeze the current simulation contracts before introducing any new gameplay system.

This step is **not a gameplay feature**.

Do not add:

* resources;
* buildings;
* workforce roles;
* commands;
* automation;
* progression stages;
* production rules;
* logistics;
* transportation;
* new UI concepts;
* new persistence fields;
* new simulation mechanics.

The objective is to make the current simulation model explicit enough that the next gameplay system can be implemented against stable contracts rather than assumptions.

---

# 1. Reconstruct the current authoritative model

Inspect the actual implementation, not previous roadmap descriptions.

Identify and document the authoritative source for:

* `ColonistState`;
* workplace assignment;
* building state;
* Farm;
* Well;
* Workshop;
* Food;
* Water;
* Material;
* storage/capacity;
* production rates;
* worker counts;
* construction crew;
* Village;
* Town;
* progression conditions;
* reassignment;
* simulation tick;
* save/load;
* hashing/determinism;
* derived economy queries;
* derived progression queries;
* UI-facing simulation queries.

For every concept, determine:

1. What is persisted?
2. What is derived?
3. What mutates it?
4. What reads it?
5. What is authoritative when two representations appear to contain the same information?

Do not refactor merely for style.

---

# 2. Establish explicit invariants

Create a concise simulation-contract section in:

`docs/roadmap/STEP10BZ.md`

Document the invariants that are now guaranteed by the implementation.

At minimum cover:

### Workforce

* Every persisted workplace reference is valid.
* A colonist cannot occupy multiple workplaces.
* Worker counts correspond to actual assignments.
* Invalid assignments cannot silently enter state.
* Unassigned colonists remain representable.
* Reassignment is deterministic.

### Buildings

For Farm, Well and Workshop:

* capacity is respected;
* worker count is derived or synchronized according to the existing architecture;
* operational state remains authoritative;
* production uses the existing worker/accessibility rules;
* no duplicate source of truth is introduced.

### Economy

Document explicitly:

* stock;
* capacity;
* production rate;
* consumption/balance where applicable;
* headroom.

Verify that these concepts are not accidentally conflated.

### Progression

Document:

* Village conditions;
* Town conditions;
* Town workforce review capability;
* which values are derived;
* whether progression is monotonic or dynamically derived in the current implementation.

Do not change behavior merely to make it conceptually prettier.

---

# 3. Define command boundaries

Audit every existing simulation mutation command/action.

For each command, record:

* valid inputs;
* invalid inputs;
* no-op behavior;
* state it is allowed to mutate;
* state it must never mutate;
* deterministic behavior.

Pay particular attention to:

* worker reassignment;
* construction;
* production/tick;
* progression;
* save/load restoration.

The goal is to prevent future gameplay features from bypassing the domain/application boundaries.

Do not introduce a command registry or abstraction unless the existing architecture genuinely requires it.

---

# 4. Define tick boundaries

Inspect the actual simulation tick.

Document the current order of operations.

For example, if applicable:

1. resolve workforce;
2. evaluate operational state;
3. produce resources;
4. apply upkeep;
5. update progression;
6. derive presentation values.

Use the real implementation order.

Do not reorder the tick unless a concrete correctness bug is found.

If the existing order is already correct, lock it with a regression test rather than changing it.

Add tests for any ordering dependency that could silently alter gameplay if future systems are inserted into the tick.

---

# 5. Define persistence boundaries

Verify that:

* persisted state contains only authoritative state;
* derived values are not redundantly persisted;
* loading reconstructs the same derived state;
* save/load/continue is equivalent to uninterrupted simulation;
* record insertion order does not alter results;
* hashing remains deterministic;
* `SAVE_VERSION` remains `8`.

Do not introduce a migration.

Do not modify the save format.

---

# 6. Define deterministic boundaries

Audit all places where iteration order could influence simulation:

* colonists;
* buildings;
* assignments;
* roads/accessibility if consumed by current simulation;
* resource calculations;
* progression evaluation;
* save/load reconstruction.

If deterministic ordering is already guaranteed, encode that guarantee in tests.

If an implementation relies accidentally on object/map insertion order, make the smallest safe internal correction possible without changing intended gameplay.

Add regression coverage proving equivalent logical states produce equivalent results.

---

# 7. Derived-query contract audit

Verify that existing derived queries are internally consistent.

At minimum:

* Farm/Well/Workshop allocation summary;
* Food balance;
* Water headroom;
* resource production rates;
* Town status;
* Town blockers;
* Town workforce review capability.

For each query:

* no mutation;
* deterministic output;
* same result for equivalent state;
* no hidden persistence;
* no duplicated simulation logic that can diverge from authoritative rules.

If two queries independently reimplement the same rule and can drift apart, consolidate only if this is a small, behavior-preserving correction.

---

# 8. Boundary tests

Create or extend focused tests covering the contracts above.

Include:

### Workforce

* zero colonists;
* one colonist;
* many colonists;
* unassigned colonists;
* full building;
* reassignment between every existing workforce type;
* invalid target;
* repeated reassignment;
* rejected reassignment;
* save/load after reassignment.

### Economy

* zero workers;
* one worker;
* maximum workers;
* Farm-heavy;
* Well-heavy;
* Workshop-heavy;
* three-way balanced allocation;
* reverse allocation;
* production versus accumulated stock;
* capacity boundaries.

### Progression

* below Village requirements;
* exact Village requirements;
* above Village requirements;
* Town requirements satisfied;
* Town requirements invalidated by workforce reassignment;
* Town workforce review after save/load.

### Determinism

Run equivalent states constructed through different insertion orders where the architecture permits this comparison.

### Persistence

Verify:

`simulate → save → load → continue`

produces the same state/hash as:

`simulate → continue`

for a representative deterministic scenario.

---

# 9. Architecture boundary audit

Inspect imports and dependencies between:

* domain;
* application;
* simulation;
* rendering;
* UI.

Look specifically for:

* UI code mutating domain state directly;
* rendering code becoming authoritative for simulation;
* domain code depending on React/browser concerns;
* duplicated business rules in UI;
* persistence logic leaking into gameplay rules.

Fix only concrete violations.

Do not perform a broad architectural rewrite.

---

# 10. Browser regression

Because this is a contract-freeze step rather than a UI feature, browser validation is regression-only.

Verify existing functionality at:

* `1280×800`;
* `420×740`;
* `360×640`.

Verify:

* settlement loads;
* existing allocation information remains visible;
* Farm/Well/Workshop inspection remains functional;
* worker reassignment remains functional;
* Town progression remains readable;
* Town workforce review remains visible when applicable;
* no console errors;
* no unexpected layout regression.

Run the existing GPU/WebGL2 validation with the NVIDIA RTX 3070 environment.

Do not redesign the UI.

---

# 11. Test quality audit

Do not merely increase test count.

For each new contract test, ensure it would actually fail if the protected invariant were broken.

Avoid:

* redundant tests;
* implementation-detail assertions;
* snapshots that merely restate markup;
* tests that pass because of incidental fixtures.

Prefer deterministic, behavior-level assertions.

---

# 12. Documentation

Create:

`docs/roadmap/STEP10BZ.md`

Include:

## Step 10BZ — Simulation Contract Freeze

### Baseline

`2f0670e`

### Scope

Explain that this step introduces no gameplay.

### Authoritative State Model

List persisted versus derived state.

### Simulation Invariants

Document the final invariants.

### Command Boundaries

Document mutation contracts.

### Tick Order

Document the real current tick order.

### Persistence Contract

Document what is persisted and reconstructed.

### Determinism Contract

Document ordering guarantees.

### Progression Contract

Document Village/Town semantics.

### Architectural Boundaries

Document the domain/application/rendering/UI separation actually present.

### Validation

Record exact test and verification results.

### Scope Confirmation

Explicitly state:

> No new gameplay functionality was added.

Also state:

* no new resource;
* no new building;
* no new command;
* no new workforce role;
* no new progression stage;
* no persistence format change;
* `SAVE_VERSION` remains `8`.

---

# 13. User-owned files

Do not modify:

* `docs/roadmap/Step10BO - Copy.md`
* `docs/roadmap/Step10BT.md`

They are user-owned and must remain untouched and untracked.

---

# 14. Required validation

Before committing:

1. focused 10BZ contract tests;
2. existing workforce tests;
3. economy tests;
4. progression/Town tests;
5. save/load tests;
6. determinism tests;
7. full Vitest;
8. TypeScript typecheck;
9. ESLint;
10. production build;
11. headed browser regression;
12. responsive validation at:

* 1280×800
* 420×740
* 360×640

13. GPU/WebGL2 E2E;
14. `git diff --check`;
15. final diff audit.

Do not report a validation as passed unless it was actually executed.

---

# 15. Scope guard

Before committing, explicitly inspect the diff for accidental gameplay changes.

The diff must contain only:

* contract/invariant tests;
* documentation;
* strictly necessary behavior-preserving correctness fixes;
* minimal internal refactoring required to enforce the contracts.

If you discover a genuine gameplay bug whose correction would alter intended behavior, **do not silently include it**.

Document it separately and stop before implementing it unless it is required to preserve an existing invariant.

---

# 16. Commit

Commit exactly:

`Step 10BZ: Simulation Contract Freeze`

Do not amend previous commits.

Do not include unrelated files.

Verify:

```text
git status
git diff --check
git diff --stat HEAD~1
git show --stat --oneline HEAD
```

Confirm the two user-owned roadmap files remain untouched and untracked.

---

# Final report

Return a concise but complete report containing:

* commit hash;
* files changed;
* authoritative state model;
* invariants established;
* command boundaries;
* tick order;
* persistence contract;
* determinism contract;
* architecture findings;
* bugs found and fixed, if any;
* exact validation counts/results;
* browser/responsive/GPU result;
* confirmation that `SAVE_VERSION = 8`;
* confirmation that no gameplay behavior was intentionally changed;
* explicit statement:

> No new gameplay functionality was added.

Do not propose the next gameplay mechanic inside this step.

The purpose of 10BZ is to leave NOVA with a **stable, explicit simulation contract** that future gameplay systems can safely build upon.

---

# Documentation (as-built)

## Audit scope

Step 10BZ is a contract-freeze and boundary audit. No gameplay, command, resource, building, progression, UI concept, or persistence behavior was added.

## Authoritative state model

Persisted state remains `SimulationState`: world/config, tick, canonical buildings, roads, colonists, resource stocks, construction/storage state, and counters. Derived state remains derived: worker counts, production rates, Food balance, Water capacity/headroom, Town status/blockers, Town capability review, road access, and progression conditions.

## Simulation invariants

- Workplace references are valid canonical building IDs.
- A colonist has at most one workplace; each workplace has capacity one.
- Worker counts derive from colonist assignments.
- Assignment, production, and derived queries use sorted canonical iteration.
- Rejected commands return the existing failure result without mutating state.
- Production rates remain distinct from resource stocks and capacities.
- Town is dynamically derived and can be invalidated by reallocating its Workshop worker.
- Save/load/continue matches uninterrupted simulation.
- Reversed record insertion order preserves canonical hashes and derived results.

## Command boundaries

`placeBuilding`, `placeRoads`, `reassignColonist`, and `assignConstructionCrew` remain the sanctioned mutation paths. Each validates through existing domain/application predicates, returns the existing accepted/reason convention, and never persists presentation state.

## Tick order

The existing phase order remains authoritative: construction, needs/consumption, population, job assignment, material production, command application/construction catch-up, upkeep, and time advancement. Progression and Town are derived after state changes; no new phase was inserted.

## Persistence and determinism

`SAVE_VERSION` remains 8. No migration or persisted field was added. The focused contract suite verifies save/load continuation and record-order/hash equivalence.

## Progression and architecture

Village and Town requirements remain derived from existing resource/workforce queries. The domain/application/rendering/UI separation is unchanged; the browser hook remains localhost-only test instrumentation.

## Validation

- focused contract tests: 7 PASS;
- focused hardening/progression/economy set: 26 PASS;
- relevant compatibility set: 66 PASS;
- full Vitest: 1,698 / 1,698 PASS;
- typecheck: PASS;
- lint: PASS;
- build: PASS;
- headed Town browser regression: PASS at 1280×800, 420×740, and 360×640;
- headed GPU/WebGL2 regression: PASS with NVIDIA RTX 3070;
- `git diff --check`: PASS.

## Scope confirmation

No new gameplay functionality was added. No resource, building, command, workforce role, progression stage, persistence field, or `SAVE_VERSION` change was introduced.

## Files changed

- `docs/roadmap/Step10BZ.md`
- `tests/simulationContractFreeze.test.ts`

## Commit

`fc670bc` — Step 10BZ: freeze simulation contracts

