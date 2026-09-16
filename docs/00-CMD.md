# NOVA — CMD / Source of Truth

## Purpose

This is the highest-level instruction set for humans and coding agents working on NOVA.

NOVA is a **minimal, visual and causal colony/city simulation**. The engineering objective is to create a coherent simulation first and add complexity only when previous systems justify it.

## Non-negotiable rule

> **Every important simulation outcome must have an understandable cause.**

Bad:

```text
population += 10 because timer elapsed
```

Good:

```text
housing + food + water + viable services
→ conditions for population growth
```

## Architecture rule

The simulation owns truth. Rendering, UI and debugging are projections or interfaces around that truth.

```text
UI / Input
    ↓
Application / Commands
    ↓
Domain + Simulation
    ↓
Canonical State
    ├──→ Render Snapshot → Three.js
    ├──→ UI Queries
    └──→ Persistence
```

Domain code must not depend on React, Three.js, browser APIs, rendering objects, network APIs or persistence implementations.

## Preserve

During the foundation reset, preserve infrastructure that remains compatible:

- Three.js/rendering infrastructure;
- camera and controls;
- selection and inspection;
- grid/coordinates/placement;
- simulation clock;
- deterministic tick/state hashing;
- domain/system boundaries;
- registries and existing useful infrastructure;
- HUD/UI infrastructure;
- debug tooling;
- tests and E2E/GPU validation;
- asset pipeline.

Do not preserve gameplay code merely because it already exists.

## Freeze

Do not add:

- decorative systems;
- speculative resources;
- generic AI managers;
- broad refactors unrelated to the current task;
- future roadmap mechanics “while here”.

## Simulation hierarchy

The long-term dependency direction is:

```text
Infrastructure
→ services / capacity
→ needs
→ agents
→ work / economy
→ production
→ transport
→ settlement growth
→ specialization / technology
```

This is a dependency model, not a requirement that every system exists in the MVP.

## Important distinction

Never collapse these concepts into one boolean:

- **Infrastructure** — a physical/system object exists.
- **Operational state** — the object is able to operate.
- **Service** — operational infrastructure exposes usable capacity.
- **Need** — an agent requires something.
- **Consumption** — a need uses a good/service over time.
- **Outcome** — satisfaction/deprivation changes state.

## Agent protocol

Before coding:

1. inspect the real repository;
2. inspect current tests and package boundaries;
3. read the relevant design documents;
4. identify existing implementations that overlap the task;
5. state what will be preserved, replaced or introduced.

During coding:

- make the smallest coherent change;
- keep domain logic pure where practical;
- use stable deterministic IDs;
- avoid hidden state and hidden randomness;
- do not introduce abstractions without a concrete use case;
- do not mutate canonical state from rendering/UI code.

After coding:

- run targeted tests;
- run the full test suite;
- run typecheck/lint/build when available;
- run deterministic repeat checks for simulation changes;
- run browser/E2E checks when relevant;
- report blockers honestly.

## Completion status

Use:

```text
COMPLETE
```

only when required verification passes.

Use:

```text
PARTIAL
```

when implementation exists but non-critical verification remains.

Use:

```text
BLOCKED
```

when required verification or an external dependency prevents completion.
