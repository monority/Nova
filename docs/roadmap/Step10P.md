# Step 10P — Water Service & Coverage

## Mission

Implement the concrete Water dependency defined by Step 10O.

This is the first implementation of a second essential service.

The goal is deliberately narrow:

```text
Well
→ Water production
→ residence-network coverage
→ Water consumption
→ growth gate
```

Food remains the survival gate.

Water becomes the additional growth/service gate.

Do not generalize this into a generic Needs or Services framework.

---

# 1. STARTING POINT

Expected starting commit:

```text
64997c6 Step 10O: design intake for next dependency
```

Existing canonical systems include:

* Residence;
* Population;
* Food;
* Farm;
* Workshop;
* Material;
* Roads;
* Road networks;
* Mobility;
* automatic workforce;
* manual workforce reassignment;
* construction;
* persistence/hash;
* deterministic simulation.

Current SAVE_VERSION:

```text
5
```

Step 10P must deliberately migrate this to:

```text
6
```

---

# 2. HARD RULES

Do NOT implement:

* generic Need framework;
* generic Service framework;
* generic Production framework;
* generic Resource framework;
* Farm upkeep;
* Water upkeep;
* road-gated Food;
* Food storage;
* Granary;
* water pipes;
* water logistics;
* water transport;
* water distance;
* travel time;
* vehicles;
* congestion;
* money;
* demolition;
* refunds;
* dynamic workforce priority;
* global workforce optimizer;
* technology;
* health;
* education;
* happiness.

Do not modify the existing Food survival rule except where population admission must now additionally respect Water.

Do not replace the existing Food model.

---

# 3. CANONICAL WATER RULE

Introduce one canonical resource:

```text
water
```

Initial value must be deterministic and explicitly defined.

For migration:

```text
v5 → v6
water = 0
```

Do not infer historical Water stock.

Water must participate in:

* simulation state;
* canonical serialization;
* hash;
* save/load;
* deterministic replay.

Do not persist:

* water coverage;
* served residences;
* served colonists;
* well worker lists;
* network IDs.

Those remain derived.

---

# 4. WELL BUILDING

Add one concrete building type:

```text
well
```

Contract:

```text
cost: 25 Material
construction duration: 2 ticks
job capacity: 1
operational requirement: yes
road access: yes for production
production: 2 Water/tick
upkeep: 0
```

A Well must use the existing building lifecycle.

Do not create a special construction path.

It must use the existing:

```text
placeBuilding
→ dispatchCommand
→ stepSimulation
→ applyCommand
```

architecture.

---

# 5. WELL WORKFORCE

A Well is a normal workplace.

It must participate in the existing type-blind workforce pool:

```text
Farm ∪ Workshop ∪ Well
```

Do not create:

```text
waterWorkers
wellWorkers
```

or a Well-specific assignment mechanism.

Existing manual reassignment must work automatically with Wells.

A colonist may be manually reassigned:

```text
Farm → Well
Workshop → Well
Well → Farm
Well → Workshop
```

provided all existing eligibility rules are satisfied.

Do not add a new workforce priority.

---

# 6. WELL PRODUCTION

A Well produces:

```text
+2 Water/tick
```

only when:

```text
operational
AND staffed
AND road-accessible
```

This mirrors the existing Workshop production contract.

Unstaffed Well:

```text
0 Water
```

Under construction:

```text
0 Water
```

Roadless Well:

```text
0 Water
```

Disconnected from its worker's residence:

```text
0 Water
```

because it cannot be staffed under the existing mobility contract.

Do not modify the mobility system to accommodate Water.

---

# 7. WATER STORAGE

Water has no dedicated storage building in Step 10P.

However, unlike Food, Water must have a deterministic colony-wide stock because production and consumption occur in different simulation phases.

Use:

```text
waterStock
```

as the canonical resource quantity.

Do not introduce a generic storage abstraction.

There is no Water capacity limit in Step 10P.

This is intentional.

Document:

```text
Water storage is unlimited for this step.
```

A future storage rule may be introduced independently if justified.

---

# 8. WATER COVERAGE

Coverage is derived from the existing road/network system.

