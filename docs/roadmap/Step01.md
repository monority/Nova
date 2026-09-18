# NOVA — Step 1 — Renderer Foundation & Vertical Slice

## Context

Step 0 is COMPLETE.

The repository is a greenfield deterministic simulation core with:

* strict TypeScript
* ESLint
* Vitest
* deterministic `SimulationState`
* pure `stepSimulation(state, command?)`
* explicit simulation phases
* deterministic IDs
* canonical serialization/hash
* versioned persistence
* `toRenderSnapshot()`
* application command dispatch
* 25 passing tests
* build/typecheck/lint passing
* no React/Three/browser dependencies in the domain

The current architecture is:

```text
src/domain/
src/application/
```

There is currently no renderer, browser application, or UI.

## Objective

Implement the first real vertical slice of NOVA:

```text
SimulationState
      ↓
RenderSnapshot
      ↓
Three.js renderer
      ↓
User interaction
      ↓
dispatchCommand()
      ↓
stepSimulation()
      ↓
new SimulationState
      ↓
new RenderSnapshot
```

The goal is NOT to expand the simulation domain.

The goal is to prove that the existing deterministic core can drive a real-time visual application cleanly.

---

# Step 1 principles

## 1. Preserve the domain boundary

The domain MUST remain completely unaware of:

* React
* Three.js
* WebGL
* DOM
* browser APIs
* animation frames
* rendering
* pointer events
* keyboard events
* `Date.now`
* `performance.now`
* `Math.random`

Do not move rendering concerns into `src/domain`.

The renderer consumes application/domain projections only.

---

## 2. RenderSnapshot is the renderer contract

Audit the existing `RenderSnapshot` before implementing the renderer.

Determine whether it contains everything required to display:

* world/grid
* buildings
* building lifecycle state
* colonists
* relevant spatial information
* simulation time

If something genuinely required by rendering is missing, make the smallest possible additive change to the snapshot/application projection.

Do NOT add unrelated domain concepts.

Document any contract change.

---

# 3. Browser application

Create the smallest appropriate browser entry point.

The implementation may use React if that is already the intended application architecture, but keep React as an application/presentation concern.

Recommended conceptual structure:

```text
src/
  domain/
  application/
  renderer/
    three/
      scene
      camera
      world
      buildings
      colonists
      renderer
  app/
    ...
```

Adapt this to the existing repository rather than blindly creating duplicate abstractions.

Three.js must never be imported from the domain layer.

---

# 4. Three.js scene

Create a minimal but production-quality Three.js scene.

The scene should contain:

* WebGL renderer
* camera
* resize handling
* scene
* ambient/basic lighting if required
* ground/grid representation
* building representation
* colonist representation

Do not pursue visual polish yet.

Do not introduce postprocessing.

Do not introduce shaders unless required.

Do not introduce a large asset pipeline.

Use simple deterministic primitives.

The visual language should already suggest a clean, restrained simulation/editor rather than a generic game prototype.

---

# 5. World representation

Render the simulation grid from the existing world configuration/snapshot.

Requirements:

* deterministic positioning
* stable mapping from simulation coordinates → world coordinates
* no hidden simulation state inside Three.js
* no duplicated authoritative state

Define and test one explicit coordinate conversion boundary.

For example:

```ts
simulationCellToWorldPosition(...)
```

The exact API should follow the existing domain model.

---

# 6. Building rendering

Render buildings from `RenderSnapshot`.

At minimum support:

```text
underConstruction
operational
```

The same simulation building must retain a stable visual identity across frames.

Do not recreate the entire Three.js scene on every tick.

Use a keyed reconciliation strategy:

```text
building-N → Object3D
```

The renderer should:

* create missing objects
* update existing objects
* remove objects no longer present

Do not make Three.js objects the source of truth.

---

# 7. Colonist rendering

Render colonists from the snapshot.

A simple primitive is sufficient.

Requirements:

* stable colonist identity
* deterministic position
* no random wandering
* no autonomous simulation
* no fake state maintained exclusively by the renderer

If the simulation does not yet expose meaningful movement, keep colonists stationary at their derived location.

Do not invent movement mechanics in Step 1.

---

# 8. Interaction

Implement the smallest useful interaction loop.

The user must be able to:

1. select a buildable grid cell
2. issue the existing `placeBuilding` command
3. observe the resulting simulation state
4. observe construction progressing
5. observe the building becoming operational
6. observe the colonist admission/residence result

Interaction must go through the application command layer.

Do NOT mutate `SimulationState` directly from UI/renderer code.

The intended flow is:

```ts
dispatchCommand(command)
→ stepSimulation(...)
→ new state
→ toRenderSnapshot(...)
→ renderer.update(snapshot)
```

---

# 9. Simulation clock

Add a minimal observable simulation clock.

Required controls:

```text
PLAY
PAUSE
STEP
```

Optional:

```text
1x
2x
4x
```

Only if this can be implemented without polluting the deterministic domain.

Important distinction:

* browser/frame time drives when the application calls the simulation
* simulation time itself remains controlled by `stepSimulation`
* the domain must remain deterministic

