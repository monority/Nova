# NOVA — Step 10BN — Town Capability & Progression Design

## Context

NOVA has now closed the current Storage investigation.

### Step 10BM — completed

Commit:

`431466e`

Verdict:

* keep `StorageHub` persistence shape;
* use resource-specific semantics;
* Material has active reserve semantics;
* Food storage is currently persisted but inert;
* Water storage is currently persisted but inert;
* no storage controls;
* no storage buildings;
* no logistics;
* 5 semantic tests added;
* focused tests: 48 PASS;
* typecheck/lint/build/diff check PASS;
* the known unrelated full-suite timeout remains documented.

This means the Storage question is **not the next feature to expand**.

Do not reopen Storage unless the Town design reveals a concrete dependency.

---

# Mission

Design the next meaningful progression capability:

> **Town**

Current progression is:

```text
Wilderness
    ↓
Settlement
    ↓
Village
    ↓
Town
    ↓
City
    ↓
Metropolis
    ↓
Autonome
```

Currently:

### Settlement

Requires:

* population >= 1
* Food balance
* operational road network

### Village

Requires:

* population >= 2
* Water capacity >= 2
* Food balance

### Town and above

Intentionally undefined.

The goal of this step is **not** to invent an arbitrary Town threshold.

The goal is to determine:

> What new capability should Town introduce that materially changes how the player builds and manages the colony?

---

# Core design constraint

A Town progression step must be a **capability**, not merely a bigger number.

Avoid designs such as:

```text
Town = population >= 5
```

unless that threshold is merely one part of a larger causal system.

A useful Town step should introduce a new relationship between existing systems or introduce one carefully justified new system.

Examples of potentially meaningful directions include:

* stronger housing pressure;
* more advanced workforce specialization;
* multi-building economic chains;
* stronger spatial requirements;
* infrastructure dependency;
* increased resource resilience requirements;
* differentiated residential/economic zones;
* a new class of production;
* a meaningful service requirement;
* a new form of spatial optimization.

These are **candidate directions only**.

Do not assume any of them is correct.

---

# 1. Start from the actual implementation

Read the current code and documentation.

Do not design Town from generic city-builder conventions.

Map what NOVA already has:

### Population

* Residence
* capacity
* admission
* colonists
* workplace assignment
* construction crew
* mobility
* road-network eligibility

### Resources

* Food
* Water
* Material
* Workshop production
* Farm production
* Well production
* consumption
* Material reserve
* Water service
* Water capacity

### Infrastructure

* Roads
* road networks
* accessibility
* spatial distance
* BFS connectivity

### Terrain

* blocked cells
* immutable blocked terrain
* placement constraints

### Progression

* Wilderness
* Settlement
* Village

### Construction

* construction cost
* construction duration
* construction crew
* operational state

Identify what combinations already exist but are not yet exploited by progression.

---

# 2. Identify the missing Town-scale pressure

Ask:

> What does a Village currently NOT need to care about that a Town plausibly should?

This is the central design question.

Do not answer with "more resources".

Find a **new decision pressure**.

For example:

```text
Village:
Can I establish a functioning settlement?

Town:
Can I sustain a larger, spatially interconnected economic system?
```

But do not assume this exact framing is correct.

Derive the answer from NOVA's actual mechanics.

---

# 3. Evaluate candidate Town capabilities

Generate 3–5 serious candidates.

For each candidate provide:

### Capability

What the Town introduces.

### Player decision

What the player actually chooses.

### Existing-system dependency

Which current systems it uses.

### New state required

What new domain state would be necessary, if any.

### Spatial consequence

Whether placement/layout matters.

### Economic consequence

How resources/workforce/construction are affected.

### Failure mode

What happens when the Town cannot satisfy the requirement.

### Player-visible feedback

How the player understands the pressure.

### Complexity cost

What new code and concepts are introduced.

### Why Village is insufficient

Why this should not already exist at Village.

---

# 4. Reject weak candidates

Explicitly reject candidates that are:

* only a population threshold;
* only a bigger resource stockpile;
* only a cosmetic unlock;
* only another building with no systemic effect;
* a conventional city-builder mechanic with no NOVA-specific purpose;
* dependent on a large logistics system that NOVA does not yet have;
* primarily UI complexity;
* primarily simulation complexity without a new player decision.

