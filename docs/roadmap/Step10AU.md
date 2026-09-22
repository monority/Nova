# Step 10AU — Terrain & Obstacles Design Contract

## CONTEXTE

Starting commit: `91de474` — Step 10AT complete.

Step 10AT closed the current 2/2 gameplay phase.

The current foundation is frozen:

* Farm: 2 Food/tick
* Well: 2 Water/tick
* Workshop: 2 Material/tick gross
* Workshop upkeep: 1 Material/tick
* Food: 1/colonist/tick
* Water: 1/colonist/tick
* Residence capacity: 1
* Residence/Farm/Well: 25 Material
* Workshop: 25 Material + 1 Water
* Road: 5 Material
* Construction: 2 ticks / 1 with Construction Crew
* Workshop storage: 25 Material
* Initial Material: 100
* Initial Food: 100
* Initial Water: 0
* SAVE_VERSION: 7

The current scenario catalogue contains 7 scenarios.

The current progression contract supports:

* Wilderness
* Settlement
* Village

Town and later stages remain undefined.

The architecture is explicitly frozen as a baseline:

* deterministic domain,
* pure application queries,
* declarative scenarios,
* data-driven objectives,
* no derived state persisted,
* insertion-order invariant,
* SAVE_VERSION 7.

Previous audits established that:

* adjacency does not currently create meaningful effects;
* density does not currently create meaningful effects;
* food distribution is intentionally global;
* Water is network-local;
* road topology affects access, workforce mobility, Water service and road cost;
* Partitioned Valley was rejected as a standalone scenario because without terrain/obstacles its spatial decision collapses into existing Recovery / Water / Spatial Efficiency decisions;
* terrain/obstacles are therefore the only remaining identified spatial capability that could make topology itself an independent constraint.

This step is **design only**.

Do not implement terrain.

---

# PRIMARY QUESTION

Define whether terrain/obstacles are actually the next justified capability.

The goal is not:

> "Add terrain because city builders have terrain."

The goal is:

> **Define the smallest spatial constraint that makes location and network topology create a new, measurable, non-overlapping player decision.**

The contract must prove that terrain would create something the current model cannot already express.

---

# STEP 1 — DEFINE THE MISSING CAPABILITY

Start from the evidence collected in Steps 10AH, 10AR and 10AT.

Explicitly document:

### What current roads can already express

* access,
* network membership,
* Water coverage,
* workforce mobility,
* road distance preference,
* Material cost.

### What current roads cannot express

Identify only effects demonstrated by the previous audits.

The expected gap is:

> The player can currently place a road through any empty cell, so a long detour, disconnected region, or spatially constrained corridor cannot be forced by the map itself.

Validate this statement rather than assuming it.

---

# STEP 2 — DEFINE TERRAIN SEMANTICS

Design the minimum terrain vocabulary.

Start with the smallest possible set.

Prefer:

### Buildable

Normal empty cell.

### Blocked

Cell that cannot contain a building or road.

Do not automatically add:

* fertile soil,
* mountains,
* water,
* pollution,
* elevation,
* biome,
* terrain cost,
* natural resources,
* decorative terrain classes.

A single blocked-cell concept is preferable if it is sufficient.

The question is whether **blocked topology alone** creates enough meaningful spatial pressure.

---

# STEP 3 — DEFINE WHAT A BLOCKED CELL MEANS

Produce a precise contract.

Determine:

* Can buildings occupy it?
* Can roads occupy it?
* Can the player build through it?
* Does it affect BFS connectivity?
* Does it affect road distance?
* Does it affect Water coverage?
* Does it affect workforce mobility?
* Is it immutable?
* Is it scenario-defined?
* Is it persisted?

Prefer the simplest answer consistent with the existing architecture.

Do not invent destruction, terraforming or excavation unless the evidence requires them.

---

# STEP 4 — IDENTIFY THE NEW PLAYER DECISION

Construct controlled conceptual layouts using existing buildings and roads.

Compare:

### Open map

Direct connection is possible.

### Obstructed map

The direct route is blocked.

### Constrained corridor

A longer existing route must be used.

Determine whether this creates a genuinely new choice such as:

* route around obstacle,
* postpone construction,
* choose a different building location,
* spend additional Material on roads,
* accept delayed Water service,
* accept delayed workforce mobility.

The new decision must not simply be:

> "Spend 25 Material on a Well instead of 25 Material on roads."

That already exists.

The terrain design must create a spatially caused consequence that cannot be reproduced by merely changing the starting resource stock.

---

# STEP 5 — COST / DISTANCE ANALYSIS

Use the existing road cost:

**5 Material per road cell.**

Do not change it.

Construct several theoretical gap lengths:

* 1
* 2
* 3
* 4
* 5
* 6
* 8
* 10 cells

Measure the resulting road Material cost.

Then compare against existing alternatives:

* second Well = 25 Material,
* additional Residence = 25,
* Workshop = 25 + 1 Water.

Determine where terrain-induced detours become materially consequential.

Do not select a threshold yet.

The goal is to establish the causal relationship:

> obstacle geometry → road length → Material cost / timing → settlement consequence.

---

# STEP 6 — PARTITIONED VALLEY REVISIT

Using the terrain hypothesis, revisit the rejected Partitioned Valley concept.

Do NOT implement it.

Construct conceptual variants where terrain makes the two previously interchangeable recovery paths non-equivalent.

Example structure:

### Variant A

Road bridge around obstacle is short.

### Variant B

Road bridge around obstacle is long.

### Variant C

Alternative Well placement is unavailable or strategically inferior because of the obstacle.

The exact geometry must be derived from the grid and existing rules, not invented as a gameplay threshold.

Determine whether:

* road recovery,
* alternative Well placement,
* delayed settlement,
* workforce recovery

become genuinely different choices.

If they still collapse into existing decisions, terrain is not yet justified.

---

# STEP 7 — TEST FOR NEW PHENOMENA

Terrain should only proceed if it creates at least one measurable phenomenon not currently present.

Candidate phenomena:

* mandatory detour,
* road-budget pressure caused by geometry,
* spatially constrained Water recovery,
* inaccessible buildable regions caused by topology,
* location opportunity cost,
* multiple viable routes with different economic consequences.

Reject candidates that are only renamed versions of:

* Water capacity,
* workforce mobility,
* road efficiency,
* Recovery,
* construction order.

---

# STEP 8 — SCENARIO TEST

Do not add a scenario.

Instead design **three hypothetical terrain scenario states** on paper/data fixtures:

### Terrain A — Simple obstacle

One blocked region forces a detour.

### Terrain B — Split settlement

A blocked region separates otherwise useful spaces.

### Terrain C — Constrained expansion

The initial settlement is viable, but expansion requires a longer route.

For each measure conceptually:

* first decision,
* resource trade-off,
* road cost,
* construction timing,
* Water service,
* workforce mobility,
* failure/recovery,
* objective interpretation.

Determine whether one of them represents a genuinely new decision space.

---

# STEP 9 — MINIMUM TERRAIN CONTRACT

If terrain is justified, define the minimum contract required for a future implementation step.

The contract must specify:

### State

Exactly what terrain information exists.

### Placement

Exactly which commands consult it.

### Simulation

Exactly which existing systems read it.

### Rendering

Exactly how it is visually represented.

### Scenario

How terrain enters scenario initial state.

### Persistence

Whether terrain belongs to persisted state or scenario configuration.

### Determinism

How terrain participates in hashing/replay.

### Insertion order

Terrain must not introduce ordering dependence.

### Save compatibility

Do not implement migration now.

If terrain requires a SAVE_VERSION change, document that as a future implementation consequence rather than changing it here.

---

# STEP 10 — NON-GOALS

Explicitly freeze the following unless later evidence requires reopening them:

* terrain productivity,
* fertile soil,
* natural resources,
* elevation,
* pollution,
* biome simulation,
* terrain destruction,
* terraforming,
* excavation,
* terrain-dependent building multipliers,
* terrain-dependent production rates,
* terrain-dependent worker bonuses,
* terrain-dependent Water production.

The first implementation should be about **space as constraint**, not a second economic system.

---

# STEP 11 — PRODUCT DECISION GATE

Classify terrain:

### A — JUSTIFIED

Blocked topology creates a new measurable decision that cannot be reproduced by existing resource/order mechanics.

### B — PROMISING BUT UNDERSPECIFIED

The spatial effect is real, but the minimum contract is not yet sufficiently precise.

### C — OVERLAPPING

Terrain only repackages existing road/Water/workforce decisions.

### D — REJECTED

No meaningful new phenomenon is demonstrated.

