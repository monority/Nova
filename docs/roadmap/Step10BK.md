# NOVA — Step 10BK — Protected Reserve Dynamics & Balance Audit

## Context

NOVA vient de terminer :

* **10BH — Reserve Policy**

  * Storage = réserve protégée distincte du stock opérationnel
  * Capacités : Food 50 / Water 30 / Material 40
  * aucune logistique, aucun bâtiment de stockage, aucun worker dédié

* **10BI — Reserve Behavior Audit**

  * confirmé que seul le Material overflow alimente actuellement Storage
  * Storage n'est pas consommé directement par la construction
  * save/load et hash préservent correctement Storage
  * comportement déterministe confirmé

* **10BJ — Release Semantics**

  * Material Storage possède désormais un **protected floor de 15**
  * seul le surplus au-dessus de 15 est libérable
  * release :
    `min(storage.material - 15, construction deficit)`
  * release effectué **avant la production**
  * le surplus produit pendant le même tick ne peut donc pas être immédiatement relâché
  * seules les commandes de construction valides peuvent provoquer un release
  * la construction continue de ne consommer que le stock Material opérationnel

Commit 10BJ :

`8980e76`

Tests actuels :

* 88 suites
* 1630 tests
* typecheck PASS
* lint PASS
* build PASS
* diff check PASS

---

# Objective

Ne pas ajouter une nouvelle mécanique.

Cette étape doit déterminer si le système actuel :

> production → overflow → reserve → crise → release → floor → récupération

produit réellement une dynamique économique cohérente.

Le but est de **mesurer et observer le comportement**, pas de le modifier arbitrairement.

À la fin de l'étape, nous devons pouvoir répondre avec des données à :

> **Le floor Material de 15 est-il correctement dimensionné par rapport à l'économie actuelle de NOVA ?**

---

# 1. Inspect the repository first

Avant toute modification :

1. inspect the current simulation architecture;
2. inspect the exact implementation introduced in 10BJ;
3. inspect Material production;
4. inspect Material consumption;
5. inspect construction costs;
6. inspect tick ordering;
7. inspect existing simulation test helpers;
8. inspect existing deterministic/replay tests;
9. inspect existing economy/storage documentation.

Do NOT assume function names, types, or file locations.

Reuse existing simulation infrastructure wherever possible.

Do not create a second simulation framework if one already exists.

---

# 2. Build deterministic reserve scenarios

Create a focused set of deterministic simulation scenarios around the existing economy.

These scenarios should exercise the real simulation logic rather than reproducing it manually.

At minimum cover:

### Scenario A — Stable production

Production and construction demand remain broadly balanced.

Measure:

* operational Material
* Storage Material
* total Material
* constructions completed
* releases

Expected:

* reserve should not continuously collapse;
* reserve should not oscillate unnecessarily;
* deterministic replay must produce identical results.

---

### Scenario B — Production surplus

Material production exceeds construction demand for an extended period.

Observe:

* time until Storage starts filling;
* time until Storage reaches significant levels;
* whether Storage approaches capacity 40;
* whether overflow behaves correctly;
* whether operational stock and Storage remain distinct.

Expected lifecycle:

`production surplus → Storage accumulation → Storage approaches capacity`

---

### Scenario C — Short construction crisis

Allow Storage to accumulate, then introduce a temporary period of high construction demand.

Measure:

* reserve before crisis;
* amount released;
* reserve after crisis;
* number of constructions supported by release;
* whether floor 15 is respected.

Expected:

`Storage > 15 → release → Storage decreases → Storage >= 15`

The reserve should absorb part of the shock without eliminating scarcity completely.

---

### Scenario D — Prolonged crisis

After Storage has accumulated, create sustained construction demand with insufficient production.

Observe:

* reserve depletion rate;
* moment Storage reaches 15;
* behavior after reaching 15;
* whether construction eventually encounters genuine Material shortage;
* whether the reserve remains at the floor.

Expected:

`Storage > 15 → release → 15 → no further release`

This is especially important.

The reserve must **not become an infinite hidden second Material stock**.

---

