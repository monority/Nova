# NOVA — Step 5: Population & Settlement

## Objective

Implement the first living system of NOVA:

> Buildings can house an aggregated population, population can grow over simulation time, and the city begins to develop as a settlement.

This is the first step where the city becomes more than a collection of static objects.

The simulation should now have:

```text
World
  ↓
Buildings
  ↓
Roads
  ↓
Housing
  ↓
Population
  ↓
Growth
```

The population must be represented as **aggregated simulation data**.

Do NOT create one simulation object per citizen.

Do NOT implement individual citizens, walking agents, traffic, jobs, economy or AI agents yet.

---

# 1. Read Before Coding

Before making changes:

1. Read `ARCHITECTURE.md`.
2. Inspect all Step 1–4 implementations.
3. Read:

   * `00-product-vision.md`
   * `01-game-design.md`
   * `02-core-loop.md`
   * `03-city-simulation.md`
   * `05-construction.md`
   * `06-population.md`
   * `07-economy.md`
   * `09-time-and-events.md`
   * `10-visual-direction.md`
   * `11-ux-and-interface.md`
   * `12-rendering-architecture.md`
   * `13-technical-architecture.md`
   * `19-mvp.md`
4. Inspect the current repository before modifying anything.
5. Preserve the existing World, Simulation, Building and Road systems.
6. Do not redesign the existing architecture unless a concrete ownership problem is discovered.

---

# 2. Camera Decision

The project now uses a **full top-down camera**.

This is an intentional product decision.

Do not reintroduce isometric projection.

Do not create architecture assuming:

```text
isometric coordinates
diamond grid
pseudo-3D projection
```

The authoritative spatial model remains:

```text
GridPosition
(x, y)
```

The camera is a rendering concern.

The world grid should therefore remain completely independent from camera orientation.

---

# 3. Core Principle

Population is a **simulation domain system**.

It must not depend on:

* React;
* Three.js;
* browser time;
* camera;
* rendering FPS.

The architecture remains:

```text
Simulation Tick
      ↓
Population System
      ↓
Population State
      ↓
Render Snapshot
      ↓
Renderer
```

The renderer observes population.

It does not calculate population.

---

# 4. Population Representation

Do NOT model citizens individually.

Use an aggregated representation.

A minimal population state can be:

```ts
PopulationState {
  total
  households
}
```

or an equivalent architecture-compatible structure.

The model should be designed so that it can later represent:

```text
children
adults
workers
elderly
households
```

without requiring individual citizen entities.

Do not implement those categories yet unless required by the existing product specification.

---

# 5. Household Model

Introduce the concept of a household.

A household represents a small aggregated residential unit.

For example:

```ts
Household {
  id
  size
  buildingId
}
```

However, do not create thousands of household objects prematurely.

If the existing architecture benefits from aggregation, a building can initially expose:

```text
population
housingCapacity
```

and the city can maintain aggregate household counts.

Choose the simplest representation that remains extensible.

The important principle is:

> Population is aggregated by simulation structures, not by rendered people.

---

# 6. Housing Capacity

Extend building definitions.

The `house` building should have a housing capacity.

For example:

```text
house
  housingCapacity = configurable value
```

Do not hard-code housing capacity throughout the simulation.

Building type definitions should own building-specific static properties.

Conceptually:

```ts
BuildingType {
  id
  footprint
  housingCapacity
}
```

Only residential buildings need housing capacity.

Future building types may have:

```text
workCapacity
production
storage
education
health
```

but do not implement those properties now unless already required.

---

# 7. Population Initialization

When a new simulation starts:

```text
World
+
CityState
+
PopulationState
```

must have a valid initial population state.

A completely empty city should initially have:

```text
population = 0
```

Do not spawn population simply because the world exists.

Population should appear when housing exists.

---

# 8. Population Growth

Implement deterministic population growth.

A simple model is sufficient.

For example:

```text
available housing
        ↓
population demand
        ↓
growth
        ↓
population increases
```

Do not implement a realistic demographic simulation yet.

The objective is to establish the simulation architecture.

Population growth must depend on simulation time rather than rendering time.

---

# 9. Growth Rules

Define explicit rules.

For example:

```text
if housing capacity = 0
    population cannot grow

if population < housing capacity
    population may grow

if population >= housing capacity
    population stops growing
```

The exact growth curve should follow `06-population.md` if already specified.

Do not create arbitrary complexity.

---

# 10. Determinism

Population growth must be deterministic.

Given:

```text
same initial simulation state
+
same buildings
+
same number of simulation ticks
```

the final population must be identical.

Do not use:

```ts
Math.random()
Date.now()
performance.now()
```

inside population logic.

If stochastic population events are introduced later, they must use the deterministic simulation random source.

Do not introduce randomness unless required for this step.

---

# 11. Population System

Create the population simulation system in the appropriate domain/engine structure.

For example:

```text
src/domain/population/
```

may contain:

```text
population-state.ts
population-rules.ts
population-system.ts
```

Adapt this to the existing architecture.

The system should conceptually expose:

```text
advancePopulation(state, city, elapsedSimulationTime)
```

or an equivalent pure operation.

One simulation tick should produce deterministic state progression.

---

# 12. Simulation Integration

Population must execute as part of the simulation tick.

Conceptually:

```text
SimulationRuntime
      ↓
SimulationStepper
      ↓
Population System
      ↓
PopulationState
```

Do not put population updates in React.

Do not update population from `requestAnimationFrame`.

Do not update population from Three.js.

---

# 13. System Ordering

Establish an explicit simulation-system order.

For now:

```text
1. Simulation Clock
2. Population
```

Buildings and roads are currently static state.

Do not create an abstract ECS-style scheduler.

A simple explicit order is preferable.

Later this can evolve into:

```text
clock
→ construction
→ population
→ economy
→ transport
→ events
```

but do not implement those systems yet.

---

# 14. Housing Availability

The population system needs to derive:

```text
totalHousingCapacity
```

from the current city.

Do not store the same value independently unless there is a demonstrated performance reason.

Prefer:

```text
CityState
 ↓
Building definitions
 ↓
Derived housing capacity
```

For example:

```text
2 houses × 4 capacity
=
8 housing capacity
```

The exact capacity should come from the building type definition.

---

# 15. Construction Integration

When a house is placed:

```text
house created
 ↓
housing capacity increases
 ↓
population system can respond
```

When a house is removed:

```text
house removed
 ↓
housing capacity decreases
 ↓
population must respect the new capacity
```

Do not allow population to permanently exceed available housing unless the product specification explicitly defines such behavior.

Handle this deterministically.

---

# 16. Population Capacity Rule

Define a clear invariant:

```text
population <= housing capacity
```

for this stage.

If a building is removed and capacity becomes smaller than the current population, do not silently violate the invariant.

Choose a deterministic policy consistent with `06-population.md`.

For this step, the simplest acceptable policy is:

```text
population is capped to available housing capacity
```

If the product document specifies a different transition mechanism, follow that instead.

Do not invent migration, homelessness or mortality systems yet.

---

# 17. Population Growth Rate

Use a deliberately simple rate.

For example:

```text
growth per simulation day
```

or another unit defined by the product documentation.

Avoid updating population by arbitrary values such as:

```ts
population += 1
```

every simulation tick.

Population should evolve at a meaningful simulation timescale.

The rate must be configurable in one place.

---

# 18. Simulation Time Conversion

The existing simulation uses:

```text
1 tick = 1/60 second
```

Population logic should not repeatedly calculate this conversion independently.

Create or reuse a canonical simulation-time representation.

For example:

```text
ticks
simulation seconds
simulation days
```

must have explicit conversion rules.

Avoid scattered literals:

```ts
60
3600
86400
```

throughout population code.

---

# 19. Population Rendering

Population does not require individual citizens.

Instead, the renderer can communicate that a building is inhabited.

Possible minimal visual indicators:

```text
house
  ↓
subtle window/light state
```

or:

```text
building
  +
small population indicator
```

Prefer the first approach if it fits the current visual direction.

Do not create citizen meshes.

Do not create pedestrian particles.

Do not create animated NPCs.

The city should remain a clean architectural model.

---

# 20. Render Snapshot

Extend the render boundary only as necessary.

Conceptually:

```text
RenderSnapshot
 ├── terrain
 ├── buildings
 ├── roads
 └── population
```

Population render data should be minimal.

For example:

```ts
RenderPopulation {
  total
}
```

or building-level occupancy information if required for visual state.

Do not pass the entire `PopulationState` blindly to Three.js.

---

# 21. UI

Introduce a minimal population indicator.

For example:

```text
POPULATION
1,248
```

and:

```text
HOUSING
1,600
```

The UI should display derived simulation information.

It must not own the values.

Do not introduce a complete demographic dashboard.

Do not add:

* age charts;
* employment graphs;
* migration panels;
* happiness dashboards.

Those belong to later systems.

---

# 22. Building Inspector

If Step 3 already has building selection, extend the existing minimal selection UI.

Selecting a house may display:

```text
HOUSE

Residents
4 / 6
```

This is optional if the current UI architecture does not yet support an inspector cleanly.

Do not create a large inspector system solely for this step.

---

# 23. Population and Roads

Do not make roads affect population growth yet.

However, structure the population system so this can later become:

```text
housing
+
accessibility
+
employment
+
services
```

Do not implement accessibility now.

Do not calculate distance to roads.

Do not implement pathfinding.

---

# 24. Population and Economy

Do not implement:

```text
food
water
energy
money
jobs
taxes
production
consumption
```

Population should grow based only on housing capacity and the simplified demographic rule.

The economy will be introduced later.

---

# 25. Population and Simulation Speed

Verify that population responds correctly to:

```text
1×
2×
5×
20×
100×
```

The important invariant is:

```text
same number of simulation ticks
=
same simulation result
```

Changing rendering FPS must not change population.

---

# 26. Large Time Steps

The runtime already has:

```text
max delta
max catch-up
```

Do not bypass these protections.

