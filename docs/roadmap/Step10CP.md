# NOVA — Step 10CP: Roadmap Re-entry & Next Phase Selection

## 1. Mission

Step 10CO concluded:

> FOUNDATION-READY

This means the current foundation is trustworthy enough to resume the broader NOVA roadmap. It does not mean NOVA is feature-complete.

The project has a substantially larger original vision than the currently implemented Village → Town foundation. The purpose of this step is to reconnect implementation with the actual long-term NOVA roadmap, identify the first real major roadmap phase that should now be implemented, and establish a concrete handoff for the next implementation step.

This is the transition point from **foundation validation** to **actual roadmap execution**.

## 2. Current implementation state

### What exists today (verified against source)

| System | Status | Evidence |
|---|---|---|
| World/grid | Implemented | 12×12 config, blocked cells (10AV) |
| Housing | Implemented | Residence buildings, capacity 1, admission |
| Colonists | Implemented | Identity, residence, workplace, assignment |
| Time/ticks | Implemented | Deterministic tick progression |
| Needs | Implemented | Food/Water/Material consumption |
| Production | Implemented | Farms (food 2/tick), Wells (water 2/cap), Workshops (material) |
| Workforce | Implemented | Job capacity, distance/ID assignment, reassignment |
| Roads/accessibility | Implemented | Networks, building inspection, operational state |
| Construction | Implemented | 2-tick build, construction crew |
| Storage | Implemented | Food 50 / Water 30 / Material 40 + 25 per workshop |
| Population growth | Implemented | Water-admission gate (10P/10S) |
| Town progression | Implemented | Staffed Workshop + Water capacity + Food balance |
| Scenarios | Implemented | 11 curated + 1 terrain fixture |
| Save/load | Implemented | Canonical hash, SAVE_VERSION 8 |
| Rendering | Implemented | Three.js WebGL2, entity views, responsive |
| UI | Implemented | HUD, inspection, progression panel, scenario select |

### What does NOT exist (verified)

| System | Status | Evidence |
|---|---|---|
| Money/income | **NOT implemented** | No `income` field on colonist, no wage system, Material is only currency |
| Production economy (Phase 8) | **NOT implemented** | No market/price/demand loops |
| Transport simulation (Phase 9) | **NOT implemented** | Roads = accessibility only, no movement/logistics |
| Settlement growth (Phase 10) | **DEFERRED** | 10CL/10CM found no mechanism without speculation |
| Technology (Phase 12) | **NOT implemented** | No tech tree or unlock systems |
| Vehicles (Phase 11) | **NOT implemented** | No transport demand justifies them |

## 3. Original roadmap reconstruction

From `docs/26-roadmap.md`:

```text
Phase 0 — Foundation reset        ✅ COMPLETE (Steps 09A–10CO)
Phase 1 — Housing → Colonist      ✅ COMPLETE
Phase 2 — Time / simulation       ✅ COMPLETE
Phase 3 — Needs                   ✅ COMPLETE (Food/Water/Material)
Phase 4 — First production flow   ✅ COMPLETE (Farm food, Well water)
Phase 5 — Additional service      ✅ COMPLETE (Workshop material)
Phase 6 — Work                    ✅ COMPLETE (Workplace, assignment)
Phase 7 — Money / affordability   ❌ NOT IMPLEMENTED
Phase 8 — Production economy      ❌ NOT IMPLEMENTED
Phase 9 — Transport               ❌ NOT IMPLEMENTED
Phase 10 — Settlement growth      ⏸ DEFERRED (10CL/10CM)
Phase 11 — Vehicles               ❌ NOT IMPLEMENTED
Phase 12 — Technology             ❌ NOT IMPLEMENTED
Phase 13+ — Original systems      ❌ NOT IMPLEMENTED
```

Dependency rule preserved (`docs/21-simulation-progression.md`): "A later system may not become a prerequisite of an earlier system unless the earlier system has explicitly been revised."

## 4. Vision reconstruction

From product/design docs:

**Core identity**: `deterministic contemplative colony optimizer focused on constrained planning, settlement development, and authored progression`

**Original promise** (`docs/01-product-vision.md`):
> "NOVA is a visual colony/city simulator where a small number of understandable rules produce believable settlement growth."

