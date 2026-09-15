# Step 8 — Urban Growth & Development Pressure

## Objective

Evolve the autonomous development system from:

```text
condition
    ↓
build first valid cell
```

toward:

```text
condition
    ↓
development pressure
    ↓
evaluate valid cells
    ↓
choose the most appropriate cell
    ↓
build
```

The purpose is to make autonomous city growth spatially coherent.

At the end of this step, NOVA should no longer simply build the first valid cell in a zone.

A residential area should naturally tend to **grow outward from existing residential buildings**.

An agricultural area should tend to **grow as a coherent agricultural cluster**.

This is the beginning of procedural urban morphology.

---

# 1. Read the architecture first

Read:

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

Inspect the completed implementation of:

* Step 5 population
* Step 6 economy
* Step 7 zoning/autonomous development

Do not rewrite existing systems unnecessarily.

---

# 2. Core principle

The city should develop according to spatial relationships.

Current behavior:

```text
zone
 ↓
first valid cell
 ↓
building
```

Target behavior:

```text
zone
 ↓
candidate cells
 ↓
development pressure
 ↓
deterministic score
 ↓
highest-scoring cell
 ↓
building
```

The system must remain deterministic.

There must be no stochastic decision-making in this step.

---

# 3. Introduce Development Pressure

Create a domain concept representing the attractiveness of a cell for autonomous development.

For example:

```ts
type DevelopmentPressure = {
  position: GridPosition;
  score: number;
};
```

Adapt naming to existing conventions.

Do not make this a generic AI score.

It is specifically a deterministic spatial-development score.

---

# 4. Candidate generation

The development system should first find candidate cells.

A candidate must:

* belong to the relevant zone
* be inside the world
* be buildable
* not contain a building
* satisfy normal construction validation

Reuse the existing placement validation.

Do not duplicate terrain rules.

Do not create a second notion of "buildable".

---

# 5. Residential pressure

For residential development, calculate a score for each candidate cell.

The primary factor should be:

```text
distance to existing residential buildings
```

Prefer cells adjacent to existing residential development.

For example:

```text
existing house
      ↓
[H][candidate][candidate]
```

should score higher than an isolated cell.

The exact scoring model can be simple.

For example:

```text
adjacent residential building
    +100

distance 2
    +50

distance 3
    +25

farther
    lower score
```

Do not use floating-point spatial calculations if integer Manhattan distance is sufficient.

---

# 6. Agricultural pressure

Agricultural development should use a similar spatial rule.

Prefer cells adjacent to existing farms.

For example:

```text
[F][candidate][candidate]
```

should be preferred over an isolated agricultural cell.

This creates coherent agricultural clusters.

Do not introduce terrain fertility yet.

Do not introduce water proximity.

Do not introduce soil quality.

Do not introduce advanced agriculture.

---

# 7. Manhattan distance

Use grid-based Manhattan distance:

```text
distance =
abs(x1 - x2) +
abs(y1 - y2)
```

Keep this deterministic and cheap.

Do not introduce:

* pathfinding
* Euclidean geometry
* navigation meshes
* road travel distance

Road-aware development comes later.

---

# 8. Local neighborhood bonus

In addition to distance, give candidates a bonus for immediate neighboring buildings of the same category.

For example:

```text
North
South
East
West
```

Use the existing grid conventions.

Do not use diagonal adjacency unless the existing spatial model explicitly requires it.

The goal is to create contiguous development.

---

# 9. Deterministic scoring

The score must be entirely derived from simulation state.

For example:

```text
score =
    adjacencyBonus
    + proximityScore
```

Do not use:

```text
Math.random()
Date.now()
performance.now()
```

Do not use browser state.

Do not use object insertion order as a tie-breaker.

---

# 10. Tie-breaking

Equal scores must produce deterministic results.

Use an explicit ordering.

For example:

```text
1. highest score
2. lowest y
3. lowest x
```

Document this rule.

The same state must always select the same cell.

---

# 11. Do not introduce randomness yet

Do NOT add:

* random variation
* noise
* procedural randomness
* seeded random selection
* probabilistic growth

The purpose of this step is to establish a stable deterministic growth model.

Controlled randomness can be introduced later if it improves visual diversity.

---

# 12. Residential morphology

The expected behavior should be:

### Empty residential zone

No existing residential building:

```text
R R R R
R R R R
R R R R
```

The first house can use the deterministic fallback ordering.

Then subsequent houses should prefer cells adjacent to the existing house.

Example:

```text
. . . .
. H H .
. . . .
```

rather than:

```text
H . . .
. . . H
. . . .
```

The city should begin forming clusters.

---

# 13. Agricultural morphology

Apply the same principle to farms.

Example:

```text
. F F .
. F . .
. . . .
```

should be preferred over scattered isolated farms.

The objective is not realism.

The objective is **coherent spatial growth**.

---

# 14. Mixed-use boundaries

Residential and agricultural zones may exist next to each other.

Do not prevent this.

However, development scoring must respect the building type being created.

A residential development should prioritize:

```text
residential buildings
```

not farms.

An agricultural development should prioritize:

```text
farms
```

not houses.

Do not create a general-purpose "nearest building" score.

---

# 15. Existing roads

Do not yet make roads part of the development score.

Road-aware development is intentionally deferred.

However, existing construction validation must continue to prevent illegal placement.

Therefore:

```text
Road
 ↓
may block candidate
```

but:

```text
Road
 ↓
does not increase attractiveness
```

yet.

This is important because road accessibility will eventually become one of NOVA's major development forces.

---

# 16. Existing buildings outside zones

Buildings outside the relevant zone should not directly attract development inside it.

For example:

```text
Residential Zone
       |
       |      House outside zone
       |
```

A house outside the residential zone should not create residential pressure inside that zone.

