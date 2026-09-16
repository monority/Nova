# NOVA — Step 19.3 GPU E2E Validation

## Context

Project:

```text
C:\Users\monority\Desktop\Nova
```

Environment:

```text
Windows
Node v24.19.0
pnpm 11.21.0
Playwright 1.63.0
Three.js 0.186
GPU: NVIDIA GeForce RTX 3070
```

Step 19.2 established the following:

* NOVA WebGL initialization works correctly with hardware acceleration.
* Playwright's default bundled Chromium selects SwiftShader.
* The default full E2E suite stalls/timeouts.
* Chromium with:

  * `--enable-gpu`
  * `--ignore-gpu-blocklist`
    successfully detects the NVIDIA RTX 3070 through ANGLE/D3D11.
* A focused NOVA smoke test with those flags successfully:

  * loaded the application;
  * created the WebGL context;
  * rendered NOVA;
  * executed the STEP interaction.
* No NOVA production code was modified during Step 19.2.

## Objective

Validate the complete NOVA E2E suite using the known-working hardware WebGL Chromium configuration.

This is an infrastructure/validation step only.

Do NOT modify NOVA renderer, Three.js, camera, simulation, coordinate systems, domain logic, or UI behavior to work around Playwright.

---

## Step 1 — Inspect current Playwright setup

Inspect:

* `playwright.config.*`
* existing E2E tests
* package scripts
* Vite preview configuration
* any existing browser launch configuration

Determine the smallest clean way to provide a GPU-enabled Playwright configuration.

Prefer an explicit configuration/profile over globally modifying unrelated tooling.

---

## Step 2 — Add controlled GPU configuration

Create the smallest maintainable Playwright configuration necessary to run Chromium with:

```text
--enable-gpu
--ignore-gpu-blocklist
```

Requirements:

* Keep the existing default configuration intact unless there is a strong reason not to.
* Prefer a dedicated GPU validation configuration or project.
* Do not hard-code machine-specific paths.
* Do not require Edge.
* Do not add unnecessary dependencies.
* Do not change application runtime behavior.
* Do not disable WebGL.
* Do not replace Chromium.

The configuration should make it obvious that this is a local/CI hardware-WebGL validation mode.

If the repository already has a clean configuration mechanism for environment-specific Playwright options, use it instead of introducing a parallel configuration.

---

## Step 3 — Add/retain renderer diagnostics

Before running the complete suite, identify whether an existing diagnostic helper can expose:

```text
UNMASKED_VENDOR_WEBGL
UNMASKED_RENDERER_WEBGL
```

If necessary, add a small test-only diagnostic assertion.

The GPU configuration should report something equivalent to:

```text
ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 ... Direct3D11 ...)
```

Do not assert the exact GPU model unless the existing test architecture specifically requires it.

The important invariant is:

```text
hardware renderer != SwiftShader
```

Avoid making production code aware of this test.

---

## Step 4 — Run the complete E2E suite

Run the exact equivalent of the existing:

```bash
pnpm test:e2e
```

but using the GPU-enabled Playwright configuration.

Do not stop after the smoke test.

Run the complete suite.

Record:

* total tests;
* passed;
* failed;
* skipped;
* timed out;
* first failing scenario;
* browser console errors;
* WebGL renderer when relevant.

---

## Step 5 — Failure isolation

If the complete suite passes:

Stop.

Do not make further product changes.

If the complete suite still stalls/fails:

1. identify the first scenario that does not complete;
2. determine whether it reaches the application;
3. determine whether WebGL initializes;
4. determine whether the failure is:

   * browser startup;
   * Vite preview;
   * WebGL initialization;
   * application runtime;
   * test synchronization;
   * external resource/network access;
   * test-specific behavior.

Do NOT immediately modify NOVA code.

Only change infrastructure/test code when the evidence points to an infrastructure/test problem.

---

## Step 6 — Network error handling

Step 19.2 observed:

```text
ERR_NETWORK_ACCESS_DENIED
```

Do not suppress this globally without identifying its source.

Determine whether it comes from:

* an application external resource;
* browser infrastructure;
* analytics;
* font;
* texture/resource;
* unrelated third-party request.

If it does not affect the application or test result, document it rather than changing product code.

If an E2E test genuinely depends on an external network resource, prefer deterministic mocking/local fixtures over allowing the test to depend on external availability.

Do not make unrelated network changes during this step.

---

## Step 7 — Production boundary

Strictly preserve:

```text
src/
production application behavior
Three.js renderer
WebGL shaders
camera
simulation
domain
UI
```

unless a test demonstrates an actual product defect independent of Playwright.

The goal is to validate the existing implementation, not redesign it.

---

## Step 8 — Final report

Produce a concise report with:

### Configuration

```text
Default Playwright: ...
GPU Playwright: ...
GPU flags: ...
```

### Results

```text
Total:
Passed:
Failed:
Skipped:
Timeouts:
```

### WebGL

```text
Vendor:
Renderer:
Hardware acceleration:
SwiftShader:
```

### Conclusion

Choose exactly one:

```text
PASS — complete E2E suite validated with hardware WebGL
```

or

```text
PARTIAL — GPU WebGL works, but one or more E2E scenarios remain blocked
```

or

```text
BLOCKED — GPU-enabled Chromium itself cannot execute the suite reliably
```

Explain the evidence.

### Production changes

Explicitly state whether any production files were modified.

---

## Constraints

* No speculative renderer changes.
* No Three.js changes.
* No visual redesign.
* No simulation changes.
* No dependency upgrades.
* No browser replacement.
* No permanent machine-specific hacks.
* No suppression of failing tests.
* No increasing timeouts merely to hide the problem.
* No weakening assertions.
* No modifying tests simply to make them pass.

This step is successful only if the E2E environment is validated honestly.

At the end, provide:

1. files changed;
2. commands executed;
3. complete test result;
4. WebGL renderer result;
5. whether production code changed;
6. recommendation for the next NOVA product step.
