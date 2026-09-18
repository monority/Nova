# NOVA — Step 2 — Interactive Simulation & Real Browser Verification

## Context

Step 0 and Step 1 are COMPLETE.

Step 1 established the first vertical slice:

```text
SimulationState
    ↓
RenderSnapshot
    ↓
Three.js renderer
    ↓
pointer interaction
    ↓
dispatchCommand()
    ↓
stepSimulation()
    ↓
new state
    ↓
new snapshot
    ↓
renderer update
```

Current verification includes:

* strict TypeScript
* ESLint
* Vitest
* deterministic simulation
* Three.js renderer
* browser application
* PLAY / PAUSE / STEP
* placement preview
* building rendering
* colonist rendering
* 45 passing tests
* browser load verification
* WebGL initialization verification

However, Step 1 could NOT fully automate real pointer interaction because the available browser inspection tool was limited.

Therefore Step 2 has an explicit goal:

> Make the current interactive loop genuinely browser-testable and verify it through a real browser whenever the environment allows it.

---

# Critical rule — Browser verification

For every behavior that depends on:

* DOM interaction
* pointer events
* mouse position
* clicks
* buttons
* keyboard input
* canvas interaction
* WebGL initialization
* visual state changes

you MUST attempt verification in a real browser.

Do not consider unit tests alone equivalent to browser verification.

The verification hierarchy is:

```text
1. Real browser interaction
2. Browser DOM/state inspection
3. Integration tests
4. Unit tests
5. Static/code inspection
```

Use the highest level actually available.

---

# Step 0 — Audit browser capabilities FIRST

Before modifying application code:

1. inspect the repository
2. inspect package scripts
3. inspect installed browser tooling
4. inspect Playwright configuration
5. inspect any existing browser automation utilities
6. inspect whether a Chromium/Chrome/Edge executable is available
7. inspect whether the current environment permits:

   * navigation
   * mouse movement
   * clicks
   * keyboard input
   * screenshots
   * DOM evaluation
   * multiple browser actions in a single session

Do not assume the browser tool is incapable of interaction.

Try to establish the strongest available browser automation path.

If Playwright can be used directly, prefer a real Playwright E2E test over one-shot inspection.

If another browser automation mechanism exists, use it where appropriate.

Do NOT install large unrelated dependencies merely to obtain browser automation.

---

# Step 1 — Establish a reproducible browser test

Create a minimal reproducible browser scenario for NOVA.

The preferred test should be equivalent to:

```text
launch browser
    ↓
open NOVA
    ↓
wait for application readiness
    ↓
verify canvas exists
    ↓
verify Three.js renderer initialized
    ↓
verify initial Tick = 0
    ↓
select Residence
    ↓
move pointer over valid grid cell
    ↓
verify valid placement state
    ↓
click
    ↓
verify building count increased
    ↓
verify building is under construction
    ↓
STEP
    ↓
verify tick advanced
    ↓
verify building still under construction
    ↓
STEP
    ↓
verify building operational
    ↓
verify colonist exists
```

The exact selectors/API should follow the actual application.

Do not fabricate selectors.

---

# Step 2 — Make the application testable

If browser automation cannot reliably interact with the current UI, make the smallest changes required to expose stable test hooks.

Prefer semantic selectors:

```html
data-testid="nova-canvas"
data-testid="build-residence"
data-testid="simulation-step"
data-testid="simulation-play"
data-testid="simulation-pause"
```

Only add test IDs where they provide stable interaction points.

Do not pollute the UI with unnecessary testing hooks.

For simulation state, expose observable UI information where appropriate:

```text
Tick
Buildings
Operational
Colonists
```

Existing diagnostic UI may be reused.

---

# Step 3 — Test real canvas interaction

The important test is NOT merely:

```text
controller.dispatch(...)
```

The browser test must attempt:

```text
mouse move
    ↓
canvas picking
    ↓
placement preview
    ↓
mouse click
    ↓
application command
```

If the canvas coordinate system makes this difficult to test deterministically, establish a stable test viewport and deterministic camera/world configuration.

Do not bypass the pointer interaction unless the environment genuinely cannot automate it.

If it cannot be automated, report the exact limitation.

---

# Step 4 — Browser assertions

Verify observable behavior at each important transition.

At minimum:

### Initial

```text
Tick = 0
Buildings = 0
Colonists = 0
```

### After placement

```text
Buildings = 1
Operational = 0
```

### After first simulation tick

```text
Tick = 1
Building = underConstruction
```

### After second simulation tick

