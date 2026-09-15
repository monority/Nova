# Step 7 — Zoning & Autonomous Development

## Objective

Introduce the first autonomous city-development system in NOVA.

Until now, the player directly places:

* houses
* farms
* roads

The next architectural milestone is to introduce **rules instead of direct placement**.

The player should be able to define a simple development zone and allow the simulation to decide whether and where a building should appear.

The fundamental concept is:

> The player defines the conditions. The simulation produces the city.

This step must remain intentionally small.

Do NOT build a full city AI.

Do NOT implement procedural urban planning.

Do NOT implement individual agents.

Do NOT implement complex desirability scoring.

The goal is to establish the architectural foundation for autonomous development.

---

# 1. Read the architecture first

Before changing anything, read:

* `ARCHITECTURE.md`
* `docs/00-product-vision.md`
* `docs/01-game-design.md`
* `docs/02-core-loop.md`
* `docs/03-city-simulation.md`
* `docs/05-construction.md`
* `docs/06-population.md`
* `docs/07-economy.md`
* `docs/09-time-and-events.md`
* `docs/10-visual-direction.md`
* `docs/11-ux-and-interface.md`
* `docs/12-rendering-architecture.md`
* `docs/13-technical-architecture.md`
* `docs/14-performance.md`
* `docs/19-mvp.md`

Also inspect:

* current `CityState`
* building definitions
* construction commands
* population system
* economy system
* simulation stepper
* grid/occupancy implementation
* render snapshot
* current construction UI
* existing tests

Do not duplicate existing domain concepts.

---

# 2. Core concept

Introduce a new domain concept:

```text
DevelopmentZone
```

A development zone is an area where the player tells the simulation:

> "Buildings of this category may develop here."

For this first implementation, support only:

```text
residential
```

and:

```text
agricultural
```

The exact naming should follow the project's existing conventions.

Conceptually:

```text
Residential Zone
    ↓
may autonomously create houses

Agricultural Zone
    ↓
may autonomously create farms
```

The player does not place the individual building.

The simulation does.

---

# 3. Keep zones separate from buildings

A zone is NOT a building.

Do not represent zones as fake buildings.

Do not add:

```text
building.type = 'zone'
```

Instead create an explicit domain model.

For example:

```ts
type ZoneType =
  | 'residential'
  | 'agricultural';

type DevelopmentZone = {
  id: string;
  type: ZoneType;
  cells: GridPosition[];
};
```

Adapt the exact representation to the existing spatial architecture.

The important architectural rule is:

> Zone state must be independent from building state.

---

# 4. Spatial representation

Start with simple grid-based zones.

Do not introduce polygon geometry yet.

A zone can initially be represented as a collection of grid cells.

Example:

```text
R R R R
R R R R
R R R R
```

The domain should be able to answer:

```text
isCellInZone(position)
```

efficiently enough for the current scale.

Do not build a sophisticated GIS system.

Do not introduce arbitrary polygon clipping.

Do not introduce spatial databases.

---

# 5. Zone lifecycle

Introduce explicit application operations:

```text
createDevelopmentZone
removeDevelopmentZone
```

The player should be able to:

1. enter zoning mode
2. choose a zone type
3. select cells
4. create the zone
5. see the zone visually
6. remove the zone

Do not allow zones to modify buildings directly.

The application layer changes domain state.

The simulation later reacts to that state.

---

# 6. Zone placement rules

Define conservative rules.

A zone cannot:

* occupy water
* occupy non-buildable terrain
* overlap an incompatible existing building
* create invalid grid positions

However, do not require the zone to be empty.

A zone may contain:

* existing buildings
* existing roads
* empty cells

The purpose is to allow the city to evolve around existing infrastructure.

If the current occupancy architecture makes this difficult, keep the rule explicit rather than modifying building/road semantics.

---

# 7. Deterministic zone IDs

Use deterministic identifiers.

