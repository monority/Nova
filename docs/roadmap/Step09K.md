# NOVA — Step 09K — Mobility-Gated Employment Audit & Contract

## Context

NOVA is a deterministic spatial city-builder.

The current Phase 9 transport stack is intentionally incremental:

* 09A — transport network foundation
* 09B — road infrastructure contract
* 09C — player-independent road construction
* 09D — road network connectivity
* 09E — building road access
* 09F — road-access-gated Workshop production
* 09G — residential-to-work mobility contract
* 09H — player-facing road construction
* 09I — bootstrap economy audit
* 09J — spatial network pressure audit

Current important domain facts:

* `BuildingState` is canonical and persisted.

* Buildings occupy exactly one grid cell.

* `RoadState` is canonical and persisted.

* Roads occupy exactly one grid cell.

* Building and road occupancy are mutually exclusive.

* Roads connect only through orthogonal adjacency.

* Only operational roads participate in networks.

* Road networks are derived connected components.

* Building road access requires an operational building and at least one adjacent operational road.

* `ColonistState` is canonical and persisted with:

  * `id`
  * `residenceId`
  * `workplaceId`

* Residence assignment is derived through the existing population flow.

* Workplace assignment is currently handled by `assignJobs`.

* `getColonistWorkMobility(state, colonistId)` already exists from 09G.

* Mobility currently means:

  `residenceNetworkIds ∩ workplaceNetworkIds ≠ ∅`

* Mobility is currently informational only.

* Production already requires an operational, staffed, road-accessible Workshop.

* Jobs themselves are currently topology-blind.

* SAVE_VERSION remains `4`.

* State hashing is deterministic.

* No pathfinding, movement simulation, vehicles, transit, congestion, distance or travel time exists.

09J concluded that current road topology has a meaningful cost/access decision but otherwise collapses many geometries into equivalent simulation facts.

The next smallest meaningful rule is now intentional:

> A colonist should only be employable when their residence and workplace are connected through the same operational road network.

This step is therefore the first deliberate conversion of the existing 09G mobility fact into a gameplay constraint.

---

# Mandatory workflow

Follow exactly:

**AUDIT → OBSERVATIONS → DESIGN DECISION → IMPLEMENTATION → VERIFICATION**

Do not implement before completing the audit.

The audit must first determine exactly how `assignJobs` currently behaves and where workplace assignment is performed.

If the current architecture cannot support the rule cleanly without introducing a new abstraction or rewriting unrelated systems, STOP and document the architectural finding instead of forcing the implementation.

---

# 1. AUDIT

Inspect the current repository before modifying anything.

Inspect at minimum:

* `assignJobs`
* population update / colonist creation
* residence assignment
* workplace assignment
* `ColonistState`
* Workshop job capacity
* `isEmployed`
* `getColonistWorkMobility`
* `getBuildingRoadAccess`
* `getRoadNetworks`
* simulation phase ordering
* production eligibility
* relevant tests
* E2E transport/road/production flows
* save/load/hash code
* current Step 09 documentation

Confirm the actual current behavior rather than relying on this prompt.

Explicitly answer:

1. How are colonists selected for jobs?
2. In what deterministic order?
3. How are Workshops selected?
4. Does assignment happen once or get recomputed every tick?
5. What happens when an existing workplace becomes invalid or inaccessible?
6. Can a colonist retain a workplace after their mobility relationship becomes disconnected?
7. Does `assignJobs` already have access to the information needed for mobility?
8. Can the rule be implemented using existing derived queries without new persisted state?
9. Does the phase ordering already provide a clean point where mobility-gated employment can be evaluated?
10. Does production already behave correctly once an inaccessible worker is removed from employment?

Do not assume the answer to #10. Verify it.

---

# 2. OBSERVATIONS

Produce a concise architecture/gameplay observation before coding.

Separate:

### Discovered repository rules

Facts that already exist in the code.

### Derived technical rules

Rules that follow naturally from existing architecture.

### Intentional game-design rule

The new explicit rule:

> Employment eligibility requires residential/workplace mobility connectivity.

Also identify any interaction with:

* job capacity;
* multiple colonists;
* multiple Workshops;
* multiple residences;
* multiple road networks;
* disconnected networks;
* under-construction roads;
* under-construction buildings;
* roadless buildings;
* workplace assignment order.

Pay particular attention to whether employment should be:

### Option A

Only assign jobs to currently mobility-connected colonists.

