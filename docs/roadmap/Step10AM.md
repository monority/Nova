# NOVA — Step 10AM — Progression & Scenario Playability Audit

Starting commit: `8ae5331`

## Objective

Audit the newly implemented Settlement/Village progression and six scenario archetypes **as an actual playable content layer**, before designing Town+.

This is an audit/design step.

Do **not** implement new simulation mechanics.
Do **not** implement Town, City, Metropolis, or Autonome conditions.
Do **not** change economic, workforce, water, food, road, construction, or spatial rules.

The goal is to determine whether the current progression/scenario layer produces sufficiently different and readable decisions to justify extending it.

---

## 1. AUDIT FIRST

Inspect the implementation from Step 10AL:

* progression query
* blocker computation
* scenario data
* deterministic scenario assembler
* controller loading
* existing panel/UI integration
* scenario tests
* browser progression suite
* current roadmap/docs

Verify that the architecture remains:

```text
simulation/domain
        ↓
authoritative queries
        ↓
progression query
        ↓
UI framing
```

and:

```text
scenario data
        ↓
shared deterministic assembler
        ↓
existing simulation
```

No parallel economic logic must exist inside progression or scenarios.

---

# 2. DEFINE THE AUDIT MODEL

Treat the six scenarios as six different **initial conditions/objectives over the same simulation**, not six different game modes.

Audit each scenario against:

1. starting state
2. immediately available actions
3. first meaningful decision
4. Settlement path
5. Village path
6. resource bottleneck encountered
7. workforce bottleneck encountered
8. spatial/road consequence
9. failure/recovery possibility
10. number of materially different trajectories
11. whether the objective changes behavior
12. whether the scenario can be understood from the existing UI

Do not award value merely because two scenarios have different numbers.

A scenario is meaningful only if its initial conditions or constraint produce a different **decision space or consequence**.

---

# 3. AUDIT THE SIX SCENARIOS

Evaluate all six currently implemented archetypes:

* First Settlement
* Water Constraint
* Industrial Expansion
* Spatial Efficiency
* Population Expansion
* Recovery

For each one, record:

```text
Scenario
Initial state
Objective
First meaningful decision
Primary constraint
Secondary constraint
Expected Settlement path
Expected Village path
Failure mode
Recovery possibility
Distinctive consequence
```

Then run them through the real simulation.

Do not rely solely on static inspection.

Use deterministic scripted runs where useful.

---

# 4. MEASURE DECISION DIFFERENTIATION

For each scenario, compare at least two plausible player policies.

Examples:

* compact vs extended roads
* early Well vs delayed Well
* Farm-first vs infrastructure-first
* Workshop-first vs population-first
* conservative vs aggressive expansion
* recovery-first vs growth-first

The exact policies should emerge from the actual scenario.

Measure observable differences such as:

* Settlement tick
* Village tick
* population
* Food balance
* Water capacity
* Material stock
* road count
* building count
* worker allocation
* failure/recovery state

Do not invent new metrics if existing state already answers the question.

---

# 5. TEST THE TWO CARRIED-FORWARD FINDINGS

## A. Opening budget

Current finding:

```text
100 starting Material
105 minimum required for the canonical Village opening
```

Audit whether this is:

* an intentional pressure created by the existing economy,
* an accidental tuning mismatch,
* or simply one viable opening among several.

Test whether changing only the construction order allows materially different outcomes.

Do **not** change the 100 Material value during this step.

The result must be a factual design finding, not a tuning decision.

---

## B. Settlement-condition dependency

Current Settlement conditions:

```text
population >= 1
Food balance
operational road network
```

Audit their actual independence.

Determine which conditions are:

* genuinely independent,
* causally implied by another condition,
* merely useful as separate UI explanations.

Do not simplify the progression contract automatically.

The question is whether the redundancy improves player readability or creates misleading information.

---

# 6. OBJECTIVE AUDIT

Step 10AL intentionally implemented objectives as labels only.

Test whether this is sufficient.

For each scenario ask:

> Does the objective meaningfully tell the player what to do, given the initial state?

Distinguish:

* descriptive framing
* actionable constraint
* measurable milestone
* actual success condition

Do not implement objective evaluation yet.

If a scenario cannot be meaningfully differentiated without an evaluated objective, record that as a design dependency.

---

# 7. PROGRESSION READABILITY

Use the real browser.

Verify:

* current Stage is immediately understandable
* Next stage is understandable
* checklist conditions are understandable
* blockers identify the actual unmet condition
* objective is understandable
* scenario framing is distinguishable
* Village → Town deferred state is honest and not misleading

Check both:

* initial state
* at least one Settlement state
* at least one Village-capable state

Do not redesign the UI unless a concrete readability defect is discovered.

If a defect exists, document it rather than implementing unrelated polish.

---

# 8. BROWSER + GPU VALIDATION

Run the real browser validation path.

Use GPU/WebGL validation where the existing project supports it.

At minimum verify:

* default scenario
* scenario selection/loading if exposed
* Stage progression
* blocker transitions
* no visual regression
* no console errors
* no broken panel state
* deterministic display for identical state

The browser is part of the acceptance criteria.

---

# 9. ARCHITECTURAL SAFETY CHECK

Confirm:

* SAVE_VERSION remains `7`
* no scenario state is persisted
* no progression state is persisted
* no derived state is persisted
* scenario assembly does not mutate canonical domain rules
* insertion order does not affect progression
* identical state produces identical progression
* default game remains unchanged
* `src/domain` remains untouched unless an actual bug is discovered

Do not modify domain mechanics to make scenarios work.

---

# 10. TOWN+ GATE

Use the audit to determine whether Town+ should be designed now.

Town+ must remain deferred if the current Settlement/Village layer does not yet demonstrate enough meaningful scenario differentiation.

If the current layer is sufficiently differentiated, identify the **actual missing phenomenon** required for the next stage.

Do not invent arbitrary thresholds such as:

```text
population >= 6
roads >= 5
ticks >= N
buildings >= N
```

unless the existing simulation produces a causal reason for them.

A future Town contract must represent a qualitative or causally meaningful change, not merely a larger number.

---

# 11. FINAL CLASSIFICATION

For each scenario classify:

```text
A — Distinct decision space
B — Distinct consequence but overlapping decisions
C — Mostly framing variation
D — Redundant / not meaningful yet
```

Then classify the overall progression layer:

```text
A — Ready for Town+ design
B — Useful foundation but needs content/tuning
C — Progression exists technically but does not yet create enough gameplay differentiation
```

Do not choose a preferred result in advance. Base it on measured runs.

---

# 12. NO IMPLEMENTATION UNLESS JUSTIFIED

This step may produce:

* documentation/tests only,
* a small UI/readability correction if an actual defect is found,
* or a design decision.

It must **not** become a stealth feature step.

No new:

* resources
* buildings
* jobs
* transport systems
* adjacency rules
* pollution
* logistics
* production chains
* population rules
* persistence
* Town+ thresholds

unless the audit discovers a concrete existing implementation bug that must be corrected.

---

# 13. REQUIRED TESTING

Run:

```text
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

Run the full deterministic/insertion-order/save-load checks.

Run the complete browser suite.

Run the GPU/browser path where available.

If tests are added, they should encode measured contracts, not speculative mechanics.

---

# 14. DOCUMENTATION

Create:

```text
docs/roadmap/Step10AM.md
```

Document:

* audited scenarios
* measured runs
* decision differentiation
* opening-budget finding
* Settlement-condition dependency finding
* objective audit
* progression readability
* browser/GPU results
* Town+ gate
* final classification
* explicit deferred items

Do not rewrite historical roadmap conclusions.

---

# 15. FINAL QA / BILAN

At the end report:

```text
Starting commit:
Final commit:

Scenarios audited:
Distinct decision spaces:
Redundant scenarios:

Settlement findings:
Village findings:

Opening-budget conclusion:
Settlement-condition conclusion:
Objective conclusion:

Town+ gate:
Recommended next dependency:

Domain changes:
Persistence changes:
SAVE_VERSION:

Tests:
Typecheck:
Lint:
Build:
Determinism:
Insertion-order:
Save/load:
Browser:
GPU:

