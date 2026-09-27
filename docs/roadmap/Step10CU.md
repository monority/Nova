# NOVA — Step 10CU: Phase 7 Next Concrete Capability

## Mission

Continue NOVA's authoritative roadmap from the current state.

Current baseline:

- `10CQ` — Material income: complete.
- `10CQ.1` — Material income compatibility migration: complete.
- `10CR` — building Material spending / affordability: complete.
- `10CS` — road Material spending / affordability: complete.
- `10CT` — building affordability completeness with the existing Step 10BJ protected-Storage release: complete.
- Latest commit: `ebfa862`.
- `SAVE_VERSION = 8`.
- Material income, spending, same-tick affordability, and the existing protected-reserve release are now coherent.
- Building and road affordability remain distinct where the domain rules intentionally differ.
- The known baseline failures remain:
  - `waterConstructionWorkforcePressureAudit.test.ts` §6
  - `waterConstructionWorkforcePressureAudit.test.ts` §7
- They are pre-existing and must not be attributed to 10CU.

The project is actively executing the roadmap.

**Do not restart foundation/product-direction/growth audits.**

---

# Phase 0 — Find the actual next roadmap requirement

Before writing code, inspect:

1. `docs/26-roadmap.md`
2. `docs/20-strategy.md`
3. all Phase 7 references in `docs/`
4. `docs/roadmap/Step10CQ.md`
5. `docs/roadmap/Step10CQ.1.md`
6. `docs/roadmap/Step10CR.md`
7. `docs/roadmap/Step10CS.md`
8. `docs/roadmap/Step10CT.md`
9. current git history around `10CQ` through `10CT`
10. the current implementation of Material income, spending, affordability, construction, roads, Storage reserve release, and commands.

Then answer this question from repository evidence:

> **What concrete Phase 7 capability is still missing after income + expenditure + affordability completeness?**

Do not assume the answer.

---

# Critical decision gate

There are two possible outcomes.

## Outcome A — A concrete roadmap capability exists

If `docs/26-roadmap.md` or the authoritative Phase 7 strategy clearly specifies another capability:

Implement exactly that capability.

Proceed through the rest of this prompt.

## Outcome B — Phase 7 is already functionally complete

If the repository evidence demonstrates that:

- work produces income;
- income affects Material;
- expenditure exists;
- building expenditure is affordable correctly;
- road expenditure is affordable correctly;
- protected Storage release is correctly represented by affordability;
- the player receives clear affordability feedback;
- no documented Phase 7 capability remains;

then **do not invent another mechanic**.

Instead:

1. document the evidence;
2. state that Phase 7 is complete;
3. create the roadmap handoff required by the project conventions;
4. do not modify runtime behavior;
5. do not manufacture another "audit" merely to create a 10CU feature.

This is an explicit stop condition.

The goal is to execute the roadmap, not create artificial work.

---

# If a concrete capability remains

## Implementation

Implement exactly one coherent capability.

Prefer a complete vertical slice:

```text
domain
→ application
→ simulation if required
→ UI/rendering if required
→ tests
→ browser validation
```

Reuse the existing architecture.

Do not create speculative abstractions.

Do not refactor unrelated systems.

---

# Economic invariants

Preserve the established Phase 7 contract.

### Income

- Farm worker: `+1 Material/tick`
- Well worker: `+1 Material/tick`
- Workshop worker: `+2 Material/tick`

### Existing expenditure

- `placeBuilding`
- `placeRoads`

### Building protected reserve

The existing Step 10BJ building-only release remains authoritative.

Do not silently extend the reserve release to roads.

### Affordability

The query must not contradict the authoritative command.

Where applicable:

```text id="w1pl6y"
stored stock
+ legitimate same-tick inflow
+ legitimate existing reserve release
≥ required cost
```

Do not double-count any component.

Do not introduce a second currency.

Do not add a cached affordability state.

---

# Simulation / persistence

Preserve:

- deterministic simulation;
- save/load;
- stable hashing;
- command atomicity;
- rejected-command no-op behavior;
- insertion-order determinism;
- existing tick ordering.

