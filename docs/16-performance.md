# NOVA — Performance

## Principle
Optimize the simulation and renderer separately.

## Simulation
Prefer:
- fixed/controlled ticks
- stable iteration order
- compact state
- derived values cached only when justified
- bounded work per tick

## Rendering
Prefer:
- instancing
- LOD
- frustum/screen-space culling
- batched updates
- object reuse

## Scale target
The architecture should be able to grow from one colonist to many without requiring one Three.js object or React component per simulation concern.

## Rule
Do not optimize hypothetical scale before measuring actual bottlenecks.
