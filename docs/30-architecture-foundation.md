# NOVA — Architecture Foundation

## Objective

Establish a stable architecture before adding more gameplay systems.

The architecture must make it difficult to accidentally place business rules in UI/rendering code and easy to test the simulation without a browser.

## Canonical flow

```text
User intent
    ↓
Command / application boundary
    ↓
Pure domain operation(s)
    ↓
Simulation phase(s)
    ↓
Canonical SimulationState
    ↓
┌───────────────┬──────────────┬──────────────┐
│ RenderSnapshot│ UI queries   │ Persistence  │
└───────────────┴──────────────┴──────────────┘
```

## Recommended conceptual structure

```text
src/
├── domain/
│   ├── world/
│   ├── building/
│   ├── colonist/
│   ├── housing/
│   ├── roads/
│   ├── economy/
│   └── simulation/
├── application/
│   ├── commands/
│   ├── queries/
│   └── persistence/
├── rendering/
└── ui/
```

The real repository structure may differ. The dependency rules matter more than folder names.

## Dependency direction

Allowed direction:

```text
ui → application → domain
rendering → queries/domain projections
persistence → canonical state contracts
```

Domain must not import upward.

Forbidden examples:

```text
Domain → React
Domain → Three.js
Domain → window
Domain → localStorage
Domain → fetch
Domain → renderer
```

## Canonical state

There must be one authoritative simulation state.

It contains only information necessary to reproduce and advance the world:

- world identity/seed;
- simulation time/tick;
- stable entities;
- lifecycle state;
- relationships;
- infrastructure;
- resources/flows when implemented;
- agent state;
- deterministic simulation configuration.

It does not contain:

- meshes;
- materials;
- GPU handles;
- React state;
- transient animation state;
- DOM nodes;
- renderer caches.

## Simulation API

Prefer explicit functions such as:

```ts
advanceSimulation(state, command): SimulationState
```

or an equivalent phase-based composition.

Avoid a giant mutable `GameManager` containing all gameplay logic.

## Commands vs queries

Commands change simulation state.

Queries derive information from state without changing it.

Examples:

```text
placeBuilding        → command
advanceTick          → command
assignResidence      → command
getHousingCapacity   → query
getInspection       → query
getRenderSnapshot    → query
```

## Derived state

Prefer deriving values that can be recomputed safely:

- occupancy ratio;
- available housing;
- network influence;
- service coverage;
- display labels;
- inspection explanations.

Do not persist derived values unless there is a demonstrated deterministic/performance reason.

## Phase boundaries

Simulation phases must have explicit order and responsibilities.

A phase should document:

- inputs;
- outputs;
- canonical mutations;
- derived calculations;
- ordering dependencies;
- determinism requirements;
- tests.

A new phase must not secretly re-run another phase.

## Foundation reset rule

Before restructuring existing code:

1. inventory current state;
2. identify canonical state;
3. map dependencies;
4. identify domain leaks;
5. identify duplicate sources of truth;
6. identify validated behavior worth retaining;
7. define the target boundary;
8. migrate incrementally.

Do not perform a large blind rewrite.

## Abstraction rule

Do not create:

- generic `EntityManager`;
- generic `SystemManager`;
- generic `EventBus`;
- generic repository framework;
- service locator;
- dependency injection framework;
- ECS framework;
- AI framework;

unless a concrete current use case requires it and the decision is documented.

## Rendering boundary

Rendering receives projections of canonical state.

```text
canonical state
    ↓
toRenderSnapshot()
    ↓
renderer
```

A renderer must never decide that a building is operational, a colonist is hungry, or a road should exist.