Also reject mechanics that require introducing several supporting systems simultaneously.

The Town step should remain **architecturally narrow**.

---

# 5. Examine the strongest candidate against NOVA's spatial identity

NOVA is fundamentally a spatial city-builder.

The player should increasingly care about:

* where buildings are placed;
* which buildings connect;
* how road networks evolve;
* distance;
* access;
* density;
* resource/service relationships.

Determine whether the Town capability can strengthen this identity.

A useful question:

> Does the Town mechanic make two layouts with identical buildings/resources behave differently?

If not, explain why it still deserves to exist.

Prefer mechanics where spatial arrangement creates a real tradeoff.

---

# 6. Do not accidentally create a logistics game

NOVA does **not** currently have:

* transport units;
* warehouses;
* delivery jobs;
* inventories per building;
* explicit freight;
* road traffic simulation;
* production chains requiring physical hauling.

Do not introduce all of these simply to make Town "deeper".

If a candidate requires logistics, determine whether a much smaller abstraction can provide the same strategic effect.

Prefer:

```text
abstract systemic relationship
```

over:

```text
full logistics simulation
```

unless the evidence strongly supports the latter.

---

# 7. Examine workforce carefully

The workforce system already contains:

* automatic assignment;
* manual assignment;
* workplace capacity;
* road mobility;
* distance preference;
* construction crew;
* mutual exclusion between construction and workplace.

This may already be sufficient to create a Town-scale pressure.

Investigate whether Town can create a meaningful workforce decision without introducing:

* worker classes;
* professions;
* wages;
* happiness;
* schedules;
* individual needs;
* complex labour simulation.

Do not add any of these unless absolutely justified.

---

# 8. Examine housing carefully

Residence currently has:

```text
capacity = 1
```

Population expansion therefore requires additional residences.

Determine whether Town could create a meaningful housing/spatial pressure using the existing Residence model.

Do NOT automatically introduce:

* apartments;
* density levels;
* housing tiers;
* happiness;
* land value.

First determine whether existing housing plus spatial constraints already provides enough foundation.

If a housing expansion is justified, identify the **minimum new concept**.

---

# 9. Examine services carefully

Water already demonstrates an important distinction:

* service/coverage;
* production;
* capacity;
* shortage;
* admission.

Determine whether this architecture provides a useful model for Town.

Potentially ask:

> Should Town require a more complex service relationship than Village?

But do not invent a generic "services" abstraction.

If another service is proposed, define exactly:

* source;
* coverage;
* capacity;
* consumers;
* failure;
* spatial relationship;
* whether workforce is required.

Keep it concrete.

---

# 10. Define Town as a contract

Once the strongest candidate is selected, produce a precise Town contract.

It should specify:

### Entry condition

Exactly what makes the colony eligible for Town.

### New capability

Exactly what becomes possible.

### Player action

Exactly what the player does differently.

### Simulation effect

Exactly what changes in the tick/economy/spatial model.

### Failure

Exactly what happens when the requirement is no longer satisfied.

### Persistence

What state is saved.

### Derived state

What remains derived.

### Determinism

How insertion order and replay remain deterministic.

### UI

What must become visible.

### Rendering

Whether any new visual state is required.

### Migration

Whether SAVE_VERSION changes.

---

# 11. Keep progression reversible where appropriate

Consider whether Town should be:

### Permanent milestone

Once reached, it stays reached.

or:

### Current state

The colony can fall below Town requirements.

Do not assume.

Compare the implications against existing progression:

* Settlement
* Village

and against NOVA's deterministic simulation philosophy.

If progression should remain monotonic while underlying conditions can deteriorate, distinguish:

```text
unlocked progression
```

from:

```text
current operating state
```

Do not introduce a complex progression-state machine unless required.

---

# 12. Consider whether Town needs a new building

A Town-specific building is acceptable **only if the building itself expresses the new capability**.

Do not create:

> "Town Hall because city-builders have Town Halls."

A building should exist because it changes the simulation.

If a building is proposed, specify:

* footprint;
* construction cost;
* construction duration;
* workforce requirement;
* road/access requirement;
* resource effects;
* spatial effects;
* whether it can be duplicated;
* whether it is mandatory;
* whether it creates a new optimization problem.

