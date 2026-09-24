# NOVA — Step 10BP — Farm/Well Workforce Contention Response Design

## Context

Step 10BO is complete.

### Commits

Measurement:

`b685f54`

Report correction:

`b5555da`

Working tree:

```text
clean
```

Focused verification:

```text
3/3 PASS
```

No changes were made to:

* runtime behavior;
* UI;
* persistence;
* scenario catalogue.

The measured first concrete scale pressure is:

> **Farm / Well workforce contention at population 3.**

Step 10BO explicitly prohibited designing the response.

This step is therefore authorized to investigate and design the **smallest coherent response** to that specific contention.

---

# Mission

Determine whether Farm/Well worker contention reveals:

1. a healthy and intentional workforce tradeoff that should remain as-is;
2. a missing player control in the existing workforce system;
3. a small workforce-system limitation that needs a minimal extension;
4. or a deeper structural problem that should remain unresolved until a later phase.

Do **not** design Town.

Do **not** introduce generic workforce specialization.

Do **not** redesign the whole labour system.

The only question for this step is:

> **When Farm and Well compete for workers at population 3, what should the player actually be able to decide, and what is the smallest system needed to make that decision meaningful?**

---

# 1. Read the actual current workforce implementation

Inspect the current implementation after 10BO.

Trace:

* colonist state;
* `workplaceId`;
* `workplaceAssignmentMode`;
* automatic assignment;
* manual assignment;
* workplace capacity;
* mobility eligibility;
* road-network eligibility;
* distance preference;
* ID tie-break;
* construction crew;
* interaction between construction assignment and workplace assignment;
* Farm;
* Well;
* Workshop.

Do not rely on old descriptions if the implementation differs.

---

# 2. Reproduce the exact population-3 contention

Recreate the 10BO measurement.

Establish the smallest deterministic setup in which:

```text
Farm
+
Well
+
population = 3
```

creates the observed contention.

Record:

* which buildings are staffed;
* which building loses a worker;
* whether the result depends on insertion order;
* whether automatic assignment chooses consistently;
* whether manual assignment can already resolve the issue;
* whether roads/distance affect the outcome;
* whether construction crew changes the outcome.

This must be the reference case for the rest of the step.

---

# 3. Determine whether this is actually a problem

Do not assume contention is bad.

A workforce bottleneck can be a valid strategy if the player is choosing:

```text
Food
vs
Water
vs
Material
```

The important question is whether the player understands and controls the tradeoff.

Determine:

### Current automatic behavior

What happens without player intervention?

### Current manual behavior

Can the player already force the desired outcome?

### Player feedback

Can the player understand:

> "My Farm and Well are competing for one available worker."

or does the UI merely show an unexplained inactive building?

### Decision quality

Does the player have a meaningful choice between:

* Food;
* Water;
* Material;
* construction;

or does the current assignment algorithm effectively make the decision for them?

---

# 4. Test the smallest existing response

Before proposing any new mechanic, test whether current controls are sufficient.

At population 3:

### Case A

Automatic assignment.

### Case B

Manually prioritize Farm.

### Case C

Manually prioritize Well.

### Case D

Construction Crew active.

Measure the resulting state.

The goal is to establish:

> Can the current system already express the intended player decision?

If yes, the likely response is **UX/feedback**, not a new simulation mechanic.

---

# 5. Investigate the real ambiguity

Determine exactly what makes the contention difficult.

Potential problems include:

### A — Assignment opacity

The system works, but the player cannot see why a building is unstaffed.

### B — Lack of prioritization

The player can manually assign workers, but doing so is too granular or fragile.

### C — Wrong automatic semantics

Automatic assignment chooses a worker/building relationship that does not reflect NOVA's intended economic priorities.

### D — No meaningful choice

The player is effectively forced into one outcome.

### E — Legitimate scarcity

The system correctly represents a limited workforce and no new mechanic is necessary.

Do not choose before measuring.

---

# 6. Explicitly evaluate a priority system

One candidate response is allowing the player to express priorities such as:

```text
Food
Water
Material
Construction
```

But do NOT implement it automatically.

First determine whether this is actually the right abstraction.

For a potential priority control ask:

1. What does the player set?
2. Is the setting global or per building?
3. How often does it need changing?
4. Does it create a meaningful tradeoff?
5. Does it interact with manual assignment?
6. Does it interact with Construction Crew?
7. What happens when two systems have equal priority?
8. Is the resulting behavior deterministic?
9. Can the player understand the outcome?
10. Does this solve only Farm/Well or does it create a broader coherent workforce rule?

If priority merely hides the existing assignment system behind another layer of UI, reject it.

---

# 7. Explicitly evaluate building-level assignment

Another candidate is allowing:

```text
Farm: staffed / unstaffed preference
Well: staffed / unstaffed preference
Workshop: staffed / unstaffed preference
```

Again, do not implement yet.

Determine whether this creates:

* useful strategic control;
* excessive micromanagement;
* conflicts with existing manual assignment;
* confusing duplicated concepts.

Prefer one coherent workforce concept over multiple overlapping controls.

---

# 8. Explicitly evaluate worker specialization

Consider, but be highly skeptical of:

```text
Farmer
Water Worker
Material Worker
```

or similar worker classes.

Ask:

* Does specialization solve a problem that manual assignment cannot?
* Does it create new strategic decisions?
* Does it require worker generation/classification?
* Does it require new persistence?
* Does it require worker availability rules?
* Does it require new UI?
* Does it require new progression?
* Does it create meaningful differentiation beyond labels?

Unless the evidence strongly supports it, reject specialization as premature.

NOVA currently has a deliberately type-blind workforce.

Do not break that property casually.

---

# 9. Evaluate automatic assignment itself

The current automatic assignment is based on existing mobility/distance/ID rules.

Determine whether the population-3 contention exposes a flaw in:

* assignment ordering;
* distance priority;
* ID tie-breaking;
* building iteration order;
* deterministic worker selection;
* handling of equally valid workplaces.

Test insertion-order invariance explicitly.

The result must not depend on:

```text
Farm created before Well
```

versus:

```text
Well created before Farm
```

unless the system explicitly defines such ordering.

If automatic assignment is technically correct but economically arbitrary, document that distinction.

---

# 10. Consider a minimal "workforce demand" abstraction

One possible design direction is to distinguish:

```text
available workers
```

from:

```text
worker demand
```

For example:

```text
Farm: 1 worker required
Well: 1 worker required
Workshop: 1 worker required
```

However, do NOT implement this automatically.

First inspect whether the current model already contains equivalent information.

If it does, do not duplicate it.

If it does not, determine whether such a demand concept would improve:

* diagnosis;
* assignment;
* UI;
* future scalability.

The goal is to avoid introducing an abstraction just because it has a good name.

---

# 11. Preserve current workforce simplicity

Any proposed solution must preserve:

* one type-blind workforce pool;
* existing automatic assignment unless demonstrably flawed;
* existing manual assignment;
* construction crew semantics;
* road mobility;
* distance-based preference;
* deterministic tie-breaking.

Do not introduce:

* professions;
* wages;
* happiness;
* schedules;
* shifts;
* worker fatigue;
* experience;
* worker housing assignment;
* job qualifications;

unless the measurement proves one is necessary.

It is extremely unlikely that this single contention requires any of them.

---

# 12. Test whether the contention is actually desirable

This is important.

Consider the possibility that the population-3 pressure is exactly what NOVA needs:

```text
3 colonists
→ cannot staff everything
→ player must choose what matters
```

If that is the intended economic pressure, then the correct response may simply be:

> Keep the simulation unchanged and make the tradeoff much more legible.

Evaluate that possibility seriously.

Do not "fix" scarcity just because it looks inconvenient.

---

# 13. UX investigation

Inspect the real UI at the population-3 contention.

Determine whether the player can answer:

1. How many workers do I have?
2. How many workers are being used?
3. Which buildings are staffed?
4. Which buildings are waiting for workers?
5. Why is this building inactive?
6. Which assignment is causing the contention?
7. How can I change it?

Identify the **minimum missing information**.

Do not redesign the entire workforce panel.

Do not add dashboards.

Do not add generic cards.

---

# 14. Spatial interaction

Because workforce eligibility depends on road networks and distance, determine whether the contention can already be influenced spatially.

For example:

```text
same workers
same buildings
different road/layout
```