Files changed:
```

The final report must clearly separate:

* measured facts
* design interpretation
* deferred decisions

## Success criteria

* all six scenarios are executed, not merely inspected
* each scenario has a documented decision/consequence profile
* at least two plausible policies are compared where meaningful
* the 100→105 opening finding is tested without changing it
* Settlement-condition dependency is measured
* objective labels are audited without implementing objective evaluation
* real browser validation passes
* GPU validation passes where available
* SAVE_VERSION remains 7
* no new core mechanic is introduced
* no Town+ threshold is invented
* deterministic and insertion-order behavior remain intact
* * the next dependency is selected from evidence

---
# STEP 10AM — PROGRESSION & SCENARIO PLAYABILITY AUDIT (report)

Audit/design step. One readability defect found in Step 10AL was corrected
(a scenario load produced a false per-tick causal status); no simulation rule,
no economic value and no Town+ threshold was touched. All scenario numbers
below are measured by playing the six scenarios with real placement commands
(`tests/scenarioPlayabilityAudit.test.ts`, 14 tests, deterministic).

```text
STEP 10AM — PROGRESSION & SCENARIO PLAYABILITY AUDIT

Starting commit: 8ae5331 ("Step 10AL: implement settlement/village progression & scenario framing")
Final commit:    this commit

1  Architecture audit: simulation -> authoritative queries -> progression -> UI, and
   scenario data -> shared assembler -> the same simulation. No parallel economy.
2  Audit model: 12 fields per scenario; 6 scenarios x 2-3 policies executed.
3  Six scenario profiles: measured initial state, decision, constraints, paths, failure,
   recovery and distinctive consequence.
4  Decision differentiation: every scenario produces at least two measurably different
   trajectories (ticks, population, roads, material, Food stock, or wipe tick).
5A Opening budget: 105 = the sum of catalog prices; the default 100 cannot reach Village,
   and the construction order alone flips Settlement against starvation.
5B Settlement conditions: Food implies Population and Road network; the reverse does not
   hold (counterexamples measured). The trio stays as the UI explanation.
6  Objectives: labels suffice for 5 of 6 scenarios; the Industrial objective is unreachable
   in its own scenario (a hard Water-capacity cap) and is descriptive only.
7  Readability: default / Settlement / Village states verified in the browser; the deferred
   label is honest; one defect (false causal status on scenario load) found and fixed.
8  Browser + GPU: 13/13 suites pass; GPU validation passes.
9  Architecture safety: SAVE_VERSION 7, 7 keys, no scenario/progression state persisted,
   insertion order invariant, identical state -> identical progression, domain untouched.
10 Town+ gate: scenarios are differentiated, but no qualitative state for Town exists and
   the scenario objectives are not evaluated - TOWN+ REMAINS DEFERRED.
11 Classification: First settlement / Water constraint / Spatial efficiency /
   Population expansion = A; Industrial expansion / Recovery = B; overall = B.
```

## 1. Architecture audit

Verified from the implementation (not from documentation):

```text
simulation/domain (canonical state, 9 phases)
   -> authoritative application queries (population, Food, Water capacity, networks)
      -> getProgression (pure, derived, nothing stored)
         -> UI framing (panel rows, no rule)

scenario data (6 records, 8 data fields each)
   -> createScenarioState (ONE shared assembler, domain constructors + assignJobs)
      -> the SAME simulation engine, no per-scenario logic
