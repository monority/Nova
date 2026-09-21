# Step 10T — Food Economy Dependency Audit

## 1. OBJECTIVE

Step 10S closes the Water dependency chain.

Starting point:

* Step 10S commit: `1e3b73a`
* Water growth loop is now production-headroom constrained
* Water is spatially covered, workforce-dependent and self-limiting
* Food remains the survival gate
* Material remains the construction/economic bottleneck
* No generic Need/Service framework exists

This step is **AUDIT-ONLY**.

Do not modify production code under `src/`.

The purpose is to determine the next economically meaningful dependency.

The two existing candidates are:

### Candidate A — Food storage / Granary

Introduce bounded Food storage and potentially spatial Food availability.

### Candidate B — Farm production input

Introduce a production input requirement for Farms.

Do not assume either is correct.

Determine which missing dependency is actually supported by the current simulation.

---

# 2. HARD RULE

No implementation.

Only:

```text
AUDIT
→ OBSERVATIONS
→ CAUSAL ANALYSIS
→ DESIGN DECISION
```

Do not add:

* Food storage,
* Granaries,
* Farm inputs,
* new Food resources,
* generic logistics,
* food transport,
* markets,
* money,
* vehicles,
* new services,
* generic production frameworks.

The audit may add tests and documentation only.

---

# 3. RECONSTRUCT CURRENT FOOD LOOP

Read the actual implementation.

Document the exact current causal chain:

```text
Farm
→ Food production
→ Food stock
→ Food consumption
→ Food shortage
→ population consequence
```

Also document:

* Farm production amount,
* Farm staffing,
* Farm capacity,
* Food consumption,
* Food stock semantics,
* whether Food has a storage cap,
* whether Food is spatial,
* whether Food is road-dependent,
* whether Food production is network-dependent,
* when Food is produced,
* when Food is consumed,
* when population loss is evaluated.

Do not infer from old docs.

Use the current code.

---

# 4. CURRENT FOOD PRESSURE

Measure how much actual pressure Food creates today.

Test at minimum:

### Scenario A — One Farm

* 1 Farm
* sufficient workforce
* increasing population

Measure long-run Food.

### Scenario B — Two Farms

Measure whether additional Farm capacity creates meaningful surplus.

### Scenario C — Farm + Workshop

Measure worker opportunity cost.

### Scenario D — Farm + Well

Measure Food vs Water workforce competition.

### Scenario E — Farm + Workshop + Well

Measure the complete current essential economy.

Run:

* 60 ticks,
* 120 ticks,
* 240 ticks,
* 600 ticks.

Record:

* population,
* Food stock,
* Food production,
* Food consumption,
* shortage,
* Farms staffed,
* Workshops staffed,
* Wells staffed,
* Material,
* Water.

---

# 5. FOOD STOCK ANALYSIS

Determine whether the current unlimited Food stock creates an actual exploit or merely represents a deliberate abstraction.

Test:

1. Build Farms early.
2. Build Farms before housing.
3. Build multiple Farms.
4. Accumulate Food before population growth.
5. Allow population to remain low while Food accumulates.
6. Then add housing.
7. Observe whether accumulated Food trivializes survival.

Measure:

* maximum Food stock,
* time required to accumulate it,
* whether stock can become arbitrarily large,
* whether accumulated Food has any spatial or economic consequence.

Do not introduce a storage cap yet.

---

# 6. CANDIDATE A — FOOD STORAGE / GRANARY

Model a bounded Food storage system without implementing it.

Determine the smallest coherent version.

Possible conceptual model:

```text
Farm
→ Food production
→ bounded colony Food storage
→ consumption
```

Or, if evidence supports it:

```text
Farm
→ local Food stock
→ Granary
→ served population
```

Do not choose the model yet.

Audit:

1. Is a storage cap alone enough?
2. Does a Granary need to be a building?
3. Would a Granary create meaningful spatial pressure?
4. Does Food need road access?
5. Does Food need network coverage?
6. Does Farm output need transport?
7. Would a Granary become another service?
8. Does storage create meaningful player decisions?
9. Does storage interact with Water coverage?
10. Does storage interact with workforce?

Do not implement logistics merely because storage exists.

---

# 7. CANDIDATE B — FARM PRODUCTION INPUT

Model a Farm input requirement without implementation.

Potential examples include:

```text
Material → Farm → Food
```

or another existing resource.

Do not invent a new resource yet.

Determine:

1. Which existing resource could plausibly support Farm production?
2. How much input would be required?
3. Would the input create a meaningful bottleneck?
4. Would it create a circular dependency?
5. Could the colony enter a deadlock?
6. Would the player gain a meaningful production decision?
7. Would Farm and Workshop become coupled?
8. Would the current workforce model remain understandable?
9. Would road/network topology become relevant?
10. Would this make Food dependent on Material in a useful or merely artificial way?

Do not implement the input.

---

# 8. DEADLOCK ANALYSIS

This is mandatory.

For each candidate, search for terminal states.

Test conceptual scenarios such as:

### A

Farm-heavy colony.

### B

Workshop-heavy colony.

### C

No Farms.

### D

No Workshops.

### E

No Wells.

### F

All three building types.

### G

Low Material.

### H

Low Food.

### I

Low Water.

### J

Housing-first construction.

### K

Production-first construction.

Determine whether the candidate creates:

* irreversible deadlock,
* recoverable shortage,
* temporary starvation,
* player-controlled recovery,
* automatic recovery.

Do not introduce automatic recovery mechanisms.

---

# 9. RESOURCE EQUILIBRIUM

For the current economy calculate approximate steady-state relationships.

At minimum:

```text
Farm → Food
Workshop → Material
Well → Water
Residence → population capacity
```

Determine:

* Food per staffed Farm,
* Material per staffed Workshop,
* Water per staffed Well,
* consumption per colonist,
* sustainable population per producer.

Then identify whether Food is currently:

### A — structurally constrained

### B — temporarily constrained

### C — effectively unlimited

### D — constrained only by workforce

Use simulation evidence.

---

# 10. WORKFORCE COMPETITION

Food already competes with Material and Water for workers.

Measure:

* Farm vs Workshop,
* Farm vs Well,
* Farm vs Workshop vs Well.

Use both:

* automatic assignment,
* manual reassignment.

Determine whether Food's existing workforce opportunity cost is already sufficient to make Food strategically meaningful.

If yes, a Farm input may be unnecessary.

---

# 11. SPATIAL ANALYSIS

Determine what Food currently ignores spatially.

Current likely chain:

```text
Farm → Food → global colony stock
```

Compare with Water:

```text
Well
→ Road
→ Network
→ Coverage
→ Residence
→ served population
→ Water growth
```

Identify exactly what Food lacks.

Do not assume that every resource needs spatial logistics.

Ask:

> What new player decision would Food storage or Farm input create that the current simulation cannot currently express?

The answer must be concrete.

---

# 12. FOOD STORAGE EXPERIMENT

Build an **audit-only mirror**, not production code.

Model several hypothetical Food caps:

* 5,
* 10,
* 25,
* 50.

Do not persist them.

Run identical simulations.

Measure:

* starvation frequency,
* population oscillation,
* Farm utilization,
* worker allocation,
* recovery after shortage,
* accumulated surplus,
* construction pressure.

Determine whether any cap produces meaningful behavior rather than arbitrary frustration.

---

# 13. GRANARY EXPERIMENT

If a Granary appears necessary, model it conceptually.

Test:

### No Granary

Food capacity = baseline.

### One Granary

Food capacity increased.

### Multiple Granaries

Determine whether additional storage creates useful spatial decisions.

Do not implement buildings.

Determine whether Granary placement would matter.

If placement does not matter, explicitly say so.

---

# 14. FARM INPUT EXPERIMENT

Model at least three candidate input ratios using existing resources.

For example:

```text
1 Material → Farm → 2 Food
```

```text
1 Material → Farm → 3 Food
```

```text
2 Material → Farm → 4 Food
```

These are experiments only.

Do not assume these ratios belong in the final game.

Measure:

* Food equilibrium,
* Material equilibrium,
* construction ability,
* population sustainability,
* workforce competition,
* deadlock risk.

If Material → Farm creates a simple resource tax with no interesting decision, classify it accordingly.

---

# 15. COMPARE THE TWO CANDIDATES

Produce a matrix:

| Dimension                         | Food Storage / Granary | Farm Input |
| --------------------------------- | ---------------------- | ---------- |
| Adds meaningful pressure          | ?                      | ?          |
| Adds spatial decisions            | ?                      | ?          |
| Uses existing systems             | ?                      | ?          |
| Requires new resource             | ?                      | ?          |
| Requires new building             | ?                      | ?          |
| Requires logistics                | ?                      | ?          |
| Strengthens workforce competition | ?                      | ?          |
| Creates circular dependencies     | ?                      | ?          |
| Deadlock risk                     | ?                      | ?          |
| Player recovery possible          | ?                      | ?          |
| Preserves Food survival role      | ?                      | ?          |
| Preserves Water distinction       | ?                      | ?          |
| Architecture impact               | ?                      | ?          |
| Save complexity                   | ?                      | ?          |
| Gameplay decision created         | ?                      | ?          |
| Evidence from current simulation  | ?                      | ?          |

Do not rank them.

Classify each independently.

---

# 16. WATER BOUNDARY REGRESSION

The Water loop is now closed.

Confirm that neither candidate would require changing:

```text
Water production-headroom admission
```

Water remains:

```text
growth gate
```

Food remains:

```text
survival gate
```

Do not couple Food and Water unless the audit provides strong evidence.

---

# 17. MATERIAL BOUNDARY REGRESSION

Confirm that neither candidate silently invalidates:

* Material storage cap,
* Workshop upkeep,
* construction costs,
* manual workforce reassignment,
* road construction,
* transport network eligibility.

Especially test whether Farm input would make Material effectively a mandatory Food tax.

---

# 18. PERSISTENCE / DETERMINISM

This is an audit only.

For each candidate determine likely future impact on:

* canonical state,
* save version,
* migration,
* hash,
* deterministic replay.

Do not modify persistence code.

---

# 19. PERFORMANCE

Use the current simulation scale.

Measure:

* 60 ticks,
* 120 ticks,
* 600 ticks.

Do not introduce:

* per-resource BFS,
* logistics graphs,
* pairwise Farm/Residence routing,
* generic inventory frameworks.

The next feature should remain computationally simple unless the audit proves otherwise.

---

# 20. BROWSER QA

Run existing browser suites.

Verify the current closed Water loop still works:

* bootstrap,
* Well production,
* Water growth,
* Water headroom,
* Farm/Workshop/Well workforce,
* manual reassignment.

No UI changes.

---

# 21. ARCHITECTURE AUDIT

Confirm current architecture remains:

* concrete resource systems,
* concrete building rules,
* concrete simulation phases,
* derived spatial networks,
* no generic resource framework,
* no generic inventory framework,
* no generic logistics framework,
* no generic production framework,
* no generic Need/Service framework.

Do not introduce abstractions during the audit.

---

# 22. DESIGN CLASSIFICATION

Classify each candidate independently:

### A — Fundamental / should become next implementation

### B — Useful but incomplete

### C — Premature

### D — Contradictory / reject

Also classify:

### Current Food model

A/B/C/D.

Explain using simulation evidence.

---

# 23. NEXT DEPENDENCY

Choose the next dependency based on evidence.

Possible outcomes:

### Outcome A

Food storage / Granary is justified.

Next step should specify its minimal contract.

### Outcome B

Farm input is justified.

Next step should specify its minimal contract.

### Outcome C

Neither is justified.

Identify the actual missing dependency exposed by the current economy.

### Outcome D

Food is already sufficiently meaningful.

Close the Food dependency and move to the next economic pressure.

Do not implement the next feature in 10T.

---

# 24. FILES

Read:

* `src/domain/resource/resource.ts`
* `src/domain/building/building.ts`
* `src/domain/jobs/jobs.ts`
* `src/domain/simulation/phases.ts`
* `src/domain/simulation/step.ts`
* population/admission code
* Water implementation
* relevant Food tests
* Material tests
* workforce tests
* `docs/roadmap/Step10O.md`
* `docs/roadmap/Step10P.md`
* `docs/roadmap/Step10Q.md`
* `docs/roadmap/Step10R.md`
* `docs/roadmap/Step10S.md`

Add only:

* `tests/foodEconomyDependencyAudit.test.ts`
* `docs/roadmap/Step10T.md`

Do not modify production code.

---

# 25. VERIFICATION

Run:

* full tests,
* audit tests,
* lint,
* typecheck,
* build,
* browser E2E.

Expected:

* `src/` unchanged,
* existing Water behavior unchanged,
* deterministic simulation unchanged.

---

# 26. FINAL REPORT

End `docs/roadmap/Step10T.md` with:

```text
Step 10T COMPLETE — AUDIT

Repository

Starting commit:
Final commit:

Production code changed:
Tests added:
Docs changed:

Current Food causal loop

...

Current Food pressure

...

Food stock analysis

...

Candidate A — Food storage / Granary

...

Candidate B — Farm production input

...

Deadlock analysis

...

Resource equilibrium

...

Workforce competition

...

Spatial analysis

...

Food storage experiment

...

Granary experiment

...

Farm input experiment

...

Candidate comparison

...

Water boundary regression

...

Material boundary regression

...

Persistence / migration

...

Determinism

...

Performance

...

Browser verification

...

Architecture audit

...

Design classification

Current Food model: A/B/C/D
Food storage / Granary: A/B/C/D
Farm input: A/B/C/D

Reason:

Next dependency

...

Scope verdict

COMPLETE — AUDIT

Final confirmations:

- src/ unchanged
- Water production-headroom admission unchanged
- Water remains the growth gate
- Food remains the survival gate
- no Food storage implemented
- no Granary implemented
- no Farm input implemented
- no Food logistics
- no generic inventory framework
- no generic logistics framework
- no generic production framework
- no generic Need framework
- no generic Service framework
- no new workforce priority
- deterministic save/load remains intact
- replay remains deterministic
- SAVE_VERSION remains 6
```



---

## As-Built / Audit Report

**Type: AUDIT (Step 10T) — Food economy dependency.** `src/` is untouched
(`git diff -- src/` empty). Evidence comes from
`tests/foodEconomyDependencyAudit.test.ts` (23 tests); every number below is a
real `AUDIT ...` line. Both candidates are modelled only in an audit mirror
that is byte-identical to `stepSimulation` when no hypothetical rule is enabled
(`AUDIT MIRROR_FIDELITY`).

### Repository

* starting commit `1e3b73a` (Step 10S);
* final commit = this audit commit;
* production code changed: **none**;
* tests added: `tests/foodEconomyDependencyAudit.test.ts` (23);
* docs changed: this file.

### Current Food causal loop

`AUDIT FOOD_LOOP`:

```text
Farm operational + staffed (>=1 worker) -> +2 Food/tick (produceFood)
Farm job capacity 1; production needs a road/mobility-eligible worker (09K)
Food consumption = population x 1, all-or-nothing (consumeFood)
Food stock = colony-global, uncapped, persisted as resources.food
Food is NOT spatial; only staffing/roads gate production
produced in produceFood, before consumeFood / consumeWater / admission
consumed in consumeFood, before admission
shortage -> updatePopulation removes every colonist (survival gate)
```

### Current Food pressure

`AUDIT FOOD_PRESSURE` (6 residences, population fills to 6, Food start 10000):

| Scenario | Food/tick | Food at t600 |
| --- | ---: | ---: |
| 1 Farm | 2 (need 6) → −4 | 7605 |
| 2 Farms | 4 (need 6) → −2 | 8803 |
| Farm + Workshop | −4 | 7605 |
| Farm + Well / all three | −4 (Water/other workforce) | 7605 |

Food is a slow drain with a large buffer; the colony survives for thousands of
ticks on its initial stock (`AUDIT FOOD_BUFFER`: the deficit colony starves at
tick 2502 with 10000 Food).

### Food stock analysis

`AUDIT FOOD_UNBOUNDED` (4 Farms, 4 colonists, Food 0): Food grows exactly
+4/tick → 240 / 480 / 960 / **2400** at 60 / 120 / 240 / 600 ticks. The stock is
unbounded and has no spatial or economic consequence. `AUDIT
CLASSIFICATION_EVIDENCE`: surplus Food 2400 with population 4; a deficit colony
reaches population 0. Food is **constrained only by workforce** (2 colonists per
staffed Farm) while population ≤ `2 × staffed Farms`.

### Candidate A — Food storage / Granary

`AUDIT FOOD_STORAGE_CAPS` (surplus and deficit colonies, caps 5 / 10 / 25 / 50
vs uncapped): the deficit colony starves under every cap; the caps only shrink
the survival buffer (uncapped shortage ticks 12 vs cap 5 → 0, cap 10 → 2). The
surplus colony's stock is simply clamped to the cap (`AUDIT FOOD_CAP_SURPLUS`:
4 / 9 / 24 / 49). A cap changes no decision.

`AUDIT GRANARY_QUESTIONS`:

```text
storage cap alone enough  : no — it only bounds an accumulator with no sink
Granary must be a building: no evidence; a derived cap is simpler
spatial pressure          : none — Food is colony-global, a cap is not spatial
road access / coverage    : not required by the current model
Farm output transport     : none exists and none is justified
becomes another service   : yes — a building without a new causal chain
player decision           : none beyond "build more Farms", which already exists
Water interaction         : none required
workforce interaction     : none unless staffed (which adds an upkeep-like decision)
```

