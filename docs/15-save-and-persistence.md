# NOVA — Save & Persistence

## 1. Requirements

A player must be able to:

- create a civilization;
- save it;
- close the application;
- reload it;
- continue deterministically.

## 2. Save Structure

The complete schema is `SaveGameV1` in [20-product-contract.md](./20-product-contract.md). It includes the simulation tick, PRNG state, ordered command log and state hash. Renderer caches, GPU resources and UI state are never serialized.

## 3. Local Saves

MVP:

- IndexedDB or equivalent browser storage;
- one manual save slot;
- one autosave slot;
- manual save.

## 4. Autosave

Autosave should occur:

- after meaningful milestones;
- at configurable intervals;
- before leaving a session when practical.

Do not save every simulation tick.

## 5. Migration

Every format change increments `formatVersion`.

```text
v1
→ migration
→ v2
```

Migrations must be deterministic and tested.

Writes are atomic. A save is validated before replacing a slot, and invalid or corrupted data must not mutate the active session. The MVP must pass the save, reload and 100-tick continuation gate in [20-product-contract.md](./20-product-contract.md).

## 6. Sharing

Later, provide a shareable representation containing:

```text
seed
+
compressed command history or serialized state
```

The recipient should be able to reconstruct the city.

## 7. Screenshot / Export

Post-MVP:

- clean screenshot mode;
- high-resolution export;
- city metadata card.

## 8. Security

Never trust imported save data.

Validate:

- numeric bounds;
- enum values;
- collection sizes;
- version;
- references.

## 9. Cloud Saves

Optional future service.

Cloud persistence must not become a prerequisite for playing the core game.