Prefer derived state.

Keep:

`SAVE_VERSION = 8`

unless the actual roadmap capability absolutely requires persistence and that requirement is documented.

---

# Tests

Add focused tests for the actual capability.

Cover:

- normal success;
- boundary condition;
- failure/rejection;
- no-op behavior;
- repeated use;
- interaction with existing Material economy;
- deterministic replay;
- save/load continuation;
- hash stability.

Run all relevant existing regression suites.

Do not weaken tests.

Do not mass-edit historical expectations without establishing that the underlying contract genuinely changed.

---

# UI

Only modify UI if required by the capability.

Reuse current NOVA interaction and inspection patterns.

Do not create:

- a new economy dashboard;
- a market;
- pricing UI;
- redundant Material displays;
- speculative panels.

All displayed economic values must come from authoritative queries.

---

# Browser / responsive

If runtime/UI changes:

Run headed browser validation at:

- `1280×800`
- `420×740`
- `360×640`

Verify the real player flow, not merely selectors.

Check:

- correct state;
- correct feedback;
- success/rejection behavior;
- no stale UI;
- no overflow;
- zero console/page errors.

---

# GPU

If rendering/runtime changes, run the established headed GPU/WebGL2 verification.

Confirm:

- WebGL2;
- NVIDIA hardware path;
- stable rendering;
- zero errors.

If no rendering/runtime changes, explicitly document why GPU validation is unnecessary.

---

# Full validation

Run:

- focused tests;
- relevant regression tests;
- full Vitest;
- typecheck;
- lint;
- build;
- `git diff --check`.

For runtime/UI changes also run:

- headed browser;
- responsive;
- GPU/WebGL2.

The two known water-audit failures remain baseline only if they are reproduced unchanged.

---

# Documentation

Create:

`docs/roadmap/Step10CU.md`

The document must contain:

- roadmap evidence;
- decision gate;
- exact capability implemented, OR explicit Phase 7 completion/handoff;
- files changed;
- simulation/economic impact;
- persistence impact;
- tests;
- validation;
- known baseline failures;
- explicit non-goals;
- as-built result.

If the correct result is "Phase 7 complete", do not create fake implementation sections. Document the completion evidence and handoff honestly.

---

# Hard constraints

Do NOT:

- invent a mechanic;
- invent a new currency;
- add MoneyState;
- add markets;
- add pricing;
- add trade;
- add production economy unless explicitly identified as the next roadmap phase;
- add transport;
- add vehicles;
- add technology;
- add settlement growth;
- add City;
- add automation;
- redesign the HUD;
- alter income coefficients;
- alter existing construction/road costs without roadmap evidence;
- alter protected reserve semantics;
- change Town;
- change scenario semantics unless directly required;
- change `SAVE_VERSION` without explicit justification;
- perform broad cleanup;
- push to remote.

Most importantly:

**Do not create another affordability-completeness step simply because one can be found.**

If the existing Phase 7 contract is complete, stop and hand off.

---

# Final audit

Before committing:

```bash
git status --short
git diff --stat
git diff --check
git diff
```

Verify:

- only intentional 10CU changes;
- no unrelated files;
- no generated artifacts;
- no temporary scripts;
- no dependency changes unless required;
- no user-owned untracked roadmap files touched;
- no hidden second mechanic;
- no duplicated economic calculation.

Then report:

1. exact roadmap evidence;
2. decision: implementation or Phase 7 completion;
3. implementation summary if applicable;
4. tests;
5. full validation;
6. browser/responsive/GPU results if applicable;
7. baseline failures;
8. `SAVE_VERSION`;
9. changed files;
10. commit hash.

If implementing:

Commit exactly:

`Step 10CU: <exact roadmap capability>`

If Phase 7 is complete:

Commit exactly:

`Step 10CU: Phase 7 Completion Handoff`

Do not push.

---

# Documentation (as-built) — Step 10CU: Phase 7 Completion Handoff

## Decision

**Outcome B — Phase 7 is functionally complete. No runtime behavior was
modified. No new capability was invented.** The commit contains documentation
only.