Can the player change workplace eligibility or distance enough to alter the outcome?

If yes, this is important:

> The existing spatial system may already turn workforce scarcity into a layout decision.

Measure that before adding workforce controls.

Do not create a priority mechanic if spatial planning already provides the intended strategic choice.

---

# 15. Candidate responses

After measurement, classify the response into one of these:

## Option A — Keep simulation unchanged

The contention is healthy.

Only improve diagnosis/feedback if necessary.

## Option B — Minimal UX improvement

The player already has enough control, but cannot understand the contention.

Implement only the missing feedback.

## Option C — Minimal workforce control

A small explicit control is required to express an otherwise meaningful player decision.

Define the smallest possible control.

## Option D — Automatic assignment correction

The existing algorithm is producing an unintended result.

Fix the algorithm while preserving its current conceptual model.

## Option E — Deeper redesign

Only choose this if the current model genuinely cannot express the required decision.

If this is selected, do **not** implement the redesign in this step. Produce a separate proposal.

---

# 16. Do not touch Town

Town remains:

```text
undefined
```

Do not create:

* Town threshold;
* Town unlock;
* Town building;
* Town requirement;
* progression changes.

The population-3 contention is evidence about the current simulation, not automatically a Town mechanic.

---

# 17. Do not reopen Storage

Step 10BM already established:

* Material = active reserve;
* Food = inert storage;
* Water = inert storage;
* StorageHub persistence shape remains;
* no storage controls.

Do not modify any of these.

If Material reserve interacts with workforce contention, document the interaction only.

---

# 18. Do not add scenarios

The player-facing scenario catalogue remains closed at 8.

Use:

* deterministic test fixtures;
* existing scenarios;
* focused simulation tests.

Do not add a ninth scenario for this issue unless there is an exceptionally strong reason, and if so document it rather than silently adding it.

---

# 19. Architecture decision

At the end of the investigation, produce an explicit architecture verdict:

### Workforce model

Keep / refine / redesign.

### Assignment model

Keep / refine / redesign.

### Player control

None / UX only / minimal control / deeper redesign.

### Persistence

No change / required change.

### Derived state

What remains derived.

### Determinism

How the decision remains insertion-order invariant.

---

# 20. Implementation boundary

This is primarily a **design + evidence step**.

Preferred outcome:

```text
AUDIT
→ reproduce contention
→ determine whether it is desirable
→ test current controls
→ identify exact missing capability, if any
→ choose smallest response
→ define implementation contract
```

Do not implement a broad workforce redesign.

If the correct response is clearly a tiny UX correction, it may be implemented in this step.

Otherwise stop at the design contract.

---

# 21. Verification

If design-only:

* focused deterministic tests may be added;
* no runtime behavior should change;
* no UI changes;
* no persistence changes.

If a minimal UX or algorithm correction is implemented:

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
* save/load if affected;
* `git diff --check`;
* real Chromium;
* headed GPU validation.

The known unrelated timeout:

`industrialHeadroomTownDecision.test.ts`

must remain clearly separated from any new failure.

---

# 22. Required final report

Return:

```text id="u9s0qj"
STEP 10BP — WORKFORCE CONTENTION REPORT

Commit:
Working tree:

REFERENCE CASE
- population:
- Farm:
- Well:
- Workshop:
- workers:
- roads:
- networks:
- exact contention:

CURRENT AUTOMATIC ASSIGNMENT
- result:
- deterministic:
- insertion-order invariant:
- economically meaningful:

CURRENT MANUAL ASSIGNMENT
- Farm priority possible:
- Well priority possible:
- construction interaction:
- usability:

SPATIAL EFFECT
- layout can change contention:
- road distance effect:
- network effect:

UX
- worker visibility:
- staffed/unmanned visibility:
- cause visibility:
- player response visibility:

CANDIDATES

A — Keep as-is
- result:

B — UX improvement
- result:

C — Minimal workforce control
- result:

D — Assignment correction
- result:

E — Deeper redesign
- result:

SELECTED RESPONSE
- option:
- why:
- exact player decision:
- exact tradeoff:
- smallest required system:

WORKFORCE ARCHITECTURE
- workforce model:
- assignment model:
- manual assignment:
- construction crew:
- determinism:
- persistence:

TOWN
- remains undefined: YES

STORAGE
- unchanged: YES

SCENARIOS
- catalogue unchanged: YES

IMPLEMENTATION
- runtime:
- UI:
- rendering:
- persistence:
- tests:

VALIDATION
- typecheck:
- lint:
- build:
- focused tests:
- full Vitest:
- determinism:
- insertion-order:
- save/load:
- browser:
- GPU:
- diff check:

KNOWN LIMITATIONS
...

NEXT JUSTIFIED STEP
...
```