For example:

```text
zone:1
zone:2
zone:3
```

Do not use UUIDs.

Do not use timestamps.

Do not use random identifiers.

Creation order must be deterministic.

---

# 8. Autonomous development system

Create a new simulation system responsible for autonomous development.

Conceptually:

```text
DevelopmentSystem
```

It should consume:

```text
SimulationState
```

and produce:

```text
SimulationState
```

It must not depend on:

* React
* Three.js
* DOM
* browser APIs

The system should be a deterministic domain/application-level simulation system.

---

# 9. First autonomous rule

Keep the first rule extremely simple.

### Residential

A residential zone may create a house when:

```text
population < housing capacity
```

Actually, be careful here:

If population is already below housing capacity, autonomous housing creation should generally not occur.

Instead the first meaningful rule should be:

```text
population >= housing capacity
AND
residential zone contains an empty valid cell
```

Then:

```text
create house
```

This creates the first feedback loop:

```text
Population
    ↓
Housing pressure
    ↓
Residential development
    ↓
Housing capacity
    ↓
Population growth
```

This is much more aligned with NOVA than simply spawning buildings randomly.

---

# 10. Agricultural rule

Agricultural development should use the existing food system.

The first rule can be:

```text
food shortage > 0
AND
agricultural zone contains an empty valid cell
```

Then:

```text
create farm
```

This produces another feedback loop:

```text
Population
    ↓
Food consumption
    ↓
Food shortage
    ↓
Agricultural development
    ↓
Food production
    ↓
Reduced shortage
```

This is the first real systemic loop of NOVA.

---

# 11. Important: avoid runaway construction

Autonomous development must NOT build unlimited structures in a single simulation tick.

Introduce a strict development rate.

For example:

```text
maximum 1 autonomous building per simulation tick
```

or preferably a meaningful simulated-time interval.

A better architecture is:

```text
development cooldown
```

expressed in simulated time.

For example:

```text
1 autonomous construction every N simulated days
```

Choose a sensible value based on the existing simulation clock.

Do not tie development directly to:

```text
RAF frames
```

or:

```text
render frames
```

---

# 12. Deterministic cell selection

This is important.

Do NOT use random selection yet.

If several valid cells are available, use a deterministic ordering.

For example:

```text
sort by:
y ascending
then x ascending
```

Then select the first valid cell.

This means:

```text
same state
+
same zone
+
same simulation time
=
same building
```

Later, NOVA can introduce controlled procedural variation.

For now, determinism is more important.

---

# 13. Zone priority

If several zones can develop simultaneously, define an explicit deterministic order.

For example:

```text
1. agricultural zones when food shortage exists
2. residential zones when housing pressure exists
```

Or another ordering justified by the game design.

Do not rely on object insertion order accidentally.

Document the chosen priority.

---

# 14. Do not bypass construction rules

Autonomous development must reuse the same domain placement validation as manual construction.

Do NOT create:

```text
placeBuildingIgnoringRules()
```

or:

```text
spawnBuilding()
```

that bypasses validation.

The autonomous system should conceptually perform:

```text
find valid cell
    ↓
construct building
    ↓
normal placement validation
    ↓
normal CityState mutation
```

There must remain one authoritative path for building placement.

---

# 15. Buildings created autonomously

Autonomous buildings must receive the same deterministic IDs as manually placed buildings.

Example:

```text
building:1
building:2
building:3
```

Do not create a second ID namespace.

Do not distinguish:

```text
building:auto:1
```

from:

```text
building:manual:1
```

A building is simply a building.

The origin may be useful later, but it is not necessary for this step.

---

# 16. Population interaction

Do not modify the existing population algorithm significantly.

Autonomous houses simply increase housing capacity through the existing building catalog.

Therefore:

```text
DevelopmentSystem
        ↓
house
        ↓
housing capacity
        ↓
PopulationSystem
```