A Residence is Water-served if:

```text
Residence is operational
AND
there exists an operational staffed Well
AND
Residence and Well are mobility-connected through the existing road network
```

Important:

The Well itself must be:

```text
operational
staffed
road-accessible
```

A road-connected but unstaffed Well provides no Water service.

A staffed but roadless Well provides no Water service.

Do not store coverage.

Do not assign a network ID to a Residence specifically for Water.

Reuse the existing mobility/network derivations.

---

# 9. WATER CONSUMPTION

Water consumption is:

```text
1 Water per served colonist
```

Only served colonists consume Water.

However, admission must require Water service.

The intended rule is:

```text
Food is required for survival.
Water service is required for admission/growth.
```

Therefore:

### Existing colonists

An already-admitted colonist does NOT die merely because Water becomes unavailable.

Water shortage must not become a second starvation mechanism.

### New admission

A new colonist may be admitted only if:

```text
Food available
AND
Water service available
AND
free operational Residence capacity
```

Do not deduct Water merely to reserve an admission.

Do not create a reservation system.

---

# 10. ADMISSION SEMANTICS

Preserve the existing deterministic admission order.

Currently population admission is driven by:

* Food;
* housing capacity;
* ascending Residence order.

Extend the admission condition minimally:

```text
Food gate
AND
Water service gate
AND
housing capacity
```

Do not redesign population admission.

The result must remain deterministic.

If no Residence is Water-served:

```text
population cannot grow
```

even if Food is abundant.

If Water service exists but Water stock is insufficient:

the new colonist must not be admitted.

This distinction must be explicit:

```text
coverage = service availability
stock = consumable resource availability
```

---

# 11. WATER PHASE ORDER

Preserve the existing phase architecture.

Do not introduce a generic resource phase.

The intended ordering is:

```text
advanceConstruction
→ updateNeeds
→ produceFood
→ produceWater
→ consumeFood
→ consumeWater
→ updatePopulation
→ assignJobs
→ produceMaterial
→ applyCommand
→ progressPlaced*
→ upkeepBuildings
→ advanceTime
```

If the existing phase implementation has a slightly different concrete ordering, adapt minimally while preserving these causal requirements:

1. operational Wells produce before Water consumption;
2. Water consumption happens before admission;
3. Food survival remains before population admission;
4. workforce assignment timing remains coherent;
5. existing Material timing remains unchanged.

Do not move unrelated phases.

Document the exact final ordering.

---

# 12. IMPORTANT WORKFORCE TIMING

Respect the existing Farm timing:

```text
produceFood
```

currently observes the previous tick's workforce assignment.

The same rule must apply to Water.

Therefore:

```text
colonist assigned to Well at tick N
→ Well produces Water according to existing phase timing
→ do not create a special same-tick exception
```

The implementation must not accidentally give Wells privileged staffing timing.

Verify this explicitly.

---

# 13. WATER SHORTAGE

Water shortage should be derived.

At minimum expose enough information for:

* simulation tests;
* inspection;
* browser verification.

Useful derived values:

```text
waterNeed
waterConsumed
waterShortage
servedColonists
servedResidences
waterProduced
```

Do not persist them.

Do not add all of them to the canonical hash.

Use the smallest useful query surface.

---

# 14. FOOD INTERACTION

Food remains independent from Water.

A Farm:

```text
operational + staffed
→ Food production
```

No Water requirement.

Do NOT implement:

```text
Farm → Water → Food
```

or:

```text
Farm → Water access
```

Step 10P intentionally tests whether Water can create a second independent workforce/service pressure.

---

# 15. MATERIAL INTERACTION

A Well costs:

```text
25 Material
```

Construction uses the existing authoritative Material transaction.

No Water upkeep.

No Material upkeep.

No special Water construction rule.

The intended chain is:

```text
Material
→ Well construction
→ Well workforce
→ Water
```

This is sufficient for the first implementation.

---

# 16. SPATIAL BEHAVIOR

Water is the first system that should make **service coverage** economically meaningful.

Test at minimum:

### A — Same network

Residence and Well on the same operational road network.

Expected:

```text
served = true
```

