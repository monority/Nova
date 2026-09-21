# Step 10M — Manual Workforce Reassignment

## Mission

Implement the smallest production-ready version of the manual workforce reassignment mechanism validated by Step 10L.

Step 10L established:

```text
manual reassignment = REAL agency
automatic correction = OVER-CONTROL
Farm upkeep = CLOSED / unnecessary
Housing / Population = correct
```

The canonical use case is:

```text
2 Residence
2 Farm
2 Workshop
2 Colonists

automatic:
Farm + Farm
Workshop + Workshop vacant

manual:
Farm + Workshop
```

One explicit reassignment must permanently alter the worker allocation until that assignment becomes invalid.

This is an implementation step.

---

# 1. Core design

Keep the current architecture:

```text
automatic assignment by default
+
explicit player override as an exception
```

Do NOT replace `assignJobs`.

Do NOT introduce a general workforce-management system.

Do NOT introduce priorities.

Do NOT introduce optimization.

Do NOT introduce automatic Workshop preference.

The player should be able to explicitly say:

```text
Colonist X → Workplace Y
```

and the simulation must preserve that decision.

---

# 2. Canonical state

The existing canonical employment state is:

```text
ColonistState = {
  id,
  residenceId,
  workplaceId
}
```

A manual assignment cannot be represented reliably by `workplaceId` alone because `assignJobs` currently recomputes automatic assignments.

Introduce the smallest explicit persisted distinction.

Preferred contract:

```text
workplaceId: string | null
workplaceAssignmentMode: "automatic" | "manual"
```

or an equivalent minimal representation if the existing architecture has a cleaner canonical form.

Rules:

```text
automatic:
  workplace chosen by assignJobs

manual:
  workplace chosen by player
  assignJobs preserves it while valid
```

Do not create a reverse index.

Do not create `manualWorkers`.

Do not create workplace-side worker arrays.

The colonist remains the canonical owner of employment state.

---

# 3. Persistence

Because the canonical state changes, update the save schema deliberately.

Increment:

```text
SAVE_VERSION
```

from the current version.

Do NOT silently change the meaning of version 4.

Implement explicit save/load migration if the repository's persistence architecture already supports migrations.

If migrations do not exist, implement the smallest explicit compatibility path appropriate to the current save system.

Old saves must have deterministic semantics.

Recommended migration:

```text
old colonist:
  workplaceId = X
  no assignment mode

→

workplaceAssignmentMode = "automatic"
```

Do not reinterpret historical assignments as manual overrides.

Document the migration.

Verify canonical JSON and hash behavior.

---

# 4. Reassignment command

Add the smallest command:

```text
reassignColonist
```

Conceptually:

```text
reassignColonist(
  colonistId,
  workplaceId
)
```

Do not create a generic workforce command framework.

The command must go through the existing:

```text
dispatchCommand
→ stepSimulation
→ applyCommand
```

architecture.

Do not mutate state directly from UI code.

---

# 5. Validation contract

The command must reject invalid assignments.

Validation order must be deterministic.

Required conditions:

```text
colonist exists
colonist has a residence
target workplace exists
target is an employment-capable building
target is operational
target has free capacity
colonist is mobility-connected to target
```

Use the existing employment/mobility predicates.

Do not duplicate road/network logic.

Do not create a second definition of workplace eligibility.

The command must also reject:

```text
nonexistent colonist
nonexistent workplace
Farm/Workshop under construction
non-operational workplace
roadless/disconnected workplace
full workplace
```

If the target is already the colonist's current workplace, define this as a deterministic no-op or rejection according to existing command conventions.

Prefer a deterministic no-op if that matches existing command semantics.

---

# 6. Existing workplace capacity

Before assigning the colonist:

```text
target capacity
```

must account for workers already assigned to that workplace.

Do not count the moving colonist twice.

For:

```text
Workshop capacity = 1
```

the following must be impossible:

```text
Colonist A → Workshop
Colonist B → same Workshop
```

