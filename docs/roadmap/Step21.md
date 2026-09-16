# NOVA — Step 21 — Economy Foundation

Date: 2026-09-16

Project:

```text
C:\Users\monority\Desktop\Nova
```

## Context

NOVA is a deterministic contemplative city-builder.

Core principle:

```text
PLAYER INTENT
    ↓
CONDITIONS
    ↓
DETERMINISTIC SIMULATION
    ↓
AUTONOMOUS DEVELOPMENT
    ↓
OBSERVABLE CITY
```

The current product loop is functional:

```text
intent
→ zones
→ simulation
→ autonomous development
→ buildings / roads
→ densification
→ temporal feedback
→ inspection
```

Step 20.1 audited the current implementation against `docs/20-product-contract.md`.

Current status:

```text
typecheck    PASS
lint         PASS
unit tests   64/64 PASS
build        PASS
E2E GPU      4/4 PASS
```

Current economy:

```text
food only
```

Current food model:

```text
Farm production: 8 food/day
Population consumption: 0.1 food/person/day
Shortage state exists
```

Missing:

```text
energy
materials
storage as explicit resource state
```

The Product Contract requires:

```text
Food
Energy
Materials
Storage
```

The goal of this step is to introduce the smallest coherent economy foundation without expanding the simulation into a complex economic game.

---

# Product intent

NOVA should not become a spreadsheet simulator.

Resources exist to create understandable constraints on urban development.

The player should be able to understand:

```text
"I provided the conditions."
        ↓
"The settlement has resources."
        ↓
"The simulation consumes/produces them."
        ↓
"Resource availability affects development."
```

The system must remain deterministic and inspectable.

---

# Step 1 — Inspect existing architecture

Before modifying code, inspect:

```text
src/domain/
src/application/
src/engine/
src/rendering/
src/ui/
```

Identify:

* current simulation state;
* population state;
* food state;
* farm production;
* consumption;
* development scoring;
* building capacities;
* snapshot/projection boundaries;
* current commands;
* current simulation runtime.

Do not introduce an `infrastructure/` layer.

Respect the existing architecture:

```text
domain
    ↓
application
    ↓
engine
    ↓
rendering / UI
```

The renderer must remain a consumer of state.

---

# Step 2 — Define canonical resources

Create a pure domain representation for the MVP resource state.

Minimum resources:

```text
food
energy
materials
```

Use explicit types rather than loose string-keyed objects.

Example conceptual shape:

```ts
type ResourceState = {
  food: number;
  energy: number;
  materials: number;
};
```

Do not expose mutable state.

Prefer immutable transitions.

Avoid:

```ts
Record<string, number>
```

for the core domain representation.

---

# Step 3 — Initial resources

The Product Contract currently specifies:

```text
40 people
12 households
180 food
120 energy
300 materials
```

There are currently no households/workers in the simulation.

Do NOT implement households/workers as part of this step.

Use the existing population representation while preserving the contract's resource starting values:

```text
food: 180
energy: 120
materials: 300
```

If the current starting state makes the resource model inconsistent, document the discrepancy rather than silently changing unrelated population behavior.

---

# Step 4 — Production

Introduce deterministic production for:

## Food

Preserve the existing:

```text
farm → +8 food/day
```

Do not redesign the farm system.

## Energy

Introduce the smallest MVP-compatible energy producer.

Prefer an existing community/service concept if architecturally appropriate.

Do NOT create a complex power grid.

A producer should simply contribute a deterministic amount per simulation day.

Example conceptual rule:

```text
energy producer → +N energy/day
```

The exact value must be chosen from existing product/domain constraints or documented as an explicit MVP constant.

Do not invent hidden balancing systems.

## Materials

Introduce a deterministic material source appropriate to the current building model.

The initial implementation may use an existing building/service or a minimal settlement-level source if no appropriate building currently exists.

Do NOT introduce extraction chains, logistics, workers, factories, transport networks, etc.

The goal is:

```text
materials → available resource
```

not a full industrial simulation.

---

# Step 5 — Consumption

Add deterministic daily consumption.

Food already has:

```text
0.1 food / person / day
```

Preserve it.

Energy should have a similarly explicit deterministic consumption rule.

Use the simplest MVP rule compatible with the existing population/building model.

For example:

```text
energy consumption =
population demand
+
building demand
```

but only if those concepts already exist.

Do not create speculative demand models.

Materials should NOT be continuously consumed by population.

Materials should primarily support construction/development.

---

# Step 6 — Construction cost

Introduce explicit material costs for new development.

At minimum, define costs for:

```text
house
apartment
farm
road
community/service building
```

The exact values must be:

* deterministic;
* centralized;
* documented;
* testable.

Avoid scattering:

```ts
materials -= 20
```

through arbitrary simulation code.

Prefer:

```text
building → construction cost → resource transaction
```

Do not implement a generic economic transaction framework unless the current architecture clearly requires it.

---

# Step 7 — Insufficient resources

Resource shortage must be deterministic and explainable.

If construction requires resources that are unavailable:

```text
construction is rejected/deferred
```

Do not allow negative resources unless the existing product contract explicitly requires debt/deficit.

Prefer:

```text
resource >= cost
```

before construction.

For autonomous development:

```text
eligible development
        ↓
resource affordability
        ↓
development
```

