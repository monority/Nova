# Step 10AD — Workshop Water Construction Cost Implementation

## Starting state

Repository:

* commit `2bb7c6f` — Step 10AC
* Step 10AC identified exactly one **A implementation candidate**:

  * Workshop-only one-off Water construction cost
  * `25 Material + 1 Water`
* `src/` currently contains no implementation of this rule.
* SAVE_VERSION remains `7`.

Implement only this concrete rule.

---

# 1. Exact contract

Change the Workshop construction contract from:

```text
Workshop = 25 Material
```

to:

```text
Workshop = 25 Material + 1 Water
```

The Water payment is:

* one-off;
* charged when the Workshop placement command is accepted;
* part of the same atomic placement transaction;
* never consumed during Workshop operation;
* never consumed per tick;
* never refunded;
* not persisted as separate state.

Farm, Residence, Well and Road costs remain unchanged.

Exact costs:

```text
Residence = 25 Material
Farm      = 25 Material
Workshop  = 25 Material + 1 Water
Well      = 25 Material
Road      = 5 Material
```

Do not change any other economy rule.

---

# 2. Placement transaction

Use the existing authoritative Workshop placement validation.

Required behavior:

### Sufficient resources

```text
Material >= 25
Water >= 1
```

Placement succeeds and atomically deducts:

```text
Material -= 25
Water -= 1
```

### Insufficient Water

```text
Water < 1
```

Placement is rejected.

State must remain byte-for-byte unchanged:

* Material unchanged;
* Water unchanged;
* no building created;
* no construction ID consumed;
* no hash change;
* no partial mutation.

### Insufficient Material

Existing behavior remains unchanged.

### Both insufficient

Existing invalid-command/no-op semantics remain unchanged.

Do not introduce a separate resource transaction abstraction.

---

# 3. Important semantic boundary

The Water cost belongs to **construction placement**, not construction completion.

Therefore:

```text
place Workshop
  ↓
pay 25 Material + 1 Water
  ↓
constructionRemaining = 2
  ↓
construction progresses normally
```

Construction Crew remains:

```text
normal = +1 progress/tick
crewed = +2 progress/tick
```

The Water cost does not alter construction duration.

---

# 4. No operational Water consumption

After placement:

```text
Workshop operational
→ produces Material according to existing rules
→ pays existing Material upkeep
→ consumes ZERO Water
```

Explicit regression tests must prove that a Workshop cannot drain Water merely by operating.

This is a **construction dependency**, not `Workshop ← Water/tick`.

---

# 5. Preserve existing bootstrap

The Well remains:

```text
25 Material
```

and requires no Water.

Therefore the existing bootstrap remains:

```text
Residence
→ colonist
→ Well
→ Water
→ Workshop
```

With one staffed Well:

```text
Water production = 2/tick
Water admission = 1/served colonist/tick
Workshop construction = 1 Water one-off
```

Do not modify the Water admission gate.

Do not modify Food.

Do not modify population admission.

---

# 6. Construction Crew interaction

Preserve the Step 10Y/10Z behavior.

Test:

### No crew

```text
Workshop construction:
2 ticks
```

### Crew

```text
Workshop construction:
1 tick
```

The Water payment occurs once at placement in both cases.

With a spare colonist, verify the measured causal chain remains:

```text
Well production
→ earlier Water availability
→ Workshop placement
→ faster Workshop completion with crew
→ earlier Workshop production
```

Do not add any new crew behavior.

---

# 7. Existing economy must remain unchanged

Do not change:

* Farm production;
* Workshop gross Material production;
* Workshop Material upkeep;
* Material storage cap;
* Well production;
* Water production;
* Water consumption;
* Food production;
* Food consumption;
* population loss;
* population admission;
* workforce assignment;
* manual workplace assignment;
* roads;
* mobility;
* network derivation.

The only new economic rule is:

```text
Workshop placement consumes 1 Water.
```

---

# 8. Persistence

SAVE_VERSION stays:

```text
7
```

No migration.

No new persisted field.

The Water stock is already canonical and hashed, so the existing Water value naturally reflects the Workshop placement deduction.

Verify:

* save/load after Workshop placement;
* hash changes when Water is deducted;
* hash is identical after save/load;
* insertion-order independence remains true;
* deterministic replay remains true.

Do not modify save schema.

---

# 9. UI

Update the existing construction UI only.

Workshop cost must visibly communicate:

```text
25 Material
1 Water
```

Do not introduce a new economy panel.

When Water is insufficient, show the existing style of causal invalid-placement feedback, e.g. a reason equivalent to:

```text
Workshop requires 1 Water
```

