# Step 10N — Audit Manual Workforce & Agency

## Mission

Audit the production implementation shipped in Step 10M.

This is an **audit step**, not a feature step.

The objective is to determine whether manual workforce reassignment actually creates meaningful player agency and resolves the workforce dead-ends discovered in Steps 10K–10L, without introducing hidden simulation inconsistencies, excessive coupling, or a need for another premature economic rule.

Workflow:

`AUDIT → OBSERVATIONS → DESIGN DECISION → VERIFICATION`

Do not redesign the system during the audit.

---

## Starting point

Expected starting commit:

```text
cb73b8d Step 10M: implement manual workforce reassignment
```

Step 10M introduced:

```text
ColonistState = {
  id,
  residenceId,
  workplaceId,
  workplaceAssignmentMode: "automatic" | "manual"
}
```

with:

```text
reassignColonist(colonistId, workplaceId)
```

through:

```text
dispatchCommand
→ stepSimulation
→ applyCommand
```

SAVE_VERSION is now `5`, with deterministic v4 → v5 migration.

Automatic assignment remains the default.

Manual assignments are sticky while valid.

Invalid manual assignments fall back to automatic assignment.

---

# HARD RULE

This step must NOT introduce new gameplay rules.

Do not implement:

* Farm upkeep;
* new resource sinks;
* new food rules;
* new Material rules;
* new housing rules;
* new population rules;
* new mobility rules;
* travel time;
* pathfinding;
* vehicles;
* transit;
* logistics;
* congestion;
* road upkeep;
* demolition;
* new workforce priority systems;
* global workforce optimization;
* building-level workforce preferences;
* automatic adaptive workforce policies.

Do not change existing economic coefficients.

The purpose is to evaluate Step 10M, not to repair its gameplay by adding another mechanic.

---

# 1. AUDIT — PLAYER AGENCY

Determine whether manual reassignment creates genuine agency.

Test:

### Scenario A — Farm/Workshop choice

Create:

```text
2 Residences
2 Farms
2 Workshops
2 colonists
```

with all workplaces reachable.

Measure the automatic allocation.

Then manually move one colonist:

```text
Farm → Workshop
```

Measure:

* staffed Farms;
* staffed Workshops;
* Food production;
* Material gross production;
* Material upkeep;
* Material net;
* population;
* Food stock;
* Material stock.

Then reverse:

```text
Workshop → Farm
```

Verify the economic symmetry.

Expected directional effects:

```text
Farm → Workshop
Food:     -2/tick
Material: +2 gross/tick
Upkeep:   +1 Workshop/tick
Net M:    +1/tick
```

Reverse:

```text
Workshop → Farm
Food:     +2/tick
Material: -2 gross/tick
Net M:    -1/tick
```

Do not merely assert these values. Verify them through simulation.

---

# 2. AUDIT — MULTIPLE MANUAL OVERRIDES

Test:

* one manual override;
* two manual overrides;
* manual Farm assignment + automatic Workshop;
* manual Workshop assignment + automatic Farm;
* multiple colonists targeting different workplaces;
* multiple colonists attempting the same capacity-1 workplace.

Verify that:

* each colonist remains independent;
* manual assignments do not create global priority;
* capacity remains authoritative;
* automatic workers fill remaining valid capacity;
* there is no duplicate occupancy;
* results are deterministic.

Explicitly verify that a manual assignment never silently causes another manual assignment to move.

---

# 3. AUDIT — AUTOMATIC + MANUAL INTERACTION

Test combinations such as:

```text
C1 manual → W1
C2 automatic
```

and:

```text
C1 manual → F1
C2 automatic
C3 automatic
```

Verify that automatic assignment only considers capacity left after valid manual assignments.

Then invalidate the manual assignment through existing rules.

Test:

* workplace becomes under construction;
* workplace becomes non-operational;
* mobility disappears;
* residence disappears;
* target capacity becomes unavailable.

