# NOVA — Step 14

# Simulation Showcase & Visual Density

## Objective

This step is different from previous milestones.

Do NOT introduce another major simulation system.

The goal is to make the existing NOVA simulation visibly and experientially meaningful.

The project currently contains:

* terrain
* residential zones
* agricultural zones
* houses
* apartments
* farms
* population
* food economy
* autonomous development
* development pressure
* road influence
* autonomous road extension
* road hierarchy
* community services
* residential densification
* deterministic simulation clock
* top-down camera
* selection

The architecture is progressing well.

However, the current application must now be evaluated as an actual interactive experience.

The objective is:

> When the application starts and the simulation runs for several minutes, the player should visibly observe the city evolving.

Do not assume that a mechanic is successful because its unit tests pass.

The application itself must make the behavior observable.

---

# 1. First task: inspect the actual application

Before implementing anything significant, run the application.

Do not start by modifying domain code.

Inspect the current experience directly.

Evaluate at minimum:

* initial world
* number of buildings
* number of roads
* zones
* population
* simulation speed
* simulation controls
* UI density
* building visibility
* road visibility
* service visibility
* apartment evolution
* autonomous development
* autonomous road extension
* camera framing
* world scale
* visual contrast
* amount of empty space
* how much changes after 30 seconds
* how much changes after 1 minute
* how much changes after 3 minutes

If browser automation is available, use it.

If screenshots can be captured, inspect them.

Do not infer visual problems exclusively from source code.

---

# 2. Important distinction

There are two different notions of completion.

### Technical completion

```text
domain logic exists
tests pass
build passes
```

### Experiential completion

```text
player can see the system
player understands the system
simulation visibly evolves
city develops recognizable structure
```

Step 14 focuses on the second.

Do not sacrifice architecture to achieve it.

---

# 3. Do not add a new major system

Explicitly DO NOT introduce:

* commerce
* industry
* traffic
* pedestrians
* jobs
* happiness
* technology
* public transport
* advanced AI
* new resource types
* complex services
* procedural terrain overhaul

Use the systems that already exist.

The problem to solve is their **visibility, interaction and calibration**.

---

# 4. Create a meaningful starting scenario

The initial world should not feel empty.

Introduce a deterministic development seed/scenario if the current application starts from an almost empty world.

The scenario should contain a small but meaningful starting settlement.

For example:

```text
               agricultural zone
                    ░░░░░
                    ░░░░░
                       │
                       │
              ─────────┼────────
                    road
                       │
               ▪       │       ▪
                  ▪    │    ▪
                     ▪ │
                 community
                   service
```

The exact layout is up to the implementation.

The starting scenario should contain approximately:

* 5–10 residential buildings
* 1–3 farms
* 1 small road network
* 1 community service
* at least 1 residential zone
* at least 1 agricultural zone
* a meaningful starting population

Do not create a giant city.

The purpose is to provide a seed from which the simulation can visibly grow.

---

# 5. Deterministic scenario

The starting scenario must be deterministic.

Do not use:

```ts
Math.random()
```

Use the existing deterministic world/random infrastructure.

Starting the application twice with the same configuration must produce the same initial city.

---

# 6. Scenario architecture

Do not hard-code dozens of buildings inside React.

Prefer a domain/application-level scenario factory.

For example:

```ts
createDemoScenario(...)
```

or:

```ts
createInitialSettlement(...)
```

The exact name should follow the existing architecture.

The scenario should construct the city using existing domain/application commands where practical.

Avoid bypassing validation.

Do not directly mutate internal state just to make the demo.

---

# 7. Simulation pacing

Inspect the current simulation speed.

The player must be able to observe meaningful changes without waiting an excessive amount of real time.

The target is roughly:

```text
0–30 seconds
initial development visibly starts

30–90 seconds
new buildings / population / roads become visible

1–3 minutes
city structure noticeably changes

3–5 minutes
densification and network growth become clearly observable
```

These are target UX ranges, not hard-coded requirements.

Do not simply increase simulation speed globally.

Instead evaluate:

* autonomous development interval
* population growth
* housing evolution interval
* road extension timing
* simulation speed controls

Tune only what is necessary.

---

# 8. Preserve determinism

Changing simulation pacing must not make the simulation frame-rate dependent.

The same simulated time must still produce the same state.

For example:

```text
advance 600 ticks
```

must produce the same result regardless of whether those ticks were processed:

```text
10 × 60 ticks
```

or:

```text
60 × 10 ticks
```

Respect the existing fixed-timestep architecture.

---

# 9. Make autonomous development visible

The existing autonomous development system should become clearly observable.

Verify that:

```text
zone
 ↓
development pressure
 ↓
building
```

actually happens at a reasonable pace.

If autonomous development is technically implemented but rarely triggers in the current scenario, adjust the scenario or thresholds.

Do not rewrite the development algorithm unless necessary.

---

# 10. Make road growth visible

