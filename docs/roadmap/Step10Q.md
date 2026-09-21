# Step 10Q — Water Bootstrap & Service Economy Audit

## Mission

Audit Step 10P as implemented.

This is an **audit-only step**.

The primary question is whether the new Water system creates a coherent second essential-service loop without introducing:

* free population growth;
* hidden Water starvation;
* bootstrap deadlocks;
* service/production contradictions;
* accidental economic sinks;
* workforce instability;
* unintended coupling between Water and Food.

The most important audit target is the deliberate Step 10P bootstrap deviation:

```text
10O contract:
operational + staffed + road-accessible Well → coverage

10P implementation:
operational + road-accessible Well → coverage
staffing → production only
```

The reason documented by Step 10P is that requiring a staffed Well for initial Water coverage could deadlock the first colonist.

Do not assume this correction is right or wrong.

Measure its consequences.

---

# 1. HARD RULE

This step must NOT introduce a new gameplay rule.

Do not implement:

* Water upkeep;
* Farm upkeep;
* Water storage;
* Granary;
* Water pipes;
* water logistics;
* water distance;
* travel time;
* water pressure;
* water capacity;
* generic Services;
* generic Needs;
* generic Production;
* new workforce priorities;
* automatic Well staffing;
* new population rules;
* new Food rules;
* money;
* demolition;
* refunds.

`src/` should remain untouched unless a genuine implementation defect makes the audit impossible to complete.

If a defect is discovered, first document it and determine whether the audit can continue without fixing it.

---

# 2. STARTING POINT

Expected starting commit:

```text id="7j4k2m"
db630c2 Step 10P: implement Water service & coverage
```

Expected:

```text
SAVE_VERSION = 6
MIGRATABLE_SAVE_VERSION = 5
```

Step 10P introduced:

```text
water
well
water production
water consumption
water coverage
water admission gate
v5 → v6 migration
```

---

# 3. RECONSTRUCT THE ACTUAL WATER LOOP

Before judging anything, reconstruct the exact runtime causal order.

Document:

```text
Construction
→ Food production
→ Water production
→ Food consumption
→ Water consumption
→ Population update
→ Workforce assignment
→ Material production
→ Construction command
→ Upkeep
→ Time
```

Then answer precisely:

1. When is Water produced?
2. When is Water consumed?
3. When is population admitted?
4. When does a new colonist begin consuming Water?
5. When does a new Well worker begin producing Water?
6. What happens if Water is zero?
7. What happens if a Well is operational but vacant?
8. What happens if a Well is operational, staffed, but roadless?
9. What happens if the Well is operational and road-accessible but vacant?

Do not rely on comments/documentation alone. Verify against actual code and tests.

---

# 4. BOOTSTRAP AUDIT

This is the central audit.

Test the smallest possible colony.

## Scenario A — Residence only

```text
Food = abundant
Water = 0
1 Residence
0 Wells
0 Farms
0 Workshops
```

Determine:

* population;
* Water stock;
* admission reason;
* Food consumption;
* Water consumption.

Expected conceptual result:

```text
population cannot grow
```

because there is no Water service.

---

## Scenario B — Operational road-accessible Well, vacant

Create:

```text
1 Residence
1 operational Well
Well has road access
Well has no worker
Water = 0
Food = abundant
```

This is the critical case.

Measure:

```text
population
water stock
water produced
water consumed
water shortage
served residences
served colonists
```

Determine whether population can grow.

Then ask:

> If population grows while Water production is zero, what exactly is the causal justification?

This must be answered explicitly.

---

## Scenario C — Operational road-accessible Well, staffed

Create:

```text
1 Residence
1 operational Well
1 colonist
Well staffed
Water = 0
```

Run at least 10 ticks.

Measure:

* Water production;
* Water consumption;
* Water stock;
* population;
* Food;
* staffing.

Verify the exact one-tick staffing lag.

---

## Scenario D — Well constructed but not operational

Create:

