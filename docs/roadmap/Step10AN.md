# NOVA — Step 10AN — Objective Contracts & Town Qualitative-State Design

Starting commit: `7d3c5ef`

## Objective

Use the measured findings from Step 10AM to define the next progression contract:

1. turn scenario objectives from descriptive labels into **deterministic, evaluatable success conditions**;
2. identify and contract the **qualitative phenomenon that could justify Town**.

This is primarily a design-contract step.

Do not invent arbitrary thresholds.
Do not add a new economic system merely to create Town.
Do not implement Town yet unless the audit proves that an existing causal state already supports it.

---

# 1. AUDIT THE CURRENT IMPLEMENTATION

Inspect:

* `progression.ts`
* `scenarios.ts`
* scenario assembler
* objective/framing UI
* progression controller/query
* existing scenario tests
* Step 10AM audit tests
* all existing authoritative economic queries

Verify that objective evaluation can be built from existing state without duplicating simulation logic.

The dependency must remain:

```text
domain simulation
      ↓
authoritative queries
      ↓
progression/objective queries
      ↓
UI
```

Scenario data must remain declarative.

---

# 2. OBJECTIVE CONTRACT

Define a small deterministic objective model.

The objective layer must distinguish:

```text
label
description
success condition
current status
blockers
```

Do not build a generic quest framework.

A minimal data/query structure is preferred.

Objectives should be derived from existing state.

Do not persist objective progress.

Do not add SAVE_VERSION changes.

---

# 3. AUDIT ALL SIX SCENARIO OBJECTIVES

For each existing scenario:

* First Settlement
* Water Constraint
* Industrial Expansion
* Spatial Efficiency
* Population Expansion
* Recovery

Determine:

```text
Objective
Is it currently reachable?
What exact existing state proves success?
What existing state proves failure, if applicable?
What blocks success?
Does the objective create a different decision?
```

The Industrial Expansion objective is specifically suspect because Step 10AM found it unreachable under the current Water/Workforce model.

Do not silently redefine it to make it reachable.

Instead determine whether:

A. the existing objective is valid but represents an intentionally impossible challenge,

B. the objective wording is wrong,

C. the scenario starting state is wrong,

D. the current simulation lacks a causal capability required by the objective.

Only the evidence should determine the answer.

---

# 4. OBJECTIVE TYPES

Evaluate whether the existing scenarios can be represented using only a few types:

### Milestone

Example:

```text
Reach Settlement
Reach Village
Reach population N
```

Only use N where an existing causal state justifies it.

### Constraint

Example:

```text
Reach Village without Food collapse
Maintain Water balance while expanding
```

The constraint must use existing simulation state.

### Spatial

Example:

```text
Reach a progression milestone under a constrained road layout
```

Do not introduce a new spatial rule.

### Recovery

Example:

```text
Recover from an existing Food collapse precursor
```

Again, no new recovery mechanic.

Prefer a small closed set over a generic objective framework.

---

# 5. OBJECTIVE EVALUATION SEMANTICS

