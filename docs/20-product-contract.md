# NOVA - Product Contract

This document is the source of truth for the first playable product. If another document conflicts with it, this document wins until the conflict is intentionally resolved.

## 1. Product Promise

NOVA is a deterministic, contemplative city-builder in which the player establishes conditions and priorities while the simulation generates the detailed city.

The first release must prove one claim:

> A player can found a settlement, understand why it grows, and enjoy watching it become a small city.

The MVP is a client-first Vite application. No backend or server-rendered route is required for the first playable release.

## 2. MVP Scope

### Included

| System | MVP commitment | Not required yet |
|---|---|---|
| World | Seeded 128 x 128 cell map with plains, hills, coast, river and lake | Large worlds, multiple regions, bridges |
| Construction | Roads, residential zones, food and energy service nodes | Manual house placement, demolition economy |
| Population | Aggregate households and workers | Individual citizens, age cohorts |
| Economy | Food, energy, materials and storage capacity | Taxes, debt, prices, complex markets |
| Growth | Settlement, Village and Town stages | City, Metropolis and Autonomous Civilization |
| Time | Pause, 1x, 2x, 5x and 20x | 100x until performance is proven |
| Rendering | WebGL2 baseline, optional WebGPU backend, instancing, day/night | GPU traffic simulation and advanced post-processing |
| Persistence | One manual slot plus one autosave slot, versioned local save | Cloud saves, sharing, replay export |
| UX | Build tools, speed controls, top metrics and inspector | Mobile layout, full scenario browser |

### Explicit exclusions

The MVP does not include research, policies, disasters, seasons, multiplayer, cloud services, individual pathfinding, realistic vehicles, detailed pedestrians, procedural megacities or a mandatory failure state.

## 3. Canonical Simulation Contract

### 3.1 Units and clock

- One simulation tick equals one in-game day.
- 30 ticks equal one in-game month.
- 360 ticks equal one in-game year.
- The simulation uses integer fixed-point values where possible. Resource quantities are stored as integer units.
- The renderer may interpolate between snapshots, but interpolation never changes domain state.
- Speed changes the number of ticks processed per real second only; it never changes tick mathematics.

Recommended development speeds:

| Mode | Simulation rate | Purpose |
|---|---:|---|
| Pause | 0 ticks/s | Planning and inspection |
| 1x | 1 tick/s | Normal observation |
| 2x | 2 ticks/s | Short acceleration |
| 5x | 5 ticks/s | Growth periods |
| 20x | 20 ticks/s | Long observation; bounded by frame budget |

The simulation must never silently drop ticks. If the client cannot keep up, it enters a catch-up state and keeps rendering the latest committed snapshot.

### 3.2 Canonical tick order

Every tick executes exactly once in this order:

1. Apply commands queued for the tick.
2. Recompute terrain and network accessibility for changed cells.
3. Produce resources.
4. Consume resources and update storage.
5. Resolve housing, employment and population movement.
6. Generate construction demand and select parcels.
7. Advance construction and activate completed buildings.
8. Advance technology placeholders and milestone counters.
9. Emit causal events with stable IDs.
10. Compute derived metrics and commit the state hash.

Systems may read earlier results, but may not mutate another system's state outside this order.

### 3.3 Starting state

A new sandbox world starts with:

- 40 people;
- 12 households;
- 24 housing capacity;
- 180 food units;
- 120 energy units;
- 300 material units;
- storage capacity of 1,000 units for each resource;
- one settlement marker and no buildings;
- one deterministic starting location selected by world validation.

The starting location must have at least 900 buildable cells, water within 12 cells, and fertile land within 20 cells.

### 3.4 Resource rules

| Resource | Production | Consumption | Failure effect |
|---|---|---|---|
| Food | Farm: 8 units/tick | 1 unit per 10 people/tick | Growth stops; migration pressure rises |
| Energy | Generator: 12 units/tick | Building: 1 unit/tick; household: 1 per 20 people/tick | Services deactivate in deterministic priority order |
| Materials | Basic source: 6 units/tick | Construction cost | Construction queues pause |
| Water access | Derived from river, lake or well | 1 access point per 100 people | Health and growth modifiers decrease |

A resource balance is `production - consumption`. Storage is clamped to `[0, capacity]`; overflow is discarded and reported once per event window.

### 3.5 Population and growth

Population is represented by aggregate groups. The MVP uses one resident group and one worker count; future versions may split groups by district or skill.

Each tick:

```text
housingRatio = min(1, freeHousing / max(1, population))
foodRatio = min(1, foodAvailable / max(1, foodDemand))
energyRatio = min(1, energyAvailable / max(1, energyDemand))
accessRatio = accessiblePopulation / max(1, population)

wellbeing = clamp(
  0.30 * housingRatio +
  0.30 * foodRatio +
  0.20 * energyRatio +
  0.20 * accessRatio,
  0,
  1
)

netPopulationChange = round(population * 0.0008 * (wellbeing - 0.45))
```

Net change is clamped to `[-2, +8]` per tick in the MVP. Population never becomes negative. New residents require free housing and road access; otherwise positive growth is capped at zero.

### 3.6 Construction selection

A residential parcel is eligible when it is buildable, zoned, connected to a road, within 8 cells of active energy, and not occupied. Eligible parcels are ordered by:

1. distance to the settlement center;
2. road accessibility;
3. parcel ID.

The builder consumes 20 materials and completes one house after 3 ticks. A house adds 8 housing capacity, consumes 1 energy/tick, and becomes visible only after completion. No random tie-breaking is allowed.

## 4. Civilization Stages

Only the first three stages are MVP scope. Stage transitions are evaluated after the tick is committed.

| Stage | Entry conditions | Visible change |
|---|---|---|
| Wilderness | New world | Terrain and settlement marker only |
| Settlement | 1 completed house and population >= 20 | Houses, first road and service indicators |
| Village | Population >= 50, 6 houses, 1 food source, 1 energy source, 90% resource coverage over the last 30 ticks | Denser homes, storage and market visual language |
| Town | Population >= 500, 40 houses, 2 food sources, 2 energy sources, 70% road access, 80% average wellbeing over 60 ticks | Mixed district silhouettes, larger roads and civic buildings |

A stage cannot be lost in the MVP, but its visual prosperity state can decline. Population decline, shortages and abandoned houses remain visible consequences.

## 5. Commands and determinism

Every player action is a command with a monotonically increasing ID, target tick and canonical payload. Command order is `(targetTick, commandID)`.

A deterministic result requires the same:

- world seed;
- initial state;
- ordered command log;
- simulation tick count;
- PRNG algorithm and state;
- software save-format version.

The PRNG is never called from rendering or UI code. Every simulation tick produces a stable hash of canonical domain state for tests and diagnostics.

## 6. Persistence contract

The serialized save must contain:

```ts
interface SaveGameV1 {
  formatVersion: 1
  gameVersion: string
  seed: number
  simulationTick: number
  prngState: number[]
  state: WorldState
  commandLog: Command[]
  stateHash: string
  savedAt: string
}
```

Save writes are atomic: write a temporary record, validate it, then replace the slot. On load, validate the schema, bounds, references, collection sizes, command ordering and state hash before applying it. Invalid data is rejected without mutating the active game.

## 7. Performance contract

Reference device: four-core laptop CPU, integrated GPU, 1080p viewport, Chromium production build.

| Budget | MVP gate |
|---|---:|
| Simulation tick at 1x | p95 <= 4 ms |
| Simulation tick at 20x | p95 <= 12 ms |
| Render frame | p95 <= 16.7 ms |
| Input-to-visible feedback | <= 100 ms |
| Initial playable world | <= 5 seconds on reference device |
| Memory after 20 minutes | <= 512 MB |

The MVP target is 500 completed buildings. 1,000 buildings is a stretch target, not a release requirement. WebGL2 is the baseline; WebGPU is enabled only when its backend passes the same visual and performance tests.

## 8. Accessibility contract

- Every action has a keyboard path.
- Focus order is logical and visible.
- Text and controls meet WCAG 2.2 AA contrast targets.
- No gameplay information is conveyed by color alone.
- Speed, motion intensity and bloom can be reduced independently.
- Pause and slow speed are always available.
- The canvas has a live, throttled text summary containing stage, population, resource balances and the selected object.
- Screen readers receive status updates only for meaningful events, never every tick.

## 9. Acceptance gates

The MVP is accepted only when all are true:

1. A new player can create the first house without external instructions.
2. The first house appears within 60 seconds of a valid road and zone.
3. Population reaches 50 in a healthy test settlement within 15 minutes at 1x.
4. The same seed, commands and tick count produce the same state hash.
5. Saving, reloading and advancing 100 ticks produces an identical state hash.
6. A corrupted or invalid save cannot alter the active state.
7. The Playwright smoke flow passes in Chromium.
8. The reference performance budgets pass without disabling simulation accuracy.
9. Keyboard-only navigation reaches every MVP control.
10. The vertical slice remains visually understandable in both day and night states.

## 10. Change control

Any new MVP system must declare:

- the player problem it solves;
- the state it owns;
- its tick-order position;
- its save-format impact;
- its test and performance budget;
- which existing scope item it replaces or delays.

A feature without those six answers is post-MVP by default.