**Foundation loop** (`docs/02-game-design.md`, `docs/03-core-loop.md`):
```text
PLAYER ACTION → INFRASTRUCTURE → CAPACITY/SERVICE → COLONIST NEED
  → CONSUMPTION/SATISFACTION → BEHAVIOR/WORK → PRODUCTION
  → ECONOMIC ACTIVITY → NEW DEMAND → PLAYER ACTION
```

**Future state** (`docs/08-economy.md`, `docs/09-economy-foundation.md`):
```text
household → labor → income → consumption
business/industry → goods/service → revenue
infrastructure → capacity → maintenance cost
```

**Strategy layer** (`docs/20-strategy.md`):
> "The player should eventually decide between competing uses of limited: land, money, labor, energy, materials, transport capacity, time."

## 5. Foundation boundary

The completed foundation provides:

- A deterministic simulation engine with verified invariants
- A playable chain from Wilderness through Town
- 11 authored scenarios covering the full current capability
- A clean architecture (domain/application/rendering separation)
- Contract coverage (freeze, hardening, determinism suites)
- Release readiness (build, E2E, GPU, responsive, a11y baseline)
- Explicitly frozen contracts (10BZ) and verified boundaries (10CF)

The foundation is intentionally minimal: no growth mechanic, no world/external context, no post-Town systems. The void is documented and justified by evidence, not oversight.

## 6. Missing roadmap capability

**Phase 7 — Money / affordability** is the first major roadmap phase that remains unimplemented.

Why this specific phase:
1. It is explicitly listed as Phase 7 in the authoritative roadmap (`docs/26-roadmap.md:57-66`)
2. Its prerequisites are fully satisfied:
   - Work exists (Phase 6) — colonists have workplaces
   - Production exists (Phases 4-5) — Farms, Wells, Workshops produce
   - Consumption exists (Phase 3) — colonists need Food, Water, Material
   - Construction exists (Phase 0/4) — buildings cost Material
3. It follows the documented causal order without skipping phases
4. No earlier phase has unmet prerequisites blocking it
5. It connects to the strategy layer (`docs/20-strategy.md` — money as a limited resource)
6. It is consistent with the product vision (believable settlement growth requires economic complexity)

## 7. Why this is the next roadmap boundary

### Relationship to documented vision

The economy docs (`docs/08-economy.md`, `docs/09-economy-foundation.md`) explicitly describe `household → labor → income → consumption` as the minimal future model. Phase 7 is the first step toward that model.

### Relationship to current foundation

Money transforms the current direct exchange model:
- Current: colonist works → production directly satisfies need
- With money: colonist works → earns income → spends income on goods/services

This introduces a new causal dimension (economic medium) without breaking existing ones.

### Relationship to roadmap ordering

Phase 7 is prerequisite for:
- Phase 8 (Production economy: prices, markets, demand signals)
- Phase 9 (Transport: movement has cost)
- Phase 10 (Settlement growth: wealth enables expansion)

It cannot be skipped without violating the dependency rule.

### Relationship to player experience

Money adds a new decision axis:
- Where to spend limited income
- How to prioritize consumption vs savings
- Which services to afford when multiple compete

This deepens the contemplative optimization without adding complexity for its own sake.

## 8. First implementation step

**Target**: A minimal, deterministic income mechanism that proves money as a causal dimension without introducing speculative systems.

### Player-facing behavior

When a colonist works at a Farm, Well, or Workshop, they earn a small, fixed amount of Material per tick (reusing the existing Material resource as the initial currency). The income is visible in the building inspection or a new compact HUD line. No UI redesign required — the income appears as a derived fact about the workforce.

### Affected domain concepts

- `ColonistState`: add `readonly materialIncome: number` (computed, not persisted initially — or persisted if it affects hashing)
- `phases.ts`: in the work phase, credit Material to employed colonists
- `resource.ts`: existing Material flows already handle accumulation

### Affected application layer

- `queries/inspection.ts`: add material income to building/colonist inspection
- `queries/resources.ts`: expose total workforce income as a derived stat
- `main.ts`: display in existing HUD line (minimal addition)

### Rendering/UI implications

- Building inspection panel: show worker income
- HUD: one new number (total workforce income per tick)
- No new panels, no new controls

### Persistence implications

- `SAVE_VERSION`: remains 8 (no new persisted field — income is derived from existing workforce state)
- Hash: unchanged (no canonical state change)

