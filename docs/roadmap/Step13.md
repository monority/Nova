# NOVA — Step 13

# Local Services & Urban Attractiveness

## Objective

Introduce the first local service system in NOVA.

The purpose is not to create a complete city-services simulation.

The purpose is to introduce a new spatial force capable of influencing residential development.

Until now, NOVA mainly grows through:

```text
terrain
  ↓
zones
  ↓
buildings
  ↓
population
  ↓
housing pressure
  ↓
densification
```

After Step 13, the city should also develop local points of attraction:

```text
service
   ↓
local coverage
   ↓
urban attractiveness
   ↓
residential development
   ↓
population
   ↓
housing pressure
   ↓
densification
```

The system must remain:

* deterministic
* domain-first
* aggregated
* simulation-driven
* testable without React
* independent from Three.js
* compatible with the existing top-view camera
* compatible with Steps 1–12
* minimal in scope

---

# 1. Current architecture

The current NOVA simulation already contains:

* terrain
* residential zones
* agricultural zones
* houses
* apartments
* farms
* population
* food economy
* development pressure
* road influence
* autonomous road extension
* road hierarchy
* road selection
* residential densification

Current residential progression:

```text
house
  ↓
housing pressure
  ↓
apartment
```

Do NOT rewrite this.

Step 13 should add a new influence.

---

# 2. Core concept

Introduce a first service building.

Use a deliberately generic first service type:

```ts
type ServiceType = "community";
```

The service represents a local civic/community facility.

It does not need:

* individual users
* employees
* operating hours
* maintenance
* money
* jobs
* queues
* visitors
* traffic

It simply creates a deterministic local area of urban attractiveness.

---

# 3. Service domain model

Introduce a domain entity for services.

For example:

```ts
interface ServiceBuilding {
  readonly id: ServiceBuildingId;
  readonly type: ServiceType;
  readonly position: GridPosition;
}
```

Or integrate it into the existing building discriminated-union architecture if that is already the cleaner model.

Follow the existing project conventions.

Do not create a second unrelated spatial/building model.

A service must occupy a normal grid cell.

It must participate in normal occupancy validation.

It must have a stable deterministic ID.

Prefer:

```text
service:1
service:2
service:3
```

Do not use:

```ts
Math.random()
```

---

# 4. Building compatibility

A service is a new city object.

It must coexist with:

* houses
* apartments
* farms
* roads
* zones

Follow the existing occupancy rules.

Unless the current architecture explicitly supports shared cells, a service must not overlap:

* a building
* a road
* another service

Do not introduce special occupancy exceptions.

Reuse existing placement validation wherever possible.

---

# 5. Construction

Add a minimal construction capability for services.

The player should be able to place:

```text
COMMUNITY SERVICE
```

inside the existing construction system.

Use the existing construction flow.

Do NOT create a separate service editor.

The construction flow should remain conceptually:

```text
BUILD
 ├── HOUSE
 ├── FARM
 └── COMMUNITY
```

Follow the existing UI conventions.

Do not redesign the toolbar.

---

# 6. Placement rules

Reuse normal building placement validation:

* in bounds
* buildable terrain
* not water
* not occupied
* valid grid position

Do not introduce:

* money requirements
* service-specific resource costs
* technology requirements
* population requirements

Those can be added later.

---

# 7. Service coverage

Each community service creates a small deterministic coverage radius.

Use Manhattan distance.

For example:

```text
distance(service, cell) <= SERVICE_RADIUS
```

Centralize the radius:

```ts
const COMMUNITY_SERVICE_RADIUS = 4;
```

The exact value can be tuned later.

Do NOT use Euclidean distance in one system and Manhattan distance in another.

NOVA already uses Manhattan-style spatial reasoning for development.

Stay consistent.

---

# 8. Coverage must be pure

Create a small pure function.

For example:

```ts
isWithinServiceCoverage(
  servicePosition,
  targetPosition
)
```

or:

```ts
getServiceInfluence(...)
```

Requirements:

* deterministic
* no mutation
* no React
* no Three.js
* no browser APIs

Example:

```text
service at (5,5)

distance <= 4

      x
   xxxxxxx
  xxxxxxx
 xxxxxxxxx
xxxxxxxxxxx
 xxxxxxxxx
  xxxxxxx
   xxxxxxx
      x
```

The exact visualization does not need to be rendered yet.

---

# 9. Multiple services

Multiple services may overlap.

The simplest rule is:

```text
coverage exists if at least one service covers the position
```

Do not initially sum coverage.

Do not create:

```text
attractiveness = service1 + service2 + service3 + ...
```

The first version should use a boolean or small discrete influence.

For example:

```ts
type ServiceCoverage = "none" | "community";
```

If the architecture naturally supports a numeric influence, keep it very small and deterministic.

Avoid premature scoring complexity.

---

# 10. Urban attractiveness

Introduce a focused domain concept:

```text
UrbanAttractiveness
```