Prefer one new concept over a family of five new buildings.

---

# 13. Scenarios

Do not add a new scenario automatically.

The scenario catalogue was deliberately closed at 8 in Step 10BF.

Only propose a new scenario if the selected Town mechanic cannot be validated adequately using the existing scenarios/tests.

If a new scenario is truly required, explain why one of the existing eight cannot exercise the mechanic.

Do not reopen the content-closure decision casually.

---

# 14. Research comparable games selectively

Research only enough to avoid obvious design mistakes.

Useful comparisons may include:

* Timberborn
* Frostpunk
* Going Medieval
* Caesar-style city builders
* other relevant settlement/city-building systems

Focus on:

* what actually changes between settlement stages;
* how larger settlement stages create new constraints;
* whether progression is threshold-based or capability-based;
* how spatial pressure increases;
* whether housing/services/workforce are used as progression drivers.

Do not copy mechanics.

Do not produce a generic game-design survey.

The purpose is to validate the **type of pressure**, not to imitate implementation.

Cite current sources for factual claims.

---

# 15. UX / visual audit

Inspect the current application in real Chromium.

Ask:

* Is Village currently visually legible as a progression state?
* Is there already a natural place for Town status?
* Would the proposed Town capability be understandable from the existing UI?
* Does the HUD have room for another important status?
* Does the current strict top-down rendering communicate the new spatial requirement?
* Would the mechanic require a new overlay/preview?
* Can it remain visually restrained?

Do not redesign the whole HUD.

Do not add generic cards or dashboards.

---

# 16. Implementation boundary

This is primarily a **design + architecture step**.

Do not implement the Town mechanic in this step unless the design is exceptionally clear and the implementation is genuinely small.

The preferred output is:

```text
AUDIT
→ candidate mechanics
→ rejection of weak mechanics
→ selected Town capability
→ exact contract
→ architecture impact
→ implementation plan
```

If you believe a tiny preparatory change is necessary, justify it explicitly.

Do not start coding simply to make the step produce a commit.

---

# 17. Required final deliverable

Produce the following sections.

## A. Current progression map

Show:

```text
Wilderness
→ Settlement
→ Village
→ Town
```

with exact current contracts.

## B. Missing Town capability

Explain what Village currently cannot express.

## C. Candidate comparison

Provide a compact table:

| Candidate | New decision | Spatial impact | Economic impact | Complexity | Verdict |
| --------- | ------------ | -------------- | --------------- | ---------- | ------- |

Do not score candidates numerically.

Use factual/design reasoning instead.

## D. Selected Town capability

Explain exactly what is being introduced and why.

## E. Town contract

Specify:

* entry;
* capability;
* player action;
* simulation;
* failure;
* persistence;
* derived state;
* determinism;
* UI;
* rendering.

## F. Rejected alternatives

Explain why the strongest alternatives were not selected.

## G. Architecture impact

Identify:

* domain changes;
* application changes;
* rendering changes;
* persistence changes;
* test changes.

## H. Storage interaction

Confirm whether the Town design:

* uses Storage;
* does not use Storage;
* or requires a change.

Do not reopen 10BM without evidence.

## I. Scenario impact

Confirm whether existing scenarios can validate the future mechanic.

## J. Implementation plan

Give the smallest coherent next implementation step.

## K. Final QA

Finish exactly with:

```text
Step 10BN — [PASS / PARTIAL / BLOCKED]

Town capability:
...

Why it is a real new decision:
...

Spatial consequence:
...

Economic consequence:
...

Workforce consequence:
...

New state required:
...

Storage interaction:
...

New building required:
...

Progression contract:
...

UI impact:
...

Rendering impact:
...

Persistence impact:
...

Determinism impact:
...

Scenarios:
...

Implementation boundary:
...

Tests:
...

Browser:
...

GPU:
...

Known limitations:
...

Next justified step:
...
```

---

# Non-negotiable design principles

### 1. Town must earn its existence

Do not create Town because the roadmap says it exists.

Create it because there is a clear new gameplay capability worth unlocking.

### 2. Avoid threshold inflation

Do not solve progression with:

```text
more population
more resources
more buildings
```

unless those numbers are part of a deeper causal system.

### 3. Spatial identity matters