### Testing requirements

- Unit: income calculation correct for each workplace type
- Unit: zero income for unemployed colonists
- Unit: income stops when workplace is inaccessible or under construction
- E2E: verify income visible in inspection, HUD, and persists through save/load
- Determinism: identical sequences produce identical income

### Deterministic requirements

- Fixed rates per workplace type (not random)
- Sorted iteration order preserved
- No new sources of non-determinism

## 9. Dependency map

### Systems that can be reused

| System | Reuse | Notes |
|---|---|---|
| ColonistState | Extend | Add income field |
| Workplace types | Read | Determine rate per type |
| Workforce assignment | Read | Only employed colonists earn |
| Material resource | Reuse | Initial currency |
| Save/load | Extend | Persist new field |
| Hashing | Extend | Include new field |
| Inspection UI | Extend | Show income |
| HUD | Extend | One new line |

### Systems that must change

| System | Change | Reason |
|---|---|---|
| Simulation phases | Add income step | Credit earned Material |
| ColonistState interface | Add field | Persistent income |
| Save format | Version check | Migration path |

### Systems that do NOT change

- Production coefficients (unchanged)
- Consumption rules (unchanged)
- Town progression (unchanged)
- Road/accessibility (unchanged)
- Building catalog (unchanged)
- World config (unchanged)
- Rendering architecture (unchanged)

## 10. Scope boundary

### What this step WILL NOT do

- Introduce prices or markets (Phase 8)
- Add new resources beyond reusing Material
- Create wealth differentiation between colonists (all earn same rate)
- Add spending mechanics (only earning)
- Change any existing simulation rule
- Modify Town progression conditions
- Add new buildings or resource types
- Introduce transport or movement
- Add technology or progression stages
- Redesign the UI beyond one new HUD line and inspection field
- Change SAVE_VERSION unless absolutely necessary

### What this step IS

The smallest coherent step that establishes Money as a causal dimension in the simulation — proving the pattern before expanding it.

## 11. Success criteria

The first implementation step is complete when:

1. Every employed colonist earns a fixed, deterministic amount of Material per tick (source code visible rate)
2. Unemployed colonists earn zero
3. Inaccessible or under-construction workplaces produce zero income
4. The income is visible in the building inspection panel
5. The total workforce income appears in the HUD
6. Save/load preserves income state correctly
7. Hash remains stable across equivalent sequences
8. Full Vitest passes (existing tests + new income tests)
9. Typecheck and lint pass
10. Browser E2E passes (scenario flow + income visible)
11. No existing gameplay rule changed

## 12. Validation plan

### Tests

- Focused income tests (per-workplace rates, zero-income edge cases, accessibility gating)
- Save/load roundtrip with income state
- Hash stability with income
- Existing compatibility suites (no regression)

### Browser

- Scenario flow verification (all 11 scenarios still complete)
- Income visible in inspection for staffed buildings
- HUD shows total income
- Responsive: no overflow at 360×640

### GPU

- Existing GPU regression (no rendering change expected)

### Full suite

- Vitest: full pass
- Typecheck: PASS
- Lint: PASS
- Build: PASS

## 13. Next-step handoff

**Next step title**: `Step 10CQ: Material as Currency — Minimal Income Mechanism`

**Implementation brief**:

1. Add `materialIncome` field to `ColonistState` (number, derived from workplace type)
2. In `phases.ts` work phase, after assignment, credit each employed colonist with their workplace's income rate
3. Define rates in a central constant file (e.g., `FARM_INCOME = 1`, `WELL_INCOME = 1`, `WORKSHOP_INCOME = 2`)
4. Update `inspection.ts` to show income per worker in building inspection
5. Update `resources.ts` or `main.ts` HUD to show total workforce income
6. Update save/load to persist the new field
7. Update hash canonicalization
8. Add focused tests
9. Verify full suite passes
10. Commit with message: `Step 10CQ: Material as Currency — Minimal Income Mechanism`

**Design constraints**:
- No spending system (Phase 7 part 2 deferred)
- No price variation (fixed rates only)
- No wealth differentiation (all workers same rate)
- No new resource (reuse Material)
- No UI redesign (additive only)

**Explicit non-goals**:
- Market mechanics
- Consumer choice
- Demand signals
- Savings/investment
- Poverty/wealth gap

