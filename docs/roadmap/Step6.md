# Step 6 — Economy & Basic Resources

## Objective

Implement the first deterministic economic system of NOVA.

The goal is **not** to build a complex economy yet.

The goal is to establish the architectural foundation for:

```text
Buildings
   ↓
Production
   ↓
Resources
   ↓
Population consumption
   ↓
Surplus / shortage
   ↓
Future city development
```

This step introduces the first meaningful interaction between the existing population system and the city's buildings.

The system must remain:

* deterministic
* domain-first
* aggregate
* scalable
* testable without React or Three.js
* independent from rendering
* independent from persistence
* independent from networking
* independent from individual citizen simulation

Do not introduce individual citizens, jobs, traffic, markets, money simulation, pathfinding, AI agents, or complex supply chains.

---

# 1. Read the existing architecture first

Before changing code, read:

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

Also inspect the current implementation of:

* `src/domain/city/`
* `src/domain/construction/`
* `src/domain/population/`
* `src/domain/simulation/`
* `src/application/`
* render snapshot/projection code
* current building definitions
* current simulation stepper
* current UI population indicator
* existing tests

Do not duplicate concepts that already exist.

---

# 2. Architectural objective

Preserve the dependency direction:

```text
UI
 ↓
Application
 ↓
Domain
```

Rendering remains a consumer:

```text
Domain / Simulation
        ↓
Render Snapshot
        ↓
Three.js
```

The economy must live entirely in the domain.

Do NOT implement economy rules inside:

* React components
* Three.js renderers
* hooks
* UI event handlers
* `WorldViewport`
* rendering code

Do not create:

```text
EconomyManager
GameManager
GlobalEconomy
useEconomyStore
```

The economy should be represented by explicit domain state and pure systems/functions.

---

# 3. Introduce resources

Create a minimal resource model.

Start with only:

```text
food
```

Do not introduce wood, stone, metal, energy, money, goods, or other resources yet.

The purpose is to prove the architecture before increasing complexity.

Example conceptual model:

```ts
type ResourceType = 'food';

type ResourceAmount = {
  type: ResourceType;
  amount: number;
};
```

Use the project's existing type conventions if they provide a better equivalent.

Amounts must use deterministic numeric values.

Avoid floating-point accumulation where unnecessary.

---

# 4. Economy state

Introduce an aggregate economy state.

For example:

```ts
type EconomyState = {
  food: number;
  foodProduced: number;
  foodConsumed: number;
  foodShortage: number;
};
```

Adapt the exact shape to the existing architecture.

Do not expose unnecessary implementation details.

The state should represent the current economic snapshot, not an ever-growing transaction log.

Do not store one object per citizen or one transaction per tick.

---

# 5. Production

Introduce a minimal production capability on buildings.

The existing house should **not** automatically become a farm.

Instead, introduce one new building type:

```text
farm
```

The farm is intentionally simple.

Example conceptual definition:

```text
farm
housing capacity: 0
food production: X units per simulated day
```

The exact production value should be chosen deliberately based on the existing simulation time scale.

Do not choose a value such as:

```text
+1 food every simulation tick
```

That would make the economy dependent on the implementation frequency.

Production must be expressed in a meaningful simulated-time unit.

For example:

```text
food per simulated day
```

Then convert that rate according to the simulation timestep.

---

# 6. Building definitions

Extend the existing building type definitions instead of scattering production rules throughout the economy system.

The conceptual model should become something similar to:

```text
BuildingTypeDefinition
├── housingCapacity
└── production
    └── foodPerDay
```

For example:

```text
house
  housingCapacity = 4
  foodPerDay = 0

farm
  housingCapacity = 0
  foodPerDay = N
```

Do not duplicate these values inside:

* economy system
* population system
* renderer
* UI
* tests

The building catalog should remain the source of truth.

---

# 7. Population consumption

Connect the existing population system to the economy.

Population consumes food.

Consumption must also be time-based.

Do NOT implement:

```text
population × consumption per tick
```

without accounting for the simulation timestep.

Instead define a meaningful rate such as:

```text
food consumed per inhabitant per simulated day
```

Then derive the consumption for each simulation step.

Example conceptual rule:

```text
food consumption
=
population
×
food consumption per inhabitant per day
×
elapsed simulated days
```

Choose a simple deterministic constant.

Keep the number configurable in a domain constants/configuration module rather than hardcoding it throughout the system.

---

# 8. Economy tick

Create a pure economy simulation system.

Conceptually:

```text
previous EconomyState
        +
CityState
        +
PopulationState
        +
elapsed simulation time
        ↓
next EconomyState
```