Do not implement terrain unless classification is A.

---

# STEP 12 — IF A, DEFINE THE NEXT IMPLEMENTATION STEP

If classification is A, the final report must define a precise next implementation step.

It should include:

* terrain state representation,
* map/scenario ownership,
* command checks,
* affected queries,
* rendering contract,
* test matrix,
* deterministic hashing requirements,
* save/load implications,
* first terrain scenario fixture.

Do not implement it in 10AU.

---

# STEP 13 — ARCHITECTURAL INVARIANTS

The design must preserve:

* deterministic simulation,
* pure queries,
* declarative scenarios,
* data-driven objectives,
* no hidden mechanics,
* no scenario-specific economic bypass,
* no new economic constants,
* no derived state persistence,
* insertion-order invariance.

The preferred architecture should keep terrain as **spatial input/state**, not as an economic subsystem.

---

# FINAL REPORT

Return exactly:

```text id="zavq10"
STEP 10AU — FINAL REPORT

Starting commit:
Final commit:

CURRENT SPATIAL CAPABILITY
- Existing effects:
- Missing capability:
- Evidence:

TERRAIN CONTRACT
- Minimum terrain types:
- Blocked semantics:
- Build placement:
- Road placement:
- BFS/network:
- Water:
- Workforce:
- Immutability:
- Scenario ownership:
- Persistence:

NEW PLAYER DECISION
- Open map:
- Obstructed map:
- Constrained corridor:
- New decision:
- Why it is not reproducible by existing mechanics:

COST / DISTANCE
- 1 cell:
- 2 cells:
- 3 cells:
- 4 cells:
- 5 cells:
- 6 cells:
- 8 cells:
- 10 cells:
- Economic consequence:

PARTITIONED VALLEY REVISIT
- Variant A:
- Variant B:
- Variant C:
- Distinctness:

NEW PHENOMENA
- Phenomena tested:
- Existing/overlapping:
- New:

HYPOTHETICAL TERRAIN SCENARIOS
- Terrain A:
- Terrain B:
- Terrain C:
- Distinct decision spaces:

PRODUCT DECISION
- Classification: A/B/C/D
- Evidence:
- Terrain justified: yes/no

MINIMUM IMPLEMENTATION CONTRACT
- State:
- Commands:
- Queries:
- Rendering:
- Scenario:
- Persistence:
- Determinism:
- Insertion-order:
- Save implications:

NON-GOALS:
- ...

NEXT IMPLEMENTATION STEP:
- ...

VALIDATION:
- Tests/audits:
- Typecheck:
- Lint:
- Build:
- Determinism:
- Insertion-order:
- Save/load:

SAVE_VERSION:
```

---

# HARD CONSTRAINTS

This is a design-contract step.

Do NOT:

* implement terrain,
* add blocked cells to the real game,
* change production rates,
* change consumption,
* change building costs,
* change road cost,
* add terrain bonuses,
* add natural resources,
* add pollution,
* add elevation,
* add biomes,
* add terraforming,
* add excavation,
* add logistics,
* add new objective types,
* add persistence,
* implement Town,
* add a scenario,
* reopen the 2/2 economic tuning decision.

The central question is:

> **Can the smallest possible terrain constraint make spatial topology itself a new, causal player decision, without turning terrain into a second economic system?**

Only if the answer is demonstrated by the existing model should terrain proceed to implementation.


---

# Documentation (as-built) — Step 10AU

Starting commit: `91de474` (Step 10AT).
Final commit: this commit.

**DESIGN ONLY — terrain is not implemented.** The real engine still has no
notion of a blocked cell: `config.world` has exactly three keys, the save
validator **rejects** any unknown field, every scenario is unchanged and the
7-scenario catalogue is untouched. Terrain was evaluated with an
**audit-local emulated obstacle set** (the harness simply refuses to route roads
through chosen cells) so the *consequences* could be measured on the real engine
without adding anything to it.

**Classification: `A — JUSTIFIED`, with a precise boundary**: the *cost* side of
terrain (detours, road budgets, route choice) is **overlapping** — it is a
renamed road-budget decision that a smaller starting stock reproduces exactly.
What is genuinely new is the **structural** side: a blocked cell is unusable *at
any price*, and a single connector cell becomes a role competition (road vs
building) whose loss of service and mobility cannot be reproduced by resources.