Population must operate correctly when:

```text
multiple simulation ticks
```

are executed during one render frame.

Do not assume:

```text
one RAF = one simulation tick
```

---

# 27. Performance

Population must remain extremely cheap.

Do not iterate over:

```text
every citizen
```

because citizens do not exist as individual simulation entities.

Prefer aggregate calculations:

```text
total population
total housing
growth
```

This is intentional.

The architecture must eventually support:

```text
10,000
100,000
1,000,000+
```

population without requiring one JavaScript object per citizen.

---

# 28. No Individual Agents

This is a strict non-goal.

Do NOT create:

```text
Citizen
Person
NPC
Agent
ResidentEntity
```

as individual simulation entities.

Do not create:

```text
CitizenManager
PopulationManager
```

as global managers.

Population is a simulation system.

---

# 29. Tests — Population Domain

Add tests for:

### Empty city

```text
0 housing
→ population remains 0
```

### Housing

```text
housing capacity > 0
→ population can grow
```

### Capacity

```text
population never exceeds housing capacity
```

### Growth

Given a fixed number of simulation ticks:

```text
same initial state
→ same population
```

### Building addition

```text
house added
→ housing capacity increases
→ population can subsequently grow
```

### Building removal

```text
house removed
→ housing capacity decreases
→ population respects capacity invariant
```

### Determinism

Run the same simulation twice.

Assert identical population state.

---

# 30. Tests — Simulation Integration

Test that:

```text
simulation tick
 ↓
population system
 ↓
population changes when appropriate
```

Also verify that:

```text
paused simulation
→ population does not change
```

and:

```text
step()
→ exactly one simulation tick
```

produces exactly the expected population progression.

---

# 31. Tests — Speed

Verify that simulation speed affects elapsed simulation time correctly.

Do not make tests depend on actual wall-clock time.

Use controlled runtime updates.

---

# 32. Tests — Rendering

If population affects building appearance:

```text
population = 0
```

and:

```text
population > 0
```

should produce the expected render projection.

Do not write fragile screenshot tests.

---

# 33. E2E

Add at least one browser scenario:

```text
start application
→ build house
→ wait / advance simulation
→ population increases
→ population indicator updates
```

Prefer deterministic test controls rather than waiting several real seconds.

If possible, use the existing `STEP` control to advance simulation deterministically.

A strong E2E scenario is:

```text
place house
→ click STEP repeatedly
→ verify population changes
```

This avoids flaky timing tests.

---

# 34. Reset

When simulation reset occurs:

```text
World
City
Population
Clock
```

must return to a consistent initial state.

If the current reset behavior regenerates the world, preserve that behavior.

Population must never survive a reset accidentally.

---

# 35. Persistence Preparation

Do not implement save/load.

However, ensure `PopulationState` is a plain serializable domain structure.

Avoid:

```text
class instances with hidden mutable state
Map objects unless the serialization architecture already supports them
Three.js objects
browser references
```

The eventual save system must be able to serialize population deterministically.

---

# 36. Architecture Restrictions

Do not create:

```text
GameManager
PopulationManager
CitizenManager
SimulationStore
GlobalStore
```

Do not put population state into React.

Do not put population logic into:

```text
WorldViewport.tsx
BuildingRenderer.ts
ThreeWorldRenderer.ts
```

Do not let rendering determine population.

---

# 37. Validation

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
[ ] empty world starts with zero population
[ ] house increases housing capacity
[ ] population eventually grows
[ ] population never exceeds housing capacity
[ ] removing housing respects the invariant
[ ] paused simulation does not change population
[ ] STEP advances population deterministically
[ ] simulation speed works
[ ] population survives normal simulation ticks
[ ] reset clears population
[ ] renderer remains independent
[ ] React does not own population state
[ ] no individual citizen objects exist
```

---

# 38. Definition of Done

Step 5 is complete only when:

```text
[ ] Population domain exists
[ ] Population state exists
[ ] Housing capacity exists
[ ] House exposes housing capacity
[ ] Population growth rules exist
[ ] Population integrates with simulation ticks
[ ] Population is deterministic
[ ] Population respects housing capacity
[ ] Building placement affects available housing
[ ] Building removal affects available housing
[ ] Population is reset correctly
[ ] Render snapshot exposes required population data
[ ] Minimal population UI exists
[ ] Optional building occupancy display works if implemented
[ ] No individual citizens exist
[ ] No economy exists
[ ] No jobs exist
[ ] No pathfinding exists
[ ] No traffic exists
[ ] Domain tests pass
[ ] Application tests pass
[ ] Simulation tests pass
[ ] E2E tests pass
[ ] pnpm typecheck passes
[ ] pnpm lint passes
[ ] pnpm test passes
[ ] pnpm test:e2e passes
[ ] pnpm build passes
```

---

# 39. Final Report

When finished, return:

```text
## Step 5 — Population & Settlement

### Implemented
- ...
- ...
- ...

### Population
- ...
- ...

### Housing
- ...
- ...

### Simulation
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
- Step 6: ...
```

Do not start Step 6 automatically.