Define explicit deterministic semantics for:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
BLOCKED
FAILED
```

But do not automatically implement all five if the scenarios do not need them.

For each status ask:

* Can it be derived from existing state?
* Is it stable across ticks?
* Is it deterministic?
* Is it meaningful to the player?
* Does it introduce hidden state?

Avoid temporal objectives requiring persisted history unless the existing state already contains enough information.

If an objective requires historical information that is not currently persisted, document that as a deferred capability instead of adding history.

---

# 6. OBJECTIVE SUCCESS MUST BE CAUSAL

A valid objective must answer:

> "What existing game state demonstrates that I achieved this?"

Do not accept objectives that are merely prose.

For example, avoid:

```text
"Build a thriving colony"
"Develop an industrial settlement"
"Use space efficiently"
```

unless an existing measurable state gives those phrases a precise meaning.

Translate them into existing measurable consequences where possible.

---

# 7. TOWN QUALITATIVE-STATE AUDIT

Now investigate Town.

Do not start by choosing a number.

The question is:

> What changes qualitatively when a settlement becomes a Town in the existing simulation?

Inspect all existing causal phenomena:

* population
* housing
* Water capacity
* Food balance
* Material production
* Workshop operation
* workforce allocation
* construction throughput
* road networks
* road distance
* spatial efficiency
* construction crew
* settlement/village progression
* scenario constraints

Look for a state transition that changes **how the player must reason**, not merely how many buildings exist.

---

# 8. TOWN CANDIDATE TEST

For every candidate phenomenon, test:

### Criterion A — Existing causal support

Can it already be observed from current state?

### Criterion B — Qualitative change

Does crossing the state change player decisions or consequences?

### Criterion C — Reproducibility

Can different layouts/repeated runs produce the state?

### Criterion D — Readability

Can the player understand why they reached the state?

### Criterion E — Non-arbitrariness

Can the contract be explained without:

```text
population >= 6
roads >= 5
buildings >= 10
ticks >= N
```

being arbitrary?

### Criterion F — Scenario compatibility

Can existing scenarios interact with the Town state without requiring a new simulation rule?

---

# 9. PARTICULARLY AUDIT INDUSTRIALIZATION

Step 10AM found:

```text
Water capacity = 2 × staffed Wells
```

and therefore growth must consume workforce before a Workshop can operate.

Audit whether this means:

* industrialization is genuinely impossible under current rules,
* industrialization is possible only from a different initial condition,
* industrialization requires population growth before Well construction,
* or the current economic model intentionally makes industrialization a later-stage phenomenon.

Do not change the rule.

Determine whether the existing system already contains a meaningful industrial state that could become a future Town phenomenon.

---

# 10. POPULATION / WORKFORCE AUDIT

Investigate whether Town could correspond to a qualitative workforce transition.

Examples to test:

* first appearance of sustained workforce surplus
* simultaneous operation of multiple production categories
* ability to run Workshop + Farm + Well without sacrificing growth
* transition from survival infrastructure to discretionary industry

These are examples of hypotheses only.

Do not assume any of them qualifies.

Run controlled states and measure them.

---

# 11. CONSTRUCTION / INFRASTRUCTURE AUDIT

Investigate whether Town could correspond to an infrastructure transition.

Examples:

* multiple road networks
* larger connected network
* construction throughput
* road efficiency
* simultaneous construction
* crew usage

Again, do not invent a new rule.

Only existing causal consequences qualify.

---

# 12. SPATIAL AUDIT

Determine whether the current road/network model already produces a qualitative spatial transition.

Potential evidence:

```text
compact network
vs
extended network
vs
partitioned networks
```

Measure:

* Material spent on roads
* accessibility
* worker mobility
* Water service
* distance-based assignment
* construction consequences

A larger map or more roads alone is not a Town phenomenon.

A qualitative change in spatial decision-making could be.

---

# 13. TOWN CONTRACT OUTCOME

At the end classify Town:

### A — Contractable now

An existing qualitative state is sufficiently causal and measurable.

### B — Contractable after content/tuning

The phenomenon exists but current scenarios/start states do not expose it clearly.

### C — Not contractable yet

The current simulation does not contain a sufficiently qualitative Town state.

If B or C, explicitly identify the missing dependency.

Do not invent a threshold.

---

# 14. OBJECTIVE IMPLEMENTATION GATE

Do not immediately implement objectives.

First determine whether the contract is sound.

If the audit produces a clean minimal objective contract, implementation may be included in this step **only if it does not require new simulation mechanics**.

Otherwise leave implementation for the next step.

The preferred implementation shape is:

```text
scenario data
    ↓
objective definition
    ↓
pure objective query
    ↓
progression/UI
```

No framework.

---

# 15. BROWSER VALIDATION

Use the real browser.

Verify:

* default game
* each scenario
* objective label
* objective status
* objective blocker
* Settlement
* Village
* deferred Town state

Ensure no scenario load frame fabricates transient causal information.

The Step 10AM regression must remain fixed.

Run GPU/WebGL validation where available.

---

# 16. ARCHITECTURAL INVARIANTS

Confirm:

* `SAVE_VERSION === 7`
* no objective state persisted
* no scenario state persisted
* no new derived state persisted
* no domain economic rules modified
* no workforce rules modified
* no Water rules modified
* no Food rules modified
* no arbitrary Town threshold introduced
* insertion-order invariant
* deterministic identical-state output
* save/load invariant

---

# 17. REQUIRED TESTS

Run:

```text
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