unless the capacity model explicitly permits it.

Current Workshop/Farm capacity remains unchanged.

---

# 7. Leaving the previous workplace

A successful reassignment must atomically perform:

```text
old workplace
    ↓
released

new workplace
    ↓
occupied
```

There must never be an intermediate canonical state where the colonist belongs to both.

The final state is:

```text
workplaceId = target
workplaceAssignmentMode = "manual"
```

No additional reverse state.

---

# 8. assignJobs integration

This is the most important implementation rule.

Modify `assignJobs` so that:

### Manual assignment still valid

Preserve it.

```text
manual
+
valid workplace
+
valid mobility
+
operational
+
capacity
=
KEEP
```

### Manual assignment becomes invalid

Clear it.

```text
manual
+
invalid workplace
=
workplaceId null
assignmentMode automatic
```

Then the normal automatic assignment process may run.

This prevents a manual override from becoming an immortal stale assignment.

---

# 9. Manual assignment invalidation

A manual assignment must automatically disappear if any existing employment eligibility rule becomes false.

Examples:

```text
workplace becomes under construction
workplace becomes non-operational
road connection disappears
colonist loses residence
workplace loses capacity
```

Do not invent a special exception.

Use the existing eligibility predicates.

Important:

A manual assignment is a **preference/control**, not a bypass of simulation rules.

---

# 10. Manual assignment and distance preference

Preserve the existing 09M rule for automatic assignment.

Automatic:

```text
eligible workplaces
→ shortest road distance
→ lowest building ID
```

Manual:

```text
player explicitly selected workplace
→ preserve selected workplace if eligible
```

Therefore:

```text
nearest workplace
```

must NOT overwrite a valid manual choice.

Example:

```text
Workshop A = distance 1
Workshop B = distance 5

automatic → A
manual → B
```

After the manual assignment:

```text
B remains selected
```

until B becomes invalid.

---

# 11. Manual assignment and future colonists

Manual assignment applies only to the selected colonist.

Do not globally alter workplace preference.

Example:

```text
Colonist 1 → Workshop B manually
Colonist 2 → automatic
```

Colonist 2 continues to use normal `assignJobs` behavior.

Do not introduce building-level priority.

Do not make Workshop B globally preferred.

---

# 12. Automatic assignment after invalidation

If a manual assignment becomes invalid:

```text
clear manual assignment
→ colonist becomes automatic
→ normal assignJobs may find another eligible workplace
```

The colonist must not remain permanently unemployed merely because their previous manual target disappeared.

This is the recovery path.

Test:

```text
manual Farm → Workshop
Workshop becomes inaccessible
→ manual assignment invalidated
→ automatic assignment resumes
```

---

# 13. Timing

Respect the existing phase order.

Do not reorder:

```text
construction
needs
food
population
jobs
material
commands
construction progress
upkeep
time
```

Determine exactly where `reassignColonist` is applied according to the current command architecture.

Do not create a new simulation phase.

Document the timing.

The important invariant:

> A manual reassignment must affect production according to the same existing phase timing as any other workplace assignment.

Do not create a special immediate-production path.

---

# 14. Economic behavior

Do not modify:

```text
Farm production
Workshop production
Workshop upkeep
Food consumption
Material storage
population
housing
```

The only economic consequence should come naturally from the changed worker allocation.

Expected:

```text
Farm → Workshop

Food:
-2/tick

Material gross:
+2/tick

Workshop upkeep:
+1/tick

Material net:
+1/tick
```

Reverse:

```text
Workshop → Farm

Food:
+2/tick

Material gross:
-2/tick

Material net:
-1/tick
```

Verify these through tests.

---

# 15. Canonical recovery scenario

Implement and test the exact Step 10L case:

```text
2 Residence
2 Farm
2 Workshop
Material = 5
2 colonists
```

Before manual assignment:

```text
2 Farm workers
0 Workshop workers
Material remains 5
```

After:

```text
Colonist X → Workshop
```

Expected:

```text
1 Farm worker
1 Workshop worker
```

Material must recover naturally.

Do not add any recovery-specific rule.

---

# 16. Reverse choice

Verify that the player can intentionally choose:

```text
Food priority
```

by assigning:

```text
Workshop → Farm
```

and:

```text
Material priority
```

by assigning:

```text
Farm → Workshop
```

The system must remain symmetric.

Do not hard-code Workshop preference.

---

# 17. UI / player-facing control

Only implement the smallest player-facing surface necessary.

Inspect the existing UI and use existing inspection/job information.

The player must be able to:

1. identify a colonist;
2. see their current workplace;
3. see valid workplace targets;
4. trigger reassignment;
5. understand why an invalid target cannot be selected.

Do not create a workforce management screen.

Do not create a colonist-management dashboard.

Do not introduce drag-and-drop unless the existing UI architecture makes it clearly smaller.

Prefer an existing inspector/control pattern.

---

# 18. UI clarity

For a valid target, expose enough information to distinguish:

```text
Workshop A
distance
current workers
capacity
```

from:

```text
Workshop B
distance
current workers
capacity
```

Do not expose internal IDs as the primary user-facing information.

For invalid targets, use an explicit reason:

```text
No road access
Occupied
Under construction
Not operational
```

Use existing UI conventions.

Do not invent a notification framework.

---

# 19. Browser E2E

Add a real browser scenario for the canonical recovery.

Minimum flow:

```text
start simulation
→ create/build required residences
→ build two Farms
→ build two Workshops
→ observe automatic Farm-heavy allocation
→ select colonist
→ select valid Workshop
→ confirm reassignment
→ advance simulation
→ verify staffing
→ verify Material recovery
```

Also test reverse:

```text
Workshop → Farm
```

if practical within the existing E2E architecture.

Zero console/page errors.

---

# 20. Persistence

Add regression coverage:

```text
manual assignment
→ save
→ load
→ same colonist workplace
→ same assignment mode
→ same simulation outcome
→ same hash
```

Also:

```text
manual assignment
→ replay
→ byte-identical state/hash
```

and:

```text
save from old version
→ migration
→ deterministic current state
```

if migration is required by the existing persistence system.

---

# 21. Determinism

Verify:

```text
same commands
→ same state
→ same hash
```

including reassignment commands.

Test command order explicitly.

For example:

```text
build
→ reassign
→ tick
```

must differ deterministically from:

```text
reassign
→ build
→ tick
```

when the latter is invalid or otherwise semantically different.

Do not introduce wall-clock or random behavior.

---

# 22. Tests

Add focused tests for:

### Contract

```text
valid reassignment
invalid colonist
invalid workplace
non-operational workplace
under-construction workplace
roadless workplace
disconnected workplace
full workplace
no residence
```

### Symmetry

```text
Farm → Workshop
Workshop → Farm
```

### Persistence

```text
save/load
hash
migration
```

### assignJobs

```text
manual valid assignment preserved
manual invalid assignment cleared
automatic assignment still works
```

### Spatial

```text
near target
far target
manual far target overrides automatic near target
```

### Capacity

```text
one worker per workplace
no duplicate occupancy
```

### Recovery

```text
F,F,W,W
Material 5
→ manual move
→ Material recovery
```

### Determinism

```text
replay
insertion order
save/load
```

Do not weaken existing tests.

---

# 23. Performance

Do not introduce:

```text
global optimization
repeated BFS per colonist
new graph traversal loops
```

Reuse the existing mobility/network queries.

Manual reassignment should be O(1) or use existing bounded eligibility queries where possible.

Do not optimize unrelated systems.

---

# 24. Architecture guardrails

Keep:

```text
domain
→ application
→ rendering/UI
```

separation.

The UI must dispatch the command.

The domain/application layer validates it.

The simulation remains authoritative.

Do not put eligibility logic into React components.

Do not put persistence logic into UI.

Do not create a generic "WorkforceManager".