### B — Different networks

Residence and Well on different road networks.

Expected:

```text
served = false
```

### C — Roadless Well

Expected:

```text
production = 0
service = false
```

### D — Under-construction Well

Expected:

```text
production = 0
service = false
```

### E — Staffed Well becomes operational

Next valid simulation tick:

```text
production resumes
coverage becomes active
```

### F — Network disconnects

Water service disappears.

Existing colonists remain alive.

New population admission stops.

### G — Network reconnects

Water service returns.

Population admission becomes possible again when Food and housing also permit it.

Do not add travel simulation.

---

# 17. MULTIPLE WELLS

Test:

```text
1 Residence / 1 Well
1 Residence / 2 Wells
2 Residences / 1 Well
2 Residences / 2 Wells
```

Coverage is boolean per Residence.

Two Wells serving the same network must NOT double Water consumption.

Two Wells may increase Water production.

Do not create:

```text
water quality
water pressure
water capacity
```

or similar mechanics.

---

# 18. MULTIPLE NETWORKS

Test:

```text
Network A:
Residence + Well

Network B:
Residence + no Well
```

Expected:

```text
Residence A = served
Residence B = unserved
```

Then connect the networks.

Verify service becomes available deterministically.

The road network remains the source of spatial connectivity.

---

# 19. WORKFORCE COMPETITION

This is critical.

Test:

```text
Farm + Workshop + Well
```

with fewer colonists than workplaces.

Manual reassignment must allow:

```text
Farm → Well
Workshop → Well
Well → Farm
Well → Workshop
```

and create the expected resource tradeoffs.

Example:

```text
Farm → Well
```

should approximately mean:

```text
Food production -2
Water production +2
```

with no hidden additional cost.

Likewise:

```text
Workshop → Well
```

must affect Material production according to existing Workshop rules.

Do not add an automatic Well priority.

Do not make Water automatically outrank Food or Material.

---

# 20. PLAYER AGENCY

The player must have at least these decisions:

```text
where to build the Well
which colonist works there
which existing production is sacrificed for Water
which road network receives service
when to expand housing
```

Do not add a new global service-management interface.

Use the existing:

* building placement;
* inspector;
* worker reassignment;
* road construction.

If existing inspection can show:

```text
Well
Operational
Staffed / vacant
Road access
Water production
```

that is sufficient.

---

# 21. UI

Add only the smallest required UI changes.

The player must be able to:

1. select/build a Well;
2. see its operational state;
3. see whether it is staffed;
4. see whether it has road access;
5. see Water production;
6. inspect Water stock/service information;
7. understand why population is not growing when Water service is missing.

Do not create a new Water dashboard.

Do not create a service overlay unless the existing rendering architecture makes a minimal indicator clearly necessary.

A concise population/admission message is sufficient.

---

# 22. PERSISTENCE

SAVE_VERSION must become:

```text
6
```

Migration:

```text
v5
→ v6
water = 0
```

Migration must be:

* deterministic;
* backward-compatible only through the existing migration boundary;
* explicit;
* tested.

Do not reinterpret old buildings as Wells.

Old saves must contain no historical Water.

Verify:

```text
v5 save
→ migrate
→ v6 canonical state
→ stable hash
```

Also verify:

```text
v6 save
→ load
→ same state
→ same hash
```

---

# 23. HASH

Canonical hash must include:

```text
water
```

because it is persisted canonical state.

Hash must NOT include:

```text
waterNeed
waterConsumed
waterShortage
servedResidences
servedColonists
coverage
waterProduced
```

unless one of those is already canonical state.

Derived state remains excluded.

---

# 24. DETERMINISM

Test:

* same initial state + same commands;
* replay;
* save/load;
* v5 migration;
* reversed insertion order;
* multiple Wells;
* multiple residences;
* multiple networks;
* manual workforce overrides.

Use deterministic integer arithmetic.

No:

```text
Date.now()
Math.random()
```

in domain/application simulation.

---

# 25. ECONOMIC LEDGERS

For each relevant scenario report:

```text
Water:
  produced
  consumed
  shortage
  stock

Food:
  produced
  consumed
  shortage

Material:
  produced
  upkeep
  construction spending
  stock
```