The system should:

1. calculate production
2. calculate consumption
3. update food stock
4. calculate shortage if stock is insufficient
5. never produce negative stock

For example:

```text
availableFood = currentFood + production

if availableFood >= consumption:
    food = availableFood - consumption
    shortage = 0
else:
    food = 0
    shortage = consumption - availableFood
```

Do not silently discard the shortage information.

The shortage should become part of the economic state because later systems will need it.

---

# 9. Population must remain deterministic

The economy must not introduce nondeterministic population behavior yet.

Do NOT immediately implement:

```text
food shortage → deaths
food surplus → births
```

That belongs to a later balancing step.

For this step:

```text
Population
    ↓
food consumption
```

but not yet:

```text
food shortage
    ↓
population change
```

This keeps the responsibilities clean.

---

# 10. Initial economy state

A new simulation should have a deterministic initial food stock.

Choose one explicit initial value.

For example:

```text
food = 0
```

or another intentional starting stock if the game design requires it.

Do not use randomness.

Do not derive initial food from browser state, current time, or `Math.random()`.

---

# 11. Simulation integration

Integrate the economy into the existing simulation pipeline.

The current architecture already has a deterministic simulation step.

Preserve the existing system ordering.

The conceptual pipeline should become:

```text
Simulation tick
    ↓
Population system
    ↓
Economy system
    ↓
next SimulationState
```

However, if the existing population system currently reads values that economy will eventually modify, choose the ordering deliberately and document it.

The important requirement is:

> One simulation tick must always produce the same next state from the same previous state.

Do not make simulation order implicit.

---

# 12. Time handling

Reuse the existing simulation clock.

Do not create a second clock inside the economy.

Do not use:

```ts
Date.now()
performance.now()
new Date()
```

inside domain economy calculations.

The economy must only consume explicit simulated elapsed time supplied by the simulation system.

The same simulation must therefore behave identically under:

```text
1×
2×
5×
20×
100×
```

when comparing equivalent simulated time.

---

# 13. Building lifecycle

Economy must react naturally to building creation and deletion.

Examples:

```text
place farm
    ↓
production capacity increases
```

and:

```text
remove farm
    ↓
production capacity decreases
```

Do not permanently cache production capacity in a way that can become stale.

Prefer deriving production from the authoritative city/building state.

Example:

```text
CityState
    ↓
calculateProductionCapacity()
```

This keeps building lifecycle behavior deterministic.

---

# 14. Construction integration

Add `farm` to the existing construction system.

The construction UI should allow:

```text
BUILD
 ├── HOUSE
 └── FARM
```

Do not redesign the construction system.

Reuse:

* placement validation
* grid occupancy
* deterministic IDs
* removal
* selection
* render projection

A farm occupies one grid cell exactly like the existing house.

No special road/path requirement is needed yet.

---

# 15. Rendering

Add minimal visual differentiation for farms.

Do not create a detailed farming simulation.

A farm can simply have a distinct geometric silhouette/material treatment.

The renderer should receive a building type through the existing render snapshot.

The renderer must not know:

```text
food production = X
```

The renderer only knows:

```text
building.type === 'farm'
```

Economic rules remain domain-owned.

---

# 16. Economy UI

Add a minimal economy indicator to the existing interface.

For example:

```text
POPULATION
12 / 20

FOOD
+8 / -6
STOCK 14
```

Keep it restrained.

Do not create a dashboard.

Do not add:

* charts
* graphs
* economic panels
* market screens
* resource cards
* large HUD overlays

The UI should communicate only the current simulation state.

If shortage exists, expose it clearly but minimally.

For example:

```text
FOOD
STOCK 0
SHORTAGE 4
```

Do not implement a complex notification system yet.

---

# 17. Render snapshot

Extend the existing render snapshot only if the UI/renderer genuinely needs economic information.

Prefer keeping economy out of Three.js entirely.

The render snapshot should continue to represent visual state.

Do not add:

```text
food
production
consumption
```

to every rendered building.

Economic data belongs to simulation/application state.

Only expose it through an appropriate presentation/query model if the current architecture requires it.

---

# 18. Domain boundaries

The following responsibilities must remain separate.

### Population

Responsible for:

* population count
* households
* housing capacity
* population growth

### Construction / City

Responsible for:

* buildings
* building placement
* building removal
* occupancy

### Economy

Responsible for:

* resources
* production
* consumption
* stock
* shortage

### Rendering

Responsible for:

* visual representation

### UI

Responsible for:

* displaying state
* selecting construction actions

Do not merge these responsibilities into a single system.

---

# 19. Performance requirements