```

Measured checks: calling `getProgression` leaves `serializeCanonicalState` byte-identical; every condition
`detail` equals the authoritative query's own value (population, Food production/consumption, Water
capacity, network count); every scenario object has exactly the 8 data keys; two assemblies of the
same scenario hash identically. No parallel economic logic exists in progression or scenarios.

## 2. Audit model

Each scenario was audited on 11 fields (starting state, immediately available actions, first
meaningful decision, Settlement path, Village path, resource bottleneck, workforce bottleneck,
spatial/road consequence, failure/recovery, distinct trajectories, readability) and then **executed**
with two or three policies (14 policy runs in total).

## 3. Scenario profiles (measured)

| scenario | first decision | primary constraint | Settlement path | Village path | failure mode | distinctive consequence |
| --- | --- | --- | --- | --- | --- | --- |
| First settlement | which building to fund (Farm, Well or a second Residence) | Material 100 | Residence + 1 road + Farm (55) | none: 105 > 100 | Well/industry before Food starves the only worker (wipe at tick 104) | the construction order alone decides Settlement vs starvation |
| Water constraint | Well now vs more housing first | Water capacity 0 | already Settlement at tick 0 | one Well (25) | none measured | the same objective is reached with population 2 (Village t3) or 3 (Village t6) |
| Industrial expansion | Workshop now vs Water capacity first | workforce (1 job per colonist) | already at tick 0 | already at tick 0 | none: the colony survives | a Workshop can be built but never run (0 staffed Workshops in all three policies) |
| Spatial efficiency | exact minimum or one road cell more | Material 55 | Residence + 1 road + Farm = 55 exactly | none (0 Material left) | one extra road cell makes the Farm unaffordable (wipe at tick 104) | a 5-Material margin separates success from starvation |
| Population expansion | capacity first or let housing fill first | Water capacity 2 | already at tick 0 | one Well (25) | none: growth is simply blocked | the objective costs exactly the whole 100 Material budget |
| Recovery | repair the Farm or replace it | Food sustainability (production 0) | 3 connector roads (15) or a new Farm (25) | none: no income | inaction starves the colony (wipe at tick 31) | two repairs reach Settlement with different road cost and a redundant Farm |

## 4. Measured decision differentiation

| scenario | policy | Settlement tick | Village tick | population | Water capacity | Food | Material | roads | buildings | staffed W/F/Ws | wipe |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| First settlement | compact housing + Farm | 5 | — | 2 | 0 | 99 | 20 | 1 | 3 | 0/1/0 | — |
| First settlement | extended roads | 5 | — | 1 | 0 | 296 | 30 | 4 | 2 | 0/1/0 | — |
| First settlement | Well before Farm | — | — | 0 | 0 | 0 | 20 | 1 | 3 | 0/0/0 | **104** |
| Water constraint | Well immediately | 0 | **3** | 2 | 2 | 50 | 75 | 3 | 4 | 1/1/0 | — |
| Water constraint | grow first, then Well + Farm | 0 | **6** | **3** | 2 | 245 | 15 | 5 | 6 | 1/2/0 | — |
| Industrial expansion | Workshop immediately | 0 | 0 | 2 | 2 | 50 | 75 | 3 | 5 | 1/1/0 | — |
| Industrial expansion | capacity first + 3rd colonist | 0 | 0 | 2 | 2 | 50 | 10 | 6 | 7 | 1/1/0 | — |
| Industrial expansion | extra Residence first | 0 | 0 | 2 | 2 | 50 | 70 | 4 | 5 | 1/1/0 | — |
| Spatial efficiency | exact minimum | 5 | — | 1 | 0 | 296 | **0** | 1 | 2 | 0/1/0 | — |
| Spatial efficiency | one extra road cell | — | — | 0 | 0 | 0 | 20 | 2 | 1 | 0/0/0 | **104** |
| Population expansion | capacity first (2 Wells, 2 Farms) | 0 | **5** | 4 | 4 | 94 | 0 | 7 | 9 | 2/2/0 | — |
| Population expansion | population first, then capacity | 0 | **15** | 4 | 4 | **74** | 0 | 7 | 9 | 2/2/0 | — |
| Recovery | repair the Farm | **2** | — | 1 | 0 | 227 | 15 | **4** | 2 | 0/1/0 | — |
| Recovery | replace the Farm | **3** | — | 1 | 0 | 225 | 5 | **1** | 3 | 0/1/0 | — |
| Recovery | no action | — | — | 0 | 0 | 0 | 30 | 1 | 2 | 0/0/0 | **31** |

Two further structural consequences were measured while running the policies:

* **The Water headroom rule hard-caps growth once a Well is operational.** In Water constraint,
  building the Well first locks the population at 2 (= the capacity) for the whole run, because
  admission needs `capacity >= served + 1` and no worker is left to staff a second Well; admitting
  the colonists *before* the first Well becomes operational is what allows population 3.
* **A scenario that starts with an operational Well is permanently capped at its capacity.**
  Industrial expansion (Village, 2 colonists, 1 Well) ends at population 2 and 0 staffed
  Workshops under all three policies — extra Wells stay unstaffed because no colonist can be
  admitted to work them.

## 5. The two carried-forward findings

### A. Opening budget (measured, not tuned)

```text
initial Material            100
minimum Village cost        105 = 2 x 25 Residences + 25 Well + 25 Farm + 5 (one road cell
                                 serves the four surrounding buildings)
