# NOVA — Step 09J — Spatial Network Pressure Audit

## Context

NOVA has completed:

* 09A — transport network foundation;
* 09B — road infrastructure contract;
* 09C — road construction;
* 09D — road network connectivity;
* 09E — building road access;
* 09F — road access gates Workshop production;
* 09G — derived Residence ↔ Workplace mobility connectivity;
* 09H — player-facing road construction;
* 09I — bootstrap economy audit.

The current system is now mechanically playable.

A fresh settlement can reach:

```text
Residence
→ Colonist
→ Workshop
→ Road
→ Road access
→ Material production
```

The current road system, however, only creates a limited spatial decision:

```text
Workshop
+
adjacent operational Road
=
road access
```

Once a building has road access, the current rules do not distinguish much between:

```text
A) Residence ─ Road ─ Workshop

B) Residence ─ Road ─ Road ─ Road ─ Workshop

C) Residence ─ Road
       │
       Road ─ Workshop
```

This step must determine whether the existing spatial model already contains meaningful topological pressure that NOVA should exploit.

---

# 1. Primary objective

Audit the current road/network model to answer:

> Does road topology already create meaningful player decisions, or is the current system still effectively a binary "road adjacent / no road" rule?

This is an audit/design step.

## Default rule

Do NOT add a gameplay effect merely because one can be implemented.

Do NOT implement pathfinding, vehicles, congestion, distance, travel time or transport simulation during this step.

The output should be evidence and a precise design decision.

---

# 2. Mandatory workflow

Follow:

```text
AUDIT
→ OBSERVATIONS
→ TOPOLOGY SCENARIOS
→ MEASURE CURRENT DIFFERENCES
→ IDENTIFY POTENTIAL PRESSURES
→ DESIGN DECISION
→ NO-CODE-CHANGE UNLESS CORRECTNESS BUG
```

Do not begin by choosing a new mechanic.

First determine what the current model can and cannot express.

---

# 3. Audit current spatial model

Inspect the actual source for:

* grid representation;
* building occupancy;
* road occupancy;
* road adjacency;
* road network construction;
* road access;
* Residence/workplace relations;
* `mobilityConnected`;
* road orientation derivation;
* construction lifecycle;
* simulation phases;
* current player-facing road placement.

Confirm:

* roads occupy one grid cell;
* buildings occupy one grid cell;
* buildings and roads cannot share cells;
* roads connect orthogonally;
* road networks are operational connected components;
* building road access is based on orthogonal adjacency;
* mobility uses network intersection;
* no distance metric exists;
* no pathfinding exists;
* no movement exists.

Document discovered rules rather than relying on previous reports.

---

# 4. Important distinction

Separate these concepts:

### Connectivity

Are two road cells in the same connected component?

### Building access

Does a building touch at least one operational road?

### Network membership

Which road networks does a building reach?

### Mobility connectivity

Does a colonist's residence share a road network with their workplace?

### Travel

How does a colonist actually move between the two?

The current system only implements the first four.

Travel is explicitly out of scope.

Do not silently turn mobility connectivity into movement.

---

# 5. Build deterministic topology scenarios

Create deterministic audit scenarios using the actual domain/application functions.

Do not modify production gameplay rules.

At minimum analyze the following.

## Scenario A — Direct connection

```text
R ─ W
```

with a road between them where necessary.

Measure:

* road count;
* network count;
* Residence network IDs;
* Workshop network IDs;
* road access;
* `mobilityConnected`.

---

## Scenario B — Longer corridor

```text
R ─ · ─ · ─ W
```

with an operational road corridor.

Compare with Scenario A.

Measure all currently available derived values.

Determine whether the current model distinguishes the two configurations.

---

## Scenario C — L-shaped network

```text
R ─ ·
    │
    · ─ W
```

Compare against the straight corridor.

Determine whether current rules distinguish topology or only connectivity.

---

## Scenario D — Branch

```text
      F
      │
R ─ · ┼ · ─ W
```

Use an actual Farm or other existing building if appropriate.

Measure:

* number of road cells;
* number of networks;
* buildings with access;
* mobility connectivity;
* production;
* Material effects.

Determine whether the branch creates any current gameplay consequence.

---

## Scenario E — Two disconnected networks

```text
R ─ ·        · ─ W
```

Verify that:

* Residence reaches network A;
* Workshop reaches network B;
* `mobilityConnected = false`.

This establishes the current meaningful boundary.

