# NOVA — Step 10BG — Town Product Vision & Simulation Capability Design

## 1. Repository State

- **Current commit**: `90f04c7` (Step 10BF: Scenario Content Closure & Playability Audit)
- **Test status**: 1608 tests passed (86 test files), 1 failing test
- **Uncommitted**: `docs/roadmap/Step10BG.md` (this design document)
- **Build status**: Typecheck ✓, Lint ✓, Build ✓ (minor chunk-size warning)
- **Simulation model**: Version 1.0 (Village → Town transition underway)

## 2. Current Simulation Model

### Core Entities

| Entity | Domain | Role |
|--------|--------|------|
| **Colonist** | `src/domain/population/colonist.ts` | Agent with residence, workplace, and construction assignment |
| **Building** | `src/domain/building/building.ts` | Structural units (residence, workshop, farm, road segment) |
| **Resource** | `src/domain/resource/resource.ts` | Construction material, food, water (canonical stocks) |
| **Road** | `src/domain/road/road.ts` | Connectivity between grid cells |
| **Simulation** | `src/domain/simulation/step.ts` | Deterministic tick loop: construct → feed → produce → consume → evolve |

### Key Flows (per tick)

1. **advanceConstruction** – Builds new structures (residences, workshops, farms, roads)
2. **updateNeeds** – Calculates food/water demand based on population & housing
3. **produceFood** – Farms generate food (2/farm/tick)
4. **produceWater** – Operational wells generate water (2/well/tick)
5. **consumeFood** – Colonists eat (1/food-colonist/tick)
6. **consumeWater** – Watered colonists hydrate (1/water-colonist/tick)
7. **updatePopulation** – Colonists move/reside based on needs
8. **assignJobs** – Colonists take workplaces (food → construction → water)
9. **produceMaterial** – Employed colonists craft construction material (2/worker/tick)
10. **progressPlacedRoads** – Roads advance toward completion
11. **upkeepBuildings** – Buildings decay/maintain
12. **releaseCompletedConstructionCrew** – Crews return to idle

### Current Limitations

- **No centralized storage** – Resources are distributed across scattered buildings
- **No inventory management** – Surplus resources are lost or uncoordinated
- **No strategic planning layer** – Colonists react to immediate needs only
- **Limited economic depth** – Linear resource flow with no buffer or trade

## 3. Current Gameplay Ceiling

### What Village Can’t Do

At the Village stage, the system supports:
- Basic survival (food, water, shelter)
- Simple production (farms, workshops)
- Basic construction (residences, roads)
- Individual colonization decisions

### Where the Gap Exists

As the colony grows, the following problems emerge:

1. **Resource fragmentation** – Food, water, and construction material are scattered across many buildings. A village lacks a way to coordinate storage and redistribution.
2. **No strategic buffer** – Colonists consume immediately; there’s no ability to hoard surplus for lean periods.
3. **No economic specialization** – All colonists do the same work; no distinction between farmers, builders, traders, etc.
4. **No governance layer** – Decisions are made individually; no collective planning or coordination.

These limitations mean the game feels “flat” once the population exceeds a few dozen. The next evolution (Town) must address these gaps with a **minimal but transformative** system.

## 4. Town Design Problem

**Question**: What new systemic capability transforms the village into a town?

**Answer**: **Centralized Storage & Inventory Management**

A town introduces a **centralized storage system** that allows the colony to:
- Accumulate surplus resources (food, water, materials) in a single location
- Plan ahead by holding resources for lean seasons
- Coordinate production and consumption strategically rather than reactively
- Support specialization (some colonists focus on crafting, others on farming, others on maintenance)

This is the smallest new system that creates a fundamentally new gameplay loop: **strategic resource management**.

## 5. Design Candidates (Shortlisted)

| Concept | Description | Complexity | Strategic Impact |
|---------|-------------|------------|-----------------|
| **Centralized Storage** | Central granary/warehouse for food, water, materials | Low | High – enables buffering, planning, specialization |
| **Specialized Facilities** | Dedicated craft halls, markets, guilds | Medium | Medium – adds variety but less systemic depth |
| **Governance Council** | Collective decision-making body | High | Low – adds social layer, not core gameplay |
| **Trade Network** | External exchange with other settlements | High | Medium – adds economy but depends on external nodes |