Only buildings relevant to the zone's development rule should contribute.

Keep the rule explicit.

---

# 17. Zone-specific development evaluator

Prefer a small abstraction rather than a giant conditional.

Conceptually:

```text
DevelopmentRule
├── residential
└── agricultural
```

Each rule can provide:

```text
canDevelop()
findCandidates()
scoreCandidate()
```

Do not over-engineer this into a plugin framework.

Two explicit domain implementations are preferable to a highly generic architecture.

---

# 18. Preserve the existing development rate

Keep the existing:

```text
one autonomous construction every 10 simulated seconds
```

unless the implementation reveals a concrete reason to change it.

Do not change simulation speed.

Do not introduce a second cooldown.

Do not make development depend on render frames.

---

# 19. Development pressure must not alter eligibility

Keep these concerns separate:

```text
Eligibility
    ↓
Can this cell contain the building?

Pressure
    ↓
Which valid cell is preferable?
```

Do not allow pressure to override construction rules.

For example:

```text
high score
+
water
=
still invalid
```

The candidate must first pass normal construction validation.

---

# 20. Population and economy remain unchanged

Do not modify the underlying population rules.

Do not modify food production.

Do not modify food consumption.

The only new behavior is:

```text
existing pressure
    ↓
better spatial selection
```

The existing feedback loops should continue to work.

---

# 21. Simulation ordering

Keep the Step 7 simulation ordering.

Do not introduce new same-tick feedback loops.

The development system should continue to run after the systems whose state it consumes.

Document the ordering.

---

# 22. Rendering

No major rendering work is required.

Existing:

* residential zone rendering
* agricultural zone rendering
* house rendering
* farm rendering

should remain unchanged.

Do not add development-pressure heatmaps.

Do not add debug overlays to the production UI.

A development-pressure visualization may be useful later for debugging, but it is not part of the player-facing implementation.

---

# 23. Optional debug instrumentation

If useful for development, create a development-only/debug representation of:

```text
candidate
score
selected cell
```

Do not expose this in the normal UI.

Do not introduce a permanent debug dependency into the renderer.

---

# 24. Performance

Do not scan the entire world for every development decision.

Restrict candidate evaluation to:

```text
cells belonging to the active zone
```

For each candidate, use only local/simple spatial queries.

Do not introduce premature spatial indexing.

However, avoid repeatedly scanning every building for every candidate if the current city representation makes that unnecessarily expensive.

If the existing city state is small, a straightforward implementation is acceptable.

Prioritize clarity.

---

# 25. Tests

Add tests for:

### Candidate generation

* invalid cells excluded
* occupied cells excluded
* cells outside zone excluded
* water excluded
* non-buildable terrain excluded

### Residential scoring

* adjacent house scores higher
* nearby house scores higher than distant house
* unrelated farms do not attract residential development

### Agricultural scoring

* adjacent farm scores higher
* nearby farm scores higher than distant farm
* houses do not attract agricultural development

### Determinism

* same state → same scores
* same state → same selected cell
* equal scores → deterministic tie-breaker

### Morphology

Verify that repeated autonomous development produces clustered buildings rather than arbitrary scattered placement.

For example:

```text
initial:
H

after development:
HH

after development:
HHH
```

or another deterministic cluster depending on zone geometry.

### Regression

Verify:

* existing population tests still pass
* existing economy tests still pass
* existing construction tests still pass
* existing zoning tests still pass

---

# 26. Strong determinism test

Create a complete scenario:

```text
World
+
Residential Zone
+
Population pressure
+
multiple candidate cells
```

Run the simulation twice from identical initial state.

Verify:

```text
same building count
same building IDs
same building positions
same zone state
same population
same economy state
```

Then repeat with different simulation update partitions if the runtime supports it.

Equivalent simulated time must produce the same final domain state.

---

# 27. Architecture restrictions

Do NOT introduce:

```text
CityAI
UrbanAI
PlannerAI
AgentManager
DesirabilityEngine
LandValueSystem
```

Do not create a generic AI framework.

Do not create a global development store.

Do not move domain decisions into React.

Do not move scoring into Three.js.

The development evaluator belongs to the simulation/domain layer.

---

# 28. Definition of Done

Step 8 is complete when:

### Development pressure

* [ ] Development pressure exists as a domain concept.
* [ ] Candidate cells are explicitly generated.
* [ ] Candidates pass normal construction validation.
* [ ] Residential candidates use residential spatial pressure.
* [ ] Agricultural candidates use agricultural spatial pressure.
* [ ] Manhattan distance is used.
* [ ] Local adjacency is preferred.
* [ ] Tie-breaking is deterministic.

### Autonomous growth

* [ ] Residential development becomes spatially coherent.
* [ ] Agricultural development becomes spatially coherent.
* [ ] Existing development rate remains 10 simulated seconds.
* [ ] No random decision-making exists.
* [ ] No same-tick circular dependency was introduced.

### Architecture

* [ ] No AI-agent system.
* [ ] No land-value system.
* [ ] No global manager.
* [ ] No React simulation logic.
* [ ] No Three.js simulation logic.

### Regression

* [ ] Existing population behavior remains unchanged.
* [ ] Existing economy behavior remains unchanged.
* [ ] Existing construction behavior remains unchanged.
* [ ] Existing zoning behavior remains unchanged.
* [ ] Top-down camera remains unchanged.

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

# 29. Final report

When finished, report:

1. Files created.
2. Files modified.
3. Development pressure model.
4. Candidate selection algorithm.
5. Residential scoring.
6. Agricultural scoring.
7. Tie-breaking strategy.
8. Simulation integration.
9. Tests added.
10. Validation results.
11. Intentional limitations.
12. Any architectural decisions that should be preserved for future development.