The resource constraint should integrate with the existing development scoring without replacing it.

---

# Step 8 — Preserve the existing player/simulation boundary

The player controls:

```text
WHERE
WHAT SHOULD DEVELOP
```

The simulation controls:

```text
WHEN
HOW DEVELOPMENT HAPPENS
```

Do not turn resource placement into micromanagement.

Do not require the player to manually distribute:

* food;
* energy;
* materials.

The player creates conditions.

The simulation resolves consequences.

---

# Step 9 — Resource projection

Create a pure application projection for the UI.

It should expose only information useful to the player.

Example conceptual model:

```text
ResourceSummary
- food
- energy
- materials
- shortages
```

Do not expose internal simulation implementation details.

The UI should be able to answer:

```text
How much food do I have?
How much energy do I have?
How many materials do I have?
Is something currently constrained?
```

---

# Step 10 — UI

Add a compact resource readout.

This is NOT a traditional large HUD.

Respect NOVA's visual language:

```text
dark
minimal
top-down
quiet
observational
```

Avoid:

* cyberpunk panels;
* oversized resource bars;
* neon colors;
* dashboard-heavy layout;
* gradients;
* gamified badges everywhere.

Use the existing design system/tokens.

The resource UI should integrate with the existing timeline/inspection interface.

Suggested information:

```text
FOOD       180
ENERGY     120
MATERIALS  300
```

If a resource is constrained, communicate it subtly.

---

# Step 11 — Feedback

Do not create fake causal events.

If a construction attempt fails because of resources, the application may expose a deterministic state such as:

```text
INSUFFICIENT MATERIALS
```

But do not create:

```text
"Materials caused the house to fail"
```

unless the causal relationship is explicitly represented by the domain.

Keep the Step 18/19 rule:

```text
events describe observable state changes
```

---

# Step 12 — Determinism

The economy must be deterministic.

Given:

```text
same seed
+
same initial state
+
same commands
```

resource state must evolve identically.

No:

* `Date.now()`;
* random calls without the seeded RNG;
* browser state;
* floating nondeterminism;
* renderer-dependent logic.

---

# Step 13 — Tests

Add focused domain/application tests.

At minimum:

### Resource initialization

```text
food = 180
energy = 120
materials = 300
```

### Food

```text
farm production increases food deterministically
population consumption decreases food deterministically
```

### Energy

```text
energy production is deterministic
energy consumption is deterministic
```

### Materials

```text
material production/availability is deterministic
construction consumes materials
```

### Insufficient resources

```text
insufficient resources prevent/defer construction
resources never become negative
```

### Determinism

Two identical simulation runs must produce identical resource state.

### Existing behavior

Ensure:

```text
existing 64 tests remain passing
```

Do not rewrite existing tests unnecessarily.

---

# Step 14 — E2E

Extend the GPU E2E suite only if the resource UI is part of the user-visible contract.

At minimum verify:

```text
resource summary is visible
initial resource values are correct
```

If the current E2E architecture is not appropriate for detailed economy testing, keep detailed validation at domain/application level.

Do not turn E2E into the primary simulation test layer.

---

# Step 15 — Performance

Do not introduce expensive per-frame calculations.

Resources should update on simulation ticks, not every render frame.

Prefer:

```text
simulation tick
    ↓
resource update
    ↓
snapshot
    ↓
render/UI
```

not:

```text
requestAnimationFrame
    ↓
recalculate economy
```

---

# Step 16 — Scope restrictions

Do NOT implement:

* households;
* workers;
* wages;
* markets;
* trade;
* logistics;
* power grids;
* industrial chains;
* taxes;
* money;
* happiness simulation;
* advanced economy balancing;
* civilization stages;
* persistence;
* canonical state hash;
* new terrain types.

Those belong to later milestones.

This step is strictly:

```text
Food + Energy + Materials
```

as a deterministic foundation.

---

# Step 17 — Validation

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e:gpu
```

Expected baseline:

```text
typecheck PASS
lint PASS
unit tests PASS
build PASS
GPU E2E PASS
```

Existing tests must not regress.

---

# Step 18 — Documentation

Update/create:

```text
docs/21-economy-foundation.md
docs/qa/step21-economy-foundation.md
```

Document:

* resource model;
* starting values;
* production;
* consumption;
* construction costs;
* shortage behavior;
* deterministic guarantees;
* UI representation;
* known limitations.

Clearly distinguish:

```text
implemented
```

from:

```text
future economy
```

---

# Final report

Return:

## Architecture

List created/modified files and their responsibilities.

## Economy

Document:

```text
Food:
Energy:
Materials:
```

including production, consumption and construction costs.

## UX

Explain how resources are exposed without turning NOVA into a dashboard.

## Tests

Report:

```text
pnpm typecheck:
pnpm lint:
pnpm test:
pnpm build:
pnpm test:e2e:gpu:
```

## Production changes

Explicitly state:

```text
Production behavior changed: YES
New systems: economy only
```

## Scope verification

Confirm that these were NOT implemented:

```text
households
workers
markets
trade
logistics
power grid
civilization stages
persistence
state hash
new terrain
```

## Final status

Use:

```text
PASS — Economy Foundation implemented
```

only if all validations pass.

Otherwise:

```text
PARTIAL — Economy Foundation implemented with documented gaps
```
