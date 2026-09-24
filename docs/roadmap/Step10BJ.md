# NOVA — Step 10BJ — Release Semantics & Protected Reserve Policy

## 0. Mission

Implement the first real **release semantics** for NOVA's protected Storage reserve.

Previous steps established the facts:

```text
10BH — Model A: protected deterministic reserve
10BI — audited and verified current behavior
```

Current verified behavior:

* Food capacity: 50
* Water capacity: 30
* Material capacity: 40
* only Material production overflow currently enters Storage;
* Food/Water do not currently enter Storage;
* construction does not consume Storage;
* no implicit release path exists;
* Storage survives save/load;
* Storage participates in hashing;
* simulation replay is deterministic;
* current behavior is covered by dedicated tests.

Step 10BJ must now answer:

> **Under exactly what deterministic conditions may protected Storage become operationally available?**

This is a simulation-model step.

It is **not** a UI step.

It is **not** a logistics step.

It is **not** a worker/hauling step.

It is **not** a storage-building step.

---

# 1. Product principle

Storage must remain conceptually different from ordinary operational resources.

```text
Operational stock
    ↓
immediately available to active systems

Protected Storage
    ↓
strategic reserve
    ↓
not normally available
```

Therefore:

> Storage must not become a simple second resource pool.

Avoid the naïve rule:

```text
main stock insufficient
→ automatically take everything necessary from Storage
```

That would make Storage merely an extension of the main stock capacity.

The release mechanism must preserve the meaning of **reserve**.

---

# 2. First task — inspect the real repository

Before implementing anything:

1. Read `docs/roadmap/Step10BH.md`.
2. Read `docs/roadmap/Step10BI.md`.
3. Read the Storage implementation.
4. Read `SimulationState`.
5. Read resource capacity logic.
6. Read Material production.
7. Read construction affordability/consumption.
8. Read tick ordering.
9. Read save/load.
10. Read hashing.
11. Read existing Storage audit tests.
12. Read all relevant simulation invariants.

Do not assume the architecture from this prompt.

Adapt the implementation to the actual codebase.

---

# 3. Design question

Before changing runtime code, explicitly compare the possible release models.

## Model A — Full automatic release

```text
main < required
→ Storage supplies missing amount
```

Pros:

* simple;
* prevents unnecessary construction blockage.

Cons:

* Storage becomes a second main stock;
* protected reserve loses meaning;
* no strategic buffer remains.

Reject this model unless the existing simulation strongly requires it.

---

## Model B — Protected threshold

Keep a minimum reserve:

```text
Storage
    ├── protected minimum
    └── releasable excess
```

Only the excess above the protected floor can become operational.

Example:

```text
Storage = 30
protected reserve = 20

→ only 10 is releasable
```

This preserves a strategic reserve.

---

## Model C — Emergency release

Storage remains protected under normal operation.

Only a defined critical condition allows release.

Example:

```text
normal construction shortage
→ no release

critical systemic shortage
→ release allowed
```

This is potentially very coherent with NOVA, but only if a genuine criticality concept already exists.

Do not invent an artificial "emergency" system merely for this step.

---

## Model D — Controlled deterministic release

The simulation decides when reserve can be released based on existing deterministic state.

No player button.

No worker.

No logistics.

Example:

```text
reserve > protected floor
AND
operational demand cannot be satisfied
→ release eligible excess
```

This can preserve simulation-first behavior while avoiding UI micromanagement.

---

# 4. Selection rule

Choose the model that best fits the **existing NOVA simulation**, not the most sophisticated model.

The chosen rule must be:

* deterministic;
* local;
* understandable;
* testable;
* stable across save/load;
* independent of rendering;
* independent of browser state;
* independent of wall-clock time;
* independent of randomness.

Do not introduce complexity merely because the system can support it.

---

# 5. Preferred direction

Unless repository evidence strongly argues otherwise, prefer a **protected-floor release policy**.

Conceptually:

```text
Storage
    ↓
protected reserve
    +
releasable surplus
```

For a resource:

```text
releasable =
    max(0, storage - protectedReserve)
```

The exact protected reserve must **not** be invented arbitrarily.

Determine it from:

1. existing simulation semantics;
2. current resource scale;
3. existing capacities;
4. construction costs;
5. production rates;
6. existing progression assumptions.

If no defensible constant exists, stop and document the design gap rather than inventing a magic number.

---

# 6. Avoid magic numbers