For every case verify:

```text
manual assignment
→ becomes invalid
→ mode returns to automatic
→ automatic assignment may run normally
```

There must never be a stale manual assignment that permanently blocks employment.

---

# 4. AUDIT — RECOVERY OF THE 10K / 10L DEAD-END

Reproduce the important case from Step 10K/10L:

```text
2 Residences
2 Farms
2 Workshops
2 colonists
Material = 5
```

Construct/build in the order that previously produced:

```text
2 staffed Farms
0 staffed Workshops
Material stuck at 5
```

Verify the pre-override state.

Then perform exactly one manual reassignment:

```text
one Farm worker → vacant Workshop
```

Run at least 60 ticks.

Record:

* Material at ticks 1, 5, 10, 30, 60;
* Food;
* population;
* staffed Farms;
* staffed Workshops;
* workplace IDs;
* assignment modes.

The colony should recover without introducing any new rule.

Then test the reverse economic recovery:

```text
Workshop-heavy allocation
→ manual Workshop → Farm
```

Verify that the player can intentionally trade Material production for Food production.

---

# 5. AUDIT — SPATIAL CONSTRAINTS

Manual reassignment must remain subject to the existing mobility contract.

Test targets that are:

1. operational and connected;
2. operational but roadless;
3. operational but disconnected;
4. under construction;
5. full;
6. unknown;
7. not a Farm/Workshop;
8. colonist without residence.

For each target verify the exact validation result.

Manual reassignment must NOT bypass:

```text
operational state
capacity
mobility
residence requirement
```

Then connect a previously disconnected target.

Verify:

```text
invalid before connection
→ valid after connection
```

No new movement/pathfinding system is allowed.

---

# 6. AUDIT — DISTANCE SEMANTICS

Step 09M introduced nearest-workplace preference for automatic assignment.

Verify that Step 10M preserves the distinction:

```text
AUTOMATIC
    → nearest eligible workplace
    → lowest ID tie-break

MANUAL
    → explicit valid player choice
    → distance does not override player choice
```

Test:

* nearest Workshop;
* farther Workshop;
* both reachable;
* equal-distance tie;
* manual selection of farther valid Workshop.

Verify that the manual choice remains stable.

The audit must explicitly answer:

> Does manual reassignment create a second spatial decision axis without introducing travel simulation?

---

# 7. AUDIT — CONSTRUCTION ORDER

Reproduce the order-dependent scenarios from Step 10J/10K.

Compare at minimum:

```text
Farm → Farm → Workshop → Workshop
Workshop → Workshop → Farm → Farm
Farm → Workshop → Farm → Workshop
Workshop → Farm → Workshop → Farm
```

Determine whether manual reassignment now gives the player a recovery/control mechanism where automatic assignment previously could not.

Do not change construction semantics.

The question is:

> Can the player recover from a bad workforce distribution using the existing systems?

---

# 8. AUDIT — SAVE / LOAD

Test:

### Case A

Create multiple manual assignments.

Save.

Load.

Verify:

* workplace IDs;
* assignment modes;
* colonist ordering;
* simulation state;
* hash.

### Case B

Replay the same commands from the same initial state.

Verify byte-identical canonical state and hash.

### Case C

Run equivalent assignments in deterministic command order.

Verify expected deterministic results.

### Case D

Load a v4 save.

Verify:

```text
v4 colonists
→ workplaceAssignmentMode = "automatic"
```

Historical workplace assignments must never be reinterpreted as manual.

Do not modify the migration unless a real bug is found.

---

# 9. AUDIT — INSERTION ORDER

Use equivalent worlds with:

* reversed colonist insertion order;
* reversed workplace insertion order;
* reversed road insertion order where relevant.

Verify the documented determinism guarantees.

Distinguish:

```text
ID-dependent deterministic tie-breaking
```

from:

```text
true insertion-order dependence
```

