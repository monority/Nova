# NOVA — Rendering Architecture

## Boundary
Simulation state must not depend on Three.js objects.

Prefer:

`Simulation Domain → Render Snapshot / Projection → Three.js Renderer`

## Rules
- domain code is Three.js-free
- renderer consumes immutable/controlled presentation data
- visual state derives from simulation state
- selection references stable IDs
- render interpolation must not mutate canonical simulation state

## Why
This permits deterministic simulation, headless tests, save/load and alternative render modes.
