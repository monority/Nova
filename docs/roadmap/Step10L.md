# Step 10L — Manual Workforce Reassignment Audit

## Mission

Perform a **design audit only** of manual workforce reassignment.

Do NOT modify `src/`.

Do NOT implement a reassignment command.

Do NOT change the simulation rules.

Do NOT change Farm upkeep.

Do NOT change Housing, Population, Food, Material, Roads, Mobility, or construction rules.

Step 10J closed the Farm-upkeep investigation.

Step 10K established that:

```text
Housing → Population → Workers
```

behaves correctly.

The remaining issue is:

```text
automatic job assignment
+
no reassignment
=
potentially irreversible workforce allocation
```

The canonical problematic scenario is:

```text
2 Residence
2 Farm
2 Workshop
```

with both workers assigned to Farms.

The Workshops can remain vacant indefinitely because there is no mechanism allowing an existing colonist to change workplace.

The purpose of Step 10L is to determine whether **manual workforce reassignment is actually the smallest and most appropriate missing control**.

This step is audit-only.

---

# 1. Core question

Answer:

> Would allowing the player to manually move an existing colonist from one workplace to another restore meaningful agency without making NOVA unnecessarily micro-management-heavy?

Compare three conceptual models:

```text
A — CURRENT
Automatic assignment only.

B — MANUAL
Automatic assignment remains the default,
but the player may explicitly move a colonist
to another eligible workplace.

C — AUTOMATIC POLICY
The simulation automatically prefers a vacant Workshop
when a colonist is currently assigned to a Farm.
```

Model C is a **counterfactual audit model only**.

Do not implement B or C.

The audit must determine which model best preserves:

* determinism;
* player agency;
* automation;
* spatial rules;
* meaningful labor competition;
* low cognitive overhead.

---

# 2. Mandatory workflow

Follow:

```text
AUDIT
→ OBSERVATIONS
→ COUNTERFACTUALS
→ DESIGN DECISION
→ NO IMPLEMENTATION
→ VERIFICATION
```

Clearly distinguish:

1. current implementation;
2. observed limitation;
3. manual reassignment counterfactual;
4. automatic-policy counterfactual;
5. design decision.

Do not treat "more control" as automatically better.

---

# 3. Repository inspection

Inspect the current implementation of:

* `ColonistState`;
* `assignJobs`;
* workplace assignment;
* Farm/Workshop competition;
* mobility eligibility;
* road accessibility;
* 09M distance preference;
* population admission;
* construction;
* canonical state;
* save/hash;
* application commands;
* UI inspection/debug information.

Confirm whether a colonist already contains enough canonical information to represent a reassignment.

Specifically verify:

```text
ColonistState
    id
    residenceId
    workplaceId
```

and determine whether workplace assignment is already the only canonical employment state.

Do not add state.

---

# 4. Define the hypothetical manual operation

Do NOT implement it.

Define a conceptual operation:

```text
reassignColonist(colonistId, workplaceId)
```

and specify its expected validation contract.

The hypothetical operation must require:

```text
colonist exists
workplace exists
workplace operational
workplace has capacity
workplace is a valid employment target
colonist residence exists
colonist can reach the workplace under current mobility rules
```

Do not add new eligibility rules.

The audit must determine whether these existing rules are sufficient.

---

# 5. Canonical problematic scenario

Reproduce:

```text
2 Residence
2 Farms
2 Workshops
```

with:

```text
2 colonists
2 Farms staffed
2 Workshops vacant
```

Record:

```text
Food
Material
staffed Farms
staffed Workshops
worker IDs
workplace IDs
road networks
mobility
```

Run for at least 60 ticks.

Confirm that the state remains inefficient without intervention.

Do not modify the simulation.

---

# 6. Manual reassignment counterfactual

Model the smallest possible intervention:

```text
Farm worker
    ↓
vacant Workshop
```

Do not execute an actual command.

Instead construct the counterfactual state transition directly inside the audit fixture.

Compare:

```text
CURRENT
2 Farm workers
0 Workshop workers

MANUAL COUNTERFACTUAL
1 Farm worker
1 Workshop worker
```

Measure:

```text
ΔFood
ΔMaterial gross
ΔMaterial net
ΔWorkshop upkeep
ΔFood stock
ΔMaterial stock
```

Expected directional difference:

```text
Food:      -2/tick
Material:  +2 gross/tick
Material:  +1 net/tick
```

Verify this from the actual simulation.

Do not assume it.

---

# 7. Recovery experiment

Test whether one manual reassignment resolves the problematic state.

Scenario:

```text
2 Residences
2 Farms
2 Workshops
Material = 5
```

Current model:

```text
2 Farm workers
0 Workshop workers
```

Manual counterfactual:

```text
1 Farm worker
1 Workshop worker
```

Measure after:

```text
1 tick
5 ticks
10 ticks
30 ticks
60 ticks
```

Determine:

```text
Material recovery
Food sustainability
Workshop staffing
Farm staffing
population
construction affordability
```

The important question:

> Does one explicit player action permanently restore a viable trajectory?

---

# 8. Reverse reassignment

The control must not only repair bad states.

Test the opposite:

```text
Workshop worker
    ↓
Farm
```

Measure:

```text
Food +2
Material gross -2
Material net -1
```

and determine whether this can be a meaningful player choice.

The player should theoretically be able to make:

```text
Food priority
```

or:

```text
Material priority
```

rather than merely repairing mistakes.

This is critical for determining whether reassignment is a genuine gameplay control or merely a recovery button.

---

# 9. Reassignment scenarios

Test at least:

### A — Farm → Workshop

```text
2F / 2W
workers: F,F
→ F,W
```

### B — Workshop → Farm

```text
2F / 2W
workers: W,W
→ W,F
```

### C — Two eligible Workshops

One worker can choose between:

```text
Workshop A
Workshop B
```

Verify that manual selection can coexist with 09M distance preference.

### D — Different distances

Compare:

```text
Workshop A = 1 road step
Workshop B = 5 road steps
```

Manual selection should be able to override the automatic preference if both are otherwise valid.

Do NOT implement this.

Determine whether allowing such an override would be desirable or problematic.

### E — Ineligible workplace

Test:

```text
no road access
disconnected network
under construction
non-operational
full capacity
```

The hypothetical manual operation must reject all invalid cases.

Do not invent new eligibility semantics.

---

# 10. Automatic-policy counterfactual

Now model C:

```text
If a colonist is assigned to a Farm
and an eligible Workshop is vacant,
automatically move the colonist to the Workshop.
```

Do NOT implement.

Measure its consequences.

Test:

```text
2F / 2W
2 workers
```

and mixed spatial cases.

Determine whether the policy:

* eliminates the F,F,W,W state;
* destroys the Farm/Workshop labor choice;
* makes Farms effectively lower priority;
* overrides deliberate player choices;
* causes oscillation;
* interacts badly with 09M distance preference;
* creates surprising worker movement.

Most importantly:

> Would this policy remove a meaningful player decision that manual reassignment would preserve?

---

# 11. Stability / oscillation audit

For the automatic-policy counterfactual only, test scenarios where:

```text
Food shortage
Material shortage
Farm/Workshop balance changes
new workplace constructed
road becomes operational
new colonist admitted
```

Determine whether workers could repeatedly move:

```text
Farm → Workshop
Workshop → Farm
Farm → Workshop
```

from tick to tick.

No implementation.

Only identify whether an automatic policy introduces instability that manual control avoids.

---

# 12. Spatial interaction

Manual reassignment must not bypass existing mobility rules.

Test:

```text
Residence
    ↓
Road network A
    ↓
Farm

Road network B
    ↓
Workshop
```

The Workshop is not eligible.

Then connect the networks.

The Workshop becomes eligible.

Determine whether manual reassignment would naturally become valid at that point.

Also test:

```text
same network
different road distances
```

Determine whether:

```text
automatic assignment
```

and:

```text
manual override
```

can coexist cleanly.

---

# 13. Multiple colonists

Test:

```text
3 colonists
2 Farms
2 Workshops
```

and:

```text
4 colonists
2 Farms
2 Workshops
```

Determine whether manual reassignment creates obvious ambiguity:

```text
which worker moves?
which workplace loses capacity?
```

The player must be able to understand the action from canonical state.

Do not introduce optimization.

---

# 14. Player-control granularity

This is a major design question.

Compare conceptually:

### Option A — Individual colonist reassignment

```text
Colonist 3:
Farm → Workshop
```

### Option B — Workplace priority

```text
Workshop priority = high
```

### Option C — Building-level labor preference

```text
Farm priority
Workshop priority
```

### Option D — Automatic correction

```text
vacant Workshop always steals a worker
```

Do not implement any of these.

Evaluate them using:

```text
agency
clarity
micro-management
determinism
spatial compatibility
```

Classify each:

```text
REAL CANDIDATE
WEAK CANDIDATE
OVER-CONTROL
UNNECESSARY
```

Do not rank them overall.

---

# 15. Automation preservation test

NOVA currently has a useful property:

> The player establishes conditions; the simulation handles routine assignment.

Determine whether manual reassignment can be an **exception mechanism** rather than becoming the normal workflow.

Ask:

```text
Normal case:
automatic assignment

Exceptional case:
player override
```

Test whether this division is coherent.

The desired model, if supported by evidence, is:

```text
automation by default
+
explicit player override
```

But do not assume this is correct.

Prove it through scenarios.

---

# 16. Persistence / determinism counterfactual

Determine what manual reassignment would imply for persistence.

Current canonical state already contains:

```text
ColonistState.workplaceId
```

Therefore determine whether a manual assignment would require:

```text
new state?
```

or merely:

```text
existing workplaceId mutation?
```

Do NOT implement.

Verify conceptually that:

```text
save
→ load
→ same workplace assignment
→ same hash
```

would be possible without schema changes.

Do not change `SAVE_VERSION`.

---

# 17. Exploit / invalid-control audit

The hypothetical manual action must not permit:

* assigning one colonist to multiple workplaces;
* bypassing road access;
* bypassing operational status;
* exceeding capacity;
* assigning to under-construction buildings;
* bypassing residence requirements;
* creating duplicate workplace references;
* non-deterministic state.

Document every rejection condition.

---

# 18. Agency analysis

Classify these separately:

### Manual reassignment

Does it restore meaningful agency?

### Automatic policy

Does it remove meaningful agency?

### Current system

Does lack of reassignment create an avoidable dead-end?

Use:

```text
REAL
WEAK
INFORMATIONAL
ABSENT
```

No overall score.

---

# 19. Safety analysis

Test:

```text
F,F,W,W at Material 5
```

with:

```text
current
manual counterfactual
automatic-policy counterfactual
```

Determine whether:

```text
manual
```

provides the smallest recovery intervention.

Also test:

```text
W,W,F,F
```

to ensure the proposed control is symmetric.

The goal is not to maximize production.

The goal is to restore player agency.

---

# 20. Design decision tree

Classify the result.

## A — Manual reassignment is the smallest correct control

Use if:

* the current system has a demonstrated irreversible allocation problem;
* one manual reassignment repairs it;
* reassignment preserves Farm/Workshop choice;
* automatic correction would remove meaningful agency;
* existing mobility/capacity rules are sufficient;
* no new economic rule is required.

Decision:

```text
AUDIT COMPLETE.
MANUAL REASSIGNMENT IS A VALID FUTURE IMPLEMENTATION STEP.
```

Do NOT implement it in 10L.

---

## B — Manual reassignment works, but is too granular

Use if:

* the recovery works;
* but selecting individual colonists creates excessive micro-management.

Identify whether:

```text
workplace priority
```

or:

```text
building-level labor preference
```

would be a better future experiment.

Do not implement.

---

## C — Automatic policy is preferable

Use only if evidence shows:

* manual control adds little agency;
* automatic correction preserves meaningful player choices;
* no oscillation occurs;
* the policy does not destroy Farm/Workshop competition.

Do not implement the policy.

Document the smallest future implementation.

---

## D — No workforce control is necessary

Use if:

* the apparent dead-end has an existing legitimate recovery;
* or the player can reasonably avoid it;
* and lack of reassignment does not materially reduce agency.