Do not incorrectly classify deterministic ID ordering as nondeterminism.

---

# 10. AUDIT — UI

Use the real browser UI.

Verify that a player can determine:

* which colonist is being inspected;
* current workplace;
* automatic vs manual mode;
* available valid workplaces;
* why an invalid workplace cannot be selected;
* whether the reassignment actually occurred;
* whether the manual override persisted.

Test at least:

1. automatic worker;
2. manual Farm worker;
3. manual Workshop worker;
4. invalid target;
5. disconnected target;
6. full target;
7. reverse reassignment.

Use the existing UI patterns.

Do NOT create:

* workforce dashboard;
* workforce management screen;
* drag-and-drop workforce editor;
* new global panel;
* unrelated UI redesign.

If the existing UI is sufficient, document that.

If a UI defect is found, distinguish:

```text
simulation bug
vs
presentation bug
vs
audit tooling limitation
```

Do not silently fix unrelated UI issues.

---

# 11. AUDIT — BROWSER REGRESSION

Run:

```text
e2e/reassignRun.mjs
```

and all existing E2E suites.

Expected:

* zero console errors;
* zero page errors;
* existing Road/Transport/Production/Food/Resource/Temporal/Jobs/Upkeep behavior remains valid;
* reassignment scenario remains valid.

If a failure is caused by a stale test assumption, document it explicitly before changing anything.

Do not weaken tests.

---

# 12. AUDIT — PERFORMANCE

Measure representative workloads:

```text
SMALL
MEDIUM
LARGE
XL
```

Compare assignment/simulation cost against the Step 10M baseline.

Pay particular attention to:

```text
assignJobs
stepSimulation
reassignColonist
```

Verify that manual reassignment does not introduce:

* global optimization;
* repeated BFS;
* repeated network construction;
* O(colonists × workplaces × roads) regressions;
* new reverse indexes.

Reuse existing cached mobility/network derivations.

The audit should report actual measured values.

---

# 13. ARCHITECTURE AUDIT

Inspect Step 10M for accidental coupling.

Verify:

### Canonical employment state

The colonist remains the single owner of:

```text
workplaceId
workplaceAssignmentMode
```

There must be no:

```text
farmWorkers
workshopWorkers
building.workerIds
```

or equivalent reverse source of truth.

### Validation

`validateReassignment` remains the single source of truth.

### Automatic assignment

Existing automatic assignment remains conceptually unchanged when there are no manual overrides.

### Domain/application boundary

Manual reassignment command remains domain/application appropriate.

### Rendering

No simulation rule should live in rendering code.

### Persistence

No derived inspection/query state should enter canonical persistence unnecessarily.

---

# 14. ECONOMIC AUDIT

Build explicit per-tick ledgers for:

```text
Food:
  produced
  consumed
  shortage
  population effect

Material:
  gross Workshop production
  Workshop upkeep
  construction spending
  storage clamp
  final stock
```

Compare:

```text
automatic allocation
manual Farm → Workshop
manual Workshop → Farm
```

Verify that the only economic differences are those caused by worker allocation.

No hidden Farm upkeep.

No new resource sink.

No coefficient change.

---

# 15. LONG-RUN STABILITY

Run representative manual-allocation scenarios for:

```text
60 ticks
240 ticks
```

Include:

```text
balanced
Farm-heavy
Workshop-heavy
manual mixed
manual reversed
```

Measure:

* Food stock;
* Material stock;
* population;
* staffing;
* construction capability;
* whether any unexpected oscillation occurs.

Do not classify an intended resource tradeoff as a bug.

Separate:

```text
temporary pressure
persistent pressure
terminal state
recoverable state
```

---

# 16. PLAYER AGENCY CLASSIFICATION

At the end, explicitly classify the Step 10M result.

Use:

```text
A — Fundamental
B — Useful but incomplete
C — Redundant
D — Problematic
```

