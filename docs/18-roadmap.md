# NOVA — Roadmap

## Phase 0 — Foundation

Deliver:

- Vite application;
- TypeScript domain;
- deterministic seed;
- simulation clock;
- Three.js renderer;
- camera;
- basic terrain.

Exit criterion:

> An empty generated world can run deterministically at 60 FPS and produce a stable state hash for 1,000 ticks.

## Phase 1 — First Settlement

Deliver:

- buildable grid;
- residential zoning;
- road drawing;
- procedural houses;
- basic population;
- time controls.

Exit criterion:

> A new player can place a valid road and zone, then see the first house complete within 60 seconds.

## Phase 2 — Living City

Deliver:

- commercial;
- industrial;
- food;
- energy;
- materials;
- traffic flows;
- day/night.

Exit criterion:

> A healthy test settlement reaches 50 people within 15 minutes at 1x, with visible food, energy and material flows.

## Phase 3 — Vertical Slice

Deliver:

- polished art direction;
- lighting;
- building variation;
- traffic visualization;
- contextual inspector;
- save/load.

Exit criterion:

> The MVP acceptance gates in [20-product-contract.md](./20-product-contract.md) pass, including save/reload, accessibility and performance.

## Phase 4 — Civilization

Deliver:

- research;
- technology progression;
- advanced buildings;
- district identity;
- historical timeline.

## Phase 5 — Autonomy

Deliver:

- policies;
- automated infrastructure;
- autonomous transport;
- AI-assisted city decisions.

## Phase 6 — World Expansion

Deliver:

- larger maps;
- richer terrain;
- bridges;
- coastlines;
- multiple city regions.

## Phase 7 — Productization

Deliver:

- polished onboarding;
- scenarios;
- sharing;
- export;
- accessibility refinement;
- performance optimization.

## Phase 8 — Optional Online Layer

Only if product direction justifies it:

- public cities;
- community gallery;
- cloud saves;
- challenge seeds.

## Critical Rule

Do not advance to a new phase merely because the code works.

Advance when the **experience** works.

Phase scope must also remain consistent with the Product Contract. A phase cannot be marked complete by code existence alone; its exit criterion must pass on the reference device and in the automated test suite.