Do not create a generic AI engine.

For example:

```ts
interface UrbanAttractiveness {
  readonly position: GridPosition;
  readonly serviceCoverage: boolean;
  readonly roadAccess: number;
  readonly residentialDensity: number;
}
```

However, do not automatically create a large map of attractiveness for every world cell.

Prefer calculating attractiveness only where required by development decisions.

The key question is:

> Is this residential development location locally attractive?

---

# 11. Attractiveness should be local

For this step, attractiveness should be based primarily on:

1. service coverage
2. road access
3. nearby residential density

Existing systems should be reused.

Conceptually:

```text
service coverage
      +
road accessibility
      +
residential density
      ↓
urban attractiveness
```

Do not introduce:

* land value
* happiness
* pollution
* crime
* wealth
* education
* health
* property prices

Those belong to later systems.

---

# 12. Development pressure integration

The existing development pressure system must remain the primary system.

Do NOT replace it.

Instead:

```text
existing development pressure
          +
local service attractiveness
          ↓
final residential candidate pressure
```

The service influence must be a bonus, not the entire decision.

For example:

```text
base residential pressure
+
service bonus
+
road influence
+
existing density/cluster bonus
```

Keep the service bonus relatively small.

A service should make an area more attractive.

It should not force development.

---

# 13. Agriculture

Services should have little or no effect on agricultural development.

Do NOT make farms migrate toward community services.

Existing agricultural development behavior must remain intact.

If the implementation uses a shared attractiveness function, explicitly gate service influence:

```text
residential → service influence
agricultural → no meaningful service influence
```

---

# 14. Autonomous development

This is where the system becomes interesting.

When autonomous residential development occurs, the candidate evaluation should now consider service coverage.

Example:

```text
candidate A
  road access: high
  residential density: medium
  service coverage: yes

candidate B
  road access: high
  residential density: medium
  service coverage: no
```

Candidate A should receive a deterministic service bonus.

Do not guarantee that A wins.

Other existing pressure components must remain part of the calculation.

This prevents services from becoming magical attractors.

---

# 15. Densification

Step 12 introduced:

```text
house → apartment
```

Step 13 may allow service coverage to contribute to densification eligibility.

For example:

```text
house
  ↓
housing pressure
  +
road access
  +
service coverage
  ↓
apartment
```

However, service coverage must not be mandatory.

A house outside service coverage should still be capable of evolving if other conditions are sufficiently strong.

This is important for organic city growth.

---

# 16. Service placement and future growth

A manually placed service should immediately affect future simulation decisions.

It should not retroactively create buildings.

For example:

```text
place service
      ↓
coverage changes
      ↓
next development evaluation
      ↓
service-covered candidates receive bonus
```

Do not immediately spawn buildings around the service.

The simulation must remain causal.

---

# 17. Service renderer

Add a distinct but restrained visual representation.

The visual should communicate:

```text
community / civic building
```

without becoming a large glowing landmark.

Use the existing architectural language:

* geometric
* dark
* minimal
* top-down
* restrained
* clean silhouette

Possible geometry:

```text
small central volume
+
slightly wider base
+
simple roof/platform
```

Do NOT introduce:

* neon symbols
* floating icons
* giant emissive circles
* HUD markers
* cartoon signs
* realistic textures

---

# 18. Service coverage visualization

Do NOT permanently render coverage circles.

If useful for development/debugging, add a temporary debug representation only if the existing architecture already has debug visualization.

Production rendering should remain clean.

Do not turn the city into a heatmap.

---

# 19. Render snapshot

Expose service data through the render boundary.

For example:

```ts
interface ServiceRenderSnapshot {
  readonly id: ServiceBuildingId;
  readonly type: ServiceType;
  readonly position: GridPosition;
}
```

And:

```ts
interface RenderSnapshot {
  readonly ...
  readonly services: readonly ServiceRenderSnapshot[];
}
```

Follow the existing snapshot architecture.

Three.js must consume this data.

Three.js must NOT calculate service coverage.

---

# 20. Selection

Services must participate in the existing selection system.

The selection flow remains:

```text
Pointer
 ↓
renderer picking
 ↓
world position
 ↓
GridPosition
 ↓
domain selectable resolver
 ↓
stable service ID
```

Do not introduce a special Three.js selection mechanism.

A service should be selectable by its grid position.

---

# 21. Inspector

If the existing inspector supports selected buildings, expose a minimal service representation.

For example:

```text
COMMUNITY
Coverage: 4 cells
```

Keep it small.

Do not add a large service management panel.

---

# 22. Persistence

If persistence already exists, serialize:

```text
service ID
service type
service position
```

Existing saves without services must remain valid.

Do not build a new save system.

---

# 23. Simulation ordering

Keep service influence deterministic.

A recommended conceptual order is:

```text
1. population update
2. economy update
3. autonomous construction
4. development pressure evaluation
5. residential densification
6. next simulation state
```

Services already exist in the city state when development is evaluated.