Use the repository's existing validation/reason rendering conventions.

Do not hardcode a second independent affordability rule in the renderer.

The domain command remains authoritative.

---

# 10. Tests

Add focused implementation coverage for:

### Placement

* Workshop with Material ≥25 and Water ≥1 succeeds.
* Material decreases by 25.
* Water decreases by 1.

### Rejection

* Water 0 rejects.
* Material 0 rejects.
* both insufficient rejects.
* rejected command mutates nothing.

### Isolation

* Farm unaffected.
* Residence unaffected.
* Well unaffected.
* Road unaffected.

### Operation

* operational Workshop does not consume Water.
* existing Material production remains correct.
* existing Material upkeep remains correct.

### Crew

* no crew = 2 construction ticks;
* crew = 1 construction tick;
* both pay exactly one Water;
* crew does not create extra Water consumption.

### Water economy

* one Workshop payment can coexist with normal Water admission.
* Water admission rules remain unchanged.
* Water never becomes negative.

### Persistence

* save/load stable;
* canonical hash stable;
* insertion order stable;
* replay deterministic.

---

# 11. Regression scenarios

Re-run the important historical cases affected by the new cost.

Especially:

### Bootstrap

```text
Residence
→ Well
→ Water
→ Workshop
```

### Workshop before sufficient Water

Workshop placement must fail cleanly.

### Workshop after Water production

Placement succeeds.

### Multiple Workshops

Each placement costs exactly:

```text
1 Water
```

No per-tick Water multiplication.

### Manual workforce

Workshop reassignment remains unchanged.

### Construction Crew

Workshop can be crewed exactly as before.

---

# 12. Audit fixture migration

Step 10AC established the new rule.

Any historical tests/fixtures that intentionally construct a Workshop with:

```text
Water = 0
```

must be reviewed.

Do not weaken tests.

Migrate fixtures to provide the required Water when the scenario intends a successful Workshop placement.

If a historical fixture is specifically testing zero-Water construction, convert it into an explicit rejection test.

Document meaningful migrations.

---

# 13. Architecture constraints

Do NOT create:

* `InputSystem`
* `ProductionInputSystem`
* `ConstructionCostSystem`
* `ResourceTransactionSystem`
* `DependencySystem`
* `RecipeSystem`
* `WaterCostSystem`
* generic building-cost abstraction
* generic producer framework

Use the existing concrete building placement validation and cost logic.

The desired implementation should be a small extension of the existing Workshop construction contract.

---

# 14. Verification protocol

Run in order:

1. inspect current placement validation;
2. implement Workshop Water cost;
3. focused Workshop/Water tests;
4. migrate affected historical fixtures;
5. full Vitest;
6. typecheck;
7. lint;
8. build;
9. browser E2E;
10. GPU/browser E2E;
11. deterministic replay;
12. save/load;
13. insertion-order independence;
14. inspect `git diff`;
15. confirm no unrelated changes.

Specifically verify:

```text
git diff -- src/
```

contains only the intended implementation changes.

---

# 15. Final QA report

Return:

```text
STEP 10AD — COMPLETE

Starting commit:
Final commit:

RULE:
Workshop = 25 Material + 1 Water, one-off at placement.

IMPLEMENTATION:
...

PERSISTENCE:
SAVE_VERSION:
migration:
hash:

ECONOMY:
Workshop placement Water:
Workshop operational Water:
Workshop production:
Workshop upkeep:

BOOTSTRAP:
...

CONSTRUCTION CREW:
...

UI:
...

FOCUSED TESTS:
...

FULL TESTS:
...

TYPECHECK:
...

LINT:
...

BUILD:
...

BROWSER:
...

GPU:
...

DETERMINISM:
...

SAVE/LOAD:
...

INSERTION ORDER:
...

REGRESSIONS:
...

ARCHITECTURE:
...

UNRELATED CHANGES:
...

FINAL STATUS:
...
```

## Acceptance criteria

Step 10AD is complete only if all are true:

* Workshop costs exactly `25 Material + 1 Water`;
* Water is deducted atomically at placement;
* insufficient Water rejects without mutation;
* Farm/Residence/Well/Road costs are unchanged;
* Workshop operation consumes no Water;
* Workshop production/upkeep unchanged;
* Construction Crew behavior unchanged;
* Water admission unchanged;
* Food unchanged;
* SAVE_VERSION remains 7;
* no migration introduced;
* no new persisted state;
* UI communicates the new cost;
* domain validation remains authoritative;
* full test suite passes;
* typecheck/lint/build pass;
* browser E2E passes;
* GPU E2E passes;
* determinism/save-load/insertion-order pass;
* no generic framework introduced;
* no unrelated refactor.