**Expected outcome**: A working proof that Money as a causal dimension is viable without speculative complexity. Phase 8 (production economy) builds on this foundation.

---

# Documentation (as-built)

## 0. Baseline and method

- HEAD at execution: `d4357ad` (Step 10CO), worktree clean, zero code changes during gate.
- Roadmap document read: `docs/26-roadmap.md` (authoritative, 13 phases).
- Supporting docs read: `docs/01-product-vision`, `02-game-design`, `03-core-loop`, `04-city-simulation`, `07-population`, `08-economy`, `09-economy-foundation`, `20-strategy`, `21-simulation-progression`, `23-product-contract`.
- Source inspection: `src/domain/population/colonist.ts` (no income field), `src/domain/simulation/phases.ts` (work phase, no income step), `src/application/queries/inspection.ts`, `src/index.ts` barrel exports.
- No runtime code changed. No tests added (design gate, not implementation).
- User-owned files confirmed present and untouched: `docs/roadmap/Step10BO - Copy.md`, `docs/roadmap/Step10BT1.md`.

## 1. Mission (recap)

Foundation validation complete (10CO). This gate reconnects to the broader roadmap and identifies the first major unimplemented phase with a concrete handoff.

## 2. Current implementation state

### Implemented (verified in source)

| System | Implementation |
|---|---|
| World/grid | 12×12 config, blocked cells (`world/grid.ts`) |
| Housing | Residence, capacity 1, admission (`housing/housing.ts`) |
| Colonists | Identity, residence, workplace, assignment mode (`population/colonist.ts`) |
| Time/ticks | Deterministic progression (`simulation/state.ts`) |
| Needs | Food/Water/Material consumption (`simulation/phases.ts:819-900`) |
| Production | Farms (food 2/tick), Wells (water 2/cap), Workshops (material) (`resource/resource.ts`) |
| Workforce | Job capacity, distance/ID assignment, reassignment (`simulation/phases.ts`, `jobs/jobs.ts`) |
| Roads/accessibility | Networks, building inspection (`network/network.ts`, `road/road.ts`) |
| Construction | 2-tick build, crew (`simulation/phases.ts:372-430`) |
| Storage | Food 50 / Water 30 / Material 40+25 per workshop (`storage/storage.ts`) |
| Population growth | Water-admission gate (10P/10S) (`simulation/phases.ts:1006-1080`) |
| Town progression | Staffed Workshop + Water + Food (`progression/progression.ts:142-160`) |
| Scenarios | 11 curated + 1 terrain fixture (`scenarios.ts`) |
| Save/load | Canonical hash, SAVE_VERSION 8 (`persistence/save.ts`) |
| Rendering | Three.js WebGL2, entity views (`renderer/three/`) |
| UI | HUD, inspection, progression, scenario select (`app/main.ts`) |

### NOT implemented (verified absent)

| System | Evidence |
|---|---|
| Money/income | No `income` field on `ColonistState`; Material is only currency |
| Production economy | No price/demand/market system |
| Transport simulation | Roads = accessibility only, no movement/logistics |
| Settlement growth | DEFERRED (10CL/10CM) |
| Technology | No tech tree or unlock systems |
| Vehicles | Not started |

## 3. Original roadmap reconstruction

From `docs/26-roadmap.md`:

```text
Phase 0 — Foundation reset        ✅ COMPLETE (Steps 09A–10CO)
Phase 1 — Housing → Colonist      ✅ COMPLETE
Phase 2 — Time / simulation       ✅ COMPLETE
Phase 3 — Needs                   ✅ COMPLETE
Phase 4 — First production flow   ✅ COMPLETE
Phase 5 — Additional service      ✅ COMPLETE
Phase 6 — Work                    ✅ COMPLETE
Phase 7 — Money / affordability   ❌ FIRST UNIMPLEMENTED MAJOR PHASE
Phase 8 — Production economy      ❌ FUTURE
Phase 9 — Transport               ❌ FUTURE
Phase 10 — Settlement growth      ⏸ DEFERRED (10CL/10CM)
Phase 11 — Vehicles               ❌ FUTURE
Phase 12 — Technology             ❌ FUTURE
Phase 13+ — Original systems      ❌ FUTURE
```

Dependency rule (`docs/21-simulation-progression.md`): "A later system may not become a prerequisite of an earlier system unless the earlier system has explicitly been revised."

