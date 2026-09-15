# NOVA — Step 4: Roads & Infrastructure

## Objective

Implement the first infrastructure system of NOVA:

> The player can construct a connected road network on the world grid.

This step extends the construction system introduced in Step 3.

At the end of this step, the player must be able to:

* enter road construction mode;
* place road segments on the grid;
* connect segments together;
* see connected road networks;
* validate road placement;
* select roads;
* remove roads;
* render roads independently from buildings;
* preserve roads while simulation ticks advance;
* reset the simulation cleanly.

The road system must become the spatial foundation for future:

* accessibility;
* population movement;
* pathfinding;
* traffic;
* urban development.

Do **not** implement those systems yet.

---

# 1. Read Before Coding

Before making changes:

1. Read `ARCHITECTURE.md`.
2. Inspect all Step 1, Step 2 and Step 3 implementations.
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
4. Inspect the current repository before modifying anything.
5. Reuse existing spatial and construction abstractions from Step 3.
6. Do not rewrite existing building functionality unnecessarily.

---

# 2. Core Principle

A road is a **domain infrastructure object**.

Three.js only renders it.

The architecture remains:

```text id="e3r8uk"
Input
  ↓
Application Command
  ↓
Construction / Infrastructure Domain
  ↓
CityState
  ↓
RenderSnapshot
  ↓
Renderer
```

Never allow:

```text id="1s5q8v"
Three.js → determine road validity
```

or:

```text id="9d7f2b"
React → directly mutate roads
```

The domain remains authoritative.

---

# 3. Domain Ownership

Use:

```text id="8v5g3e"
src/domain/city/
```

for the authoritative city infrastructure state.

Use:

```text id="6m8g0s"
src/domain/construction/
```

for generic construction rules and construction commands where appropriate.

If the architecture benefits from a dedicated module, introduce:

```text id="d7y1we"
src/domain/infrastructure/
```

but only if there is a genuine ownership boundary.

Do not create a generic infrastructure abstraction merely for this step.

---

# 4. Road Domain Model

Introduce a `Road`.

Minimum conceptual model:

```ts id="kh9x8a"
Road {
  id
  position
  orientation
}
```

Where:

```text id="wq8d0x"
position = GridPosition
```

and orientation represents:

```text id="1n0fdr"
horizontal
vertical
```

Use explicit domain types.

Do not store Three.js objects.

Do not store world-space floating-point coordinates as authoritative road positions.

---

# 5. Road Identity

Road IDs must be deterministic.

Follow the same identity conventions established for buildings.

For example:

```text id="p7efg2"
road:1
road:2
road:3
```

Do not use:

```text id="p4yq9b"
crypto.randomUUID()
Math.random()
Date.now()
```

for simulation identity.

Road IDs must survive deterministic replay and future persistence.

---

# 6. Road Geometry

For this step, use a grid-cell road model.

One road segment occupies one grid cell.

For example:

```text id="kh01xp"
┌───┬───┬───┬───┬───┐
│   │   │   │   │   │
├───┼───┼───┼───┼───┤
│   │ R │ R │ R │   │
├───┼───┼───┼───┼───┤
│   │   │   │   │   │
└───┴───┴───┴───┴───┘
```

A road occupies the center of its cell.

Do not implement arbitrary spline roads.

Do not implement Bézier curves.

Do not implement freeform road drawing.

The grid is the authoritative representation.

---

# 7. Road Connectivity

A road must know its immediate neighbors.

For a road at:

```text
(x, y)
```

check:

```text
(x + 1, y)
(x - 1, y)
(x, y + 1)
(x, y - 1)
```

From those neighbors derive its connection mask:

```text id="2m13wq"
none
north
south
east
west
north+south
east+west
north+east
north+west
south+east
south+west
north+east+south
north+west+south
north+east+west
south+east+west
north+east+south+west
```

Use a bitmask or another compact representation if appropriate.

The connection mask should be **derived state**, not independently authoritative state.

Do not store both:

```text
road.neighbors
```

and:

```text
road.connectionMask
```

unless there is a concrete performance reason.

---

# 8. Road Occupancy

Extend the city's spatial occupancy model.

Buildings and roads must not accidentally occupy the same construction space unless explicitly allowed by the design.

For this step:

```text id="q1fh8h"
building + road
    ↓
invalid
```

A road cell occupied by a building must reject road placement.

Likewise, a building must not be placeable on a road.

Update Step 3's building validation accordingly.

Do not duplicate occupancy maps unnecessarily.