---

# Success criterion

10BP succeeds if we can state precisely:

> **At population 3, Farm/Well contention is [a desirable scarcity / a UX problem / an assignment problem / a missing-control problem], and the smallest coherent response is [specific response].**

The step fails if we simply conclude:

> "Workers are scarce, therefore add specialization."

Do not add complexity to eliminate a pressure that may itself be the intended gameplay.

The objective is not to make the workforce frictionless.

The objective is to make sure that when NOVA forces the player to choose between **Food, Water, Material and construction**, that choice is:

* intentional;
* understandable;
* deterministic;
* spatially meaningful where appropriate;
* and not accidentally determined by implementation details.

---

# Documentation (as-built)

## STEP 10BP — WORKFORCE CONTENTION REPORT

### Commit

Working tree: Step 10BP prompt and audit are uncommitted user/working files. No production commit was created.

### Reference case

Deterministic fixture: `nova-step10bp`, 16×8 world, three operational Residences, one connected operational road row, two Farms, two Wells, three colonists, and high resource stock to isolate workforce allocation.

- population: 3
- Farm: 2 operational
- Well: 2 operational
- Workshop: 0
- workers: 3
- roads: 11
- networks: 1
- employment: 3 employed, 0 unemployed, 4 jobs, 1 vacant job
- exact contention: three type-blind workers compete for four one-worker workplaces; automatic assignment staffs two Farms and one Well in the reference geometry

The fixture is temporary and deterministic. It is not a ninth scenario and does not alter the scenario catalogue.

## Current automatic assignment

- result: `assignJobs` scans colonists in ascending ID, considers all operational Farm/Well/Workshop jobs in one pool, chooses the eligible workplace with the smallest operational-road distance, and breaks equal-distance ties by ascending building ID.
- deterministic: yes
- insertion-order invariant: yes for the same canonical IDs; reversing the insertion order of building, road, and colonist records produced the same hash and result.
- economically meaningful: the rule is spatially meaningful but type-blind. The measured 2F/1W result is not a Food priority. Moving Well buildings closer on the same connected network changed the result to 1F/2W.
- important correction to Step 10BO: its “automatic assignment prioritizes Food” wording describes the fixture outcome, not the implementation contract. The current source explicitly has no building-type priority.

## Current manual assignment

- Farm priority possible: yes. From the spatial variant, moving one worker from a Well to the vacant Farm changed 1F/2W to 2F/1W.
- Well priority possible: yes. From the reference variant, moving one worker from a Farm to the vacant Well changed 2F/1W to 1F/2W.
- construction interaction: construction crew assignment is manual and mutually exclusive with a workplace; it clears `workplaceId`, sets `constructionAssignmentId`, and `assignJobs` excludes the colonist until the crew is released or the site completes.
- usability: the domain command and reassignment options expose the required controls, but the UI only exposes reassignment from a selected staffed workplace. A vacant workplace displays `Worker — none (vacant)` and does not state that all workers are already assigned or that a job remains unfilled.

## Spatial effect

- layout can change contention: yes
- road distance effect: yes. With the same buildings and three workers, moving two Wells into nearer positions changed the staffed mix from 2F/1W to 1F/2W.
- network effect: all reference buildings shared one operational network. A disconnected or unreachable workplace remains ineligible under the existing mobility rule; no new network rule was introduced.

## UX

- worker visibility: the HUD shows `Jobs: 3 / 4`; this proves that three workers are assigned and one capacity slot remains, but does not name the contention.
- staffed/unmanned visibility: staffed buildings identify their worker; vacant production buildings identify zero output and `Worker — none (vacant)`.
- cause visibility: incomplete. The UI does not currently say that all three workers are assigned, nor that the vacant job is the result of workforce scarcity rather than a disconnected building.
- player response visibility: the existing reassignment dropdown shows eligible vacant targets, distance, and occupancy, but the player must start from a staffed building. There is no direct action on the vacant workplace.

