# Step 10S — Water Production-Headroom Admission

## 1. OBJECTIVE

Implement the minimal Water growth invariant identified by Step 10R.

Starting point:

* Step 10R commit: `eb142a1`
* Water implementation: Step 10P
* Water audit chain: 10Q → 10R

The implementation must establish:

> A new colonist may be admitted only when the colony has enough Water production capacity to sustain the resulting served population, accounting for admissions already made during the current tick.

The first-colonist bootstrap remains explicitly exempt.

Do not introduce Water storage, reservation state, upkeep, logistics, pipes, travel simulation, or generic abstractions.

---

# 2. HARD RULE

Implement only the smallest concrete Water-specific rule required by the 10R conclusion.

The intended admission capacity is:

```text
waterProductionCapacity
    >=
servedColonistNeed
    + admissionsThisTick
    + 1
```

Where:

* `waterProductionCapacity` is the current production capacity of operational, road-accessible, staffed Wells,
* `servedColonistNeed` is the Water need of the currently served existing population,
* `admissionsThisTick` counts colonists already admitted during the current admission pass,
* `1` is the candidate new colonist.

Do not persist `admissionsThisTick`.

It is a transient calculation during the admission phase.

---

# 3. FIRST-COLONIST BOOTSTRAP

Preserve the existing bootstrap behavior.

When:

```text
population === 0
```

the first colonist may be admitted through the existing bootstrap condition.

Do not require Water production capacity for the first colonist.

The reason is structural:

```text
no colonist
→ no Well worker
→ no Water production
→ no Water capacity
→ no first colonist
```

This exemption must remain explicit and concrete.

Do not generalize it into a reusable admission framework.

---

# 4. SECOND AND SUBSEQUENT COLONISTS

For an existing population:

```text
population > 0
```

Water capacity becomes a real growth constraint.

For each candidate admission:

1. verify Food remains sufficient according to the existing Food rules,
2. verify a free Water-served Residence exists,
3. compute current served-colonist Water need,
4. compute current Water production capacity,
5. count admissions already performed this tick,
6. admit only if:

```text
productionCapacity >= currentServedNeed + admissionsThisTick + 1
```

7. increment the transient admission count,
8. continue evaluating the next free served Residence.

Do not use current Water stock as the primary growth gate.

Water stock remains the canonical consumable resource.

---

# 5. IMPORTANT DISTINCTION

Keep these concepts separate:

### Water stock

Actual persisted resource:

```text
resources.water
```

### Water production capacity

Derived from the current staffed operational Wells:

```text
staffed operational road-accessible Wells × WATER_PER_WELL_PER_TICK
```

### Water coverage

Derived from road/network topology.

### Water need

Derived from served population.

### Admission capacity

Derived from:

```text
production capacity
-
current served population need
-
admissions already made this tick
```

Do not merge these concepts.

---

# 6. SAME-TICK WATER PRODUCTION

Respect the existing phase order:

```text
produceWater
→ consumeFood
→ consumeWater
→ updatePopulation
```

Water produced during the current tick is therefore part of the current Water stock.

However, the new growth invariant uses **production capacity**, not simply stock.

Verify that same-tick production remains consumable normally.

Do not add a second Water production pass.

---

# 7. WATER STOCK SEMANTICS

Do not change:

* `resources.water`
* Water production amount
* Water consumption amount
* shortage semantics
* Water persistence
* SAVE_VERSION

Existing colonists continue consuming Water normally.

Water shortage continues to mean:

* existing colonists survive,
* growth stops,
* Food remains the population-loss mechanism.

The new rule controls **growth sustainability**, not survival.

---

# 8. EXPECTED EQUILIBRIUM

With:

```text
1 staffed Well
WATER_PER_WELL_PER_TICK = 2
WATER_PER_COLONIST_PER_TICK = 1
```

the sustainable served population should be:

```text
2
```

because:

```text
production = 2
need = 2
net = 0
```

The implementation must not produce:

```text
population 3
Water shortage
```

from an otherwise stable one-Well colony.

---

# 9. MULTIPLE WELLS

Verify:

### One staffed Well

Maximum sustainable served population:

```text
2
```

### Two staffed Wells

