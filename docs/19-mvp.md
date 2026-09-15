# NOVA — MVP Specification

## 1. MVP Objective

Prove one thing:

> **Can a player establish a small settlement and enjoy watching it organically become a city?**

Nothing else is required to validate the concept.

The authoritative scope, formulas and release gates are in [20-product-contract.md](./20-product-contract.md). This document explains the player-facing slice.

## 2. Included

### World

- deterministic seed;
- small procedural terrain;
- buildable land;
- water;
- camera.

### Construction

- residential zone;
- roads;
- basic infrastructure;
- procedural houses.

### Simulation

- time;
- population;
- housing;
- food;
- energy;
- basic growth.

### Visuals

- stylized terrain;
- simple 3D buildings;
- luminous roads;
- traffic particles;
- day/night;
- subtle lighting.

### UX

- camera controls;
- build controls;
- time controls;
- basic top statistics;
- contextual building information.

### Persistence

- one local manual save slot;
- one local autosave slot;
- validated load;
- autosave.

## 3. Explicitly Excluded

Do not implement in MVP:

- full technology tree;
- complex taxation;
- individual citizens;
- advanced AI;
- multiplayer;
- cloud saves;
- complex disasters;
- seasons;
- detailed pedestrian simulation;
- realistic vehicles;
- huge procedural worlds;
- dozens of building categories.

Research is represented only by deterministic placeholder counters in the MVP; the player-facing technology tree is post-MVP.

## 4. MVP Player Journey

```text
Open NOVA
    ↓
Generate world
    ↓
Choose settlement location
    ↓
Draw first road
    ↓
Create residential zone
    ↓
First houses appear
    ↓
Population arrives
    ↓
Food / energy begin flowing
    ↓
Settlement grows
    ↓
Player expands
    ↓
Night arrives
    ↓
City lights activate
    ↓
Player accelerates time
    ↓
City becomes visibly larger
```

## 5. MVP Visual Acceptance

The MVP is not accepted if it looks like:

- a generic Three.js demo;
- a flat spreadsheet with 3D objects;
- a cyberpunk HUD;
- a collection of identical cubes.

It should already feel like a coherent digital civilization.

## 6. MVP Technical Acceptance

Required:

- strict TypeScript;
- deterministic simulation;
- renderer isolated from React;
- no simulation rules in UI components;
- no unseeded simulation randomness;
- save/load validation;
- unit tests for core systems;
- Playwright smoke test.

## 7. Vertical Slice Target

Recommended first benchmark:

```text
1 map
100–500 buildings
500 completed buildings
1 road network
1 food system
1 energy system
day/night
traffic flow
```

The MVP release target is 500 completed buildings. 1,000 buildings is a stretch target. Population is aggregate and the exact displayed number is less important than the visual and systemic behavior.

## 8. Definition of Done

The MVP is done when a new player can:

1. start a world;
2. understand how to place a settlement;
3. create roads and a residential area;
4. see buildings appear without manually placing each one;
5. see population increase;
6. see resource consumption;
7. advance time;
8. watch the city transform from day to night;
9. save;
10. reload;
11. continue the same simulation.

## 9. Product Validation

After the MVP, evaluate:

- Is the city satisfying to watch?
- Does the player understand why it grows?
- Does intervention feel meaningful?
- Does the city develop differently depending on player choices?
- Is the visual identity distinctive?
- Does the player want to accelerate time just to see what happens next?

If the answer is no, add **no new major system**.

Improve the existing simulation and presentation first.
