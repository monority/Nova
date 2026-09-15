# NOVA — Step 3: Spatial Foundation & Construction

## Objective

Implement the first real gameplay system of NOVA:

> The player can place, validate, render, select and remove buildings on the generated world.

This step introduces the spatial and construction foundations that future systems will depend on:

```text
World
  ↓
Spatial Model
  ↓
Construction Domain
  ↓
Building
  ↓
Render Snapshot
  ↓
Renderer
```

The implementation must remain deterministic, testable and independent from React and Three.js.

At the end of this step, the player must be able to:

* enter construction mode;
* select a building type;
* move a placement preview over the terrain;
* see whether placement is valid;
* place a building;
* see the building appear;
* select an existing building;
* remove a building;
* continue simulation while buildings exist;
* reload/reset the simulation without architectural inconsistencies.

Do not implement population, economy, roads, technology or citizens yet.

---

# 1. Read Before Coding

Before making changes:

1. Read `ARCHITECTURE.md`.
2. Inspect all Step 1 and Step 2 implementation.
3. Read:

   * `00-product-vision.md`
   * `01-game-design.md`
   * `02-core-loop.md`
   * `03-city-simulation.md`
   * `04-world-and-terrain.md`
   * `05-construction.md`
   * `10-visual-direction.md`
   * `11-ux-and-interface.md`
   * `12-rendering-architecture.md`
   * `13-technical-architecture.md`
   * `19-mvp.md`
4. Inspect the current repository before creating files.
5. Reuse existing abstractions where appropriate.
6. Do not rewrite Step 1 or Step 2 unless required by a real architectural issue.

---

# 2. Architectural Principle

The most important rule of this step:

> A building is a domain object. Three.js only renders it.

The dependency direction must remain:

```text
UI
 ↓
Application
 ↓
Domain
```

and:

```text
Domain
 ↓
Render Snapshot
 ↓
Rendering
```

Never:

```text
React → mutate Three.js object → mutate domain
```

Never:

```text
Three.js → decide whether building placement is valid
```

Never:

```text
UI → directly mutate World
```

---

# 3. New Domain Module

Use:

```text
src/domain/construction/
```

for construction concepts.

Use:

```text
src/domain/city/
```

for city/building concepts.

Keep ownership explicit.

A useful conceptual separation is:

```text
city/
  building.ts
  building-type.ts

construction/
  placement.ts
  placement-rules.ts
  construction-command.ts
```

Adapt names to the existing repository if equivalent modules already exist.

Do not create duplicate concepts.

---

# 4. Building Domain

Introduce a minimal `Building`.

A building should have at least:

```ts
Building {
  id
  type
  position
}
```

Where position is expressed in world/grid coordinates rather than Three.js coordinates.

Do not store:

```text
THREE.Vector3
THREE.Mesh
THREE.Object3D
```

inside the domain.

The domain must remain completely Three.js-free.

---

# 5. Stable Building IDs

Building IDs must be stable.

Do not use:

```text
array index
```

as an identity.

Do not use random UUID generation if that introduces nondeterminism into the simulation.

Use a deterministic ID strategy compatible with the existing architecture.

For example:

```text
building:<sequence>
```

or another explicit domain-owned identity.

The exact representation should follow the existing ID conventions.

---

# 6. Building Types

Introduce a minimal building type system.

For this step, only implement a very small number of types.

Recommended:

```text
house
```

and optionally:

```text
workshop
```

If `workshop` is not needed for a meaningful test, implement only `house`.

Do not create dozens of future building definitions.

A building type should define only properties required now.

For example:

```ts
BuildingType {
  id
  width
  height
  footprint
}
```

Keep visual properties separate from domain properties.

Do not put:

```text
mesh
material
color
shader
```

inside `BuildingType`.

---

# 7. Spatial Coordinates

Introduce an explicit grid coordinate model.

For example:

```ts
GridPosition {
  x
  y
}
```

Use integer coordinates for construction.

Do not use floating-point coordinates as the authoritative construction position.

The renderer may later transform:

```text
GridPosition
      ↓
World-space position
      ↓
Three.js
```

---