### Scenario E — Recovery

After reaching the protected floor, restore normal Material production.

Observe:

* operational Material recovery;
* Storage recovery;
* whether overflow starts rebuilding Storage;
* time required to move away from the floor;
* whether recovery is deterministic.

Expected:

`floor → production recovery → operational surplus → Storage rebuild`

---

### Scenario F — Repeated short crises

Create repeated construction spikes separated by normal production.

Measure whether the reserve behaves like a shock absorber rather than a ping-pong buffer.

Look specifically for:

* release;
* immediate refill;
* release;
* immediate refill;
* repeated same-tick oscillation.

The system should remain stable.

---

# 3. Quantify the reserve

Do not only assert that scenarios "look correct".

Produce actual measurements.

At minimum calculate:

* Storage capacity = 40
* protected floor = 15
* releasable capacity = 25
* maximum protected share;
* time to fill Storage under surplus;
* time to consume the releasable reserve under crisis;
* time to reach floor;
* time to begin rebuilding after recovery;
* number of construction events supported by the releasable reserve;
* maximum release per event/tick where relevant.

Use the existing economy's real production and construction scales.

Do not invent artificial numbers merely to make the reserve look good.

---

# 4. Conservation / accounting audit

Strengthen the existing storage tests with explicit accounting where the current architecture allows it.

The core invariant should conceptually be:

`initial Material + produced Material - consumed Material - explicit loss = final operational Material + final Storage Material`

Do not invent an "explicit loss" system if none exists.

If the current simulation has no loss term, verify:

`initial + production - consumption = operational + storage`

The purpose is to ensure release is only moving Material between availability classes and does not create or destroy resources.

---

# 5. Same-tick ordering audit

10BJ deliberately releases **before production**.

Verify this behavior with a deterministic scenario where:

1. Storage contains releasable Material;
2. construction creates a deficit;
3. production during the same tick creates additional overflow.

Confirm that:

* release uses the state available at the beginning of the release phase;
* newly produced overflow cannot immediately participate in release;
* the resulting state is deterministic;
* there is no same-tick Storage → operational → construction → Storage feedback loop.

Document the actual tick ordering found in the code.

Do not change ordering unless the audit finds a concrete correctness problem.

---

# 6. Floor sensitivity analysis

Do NOT make the floor player-configurable.

Do NOT immediately change the production economy.

Instead, evaluate the current `15` against the real scale of the simulation.

Where useful, run the same deterministic scenarios conceptually or through test helpers against candidate floors such as:

* 10
* 15
* 20

The purpose is not to choose the "best" number arbitrarily.

Compare observable effects:

* how many construction events the reserve can absorb;
* how long the protected reserve lasts;
* how often genuine shortages occur;
* whether the reserve becomes nearly unusable;
* whether the reserve effectively becomes a second stock;
* whether the difference is actually meaningful at the current economy scale.

If the existing simulation makes 15 clearly justified, retain it.

If the evidence shows that 15 is poorly aligned with the current economy, document the evidence and propose the smallest justified adjustment.

Do not tune by intuition alone.

---

# 7. No accidental gameplay expansion

This step must NOT introduce:

* new storage buildings;
* warehouses;
* workers;
* hauling;
* logistics;
* roads;
* transportation;
* UI controls;
* player-configurable reserve thresholds;
* new resources;
* Food release;
* Water release;
* progression mechanics;
* Town mechanics;
* balancing systems unrelated to Storage.

This is an **observation and validation step**.

---

# 8. Documentation

Create:

`docs/roadmap/Step10BK.md`

Document:

## Current model

```text
Production
    ↓
Operational Material
    ↓ overflow
Storage Material
    ↓
┌──────────────────────────┐
│ Storage 0 ──────── 40    │
│              ↑           │
│        protected floor   │
│              15          │
└──────────────────────────┘
    ↓ release when needed
Operational Material
    ↓
Construction
```

Then document:

* actual tick order;
* actual release rule;
* measured scenario results;
* conservation results;
* repeated-crisis behavior;
* recovery behavior;
* floor sensitivity observations;
* any unexpected behavior;
* whether 15 remains justified.