The implementation should remain deliberately small.

The important design property is:

```text
Water
  ↓ one-off construction investment
Workshop
  ↓
Material economy
```

rather than:

```text
Water
  ↓ every tick
Workshop
```

This preserves the bootstrap and creates the first concrete Water-vs-expansion tradeoff without introducing another permanent resource drain.


---

## Partial implementation report (Step 10AD — INCOMPLETE)

**Status: the domain rule is implemented, unit-verified and committed in the
working tree; the browser E2E scenario migration is NOT finished.** Six browser
suites (`jobs`, `upkeep`, `road`, `transport`, `resource`, `food`) still contain
scenarios written for the pre-10AD cost structure and fail at their first
Workshop placement. See "Remaining work" below — this section must be kept with
the step until those suites are migrated.

### Rule (implemented)

```text
Workshop = 25 Material + 1 Water   (one-off, at placement)
Residence / Farm / Well / Road     unchanged
```

* `src/domain/building/building.ts` — `BuildingDefinition.constructionWaterCost`
  (0 for Residence/Farm/Well, 1 for Workshop). The construction contract stays a
  concrete catalog property, not a cost abstraction.
* `src/domain/simulation/phases.ts` — `validatePlacement` gains the
  `'insufficientWater'` reason (checked in the single authoritative validator),
  and `applyCommand`'s placeBuilding branch deducts the Water with
  `deductWater` in the same atomic transaction as the Material (zero for every
  other building).
* `src/app/main.ts` + `index.html` — the palette label is rendered from the
  catalog (`Workshop · 25 + 1 Water`), the hover status reports
  `ready · material 25 · water 1`, and an unaffordable Water placement reports
  `Cannot build Workshop — requires 1 water (N available)`. The renderer never
  re-implements affordability: the domain command stays authoritative.

### Verified

| check | result |
| --- | --- |
| focused tests (`tests/workshopWaterConstruction.test.ts`) | **12 passed** |
| full Vitest | **56 files, 1136 tests passed** |
| typecheck / lint / build | passed |
| browser `run`, `temporal`, `reassign`, `crew` | pass (reassign and crew migrated) |
| browser `jobs`, `upkeep`, `road`, `transport`, `resource`, `food` | **failing** (scenario migration pending) |

**Fixture migration done (unit):** ~80 historical placements across 19 unit
files were migrated with `withWorkshopWater` (`tests/helpers.ts`), which supplies
exactly the missing Water at the placement site and never invents a surplus;
audit fixtures whose `withStocks` helper ignored Water were widened to pass it
through. Two corrupting bulk edits were caught and reverted
(`laborCompetitionPressureAudit`, `housingWorkforceAdmissionAudit`) and redone
with coordinate-preserving substitutions.

**Browser migration done:** `reassign` (the suite's two-workplace control is now
exercised with two Farms and Food as the signal, because a fresh 100-Material
colony cannot fund a Well plus two workplaces) and `constructionCrewRun` (Well
first, Water buffer, gate placement for the second Workshop).

### The blocking finding (measured)

1. **The 100-Material bootstrap cannot fund a Well plus two workplaces.** The
   minimum viable Workshop chain is Residence 25 + road 5 + Well 25 + Workshop 25
   = 80, and 4 buildings + a road is 105 > 100.
2. **The 24-Material wall.** A lone staffed Workshop equilibrates at 24 Material
   (stored production 1, upkeep 1), so the next 25-cost building is only
   affordable MID-tick (24 + this tick's stored inflow = 25). The authoritative
   dispatch gate already accepts that (`coveredSameTick`), but
   `describeCellStatus`/`validatePlacement` use the strict rest-stock check, so
   the UI preview says "insufficient material" and the player (and every E2E
   `placeAt` helper, which waits for `ready`) is blocked. This mismatch is
   pre-existing, but 10AD makes it load-bearing for progression.

Neither finding invalidates the rule — the domain behaviour is correct and
unit-tested — but both must be resolved before the remaining suites can be
migrated without weakening them.

### Remaining work (next session, in order)

1. Align the placement preview with the domain: `describeCellStatus` should
   account for the same-tick stored inflow exactly as the dispatch gate does, so
   a 24-Material colony can place a 25-cost building with honest feedback.
2. Migrate the six suites' scenarios: insert a Well + Water buffer before the
   first Workshop, use a gate-aware placement helper where the wall applies, and
   recompute the shifted tick/Material expectations. `jobs` and `upkeep` are the
   large ones (~21 and ~35 checks with absolute Material values).
3. Re-run the full verification protocol (browser + GPU + determinism) and
   finish this report.
