# Step 10X — Next System Discovery & Phase 5 Design Audit

## Position

Starting commit: `c328c40` — Step 10W complete.

Steps 10U–10W have now closed the current economy branches:

* Material does not need a recurring sink.
* Food already owns survival.
* Water already owns growth admission.
* Housing already owns population capacity.
* Shelter Quality is a valid future spatial/material choice but has no independent consequence.
* Settlement stages are premature because no existing system consumes them.
* Generic happiness, maintenance, quality, service and demand systems are not justified.

This step is therefore a **roadmap discovery audit**.

It is still **AUDIT-ONLY**.

Do not implement a new gameplay mechanic.

Production code must remain unchanged.

---

# Objective

Find the next system that can introduce a genuinely new causal dimension to NOVA.

The system must satisfy:

```text
existing state
    ↓
new meaningful dependency
    ↓
new player decision
    ↓
observable simulation consequence
```

Do not select a feature merely because it is commonly found in city builders.

The next system must emerge from the current model.

---

# 1. Current causal graph

Reconstruct the complete current graph:

```text
Material
  ↓
Construction
  ↓
Residence / Farm / Workshop / Well / Road
  ↓
Housing / Production / Water coverage / Mobility
  ↓
Food / Water / Material
  ↓
Population
  ↓
Workforce
  ↓
Farm / Workshop / Well
```

Include:

```text
Road
 → network
 → building access
 → mobility eligibility
 → employment
```

and:

```text
Road
 → network
 → Water coverage
 → residence service
 → admission
```

Identify every current terminal node.

---

# 2. Identify the missing causal dimensions

Do not start with feature names.

Start with missing **simulation concepts**.

Audit whether the current model lacks:

### A. Consumption diversity

Current:

```text
Food → survival
Water → growth
```

Question:

> Is there another essential requirement that could create a distinct consequence without becoming another survival/growth resource?

### B. Production dependency

Current production is largely:

```text
Farm → Food
Workshop → Material
Well → Water
```

Question:

> Is there a production chain where one building depends on another existing output?

Example only:

```text
input
→ production
→ output
```

Do not implement.

### C. Spatial service quality

Current Water has binary coverage:

```text
served / unserved
```

Question:

> Is there evidence for a future system where spatial placement produces a graded consequence rather than another binary service?

Do not invent a generic coverage framework.

### D. Workforce specialization

Current workforce is:

```text
Colonist
→ Farm / Workshop / Well
```

Question:

> Is there a real reason for workers to become differentiated?

Do not create skill levels merely because city builders commonly have them.

### E. Infrastructure pressure

Current roads affect:

* connectivity
* employment eligibility
* Water coverage

Question:

> Is there another concrete consequence that can make infrastructure design matter?

Do not introduce vehicles or traffic yet.

### F. Settlement progression

Current settlement size is measurable but has no consumer.

Question:

> What concrete mechanic could consume settlement growth without reducing it to an arbitrary score?

Do not implement stages.

---

# 3. Candidate discovery

Generate **at least five** concrete candidate systems.

Each candidate must include:

```text
Name:
Existing state consumed:
New state introduced:
Player decision:
Simulation consequence:
Spatial consequence:
Workforce consequence:
Material consequence:
Population consequence:
Why it does not duplicate Food:
Why it does not duplicate Water:
Why it does not duplicate Housing:
```

Do not use generic categories as candidates.

For example:

Bad:

```text
Health system
```

Good:

```text
Medical Clinic requiring staffed workers and road-connected residences,
with a specific non-survival consequence.
```

But only include such a candidate if the existing model provides evidence for it.

---

# 4. Candidate classes to investigate

At minimum investigate these directions:

## Candidate family A — Production chain

Example conceptual direction:

```text
Farm
→ Food
→ another concrete production/settlement dependency
```

Determine whether the existing Material/Food model supports a meaningful intermediate production step.

Reject if it merely adds:

```text
Material → Food
```

as a recurring tax.

---

## Candidate family B — Public infrastructure

Investigate one concrete infrastructure type that is NOT:

* Water
* Food
* Housing
* Road

Determine whether it can introduce a new consequence.

Examples to evaluate only if evidence supports them:

* clinic
* sanitation
* power
* education
* communications
* waste handling

For each, explicitly identify its unique consequence.

Reject any candidate whose only purpose is:

```text
build X
→ consume resource
→ number decreases
```

---

## Candidate family C — Economic / settlement specialization

Investigate whether the colony can eventually make a meaningful specialization decision.