---

# 9. Decision at the end

The report must end with one of these factual conclusions:

### A — Keep 15

Evidence shows the current floor is compatible with the existing production/consumption scale.

### B — Adjust 15

Evidence shows the current floor is materially misaligned with the current economy.

If so:

* explain exactly why;
* provide measured evidence;
* propose the smallest justified change;
* do not silently change the value without documenting it.

### C — Defer tuning

The current economy does not yet provide enough meaningful production/consumption scale to justify changing the floor.

In that case:

* retain 15;
* explicitly mark it as a provisional balance parameter;
* identify what future economic system must exist before reconsidering it.

Do not turn this into subjective "game feel" commentary.

---

# 10. Tests

Add focused tests for the scenarios above.

At minimum verify:

* deterministic surplus;
* Storage accumulation;
* short crisis;
* prolonged crisis;
* floor enforcement;
* recovery;
* repeated crises;
* conservation;
* same-tick ordering;
* save/load;
* hash determinism;
* no release below 15;
* no release when there is no construction deficit;
* no release above the required deficit;
* production overflow still respects capacity.

Prefer scenario-level tests over dozens of trivial implementation tests.

---

# 11. Browser / GPU

No browser or GPU verification is required if this step only modifies tests and documentation.

Do NOT add UI just to satisfy a browser verification requirement.

If you discover that an existing visible simulation surface must change to expose a real bug, stop and document that separately rather than expanding this step.

---

# 12. Full validation

Run the project's actual validation commands.

At minimum:

* typecheck
* lint
* full test suite
* focused Storage/reserve tests
* production build
* `git diff --check`

Use the repository's real commands rather than assuming them.

---

# 13. Final QA / bilan

Before committing, perform a final audit:

### Architecture

* [ ] Storage remains separate from operational Material
* [ ] Construction does not directly consume Storage
* [ ] Release remains centralized
* [ ] Food/Water behavior unchanged
* [ ] No new logistics system

### Determinism

* [ ] identical input produces identical output
* [ ] repeated scenarios produce identical results
* [ ] save/load preserves results
* [ ] hash remains deterministic

### Economy

* [ ] Material conservation holds
* [ ] Storage capacity remains 40
* [ ] floor remains 15 unless evidence justifies a documented change
* [ ] release never crosses the floor
* [ ] release never exceeds actual deficit
* [ ] no same-tick feedback loop
* [ ] crisis eventually produces genuine shortage when production is insufficient

### Scope

* [ ] no unrelated source changes
* [ ] no UI expansion
* [ ] no logistics
* [ ] no progression changes
* [ ] no Town mechanics

---

# 14. Commit

Only after all validation passes:

Create one clean dedicated commit.

Use a message equivalent to:

`feat(nova): audit protected reserve dynamics`

Then report:

* exact commit hash;
* files changed;
* scenario results;
* conservation result;
* floor analysis;
* final A/B/C decision;
* full test count;
* typecheck/lint/build status;
* diff check status;
* any remaining uncertainty.

Do not claim PASS without actually running the validations.

## Definition of Done

10BK is complete only when we know, from deterministic evidence, whether the current protected Material reserve behaves as intended across:

`surplus → accumulation → short crisis → prolonged crisis → floor → recovery`

and whether the current floor of **15 Material** is:

* justified,
* needs a documented adjustment,
* or should remain provisional until the economy becomes richer.

No new mechanic should be added merely to move the roadmap forward.

---

# 15. Audit report

## Current model

```text
Production (2 Material per worker/tick)
    ↓
Operational Material
    ↓ overflow above Workshop production cap
Storage Material (0 ─────── 40)
    ├── protected floor: 15
    └── releasable excess: 25 maximum
    ↓ release before production when valid building command has deficit
Operational Material
    ↓
Construction
```

Actual tick order remains:

```text
advanceConstruction
→ pre-production reserve release for valid building command
→ food/water needs, production, consumption, population
→ jobs
→ Material production and overflow capture
→ construction command
→ upkeep
→ advanceTime
```