Do not generalize job assignment beyond what this feature requires.

---

# 25. Documentation

Update:

```text
docs/roadmap/Step10M.md
```

Preserve the original Step 10M prompt.

Append:

```text
# As-Built Report

## Repository

## State Contract

## Persistence / Migration

## Command Contract

## Validation

## assignJobs Integration

## Manual Assignment Semantics

## Invalidation

## Timing

## UI

## Economic Verification

## Recovery Scenario

## Browser Verification

## Determinism

## Performance

## Tests

## Design Decision

## Scope Verdict

## Verification
```

Explicitly document:

```text
manual assignment is sticky while valid
manual assignment does not bypass mobility/capacity
invalid manual assignment returns to automatic behavior
```

---

# 26. Scope guardrails

Do NOT implement:

* Farm upkeep;
* new Food rules;
* new Material rules;
* new population rules;
* new housing rules;
* workplace priorities;
* automatic Workshop preference;
* global workforce optimization;
* demolition;
* road changes;
* transport;
* vehicles;
* congestion;
* travel time;
* new needs;
* new resources;
* new economic coefficients.

This step exists only to implement the validated manual workforce control.

---

# 27. Verification

Run:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Run all existing E2E suites.

Add the new workforce reassignment browser test.

Verify:

```text
no console errors
no page errors
save/load stable
hash stable
deterministic replay
insertion-order determinism
no Date.now()
no Math.random()
```

Verify the final SAVE_VERSION deliberately.

Because canonical state changes, do not leave the save version unchanged accidentally.

---

# 28. Commit

Only commit after all verification passes.

Commit:

```text
Step 10M: implement manual workforce reassignment
```

Before committing:

```text
git diff -- src
```

must contain only intentional Step 10M changes.

---

# 29. Final report

Return exactly:

```text
Step 10M COMPLETE — IMPLEMENTATION

Repository

State contract

Save version / migration

Command contract

Validation

assignJobs integration

Manual assignment semantics

Invalidation

Timing

UI

Economic verification

Recovery scenario

Browser verification

Persistence / hash

Determinism

Performance

Tests

Design decision

Scope verdict

Verification
```

The final answer must explicitly confirm:

```text
- manual reassignment is sticky while valid
- automatic assignment remains the default
- manual assignment does not bypass mobility
- manual assignment does not bypass capacity
- invalid manual assignments return to automatic behavior
- Farm upkeep remains absent
- no unrelated simulation rules changed
```

Do not expand the scope beyond manual workforce reassignment.



---

# As-Built Report

**Type: IMPLEMENTATION (Step 10M).** The manual workforce reassignment control
validated by Step 10L is now implemented end to end. The change is deliberately
small: one canonical bit on the colonist, one command, one `assignJobs`
integration, one save migration and one inspector control.

## Repository

* starting commit `792c458` (Step 10L);
* `src/` changes are limited to the reassignment feature:
  `domain/population/colonist.ts`, `domain/simulation/state.ts`,
  `domain/simulation/command.ts`, `domain/simulation/phases.ts`,
  `application/persistence/save.ts`, `application/queries/inspection.ts`,
  `app/main.ts`, plus `index.html` and `package.json`;
* new files: `tests/workforceReassignment.test.ts`, `e2e/reassignRun.mjs`,
  `docs/roadmap/Step10M.md`.

## State Contract

```text
ColonistState = {
  id,
  residenceId,
  workplaceId,
  workplaceAssignmentMode: 'automatic' | 'manual'
}
```

`workplaceAssignmentMode` is the smallest explicit persisted distinction.

```text
automatic  -> assignJobs owns the choice (default; every migrated save)
manual     -> the player explicitly chose this workplace; assignJobs
              preserves it while it stays valid
```

No reverse index, no `manualWorkers`, no workplace-side worker array: the
colonist remains the canonical owner of employment state. `createColonist`
stamps `'automatic'`, so a colony with no manual overrides behaves exactly as
before.

## Persistence / Migration