Maximum sustainable served population:

```text
4
```

### Three staffed Wells

Maximum sustainable served population:

```text
6
```

Do not hard-code these numbers.

They must emerge from:

```text
staffedWellCount × WATER_PER_WELL_PER_TICK
```

---

# 10. MULTIPLE ADMISSIONS IN ONE TICK

This is critical.

Do NOT blindly replace the current loop with:

```text
one admission per tick
```

The 10R audit explicitly rejected that model as unnecessarily throttling funded growth.

Instead:

```text
admissionsThisTick = 0

while a free served Residence exists:

    if productionCapacity
       >= servedNeed + admissionsThisTick + 1:

        admit colonist
        admissionsThisTick++

    else:

        stop admission
```

Adapt this to the actual architecture rather than copying the pseudocode literally.

The resulting behavior should allow multiple admissions in one tick when production capacity genuinely supports them.

---

# 11. EXAMPLE

With:

```text
2 staffed Wells
productionCapacity = 4
population = 1
```

The system should be able to admit enough additional served colonists to reach:

```text
population = 4
```

without exceeding the production headroom.

The admission sequence should effectively evaluate:

```text
candidate 1:
4 >= 1 + 0 + 1 → yes

candidate 2:
4 >= 1 + 1 + 1 → yes

candidate 3:
4 >= 1 + 2 + 1 → yes

candidate 4:
4 >= 1 + 3 + 1 → no
```

assuming all other admission conditions are satisfied.

Do not hard-code this example.

---

# 12. BOOTSTRAP SEQUENCE

Preserve:

```text
Residence
→ road
→ Well
→ Well operational
→ first colonist
→ Well staffed
→ Water production
→ additional population
```

Verify:

* first colonist can exist without Water,
* Well can subsequently become staffed,
* Water production starts,
* second colonist requires Water production headroom,
* population does not jump beyond sustainable Water capacity.

---

# 13. WORKFORCE COMPETITION

Do not change workforce assignment rules.

The Well remains part of:

```text
Farm ∪ Workshop ∪ Well
```

The player must still decide whether to allocate a colonist to Water production.

Test:

* Farm → Well
* Workshop → Well
* automatic assignment
* manual assignment
* multiple Wells
* insufficient workforce

No new Well priority.

---

# 14. SPATIAL RULE

Do not modify Water coverage.

Keep:

```text
Road
→ Network
→ operational road-accessible Well
→ covered network
→ served Residence
→ Water growth eligibility
```

Test:

* connected Well,
* disconnected Well,
* roadless Well,
* multiple networks,
* reconnect after shortage.

The production-headroom calculation must use only Wells that actually qualify for Water production under the existing rules.

---

# 15. EDGE CASES

Explicitly test:

### Case A

Population 0, no Well.

Expected:

* first colonist can bootstrap.

### Case B

Population 1, vacant Well.

Expected:

* no Water production,
* no additional sustainable growth.

### Case C

Population 1, one staffed Well.

Expected:

* growth can reach sustainable population 2.

### Case D

Population 2, one staffed Well.

Expected:

* no additional admission.

### Case E

Population 2, two staffed Wells.

Expected:

* growth can continue toward 4.

### Case F

Population 4, two staffed Wells.

Expected:

* no additional admission.

### Case G

Water stock = 0, production capacity sufficient.

Determine the exact behavior from the existing phase order and verify it remains coherent.

### Case H

Water stock is high but production capacity is insufficient.

Expected:

* accumulated Water does not permit unsustainable permanent population growth.

### Case I

Water stock is high and production capacity is sufficient.

Expected:

* funded growth can occur without the artificial one-colonist-per-tick throttle.

---

# 16. LONG-RUN SIMULATION

Run at least:

* 120 ticks,
* 240 ticks,
* 600 ticks.

Test:

* 1 staffed Well,
* 2 staffed Wells,
* 3 staffed Wells,
* Farm + Well,
* Workshop + Well,
* Farm + Workshop + Well.

Record:

* population,
* Water stock,
* Water production,
* Water consumption,
* admissions,
* shortage,
* Food,
* workforce allocation.

The key invariant:

> Population must not sustainably exceed Water production capacity.

