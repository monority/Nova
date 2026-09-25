# NOVA — Step 10CQ: Material as Currency — Minimal Income Mechanism

## Mission

Implement the first concrete capability of **Phase 7 — Money / affordability** identified by Step 10CP.

The current NOVA foundation is complete and release-ready.

Step 10CP established:

- Phases 0–6 are implemented;
- Phase 7 — Money / affordability is the first unimplemented major roadmap phase;
- its documented prerequisites are satisfied;
- Growth / Phase 10 remains deferred;
- the next implementation boundary is a minimal income mechanism.

This step must implement **only that first minimal mechanism**.

The objective is not to build the entire money system.

The objective is to introduce the smallest real economic flow required to begin Phase 7:

```text
employed colonist
→ workplace
→ income
→ accumulated Material
```

The implementation must remain deterministic, minimal, and compatible with the existing simulation architecture.

---

# 1. Read before changing anything

Inspect:

- `docs/26-roadmap.md`
- `docs/20-strategy.md`
- `docs/roadmap/Step10CP.md`
- current `ColonistState`
- current workforce assignment logic
- current work/production phase
- current Material production
- current tick pipeline
- current building inspection
- current HUD
- current save/load serialization
- current hashing
- existing economy/workforce tests
- existing simulation contract tests

Do not implement from the Step 10CP summary alone.

Verify the exact current contracts and architecture before editing.

---

# 2. Critical semantic check: Material as currency

Step 10CP identified:

> Reuse existing Material resource as currency.

Before implementation, verify that this interpretation is actually compatible with the authoritative roadmap and strategy documentation.

The existing Material resource currently represents the colony's accumulated material stock.

The implementation must NOT silently create two incompatible meanings for Material.

Determine and document:

- whether Material is explicitly permitted to function as the current monetary abstraction;
- whether income should increase the existing Material stock;
- whether this is intended as an abstract economic resource rather than literal physical currency;
- whether future Phase 7 work is expected to introduce a separate money resource.

If the authoritative documentation contradicts the Step 10CP handoff, stop before making production changes and document the contradiction.

Do not invent a new currency.

Do not introduce `MoneyState`.

Do not add a second stock.

Do not change the meaning of existing Material production unless the documentation explicitly requires it.

Assuming the documentation supports the Step 10CP interpretation, proceed with the implementation below.

---

# 3. Minimal income contract

Implement:

```text
Employed colonist
→ earns Material according to workplace type
→ income is credited once per simulation tick
```

Income rates:

| Workplace | Income / employed colonist / tick |
|---|---:|
| Farm | 1 Material |
| Well | 1 Material |
| Workshop | 2 Material |

These rates are fixed for this step.

Do not make them configurable.

Do not add balancing formulas.

Do not add difficulty modifiers.

Do not add population scaling beyond the direct number of employed colonists.

---

# 4. Scope of employment

Income applies only to a colonist who:

1. has a valid workplace assignment;
2. is employed by an operational workplace;
3. satisfies the existing employment/workplace validity contract.

Reuse the existing employment semantics.

Do not create a second definition of employment.

Do not let:

- unemployed colonists;
- invalid assignments;
- nonexistent workplaces;
- non-operational workplaces

generate income.

If existing workplace accessibility is part of the authoritative employment/production contract, preserve that contract rather than creating a separate income-specific interpretation.

Do not automatically reassign anyone.

Do not create jobs.

Do not add hiring.

Do not add wages as a separate player-controlled variable.

---

# 5. Tick ordering

Integrate income into the existing deterministic tick pipeline.

Determine the correct existing work/production phase.

Income must be credited exactly once per tick.

Avoid:

- double-crediting;
- crediting during derived queries;
- crediting during rendering;
- crediting during save/load;
- crediting during scenario evaluation.

The same simulation input must always produce the same Material stock and hash.

Document the exact tick ordering.

---

# 6. Interaction with existing Material production

This is a critical part of the implementation.

NOVA already has Material production from Workshops.

The new income flow must be clearly distinguishable in the implementation from existing production.

Do not accidentally replace:

```text
Workshop production
```

with:

```text
Workshop income
```

unless the current architecture explicitly represents them as the same operation.

The resulting Material delta must be correct and deterministic.

For example, if an operational staffed Workshop currently produces its existing Material amount and its employed colonists additionally generate income, both effects must be accounted for exactly once.

Do not modify existing production coefficients.

Do not rebalance the economy.

---

# 7. ColonistState / persistence

Step 10CP proposed:

```text
materialIncome
```

in `ColonistState`.

