# NOVA — World & Terrain

## 1. World Goals

The world exists to create interesting constraints for city growth.

Terrain should affect:

- buildable area;
- transport;
- water access;
- agriculture;
- expansion;
- visual composition.

## 2. World Generation

World generation is deterministic from:

```ts
interface WorldSeed {
  seed: number
}
```

Suggested generation stages:

```text
Seed
→ elevation field
→ water mask
→ biome classification
→ resources
→ buildability
→ starting location
```

## 3. Terrain Types

Initial set:

- plains;
- hills;
- mountains;
- coast;
- river;
- lake.

Avoid excessive biome complexity until the core simulation is stable.

## 4. Buildability

Every terrain cell has a buildability classification:

```text
BUILDABLE
RESTRICTED
WATER
MOUNTAIN
```

Additional slope constraints may refine this later.

## 5. Resources

Resource deposits should be sparse and readable.

Initial resource types:

- fertile land;
- water;
- timber/material source;
- mineral source;
- later: energy potential.

## 6. Starting Location

The generator should evaluate candidate locations using:

- buildable area;
- water proximity;
- food potential;
- expansion potential;
- visual interest.

The starting location must never be obviously unwinnable in sandbox mode.

## 7. Map Scale

The MVP uses a deterministic bounded 128 x 128 cell map large enough for:

- one village;
- several districts;
- visible expansion.

Large procedural worlds are a later optimization problem, not an MVP requirement.

The generated starting location must satisfy the buildable-area, water-distance and fertile-land checks in [20-product-contract.md](./20-product-contract.md). These checks prevent an unwinnable sandbox opening.

## 8. Visual Terrain

Use abstract materials:

- flat or gently varying color;
- subtle height shading;
- minimal texture;
- clear coast and water boundaries.

Terrain must remain subordinate to the city.
