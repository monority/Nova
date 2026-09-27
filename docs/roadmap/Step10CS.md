# NOVA — Step 10CS: Phase 7 Continuation

## Mission

Continue the authoritative NOVA roadmap from the current repository state.

Current baseline:

- Step 10CQ — Material income: complete.
- Step 10CQ.1 — Material income compatibility/test migration: complete.
- Step 10CR — Material spending / first affordability operation: complete.
- Current commit: `df19329`.
- `SAVE_VERSION = 8`.
- Material is now both:
  - generated through existing workforce;
  - spent through the existing `placeBuilding` construction operation.
- `placeBuilding` remains the authoritative spending command.
- `getPlacementAffordability()` accounts for the relevant same-tick Material inflow.
- Two known pre-existing failures remain in `waterConstructionWorkforcePressureAudit.test.ts`; they are unrelated to Phase 7 and must not be silently attributed to this step.

The project is now actively executing the documented roadmap.

**Do not restart product-direction audits, foundation audits, growth investigations, or freeze/reorientation exercises unless the authoritative roadmap explicitly requires one.**

---

# Phase 0 — Establish the exact 10CS target

Before changing anything, inspect the repository.

Read:

1. `docs/26-roadmap.md`
2. `docs/20-strategy.md`
3. all relevant Phase 7 documentation;
4. `docs/roadmap/Step10CQ.md`
5. `docs/roadmap/Step10CQ.1.md`
6. `docs/roadmap/Step10CR.md`
7. the current Material income implementation;
8. the current Material spending implementation;
9. the current command pipeline;
10. relevant construction/affordability tests.

Then inspect git history around:

- `10CQ`
- `10CQ.1`
- `10CR`

Determine the **next concrete Phase 7 capability actually required by the authoritative roadmap**.

Do not guess what "10CS" should mean from the step number alone.

If the roadmap explicitly defines the next capability, implement that capability.

If it does not explicitly define it, derive the smallest logical next increment from the documented Phase 7 objective and existing architecture. Document that reasoning before implementation.

Do not create a speculative economy feature merely because the step number exists.

---

# Phase 1 — Preserve the economic foundation

The following contracts are now established and must remain stable.

## Material income

Existing rates:

- Farm worker: `+1 Material/tick`
- Well worker: `+1 Material/tick`
- Workshop worker: `+2 Material/tick`

Do not change them unless the authoritative roadmap explicitly requires a change.

## Material spending

The first spending operation is:

`placeBuilding`

Do not replace it with another operation.

Its existing Material construction cost remains authoritative.

Affordability must remain atomic:

```text
Material available >= cost
    → command succeeds
    → exact cost deducted once

Material available < cost
    → command rejected
    → no Material deduction
    → no partial construction mutation
```

Do not introduce a second currency.

Do not introduce a parallel affordability model.

---

# Phase 2 — Implement ONLY the next roadmap increment

Once the target is established, implement the smallest complete capability required by the roadmap.

The implementation must:

- reuse existing domain concepts;
- reuse existing command/query architecture;
- preserve deterministic simulation;
- preserve save/load;
- preserve hashing;
- preserve existing workforce/economy rules;
- avoid speculative abstractions;
- avoid unrelated refactors.

Prefer a complete vertical slice over scattered groundwork:

```text
domain
→ application
→ rendering/UI if required
→ tests
→ browser verification
```

Do not implement future Phase 7 features "while you're here."

---

# Phase 3 — Economic consistency

For any new Phase 7 behavior, explicitly verify the Material ledger.

There must be one authoritative interpretation of:

```text
stored Material
+
same-tick legitimate inflows
-
same-tick legitimate spending
```

Do not accidentally:

- count income twice;
- count production twice;
- deduct spending twice;
- allow the query to disagree with the command;
- bypass affordability through another command path;
- introduce cached economic state that can become stale.

If the new capability affects the tick pipeline, inspect every mirrored/replay pipeline and update them consistently.

