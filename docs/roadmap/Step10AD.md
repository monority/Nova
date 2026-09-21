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

---

## Step 10AD-1 — finishing the Water construction cost

### Implemented (unchanged from 10AD)

* `Workshop = 25 Material + 1 Water`, one-off at placement; Residence/Farm/Well/
  Road unchanged.
* `BuildingDefinition.constructionWaterCost` (concrete catalog property).
* `validatePlacement` rejects with `'insufficientWater'`; `applyCommand` deducts
  Material **and** Water in the same atomic transaction.
* The Workshop consumes no Water while operating; production, upkeep, storage cap
  and the Construction Crew are untouched. `SAVE_VERSION` stays 7, no migration,
  no new persisted field, no generic framework.

### UI/domain affordability (10AD-1, the requested fix)

* New concrete application query **`src/application/queries/placement.ts`** →
  `getPlacementAffordability(state, cell, buildingType)`. It is the ONE predicate
  now used by **both** the hover feedback (`describeCellStatus`) and the
  authoritative dispatch gate, so the preview can no longer claim
  "insufficient material" for a placement the domain accepts.
* It mirrors the existing Step 08G same-tick rule (`coveredSameTick`): a
  Material shortfall is covered when this tick's STORED Workshop inflow
  completes it. It also enforces that **stored Material never covers a Water
  shortfall** (Water has no same-tick producer equivalent), which the original
  dispatch check would have allowed.
* No second economy rule, no cache, no generic transaction/consumer abstraction;
  the domain command stays authoritative.
* The ready status now names the same-tick inflow explicitly:
  `cell X,Y — ready · material 25 (incl. 1 stored this tick) · water 1`.
* Targeted tests **`tests/workshopWaterAffordability.test.ts`** (7): the
  24-Material wall case (visible 24 + stored 1 → rest validation refuses,
  affordability accepts, and the domain really places it), a genuinely
  unaffordable case, both Water refusals (including the stored-Material masking
  case), the ready/agreement case and an occupied cell.

### Discovered UI finding (real, and the cause of two "Water" failures)

The Workshop cost label was first rendered as `Workshop · 25 + 1 Water`. That
wider label **reflows the palette row**, which shifts the canvas geometry the
E2E pointer↔cell mapping depends on; `foodRun` and `resourceRun` then failed at
their corner-cell hovers even though they place no Workshop at all. The cost is
therefore communicated without touching the palette width: `title` +
`aria-label` from the catalog, the selection status
(`Workshop selected — material 25 + 1 water per building`) and the hover /
rejection feedback. Both suites pass again.

### Browser migration

| suite | result |
| --- | --- |
| run, production, temporal, water, food, resource | pass (food/resource needed only the palette-layout fix) |
| reassign | migrated: two Farms + Food signal (a Well plus two workplaces does not fit the bootstrap) |
| construction crew | migrated: Well first + Water buffer + the 2nd Workshop through the same-tick gate |
| **road, transport, jobs, upkeep** | **BLOCKED — see below** |

### The blocking cause (measured, not guessed)

A fresh colony starts with 100 Material and `INITIAL_WATER = 0` (both unchanged).
A Workshop now needs a staffed, operational, **road-accessible** Well first:

```text
Residence 25 + road 5 + Well 25 + Workshop 25 = 80   (minimum Workshop chain)
each further farm/workshop-class building      = +25
```

Every blocked scenario needs more than 100 Material for its subject:

| suite | scenario need | total |
| --- | --- | --- |
| jobs | 2 Residences + road + Well + Workshop (capacity/employment scenarios) | 105 |
| upkeep | Residence + road + Well + 2 Workshops (staffed upkeep needs 2 workers) | 105+ |
| transport | Residence + road + Well + 2 Workshops (accessibility contrast) | 105 |
| road | Residence + road + Well + Workshop + 4 road cells + 2nd Residence (step F) | 120 |

The only in-game escapes are (a) earning Material from a **staffed** Workshop
before the extra building — which requires the extra building to exist first, or
a deliberate manual reassignment (10M) that none of these suites exercise; or
(b) changing the economy (`INITIAL_CONSTRUCTION_MATERIAL`, or exempting the
first Workshop — both explicitly out of scope for this step). The same-tick
24-Material crest no longer blocks the player (10AD-1 fixed the preview), so
material income *does* convert into the next 25-cost building — but only once a
staffed Workshop exists.

