# NOVA — Step 09A — Transport Network Foundation

## CONTEXT

Baseline:

```text
fa84cd4
```

Parent:

```text
1f431d8
```

Phase 8 is now complete.

The current economic chain is:

```text
Colonist
→ Work
→ Productive worker
→ Material production
→ bounded Material storage
→ Construction / Workshop upkeep
```

Step 08G confirmed that construction affordability was a phase-order issue,
not a numerical balancing issue.

The next roadmap phase is:

```text
Phase 9 — Transport

Network
→ accessibility
→ movement / logistics
```

The roadmap explicitly states:

```text
Roads may become an emergent consequence of growth,
but transport simulation should not be implemented prematurely.
```

Therefore this step establishes the **smallest deterministic network/accessibility
foundation** without introducing roads, vehicles or logistics.

---

# 1. OBJECTIVE

Introduce a minimal domain concept answering one question:

> Is an existing settlement entity connected to the settlement's accessible
> network?

This is a foundation for future transport.

It must NOT yet simulate:

* vehicles
* traffic
* travel time
* pathfinding
* cargo
* delivery
* road construction
* congestion
* transport costs

---

# 2. FIRST TASK — AUDIT CURRENT SPATIAL MODEL

Before changing code, inspect:

* building positions
* building coordinates
* map/grid representation
* construction placement
* Residence representation
* Workshop representation
* Farm representation
* existing spatial queries
* rendering coordinate system
* serialization of building positions

Determine:

1. whether positions are integer grid coordinates;
2. whether multiple buildings can occupy the same position;
3. whether a canonical settlement center already exists;
4. whether there is already an adjacency/distance helper;
5. whether any existing road/network concept exists.

Do not invent a second coordinate system.

Document the findings in:

```text
docs/roadmap/Step09A.md
```

---

# 3. NETWORK DEFINITION

For this first step, the network is intentionally abstract.

A building is considered part of the initial settlement network if it is
connected to an existing Residence through the existing spatial representation.

Do NOT create roads.

Use a deterministic adjacency relation based on the current building
placement model.

If the repository already has a canonical adjacency rule, reuse it.

If no adjacency concept exists, use:

```text
orthogonal grid adjacency
```

where two occupied cells are adjacent when:

```text
abs(x1 - x2) + abs(y1 - y2) === 1
```

Do NOT use Euclidean radius as a substitute for connectivity.

---

# 4. CONNECTIVITY

The network is a graph:

```text
Building
  ↓
adjacent Building
  ↓
adjacent Building
  ↓
...
Residence
```

A building is accessible when it belongs to the same connected component as
at least one operational Residence.

Use deterministic graph traversal.

Acceptable implementation:

* BFS
* DFS

Do not create a generic graph framework.

A simple domain function is sufficient.

For example:

```text
isBuildingAccessible(state, buildingId)
```

or an equivalent API matching the repository's architecture.

---

# 5. BUILDING LIFECYCLE

Only operational buildings participate in the network.

Therefore:

```text
planned
→ inaccessible

under construction
→ inaccessible

operational
→ potentially accessible
```

A building becoming operational must immediately become eligible for
connectivity according to the existing simulation lifecycle.

A building that is no longer operational must no longer provide a connection.

Do not add a new lifecycle state.

---

# 6. RESIDENCE ROOT

Operational Residences are network roots.

If there are:

```text
0 operational Residences
```

then:

```text
accessibleBuildings = 0
```

If there are multiple operational Residences, each is a root.

The graph is therefore a multi-source connectivity problem.

Do not designate one arbitrary Residence as "the main residence".

---

# 7. EXAMPLE

Given:

```text
R A B C
```

where:

```text
R = operational Residence
A = operational Farm
B = operational Workshop
C = operational Farm
```

all four are accessible:

```text
R — A — B — C
```

Given:

```text
R A B

        C D
```

then:

```text
R A B → accessible
C D   → inaccessible
```

until the spatial connection exists.

---

# 8. DIAGONAL CONNECTION

Do NOT consider diagonal adjacency connected.

Example:

```text
R .
. B
```

is NOT connected.

This prevents diagonal corner-touching from silently becoming a transport
connection.

---

# 9. NO ROAD SYSTEM

Do NOT add:

```text
Road
RoadTile
RoadSegment
RoadNetwork
RoadBuilding
```

in this step.

The network is an abstract spatial connectivity layer only.

This is deliberate.

Roads can later become one possible mechanism for creating network
connectivity.

---

# 10. NO MOVEMENT YET

Do NOT move colonists.

Do NOT calculate:

```text
distance travelled
travel time
speed
path length
commute
route
```

A query returning:

```text
accessible = true / false
```

is sufficient.

---

# 11. NO LOGISTICS YET

Do NOT implement:

* resource transportation
* delivery
* pickup
* warehouses
* inventories
* cargo
* supply routes

Material and Food remain globally simulated resources exactly as before.