The existing Step 10 system should visibly produce road extensions.

The initial settlement should contain conditions where autonomous development can create an isolated building and therefore trigger local road extension.

The player should eventually observe:

```text
building
   ↓
road connection
   ↓
new accessible area
   ↓
future building
```

Do not create scripted road animations.

The road must emerge from the actual Step 10 simulation.

---

# 11. Make apartment evolution visible

The existing Step 12 system must be observable.

Ensure the initial scenario allows at least one house to eventually reach the conditions required for:

```text
house
  ↓
housing pressure
  ↓
apartment
```

The evolution should happen naturally through the existing simulation.

Do not create a fake visual transition.

Do not manually upgrade the building in the scenario after a timer.

---

# 12. Make community services meaningful

Step 13 already introduces:

```text
community service
 ↓
local Manhattan coverage
 ↓
residential development influence
```

The initial scenario should position at least one service where its influence can realistically affect residential development.

Do not create a large visible coverage circle.

The effect should emerge through actual development decisions.

---

# 13. Visual density

Evaluate whether the current world is too sparse.

If necessary, adjust:

* starting settlement density
* building scale
* road width
* cell size
* camera zoom
* terrain framing

Do NOT solve sparse visuals with:

* giant buildings
* excessive glow
* huge UI
* decorative particles
* fake city lights
* post-processing effects

The city should look denser because there are more meaningful structures.

---

# 14. Building visual hierarchy

The current building vocabulary is small.

Make sure the existing structures are visually distinguishable.

At minimum:

```text
house
apartment
farm
community service
```

should have different silhouettes.

The distinction should come from:

* geometry
* proportions
* roof structure
* footprint
* vertical mass

not from excessive colors or emissive effects.

---

# 15. Road visual hierarchy

Step 11 already introduced:

```text
local
arterial
```

Verify that the distinction is actually visible at normal zoom.

If arterial roads are technically wider but the difference is imperceptible, tune the renderer.

The distinction should remain subtle.

Example:

```text
local:
────────

arterial:
════════
```

Do not turn arterials into glowing highways.

---

# 16. Camera framing

The camera must remain top-down.

Do NOT introduce:

* isometric
* perspective
* oblique camera
* cinematic orbit
* automatic camera movement

However, verify that the initial zoom makes the starting settlement easy to observe.

The player should not start:

```text
10× zoomed out
```

with the actual city occupying a tiny fraction of the viewport.

Nor should the camera start so close that the city immediately exceeds the viewport.

Tune the initial framing based on the actual application.

---

# 17. Simulation controls

The player should clearly understand:

* paused/running
* simulation speed
* current simulation time/tick
* ability to step
* reset

If the existing debug controls are too developer-oriented, improve their presentation without creating a full game HUD.

A compact top-level simulation control should be enough.

Example:

```text
────────────────────────────────────

  ▶  1×    02:34    Population 42

────────────────────────────────────
```

Keep the UI restrained.

---

# 18. Observable metrics

Expose only a few useful high-level metrics.

Potential metrics:

```text
Population
Housing
Food
Buildings
Roads
```

Do not expose every internal simulation variable.

The player should understand:

```text
city is growing
```

without seeing:

```text
DevelopmentPressureScore: 4.23871
RoadComponentId: 3
```

---

# 19. Event feedback

Consider adding a very subtle indication when important events occur.

For example:

```text
NEW HOUSE
NEW ROAD
BUILDING EVOLVED
```

This can be a small transient notification.

Do NOT create:

* pop-up spam
* achievement system
* notifications every tick
* large modal windows

The goal is simply to help the player notice events that would otherwise be easy to miss.

If event feedback requires a large architecture change, defer it.

---

# 20. Important: do not fake simulation

Do not implement:

```ts
setTimeout(() => createBuilding())
```

or:

```ts
if (elapsed > 30000) {
  createApartment();
}
```

or any equivalent presentation-only behavior.

Everything visible must come from the real simulation.

The demo scenario is only an initial state.

After initialization:

```text
simulation
```

must drive the city.

---

# 21. Real observation test

Perform an actual observation run.

At minimum:

```text
T = 0
T = 30 sec
T = 60 sec
T = 120 sec
T = 180 sec
T = 300 sec
```

At each point record:

* population
* buildings
* apartments
* farms
* roads
* services
* visible structural change

The purpose is not to create a benchmark.

The purpose is to verify that the city actually evolves.

---

# 22. Define an observable progression

The exact result depends on the deterministic scenario.

But the system should exhibit a progression broadly similar to:

```text
T0

small settlement
│
├── houses
├── farm
├── road
└── service


T30–60

population grows
│
├── additional house
├── road extension
└── stronger residential cluster


T60–120

housing pressure
│
├── additional development
├── road network growth
└── possible apartment evolution


T120–300

denser settlement
│
├── apartments
├── larger road structure
├── multiple residential clusters
└── increasingly recognizable urban form
```

Do not force this exact sequence.

