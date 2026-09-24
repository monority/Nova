# NOVA — Step 10BX

## Core Simulation Hardening

Repository: NOVA
Baseline: `88608e5`
Previous step: Step 10BW — Town Workforce Allocation Review

---

# 0. MISSION

This step is a HARDENING PASS.

Do not add gameplay.

Do not add capabilities.

Do not add buildings.

Do not add resources.

Do not add progression stages.

Do not redesign the economy.

Do not change the player-facing feature set.

The objective is to make the existing core simulation robust enough to serve as
the stable foundation for all future NOVA systems.

Current established model:

```
Colonists
    ↓
manual workforce allocation
    ↓
Farm / Well / Workshop
    ↓
Food / Water / Material
    ↓
Village conditions
    ↓
Town
    ↓
Town workforce allocation review
```

This model already works.

Step 10BX must make this model:

* internally consistent;
* explicit through invariants;
* resilient to invalid state;
* deterministic;
* persistence-safe;
* transition-safe;
* regression-resistant;
* well tested.

The feature set must remain functionally unchanged.

---

# 1. ABSOLUTE SCOPE RULE

At the end of this step, a normal player must have exactly the same
capabilities as at `88608e5`.

If a change makes the player able to do something that was previously
impossible, it is probably OUT OF SCOPE.

Allowed:

* bug fixes;
* invariant enforcement;
* defensive validation;
* correction of incorrect derived queries;
* deterministic ordering fixes;
* test infrastructure;
* test fixtures;
* documentation;
* internal refactoring with identical behavior;
* better validation of existing commands;
* correction of edge-case state transitions.

Not allowed:

* new gameplay;
* new resources;
* new buildings;
* new commands;
* new progression stages;
* new workforce roles;
* new automation;
* new economic rules;
* new UI concepts.

---

# 2. FIRST STEP — RECONSTRUCT THE CURRENT CONTRACT

Before modifying anything, inspect the actual implementation.

Identify the authoritative source for:

* ColonistState;
* workforce assignment;
* Farm production;
* Well production;
* Workshop production;
* Food;
* Water;
* Material;
* storage;
* Construction Crew;
* Village conditions;
* Town conditions;
* progression;
* manual reassignment;
* ticking;
* save/load;
* state hashing;
* derived queries;
* UI-facing queries.

Document the dependency graph internally.

Do not create duplicate sources of truth.

---

# 3. CORE STATE INVARIANTS

Establish explicit tests for the following invariants.

## Workforce

For every colonist:

* residence remains valid;
* workplace is either valid or explicitly unassigned according to existing rules;
* a colonist cannot occupy multiple workplaces simultaneously;
* a workplace assignment cannot reference a nonexistent building;
* workforce counts match the underlying colonist assignments.

If the existing model permits unassigned workers, preserve that behavior.

Do not invent new assignment semantics.

---

# 4. BUILDING / WORKFORCE CONSISTENCY

For every Farm, Well and Workshop:

Verify that derived staffing agrees with the authoritative colonist state.

The following must never diverge:

```
colonist workplace assignments
          ↕
building worker counts
          ↕
production query
```

If the code currently calculates any of these independently, identify the
source of truth and make the other representations derived.

Do not add persisted duplicate counters.

---

# 5. PRODUCTION INVARIANTS

Verify the existing production rules exactly.

Do not change coefficients.

The tests must establish the existing rules:

```
Farm
  → existing Food production

Well
  → existing Water production

Workshop
  → existing Material production
```

Also verify all existing operational conditions.

Examples:

* unstaffed building;
* staffed building;
* non-operational building;
* inaccessible building where the existing model already checks access;
* valid operational building.

Do not introduce new operational conditions.

---

# 6. RESOURCE SAFETY

Audit every existing resource mutation.

Verify:

* no accidental negative stock;
* no accidental NaN;
* no accidental Infinity;
* no uncontrolled overflow;
* existing clamps remain respected;
* storage limits remain respected;
* production and consumption ordering is deterministic.

Do not add new resource behavior.

If a resource can legitimately reach zero, preserve that behavior.

The test should distinguish:

```
zero
```

from:

```
invalid negative state.
```

---

# 7. RATE VS STOCK

Explicitly test the distinction between:

```
production rate
```

and:

```
accumulated stock.
```

A query reporting:

```
+4 Food/tick
```

must not be confused with:

```
Food stock = 4.
```

Verify that UI-facing derived summaries use the correct state.

This is especially important for:

* Food balance;
* Water headroom;
* Material production;
* Workshop output.

No UI redesign.

Only correctness.

---

# 8. WORKFORCE REALLOCATION SAFETY

Audit `reassignColonist` and its surrounding command path.

Test:

### Valid reassignment

```
Farm → Well
Well → Farm
Farm → Workshop
Workshop → Farm
Well → Workshop
Workshop → Well
```

### Same assignment

```
Farm → Farm
Well → Well
Workshop → Workshop
```

The behavior must follow the existing contract.

### Invalid assignment

Test:

* nonexistent colonist;
* nonexistent workplace;
* invalid building;
* incompatible target;
* invalid state;
* repeated command;
* reassignment after relevant building state changes.

Do not invent new error semantics.

Use the existing command/result convention.

---

# 9. NO DUPLICATE WORKFORCE

Explicitly test that repeated or conflicting reassignment cannot create:

```
one colonist
  →
two workplaces
```

or:

```
two worker records
  →
one logical colonist.
```

Test sequences such as:

```
Farm → Well
Farm → Workshop
```

and:

```
Farm → Well
Well → Workshop
Workshop → Farm
```

The final state must contain exactly one authoritative workplace assignment.

---

# 10. TICK ORDER HARDENING

Inspect the simulation tick order.

Document the existing order.

For example, determine whether the current simulation effectively performs:

```
workforce resolution
    ↓
production
    ↓
upkeep
    ↓
storage/clamping
    ↓
progression derivation
```

Do NOT change the order unless a concrete correctness bug is found.

Add regression tests proving that the existing order is stable.

The purpose is to prevent future features from accidentally depending on
implicit ordering.

---

# 11. ZERO / ONE / MANY EDGE CASES

Create focused fixtures for:

### Zero

* zero Farms;
* zero Wells;
* zero Workshops;
* zero assigned workers;
* zero Food;
* zero Water;
* zero Material.

### One

* one worker;
* one productive building;
* one resource producer.

### Many

* multiple Farms;
* multiple Wells;
* multiple Workshops;
* multiple workers;
* mixed allocation.

Do not change simulation behavior to make these cases prettier.

Document legitimate edge behavior.

---

# 12. EMPTY AND PARTIAL STATES

Test partially constructed worlds.

Examples:

```
Farm exists, no Well
Well exists, no Farm
Workshop exists, no Farm/Well
buildings exist but no workers
workers exist but no Workshop
Village conditions partially satisfied
Town conditions partially satisfied
```

The simulation must not crash.

Derived queries must return valid states.

Do not invent fallback gameplay.

---

# 13. PROGRESSION HARDENING

Audit:

```
Village → Town
```

without changing its requirements.

Test:

### Below threshold

Town must not be exposed.

### Exactly qualifying

Town must be exposed.

### Above qualifying

Town remains exposed.

### Reallocation

Move a worker so a Town requirement becomes invalid.

Verify the EXISTING contract.

This is critical:

Do not assume Town is permanently irreversible unless the implementation
explicitly defines that behavior.

Determine and test the actual intended progression semantics.

If Town is derived and can become invalid, test that transition.

If progression is monotonic, prove that through existing implementation.

Do not change it merely because another model might be preferable.

---

# 14. TOWN CAPABILITY HARDENING

10BW established:

```
Town workforce allocation review
```

This is a derived capability.

Verify that:

* it is available exactly when intended;
* it does not create persisted state;
* it does not modify workforce automatically;
* it does not alter production;
* it does not bypass existing reassignment validation;
* it survives save/load correctly.

No new capability.

---

# 15. THREE-WAY ECONOMY REGRESSION

Preserve the result established by 10BU.

The canonical audit fixture must still produce the known relationship.

Baseline example:

```
2 Farm / 2 Well / 1 Workshop
    Food = 4
    Water = 4
    Material = 2
```

Farm → Workshop:

```
1 Farm / 2 Well / 2 Workshop
    Food = 2
    Water = 4
    Material = 4
```

Well → Workshop:

```
2 Farm / 1 Well / 2 Workshop
    Food = 4
    Water = 2
    Material = 4
```

Reverse transitions must recover the original state.

If the repository's current exact fixture differs, use the authoritative
implementation values and document the difference.

Do not modify production values to match this document.

---

# 16. SAVE / LOAD HARDENING

Test the following states:

### Fresh Village

save → load → compare

### Active workforce allocation

save → load → compare

### Three-way allocation