Verify that Water changes are attributable only to:

```text
Well staffing
Well operational state
Well road access
Water consumption
population/service coverage
```

No hidden resource effects.

---

# 26. CRITICAL BOOTSTRAP SCENARIOS

Run these explicitly.

### Scenario A — Residence only

```text
Food abundant
Water = 0
1 Residence
```

Expected:

```text
population = 0
```

after the admission gate is evaluated.

### Scenario B — Residence + Farm

Food sustainable but no Water service.

Expected:

```text
population cannot grow
```

### Scenario C — Residence + Well

Well staffed and served.

Expected:

```text
Water production begins
population can grow if Food and housing allow
```

### Scenario D — Farm + Workshop + Well

Fewer colonists than workplaces.

Verify the worker allocation tradeoff.

### Scenario E — Water service lost

Disconnect Residence from Well.

Expected:

```text
existing population survives
new admission stops
```

### Scenario F — Water service restored

Reconnect.

Expected:

```text
admission resumes when Food + housing + Water stock permit
```

---

# 27. NO WATER-STARVATION LOOP

This is a hard requirement.

Do NOT implement:

```text
Water shortage
→ existing colonist dies
```

in Step 10P.

The only existing population-loss mechanism remains the Food survival consequence.

Water is a growth/service gate.

This distinction must be tested.

---

# 28. TEST SUITE

Add focused tests, expected areas:

### Well contract

* cost;
* duration;
* capacity;
* production;
* operational requirement;
* staffing requirement;
* road access.

### Coverage

* same network;
* different network;
* disconnected;
* roadless;
* multiple Wells;
* multiple residences.

### Consumption

* served colonists;
* unserved colonists;
* Water shortage;
* no negative Water.

### Admission

* Food + Water + housing;
* Food without Water;
* Water without Food;
* no housing;
* Water service restored.

### Workforce

* Farm ↔ Well;
* Workshop ↔ Well;
* manual override;
* automatic assignment;
* capacity;
* mobility.

### Timing

* Well construction;
* operational transition;
* staffing transition;
* production timing;
* admission timing.

### Persistence

* v5 → v6;
* v6 round-trip;
* hash.

### Determinism

* replay;
* insertion order;
* multiple networks;
* multiple Wells.

Do not weaken existing tests.

---

# 29. E2E

Add:

```text
e2e/waterRun.mjs
```

or extend an existing suite only if doing so is clearly cleaner.

The browser scenario must demonstrate the actual player loop:

```text
build Residence
→ build Farm
→ observe Food
→ build Well
→ build road
→ allow Well to become operational
→ assign worker if needed
→ observe Water
→ observe population admission
→ disconnect Water network
→ observe admission blocked
→ reconnect
→ observe admission resumes
```

Also verify manual workforce interaction if practical:

```text
Farm worker
→ Well
→ Water production resumes
```

Zero console/page errors.

Use the real browser environment.

---

# 30. GPU

If rendering changes are made, perform the existing GPU/browser verification.

If the environment only exposes SwiftShader, report that as environmental rather than modifying simulation behavior.

Do not add GPU-specific simulation logic.

---

# 31. PERFORMANCE

Do not introduce repeated network BFS per colonist.

Coverage must reuse the existing network/mobility derivations.

Avoid:

```text
Residence × Well × Road
```

recomputation when existing network IDs/components can answer the question.

Measure:

```text
assignJobs
produceWater
consumeWater
updatePopulation
stepSimulation
```

on representative SMALL / MEDIUM / LARGE workloads.

The Water addition must not cause an obvious quadratic regression beyond the existing architecture.

---

# 32. ARCHITECTURE

Keep Water concrete.

Preferred:

```text
water.ts
well.ts
water queries
water simulation functions
```

rather than:

```text
GenericNeed
GenericService
GenericProducer
GenericConsumer
```

The architecture must remain explicit until repeated evidence proves a generic abstraction necessary.

Do not refactor existing Food into a generic Need during this step.

Do not refactor Farms/Workshops/Wells into a generic producer hierarchy.

---