Do not duplicate housing calculations inside the development system.

Use the existing population domain functions.

---

# 17. Economy interaction

Autonomous farms must integrate with the existing economy naturally.

Do not duplicate food-production calculations.

The existing economy system should discover the new farm through the authoritative city state.

Therefore:

```text
DevelopmentSystem
        ↓
farm
        ↓
CityState
        ↓
EconomySystem
        ↓
food production
```

The development system should not manually increment food.

---

# 18. Simulation ordering

Define an explicit simulation order.

A reasonable first version is:

```text
Population
    ↓
Economy
    ↓
Development
```

But carefully reason about the consequences.

The objective is to make feedback loops understandable.

For example:

```text
tick N
    Population consumes previous economic state
    Economy calculates shortage
    Development reacts to that shortage

tick N+1
    New farm contributes production
```

This is acceptable.

Do not create circular same-tick dependencies.

The system order must be explicit and tested.

---

# 19. Development should react to state, not directly to UI

The UI must never say:

```text
create house
```

on behalf of autonomous development.

The simulation decides.

The UI only:

* creates/removes zones
* displays zones
* displays resulting buildings

This distinction is essential to NOVA's architecture.

---

# 20. Rendering zones

Add a minimal visual representation.

Zones should be clearly visible but restrained.

Suggested visual language:

```text
Residential
    subtle line/grid treatment

Agricultural
    subtle agricultural field pattern
```

Avoid:

* giant colored rectangles
* neon colors
* thick outlines
* gradients
* glass panels
* HUD-like overlays

The world should remain architectural and calm.

Zones are spatial rules, not UI panels.

---

# 21. Zone rendering boundary

Extend the render snapshot if necessary.

Three.js should receive a presentation-oriented representation such as:

```text
RenderZone
├── id
├── type
└── cells
```

The renderer must not calculate:

```text
whether the zone is valid
whether it can develop
whether food is insufficient
```

It only renders the current zone state.

---

# 22. Zone interaction UI

Add a minimal zoning mode.

Conceptually:

```text
BUILD
 ├── HOUSE
 ├── FARM
 └── ZONE

ZONE
 ├── RESIDENTIAL
 ├── AGRICULTURAL
 └── CANCEL
```

A simple drag-to-paint interaction is acceptable.

However, do not over-engineer the editor.

The first implementation may support selecting individual cells.

Prioritize correct domain state over sophisticated painting UX.

---

# 23. Removing zones

Removing a zone must NOT remove its buildings.

Example:

```text
Residential Zone
    ↓
house
house
house

remove zone
    ↓
houses remain
```

The zone is only a rule.

Buildings are persistent city entities.

This distinction is fundamental.

---

# 24. Zone overlap

Keep overlap rules simple.

Prefer:

```text
one zone per cell
```

for the first implementation.

Do not support overlapping residential + agricultural zones.

If a new zone overlaps an existing zone:

```text
reject placement
```

with an explicit domain reason.

---

# 25. No zoning costs

Do not introduce money or construction costs.

Zones are free for this step.

Economy remains focused on food.

---

# 26. No advanced desirability system

Do NOT implement:

* land value
* happiness
* distance scoring
* commute time
* property value
* crime
* pollution
* noise
* attractiveness
* road accessibility scoring

Those systems can come later.

For now:

```text
zone rule
+
simple pressure condition
+
valid cell
=
development
```

---

# 27. Tests

Add unit tests for:

### Zone creation

* valid residential zone
* valid agricultural zone
* deterministic IDs
* invalid terrain rejected
* water rejected
* invalid cells rejected
* overlapping zones rejected

### Zone removal

* zone removed
* buildings remain
* roads remain

### Development

* no development without a zone
* residential zone can create a house under housing pressure
* agricultural zone can create a farm during food shortage
* no development when the condition is not met
* no development when zone has no valid cells
* maximum development rate respected
* deterministic cell selection
* deterministic building IDs