```text
SAVE_VERSION            = 5   (was 4)
MIGRATABLE_SAVE_VERSION = 4
```

`loadSave` accepts v5 directly and migrates v4 deterministically by adding
`workplaceAssignmentMode: 'automatic'` to every colonist. Historical
assignments are **never** reinterpreted as manual. Versions older than v4
remain rejected (`jobs.test.ts` still asserts v3 rejection). The validator
rejects any other mode value. `serializeSave` writes v5.

## Command Contract

```text
reassignColonist(colonistId, workplaceId)   // domain/application only
```

Added to the existing `SimulationCommand` union; it flows through the one
sanctioned path:

```text
UI -> controller.dispatch -> dispatchCommand -> stepSimulation -> applyCommand
```

No generic workforce framework. Reassigning to the colonist's current workplace
is a deterministic **no-op** (accepted, state unchanged). The command is applied
atomically: the colonist leaves the old workplace and occupies the new one in a
single pure step, so there is never an intermediate state in both.

## Validation

`validateReassignment` is the single source of truth, reused by `applyCommand`
and the `getReassignmentOptions` query. Deterministic order:

```text
1. colonist exists            -> unknownColonist
2. colonist has a residence   -> noResidence
3. target building exists     -> unknownWorkplace
4. target is a Farm/Workshop  -> notWorkplace
5. target is operational      -> notOperational
6. target has free capacity   -> workplaceOccupied
7. mobility-connected (09K)   -> notConnected
```

It reuses the existing employment, capacity and mobility predicates and adds no
new eligibility semantics. An invalid command returns the input state reference
(no mutation).

## assignJobs Integration

`assignJobs` gains one pre-pass and one branch:

1. **Reserve valid manual choices first.** A manual colonist whose target is
   still operational, road-connected and mobility-reachable is kept verbatim
   and its workplace is marked taken, so no automatic colonist can steal it.
2. **Clear invalid manual choices.** A manual colonist whose target became
   invalid falls through to the normal automatic selection and is stamped
   `'automatic'`. It is never left stale.
3. **Automatic behavior is untouched.** With no manual overrides the function
   is byte-identical to the previous implementation (asserted by the existing
   test suite, which still passes).

## Manual Assignment Semantics

* **Sticky while valid:** a manual workplace is preserved across ticks even
  when it is not the nearest (09M does not overwrite it).
* **No bypass:** a manual choice must satisfy the same operational, capacity
  and mobility rules as an automatic one.
* **Not global:** the override applies to one colonist only; no building-level
  priority, no per-type preference, no automatic Workshop preference.
* **Agency:** the player can choose Material priority (Farm → Workshop) or
  Food priority (Workshop → Farm) symmetrically.

## Invalidation

A manual assignment disappears automatically when any existing rule becomes
false (workplace under construction / non-operational, road connection lost,
residence lost, capacity lost). The colonist then returns to automatic behavior
and `assignJobs` may find another eligible workplace — it is never left
permanently unemployed by the loss of a manual target. Verified directly and by
the `tests/workforceReassignment.test.ts` invalidation case.

## Timing

No new phase and no reordering. `reassignColonist` is applied at the existing
command position (phase 8a, after `produceMaterial`, before upkeep), exactly
like `placeBuilding`/`placeRoads`. The new allocation therefore affects Food
and Material production on the **next** tick through the normal
`assignJobs -> produceMaterial` ordering. There is no special immediate
production path.

## UI

The smallest player-facing surface, reusing the existing inspector:

```text
select a Farm or Workshop
-> inspector shows "Worker — automatic assignment | manual override"
-> a target <select> lists Farm/Workshop targets with type, ordinal,
   road distance and workers/capacity
-> invalid targets are disabled with an explicit reason
   ("occupied", "no road access", "not operational", "current")
-> "Move worker" dispatches reassignColonist
```

Eligibility is computed by `getReassignmentOptions` (domain/application), never
re-derived in the UI. Internal ids are option values only, never the primary
label. No workforce management screen, no dashboard, no drag-and-drop.