### Candidate B — Farm production input

`AUDIT FARM_INPUT_RATIOS` (2 Farms + 2 Workshops, 4 colonists, Material 50,
Food 200, 240 ticks):

| Ratio | Population | Food | Material |
| --- | ---: | ---: | ---: |
| 1 Material → 2 Food | 0 | 0 | 46 |
| 1 Material → 3 Food | 6 | 202 | 48 |
| 2 Material → 4 Food | 0 | 0 | 0 |

`AUDIT FARM_INPUT_TAX`: baseline Material 48 → 2 with the input; the 2 staffed
Farms consume exactly the 2 net Material the Workshops produce. `AUDIT
FARM_INPUT_DEADLOCK`: 2 Farms, 0 Workshops, Material 0 → no Food production →
the reserve is exhausted → **population 0**. Material becomes a mandatory Food
tax with a real circular-dependency/deadlock risk and no new decision.

### Deadlock analysis

`AUDIT DEADLOCK_ANALYSIS` (240 ticks, six configurations):

| Model | farmHeavy | workshopHeavy | noFarms | noWorkshops | noWells | allThree |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| current | 4 | 4 | 3 | 3 | 3 | 4 |
| Food cap 10 | 4 | **0** | **0** | 3 | 3 | **0** |
| Farm input 1→2 | 4 | 4 | 3 | 3 | 3 | 4 |

The current model has no terminal state in these configurations. A low Food cap
creates arbitrary starvation (workshop-heavy, no-Farms, all-three die), and Farm
input deadlocks whenever Material cannot be paid (confirmed at Material 0).

### Resource equilibrium

`AUDIT EQUILIBRIUM`:

```text
Food     : 2 per staffed Farm; 1 per colonist -> 2 colonists per Farm
Material : +2 gross per staffed Workshop, -1 upkeep -> net +1 (storage 25/Workshop)
Water    : 2 per staffed Well -> 2 colonists per Well (production-headroom gate)
```

Food is **D — constrained only by workforce** while population ≤ 2 × Farms;
otherwise it is a slow buffer drain.

### Workforce competition

`AUDIT WORKFORCE_COMPETITION` (1 colonist, 1 Farm + 1 Workshop + 1 Well):
automatic staffs the Farm; manual reassignment to the Well or Farm is allowed
and flips the production. Food already competes with Material and Water for the
shared single-worker pool — its strategic meaning comes from this opportunity
cost, which is already implemented and audited (09–10 series).

### Spatial analysis

`AUDIT SPATIAL_FOOD_VS_WATER`: a Farm on a separate network from the residence
is unstaffed and produces 0 (worker mobility), and the same residence is
Water-unserved. Water has a derived **coverage** rule; **Food has none** — it is
a colony-global stock. `AUDIT NEW_DECISION`: Food storage offers only "how much
surplus to keep" (already the buffer); a Granary placement would not change any
outcome; Farm input collapses to "build more Workshops". Neither candidate adds
a concrete new player decision.

### Food storage experiment

`AUDIT FOOD_STORAGE_CAPS` — modelled caps 5/10/25/50 (never persisted). No cap
produces meaningful behaviour: the survival outcome is identical, only the
buffer size changes, and the surplus colony simply discards overflow. The
starvation frequency rises with lower caps (arbitrary frustration), not with any
decision.

### Granary experiment

`AUDIT GRANARY_QUESTIONS` — a Granary would only raise the cap; since Food is
colony-global, placement cannot matter (no spatial pressure), and it would add a
building without a new causal chain. No Granary is justified.

### Farm input experiment

`AUDIT FARM_INPUT_RATIOS`, `AUDIT FARM_INPUT_TAX`, `AUDIT FARM_INPUT_DEADLOCK` —
Material → Farm is a simple resource tax: it reduces the Material surplus, can
consume the entire Workshop net, and deadlocks when Material is unavailable. It
creates no new production decision beyond building more Workshops, and it
couples Food to Material circularly.

### Candidate comparison

`AUDIT CANDIDATE_MATRIX` (factual, not ranked):

