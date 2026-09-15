# NOVA — Step 2: Simulation Clock & Runtime

## Objective

Implement the first real **simulation runtime** of NOVA.

The goal is to establish a deterministic simulation clock that is completely independent from:

* React;
* Three.js;
* rendering FPS;
* browser frame rate;
* UI state.

At the end of this step, NOVA must have a functioning simulation loop capable of:

* starting;
* pausing;
* resuming;
* advancing by fixed simulation ticks;
* changing simulation speed;
* stepping manually;
* exposing the current simulation time;
* remaining deterministic regardless of rendering FPS.

This step must **not** implement population, economy, construction, buildings, traffic or other gameplay systems.

---

# 1. Read Before Coding

Before making changes:

1. Read `ARCHITECTURE.md`.
2. Read the existing `Step 1` implementation.
3. Read:

   * `00-product-vision.md`
   * `01-game-design.md`
   * `02-core-loop.md`
   * `03-city-simulation.md`
   * `09-time-and-events.md`
   * `13-technical-architecture.md`
   * `19-mvp.md`
4. Inspect the complete current repository structure.
5. Do not assume that the architecture from this prompt matches the current code exactly. Adapt to the actual repository while preserving the architectural principles.

Do not rewrite working Step 1 code unnecessarily.

---

# 2. Core Principle

NOVA has two different notions of time:

```text
REAL TIME
Browser / RAF / wall clock
        │
        ▼
Simulation Runtime
        │
        ▼
SIMULATION TIME
```

Rendering determines **when we display something**.

It must never determine **how much simulation time has passed**.

Therefore:

```text
Three.js FPS ≠ Simulation Time
```

A machine running at 144 FPS and a machine running at 60 FPS must produce the same simulation state when given the same simulation inputs.

---

# 3. Domain Ownership

The simulation clock belongs to:

```text
src/domain/simulation/
```

The runtime infrastructure belongs to:

```text
src/engine/simulation/
```

The distinction is important.

### Domain

Owns concepts such as:

* simulation time;
* simulation status;
* time scale;
* simulation tick;
* clock state.

### Engine

Owns:

* runtime loop;
* accumulation of real elapsed time;
* calling simulation ticks;
* connecting the runtime to browser/application execution.

The domain must not know about:

* `requestAnimationFrame`;
* `performance.now()`;
* browser APIs;
* Three.js.

---

# 4. Simulation Clock

Create a domain-level simulation clock.

The clock must represent at minimum:

```ts
SimulationClock {
  currentTick
  simulationTime
  timeScale
  status
}
```

Where:

```text
currentTick
```

is an integer simulation step.

And:

```text
simulationTime
```

represents the simulated elapsed time.

Use an explicit time unit.

Prefer a fixed simulation timestep such as:

```text
1 tick = 1/60 simulation second
```

or another value already established by the existing product documentation.

Do not mix seconds, milliseconds and ticks implicitly.

Create explicit conversion helpers where appropriate.

---

# 5. Simulation Status

Use an explicit state.

For example:

```ts
type SimulationStatus =
  | 'paused'
  | 'running'
```

Do not use ambiguous booleans such as:

```ts
isNotPaused
isStopped
isRunning
```

for the same concept.

The state must have one authoritative owner.

---

# 6. Time Scale

The simulation must support predefined time scales.

At minimum:

```text
0×
1×
2×
5×
20×
100×
```

Where:

```text
0× = paused
1× = normal
2× = 2x
5× = 5x
20× = 20x
100× = 100x
```

Keep the list centralized.

Do not scatter numeric literals such as:

```ts
if (speed === 20)
```

throughout the codebase.

Create an explicit domain representation.

For example:

```ts
type SimulationSpeed = 0 | 1 | 2 | 5 | 20 | 100
```

or an appropriate equivalent.

---

# 7. Clock API

Expose a small explicit API.

The exact names can follow the existing architecture, but the conceptual operations must exist:

```text
start()
pause()
setSpeed()
step()
reset()
advance()
```

Important distinction:

### `step()`

Advances exactly **one simulation tick**, regardless of speed.

This is useful for:

* debugging;
* testing;
* future timeline controls;
* deterministic inspection.

### `advance()`

Advances the simulation by the number of ticks requested by the runtime.

The clock must not itself know about browser elapsed time.

---

# 8. Fixed Timestep

The runtime must use a fixed timestep.

Conceptually:

```text
real elapsed time
       │
       ▼
accumulator
       │
       ├── tick
       ├── tick
       ├── tick
       │
       ▼
remaining accumulator
```

Do NOT implement:

```ts
simulationTime += deltaTimeFromRAF
```

because this would make simulation results dependent on frame timing.

Instead:

```text
real time
    ↓
accumulator
    ↓
fixed simulation ticks
```

---

# 9. Runtime

Implement the runtime under:

```text
src/engine/simulation/
```