## Economic Verification

`tests/workforceReassignment.test.ts` measures the actual simulation:

| Move | Food | Material gross | Workshop upkeep | Material net |
| --- | ---: | ---: | ---: | ---: |
| Farm -> Workshop | −2/tick | +2/tick | +1/tick | +1/tick |
| Workshop -> Farm | +2/tick | −2/tick | −1/tick | −1/tick |

The only economic consequence is the changed worker allocation. Farm upkeep
remains absent (`rowWorld` with 4 colonists: 2 Farms + 2 Workshops staffed →
+2 Material/tick, no Farm tax).

## Recovery Scenario

Canonical Step 10L case reproduced with the real simulation: 2 Residences /
2 Farms / 2 Workshops, Material 5, both workers on Farms. After one
`reassignColonist` (Farm worker → vacant Workshop) the colony runs 60 ticks,
the Workshop is staffed, Food stays sustainable and Material rises to ≥ 25 —
one explicit action permanently restores a viable trajectory.

## Browser Verification

`e2e/reassignRun.mjs` (playwright, real palette clicks + inspector control):

```text
automatic allocation: farms building-2, workshops (none), material 15
inspector options:   current "Farm 1 — current" (disabled),
                     eligible "Workshop 1 · 1 step · workers 0/1"
manual move:         workshops building-3, farms (none),
                     status "Worker reassigned to Workshop — manual override"
sticky manual:       material 14 -> 18, production 2, manual colonist-1
reverse move:        farms building-2, workshops (none), manual colonist-1
zero console/page errors
```

## Determinism

* same command sequence → byte-identical state and hash;
* the same reassignment applied at a different point in the command order is
  deterministically different (not silently reordered);
* insertion-order determinism holds (reversing canonical entity-record key
  order does not change the hash or derived staffing);
* save/load preserves `workplaceId` and `workplaceAssignmentMode` and the hash;
* no `Date.now()` / `Math.random()` in `src/`.

## Performance

`reassignColonist` is a single O(1) value change. `assignJobs` adds one
pre-pass over the existing colonist list for manual colonists only, reusing the
already-cached road-network/access derivations (`accessOf`); no new BFS, no
per-colonist graph traversal, no optimization pass. The 10D access-derivation
residue was not touched.

## Tests

* new `tests/workforceReassignment.test.ts` — 27 tests: contract (valid,
  unknown colonist/workplace, non-workplace, under-construction, roadless,
  occupied, no residence, no-op), capacity, `assignJobs` preserve/clear,
  spatial override, economics, recovery, persistence + v4→v5 migration,
  inspection, determinism, Farm-upkeep-absent regression;
* existing suites updated only where the deliberate schema change requires it
  (`SAVE_VERSION` assertions 4 → 5, two raw `ColonistState` literals, one
  colonist-shape assertion, the 10L audit's key list). No test was weakened or
  deleted.

## Design Decision

```text
MANUAL REASSIGNMENT IMPLEMENTED.
AUTOMATIC ASSIGNMENT REMAINS THE DEFAULT.
```

Manual reassignment is an exception mechanism: the simulation keeps assigning
routine work, and the player overrides one colonist when they want to. The
feature adds no economy rule, no priority, no optimization and no new resource.

## Scope Verdict

```text
COMPLETE — IMPLEMENTATION
```

## Verification

* `npx tsc --noEmit` clean; `npx eslint .` clean; `npm run build` succeeds.
* `npx vitest run` → **39 files, 788 tests passed**.
* E2E (headless): `run` 11, `road` 15, `transport` 10, `production` 12,
  `resource` 12, `food` 12, `temporal` 17, `jobs` 21, `upkeep` 35,
  `reassign` 7 — all pass.
* `SAVE_VERSION = 5` deliberately; v4 saves migrate deterministically; save/load
  hash stable; deterministic replay; insertion-order determinism; no
  `Date.now()` / `Math.random()` in `src/`.