Base the classification on observed simulation evidence.

Do not add a new rule merely to force an A classification.

Answer:

1. Does manual reassignment create a genuine player decision?
2. Does it resolve the workforce dead-ends discovered in 10K/10L?
3. Does it preserve automatic assignment as a sensible default?
4. Does it create meaningful Food ↔ Material tradeoffs?
5. Does it create a new spatial decision without requiring travel simulation?
6. Does it remain deterministic?
7. Does it remain architecturally contained?

---

# 17. NEXT-STEP DECISION

The audit must finish by identifying the smallest justified next dependency.

Consider the roadmap:

```text
Phase 3 — Needs
Phase 4 — First production flow
Phase 5 — Additional essential service
Phase 6 — Work
```

NOVA already has:

```text
Food need
Food consumption
Food shortage
Population consequence
Farm production
Material production
Workplace assignment
Mobility eligibility
Manual workforce control
```

Do NOT automatically introduce another need.

Determine whether the current Food/Material/workforce system is sufficiently understood to move toward the next causal production/consumption dependency.

If the evidence indicates that Phase 3 is complete enough, say so explicitly.

If another audit is necessary, identify exactly why.

---

# 18. FILES

Audit changes should normally be limited to:

```text
tests/manualWorkforceAgencyAudit.test.ts
docs/roadmap/Step10N.md
```

Do not modify `src/` unless an actual blocking defect makes the audit impossible.

Preserve all existing Step 10M documentation.

Do not overwrite committed roadmap documentation.

Append the final As-Built/Audit report safely.

---

# 19. VERIFICATION

Run:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Run every relevant E2E suite.

Verify:

```text
SAVE_VERSION = 5
```

unless an actual migration defect requires a deliberate version change.

Search source for:

```text
Date.now()
Math.random()
```

and confirm deterministic simulation remains intact.

Verify save/load hash stability.

Verify replay determinism.

Verify insertion-order determinism.

---

# 20. FINAL REPORT

Finish with exactly:

```text
Step 10N COMPLETE — AUDIT

Repository

Starting commit:
Final commit:

Production code changed:
Tests added:
Docs changed:

Agency verdict

...

10K/10L recovery

...

Food ↔ Material tradeoff

...

Automatic vs manual semantics

...

Spatial semantics

...

Invalidation behavior

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

Long-run stability

...

Design classification

A / B / C / D

Reason:

Next dependency

...

Scope verdict

COMPLETE — AUDIT
```

Important final confirmations:

```text
- automatic assignment remains the default
- valid manual assignments remain sticky
- manual assignments do not bypass mobility
- manual assignments do not bypass capacity
- invalid manual assignments return to automatic behavior
- Farm upkeep remains absent
- no new economic rule was introduced
- no unrelated simulation rule changed
- Food remains independent from road access
- distance remains an automatic assignment preference, not travel simulation
- save/load remains deterministic
- replay remains deterministic
```

Do not implement the next gameplay feature during this step.

The output of Step 10N is an evidence-based design decision for what NOVA should build next.



---

# As-Built / Audit Report

**Type: AUDIT (Step 10N) of the Step 10M implementation.** `src/` is untouched
(`git diff -- src/` empty). Every number below is a real `AUDIT ...` line from
`tests/manualWorkforceAgencyAudit.test.ts`; re-run with

```text
npx vitest run tests/manualWorkforceAgencyAudit.test.ts --reporter=verbose
```

## Repository

* starting commit `cb73b8d` (Step 10M);
* production code changed: **none** (`src/` untouched);
* tests added: `tests/manualWorkforceAgencyAudit.test.ts` (21 tests);
* docs changed: this file only.

## Agency verdict

**Genuine agency confirmed.** `AUDIT AGENCY_FARM_TO_WORKSHOP`:

| | Staffed F/W | Food produced | Material gross | Workshop upkeep | Material net |
| --- | --- | ---: | ---: | ---: | ---: |
| automatic | 2 / 0 | 4 | 0 | 0 | 0 |
| one manual Farm → Workshop | 1 / 1 | 2 | 2 | 1 | +1 |

`AUDIT AGENCY_REVERSE` restores `2 / 0` and the `food 4 / gross 0 / net 0`
ledger. The player decision is real, symmetric and observable in the
simulation.

## 10K/10L recovery

`AUDIT DEADEND_BEFORE` reproduces the stuck state exactly: 2 Residences /
2 Farms / 2 Workshops, Material **5**, `staffedFarms 2`, `staffedWorkshops 0`,
unchanged over 10 ticks. `AUDIT DEADEND_RECOVERY` — one manual move:

| Tick | Material | Food | Staffed F/W | workplaceId | mode |
| ---: | ---: | ---: | --- | --- | --- |
| 1 | 5 | 2002 | 1 / 1 | building-5 | manual |
| 5 | 9 | 2002 | 1 / 1 | building-5 | manual |
| 10 | 14 | 2002 | 1 / 1 | building-5 | manual |
| 30 | 34 | 2002 | 1 / 1 | building-5 | manual |
| 60 | 49 | 2002 | 1 / 1 | building-5 | manual |

The dead-end is fully recoverable with **one existing action** and no new rule.
`AUDIT REVERSE_RECOVERY` confirms the symmetric case: a Workshop-heavy colony
(`0F/2W`, Food draining to 80) trades Material for Food and reaches `1F/1W`,
Food 98.

## Food ↔ Material tradeoff

`AUDIT LEDGER` (per-tick, derived from the existing phase functions):

| Allocation | Food produced | Food consumed | Material gross | Workshop upkeep | Material net |
| --- | ---: | ---: | ---: | ---: | ---: |
| automatic `2F/0W` | 4 | 2 | 0 | 0 | 0 |
| manual `1F/1W` | 2 | 2 | 2 | 1 | +1 |
| automatic `0F/2W` | 0 | 2 | 4 | 2 | +2 |
| manual (W→F) `1F/1W` | 2 | 2 | 2 | 1 | +1 |

The only differences are those caused by worker allocation. There is **no
hidden Farm upkeep**, no new resource sink and no coefficient change.

## Automatic vs manual semantics

* `AUDIT AUTO_PLUS_MANUAL`: 3 colonists on 2F+2W; moving one Farm worker to the
  vacant Workshop leaves the remaining workers automatically placed, with one
  worker per workplace (`1F/2W` staffed).
* `AUDIT MULTI_MANUAL`: 2F/0W → 0F/2W with two independent manual overrides.
* `AUDIT MANUAL_INDEPENDENCE`: after 20 ticks both manual choices are still
  exactly where the player put them (`building-5`, `building-6`); one manual
  assignment never silently moves another.
* Capacity stays authoritative: a second colonist targeting a full workplace is
  rejected with `workplaceOccupied` and the state is returned unchanged.

## Invalidation behavior

`AUDIT INVALIDATION` — every existing rule invalidates a manual choice and
returns the colonist to automatic:

| Violation | Result after 2 ticks |
| --- | --- |
| workplace under construction | `workplaceId building-2`, `automatic` |
| road connection removed | `workplaceId building-2`, `automatic` |
| residence removed | `workplaceId null`, `automatic` |

There is no stale manual assignment that permanently blocks employment.

## Spatial semantics

`AUDIT VALIDATION_MATRIX`:

```text
connected vacant   -> valid (distance 4)
roadless           -> notConnected
under construction -> notOperational
residence          -> notWorkplace
unknown            -> unknownWorkplace
occupied           -> workplaceOccupied
no residence       -> noResidence
unknown colonist   -> unknownColonist
```

