# NOVA — Step 19.4 E2E Contract Alignment

Date: 2026-09-16

## E2E failures investigated

The original GPU run reached all four scenarios but failed on obsolete expectations:

| Test | Old expectation | Current behavior | Decision |
| --- | --- | --- | --- |
| Loads application shell | `TICK 0` / `TICK 1` | Timeline exposes `YEAR 1 / DAY 01 · 0.0S · PAUSED`; tick is no longer the primary UI time readout. | Assertion aligned to the current timeline contract. |
| Places/selects/removes house | Empty city, then `BUILDINGS 1` and `0` | Initial settlement is intentional: `BUILDINGS 8 / ROADS 5`; placement still adds and removes one house. | Counts aligned to the current initial scenario. |
| Places/removes connected roads | Empty city, then `ROADS 2` and `1` | Initial settlement has 5 roads; two roads are added, then one is removed. | Counts aligned to the current initial scenario. |
| Rejects house on road | Empty city, then `BUILDINGS 0 / ROADS 1` | Initial settlement remains and the placed road makes `BUILDINGS 8 / ROADS 6`. | Count aligned while retaining occupied-cell rejection. |

The placement tests now probe only unobstructed canvas regions and find a genuinely valid cell, preserving their functional purpose without relying on the old empty-map assumption.

## Changes

- `tests/e2e/nova.spec.ts` — updated stale timeline/count expectations and robust placement coordinates.
- `playwright.gpu.config.ts` — retained as the dedicated hardware-WebGL configuration from Step19.3.
- `package.json` — retained `test:e2e:gpu`.
- `docs/qa/step19.4-e2e-contract-alignment.md` — this report.

No production behavior was changed.

## Validation

```text
pnpm test:e2e:gpu: 4 passed, 0 failed, 0 skipped, 0 timeout — 2.9s
pnpm typecheck: PASS
pnpm lint: PASS
pnpm test: PASS — 64 tests
pnpm build: PASS
```

## GPU status

```text
Renderer: ANGLE / NVIDIA GeForce RTX 3070 / Direct3D11
Hardware acceleration: confirmed
SwiftShader: not selected in GPU profile
Chromium stall: absent with --enable-gpu --ignore-gpu-blocklist
```

## Production impact

```text
Production code modified: NO
Production behavior intentionally changed: NO
```

## Final status

```text
PASS — E2E contract aligned
```