# 8. Spatial Foundation

Create or extend:

```text
src/engine/spatial/
```

with minimal spatial utilities.

Responsibilities may include:

* coordinate conversion;
* bounds checks;
* cell lookup;
* footprint iteration;
* occupancy lookup.

Do not create a generic spatial engine.

The first implementation can simply operate on the world grid.

---

# 9. Building Occupancy

The city must know which cells are occupied.

Do not scan every building for every placement query if a direct occupancy structure is more appropriate.

Introduce a structure conceptually equivalent to:

```text
CellId → BuildingId
```

The exact data structure is up to the implementation.

The important properties are:

* deterministic;
* fast enough for the current scale;
* easy to serialize later;
* owned by the appropriate domain/engine layer.

Avoid premature spatial hashing or quadtree implementations.

---

# 10. Placement Rules

Create explicit construction validation.

A placement should be rejected when:

```text
outside world
OR
cell is water
OR
cell is not buildable
OR
footprint overlaps another building
```

The exact rules must respect the existing world representation.

Do not put validation in React.

Do not put validation in Three.js.

Do not duplicate validation between UI and domain.

The UI may display the result of validation, but the domain remains authoritative.

---

# 11. Placement Result

Create an explicit result rather than returning a simple boolean if the architecture allows it.

Conceptually:

```ts
PlacementResult =
  | {
      valid: true
    }
  | {
      valid: false
      reason: PlacementFailureReason
    }
```

Possible reasons:

```text
out_of_bounds
water
not_buildable
occupied
```

Do not expose vague errors such as:

```text
"invalid"
```

when a useful domain reason exists.

The UI can map domain reasons to user-facing messages later.

---

# 12. Construction Commands

Introduce application commands for construction.

At minimum:

```text
placeBuilding
removeBuilding
```

Conceptually:

```text
PlaceBuildingCommand {
  type
  position
}
```

and:

```text
RemoveBuildingCommand {
  buildingId
}
```

The application layer should coordinate these commands.

The domain performs the actual rules.

---

# 13. Construction Service

If the current architecture benefits from it, introduce a small construction service responsible for:

```text
validate placement
create building
remove building
update occupancy
```

Do not create a giant:

```text
ConstructionManager
GameManager
WorldManager
```

Keep the service focused.

If the domain model can express these operations cleanly without a service, prefer the simpler solution.

---

# 14. Simulation Integration

Buildings must become part of the simulation state.

Conceptually:

```text
Simulation
 ├── clock
 ├── world
 └── city
      └── buildings
```

Do not duplicate the buildings in multiple stores.

There must be one authoritative collection.

The simulation tick does not need to change buildings yet.

Buildings simply persist while the simulation advances.

---

# 15. Commands vs Simulation Tick

Do not treat player commands as simulation ticks.

For example:

```text
Player clicks
    ↓
PlaceBuildingCommand
    ↓
Domain mutation
```

is different from:

```text
Simulation tick
    ↓
Simulation systems
```

Later, population and economy systems will run during simulation ticks.

Construction is a player-driven command.

Maintain this distinction.

---

# 16. Render Snapshot

Extend the render boundary.

The renderer should receive something conceptually like:

```text
RenderSnapshot
 ├── world
 └── buildings
```

Building render data should contain only what rendering needs.

For example:

```ts
RenderBuilding {
  id
  type
  position
}
```

Do not pass the entire domain `Building` if doing so leaks unnecessary domain structure.

The renderer must never mutate this snapshot.

---

# 17. Building Renderer

Implement a minimal building renderer.

Use simple procedural geometry.

For example:

```text
house
 ├── base
 └── roof / upper volume
```

Do not use external assets.

Do not create realistic buildings.

Do not implement detailed architecture yet.

The visual objective is:

> clear geometric city blocks that already feel like part of the NOVA visual language.

Buildings should have subtle differentiation from terrain.

Avoid:

* photorealism;
* cartoon aesthetics;
* excessive emissive effects;
* cyberpunk neon;
* generic low-poly game assets.

---

# 18. Instancing

Do not create a separate architectural abstraction for every possible building.

If several buildings share geometry, use instancing where appropriate.