### Integration

* autonomous house increases housing capacity
* autonomous farm increases food production
* development uses normal building placement validation
* population remains deterministic
* economy remains deterministic

### Simulation ordering

Explicitly test the chosen order.

For example:

```text
economy shortage at tick N
        ↓
development at tick N
        ↓
farm exists at tick N+1
        ↓
farm contributes to production
```

---

# 28. Determinism tests

This step must significantly strengthen deterministic simulation guarantees.

Given the same:

```text
World
CityState
PopulationState
EconomyState
ZoneState
SimulationState
```

the development result must be identical.

Run equivalent simulated time with different speeds and verify the same resulting city state.

Do not use:

```ts
Math.random()
```

anywhere in the autonomous development system.

---

# 29. Performance

Keep development aggregate.

Do not evaluate every possible cell in the world every tick if avoidable.

Start simple.

A reasonable first implementation can inspect only cells belonging to active zones.

Do not introduce:

* ECS
* Workers
* WASM
* GPU compute
* spatial databases
* complex spatial indexes

unless profiling later proves they are necessary.

Correctness comes first.

---

# 30. Architecture restrictions

Do NOT introduce:

```text
CityAI
CivilizationAI
AgentSystem
CitizenAI
UrbanPlanner
GameManager
ZoneManager
```

The development system is a simulation system, not a giant manager.

Prefer small domain functions:

```text
createDevelopmentZone()
removeDevelopmentZone()
findDevelopmentCell()
canDevelop()
developBuilding()
advanceDevelopment()
```

Use existing domain abstractions wherever possible.

---

# 31. Definition of Done

Step 7 is complete when:

### Zones

* [ ] Residential zones exist.
* [ ] Agricultural zones exist.
* [ ] Zones have deterministic IDs.
* [ ] Zones occupy grid cells.
* [ ] Invalid terrain is rejected.
* [ ] Zone overlap is rejected.
* [ ] Zones can be removed.
* [ ] Removing a zone does not remove buildings.

### Autonomous development

* [ ] Development is simulation-driven.
* [ ] Residential pressure can create houses.
* [ ] Food shortage can create farms.
* [ ] Development is rate-limited.
* [ ] Cell selection is deterministic.
* [ ] Building IDs remain deterministic.
* [ ] Normal building placement validation is reused.

### Population

* [ ] Autonomous houses use the existing housing system.
* [ ] No housing calculation is duplicated.

### Economy

* [ ] Autonomous farms use the existing production system.
* [ ] Development does not directly mutate food.

### Simulation

* [ ] Simulation order is explicit.
* [ ] No circular same-tick dependency exists.
* [ ] Development uses simulated time.
* [ ] No browser clock is used.

### UI

* [ ] Zoning mode exists.
* [ ] Zone type can be selected.
* [ ] Zones are visible.
* [ ] Existing construction remains functional.
* [ ] Top-down camera remains unchanged.

### Architecture

* [ ] No individual citizens.
* [ ] No AI agents.
* [ ] No global game manager.
* [ ] No random autonomous decisions.
* [ ] Domain remains independent from React and Three.js.

### Validation

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

All must pass.

---

# 32. Final report

When finished, report:

1. Files created.
2. Files modified.
3. Zone model.
4. Zone placement rules.
5. Autonomous development rules.
6. Development rate.
7. Simulation ordering.
8. Deterministic cell-selection strategy.
9. UI changes.
10. Rendering changes.
11. Tests added.
12. Validation results.
13. Intentional limitations.
14. Any architectural decisions that should be carried forward.

Do not implement features beyond this scope.

In particular, do NOT implement:

* land value
* happiness
* jobs
* wages
* traffic
* pathfinding
* citizens
* migration
* crime
* pollution
* advanced zoning
* procedural road generation
* desirability scoring
* technology
* disasters
* random events
* complex AI
* save/load changes