Prefer a single authoritative spatial occupancy model capable of distinguishing:

```text
empty
building
road
```

---

# 9. Terrain Validation

Roads must respect world terrain.

At minimum:

```text id="5n6w3z"
outside bounds → invalid
water → invalid
non-buildable → invalid
occupied by building → invalid
occupied by road → invalid
```

If Step 1 defines specific terrain restrictions, reuse them.

Do not create a second terrain validation system.

---

# 10. Road Placement Result

Use the same explicit validation pattern introduced in Step 3.

Conceptually:

```ts id="5z6j1f"
RoadPlacementResult =
  | {
      valid: true
    }
  | {
      valid: false
      reason: RoadPlacementFailureReason
    }
```

Possible reasons:

```text id="w1l2sk"
out_of_bounds
water
not_buildable
occupied
```

Avoid generic:

```text id="4g6m9a"
invalid
```

when the actual reason is known.

Reuse shared construction failure concepts if the existing architecture supports it cleanly.

Do not create duplicate error hierarchies without need.

---

# 11. Application Commands

Introduce:

```text id="w8m21d"
placeRoad
removeRoad
```

Conceptually:

```ts id="p3xw8r"
PlaceRoadCommand {
  position
}
```

and:

```ts id="sl6v84"
RemoveRoadCommand {
  roadId
}
```

The application layer coordinates the command.

The domain validates and mutates authoritative state.

---

# 12. Road State

Extend `CityState`.

Conceptually:

```text id="7ddv1k"
CityState
 ├── buildings
 ├── roads
 └── occupancy
```

Do not create a separate global road store.

Do not put roads in React.

Do not put roads directly in Three.js.

---

# 13. Road Network

Create a concept of the road network only if required by the current implementation.

The network should be derivable from road occupancy.

For example:

```text id="d1y4c9"
Road cells
    ↓
adjacency
    ↓
connected components
```

Do not implement graph algorithms beyond what is necessary to establish the foundation.

Do not implement pathfinding yet.

Do not introduce A*.

Do not introduce Dijkstra.

Do not calculate traffic.

The only requirement is that connectivity can be determined later without redesigning the road representation.

---

# 14. Construction Interaction

Add a road construction mode.

The user should be able to:

```text id="zzr8x0"
BUILD
 ├── HOUSE
 └── ROAD
```

Selecting `ROAD` enters road construction mode.

Mouse movement:

```text id="v8j2kg"
cursor
 ↓
world intersection
 ↓
grid position
 ↓
road validation
 ↓
preview
```

Click:

```text id="e9c8p0"
valid
 ↓
PlaceRoadCommand
```

Invalid placement must not mutate the simulation.

---

# 15. Road Drawing

Allow simple continuous road placement.

A useful interaction is:

```text id="k4a9n8"
mouse down
    ↓
drag across cells
    ↓
place valid road segments
```

However, do not allow the browser event loop to directly mutate the domain.

The interaction layer should generate construction commands.

Example conceptual flow:

```text id="f9qk3m"
pointer movement
 ↓
GridPosition
 ↓
deduplicate positions
 ↓
PlaceRoadCommand
```

Do not place the same road twice.

---

# 16. Input Safety

Avoid generating a command every frame when the pointer remains on the same grid cell.

For example:

```text id="t5k8r1"
cell A
cell A
cell A
cell A
```

should not produce four identical placement operations.

Track the last interaction cell in the transient input state.

Do not put this state into the simulation.

---

# 17. Road Preview

The road preview should show:

```text id="a6v1pg"
valid
invalid
```

with a restrained visual distinction.

For connected roads, the preview should ideally indicate how the new segment would connect to neighbors.

Do not build final road rendering in the preview system.

The preview can use a lightweight temporary mesh.

---

# 18. Road Renderer

Add road rendering under the existing rendering architecture.

For example:

```text id="i2k7x3"
src/rendering/roads/
```

or another location consistent with the current structure.

The renderer must receive render data, not domain objects.

Conceptually:

```ts id="q1z9r2"
RenderRoad {
  id
  position
  connectionMask
}
```

The `connectionMask` can be computed during render snapshot projection if it is derived.

---

# 19. Procedural Road Geometry

Create a simple procedural road representation.

A road cell can contain:

```text id="v7e5m1"
flat road surface
subtle border
optional center detail
```

The visual style should be:

* minimal;
* architectural;
* understated;
* readable at zoomed-out scale.

Avoid:

* realistic asphalt textures;
* road markings everywhere;
* photorealistic materials;
* excessive neon;
* heavy glow.

NOVA should still feel like a digital architectural model.

---

# 20. Connected Road Geometry

The road renderer should use the connection mask to adapt its shape.

Examples:

```text id="2n8b4x"
straight:

──────

corner:

└────

T-junction:

┬

cross:

┼
```

Do not create a separate complex model for every combination if a simple procedural solution works.

The important result is that the network visually reads as connected.

---

# 21. Incremental Rendering

Follow the same principle established for buildings.

Do not rebuild the entire road network every frame.

The renderer should be capable of:

```text id="s5x0y2"
add road
update road connectivity
remove road
```

incrementally.

Important:

Adding one road may require updating neighboring road visuals.

For example:

```text id="a8q3f7"
R
```

becomes:

```text id="v9z0e2"
RR
```

The first road's connection mask changes.

The renderer must therefore update affected neighbors when necessary.

---

# 22. Render Snapshot

Extend the render snapshot:

```text id="c5m7e1"
RenderSnapshot
 ├── terrain
 ├── buildings
 └── roads
```

Do not expose the complete `CityState` to Three.js.

The projection should remain an explicit boundary.

---

# 23. Selection

Roads must be selectable.

Selecting a road should produce a transient UI selection:

```text id="u3p7c5"
selectedRoadId
```

Do not add selection to persistent simulation state.

Visually highlight the selected road using a restrained technique.

Do not use excessive scale distortion if it makes connected geometry look broken.

Prefer:

* subtle emissive change;
* outline;
* secondary line;
* small elevation offset.

Use whichever fits the existing rendering architecture.

---

# 24. Road Removal

Allow:

```text id="z8s1w3"
Delete
Backspace
```

to remove a selected road.

After removal:

```text id="s1f7x2"
road removed
 ↓
occupancy released
 ↓
neighbor connectivity recalculated
 ↓
renderer updated
```

Removing a road must not remove neighboring roads.

It must only modify their derived connection state.

---

# 25. Building Compatibility

Update building placement from Step 3.

A building cannot be placed on a road.

Add tests proving:

```text id="j7e3k9"
road exists
+
place house
=
rejected
```

Likewise:

```text id="4d8r0p"
house exists
+
place road
=
rejected
```

Do not introduce special-case logic only in the UI.

The domain must reject both cases.

---

# 26. Simulation Integration

Roads must persist while simulation ticks advance.

Verify:

```text id="m3y8v1"
place roads
 ↓
100 simulation ticks
 ↓
same road network
```

The simulation currently does not need to update roads.

This will change later when:

* population uses roads;
* traffic uses roads;
* infrastructure consumes resources.

Do not implement those systems now.

---

# 27. Spatial API

If Step 3 created spatial utilities, extend them rather than duplicating them.

Useful operations may include:

```text id="w2k6r9"
getCell(position)
isInside(position)
getNeighbors(position)
isOccupied(position)
getOccupant(position)
```

Keep the API small.

Do not create a generic `SpatialManager`.

---

# 28. UI

Update the minimal BUILD interface.

Conceptually:

```text id="t8k4z1"
BUILD

[ HOUSE ]
[ ROAD ]

ESC / RMB
CANCEL
```

Keep it visually restrained.

Do not introduce:

* resource counts;
* road statistics;
* traffic UI;
* population;
* economy;
* infrastructure dashboards.

The interface is only for testing the construction system.

---

# 29. Camera and Interaction

Reuse the camera/raycasting system from Step 3.

Do not create a second raycasting system.

Do not duplicate grid conversion logic.

The input pipeline should remain:

```text id="x9f5a2"
Pointer
 ↓
Renderer hit test
 ↓
World position
 ↓
Grid position
 ↓
Application command
```

---

# 30. Determinism

Road construction must be deterministic.

Given:

```text id="s3f8c1"
same world
same initial city
same road commands
same command order
```

the resulting road network must be identical.

Connection masks must also be deterministic.

Do not store arbitrary neighbor order that can change results.

---

# 31. Tests — Domain

Add tests covering:

### Placement

```text id="6x1r8v"
valid road
outside bounds
water
non-buildable
occupied building
occupied road
```

### Connectivity

Test:

```text id="p2z7m4"
single road
horizontal pair
vertical pair
corner
T-junction
cross
```

Verify the expected connection masks.

### Removal

```text id="e5w9q1"
remove road
→ occupancy released
→ neighbors updated
```

### Building compatibility

```text id="m8k2s6"
road blocks building
building blocks road
```