Then close the investigation.

---

# 21. Scope guardrails

Forbidden:

* modifying `src/`;
* adding a command;
* adding UI;
* modifying `ColonistState`;
* modifying `assignJobs`;
* changing Farm/Workshop rules;
* changing Food;
* changing Material;
* changing Housing;
* changing Population;
* changing Roads;
* changing Mobility;
* changing construction;
* changing SAVE_VERSION;
* adding persistence;
* adding new resources;
* adding priorities.

This step is strictly an audit.

---

# 22. Tests and documentation

Create:

```text
tests/manualWorkforceReassignmentAudit.test.ts
docs/roadmap/Step10L.md
```

Preserve this prompt in the roadmap document.

Append:

```text
# As-Built Report

## Repository

## Current Workforce Model

## Problem Reproduction

## Manual Reassignment Counterfactual

## Reverse Reassignment

## Recovery

## Invalid Reassignment Cases

## Spatial Interaction

## Multiple Colonists

## Automatic Policy Counterfactual

## Oscillation

## Player-Control Granularity

## Automation Preservation

## Persistence / Determinism

## Agency

## Safety

## Classification

## Design Decision

## Scope Verdict

## Verification
```

Use measured results.

Do not claim that reassignment is necessary unless the experiments demonstrate it.

---

# 23. Verification

Run:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Run all existing E2E suites.

Verify:

```text
SAVE_VERSION = 4
src/ untouched
save/load stable
hash stable
deterministic replay
insertion-order determinism
no Date.now()
no Math.random()
```

Do not weaken existing tests.

---

# 24. Commit

Only if the audit is complete:

```text
Step 10L: audit manual workforce reassignment
```

Expected changes:

```text
tests/manualWorkforceReassignmentAudit.test.ts
docs/roadmap/Step10L.md
```

`src/` must remain untouched.

---

# 25. Final report

Return exactly:

```text
Step 10L COMPLETE — AUDIT

Repository

Current workforce model

Problem reproduction

Manual reassignment counterfactual

Reverse reassignment

Recovery

Invalid reassignment cases

Spatial interaction

Multiple colonists

Automatic policy counterfactual

Oscillation

Player-control granularity

Automation preservation

Persistence / determinism

Agency

Safety

Classification

Design decision

Scope verdict

Verification
```

The final report must answer:

> Is manual workforce reassignment the smallest safe mechanism that restores player agency, or would it create unnecessary micro-management?

Do not implement the answer in Step 10L.



---

# As-Built Report

**Type: AUDIT. No production rule was changed.** `src/` is byte-identical to
Step 10K (`git diff -- src/` empty; `git status` shows only this file and
`tests/manualWorkforceReassignmentAudit.test.ts`). Every number below is a real
`AUDIT ...` line from that suite; re-run with

```text
npx vitest run tests/manualWorkforceReassignmentAudit.test.ts --reporter=verbose
```

Three conceptual models:

```text
A CURRENT   automatic `assignJobs` only (production code)
B MANUAL    automatic default + one explicit colonist override (harness only)
C AUTO      automatic "vacant Workshop steals a Farm worker" (harness only)
```

B and C are modelled only inside the test: a full-tick harness
(`stepWithHook`) that replaces the final assignment, with `identityHook`
byte-identical to `stepSimulation` (`AUDIT HOOK_FIDELITY`). No new state exists.

## Repository

* starting commit `2872145` (Step 10K), previous audits preserved;
* this audit commit contains `tests/manualWorkforceReassignmentAudit.test.ts`
  and `docs/roadmap/Step10L.md` only;
* `src/` untouched (`git diff -- src/` empty); `SAVE_VERSION = 4`.

## Current Workforce Model

`AUDIT COLONIST_STATE`: a colonist carries exactly `id`, `residenceId`,
`workplaceId`. **Workplace assignment is already the only canonical employment
state**, so a reassignment is a value change, not new state.

`AUDIT CONTRACT` fixes the hypothetical operation
`reassignColonist(colonistId, workplaceId)`:

```text
requires: colonist exists; workplace exists; workplace operational; workplace
          has capacity; workplace is a Farm or Workshop; colonist has a
          residence; residence and workplace are mobility-connected
rejects:  unknown ids; under-construction; non-workplace type; occupied
          workplace; no residence; no road access / disconnected network
newRules: 0
```

## Problem Reproduction

`AUDIT PROBLEM_STATE` — 2 Residences / 2 Farms / 2 Workshops, bootstrap
Material 5:

```text
colonist-1: residence building-1 -> workplace building-3 (Farm)
colonist-2: residence building-2 -> workplace building-4 (Farm)
staffedFarms 2, staffedWorkshops 0, Food 2000, Material 5
```

`AUDIT PROBLEM_60_TICKS`: after 60 ticks `Material 5`, `staffedWorkshops 0`,
`staffedFarms 2` — **unchanged**. The state is confirmed inefficient with no
intervention.

## Manual Reassignment Counterfactual

`AUDIT MANUAL_ONE_TICK` — one colonist moved Farm → Workshop
(`colonist-2: building-4 → building-5`):

| | CURRENT (2F/0W) | MANUAL (1F/1W) | Δ |
| --- | ---: | ---: | ---: |
| Food stock after 1 tick | 2002 | 2000 | **−2** |
| Material gross/tick | 0 | 2 | **+2** |
| Material net/tick (upkeep 1) | 0 | 1 | **+1** |
| staffed Farms | 2 | 1 | −1 |
| staffed Workshops | 0 | 1 | +1 |

The directional expectation is confirmed from the actual simulation.

## Reverse Reassignment

`AUDIT REVERSE_REASSIGNMENT` — Workshop-first 2F+2W (0F/2W, pop 2), one
colonist moved Workshop → Farm:

| | CURRENT (0F/2W) | MANUAL (1F/1W) | Δ |
| --- | ---: | ---: | ---: |
| Food stock after 1 tick | 1998 | 2000 | **+2** |
| Material net/tick | 2 | 1 | **−1** |
| staffed Farms | 0 | 1 | +1 |

The control is symmetric: the player can choose **Food priority** or
**Material priority**, not merely repair a mistake.

## Recovery

`AUDIT RECOVERY_MANUAL` — one sticky manual reassignment from the stuck state
(Material 5), 60 ticks:

| Tick | Material | Food | staffed F/W | population |
| ---: | ---: | ---: | --- | ---: |
| 1 | 6 | 2000 | 1 / 1 | 2 |
| 5 | 10 | 2000 | 1 / 1 | 2 |
| 10 | 15 | 2000 | 1 / 1 | 2 |
| 30 | 35 | 2000 | 1 / 1 | 2 |
| 60 | 49 | 2000 | 1 / 1 | 2 |

One explicit action permanently restores a viable trajectory: Material
accumulates, Food stays net-zero and sustainable, the Workshop is staffed and
construction is affordable.

**Implementation caveat (measured).** `AUDIT NON_STICKY_REVERT`: a *pure*
`workplaceId` mutation to a farther Workshop is reverted by `assignJobs` on the
very next tick (`building-5 → building-4`, `staffedWorkshops 0`), because
`assignJobs` preserves an existing assignment only when it is still among the
nearest. A future implementation must therefore make a manual choice **sticky**
(the override is authoritative until the player changes it). That is a control-
semantics decision, not a new economic rule and not new canonical state — the
`workplaceId` value itself is sufficient to persist it (`AUDIT PERSISTENCE`,
0 new fields, `SAVE_VERSION 4`).

## Invalid Reassignment Cases

`AUDIT SCENARIO_E` + `AUDIT INVALID_CONTROL`:

| Case | Result |
| --- | --- |
| Occupied workplace | rejected (capacity 1) |
| Roadless / disconnected network | rejected (09K mobility gate) |
| Under-construction / non-operational | rejected (operational check) |
| Non-workplace building | rejected (type check) |
| No residence | no eligible workplace |
| Two workplaces for one colonist | impossible — `workplaceId` is scalar |
| Non-deterministic state | impossible — the operation is a pure value change |

No new eligibility semantics are required.

## Spatial Interaction