Also run:

* determinism
* insertion-order
* save/load
* complete browser suite
* GPU/browser validation

Add tests only for contracts that are actually established.

---

# 18. DOCUMENTATION

Create:

```text
docs/roadmap/Step10AN.md
```

Include:

* objective audit
* six scenario objective findings
* Industrial Expansion finding
* objective semantics
* Town candidate phenomena
* measured controlled states
* Town classification
* exact missing dependency if Town remains deferred
* implementation decision
* browser/GPU validation
* final architectural QA

Do not rewrite previous roadmap reports.

---

# 19. FINAL REPORT

Return:

```text
STEP 10AN — FINAL REPORT

Starting commit:
Final commit:

OBJECTIVES
Scenarios audited:
Reachable objectives:
Unreachable objectives:
Objective types retained:
Objective status semantics:
Objective evaluation implemented: YES/NO

INDUSTRIAL EXPANSION
Finding:
Cause:
Scenario implication:

TOWN
Candidates audited:
Qualitative phenomenon identified:
Existing causal support:
Non-arbitrary:
Readable:
Reproducible:
Scenario compatible:

Town classification:
A / B / C

IMPLEMENTATION
Files changed:
Domain changes:
Persistence changes:
SAVE_VERSION:

VALIDATION
Tests:
Typecheck:
Lint:
Build:
Determinism:
Insertion-order:
Save/load:
Browser:
GPU:

NEXT DEPENDENCY:
```

## Hard constraints

Do not:

* add a resource
* add a building
* add a job type
* add logistics
* add pollution
* add adjacency mechanics
* add new transport mechanics
* add population rules
* change Water economics
* change Food economics
* change Material economics
* change workforce rules
* add persistence
* invent Town thresholds
* create a generic quest/objective framework

The purpose of this step is to extract the **next real progression contract from the simulation that already exists**.

If the simulation cannot support Town yet, say so clearly and leave it deferred.

---
# STEP 10AN — OBJECTIVE CONTRACTS & TOWN QUALITATIVE-STATE DESIGN (report)

Design-contract step with a bounded implementation: scenario objectives are now
**deterministic, evaluatable success conditions** derived from existing state
(no new mechanics), and Town was audited and left **deferred** with its exact
missing dependency named. `src/domain` is untouched.

```text
STEP 10AN — FINAL REPORT

Starting commit: 7d3c5ef ("Step 10AM: progression & scenario playability audit")
Final commit:    this commit

OBJECTIVES
  Scenarios audited: 6 / 6
  Reachable objectives: 6 / 6 (with explicit success conditions)
  Unreachable objectives: 0 (the Industrial objective is reachable as worded; the
    sustainable industry its description implies is not, and is documented)
  Objective types retained: milestone (stage) + constraint (population / Water
    capacity / Food balance / building) - a closed set of 5 requirement kinds
  Objective status semantics: completed / in_progress / failed (NOT_STARTED and
    BLOCKED deliberately not implemented: they need history or a heuristic)
  Objective evaluation implemented: YES (pure query + declarative data, no new mechanics)

INDUSTRIAL EXPANSION
  Finding: the objective as worded ("Reach Village and build a Workshop") IS reachable;
    a sustainably RUNNING Workshop is not, at any scale
  Cause: one job per colonist + ceil(P/2) Wells + ceil(P/2) Farms = P workers, so a
    balanced colony has no spare worker for industry
  Scenario implication: option B - the wording/description was imprecise; the objective
    is now evaluated (Village + Workshop built) and the description states the limitation

TOWN
  Candidates audited: 7 (industrialization, workforce surplus, simultaneous categories,
    infrastructure scale, spatial optimization, construction throughput, a genuinely new
    qualitative state)
  Qualitative phenomenon identified: none
  Existing causal support: yes for every candidate (all measured), none changes decisions
  Non-arbitrary: the rejected candidates are linear scale, not thresholds
  Readable: yes (all are already visible at Village scale)
  Reproducible: yes (controlled states, deterministic)
  Scenario compatible: yes, but no candidate needs a new staging
  Town classification: C - NOT CONTRACTABLE YET
  Missing dependency: a sustainable state that changes how the player must reason -
    the model has no spare-worker capability, so industry is only ever transient or
    deficit-based, and every other candidate is linear scale (roads, storage, crew)

IMPLEMENTATION
  Files changed: src/application/queries/objective.ts (new), src/application/scenarios.ts,
    src/index.ts, src/app/main.ts, index.html, tests/*, e2e/progressionRun.mjs,
    docs/roadmap/Step10AN.md
  Domain changes: none (git diff src/domain empty)
  Persistence changes: none
  SAVE_VERSION: 7

VALIDATION
  Tests: 69 files / 1308 tests passed (before 67 / 1290; +2 files / +18 tests)
  Typecheck: passed
  Lint: passed
  Build: passed
  Determinism: passed
  Insertion-order: passed
  Save/load: passed
  Browser: 13 / 13 suites
  GPU: ALL PASS

NEXT DEPENDENCY: an evaluated objective is now implemented, so the remaining progression
  dependency is the Town qualitative state; until the simulation can express a state that
  changes how the player must reason (industry is the strongest candidate and is blocked by
  the no-spare-worker identity), Town stays deferred and the next work is content/tuning.
```