### Determinism

Same command sequence:

```text id="j1v7q9"
→ same roads
→ same positions
→ same IDs
→ same connectivity
```

---

# 32. Tests — Application

Test:

```text id="r6c4x0"
placeRoad
removeRoad
invalid road placement
road/building conflict
```

Verify that application commands correctly reach the domain.

---

# 33. Tests — Render Projection

Verify:

```text id="b8n3k5"
CityState
 ↓
RenderSnapshot
```

contains:

```text id="x2m6v8"
roads
road positions
road IDs
connection data
```

Do not expose domain internals unnecessarily.

---

# 34. E2E

Add browser coverage for at least:

### Scenario 1

```text id="q9r4c7"
start application
→ BUILD
→ ROAD
→ place several connected road cells
→ verify visible road network
```

### Scenario 2

```text id="w6k2p1"
select road
→ delete
→ verify road disappears
```

### Scenario 3

```text id="z3f8m5"
place road
→ attempt house on road
→ placement rejected
```

Use stable selectors.

Avoid brittle pixel assertions.

---

# 35. Performance

Roads are expected to eventually become numerous.

Prepare the architecture without prematurely optimizing.

Do:

* incremental rendering;
* direct occupancy lookup;
* deterministic connection calculation;
* reuse geometry/materials where possible.

Do not yet implement:

* GPU road simulation;
* spatial hashing;
* quadtree;
* ECS;
* worker-based pathfinding;
* traffic graph optimization.

Profile before introducing those systems.

---

# 36. No Pathfinding

This is important.

Do NOT implement:

```text id="f7m4x1"
A*
Dijkstra
navigation mesh
traffic routing
citizen navigation
vehicle navigation
```

The road network only needs to exist and be spatially connected.

Pathfinding belongs to a future step.

---

# 37. No Traffic

Do NOT implement:

```text id="k3p9z7"
cars
pedestrians
traffic density
congestion
travel time
```

The road network is currently static infrastructure.

---

# 38. No Infrastructure Economy

Do NOT implement:

```text id="x5q8m2"
road construction cost
maintenance
energy
materials
taxes
```

Roads are currently free.

Economy will be introduced separately.

---

# 39. Validation

Run:

```bash id="f3m8q1"
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

All must pass.

Then manually verify:

```text id="c7v2n9"
[ ] world loads
[ ] simulation still runs
[ ] BUILD → ROAD works
[ ] road preview follows cursor
[ ] valid road placement works
[ ] invalid placement is rejected
[ ] roads connect visually
[ ] corners render correctly
[ ] T-junctions render correctly
[ ] cross intersections render correctly
[ ] roads can be selected
[ ] roads can be removed
[ ] neighboring roads update after removal
[ ] buildings cannot overlap roads
[ ] roads cannot overlap buildings
[ ] roads persist during simulation ticks
[ ] reset clears roads
[ ] no domain → Three.js dependency
[ ] no React-owned road state
```

---

# 40. Definition of Done

Step 4 is complete only when:

```text id="h2q7v6"
[ ] Road domain model exists
[ ] Deterministic road IDs exist
[ ] Grid-based road positioning exists
[ ] Road occupancy integrated
[ ] Road placement validation exists
[ ] Explicit placement failures exist
[ ] Place road command exists
[ ] Remove road command exists
[ ] Roads integrated into CityState
[ ] Roads integrated into SimulationState
[ ] Road connectivity is derived correctly
[ ] RenderSnapshot contains roads
[ ] Road renderer exists
[ ] Road preview exists
[ ] Road construction mode exists
[ ] Road selection exists
[ ] Road deletion exists
[ ] Neighbor connectivity updates after changes
[ ] Buildings cannot overlap roads
[ ] Roads cannot overlap buildings
[ ] Incremental rendering works
[ ] Determinism tests pass
[ ] Domain tests pass
[ ] Application tests pass
[ ] Render projection tests pass
[ ] E2E tests pass
[ ] pnpm typecheck passes
[ ] pnpm lint passes
[ ] pnpm test passes
[ ] pnpm test:e2e passes
[ ] pnpm build passes
```

---

# 41. Final Report

When finished, return a concise report:

```text id="p8w3c5"
## Step 4 — Roads & Infrastructure

### Implemented
- ...
- ...
- ...

### Domain
- ...
- ...

### Spatial
- ...
- ...

### Rendering
- ...
- ...

### Interaction
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
- Step 5: ...
```

Do not start Step 5 automatically.