`AUDIT CONNECT_AFTER`: a disconnected Workshop is invalid before the roads
connect and valid afterwards (distance 14), with no new movement system.
`AUDIT DISTANCE_SEMANTICS` / `AUDIT DISTANCE_AXIS`: automatic picks the nearest
Workshop (distance 0); a manual choice of the farther Workshop (distance 2)
remains stable for 30+ ticks. **Manual reassignment creates a second spatial
decision axis without introducing travel simulation** — distance is a
preference, not a cost.

## Construction order

`AUDIT CONSTRUCTION_ORDER_RECOVERY`:

| Order | Before | After one manual move (60 ticks) |
| --- | --- | --- |
| Farm → Farm → Workshop → Workshop | 2F/0W, Material stuck | 1F/1W, Material 49 |
| Workshop → Workshop → Farm → Farm | 0F/2W, Food draining | 1F/1W, Food 98 |

Both order-dependent configurations are now recoverable through the existing
systems. Construction semantics are unchanged.

## Persistence / migration

`SAVE_VERSION = 5`; no migration defect found, so the version is unchanged by
this audit. `AUDIT SAVE_LOAD`: two manual assignments round-trip with their
modes (`colonist-1: manual`, `colonist-2: manual`) and an identical hash.
`AUDIT V4_MIGRATION`: a v4 save yields all-`automatic` colonists and the same
hash as its equivalent v5 state — historical assignments are never
reinterpreted as manual.

## Determinism

* `AUDIT REPLAY_DETERMINISM`: repeated runs are byte-identical
  (`hash 7716790f93d7a26e`).
* `AUDIT INSERTION_ORDER`: reversing canonical entity-record key insertion
  order does not change the hash or derived staffing. ID-dependent
  deterministic tie-breaking is distinguished from true insertion-order
  dependence; no true dependence exists.
* No `Date.now()` / `Math.random()` in `src/`.

## Performance

`AUDIT PERFORMANCE`:

| Size | Workplaces / Residences | reassign command (ms) | assignJobs (ms) | per tick (ms) |
| --- | --- | ---: | ---: | ---: |
| SMALL | 10 / 5 | 0.029 | 0.382 | 0.53 |
| MEDIUM | 100 / 40 | 0.015 | 18.97 | 49.8 |
| LARGE | 400 / 150 | 0.015 | 314.1 | — |
| XL | 1000 / 400 | 0.018 | 2164.9 | — |

The reassignment command itself is a bounded **O(1)** operation (≈0.02 ms at
every size). The dominant cost is the pre-existing `assignJobs` eligibility
scan (O(colonists × workplaces) with cached access derivations); Step 10M added
only one manual-only pre-pass and no new BFS, no global optimization and no
reverse index.

## Browser verification

`e2e/reassignRun.mjs` (headless) passes 7 checks / 0 failures: automatic
allocation, inspector options (current disabled, eligible Workshop labelled with
distance and capacity), manual move, sticky manual + Material recovery
(`14 → 18`), reverse move, zero console/page errors. All other E2E suites
remain green: `run` 11, `road` 15, `transport` 10, `production` 12, `resource`
12, `food` 12, `temporal` 17, `jobs` 21, `upkeep` 35.

## UI

The Step 10M inspector surface is sufficient for the audited cases: it shows the
worker's assignment mode, lists targets with distance/workers/capacity, disables
invalid targets with a reason, and reports the outcome in the status line. No
new panel or dashboard is needed.

Audit tooling limitation (not a defect): the browser suite exercises the
"current (disabled)" and "eligible" option states directly; the disconnected and
full target *rendering* is covered by the `getReassignmentOptions` unit
evidence rather than a second browser scenario, because adding those browser
worlds would require extra E2E scaffolding. No simulation or presentation bug
was found.

## Architecture audit