| Dimension | Food storage / Granary | Farm input |
| --- | --- | --- |
| adds meaningful pressure | no (bounds an accumulator) | yes, but only as a tax |
| adds spatial decisions | no | no |
| uses existing systems | yes | yes |
| requires new resource | no | no |
| requires new building | optional (Granary) | no |
| requires logistics | no | no |
| strengthens workforce competition | no | indirectly (more Workshops) |
| circular dependencies | no | yes (Material ↔ Food) |
| deadlock risk | low | high (no Material → no Food) |
| player recovery | yes | only if Material remains |
| preserves Food survival role | yes | yes |
| preserves Water distinction | yes | yes |
| architecture impact | small | small |
| save complexity | none if derived | none |
| gameplay decision created | none beyond the buffer | none beyond more Workshops |
| evidence | Food uncapped/accumulates | Material already the construction bottleneck |

### Water boundary regression

`AUDIT WATER_BOUNDARY`: current / Food-cap / Farm-input all settle at population
2 with one staffed Well — the Step 10S production-headroom admission is
unchanged. Water remains the growth gate, Food the survival gate.

### Material boundary regression

`AUDIT MATERIAL_BOUNDARY`: baseline Material 48 → 2 under Farm input; storage
cap (25/Workshop) and upkeep (1/staffed Workshop) are untouched, but Farm input
turns Material into a mandatory Food tax.

### Persistence / migration

`AUDIT PERSISTENCE_IMPACT`: a derived Food cap adds no canonical state and no
`SAVE_VERSION` bump; a Granary would add only a building-type string; Farm input
reads `resources.construction` and adds no state. `SAVE_VERSION = 6` unchanged.

### Determinism

`AUDIT DETERMINISM`: 240-tick replay byte-identical (`hash 9d8b7499ff9e210d`);
the mirror is deterministic and insertion-order independent; no `Date.now()` /
`Math.random()` in `src/`.

### Performance

`AUDIT PERFORMANCE` (20 residences / 18 workplaces / 20 colonists): 60 ticks
252.7 ms, 120 ticks 492.0 ms, 600 ticks 2662.2 ms — linear in ticks, no new BFS
or logistics graph.

### Browser verification

All existing E2E suites pass with no UI change: `run` 11, `road` 15,
`transport` 10, `production` 12, `resource` 12, `food` 12, `temporal` 17,
`jobs` 21, `upkeep` 35, `reassign` 7, `water` 7. The closed Water loop
(bootstrap, production, growth, headroom, workforce, manual reassignment) is
unchanged.

### Architecture audit

Concrete resource/building/phase rules only; derived spatial networks; no
generic resource/inventory/logistics/production/Need/Service framework; no
abstraction introduced by the audit. `src/` unchanged.

### Design classification

```text
Current Food model:        B — Useful but incomplete
Food storage / Granary:    C — Premature
Farm production input:     D — Contradictory / reject
```

Reason:

* **Current Food model (B):** Food is a real survival gate and drives genuine
  workforce competition (2 colonists per Farm), but it has no availability/
  storage stage and its surplus accumulates without bound — useful, incomplete.
* **Food storage / Granary (C):** a cap only bounds an accumulator with no sink;
  it changes the survival buffer, not any decision; placement cannot matter
  because Food is colony-global; it would add a building without a causal chain.
* **Farm input (D):** it turns Material into a mandatory Food tax, can consume
  the whole Workshop net, creates a Material ↔ Food circular dependency and a
  real deadlock when Material is unavailable, while creating no new decision.

### Next dependency

**Outcome D — Food is already sufficiently meaningful; close the Food storage /
Farm-input candidates.** Food's strategic weight already comes from the shared
workforce and the survival gate, and neither candidate adds a concrete decision.

The economic pressure the audit actually exposes is on the **Material side**:
Material caps at `25 × operational Workshops` (equilibrium `24 × W`) and has no
consumer after construction, so once the colony is built out Workshop output is
pointless. The next design intake should therefore examine whether Material
needs an ongoing demand (for example a second consumer coupled to population or
housing), or whether Phase 5 should introduce another essential service — not
another Food rule. Do not implement either in 10T.

### Scope verdict

```text
COMPLETE — AUDIT
```

Final confirmations:

```text
- src/ unchanged
- Water production-headroom admission unchanged
- Water remains the growth gate
- Food remains the survival gate
- no Food storage implemented
- no Granary implemented
- no Farm input implemented
- no Food logistics
- no generic inventory framework
- no generic logistics framework
- no generic production framework
- no generic Need framework
- no generic Service framework
- no new workforce priority
- deterministic save/load remains intact
- replay remains deterministic
- SAVE_VERSION remains 6
```