---

## Scenario F — Multi-network building access

Construct a topology where a building can legitimately reach multiple road networks under the current geometry/rules.

Use the existing 09E semantics.

Verify that:

```text
building.networkIds
```

can contain multiple network IDs where the geometry permits it.

Verify that mobility uses set intersection rather than selecting a single network.

---

## Scenario G — Redundant topology

Construct a topology with a cycle if the one-cell grid geometry permits it:

```text
┌───┐
│   │
└───┘
```

or the smallest equivalent valid road loop.

Determine whether a loop has any current semantic effect beyond connected-component membership.

Do not add one.

---

# 6. Measure current gameplay consequences

For each topology, measure only consequences that actually exist today:

* Material construction cost;
* construction timing;
* operational road count;
* road network count;
* building road access;
* Workshop production;
* Workshop upkeep;
* storage capacity;
* colonist workplace assignment;
* `mobilityConnected`.

Do NOT invent:

* travel distance;
* path length;
* commute time;
* traffic;
* congestion;
* route efficiency;
* movement cost.

If two topologies produce identical results under the current model, explicitly state that.

That is an important finding.

---

# 7. Cost topology

The current road cost is:

```text
5 Material / road cell
```

Audit whether topology already creates an economic trade-off simply through construction cost.

For example:

```text
direct:
3 road cells × 5 = 15 Material

detour:
6 road cells × 5 = 30 Material
```

Use actual valid grid scenarios rather than arbitrary numbers.

Determine whether:

> "shorter network vs longer network"

already creates a meaningful player choice because of Material expenditure.

Do not change the cost.

---

# 8. Network redundancy

Audit whether a player can currently spend additional Material to create redundant road topology without receiving any simulation benefit.

Examples:

* loop;
* parallel connection;
* unnecessary branch;
* second network touching a building;
* extra road cells that don't add new building access.

Determine which constructions are currently:

### Functional

They change an existing simulation fact.

### Redundant

They change only geometry/cost but no current simulation behavior.

### Potentially useful later

They would become meaningful under a future rule, but have no current effect.

Do not implement those future effects.

---

# 9. Multiple workplaces

Construct a scenario with:

```text
Residence
   │
   Road network
   ├── Workshop A
   ├── Workshop B
   └── Workshop C
```

using actual existing buildings and colonist assignment rules.

Measure:

* road count;
* network count;
* access;
* employment;
* production;
* upkeep;
* mobility connectivity.

Then compare with multiple disconnected networks.

Determine whether the current model already creates meaningful spatial optimization.

---

# 10. Multiple residences

Construct:

```text
Residence A ─┐
             ├── Road network ── Workshop
Residence B ─┘
```

where valid under the current rules.

Measure whether both residences can independently connect to the same workplace network.

Then construct disconnected alternatives.

Do not add new housing or commuting rules.

The purpose is to understand what the existing model already expresses.

---

# 11. Critical geometry audit

09E discovered an important limitation:

With 1×1 buildings and one-cell roads, a building may not be able to touch two roads that also directly connect in the simplistic local geometry expected by a naive test.

Re-check this carefully using actual grid coordinates.

Determine exactly what geometries allow:

```text
building.networkIds.length > 1
```

and whether multi-network building access is practically constructible.

Do not assume that a theoretical API capability is actually reachable through valid player construction.

If it is geometrically unreachable, document it.

This is important because 09G intentionally uses set intersection.

---

# 12. Topology equivalence classes

Classify current road layouts by what the simulation actually sees.

For example, determine whether these are currently equivalent:

```text
straight corridor
L corridor
branch
loop
```

if they produce the same:

* network membership;
* building access;
* mobility connectivity;
* economic result.

The purpose is to identify the gap between:

```text
visual topology
```

and

```text
simulation topology
```

without immediately filling that gap.

---

# 13. Identify potential future pressures

Only after measuring the current system, identify candidate future pressures.

Possible categories include:

* construction cost;
* network reach;
* movement;
* accessibility;
* service coverage;
* travel time;
* congestion;
* logistics;
* public transit;
* infrastructure capacity.

Do not rank them.

Do not choose a winner.

For each candidate, state:

1. what existing fact it would build upon;
2. what new state/query it would require;
3. what player decision it would create;
4. what additional simulation complexity it introduces.

The goal is to make the trade-offs explicit.

---

# 14. Do not implement pathfinding

Explicitly do NOT implement:

* A*;
* Dijkstra;
* BFS point-to-point travel;
* shortest-path queries;
* route objects;
* travel distance;
* travel time;
* vehicles;
* pedestrians;
* transit;
* passengers;
* cargo;
* traffic;
* congestion.

The existing network BFS is for connected components only.

Do not repurpose it into a generic pathfinding framework.

---

# 15. Do not alter economics

Do not change:

* Material cost;
* Workshop production;
* Workshop upkeep;
* storage;
* starting resources;
* Food;
* construction timing;
* housing;
* jobs.

09I classified the bootstrap as reachable Category B.

This step must not rebalance that result.

---

# 16. Potential correctness issues

If the audit discovers a genuine bug such as:

* connected roads not recognized;
* disconnected roads incorrectly merged;
* building access incorrect;
* mobility intersection incorrect;
* nondeterministic network ordering;
* persistence mismatch;

then:

1. document the issue;
2. fix only the correctness problem;
3. add regression coverage;
4. re-run all verification.

Do not classify missing gameplay effects as bugs.

---

# 17. Automated audit

Prefer deterministic tests/helpers over manual inspection.

Add a focused audit test file if appropriate, for example:

```text
tests/spatialNetworkPressure.test.ts
```

Only add production code if a correctness defect requires it.

Audit tests should remain readable and focused on observable current behavior.

Do not build a reusable generic graph-testing framework.

---

# 18. Browser verification

This is primarily a domain/design audit.

Reuse the existing 09H browser infrastructure only where it helps validate that the audited topology can actually be constructed through the player-facing UI.

At minimum verify one representative topology in real Chromium if practical.

Do not create new UI for this step.

Do not fabricate interaction paths unavailable to the player.

If a topology is domain-valid but impossible to construct through the current UI, document that distinction.

---

# 19. GPU verification

No new GPU work is required.

If existing browser/E2E infrastructure runs normally, use it.

Do not block the audit on unavailable physical NVIDIA hardware.

Do not implement GPU infrastructure.

---

# 20. Persistence and determinism

Do not add persisted topology state.

Verify:

```text
same topology
→ same derived networks
→ same access
→ same mobility
→ same state/hash
```

Verify insertion-order independence where relevant.

Save/load must preserve existing road state and all derived queries.

SAVE_VERSION remains:

```text
4
```

---

# 21. Documentation

Create:

```text
docs/roadmap/Step09J.md
```

IMPORTANT:

If this file already exists as a committed roadmap document, NEVER overwrite it with the raw prompt.

Preserve existing content and append the as-built report.

Include:

### A. Audit

### B. Current Spatial Model

### C. Topology Scenarios

### D. Measurements

### E. Cost Analysis

### F. Redundancy Analysis

### G. Multi-Workplace Analysis

### H. Multi-Residence Analysis

### I. Multi-Network Geometry

### J. Topology Equivalence

### K. Potential Future Pressures

### L. Correctness Findings

### M. Browser Verification

### N. Persistence

### O. Determinism

### P. Scope Audit

### Q. Design Decision

### R. Next Design Question

---

# 22. Required classification

At the end, classify the current spatial model into one of:

## A — Topology already creates meaningful current decisions

Existing road construction/layout produces materially different outcomes under current rules.

Document exactly which outcomes differ.

## B — Topology is economically meaningful but semantically simple

Different layouts primarily differ through construction cost, while connectivity/access remains binary.

Document this distinction.

## C — Topology is currently mostly cosmetic beyond access

Different connected layouts produce essentially identical simulation outcomes.

Document which topology distinctions collapse to the same simulation state.

## D — Correctness defect

The current topology implementation does not faithfully implement its documented rules.

Fix only the defect.

This classification is descriptive, not a score or quality ranking.

---

# 23. Required verification commands

Run:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Run relevant E2E suites.

If audit tests are added, verify them repeatedly.

Verify save/load and deterministic replay.

---

# 24. Git

Prefer one focused commit:

```text
Step 09J: Spatial Network Pressure Audit
```

Before finishing:

```text
git status --short
git diff --stat
git log -1 --oneline
```

Working tree must be clean.

Do not commit temporary artifacts.

---

# 25. Final report

Return:

### A. Audit

### B. Current Spatial Model

### C. Topology Scenarios

### D. Measurements

### E. Cost Analysis

### F. Redundancy Analysis

### G. Multi-Workplace Analysis

### H. Multi-Residence Analysis

