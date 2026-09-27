# NOVA — Step 10CT: Phase 7 Next Roadmap Increment

## Mission

Continue NOVA's authoritative Phase 7 roadmap from the current repository state.

Current baseline:

- `10CQ` — Material income: complete.
- `10CQ.1` — Material income compatibility/test migration: complete.
- `10CR` — first Material spending / building affordability: complete.
- `10CS` — road affordability / second Material spending path: complete.
- Current implementation commits:
  - `df19329`
  - `414f713`
- `SAVE_VERSION = 8`.
- Material income is derived.
- Building and road spending both use same-tick Material affordability.
- Both spending paths have authoritative command enforcement.
- Full Vitest currently reports:
  - 1774 passed;
  - 2 known pre-existing failures in `waterConstructionWorkforcePressureAudit.test.ts`.
- Typecheck, lint, build, browser, responsive, GPU/WebGL2 and diff-check have passed for 10CS.

Do not restart foundation/product-direction audits.

The project is now executing the roadmap.

---

# Phase 0 — Determine the exact next capability

Before changing code, inspect:

1. `docs/26-roadmap.md`
2. `docs/20-strategy.md`
3. every Phase 7-related roadmap document;
4. `docs/roadmap/Step10CQ.md`
5. `docs/roadmap/Step10CQ.1.md`
6. `docs/roadmap/Step10CR.md`
7. `docs/roadmap/Step10CS.md`
8. current git history around 10CQ–10CS;
9. current Material income/spending implementation;
10. current command/query architecture.

Determine what the **next concrete Phase 7 requirement** is according to the authoritative roadmap.

### Critical rule

Do NOT assume that the next feature is:

- another spending path;
- a new currency;
- a budget system;
- a market;
- pricing;
- production economy;
- transport;
- growth.

Only implement it if the authoritative roadmap actually calls for it at this point.

If the roadmap specifies the next capability, follow it exactly.

If the roadmap does not explicitly name the next implementation, derive the smallest necessary increment from Phase 7's documented objective and current state.

Document the reasoning in `docs/roadmap/Step10CT.md`.

---

# Phase 1 — Do not repeat completed work

Treat the following as established contracts.

## Material income

- Farm worker: `+1 Material/tick`
- Well worker: `+1 Material/tick`
- Workshop worker: `+2 Material/tick`

Do not modify these rates.

## Existing spending paths

### Building

`placeBuilding`

### Roads

`placeRoads`

Both already:

- have Material costs;
- have authoritative command enforcement;
- use same-tick inflow-aware affordability;
- deduct Material atomically;
- preserve the protected reserve rules already established by the repository.

Do not redesign these systems.

Do not introduce a duplicate affordability abstraction unless the next roadmap capability genuinely requires one.

---

# Phase 2 — Implement one coherent increment

Once the exact 10CT target is known:

Implement **only that capability**.

Prefer a complete vertical slice:

```text
domain
→ application
→ UI/rendering if required
→ tests
→ browser validation
```

Do not implement future Phase 7 or Phase 8 work.

Do not perform unrelated refactoring.

Do not "improve" architecture unless required for the actual feature.

---

# Phase 3 — Economic consistency

Any new economic behavior must remain consistent with the established ledger:

```text
stored Material
+
legitimate same-tick inflows
-
legitimate spending
```

There must be no:

- double income;
- double production;
- double spending;
- query/command disagreement;
- stale affordability cache;
- UI-only affordability;
- hidden second currency.

If the new feature does not involve Material directly, do not modify the existing Material economy merely for symmetry.

---

# Phase 4 — Simulation and persistence

Preserve:

- deterministic simulation;
- save/load;
- hash stability;
- command no-op semantics;
- insertion-order determinism;
- existing tick ordering.

Prefer derived state unless persistence is explicitly required.

Do not change:

`SAVE_VERSION = 8`

unless the authoritative roadmap makes a persistence change unavoidable and it is explicitly justified.

---

# Phase 5 — Tests

Add focused tests for the actual 10CT feature.

Cover:

- normal success;
- boundary conditions;
- invalid/rejected cases;
- no-op behavior;
- interaction with existing economy where relevant;
- repeated operations;
- determinism;
- save/load continuation;
- hash stability.

Also run the relevant existing regression suites.

Do not weaken old tests simply to make them green.

If a historical assertion is genuinely obsolete, migrate it narrowly and document why.

---

# Phase 6 — UI / player feedback

Only change UI where required.

Reuse existing NOVA patterns.

Do not introduce:

- economy dashboards;
- new panels;
- duplicate Material displays;
- unnecessary cards;
- speculative menus;
- decorative UI complexity.

Any displayed value must originate from the authoritative simulation/query layer.

---

# Phase 7 — Browser validation

If the feature affects runtime or UI, verify headed browser behavior at:

- `1280×800`
- `420×740`
- `360×640`

Verify the actual player flow.

Check:

- discoverability;
- correct state;
- correct feedback;
- successful and rejected paths;
- no stale values;
- no overflow;
- zero console/page errors.

---

# Phase 8 — GPU/WebGL2

If rendering/runtime changes, run the existing headed GPU/WebGL2 test.

Verify:

- WebGL2;
- NVIDIA hardware path;
- stable scene;
- zero console/page errors.

If no rendering/runtime behavior changes, explicitly document why GPU execution is unnecessary.

---

# Phase 9 — Full validation

Run:

- focused 10CT tests;
- relevant regression tests;
- full Vitest;
- typecheck;
- lint;
- build;
- `git diff --check`.

Run browser/responsive/GPU validation when applicable.

Known baseline failures:

`waterConstructionWorkforcePressureAudit.test.ts`

must remain explicitly identified if unchanged.

Do not silently classify new failures as baseline failures.

---

# Phase 10 — Documentation

Create:

`docs/roadmap/Step10CT.md`

It must contain:

1. exact roadmap requirement;
2. evidence used to select it;
3. implementation;
4. files changed;
5. simulation impact;
6. economic impact;
7. persistence impact;
8. tests;
9. validation;
10. known baseline failures;
11. explicit non-goals;
12. final result.

Use an as-built section so the document reflects the implementation actually produced.

---

# Hard non-goals

Do NOT:

- add a new currency;
- add MoneyState;
- add markets;
- add pricing;
- add trade;
- add production economy;
- add transport simulation;
- add vehicles;
- add technology;
- add settlement growth;
- add City;
- add automation;
- redesign the HUD;
- redesign roads;
- redesign construction;
- alter workforce income rates;
- alter Material costs without roadmap evidence;
- alter protected reserve semantics;
- change Town;
- modify scenario semantics unless directly required;
- change SAVE_VERSION without explicit necessity;
- perform broad cleanup;
- push to remote.

**One roadmap increment only.**

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

- only intentional 10CT files changed;
- no unrelated cleanup;
- no generated artifacts;
- no temporary scripts;
- no dependency changes unless required;
- no user-owned untracked files touched;
- no hidden second mechanic;
- no duplicated economic calculation.

Then report:

1. exact 10CT target;
2. why it was selected;
3. implementation summary;
4. tests;
5. validation;
6. browser/responsive/GPU results where applicable;
7. baseline failures;
8. SAVE_VERSION;
9. changed files;
10. commit hash.

Commit exactly:

`Step 10CT: <exact roadmap capability>`

Do not push.

---

# Documentation (as-built) — Step 10CT: Reserve-Aware Building Affordability

## 1. Exact roadmap requirement

Phase 7's `expenditure → affordability` contract must predict what the
authoritative command accepts. The building command releases Material above the
protected Storage floor before it validates (Step 10BJ
`releaseMaterialForCommand`), but `getPlacementAffordability` counted only
stock + stored production + income. The hover/commit gate therefore refused a
building the deterministic simulation would build from the reserve. 10CT makes
the building affordability query mirror the building dispatch pipeline.

## 2. Evidence used to select it

- `docs/26-roadmap.md` Phase 7: `work → income → expenditure → affordability`.
- `docs/roadmap/Step10CQ.md` / `10CQ.1.md` / `10CR.md` / `10CS.md`: income is
  derived; both spending paths exist (`placeBuilding` 25, `placeRoads` 5/cell);
  10CS closed road affordability, leaving the building reserve clause open.
- `docs/roadmap/Step10BJ.md` and `src/domain/simulation/phases.ts`
  (`releaseMaterialForCommand`): release is building-command-only, floors
  Storage at 15, and is not mirrored by the query.