or

### Option B

Assign jobs normally and then invalidate disconnected employment.

Prefer the approach that preserves the cleanest canonical state and deterministic behavior.

Do not create both mechanisms.

---

# 3. DESIGN DECISION

Freeze the minimal contract before implementation.

## Required gameplay contract

A colonist is eligible for employment only when:

```text
colonist exists
AND residence exists
AND workplace candidate exists
AND residence/workplace mobilityConnected == true
```

Therefore:

```text
mobilityConnected = true
→ colonist may be employed

mobilityConnected = false
→ colonist must not be employed
```

The rule must use the existing 09G mobility relationship.

Do NOT introduce:

* distance;
* travel time;
* pathfinding;
* movement;
* vehicles;
* public transit;
* congestion;
* commute penalties;
* probabilistic employment;
* new colonist mobility state;
* persisted network IDs;
* cached mobility;
* generic transport interfaces.

## Important lifecycle requirement

Explicitly determine the behavior when connectivity changes.

Example:

```text
Tick N:
Residence ─ Road ─ Workshop
→ employed

Tick N+1:
road connection disappears
→ employment must no longer be valid
```

The implementation must not leave a stale `workplaceId` that contradicts the new employment rule.

If the canonical representation uses `workplaceId = null` for unemployed colonists, use that existing representation rather than adding another flag.

Likewise:

```text
disconnected → connected
```

must allow employment to resume according to the existing deterministic assignment rules.

Do not invent a separate "mobility blocked" persisted status.

---

# 4. IMPLEMENTATION

Implement the smallest coherent change.

## Domain

Modify the existing employment assignment flow so that mobility connectivity is a prerequisite for assignment.

Reuse:

```text
getColonistWorkMobility(...)
```

and the existing road/network implementation.

Do not create a generic transport framework.

Do not duplicate BFS/network logic.

Do not calculate road connectivity inside `assignJobs`.

Do not move network computation into rendering.

Do not persist derived mobility.

## Deterministic assignment

Preserve the existing deterministic ordering.

If multiple colonists and multiple Workshops exist:

* colonist order must remain deterministic;
* Workshop selection must remain deterministic;
* only mobility-eligible pairs may be assigned.

Verify behavior under reversed insertion order where existing tests establish that this should be invariant.

Do not silently change unrelated job allocation semantics.

## Multiple networks

Test cases must include:

```text
Residence A ─ Network 1 ─ Workshop A

Residence B ─ Network 2 ─ Workshop B
```

Both should be independently employable.

Also test:

```text
Residence A ─ Network 1

Workshop B ─ Network 2
```

The colonist from Residence A must not be employed at Workshop B.

## Multi-network mobility

09G deliberately defines mobility as a set intersection rather than equality of a single network ID.

Preserve that behavior.

Do not simplify:

```text
intersection ≠ empty
```

into:

```text
firstNetwork === firstNetwork
```

---

# 5. ECONOMIC CONSEQUENCES

Do not redesign the economy.

Verify the existing causal chain:

```text
Residence
→ Colonist
→ Mobility
→ Employment
→ Productive Worker
→ Material Production
→ Storage
→ Upkeep
```

Important cases:

### Connected Workshop

```text
employment = 1
production = normal
upkeep = normal
```

### Disconnected Workshop

```text
employment = 0
production = 0
upkeep = 0
```

Be careful here: the current 09F rule says an operational staffed Workshop incurs upkeep even when it lacks road access.

If mobility-gated employment removes the worker, that Workshop becomes vacant and therefore existing upkeep rules naturally produce:

```text
production = 0
upkeep = 0
```

Do not directly modify the upkeep rule.

The causal chain should be:

```text
mobility disconnect
→ no employment
→ no productive worker
→ no production
→ no staffed Workshop
→ existing upkeep rule yields zero
```

If the current implementation instead produces a different result, audit and fix only what is necessary to make the new employment contract consistent with the existing economic contracts.

---

# 6. CONNECTIVITY CHANGE SCENARIOS

These are mandatory.

## Scenario A — Connected from the start

Residence and Workshop share a road network.

Expected:

```text
colonist.workplaceId = workshop
isEmployed = true
production > 0
```

## Scenario B — Disconnected from the start

Residence and Workshop are on different networks.

Expected:

```text
workplaceId = null
isEmployed = false
production = 0
```

## Scenario C — Road constructed later

Start disconnected.