Verify that the actual systems produce meaningful change.

---

# 23. If the simulation does NOT evolve

If observation reveals:

```text
T0 → T300
```

with almost no visible change, do not immediately add new mechanics.

Diagnose the bottleneck.

Possible causes:

* thresholds too high
* population growth too slow
* autonomous development interval too long
* starting zones too small
* insufficient housing pressure
* candidate selection too restrictive
* roads preventing development
* apartment conditions rarely satisfied
* world scale too large
* camera too zoomed out

Fix the smallest underlying cause.

---

# 24. If the simulation evolves too quickly

Likewise, avoid turning NOVA into a chaotic construction machine.

If:

```text
T30
```

already produces a dense city, slow the appropriate system.

The intended experience is:

```text
observe
→ understand
→ notice change
→ observe again
```

not:

```text
click play
→ city explodes
```

---

# 25. No new simulation abstractions unless necessary

Before introducing a new domain abstraction, ask:

> Can the existing systems produce the desired behavior with calibration or better initial conditions?

Prefer:

```text
better scenario
+
better thresholds
+
better presentation
```

over:

```text
new manager
+
new subsystem
+
new abstraction
```

---

# 26. Visual quality bar

The application should now feel like a small digital architectural model.

Target:

```text
dark background
+
restrained terrain
+
geometric buildings
+
thin road network
+
subtle hierarchy
+
small amount of UI
+
slow autonomous evolution
```

Avoid:

* generic city-builder UI
* colorful strategy-game aesthetic
* cyberpunk HUD
* excessive gradients
* huge cards
* glowing everything
* fake futuristic decoration
* excessive particle effects

---

# 27. Preserve top view

This is mandatory.

Do not change:

```text
Orthographic camera
top-down projection
```

Do not introduce perspective or isometric rendering.

The city should become interesting through its structure, not through camera movement.

---

# 28. Selection

Selection must continue to work for:

* house
* apartment
* farm
* road
* arterial road
* community service

The existing domain-selection architecture remains authoritative.

Do not rewrite selection.

---

# 29. Performance

Do not optimize blindly.

The current simulation is still small.

Prioritize:

1. correctness
2. determinism
3. visible behavior
4. maintainability

Only optimize if actual observation reveals a problem.

Do not introduce:

* Web Workers
* GPU simulation
* ECS
* spatial indexing
* instancing overhaul

unless profiling demonstrates that they are necessary.

---

# 30. Testing

Add tests only where behavior changes.

At minimum:

### Scenario

* deterministic initial state
* expected initial entities
* same seed → same state

### Simulation progression

* population changes after expected simulated time
* autonomous development occurs
* road extension occurs when conditions are met
* apartment evolution remains possible
* service influence remains active

### Regression

Existing tests must continue passing.

---

# 31. E2E / browser validation

This step explicitly requires actual browser observation.

If Playwright is available:

1. launch the application
2. inspect the initial viewport
3. start the simulation
4. wait for meaningful simulated time
5. inspect the resulting scene
6. verify that visible entities changed

If WebGL/Chromium stalls:

* record the infrastructure issue
* do not invent visual validation
* continue validating domain behavior through deterministic simulation tests

But if the browser works, actually inspect the application.

Do not mark the step complete solely from unit tests.

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

Additionally perform a real simulation observation run.

Report both:

### Automated

* typecheck
* lint
* unit tests
* E2E
* build

### Experiential

* initial city density
* simulation behavior at 30s
* simulation behavior at 60s
* simulation behavior at 120s
* simulation behavior at 300s
* whether new buildings appear
* whether roads extend
* whether apartments appear
* whether services affect development
* whether the city becomes visibly denser

---

# 33. Definition of Done

Step 14 is complete when:

* [ ] the application starts with a meaningful deterministic settlement
* [ ] the world is not visually empty
* [ ] simulation can run immediately
* [ ] autonomous development is observable
* [ ] population visibly evolves
* [ ] new buildings can appear
* [ ] autonomous road extension can be observed
* [ ] apartment evolution can be observed when conditions are met
* [ ] community services influence actual development
* [ ] local/arterial road distinction is visible
* [ ] buildings are visually distinguishable
* [ ] top-down camera remains unchanged
* [ ] selection remains functional
* [ ] UI remains restrained
* [ ] no fake scripted simulation is introduced
* [ ] deterministic simulation is preserved
* [ ] automated tests pass
* [ ] browser validation is performed when available
* [ ] production build passes

---

# Final principle

The goal of Step 14 is not to add another feature.

The goal is to make the features NOVA already has **come alive**.

The player should be able to look at the city and understand:

```text
I started with a small settlement.

The population grew.

The houses became insufficient.

New buildings appeared.

Roads extended toward them.

Some houses became apartments.

The settlement became denser.

The service influenced where development occurred.

The city is becoming something I did not manually draw.
```

That last property is the central experience of NOVA.

The simulation should now become something worth watching.