save → load → compare

### Town-qualified state

save → load → compare

### Town state with workforce reassignment

save → load → compare

### Continue simulation

Compare:

```
uninterrupted simulation
```

against:

```
save
  ↓
load
  ↓
continue
```

They must produce identical relevant state.

No SAVE_VERSION change unless a genuine existing persistence bug requires it.

---

# 17. HASH / DETERMINISM HARDENING

Equivalent states must produce identical hashes.

Test deterministic behavior across:

* identical construction;
* identical worker assignment;
* reassignment sequences;
* save/load;
* tick sequences;
* derived queries.

Where existing architecture makes collection order relevant, verify that
equivalent logical states do not accidentally depend on insertion order.

Do not redesign hashing.

Do not add a second hashing system.

---

# 18. DERIVED QUERY CONSISTENCY

Audit all relevant derived queries.

For each query:

```
same state
   ↓
same answer
```

and:

```
mutate authoritative state
   ↓
query immediately reflects new state
```

No stale cached values.

Pay particular attention to:

* Farm/Well allocation summary;
* resource rates;
* Food balance;
* Water headroom;
* Town status;
* Town blockers;
* workforce allocation review.

Prefer derived state over persisted duplicate state.

---

# 19. UI CONTRACT

Do not redesign the UI.

Verify that the current UI accurately reflects authoritative state.

At minimum:

* workforce allocation summary;
* Food rate;
* Water headroom;
* Farm/Well/Workshop assignment;
* Village/Town status;
* Town blockers;
* Town workforce allocation review.

A UI display bug may be fixed if the underlying domain behavior is already
correct.

Do not introduce new panels or features.

---

# 20. BROWSER REGRESSION

Run the existing headed browser suite.

Validate:

```
1280×800
420×740
360×640
```

Verify:

* workforce allocation;
* Farm/Well/Workshop inspection;
* reassignment;
* resource consequences;
* Village/Town progression;
* Town capability review;
* responsive rendering.

No new browser feature should be added.

---

# 21. GPU REGRESSION

Run the existing GPU/WebGL2 E2E.

Expected:

```
NVIDIA RTX 3070
WebGL2
```

This is regression validation only.

Do not modify rendering architecture.

---

# 22. TEST QUALITY

Do not simply maximize test count.

For every new test ask:

> Does this test protect a real invariant or a previously discovered failure
> mode?

Prefer:

```
state → command → state
```

over:

```
implementation detail → implementation detail.
```

Tests should survive refactors.

Avoid asserting private implementation details unless those details are
the actual domain contract.

---

# 23. REFACTORING

Internal refactoring is allowed only when it makes an existing invariant
clearer or safer.

Examples:

* remove duplicated derived calculation;
* centralize an existing invariant;
* extract a pure query;
* simplify validation;
* improve deterministic ordering;
* improve test fixture construction.

Do not perform aesthetic refactoring unrelated to correctness.

Keep the diff small.

---

# 24. DOCUMENTATION

Create:

```
docs/roadmap/STEP10BX.md
```

Document:

## Audit scope

What was hardened.

## Existing invariants

The authoritative contracts discovered.

## Edge cases

Important boundary states tested.

## Progression

Existing Village → Town behavior verified.

## Workforce

Existing allocation guarantees verified.

## Economy

Existing Food / Water / Material relationship preserved.

## Persistence

SAVE_VERSION and save/load result.

## Determinism

Hash and replay result.

## Browser

Regression result.

## Findings

Only real bugs or risks discovered.

Do not document new gameplay because none should be added.

---

# 25. USER-OWNED FILES

These MUST remain untouched:

```
docs/roadmap/Step10BO - Copy.md
docs/roadmap/Step10BT.md
```

Do not:

* modify;
* rename;
* delete;
* stage;
* commit

either file.

---

# 26. REQUIRED VALIDATION

Before commit:

* focused hardening tests: PASS
* existing workforce tests: PASS
* existing economy tests: PASS
* progression tests: PASS
* save/load tests: PASS
* determinism tests: PASS
* full Vitest: PASS
* typecheck: PASS
* lint: PASS
* build: PASS
* headed browser regression: PASS
* responsive validation: PASS
* GPU/WebGL2 regression: PASS
* git diff --check: PASS

Then inspect:

```
git status
git diff --stat
git diff
```

The diff must contain ONLY Step 10BX work.

No unrelated changes.

---

# 27. COMMIT

Only after every validation passes:

```
Step 10BX: Core Simulation Hardening
```