# 33. DOCUMENTATION

Create:

```text
docs/roadmap/Step10P.md
```

Preserve this prompt.

Append:

```text
## As-Built
```

Include:

* exact Water rules;
* Well contract;
* phase order;
* coverage semantics;
* admission semantics;
* persistence migration;
* tests;
* E2E;
* determinism;
* performance;
* design decisions;
* deferred systems.

Never overwrite the prompt section.

---

# 34. VERIFICATION

Run:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Run all existing E2E suites plus Water.

Verify:

```text
SAVE_VERSION = 6
```

Verify migration v5 → v6.

Search:

```text
Date.now()
Math.random()
```

in domain/application.

Verify:

* save/load hash;
* replay;
* insertion order;
* deterministic Water coverage;
* deterministic admission.

---

# 35. FINAL REPORT

Finish with exactly:

```text
Step 10P COMPLETE — IMPLEMENTATION

Repository

Starting commit:
Final commit:

Production files:
Tests:
Docs:

Water state

...

Well contract

...

Phase order

...

Coverage

...

Consumption

...

Admission gate

...

Food interaction

...

Workforce interaction

...

Spatial behavior

...

Persistence / migration

...

Hash

...

Determinism

...

Performance

...

UI

...

Browser verification

...

Architecture

...

Design decision

...

Deferred

...

Verification

...

Scope verdict

COMPLETE — IMPLEMENTATION
```

Final confirmations:

```text
- Well is a concrete building, not a generic producer abstraction
- Water is canonical persisted state
- SAVE_VERSION = 6
- v5 → v6 migration sets water = 0
- Well production requires operational + staffed + road access
- Well has capacity 1
- Well costs 25 Material and takes 2 ticks
- Water coverage is derived, never persisted
- coverage uses existing road/network mobility connectivity
- Water is consumed per served colonist
- Water shortage blocks new admission
- Food remains the survival gate
- Water shortage does not kill existing colonists
- Food remains independent from roads
- no Farm upkeep
- no Water upkeep
- no water logistics
- no pipes
- no travel simulation
- no generic Needs framework
- no generic Service framework
- no new workforce priority
- automatic + manual workforce systems remain intact
- save/load deterministic
- replay deterministic
- no Date.now() / Math.random() in simulation
```



---

## As-Built

**Type: IMPLEMENTATION (Step 10P).** The second essential service defined by
Step 10O is implemented end to end: one resource, one building, one derived
coverage rule, one admission gate. No generic framework, no upkeep, no pipes,
no logistics, no travel simulation.

### Exact Water rules

```text
water                : canonical ResourceStock field, integer >= 0
INITIAL_WATER        : 0          (fresh colony and v5 migration)
WATER_PER_WELL_PER_TICK       : 2
WATER_PER_COLONIST_PER_TICK   : 1
```

* a Well produces `+2 Water/tick` only while **operational AND staffed AND
  road-accessible** (mirrors the 09F Workshop production contract);
* a colonist consumes `1 Water/tick` only while **water-served** (their
  Residence is on a Well-covered road network);
* Water shortage **clamps the stock to 0 and blocks new admission** — it never
  kills an existing colonist. Food remains the only survival rule.

`AUDIT WELL_PRODUCTION`: staffed 2, vacant 0, roadless 0.
`AUDIT NO_WATER_STARVATION`: a served colony with 0 Water keeps its population.
`AUDIT WATER_LEDGER` (2 colonists, 1 Well): production 2/tick, need 2/tick,
stock stable at 0 — no hidden resource effect.

### Well contract

| Property | Value |
| --- | --- |
| cost | `25` Material |
| construction | `2` ticks (existing lifecycle, no special path) |
| housing capacity | `0` |
| job capacity | `1` |
| production | `+2 Water/tick` when operational + staffed + road-accessible |
| upkeep | none |

It is a normal workplace: `isOperationalWell`, `isOperationalWorkplace` and
`jobCapacityOf` include it, so the type-blind automatic pool and the Step 10M
manual reassignment work unchanged (`AUDIT WORKFORCE_AUTO`,
`AUDIT WORKFORCE_FARM_TO_WELL`: Food 2 -> 1 while Water 0 -> 2).