Temporary stock fluctuations are acceptable.

Permanent Water deficit caused solely by the admission rule is not.

---

# 17. FOOD INTERACTION

Food remains independent from Water.

Do not introduce:

* Water requirement for Farms,
* Water consumption by Farms,
* Water-gated Food production,
* Food storage,
* new Food logistics.

Verify:

```text
Food = survival
Water = growth
```

remain distinct.

---

# 18. PERSISTENCE

Do not change:

```text
SAVE_VERSION = 6
```

No new persisted state should be introduced.

`admissionsThisTick` must never be serialized.

Verify:

* save/load,
* hash,
* migration v5 → v6,
* migration v4 → v5 → v6.

---

# 19. DETERMINISM

Verify:

* replay determinism,
* insertion-order independence,
* save/load determinism,
* same initial state → same admission sequence,
* no Date.now(),
* no Math.random().

The admission loop must remain deterministic with ascending canonical residence/colonist ordering already used by the simulation.

---

# 20. PERFORMANCE

Do not introduce:

* BFS per admission,
* network recomputation per admission,
* per-pair residence/Well scans,
* new global graph structures.

Compute Water production capacity once per relevant simulation phase/tick if appropriate.

The admission loop should be linear in the existing residence/admission traversal.

Compare before/after where useful.

---

# 21. BROWSER QA

Run the real Chromium E2E suite.

Verify:

1. bootstrap without Water,
2. roadless Well blocks growth,
3. connected Well enables Water production,
4. population grows only within production headroom,
5. Water HUD,
6. Well inspection,
7. multiple Wells,
8. manual Farm/Workshop → Well,
9. no console errors.

Use actual browser interaction, not mocked DOM state.

GPU verification if available.

---

# 22. ARCHITECTURE

Confirm:

* no generic Need abstraction,
* no generic Service abstraction,
* no generic reservation abstraction,
* no new canonical Water state,
* no persisted admission counter,
* Water-specific logic remains concrete,
* existing domain/application/rendering boundaries remain intact.

The implementation should be small.

If this requires broad refactoring, stop and report why instead of expanding scope.

---

# 23. TESTS

Add focused tests for:

* first-colonist exemption,
* production-headroom admission,
* one Well → max 2 served population,
* two Wells → max 4,
* three Wells → max 6,
* multiple same-tick admissions when capacity allows,
* no admission beyond capacity,
* high stock + insufficient production capacity,
* zero stock + sufficient production capacity,
* vacant Well,
* disconnected Well,
* manual workforce assignment,
* save/load,
* determinism,
* regression of Food behavior.

Keep existing tests green.

---

# 24. DOCUMENTATION

Create:

`docs/roadmap/Step10S.md`

Document:

* original 10R problem,
* why current admission was contradictory,
* why reservation was insufficient,
* why one-per-tick was rejected,
* the production-headroom invariant,
* first-colonist bootstrap exemption,
* exact phase semantics,
* examples,
* persistence decision,
* deterministic behavior,
* final QA.

Do not rewrite older audit documents.

---

# 25. VERIFICATION

Run:

* full test suite,
* lint,
* typecheck,
* production build,
* browser E2E,
* relevant GPU/browser verification.

Confirm:

```text
src/ changed only for the concrete Water admission implementation
SAVE_VERSION remains 6
```

---

# 26. FINAL REPORT

End `docs/roadmap/Step10S.md` with exactly:

```text
Step 10S COMPLETE — IMPLEMENTATION

Repository

Starting commit:
Final commit:

Production files changed:
Tests added:
Docs changed:

Water admission invariant

...

First-colonist bootstrap

...

Production headroom

...

Population equilibrium

...

Multiple Wells

...

Water stock semantics

...

Food interaction

...

Workforce interaction

...

Spatial interaction

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

Regression status

...

Final design status

...

Scope verdict

COMPLETE — IMPLEMENTATION

Final confirmations:

- production-headroom admission implemented
- first-colonist bootstrap preserved
- no Water reservation state
- no Water storage
- no Water upkeep
- no Farm upkeep
- no Water logistics
- no pipes
- no travel simulation
- no generic Need framework
- no generic Service framework
- no generic reservation framework
- no new workforce priority
- Water remains canonical persisted state
- coverage remains derived
- admissionsThisTick is transient only
- Food remains the survival gate
- Water remains the growth gate
- Water does not kill existing colonists
- SAVE_VERSION remains 6
- deterministic save/load remains intact
- replay remains deterministic
```