**Selected**: **Centralized Storage** – it directly addresses the core limitation (resource fragmentation) with minimal implementation effort while enabling rich strategic depth.

## 6. Town Core Capability

### Name
**Centralized Storage System**

### Core Fantasy

> **Town** is the phase where the colony gains the ability to **store, buffer, and strategically deploy** essential resources—food, water, and construction materials—across the settlement. Instead of reacting to immediate hunger or thirst, players can **accumulate surplus** and **plan for lean times**, creating a deeper economic and strategic layer.

### New Problem Solved

- **Fragmentation** → **Centralization**: All resources flow to a single storage hub
- **Reactive consumption** → **Strategic planning**: Players decide what to store, when to release
- **Individual labor** → **Specialization potential**: Some colonists focus on storage/management while others produce

### Minimal New System

| Component | Purpose |
|-----------|---------|
| **Storage Hub** | Central location for food, water, and construction material |
| **Storage Capacity** | Fixed capacity per resource type (e.g., 50 food, 30 water, 40 material) |
| **Inventory Tracking** | Record of stored quantities per resource type |
| **Allocation Logic** | Rules for moving resources in/out of storage (based on need vs. surplus) |
| **Surplus Detection** | Flag when storage is near capacity (encourages production) |

### Integration Points

- **Reuse existing resources** – Uses the same `ResourceStock` interface
- **Integrate with production** – Storage fills when production exceeds consumption
- **Integrate with population** – Storage serves colonists’ needs
- **Preserve determinism** – All allocation rules are deterministic

## 7. Trade-offs

| Aspect | Choice | Reason |
|--------|--------|---------|
| **Storage size** | Fixed capacities (e.g., 50 food, 30 water, 40 material) | Simplicity; avoids complex sizing decisions early on |
| **Allocation priority** | First-come-first-served for overflow | Keeps logic simple; can be refined later |
| **Storage location** | Single hub (not distributed) | Minimal complexity; can be expanded to regional depots later |
| **Specialization** | None initially – storage is universal | Focus on core mechanic; add specialization in City |

## 8. Selected Capability

**Centralized Storage System** – a single hub that aggregates food, water, and construction material, allowing the colony to buffer surplus and plan strategically.

## 9. Town Product Vision

> **Town** introduces a **centralized storage system** that transforms the colony from a reactive survival group into a strategic civilization. Colonists can now accumulate surplus resources, anticipate lean periods, and specialize roles. The town phase marks the shift from **individual survival** to **collective planning**.

## 10. Core Gameplay Loop

```
Player decides what to produce → Storage fills up → Player monitors storage levels → During lean periods, draw from storage → If storage is low, adjust production → Repeat
```

**Loop stages**:
1. **Production Phase** – Farmers, workshops, and construction sites generate resources
2. **Accumulation Phase** – Surplus flows to the central storage hub
3. **Management Phase** – Players monitor storage, decide allocations, and plan for shortages
4. **Consumption Phase** – Storage feeds colonists, keeping everyone fed and housed

## 11. Simulation Model (Updated)

### New State Fields

```typescript
// Added to SimulationState
readonly storage: StorageHub;

interface StorageHub {
  readonly food: number;      // Total food stored
  readonly water: number;      // Total water stored
  readonly material: number;   // Total construction material stored
  readonly capacity: StorageCapacities; // Max per resource type
}

interface StorageCapacities {
  readonly food: number; // e.g., 50
  readonly water: number; // e.g., 30
  readonly material: number; // e.g., 40
}
```

### Updated Step Flow (high-level)

```
advanceConstruction → updateNeeds → produceFood → produceWater → consumeFood → consumeWater →
updatePopulation → assignJobs → produceMaterial → allocateFromStorage →
progressPlacedRoads → upkeepBuildings → releaseCrews →
**ALLOCATE** (new: move surplus to storage) → advanceTime
```

### Allocation Logic (AllocateFromStorage)