### I. Multi-Network Geometry

### J. Topology Equivalence

### K. Potential Future Pressures

### L. Correctness Findings

### M. Browser Verification

### N. Persistence

### O. Determinism

### P. Scope Audit

### Q. Design Decision

### R. Next Design Question

The most important conclusion must answer:

> **Does NOVA's current road topology create a meaningful spatial decision beyond "give the building a road", and if not, what is the smallest missing causal rule that could make topology matter without prematurely implementing full transport simulation?**

Do not implement that missing rule during this step unless the audit discovers an actual correctness defect.

---

# As-built audit report (Step 09J execution)

Evidence: `tests/spatialNetworkPressure.test.ts` (23 tests, all passing) pins every measurement below using only existing domain/application functions. Full suite: 24 files / 367 tests pass; lint, typecheck, build clean. No `src/` change.

## A. Audit

Source facts confirmed (§3): one cell per road and per building; mutual exclusion enforced by both placement validators (`cellOccupiedByBuilding` / blocked cell); adjacency strictly orthogonal Manhattan-1 (diagonals never connect); networks are operational-road connected components; access is orthogonal adjacency to an operational road of an operational building; mobility is set intersection of 09E network lists. Barrel scan: no public API containing shortest/dijkstra/pathfind/travel/commute/vehicle/traffic/movement/passenger/cargo exists — the only "distance" in the codebase is Manhattan-1 adjacency and camera positioning.

## B. Current Spatial Model

Four implemented layers, strictly ordered: (1) connectivity — same 09D component? (2) access — touches an operational road? (3) membership — which network ids? (4) mobility — shared network between residence and workplace? Travel (how a colonist moves) does not exist and was never simulated: `mobilityConnected` is a continuity fact, asserted as such.

## C. Topology Scenarios

A: R–road–W (1 road). B: 6-road corridor. C: L-shape (3 roads). D: main chain + spur to a Farm. E: two isolated networks. F: 2/3/4-network single-building access. G: 2×2 loop, 3×3 ring with center building, chain extension. I: 1 residence + 2 workshops (both road permutations). J: 2 residences + 1 workshop (linked vs split networks).

## D. Measurements

- A: 1 road, 1 network, both access true, mobility true.
- B vs A: identical network count, access, mobility, per-endpoint single shared network. Only difference: 6 roads (cost 30 vs 5).
- C vs B: identical facts — shape invisible to the simulation.
- D: 1 network; spur functional for the Farm (access it would otherwise lack), redundant for the R–W pair (production 2, upkeep 1 either way).
- E: 2 networks; access true on BOTH sides; mobility false — the current meaningful boundary.
- F: 2, 3, then 4 reachable network ids (geometric maximum: four orthogonal neighbours); extension of one access road keeps count at 2; intersection across multi-network endpoints verified (exactly one shared network → connected); constructible via ordinary single-cell placements (both validators accept).
- G: loop = 4-chain (1 network each); center-of-ring building reaches exactly 1 network through 4 access roads (a loop is connected by definition and can never yield multi-network access); spur extension adds roads only.
- I: worker always lands on the first-built Workshop regardless of road placement — road-only-at-second yields production 0 + upkeep 1; road-only-at-first yields production 2; roads-at-both keeps employment, doubles storage to 50 (vacant counts, 09I rule), 2 networks.
- J: linked vs split — identical employment (colonist-1 at W, colonist-2 unemployed, capacity 1), identical production (2) and upkeep (1); the ONLY delta is the informational mobility flag (true vs false).

## E. Cost Analysis

Cost (5/cell, authoritative `validateRoadsPlacement` totals) is the single axis where connected layouts differ today: direct 1-cell link (5) vs 6-corridor (30) with byte-identical simulation facts. "Shorter vs longer network" is therefore already a real player choice — paid in Material, visible in stock, with no other current consequence.

## F. Redundancy Analysis

- FUNCTIONAL (changes a simulation fact): any road granting first access to a building; a spur that completes a pair-intersection (mobility false → true) even when production is untouched.
- REDUNDANT (geometry/cost only): loops vs chains; L vs straight; spurs that add no access and no intersection; chain extensions past buildings.
- POTENTIALLY USEFUL LATER: loops/parallel links (under capacity/congestion rules); second-network touches (under coverage rules); long corridors (under distance rules). None implemented.

## G. Multi-Workplace Analysis