`AUDIT SPATIAL_CONNECT`: a Workshop on a separate road network is **not** a
valid manual target (`[]`); once the networks are connected it becomes valid
(`['building-3']`). Manual reassignment inherits the 09K gate unchanged.

`AUDIT SCENARIO_C` / `AUDIT SPATIAL_DISTANCE`: when a colonist is on a Farm and
two Workshops are vacant and connected, **both are valid targets**
(`['building-3','building-4']`) while the automatic default is the nearest
Farm. `AUDIT SCENARIO_D`: with a near Workshop (0 road steps) and a far one
(6 road steps), the automatic choice is the near one (`building-2`); naming the
far one manually is reverted unless the control is sticky. Automatic selection
and manual override can coexist once stickiness is defined: the automatic rule
remains the default, and the override is a deliberate exception.

## Multiple Colonists

`AUDIT MULTI_3` — 3 colonists, 2F+2W: automatic staffing is 2F/1W; one manual
move (a Farm worker → the vacant Workshop) yields 1F/2W
(`staffedFarms 1`, `staffedWorkshops 2`). The action is unambiguous: it names
one colonist and one workplace, and capacity 1 means exactly one worker leaves.

`AUDIT MULTI_4` — 4 colonists, 2F+2W: 4/4 workplaces staffed, 0 unemployed,
nothing to reassign. Ambiguity only arises once the colony has more workers than
workplaces, and then the unemployed worker is the obvious mover.

## Automatic Policy Counterfactual

`AUDIT AUTO_POLICY_LITERAL` — "a vacant Workshop always takes a Farm worker":

```text
t1:  staffedFarms 0, staffedWorkshops 2
t30: population 2, Food 44
t60: population 0, Food 0      <- colony starved
```

The literal policy moves **both** Farm workers, Food production becomes 0, and
the colony starves. It also performs the player's choice for them.

`AUDIT AUTO_POLICY_ADAPTIVE` — same policy but only while Food stays
sustainable:

```text
t1:  1F / 1W
t60: 1F / 1W, Material 49
```

It keeps the colony alive, but it **settles the 2F / 2W choice automatically**:
Food-priority and Material-priority allocations are no longer reachable.
`AUDIT AUTO_POLICY_ADAPTIVE_PRESSURE` (3 colonists needing 3 Food) shows it
collapsing to 2F/1W — the same choice the player would have to make, made
silently.

## Oscillation

`AUDIT CURRENT_STABILITY`: the current automatic assignment is stable over 240
idle ticks (`staffedFarms 2`, `staffedWorkshops 0`, no churn).

`AUDIT OSCILLATION`:

```text
population 2 -> 1F / 1W
population 3 -> 2F / 1W
population 4 -> 2F / 2W
population 5 -> 2F / 2W
literalPolicy : monotone (always Workshop) -> no oscillation, but starves
adaptivePolicy: flips Farm/Workshop at the Food boundary; if population moves
                back and forth across that boundary the assignment would too
```

An automatic policy either starves (literal) or introduces an oscillation
surface (adaptive). The current model has neither problem.

## Player-Control Granularity

`AUDIT GRANULARITY`:

| Option | Class | Notes |
| --- | --- | --- |
| Individual colonist reassignment | **REAL CANDIDATE** | high agency, deterministic, 09M-compatible; needs a stickiness rule; micro-management is low at NOVA's 1–5 colonist scale |
| Workplace priority | **REAL CANDIDATE** | medium agency, low micro-management, keeps 09M inside the band |
| Building-level labour preference | WEAK CANDIDATE | medium agency, needs per-building priority state |
| Automatic correction | **OVER-CONTROL** | removes the choice; literal starves, adaptive shadows the player |

No overall ranking is produced.

## Automation Preservation

`AUDIT AUTOMATION_PRESERVED`: without an override the simulation assigns and
keeps a stable optimum over 60 ticks (`automaticStable: true`). The desired
division is coherent and measured:

```text
normal case      -> automatic assignment (unchanged)
exceptional case -> explicit player override of one colonist
```

Manual reassignment is an exception mechanism, not the normal workflow.

## Persistence / Determinism