The runtime should expose something conceptually similar to:

```ts
SimulationRuntime
```

Responsibilities:

1. receive a simulation;
2. receive a clock;
3. receive a tick function or simulation stepper;
4. consume real elapsed time;
5. calculate how many fixed ticks must be executed;
6. execute those ticks;
7. expose enough information for rendering interpolation later.

The runtime must not contain gameplay rules.

It should be infrastructure.

---

# 10. Runtime Loop

The browser integration may use:

```ts
requestAnimationFrame
```

but it must remain outside the domain.

Conceptually:

```text
requestAnimationFrame
        │
        ▼
real delta
        │
        ▼
SimulationRuntime
        │
        ▼
fixed ticks
        │
        ▼
Simulation
```

Rendering may run every frame:

```text
RAF
 ├── simulation update(s)
 └── render
```

But simulation update frequency must remain fixed.

---

# 11. Large Frame Delta Protection

Implement a maximum frame delta.

If the browser stalls for a long time, do not attempt to simulate an unlimited number of ticks in one frame.

For example:

```text
max real delta = configurable bounded value
```

The exact value should be chosen based on the architecture and documented.

This prevents:

```text
tab freeze
   ↓
5 minutes elapsed
   ↓
18,000 simulation ticks
   ↓
browser lockup
```

Do not silently discard simulation time without documenting the behavior.

Choose a clear policy.

---

# 12. Maximum Catch-Up

Also define a maximum number of simulation ticks processed per runtime update.

For example:

```text
maxTicksPerFrame
```

This protects against the "spiral of death":

```text
simulation falls behind
        ↓
more ticks required
        ↓
frame becomes slower
        ↓
even more ticks required
        ↓
simulation collapses
```

The value should be configurable.

Do not prematurely optimize it.

---

# 13. Deterministic Simulation

The simulation must be deterministic.

Given:

```text
same initial state
+
same commands
+
same number of ticks
```

the resulting state must be identical.

This applies regardless of:

```text
30 FPS
60 FPS
120 FPS
144 FPS
```

Do not use:

```ts
Date.now()
performance.now()
Math.random()
```

inside simulation logic.

Real-time APIs belong exclusively to the runtime boundary.

---

# 14. Simulation Step Contract

Create a small contract for advancing the simulation.

Conceptually:

```ts
SimulationStepper {
  step(state): state
}
```

or an equivalent architecture-compatible abstraction.

The important property is:

```text
one call
=
one deterministic simulation tick
```

Avoid creating an abstraction that is more generic than necessary.

Do not build a full ECS or plugin architecture.

---

# 15. Simulation State

Create the minimal simulation state.

It should contain the clock-related state required by the current simulation.

Do not duplicate:

```text
simulationTime
```

in several places.

There must be one authoritative source.

For example:

```text
Simulation
 ├── clock
 └── world
```

The exact structure should follow the existing domain architecture.

---

# 16. World Integration

Integrate the world created in Step 1 with the simulation.

The relationship should conceptually become:

```text
World
  +
Simulation Clock
  +
Simulation State
      │
      ▼
Simulation Runtime
```

The world itself does not need to change every tick yet.

That is intentional.

The simulation can currently advance time without gameplay systems.

Do not invent fake population or economy updates just to demonstrate ticking.

---

# 17. Application Layer

Introduce the application-level operations required to control the simulation.

For example:

```text
startSimulation
pauseSimulation
setSimulationSpeed
stepSimulation
resetSimulation
```

The application layer coordinates these operations.

UI must not directly mutate the domain clock.

The dependency should remain:

```text
UI
 ↓
Application command
 ↓
Simulation
```

---

# 18. Rendering Integration

The renderer should consume the simulation state.

For now, the visible world can remain visually identical to Step 1.

Optionally expose a very small debug representation of time:

```text
YEAR 0
DAY 1
TICK 1234
1×
```

However, do not turn this into the final NOVA HUD.

The important thing is proving:

```text
simulation running
        ↓
simulation time changes
        ↓
renderer can observe the state
```

---

# 19. Minimal Debug UI

Add only the controls necessary to validate the runtime.

For example:

```text
[ ▶ / ❚❚ ] [ − ] [ 1× ] [ + ] [ STEP ]
```

or an equivalent minimal interface.

Required interactions:

* pause;
* resume;
* change speed;
* single-step.

Do not create a complete game toolbar.

Do not introduce a UI state-management library for this.

---

# 20. React Rules

React must not own the simulation loop.

Avoid:

```tsx
useEffect(() => {
  setInterval(...)
}, [])
```

Avoid:

```tsx
setState(...)
```

every simulation tick.

Avoid pushing the complete simulation state through React on every frame.

React should observe the simulation at an appropriate boundary.

The runtime remains imperative.

---

# 21. Rendering Frequency vs Simulation Frequency

Keep these concepts separate:

```text
Simulation:
fixed timestep

Rendering:
variable frame rate
```