Per the step's instruction ("si quelque chose reste réellement bloqué,
arrête-toi sur ce point et documente précisément la cause plutôt que de
contourner l'échec"), the four suites were left **unmodified** rather than
rewritten into scenarios that no longer test their original subject.

### Verification

```text
Vitest:        57 files, 1143 tests passed (includes 12 Workshop-Water
               construction tests and 7 affordability tests)
Typecheck:     passed
Lint:          passed
Build:         passed
Browser:       run, production, temporal, water, food, resource, reassign,
               crew ALL PASS; road, transport, jobs, upkeep BLOCKED (above)
GPU:           ALL PASS
Determinism:   replay + insertion-order + save/load covered by unit tests
Save/load:     passed (canonical Water deduction; SAVE_VERSION 7 unchanged)
Insertion order: passed
```

### Final report

```text
STEP 10AD — FINAL

Starting commit: b411e0c (Step 10AD partial)
Final commit:    this commit

Rule:
Workshop = 25 Material + 1 Water, one-off at placement.

Implementation:
Catalog property `constructionWaterCost` (1 for Workshop, 0 otherwise);
`applyCommand` deducts both resources in one atomic transaction;
`validatePlacement` reports `insufficientWater`; operation consumes no Water;
SAVE_VERSION 7, no migration, no new state, no generic framework.

UI/domain affordability:
One shared predicate (`getPlacementAffordability`, new application query) used by
the hover and the dispatch gate; mirrors the Step 08G same-tick stored-inflow
rule; stored Material never covers Water; the palette label stays short because a
wider label reflows the row and breaks pointer/cell alignment (cost carried by
title/aria-label, selection status and hover/rejection feedback).

Browser migration:
jobs:      BLOCKED (scenario needs 105 Material: 2 Residences + road + Well + Workshop)
upkeep:    BLOCKED (scenario needs 2 staffed Workshops + Well + Residence > 100)
road:      BLOCKED (step F needs Residence + Workshop + 4 roads + 2nd Residence + Well = 120)
transport: BLOCKED (Residence + road + Well + 2 Workshops = 105)
resource:  PASS (no Workshop; the earlier failure was the palette-reflow bug)
food:      PASS (no Workshop; same cause)
reassign:  PASS (migrated to two Farms + Food signal)
crew:      PASS (migrated: Well first, Water buffer, gate placement)
temporal:  PASS

Verification:
Vitest: 1143 passed / 57 files
Typecheck: passed
Lint: passed
Build: passed
Browser: 8 of 12 suites pass; 4 blocked with the exact Material arithmetic above
GPU: ALL PASS
Determinism: replay/insertion-order/save-load verified in unit tests
Save/load: passed
Insertion order: passed

SAVE_VERSION: 7 (unchanged)
Migration: none (the Water stock is already canonical)

Files changed:
src/domain/building/building.ts, src/domain/simulation/phases.ts,
src/application/queries/placement.ts (new), src/index.ts, src/app/main.ts,
index.html, tests/workshopWaterConstruction.test.ts,
tests/workshopWaterAffordability.test.ts, ~19 migrated unit fixtures,
e2e/reassignRun.mjs, e2e/constructionCrewRun.mjs, docs/roadmap/Step10AD.md

Economic/design impact:
The rule is a one-off construction investment, not an upkeep: it gates EXPANSION
on Water and leaves production untouched. It makes the Water well a prerequisite
for any Workshop, which raises the minimum Material for a Workshop-bearing
bootstrap from 80 to 105 for the historical multi-building scenarios.

Remaining issues:
1. Four browser suites (road, transport, jobs, upkeep) need scenarios whose
   bootstrap fits 100 Material with a mandatory Well — e.g. by starting from a
   smaller plan or by including the manual reassignment step that generates
   Material income before the extra building.
2. If those scenarios are meant to stay as they are, the economy must change
   (INITIAL_CONSTRUCTION_MATERIAL or a first-Workshop exemption); both were
   explicitly out of scope here.

STATUS: BLOCKED
```