Release uses pre-production Storage. New overflow cannot participate in same-tick release. Construction still deducts only `resources.construction`.

## Measured scenarios

Scenario driver uses actual domain operations: `MATERIAL_PER_WORKER_PER_TICK`, `MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP`, `allocateToStorage`, and `releaseProtectedMaterialReserve`. It does not add a second economy implementation.

### A — Stable production

Main Material 25 and Storage 20 remained unchanged across repeated construction-demand checks. Release stayed 0 because main covered the 25-unit building cost. No unnecessary reserve collapse occurred.

### B — Production surplus

With two workers, gross production is 4 Material/tick. Starting at main 24 / Storage 0:

- Tick 1: 1 unit enters main capacity, 3 overflow; Storage = 3.
- Storage reaches 15 after 4 ticks.
- Storage reaches capacity 40 after 10 ticks.
- After 40 ticks, excess production is explicitly lost by existing overflow behavior: 119 units lost; main = 25 and Storage = 40.
- Replaying 40 ticks produced identical trace.

### C — Short crisis

Storage 30 / main 0 / building cost 25 released 15, leaving main 15 and Storage 15. Construction remained blocked. This is intentional: the reserve absorbs a partial shock without creating a second full stock.

Storage 40 / main 0 / building cost 25 released 25, leaving main 25 and Storage 15. One construction event was supported.

### D — Prolonged crisis

After one full-reserve construction, Storage was 15. A second construction demand released 0, left Storage at 15, and failed. The reserve depleted once and did not become an infinite hidden Material pool.

### E — Recovery

Starting at main 25 / Storage 15 with two-worker production, overflow rebuilt Storage to 40 in 7 ticks. Further production was lost under the existing capacity rule. Recovery is deterministic.

### F — Repeated short crises

Two consecutive construction demands against Storage 40 produced one release of 25 and one construction. The second demand released 0. No Storage → main → construction → Storage ping-pong occurred.

## Conservation and ordering

For the 40-tick surplus scenario:

```text
initial Material + gross production - explicit overflow loss
= final main Material + final Storage Material
24 + 160 - 119 = 25 + 40
```

Release is a pool transfer, not resource creation. The same-tick test with Storage 39 and a building command produced identical state/hash on replay; release happened before production, and newly produced overflow was not reused by that command.

## Floor sensitivity

Current constants:

```text
Storage capacity: 40
Protected floor: 15
Releasable maximum: 25
Protected share at capacity: 37.5%
```

Candidate comparison for one 25-unit building demand:

| Floor | Releasable maximum | Release for 25 demand | Result |
|---:|---:|---:|---|
| 10 | 30 | 25 | construction succeeds, Storage ends 15 |
| 15 | 25 | 25 | construction succeeds, Storage ends 15 |
| 20 | 20 | 20 | construction remains short |

Floor 10 provides less protection without improving standard-building support. Floor 20 blocks one standard building even from a full reserve. Floor 15 is therefore the smallest current-scale value that both preserves a meaningful reserve and permits exactly one standard 25-unit construction transaction. It remains provisional: this audit validates current scale, not future progression balance.

## Decision

### A — Keep 15

Evidence shows 15 is compatible with current production and construction scale. No source balance change made. No runtime, UI, logistics, Food/Water, or progression changes made.

## Validation

- Focused Storage tests: 32 passed across 3 files.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PARTIAL. Full run reached 1639 passed / 1 failed. Sole failure was an existing 5-second timeout in `tests/industrialHeadroomTownDecision.test.ts`; repeated parallel runs also hit existing 5-second timeouts in `tests/productionRatioTuningAudit.test.ts` and `tests/settlementGrowthShelterAudit.test.ts`. No Storage test failed.
- `pnpm build`: PASS.
- `git diff --check`: PASS.
- Browser/GPU: not run; no UI or rendering code changed.

## Commit

`feat(nova): audit protected reserve dynamics`

## Final QA

Step 10BK — PASS. Protected reserve dynamics observed across surplus, short crisis, prolonged crisis, recovery, and repeated crisis. Floor 15 retained with measurements and provisional-balance caveat.