### Phase order (final)

```text
advanceConstruction
-> updateNeeds
-> produceFood
-> produceWater          (Step 10P)
-> consumeFood
-> consumeWater          (Step 10P, all-or-nothing clamp, shortage flag)
-> updatePopulation      (Food gate + Water gate + housing)
-> assignJobs
-> produceMaterial
-> applyCommand
-> progressPlaced*
-> upkeepBuildings
-> advanceTime
```

No phase reorder; no generic resource phase. `produceWater` runs before
`assignJobs`, so a newly assigned Well worker produces from the **next** tick —
the same timing as Farms (`AUDIT TIMING`: the assignment tick leaves Water at
its starting stock; the following tick produces +2 and consumes 1).

### Coverage semantics

Coverage is **derived, never stored/hashed/persisted**, from the existing 09D
road networks and 09E building access:

```text
Well (operational + road-accessible) -> covers the networks it touches
Residence                           -> served while it shares a covered network
colonist                            -> served while their Residence is served
```

Coverage is computed once per tick (`getWaterCoverage`) and reused for the need
and the admission gate — one 09D network derivation, no per-pair BFS.

`AUDIT COVERAGE_SAME_NETWORK`: 1 served residence / 1 served colonist.
`AUDIT COVERAGE_DIFFERENT_NETWORK`: only the Residence on the Well's network is
served. `AUDIT COVERAGE_ACCESS`: roadless Well serves nothing, connected Well
serves its network. `AUDIT COVERAGE_MULTIPLE_WELLS`: coverage stays boolean per
Residence; only staffed Wells produce. `AUDIT MULTIPLE_NETWORKS`: an isolated
Residence is unserved until the networks are connected.

### Admission semantics

```text
admit iff  Food > 0 after consumption
       AND the free operational Residence is Water-served
       AND the colony is not in Water shortage
       AND a free operational Residence exists (existing rule)
```

* `AUDIT ADMIT_SERVED`: served Residence -> first colonist admitted.
* `AUDIT ADMIT_UNSERVED`: a Well exists but the Residence is unserved -> 0.
* `AUDIT ADMIT_NO_FOOD`: no Food -> 0.
* `AUDIT ADMIT_SHORTAGE`: shortage blocks admission at population 3; adding a
  Water reserve resumes admission (population 4).
* Water shortage never removes an existing colonist (Step 10P §27).

**Bootstrap rule (documented deviation).** Step 10O proposed requiring a
*staffed* Well for coverage. That is a deadlock: the first colonist needs Water
service to be admitted, but only a colonist can staff the Well. The
implemented rule is therefore:

```text
the Water admission gate activates once the colony owns an operational Well;
until then, the historical Food + housing bootstrap applies
```

`AUDIT BOOTSTRAP_NO_WELL`: without any Well, admission behaves exactly as before
(2 colonists). This is the smallest coherent, playable rule. It deviates from
Step 10O's Scenario A/B ("Residence only -> population 0"); every other Step 10O
scenario (C, D, E, F) is satisfied, and the full pre-10P test suite (819 tests)
continues to pass unchanged.

### Persistence / migration

```text
SAVE_VERSION            = 6   (was 5)
MIGRATABLE_SAVE_VERSION = 5
```

`loadSave` migrates a v5 save by adding `water = 0`, and chains a v4 save
through v5 (colonist mode) to v6. Historical Water is never inferred, and old
buildings are never reinterpreted as Wells. The validator requires an integer
`resources.water >= 0`.

`AUDIT MIGRATION_V5`: v5 -> v6 gives `water 0`. A v4 -> v6 chain test confirms
both the automatic assignment mode and `water 0`.

### Tests

`tests/waterService.test.ts` — 32 tests: Well contract, production, coverage,
consumption/shortage, admission (served/unserved/food/housing/shortage/
bootstrap), workforce integration (Farm↔Well, Workshop↔Well, capacity),
multiple networks, timing, persistence/migration (v5 and chained v4),
determinism, economic ledger and performance. No existing test was weakened;
the only migrations were the deliberate SAVE_VERSION 5 -> 6 assertions, the
`water` field in raw `ResourceStock` literals, and the Step 10O intake surface
expectations (2 resources/3 buildings -> 3 resources/4 buildings).

