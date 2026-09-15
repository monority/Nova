# NOVA — Technical Architecture

## 1. Stack

```text
Vite
React
TypeScript
Three.js
WebGPU
WebGL2
WGSL
CSS
Vitest
Playwright
```

## 2. Architectural Rule

Dependency direction:

```text
UI
 ↓
Application
 ↓
Simulation Domain
 ↓
Infrastructure / Rendering Adapters
```

The simulation domain must not import React.

## 3. Suggested Structure

```text
src/
├── app/                 # React composition and screen orchestration
├── domain/
│   └── city/            # pure simulation state, commands and domain tests
├── rendering/           # Three.js adapters; never owns gameplay rules
├── ui/                  # presentational controls and inspectors
├── styles/              # global tokens and application styles
└── main.tsx             # single application entry point
```

When a domain grows, split it below `domain/` by ownership (`world/`, `population/`, `economy/`) instead of putting rules in React components. When rendering grows, split `rendering/` by adapter responsibility (`scene/`, `materials/`, `effects/`) without changing domain APIs.

## 4. Domain State

Use plain TypeScript data structures.

Avoid putting simulation state into React state.

## 5. Commands

Player actions become commands.

```ts
type Command =
  | PlaceZoneCommand
  | BuildRoadCommand
  | SetResearchCommand
  | SetPolicyCommand
```

Commands are applied by the simulation.

## 6. Events

Systems may emit domain events.

```text
BuildingCompleted
PopulationMilestoneReached
TechnologyCompleted
ResourceShortageStarted
```

Events are recorded when historically relevant.

## 7. Data-Oriented Simulation

Prefer arrays/maps and predictable iteration for large collections.

Do not introduce a full ECS until profiling proves it necessary.

## 8. Pathfinding

Start with a road graph rather than individual pedestrian navigation.

Later, districts can use hierarchical pathfinding.

## 9. Persistence Boundary

The save format contains domain state only.

Renderer caches, GPU resources and UI state are excluded.

## 10. Versioning

The complete MVP save contract, including the PRNG state, command log, state hash and atomic validation rules, is defined in [20-product-contract.md](./20-product-contract.md). Migration functions must handle older versions without changing active state when validation fails.

## 11. Server

The initial product can be client-first.

A backend is not required for the core simulation.

Backend services can later provide:

- cloud saves;
- public cities;
- sharing;
- leaderboards/scenarios.

Do not introduce backend infrastructure before the local game loop works.