```text
Residence
Well under construction
```

Verify:

```text
coverage = false
production = 0
admission blocked
```

Then let the Well become operational.

Verify the exact transition.

---

# 5. FIRST-COLONIST BOOTSTRAP

Reproduce the actual playable bootstrap from an empty world.

Document the exact sequence:

```text
initial state
→ Residence
→ road
→ Well
→ colonist admission
→ Well staffing
→ Water production
→ subsequent admissions
```

Determine whether the player is forced into any impossible state.

Specifically verify:

> Can the player create the first colonist without already having a colonist capable of staffing the Well?

If yes, document the exact mechanism.

If no, identify the deadlock.

Do not fix it.

---

# 6. WATER STOCK VS WATER COVERAGE

This distinction must be audited explicitly.

There are currently two concepts:

```text
coverage:
Residence has access to an operational road-accessible Well

stock:
canonical Water resource quantity
```

Determine whether the system permits:

```text
coverage = true
stock = 0
```

If yes, determine what this means for:

* existing population;
* admission;
* consumption;
* shortage;
* production.

Create a state matrix:

| Coverage | Water stock | Well staffed | Expected admission |
| -------- | ----------: | ------------ | ------------------ |
| no       |           0 | no           | ?                  |
| no       |          >0 | no           | ?                  |
| yes      |           0 | no           | ?                  |
| yes      |          >0 | no           | ?                  |
| yes      |           0 | yes          | ?                  |
| yes      |          >0 | yes          | ?                  |

Do not infer the answers.

Measure them.

---

# 7. WATER SHORTAGE SEMANTICS

Step 10P states:

```text
Water shortage blocks admission.
Water shortage does not kill existing colonists.
```

Verify this literally.

Test:

```text
existing population > 0
Water = 0
Water coverage = true
```

Run multiple ticks.

Verify:

* existing population survives;
* Food remains the only survival gate;
* no hidden population decrease;
* Water shortage remains observable.

Then restore Water production.

Verify that growth can resume.

---

# 8. MULTI-COLONIST WATER CONSUMPTION

Test:

```text
1 served colonist
2 served colonists
3 served colonists
4 served colonists
```

with controlled Water stock.

Verify:

```text
Water need = served colonists × 1
```

and:

```text
Water consumed = min(stock, need)
```

if that is the actual implementation contract.

Check whether an insufficient Water stock causes:

```text
partial consumption
```

or:

```text
all-or-nothing admission
```

Do not confuse these two.

The important question is:

> Can a colonist be admitted because service exists even though the colony cannot actually satisfy that colonist's Water consumption?

---

# 9. ADMISSION ORDER AUDIT

Because the phase order is:

```text
consumeWater
→ updatePopulation
```

test the exact boundary.

Construct a state with:

```text
Water = 1
1 served colonist
1 free Residence
Food sufficient
```

Determine whether another colonist can be admitted.

Then test:

```text
Water = 0
```

Then:

```text
Water = 2
```

Record the exact behavior.

Repeat for:

```text
1 / 2 / 3 free Residences
```

The audit must explain whether Water is:

```text
a pre-admission resource reservation
```

or:

```text
a post-admission consumption
```

or some hybrid.

If the behavior is hybrid, document the exact consequence.

---

# 10. WORKFORCE BOOTSTRAP

Audit the circular dependency:

```text
colonist
→ Well worker
→ Water production
→ Water availability
→ more colonists
```

Test:

### One colonist

Can the first colonist staff the Well?

### Two colonists

Can one remain on Farm while one staffs Well?

### Three colonists

Can the colony sustain:

```text
Farm + Well
```

?

### Farm + Workshop + Well

With 1, 2 and 3 colonists, measure:

* staffed Farms;
* staffed Workshops;
* staffed Wells;
* Food;
* Material;
* Water.

This is particularly important because Step 10P added Wells to the existing type-blind workforce pool.

---

# 11. WORKFORCE COMPETITION

Use manual reassignment to test:

```text
Farm → Well
Workshop → Well
Well → Farm
Well → Workshop
```

Measure the exact resource deltas.

Expected direct production effects:

```text
Farm → Well
Food -2
Water +2
```

and:

```text
Workshop → Well
Material production -2
Water +2
```

No additional hidden cost should appear.

Then test automatic reassignment.

Verify there is no implicit rule such as:

```text
Well > Farm
Well > Workshop
```

unless already documented as existing automatic behavior.

---

# 12. SPATIAL COVERAGE AUDIT

Test:

### Same network

Residence + Well.

### Different networks

Residence on Network A.

Well on Network B.

### Reconnection

Connect A and B.

### Disconnection

Disconnect them again.

### Roadless Well

Operational Well without road access.

### Multiple Wells

Two Wells on same network.

### Multiple networks

Two independent settlement networks with different Water infrastructure.

For each state record:

```text
servedResidences
servedColonists
waterProduced
waterConsumed
waterShortage
populationAdmission
```

The audit should prove that Water is the first actual service whose geometry changes a simulation outcome.

---

# 13. CRITICAL QUESTION — DOES STAFFING MATTER TO SERVICE?

Step 10P intentionally made:

```text
operational + road-accessible Well
```

sufficient for coverage.

Therefore:

```text
vacant Well
→ service coverage
→ production = 0
```

This may create an unusual distinction:

```text
service exists
but service produces nothing
```

Determine whether this is:

```text
A — coherent abstraction
B — temporary bootstrap exception
C — exploitable free service
D — contradictory rule
```

Do not decide from intuition.

Use simulation evidence.

In particular, test whether a vacant Well can sustain indefinite population growth.

If:

```text
vacant Well
+
Water = 0
+
Food abundant
```

can produce unlimited population, this must be treated as a major finding.

---

# 14. LONG-RUN WATER ECONOMY

Run:

```text
60 ticks
240 ticks
```

for:

### A

Farm + Well

### B

Workshop + Well

### C

Farm + Workshop + Well

### D

Farm-heavy

### E

Workshop-heavy

### F

Water-heavy

### G

Manual mixed workforce

Measure:

```text
Food
Material
Water
Population
staffed Farms
staffed Workshops
staffed Wells
```

Identify:

```text
temporary pressure
persistent pressure
terminal state
recoverable state
```

Do not add balancing rules.

---

# 15. RESOURCE EQUILIBRIUM

Determine whether Water has any equilibrium or runaway behavior.

Examples:

```text
1 Well → +2 Water
1 colonist → -1 Water
```

Therefore:

```text
1 staffed Well
1 served colonist
→ +1 Water/tick
```

and:

```text
1 staffed Well
2 served colonists
→ 0 Water/tick
```

and:

```text
1 staffed Well
3 served colonists
→ -1 Water/tick
```

Verify these actual outcomes.

Determine whether this creates meaningful pressure.

Compare against:

```text
Workshop:
+2 Material
-1 upkeep
```

Do not rebalance.

---

# 16. POPULATION FEEDBACK

Audit the new loop:

```text
Water
→ population
→ Water consumption
→ Water shortage
```

This is potentially the first self-limiting resource loop in NOVA.

Test whether it naturally produces:

```text
growth
→ increased Water consumption
→ reduced Water surplus
→ growth slowdown
```

without requiring:

* Water upkeep;
* arbitrary thresholds;
* population caps.

If this loop exists, document it carefully.

---

# 17. FOOD / WATER INTERACTION

Verify that Food and Water remain distinct:

```text
Food
→ survival

Water
→ growth
```

Test:

### Food shortage, Water abundant

Population should follow the existing Food survival rule.

### Food abundant, Water shortage

Existing population survives; new growth stops.

### Both scarce

Food remains the only population-loss mechanism.

Do not allow Water to indirectly create a second death condition.

---

# 18. PERSISTENCE / MIGRATION

Verify:

```text
SAVE_VERSION = 6
```