### E2E

`e2e/waterRun.mjs` (npm `test:e2e:water`, port 4183):

```text
bootstrap: 1 colonist admitted without Water (no Well exists), water 0
roadless Well: waterServedResidences 0, population stays 1
  ("1 colonist consumed 1 food · No water service — population cannot grow")
connected Well: water 1, production 2, population 2
Well inspection: "Water production — producing +2/tick (staffed)"
HUD Water stock: 1
zero console/page errors
```

All existing E2E suites remain green: `run` 11, `road` 15, `transport` 10,
`production` 12, `resource` 12, `food` 12, `temporal` 17, `jobs` 21,
`upkeep` 35, `reassign` 7, `water` 7.

### Determinism

`AUDIT DETERMINISM`: 60-tick replay byte-identical (`hash 496adcf931d94c00`) and
independent of canonical entity-record insertion order. Coverage, consumption
and admission are deterministic integer derivations; no `Date.now()` /
`Math.random()` in `src/`.

### Performance

`AUDIT PERFORMANCE`:

| Size | Workplaces / Residences | `getWaterCoverage` (ms) | per tick (ms) |
| --- | --- | ---: | ---: |
| SMALL | 9 / 5 | 0.135 | 0.896 |
| MEDIUM | 90 / 40 | 4.322 | 50.463 |

Coverage is one 09D network derivation reused for every Well and Residence — no
Residence × Well × Road recomputation, no new BFS per colonist. The per-tick
cost is dominated by the pre-existing `assignJobs` scan (≈50 ms at MEDIUM before
Step 10P), so Water adds a bounded, non-quadratic increment.

### Design decisions

1. Water is a **concrete** resource/building/rule, not a generic service.
2. Health of the model: Water is a **growth gate**, Food stays the **survival
   gate** — two distinct consequences, no duplicated starvation rule.
3. Coverage requires an **operational, road-accessible** Well (see bootstrap
   rule); **staffing gates production**, so an unstaffed Well provides service
   availability but no supply and cannot sustain growth beyond the bootstrap.
4. Wells are ordinary workplaces: automatic assignment and manual reassignment
   apply unchanged (Farm/Workshop/Well in one type-blind pool).
5. No upkeep, no pipes, no logistics, no distance/travel, no storage cap.

### Deferred systems

Food storage/Granary (Phase 4 availability stage), Farm production input,
Material ongoing sink, money (Phase 7), health/education/energy,
vehicles/traffic/congestion/travel time, technology tree, generic
Need/Service/Producer frameworks, demolition/refunds, dynamic reallocation,
large population simulation.

### Verification

* `npx tsc --noEmit` clean; `npx eslint .` clean; `npm run build` succeeds.
* `npx vitest run` -> **42 files, 850 tests passed** (32 new).
* E2E: all suites pass, including `water` (7) and `reassign` (7).
* `SAVE_VERSION = 6`; v5 -> v6 and v4 -> v5 -> v6 migrations deterministic;
  save/load hash stable; replay and insertion-order determinism; no
  `Date.now()` / `Math.random()` in `src/`.

Final confirmations:

```text
- Well is a concrete building, not a generic producer abstraction
- Water is canonical persisted state
- SAVE_VERSION = 6
- v5 -> v6 migration sets water = 0
- Well production requires operational + staffed + road access
- Well has capacity 1
- Well costs 25 Material and takes 2 ticks
- Water coverage is derived, never persisted
- coverage uses existing road/network mobility connectivity
- Water is consumed per served colonist
- Water shortage blocks new admission
- Food remains the survival gate
- Water shortage does not kill existing colonists
- Food remains independent from roads
- no Farm upkeep
- no Water upkeep
- no water logistics
- no pipes
- no travel simulation
- no generic Needs framework
- no generic Service framework
- no new workforce priority
- automatic + manual workforce systems remain intact
- save/load deterministic
- replay deterministic
- no Date.now() / Math.random() in simulation
```
