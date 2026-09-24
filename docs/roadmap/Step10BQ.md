# NOVA — Step 10BQ — Workforce Contention Feedback

## Context

Step 10BP is complete.

Commit:

`bd0df93`

Working tree is clean except for the previously existing user-owned untracked file:

```text
docs/roadmap/Step10BO - Copy.md
```

This file must remain untouched and must not be committed.

---

# Step 10BP result

The workforce contention audit established:

* workforce remains type-blind;
* automatic assignment is deterministic;
* assignment order is:

```text
smallest operational-road distance
→ building ID tie-break
```

* the observed `2 Farms / 1 Well` result from 10BO was fixture-specific;
* a spatial variant can produce `1 Farm / 2 Wells` with the same worker count;
* therefore there is no hidden Food-first or Water-first economic priority;
* manual reassignment already provides player agency;
* Construction Crew already provides a separate explicit workforce choice;
* insertion-order invariance holds;
* save/load equivalence holds.

Selected response:

> **Option B — minimal UX improvement.**

The actual missing capability is not a new workforce rule.

It is clearer feedback when:

```text
all available workers are already assigned
+
another operational workplace remains vacant
```

The player should understand that the building is vacant because of **workforce contention**, rather than because of an unexplained failure.

---

# Mission

Implement only the minimal UX improvement identified by 10BP.

The player should be able to distinguish:

```text
building has no worker because workers are unavailable
```

from:

```text
building is inactive for another reason
```

Do not change workforce allocation.

Do not change economics.

Do not add worker priorities.

Do not add professions.

Do not change Town.

---

# 1. Audit the existing UI first

Inspect the current UI implementation and identify:

* how building operational/inactive state is displayed;
* how worker assignment is displayed;
* existing diagnostic/status messaging;
* existing placement/action feedback;
* current workforce information;
* current wording conventions.

Use the existing visual language.

Do not create a new workforce panel unless the current architecture genuinely has nowhere appropriate to expose the information.

---

# 2. Define the exact condition

The new feedback must be derived from authoritative simulation state.

The intended condition is approximately:

```text
workplace is eligible to operate
AND
workplace requires a worker
AND
workplace has no assigned worker
AND
there are no currently available eligible workers
```

However, inspect the real implementation and use the project's existing authoritative predicates rather than duplicating workforce logic in the UI.

Do NOT simply check:

```text
workers.length === 0
```

because eligibility is spatial and assignment-aware.

The diagnostic must distinguish:

### Workforce contention

```text
worker demand exists
but all eligible workers are already committed
```

from:

### No workforce demand

No worker is required.

### No eligible worker

The workplace cannot currently receive a worker for another authoritative reason, such as mobility/accessibility.

### Other inactive state

The building is blocked by another existing condition.

Do not collapse these cases into one generic message.

---

# 3. Prefer derived diagnostic state

If the application already has a diagnostic/query layer, extend it there.

Preferred architecture:

```text
SimulationState
    ↓
authoritative workforce query
    ↓
derived diagnostic
    ↓
UI
```

Avoid:

```text
UI inspects raw simulation state
→ duplicates workforce rules
```

Do not persist the diagnostic.

Do not add it to `SimulationState`.

Do not add it to saves.

Do not add it to hashes.

---

# 4. Minimal user-facing feedback

Use concise wording consistent with the existing UI.

The essential information is:

> **No worker available — all eligible workers are assigned.**

The exact wording may be adapted to the application's existing terminology.

If the UI already exposes worker counts, an even better compact formulation may be possible, such as:

> `No worker available · all workers assigned`

Do not add a long explanation.

Do not add tooltips unless the existing UI architecture already uses them naturally.

Do not introduce warning colors if the application already has an established semantic palette.

---

# 5. Make the feedback contextual

The message should appear only when relevant.

For example:

```text
Farm
Operational
No worker available · all workers assigned
```

should be possible.

But an inaccessible workplace should not incorrectly say:

```text
No worker available
```

if the actual reason is:

```text
not connected
```

Likewise, a building under construction must not display workforce contention.

The diagnostic hierarchy should preserve existing causes.

---

# 6. Do not change assignment behavior

The following must remain exactly unchanged:

* automatic assignment;
* distance ordering;
* building ID tie-break;
* manual assignment;
* invalid manual fallback;
* construction crew;
* mutual exclusion;
* road eligibility;
* workforce capacity.

A before/after simulation comparison should produce identical workforce assignments for identical inputs.

---

# 7. Do not introduce priority controls

Explicitly do NOT implement:

* Food priority;
* Water priority;
* Material priority;
* Construction priority;
* building priority;
* worker priority;
* global workforce priority.

10BP established that these are not currently required.

The player already has manual assignment.

---

# 8. Test the exact diagnostic matrix

Add focused tests for at least:

## Case A — staffed workplace

Expected:

```text
no contention diagnostic
```

## Case B — vacant workplace with an eligible unassigned worker

Expected:

```text
no contention diagnostic
```

because the worker should be available for assignment.

## Case C — vacant workplace and all eligible workers assigned elsewhere

Expected:

```text
workforce contention diagnostic
```

## Case D — workplace inaccessible

Expected:

```text
existing accessibility/mobility reason
```

not workforce contention.

## Case E — building under construction

Expected:

```text
construction state
```

not workforce contention.

## Case F — manual reassignment

When the player manually moves a worker onto the vacant workplace:

```text
contention diagnostic disappears
```

## Case G — construction crew

When a worker is assigned to construction:

```text
workplace availability updates correctly
```

and no stale diagnostic remains.

## Case H — insertion-order

Create equivalent Farm/Well/Workshop layouts in different insertion orders.

The diagnostic must remain equivalent.

---

# 9. Save/load

Because the diagnostic is derived:

```text
save
→ load
→ recompute
```

must produce the same diagnostic.

Do not persist the message/state itself.

Add a focused save/load assertion if useful.

Do not bump `SAVE_VERSION`.

---

# 10. Browser validation

This step changes UI behavior, so real browser validation is mandatory.

Use a deterministic fixture reproducing the 10BO contention.

Verify in headed Chromium:

### Contention state

The vacant workplace clearly communicates:

```text
no worker available / all workers assigned
```

### Manual resolution

After reassigning a worker:

```text
diagnostic disappears
```

### Spatial variant

Move the relevant buildings so that assignment changes.

Verify that the displayed diagnosis follows the actual simulation state rather than assuming Farm/Well priority.

### Other inactive causes

Verify that:

* inaccessible building;
* under-construction building;
* unstaffed building with an available worker;

do not receive the wrong contention message.

---

# 11. GPU validation

Run the existing headed GPU workflow.

Confirm:

* WebGL2 works;
* NVIDIA GPU is used;
* no visual regression;
* no new runtime error;
* diagnostic remains readable at the tested viewport.

Do not perform a visual redesign.

---

# 12. Responsive validation

At minimum verify the existing project viewport targets:

```text
1280×800
420×740
360×640
```

The new diagnostic must not:

* overflow;
* cover critical controls;
* force horizontal scrolling;
* make building information unusable.

If space is constrained, prefer concise wording rather than a new layout.

---

# 13. Regression requirements

Run:

```text
pnpm typecheck
pnpm lint
pnpm build
```

Then:

* focused workforce tests;
* full Vitest;
* determinism;
* insertion-order;
* save/load;
* browser headed;
* GPU;
* `git diff --check`.

Known unrelated timeout:

```text
productionRatioTuningAudit.test.ts
```

must remain clearly documented if it persists.

Do not silently classify it as a regression.

---

# 14. Architectural constraints

Preserve:

* deterministic simulation;
* domain/application/rendering separation;
* derived state;
* no persisted UI state;
* no duplicate workforce rules in React components;
* existing assignment semantics;
* existing save format.

Do not introduce:

```text
WorkforcePrioritySystem
WorkerTypeSystem
JobClassSystem
WorkforceManager
```

unless an existing architectural boundary genuinely requires a corresponding name.

The desired implementation should be small.

---

# 15. Non-goals

This step must NOT add:

* worker specialization;
* professions;
* workforce priorities;
* worker wages;
* happiness;
* shifts;
* schedules;
* new buildings;
* new resources;
* Town;
* new progression;
* Storage changes;
* new scenarios;
* logistics;
* transportation;
* housing changes;
* economic rebalance.

---

# 16. Final product interpretation

After implementation, verify that the resulting player experience is:

```text
I have 3 colonists.
Farm and Well both need workers.
One worker is already committed.
The vacant workplace tells me why it is inactive.
I can manually reassign a worker if I want.
```

That is the entire intended improvement.

The simulation should remain intentionally demanding.

The objective is **legibility**, not removal of scarcity.

---

# 17. Required final report

Return:

```text
STEP 10BQ — FINAL REPORT

Commit:
Working tree:

DIAGNOSTIC
- authoritative source:
- exact contention condition:
- existing-cause precedence:
- derived or persisted:

UI
- wording:
- location:
- responsive behavior:
- visual changes:

WORKFORCE
- automatic assignment unchanged:
- distance ordering unchanged:
- ID tie-break unchanged:
- manual assignment unchanged:
- construction crew unchanged:

PERSISTENCE
- SAVE_VERSION:
- diagnostic persisted: NO
- save/load equivalence:

TESTS
- contention:
- available worker:
- inaccessible:
- construction:
- manual reassignment:
- construction crew:
- insertion-order:
- save/load:

VALIDATION
- typecheck:
- lint:
- build:
- focused tests:
- full Vitest:
- determinism:
- insertion-order:
- save/load:
- browser headed:
- GPU:
- diff check:

KNOWN LIMITATIONS
...

TOWN
- remains undefined: YES

STORAGE
- unchanged: YES

NEXT JUSTIFIED STEP:
...
```

---