## 4. Vision reconstruction

**Core identity**: deterministic contemplative colony optimizer focused on constrained planning, settlement development, and authored progression.

**Original promise**: believable settlement growth from small number of understandable rules.

**Foundation loop**: player action → infrastructure → capacity/service → colonist need → consumption/satisfaction → behavior/work → production → economic activity → new demand → player action.

**Future model**: `household → labor → income → consumption` / `business → goods/service → revenue` / `infrastructure → capacity → maintenance cost`.

**Strategy layer**: competing uses of limited land, money, labor, energy, materials, transport capacity, time.

## 5. Foundation boundary

The completed foundation provides:
- Deterministic simulation engine with verified invariants
- Playable chain Wilderness → Town with 11 authored scenarios
- Clean architecture (domain/application/rendering separation)
- Contract coverage (freeze, hardening, determinism suites)
- Release readiness (build, E2E, GPU, responsive, a11y baseline)
- Explicitly frozen contracts (10BZ) and verified boundaries (10CF)

The void (no growth, no world, no post-Town) is documented and justified by evidence.

## 6. Missing roadmap capability

**Phase 7 — Money / affordability** is the first unimplemented major phase.

Justification:
1. Explicitly listed as Phase 7 in authoritative roadmap
2. Prerequisites satisfied: work (Phase 6), production (Phases 4-5), consumption (Phase 3), construction (Phase 0)
3. Follows documented causal order without skipping
4. Connects to strategy layer (money as limited resource)
5. Consistent with product vision (believable growth requires economic complexity)

## 7. Why this is the next roadmap boundary

### To documented vision
Economy docs describe `household → labor → income → consumption` as minimal future model. Phase 7 is the first step.

### To current foundation
Money transforms direct exchange (worker → production → need satisfied) into mediated exchange (worker → income → spend on goods). New causal dimension without breaking existing ones.

### To roadmap ordering
Prerequisite for Phases 8 (production economy), 9 (transport), 10 (growth, when reopened). Cannot skip without violating dependency rule.

### To player experience
Adds decision axis: where to spend limited income, prioritize consumption vs savings, afford services when multiple compete. Deepens optimization without adding complexity for its own sake.

## 8. First implementation step defined

**Name**: Minimal income mechanism establishing Money as causal dimension.

**Behavior**: Employed colonists earn fixed Material per tick from their workplace. Income visible in inspection and HUD. No spending, no prices, no differentiation.

**Scope**: Extend `ColonistState` with income field; add income credit step in work phase; update inspection and HUD; preserve SAVE_VERSION 8 if possible.

**Non-goals**: No markets, no prices, no consumer choice, no wealth gap, no new resources, no UI redesign.

## 9. Dependency map

### Reusable
ColonistState (extend), Workplace types (read rates), Workforce assignment (read employed), Material resource (reuse as currency), Save/load (extend), Hashing (extend), Inspection UI (extend), HUD (extend).

### Must change
Simulation phases (add income step), ColonistState interface (add field), Save format (version check if new field persisted).

### Unchanged
Production coefficients, consumption rules, Town progression, road/accessibility, building catalog, world config, rendering architecture.

## 10. Scope boundary

### Will not do
- Prices or markets (Phase 8)
- New resources beyond reusing Material
- Wealth differentiation
- Spending mechanics
- Any existing rule change
- Town progression modification
- New buildings
- Transport/movement
- Technology/progression stages
- UI redesign
- SAVE_VERSION change unless required

### Will do
Smallest coherent proof that Money is a viable causal dimension.

## 11. Success criteria

1. Every employed colonist earns fixed deterministic Material/tick
2. Unemployed earn zero
3. Inaccessible/under-construction workplaces produce zero
4. Income visible in building inspection
5. Total workforce income in HUD
6. Save/load preserves state
7. Hash stable
8. Full Vitest passes
9. Typecheck/lint pa

---

# Documentation (as-built)

## 0. Baseline and method

