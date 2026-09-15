# NOVA — Performance

## 1. Targets

Primary:

- stable 60 FPS;
- responsive interaction while simulation is running.

The reference device and measurable budgets are defined in [20-product-contract.md](./20-product-contract.md). A 120 FPS result is welcome, but is not an MVP requirement.

## 2. Performance Budget

Separate:

```text
Simulation time
Rendering time
UI time
Memory
```

Do not optimize based only on FPS.

## 3. Simulation

Use:

- fixed timestep;
- aggregate populations;
- compact state;
- predictable iteration;
- optional Web Worker.

## 4. Rendering

Use:

- instancing;
- batching;
- frustum culling;
- LOD;
- GPU particles;
- limited draw calls.

## 5. Adaptive Quality

When frame time exceeds the target:

```text
reduce particles
→ reduce postprocessing
→ reduce distant detail
→ reduce animation complexity
```

Never change simulation accuracy simply because rendering is slow.

## 6. Memory

Avoid retaining:

- obsolete geometry;
- duplicate snapshots;
- unnecessary historical render state.

Snapshots should be replaceable and compact.

## 7. Large Cities

Expected scale progression:

```text
MVP: 500 completed buildings
Mid: 1,000–10,000
Target: 10,000+
```

Population remains aggregate.

## 8. Profiling

Track:

- simulation tick duration;
- renderer frame time;
- draw calls;
- triangles;
- GPU memory;
- JS heap;
- Worker communication.

## 9. Performance Gates

A milestone should not be considered complete if a new system causes unexplained sustained frame-time regressions.

## 10. Degradation

Fallback hierarchy:

```text
WebGPU
→ WebGL2
→ reduced visual quality
```

The simulation must remain playable when visual quality is reduced.

WebGL2 is the baseline and must be tested first. Rendering degradation may reduce effects, particles and distant detail, but must never drop simulation ticks or alter simulation accuracy.
