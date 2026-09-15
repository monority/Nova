# NOVA — Project Architecture & Code Organization

> **Status:** Authoritative
> **Purpose:** Define the canonical project structure, architectural boundaries, dependency rules and maintenance conventions for NOVA.

---

# 1. Purpose

This document is the **source of truth for project organization**.

Every implementation, refactor and new feature must respect the principles defined here.

The objective is not to maximize abstraction.

The objective is to make NOVA:

* easy to understand;
* easy to modify;
* deterministic;
* testable;
* performant;
* scalable;
* resistant to architectural drift.

When a local implementation conflicts with this document, the implementation should normally be changed rather than weakening the architecture.

---

# 2. Core Architectural Principles

## 2.1 Domain First

The game simulation is the core of NOVA.

The domain must not depend on:

* React;
* Next.js;
* Three.js;
* WebGPU;
* browser APIs;
* DOM APIs;
* persistence providers.

The simulation must be executable independently from the UI and renderer.

---

## 2.2 Renderer Is a Consumer

The renderer observes simulation state.

```text
Simulation
    ↓
Render Snapshot
    ↓
Renderer
```

Never:

```text
Renderer
    ↓
Game Rules
```

Three.js objects must never become the source of truth for gameplay.

---

## 2.3 React Is Not the Game Engine

React owns:

* interface;
* menus;
* inspectors;
* controls;
* overlays;
* accessibility;
* UI state.

React does not own:

* simulation ticks;
* population state;
* building state;
* economy;
* pathfinding;
* terrain generation;
* renderer lifecycle.

---

## 2.4 Explicit Dependencies

Dependencies must flow in one direction.

```text
App / UI
   ↓
Application
   ↓
Domain
   ↓
Pure utilities
```

Infrastructure adapters may depend on domain contracts.

Domain code must never depend on infrastructure.

---

# 3. Canonical Repository Structure

The preferred structure is:

```text
nova/
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── ...
│
├── src/
│   │
│   ├── app/
│   │   ├── bootstrap/
│   │   ├── providers/
│   │   └── composition/
│   │
│   ├── domain/
│   │   │
│   │   ├── world/
│   │   ├── city/
│   │   ├── construction/
│   │   ├── population/
│   │   ├── economy/
│   │   ├── technology/
│   │   ├── events/
│   │   └── simulation/
│   │
│   ├── application/
│   │   ├── commands/
│   │   ├── queries/
│   │   ├── services/
│   │   └── orchestration/
│   │
│   ├── engine/
│   │   ├── simulation/
│   │   ├── spatial/
│   │   ├── pathfinding/
│   │   ├── terrain/
│   │   └── random/
│   │
│   ├── rendering/
│   │   ├── core/
│   │   ├── scene/
│   │   ├── camera/
│   │   ├── terrain/
│   │   ├── buildings/
│   │   ├── roads/
│   │   ├── traffic/
│   │   ├── effects/
│   │   ├── materials/
│   │   ├── shaders/
│   │   └── postprocessing/
│   │
│   ├── ui/
│   │   ├── components/
│   │   ├── panels/
│   │   ├── inspector/
│   │   ├── toolbar/
│   │   ├── timeline/
│   │   └── hud/
│   │
│   ├── infrastructure/
│   │   ├── persistence/
│   │   ├── storage/
│   │   └── serialization/
│   │
│   ├── shared/
│   │   ├── types/
│   │   ├── math/
│   │   ├── collections/
│   │   ├── validation/
│   │   └── constants/
│   │
│   └── styles/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
│
├── docs/
│
├── public/
│
├── package.json
├── tsconfig.json
├── next.config.ts
└── ...
```

The exact physical location may evolve, but the **architectural responsibilities must remain equivalent**.

For the current MVP, NOVA uses Vite as its client application shell. The top-level `app/` and `next.config.ts` entries above are Next.js-compatible examples, not MVP requirements. With Vite, `src/app/bootstrap/` and `src/app/composition/` provide the application entrypoint and composition boundary.

---

# 4. Domain Structure

The domain is divided by business capability.

```text
src/domain/
├── world/
├── city/
├── construction/
├── population/
├── economy/
├── technology/
├── events/
└── simulation/
```

