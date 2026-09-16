# NOVA — Technical Architecture

## Suggested layers
```text
apps / UI
    ↓
application / commands
    ↓
simulation domain
    ↓
state + systems
    ↓
persistence / serialization

renderer consumes snapshots from the simulation boundary
```

## Domain principles
- stable IDs
- explicit state transitions
- deterministic ordering
- pure calculations where possible
- no hidden global mutable state
- no rendering dependency in domain

## Agent rule
Adapt to the repository's actual architecture. Do not create a parallel architecture merely because this document presents an idealized diagram.