Then construct the connecting road.

Expected progression:

```text
before connection:
employment = 0

road under construction:
employment = 0

road operational:
employment becomes eligible
```

Do not bypass construction lifecycle.

## Scenario D — Connection disappears

Start connected.

Then create a deterministic disconnected state using whatever legitimate current mutation/test mechanism exists.

Expected:

```text
previously employed
→ no longer mobility-connected
→ employment becomes invalid
```

Do not introduce demolition merely to create this scenario if demolition does not exist yet. A domain-level test fixture or controlled state construction is acceptable.

## Scenario E — Multiple colonists

At least:

* 2 colonists
* 2 Workshops
* mixed network connectivity

Verify that only eligible colonists occupy eligible jobs.

## Scenario F — Multiple residences

At least two residences with different road connectivity.

Verify employment follows residence connectivity, not colonist ID alone.

## Scenario G — Multiple road networks

At least 3 networks.

Verify assignments only occur where the residence/workplace network intersection is non-empty.

## Scenario H — Under-construction endpoint

Residence or Workshop under construction.

Verify existing operational-state rules still dominate.

Do not allow an under-construction building to become employable simply because roads exist.

---

# 7. TESTS

Add focused domain tests.

Create or extend the appropriate test file rather than inventing a generic test framework.

Cover at minimum:

1. connected colonist can be assigned;
2. disconnected colonist cannot be assigned;
3. roadless residence/workplace cannot satisfy mobility;
4. under-construction road cannot satisfy mobility;
5. connection becoming operational enables employment;
6. losing connectivity invalidates employment;
7. multiple colonists;
8. multiple Workshops;
9. multiple residences;
10. multiple road networks;
11. set-intersection mobility remains correct;
12. deterministic assignment order;
13. reversed insertion-order behavior where applicable;
14. save/load preserves employment state;
15. mobility remains derived and non-persisted;
16. hash remains stable;
17. deterministic replay produces identical state and hash;
18. existing production tests remain valid;
19. existing upkeep tests remain valid;
20. existing storage tests remain valid;
21. existing food/population tests remain valid;
22. existing road/network tests remain valid.

Do not weaken old tests to make the new tests pass.

---

# 8. BROWSER / E2E VERIFICATION

There is now a player-facing road construction UI from 09H.

Use the existing road E2E infrastructure.

Do not create a large new UI.

The browser verification should demonstrate the actual causal chain if the existing debug/HUD surface allows it:

```text
Residence
→ Workshop
→ road connectivity
→ employment
→ production
```

At minimum verify through the real application that:

### Before connection

A Workshop that is not mobility-connected does not receive the colonist and does not produce.

### After connection

Once the road becomes operational and the residence/workplace networks connect:

* the colonist becomes employable;
* production resumes according to existing timing rules.

If the current player-facing UI does not expose employment sufficiently, add only the smallest diagnostic/debug projection necessary for deterministic E2E verification.

Do not build a new employment UI or inspector in this step.

Run:

* existing road E2E;
* production E2E;
* transport E2E;
* temporal/determinism E2E;
* resource/food E2E;
* GPU E2E where environment supports it.

If GPU is unavailable in the current environment, distinguish environmental limitation from application failure.

Check:

* console errors;
* page errors;
* runtime exceptions;
* canvas/WebGL errors.

---

# 9. PERSISTENCE / HASH / DETERMINISM

SAVE_VERSION should remain:

```text
4
```

unless a genuinely new persisted field becomes unavoidable.

Prefer no schema change.

Verify:

```text
save → load → same state
save → load → same hash
```

Also verify:

```text
same initial state
+ same commands
→ identical final state
→ identical hash
```

Mobility itself must remain derived.

Do not persist:

* `mobilityConnected`;
* road network IDs;
* accessibility caches;
* employment eligibility flags.

If `workplaceId` changes because employment becomes invalid, that is an existing canonical colonist field and therefore legitimate state mutation. Ensure its change is deterministic and correctly represented in save/hash.

---

# 10. DOCUMENTATION

Create or update:

```text
docs/roadmap/Step09K.md
```

Preserve the original prompt/specification text.

Append an **As-Built** section rather than replacing the committed document with the prompt.

Include:

* audit findings;
* actual assignment algorithm;
* final gameplay contract;
* exact files changed;
* test results;
* E2E results;
* persistence/hash result;
* determinism result;
* known limitations;
* deferred systems;
* commit hash.

