# ADR-001 — Simulation Independent from Rendering

## Status

Accepted

## Context

NOVA combines a deep simulation with a 3D visual presentation.

Coupling simulation rules to React or Three.js would make deterministic testing, save/load, debugging and future performance work harder.

## Decision

The simulation is an independent domain layer.

React and Three.js consume simulation/application data and do not own canonical simulation state.

## Alternatives Considered

### Rendering-owned state

Rejected because simulation behavior would become coupled to frame rate and presentation.

### React global state as simulation source of truth

Rejected because domain behavior would become coupled to UI lifecycle.

### Full ECS from the beginning

Deferred because MVP evidence does not justify the complexity.

## Consequences

Positive:

- deterministic simulation;
- easier unit testing;
- easier save/load;
- independent render rate;
- clearer architecture.

Cost:

- explicit boundaries between simulation and presentation;
- render snapshots/selectors may be required.

## Related

- `docs/04-ARCHITECTURE.md`
- `docs/05-SIMULATION.md`
