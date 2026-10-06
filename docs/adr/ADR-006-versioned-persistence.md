# ADR-006 — Versioned Persistence

## Status

Accepted

## Context

NOVA is a long-running simulation game. Saves must remain understandable as the implementation evolves.

## Decision

Save data is explicitly versioned.

Loading code must know which save versions it supports and how migrations are handled.

Rendering objects and UI state are not canonical save data.

## Alternatives Considered

### Serialize runtime objects

Rejected because runtime objects are unstable and renderer-specific.

### No version field

Rejected because future changes would make compatibility ambiguous.

## Consequences

Positive:

- explicit compatibility;
- safer migrations;
- deterministic state restoration.

Cost:

- migrations must be written when the schema changes.

## Related

- `docs/SAVE-FORMAT.md`
- `docs/04-ARCHITECTURE.md`