Never introduce `Date.now()` or `performance.now()` into domain logic.

---

# 10. Rendering loop

The browser rendering loop may use `requestAnimationFrame`.

However:

```text
requestAnimationFrame
```

must only drive presentation/application scheduling.

It must not become the simulation clock.

Prefer an explicit application loop conceptually equivalent to:

```text
animation frame
    ↓
if PLAY:
    advance simulation according to configured simulation stepping
    ↓
derive RenderSnapshot
    ↓
update renderer
    ↓
render frame
```

The exact implementation should preserve deterministic simulation semantics.

`STEP` must advance exactly one simulation tick.

Two runs with the same commands and the same number of simulation ticks must still produce the same state/hash.

---

# 11. Selection / placement UX

Implement a minimal visual placement interaction.

Requirements:

* hover/select a valid grid cell
* show a simple placement indicator
* indicate invalid cells
* clicking a valid cell dispatches `placeBuilding`

Do not implement a complete construction UI.

Do not create a large toolbar.

A minimal control for selecting the existing residence building is sufficient.

---

# 12. UI

Only create the minimum UI required to test the vertical slice.

Suggested:

```text
NOVA

[ Residence ]

[ PLAY ] [ PAUSE ] [ STEP ]

Tick: 12
Buildings: 2
Colonists: 1
```

This is diagnostic UI, not final product design.

Keep it intentionally temporary and minimal.

---

# 13. Tests

Add tests for the new application/renderer boundary where practical.

At minimum verify:

### Snapshot → renderer mapping

* building identity remains stable
* colonist identity remains stable
* removed entities disappear
* new entities are created
* construction/operational state is reflected

### Command flow

Verify that placement goes through the application command dispatcher rather than directly mutating state.

### Simulation

Existing deterministic tests must remain unchanged and passing.

### Build

The browser application must build successfully.

---

# 14. E2E

If a browser test infrastructure is practical in the current repository, add one minimal E2E scenario:

```text
open application
→ application loads
→ renderer exists
→ select Residence
→ click valid cell
→ building appears
→ advance simulation
→ building becomes operational
→ colonist appears
```

Do not introduce GPU-specific validation yet.

Do not block Step 1 on advanced WebGL validation if the environment cannot provide it.

Report browser/WebGL limitations honestly.

---

# 15. Performance constraints

Do not prematurely optimize.

However, establish these rules from the beginning:

* no full scene rebuild every simulation tick
* no unnecessary React rerender loop for every Three.js object
* stable Object3D identity
* deterministic entity keys
* renderer owns presentation objects only
* simulation remains independent of rendering frequency

The architecture should remain viable when the number of entities grows substantially later.

---

# 16. Explicit non-goals

Do NOT implement:

* zones
* roads
* transport
* economy
* needs
* services
* technology tree
* autonomous development
* resource production
* advanced pathfinding
* save/load UI
* advanced camera system
* multiplayer
* networking
* procedural generation
* sophisticated assets
* postprocessing
* shaders
* audio
* final visual design system

These belong to later steps.

---

# 17. Architecture audit

Before coding:

1. inspect the complete current repository
2. inspect `RenderSnapshot`
3. inspect command dispatch
4. inspect simulation stepping
5. inspect package configuration
6. identify the smallest clean browser/renderer integration point
7. document any architectural concern before changing it

Do not rewrite the Step 0 architecture.

Prefer small additive changes.

---

# 18. Verification

Before declaring COMPLETE, run:

```text
npm run lint
npm run typecheck
npm test
npm run build
```

Also run any existing architecture/circular-dependency checks.

If browser E2E exists:

```text
npm run test:e2e
```

Report separately:

* domain verification
* application verification
* renderer verification
* E2E verification
* visual verification

Do not claim visual success without actually observing the application.

---

# 19. Completion criteria

Step 1 is COMPLETE only if the following loop works:

```text
Launch NOVA
    ↓
See deterministic world
    ↓
Select Residence
    ↓
Place building
    ↓
Building enters construction
    ↓
Simulation advances
    ↓
Building becomes operational
    ↓
Housing capacity becomes available
    ↓
Colonist is admitted
    ↓
Colonist is visible
```

And:

```text
UI/renderer
     ↓
application command
     ↓
deterministic simulation
     ↓
RenderSnapshot
     ↓
Three.js
```

remains the architectural flow.

---

# Final report format

When complete, report:

## Status

COMPLETE / BLOCKED / PARTIAL

## Implementation

List the actual implementation.

## Architecture

Show the final dependency flow.

## Files created

## Files modified

## Files removed

## Domain changes

Explicitly state whether the domain changed.

## Renderer

Explain:

* scene
* camera
* grid
* building mapping
* colonist mapping
* reconciliation

## Interaction

Explain the command flow.

## Tests

Report exact counts and results.

## Verification

Report:

* lint
* typecheck
* tests
* build
* E2E
* visual
* architecture/circular dependency checks

## Not verified

Explicitly list anything that could not be verified.

## Deferred work

List what remains intentionally outside Step 1.

## Recommendation for Step 2

Recommend the next step based on the actual implementation rather than the original roadmap.