No existing economic behavior may change.

---

# 12. DETERMINISTIC CONNECTIVITY

The result must depend only on:

```text
state
```

and the canonical spatial rules.

No:

```text
Math.random()
Date.now()
performance.now()
```

No dependence on insertion order.

If traversal uses a collection, make neighbor ordering deterministic.

For example:

```text
North
East
South
West
```

or another documented stable order.

---

# 13. DERIVED STATE ONLY

Accessibility must NOT be persisted.

Do not add:

```text
accessible
networkId
connected
```

to SimulationState.

Accessibility is derived from:

```text
current buildings
+
positions
+
operational lifecycle
```

This follows the existing derive-don't-persist architecture.

SAVE_VERSION remains:

```text
4
```

---

# 14. NETWORK COMPONENT QUERY

If useful, expose a pure query returning the accessible building IDs.

For example:

```text
getAccessibleBuildingIds(state)
```

The returned collection must have deterministic ordering.

Prefer the repository's existing stable building ordering.

Do not introduce a generic graph API.

---

# 15. TESTS

Create:

```text
tests/transportNetwork.test.ts
```

Minimum cases:

### A — Empty settlement

1. no Residence → no accessible buildings
2. no buildings → no accessible buildings

### B — Single Residence

3. operational Residence → accessible
4. under-construction Residence → inaccessible

### C — Direct adjacency

5. Residence + adjacent operational Farm → both accessible
6. Residence + adjacent operational Workshop → both accessible

### D — Multi-hop

7. Residence → Farm → Workshop → Farm
8. all connected through multiple hops

### E — Disconnected component

9. connected component is accessible
10. disconnected operational buildings are inaccessible

### F — Diagonal

11. diagonal-only connection is inaccessible

### G — Lifecycle

12. under-construction building excluded
13. operational building included
14. building becoming operational becomes accessible
15. non-operational building stops contributing to connectivity

### H — Multiple roots

16. two operational Residences
17. both components accessible
18. no arbitrary root selection

### I — Determinism

19. same state → same accessibility result
20. repeated replay → identical result

### J — Purity

21. query does not mutate state
22. query does not modify hash/state serialization

---

# 16. SPATIAL EDGE CASES

Test:

* negative coordinates if supported;
* large coordinates;
* sparse settlement;
* long chain;
* branching network;
* multiple disconnected components.

Do not introduce artificial coordinate limits.

---

# 17. EXISTING BUILDING PLACEMENT

The new connectivity query must use the existing placement rules.

Do NOT modify:

* placement validation;
* construction cost;
* construction duration;
* building capacity;
* resource consumption.

Step 09A must have no economic side effects.

---

# 18. UI

Do not create a new transport panel.

Do not add a map overlay.

Do not add network visualization.

Do not add accessibility badges.

The first step is domain/application infrastructure and verification.

If an existing debug/status surface can expose the result without structural UI
changes, it may be used only for E2E verification.

Otherwise no UI change is required.

---

# 19. E2E

Add one focused headless E2E scenario if the existing test infrastructure
can construct the required spatial layouts.

Scenario:

```text
Residence
    ↓
Farm
    ↓
Workshop
```

Verify that all operational buildings are reported as accessible.

Then verify:

```text
disconnected Workshop
```

is inaccessible.

Do not add visual UI solely to make this assertion possible.

Prefer a test-only stats/debug surface if one already exists, such as the
existing `__nova.stats` mechanism.

Keep that surface test-only.

---

# 20. PERFORMANCE

The first implementation may use a straightforward BFS/DFS over buildings.

Do NOT prematurely implement:

* spatial hash
* quadtree
* union-find
* cached graph
* incremental connectivity
* pathfinding library

The settlement is currently small.

Only optimize after a measured requirement exists.

---

# 21. ARCHITECTURE

Keep the dependency direction:

```text
domain
  ↓
application query
  ↓
UI / E2E
```

Do not put connectivity logic in:

* React components
* DOM event handlers
* rendering code
* canvas code

The domain owns the spatial rule.

---

# 22. NO ECONOMIC COUPLING

This step MUST NOT change:

```text
Food
Material
production
upkeep
construction
jobs
labor
population
housing
```

Accessibility is informational only.

No existing simulation phase needs to change.

If the implementation appears to require changing the simulation phase order,
STOP and report why.

---

# 23. PERSISTENCE / HASH

Verify:

```text
state
→ save
→ load
```

produces identical:

```text
state
+
hash
+
derived accessibility
```

Do not serialize accessibility.

Do not bump SAVE_VERSION.

---

# 24. REGRESSION

Run the complete existing suite:

```text
Vitest
E2E
lint
typecheck
build
```

The complete Phase 8 economy must remain unchanged.

Specifically verify:

* production
* resource
* food
* jobs
* upkeep
* constructionMaterialFlow
* storageCapacity

all remain green.

---

# 25. IMPORTANT DESIGN LIMIT