IMPORTANT:

Do not overwrite a committed Step document with a shorter prompt-only working copy.

If the document already contains committed as-built material, preserve it exactly and append/update safely.

---

# 11. NON-GOALS

Do NOT implement:

* pathfinding;
* individual movement;
* distance;
* travel time;
* commute simulation;
* vehicles;
* cars;
* buses;
* public transit;
* cargo logistics;
* congestion;
* traffic;
* road tiers;
* highways;
* road upgrades;
* road demolition;
* road refunds;
* road upkeep;
* pollution;
* money;
* housing desirability;
* migration;
* generic transport abstractions;
* mobility caching;
* persisted network state;
* new road graph framework;
* new rendering architecture.

This step is specifically:

> **Mobility connectivity → employment eligibility.**

---

# 12. ARCHITECTURAL GUARDRAILS

Maintain:

```text
Domain
  ↓
Application
  ↓
Rendering/UI
```

Do not place gameplay rules in rendering.

Do not make UI state authoritative.

Do not duplicate domain calculations in E2E/UI code.

Reuse the existing road/network/mobility queries.

Avoid premature abstractions.

Prefer one direct rule over a generalized employment/transport framework.

Do not refactor unrelated code.

Do not rename existing APIs without necessity.

Do not alter economic coefficients.

Do not alter construction duration.

Do not alter storage.

Do not alter food.

Do not alter population admission.

Do not alter road cost.

Do not alter road lifecycle.

Do not alter road connectivity semantics.

---

# 13. FINAL VERIFICATION

Before committing, run the full relevant suite.

Required:

* Vitest;
* lint;
* typecheck;
* build;
* road E2E;
* transport E2E;
* production E2E;
* resource E2E;
* food E2E;
* temporal/determinism E2E;
* GPU E2E where available;
* save/load/hash verification;
* deterministic replay.

Confirm the working tree is clean except for intentional changes.

Use one focused commit.

Commit message:

```text
Step 09K: Mobility-Gated Employment
```

---

# 14. FINAL REPORT

Return a concise but complete report with these sections:

## A. STATUS

`COMPLETE` or `BLOCKED`

## B. AUDIT

What the existing employment system actually did.

## C. OBSERVATIONS

Important architectural and gameplay findings.

## D. DESIGN DECISION

The final employment/mobility contract.

## E. IMPLEMENTATION

Files changed and what each change does.

## F. EMPLOYMENT BEHAVIOR

Connected/disconnected/multiple-network behavior.

## G. CONNECTIVITY CHANGE

What happens when connectivity appears or disappears.

## H. ECONOMIC EFFECT

Employment → production → upkeep consequences.

## I. TESTS

Exact Vitest count and result.

## J. E2E

Exact results for relevant browser suites.

## K. GPU / RUNTIME

Hardware GPU result or environmental limitation.

## L. PERSISTENCE

SAVE_VERSION, save/load, hash behavior.

## M. DETERMINISM

Replay and insertion-order results.

## N. SCOPE / DEFERRED

Explicitly list what remains intentionally unimplemented.

## O. COMMIT

Commit hash and parent.

Do not claim success for a verification that was not actually run.

The goal is not merely to make tests green.

The goal is to establish the first real spatial employment constraint in NOVA while keeping the simulation deterministic, minimal, and architecturally coherent.

---

# As-Built (Step 09K)

## A. Status

`COMPLETE`

## B. Audit