## 1. Roadmap evidence

- `docs/26-roadmap.md` — Phase 7 is exactly:

  ```text
  work → income → expenditure → affordability
  ```

  with the single qualifier "Only introduce money if it creates meaningful
  decisions rather than UI accounting." No further Phase 7 sub-capability is
  named.
- `docs/roadmap/Step10CP.md` §7 defined Phase 7 as one causal dimension
  (economic medium) with two parts; line 319 records "No spending system
  (Phase 7 part 2 deferred)". Part 1 = income (10CQ/10CQ.1), part 2 =
  spending/affordability (10CR/10CS/10CT) — both are now implemented.
- `docs/roadmap/Step10CP.md` explicitly lists market mechanics, consumer
  choice, demand signals and savings/investment as **explicit non-goals** of
  Phase 7; they belong to Phase 8 ("Production economy") and later.
- `docs/08-economy.md` / `docs/09-economy-foundation.md` describe the broader
  future model (`household → labor → income → consumption`,
  `business/industry → goods/service → revenue`,
  `infrastructure → capacity → maintenance cost`). Those flow systems are the
  documented Phase 8+ scope, not a remaining Phase 7 requirement.
- `docs/roadmap/Step10CA.md` — "No new mechanic is justified yet".
- `docs/roadmap/Step10CL.md` — growth DEFER; revisit only if a "player-visible
  sink/demand in current systems" appears.

## 2. Decision gate applied

| Gate question | Evidence | Result |
| --- | --- | --- |
| Does work produce income? | `creditMaterialIncome` (Farm +1, Well +1, Workshop +2); `tests/materialIncomeMeasurement.test.ts` | ✅ |
| Does income affect Material? | income is credited to `resources.construction` before commands; `tests/materialIncomeMeasurement.test.ts`, `tests/economicInvariants.test.ts` | ✅ |
| Does expenditure exist? | `placeBuilding` (25) and `placeRoads` (5/cell); authoritative `applyCommand` | ✅ |
| Is building expenditure affordable correctly? | `getPlacementAffordability` incl. inflow, income and the Step 10BJ reserve release; `tests/buildingReserveAffordability.test.ts`, `tests/workshopWaterAffordability.test.ts` | ✅ |
| Is road expenditure affordable correctly? | `getRoadsPlacementAffordability` (income-aware, reserve-excluded); `tests/roadAffordabilityParity.test.ts` | ✅ |
| Is the protected Storage release represented by affordability? | 10CT reserve clause (`coveredByProtectedReserve`, `releasedFromStorage`) | ✅ |
| Does the player get clear affordability feedback? | hover `ready · material N (incl. …)` / `insufficient material (a/b)` / `insufficient water`; `e2e/roadAffordabilityRun.mjs`, `e2e/reserveAffordabilityRun.mjs` | ✅ |
| Does a documented Phase 7 capability remain? | none found: Phase 7 has two parts, both complete; every documented "next" item is Phase 8+ | ✅ none |

The invariant `query.affordable === command accepted` is pinned by both
affordability test suites, so the query/command agreement required by Phase 7
holds.

## 3. Phase 7 completion summary (as built)

```text
work            assignJobs (Phase 6, unchanged)
  ↓
income          creditMaterialIncome — Farm +1, Well +1, Workshop +2 (10CQ)
  ↓
expenditure     placeBuilding (25, +1 Water for a Workshop) — 10CR/10CT
                placeRoads (5 per normalized cell) — 10CS
  ↓
affordability   getPlacementAffordability = valid
                  | stock + stored production + income
                  | Step 10BJ protected Storage release (buildings only)
                getRoadsPlacementAffordability = valid
                  | stock + stored production + income (no reserve release)
  ↓
feedback        building/road hover names the exact cost and shortfall
```

## 4. Files changed

- `docs/roadmap/Step10CU.md` — this completion/handoff record (documentation
  only; the prompt above is preserved verbatim).

No `src/`, `tests/`, `e2e/` or `package.json` change. `git diff` against
`ebfa862` is empty; `git status --short` shows no tracked modification.

