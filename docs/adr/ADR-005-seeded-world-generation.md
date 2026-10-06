# ADR-005 — Seeded Deterministic World Generation

## Status

Accepted

## Context

NOVA needs large procedural worlds while remaining reproducible for saves, debugging and testing.

## Decision

World generation uses an explicit seed and controlled parameters.

Same seed + same generation parameters must produce the same world for a given compatible world-generation version.

## Alternatives Considered

### Non-deterministic generation

Rejected because reproducing a world or bug becomes difficult.

### Hand-authored complete world

Rejected because the intended world scale and replayability require procedural generation.

## Consequences

Positive:

- reproducible starts;
- easier bug reports;
- compact world initialization data;
- deterministic tests.

Cost:

- generation algorithms become compatibility-sensitive;
- world-generation versions must be considered when persistence evolves.

## Related

- `docs/06-WORLD.md`
- `docs/04-ARCHITECTURE.md`
- `docs/VALIDATION.md`