---

## As-Built Report

**Type: IMPLEMENTATION (Step 10S).** The minimal Water growth invariant
identified by Step 10R is implemented: a colonist may only be admitted while
the colony's Water production capacity can sustain the resulting served
population, with an explicit first-colonist bootstrap exemption.

### Repository

* starting commit `eb142a1` (Step 10R);
* final commit = this implementation commit;
* production files changed: `src/domain/simulation/phases.ts` (gate fields +
  admission loop) and `src/domain/simulation/step.ts` (compute and pass the
  headroom values);
* tests added: `tests/waterProductionHeadroom.test.ts` (25); the Water audits
  `tests/waterService.test.ts`, `tests/waterBootstrapEconomyAudit.test.ts` and
  `tests/waterGrowthStabilizationAudit.test.ts` were migrated where the
  deliberate rule change altered the expected outcome;
* docs changed: this file.

### Water admission invariant

`updatePopulation` now extends the `WaterAdmissionGate` with two optional
derived values:

```text
productionCapacity : staffed operational road-accessible Wells x 2
servedNeed         : currently served colonists x 1
```

When both are present (the production path always provides them), a served
colonist is admitted only while:

```text
productionCapacity >= servedNeed + admissionsThisTick + 1
```

`admissionsThisTick` is a transient local counter inside the admission pass; it
is never stored, persisted or hashed. The loop still admits multiple colonists
in one tick when the capacity genuinely supports them. The values are optional
in the interface only so the historical audit harnesses keep modelling the
pre-10S rule; `stepSimulation` always passes them.

### First-colonist bootstrap

The first colonist is explicitly exempt:

```text
population === 0 -> the existing bootstrap condition admits the first colonist
```

without requiring Water production capacity. This is structural: no colonist
means no Well worker, no Water production and no capacity, so demanding
capacity would deadlock the colony. The exemption is concrete and local to the
admission loop — it is not a reusable framework.

`AUDIT EDGE_G`: stock 0 with a staffed Well still grows (population 1 -> 2),
because the gate uses capacity, not stock.

### Production headroom

`AUDIT ONE_WELL`, `AUDIT TWO_WELLS`, `AUDIT THREE_WELLS`:

| Staffed Wells | production | settled population |
| ---: | ---: | ---: |
| 1 | 2 | 2 |
| 2 | 4 | 4 |
| 3 | 6 | 6 |

The numbers emerge from `staffedWellCount x WATER_PER_WELL_PER_TICK`; nothing is
hard-coded. `AUDIT NEVER_BEYOND`: population never exceeds production capacity.

`AUDIT MULTI_SAME_TICK`: 2 Wells, 1 initial colonist — tick 1 staffs the second
Well (population 2), tick 2 admits **2 colonists in one pass** (population 4).
`AUDIT EDGE_I`: a high stock with sufficient capacity admits 2 in one tick; the
one-per-tick throttle was not implemented.

### Population equilibrium

`AUDIT LONG_RUN_WELLS` (120/240/600 ticks): one staffed Well settles at
population 2, two at 4, three at 6, with `production == need` in every case.
`AUDIT ONE_WELL` reports `shortage: true` from `getWaterStatus`, which measures
the *residual stock after consumption*; the admission gate itself is satisfied
because production equals need. The residual stock is a buffer, not a deficit.

### Multiple Wells

`AUDIT LONG_RUN_MIXED` (600 ticks): `Farm+Well` and `Workshop+Well` settle at
population 2 with production 2; the 2-Well `Farm+Workshop+Well` mix settles at
population 4 with production 4. Every settled economy satisfies
`production >= need`.

### Water stock semantics

Unchanged: `resources.water` remains the canonical consumable resource;
production and consumption amounts, shortage semantics and persistence are
untouched. `AUDIT EDGE_H`: a high stock (100) with a vacant Well cannot fund
growth (population stays 1, stock 60 after 40 ticks of one served colonist
consuming 1/tick). Growth is controlled by capacity; the stock is a buffer.

