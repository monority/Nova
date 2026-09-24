# NOVA — Step 10CC — Production Ratio Timeout Resolution

## Baseline

* Previous commit: `bbd914a`
* Previous step: `Step 10CB — Full Repository Cleanup, Performance & Refactor Audit`
* Known validation state:

  * Cleanup audit: 4/4
  * Relevant compatibility: 61/61
  * Typecheck: PASS
  * Lint: PASS
  * Build: PASS
  * Full Vitest: 1,706/1,707
  * Known failure: `productionRatioTuningAudit.test.ts` timeout
  * Browser/GPU were not rerun because 10CB made no runtime/UI/rendering changes.

---

# Objective

Resolve and explain the remaining `productionRatioTuningAudit.test.ts` timeout.

This is a **targeted verification/correctness step**.

The purpose is to determine whether the timeout is:

1. a pre-existing flaky test;
2. an unnecessarily slow test;
3. a test isolation/concurrency problem;
4. a genuine performance regression;
5. an actual production-code infinite loop / pathological execution;
6. or another concrete issue.

Then make the **smallest justified correction**.

The final repository should have a fully green test suite unless a genuine external/environmental limitation makes that impossible.

---

# 1. Absolute scope

Do NOT:

* add gameplay;
* change resource coefficients;
* change production rules;
* change workforce behavior;
* change progression;
* change roads/accessibility;
* change persistence;
* change hashing semantics;
* change tick order;
* add resources;
* add buildings;
* add commands;
* add UI;
* perform another repository-wide cleanup;
* perform broad refactoring;
* upgrade dependencies;
* change Vitest configuration globally just to hide the timeout;
* increase a timeout arbitrarily without understanding the cause.

Only change production code if the investigation proves that a concrete production-code issue is responsible.

Only change test code if the test itself is unnecessarily slow/flaky or incorrect.

---

# 2. Reproduce first

Before modifying anything, run the failing test in isolation.

Identify the exact command used by the repository.

Run the test:

* once;
* multiple consecutive times;
* with the relevant test file only;
* with the relevant test name if supported.

Record:

* execution time;
* whether it passes/fails;
* whether the timeout is deterministic;
* exact timeout location;
* stack trace.

Then run the relevant surrounding test group.

Do not make any code change before this diagnosis.

---

# 3. Inspect the failing test

Read:

`tests/productionRatioTuningAudit.test.ts`

Determine:

* what the test is actually measuring;
* what fixtures it creates;
* how many ticks/simulations it runs;
* whether it intentionally performs a long simulation;
* whether it invokes expensive hashing;
* whether it repeatedly serializes state;
* whether it creates unnecessarily large worlds;
* whether it waits for asynchronous work;
* whether it depends on global state;
* whether it assumes a specific test timeout;
* whether it contains loops whose termination depends on simulation state.

Identify the exact operation where execution becomes slow or hangs.

---

# 4. Inspect the production path

Trace the test into the actual production implementation.

Determine whether the test exercises:

* simulation tick;
* production ratio;
* resource production;
* workforce queries;
* derived queries;
* hashing;
* save/load;
* scenario generation;
* road/accessibility;
* progression;
* rendering-independent simulation code.

Measure or reason about complexity.

Look specifically for:

* accidental O(n²)/O(n³) behavior;
* repeated full-world scans;
* repeated sorting;
* repeated allocations;
* infinite/repeating loops;
* recursive calls;
* retry loops;
* pathological fixture size;
* accidental simulation of far more ticks than intended.

Do not optimize unrelated code.

---

# 5. Compare isolated vs full-suite behavior

Determine whether:

```text
productionRatioTuningAudit.test.ts
```

behaves differently when:

1. run alone;
2. run with its test file;
3. run with relevant simulation tests;
4. run as part of the full Vitest suite.

If it only fails in the full suite, investigate:

* shared mutable state;
* global mocks;
* fake timers;
* worker/thread behavior;
* leaked resources;
* module state;
* test order dependence;
* environment configuration.

Do not simply disable parallelism globally.

---

# 6. Check test history/context

Inspect:

* `git log` for the test;
* recent changes touching the test;
* recent changes touching the production path;
* the 10CB diff;
* the baseline before 10CB if useful.

Determine whether the timeout:

* predates 10CB;
* appeared during 10CB;
* was made worse by 10CB;
* is unrelated to 10CB.

Do not assume the previous agent's statement that it was pre-existing is sufficient evidence.

---

# 7. Determine root cause

Classify the result explicitly.

### Case A — Test is genuinely too expensive

Example:

The test performs an unnecessarily large deterministic simulation.

Fix the fixture/test to measure the same behavior with the smallest representative scenario.

Do not weaken the assertion.

### Case B — Test has an accidental infinite/pathological loop

Fix the smallest production or test defect responsible.

Add a regression assertion if useful.

### Case C — Production performance regression

Identify the concrete regression.

Fix it with the smallest behavior-preserving optimization.

Prove that:

* outputs remain identical;
* hashes remain identical where applicable;
* simulation semantics remain unchanged.

### Case D — Test isolation problem

Fix test isolation.

Do not globally serialize the entire test suite unless there is a concrete architectural reason.

### Case E — Legitimate long-running test

If the test is intentionally expensive and correct, determine whether it should remain that way.

Do not arbitrarily increase timeout values.

If a timeout adjustment is genuinely justified, document why the execution time is intentional and stable.

