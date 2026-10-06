# ADR-003 — Aggregate Logistics for MVP

## Status

Accepted

## Context

The game should visibly contain couriers, vehicles and transport infrastructure, but simulating every delivery as an independent agent would add complexity and performance cost without being necessary to prove the core optimization loop.

## Decision

MVP logistics are aggregate.

The simulation calculates supply, demand, storage, capacity, routes, distance and congestion at a system level.

Visible vehicles may represent aggregate flows.

## Alternatives Considered

### Individual delivery agents

Rejected for MVP due to unnecessary complexity and cost.

### No visible transport representation

Rejected because logistics must remain visually legible and part of the city's identity.

## Consequences

Positive:

- scalable initial simulation;
- clear optimization variables;
- lower implementation complexity.

Cost:

- visible vehicles are not necessarily one-to-one with economic transactions;
- later high-fidelity transport may require an additional presentation layer.

## Related

- `docs/05-SIMULATION.md`
- `docs/10-VISUAL-DIRECTION.md`