Do not write:

```ts
const RELEASE_THRESHOLD = 17;
```

without a domain justification.

If a protected floor is introduced, it must have a clear semantic meaning.

Possible formulations include:

```text
percentage of capacity
```

or:

```text
fixed number of ticks of expected demand
```

or:

```text
existing system-defined reserve requirement
```

Choose only one if the current model supports it.

Do not create a configurable player-facing parameter.

---

# 7. Important distinction: release vs consumption

Do not conflate:

```text
Storage release
```

with:

```text
Construction consuming Storage
```

A clean conceptual pipeline is:

```text
Protected Storage
       ↓
Release policy
       ↓
Operational stock
       ↓
Existing consumers
```

This means the existing construction system does not need to understand Storage directly.

Prefer:

```text
Storage release
```

as a simulation operation that modifies the operational pool before existing consumption.

Avoid:

```ts
constructionCostFromStorage(...)
```

or equivalent special cases.

This keeps the resource model centralized.

---

# 8. Tick ordering

This step must explicitly determine where release occurs.

Potential ordering:

```text
1. production
2. overflow into Storage
3. release eligible reserve
4. construction / consumption
5. invariants
6. hash/save state
```

But do not blindly use this ordering.

Inspect the existing simulation order.

The chosen order must avoid pathological same-tick behavior such as:

```text
production
→ Storage
→ immediate release
→ construction
```

which can make Storage functionally invisible.

If production overflows into Storage and is immediately released in the same tick, the reserve may never actually accumulate.

That must be considered explicitly.

---

# 9. Same-tick accumulation rule

Test and decide:

```text
production overflow
→ Storage
→ release
```

within the same tick.

A strong default is:

> Newly protected overflow should not be immediately released in the same tick unless the release policy explicitly requires it.

Otherwise:

```text
Storage = 0
production overflow = 10
release = 10
```

can collapse the entire reserve mechanic into a temporary accounting artifact.

Preserve the conceptual distinction between:

```text
resource entering reserve
```

and:

```text
resource being released from reserve
```

---

# 10. Release amount

Define exactly:

```text
releaseAmount
```

and test it.

For a threshold model:

```text
releaseable =
    max(0, storage - protectedFloor)
```

Then determine whether the release is:

### Full eligible release

```text
release = min(
    releasable,
    operational deficit
)
```

or:

### Partial release

```text
release = bounded deterministic amount
```

Do not invent partial release unless there is a strong simulation reason.

Prefer the simplest rule that preserves the reserve.

---

# 11. Example scenario

Suppose:

```text
main Material = 0
Storage Material = 30
protected floor = 20
```

and construction requires:

```text
10 Material
```

Then:

```text
releasable = 10
```

A full eligible release could produce:

```text
main Material = 10
Storage Material = 20
```

Construction then consumes:

```text
main Material = 0
Storage Material = 20
```

The protected floor survives.

But this is only an example of semantics.

Use the actual chosen model and actual project values.

---

# 12. What must NOT happen

Never allow:

```text
Storage < protected floor
```

because of release.

Never allow:

```text
Storage < 0
```

Never allow:

```text
main stock > main capacity
```

Never allow:

```text
Storage > storage capacity
```

Never release more than the operational deficit requires.

Never release Storage when there is no operational need.

Never consume Storage directly from construction if the architecture can instead perform centralized release.

---

# 13. Multiple consumers

If several systems can consume Material during one tick, inspect the current architecture.

Do not introduce arbitrary priority rules.

If release occurs before consumers, the existing consumer ordering should remain authoritative.

If release occurs per consumer, prove that the resulting behavior is deterministic and that the same reserve cannot be released multiple times.

Prefer one centralized release calculation per resource/tick where possible.

---

# 14. Material first

Step 10BJ should initially apply release semantics only to the resource for which Storage actually has production input:

```text
Material
```

Do NOT implement Food/Water release.

The existence of:

```text
Food capacity = 50
Water capacity = 30
```

does not imply they should suddenly participate in the reserve lifecycle.

Keep their behavior unchanged.

---

# 15. No UI

Do not add:

* reserve sliders;
* release buttons;
* Storage panels;
* manual resource transfer;
* player configuration;
* new HUD controls.

The simulation decides.

The player observes consequences.

This remains consistent with NOVA's simulation-first philosophy.

---

# 16. No logistics

Do not introduce:

* workers;
* hauling;
* warehouse buildings;
* roads;
* transport;
* network capacity;
* delivery time;
* resource transport distance.

Release is an abstract deterministic simulation operation.

---

# 17. No new progression system

Do not introduce:

* reserve upgrades;
* technologies;
* buildings;
* research;
* policies;
* population requirements.

This step establishes the base release semantics.

---

# 18. Domain API

Prefer a pure domain operation.

Possible conceptual shape:

```ts
releaseProtectedReserve(
  resource,
  operationalAmount,
  storage,
  policy
)
```

or an equivalent architecture-appropriate API.

Do not blindly use this signature.

The actual repository architecture decides the final shape.

The operation should return a new state/value rather than mutate arbitrary simulation objects.

---

# 19. Strong invariants

Introduce tests for:

### Conservation

Every release must satisfy:

```text
storageBefore + mainBefore
=
storageAfter + mainAfter
```

when no consumption occurs during the operation.

If consumption is part of the same tick:

```text
initial resources
+ production
- consumption
=
final main
+ final storage
+ explicit loss
```

---

### Protected floor

```text
storageAfter >= protectedFloor
```

always.

---

### Capacity

```text
mainAfter <= mainCapacity
storageAfter <= storageCapacity
```

always.

---

### No unnecessary release

If:

```text
main stock >= operational requirement
```

then:

```text
release = 0
```

---

### No release from protected reserve

If:

```text
storage <= protectedFloor
```

then:

```text
release = 0
```

---

### Bounded release

```text
release <= storage - protectedFloor
```

and:

```text
release <= operational deficit
```

---

### Determinism

Identical input state produces identical output.

---

# 20. Test matrix

Create focused tests for:

## No shortage

```text
main sufficient
storage surplus
→ no release
```

## Shortage but protected floor blocks release

```text
main insufficient
storage == protected floor
→ no release
```

## Shortage with releasable reserve

```text
main insufficient
storage > protected floor
→ release eligible amount
```

## Exact protected floor

Verify no floating/off-by-one behavior.

## Exact release

Reserve surplus exactly equals operational deficit.

## Partial release

Reserve surplus exceeds operational deficit.

## Full reserve

Storage at capacity.

## Empty reserve

Storage = 0.

## Repeated ticks

Verify reserve does not oscillate unexpectedly.

## Production + overflow + release

Verify the full lifecycle.

## Construction after release

Verify construction consumes only operational Material.

## Multiple constructions

Verify release cannot be accidentally reused multiple times.

## Save/load

A saved state before release must reproduce the same release behavior after loading.

## Hash

States with different reserve values must hash differently.

---

# 21. Important test: no oscillation

Test a multi-tick scenario where:

```text
Storage > floor
main shortage
release
construction consumes
next tick shortage again
```

Verify the system does not repeatedly cycle:

```text
Storage
→ main
→ construction
→ Storage
→ main
→ construction
```

unless actual production explicitly causes that behavior.

There must be no artificial reserve ping-pong.

---

# 22. Important test: reserve accumulation

Verify:

```text
production overflow
→ Storage increases
```

over several ticks until:

```text
Storage == capacity
```

Then verify release only occurs according to the chosen policy.

The reserve must remain meaningful over time.

---

# 23. Important test: conservation

Create a deterministic scenario such as:

```text
initial main = X
initial storage = Y
production = P
construction consumption = C
```

and assert the final accounting.

The test should explicitly prove where resources went.

This becomes a foundational regression test for future resource mechanics.

---

# 24. Save version

Inspect whether the new release semantics change the persisted state schema.

If release is represented only through existing:

```text
main resources
storage
```

then do not bump the save version unnecessarily.

If a genuinely new persisted field is required, then:

1. justify it;
2. update SAVE_VERSION;
3. add migration/default behavior;
4. test backward compatibility.

Do not persist derived/transient release calculations.

---

# 25. Hashing

Do not hash:

```text
releaseAmount
temporary deficit
temporary calculation
```

if they are derived.

Hash the actual resulting state.

Existing:

```text
main resources
storage
```

should continue to determine state identity.

Verify that release produces a different hash when it actually changes state.

---

# 26. Documentation

Write `docs/roadmap/Step10BJ.md`.

It must document:

## Chosen release model

State the chosen model explicitly.

## Why it was chosen

Base this on actual NOVA simulation semantics.

## Mathematical rule

Give the exact release equation.

For example, if threshold-based:

```text
releasable =
max(0, storage - protectedFloor)

release =
min(releasable, operationalDeficit)
```

Only document equations that match the actual implementation.

## Tick position

Document exactly where release occurs.

## Protected reserve invariant

State the invariant explicitly.

## Material scope

Explain why Material is the only active reserve resource.

## Non-goals

Explicitly state:

* no UI;
* no workers;
* no hauling;
* no logistics;
* no Food/Water release;
* no manual transfer.

---

# 27. Browser / visual validation

No browser validation is required unless the implementation unexpectedly changes a user-visible result representation.

Do not add UI solely to validate this step.

If the simulation UI displays Material/storage values, then perform a real browser check only to ensure:

* no visual regression;
* displayed values match simulation state;
* no console errors.

Do not redesign the UI.

---

# 28. Implementation discipline

Work in large coherent phases:

### Phase A — Understand

Inspect the actual simulation.

### Phase B — Decide

Write the exact release rule before implementing it.

### Phase C — Implement

Implement only the selected rule.

### Phase D — Prove

Add deterministic unit/integration tests.

### Phase E — Validate

Run the complete project suite.

### Phase F — Audit

Review the final diff and simulation behavior.

Do not progressively invent mechanics while coding.

---

# 29. Validation

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Also run the focused Storage/resource tests.

Run:

```bash
git diff --check
git status
git diff --stat
```

If UI code changed, run the existing browser/E2E validation.

If no UI changed, do not run browser validation merely for ceremony.

---

# 30. Final QA report

At completion report:

## Design

* models considered;
* selected model;
* exact release rule;
* protected-floor semantics;
* tick ordering.

## Implementation

* files added;
* files modified;
* runtime changes;
* tests added.

## Behavior

Demonstrate:

```text
main stock
Storage
protected reserve
release
construction
```

through representative scenarios.

## Conservation

Show the actual accounting invariant.

## Determinism

Report replay results.

## Persistence

Report save/load and hash behavior.

## Regression

Confirm:

```text
Food unchanged
Water unchanged
Material production unchanged except for release semantics
construction architecture unchanged
no logistics
no UI
```

## Validation

Report exact results for:

```text
typecheck
lint
tests
build
focused tests
browser/E2E if applicable
git diff --check
```

## Commit

Create one dedicated commit:

```text
Step 10BJ — protected reserve release semantics
```

Do not include unrelated changes.

Report the commit hash.

---

# 31. Definition of Done

Step 10BJ is PASS only when:

* [ ] repository behavior was inspected before design;
* [ ] release model was explicitly selected;
* [ ] exact release rule is documented;
* [ ] protected reserve meaning is preserved;
* [ ] Material is the only newly released resource;
* [ ] Food behavior is unchanged;
* [ ] Water behavior is unchanged;
* [ ] release is deterministic;
* [ ] release never crosses protected floor;
* [ ] release never exceeds operational deficit;
* [ ] main stock never exceeds capacity;
* [ ] Storage never exceeds capacity;
* [ ] conservation is tested;
* [ ] no same-tick pathological reserve collapse exists;
* [ ] no reserve ping-pong exists;
* [ ] construction still consumes operational Material;
* [ ] construction does not directly consume Storage;
* [ ] save/load remains deterministic;
* [ ] hashing remains correct;
* [ ] no new UI exists;
* [ ] no workers/logistics exist;
* [ ] no storage buildings exist;
* [ ] no manual transfer exists;
* [ ] no unrelated progression system exists;
* [ ] tests pass;
* [ ] typecheck passes;
* [ ] lint passes;
* [ ] build passes;
* [ ] diff check passes;
* [ ] final diff contains only intended changes;
* [ ] dedicated commit is created;
* [ ] final QA report is produced.

---

# 32. Guiding principle

```text
10BH — Decide what Storage is.

10BI — Prove what Storage actually does.

10BJ — Define when a protected reserve is allowed to become operational.

10BK — Only after observing 10BJ in simulation should we decide whether
       the reserve needs further balancing or additional resource types.
```

The core rule:

> **Storage exists to protect the simulation from resource volatility, not to hide resource scarcity.**

Release semantics must therefore provide resilience without eliminating scarcity.

---

# 33. Implemented design and QA report

## Chosen release model

**Model B/D — deterministic protected-floor release for Material construction demand.**

Model A was rejected because automatic release of the whole reserve would erase the reserve distinction. Model C was rejected because NOVA has no genuine emergency/criticality state. A command-independent automatic release was also rejected because there is no persistent demand signal until a construction command exists.