Examples:

```text
food-focused
material-focused
infrastructure-focused
```

Do not implement policies or bonuses.

Determine whether the existing workforce model can support specialization without introducing arbitrary priorities.

---

## Candidate family D — Technology / settlement capability

Investigate whether construction of a new building type could unlock a new capability rather than simply increase numbers.

Example:

```text
existing settlement
→ research/infrastructure milestone
→ new building capability
```

Do not create a generic technology tree.

Determine whether there is already a concrete dependency that could justify the first unlock.

---

## Candidate family E — Advanced mobility

Evaluate whether transport should remain deferred.

Current system already has:

```text
roads
→ networks
→ employment mobility
```

Determine whether actual travel time, vehicles or transit would introduce a new consequence now.

Do not implement them.

The audit should be willing to conclude that transport is still premature.

---

# 5. Anti-duplication matrix

Create a table:

| Candidate   | New consequence | Food duplicate? | Water duplicate? | Housing duplicate? | Material tax? | New spatial dimension? | New decision? |
| ----------- | --------------- | --------------- | ---------------- | ------------------ | ------------- | ---------------------- | ------------- |
| Candidate 1 | ...             | ...             | ...              | ...                | ...           | ...                    | ...           |
| Candidate 2 | ...             | ...             | ...              | ...                | ...           | ...                    | ...           |
| Candidate 3 | ...             | ...             | ...              | ...                | ...           | ...                    | ...           |
| Candidate 4 | ...             | ...             | ...              | ...                | ...           | ...                    | ...           |
| Candidate 5 | ...             | ...             | ...              | ...                | ...           | ...                    | ...           |

Classify each independently:

```text
A — Fundamental
B — Useful but incomplete
C — Premature
D — Contradictory / reject
```

Do not rank them.

---

# 6. Causal counterfactual

For every candidate classified A or B, construct two colonies:

### Colony A

Same:

* population
* Food
* Water
* Material
* buildings
* workforce

but candidate state differs.

### Colony B

Same everything except the candidate state.

There must be a measurable behavioral difference.

If not:

```text
candidate → C
```

unless a specific prerequisite is identified.

---

# 7. Player agency

For every A/B candidate answer:

> What does the player deliberately choose?

The answer must contain an actual tradeoff.

Examples of valid structure:

```text
A instead of B
because A improves X while B improves Y.
```

Avoid:

```text
build X whenever possible
```

If there is no meaningful alternative, classify the candidate as premature.

---

# 8. Spatial pressure

NOVA's current strongest differentiator is becoming spatial:

```text
Road
→ Network
→ Mobility
→ Employment
```

and:

```text
Road
→ Network
→ Water coverage
→ Growth
```

For each candidate determine whether layout can change its outcome.

Test at least:

* connected compact layout;
* connected elongated layout;
* disconnected networks;
* branch;
* loop.

Do not introduce generic pathfinding.

Use existing network primitives where possible.

---

# 9. Workforce pressure

The existing pool is:

```text
Farm | Workshop | Well
```

Determine whether a candidate:

* competes for the same workers;
* creates a new job type;
* changes the value of manual reassignment;
* creates a new workforce bottleneck.

Do not create worker priorities.

Do not create automatic specialization.

---

# 10. Material relationship

Material must remain primarily:

```text
construction
```

A candidate may have:

```text
one-time construction cost
```

but should not automatically receive:

```text
Material/tick upkeep
```

unless an independent causal reason exists.

Reject any candidate invented primarily to solve the Material surplus question.

Step 10U already closed that issue.

---

# 11. Population feedback

Determine whether the candidate affects:

* population survival;
* population admission;
* workforce capacity;
* production capacity;
* settlement capability.

It must not accidentally steal an existing ownership boundary.

Current ownership:

```text
Food    → survival
Water   → growth
Housing → capacity
```

A new candidate should preferably introduce a fourth dimension.

---

# 12. Persistence and implementation cost

For each A/B candidate estimate:

* new persisted state required;
* migration impact;
* deterministic hash impact;
* number of new domain concepts;
* expected test surface;
* UI implications.

Do not implement.

Prefer candidates that can be expressed with concrete domain concepts.

Reject candidates that require:

```text
generic Service
generic Need
generic Modifier
generic Quality
generic Consumer
generic Maintenance
```

unless the audit discovers multiple independently justified uses. Even then, do not implement the abstraction yet.

---

# 13. Performance

Run representative audit scenarios.