## 1. Current implementation audit

The dependency chain is intact and objective evaluation needed no new simulation logic:

```text
domain simulation (canonical state)
  -> authoritative queries (progression, resources, networks, housing)
     -> getObjectiveStatus (pure, declarative requirements)
        -> UI (label, constraint, status, blockers)
```

Verified: calling the objective query leaves `serializeCanonicalState` byte-identical; each of
the five requirement kinds reads an existing query (`getProgression`, `getPopulationCount`,
`getWaterProductionPerTick`, `getFoodProductionPerTick`/consumption, the building counts);
scenario data remains declarative (8 data keys, now with an `objective` object instead of a
string); no parallel economic logic was introduced.

## 2. Objective contract (implemented)

```text
ObjectiveDefinition = { label, description, constraint, requirements, failsWithoutColonists }
ObjectiveRequirement =
  { kind: 'stage',         stage: 'settlement' | 'village' }
  { kind: 'population',    atLeast: number }
  { kind: 'waterCapacity', atLeast: number }
  { kind: 'foodBalance' }
  { kind: 'building',      buildingType, atLeast: number }
```

* every value is a model-produced quantity: `atLeast` values are catalog/rate consequences
  (4 colonists = 2 x 2 Water per staffed Well, etc.);
* no persistence, no SAVE_VERSION change, no progress bar, no score, no quest framework;
* `constraint` and `description` are framing text and are never evaluated.

## 3-6. The six objectives (measured)

| scenario | objective (success condition) | start status | start blockers | reachable |
| --- | --- | --- | --- | --- |
| First settlement | Reach Settlement (`stage >= settlement`) | in_progress | Reach Settlement | yes (Residence + road + Farm) |
| Water constraint | Reach Village (`stage >= village`) | in_progress | Reach Village | yes (one Well) |
| Industrial expansion | Reach Village AND a Workshop built | in_progress | Workshop built | **yes** (Village is the start; the Workshop costs 25 + 1 Water) |
| Spatial efficiency | Reach Settlement (`stage >= settlement`) | in_progress | Reach Settlement | yes (the 55-Material minimum) |
| Population expansion | Population 4 AND Water capacity 4 AND Food balance | in_progress | Population 4, Water capacity 4 | yes (2 Wells + 2 Farms, 100 Material) |
| Recovery | Reach Settlement (`stage >= settlement`) | in_progress | Reach Settlement | yes (3 connector roads) |

Every objective is reached in the unit tests with real placement commands, and two of them
(Water constraint, Industrial expansion) additionally in the browser.

**Objective types retained** (closed set, no spatial or recovery rule added): milestone = the
progression stage; constraint = the population/Water/Food/building requirements. "Spatial
Efficiency" and "Recovery" are milestone objectives whose *constraint* field carries the framing
(Material 55; the stranded Farm) - no new spatial or recovery mechanic exists.

**Status semantics**: `completed` (every requirement met), `failed` (population 0 **and** the
scenario started with colonists, one declarative bit), otherwise `in_progress` with the unmet
requirement labels as blockers. `NOT_STARTED` and `BLOCKED` were deliberately not implemented:
the first would need persisted history, the second a heuristic, while the unmet-requirement list
is already the player-visible cause. The evaluation is **momentary** (a momentary evaluation means
a colony that reaches a milestone and then loses it falls back to in_progress): this is the
deliberate trade-off of not adding history, documented as a deferred capability.