Each domain module should contain its own concepts.

Example:

```text
domain/population/
├── population.ts
├── population-group.ts
├── growth.ts
├── migration.ts
├── needs.ts
├── satisfaction.ts
└── index.ts
```

Do not create one enormous:

```text
simulation.ts
```

containing the entire game.

---

# 5. Domain Module Rules

Each domain module may contain:

```text
entities/
value-objects/
rules/
services/
events/
types/
```

Do not create all folders by default.

Create them only when they have meaningful content.

A small module should remain small.

---

# 6. Entity vs Value Object

Use entities when identity matters.

Example:

```ts
interface Building {
  id: BuildingId
  type: BuildingType
  position: GridPosition
}
```

Use value objects for immutable concepts.

Examples:

```ts
type Population = number
type Energy = number
type GridPosition = {
  x: number
  y: number
}
```

Avoid classes unless they provide real behavioral value.

Prefer immutable/plain data structures for simulation state.

---

# 7. IDs

Every persistent domain entity gets a stable ID.

Examples:

```ts
type BuildingId = string & { readonly __brand: "BuildingId" }
type RoadId = string & { readonly __brand: "RoadId" }
type ZoneId = string & { readonly __brand: "ZoneId" }
```

Do not use array indexes as persistent IDs.

---

# 8. World Ownership

`world` owns:

* terrain;
* cells;
* water;
* elevation;
* buildability;
* resources;
* world seed.

It does not own:

* population;
* economy;
* buildings;
* UI;
* rendering.

---

# 9. City Ownership

`city` owns city-level spatial structures.

```text
City
├── districts
├── buildings
├── roads
├── infrastructure
└── zones
```

City does not calculate population growth or technology progression.

Those belong to their respective domains.

---

# 10. Construction Ownership

`construction` owns rules concerning:

* placement;
* construction validity;
* construction costs;
* development pressure;
* building completion;
* upgrades.

Example:

```ts
canBuild(...)
calculateConstructionCost(...)
findDevelopmentCandidate(...)
```

It does not render previews.

Rendering belongs to `rendering`.

---

# 11. Population Ownership

`population` owns:

* population groups;
* growth;
* migration;
* housing demand;
* employment;
* needs;
* satisfaction.

It does not directly create buildings.

Instead:

```text
Population
    ↓
Demand
    ↓
Construction
```

---

# 12. Economy Ownership

`economy` owns:

* resources;
* production;
* consumption;
* storage;
* balances;
* shortages.

Economy must not directly manipulate Three.js objects or UI state.

---

# 13. Technology Ownership

`technology` owns:

* technology definitions;
* prerequisites;
* research;
* completion;
* technology effects.

Technology effects should be represented as domain-level modifiers.

Example:

```ts
interface TechnologyEffect {
  type: TechnologyEffectType
  value: number
}
```

Avoid direct mutation of unrelated systems from technology code.

---

# 14. Events Ownership

`events` owns historical/domain events.

Examples:

```text
SettlementFounded
BuildingCompleted
PopulationMilestoneReached
TechnologyCompleted
ResourceShortageStarted
```

Events should describe facts.

Avoid event names such as:

```text
DoSomethingInteresting
UpdateCity
RefreshUI
```

---

# 15. Simulation Ownership

`simulation` is responsible for orchestration.

It determines:

```text
which system runs
when it runs
in which order
```

It should not contain the implementation of every system.

Example:

```ts
runSimulationTick(state, context)
```

may orchestrate:

```text
updateInfrastructure()
updatePopulation()
updateEconomy()
updateConstruction()
updateTechnology()
processEvents()
```

---

# 16. Simulation System Contract

Systems should have predictable contracts.

Example:

```ts
interface SimulationSystem<TState, TContext> {
  update(
    state: TState,
    context: TContext
  ): SystemResult
}
```

Do not force every system into the same abstraction if the abstraction makes the code worse.

The contract exists to establish predictable boundaries, not to satisfy a pattern.

---

# 17. Commands

All player mutations should pass through commands.

Example:

```ts
type Command =
  | PlaceZoneCommand
  | BuildRoadCommand
  | DemolishBuildingCommand
  | SetResearchCommand
  | SetPolicyCommand
```

