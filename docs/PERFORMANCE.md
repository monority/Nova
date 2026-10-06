# NOVA — Performance Engineering

## 1. Principle

Performance is a product requirement, but optimization must be evidence-driven.

## 2. Primary budgets

Track separately:

- simulation time per tick;
- render frame time;
- memory;
- world data size;
- save/load time;
- browser startup time.

## 3. Simulation

The MVP uses aggregate systems.

Avoid:

- per-person pathfinding;
- per-person economic accounting;
- unnecessary per-entity allocations each tick;
- repeated full-world scans when local/indexed data is sufficient.

## 4. Rendering

Prefer:

- instancing;
- batching where appropriate;
- LOD;
- frustum culling;
- limited dynamic object counts.

Do not optimize blindly.

## 5. World streaming

The long-term world can contain many sectors, but only the relevant level of detail should be active.

Detailed metropolitan rendering/simulation must not imply detailed simulation of the whole planet.

## 6. React

Avoid unnecessary re-renders of the entire application when a local panel changes.

Use selectors/memoization only where profiling justifies them.

## 7. Memory

Watch for:

- retained render objects;
- unbounded logs;
- duplicate content definitions;
- cached snapshots;
- abandoned event listeners.

## 8. Profiling workflow

When performance degrades:

1. reproduce with a known scenario;
2. capture baseline;
3. profile;
4. identify hotspot;
5. change one major variable;
6. rerun benchmark;
7. retain the optimization only if the evidence supports it.

## 9. Regression protection

Important performance regressions should have a repeatable benchmark or scenario.

Avoid fragile microbenchmarks that do not represent gameplay workloads.