## 7-8. Town candidate audit

Controlled states (deterministic, real assignment):

**Spare-workforce identity** (balanced colony: ceil(P/2) Wells + ceil(P/2) Farms):

| population | staffed Wells | staffed Farms | Food net | Water capacity | spare workers |
| --- | --- | --- | --- | --- | --- |
| 2 | 1 | 1 | 0 | 2 | **0** |
| 3 | 2 | 1 | **-1** | 4 | **0** |
| 4 | 2 | 2 | 0 | 4 | **0** |
| 5 | 3 | 2 | **-1** | 6 | **0** |
| 6 | 3 | 3 | 0 | 6 | **0** |
| 8 | 4 | 4 | 0 | 8 | **0** |
| 10 | 5 | 5 | 0 | 10 | **0** |

**A Workshop in a balanced colony** (P = 2, 4, 6): `staffed Workshops = 0`, `Material production = 0`
in every case - the balance never frees a worker for it.

**Simultaneous three-category operation**:

| state | staffed W/F/Ws | Food net | Water capacity / need |
| --- | --- | --- | --- |
| 3 colonists, 1 Well + 1 Farm + 1 Workshop | 1 / 1 / 1 | **-1** | 2 / 3 |
| 4 colonists, 2 Wells + 1 Farm + 1 Workshop | 2 / 1 / 1 | **-2** | 4 / 4 |

| candidate | causal support | qualitative change | reproducible | readable | non-arbitrary | scenario compatible | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sustainable industrialization | yes | **no** | no | yes | yes | yes | NOT CONTRACTABLE (no spare worker) |
| sustained workforce surplus | yes | **no** | no | yes | yes | yes | NOT CONTRACTABLE (spare = 0 always) |
| simultaneous multi-category operation | yes | **no** | yes | yes | yes | yes | NOT CONTRACTABLE as a sustainable state |
| infrastructure scale | yes | **no** | yes | yes | no | yes | REJECTED (linear road cost, per-network coverage) |
| spatial optimization | yes | **no** | yes | yes | yes | yes | REJECTED (cost difference only) |
| construction throughput / crew | yes | **no** | yes | yes | no | yes | REJECTED (linear storage, one saved tick) |
| a genuinely new qualitative state | **no** | no | no | no | no | no | MISSING |

No candidate changes *how the player must reason*; all the measured differences are already
Settlement/Village-scale decisions.

## 9. Industrialization audit