---

# Phase 4 — Persistence and determinism

Unless the roadmap explicitly requires new persisted state:

**prefer derived state.**

Do not change `SAVE_VERSION`.

For any new stateful behavior, verify:

- save/load roundtrip;
- continuation after load;
- stable hash;
- insertion-order determinism;
- repeated identical command sequences;
- rejected commands are no-ops;
- no hidden random/non-deterministic behavior.

If the capability requires persistence, justify why derivation is insufficient before adding a field.

---

# Phase 5 — Tests

Add focused tests for the actual 10CS capability.

At minimum cover:

### Core behavior

- normal successful path;
- boundary condition;
- invalid/rejected path;
- no-op behavior;
- repeated operation;
- interaction with existing Material income;
- interaction with existing Material spending.

### Economic consistency

Verify that:

```text
income → stock → affordability → spending
```

continues to behave correctly.

### Regression

Cover relevant existing systems:

- workforce;
- production;
- construction;
- Workshop upkeep;
- roads/accessibility where relevant;
- Town;
- scenarios where relevant.

### Determinism

Cover:

- same input → same result;
- save/load continuation;
- stable hash;
- record-order independence where applicable.

Do not weaken existing assertions simply to make the suite pass.

If existing tests encode a genuinely obsolete contract, migrate them narrowly and document why.

---

# Phase 6 — UI

Only change the UI where required by the actual 10CS capability.

Reuse existing NOVA UI patterns.

Do not introduce:

- economy dashboards;
- market screens;
- unnecessary cards;
- redundant counters;
- speculative panels;
- decorative complexity.

Any new player-facing fact should have a clear source in the simulation.

The UI must not implement a second affordability or economic calculation independently of the domain/application layer.

---

# Phase 7 — Browser verification

If 10CS changes runtime or UI behavior, run headed browser verification.

Required viewports:

- `1280×800`
- `420×740`
- `360×640`

Verify the complete relevant player flow, not just isolated DOM selectors.

Check:

- action discoverability;
- correct economic values;
- correct success/rejection feedback;
- state transitions;
- no stale UI;
- no overflow;
- no console/page errors.

If 10CS genuinely contains no runtime/UI change, explain why browser execution is unnecessary rather than fabricating a result.

---

# Phase 8 — GPU/WebGL2 verification

If rendering/runtime behavior changes, run the established headed GPU/WebGL2 verification.

Confirm:

- WebGL2;
- NVIDIA hardware path;
- stable scene;
- no console/page errors.

Use existing repository commands.

Do not invent a new GPU test.

If no rendering/runtime behavior changes, document the reason for skipping it.

---

# Phase 9 — Full validation

Run the appropriate complete validation set:

- focused 10CS tests;
- relevant regression tests;
- full Vitest;
- typecheck;
- lint;
- production build;
- `git diff --check`.

When runtime/UI changes exist, additionally run:

- headed browser;
- responsive verification;
- GPU/WebGL2.

Known baseline failures:

`waterConstructionWorkforcePressureAudit.test.ts`

must remain separately identified if unchanged.

Do not count a known pre-existing failure as a new 10CS failure.

Do not modify unrelated tests to eliminate it.

---

# Phase 10 — Documentation

Create:

`docs/roadmap/Step10CS.md`

Record:

1. exact roadmap target;
2. why this is the correct next Phase 7 increment;
3. implemented behavior;
4. affected domain/application/rendering/UI files;
5. Material ledger implications;
6. persistence implications;
7. deterministic behavior;
8. focused tests;
9. full validation;
10. known pre-existing failures;
11. explicit non-goals;
12. final result.

The document must describe the **actual implementation**, not planned future work.

---

# Anti-scope-creep rules

Do NOT:

- invent a new currency;
- add MoneyState;
- add markets;
- add pricing;
- add trade;
- add transport;
- add technology;
- add vehicles;
- add settlement growth;
- add City progression;
- add automation;
- redesign the economy;
- redesign the HUD;
- rewrite the construction system;
- rewrite workforce;
- change income coefficients;
- change Material storage semantics;
- change Town;
- modify scenario semantics unless directly required by the target;
- change SAVE_VERSION without an explicit roadmap requirement;
- perform unrelated cleanup;
- refactor stable architecture for aesthetic reasons;
- add speculative abstractions;
- push to remote.

**One coherent roadmap increment. Nothing beyond it.**

---

# Final audit

Before committing:

```bash
git status --short
git diff --stat
git diff --check
git diff
```

Confirm:

- every changed file belongs to 10CS;
- no unrelated files changed;
- no user-owned untracked roadmap files were touched;
- no generated artifacts remain;
- no temporary scripts remain;
- no dependency changes unless explicitly required;
- no SAVE_VERSION change unless explicitly justified;
- no hidden second mechanic;
- no duplicated economic calculation.

Then report:

1. exact 10CS roadmap target;
2. implementation summary;
3. economic contract impact;
4. tests;
5. full validation;
6. browser/responsive/GPU results when applicable;
7. known pre-existing failures;
8. SAVE_VERSION;
9. changed-file summary;
10. commit hash.

Commit exactly:

`Step 10CS: <exact roadmap capability>`

Use the exact capability name from the authoritative roadmap once established.

**Do not push.**

---

# Documentation (as-built) — Step 10CS: Road Expenditure Affordability

## 1. Exact roadmap target

**Road expenditure affordability** — the second Material spending path
(`placeRoads`) receives the same income-aware affordability contract that
Step 10CR gave `placeBuilding`, through one derived query shared by the road
hover feedback and the road commit gate.

## 2. Why this is the correct next Phase 7 increment

Phase 7 is `work → income → expenditure → affordability`. After 10CQ (income)
and 10CR (first affordability operation), two Material expenditures existed:

```text
placeBuilding  → cost 25 (+1 Water for a Workshop), affordability query ✓
placeRoads     → cost 5/cell,                        affordability query ✗
```

The road command already ran after `creditMaterialIncome` mid-tick, so the
domain accepted a road set covered by `stock + stored production + income`.
The UI gate called `validateRoadsPlacement` directly against the raw stock and
therefore refused a road the domain would build. That is exactly the
"the query must not disagree with the command" invariant this step's brief
requires. Extending the existing predicate to the missing expenditure path is
the smallest coherent increment — no new mechanic, balance change or currency.

## 3. Implemented behavior

`src/application/queries/placement.ts` gains:

```ts
getRoadsPlacementAffordability(state, cells) => {
  placement, affordable, materialRequired, materialAvailable, coveredBySameTickInflow
}
```

- wraps the unchanged authoritative `validateRoadsPlacement`;
- prices `normalizeRoadCells(cells).length × ROAD_CONSTRUCTION_COST`, so drag
  duplicates are priced once, exactly like the command;
- when the only failure is `insufficientResources`, covers the shortfall with
  `stock + getMaterialStoredProductionPerTick(state) + getWorkforceIncome(state)`;
- deliberately does **not** include the protected Storage reserve: Step 10BJ
  releases that reserve for valid building commands only, and roads carry no
  Water cost. The clause mirrors the road pipeline exactly, nothing more.

`src/app/main.ts`:

- road hover and commit gate now both read `getRoadsPlacementAffordability`;
- `describeRoadCells` reports `ready · material N` with a
  `(incl. X stored + Y income)` breakdown when the same-tick inflow completes
  the cost, and `insufficient material (available/required)` otherwise;
- the preview colour follows `affordable`, so a road funded by this tick's
  income previews as valid and is dispatchable.

## 4. Affected files

- `src/application/queries/placement.ts` — new road affordability query
- `src/app/main.ts` — road hover/commit use the shared query
- `tests/roadAffordabilityParity.test.ts` — new, 13 tests (R0–R12)
- `e2e/roadAffordabilityRun.mjs` — new browser proof
- `package.json` — `test:e2e:road-affordability` script
- `docs/roadmap/Step10CS.md` — this as-built record