Test:

### v5 → v6

Water becomes:

```text
0
```

### v4 → v5 → v6

Historical saves migrate deterministically.

### v6 round-trip

Water stock and all canonical state remain identical.

### Hash

Changing only Water changes the canonical hash.

Changing only derived coverage does not.

---

# 19. DETERMINISM

Run:

* 60-tick replay;
* 240-tick replay;
* save/load replay;
* reversed insertion order;
* multiple network orderings;
* multiple Well IDs;
* manual workforce commands;
* reconnection/disconnection.

Verify byte-identical canonical state and hash.

Search:

```text
Date.now()
Math.random()
```

in simulation code.

---

# 20. PERFORMANCE

Measure:

```text
getWaterCoverage
produceWater
consumeWater
updatePopulation
assignJobs
stepSimulation
```

on:

```text
SMALL
MEDIUM
LARGE
XL
```

Compare with Step 10P measurements.

Pay particular attention to:

```text
coverage computation
```

and:

```text
Residence × Well
```

scaling.

Confirm that existing network derivations are reused rather than recomputed per pair.

---

# 21. BROWSER AUDIT

Run:

```text
e2e/waterRun.mjs
```

and all existing E2E suites.

In the browser verify:

1. Residence without Water;
2. operational Well;
3. road access;
4. Well vacant;
5. Well staffed;
6. Water HUD;
7. population admission blocked/unblocked;
8. disconnect/reconnect;
9. Water production inspection;
10. manual Farm → Well reassignment.

Check:

* zero console errors;
* zero page errors;
* no misleading Water status;
* no UI claiming Water is being produced when the Well is vacant;
* no UI claiming population is blocked for the wrong reason.

---

# 22. ARCHITECTURE AUDIT

Confirm:

* Water remains concrete;
* no generic Need abstraction;
* no generic Service abstraction;
* no generic producer hierarchy;
* no reverse indexes;
* coverage remains derived;
* served lists remain derived;
* shortage remains derived;
* canonical Water stock remains the only Water resource state.

Check that the bootstrap correction did not leak a special-case rule into unrelated systems.

Especially inspect whether:

```text
population admission
```

now contains an implicit:

```text
if colony owns operational Well
```

special case.

If so, document it as a concrete Water rule rather than allowing it to become an accidental generic pattern.

---

# 23. DESIGN CLASSIFICATION

Classify the Step 10P Water implementation:

```text
A — Fundamental
B — Useful but incomplete
C — Redundant
D — Problematic
```

Do not rank candidates.

Explain specifically:

1. Does Water create a genuine second causal loop?
2. Does it create spatial pressure?
3. Does it create workforce pressure?
4. Does it create resource pressure?
5. Does it create population feedback?
6. Is the bootstrap correction coherent?
7. Does Water remain distinguishable from Food?
8. Is the system understandable to the player?
9. Is the system recoverable?
10. Does it remain architecturally contained?

---

# 24. NEXT STEP

Do not automatically implement another Water feature.

Determine whether the next step should be:

```text
Water audit follow-up
```

or:

```text
next causal dependency
```

or:

```text
Water + population stabilization
```

based entirely on evidence.

Do not add Water storage merely because Water currently has unlimited storage.

Do not add Water upkeep merely because Wells have no upkeep.

Do not add pipes merely because Water currently uses network coverage.

The question is:

> What does the current system actually need to become more interesting or coherent?

---

# 25. FILES

Expected audit-only changes:

```text
tests/waterBootstrapEconomyAudit.test.ts
docs/roadmap/Step10Q.md
```

No `src/` changes.

Preserve Step 10P documentation.

Append the As-Built/Audit section safely.

Do not overwrite the original Step 10P prompt.

---

# 26. VERIFICATION

Run:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Run all existing E2E suites.

Expected baseline:

```text
42 files
850 tests
```

plus new audit tests.

Verify:

```text
SAVE_VERSION = 6
```

and all migration tests.

---

