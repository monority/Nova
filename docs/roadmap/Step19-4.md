# NOVA — Step 19.4 E2E Contract Alignment

## Context

NOVA project:

```text
C:\Users\monority\Desktop\Nova
```

Step 19.3 is complete.

The GPU Playwright configuration is now isolated in:

```text
playwright.gpu.config.ts
```

with:

```text
pnpm test:e2e:gpu
```

The GPU configuration uses:

```text
--enable-gpu
--ignore-gpu-blocklist
```

and successfully produces:

```text
NVIDIA GeForce RTX 3070
ANGLE / D3D11
```

The previous Chromium stall is no longer present.

The complete E2E suite now reaches its assertions.

However, 4 E2E tests fail because they contain historical expectations such as:

```text
TICK 0
empty city
```

Other validation remains healthy:

* typecheck PASS
* lint PASS
* 64 unit tests PASS
* build PASS
* WebGL hardware initialization PASS
* GPU Playwright startup PASS

No production code or existing E2E tests were modified during Step 19.3.

---

# Objective

Bring the existing E2E assertions into alignment with the current NOVA product contract.

This is a test-contract investigation and correction step.

Do not change production behavior merely to satisfy obsolete tests.

---

# Step 1 — Identify all failing tests

Run:

```bash
pnpm test:e2e:gpu
```

Capture the exact 4 failures.

For each failure record:

* test file;
* test name;
* failing assertion;
* expected value;
* actual value;
* relevant DOM/UI state;
* relevant application state if observable.

Do not modify anything yet.

---

# Step 2 — Trace the origin of the expectations

For each obsolete expectation, determine where the expected behavior came from.

Investigate:

* current application implementation;
* current domain model;
* current UI state;
* previous implementation/history if available locally;
* related unit tests;
* existing documentation/specifications;
* recent NOVA milestones.

Specifically investigate:

```text
TICK 0
```

and:

```text
empty city
```

Determine whether these represent:

1. an intentionally preserved product invariant;
2. an old test assumption;
3. behavior changed by a previous milestone;
4. a genuine regression.

Do not assume the test is wrong simply because the application differs.

---

# Step 3 — Establish the current product contract

For each failing assertion, document:

```text
Current intended behavior:
Evidence:
Current implementation:
Existing test coverage:
```

Use the strongest available evidence.

Prefer:

1. explicit current product/domain contract;
2. current architecture and behavior;
3. recent milestone decisions;
4. existing unit/integration tests;
5. historical assumptions.

Avoid deriving a contract solely from what the browser happens to render.

---

# Step 4 — Correct only obsolete assertions

If an assertion is demonstrably obsolete:

* update the E2E assertion to reflect the current contract;
* preserve the purpose of the test;
* do not weaken the assertion;
* do not replace deterministic assertions with arbitrary snapshots;
* do not remove coverage;
* do not simply assert "element exists" where a meaningful state can be asserted.

Examples:

Bad:

```ts
expect(text).toBeTruthy()
```

Bad:

```ts
expect(page.locator(...)).toBeVisible()
```

when the test previously validated a meaningful application state.

Prefer assertions against the actual current invariant.

---

# Step 5 — Investigate "TICK 0"

Treat this as a potentially meaningful simulation contract.

Determine:

* what `TICK` represents;
* when the simulation clock starts;
* whether initialization intentionally advances the clock;
* whether the current expected value is deterministic;
* whether browser initialization can affect it;
* whether the test should assert the initial state or the post-initialization state.

Do not reset the simulation merely to satisfy the test.

If the current contract intentionally starts at another tick/time, update the test to assert that contract.

If the application is supposed to start at tick 0 and currently does not, report this as a product regression rather than modifying the test.

---

# Step 6 — Investigate "city empty"

Determine what the city representation currently means.

Check:

* initial city population;
* generated structures;
* procedural initialization;
* rendering vs domain state;
* whether "empty" refers to DOM elements, data, or visual objects;
* whether the city is expected to be populated immediately or after an interaction.

Do not change city generation/rendering to satisfy the old assertion.

If the current product intentionally contains generated city content, update the E2E contract accordingly.

If the product contract still requires an empty initial city, report the implementation discrepancy.

---

# Step 7 — Keep GPU configuration separate

Do not move GPU flags into production application code.

Keep:

```text
playwright.gpu.config.ts
```

as the explicit hardware-WebGL validation configuration.

Keep:

```text
pnpm test:e2e
```

unchanged unless there is a compelling repository-level reason to alter it.

The standard configuration should remain useful for environments where hardware GPU access is unavailable.

---

# Step 8 — Validation

After correcting only demonstrably obsolete assertions, run:

```bash
pnpm test:e2e:gpu
```

Then run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Confirm:

* all GPU E2E tests pass;
* no unit tests regress;
* no type errors;
* no lint errors;
* production build succeeds.

If one or more E2E tests still fail because the product behavior itself contradicts the current contract, STOP and report the discrepancy rather than weakening the test.

---

# Step 9 — Do not over-fix

This step must NOT become a general E2E refactor.

Do not:

* rewrite the entire Playwright suite;
* introduce new testing frameworks;
* change browser engines;
* change Three.js;
* change WebGL initialization;
* alter simulation behavior;
* alter city generation;
* increase arbitrary timeouts;
* add sleeps;
* use retries to hide failures;
* remove failing scenarios;
* replace meaningful assertions with weak existence checks.

Only align assertions that are proven to be stale.

---

# Final report

Return:

## E2E failures investigated

List all 4 original failures.

For each:

```text
Test:
Old expectation:
Current behavior:
Evidence:
Decision:
```

## Changes

List every modified file.

For each changed E2E assertion, explain why it was obsolete.

## Validation

```text
pnpm test:e2e:gpu:
pnpm typecheck:
pnpm lint:
pnpm test:
pnpm build:
```

## GPU status

Confirm:

```text
Renderer:
Hardware acceleration:
SwiftShader:
Chromium stall:
```

## Production impact

Explicitly state:

```text
Production code modified: YES/NO
Production behavior intentionally changed: YES/NO
```

## Final status

Use exactly one:

```text
PASS — E2E contract aligned
```

or:

```text
PARTIAL — remaining failure represents a product/contract discrepancy
```

Do not claim PASS if any failing assertion was merely weakened or removed.
