# NOVA — Step 19.1 Playtest & Product QA

Date: 2026-09-16  
Version: workspace state after Step 19  
Report status: QA partially blocked by the known Chromium/WebGL environment issue

## Executive summary

The application build and automated domain/UI-adjacent checks remain healthy. The existing Playwright Chromium run was attempted against the current product, but all four browser scenarios stalled during preview/browser execution and timed out. This prevents reliable visual confirmation of the strict top-down camera, construction previews, event-feed interaction, and perceived performance. No production code was modified during this QA phase. The main actionable result is environmental: Chromium/WebGL must work before a trustworthy visual playtest can be completed.

## Environment

- OS: Windows
- Working directory: `C:\Users\monority\Desktop\Nova`
- Browser: Playwright Chromium
- Launch command: `pnpm test:e2e`
- Web server: `vite preview --host 127.0.0.1`
- Result: command timeout after 120 seconds; all 4 scenarios failed to complete
- WebGL status: known GPU/WebGL stall reproduced

## Functional QA

| Area | Result | Issue |
| --- | --- | --- |
| Camera | BLOCKED | Browser stall prevents visual confirmation of strict top-down alignment. |
| Construction | BLOCKED | Existing house, road and invalid-placement browser scenarios do not complete. |
| Roads | BLOCKED | Browser interaction cannot be observed; domain tests remain green. |
| Zones | BLOCKED | No reliable browser session available for manual zone playtest. |
| Simulation | BLOCKED | Cannot observe long-running simulation in Chromium. |
| Population | PASS* | Covered by existing unit tests; not visually observed in browser. |
| Economy | PASS* | Covered by existing unit tests; not visually observed in browser. |
| Densification | PASS* | Covered by morphology/unit coverage; not visually observed in browser. |
| Inspection | BLOCKED | Browser cannot be used to verify rendered selection flow. |
| Event feed | BLOCKED | Browser cannot be used to verify event appearance, grouping or click navigation. |
| Timeline | BLOCKED | Browser cannot be used to verify visual readability. |
| Reset | BLOCKED | Browser scenarios do not reach reliable completion. |

`*` PASS means automated non-browser coverage passed; it is not a substitute for visual playtesting.

## Browser evidence

The current E2E run reported four failed scenarios:

1. loads the NOVA application shell;
2. places, selects and removes a house;
3. places connected roads and removes a selected road;
4. rejects a house placement on a road.

The command ended with exit code `124` after the 120-second timeout. The failure pattern matches the previously documented Chromium/WebGL GPU stall. This is recorded as an environment limitation, not as proof of an application regression.

## UX observations

### P2 — Browser playtest unavailable

```text
Severity: P2
Area: QA environment / browser validation
Reproduction: Run pnpm test:e2e
Observed: Chromium scenarios stall and do not complete within 120 seconds.
Expected: A usable browser session showing NOVA and allowing interaction.
Impact: Visual, UX, camera, construction and feedback validation cannot be confirmed.
Evidence: Playwright run timed out; 4/4 scenarios failed to complete.
```

No additional product UX issue is declared because the browser session did not provide trustworthy visual evidence.

## Visual observations

- Camera: not verifiable in this environment.
- Terrain: not verifiable in this environment.
- Buildings: not verifiable in this environment.
- Roads: not verifiable in this environment.
- Zones: not verifiable in this environment.
- UI: not verifiable in this environment.
- Density and overall coherence: not verifiable in this environment.

The intended visual criteria remain strict top-down, dark, architectural and minimal; they require a functioning WebGL browser session for confirmation.

## Simulation observations

Automated coverage confirms the deterministic simulation and urban morphology paths remain covered. A real-time observation of clustering, road extension, densification, food and population progression was not possible because the browser stalled before a usable playtest.

## Performance

No valid FPS or interaction-performance measurement was collected. The observed browser timeout is attributed to the known GPU/WebGL stall and must not be interpreted as a NOVA simulation performance measurement.

## Determinism

The deterministic simulation and event projection are covered by unit tests. Two complete equivalent browser runs could not be performed because Chromium did not reach a stable interactive state.

## Recommended next actions

### P0

- None identified from the available evidence.

### P1

- None identified from the available evidence.

### P2

- Re-run the complete playtest in an environment where Chromium/WebGL renders reliably.
- Then verify the event feed click-to-inspection path, zone lifecycle and long-running simulation visually.

### P3

- None identified from the available evidence.

## QA scope note

No production code was modified before or during this report. This document intentionally records the limitation rather than changing the renderer or disabling WebGL to force the E2E run through.
