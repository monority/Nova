# NOVA — Save & Persistence

## Canonical save
A save represents canonical simulation state, not renderer state.

Persist:
- world seed/config
- simulation time
- buildings
- infrastructure
- colonists
- services/capacities
- economy state when introduced
- deterministic identifiers

Do not persist:
- Three.js meshes
- camera matrices unless explicitly desired as UI state
- transient render caches
- derived values that can safely be recomputed

## Versioning
Save format needs an explicit version from the first real save implementation.