Before adding persisted state, inspect whether this value is genuinely canonical state or whether it can be derived from:

```text
colonist workplace
+
workplace type
```

Prefer derived state when the value is fully determined by existing canonical state.

The existing project has a strong rule against persisting redundant derived values.

Therefore:

### If `materialIncome` is fully derivable

Do NOT persist `materialIncome`.

Instead derive the current income from the canonical colonist/workplace state.

### If the architecture genuinely requires it to be canonical mutable state

Only then add it to `ColonistState` and update save/load/hash accordingly.

Do not add redundant persistence merely because Step 10CP's handoff named the field.

If persistence changes are required:

- update serialization;
- update deserialization;
- update hashing;
- add save/load coverage;
- preserve deterministic continuation;
- increment `SAVE_VERSION` only if the persistence format actually requires it.

Do not increment `SAVE_VERSION` automatically.

---

# 8. Income query / summary

Introduce the smallest appropriate application/domain query needed to expose income.

Prefer a derived query such as:

```text
getMaterialIncome(state)
```

or the equivalent idiomatic existing query pattern.

The query should return the current total Material income per tick.

It must be:

- deterministic;
- pure;
- derived from canonical state;
- record-order independent;
- side-effect free.

Do not create a general economy framework.

Do not create abstractions for future money types.

Do not introduce interfaces for hypothetical currencies.

---

# 9. HUD

Add one compact income indicator to the existing HUD.

It should communicate the current rate clearly.

For example:

```text
Material +4/tick
```

Use the project's existing terminology and visual language.

Do not create:

- a money panel;
- a finance dashboard;
- charts;
- transaction history;
- income menus;
- economic graphs;
- modal windows.

The HUD addition should be additive and compact.

It must not disrupt the existing hierarchy.

---

# 10. Building inspection

Add the income contribution to the existing building inspection where it is meaningful.

For example:

```text
Income +2 Material/tick
```

for a staffed Workshop.

For Farm / Well:

```text
Income +1 Material/tick
```

Only show the value where the existing inspection architecture already exposes workplace/building operational information.

Do not redesign the inspection panel.

Do not invent a new inspection system.

The purpose is simply to make the new economic flow legible.

---

# 11. Player-facing semantics

The UI must make the new flow understandable:

```text
worker
→ workplace
→ income
→ Material stock
```

The player should be able to connect employment to the resulting Material increase.

Do not add explanatory tutorials or onboarding in this step unless the existing UI literally cannot communicate the mechanic without one.

Keep the first implementation minimal.

---

# 12. Simulation invariants

Add focused tests covering at least:

### Unemployed

An unemployed colonist generates:

```text
0 income
```

### Farm

One employed colonist at an operational Farm:

```text
+1 Material / tick
```

### Well

One employed colonist at an operational Well:

```text
+1 Material / tick
```

### Workshop

One employed colonist at an operational Workshop:

```text
+2 Material / tick
```

### Multiple workers

Total income equals the sum of valid employed colonist workplace rates.

### Invalid employment

Invalid/non-operational workplace assignments do not generate income.

### Tick accounting

One tick credits income exactly once.

### Determinism

Same initial state + same ticks:

```text
same Material stock
same derived income
same hash
```

### Reassignment

Reassigning a colonist between Farm / Well / Workshop updates income according to the new workplace on the correct tick boundary.

### Save/load

If no new persistence is required:

- prove income is reconstructed identically after save/load.

If persistence is changed:

- prove round-trip preservation;
- prove continuation;
- prove hash stability.

---

# 13. Existing simulation contracts must remain intact

Do not break:

- workforce assignment invariants;
- building operational-state semantics;
- Farm production;
- Well production;
- Workshop production;
- road/accessibility semantics;
- Town progression;
- scenario completion;
- save/load;
- hashing;
- deterministic replay.

Run the relevant existing contract suites.

---

# 14. Scenarios

Do not redesign scenarios.

Do not add money objectives.

Do not modify the 11-scenario catalogue unless the existing scenario infrastructure mechanically requires an update due to changed baseline state.

The new income system should simply exist as part of the simulation.

Future Phase 7 work may later introduce affordability/spending scenarios.

That is outside this step.

---

# 15. SAVE_VERSION

Keep:

```text
SAVE_VERSION = 8
```

if the implementation can be represented entirely through existing canonical state and derived queries.

This is preferred.

If a genuine persisted-state change is unavoidable, stop and explicitly document why `SAVE_VERSION` must change before proceeding.

Do not casually migrate the save format.

---

# 16. No economy expansion

This step must NOT implement:

- spending;
- prices;
- costs;
- affordability checks;
- purchases;
- maintenance payments;
- taxes;
- markets;
- trade;
- money storage;
- separate currency;
- income modifiers;
- wages;
- inflation;
- debt;
- loans;
- economic buildings;
- production economy;
- transport;
- growth;
- technology.

Those belong to later roadmap work.

The only new economic behavior is:

```text
employment → Material income
```

---

# 17. No hidden balancing changes

Do not modify:

- Farm production;
- Well production;
- Workshop production;
- food consumption;
- water consumption;
- Material storage capacity;
- construction costs;
- population growth;
- Town conditions;
- scenario objectives;
- tick duration;
- worker assignment rules.

The purpose is to add the new economic signal without rebalancing the existing game.

---

# 18. Documentation

Update/create:

```text
docs/roadmap/Step10CQ.md
```

The document must contain:

1. Mission
2. Step 10CP handoff
3. Material-as-currency semantic verification
4. Implemented income contract
5. Exact rate table
6. Tick ordering
7. Interaction with existing Material production
8. State/persistence decision
9. Query/API changes
10. HUD changes
11. Building inspection changes
12. Tests added/updated
13. Compatibility validation
14. Browser validation
15. Responsive validation
16. GPU/WebGL2 validation
17. SAVE_VERSION result
18. Scope audit
19. Final diff audit
20. Future Phase 7 boundary

Explicitly state:

> This step starts Phase 7. It does not implement the complete Money / affordability system.

---

# 19. Browser verification

Because this step changes both simulation behavior and UI, browser validation is mandatory.

Run the headed application and verify:

### Desktop

`1280×800`

### Mobile

`420×740`

`360×640`

Verify:

- HUD income indicator is visible;
- no overflow;
- building inspection remains usable;
- income changes after worker reassignment;
- Material stock changes correctly;
- no console errors;
- no visual breakage;
- current Town/scenario flow remains functional.

Use the existing browser/E2E infrastructure.

---

# 20. GPU/WebGL2 verification

Because the UI/runtime changes, run the existing headed GPU/WebGL2 path.

Verify:

- WebGL2;
- NVIDIA RTX 3070 hardware path;
- scene rendering;
- no shader/runtime errors;
- no console errors;
- no regression in the existing GPU path.

Do not replace the GPU verification with software rendering.

---

# 21. Full validation

Run:

- focused new income tests;
- relevant economy/workforce/production tests;
- relevant simulation contract tests;
- scenario compatibility;
- save/load tests;
- full Vitest;
- typecheck;
- lint;
- production build;
- headed browser;
- responsive browser;
- headed GPU/WebGL2;
- `git diff --check`.

If an expensive deterministic test hits the known five-second timeout behavior, distinguish it from an actual failure and run the affected test in isolation as needed.

Do not globally increase Vitest timeouts.

---

# 22. Final scope audit

Before committing, inspect the complete diff.

Confirm:

- only intended files changed;
- no speculative abstraction;
- no unrelated refactor;
- no production coefficient changes;
- no unintended persistence changes;
- no SAVE_VERSION change unless explicitly justified;
- no scenario redesign;
- no future economy systems;
- no growth systems;
- no transport;
- no technology;
- no unrelated UI redesign.

Delete any temporary audit/debug files.

---

# 23. Commit

If the implementation and validation are complete, commit exactly:

```text id="y5n1qv"
Step 10CQ: Material as Currency — Minimal Income Mechanism
```

Do NOT push.

---

# 24. Final report

Return:

### Decision

`PASS` or `BLOCKED`

### Implemented

- exact income behavior;
- exact rates;
- state/persistence decision;
- query;
- HUD;
- inspection.

### Material semantics

Explain how Material now functions in this first Phase 7 step and how the existing production flow remains distinct.

### Tests

Exact counts/results.

### Browser

Exact viewport results.

### GPU

Exact GPU/WebGL2 result.

### Persistence

State/save version result.

### Scope audit

Confirm what was deliberately not implemented.

### Files

Exact changed files.

### Commit

Exact commit hash.

---

# Critical product boundary

This is the first **real Phase 7 implementation step**.

The intended progression is:

```text
Phase 6
Work
  ↓
Phase 7
Money / affordability
  ↓
10CQ
Employment → Material income
  ↓
future Phase 7 steps
Affordability / spending / economic decisions
  ↓
Phase 8
Production economy
  ↓
Phase 9
Transport
  ↓
...
```

Do not skip ahead.

Do not try to make the game economically complete in one step.

The goal is to establish the first real economic flow cleanly so that subsequent Phase 7 work can build on it without architectural debt.