For example:

```text
Frame 1 → 1 tick → render
Frame 2 → 1 tick → render
Frame 3 → 2 ticks → render
Frame 4 → 1 tick → render
```

The simulation result must depend only on the ticks executed, not on the number of rendered frames.

---

# 22. Interpolation Preparation

Do not implement visual interpolation yet unless the current renderer architecture requires it.

However, structure the runtime so that it can later expose:

```text
previous simulation state
current simulation state
interpolation alpha
```

This will later allow smooth rendering of moving:

* population;
* traffic;
* construction;
* environmental systems.

Do not prematurely build the interpolation system.

---

# 23. Tests

This step is heavily test-oriented.

## Clock tests

Test:

```text
initial state
pause
resume
speed changes
step
reset
```

## Fixed timestep tests

Given identical elapsed time:

```text
different frame partitions
```

must produce the same number of simulation ticks.

For example:

```text
100ms
```

must produce the same simulation result whether delivered as:

```text
100ms
```

or:

```text
16ms
16ms
16ms
16ms
16ms
20ms
```

assuming the same configured timestep and handling of the remainder.

## Determinism tests

Run the simulation twice:

```text
initial state A
initial state A

same commands
same number of ticks
```

Assert identical final state.

## Speed tests

Verify:

```text
1× → expected tick rate
2× → 2x simulation progression
5× → 5x
20× → 20x
100× → 100x
```

Do not make tests depend on actual wall-clock delays.

Use controlled elapsed-time input.

---

# 24. Runtime Testing

Do not use real `requestAnimationFrame` or timers for core deterministic tests.

The runtime should expose a way to feed controlled elapsed time.

Conceptually:

```ts
runtime.update(16.666)
runtime.update(16.666)
runtime.update(16.666)
```

This makes tests deterministic and fast.

Browser integration can then be tested separately.

---

# 25. Performance

The runtime should be lightweight.

Do not allocate large objects on every simulation tick.

Avoid:

```text
new object for every cell
new array for every subsystem
new closure for every entity
```

However:

**Do not implement a custom ECS or data-oriented architecture yet.**

The current population/world size is nowhere near large enough to justify it.

Measure first.

---

# 26. Error Handling

Define sensible invariants.

Examples:

```text
invalid speed
negative timestep
invalid clock state
invalid configuration
```

should not silently corrupt the simulation.

Use the project's existing validation/error conventions.

Do not introduce a giant error framework.

---

# 27. Documentation

Update documentation only where the implementation establishes an architectural rule that future steps need to know.

If necessary, add a short section to the relevant architecture document explaining:

```text
fixed timestep
simulation runtime
domain clock
rendering independence
```

Do not create excessive documentation for a small system.

---

# 28. Validation

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Then run the application.

Manually verify:

```text
[ ] application starts
[ ] world still renders
[ ] simulation starts
[ ] simulation pauses
[ ] simulation resumes
[ ] speed changes
[ ] STEP advances exactly one tick
[ ] renderer remains responsive
[ ] no React update every simulation tick
[ ] no obvious Three.js warnings
```

Verify that changing browser FPS does not alter deterministic simulation results.

---

# 29. Definition of Done

Step 2 is complete only when:

```text
[ ] Simulation clock implemented
[ ] Fixed timestep implemented
[ ] Simulation runtime implemented
[ ] Simulation speed implemented
[ ] Pause/resume implemented
[ ] Manual step implemented
[ ] Deterministic stepping implemented
[ ] Maximum delta protection implemented
[ ] Maximum catch-up protection implemented
[ ] World integrated with simulation state
[ ] Application commands implemented
[ ] Minimal debug controls implemented
[ ] React does not own simulation loop
[ ] Renderer remains independent from simulation timing
[ ] Unit tests implemented
[ ] Determinism tests implemented
[ ] pnpm typecheck passes
[ ] pnpm lint passes
[ ] pnpm test passes
[ ] Application runs correctly
```

---

# 30. Explicit Non-Goals

Do NOT implement:

```text
population
buildings
roads
construction
economy
resources
technology
events
citizens
traffic
pathfinding
weather
seasons
save/load
multiplayer
workers
ECS
GPU simulation
```

Do not start Step 3 automatically.

---

# 31. Final Report

When finished, return only a concise implementation report:

```text
## Step 2 — Simulation Clock & Runtime

### Implemented
- ...
- ...
- ...

### Architecture
- ...
- ...

### Simulation
- Fixed timestep: ...
- Tick duration: ...
- Supported speeds: ...
- Max delta: ...
- Max catch-up ticks: ...

### Tests
- pnpm typecheck: ...
- pnpm lint: ...
- pnpm test: ...

### Files created
- ...

### Files modified
- ...

### Decisions
- ...

### Known limitations
- ...

### Next step
- Step 3: ...
```

Do not implement the next step automatically.