Measure:

* 60 ticks;
* 120 ticks;
* 600 ticks.

Use representative colony sizes.

Do not optimize.

The purpose is only to identify whether an apparently attractive candidate would introduce an obvious pathological simulation cost.

---

# 14. Browser verification

No UI implementation.

Run the existing browser suite:

* all current E2E suites;
* zero console errors;
* zero page errors.

No UI changes.

---

# 15. Required files

Add only:

```text
tests/nextSystemDiscoveryAudit.test.ts
docs/roadmap/Step10X.md
```

Do not modify `src/`.

---

# 16. Final classification

End the report with:

```text
Current simulation maturity:
A/B/C/D — ...

Candidate 1:
A/B/C/D — ...

Candidate 2:
A/B/C/D — ...

Candidate 3:
A/B/C/D — ...

Candidate 4:
A/B/C/D — ...

Candidate 5:
A/B/C/D — ...
```

Then:

```text
Next dependency:
```

The conclusion must be one of:

### Outcome A

A concrete next system is sufficiently justified for implementation.

### Outcome B

A next system is promising but requires one narrow prerequisite audit.

### Outcome C

Several systems remain premature; continue with another targeted audit.

### Outcome D

The current model should be consolidated/refined before adding another mechanic.

Do not select a feature because it is expected in a city builder.

---

# Final confirmations

Explicitly confirm:

* `src/` unchanged
* Food unchanged
* Water unchanged
* Material unchanged
* housing unchanged
* roads unchanged
* workforce assignment unchanged
* no new resource
* no new building
* no new service
* no generic framework
* no generic demand
* no generic maintenance
* no generic quality
* no logistics
* no vehicles
* no travel simulation
* no new workforce priority
* `SAVE_VERSION = 6`
* deterministic replay intact
* save/load deterministic
* browser E2E green

```

**Après 10X**, contrairement aux audits précédents, on devrait avoir suffisamment de recul pour arrêter de creuser les mêmes branches. Si un candidat ressort **A**, on passe directement à son **contrat d'implémentation**, avec un gros step cohérent plutôt qu'une nouvelle série d'audits périphériques.
```



---

## As-Built / Audit Report

**Type: AUDIT (Step 10X) — next system discovery.** `src/` is untouched
(`git diff -- src/` empty). Evidence comes from
`tests/nextSystemDiscoveryAudit.test.ts` (17 tests); every number below is a real
`AUDIT ...` line. The Construction Crew mirror is an audit model: it replicates
`stepSimulation`'s phase order exactly and is **byte-identical** to
`stepSimulation` when no crew is assigned.

### Repository

* starting commit `c328c40` (Step 10W);
* final commit = this audit commit;
* production code changed: **none**;
* tests added: `tests/nextSystemDiscoveryAudit.test.ts` (17);
* docs changed: this file.

### 1. Current causal graph

`AUDIT CAUSAL_GRAPH` — the complete graph:

```text
Material -> construction -> Residence/Farm/Workshop/Well/Road
Road -> road network -> building access -> mobility eligibility -> employment
Road -> road network -> Water coverage -> residence service -> admission
Farm -> Food -> household consumption -> survival
Well -> Water -> residence coverage -> growth admission
Workshop -> Material -> construction stock
Population -> workforce -> Farm/Workshop/Well
```

Phase order: `advanceConstruction → updateNeeds → produceFood → produceWater →
consumeFood → consumeWater → updatePopulation → assignJobs → produceMaterial →
applyCommand → progressPlacedBuilding → progressPlacedRoads → upkeepBuildings →
advanceTime`.

Terminal nodes: Food stock (survival), Water stock (growth gate), Material stock
(construction, storage-clamped), Population (survives/removed, admitted/blocked),
and **`constructionRemaining`, which progresses by time only**.

`AUDIT CONSTRUCTION_ASYMMETRY`: a 1-colonist colony and a 4-colonist colony both
bring a new Well online on **tick 2**. Construction is the only progression
phase that ignores the workforce.

### 2. Missing causal dimensions

`AUDIT MISSING_DIMENSIONS`:

* **A Consumption diversity** — no third essential exists that is not survival
  (Food) or growth (Water).
* **B Production dependency** — Farm/Workshop/Well each need only a worker; no
  producer consumes another producer's output; an input chain is only reachable
  as a recurring tax (10T).
* **C Spatial service quality** — Water coverage is binary and **unbounded by
  distance**: a Residence 24 road cells from its Well is served
  (`residenceToWellRoadDistance 24, servedResidences 1`).