However:

**Do not over-engineer this step.**

A small number of buildings does not justify an elaborate GPU architecture.

The renderer should be structured so instancing can be introduced naturally when scale increases.

---

# 19. Construction Preview

Implement a placement preview.

When the user enters construction mode:

```text
cursor
 ↓
terrain position
 ↓
grid position
 ↓
placement validation
 ↓
preview
```

The preview must communicate:

```text
valid
invalid
```

Use a restrained visual difference.

Do not introduce giant UI effects.

The preview is rendering state, not simulation state.

It must not create a building until the player confirms placement.

---

# 20. Input Mapping

Implement the minimal input interactions.

Recommended:

```text
Left click
    place building

Right click / Escape
    exit construction mode

Mouse movement
    move preview

Click building
    select building

Delete / Backspace
    remove selected building
```

Adapt to the existing input architecture.

Do not hard-code browser event handling throughout React components.

Centralize interaction logic where appropriate.

---

# 21. Raycasting

The renderer/input layer may use Three.js raycasting to determine which terrain location the cursor is pointing at.

But the result must be converted into a domain-independent coordinate:

```text
Three.js intersection
        ↓
GridPosition
        ↓
Application command
```

Never pass:

```ts
THREE.Intersection
```

into the domain.

Never pass:

```ts
THREE.Vector3
```

into construction rules.

---

# 22. Grid Snapping

Construction must snap to the world grid.

Conceptually:

```text
mouse world position
        ↓
grid coordinate
        ↓
building footprint
```

The authoritative building position is always the grid position.

Avoid sub-cell building positions in this step.

---

# 23. Selection

Implement minimal building selection.

Selecting a building should provide:

```text
selectedBuildingId
```

The selection state is UI/application interaction state.

It must not become part of the persistent simulation state unless future requirements explicitly justify it.

A selected building can be visually highlighted.

Do not build the complete inspector yet.

---

# 24. Remove Building

Implement removal through an application command.

Requirements:

* building disappears from simulation;
* occupancy is released;
* renderer updates;
* selection is cleared if necessary;
* attempting to remove an unknown building is handled safely.

No economy refund system yet.

Do not introduce construction costs yet.

---

# 25. UI

Create a minimal construction interface.

Example:

```text
┌──────────────────────────────┐
│ BUILD                        │
│                              │
│ [ HOUSE ]                    │
│                              │
│                              │
│                         1×   │
└──────────────────────────────┘
```

Keep it deliberately minimal.

Do not create:

* resource dashboards;
* population counters;
* technology tree;
* economy panels;
* giant toolbars.

The UI should communicate the action, not become the game.

---

# 26. Application State

Do not put the entire city state into React.

React may own transient interaction state such as:

```text
construction mode
selected building type
hovered grid cell
selected building
```

But:

```text
World
Buildings
Occupancy
Simulation Clock
```

remain outside React.

Use the existing subscription architecture from Step 2.

---

# 27. Determinism

Construction must remain deterministic.

Given:

```text
same initial world
same commands
same command order
```

the resulting city must be identical.

Do not generate building identity using nondeterministic randomness.

Do not use timestamps as domain state.

---

# 28. Command History Preparation

Do not implement undo/redo yet.

However, structure commands so that they can later be represented as:

```text
command
payload
result
```

This will later support:

* replay;
* undo;
* history;
* multiplayer synchronization;
* save/load.

Do not build those systems now.

---

# 29. Tests — Domain

Add tests for:

### Valid placement

```text
buildable empty cell → valid
```

### Invalid placement

Test:

```text
outside bounds
water
non-buildable
occupied
```

### Footprints

If buildings occupy more than one cell:

```text
all cells free → valid
one occupied cell → invalid
```

### Creation

```text
valid placement
→ building created
→ building has stable ID
→ occupancy updated
```

### Removal

```text
building removed
→ occupancy released
```

### Determinism

Same command sequence must produce the same city state.

---

# 30. Tests — Application

Test:

```text
placeBuilding
removeBuilding
invalid placement rejected
unknown building rejected safely
```

The application tests should verify that commands correctly cross the domain boundary.