Employment is topology-blind: ascending workshop id (i.e. build order), confirmed with roads in every permutation. The spatial decision the model DOES contain is therefore about build order, not layout — road the workshop that will be staffed (the first built). Production follows per-workshop access; upkeep follows staffing; storage follows operational count.

## H. Multi-Residence Analysis

Both residences can independently reach one network (verified), but residence-side topology currently moves only the informational mobility flag: employment, production and upkeep are identical linked vs split. No housing/commuting rule exists to exploit it.

## I. Multi-Network Geometry

Reachable and practical: any subset of the four orthogonal neighbours holding mutually Manhattan-2 roads yields that many networks (2, 3, 4 all pinned), via ordinary placements — no tricks, no UI gap (two single-cell clicks; corridor drags already proven in 09H E2E). New geometry rule discovered during the audit (test G3 first failed on it): a building cell is NOT a road, so a spur routed "through" a building splits the network instead of extending it — extensions must route around buildings to stay connected.

## J. Topology Equivalence

Straight / L / branch / loop built with 4 roads each collapse to IDENTICAL simulation facts: same road count (hence same cost 20), 1 network, both endpoints linked, mobility true. Visual topology ≫ simulation topology: the simulation sees (network membership, access booleans, mobility boolean, employment, production, upkeep, storage) — all invariant under these shape changes.

## K. Potential Future Pressures (unranked, none chosen)

1. Commute-gated employment (mobility → job eligibility): builds on `mobilityConnected`; requires NO new state (query exists); creates connect-or-relocate staffing decisions; complexity low mechanically, large in gameplay meaning.
2. Road upkeep per operational road: builds on road count; requires one upkeep rule; makes redundancy actively costly (pruning decisions); complexity low–medium.
3. Travel distance/time: builds on network membership; requires a path-length query (component BFS exists; shortest-path is nearby but explicitly NOT implemented); creates compact-layout decisions; complexity medium.
4. Capacity/congestion: builds on shared segments; requires usage counting + flow model; creates parallel-route decisions; complexity high.
5. Service coverage (e.g. farm→residence): builds on the access/intersection pattern; requires a new relation; creates co-location decisions; complexity medium.
6. Construction-cost pressure: ALREADY LIVE (5/cell, no new state, short-vs-long decisions, zero complexity) — the one current pressure.

## L. Correctness Findings

No defect found. Connectivity, access, intersection, ordering and persistence all behave per their documented rules across 23 scenarios (including the initially surprising — but correct — network split through a building cell, and the 4-network maximum). Per §16: document-only outcome, no fix, no new production code.

## M. Browser Verification

Re-ran `e2e/roadRun.mjs` (NOVA_ROAD_MODE=headless): ROAD E2E RESULT: ALL PASS, zero console/page errors. The audited corridor topology is player-constructible today (H/V drag + single-cell clicks); multi-network access needs only two ordinary clicks (validator-accepted, test F5); diagonal/L drags remain UI-impossible by 09C design (roadRun D). No new UI created; no unavailable path fabricated.

## N. Persistence

No topology state added (nothing to add — all derived). Same topology → same networks/access/mobility/hash; insertion-order independence verified; save/load preserves roads and every derived query identically. SAVE_VERSION = 4.

## O. Determinism

All scenario measurements are exact-equality assertions; replay and reorder runs pinned (tests N1/N2).

## P. Scope Audit

New: `tests/spatialNetworkPressure.test.ts` (audit tooling, marked, test-only). Modified: this doc (append-only). No `src/`, no economics, no pathfinding, no vehicles, no transit, no state. `git status` shows exactly these two paths.

## Q. Design Decision — classification: **B**

Topology is economically meaningful but semantically simple. Layouts differ today (a) through construction cost — 5 per cell, the only live pressure — and (b) through binary per-building access and per-pair mobility, which multi-network geometry and build-order staffing make non-trivial without making them topological. Straight/L/branch/loop are proven equivalent; employment is proven topology-blind. No rule change, no defect fix.

## R. Next Design Question

The smallest missing causal rule that would make topology matter — by size, not by desirability (nothing ranked, nothing chosen): commute-gated employment, i.e. one condition on the already-derived `mobilityConnected` inside `assignJobs`, requiring no new state, no pathfinding, no distance metric. Second-smallest: per-road upkeep, which would convert today's redundant geometry (loops, spurs, overlong corridors) from merely wasteful into actively costly. Whether either (or none) should exist is the future design decision this audit feeds, not makes.