`AUDIT ARCHITECTURE`: the colonist carries exactly
`id`, `residenceId`, `workplaceAssignmentMode`, `workplaceId`; there is no
`workerIds` / `workers` on any building and no reverse index. `validateReassignment`
remains the single eligibility source, reused by `applyCommand` and the
`getReassignmentOptions` query. Automatic assignment is conceptually unchanged
when no manual override exists. The command lives in domain/application;
rendering contains no simulation rule; no derived inspection state is
persisted.

## Economic audit

`AUDIT LEDGER` above shows per-tick Food/Material ledgers for automatic,
manual Farm→Workshop and manual Workshop→Farm allocations. The only
differences are the intended worker-allocation effects. Farm upkeep remains
absent, storage is still `25 × operational Workshops`, and construction
spending/upkeep ordering is untouched.

## Long-run stability

`AUDIT LONG_RUN` (60 and 240 ticks):

| Scenario | Food (240) | Material (240) | Staffed F/W |
| --- | ---: | ---: | --- |
| balanced automatic | 4000 | 48 | 2 / 2 |
| farm-heavy | 4240 | 48 | 3 / 2 |
| workshop-heavy | 3760 | 72 | 2 / 3 |
| manual mixed | 4000 | 48 | 2 / 2 |
| manual reversed | 4000 | 48 | 2 / 2 |

Every scenario is stable, lands on the expected `24 × W` Material equilibrium,
and shows no oscillation. The intended Food/Material tradeoffs are persistent
pressure, not bugs; every tested state is recoverable.

## Design classification

```text
A — Fundamental
```

Reason: manual reassignment creates a genuine player decision (1), resolves the
10K/10L workforce dead-ends with one existing action (2), preserves automatic
assignment as the default (3), creates meaningful Food ↔ Material tradeoffs (4),
adds a spatial decision axis without travel simulation (5), stays deterministic
(6) and stays architecturally contained (7).

Known residual (not a defect of 10M): a colony with **no vacant workplace at
all** (e.g. 3 Farms / 0 Workshops) still has no reassignment target, so it
cannot be rescued by this control alone. That is a "no Workshop was ever built"
failure, outside the 10M contract; it does not justify another economy audit.

## Next dependency

**Phase 3 (Needs) is complete enough to proceed.** NOVA has a fully understood
single-need loop — Food need, production, all-or-nothing consumption, shortage,
population consequence — plus a Material production flow and a real workforce
control (automatic assignment with explicit manual override). The economy is
stable, deterministic and recoverable, and the last known agency gap (the
10K/10L dead-end) is closed.

The smallest justified next dependency is therefore **not another upkeep or
workforce audit**. The next step should deliberately select the next causal
production/consumption dependency — the first additional essential
service/need — through a small design intake, rather than adding a rule by
default. No new need, resource sink or coefficient is introduced in Step 10N.

## Scope verdict

```text
COMPLETE — AUDIT
```

## Verification

* `src/` untouched: `git diff --stat -- src/` empty.
* `npx tsc --noEmit` clean; `npx eslint .` clean; `npm run build` succeeds.
* `npx vitest run` → **40 files, 809 tests passed** (21 new audit tests; no
  existing test weakened).
* E2E (headless): `run` 11, `road` 15, `transport` 10, `production` 12,
  `resource` 12, `food` 12, `temporal` 17, `jobs` 21, `upkeep` 35,
  `reassign` 7 — all pass.
* `SAVE_VERSION = 5` unchanged; save/load hash stable; deterministic replay
  (`7716790f93d7a26e`); insertion-order determinism; no `Date.now()` /
  `Math.random()` in `src/`.

Final confirmations:

```text
- automatic assignment remains the default
- valid manual assignments remain sticky
- manual assignments do not bypass mobility
- manual assignments do not bypass capacity
- invalid manual assignments return to automatic behavior
- Farm upkeep remains absent
- no new economic rule was introduced
- no unrelated simulation rule changed
- Food remains independent from road access
- distance remains an automatic assignment preference, not travel simulation
- save/load remains deterministic
- replay remains deterministic
```