---

## 1. MEASURED — current spatial capability and the gap

**What a road already carries** (measured on one fixture): access
(`getBuildingRoadAccess` — all four buildings reached), network membership
(1 network), Water coverage (2 of 2 Residences served), workforce mobility
(`getColonistWorkWorkMobility.mobilityConnected = true`), the 09M distance
preference (residence↔farm road distance 0), and a 5-Material cost with a
2-tick construction.

**What roads cannot express** — the gap, validated rather than assumed:

* every in-bounds free cell accepts a road: **141 of 141** probed free cells
  return a valid road placement, so the only spatial refusal is an
  *already occupied* cell (`cellOccupiedByBuilding` / `cellOccupiedByRoad`);
* therefore no detour, corridor, chokepoint or unreachable region can be forced
  by the map: with an empty map the road reaches anything at 5 Material per cell;
* the world config carries no terrain concept (`['height', 'seed', 'width']`);
* road length costs **Material, not time**: one command lays every cell together
  and they all become operational on the same tick (measured: a 5-cell road and
  a 1-cell road finish identically). Because 09C drags are axis-aligned only, a
  detour costs **one extra command (= one extra tick) per straight segment**.

## 2. MEASURED — cost and distance geometry (emulated obstacles)

| gap (cells) | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| open map Material | 5 | 10 | 15 | 20 | **25** | 30 | 40 | 50 |
| building-equivalents | 0.2 | 0.4 | 0.6 | 0.8 | **1.0** | 1.2 | 1.6 | 2.0 |

Two obstacle shapes, both measured by BFS over the emulated blocked set:

| shape | extra cells | extra Material | crosses one building (25)? |
| --- | --- | --- | --- |
| isolated obstacle on the direct line | **+2** | 10 | no |
| separating wall, free end one row past the line | +2 | 10 | no |
| separating wall, free end two rows past | +4 | 20 | no |
| separating wall, free end four rows past | **+8** | **40** | **yes** |

**CAUSAL RELATIONSHIP (measured)**: obstacle geometry → road length → Material
cost → what else the colony can no longer afford. An *isolated* obstacle is
flanked for a small constant cost (10 Material, half a building); only a
*separating* wall (or a corridor) makes the detour exceed a building. Terrain
becomes consequential when it **separates**, not when it merely sits in the way.

## 3. MEASURED — the decision blocked topology changes

**Chokepoint role competition** (the new decision), measured on the real engine
with the wall emulated so that the connector cell (2,1) is the *only* route
between a west region (Residence + Farm) and an east region (Residence + Well +
vacant Farm):

| connector cell used as | road networks | west Residence served | west colonist may reach the vacant east Farm | refusal reason |
| --- | --- | --- | --- | --- |
| a **road** | **1** | **yes** | **yes** (eligible) | — |
| a **building** (Farm) | **2** | **no** | **no** | `notConnected` |

**MEASURED FACT**: on an open map the same building is harmless (a road can
always go around); with a separation the cell's *role* decides whether a
Residence keeps Water service and whether a colonist can reach the other
region's workplaces — visible exactly as the inspector already reports it
(`notConnected`).

**Stock cannot reproduce it**: the severed state is *identical* with 100 and with
1000 Material (same 2 networks, same served Residences, same employment). The
constraint is **feasibility, not affordability** — the one thing a starting-stock
change can never express.

**The detour alone is NOT new** (measured): a bridge of 5 cells costs exactly 25
= one building, and beyond it the second Well is cheaper — the same trade-off
10AR measured, now parameterised by terrain instead of by the player's own
layout. Recorded as overlapping, not as justification.

## 4. MEASURED — Partitioned Valley revisited

| variant | bridge | bridge cost | second Well | which is cheaper |
| --- | --- | --- | --- | --- |
| A — short bridge (3 cells) | 3 | 15 | 25 | roads |
| B — long bridge (6 cells, forced) | 6 | 30 | 25 | second Well |
| C — the island Well site is itself a chokepoint | 3 | 15 | not placeable | **roads (the Well is not an option)** |

A and B differ **only** by the obstacle length: the choice flips at the model's
own 5-cell tie point, so terrain *parameterises* the existing decision (still
overlapping). Only **C** changes the decision's quality: when the obstacle
removes the alternative site, the bridge is no longer optional — and no stock
change can make a blocked site legal. Scenario distinctness therefore rests on
C, not on A/B.

