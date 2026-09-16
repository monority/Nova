# NOVA — Canonical Simulation

## Definition

The canonical simulation is the authoritative representation of the world. Rendering is only a projection of it.

## Canonical state contains

- world identity and seed;
- simulation tick/time;
- stable entity IDs;
- buildings and lifecycle state;
- population/colonists and relationships;
- roads/infrastructure;
- zones and other explicit simulation inputs;
- resources/flows once implemented;
- deterministic configuration required to reproduce behavior.

## Canonical state excludes

- GPU handles;
- Three.js objects;
- materials/textures;
- React state;
- DOM state;
- transient animation progress;
- hover state;
- camera state unless camera state is explicitly a gameplay mechanic;
- arbitrary renderer caches.

## State transitions

Simulation should conceptually be:

```text
previous canonical state
+ explicit command/input
+ deterministic rules
        ↓
next canonical state
```

Avoid hidden mutations and implicit frame-based gameplay.

## Phase ordering

The phase order is part of the simulation contract. If a later phase depends on a result produced by an earlier phase, that dependency must be explicit.

A newly created road, for example, should affect subsequent development decisions rather than causing a recursive chain of development → road → development within the same calculation unless explicitly designed.

## Hashing

Canonical state hashing must:

- include all simulation-critical fields;
- exclude rendering-only data;
- use stable ordering;
- remain reproducible for equivalent states.

Adding a simulation-critical field requires considering its persistence and hash representation.

## Migration rule

Changing canonical state shape is a schema change even if TypeScript compiles.

Such a change must consider:

- save version;
- validation;
- deterministic hash;
- tests;
- backward compatibility or explicit rejection.
