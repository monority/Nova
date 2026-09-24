# NOVA — Step 10BI — Storage Reserve Behavior Audit

## 0. Mission

Audit the **actual runtime behavior** of the current Storage reserve model before introducing any release semantics.

Step 10BH established the design decision:

> **Model A — protected deterministic reserve**

Current capacities remain:

```text
Food     50
Water    30
Material 40
```

The current implementation only routes **Material production overflow** into Storage.

Step 10BI must now determine, with executable evidence, exactly how this reserve behaves across ticks, production, construction, save/load, hashing, and edge cases.

### Critical constraint

**This is an audit step, not a feature step.**

Do not introduce release semantics.

Do not make Storage automatically available for construction.

Do not add UI controls.

Do not add storage buildings.

Do not add workers, hauling, roads, logistics, networks, throttling, or new production systems.

If the current implementation is already correct, the expected source-code change may be **tests only**, or even documentation/tests with no runtime change.

If the audit discovers an actual bug, fix only that bug and document it explicitly.

---

# 1. Read the current project state first

Before changing anything:

1. Read the current NOVA architecture documentation.
2. Read the existing Storage implementation.
3. Read the current `SimulationState` definition.
4. Read the Workshop production implementation.
5. Read Material construction consumption.
6. Read tick progression.
7. Read save/load serialization.
8. Read state hashing.
9. Read all existing Storage tests.
10. Read the latest roadmap entries around 10BG → 10BH.
11. Inspect the current git status and diff.

Do not rely on the roadmap alone.

The repository is the source of truth.

---

# 2. Current intended model

The current model should remain conceptually:

```text
Production
    ↓
Main resource stock
    ↓
capacity / overflow
    ↓
Protected Storage reserve
```

Storage is a **parallel protected buffer**.

It is not:

```text
second construction stock
```

It is not:

```text
warehouse inventory
```

It is not:

```text
automatic emergency supply
```

It is not:

```text
worker-managed logistics
```

It is simply a deterministic reserve.

---

# 3. Audit objective

Establish the exact behavior of:

### Production

* normal production;
* production reaching capacity;
* production exceeding capacity;
* repeated overflow;
* Storage already partially filled;
* Storage completely full.

### Construction

* construction with sufficient main Material;
* construction consuming main Material while Storage contains Material;
* construction with insufficient main Material while Storage contains enough Material;
* construction when both main Material and Storage are insufficient.

### Tick ordering

Determine precisely whether the current simulation does:

```text
production
→ overflow
→ construction
```

or another ordering.

Do not change ordering during this step.

Document the actual order.

---

# 4. Required behavioral matrix

Create executable tests covering the following matrix.

## Case A — No overflow

```text
main Material < capacity
production fits completely
Storage unchanged
```

Expected:

```text
main Material += production
Storage unchanged
```

---

## Case B — Exact main capacity

```text
main Material + production === main capacity
```

Expected:

```text
main Material === capacity
Storage unchanged
```

No false overflow.

---

## Case C — Small overflow

Example:

```text
main Material = 39
production = 5
main capacity = 40
Storage = 0
Storage capacity = 40
```

Expected:

```text
main Material = 40
Storage = 4
```

Adapt exact numbers to the actual project constants.

---

## Case D — Storage already partially filled

Example:

```text
main Material = 39
production = 5
Storage Material = 10
```

Expected:

```text
main Material = 40
Storage Material = 14
```

The overflow must be additive and deterministic.

---

## Case E — Storage reaches exact capacity

Example:

```text
main Material = 39
production = 41
Storage Material = 0
Storage capacity = 40
```

Expected:

```text
main Material = 40
Storage = 40
```

Any amount beyond total available capacity must follow the existing resource-loss behavior.

Do not invent a new sink or redistribution rule.

Document the actual behavior.

---

## Case F — Storage already full

Example:

```text
main Material = 39
production > 1
Storage Material = capacity
```

Expected:

```text
main Material = capacity
Storage = capacity
```

Additional production must not exceed either capacity.

---

# 5. Multi-tick behavior

This is mandatory.

Test at least three consecutive ticks with:

* production below capacity;
* production crossing main-stock capacity;
* repeated overflow;
* Storage becoming partially full;
* Storage becoming full.

Verify that Storage behaves as a persistent reserve.

Specifically verify:

```text
tick N
Storage = X

tick N+1
Storage = X + overflow

tick N+2
Storage = ...
```

There must be no accidental reset.

There must be no double-counting.

There must be no repeated insertion of the same overflow.

---

# 6. Construction must NOT consume Storage