Commands represent **intent**.

They should not contain rendering logic.

---

# 18. Command Pipeline

```text
UI
 ↓
Command
 ↓
Application
 ↓
Domain validation
 ↓
Simulation state mutation
 ↓
Domain events
 ↓
Render snapshot
```

The UI should never directly mutate domain state.

---

# 19. Queries

Queries are read-only.

Examples:

```ts
getSelectedBuilding(...)
getCityMetrics(...)
getResourceBalance(...)
getDistrictSummary(...)
```

Queries may optimize data for UI consumption.

They must not mutate simulation state.

---

# 20. Application Layer

`application/` coordinates use cases.

Examples:

```text
createWorld
startSimulation
executeCommand
saveGame
loadGame
advanceSimulation
```

Application code may depend on domain.

It should not contain game rules that belong in the domain.

---

# 21. Engine

`engine/` contains low-level computational infrastructure.

Examples:

```text
simulation runtime
spatial indexing
pathfinding
terrain generation
seeded random
```

Engine code should remain generic where practical.

Do not move ordinary domain rules into `engine` merely because they are computational.

---

# 22. Seeded Randomness

All procedural randomness goes through one controlled abstraction.

```ts
interface RandomSource {
  next(): number
  integer(min: number, max: number): number
}
```

Simulation and generation receive a seeded source.

Never use:

```ts
Math.random()
```

inside deterministic game logic.

---

# 23. Rendering Architecture

Rendering is isolated.

```text
src/rendering/
├── core/
├── scene/
├── camera/
├── terrain/
├── buildings/
├── roads/
├── traffic/
├── effects/
├── materials/
├── shaders/
└── postprocessing/
```

Each rendering subsystem owns visual representation only.

---

# 24. Renderer State

Renderer state may contain:

* Three.js scene;
* meshes;
* materials;
* GPU buffers;
* camera;
* render targets;
* caches.

Renderer state must never be serialized as game state.

---

# 25. Render Snapshot

The simulation exposes a rendering-friendly representation.

Example:

```ts
interface RenderSnapshot {
  time: number
  terrain: TerrainRenderData
  buildings: BuildingRenderData[]
  roads: RoadRenderData[]
  traffic: TrafficRenderData
  effects: EffectRenderData
}
```

The renderer consumes snapshots.

The renderer may derive caches from them.

---

# 26. React / Renderer Boundary

React should have a small integration surface.

Conceptually:

```tsx
<CityViewport />
```

Inside the viewport:

```text
initialize renderer
connect simulation
render frames
dispose resources
```

Do not expose hundreds of renderer details through React props.

---

# 27. UI Structure

UI should be organized by user-facing responsibility.

```text
ui/
├── hud/
├── toolbar/
├── inspector/
├── timeline/
├── panels/
└── components/
```

Avoid organizing the UI purely by primitive:

```text
Button/
Card/
Panel/
Modal/
```

Generic primitives belong in `components/`.

Feature UI belongs in its functional area.

---

# 28. Shared Code

`shared/` is intentionally small.

Allowed:

* generic math;
* validation helpers;
* generic collection utilities;
* primitive shared types;
* constants.

Not allowed:

```text
shared/game.ts
shared/utils.ts
shared/helpers.ts
```

that become dumping grounds.

Every shared utility must have a clear reason to exist.

---

# 29. No God Files

Avoid files such as:

```text
game.ts
simulation.ts
city.ts
utils.ts
renderer.ts
types.ts
```

when they grow beyond a coherent responsibility.

A file should answer one clear question.

Bad:

```text
city.ts
```

containing:

* population;
* economy;
* rendering;
* construction;
* roads;
* technology.

Good:

```text
city-state.ts
building.ts
road.ts
district.ts
```

with explicit ownership.

---

# 30. No God Objects

Avoid:

```ts
class Game {
  world
  city
  population
  economy
  renderer
  ui
  audio
  save
  ...
}
```

Prefer composition:

```text
GameRuntime
├── SimulationRuntime
├── RendererRuntime
├── InputController
└── PersistenceService
```

Each runtime has one responsibility.

---

# 31. State Ownership

Every piece of state must have exactly one owner.

Example:

```text
Population
→ Population Domain

Selected Building
→ UI/Application state

Camera position
→ Renderer

Simulation time
→ Simulation Domain

Saved game
→ Persistence
```

Duplicated authoritative state is forbidden.

---

# 32. Derived State

Do not store values that can safely be calculated.

Bad:

```ts
population
availableHousing
housingDeficit
```

if `housingDeficit` can always be calculated from the first two.

Prefer:

```ts
housingDeficit =
  Math.max(0, population - housingCapacity)
```

Persist only state that is required to reconstruct the simulation.

---

# 33. Immutable Boundaries

Prefer immutable state transitions at system boundaries.

Conceptually:

```text
State
 ↓
System
 ↓
New State
```

Internal performance-sensitive structures may use controlled mutation.

The important rule is that mutation must remain localized and explicit.

---

# 34. Performance-Sensitive Code

Do not apply functional abstractions blindly to hot loops.

For large collections:

```ts
for (...)
```

may be preferable to:

```ts
array
  .filter(...)
  .map(...)
  .reduce(...)
```

Measure before optimizing.

Readable code remains the default.

---

# 35. Data-Oriented Design

Large simulation collections should favor contiguous/simple data.

Potential candidates:

* buildings;
* population groups;
* traffic flows;
* terrain cells.

Do not introduce ECS merely because NOVA is a simulation.

Use ECS only if profiling and architectural requirements justify it.

---

# 36. Pathfinding

Pathfinding belongs to `engine/pathfinding`.

Domain systems may request paths through a defined interface.

Example:

```ts
interface PathfindingService {
  findPath(
    from: NodeId,
    to: NodeId
  ): Path
}
```

The domain must not depend on a specific pathfinding algorithm.

---

# 37. Persistence

Persistence belongs to:

```text
src/infrastructure/persistence/
```

Responsibilities:

* serialization;
* validation;
* save/load;
* migrations;
* storage adapters.

Domain objects should not know whether storage is:

* IndexedDB;
* localStorage;
* filesystem;
* cloud;
* server.

---

# 38. Serialization

Never serialize:

* Three.js objects;
* renderer caches;
* React state;
* DOM nodes;
* functions;
* GPU resources.

Serialize only canonical game state.

---

# 39. Infrastructure Interfaces

External services should be hidden behind interfaces.

Example:

```ts
interface SaveRepository {
  save(save: SaveGame): Promise<void>
  load(id: string): Promise<SaveGame | null>
}
```

The implementation can later change without changing domain code.

---

# 40. Client Application Shell Rules

The client application shell is currently Vite.

Do not make Vite, React or a future Next.js shell the simulation architecture.

Browser/client boundaries must be explicit.

The game viewport is client-side.

Static documentation and future online functionality may use server capabilities independently if the product later adopts them.

---

# 41. Browser APIs

Browser-specific APIs belong outside the domain.

Examples:

```text
window
document
localStorage
IndexedDB
requestAnimationFrame
WebGPU
Canvas
```

They must not leak into domain modules.

---

# 42. Import Rules

Preferred dependency direction:

```text
ui
 ↓
application
 ↓
domain

rendering
 ↓
application/domain contracts

infrastructure
 ↓
domain contracts

engine
 ↓
low-level/shared abstractions
```

Forbidden:

```text
domain → ui
domain → rendering
domain → Vite / React / Next.js
domain → browser
ui → database implementation
renderer → React state
```

---

# 43. Circular Dependencies

Circular dependencies are forbidden.

If:

```text
A → B
B → A
```

appears, stop and redesign the boundary.

Possible solutions:

* extract a shared contract;
* move orchestration upward;
* invert the dependency;
* split the module.

Do not solve architectural cycles with arbitrary barrel exports.

---

# 44. Barrel Files

Use `index.ts` only at deliberate public boundaries.

Avoid massive global barrels such as:

```ts
src/index.ts
```

that export the entire application.

Prefer:

```ts
domain/population/index.ts
domain/economy/index.ts
```

when a module has a meaningful public API.

---

# 45. Public APIs

Each major module should expose the smallest useful API.

Example:

```ts
export {
  PopulationState,
  updatePopulation,
  calculateSatisfaction
}
```