* **D Workforce specialization** — one homogeneous, type-blind workforce; no
  evidence for differentiation.
* **E Infrastructure pressure** — distance is measured (09M) but has no
  consequence beyond the nearest-workplace tiebreak.
* **F Settlement progression** — size is measurable but has no consumer (10V).

### 3. Candidate discovery

`AUDIT CANDIDATES` — seven concrete candidates were specified with their
existing state, new state, decision, simulation/spatial/workforce/material/
population consequences and their Food/Water/Housing duplication status:

1. Construction Crew (labor assigned to a construction site)
2. Road-Distance Workplace Efficiency (graded output by commute distance)
3. Irrigation Dependency (Farm requires Water)
4. Power Coverage (binary spatial service)
5. Sanitation Service (waste → health)
6. Education / Capability Unlock
7. Transit / Travel Time

### 4. Candidate families

`AUDIT FAMILIES`: production chain — reject (only reachable as an input tax);
public infrastructure — C/D (each needs a new resource or duplicates Water
coverage); specialization — C (no policy layer, one homogeneous workforce);
technology — C (no capability consumer); advanced mobility — C (09N found no
per-tick flow consuming time-in-transit).

### 5. Anti-duplication matrix

`AUDIT ANTI_DUPLICATION_MATRIX`:

| Candidate | New consequence | Food dup | Water dup | Housing dup | Material tax | New spatial | New decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Construction Crew | construction throughput | no | no | no | no | optional | **yes** |
| Road-Distance Efficiency | graded production | no | no | no | no | yes | **no** |
| Irrigation Dependency | Food depends on Water | yes | yes | no | no | yes | yes |
| Power Coverage | second coverage gate | no | yes | no | yes | no | no |
| Sanitation Service | health penalty | yes | yes | no | yes | no | no |
| Education / Capability | capability unlock | no | no | no | no | no | yes |
| Transit / Travel Time | delayed employment | no | no | no | no | yes | yes |

### 6. Causal counterfactuals

`AUDIT C1_CONSTRUCTION_CREW`: the crewed mirror with an empty crew is
byte-identical to `stepSimulation` over 60 ticks for three fixtures. With a
single colonist and a 2-tick Well:

| colony | Well operational | Food after 6 ticks |
| --- | --- | --- |
| A — no crew | tick 2 | 50006 |
| B — one crew member | **tick 1** | **50002** |

A real, measurable tradeoff: **1 tick faster for 4 Food** (the producer is off
the Farm while building).

`AUDIT C2_DISTANCE_EFFICIENCY`: near (road distance 2) and far (road distance
20) produce **identical** Water (20). The candidate rule would grade output by
distance, but every cell is buildable, so compact placement always dominates —
the agency is **degenerate**.

`AUDIT C4_POWER_COVERAGE`: coverage is binary reachability at any distance
(served at 24 cells), so a new binary service would be structurally identical to
Water.

`AUDIT REMAINING_CANDIDATES`: irrigation **D**; sanitation **D**; education
**C**; transit **C**; settlement progression **C**.

### 7. Player agency

`AUDIT AGENCY`: Construction Crew — *take a producer off a workplace and crew a
site: finish sooner, produce less now*; distance efficiency — none (compact
dominates); irrigation — breaks the ownership split; power — build whenever
possible; sanitation — mandatory tax; education — real, but the payoff is
undefined; transit — none at current scale.

### 8. Spatial pressure

`AUDIT SPATIAL_LAYOUTS` (compact / elongated / disconnected / branch / loop):

| layout | population | served | employed | residence→Well distance |
| --- | --- | --- | --- | --- |
| compact | 2 | 2 | 2 | 4 |
| elongated | 2 | 2 | 2 | 12 |
| disconnected | 2 | 0 | 0 | null |
| branch | 2 | 2 | 2 | 12 |
| loop | 2 | 2 | 2 | 12 |

Compact, elongated, branch and loop are outcome-identical; only disconnection
differs. Layout currently matters **only through connectivity**, which is why
every purely spatial candidate is either degenerate or already owned by
roads/mobility.

### 9. Workforce pressure

`AUDIT WORKFORCE_PRESSURE`: surplus colony pop 4 / employed 2 / unemployed 2;
scarce colony pop 4 / employed 4 / vacant jobs 4. Two colonists manually set to
`workplaceId: null` were **both reclaimed** by `assignJobs` (mode reset to
`automatic`): a colonist cannot be deliberately held idle today. Therefore a
derived "unassigned = builder" rule would give the player no control; the fourth
workforce consumer needs an **explicit assignment target**.