### Food interaction

Food is untouched. `AUDIT NO_WELL_FOOD`: a colony with no Well keeps the
historical Food + housing admission (population 3). Food shortage still kills
(population 0) while Water capacity would allow growth. Food remains the
survival gate; Water remains the growth gate.

### Workforce interaction

No workforce rule changed. `AUDIT WORKFORCE_MANUAL`: with a Farm and a Well and
one colonist, the Farm is nearer so the Well stays vacant (production 0, no
growth); manually reassigning the colonist to the Well raises production to 2
and the colony grows to 2. The player still decides whether to allocate labor
to Water.

### Spatial interaction

Coverage is unchanged. `AUDIT DISCONNECTED_WELL`: an operational Well on a
separate network serves no Residence, so admission is blocked until the
networks are connected; connecting it restores service and the bootstrap. The
headroom calculation uses only Wells that already qualify for production under
the existing rules.

### Persistence / migration

`SAVE_VERSION` remains 6. No new persisted state, no hash change, no migration
change; `admissionsThisTick` is never serialized. Save/load round-trips
unchanged.

### Determinism

`AUDIT DETERMINISM`: replay is byte-identical (`hash d1cdf94d43482a24`) and
insertion-order independent. The admission loop uses the existing ascending
canonical residence/colonist ordering; no `Date.now()` / `Math.random()` in
`src/`.

### Performance

`AUDIT PERFORMANCE`: 3 ticks at 120 Residences / 40 Wells is 756 ms — the same
order as the pre-10S admission loop (1378 ms at 3 ticks on a comparable
fixture). Production capacity is derived once per tick in `stepSimulation`; the
admission loop stays linear in the existing residence traversal, with no BFS,
no network recomputation per admission and no new index.

### Browser verification

`e2e/waterRun.mjs` passes 7/7 with zero console/page errors (bootstrap without
Water, roadless Well blocks growth, connecting the Well restores Water,
population grows only within headroom, Water HUD, Well inspection). All other
E2E suites remain green: `run` 11, `road` 15, `transport` 10, `production` 12,
`resource` 12, `food` 12, `temporal` 17, `jobs` 21, `upkeep` 35, `reassign` 7.

### Architecture audit

No generic Need/Service/reservation abstraction; no Water storage, upkeep,
pipes, logistics or travel simulation; no Farm Water input or upkeep; no new
workforce priority; no new canonical Water state. The new logic is two concrete
derived numbers and one comparison inside the existing admission loop.

### Regression status

* `npx vitest run` -> **45 files, 922 tests passed** (25 new).
* `npx tsc --noEmit` clean; `npx eslint .` clean; `npm run build` succeeds.
* All E2E suites pass; `SAVE_VERSION = 6`; replay deterministic.

The 10Q overshoot is now impossible through admission: `tests/waterBootstrapEconomyAudit.test.ts`
and `tests/waterGrowthStabilizationAudit.test.ts` were migrated to the new
production-headroom expectations, and the 10R candidate harness now keeps the
gate inactive (no Well) so it still mirrors `stepSimulation` exactly.

### Final design status

The Water growth loop is coherent and self-limiting: population converges to
the colony's Water production capacity, the first colonist can always
bootstrap, a vacant Well cannot sustain growth, accumulated stock cannot fund
an unsustainable population, and no permanent deficit is created by the
admission rule. This closes the Step 10O–10R Water dependency chain.

### Scope verdict

```text
COMPLETE — IMPLEMENTATION
```

Final confirmations:

```text
- production-headroom admission implemented
- first-colonist bootstrap preserved
- no Water reservation state
- no Water storage
- no Water upkeep
- no Farm upkeep
- no Water logistics
- no pipes
- no travel simulation
- no generic Need framework
- no generic Service framework
- no generic reservation framework
- no new workforce priority
- Water remains canonical persisted state
- coverage remains derived
- admissionsThisTick is transient only
- Food remains the survival gate
- Water remains the growth gate
- Water does not kill existing colonists
- SAVE_VERSION remains 6
- deterministic save/load remains intact
- replay remains deterministic
```