Internal implementation details remain private.

---

# 46. Types

Do not create a global type dump.

Bad:

```text
shared/types/
└── everything.ts
```

Prefer domain-local types:

```text
domain/population/types.ts
domain/economy/types.ts
domain/city/types.ts
```

A type belongs to the module that owns its meaning.

---

# 47. Constants

Constants should live near the system that owns them.

Bad:

```text
shared/constants/game.ts
```

containing every number in NOVA.

Good:

```text
domain/economy/constants.ts
domain/population/constants.ts
rendering/constants.ts
```

Only truly cross-cutting constants belong in `shared`.

---

# 48. Configuration

Separate:

```text
Game Rules
Runtime Configuration
Visual Configuration
Environment Configuration
```

Do not mix them.

Example:

```text
domain/
→ simulation rules

application/
→ runtime options

rendering/
→ visual quality

environment variables
→ infrastructure
```

---

# 49. Error Handling

Distinguish:

### Domain errors

Invalid game action.

Example:

```text
Cannot build on water.
```

### Infrastructure errors

Storage/network/browser failure.

### Programmer errors

Broken invariant or impossible state.

Do not silently swallow errors.

---

# 50. Validation

Validate external input at boundaries.

Examples:

* imported save;
* URL parameters;
* user commands;
* configuration;
* generated world data.

Once inside a trusted domain boundary, avoid redundant validation everywhere.

---

# 51. Testing Structure

Tests follow architecture.

```text
tests/
├── unit/
│   ├── domain/
│   └── engine/
├── integration/
│   ├── simulation/
│   └── persistence/
├── e2e/
└── fixtures/
```

Domain tests should not require a browser.

---

# 52. Test Priority

Priority:

```text
1. Domain rules
2. Simulation determinism
3. Persistence
4. Application workflows
5. Rendering contracts
6. UI
7. E2E
```

Do not build a huge snapshot-test suite for implementation details.

---

# 53. Deterministic Test Rule

Every simulation test should make its randomness explicit.

Bad:

```ts
createWorld()
```

with hidden random state.

Good:

```ts
createWorld({ seed: 4242 })
```

---

# 54. Feature Development Workflow

Every new feature should follow:

```text
1. Define domain responsibility
2. Define state
3. Define commands
4. Define simulation rules
5. Define derived data
6. Define rendering requirements
7. Define UI
8. Add tests
9. Profile if performance-sensitive
```

Do not begin with UI components.

---

# 55. New Feature Placement

Ask:

> Which system owns the rule?

Examples:

### New building type

```text
domain/city
+
domain/construction
+
rendering/buildings
```

### New resource

```text
domain/economy
```

### New technology

```text
domain/technology
```

### New UI panel

```text
ui/
```

### New shader

```text
rendering/shaders
```

### New save format

```text
infrastructure/persistence
```

---

# 56. Refactoring Rule

Before adding an abstraction, ask:

1. Is the responsibility duplicated?
2. Is the concept stable?
3. Does the abstraction reduce coupling?
4. Does it make testing easier?
5. Does it improve future changeability?

If not, keep the code local.

---

# 57. Avoid Premature Abstractions

Do not create:

```text
IUniversalBuildingFactory
IGameSystemRegistry
IAbstractSimulationProvider
BaseEntityManager
GenericRepository<T>
```

without a demonstrated need.

Prefer concrete implementations first.

Abstract when a real variation exists.

---

# 58. Naming

Use explicit names.

Prefer:

```text
PopulationGrowthSystem
RoadConnectivityService
BuildingPlacementValidator
SimulationClock
RenderSnapshot
```

Avoid:

```text
Manager
Helper
Utils
Processor
Handler
Service
```

unless the responsibility is actually clear from the full name.

---

# 59. File Naming

Use kebab-case:

```text
population-group.ts
simulation-clock.ts
building-placement.ts
render-snapshot.ts
```

React components:

```text
CityViewport.tsx
Timeline.tsx
BuildingInspector.tsx
```

---

# 60. Domain Naming

Use domain vocabulary consistently.

Do not alternate between:

```text
House
Residence
ResidentialBuilding
HousingUnit
```

unless these are actually different concepts.

Create a glossary w