## 5. MEASURED — new phenomena, honestly separated

| candidate phenomenon | verdict | evidence |
| --- | --- | --- |
| mandatory detour | **overlapping** | a longer road costs Material; a smaller stock reproduces the pressure (10AR tie: 25/5 = 5 cells) |
| road-budget pressure caused by geometry | **overlapping** | Spatial efficiency already measures an exact road budget (55 = Residence + 1 road + Farm) |
| multiple viable routes with different costs | **overlapping** | shortest-path cost of the existing road budget; 09M already consumes road distance |
| inaccessible buildable regions | **new** | measured: 100 vs 1000 Material leaves the same severed state — a blocked cell is never usable at any price |
| location opportunity cost (cell-role competition) | **new** | measured chokepoint table above |
| spatially constrained Water recovery | **new, conditionally** | only when the obstacle removes the alternative Well site (variant C) |

## 6. HYPOTHETICAL TERRAIN STATES (measured deltas)

| state | first decision | road cost | timing | Water / workforce | distinct? |
| --- | --- | --- | --- | --- | --- |
| **A — simple obstacle** | route around it, or build on the near side | 20-30 Material vs 5 | one extra command per segment | unchanged once laid | **no** — a cost, reproducible by stock |
| **B — split settlement** | which region to develop, and whether the connector is a road or a building | connector + detour | the connection must exist before the far side produces or is served | the far Residence is unserved and its colonist unemployed until it exists (measured) | **yes** — feasibility + role competition |
| **C — constrained expansion** | expand through the corridor (one road cell per step, competing with buildings) or not at all | linear in the corridor | one command per step | coverage and mobility follow the corridor | **yes** — through the role competition; otherwise a road budget |

## 7. MINIMUM TERRAIN CONTRACT (not implemented)

```text
STATE
  config.world.blockedCells?: readonly string[]   // canonical "x,y" cell keys,
                                                  // sorted, unique, immutable
  ABSENT == no terrain (the free-play default). No new top-level state key.

PLACEMENT (the only two systems that read it)
  validatePlacement        -> new reason 'terrainBlocked' (before affordability)
  validateRoadsPlacement   -> new reason 'terrainBlocked' (before affordability)
  One new feedback string each, in the existing style:
    "cell x,y — blocked by terrain"

SIMULATION (nothing else reads it — verified)
  getRoadNetworks, getBuildingRoadAccess, getWaterCoverage, getColonistWorkMobility,
  getDistanceBetweenAccesses, construction, population, progression, objectives:
  UNCHANGED. They read roads/buildings only, and a blocked cell simply never
  holds one. Measured proof: two runs differing only by the emulated blocked set
  hash identically (e9a4bb42bfb2bea1).

RENDERING
  ONE InstancedMesh of flat quads, one instance per blocked cell in sorted
  order (deterministic), using the existing palette; hover feedback reuses the
  placement indicator's existing invalid state. No new material/lighting system.

SCENARIO
  ScenarioDefinition.blockedCells?: readonly CellCoordinate[] -> createScenarioState
  writes them into config.world.blockedCells, normalized/sorted exactly like
  roads are (declarative data, no scenario-only rule).

PERSISTENCE / SAVE COMPATIBILITY (measured, not assumed)
  The validator rebuilds config.world from exactly three fields and then requires
  canonicalJson equality, so an unknown world field is REJECTED:
  "Malformed save: state contains unexpected fields" (measured).
  Two options, to be decided at implementation:
    (a) omit-when-empty: the field exists only when a scenario defines terrain.
        Terrain-free saves and their canonical hashes are unchanged; NO version
        bump, NO migration.
    (b) always-present: SAVE_VERSION 7 -> 8 with a 7 -> 8 migration adding an
        empty list; every canonical hash changes.
  Recommendation: (a).

DETERMINISM / INSERTION ORDER
  The list is normalized at construction (sorted, deduped, integer coords), so it
  participates in canonicalJson as a stable array. No iteration over a Set/Map
  decides any outcome; the two validators are order-independent lookups.
```

## 8. NON-GOALS (frozen)

```text
terrain productivity · fertile soil · natural resources · elevation · pollution ·
biome simulation · terrain destruction · terraforming · excavation ·
terrain-dependent building multipliers · terrain-dependent production rates ·
terrain-dependent worker bonuses · terrain-dependent Water production
```

