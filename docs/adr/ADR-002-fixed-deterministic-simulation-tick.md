# ADR-002 — Fixed Deterministic Simulation Tick

## Status

Accepted

## Context

NOVA needs reproducible simulation behavior, save/load reliability and meaningful time acceleration.

Frame-rate-dependent simulation would make results dependent on rendering performance.

## Decision

Simulation advances through a fixed logical tick.

Rendering runs independently.

Time controls modify how simulation ticks are processed, not the underlying simulation rules.

## Alternatives Considered

### Frame-dependent simulation

Rejected because results can vary with frame rate.

### Fully real-time variable timestep

Deferred because deterministic replay and testing become harder.

## Consequences

Positive:

- reproducibility;
- deterministic tests;
- stable saves;
- clearer time acceleration.

Cost:

- the engine must manage tick accumulation and speed control explicitly.

## Related

- `docs/04-ARCHITECTURE.md`
- `docs/05-SIMULATION.md`
- `docs/VALIDATION.md`