- `docs/roadmap/Step10CA.md` ("No new mechanic is justified yet") and
  `docs/roadmap/Step10CL.md` (growth DEFER; revisit only if a "player-visible
  sink/demand in current systems" appears). A new sink/mechanic is therefore
  not the next increment; completing the existing affordability contract is.
- Concrete disagreement (measured): main 0 + Storage 40 + a valid Residence →
  query said not affordable, `stepSimulation` accepted it (Storage 40 → 15).

## 3. Implementation

`src/application/queries/placement.ts` — `getPlacementAffordability` now also
mirrors the Step 10BJ release:

- computes `releaseProtectedMaterialReserve(storage, stock, cost)` for a
  Material shortfall;
- derives stored production from the RELEASED stock, because the release
  consumes this tick's storage clamp headroom (a 39-unit reserve releases 24,
  leaving only 1 of a staffed Workshop's 2 stored);
- requires Water sufficiency before releasing, because the preflight release
  fails when the Water investment is short (the reserve must never mask Water);
- exposes `coveredByProtectedReserve` and `releasedFromStorage`; keeps
  `coveredBySameTickInflow` exactly as before, so reserve coverage is never
  double-attributed to income/stored production.

`src/app/main.ts` — the building hover names the contributor:
`ready · material 25 (incl. 25 reserve)` when the reserve is what completes the
cost.

## 4. Files changed

- `src/application/queries/placement.ts` — reserve clause in the building query
- `src/app/main.ts` — reserve tooltip suffix
- `tests/buildingReserveAffordability.test.ts` — new, 14 tests (B1–B14)
- `e2e/reserveAffordabilityRun.mjs` — new browser proof
- `package.json` — `test:e2e:reserve-affordability`
- `docs/roadmap/Step10CT.md` — this as-built record

## 5. Simulation impact

None. No tick ordering, phase, rule, command or canonical state changed. The
release itself remains exclusively `releaseMaterialForCommand` inside
`stepSimulation`; the query is read-only and never mutates (B14 hash check).

## 6. Economic impact

- Income rates, building/road costs and the 15-unit protected floor are
  unchanged.
- One ledger interpretation now holds on the building path:
  `stock + released reserve + post-release stored production + income − cost`.
- Rejected commands stay rejected; the reserve is still protected at 15.
- Roads still do not draw on the reserve (10BJ is building-only) — B13.

## 7. Persistence impact

None. Affordability is derived, never persisted or hashed. `SAVE_VERSION`
remains **8**; save/load is byte-identical and the query result is identical on
the restored state (B14).

## 8. Tests

`tests/buildingReserveAffordability.test.ts` (14 tests):

- B1 reserve completes a 25-cost Residence (Storage 40 → floor 15)
- B2 floor stays protected (Storage 15 releases nothing)
- B3 reserve below cost (Storage 20 releases 5) still cannot build
- B4 empty Storage releases nothing
- B5 sufficient main stock does not touch the reserve
- B6 same-tick inflow alone covers: the reserve is not attributed
- B7 reserve + income build exactly once (main 0, Storage 40, +1 income)
- B8 reserve funds a shortfall income alone cannot (main 0, Storage 39)
- B9 a Water shortfall is never masked by the reserve (Workshop)
- B10 a spatial failure is never masked by the reserve
- B11 query agrees with the command across a reserve sweep (0..40)
- B12 the released stock shrinks the storage clamp exactly as the domain does
- B13 roads still do not use the protected reserve
- B14 derived: no mutation, save/load identical, SAVE_VERSION 8

## 9. Validation

- focused: 14/14 PASS (TDD red 12 → green 14)
- full Vitest: **1788 passed, 2 failed** (both pre-existing, below)
- typecheck: PASS
- lint: PASS
- production build: PASS
- `git diff --check`: clean
- browser (`e2e/reserveAffordabilityRun.mjs`, headed): reserve-funded hover
  reads `cell 6,6 — ready · material 25 (incl. 25 reserve)`, the placement is
  accepted and Storage drops to `15 / 40 · 15 protected`; with Storage 15 the
  same cell reads `insufficient material (0/25)` and is refused; 1280×800,
  420×740 and 360×640 have no horizontal overflow, a usable canvas and a
  readable status; 0 console/page errors
- GPU/WebGL2 (`npm run test:e2e:gpu`): PASS — WebGL2, NVIDIA RTX 3070
  (unmasked), stable scene, 0 console/page errors
- 10CS regression: `npm run test:e2e:road-affordability` PASS

## 10. Known baseline failures (unchanged, not attributed to 10CT)

- `tests/waterConstructionWorkforcePressureAudit.test.ts` §6: material 119 vs 0
- `tests/waterConstructionWorkforcePressureAudit.test.ts` §7: material 36 vs 37
- `e2e/roadRun.mjs` case D diagonal-drag feedback (pre-existing, reproduced on
  the 10CS baseline)
- `e2e/progressionRun.mjs` ("timeout: valid preview at 0,1"),
  `e2e/upkeepRun.mjs` (14 failures), `e2e/industrialRun.mjs` ("Workshop must
  spend the whole Material: 2") and `e2e/readabilityAudit.mjs` ("expected 8
  catalogue scenarios ... got 11"). All four reproduce IDENTICALLY with the
  10CT source changes stashed, so they predate this step and were left
  untouched.

## 11. Explicit non-goals

No new currency, market, pricing, trade, sink, production economy, transport,
vehicles, technology or growth. No change to income rates, building/road costs,
the protected floor, reserve-release semantics, Town, scenarios, HUD layout or
roads. No persistence schema change, no `SAVE_VERSION` change, no broad
cleanup.

## 12. Final result

The building affordability predicate now mirrors the authoritative dispatch
pipeline including the Step 10BJ protected-reserve release, so the UI can no
longer refuse a building the deterministic simulation would fund from Storage.

Commit: `Step 10CT: Reserve-Aware Building Affordability`