# 27. FINAL REPORT

Finish exactly with:

```text
Step 10Q COMPLETE — AUDIT

Repository

Starting commit:
Final commit:

Production code changed:
Tests added:
Docs changed:

Actual Water causal loop

...

Bootstrap behavior

...

Coverage vs production

...

Water stock semantics

...

Admission semantics

...

Water shortage semantics

...

Workforce interaction

...

Spatial pressure

...

Food interaction

...

Population feedback

...

Long-run economy

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

A / B / C / D

Reason:

Next dependency

...

Scope verdict

COMPLETE — AUDIT
```

Final confirmations:

```text
- src/ unchanged
- no new Water rule introduced
- no Water upkeep
- no Farm upkeep
- no Water logistics
- no pipes
- no travel simulation
- no generic Need framework
- no generic Service framework
- no new workforce priority
- Water remains canonical persisted state
- coverage remains derived
- Food remains the survival gate
- Water does not kill existing colonists
- deterministic save/load remains intact
- replay remains deterministic
- SAVE_VERSION remains 6
```



---

## As-Built / Audit Report

**Type: AUDIT (Step 10Q) of the Step 10P Water implementation.** `src/` is
untouched (`git diff -- src/` empty). Evidence comes from
`tests/waterBootstrapEconomyAudit.test.ts` (25 tests); every number below is a
real `AUDIT ...` line.

### Actual Water causal loop

Verified phase order (`AUDIT PHASE_ORDER`):

```text
advanceConstruction -> updateNeeds -> produceFood -> produceWater
-> consumeFood -> consumeWater -> updatePopulation (Food + Water + housing)
-> assignJobs (Farm | Workshop | Well) -> produceMaterial -> applyCommand
-> progressPlaced* -> upkeepBuildings -> advanceTime
```

`AUDIT TIMING_ANSWERS`: a Well assigned on tick N produces on tick N+1
(`afterTick1Water 0`, assigned well 1, `afterTick2Water 1` = +2 produced −1
consumed). Water is produced before consumption, and consumed before admission.

### Bootstrap behavior

| Scenario | Result |
| --- | --- |
| A — Residence only | population **1** (`AUDIT SCENARIO_A`); no Well -> gate off |
| B — operational road Well, vacant (Farm nearer) | population **1** over 20 ticks; served 2 / need 1 / production 0 / **shortage** |
| C — operational Well staffed | population stabilises at **2** (production 2 = need 2) |
| D — Well under construction | population **1**; no operational Well -> gate off, production 0 |

`AUDIT BOOTSTRAP_SEQUENCE` proves the playable chain: `place R -> road -> place
Well`; the admitted colonist auto-staffs the Well (`staffedWells 1`) and Water
climbs `0 -> 1 -> 2`. **There is no first-colonist deadlock** — the gate stays
off until an operational Well exists, so the first colonist is admitted by the
historical Food+housing rule and then staffs the Well.

### Coverage vs production

Coverage is derived and staffing-independent, while production requires
staffing (the deliberate Step 10P correction). `AUDIT SCENARIO_B` and
`AUDIT VACANT_WELL_120`: a vacant Well gives `servedResidenceCount 4` but
`productionPerTick 0`, and the colony stays at **population 1**. A vacant Well
therefore cannot sustain growth — the distinction is a real abstraction, not a
free service.

### Water stock semantics

`AUDIT ADMISSION_BOUNDARY` (1 served colonist, 1 free served Residence, vacant
Well): stock 0 -> population 1 (blocked); stock 1 -> 2; stock 2 -> 2.
`AUDIT ADMISSION_RESIDENCES`: the admission loop fills every served free
Residence in one tick (1/2/3 free -> +1/+2/+3). `AUDIT INSUFFICIENT_STOCK`:
stock is clamped to 0, never negative.

### Admission semantics

The gate is a **hybrid**: coverage is checked per Residence, the stock is
checked for *current* non-deficit, and the new colonist's Water is consumed
only on the following tick — the reservation is implicit (none). `AUDIT
COVERAGE_STOCK_MATRIX`:

| coverage | stock | Well staffed | admitted (2nd) |
| --- | ---: | --- | ---: |
| no | 0 / 5 | no | 1 / 1 |
| no | 0 / 5 | requested (rejected: roadless) | 1 / 1 |
| yes | 0 | no | 1 |
| yes | 0 | yes | **2** |
| yes | 5 | no | **2** |
| yes | 5 | yes | **2** |

### Water shortage semantics

`AUDIT SHORTAGE_SEMANTICS`: 2 served colonists, vacant Well, Water 0 — after 10
ticks population is still **2** with `shortage true` and Water 0. Staffing the
Well restores production without any population loss. `AUDIT
FOOD_WATER_INTERACTION`: Food shortage -> population 0 (existing starvation);
Water shortage -> population 3 survives. **Water never kills.**

### Workforce interaction

`AUDIT WORKFORCE_BOOTSTRAP`: 1 colonist -> 1 Farm staffed, Well vacant (Water
0); 2 colonists -> 1 Farm + 1 Well; 3 colonists -> 1 Farm + 1 Well + 1
unemployed. `AUDIT MANUAL_DELTAS`: Farm -> Well = `{food −2, material 0,
water +2}`; Workshop -> Well = `{material −2, water +2}`. `AUDIT
NO_WELL_PRIORITY`: with Farm at distance 0 and Well at distance 1 the Farm
wins, so no implicit Well priority exists.

### Spatial pressure

`AUDIT SPATIAL_COVERAGE`: disconnected networks -> `['building-1']`; connected
-> `['building-1','building-3']`; roadless Well -> `[]`; multiple Wells on one
network -> `['building-1']` (coverage stays boolean). Water is the first
service whose **geometry changes a simulation outcome** (which Residences can
admit), using only existing 09D/09E data.

### Food interaction

Food and Water stay distinct: Food is the survival gate, Water the growth gate.
Food remains independent from roads and from Water (`§17`). No Farm Water
requirement was introduced.

### Population feedback

`AUDIT POPULATION_FEEDBACK`: with 6 served Residences and 1 staffed Well,
population jumps to **6 in one tick** (`net −4` thereafter). The intended
gradual "growth -> more consumption -> slower growth" loop does **not** appear:
the admission loop fills all served free housing while the colony is not yet in
deficit, producing a one-tick overshoot followed by a permanent Water deficit
(the colony survives). This is the main coherence gap found.

### Long-run economy

`AUDIT LONG_RUN` (60/240 ticks): every tested mix is survivable and stable —
Farm+Well pop 3, Workshop+Well pop 3, all-three pop 4, farm-heavy pop 5,
workshop-heavy pop 5, water-heavy pop 5 with Water 59. Water stabilises at 0
whenever production ≤ need. No terminal state and no death spiral.
`AUDIT WATER_EQUILIBRIUM`: one staffed Well with 1/2/3 served colonists gives
`net +1 / 0 / −1` — a clean self-limiting resource, comparable to the Workshop
`+2 / −1` shape.

### Persistence / migration

`SAVE_VERSION = 6`; Water round-trips; `serializeCanonicalState` contains no
`servedColonist`/`servedResidence`/`coverage`/`shortage`/`waterNeed`; changing
only Water changes the hash. v5 -> v6 and chained v4 -> v5 -> v6 migrations
remain covered by `tests/waterService.test.ts`.

### Determinism

`AUDIT DETERMINISM`: 120-tick replay byte-identical (`hash
c29e1d835e6395e0`) and independent of canonical record insertion order. No
`Date.now()` / `Math.random()` in `src/`.

### Performance

`AUDIT PERFORMANCE`:

| Size | Workplaces / Residences | `getWaterCoverage` (ms) | per tick (ms) |
| --- | --- | ---: | ---: |
| SMALL | 9 / 5 | 0.216 | 1.436 |
| MEDIUM | 90 / 40 | 3.845 | 50.409 |
| LARGE | 300 / 120 | 46.162 | — |
| XL | 900 / 360 | 608.491 | — |

Coverage reuses one 09D derivation for every Well/Residence (no per-pair BFS),
but it inherits the pre-existing `getRoadNetworks` cost, which is superlinear
in road count. Per-tick cost is dominated by `assignJobs`; Water adds a bounded
increment, not a new quadratic term.

### Browser verification

`e2e/waterRun.mjs` passes 7/7 with zero console/page errors and no misleading
Water status: bootstrap without Water, roadless Well blocks admission with the
explicit `No water service — population cannot grow` message, connecting the
Well restores service, Water flows, and the Well inspection reads `Water
production — producing +2/tick (staffed)`. All other E2E suites remain green.

### Architecture audit

Water is concrete (`water.ts`, one catalog entry); no generic Need/Service/
Producer abstraction; coverage/served lists/shortage are derived and never
persisted or hashed; `resources.water` is the only Water canonical state.
**Finding (documented, not a defect):** `step.ts` contains a concrete
`hasOperationalWell(state)` bootstrap condition around the admission gate. It
is a Water-specific rule (the gate is inactive until a Well exists); it should
stay concrete and must not be generalized into an "any service" pattern.

### Design classification

```text
B — Useful but incomplete
```

Reason:

1. Water creates a genuine second causal loop (Well -> Water -> growth gate).
2. It creates real spatial pressure (the first geometry-changes-consumption
   rule) and real workforce pressure (Well competes in the type-blind pool).
3. It creates resource pressure (`net +1 / 0 / −1`) and is not exploitable: a
   vacant Well cannot sustain growth.
4. It is distinguishable from Food (growth vs survival) and player-recoverable.
5. It is architecturally contained (one concrete rule).
6. **But** the population feedback is not the intended self-limiting loop: the
   admission loop overshoots to the served housing cap in one tick and then
   runs a permanent Water deficit, because admission checks only a *current*
   non-deficit and does not reserve Water for the new colonist.
7. The bootstrap correction is coherent and playable, but it deviates from the
   10O contract for Scenario A/D (no Well or an under-construction Well leaves
   the gate off).

### Next dependency

Evidence points to a **Water growth-loop stabilization audit**, not a new
feature. The single concrete incoherence is the admission/consumption boundary:
a new colonist may be admitted whenever the colony is not *currently* in
deficit, so a colony can overshoot into permanent deficit instead of slowing
growth. The smallest next question is whether admission should require the
Water stock to cover the new colonist (an explicit reservation) or admit at most
one colonist per tick while Water is binding — to be designed and audited
separately. Do **not** add Water storage, Water upkeep or pipes; none is
justified by the evidence. Once that boundary is settled, the next causal
dependency (Food storage/Granary, or Farm production input) can be revisited.

### Verification

* `src/` untouched; `npx tsc --noEmit` clean; `npx eslint .` clean;
  `npm run build` succeeds.
* `npx vitest run` -> **43 files, 876 tests passed** (25 new audit tests).
* E2E: `run` 11, `road` 15, `transport` 10, `production` 12, `resource` 12,
  `food` 12, `temporal` 17, `jobs` 21, `upkeep` 35, `reassign` 7, `water` 7.
* `SAVE_VERSION = 6`; migrations intact; replay and insertion-order
  determinism; no `Date.now()` / `Math.random()` in `src/`.

Final confirmations:

```text
- src/ unchanged
- no new Water rule introduced
- no Water upkeep
- no Farm upkeep
- no Water logistics
- no pipes
- no travel simulation
- no generic Need framework
- no generic Service framework
- no new workforce priority
- Water remains canonical persisted state
- coverage remains derived
- Food remains the survival gate
- Water does not kill existing colonists
- deterministic save/load remains intact
- replay remains deterministic
- SAVE_VERSION remains 6
```