### 10. Material relationship

`AUDIT MATERIAL_AND_POPULATION`: Material stays construction-only; the
Construction Crew candidate adds **no** Material/tick upkeep.

### 11. Population feedback

The crew changes *when* housing/Well capacity arrives, never *whether* a
colonist survives. Food keeps survival, Water keeps growth, Housing keeps
capacity; Construction Crew introduces the fourth dimension **expansion
throughput** (workforce → construction).

### 12. Persistence and implementation cost

`AUDIT IMPLEMENTATION_COST`:
`SAVE_VERSION = 6` today; the candidate needs one new assignment target on
`ColonistState`, a chained `v6 → v7` migration, three concrete domain concepts
(`assignedConstructionId`, `AssignBuilderCommand` + validation mirroring 10M,
`constructionProgressPerSite` derived), medium test surface, and a small
inspector control. No generic Service/Need/Modifier/Quality/Consumer/Maintenance.

### 13. Performance

`AUDIT PERFORMANCE` (10 residences / 8 workplaces / 10 colonists): 60 ticks
184.6 ms, 120 ticks 371.5 ms, 600 ticks 1850.9 ms.

### 14. Browser verification

All existing suites pass with no UI change: `run` 11, `road` 15, `transport` 10,
`production` 12, `resource` 12, `food` 12, `temporal` 17, `jobs` 21, `upkeep` 35,
`reassign` 7, `water` 7 — zero console/page errors.

### 16. Final classification

```text
Current simulation maturity:      B — coherent and saturated within its four dimensions

Candidate 1 Construction Crew:    A — workforce assigned to a construction site (expansion throughput)
Candidate 2 Road-Distance         C — graded production; placement is free, compact always dominates
  Workplace Efficiency
Candidate 3 Irrigation            D — recurring Water input, duplicates Water, starvation/deadlock risk
  Dependency
Candidate 4 Power Coverage:       C — binary spatial service; structurally a Water clone
Candidate 5 Sanitation Service:   D — new waste resource plus a survival-adjacent penalty
Candidate 6 Education /           C — needs a capability dimension and a consumer
  Capability Unlock
Candidate 7 Transit /             C — no per-tick flow consumes time-in-transit (09N)
  Travel Time
```

### Next dependency

```text
Outcome A — a concrete next system is sufficiently justified for implementation.
```

**The next system is the Construction Crew:** the player assigns a colonist to an
under-construction building instead of a workplace; that site progresses
`1 + 1` per tick while crewed, and the crew member produces nothing that tick.

Why this one, and only this one:

* it closes a **real gap** — construction is the only phase that ignores the
  workforce (both a 1- and a 4-colonist colony finish a Well on tick 2);
* it has a **non-degenerate decision** with a measured tradeoff (C1: one tick
  sooner for four Food);
* it duplicates nothing: Food keeps survival, Water keeps growth, Housing keeps
  capacity; the new dimension is **expansion throughput**;
* it is **derived-state friendly**: `constructionProgressPerSite` is a pure
  query, and the disabled rule is byte-identical to today;
* it extends the existing 10M manual-assignment model, and the audit proved the
  derived "unassigned = builder" variant would have **no player control**
  (`assignJobs` reclaims idle colonists), which pins the explicit-assignment
  contract without a further prerequisite.

Everything else is rejected or deferred on evidence: spatial efficiency is
degenerate (free placement), irrigation duplicates Water and risks starvation,
power is a Water clone, sanitation is survival-adjacent, education has no
consumer, transit has no per-tick flow, and settlement progression has no
consumer.

The next step is therefore the **Construction Crew implementation contract** — a
single coherent implementation step (assignment state + `SAVE_VERSION 7` +
chained migration + construction progress + inspector control + tests), not
another discovery audit.

### Scope verdict

```text
COMPLETE — AUDIT
```

Final confirmations:

```text
- src/ unchanged
- Food unchanged
- Water unchanged
- Material unchanged
- housing unchanged
- roads unchanged
- workforce assignment unchanged
- no new resource
- no new building
- no new service
- no generic framework
- no generic demand
- no generic maintenance
- no generic quality
- no logistics
- no vehicles
- no travel simulation
- no new workforce priority
- SAVE_VERSION = 6
- deterministic replay intact
- save/load deterministic
- browser E2E green
```