The economy must be aggregate.

Never perform:

```text
for each citizen
```

There are no individual citizen objects.

Production should be calculated from building aggregates.

For example:

```text
1000 farms
→ aggregate production
```

rather than:

```text
Farm 1
Farm 2
Farm 3
...
```

The architecture should remain viable for:

```text
10k buildings
100k buildings
1M+ simulated inhabitants
```

Do not prematurely introduce Workers, WASM, GPU computation, ECS, or typed-array optimization.

Keep the implementation simple first.

---

# 20. Tests

Add comprehensive unit tests.

At minimum test:

### Resource state

* initial economy state
* food stock
* deterministic initialization

### Production

* zero farms → zero production
* one farm → expected production
* multiple farms → aggregated production
* removing farm reduces production
* production is deterministic

### Consumption

* zero population → zero consumption
* population consumes food
* consumption scales with population
* consumption scales with simulated time

### Stock

* production increases stock
* consumption decreases stock
* stock never becomes negative
* surplus is preserved

### Shortage

* insufficient food produces shortage
* stock becomes zero when insufficient
* exact balance produces zero shortage
* shortage is deterministic

### Time

Verify equivalent simulated time produces equivalent economy state.

For example:

```text
100 × for N ticks
```

must produce the same result as the equivalent elapsed simulation time at:

```text
1 ×
5 ×
20 ×
```

where applicable.

### Buildings

* house does not produce food
* farm produces food
* removing a farm removes its production
* building placement integrates correctly with economy

### Population integration

* population affects consumption
* population remains unchanged by economy for now
* food shortage does not alter population yet

### Determinism

Given identical:

```text
World
CityState
PopulationState
EconomyState
simulation time
```

the result must be identical.

---

# 21. Existing regression tests

Do not break existing functionality.

All existing tests must remain valid.

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Fix regressions instead of weakening existing tests.

Do not modify tests simply to make incorrect behavior pass.

---

# 22. Code quality requirements

Prefer small pure functions.

For example:

```text
calculateHousingCapacity()
calculateFoodProduction()
calculateFoodConsumption()
advanceEconomy()
```

Use explicit domain types.

Avoid generic utility functions.

Avoid:

```text
utils.ts
helpers.ts
manager.ts
```

for domain logic.

Keep modules cohesive.

Do not introduce a global state library.

Do not make React responsible for simulation state.

Do not make Three.js responsible for economic state.

---

# 23. Definition of Done

Step 6 is complete only when all of the following are true:

### Domain

* [ ] `EconomyState` exists.
* [ ] `food` resource exists.
* [ ] Production is deterministic.
* [ ] Consumption is deterministic.
* [ ] Food stock cannot become negative.
* [ ] Shortage is explicitly represented.
* [ ] Production is derived from buildings.
* [ ] Consumption is derived from population.
* [ ] All calculations use simulated time.

### Buildings

* [ ] `farm` exists.
* [ ] Farm production is defined in the building catalog.
* [ ] House remains housing-only.
* [ ] Farm can be placed.
* [ ] Farm can be removed.
* [ ] Building IDs remain deterministic.

### Simulation

* [ ] Economy is integrated into the simulation step.
* [ ] Existing simulation clock is reused.
* [ ] No wall-clock dependency exists.
* [ ] Equivalent simulated time produces equivalent results.
* [ ] Population behavior remains unchanged by shortages.

### UI

* [ ] Farm is constructible.
* [ ] Food state is minimally visible.
* [ ] No dashboard has been introduced.
* [ ] Existing top-down camera remains unchanged.

### Architecture

* [ ] No individual citizens were introduced.
* [ ] No economy manager/global store was introduced.
* [ ] No economy logic exists in React.
* [ ] No economy logic exists in Three.js.
* [ ] Domain remains independent from rendering.

### Validation

* [ ] TypeScript passes.
* [ ] ESLint passes.
* [ ] Unit tests pass.
* [ ] E2E tests pass.
* [ ] Production build passes.

---

# 24. Final report

When finished, report:

1. Files created.
2. Files modified.
3. Economy model.
4. Resource model.
5. Production rule.
6. Consumption rule.
7. Shortage behavior.
8. Simulation ordering.
9. UI changes.
10. Tests added.
11. Validation commands and results.
12. Any intentional limitations.

Do not implement features beyond this scope.

In particular, do NOT implement:

* money
* jobs
* salaries
* markets
* trade
* imports/exports
* supply chains
* warehouses
* individual citizens
* traffic
* pathfinding
* population deaths from starvation
* advanced farming simulation
* technology
* events
* disasters

Those belong to later steps.