- If storage is below capacity → fill to capacity (surplus absorbed)
- If storage is above capacity → distribute excess to production queues (free up space)
- Priority: food → water → material (critical needs first)
- Overflow: excess spills to "discarded" pile (optional, for realism)

## 12. Population Impact

- **More survivors** – Storage prevents starvation during bad seasons
- **Larger populations** – Can support more colonists due to reliable food/water supply
- **New roles** – Some colonists can focus on storage management while others produce

## 13. Economy Impact

- **Buffer effect** – Reduces volatility from seasonal fluctuations
- **Strategic depth** – Players must balance production vs. storage
- **New optimization** – Hoarding surplus for lean periods becomes a deliberate strategy

## 14. Spatial Impact

- **Central hub** – Storage occupies a prominent location in the grid
- **Grid influence** – Storage placement affects road/road-network connectivity (nearby roads get prioritized)
- **No new geography** – Doesn't require expanding the world size

## 15. Road / Network Impact

- **Indirect benefit** – Better resource availability means roads are less congested
- **No direct road changes** – Roads remain as they were; storage sits atop the existing grid

## 16. Progression Impact

- **Step 10BG → Step 10C** – Transition from Village to Town
- **Step 10C → Step 10D** – Town begins influencing neighboring areas (via trade/influence)
- **Future steps** – Specialization, governance, and metropolis layers build on storage

## 17. UX Requirements

- **Visual indicator** – Show storage levels (bar charts, icons) on the world map
- **Alert system** – Warn when storage is critically low or full
- **Allocation UI** – Simple controls to move resources in/out of storage
- **Feedback** – Clear indication of what storage is being used for

## 18. Determinism & Invariants

- **Same initial state + same command → same outcome** (already true for existing simulation)
- **Storage allocation follows deterministic rules** – No randomness
- **Hash stability** – Storage state included in the canonical hash

## 19. Save / Load Impact

- **Storage state** is part of `SimulationState` → automatically saved
- **No new persistence challenges** – Just add storage fields to the existing schema

## 20. City / Metropolis Boundaries

- **Town** is the bridge between Village and City
- **City** will add governance, specialization, and larger-scale economics
- **Town remains manageable** – Still a single storage hub, not a sprawling empire

## 21. Architecture Impact

- **New subsystem**: `StorageHub` class (singleton)
- **Modified**: `SimulationState` (adds storage field)
- **Modified**: `ResourceStock` (now includes storage tracking)
- **No breaking changes** – Existing code continues to work

## 22. Test Strategy

| Area | Tests |
|------|--------|
| **Storage allocation** | Verify surplus fills storage, overflow goes to production queue |
| **Capacity limits** | Ensure storage respects capacity caps |
| **Interaction with production** | Storage fills when production exceeds consumption |
| **Determinism** | Same state + same command → same allocation |
| **Edge cases** | Empty storage, full storage, mixed resource types |
| **Regression** | All 1608 existing tests must still pass |

## 23. Implementation Sequence

1. **Add StorageHub class** – Singleton managing food, water, material
2. **Extend SimulationState** – Add `storage` field
3. **Modify allocation logic** – Insert `allocateFromStorage()` step
4. **Update step.ts** – Integrate storage into the tick loop
5. **Add UI indicators** – Visual bars for storage levels
6. **Write tests** – Cover allocation, capacity, interaction with production

## 24. Explicitly Out of Scope

- **Distributed storage** (regional depots) – Future enhancement
- **Specialized storage types** (separate bins for food/water/material) – Can be added later
- **Governance/council mechanics** – Part of City phase
- **Trade networks** – Requires external settlements
- **Dynamic storage capacity** (expanding based on population) – Simplified to fixed caps

## 25. Final Decision

**Town Core Capability: Centralized Storage System**

- **Why**: Directly addresses the primary limitation of the Village (resource fragmentation)
- **Impact**: Enables strategic resource management, population scaling, and economic depth
- **Complexity**: Low – single hub, simple allocation rules, reuses existing resource infrastructure
- **Next Steps**: Implement StorageHub, modify allocation logic, add UI feedback

**Status**: Ready for implementation. The design is complete and justified.