Option **B** applies to the *wording*: the objective as written ("Reach Village and build a
Workshop") is exactly reachable (measured: the Workshop is built at tick 1-3 in every policy),
while the *sustainable industry* its description implies is not, because of the measured identity
`ceil(P/2) Wells + ceil(P/2) Farms = P workers`. The objective is now evaluated (Village + Workshop
built) and its description states the limitation honestly instead of promising industry. Anyone
who wants a *running, sustainable* Workshop needs a capability the model lacks - recorded as the
missing dependency for a future industrialization contract, not as a silent redefinition.

## 10-12. Population, infrastructure and spatial audits

* **Population/workforce**: spare workers are 0 at every balanced population 2-10; odd populations
  additionally run a Food deficit. No workforce transition exists to anchor a stage.
* **Infrastructure**: partitioned networks need one Well per network (already a Village-scale
  decision); larger networks cost 5 Material per cell linearly; storage is 25 per operational
  Workshop; a crew saves exactly one tick.
* **Spatial**: compact and corridor layouts produce identical flows (population 2, Food net 0,
  Water capacity 2) with different road budgets (5 vs 15 Material): a cost/optimization difference,
  not a change in kind.

## 13. Town contract outcome

```text
C — NOT CONTRACTABLE YET
```

Exact missing dependency: **a sustainable state that changes how the player must reason.** The
simulation's only candidate axis (industry) is blocked by the no-spare-worker identity, and every
other measured candidate is linear scale. No threshold was invented (`population >= 6`,
`roads >= 5`, `ticks >= N` remain rejected), and the UI continues to show `Next: not yet defined`
at Village (measured: `nextStage null`, `deferred true`, zero next conditions).

## 14. Implementation decision

Objectives **were** implemented: the contract is clean, declarative and built from existing state
with no new simulation mechanics, which the step explicitly permits. Town was **not** implemented.
The objective UI now shows the label, the constraint and the evaluated status
(`Objective — … / Constraint — … / Objective in progress — 1 / 2 (Workshop built)`,
`Objective complete`, `Objective failed — the colony is gone`).

## 15. Browser validation

```text
progression suite: ALL PASS (16 checks)
  - default: no objective, Wilderness, 3 blockers
  - all six scenarios: id, objective label AND constraint, stage, buildings
  - readability: scenario framing on the load frame, causal status after a tick, 3-line checklist
  - failure case: unrepaired Recovery stays Wilderness
  - Wilderness -> Settlement on a real repair; Settlement -> Village on a real Well
  - objective evaluation: Water constraint completes at Village; Industrial expansion
    goes in_progress -> complete when the Workshop is built
  - deferred Town label honest; save version 7 with 7 keys and no scenario/objective state
  - free play restored unchanged
run, production, temporal, water, food, resource, reassign, crew, road, transport, jobs, upkeep:
  ALL PASS (12 / 12)
GPU: ALL PASS
```

## 16. Architectural invariants

```text
SAVE_VERSION              7 (unchanged)
persisted keys            7
objective state persisted no (verified by string search in the save)
scenario state persisted  no
new derived state         none
domain economic rules     unchanged (git diff src/domain empty)
water / food / workforce  unchanged
arbitrary Town threshold  none introduced
insertion order           objective + progression JSON invariant under reversed record order
identical state           identical objective + progression output
save/load                 invariant
```

## 17-18. Tests and files

```text
typecheck: passed    lint: passed    build: passed
Vitest:   69 files / 1308 tests (before 67 / 1290; +2 files / +18 tests)
  tests/objective.test.ts                (9 tests) - requirement kinds, status semantics,
                                          the six objectives, purity/determinism/persistence
  tests/townQualitativeStateAudit.test.ts (9 tests) - the Town candidate audit
determinism / insertion-order / save-load: passed
browser: 13 / 13 suites        GPU: passed
```

Files changed:

```text
added:    src/application/queries/objective.ts
          tests/objective.test.ts
          tests/townQualitativeStateAudit.test.ts
          docs/roadmap/Step10AN.md
modified: src/application/scenarios.ts   (objective objects with declarative requirements)
          src/app/main.ts                (objective status rendering)
          src/index.ts                   (export the objective query)
          index.html                     (objective status line + style)
          tests/scenarios.test.ts        (objective shape assertions)
          tests/scenarioPlayabilityAudit.test.ts (the synthetic scenario's objective object)
          e2e/progressionRun.mjs         (objective status + constraint checks)
```

Untouched: every file under `src/domain/`, `src/renderer/`, the other application queries,
persistence, and the other test/E2E suites.

## 19. Final QA

| check | result |
| --- | --- |
| objectives are deterministic and derived | yes (pure query, byte-identical state, insertion-order invariant) |
| objectives use a closed type set | yes (5 requirement kinds, 3 statuses) |
| no objective state persisted | yes (save contains no `objective`/`scenario`) |
| no new simulation mechanic | yes (`src/domain` diff empty) |
| no arbitrary threshold | yes (every `atLeast` is a catalog/rate consequence) |
| Town not implemented | yes (deferred, `not yet defined`) |
| the Step 10AM regression stays fixed | yes (browser check) |

## 20. Next dependency

The objective layer is now implemented, so the single remaining progression dependency is the
**Town qualitative state**. The audit names it precisely: a sustainable state that changes how the
player must reason. The strongest candidate (industry) is blocked by the measured identity
`ceil(P/2) Wells + ceil(P/2) Farms = P workers`; unblocking it would require a causal capability
that does not exist today (for example a workplace that does not consume a colonist, or a
population/consumption rule change) - a future design decision, not a threshold.
Until then the evidence-supported next work is content/tuning: the scenario starts whose objective
is capped (Industrial expansion cannot grow), the opening 100-vs-105 Material gap, and any
additional scenarios that expose the existing decisions more sharply.