## 5. Material ledger implications

- Income rates unchanged: Farm +1, Well +1, Workshop +2 per worker per tick.
- Spending unchanged: `placeBuilding` 25 (+1 Water for a Workshop), `placeRoads`
  5 per normalized cell; `placeBuilding` remains the authoritative spending
  command and the atomic check → deduct → create transaction is untouched.
- One authoritative interpretation now holds on both paths:
  `stored Material + same-tick stored production + same-tick income − spending`.
- No double counting: the query is a pure derivation and never deducts; the
  domain still validates and deducts exactly once.
- Rejected road commands remain no-ops: no road, no Material spent, no partial
  mutation.

## 6. Persistence implications

None. Affordability is derived from canonical state, never stored, never
persisted, never hashed. `SAVE_VERSION` remains **8**; save/load round-trips
are byte-identical and the query result is identical on the restored state.

## 7. Deterministic behavior

The query is a pure function of `(state, cells)`; it mutates nothing (covered
by R9). Road set normalization, spatial checks and cost all stay deterministic
and input-order independent. Rejected commands are explicit no-ops.

## 8. Focused tests

`tests/roadAffordabilityParity.test.ts` (13 tests):

- R0 fixture isolates the income term (+1/tick, no stored production, no upkeep)
- R1 stock alone covers the road (no inflow clause)
- R2 one below cost is completed by this tick's income, then accepted
- R3 control without the worker income: refused
- R4 query agrees with the authoritative command across a material sweep 0..8
- R5 multi-cell cost scales and the boundary is exact
- R6 a spatial failure is never masked by available Material
- R7 duplicate cells are priced once (normalized)
- R8 a rejected road command spends nothing and creates no road
- R9 the query never mutates the state
- R10 the domain validator still reports the raw stock shortfall
- R11 building affordability (10CR) stays income-aware
- R12 affordability stays derived; save/load identical; `SAVE_VERSION` 8

## 9. Full validation

- focused: 13/13 PASS
- full Vitest: **1774 passed, 2 failed** (both pre-existing, below)
- typecheck: PASS
- lint: PASS
- production build: PASS
- `git diff --check`: clean
- browser: `e2e/roadAffordabilityRun.mjs` (headed) — income-covered road reads
  `ready · material 5 (incl. 0 stored + 1 income)`, is accepted, and spends
  exactly 5 Material; the 3-stock control reads `insufficient material (3/5)`
  and spends nothing; 1280×800, 420×740 and 360×640 have no horizontal overflow,
  a usable canvas and a readable status; 0 console/page errors
- GPU/WebGL2 (`npm run test:e2e:gpu`): PASS — NVIDIA hardware path, Three.js,
  stable scene, 0 console/page errors

## 10. Known pre-existing failures (unchanged, not attributed to 10CS)

- `tests/waterConstructionWorkforcePressureAudit.test.ts` §6: material 119 vs 0
- `tests/waterConstructionWorkforcePressureAudit.test.ts` §7: material 36 vs 37
- `e2e/roadRun.mjs` case D: diagonal-drag feedback reads the stale single-cell
  status. Reproduced on the pre-10CS baseline (source stashed), so it predates
  this step and was left untouched.

## 11. Explicit non-goals

No new currency, no market/pricing/trade, no road upkeep, no protected-reserve
release for roads, no change to building affordability, no change to income or
spending coefficients, no domain rule change, no persistence schema change, no
`SAVE_VERSION` change, no HUD redesign, no unrelated cleanup.

## 12. Final result

One coherent Phase 7 increment: both Material expenditure paths now share one
authoritative, income-aware affordability derivation, and the UI can no longer
refuse a road the deterministic simulation would build.

Commit: `Step 10CS: Road Expenditure Affordability`
