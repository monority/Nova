# NOVA — Rendering Architecture

## 1. Renderer Responsibility

The renderer visualizes authoritative simulation state.

It must not own gameplay rules.

```text
Simulation State
      ↓
Render Snapshot
      ↓
Renderer
```

## 2. Technology

Target:

- Three.js;
- WebGL2 baseline;
- WebGPU optional backend;
- WGSL only in the WebGPU backend.

WebGL2 is the MVP release path. WebGPU is enabled only after it passes the same visual smoke tests and performance budgets. The simulation must not depend on either rendering backend.

## 3. Scene Layers

```text
Terrain
Buildings
Infrastructure
Traffic
Environment
Effects
Selection
```

Each layer has its own update strategy.

## 4. Instancing

Buildings of the same visual family should use instancing.

Do not create one heavyweight Three.js object per building when a batch can represent them.

## 5. LOD

LOD tiers:

```text
Near
→ full geometry

Medium
→ simplified geometry

Far
→ instanced silhouette / point representation
```

## 6. Traffic

Traffic is rendered as GPU-friendly moving particles/segments.

The simulation provides aggregate flow data.

## 7. Selection

Selection rendering is a derived effect.

It must not modify authoritative building state.

## 8. Shaders

Shaders should remain modular.

Possible materials:

- terrain;
- building;
- road;
- flow;
- water;
- night lights.

## 9. Post Processing

Use restrained effects:

- tone mapping;
- subtle bloom;
- ambient occlusion if affordable.

Every post-processing pass requires a measurable visual benefit.

## 10. React Boundary

React owns:

- menus;
- inspectors;
- controls;
- overlays.

Three.js owns:

- scene;
- camera;
- meshes;
- materials;
- animation.

Simulation owns:

- city state;
- economy;
- population;
- time.

## 11. Renderer API

Conceptually:

```ts
interface CityRenderer {
  initialize(canvas: HTMLCanvasElement): Promise<void>
  setSnapshot(snapshot: RenderSnapshot): void
  resize(width: number, height: number): void
  dispose(): void
}
```

The exact implementation can evolve without changing game systems.