This is the most important audit rule.

Construct a scenario:

```text
main Material = insufficient
Storage Material = sufficient
```

Attempt construction.

Verify the current model's behavior.

Under the protected-reserve decision from Step 10BH, Storage must remain protected.

Therefore, unless the repository already has an explicitly documented exception:

```text
construction must NOT draw Material from Storage.
```

Expected conceptual behavior:

```text
main Material = unchanged or consumed only according to existing validation
Storage Material = unchanged
```

Do not add release logic here.

If current code already consumes Storage during construction, **do not silently redesign it**.

Instead:

1. identify the behavior;
2. determine whether it contradicts the current documented contract;
3. fix it only if it is clearly an implementation bug;
4. add a regression test.

---

# 7. Construction with both pools available

Test:

```text
main Material = enough
Storage Material = anything
```

Construction must consume only the main Material stock.

Example:

```text
main Material = 20
Storage Material = 15
construction cost = 5
```

Expected:

```text
main Material = 15
Storage Material = 15
```

Storage is untouched.

---

# 8. Construction after overflow

Test a complete scenario:

```text
production
→ main stock reaches capacity
→ overflow enters Storage
→ construction happens
```

Verify:

1. overflow was captured exactly once;
2. construction consumes only the main stock;
3. Storage remains untouched;
4. subsequent ticks remain deterministic.

This test protects against accidental coupling between production overflow and construction availability.

---

# 9. Resource independence

The Storage model contains:

```text
Food
Water
Material
```

Audit all three independently.

Current implementation may only populate Material.

That is acceptable.

Do **not** implement Food/Water overflow merely because the capacities exist.

Instead verify:

### Material

Current overflow behavior is tested.

### Food

Current Storage behavior is explicitly documented by tests.

### Water

Current Storage behavior is explicitly documented by tests.

The audit must make it impossible to confuse:

```text
capacity exists
```

with:

```text
resource currently feeds Storage
```

---

# 10. No implicit release

Search the entire codebase for any path equivalent to:

```text
Storage → main resource
Storage → construction
Storage → consumption
```

The goal is to prove that no implicit release exists.

Search for:

* Storage reads;
* resource subtraction;
* construction affordability;
* production consumption;
* tick consumption;
* helper functions that merge resource pools.

Do not only inspect the obvious Storage module.

---

# 11. Save / load

Storage is part of `SimulationState`.

Verify:

```text
state
→ save
→ load
```

preserves:

```text
storage.food
storage.water
storage.material
```

exactly.

Test:

* empty Storage;
* partially filled Storage;
* full Storage.

The loaded state must behave identically to the original state.

---

# 12. Deterministic hashing

Verify that Storage participates correctly in state hashing.

For two otherwise identical states:

```text
storage.material = 10
```

and:

```text
storage.material = 11
```

the hashes must differ.

For identical Storage:

```text
hash(A) === hash(B)
```

must remain true.

Verify Food, Water, and Material where practical.

Do not change hash semantics unless the audit demonstrates that Storage is incorrectly omitted.

---

# 13. Save version compatibility

Inspect the current save version introduced by Storage.

Verify that the current migration/default behavior remains deterministic.

Test:

* current save with populated Storage;
* current save with empty Storage;
* older compatible save if the repository has migration fixtures.

Do not introduce another save-version bump unless the audit uncovers an actual compatibility defect.

---

# 14. Capacity invariants

Test:

```text
0 <= main resource <= main capacity
0 <= storage resource <= storage capacity
```

for every resource currently represented.

Do not merely test the happy path.

Include:

* zero;
* one below capacity;
* exact capacity;
* overflow;
* already-full reserve.

If the code uses a shared invariant helper, reuse it.

Do not create another resource-capacity abstraction.

---

# 15. Determinism

Repeat identical simulations from identical initial states.

Verify:

```text
stateA === stateB
hashA === hashB
```

after:

* one tick;
* several ticks;
* overflow;
* construction;
* save/load.

The Storage reserve must not introduce nondeterministic behavior.

No dependence on:

* object key ordering;
* iteration order;
* timestamps;
* random values;
* browser state.

---

# 16. Overflow accounting

Establish the exact conservation behavior.

For each tick:

```text
produced
```

must be accounted for by the actual implementation as:

```text
main stock increase
+
Storage increase
+
existing overflow/loss behavior
```

Do not assume overflow is always fully preserved.

If both main stock and Storage are full, determine exactly where excess production goes.

If excess production is discarded by design, document and test that.

Do not introduce a new sink.

---

# 17. Edge cases