Prefer a Town mechanic that makes layout increasingly meaningful.

### 4. Do not overbuild

One strong new capability is better than five shallow systems.

### 5. Preserve determinism

No hidden randomness.

No order-dependent behavior.

No persisted derived state.

### 6. Do not reopen closed decisions casually

Especially:

* Storage semantics;
* economic tuning;
* scenario catalogue;
* road architecture;
* water semantics.

Reopen them only if Town creates a concrete contradiction.

### 7. No generic city-builder cargo cult

NOVA should not acquire:

* Town Hall;
* warehouse;
* happiness;
* taxes;
* zoning;
* traffic;
* professions;

simply because other city-builders have them.

Every new mechanic must have a demonstrated causal purpose.

---

# Success criterion

10BN succeeds if we finish with a Town design that can be summarized in one sentence:

> **Town introduces [specific capability], which forces the player to make [specific new decision] about [specific existing/new system], with a meaningful spatial and/or economic consequence.**

If that sentence cannot be made precise, **Town is not ready to implement**.

The correct outcome of this step may therefore be:

> "Town remains intentionally undefined because no candidate currently creates enough new gameplay value."

That is a valid result.

Do not force a mechanic merely to advance the roadmap.

---

# 18. Town capability design report

## A. Current progression map

Current progression is derived and reversible from canonical state:

```text
Wilderness
  → Settlement
      requires population >= 1
      AND Food production >= Food consumption
      AND at least one operational road network

    → Village
        requires population >= 2
        AND Water production capacity >= 2/tick
        AND Food production >= Food consumption

      → Town
          intentionally undefined
```

`getProgression` is pure and derived. It does not persist, mutate, or hash progression state. Current stage falls back when current conditions fail. Town and later stages are not represented in the stage union and `nextStage` becomes `null` after Village.

## B. Missing Town capability

Village proves that a small colony can survive with basic food, water service, roads, housing, and production. It does not force a new relationship among those systems.

NOVA currently has no demonstrated Town-scale pressure that is both:

1. absent from Village; and
2. not merely a larger threshold or a conventional city-builder feature.

Existing pressures are already active before Town: road access, Water coverage, food balance, worker assignment, construction crews, and Material reserve. Increasing any one number would inflate progression without adding a distinct decision.

## C. Candidate comparison

| Candidate | New decision | Spatial impact | Economic impact | Complexity | Verdict |
|---|---|---|---|---|---|
| Connected civic network | Which production, service, and housing anchors share a road network | Strong, but already how roads and Water work | Mostly access reliability, not a new economy | Low if derived; high if new network state | Reject: repeats existing road/service pressure |
| Workforce specialization | Which workers become producers versus construction crew | Moderate through workplace placement | Changes labor allocation and output | Medium; risks professions, classes, wages | Reject: current manual assignment and crew exclusion already create the decision |
| Higher-density housing | How to fit more colonists on limited cells | Strong | Raises housing and service demand | High: housing tiers, land/value rules, new buildings | Reject: current world has no land scarcity or density pressure |
| Redundant Water/service capacity | Where to place backup Wells and service coverage | Strong | Adds resilience and investment tradeoff | Medium; requires failure/disruption semantics | Defer: no current service failure model justifies it |
| Multi-step production chain | Which intermediate resource chain to build | Potentially strong | Adds recipes, stocks, and dependencies | High; approaches logistics and new resources | Reject: violates narrow Town scope |
| Warehouse/district storage | Where to store goods and how to connect them | Strong | Changes logistics and capacity investment | Very high: buildings, transport, inventories | Reject: 10BM closed storage expansion; no freight system exists |

## D. Selected Town capability

### No capability selected — Town remains intentionally undefined

No candidate currently clears the bar. A Town threshold without a new capability would violate the roadmap's core rule. A connected-network gate would mostly relabel existing road and Water requirements. Workforce specialization would add language without adding a proven labor constraint. Housing density requires a land-pressure model NOVA does not have. Redundant service requires a failure model. Production chains and warehouses require premature logistics.

Town should remain a roadmap placeholder until a measured failure or decision pressure identifies the capability worth adding. This is a design decision, not a missing implementation.

## E. Town contract

No executable Town contract is accepted in this step.

The only defensible contract boundary is:

- **Entry:** not defined.
- **Capability:** not defined.
- **Player action:** not defined.
- **Simulation effect:** none.
- **Failure:** none.
- **Persistence:** none; current progression remains derived.
- **Derived state:** current `getProgression` remains authoritative.
- **Determinism:** unchanged; pure queries and canonical state.
- **UI:** Village remains the final displayed stage with Town deferred.
- **Rendering:** none.
- **Migration:** none; SAVE_VERSION remains 8.

Town must not be represented by a placeholder threshold, cosmetic unlock, empty stage, or generic “Town Hall” building.

## F. Rejected alternatives

### Connected civic network

Roads already gate production access and mobility. Water already derives service coverage from operational Wells. Requiring more connectivity would be an aggregate of existing checks, not a new player decision.

### Workforce specialization

Manual assignment, automatic assignment, workplace capacity, distance preference, and construction-crew exclusion already create labor tradeoffs. A Town label alone does not add enough pressure to justify professions, wages, classes, or schedules.

### Higher-density housing

Residence capacity is fixed at one, but the current world does not impose land scarcity, density limits, or housing quality. A density system would be a new economy, not a Town capability.

### Redundant service

Backup Wells or Farms could become meaningful if buildings had deterministic disruption, maintenance failure, or seasonal pressure. None exists now. Adding redundancy requirements without a failure model would be arbitrary threshold inflation.

### Production chains and storage infrastructure

These would introduce recipes, intermediate resources, transport, buildings, or logistics. They exceed a narrow progression step and reopen decisions already deferred by 10BM.

## G. Architecture impact

- Domain changes: none.
- Application changes: none.
- Rendering changes: none.
- Persistence changes: none; SAVE_VERSION remains 8.
- Test changes: none required. Existing progression tests continue to verify that Town is deferred rather than receiving fake conditions.
- Documentation: this report records the decision and evidence.

## H. Storage interaction

Town does not use, change, or reopen Storage. The Material reserve remains a supporting economy feature from 10BJ–10BM. Food and Water storage remain inert until a measured buffer need exists.

## I. Scenario impact

No new scenario added. Existing scenarios and progression tests can validate the current Settlement/Village contracts. A future Town mechanic must prove that existing scenarios cannot exercise its new pressure before the closed eight-scenario catalogue is reopened.

## J. Minimal next implementation

No implementation. The next justified step is a focused design-evidence step, not code: identify one existing system whose current failure or tradeoff becomes materially harder at larger scale, then define one Town capability from that evidence.

Potential evidence targets, in order:

1. service redundancy under a real disruption model;
2. land/density pressure from actual map limits;
3. workforce pressure that cannot be solved by current assignment/crew rules.

Do not implement a threshold, Town Hall, warehouse, zoning system, professions, or production chain merely to fill the stage.

## K. Final QA

```text
Step 10BN — PASS

Town capability:
Town remains intentionally undefined. No candidate currently creates enough new gameplay value without adding premature systems.

Why it is a real new decision:
No Town decision is accepted. Existing road, Water, workforce, construction, and reserve decisions remain the current pressure model.

Spatial consequence:
None added. Existing road and Water spatial rules remain unchanged.

Economic consequence:
None added. No Town resource, production, or consumption change.

Workforce consequence:
None added. Existing assignment and construction-crew tradeoffs remain authoritative.

New state required:
None.

Storage interaction:
None. 10BM semantics remain closed.

New building required:
None.

Progression contract:
Wilderness → Settlement → Village; Town remains deferred with no fake threshold.

UI impact:
None. Existing UI continues to show Village as the final contracted stage.

Rendering impact:
None.

Persistence impact:
None. SAVE_VERSION remains 8.

Determinism impact:
None. Progression remains pure and derived.

Scenarios:
No new scenario. Existing catalogue remains closed at eight.

Implementation boundary:
Design-only. No runtime code.

Tests:
Existing progression and focused Storage tests remain valid. No new test required because no semantic fact changed.

Browser:
No browser run required; no UI changed.

GPU:
Not run; no rendering/UI code changed.

Known limitations:
Town has no accepted entry condition, capability, or player action. Candidate pressures need measured failure evidence before implementation.

Next justified step:
Audit one concrete scale-pressure failure—service redundancy, land density, or workforce constraint—and only then define Town.
```