Implemented policy:

```text
protectedMaterialReserve = 15
releasable = max(0, storage.material - protectedMaterialReserve)
operationalDeficit = max(0, requestedMaterial - resources.construction)
releaseAmount = min(releasable, operationalDeficit)
```

`15` is derived from the existing 40-unit Material reserve and standard 25-unit building transaction: releasable maximum is one normal building cost while 15 units remain protected. It is not a new player-configurable or progression value.

The pure operation is `releaseProtectedMaterialReserve` in `src/domain/storage/storage.ts`. It returns updated operational Material, updated Storage, and release amount. No transient release amount is persisted or hashed.

## Tick position and command boundary

Release runs after `advanceConstruction` and before food/water phases and Material production:

```text
advanceConstruction
→ release eligible pre-existing Material reserve for a valid building command
→ food/water simulation
→ assign jobs
→ produce Material / capture overflow
→ apply construction command
→ upkeep
→ advanceTime
```

`releaseMaterialForCommand` preflights placement constraints against current state, excluding only affordability from preflight. Invalid, non-building, or floor-blocked commands release nothing. Because release precedes production, newly produced overflow cannot be released in the same tick and the reserve cannot collapse through an artificial same-tick cycle.

Existing construction remains authoritative. `applyCommand` validates and deducts only `resources.construction`; it never reads Storage directly.

## Material-only scope

Only Material is released because only Material currently enters Storage. Food and Water slots remain unchanged. No release is inferred from dormant capacities.

## Representative behavior

- Main 0, Storage 30, building cost 25: release 15, main 15, Storage 15; construction remains rejected.
- Main 0, Storage 40, building cost 25: release 25, main 25, Storage 15; construction is accepted and spends main Material.
- Main 25, Storage 40, building cost 25: release 0; Storage remains 40.
- Main 0, Storage 15, building cost 25: release 0; floor blocks construction.
- Main 0, Storage 39, building cost 25: pre-existing reserve releases 24, but construction remains one unit short; newly produced overflow is not recycled into the same command.

## Conservation and invariants

Pure release conserves Material before consumption:

```text
mainBefore + storageBefore = mainAfter + storageAfter
```

and satisfies:

```text
storageAfter >= 15
releaseAmount <= storageBefore - 15
releaseAmount <= operationalDeficit
Production inflow remains clamped by the existing operational Workshop capacity (25 per operational Workshop). Storage remains bounded by 40. These are separate bounds; primary `resources.construction` is an existing stock and is not retroactively capped by the Workshop production cap.
```

Production remains unchanged except intended release of pre-existing excess reserve. Existing overflow loss remains unchanged when both production capacity and Storage are full.

## Persistence, hashing, determinism

No new persisted field is required. `resources.construction` and `storage.material` remain canonical state. SAVE_VERSION stays 8. Save/load reproduces identical Storage and hash. Different reserve values hash differently. Replays from identical state and commands produce identical states and hashes.

## Non-goals

No UI, buttons, sliders, manual transfer, workers, hauling, roads, logistics, networks, storage buildings, Food/Water release, upgrades, research, or progression system added.

## Tests and validation

Focused Storage release tests: 11 passed. Existing Storage reserve audit: 11 passed. Full validation:

- `pnpm typecheck`: PASS
- `pnpm lint`: PASS
- `pnpm test`: PASS — 88 suites, 1630 tests
- `pnpm build`: PASS
- `git diff --check`: PASS
- Browser/GPU: not run; no UI or rendering code changed

## Runtime files changed

- `src/domain/storage/storage.ts` — protected-floor constant and pure release operation.
- `src/domain/simulation/phases.ts` — preflight-gated centralized Material release for valid building commands.
- `src/domain/simulation/step.ts` — release phase before production.

## Test files added

- `tests/storageReleaseSemantics.test.ts` — 11 release-policy, boundary, construction, no-ping-pong, persistence, and determinism tests.

## Commit

Implementation and audit documentation commit:

```text
Step 10BJ — protected reserve release semantics
```

## Final QA

Step 10BJ — PASS.

- Release deterministic, bounded, floor-preserving.
- Construction remains centralized and Storage remains protected from direct construction access.
- Same-tick newly produced overflow remains protected.
- Food and Water unchanged.
- No UI, workers, logistics, or unrelated progression added.
- No Food or Water release semantics.