### Case F — Flaky timing/environment issue

Reproduce sufficiently to establish the behavior.

Do not hide flakiness with an excessive timeout.

If it cannot be reliably resolved without changing unrelated infrastructure, document the exact limitation.

---

# 8. Behavior-preservation proof

After the fix, specifically verify the behavior measured by `productionRatioTuningAudit.test.ts`.

Do not merely make the test finish.

Compare relevant outputs before/after where practical:

* production ratios;
* resource production;
* resource stocks;
* workforce;
* progression;
* deterministic hashes.

No gameplay coefficient may change as a side effect.

---

# 9. Regression tests

If the root cause was a real bug:

Add a focused regression test.

The test must fail under the old behavior and pass under the corrected behavior.

If the root cause was purely a test inefficiency:

Keep the corrected test focused on the same contract.

Do not add speculative performance benchmarks unless they provide concrete protection against the diagnosed regression.

---

# 10. Full validation

Run:

### Focused

* `productionRatioTuningAudit.test.ts`
* all directly related simulation tests.

### Full

* full Vitest;
* TypeScript typecheck;
* ESLint;
* production build.

Expected:

```text
Full Vitest: all tests passing
```

If any other test fails, investigate it rather than ignoring it.

Also run:

```text
git diff --check
```

---

# 11. Browser/GPU

Do not automatically rerun browser/GPU merely for the sake of numbers.

However:

If production code affecting runtime simulation/render synchronization was modified, run the appropriate headed browser regression and GPU/WebGL2 test.

If only a test fixture or test implementation changed, browser/GPU validation is not required.

Report the reason explicitly.

---

# 12. Diff audit

Before committing, inspect:

```text
git status
git diff
git diff --check
git diff --stat
```

The diff must be minimal.

Reject unrelated cleanup.

Reject formatting churn.

Reject dependency changes unless strictly necessary.

Reject generated artifacts.

Verify:

* user-owned `docs/roadmap/Step10BO - Copy.md` untouched;
* user-owned `docs/roadmap/Step10BT.md` untouched;
* no unrelated files staged.

---

# 13. Documentation

Create:

`docs/roadmap/STEP10CC.md`

Document:

## Root cause

What actually caused the timeout.

## Reproduction

Exact commands/results before the fix.

## Diagnosis

Why it occurred.

## Fix

Exactly what changed.

## Behavior preservation

What proves simulation behavior did not change.

## Validation

Exact final results.

## Browser/GPU

State whether they were run and why.

## Scope

Explicitly state:

> No gameplay functionality was added.

And:

> This step only resolves the production-ratio audit timeout and its directly related test/runtime issue.

---

# 14. Commit

If a code/test fix is required, commit exactly:

`Step 10CC: Resolve Production Ratio Audit Timeout`

Do not amend `bbd914a`.

If investigation proves the timeout is a legitimate existing environment limitation and no repository change is justified, do NOT create an empty commit. Instead report the diagnosis clearly.

---

# 15. Final report

Return:

* root cause;
* whether it was pre-existing;
* exact reproduction result before fix;
* exact fix;
* files changed;
* focused test result;
* full Vitest result;
* typecheck;
* lint;
* build;
* browser/GPU status and reason;
* diff status;
* commit hash if a commit was created;
* explicit confirmation:

> No gameplay functionality was added.

The most important requirement is:

**Do not make the test green by hiding the problem. Determine why it timed out first.**

---

# Documentation (as-built)

## Root cause

`productionRatioTuningAudit.test.ts` was not infinite or stuck. The Town candidate gate intentionally builds several deterministic rate configurations and runs 600-tick shadow simulations for each. The test file repeatedly completed in roughly 22–29 seconds, exceeding Vitest’s default 5-second per-test timeout. The failure was therefore an intentionally expensive audit test using the default timeout, not a production regression or shared-state leak.

## Reproduction

Before the fix, isolated runs were intermittent:

- run 1: 1 failed / 19 passed, timeout at `tests/productionRatioTuningAudit.test.ts:1235`;
- run 2: 20 passed, 22.62 seconds;
- run 3: 1 failed / 19 passed, timeout at the same test.

The full suite reproduced the same timeout under load. The test had no asynchronous wait, infinite loop, global mutable fixture, or production-path failure.

## Fix

Added an explicit 30-second timeout to the single intentionally expensive Town candidate gate test. No global Vitest timeout, production constant, simulation rule, dependency, or runtime behavior changed.

After the fix, three consecutive isolated runs passed 20/20 in 29.10s, 21.97s, and 25.45s.

## Behavior preservation

The test’s existing rate matrix, production outputs, workforce allocations, progression outcomes, and scenario replay assertions remain unchanged. The fix changes only the test’s maximum allowed duration.

## Validation

- focused production-ratio test: 20/20 PASS;
- full Vitest: 1,707 / 1,707 PASS;
- typecheck: PASS;
- lint: PASS;
- build: PASS;
- `git diff --check`: PASS;
- browser/GPU: not rerun; only a test timeout changed.

## Scope confirmation

No gameplay functionality was added. This step only resolves the production-ratio audit timeout and its directly related test/runtime issue.

## Files changed

- `docs/roadmap/Step10CC.md`
- `tests/productionRatioTuningAudit.test.ts`

## Commit

`b5b1d76` — Step 10CC: Resolve Production Ratio Audit Timeout