Exactly one commit.

Do not amend:

```
88608e5
```

Do not include unrelated files.

---

# 28. FINAL REPORT

Return:

# Step 10BX — PASS / FAIL

## Hardened invariants

List the important contracts now explicitly protected.

## Bugs found

List actual bugs only.

If none:

```
No correctness bugs found.
```

## Changes

Exact files changed and purpose.

## Economy

Confirm Food / Water / Material behavior is unchanged.

## Workforce

Confirm allocation semantics are unchanged.

## Progression

Confirm Village → Town behavior is unchanged.

## Town

Confirm the existing Town capability is unchanged.

## Persistence

Report SAVE_VERSION.

## Determinism

Report exact result.

## Validation

Report exact counts for:

* focused tests;
* compatibility tests;
* full Vitest;
* typecheck;
* lint;
* build;
* browser;
* responsive;
* GPU/WebGL2;
* save/load;
* determinism;
* git diff --check.

## Scope confirmation

Explicitly confirm:

> No new gameplay functionality was added.

---

# CORE PRINCIPLE

This step is not:

```
"make NOVA bigger"
```

It is:

```
"make the existing NOVA core trustworthy."
```

At the end:

```
Workforce
    ↓
Farm / Well / Workshop
    ↓
Food / Water / Material
    ↓
Village
    ↓
Town
    ↓
workforce allocation review
```

must behave as one coherent deterministic system.

Do not add anything beyond that.

Harden the foundation before building on it.

---

# Documentation (as-built)

## Audit scope

Step 10BY was a hardening-only pass over the existing 10BW model. No gameplay, command, resource, building, progression, UI concept, or persistence behavior was added.

The new suite `tests/coreSimulationHardening.test.ts` protects state/assignment consistency, production-rate versus stock distinctions, partial worlds, invalid command handling, Town revalidation, save/load continuation, and record-order determinism.

## Existing invariants verified

- Every colonist has at most one workplace reference.
- Every workplace reference resolves to a canonical building.
- Farm/Well/Workshop capacity never exceeds one worker per building.
- Derived Farm/Well allocation summary agrees with production queries and current stocks.
- Food, Water, and Material rates remain distinct from accumulated stock.
- Empty and partial worlds return valid zero/partial derivations.
- Rejected reassignment commands leave canonical state unchanged.
- Three-way Farm/Well/Workshop production relationships remain reversible.
- Town is derived and is invalidated when a staffed Workshop is reallocated away.
- Save/load followed by continuation matches uninterrupted simulation.
- Reversed canonical record insertion order preserves hashes and derived results.

## Edge cases

Tested zero, one, and many cases for Farms, Wells, Workshops, workers, and resources. Partial worlds such as Farm-only, Workshop-only, and unstaffed buildings remain valid and do not crash derived queries.

## Progression and Town

The existing Village → Town gate remains unchanged: Town requires the Village conditions, a staffed Workshop, and Food balance. The Town workforce allocation capability remains derived and has no persisted state.

## Workforce and economy

The type-blind workforce, manual reassignment, distance/ID assignment, Construction Crew, Food/Water/Material coefficients, and Storage semantics are unchanged. The hardening suite found no production or persistence defect requiring a code fix.

## Persistence and determinism

`SAVE_VERSION` remains 8. Save/load and continue-simulation equivalence pass for the active mixed allocation. No new canonical or persisted field was introduced. Reversed record order preserves hashes and derived results.

## Browser and GPU

The existing Town headed browser E2E passed, including Town capability visibility and responsive layouts at 1280×800, 420×740, and 360×640. The existing GPU E2E passed with WebGL2 and NVIDIA RTX 3070. No browser-only behavior was added.

## Findings / Future Work

- Existing core state and derived-query boundaries are sufficiently explicit for the current feature set.
- No concrete bug was found that justified a defensive production-code change in this pass.
- Future work should begin only from a measured failure, not from generic hardening expansion.

## Files changed

- `docs/roadmap/STEP10BY.md`
- `tests/coreSimulationHardening.test.ts`

## Validation

- focused hardening/progression/economy tests: 26 PASS;
- full Vitest: 1,691 / 1,691 PASS;
- typecheck: PASS;
- lint: PASS;
- build: PASS;
- headed Town browser E2E: PASS;
- headed GPU/WebGL2 E2E: PASS;
- `git diff --check`: PASS.

## Commit

`728d124` — Step 10BY: harden core simulation invariants