Farm before Well            -> Settlement (population 1, 20 Material left)
Well before Farm            -> starvation, wipe at tick 104
```

The 105 is the **sum of catalog prices** (no hidden constant), so the gap is an intentional
pressure of the existing economy rather than a bug. Construction order changes the outcome
materially (Settlement vs wipe), but **no order reaches Village from 100 Material**; the
scenario layer is what provides reachable Village starts (Water constraint, Industrial
expansion, Population expansion).

### B. Settlement-condition dependency (measured)

| implication | holds | counterexample |
| --- | --- | --- |
| Food sustainable ⇒ population ≥ 1 | **yes** (all measured states) | — |
| Food sustainable ⇒ a road network exists | **yes** (all measured states) | — |
| population ≥ 1 ⇒ Food sustainable | no | Recovery start (1 colonist, stranded Farm) |
| a road network ⇒ population ≥ 1 | no | roads-only synthetic state; Recovery start |

Interpretation: a staffed Farm needs a colonist and a shared road network, so the Food condition
*causally implies* the other two. The other two do not imply each other or Food. The trio is
one-directional, yet each condition remains the **label of the blocker the player sees**, so the
contract is unchanged and the redundancy is a readability feature rather than misleading
information (no measured case shows a blocker that is not actually false).

## 6. Objective audit

| scenario | objective form | actionable | reachable from the given start |
| --- | --- | --- | --- |
| First settlement | measurable milestone (Settlement) | yes | yes |
| Water constraint | milestone with a named constraint | yes | yes |
| Industrial expansion | descriptive framing + partial constraint | partial | **no** (pop capped at 2, Workshop never staffed) |
| Spatial efficiency | actionable constraint (55 Material) | yes | yes |
| Population expansion | measurable constraint (4 / capacity 4 / Food balanced) | yes | yes (costs exactly 100) |
| Recovery | measurable milestone (Settlement) | yes | yes |

Objective evaluation is still not implemented (as Step 10AL intended). The audit shows labels are
sufficient for 5 of 6 scenarios; the Industrial objective promises a running Workshop that the
current economy cannot deliver at that scale, so it is descriptive only. Recorded as a design
dependency, not fixed here.

## 7. Progression readability (real browser)

| state | Stage | Next | checklist | blockers | objective |
| --- | --- | --- | --- | --- | --- |
| default | Wilderness | Settlement | 3 lines, all ✗ with values | `Population 1, Food balance, Road network` | *(empty)* |
| Water constraint | Settlement | Village | `✓ Population 2`, `✗ Water capacity 2 — capacity 0 / tick`, `✓ Food balance` | `Water capacity 2` | shown |
| Industrial expansion | Village | `not yet defined` | 3 lines, all ✓ | *(empty)* | shown |

The deferred state is honest (no fake target), the blockers name the actual unmet conditions and
the objective is distinguishable per scenario.

**Defect found and corrected (the only code change of this step).** Loading a scenario replaced
the canonical state without a simulation tick, and the causal status line derives production from
a per-tick delta, so the first frame after a load reported a fabricated message
(`"1 colonist consumed 1 food · 0.5 farms produced 1 food"`) and overwrote the scenario framing.
Fix: a single `suppressCausalMessage` flag consumed by one refresh, so the scenario status wins the
load frame and normal causal messages return from the next tick (verified in the browser:
`Scenario — Recovery: …` on load, `1 colonist consumed 1 food` after a tick).

## 8. Browser + GPU validation

```text
progression:  ALL PASS (13 checks incl. the readability regression)
run, production, temporal, water, food, resource, reassign, crew, road, transport, jobs, upkeep:
              ALL PASS (12 / 12)
GPU:          ALL PASS
total:        13 / 13 browser suites
```

## 9. Architectural safety check

```text
SAVE_VERSION:            7 (unchanged)
persisted keys:          7 (buildings, colonists, config, counters, resources, roads, time)
scenario state saved:    no
progression state saved: no
derived state saved:     no
insertion order:         progression JSON identical under reversed record order
identical state:         identical progression
default game:            unchanged (first-settlement scenario hashes equal to the default state)
src/domain:              untouched (git diff empty)
```

## 10. Town+ gate

The audit's gate question was whether the current layer demonstrates enough meaningful
differentiation to justify designing Town+.

| gate criterion | measured |
| --- | --- |
| scenarios produce different decision spaces | **yes** (6 scenarios, 14 policy runs, at least two distinct trajectories each) |
| a qualitative state for Town exists in the simulation | **no** (extra capacity is dormant; population = 2 x staffed Wells) |
| scenario objectives are evaluatable | **no** (labels only; the Industrial objective is not even reachable) |

```text
TOWN+ REMAINS DEFERRED
the actual missing phenomena:
  1. an evaluated objective/success condition (the scenario goal is invisible once Village is
     reached: the panel then shows "Next: not yet defined")
  2. a state that a larger colony has and a Town does not