Add focused tests for:

### Zero production

```text
production = 0
```

No state changes.

### Zero main stock

Production must populate main stock before Storage.

### Zero Storage

Overflow starts filling Storage from zero.

### Full main stock

All eligible overflow goes toward Storage.

### Full Storage

No Storage growth beyond capacity.

### Exact boundary

Production exactly fills:

```text
main
Storage
```

without off-by-one behavior.

### Large production

Use a production amount substantially larger than combined available capacity.

Verify the actual existing loss behavior.

### Repeated large production

Ensure no negative values and no capacity overflow.

---

# 18. Do not alter current resource capacities

Keep:

```text
Food     50
Water    30
Material 40
```

Do not rebalance them.

Do not add:

* warehouse upgrades;
* capacity research;
* buildings;
* worker capacity;
* logistics capacity.

Step 10BI is about behavior, not progression.

---

# 19. Documentation outcome

Update `docs/roadmap/Step10BI.md` with the actual audit result.

It must explicitly answer:

### What enters Storage today?

### What never enters Storage today?

### What can consume Storage today?

### What cannot consume Storage today?

### What happens when main stock is full?

### What happens when Storage is full?

### What happens when both are full?

### Does construction ever use Storage?

### Does save/load preserve Storage?

### Does hashing include Storage?

### Is Storage deterministic across ticks?

### What remains intentionally undefined?

The last question is important.

The audit should explicitly preserve:

> **Release semantics are not yet implemented.**

---

# 20. Expected source changes

Prefer:

```text
tests
+
roadmap documentation
```

over production-code changes.

Production code should change only if the audit reveals a concrete violation of the existing Storage contract.

If no defect exists:

```text
No runtime source change.
```

is a successful outcome.

Do not manufacture a source change to make the step look substantial.

---

# 21. Browser validation

No browser work is required unless the audit reveals an existing UI representation that incorrectly exposes Storage behavior.

Do not add UI.

Do not create debug controls.

Do not create a Storage panel.

This step is simulation/domain-focused.

---

# 22. Validation

Run the normal NOVA validation suite.

At minimum:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Also run the relevant deterministic/save/hash tests directly if the project has focused commands.

If the project contains browser/GPU validation infrastructure, do not run it merely for ceremony when no rendering/UI code changed.

---

# 23. Final audit report

Report:

## Audit scope

What was inspected.

## Behavioral matrix

Provide the final actual behavior for:

* normal production;
* exact capacity;
* overflow;
* partial Storage;
* full Storage;
* construction;
* repeated ticks;
* save/load;
* hashing.

## Bugs found

List each concrete defect, or explicitly state:

```text
No runtime defect found.
```

## Changes

Separate:

```text
Runtime changes
Test changes
Documentation changes
```

## Determinism

Report the actual result.

## Save/hash

Report the actual result.

## Release semantics

Explicitly state:

```text
Not implemented.
```

## Validation

Report exact results for:

```text
typecheck
lint
tests
build
```

## Git

Confirm:

```bash
git diff --check
git status
```

and create one dedicated commit if changes were made.

---

# 24. Definition of Done

Step 10BI is PASS when:

* [ ] current Storage implementation has been inspected;
* [ ] production overflow behavior is covered;
* [ ] exact capacity boundaries are covered;
* [ ] partially filled Storage is covered;
* [ ] full Storage is covered;
* [ ] multi-tick behavior is covered;
* [ ] construction behavior is explicitly tested;
* [ ] construction does not silently release protected Storage;
* [ ] Food/Water/Material behavior is explicitly understood;
* [ ] no implicit Storage release path exists;
* [ ] save/load preserves Storage;
* [ ] Storage participates correctly in hashing;
* [ ] capacity invariants hold;
* [ ] deterministic replay is verified;
* [ ] overflow/loss behavior is explicitly documented;
* [ ] no UI or unrelated mechanics were added;
* [ ] capacities remain unchanged;
* [ ] release semantics remain intentionally unimplemented;
* [ ] tests pass;
* [ ] typecheck passes;
* [ ] lint passes;
* [ ] build passes;
* [ ] git diff is clean of unintended changes;
* [ ] final QA/audit report is produced.

---

# 25. Guiding principle

```text
10BH — Decide what Storage is.

10BI — Prove what Storage actually does.

10BJ — Only then decide how protected reserves may be released.
```

Do not solve 10BJ inside 10BI.

The purpose of this step is to make the next design decision based on **observed deterministic behavior**, not assumptions.

---

# 26. Audit result

## Audit scope

