# Step 10CV — Baseline Repair Before Phase 8

## Objective

Prepare NOVA for Phase 8 by resolving or formally re-baselining the two known `waterConstructionWorkforcePressureAudit` failures.

This is a **baseline-repair / verification step only**.

Do not implement Phase 8.
Do not add production-economy mechanics.
Do not invent new gameplay.
Do not modify the Phase 7 economy model.

Current baseline:

- Latest commit: `aee2389` — `Step 10CU: Phase 7 Completion Handoff`
- Phase 7: COMPLETE
- SAVE_VERSION: 8
- Phase 7 invariants are frozen
- Known full-suite failures:
  - `waterConstructionWorkforcePressureAudit.test.ts` §6: expected `119`, received `0`
  - `waterConstructionWorkforcePressureAudit.test.ts` §7: expected `36`, received `37`

---

## 1. Read the authoritative context first

Read:

- `docs/26-roadmap.md`
- `docs/roadmap/Step10CP.md`
- `docs/roadmap/Step10CU.md`
- `docs/roadmap/Step10CQ.md`
- `docs/roadmap/Step10CQ.1.md`
- `docs/roadmap/Step10CR.md`
- `docs/roadmap/Step10CS.md`
- `docs/roadmap/Step10CT.md`
- `tests/waterConstructionWorkforcePressureAudit.test.ts`

Also inspect the relevant current implementation around:

- `creditMaterialIncome`
- the simulation tick pipeline
- construction/material spending
- Water construction/workforce interactions

Do not assume the two failures are obsolete merely because they predate Phase 7.

---

## 2. Establish the actual root cause

Run the failing test in isolation first.

Then reproduce each failing section independently if useful.

For each failure, determine:

1. What state the test constructs.
2. What commands are applied.
3. Which simulation phases execute.
4. Where the observed Water/Material value comes from.
5. Whether the expected value represents a still-valid contract.
6. Whether the actual value is caused by:
   - an intentional Phase 7 behavior change;
   - an outdated test expectation;
   - an accidental regression;
   - or a previously hidden interaction.

Do not patch expectations before understanding the causal difference.

---

## 3. Decision gate

### Case A — Test expectation is obsolete

If the test encodes pre-Phase-7 behavior and the current behavior is explicitly correct under the frozen Phase 7 contract:

- update only the obsolete expectation;
- preserve the test's original invariant/purpose;
- add a concise comment or documentation note only if necessary to explain the changed expected value;
- do not weaken the assertion;
- do not delete the test.

### Case B — Runtime behavior is wrong

If the test still encodes a valid invariant and the current implementation violates it:

- fix the smallest root cause;
- preserve Phase 7 behavior;
- do not introduce a new mechanic;
- add/regress with a focused test if the existing test does not sufficiently protect the bug.

### Case C — The test itself is no longer meaningful

Only if the underlying measured scenario has genuinely become invalid under the current documented architecture:

- document why;
- replace it with an equivalent meaningful invariant if one exists;
- otherwise remove only the obsolete assertion/test with explicit justification.

Do not silently delete coverage.

### Case D — Neither failure can be justified

Stop rather than guessing.

Report the exact contradiction between the roadmap, implementation, and test expectation.

---

## 4. Strict scope

Allowed:

- test expectation updates;
- test migration required by the frozen Phase 7 contract;
- minimal regression fix if a real regression is found;
- focused test additions directly protecting that fix;
- `docs/roadmap/Step10CV.md`.

Forbidden:

- Phase 8 production mechanics;
- new resources;
- new production buildings;
- consumption systems;
- markets;
- demand;
- pricing;
- money changes;
- new UI;
- new commands;
- new persistence fields;
- SAVE_VERSION changes;
- refactoring unrelated code;
- speculative cleanup.

The final runtime behavior must remain within the already-established Phase 7 contract.

---

## 5. Validation

At minimum:

### Focused

Run:

- `waterConstructionWorkforcePressureAudit.test.ts`
- all directly affected Phase 7/economy tests

### Full

Run:

- full Vitest suite
- TypeScript typecheck
- ESLint
- production build
- `git diff --check`

The desired result is:

- full Vitest completely green;
- no new failures;
- no unexplained baseline failures.

If the full suite still has failures, isolate and classify them before declaring the step complete.

---

## 6. Browser / GPU rule

If there are **no runtime/UI/rendering changes**, browser/responsive/GPU verification is not required.

If runtime or rendering code must change to fix a genuine regression, then perform the appropriate:

- headed browser validation;
- responsive checks at:
  - 1280×800
  - 420×740
  - 360×640
- GPU/WebGL2 validation on the available NVIDIA hardware.

Do not claim browser/GPU validation when it was skipped.

---

## 7. Determinism and persistence

If runtime behavior changes:

Verify:

- deterministic replay;
- save/load compatibility;
- state/hash stability where applicable;
- SAVE_VERSION remains `8`.

If only tests change, explicitly confirm that no runtime/persistence behavior changed.

---

## 8. Documentation

Create:

`docs/roadmap/Step10CV.md`

Preserve this prompt verbatim at the top, then append an `## As-Built` section containing:

- baseline inspected;
- root cause of §6;
- root cause of §7;
- exact changes made;
- why those changes are consistent with the frozen Phase 7 contract;
- validation results;
- final Vitest counts;
- whether browser/GPU were skipped or run;
- SAVE_VERSION status;
- final diff/scope audit.

Do not rewrite the original prompt.

---

## 9. Final scope audit

Before committing:

```bash
git status --short
git diff --stat
git diff --check
```

Ensure every changed file is intentional.

Do not touch or commit:

- `AGENTS.md`
- user-owned untracked roadmap files
- unrelated worktree files

If unrelated changes exist, leave them untouched and explicitly report them.

---

## 10. Commit

If and only if the baseline repair is complete and validated:

```text
Step 10CV: Repair Phase 7 Baseline
```

Do not push.

---

## Completion criterion

10CV is complete only when:

- the two known failures have a documented root cause;
- each is either correctly repaired or correctly re-baselined;
- no Phase 8 mechanic has been implemented;
- Phase 7 behavior remains frozen;
- the full test baseline is green, or any remaining failure is explicitly proven unrelated and documented;
- typecheck/lint/build pass;
- diff-check passes;
- documentation is complete;
- the commit is created locally;
- nothing is pushed.

The next step after a clean 10CV is **not automatic implementation**.

It should be a dedicated **Phase 8 Production Economy Investigation / Design Gate** based on the authoritative roadmap.

---

## As-Built

### Baseline inspected

- HEAD `aee2389` (Step 10CU), Phase 7 COMPLETE, `SAVE_VERSION = 8`.
- Failing file: `tests/waterConstructionWorkforcePressureAudit.test.ts` (the Step 10AE audit, which predates Phase 7), §6 and §7.
- Isolated run: `npx vitest run tests/waterConstructionWorkforcePressureAudit.test.ts` → 20 passed, 2 failed.

### Root cause of §6

`measures one colonist on a Well / Farm / Workshop at 10/30/60 ticks`

- Fixture (`build`): 2 residences, Farm + Well + Workshop, one colonist pinned to the first Well, material 0, water 10, food 10 000; runs to h = 60.
- Obsolete assertion: `expect(well.horizons[2].material).toBe(0)`.
- Measured audit row (`WORKFORCE_FLOWS`, well/alone, h = 60): `material 119`, `materialNet 0`, `population 2`, `employed 2`, `waterProd 2`, `foodProd 2`.
- Cause: the old `0` encoded pre-Phase-7 behaviour (the audit note: "staffing the Well and producing Material are mutually exclusive at population 1"). The Well now raises Water, population grows to 2, and under Step 10CQ **every employed colonist earns Material regardless of workplace** (Well +1, Farm +1) → 119. `materialNet 0` proves no Workshop is staffed, so the stock is pure workforce income, not Workshop production. This is an obsolete expectation (Case A), not a regression.

### Root cause of §7

`links Water -> crew -> earlier completion and measures the production start`

- Fixture: 1 residence, 1 Well, 1 colonist, material 25; place a Workshop, optionally crew it, run to `placementTick + 20`.
- Obsolete assertion: `expect(withCrew.materialAtHorizon).toBe(without.materialAtHorizon)`.
- Measured audit row (`CREW_PRODUCTION_CHAIN`): without → `37`, withCrew → `36`; `ticksToCompletion` 2 / 1; `ticksToFirstProduction` 2 / 2.
- Cause: a colonist assigned as construction crew is skipped by `creditMaterialIncome` (Step 10CQ, pinned by `materialIncomeMeasurement` / `constructionCrew`), so the crewed path forgoes one tick of income. The original equality encoded pre-Phase-7 behaviour ("the crew is Material-free"). Obsolete expectation (Case A), not a regression.

### Exact changes made (tests only)

- §6 audit rows now also record `materialProd` (`getMaterialProductionPerTick`) so the row separates Workshop production from income; the audit note was updated to state the Step 10CQ income contract.
- §6 assertions: `well.horizons[2].materialProd === 0` (no staffed Workshop) **and** `well.horizons[2].material === 119` (the measured Phase 7 income value), replacing `material === 0`. The `workshop.water >= 0` assertion is unchanged.
- §7 assertion: `withCrew.materialAtHorizon === without.materialAtHorizon - 1`, with the measured Phase 7 cause documented. The construction-tick and first-production-tick assertions are unchanged.
- No assertion was deleted or weakened: §6 replaces `0` with the exact measured value plus a stronger structural check (`materialProd === 0`); §7 replaces "identical" with the exact measured Material cost of crewing.

### Consistency with the frozen Phase 7 contract

- No `src/` change. Income rates (Farm +1, Well +1, Workshop +2), both expenditure paths, the affordability queries, the Step 10BJ protected-reserve release, tick ordering, determinism and persistence are all untouched.
- Only the two pre-Phase-7 audit expectations were re-baselined to the Step 10CQ income contract, per Case A. No new mechanic, no Phase 8 anything.

### Validation

- focused: `tests/waterConstructionWorkforcePressureAudit.test.ts` → **22/22 PASS** (was 20/22).
- full Vitest: **1790 passed / 0 failed (111 files)** — the baseline is green.
- typecheck: PASS
- lint: PASS
- production build: PASS
- `git diff --check`: clean

### Browser / GPU

Skipped, and intentionally so: 10CV changes no runtime, UI, rendering or persistence code (test-only diff). There is no player flow to exercise, so headed browser / responsive / GPU runs would only re-verify the unchanged `aee2389` build.

### SAVE_VERSION

Remains `8`. No persistence change; the audit's own architecture-invariant test (`§11`, including `SAVE_VERSION = 8` and the canonical hash) still passes.

### Final diff / scope audit

- Changed file: `tests/waterConstructionWorkforcePressureAudit.test.ts` (+23 / −4).
- `docs/roadmap/Step10CV.md` (this as-built), force-added because `docs/` is gitignored.
- `AGENTS.md` left untracked and untouched; no other worktree changes; no generated artifacts; no Phase 8 mechanic; no runtime/persistence change.

Commit: `Step 10CV: Repair Phase 7 Baseline`