- HEAD at execution: `d4357ad` (Step 10CO), worktree clean, zero code changes during gate.
- Roadmap document read: `docs/26-roadmap.md` (authoritative, 13 phases).
- Supporting docs read: `docs/01-product-vision`, `02-game-design`, `03-core-loop`, `04-city-simulation`, `07-population`, `08-economy`, `09-economy-foundation`, `20-strategy`, `21-simulation-progression`, `23-product-contract`.
- Source inspection: `src/domain/population/colonist.ts` (no income field), `src/domain/simulation/phases.ts` (work phase, no income step), `src/application/queries/inspection.ts`, `src/index.ts` barrel exports.
- No runtime code changed. No tests added (design gate, not implementation).
- User-owned files confirmed present and untouched: `docs/roadmap/Step10BO - Copy.md`, `docs/roadmap/Step10BT1.md`.

## 1. Mission (recap)

Foundation validation complete (10CO). This gate reconnects to the broader roadmap and identifies the first major unimplemented phase with a concrete handoff.

## 2. Current implementation state

### Implemented (verified in source)

| System | Status |
|---|---|
| World/grid | 12×12, blocked cells |
| Housing | Residence, capacity 1, admission |
| Colonists | Identity, residence, workplace, assignment |
| Time/ticks | Deterministic progression |
| Needs | Food/Water/Material consumption |
| Production | Farms, Wells, Workshops |
| Workforce | Job capacity, assignment, reassignment |
| Roads/accessibility | Networks, building inspection |
| Construction | 2-tick build, crew |
| Storage | Food 50 / Water 30 / Material 40+25/workshop |
| Population growth | Water-admission gate (10P/10S) |
| Town progression | Staffed Workshop + Water + Food |
| Scenarios | 11 curated + 1 terrain fixture |
| Save/load | Canonical hash, SAVE_VERSION 8 |
| Rendering | Three.js WebGL2, responsive |
| UI | HUD, inspection, progression, scenario select |

### NOT implemented (verified absent)

| System | Status |
|---|---|
| Money/income | No income field on ColonistState |
| Production economy | No market/price/demand |
| Transport simulation | Roads = accessibility only |
| Settlement growth | DEFERRED (10CL/10CM) |
| Technology | No tech tree |
| Vehicles | Not started |

## 3. Original roadmap reconstruction

From `docs/26-roadmap.md`:

```text
Phase 0 — Foundation reset        ✅ COMPLETE (Steps 09A–10CO)
Phase 1 — Housing → Colonist      ✅ COMPLETE
Phase 2 — Time / simulation       ✅ COMPLETE
Phase 3 — Needs                   ✅ COMPLETE
Phase 4 — First production flow   ✅ COMPLETE
Phase 5 — Additional service      ✅ COMPLETE
Phase 6 — Work                    ✅ COMPLETE
Phase 7 — Money / affordability   ❌ FIRST UNIMPLEMENTED MAJOR PHASE
Phase 8 — Production economy      ❌ FUTURE
Phase 9 — Transport               ❌ FUTURE
Phase 10 — Settlement growth      ⏸ DEFERRED (10CL/10CM)
Phase 11 — Vehicles               ❌ FUTURE
Phase 12 — Technology             ❌ FUTURE
Phase 13+ — Original systems      ❌ FUTURE
```

Dependency rule preserved: "A later system may not become a prerequisite of an earlier system unless the earlier system has explicitly been revised."

## 4. Vision reconstruction

**Core identity**: deterministic contemplative colony optimizer focused on constrained planning, settlement development, and authored progression.

**Original promise**: believable settlement growth from small number of understandable rules.

**Foundation loop**: player action → infrastructure → capacity/service → colonist need → consumption/satisfaction → behavior/work → production → economic activity → new demand → player action.

**Future model**: `household → labor → income → consumption` / `business → goods/service → revenue`.

**Strategy layer**: competing uses of limited land, money, labor, energy, materials, transport capacity, time.

## 5. Foundation boundary

The completed foundation provides:
- Deterministic simulation engine with verified invariants
- Playable chain Wilderness → Town with 11 authored scenarios
- Clean architecture (domain/application/rendering separation)
- Contract coverage (freeze, hardening, determinism suites)
- Release readiness (build, E2E, GPU, responsive, a11y baseline)
- Explicitly frozen contracts (10BZ) and verified boundaries (10CF)

The void (no growth, no world, no post-Town) is documented and justified by evidence.

## 6. Missing roadmap capability

**Phase 7 — Money / affordability** is the first unimplemented major phase.