# Success criterion

10BQ is successful if:

> **The exact workforce scarcity measured in 10BO/10BP remains unchanged, but the player can now understand why a workplace is vacant and can use the existing manual assignment mechanism to respond.**

No new economic rule should be necessary.

No new workforce abstraction should be necessary.

No Town mechanic should be introduced.

The desired change is:

```text
same simulation
+
better diagnosis
=
better player agency
```

---

# Documentation (as-built)

## STEP 10BQ — FINAL REPORT

### Commit

`59fba9e` — Step 10BQ: explain workforce contention

### Working tree

The only unrelated file left untracked is the previously existing user-owned `docs/roadmap/Step10BO - Copy.md`.

## Diagnostic

- authoritative source: `getWorkplaceWorkforceDiagnosis(state, buildingId)` in `src/application/queries/inspection.ts`.
- exact contention condition: an operational, accessible Farm/Well/Workshop has no worker, has no unassigned eligible colonist, and has connected colonists already committed elsewhere or to construction.
- existing-cause precedence: unknown/not-workplace → not operational → no connected colonist/accessibility → available eligible worker → worker shortage → staffed.
- derived or persisted: derived application projection only; not canonical state, save data, hashes, or a new simulation rule.

The query reuses `areBuildingsMobilityConnected`, `validateReassignment`, `countWorkersAt`, and sorted colonist iteration. It does not duplicate workforce capacity or assignment rules.

## UI

- wording: `Worker — none · no worker available: all eligible workers assigned`.
- location: existing selected-building `inspection-worker` line; no new panel.
- responsive behavior: rows wrap and controls use border-box/max-width constraints; verified at 1280×800, 420×740, and 360×640 with no body or HUD overflow.
- visual changes: contextual worker copy only, plus narrow-viewport wrapping needed to keep the existing HUD controls readable.

An unavailable worker with an eligible unassigned colonist is shown as `eligible worker available`; an inaccessible workplace remains `no eligible worker (no road access)`. Under-construction buildings retain their existing construction presentation.

## Workforce

- automatic assignment unchanged: yes.
- distance ordering unchanged: yes.
- ID tie-break unchanged: yes.
- manual assignment unchanged: yes; the existing Move worker route now has a clear destination state.
- construction crew unchanged: yes; construction commitment is included in the derived shortage accounting and remains mutually exclusive with workplace employment.

## Persistence

- SAVE_VERSION: 8.
- diagnostic persisted: NO.
- save/load equivalence: focused query test confirms the derived diagnosis is identical after serialization and load.

## Tests

- contention: 10BQ diagnostic matrix and headed browser E2E.
- available worker: diagnostic matrix.
- inaccessible: diagnostic matrix and existing inspection path.
- construction: diagnostic matrix and existing presentation behavior.
- manual reassignment: diagnostic matrix and headed browser E2E.
- construction crew: existing focused workforce coverage remains authoritative; the query includes committed crew state.
- insertion-order: existing 10BP audit plus unchanged sorted query traversal.
- save/load: focused diagnostic matrix.

Added `tests/workforceContentionFeedback.test.ts` with 6 passing tests. Added `e2e/workforceContentionFeedbackRun.mjs` and `test:e2e:workforce-contention` for the real UI contention path. The E2E uses a localhost-only serialized fixture loader on the existing `window.__nova` test hook; this is not a player-facing control and is disabled for non-localhost hosts.

## Validation

- typecheck: PASS.
- lint: PASS.
- build: PASS.
- focused tests: 12/12 PASS across 2 workforce suites; compatibility/architecture subset 50/50 PASS.
- full Vitest: 1,656 / 1,660 PASS; four unrelated 5-second timeouts remain in `industrialHeadroomTownDecision.test.ts` (3) and `productionRatioTuningAudit.test.ts` (1).
- determinism: PASS in focused audit and unchanged simulation tests.
- insertion-order: PASS in focused audit.
- save/load: PASS in focused diagnostic test.
- browser headed: PASS via `pnpm test:e2e:workforce-contention`; exact contention, manual resolution, zero non-favicon browser errors, and all required viewports verified.
- GPU: PASS via `pnpm test:e2e:gpu`; WebGL2, NVIDIA RTX 3070, Three.js, interaction, simulation, and zero console/page errors verified.
- diff check: PASS.

## Known limitations

- The diagnostic explains the current workforce cause but does not recommend a global economic priority; that remains intentional.
- The browser fixture loader is a localhost-only test hook, not a game feature.
- The full-suite timeout profile remains sensitive to machine load in the two existing heavy audit files; no new failure was introduced by 10BQ.
- The message is intentionally concise and does not add a new alert palette or dashboard.

## Town

- remains undefined: YES

## Storage

- unchanged: YES

## Next justified step

Evaluate the broader player-facing readability of the new workforce explanation in the existing inspection/HUD surfaces. Do not add assignment priority, professions, Town rules, or new economic mechanics unless a new measured failure justifies them.