## 5. Simulation / economic impact

None. The Phase 7 contract is unchanged from `ebfa862` (10CT):

- income rates: Farm +1, Well +1, Workshop +2 Material/tick;
- expenditure: `placeBuilding` 25 (+1 Water for a Workshop), `placeRoads`
  5/cell;
- protected Storage floor 15, release for building commands only;
- one ledger interpretation:
  `stored stock + legitimate same-tick inflow + legitimate reserve release −
  spending`, with no double counting and no second currency.

## 6. Persistence impact

None. `SAVE_VERSION = 8`. Material income and affordability remain derived;
no new persisted state.

## 7. Tests

No test was added, weakened or migrated — the prompt forbids manufacturing an
audit for this step, and the existing coverage already pins the contract:

- focused Phase 7 + economy regression: **128 passed / 8 files**
  (`materialIncomeMeasurement`, `buildingReserveAffordability`,
  `roadAffordabilityParity`, `storageReleaseSemantics`, `upkeep`,
  `storageCapacity`, `economicInvariants`, `materialDemandPhase5Audit`).

## 8. Validation

- focused: 128/128 PASS
- full Vitest: **1788 passed, 2 failed** — the two known baseline failures
  (below), reproduced unchanged
- typecheck: PASS
- lint: PASS
- production build: PASS
- `git diff --check`: clean
- `git diff` vs `ebfa862`: empty (documentation-only step)

## 9. Known baseline failures (pre-existing, not attributed to 10CU)

- `tests/waterConstructionWorkforcePressureAudit.test.ts` §6 — material 119 vs 0
- `tests/waterConstructionWorkforcePressureAudit.test.ts` §7 — material 36 vs 37

## 10. Browser / responsive / GPU

Not applicable and intentionally skipped: 10CU changes no runtime code, no
rendering code and no UI. There is no player flow to exercise, so browser,
responsive and GPU/WebGL2 runs would only re-verify the unchanged `ebfa862`
build. (The 10CS/10CT browser suites remain the standing evidence for the
Phase 7 UI: `e2e/roadAffordabilityRun.mjs`, `e2e/reserveAffordabilityRun.mjs`.)

## 11. Explicit non-goals

No new mechanic, currency, `MoneyState`, market, pricing, trade, production
economy, transport, vehicles, technology, settlement growth, City, automation,
HUD redesign, income-coefficient change, construction/road cost change,
protected-reserve change, Town change, scenario-semantics change, cleanup, or
`SAVE_VERSION` change. No affordability-completeness step was manufactured.

## 12. Handoff

Phase 7 is complete. The next authoritative roadmap phase is **Phase 8 —
Production economy** (`docs/26-roadmap.md`: inputs → production → outputs →
consumption; `docs/08-economy.md`: `business/industry → goods/service →
revenue`, `infrastructure → capacity → maintenance cost`).

Handoff conditions for Phase 8, consistent with the documented dependency rule
(`docs/21-simulation-progression.md`: "A later system may not become a
prerequisite of an earlier system unless the earlier system has explicitly been
revised") and the 10CF decision standard:

1. Phase 8 begins only from an explicit roadmap instruction; it is a new causal
   dimension (production inputs/outputs/demand), not a Phase 7 extension.
2. Phase 7 invariants stay frozen: derived income rates, the two expenditure
   paths, query/command affordability agreement (including the building-only
   reserve release), determinism and `SAVE_VERSION = 8`.
3. The `waterConstructionWorkforcePressureAudit` §6/§7 baseline failures must be
   resolved or explicitly re-baselined before they are used as Phase 8
   evidence.
4. No Phase 7 affordability step should be reopened unless a concrete
   query/command disagreement is reproduced from repository evidence.

## 13. Final result

Phase 7 — Money / affordability is functionally complete at `ebfa862`: work
produces income, income is Material, both expenditure paths enforce and predict
affordability correctly (including the existing protected Storage release), and
the player receives authoritative affordability feedback. Documentation-only
handoff; no runtime change.

Commit: `Step 10CU: Phase 7 Completion Handoff`