Terrain is **space as constraint**, never a second economy. No economic constant
moved: Farm 2 / Well 2 / Workshop 2 gross / upkeep 1 / storage 25 / building 25 /
Workshop 26 / road 5 / initial 100-100-0 / 7 scenarios / SAVE_VERSION 7.

## 9. NEXT IMPLEMENTATION STEP (if the product authorises it)

```text
Step 10AV — Terrain as spatial input (implementation)
  1. WorldConfig gains `blockedCells?: readonly string[]` (canonical keys),
     normalized by a `normalizeBlockedCells` helper (dedupe + sort) and exposed
     by `isTerrainBlocked(world, cell)`.
  2. validatePlacement + validateRoadsPlacement gain the `terrainBlocked` reason
     (checked before affordability, after bounds); the UI gains the matching
     feedback string. No other domain file changes.
  3. ScenarioDefinition gains `blockedCells?`; createScenarioState writes it.
     Free play stays terrain-free (field absent).
  4. Renderer: one InstancedMesh for the blocked cells, built once from the
     sorted list (deterministic instance order), disposed with the scene.
  5. Test matrix: placement refusals (both commands, all reasons in order),
     determinism + insertion order (shuffled scenario authoring -> same hash),
     save/load round-trip with and without terrain, one scenario fixture that
     exercises the CHOKEPOINT decision (a split map where the connector is a
     real choice), plus the existing 15 browser suites.
  6. First fixture (from the measured evidence): two regions joined by exactly
     one connector cell, with the alternative site for the second Well blocked —
     variant C of §4, the only variant whose decision quality changes.
  7. Explicitly out of scope: every item of §8, plus demolition/excavation.
```

## 10. VALIDATION

```text
pnpm typecheck   PASS
pnpm lint        PASS
pnpm build       PASS
pnpm test        76 files / 1404 tests PASS   (75 / 1388 before: +1 audit file, +16 tests)
determinism      PASS (unchanged; the audit also proves the emulated obstacle set
                 cannot influence a hash)
insertion-order  PASS
save/load        PASS (and the audit measures that an unknown world field is rejected)
browser          15 / 15 suites ALL PASS (headless) — untouched by this step
GPU              GPU E2E ALL PASS (headed)
```

No scenario, domain, economic, persistence or UI file changed in this step; the
only additions are this audit and this document.

---

## 11. FINAL REPORT