---

# 31. Tests — Rendering Contracts

Test the render transformation if it exists.

Verify:

```text
domain building
    ↓
render building
```

contains the expected:

```text
id
type
position
```

Do not write brittle pixel-level tests.

---

# 32. E2E Test

Add at least one browser test covering:

```text
application starts
→ construction mode
→ place house
→ house appears
→ select house
→ remove house
→ house disappears
```

Do not rely on arbitrary pixel coordinates if the current application provides a more stable interaction mechanism.

Use stable selectors.

---

# 33. Performance

Do not optimize prematurely.

However:

* avoid React rerendering for every mouse movement if unnecessary;
* avoid creating new Three.js geometry/materials for every frame;
* do not rebuild the entire scene when one building changes;
* avoid scanning every building for every occupancy query if the occupancy map already provides the answer.

The architecture should permit incremental rendering later.

---

# 34. Renderer Update Strategy

Do not blindly rebuild all buildings every frame.

Prefer:

```text
Simulation changed
      ↓
Render snapshot changed
      ↓
Renderer reconciles changes
```

For this step, a simple reconciliation mechanism is sufficient.

The renderer should be able to:

```text
create building
update building
remove building
```

without recreating the entire Three.js scene.

---

# 35. No Gameplay Economy Yet

Do NOT add:

```text
money
construction cost
resources
maintenance
housing capacity
population
jobs
energy
food
```

A building is currently free to place.

This is intentional.

The economic layer will be introduced separately.

---

# 36. No Roads Yet

Do not implement roads in this step.

Do not make buildings require roads.

Do not introduce pathfinding.

The first construction system must work on raw terrain.

Roads will later become another spatial construction type.

---

# 37. Architecture Restrictions

Do not create:

```text
GameManager
CityManager
BuildingManager
WorldManager
MegaStore
GlobalContext
```

Do not put everything in:

```text
src/game/
```

Do not create:

```text
utils.ts
helpers.ts
misc.ts
common.ts
```

unless a genuinely shared abstraction already exists.

Keep ownership explicit.

---

# 38. Validation

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

All must pass.

Then manually verify:

```text
[ ] world loads
[ ] simulation still runs
[ ] construction mode works
[ ] preview follows cursor
[ ] valid placement is visible
[ ] invalid placement is rejected
[ ] house can be placed
[ ] multiple houses can be placed
[ ] occupied cells reject placement
[ ] building can be selected
[ ] building can be removed
[ ] occupancy is released
[ ] simulation continues after construction
[ ] reset clears the city correctly
[ ] no React simulation loop
[ ] no Three.js dependency in domain
```

---

# 39. Definition of Done

Step 3 is complete only when:

```text
[ ] Building domain exists
[ ] Building types exist
[ ] Grid position exists
[ ] Spatial occupancy exists
[ ] Placement validation exists
[ ] Construction commands exist
[ ] Building creation works
[ ] Building removal works
[ ] Render snapshot includes buildings
[ ] Building renderer exists
[ ] Construction preview exists
[ ] Grid snapping works
[ ] Building selection works
[ ] Building removal interaction works
[ ] Simulation remains independent
[ ] React remains outside simulation state
[ ] Three.js remains outside domain
[ ] Determinism tests pass
[ ] Domain tests pass
[ ] Application tests pass
[ ] E2E construction test passes
[ ] pnpm typecheck passes
[ ] pnpm lint passes
[ ] pnpm test passes
[ ] pnpm test:e2e passes
[ ] pnpm build passes
```

---

# 40. Final Report

When finished, return a concise report:

```text
## Step 3 — Spatial Foundation & Construction

### Implemented
- ...
- ...
- ...

### Domain
- ...
- ...

### Construction
- ...
- ...

### Rendering
- ...
- ...

### Tests
- pnpm typecheck: ...
- pnpm lint: ...
- pnpm test: ...
- pnpm test:e2e: ...
- pnpm build: ...

### Files created
- ...

### Files modified
- ...

### Architectural decisions
- ...

### Known limitations
- ...

### Next step
- Step 4: ...
```

Do not start Step 4 automatically.
