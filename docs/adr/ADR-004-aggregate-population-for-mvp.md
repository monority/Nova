# ADR-004 — Aggregate Population for MVP

## Status

Accepted

## Context

NOVA may eventually represent large civilizations, but individual simulation for every citizen is not necessary to prove population, needs, workforce and growth.

## Decision

Population is aggregate-first.

Individuals are represented visually as presentation entities rather than canonical simulation actors.

## Alternatives Considered

### Full individual citizen simulation

Deferred because it would increase CPU, memory, pathfinding and state complexity.

### Completely invisible population

Rejected because inhabitants must remain visually present enough to communicate that the city is alive.

## Consequences

Positive:

- predictable scaling;
- simple population rules;
- easier persistence;
- easier deterministic testing.

Cost:

- individual emergent stories are not represented in the MVP.

## Related

- `docs/05-SIMULATION.md`
- `docs/02-MVP.md`