The employment system as found (≠ the prompt's assumptions):

* `ColonistState = { id, residenceId, workplaceId }` — both relations are canonical and persisted; there is no position, no velocity, no spatial field on a colonist.
* **Workplace** is assigned only by `assignJobs` (`src/domain/simulation/phases.ts`, phase 6). `isEmployed` resolves the reference: `workplaceId` must point at an *operational workshop*.
* `assignJobs` is a **full recomputation every tick**, not a one-shot assignment:
  1. invalid references (missing / non-workshop / non-operational building) are cleared to `null`;
  2. still-valid assignments are preserved (employment never churns);
  3. unemployed colonists (ascending colonist id) fill available operational Workshops (ascending building id), one colonist per Workshop;
  4. surplus colonists stay unemployed; surplus Workshops stay vacant.
* **Deterministic order**: colonist ids ascending, Workshop ids ascending, no randomness, no distance, no proximity, no skill, no priority.
* A colonist *could* retain a workplace after mobility disconnected, because assignment did not consult mobility at all.
* `getColonistWorkMobility` (09G) already derived `mobilityConnected = residenceNetworkIds ∩ workplaceNetworkIds ≠ ∅` purely from canonical state.
* `getBuildingRoadAccess` (09E) already returns empty networks unless the building is operational and has an orthogonally adjacent **operational** road; `getRoadNetworks` (09D) already provides connected components.
* **Phase order** (docs/11): `… → assignJobs (6) → produceMaterial (7) → applyCommand (8a) → upkeepBuildings (8b) → advanceTime (9)`. `assignJobs` therefore runs before both production and upkeep each tick — a clean point to gate employment.
* **Answer to audit #10 (verified, not assumed)**: production (`materialProductionForTick`) requires `workers > 0` *and* `getBuildingRoadAccess(...).hasRoadAccess`. Once a mobility-disconnected worker is removed, `countWorkersAt` is 0, so production is 0 **and** `countStaffedOperationalWorkshops` is 0, so upkeep is 0 — using the existing rules, with no change to either rule.

## C. Observations

* **Discovered repository rules**: employment was topology-blind (09J had already pinned that two topologies produce identical employment facts); `workplaceId = null` is the existing canonical representation of unemployed; `assignJobs` already received the whole `SimulationState`, so it already had everything mobility needs.
* **Derived technical rules**: because `assignJobs` recomputes every tick, gating it automatically handles both directions of connectivity change — a lost connection clears `workplaceId` on the same tick, a regained connection makes the pair eligible on the same tick, with no new state and no extra mechanism.
* **Intentional game-design rule**: employment eligibility requires residential/workplace mobility connectivity.
* **Option A vs Option B**: the step asked to choose one. **Option A** (only assign to currently mobility-connected colonists) was chosen, because `assignJobs` already recomputes from scratch every tick and already clears invalid references — Option A is therefore *already* the existing shape, whereas Option B would introduce a second invalidation mechanism on top of it. The lifecycle requirement (no stale `workplaceId`) is satisfied by applying the same predicate to the *preserve* branch (step 2) as to the *fill vacancies* branch (step 3).
* Geometry / lifecycle interactions: job capacity, multiple colonists, multiple Workshops, multiple residences, multiple networks, disconnected networks, under-construction roads and under-construction buildings all fall out of the single predicate, because it delegates to 09E (operational building + operational orthogonal road) and does the set intersection.

## D. Design Decision

One predicate, one place, no new state:

```text
colonist is eligible
  ⟺ colonist exists
    ∧ residenceId ≠ null
    ∧ workplaceId resolves to an operational Workshop
    ∧ residenceNetworkIds ∩ workplaceNetworkIds ≠ ∅
```

* New pure derived helper `areBuildingsMobilityConnected(state, buildingAId, buildingBId)` in `src/domain/mobility/mobility.ts`, and `getColonistWorkMobility` refactored to intersect through the same shared `haveSharedNetwork` helper — one rule, not two.
* The gate is applied in `assignJobs` at **both** places that decide employment: clearing (step 1-2) and filling (step 3-4).
* **Set intersection, never first-network equality** (09G §7 preserved): a building can reach several networks (09E §7).
* **No new persisted state**: `workplaceId` remains the only employment field; disconnection simply clears it to `null` (the existing unemployed representation). No `mobilityBlocked` flag, no cached mobility, no persisted network ids.
* **No new abstraction**: nothing was added to `applyCommand`, the renderer, or any query barrel; `assignJobs` imports the domain predicate directly.

## E. Implementation

| File | Change |
| --- | --- |
| `src/domain/mobility/mobility.ts` | Extracted `haveSharedNetwork`; added exported `areBuildingsMobilityConnected(state, a, b)` (the pair-level eligibility predicate); `getColonistWorkMobility` now uses the same helper. Header updated for 09K. |
| `src/domain/simulation/phases.ts` | `assignJobs` now requires `residenceId ≠ null` **and** `areBuildingsMobilityConnected(state, residenceId, workplaceId)` before preserving an existing workplace (steps 1-2), and fills vacancies with the first vacancy the colonist's residence is mobility-connected to (steps 3-4), replacing the previous blind index-based vacancy consumption. Ordering unchanged: colonists ascending id, vacancies ascending workshop id. |
| `src/domain/jobs/jobs.ts` | Header only: documents the 09K mobility gate and the absence of travel modelling. No logic change. |
| `tests/helpers.ts` | `withRoadsForWorkshops` upgraded: it now connects every residence and workshop into shared operational road networks (nearest existing road first, Manhattan path, both leg orders tried), instead of only dropping one adjacent road per workshop. Test-only, no cost, no tick, no resource change. |
| `tests/roadProduction.test.ts` | `staffedWorkshopWithRoad` now steps once after injecting roads so `assignJobs` re-runs with the network present; B/H/I updated to the 09K contract (no worker → no production → no upkeep); D now builds a real 3-cell path. |
| `tests/roadConstruction.test.ts` | N/O/P updated: the player road gesture now builds a residence↔workshop path; N asserts `mobilityConnected === true` and employment at completion; P asserts an under-construction road leaves employment unchanged (0) and upkeep 0. |
| `tests/spatialNetworkPressure.test.ts` | I1–I4 and J2 updated from "employment is topology-blind" to the 09K contract (residence connectivity is required; with R1 isolated the job moves to the connected colonist-2). Audit measurements for topology equivalence classes (A–H, L, N) are unchanged. |
| `tests/jobs.test.ts`, `tests/laborCapacity.test.ts`, `tests/economicInvariants.test.ts`, `tests/storageCapacity.test.ts`, `tests/constructionMaterialFlow.test.ts`, `tests/upkeep.test.ts` | Fixtures that place a residence (or a synthetic workshop-only state) after the last helper call now call `withRoadsForWorkshops` again; INV-06 gained the two missing helper calls. No economic coefficient or assertion-semantics change. |
| `tests/bootstrapEconomy.test.ts` | Scenario C/D/E/F/I/J now build the 3-cell path (3,2)/(4,2)/(4,3) that actually links residence (2,2) to workshop (4,4); scenarios B and G1 updated to the 09K contract (roadless Workshop is idle: production 0 **and** upkeep 0); numeric trajectories re-pinned to the new (audited) values. |

## F. Employment behavior

| Situation | `workplaceId` | production | upkeep |
| --- | --- | --- | --- |
| Residence ─ road ─ Workshop, both operational, shared network | set | normal | normal |
| Residence and Workshop road-accessible but on distinct networks | `null` | 0 | 0 |
| No road at the residence | `null` | 0 | 0 |
| Under-construction road | `null` | 0 | 0 |
| Under-construction residence or Workshop | `null` | 0 | 0 |
| Diagonal-only road | `null` | 0 | 0 |
| Multi-network endpoints with a non-empty intersection | set | normal | normal |
| Multi-network endpoints with an empty intersection | `null` | 0 | 0 |

## G. Connectivity change

* **connected → disconnected**: on the very next tick `assignJobs` re-evaluates the predicate, clears `workplaceId` to `null`, and the Workshop becomes vacant. No stale employment is possible, because assignment is fully recomputed each tick.
* **disconnected → connected**: the pair becomes eligible on the tick the connecting road turns operational; the existing deterministic rules (ascending colonist id, ascending workshop id) then assign normally.
* No `mobilityBlocked` status, no cooldown, no penalty, no persistence.

## H. Economic effect

The causal chain is exactly the one the step specified, with no direct edit to any economic rule:

```text
mobility disconnect
→ no employment (assignJobs clears workplaceId)
→ no productive worker (countWorkersAt = 0)
→ no production (materialProductionForTick skips workers === 0)
→ no staffed Workshop (countStaffedOperationalWorkshops = 0)
→ existing 08C upkeep rule yields 0
```

Consequences that are visible in the re-pinned audit tests:

* the old 09F "staffed roadless Workshop drains 1 Material/tick for nothing" is **gone**: a roadless Workshop is now simply idle (0 production, 0 upkeep);
* the bootstrap Material trajectory is lower by the extra road cost (a real residence↔workshop path costs 3 cells = 15 instead of a single decorative 5), reaching the same 24 equilibrium;
* upkeep follows staffing exactly as before — one *connected* staffed Workshop pays 1.

## I. Tests

```text
Test Files  24 passed (24)
Tests       367 passed (367)
```

Includes `tests/colonistMobility.test.ts` (A–P, 09G contract plus the 09K predicate) and the updated 09F/09H/09I/09J/08C/08D/08E/08F/08G/07C suites. No test was deleted; assertions that encoded the pre-09K economy were re-pinned to the verified 09K trajectory, and the fixtures gained the road networks the new rule requires.

## J. E2E

Run headless with `vite preview` against the production build (`npm run build`), real palette clicks and real canvas gestures, `window.__nova` read-only:

```text
ROAD E2E       ALL PASS
  A fresh: tick 0, roads 0, material 100
  C roadless Workshop (09K): worker 0, production 0, upkeep 0
  E 4-cell drag placed: material 50 -> 30 (4 x 5 + upkeep 0)
  F roads operational: Workshop access true, Residence unconnected -> worker 0, production 0
  G mobility connected -> employed 1, production 2/tick, mobilityConnected 1
  zero console/page errors

TRANSPORT E2E  ALL PASS   (10 assertions, zero console/page errors)
PRODUCTION E2E ALL PASS   (10 assertions, zero console/page errors)
RESOURCE E2E   ALL PASS   (10 assertions, zero console/page errors)
FOOD E2E       ALL PASS   (9 assertions, zero console/page errors)
TEMPORAL E2E   ALL PASS   (13 assertions, zero console/page errors)

JOBS E2E       DEFERRED  (pre-existing 09F deferral: no road palette at the time)
UPKEEP E2E     DEFERRED  (pre-existing 09F deferral)
```

The road E2E is the directly relevant suite and was updated to the 09K narrative: a roadless Workshop is now idle rather than staffed-but-blocked, the Workshop-side road alone does not create a worker, and the Residence-side closing cell is what turns employment and production on.

## K. GPU / runtime

```text
GPU E2E  FAIL — environmental limitation
probe: WebGL2, unmaskedRenderer "ANGLE (Google, Vulkan 1.3.0
  (SwiftShader Device (Subzero)), SwiftShader driver)"
```

The failure is the suite's explicit **software-renderer guard**: this environment exposes SwiftShader (CPU rasterisation) instead of a hardware GPU, so the run is reported as an environmental limitation, not an application failure. The canvas, renderer and WebGL2 context all came up correctly; only the hardware-vendor assertion failed.

## L. Persistence

* `SAVE_VERSION` stays **4** — no schema change.
* Nothing derived is persisted: no `mobilityConnected`, no network ids, no eligibility flag.
* `workplaceId` remains the only employment field; when the rule clears it, that is a legitimate canonical mutation and is hashed as such.
* Save/load round-trips preserve employment and the derived mobility result.

## M. Determinism

* `areBuildingsMobilityConnected` is pure and derived; same state → same result.
* `assignJobs` iterates colonists and Workshops in ascending id order and consumes vacancies in ascending id order; insertion order of the `colonists` / `buildings` / `roads` records does not affect the outcome.
* Identical initial state plus identical commands produces an identical final state and identical canonical hash (covered by the determinism suites and `I1`/`J1` in the bootstrap audit).

## N. Scope / deferred

Intentionally **not** implemented in 09K: pathfinding, individual movement, distance, travel time, commute simulation, vehicles, transit, congestion, road tiers/highways/upgrades, road demolition/refunds/upkeep, pollution, money, housing desirability, migration, generic transport abstractions, mobility caching, persisted network state, new road graph framework, new rendering architecture, player-facing employment/mobility UI.

## O. Commit

* Message: `Step 09K: Mobility-Gated Employment`
* Parent: `c3e190e` (Step 09J: Spatial Network Pressure Audit)
* Commit hash: recorded on the commit itself (one focused commit: the three domain files, the updated test fixtures, the updated road E2E, and this document).

## Known limitations

* Mobility is still a binary connectivity fact: two buildings 20 road cells apart are exactly as "commutable" as two adjacent ones. Distance and travel time remain deliberately unmodelled.
* Employment can flip on a single tick when connectivity changes; there is no transition period, notice, or cost.
* Vacant road-connected Workshops still contribute to 08F storage capacity (unchanged infrastructure rule).
* `productionBlockedByRoad` in the `__nova.stats` diagnostic can no longer become non-zero (a disconnected worker is now removed before production), so it is effectively dead telemetry kept for backward compatibility rather than a meaningful signal.
* A colonist without a residence is never employable (existing rule, now simply also blocked by the `residenceId ≠ null` clause of the gate).

## Next design question

Now that employment depends on network connectivity, what should happen when the *player* can observe and manipulate that dependency — i.e. does NOVA need a player-facing way to see which residence↔workshop pairs are connected (and which jobs are stranded), or should the simulation keep the new constraint invisible until a later mobility/transit step?