Justification:
1. Explicitly listed as Phase 7 in authoritative roadmap
2. Prerequisites satisfied: work (Phase 6), production (Phases 4-5), consumption (Phase 3), construction (Phase 0)
3. Follows documented causal order without skipping
4. Connects to strategy layer (money as limited resource)
5. Consistent with product vision (believable growth requires economic complexity)

## 7. Why this is the next roadmap boundary

### To documented vision
Economy docs describe `household → labor → income → consumption` as minimal future model. Phase 7 is the first step.

### To current foundation
Money transforms direct exchange (worker → production → need satisfied) into mediated exchange (worker → income → spend on goods). New causal dimension without breaking existing ones.

### To roadmap ordering
Prerequisite for Phases 8 (production economy), 9 (transport), 10 (growth, when reopened). Cannot skip without violating dependency rule.

### To player experience
Adds decision axis: where to spend limited income, prioritize consumption vs savings, afford services when multiple compete. Deepens optimization without adding complexity for its own sake.

## 8. First implementation step defined

**Name**: Minimal income mechanism establishing Money as causal dimension.

**Behavior**: Employed colonists earn fixed Material per tick from their workplace. Income visible in inspection and HUD. No spending, no prices, no differentiation.

**Scope**: Extend `ColonistState` with income field; add income credit step in work phase; update inspection and HUD; preserve SAVE_VERSION 8 if possible.

**Non-goals**: No markets, no prices, no consumer choice, no wealth gap, no new resources, no UI redesign.

## 9. Dependency map

### Reusable
ColonistState (extend), Workplace types (read rates), Workforce assignment (read employed), Material resource (reuse as currency), Save/load (extend), Hashing (extend), Inspection UI (extend), HUD (extend).

### Must change
Simulation phases (add income step), ColonistState interface (add field), Save format (version check if new field persisted).

### Unchanged
Production coefficients, consumption rules, Town progression, road/accessibility, building catalog, world config, rendering architecture.

## 10. Scope boundary

### Will not do
- Prices or markets (Phase 8)
- New resources beyond reusing Material
- Wealth differentiation
- Spending mechanics
- Any existing rule change
- Town progression modification
- New buildings
- Transport/movement
- Technology/progression stages
- UI redesign
- SAVE_VERSION change unless required

### Will do
Smallest coherent proof that Money is a viable causal dimension.

## 11. Success criteria

1. Every employed colonist earns fixed deterministic Material/tick
2. Unemployed earn zero
3. Inaccessible/under-construction workplaces produce zero
4. Income visible in building inspection
5. Total workforce income in HUD
6. Save/load preserves state
7. Hash stable
8. Full Vitest passes
9. Typecheck/lint pass
10. Browser E2E passes
11. No gameplay rule changed

## 12. Validation plan

- Focused income tests (rates, zero-income, accessibility gating)
- Save/load roundtrip
- Hash stability
- Existing compatibility suites
- Browser: scenario flow, income visibility, responsive
- GPU: existing regression
- Full suite, typecheck, lint, build

## 13. Next-step handoff

**Next step**: `Step 10CQ: Material as Currency — Minimal Income Mechanism`

**Implementation brief**:
1. Add `materialIncome` to `ColonistState` (number)
2. In `phases.ts` work phase, credit each employed colonist workplace rate
3. Define rates: `FARM_INCOME = 1`, `WELL_INCOME = 1`, `WORKSHOP_INCOME = 2`
4. Update `inspection.ts` to show per-worker income
5. Update HUD to show total workforce income
6. Persist via save/load
7. Hash canonicalization
8. Focused tests
9. Verify full suite
10. Commit: `Step 10CQ: Material as Currency — Minimal Income Mechanism`

**Design constraints**: No spending, no prices, no differentiation, reuse Material, additive UI only.

**Explicit non-goals**: Markets, consumer choice, demand signals, savings, poverty/wealth gap.

**Expected outcome**: Proof that Money as causal dimension is viable without speculative complexity. Phase 8 builds on this.

## Final verification

- Roadmap read: `docs/26-roadmap.md` ✅
- Phases 0-6 verified implemented ✅
- Phase 7 verified absent ✅
- Prerequisites for Phase 7 verified satisfied ✅
- Handoff brief concrete and actionable ✅
- No implementation attempted ✅
- No scope creep ✅
- SAVE_VERSION remains 8 (unchanged) ✅
- Worktree clean ✅
- User-owned files untouched ✅
