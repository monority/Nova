# NOVA — MVP

## Definition

The MVP is not a complete city simulator. It is proof that NOVA can produce a small, understandable causal simulation.

## MVP objective

The player should be able to create the first viable settlement relationship:

```text
BUILD
→ CONSTRUCT
→ OPERATE
→ CREATE HOUSING CAPACITY
→ COLONIST ARRIVES
→ RESIDENCE ASSIGNED
→ TIME ADVANCES
→ STATE CHANGES FOR A REASON
```

## MVP systems

### Required

- controlled world/grid;
- building placement;
- explicit construction lifecycle;
- operational housing;
- housing capacity;
- explicit colonist identity;
- residence assignment;
- deterministic simulation ticks;
- PLAY/PAUSE/speed controls if already present;
- canonical state/hash;
- inspection/query layer;
- deterministic unit/integration tests;
- persistence foundation where already supported by the project.

### Useful but not required for the first vertical slice

- zones;
- roads;
- autonomous development;
- road influence;
- richer visual feedback;
- existing debug tools.

These should not obscure the core housing → colonist causal chain.

## Explicitly outside MVP

- full economy;
- large resource catalogue;
- complex needs simulation;
- advanced traffic;
- vehicles;
- technology tree;
- politics;
- large-scale procedural city generation;
- sophisticated AI;
- decorative content used to simulate depth.

## MVP success test

A fresh controlled scenario must demonstrate that a player action creates a physical state, that state becomes operational according to explicit rules, and a colonist only appears/gets housed when the required capacity exists.

The result must be understandable both in tests and through the product UI.