Inspected the current Storage implementation, `SimulationState`, Workshop Material production, construction command validation, tick order, save/load validation, canonical hashing, existing storage-capacity tests, and the Step 10BG/10BH roadmap entries. Added focused executable coverage in `tests/storageReserveAudit.test.ts`.

## Behavioral matrix

| Case | Actual behavior |
|---|---|
| Normal production | Gross Material enters primary stock up to the operational Workshop cap; no Storage change while headroom exists. |
| Exact main capacity | Primary stock reaches 25; no false overflow. |
| Small overflow | Primary stock fills to 25; remaining production is added to `storage.material`. |
| Partial Storage | Overflow is additive; existing reserve is preserved. |
| Exact reserve capacity | Storage reaches 40; no off-by-one growth. |
| Full Storage | Additional eligible overflow is not retained; existing production-loss behavior applies. |
| Repeated ticks | Reserve persists across calls/ticks; no reset, duplicate insertion, or negative value observed. |
| Construction with insufficient main stock | Placement is rejected; Storage is not used and remains unchanged. |
| Construction with sufficient main stock | Only primary Material is deducted; Storage is unchanged. |
| Food | Does not enter Storage in current simulation. Capacity is data only. |
| Water | Does not enter Storage in current simulation. Capacity is data only. |
| Material | Production overflow is the only current Storage input. |
| Save/load | Empty, partial, and full Storage round-trip exactly under SAVE_VERSION 8. |
| Hashing | Changing any Storage resource changes the canonical hash. |
| Determinism | Replays from identical state produce equal states and hashes. |

Tick order is:

```text
advanceConstruction
→ food/water needs, production, consumption, population
→ jobs
→ produceMaterial (including overflow capture)
→ apply player command (construction)
→ road progress
→ upkeep
→ crews
→ advanceTime
```

Construction therefore sees primary Material after production, but it never reads Storage. Upkeep also only reads/deducts primary Material. No implicit Storage release path exists in the simulation.

## Bugs found

No runtime defect found. Current implementation matches the Step 10BH protected-reserve contract.

## Changes

### Runtime changes

None.

### Test changes

Added `tests/storageReserveAudit.test.ts` with 11 focused tests covering production boundaries, overflow, partial/full reserve, repeated application, construction isolation, Food/Water independence, capacity invariants, save/load, hashing, and deterministic replay.

### Documentation changes

Appended this audit result to `docs/roadmap/Step10BI.md`. Updated documentation is evidence, not a gameplay change.

## Determinism

PASS. Identical state and command sequences produce equal state and canonical hash across one or more ticks, overflow, construction, and save/load scenarios. The audit found no random, time, key-order, or browser-state dependency in Storage.

## Save/hash

PASS. SAVE_VERSION remains 8. Storage survives serialization for empty, partial, and full reserves. Storage quantities participate in canonical hashing; changed Food, Water, or Material values produce different hashes.

## Release semantics

Not implemented.

No Storage-to-primary-resource release exists. No construction, consumption, or production path may use Storage as spendable stock. This remains intentionally undefined for Step 10BJ.

## Validation

- `pnpm typecheck`: PASS
- `pnpm lint`: PASS
- `pnpm test`: PASS — 87 suites, 1619 tests
- `pnpm build`: PASS
- Focused audit: `pnpm vitest run tests/storageReserveAudit.test.ts`: PASS — 11 tests
- Browser/GPU: not run; no UI or rendering code changed
- Capacities: unchanged at Food 50 / Water 30 / Material 40

## Git

`git diff --check`: PASS. Changes are limited to the Step 10BH report, Step 10BI prompt/audit report, and focused audit test. No production source changed.

## Definition of Done

- [x] Current Storage implementation inspected
- [x] Production overflow covered
- [x] Exact capacity boundaries covered
- [x] Partial and full Storage covered
- [x] Multi-tick behavior covered
- [x] Construction behavior explicitly tested
- [x] Construction does not release protected Storage
- [x] Food/Water/Material behavior understood
- [x] No implicit Storage release path found
- [x] Save/load preserves Storage
- [x] Storage participates in hashing
- [x] Capacity invariants hold
- [x] Deterministic replay verified
- [x] Overflow/loss behavior documented
- [x] No UI or unrelated mechanics added
- [x] Capacities unchanged
- [x] Release semantics remain unimplemented
- [x] Tests pass
- [x] Typecheck passes
- [x] Lint passes
- [x] Build passes
- [x] Final audit report produced

Step 10BI — PASS. Next justified step: Step 10BJ may decide protected-reserve release semantics using this evidence.