This is NOT yet a complete transport system.

The intended progression is:

```text
09A
Network / connectivity
        ↓
09B
Accessibility as a usable simulation query
        ↓
09C
Movement / logistics
```

However, only implement 09A in this task.

Do not anticipate 09B/09C by creating unused abstractions.

---

# 26. FAILURE CONDITION

If the current repository does not contain enough spatial information to define
deterministic connectivity without inventing a new placement model:

STOP.

Do not create an arbitrary coordinate system.

Report:

* what spatial information exists;
* what is missing;
* the smallest prerequisite required.

Likewise, if "Residence" is not represented as a spatial building in the current
canonical state, stop rather than fabricating one.

---

# 27. ACCEPTANCE CRITERIA

Step 09A is COMPLETE only when:

* [ ] current spatial model audited
* [ ] canonical coordinates reused
* [ ] operational buildings can participate in connectivity
* [ ] operational Residences are network roots
* [ ] connectivity is multi-hop
* [ ] diagonal adjacency is excluded
* [ ] disconnected buildings are distinguishable
* [ ] lifecycle semantics are respected
* [ ] accessibility is derived
* [ ] no accessibility state is persisted
* [ ] no roads introduced
* [ ] no vehicles introduced
* [ ] no movement introduced
* [ ] no logistics introduced
* [ ] no economic rule changed
* [ ] SAVE_VERSION remains 4
* [ ] save/load remains stable
* [ ] hash remains stable
* [ ] deterministic replay passes
* [ ] unit tests pass
* [ ] E2E passes where applicable
* [ ] lint passes
* [ ] typecheck passes
* [ ] build passes
* [ ] no generic graph/network framework introduced
* [ ] no scope creep

---

# 29. SPATIAL MODEL AUDIT (§2 — AS-BUILT)

1. Integer grid coordinates: YES. `pickCell` raycasts then
   `worldPositionToSimulationCell` (`Math.round`, `coordinates.ts:36-37`);
   `isInGrid` bounds-checks; `save.ts:118-119` enforces finite-int `x`/`y`.
   No second coordinate system invented.
2. Same-cell stacking: IMPOSSIBLE. `isCellOccupied` (`phases.ts:72-83`)
   rejects any building on an occupied cell, including under-construction
   ones; `validatePlacement` rejects `cellOccupied`. One building per cell.
3. Canonical settlement center: NONE EXISTS. Only render-camera centering
   (`coordinates.ts:7-8`). No gameplay center; none introduced.
4. Adjacency/distance helper: NONE EXISTS. `cellKey` (`grid.ts:23`) is
   defined but unused; `phases.ts:395` and `jobs.ts:15` explicitly exclude
   distance/proximity. Orthogonal adjacency (`§3` fallback) implemented in
   `src/domain/network/network.ts:areOrthogonallyAdjacent`.
5. Road/network concept: NONE EXISTS. §26 failure condition clears:
   Residence is a spatial building in canonical state; deterministic
   connectivity needed no new placement model.

# 30. AS-BUILT

* `src/domain/network/network.ts` (new): `areOrthogonallyAdjacent`,
  `getAccessibleBuildingIds` (multi-source BFS, ascending-id expansion,
  sorted return), `isBuildingAccessible`. Operational-only, Residence roots.
* `src/application/queries/network.ts` (new): `getAccessibleBuildingCount`.
* `src/index.ts`: barrel exports for both.
* `src/app/main.ts`: test-only `__nova.stats.accessibleBuildings` (§19).
* `tests/transportNetwork.test.ts` (new): 12 tests (A–J + §16 + save/load).
* `e2e/transportRun.mjs` (new, port 4182) + `test:e2e:transport` script:
  R → farm → disconnected WS (placed 3rd: staffed-WS 24-equilibrium leaves
  no 'ready' preview for a 4th full-price build) → connected WS via the
  Step 08G gate (rest 24 + stored 1). Final: accessible 3, operational 4.
* No phase-order change. No economic rule changed. SAVE_VERSION 4.
* Validation: vitest 251/251 (17 files), lint clean, typecheck clean, build
  clean, E2E transport/jobs/production/resource/food/upkeep ALL PASS
  (headless). Screenshots `artifacts/transport/01-fresh,02-farm,03-network`
  inspected: connected R/F/W column + corner disconnected WS, HUD intact.

---

# 28. FINAL REPORT

Return:

1. commit hash
2. parent commit
3. spatial model audit
4. connectivity definition
5. exact files modified
6. production code changes
7. tests added
8. total tests
9. E2E results
10. lint
11. typecheck
12. build
13. SAVE_VERSION
14. save/hash verification
15. determinism verification
16. performance observations
17. screenshot inspection if applicable
18. economic regression verification
19. scope violations

If all checks pass:

```text
Step 09A COMPLETE
```

Commit:

```text
Step 09A: establish transport network connectivity
```

Do not begin 09B in the same task.