```text
Tick = 2
Building = operational
Colonists = 1
```

The exact UI representation should follow the existing implementation.

Do not duplicate domain logic inside the E2E test.

The test should observe behavior, not reimplement the simulation.

---

# Step 5 — Screenshot verification

If the browser environment supports screenshots:

capture at least:

1. initial world
2. placement preview
3. building under construction
4. operational building + colonist

Use screenshots to verify that the visual result corresponds to the application state.

Do not claim pixel-perfect visual verification unless actual screenshots were inspected.

If screenshots are unavailable, explicitly report:

```text
Visual screenshot verification: NOT AVAILABLE
```

Do not substitute DOM verification and call it pixel verification.

---

# Step 6 — WebGL verification

Verify:

* canvas exists
* WebGL renderer initializes
* Three.js renderer is active
* scene renders without runtime errors

Inspect browser console errors.

If possible, inspect the renderer identity.

Do NOT claim hardware GPU acceleration unless the environment actually proves it.

If the browser uses SwiftShader/headless rendering, report:

```text
WebGL: PASS
GPU hardware acceleration: NOT VERIFIED
```

Do not confuse WebGL initialization with GPU validation.

---

# Step 7 — Fix actual interaction bugs

If browser testing reveals issues such as:

* pointer coordinates incorrect
* canvas offset incorrect
* DPR problems
* resize problems
* placement preview mismatch
* click not reaching canvas
* UI intercepting pointer events
* stale snapshot
* renderer not updating
* building appearing one frame late
* STEP not updating UI
* colonist not appearing

fix them before declaring COMPLETE.

Prefer root-cause fixes.

Do not weaken tests to accommodate broken behavior.

---

# Step 8 — Preserve architecture

Do NOT move simulation logic into UI.

The intended flow remains:

```text
Browser event
    ↓
UI/controller
    ↓
dispatchCommand
    ↓
stepSimulation
    ↓
SimulationState
    ↓
toRenderSnapshot
    ↓
renderer
```

The domain remains independent from:

* DOM
* React
* Three.js
* browser
* WebGL
* wall-clock time

---

# Step 9 — Do not expand simulation yet

Do NOT implement:

* economy
* needs
* roads
* transport
* zones
* technology
* services
* production
* advanced pathfinding
* procedural generation
* complex assets
* audio
* postprocessing
* advanced shaders

Step 2 is about making the existing simulation loop robust and observable.

---

# Step 10 — Tests

Run all existing tests.

Add browser E2E tests where the environment permits.

Required verification:

```text
npm run lint
npm run typecheck
npm test
npm run build
```

And, if available:

```text
npm run test:e2e
```

The browser test MUST launch the actual built/served NOVA application rather than testing isolated components.

Prefer testing against the production-like Vite preview/build output when practical.

---

# Step 11 — Failure reporting rules

This is important.

Never report COMPLETE merely because unit tests pass if browser behavior was not tested.

Use explicit statuses:

### COMPLETE

Only when all required behavior was successfully verified.

### PARTIAL

When implementation works but one or more verification layers could not be executed.

### BLOCKED

When an external/environment limitation prevents meaningful completion.

For every unverified item state:

```text
Not verified:
- exact reason
- attempted method
- what was verified instead
```

Do not hide limitations.

Do not replace missing browser interaction with a claim that equivalent unit tests "prove" browser behavior.

---

# Step 12 — Final report

Use this structure:

## Status

COMPLETE / PARTIAL / BLOCKED

## Browser capability audit

Report exactly what browser automation is available:

* navigation
* DOM inspection
* mouse
* click
* keyboard
* screenshots
* console
* WebGL inspection

## Implementation

List actual changes.

## Architecture

Show the final data/control flow.

## Browser E2E

Report the exact scenario executed:

```text
load
→ select
→ hover
→ click
→ placement
→ STEP
→ STEP
→ operational
→ colonist
```

For every step say PASS / FAIL / NOT EXECUTED.

## Screenshots

List which screenshots were actually captured and inspected.

## WebGL

Report:

* renderer initialization
* browser engine
* WebGL status
* GPU acceleration status if actually verified

## Tests

Report exact numbers.

## Verification

Report:

* lint
* typecheck
* unit/integration
* build
* E2E
* browser interaction
* screenshot/visual
* architecture/circular dependency

## Not verified

Be explicit.

## Deferred work

List intentionally deferred systems.

## Recommendation for Step 3

Base the recommendation on what was actually verified.

Do not blindly follow the original roadmap if browser testing reveals a more important technical issue.

