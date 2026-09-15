# NOVA — Step 11
# Road Network Structure & Hierarchy

## Objective

Introduce a minimal structural analysis of the road network.

The goal is NOT to implement traffic, pathfinding, vehicles, congestion, or a sophisticated road AI.

The goal is to make the existing road network structurally meaningful.

After this step, NOVA should be able to distinguish between:

- local roads
- arterial roads

based purely on deterministic structural properties of the existing road network.

The system must remain:

- deterministic
- domain-first
- testable without React
- independent from Three.js
- independent from rendering
- compatible with the current top-view camera
- compatible with manual and autonomous road construction
- compatible with Step 10 autonomous road extension

---

# 1. Current architecture

The relevant current loop is approximately:

World
  ↓
Zones
  ↓
Development pressure
  ↓
Building
  ↓
Population / Economy
  ↓
Road influence
  ↓
Autonomous road extension
  ↓
Future development

Roads currently already support:

- deterministic IDs
- integer grid positions
- horizontal / vertical orientation
- neighbor connectivity
- connection masks
- occupancy validation
- manual placement
- autonomous placement
- autonomous local extension
- selection
- removal

Do NOT rewrite this system.

Step 11 should extend it.

---

# 2. New concept

Introduce a structural road hierarchy.

Minimum hierarchy:

```ts
type RoadClass =
  | "local"
  | "arterial";
Step 4
roads exist

Step 9
roads influence development

Step 10
roads can extend autonomously

Step 11
roads form a recognizable urban structure

The system should now be able to say, deterministically:

"This is one connected road network.
It contains several intersections.
Its structure is sufficiently developed to contain an arterial axis."

without needing traffic, vehicles, pathfinding, or individual agents.