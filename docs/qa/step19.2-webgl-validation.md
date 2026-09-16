# NOVA — Step 19.2 Browser & WebGL Validation

Date: 2026-09-16  
Project: `C:\Users\monority\Desktop\Nova`

## Environment

```text
OS: Windows
Node: v24.19.0
pnpm: 11.21.0
Playwright: 1.63.0
Chromium: Playwright bundled Chromium
Three.js: 0.186
GPU: NVIDIA GeForce RTX 3070
Driver: not available through the restricted WMI query
```

## Baseline

The exact command `pnpm test:e2e` was reproduced. It starts `vite preview --host 127.0.0.1`, then all four Chromium scenarios fail to complete before the 120-second command timeout. This reproduces the known browser/WebGL stall pattern.

## Tests

| Test | Result | Renderer | Notes |
| --- | --- | --- | --- |
| Chromium minimal WebGL — standard | PASS | SwiftShader | WebGL available, software renderer. |
| Chromium minimal WebGL — GPU enabled | PASS | NVIDIA RTX 3070 / D3D11 | Hardware renderer detected. |
| Chromium minimal WebGL — GPU disabled | PASS | SwiftShader | WebGL available, software renderer. |
| Chromium minimal WebGL — SwiftShader | PASS | SwiftShader | Explicit software path works. |
| NOVA renderer — GPU enabled | PASS | NVIDIA RTX 3070 / D3D11 | Canvas and WebGL context created successfully. |
| NOVA smoke — STEP | PASS | NVIDIA RTX 3070 / D3D11 | Page loaded and the STEP control executed. |
| NOVA full app — default Playwright config | FAIL | not collected | Existing E2E run stalls before scenarios complete. |
| Playwright default Chromium | FAIL | likely SwiftShader path | Reproduced with `pnpm test:e2e`; 4 scenarios timed out. |
| Playwright Chromium with GPU flags | PASS* | NVIDIA RTX 3070 / D3D11 | Minimal NOVA smoke succeeded with `--enable-gpu --ignore-gpu-blocklist`. |
| Windows browser | NOT TESTED | — | Edge was detected, but no product change or browser installation was performed. |

`*` This was a focused diagnostic smoke test, not a replacement run of the full E2E suite.

## WebGL diagnostic details

With standard Playwright Chromium, the minimal canvas reported:

```text
ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)
```

With `--enable-gpu --ignore-gpu-blocklist`, it reported:

```text
ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 (0x00002488) Direct3D11 vs_5_0 ps_5_0, D3D11)
```

The focused NOVA diagnostic with the hardware configuration loaded the application, created the canvas and WebGL context, and successfully executed STEP. One `ERR_NETWORK_ACCESS_DENIED` console message was observed, but it did not prevent rendering or the smoke interaction; it is likely an external resource request and is separate from the WebGL stall.

## Root cause

```text
PROBABLE: Playwright Chromium's default GPU selection / ANGLE configuration.
```

Evidence:

- standard Chromium selects SwiftShader;
- explicit GPU flags select the NVIDIA RTX 3070 hardware renderer;
- the same NOVA page initializes successfully with the hardware configuration;
- the default full E2E run still stalls and times out.

The exact reason the default launcher chooses the software path or stalls during the full suite is not confirmed.

## Workaround

Diagnostic configuration that worked:

```text
browser: Playwright Chromium
flags: --enable-gpu --ignore-gpu-blocklist
result: hardware WebGL renderer and successful NOVA smoke test
```

This configuration has not been installed into the project’s permanent Playwright config because Step19.2 is diagnostic and the full E2E suite was not rerun with a committed infrastructure change.

## Product impact

```text
PROBABLE ENVIRONMENT ISSUE
```

The NOVA renderer and Three.js initialization work when Chromium is explicitly directed to the available NVIDIA GPU. No renderer, camera, coordinate system, runtime or simulation code was modified.

## Next technical action

If a permanent E2E validation configuration is desired, run the complete suite with the tested GPU flags in a controlled CI/local configuration and confirm all scenarios, then document that infrastructure-only change separately. A Windows Edge comparison may further distinguish bundled Chromium behavior from the system browser.

## Production changes

None. Only temporary diagnostic scripts were created, executed and removed. NOVA production code was not changed during this step.