```text
STEP 10AU — FINAL REPORT

Starting commit: 91de474 (Step 10AT)
Final commit:    this commit

CURRENT SPATIAL CAPABILITY
- Existing effects: access (09E), network membership (09D), Water coverage (10P),
  workforce mobility (09K), road-distance preference (09M), 5 Material per cell
  with a 2-tick construction that completes every cell of one command together
- Missing capability: the map cannot refuse a cell, so no detour, corridor,
  chokepoint or unreachable region can be forced — 141 of 141 free cells accept a
  road (measured)
- Evidence: validatePlacement/validateRoadsPlacement refuse only occupied cells;
  config.world has exactly ['height','seed','width']

TERRAIN CONTRACT
- Minimum terrain types: TWO — buildable (default) and blocked. No third type
- Blocked semantics: cannot hold a building, cannot hold a road, immutable,
  scenario-defined, no productivity or bonus of any kind
- Build placement: refused by validatePlacement with reason 'terrainBlocked'
- Road placement: refused by validateRoadsPlacement with reason 'terrainBlocked'
- BFS/network: NO change (networks are built from operational roads; a blocked
  cell never holds one)
- Water: NO change (coverage follows roads)
- Workforce: NO change (mobility follows roads)
- Immutability: yes (no demolition/terraforming)
- Scenario ownership: ScenarioDefinition.blockedCells -> config.world.blockedCells
- Persistence: inside config (already persisted and hashed); an unknown world
  field is rejected today (measured), so the implementation must choose
  omit-when-empty (no version bump) or always-present (SAVE_VERSION 7 -> 8)

NEW PLAYER DECISION
- Open map: any route is available; a building on a would-be connector is harmless
- Obstructed map: the detour costs Material (+2 cells for an isolated obstacle,
  +2 per blocked row for a separating wall) and one command per segment
- Constrained corridor: one cell decides the connection between regions
- New decision: CELL-ROLE COMPETITION at a chokepoint (road vs building), which
  costs Water service and cross-region mobility when chosen wrong (measured:
  connector as road -> 1 network, both Residences served, the west colonist may
  reach the vacant east Farm; connector as a building -> 2 networks, the west
  Residence unserved, refusal reason 'notConnected')
- Why it is not reproducible by existing mechanics: measured 100 vs 1000
  Material leaves the severed state IDENTICAL — feasibility, not affordability

COST / DISTANCE
- 1 cell: 5 / 2 cells: 10 / 3 cells: 15 / 4 cells: 20 / 5 cells: 25 (one
  building) / 6 cells: 30 / 8 cells: 40 / 10 cells: 50
- Detour: isolated obstacle +2 cells (10); separating wall +2 / +4 / +8 cells
  (10 / 20 / 40) as its free end sits 1 / 2 / 4 rows past the direct line
- Economic consequence: geometry decides how much of the building budget a
  connection consumes; an isolated obstacle is cheap, a separation is not

PARTITIONED VALLEY REVISIT
- Variant A (short bridge, 3 cells = 15): roads are cheaper than the Well
- Variant B (long bridge, 6 cells = 30): the Well is cheaper
- Variant C (the island Well site is unavailable): the bridge is MANDATORY —
  the only variant whose decision quality changes
- Distinctness: A and B only parameterise the 10AR trade-off (overlapping); C is
  a feasibility decision that no stock change can reproduce

NEW PHENOMENA
- Phenomena tested: 6 (mandatory detour, geometry road budget, multiple routes,
  inaccessible regions, cell-role competition, constrained Water recovery)
- Existing/overlapping: 3 (all cost-side phenomena)
- New: 3 (inaccessible regions, cell-role competition, constrained Water recovery
  when the alternative site is unavailable)

HYPOTHETICAL TERRAIN SCENARIOS
- Terrain A — simple obstacle: distinct? NO (a cost, reproducible by stock)
- Terrain B — split settlement: distinct? YES (feasibility + connector role)
- Terrain C — constrained expansion: distinct? YES through the role competition
- Distinct decision spaces: 2 of 3, and both rest on the same structural cause

PRODUCT DECISION
- Classification: A — JUSTIFIED (boundary stated: the cost side alone would be C)
- Evidence: the chokepoint role competition changes service and mobility, and the
  severed state is identical at 100 and 1000 Material; the minimum contract is
  precise (two validators, no other system reads cells)
- Terrain justified: yes, as spatial input — implementation deferred to a
  dedicated step, and only with content that exercises the structural decision

MINIMUM IMPLEMENTATION CONTRACT
- State: config.world.blockedCells (canonical sorted "x,y" keys, optional, absent
  means no terrain)
- Commands: placeBuilding, placeRoads (new reason 'terrainBlocked' + one message)
- Queries: getPlacementAffordability must surface the new reason; nothing else
- Rendering: one InstancedMesh, sorted instance order, existing palette
- Scenario: ScenarioDefinition.blockedCells -> createScenarioState
- Persistence: inside config; omit-when-empty (recommended) or SAVE_VERSION 7 -> 8
- Determinism: canonical list participates in canonicalJson; no Set/Map iteration
  decides an outcome
- Insertion-order: normalized at construction (dedupe + sort)
- Save implications: documented, NOT implemented here

NON-GOALS:
- terrain productivity, fertile soil, natural resources, elevation, pollution,
  biome simulation, terrain destruction, terraforming, excavation,
  terrain-dependent building multipliers, production rates, worker bonuses or
  Water production

NEXT IMPLEMENTATION STEP:
- Step 10AV "Terrain as spatial input": WorldConfig.blockedCells + isTerrainBlocked,
  the two validator reasons + UI message, ScenarioDefinition.blockedCells,
  a single InstancedMesh renderer, the test matrix (refusals, determinism,
  insertion order, save/load, the chokepoint fixture) and one scenario fixture
  built on variant C. Nothing else.

VALIDATION:
- Tests/audits: 76 files / 1404 tests PASS (+16 in this audit)
- Typecheck: PASS
- Lint: PASS
- Build: PASS
- Determinism: PASS
- Insertion-order: PASS
- Save/load: PASS

SAVE_VERSION: 7 (unchanged; the terrain implementation must decide between
omit-when-empty and a 7 -> 8 bump)
```