`AUDIT PERSISTENCE`: a manual `workplaceId` change round-trips through
`serializeSave`/`loadSave` with `SAVE_VERSION 4`, **0 new state fields**, and a
stable hash. Determinism, save/load stability, insertion-order determinism and
the absence of `Date.now()` / `Math.random()` in `src/` all hold. Because
`ColonistState.workplaceId` is already canonical, no schema change would be
required by a future implementation.

## Agency

`AUDIT AGENCY`:

| Model | Class | Reason |
| --- | --- | --- |
| Manual reassignment | **REAL** | exact worker + workplace; symmetric Food/Material priority; repairs a committed dead-end |
| Automatic policy | **ABSENT** | performs the move for the player and settles the choice |
| Current system | **WEAK** | agency exists through build order and housing, but a committed allocation cannot be corrected |

## Safety

`AUDIT SAFETY`:

| State | Current | Manual | Automatic (literal) |
| --- | --- | --- | --- |
| Farm-heavy `F,F,W,W` at Material 5 | stuck (Material 5, 0 Workshops) | after 30 ticks: 1F/1W, **Material 35**, Food 2000 | **starves** (0 Farms staffed) |
| Workshop-heavy `W,W,F,F` | Food-negative (0 Farms) | after 30 ticks: 1F/1W, Material 35, Food 100 (stable) | starves/loses choice |

Manual reassignment is the smallest recovery intervention and is **symmetric**:
it repairs both the Farm-heavy Material trap and the Workshop-heavy Food drain.

## Classification

```text
A — Manual reassignment is the smallest correct control
```

Every §20-A condition holds:

* a demonstrated irreversible allocation problem exists (Problem Reproduction);
* one reassignment repairs it (Recovery: Material 5 → 49, 1F/1W, sustainable
  Food);
* reassignment preserves the Farm/Workshop choice in both directions (Reverse
  Reassignment);
* automatic correction would remove meaningful agency (literal starves,
  adaptive shadows the player);
* existing mobility/capacity rules are sufficient (Invalid Cases, Spatial
  Interaction);
* no new economic rule is required (Persistence: 0 new fields).

The only additional implementation requirement surfaced by the audit is
**override stickiness**: `assignJobs` currently reverts a non-nearest existing
assignment (`NON_STICKY_REVERT`), so a future manual control must define the
manual choice as authoritative. This is a control-semantics decision, not a new
economic rule.

## Design Decision

```text
AUDIT COMPLETE.
MANUAL REASSIGNMENT IS A VALID FUTURE IMPLEMENTATION STEP.
```

Do **not** implement it in 10L. A future implementation step should:

1. add a `reassignColonist(colonistId, workplaceId)` command validated against
   the contract in §4, reusing the existing `assignJobs` eligibility predicates;
2. make the manual assignment sticky (either a persisted per-colonist override
   flag — with a `SAVE_VERSION` bump — or a documented change to `assignJobs`'s
   preservation rule);
3. keep the automatic assignment as the default for every colonist the player
   has not overridden;
4. ship regression tests for the contract rejections, the Farm↔Workshop
   symmetry, the `F,F,W,W` recovery, determinism and save/load.

Model C (automatic policy) is rejected for now: the literal form starves the
colony and the adaptive form silently removes the player's Food/Material
priority choice. Workplace priority remains a secondary candidate but is not
the smallest control.

## Scope Verdict

```text
COMPLETE — AUDIT
```

## Verification

* `src/` untouched: `git diff --stat -- src/` empty.
* `npx tsc --noEmit` clean; `npx eslint tests/manualWorkforceReassignmentAudit.test.ts`
  clean; `npm run build` succeeds.
* `npx vitest run` → **38 files, 761 tests passed** (29 new audit tests; no
  existing test weakened).
* E2E (headless): `road` 15, `transport` 10, `production` 12, `resource` 12,
  `food` 12, `temporal` 17, `jobs` 21, `upkeep` 35, plus `run` 11 — all pass.
* `SAVE_VERSION = 4`; no persisted reassignment state added; save/load hash
  stable; deterministic replay; insertion-order determinism; no `Date.now()` /
  `Math.random()` in `src/`.