Do not make service influence depend on render timing.

If the existing tick order differs, preserve the architecture and document the actual order.

---

# 24. Tests — Service domain

Add unit tests for:

### Placement

* valid service placement
* out of bounds
* water
* occupied cell
* duplicate position

### IDs

* deterministic service IDs
* multiple services

### Coverage

* service cell covered
* radius boundary covered
* outside radius not covered
* Manhattan distance
* deterministic coverage

### Multiple services

* overlapping coverage
* at least one service covers candidate
* no service coverage

---

# 25. Tests — Attractiveness

Test:

* no service → no service bonus
* service coverage → bonus
* road access remains effective
* residential density remains effective
* service does not replace existing development pressure
* agricultural development does not receive meaningful service bonus
* deterministic candidate ranking

---

# 26. Tests — Densification

Test:

* service-covered house can qualify for apartment evolution
* non-covered house can still evolve when other conditions are sufficient
* service does not automatically evolve every house
* service does not immediately create population
* service does not modify housing capacity
* apartment behavior from Step 12 remains unchanged

---

# 27. Integration scenario

Create a deterministic simulation scenario:

```text
1. Create world
2. Create residential zone
3. Create roads
4. Create several houses
5. Place a community service
6. Advance simulation
7. Evaluate development pressure
8. Verify service-covered candidates receive the expected influence
9. Verify autonomous development remains deterministic
10. Verify existing densification remains functional
```

The test must not rely on wall-clock timing.

Use explicit simulation advancement.

---

# 28. E2E

If the browser environment is stable:

Verify:

1. enter construction mode
2. place a community service
3. service appears visually
4. service can be selected
5. existing buildings remain selectable
6. simulation continues
7. no camera regression

Do not require pixel-perfect screenshots.

If Chromium/WebGL stalls, distinguish:

```text
application failure
```

from:

```text
browser/WebGL infrastructure failure
```

---

# 29. Performance

Do not calculate coverage for every world cell every frame.

Do not create a permanent attractiveness grid.

Prefer:

```text
candidate building
      ↓
check nearby services
      ↓
calculate local coverage
```

If the number of services becomes large later, a spatial index can be introduced.

Do not build that optimization now unless profiling demonstrates a need.

---

# 30. Explicit non-goals

DO NOT implement:

* happiness
* citizen needs
* jobs
* schools
* hospitals
* police
* shops
* industry
* commerce
* public transport
* traffic
* pedestrians
* service workers
* service capacity
* service maintenance
* money costs
* land value
* pollution
* crime
* education
* health simulation
* service upgrades
* service levels
* service chains
* service UI management
* heatmaps
* city-wide happiness score

The purpose is one local service and one local influence.

---

# 31. Architectural constraints

Maintain:

```text
UI
 ↓
Application
 ↓
Domain
```

and:

```text
Domain
 ↓
RenderSnapshot
 ↓
Three.js
```

The domain must not import:

* React
* Next.js
* Three.js
* browser APIs

Service coverage must be domain logic.

Three.js must only render the resulting snapshot.

---

# 32. Validation

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Report:

* files created
* files modified
* service model
* placement rules
* coverage radius
* attractiveness formula
* development-pressure integration
* densification integration
* renderer changes
* selection changes
* tests
* validation results
* known limitations

---

# 33. Definition of Done

Step 13 is complete when:

* [ ] community service exists
* [ ] service has stable deterministic ID
* [ ] service uses normal grid occupancy
* [ ] service can be manually placed
* [ ] service can be removed
* [ ] service is represented in SimulationState
* [ ] service appears in RenderSnapshot
* [ ] service has a restrained visual representation
* [ ] service can be selected
* [ ] service coverage uses Manhattan distance
* [ ] coverage radius is centralized
* [ ] overlapping services work deterministically
* [ ] service coverage influences residential development
* [ ] service influence is only a bonus
* [ ] existing road influence remains intact
* [ ] existing residential density remains intact
* [ ] agriculture is not meaningfully influenced
* [ ] service influence can contribute to densification
* [ ] service does not force construction
* [ ] service does not instantly create population
* [ ] no individual citizens are introduced
* [ ] no traffic/pathfinding is introduced
* [ ] unit tests pass
* [ ] integration tests pass
* [ ] E2E passes if browser infrastructure is available
* [ ] typecheck passes
* [ ] lint passes
* [ ] production build passes

---

# Final principle

Step 13 should create the first genuine urban attractor.

Before:

```text
roads
  ↓
development
```

After:

```text
roads
  +
services
  ↓
urban attractiveness
  ↓
development
```

The service does not tell the city what to build.

It changes the conditions under which the city decides to grow.

The intended emergent behavior is:

```text
        SERVICE
           │
           ▼
      attractive area
       ╱         ╲
   houses       houses
       ╲         ╱
        apartment
            │
       higher density
            │
        more population
```

The city should begin to develop recognizable local centers without the player explicitly placing every building.