Minimum missing information:

```text
This workplace is vacant because all 3 colonists are currently assigned.
There are 3 employed workers and 1 unfilled job; use Move worker from a staffed workplace to reallocate.
```

The exact copy should be derived from existing employment counts and the building’s existing accessibility/status. No new persisted diagnosis is needed.

## Candidates

### A — Keep as-is

- result: rejected. The scarcity is valid, but the current vacant-state copy leaves the player to infer the cause and discover the reallocation path.

### B — UX improvement

- result: selected. Add a derived, presentation-only explanation to the selected workplace inspection and make the existing reassignment route discoverable from the current UI vocabulary. Do not change assignment, capacity, or resources.

### C — Minimal workforce control

- result: rejected. Manual reassignment already expresses the meaningful choice. A global or per-building priority control would duplicate that choice and introduce a second workforce policy.

### D — Assignment correction

- result: rejected. The algorithm is deterministic and matches its documented type-blind distance/ID contract. The reference result is not an unintended Food-first policy.

### E — Deeper redesign

- result: rejected. No evidence requires professions, generic labour demand, wages, fatigue, qualifications, or a workforce framework.

## Selected response

- option: B — minimal UX improvement
- why: the player already has the required agency, but the current feedback does not identify workforce scarcity or guide the existing reassignment action.
- exact player decision: which productive service receives the finite worker set, and when construction temporarily receives one.
- exact tradeoff: Food versus Water in the reference case; Material when a Workshop exists; construction progress when a crew is assigned.
- smallest required system: a derived presentation projection over existing `EmploymentSummary`, building inspection, `countWorkersAt`, and accessibility/status. It must not persist or alter canonical workforce state.

## Workforce architecture

- workforce model: keep the single type-blind colonist pool; no professions or worker classes.
- assignment model: keep distance-then-building-ID automatic assignment; it is deterministic, insertion-order invariant for fixed IDs, and spatially meaningful.
- manual assignment: keep `reassignColonist`; manual assignments remain sticky while valid and are revalidated by existing operational, capacity, and mobility rules.
- construction crew: keep the existing manual, mutually exclusive assignment; it is already a concrete player tradeoff and requires no new labour abstraction.
- determinism: all diagnosis must derive from sorted canonical iteration and existing validated queries. No new tie-break or priority state.
- persistence: no change; `workplaceId`, `workplaceAssignmentMode`, and `constructionAssignmentId` already capture the canonical relationships.

## Town

- remains undefined: YES

## Storage

- unchanged: YES. Material reserve and the StorageHub were not involved in the contention fixture and were not modified.

## Scenarios

- catalogue unchanged: YES

## Implementation

- runtime: none
- UI: none; the selected response is a contract for the next implementation step
- rendering: none
- persistence: none
- tests: `tests/workforceContentionResponseAudit.test.ts`, six deterministic audit tests

## Validation

- typecheck: PASS
- lint: PASS
- build: PASS
- focused tests: 6 PASS
- full Vitest: 1,653 / 1,654 PASS; one unrelated timeout in `productionRatioTuningAudit.test.ts` (`Town candidate gate`, 5-second test timeout)
- determinism: PASS in focused audit; reversed record insertion order preserved assignment hash
- insertion-order: PASS in focused audit
- save/load: PASS in focused audit; serialized state and restored assignment agree
- browser: not run; no UI change
- GPU: not run; no rendering change
- diff check: PASS

## Known limitations

- The fixture isolates one connected network and does not prove a spatial chokepoint or a disconnected-colony failure.
- The selected UX response is specified but not implemented in this design step.
- The current UI contract test suite verifies the presence of reassignment controls, not the new explanatory copy.
- Step 10BO’s “Food-first” wording should be read as an observation of its fixture, not as a global assignment priority.

## Next justified step

Implement the selected derived UX feedback only: explain the all-workers-assigned/vacant-job condition on a selected workplace and make the existing “Move worker” path discoverable from that state. Do not add assignment priority, professions, Town rules, or persistence. Add focused UI/query coverage and browser validation for that small correction.