```

No threshold was invented (`population >= 6`, `roads >= 5`, `ticks >= N` remain rejected).

## 11. Final classification

| scenario | classification | evidence |
| --- | --- | --- |
| First settlement | **A — distinct decision space** | order/geometry decides Settlement vs starvation (measured) |
| Water constraint | **A — distinct decision space** | Village at population 2 (tick 3) vs population 3 (tick 6) |
| Industrial expansion | **B — distinct consequence, overlapping decisions** | the consequence (industry costs Water headroom and a worker) is distinct, but every policy first adds Water capacity and none runs a Workshop |
| Spatial efficiency | **A — distinct decision space** | a 5-Material margin separates success from starvation |
| Population expansion | **A — distinct decision space** | capacity first vs population first: same population, different Food reserve and Village tick |
| Recovery | **B — distinct consequence, overlapping decisions** | repair (4 roads, redundant Farm kept) vs replace (1 road, 2 Farms) |

```text
overall progression layer: B — USEFUL FOUNDATION BUT NEEDS CONTENT/TUNING
the layer differentiates the scenarios and reads clearly, but the objectives are not evaluated,
the default opening cannot reach Village, and the Town+ phenomenon is still unidentified
```

## 12. No implementation

No simulation mechanic, resource, building, population rule, persistence or Town+ threshold was
added. The only code change is the readability correction in section 7; everything else is tests
and documentation.

## 13. Testing

```text
typecheck:     passed
lint:          passed
build:         passed
Vitest:        67 files / 1290 tests passed (before 66 / 1276; +1 audit file / +14 tests)
determinism:   passed (same-run hash + insertion order)
save/load:     passed
invariants:    passed
browser:       13 / 13 suites
GPU:           ALL PASS
```

## 14-15. Final bilan

```text
Starting commit: 8ae5331
Final commit:    this commit

Scenarios audited:          6 / 6, executed with 14 policies
Distinct decision spaces:   4 (First settlement, Water constraint, Spatial efficiency,
                               Population expansion)
Redundant scenarios:        0 (two are classification B, none redundant)

Settlement findings:        reachable in 4 scenarios from the given start; the three conditions are
                            one-directional (Food implies the other two)
Village findings:           reachable in 3 scenarios; hard-capped at 2 x staffed Wells; a scenario
                            that starts with an operational Well cannot grow at all

Opening-budget conclusion:  105 is the sum of catalog prices; the default 100 cannot reach Village
                            (intentional pressure, not a bug); order decides Settlement vs wipe
Settlement-condition conclusion: Food implies Population and Road network; the separate conditions
                            remain the player-visible blocker labels (keep the contract)
Objective conclusion:       labels suffice for 5 of 6; the Industrial objective is descriptive only
                            (unreachable); objective evaluation stays unimplemented

Town+ gate:                 TOWN+ REMAINS DEFERRED
Recommended next dependency: (1) an evaluated objective/success condition for scenarios,
                            (2) the Town qualitative-state design question

Domain changes:             none (git diff src/domain empty)
Persistence changes:        none
SAVE_VERSION:               7

Tests: 1290 passed / 67 files        Typecheck: passed      Lint: passed      Build: passed
Determinism: passed                  Insertion-order: passed
Save/load: passed                    Browser: 13/13         GPU: passed

Files changed:
  tests/scenarioPlayabilityAudit.test.ts  (new, 14 tests — the audit)
  e2e/progressionRun.mjs                  (readability regression checks)
  src/app/main.ts                         (the scenario-load status defect fix, ~17 lines)
  docs/roadmap/Step10AM.md                (this report)
```

Separation of the three kinds of result:

* **measured facts**: the 14 policy runs, the 105 minimum, the population cap at 2 x staffed Wells,
  the one-directional Settlement conditions, the unreachable Industrial objective, the fabricated
  causal status on scenario load.
* **design interpretation**: the layer is a useful foundation (overall B); the Scenarios that
  matter most are the ones with a material/spatial margin; the Industrial scenario needs a larger
  or better-shaped start to be playable.
* **deferred decisions**: Town+ (both the evaluated-objective question and the qualitative-state
  question), the opening budget (content/tuning), and any scenario-start revision.