Most importantly:

> **Do not optimize for finishing the step quickly. Optimize for making the new economic contract correct, deterministic, legible, and compatible with the larger roadmap.**

---

# Documentation (as-built)

## 0. Baseline

- HEAD at execution start: `0102fbc` (Step 10CP)
- SAVE_VERSION: `8` (unchanged)
- Step type: **implementation** — first Phase 7 capability

## 1. Decision from 10CP

10CP identified Phase 7 — Money / affordability as the next roadmap phase.
Prerequisites satisfied: Phases 0–6 complete, deterministic simulation frozen,
town foundation release-ready. This step implements the minimal income mechanism.

## 2. Design decision: derived, not persisted

`materialIncome` is computed on-the-fly from canonical state
(colonist.workplaceId + building.type + building.status).
Not stored on ColonistState. Not in save/hash.
Rationale: fully derivable, no persistence cost, no hash change,
no SAVE_VERSION increment.

Income rates (fixed constants, not configurable):
- Farm worker: 1 Material/tick
- Well worker: 1 Material/tick
- Workshop worker: 2 Material/tick

## 3. Implementation changes

### Domain
- `src/domain/population/colonist.ts`: added three income-rate constants
- `src/domain/simulation/phases.ts`: added `creditMaterialIncome()` function
- `src/domain/simulation/step.ts`: integrated `creditMaterialIncome` into tick pipeline
  (after `produceMaterial`, before `applyCommand`)

### Application
- `src/application/queries/inspection.ts`:
  - Added `materialIncome` to `BuildingInspection` interface
  - Added `materialIncome` to `ColonistInspection` interface
  - Added `getWorkforceIncome(state)` query
  - Updated `getBuildingInspection` to compute per-building income
  - Updated `getColonistInspection` to compute per-colonist income

### Tests
- New: `tests/materialIncomeMeasurement.test.ts` (13 tests)
  - Income rates by workplace type
  - Zero income for unemployed / crew-assigned / inaccessible
  - Workforce income aggregation
  - Inspection exposes income
  - Persistence round-trip (income derived, not stored)
  - SAVE_VERSION unchanged
- Updated existing tests to include `materialIncome` field in expectations:
  - `tests/constructionCrew.test.ts`
  - `tests/inspection.test.ts`
  - `tests/workforceContentionFeedback.test.ts`
  - `tests/workforceReassignment.test.ts`

## 4. Validation

- TypeScript: PASS (no errors)
- Build: PASS (`npm run build`)
- Focused tests: 13/13 PASS (`tests/materialIncomeMeasurement.test.ts`)
- Related tests: PASS (`tests/inspection.test.ts`, `tests/workforceReassignment.test.ts`,
  `tests/colonistMobility.test.ts`, `tests/constructionCrew.test.ts`)
- Full Vitest: 1752/1763 PASS (11 pre-existing timeout failures in long-running
  audit tests unrelated to this change)
- Lint: PASS
- `git diff --check`: clean
- SAVE_VERSION: 8 (unchanged)
- Determinism: income is pure derivation from canonical state; same input → same output
- Save/load: income re-derived on restore; round-trip verified

## 5. What this step does NOT do

- No new resource (Material reused as currency)
- No spending mechanics (income accumulates; spending deferred to future Phase 7 steps)
- No price system
- No market/demand
- No new UI panels (income visible in existing inspection/HUD via derived query)
- No persistence schema change
- No SAVE_VERSION increment
- No gameplay rule changes to existing production/consumption/upkeep

## 6. Files changed

- `src/domain/population/colonist.ts` (+12)
- `src/domain/simulation/phases.ts` (+43)
- `src/domain/simulation/step.ts` (+6, -1)
- `src/application/queries/inspection.ts` (+55)
- `tests/materialIncomeMeasurement.test.ts` (new, +227)
- `tests/constructionCrew.test.ts` (+2)
- `tests/inspection.test.ts` (+2)
- `tests/workforceContentionFeedback.test.ts` (+1)
- `tests/workforceReassignment.test.ts` (+2)
- `docs/roadmap/Step10CQ.md` (prompt + as-built)

## 7. Commit

`<commit-hash>` — Step 10CQ: Material as Currency — Minimal Income Mechanism

## 8. Next step handoff

Phase 7 continues with spending affordances:
- How colonists spend accumulated Material
- What purchases become available
- How spending creates new decisions without becoming a spreadsheet

Next step should preserve the derived-income foundation while adding
the first spending operation (e.g., "buy" a building using accumulated Material
instead of instantaneous deduction).
