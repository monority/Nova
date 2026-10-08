# NOVA — Current Task

## Objective

Finalize Step002-money-suite-green: full E2E reconciliation, full validation,
clean committable state.

## Scope

- Migrate the 11 E2E scripts still asserting the pre-money UI contract.
- Keep the D1 economic finding documented and deferred (no recalibration).

## Non-Goals

- No economic tuning (D1 explicitly deferred).
- No new gameplay, no refactors beyond the test/E2E migration.

## Acceptance Criteria

- [x] `npx tsc --noEmit` clean
- [x] `npx eslint .` clean
- [x] `npx vitest run` green (1877/1877)
- [x] `npm run build` succeeds
- [x] Full E2E: 27/27 scripts, 336/336 checks, 0 failed / 0 skipped
- [x] STATE.md / Step002 report / audit report consistent with evidence
- [x] D1 documented + deferred

## Validation

- [x] Typecheck / lint / unit / build / full E2E executed 2026-10-08

## Status

- [x] Inspect
- [x] Implement
- [x] Test
- [x] Validate
- [x] Review
- [x] Report

## Next decisions (not this step)

- D1: income/expense balance (does a Workshop-carrying colony bleed by design?).
- Day-0 setup and prices (Step001 D1 remainder).
