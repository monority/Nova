# NOVA — Step 10AO — Industrial Phase & Economic Headroom Audit

Starting commit: `3d300bd`

## Objective

Investigate the newly confirmed economic ceiling:

```text
ceil(P / 2) Wells + ceil(P / 2) Farms ≈ P workers
```

and determine whether the current simulation already contains a viable **industrial phase**, or whether industrial sustainability genuinely requires a missing causal capability.

This is an audit and tuning-design step.

Do not add a new mechanic.

Do not change economic values during the first part of the audit.

The purpose is to distinguish:

1. a deliberate survival economy where industry is intentionally temporary,
2. a balance problem where existing values prevent the intended industrial phase,
3. a missing existing capability that must be designed later,
4. or a model that has reached its natural current scope and should remain capped while content expands.

---

# 1. CURRENT ECONOMIC CONTRACT

Reconstruct the exact current model from authoritative code.

Document:

* Farm production
* Well production
* Workshop production
* Workshop upkeep
* Food consumption
* Water consumption
* Material production
* Material storage
* workforce capacity
* admission
* Water admission gate
* road access
* mobility
* manual workforce assignment
* Construction Crew
* Workshop placement Water cost

Do not copy assumptions from previous reports if the code says otherwise.

Use the actual implementation as the authority.

---

# 2. FORMALIZE WORKFORCE HEADROOM

Measure for:

```text
P = 1 ... 12
```

the minimum sustainable infrastructure workforce:

```text
required Farms
required Wells
required workers
free workers
```

Do this for:

* Food-balanced colony
* Water-balanced colony
* Food + Water balanced colony

Confirm exactly where spare workforce first appears, if anywhere.

Do not assume the answer is zero.

---

# 3. INDUSTRIAL STATES

Construct controlled states representing:

### State A — Survival

Farm + Well, no Workshop.

### State B — Workshop added

Farm + Well + Workshop.

### State C — Workshop staffed

Attempt to explicitly staff the Workshop.

### State D — Industrial deficit

Prioritize Workshop while allowing Food/Water degradation.

### State E — Industrial recovery

Return workforce to Farm/Well after industrial deficit.

For each state measure:

* population
* workers
* Farm workers
* Well workers
* Workshop workers
* Food delta
* Water delta
* Material delta
* construction throughput
* settlement stage
* objective status

---

# 4. TEMPORARY INDUSTRY TEST

The key question is not:

> "Can a Workshop run forever?"

It is:

> "Can temporary industrialization create a meaningful strategic phase?"

Measure whether a player can:

```text
survive
→ temporarily industrialize
→ accumulate useful Material
→ return to sustainable production
→ achieve a materially different state
```

without adding mechanics.

Measure:

* maximum Material gained
* duration of industrial operation
* Food/Water debt
* recovery time
* population impact
* construction advantage produced

If temporary industry produces no meaningful advantage, document that.

If it creates a meaningful advantage, document the resulting strategic loop.

---

# 5. INDUSTRIAL START SCENARIO

Audit the existing Industrial Expansion scenario.

Do not change it yet.

Test at least:

1. current scenario
2. scenario with different construction order
3. scenario with different worker assignments
4. scenario with conservative recovery
5. scenario with aggressive industrialization

Determine whether the scenario is actually interesting despite the lack of sustainable industry.

If the Workshop can only exist unstaffed or transiently, determine whether that is a legitimate challenge or merely a misleading scenario premise.

---

# 6. OPENING 100 vs 105

Audit the previously established finding:

```text
100 starting Material
105 required for canonical
2 Residences + Farm + Well + Workshop
```

Do not change the value.

Measure alternative openings.

Determine whether the 5-Material gap creates:

* meaningful sequencing pressure,
* a forced archetype,
* a delayed Village,
* a recovery opportunity,
* or merely an inconvenience.

Compare at least:

* road-first
* Well-first
* Farm-first
* Residence-first
* Workshop-first where legal

Measure:

* Settlement tick
* Village tick
* population
* Food
* Water
* Material
* eventual Workshop state

---

# 7. TUNING EXPERIMENT — NO COMMIT

After the baseline audit, perform **offline/in-test sensitivity analysis** on existing constants.

Do not modify production code.

Test small hypothetical variations of:

* Farm production
* Well production
* Workshop upkeep
* Workshop production
* admission conditions
* starting Material

The purpose is not to choose new values.

The purpose is to determine:

> Which existing parameter, if any, is responsible for the industrial ceiling?

For each hypothetical variation, record whether it changes:

```text
workforce headroom
food balance
water balance
industrial sustainability
population ceiling
```

Do not introduce any parameter that does not already exist in the model.

---

# 8. DISTINGUISH BALANCE FROM MISSING CAPABILITY

Classify the industrial ceiling:

### A — Balance issue

Small tuning of existing values can create a qualitatively different industrial phase without introducing a new rule.

### B — Structural economic constraint

Existing equations make sustainable industry impossible regardless of reasonable tuning.

### C — Missing capability

A new causal mechanism would be required.

Examples only:

* additional workforce capacity
* automation
* alternative food/water production
* industrial efficiency
* specialist workers

Do not implement these.

### D — Intentional current scope

The current model is coherent and industry is correctly limited to temporary/non-sustainable use for this phase.

Only select D if the measured gameplay actually supports it.

---

# 9. TOWN IMPLICATION

Use the result to revisit the Town gate.

Town remains **deferred** unless this audit discovers an existing qualitative state.

If the industrial phase becomes qualitatively meaningful through existing rules/tuning, document how it could eventually support Town.

Otherwise explicitly retain:

```text
Town = not contractable
```

and identify the missing causal capability.

Do not manufacture a Town threshold.

---

# 10. CONTENT SCENARIO AUDIT

Because Step 10AN identified content/tuning as the evidence-supported next dependency, also evaluate whether the current six scenarios are sufficient.

Do not add scenarios yet.

Determine:

* which scenarios expose distinct decisions,
* which are variants of the same opening,
* which exercise recovery,
* which exercise spatial efficiency,
* which exercise resource pressure,
* which exercise progression.

Identify **up to three** candidate scenarios that would add genuinely different decision spaces using existing mechanics.

A candidate is valid only if its initial conditions create a different decision space.

---

# 11. NO MECHANIC IMPLEMENTATION

This step must not add:

* resources
* buildings
* jobs
* workforce types
* logistics
* automation
* transport
* adjacency
* pollution
* storage systems
* new persistence
* new progression stages
* Town conditions

Do not change core simulation values during the committed implementation phase.

If tuning experiments suggest a change, record it as a proposal only.

---

# 12. ARCHITECTURAL QA

Confirm:

* `SAVE_VERSION = 7`
* domain remains unchanged
* objective query remains pure
* scenario data remains declarative
* objective state remains derived
* no hidden scenario state
* no historical objective persistence
* deterministic simulation
* insertion-order invariant
* save/load invariant

The existing Step 10AM/10AN contracts must remain green.

---

# 13. VALIDATION

Run:

```text
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

Also run:

* deterministic tests
* insertion-order tests
* save/load tests
* full browser suite
* GPU/WebGL validation

If no production code changes are necessary, keep the step audit-only.

---

# 14. DOCUMENTATION

Create:

```text
docs/roadmap/Step10AO.md
```

Document:

* formal workforce equations
* P=1..12 measurements
* industrial states
* temporary-industry results
* Industrial Expansion scenario findings
* 100→105 opening analysis
* sensitivity experiments
* industrial classification
* Town implication
* candidate future scenarios
* explicit deferred mechanics

Separate:

```text
MEASURED FACT
DESIGN INTERPRETATION
TUNING HYPOTHESIS
DEFERRED MECHANIC
```

Do not present a tuning hypothesis as a conclusion.

---

# 15. FINAL REPORT

Return:

```text
STEP 10AO — FINAL REPORT

Starting commit:
Final commit:

WORKFORCE
P range:
Minimum sustainable workers:
First spare-worker state:
Formula:

INDUSTRY
Sustainable Workshop:
Temporary Workshop:
Maximum industrial benefit:
Recovery behavior:
Industrial scenario result:

OPENING
100 vs 105:
Meaningful sequencing pressure:
Alternative openings:

SENSITIVITY
Parameters tested:
Parameter with greatest causal effect:
Parameters with negligible effect:

CLASSIFICATION
Industrial ceiling:
A / B / C / D

TOWN
Qualitative state discovered:
Town contractable:
YES / NO
Reason:

CONTENT
Existing scenarios with distinct decision spaces:
Candidate new scenarios:

IMPLEMENTATION
Production code changes:
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

* invent a Town threshold
* implement Town
* add a new mechanic
* change economic constants in production
* modify Food rules
* modify Water rules
* modify workforce rules
* modify admission rules
* modify construction rules
* add persistence
* turn the audit into a balance patch

The key question is:

> **Is the industrial ceiling a balance problem, a structural consequence of the current model, or evidence of a genuinely missing capability?**

Answer that from controlled measurements before making the next design decision.

---
# STEP 10AO — INDUSTRIAL PHASE & ECONOMIC HEADROOM AUDIT (report)

Audit and tuning-design step. **No production code, no economic constant and no
scenario was changed.** Every number comes from the real simulation
(`tests/industrialHeadroomAudit.test.ts`, 12 tests) or from arithmetic over the
model's own equations, which is labelled TUNING HYPOTHESIS throughout.

```text
STEP 10AO — FINAL REPORT

Starting commit: 3d300bd ("Step 10AN: objective contracts & town qualitative-state audit")
Final commit:    this commit

WORKFORCE
  P range: 1..12 (measured, plus the formula)
  Minimum sustainable workers: ceil(P/2) Farms + ceil(P/2) Wells = 2 x ceil(P/2)
  First spare-worker state: none when Food AND Water are balanced (spare = P - 2*ceil(P/2)
    <= 0 for every P); spare = floor(P/2) when only ONE of the two is balanced
  Formula: balanced spare = P - ceil(P/2) - ceil(P/2)  (= 0 for even P, -1 for odd P)

INDUSTRY
  Sustainable Workshop: impossible - a balanced colony has no spare worker (measured
    staffed Workshops = 0, Material production = 0 for P = 2, 4, 6)
  Temporary Workshop: works - 25 ticks of industry at P = 2 bank 24 Material (one
    25-Material building) and burn the whole 50-Water reserve
  Maximum industrial benefit: one building (24-25 Material, capped by the 25-per-Workshop
    storage) per Water reserve
  Recovery behavior: the Well is restaffed and production resumes, but at the Water cap
    (production 2 == need 2) the burned reserve NEVER refills: one-shot at the cap,
    repeatable below it (P = 1 refills at +1/tick, measured)
  Industrial scenario result: legitimate building challenge, but its 100-Material stock is
    above the 25 storage cap, so the industrial output is discarded and each industrial tick
    only pays upkeep (-1 Material, measured -5 over 5 ticks): the loop wastes Water

OPENING
  100 vs 105: 105 = 2 x 25 Residences + 25 Well + 25 Farm + 5 (one road cell); the initial
    100 cannot reach Village in any order
  Meaningful sequencing pressure: yes - the order alone decides Settlement vs starvation
    (Residence/Farm-first settle at tick 5; Well-first wipes at tick 104)
  Alternative openings: Residence-first (pop 2, 20 Material), Road-first (pop 1, 4 roads),
    Farm-first (pop 1, Well vacant), Well-first (wipe); Workshop-first is illegal at tick 0
    (insufficientWater)

SENSITIVITY
  Parameters tested: Farm production, Well production, Workshop production/upkeep, storage,
    colonist consumption, starting Material (hypothetical arithmetic only)
  Parameter with greatest causal effect: the production rates (Food per Farm / Water per Well)
    and the per-colonist consumption rates
  Parameters with negligible effect: Workshop production/upkeep, storage capacity, starting
    Material - none creates a worker

CLASSIFICATION
  Industrial ceiling: A — BALANCE ISSUE (a single rate change removes it; no new rule needed)
    with the current configuration behaving like D (temporary industry is coherent and usable)

TOWN
  Qualitative state discovered: no
  Town contractable: NO
  Reason: the only candidate axis is a spare-worker state, which the current rates cannot
    produce; a tuned production rate would create it from P = 6 (measured arithmetic)

CONTENT
  Existing scenarios with distinct decision spaces: 4 of 6 (First settlement, Water
    constraint, Spatial efficiency, Population expansion); 2 are class B (Industrial
    expansion, Recovery)
  Candidate new scenarios: Partitioned valley (spatial/coverage), Food glut without Water
    (growth timing), Standing industry (temporary industry vs growth) - validated as inline
    data only, none added

IMPLEMENTATION
  Production code changes: none
  Domain changes: none (git diff src/domain empty)
  Persistence changes: none
  SAVE_VERSION: 7

VALIDATION
  Tests: 70 files / 1321 tests passed (before 69 / 1308; +1 audit file / +13 tests)
  Typecheck: passed      Lint: passed      Build: passed
  Determinism: passed    Insertion-order: passed    Save/load: passed
  Browser: 13 / 13 suites      GPU: ALL PASS

NEXT DEPENDENCY: a design/tuning decision, not a mechanic. Either keep the survival economy
  (industry stays temporary, option D behaviour) or raise an existing production rate
  (Farm and/or Well) so the spare-worker state appears from P = 6 (option A); the latter is
  the only measured path to a Town phenomenon.
```

## 1. Current economic contract (read from the code)

| element | value |
| --- | --- |
| Residence | 25 Material, 2 ticks, housing 1 |
| Farm | 25 Material, 2 ticks, **+2 Food/tick** when staffed |
| Well | 25 Material, 2 ticks, **+2 Water/tick** when staffed and road-accessible |
| Workshop | 25 Material **+ 1 Water**, 2 ticks, **+2 Material/tick** when staffed |
| Workshop upkeep | 1 Material per staffed Workshop per tick |
| Material storage | 25 per operational Workshop |
| colonist | -1 Food, -1 Water per tick, 1 job |
| Road | 5 Material per cell |
| Admission | Food > 0 after consumption, a water-served Residence, `capacity >= served + 1` once a Well exists |

## 2. Workforce headroom (P = 1..12)

**MEASURED FACT** (arithmetic and runtime agree exactly):

| P | required Farms | required Wells | required workers | balanced spare | vacancies measured | Food net |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 1 | 2 | **-1** | 1 | -1 |
| 2 | 1 | 1 | 2 | **0** | 0 | 0 |
| 3 | 2 | 2 | 4 | **-1** | 1 | -1 |
| 4 | 2 | 2 | 4 | **0** | 0 | 0 |
| 5 | 3 | 3 | 6 | **-1** | 1 | -1 |
| 6 | 3 | 3 | 6 | **0** | 0 | 0 |
| 8 | 4 | 4 | 8 | **0** | 0 | 0 |
| 10 | 5 | 5 | 10 | **0** | 0 | 0 |
| 12 | 6 | 6 | 12 | **0** | 0 | 0 |

```text
balanced     : spare = P - ceil(P/2) - ceil(P/2)  <= 0   (0 for even P, -1 for odd P)
Food only    : spare = P - ceil(P/2) = floor(P/2)  > 0   for P >= 2
Water only   : spare = P - ceil(P/2) = floor(P/2)  > 0   for P >= 2
vacancies    : max(0, requiredWorkers - P)          (measured exactly)
```

Odd populations additionally run a Food deficit (-1/tick), because one of the two required
Farms cannot be staffed.

## 3-4. Industrial states and temporary industry

**MEASURED FACT** (states A-E):

| state | staffed W/F/Ws | Food net | Water net | Material net | stage |
| --- | --- | --- | --- | --- | --- |
| A survival (Farm + Well) | 1/1/0 | 0 | 0 | 0 | Village |
| B Workshop added | 1/1/0 | 0 | 0 | 0 | Village (1 vacancy) |
| C Workshop staffed (the Well worker moves) | 0/1/1 | 0 | **-2** | **+1** | **Settlement** (the Well vacancy drops the stage) |
| D industrial deficit (20 ticks) | 0/1/1 | 0 | -2/tick | +1/tick (capped) | Settlement |
| E recovery (Well restaffed) | 1/1/0 | 0 | **0** | 0 | **Village** |

The temporary-industry loop, measured at P = 2 with 50 Water:

```text
duration            25 ticks (the 50-Water reserve drains at 2/tick)
Material banked     24 (one 25-Material building); the 25th tick is consumed by the
                    reassignment tick, because produceMaterial runs before the command
Water debt          50 (the whole reserve)
Food debt           0   (the Farm keeps feeding both colonists)
recovery            the Well is restaffed and production resumes in the same tick
reserve after       0   - and it NEVER refills at the cap: production 2 == need 2
```

**MEASURED FACT**: below the cap the phase is repeatable - a P = 1 colony (1 Well, 1 Farm,
1 Workshop) burned its 9-Water reserve down to 4 with the Workshop staffed, then the Well
refilled it to 8 at +1 Water/tick after the worker returned.

**DESIGN INTERPRETATION**: temporary industry is a real, usable strategic phase that buys exactly
one building per Water reserve. Its cost is the whole reserve and, at the Water cap, the ability
to grow (the shortage gate blocks admission) and to repeat the phase.

## 5. Industrial Expansion scenario

**MEASURED FACT**:

| policy | result |
| --- | --- |
| current start | population 2, 4 buildings, Village, no vacancies |
| Workshop immediately | affordable at tick 1 (25 Material + 1 Water) |
| Workshop staffed manually | Material net **+1/tick**, Water net **-2/tick** |
| conservative (50 ticks, no Workshop) | unchanged Village |
| aggressive (staff until the reserve is gone, then recover) | 5 industrial ticks, Material **-5** (from 74 to 69), then recovered |

The aggressive result is the scenario's real trap: its initial stock (100) is above the
25-per-Workshop storage cap, so the Workshop's output is discarded and each industrial tick only
pays the 1-Material upkeep. The Water reserve is spent for nothing until the stock is first spent
down to the cap.

**DESIGN INTERPRETATION**: the scenario is a legitimate building challenge and it exposes the
temporary-industry loop, but it is not an industrial phase. Its objective (Village + a Workshop
built, implemented in 10AN) is honest; the description already states that running it needs a
fourth pair of hands.

## 6. Opening 100 vs 105

| opening | Settlement tick | wipe tick | population | Material | Food | Water |
| --- | --- | --- | --- | --- | --- | --- |
| Residence-first (housing + Farm) | 5 | - | 2 | 20 | 99 | 0 |
| Road-first (extended network) | 5 | - | 1 | 30 | 296 | 0 |
| Farm-first (before Water) | 5 | - | 1 | 20 | 297 | 0 |
| Well-first | - | **104** | 0 | 20 | 0 | 99 |
| Workshop-first | illegal at tick 0: `insufficientWater` | | | | | |

The 5-Material gap (100 vs the 105 minimum Village) therefore produces:

* **meaningful sequencing pressure** (yes): the order alone decides Settlement vs starvation;
* **a forced archetype** (yes): housing+Food or Water+industry, never both from the budget;
* **a delayed Village** (yes, indefinitely): reaching 105 requires Workshop-funded Material, and
  the Workshop needs the Water that the same workers would otherwise use for Food;
* **a recovery opportunity** (no): a Food collapse is terminal, so a bad order is not recoverable;
* **not merely an inconvenience**: the alternatives are stable-but-capped colonies.

**TUNING HYPOTHESIS** (not applied): raising only the starting Material to 105-110 would open the
Village archetype; it changes no headroom (no extra worker appears).

## 7. Sensitivity analysis (TUNING HYPOTHESIS)

| variant (hypothetical) | balanced spare at P = 3 / 6 / 12 | first spare |
| --- | --- | --- |
| baseline (Farm 2, Well 2) | -1 / 0 / 0 | never |
| Farm 2 -> 3 | 0 / **+1** / **+2** | P = 6 |
| Well 2 -> 3 | 0 / **+1** / **+2** | P = 6 |
| both 2 -> 3 | **+1** / +2 / +4 | **P = 3** |
| Workshop production or upkeep changed | unchanged | never |
| storage capacity changed | unchanged | never |
| starting Material 100 -> 120 | unchanged | never |

**Which parameter is responsible for the industrial ceiling**: the *production rates*
(Food per Farm, Water per Well) and the *per-colonist consumption rates*. They set how many
infrastructure workers each colonist needs. The Workshop economy and the starting Material are
irrelevant to headroom - they change the net rate and the opening, never the worker count.

## 8. Classification

```text
A — BALANCE ISSUE
```

**MEASURED FACT**: the ceiling is an exact consequence of four existing rates plus one job per
colonist; raising a single production rate removes it from P = 6 without a new rule.
**DESIGN INTERPRETATION**: the current configuration nevertheless behaves coherently as a survival
economy in which industry is temporary (option D behaviour): temporary industry buys one building
per reserve, and the Water cap makes it one-shot. Both readings are supported; the choice between
keeping the survival economy and tuning a rate is a design decision, and **no value was changed in
this step**.

## 9. Town implication

```text
Town = not contractable
```

**MEASURED FACT**: no existing state changes how the player must reason; the only candidate axis
(sustainable industry) is a spare-worker state, unreachable at the current rates.
**TUNING HYPOTHESIS**: a tuned production rate creates a spare-worker state from P = 6; that state
- *discretionary labour assigned to industry without breaking survival* - is the first plausible
Town phenomenon, and it would be reachable through existing rules, buildings and queries only.
**DEFERRED MECHANIC**: none defined; no Town threshold invented.

## 10. Content audit and candidate scenarios

**MEASURED FACT** (the six scenarios, from 10AM's 14 policy runs and this audit): 4 expose distinct
decision spaces (First settlement, Water constraint, Spatial efficiency, Population expansion); 2
are class B (Industrial expansion, Recovery).

Validated candidates (inline data only - none added to `SCENARIOS`):

| candidate | decision space | why it differs | measured start |
| --- | --- | --- | --- |
| **Partitioned valley** | spatial / coverage | two separate networks with one Well: connect (road cost) or build a second Well | Settlement, population 2, 1 vacancy |
| **Food glut, no Water** | growth timing vs Water capacity | four Residences and a large Food reserve with no Well: the pre-Well admission window is the whole opening | Wilderness, population 0 |
| **Standing industry** | temporary industry vs growth | a Village with a vacant Workshop and a Water buffer: the 10AO loop is the central decision | Settlement, population 2 |

## 11-12. No mechanic and architectural QA

No resource, building, job, logistics, transport, adjacency, pollution, storage system,
persistence, progression stage or Town condition was added; no economic constant was changed in
production. `git diff src/domain` is empty. The 10AM/10AN contracts stay green
(`SAVE_VERSION 7`, 7 persisted keys, objective and progression derived, scenario data declarative,
deterministic, insertion-order invariant, save/load invariant).

## 13. Validation

```text
typecheck passed   lint passed   build passed
Vitest 70 files / 1321 tests (before 69 / 1308; +1 audit file / +13 tests)
determinism passed   insertion-order passed   save/load passed
browser 13 / 13 suites (run headless)   GPU ALL PASS
```

Harness note (test-only change): the `production` suite flaked in HEADED mode
("timeout: valid preview at 6,1") because the hover status is written by the canvas
pointermove and a stray OS-level pointermove can overwrite it before the read. Its
`clickCell` now retries the hover, which is the same class of fix Step 10AD-2 applied to
`selectPalette` in the migrated suites. Three consecutive headed runs pass; the placement
gate itself (`ready` from the shared affordability predicate) is unchanged.

Files changed in this step:

```text
added:    tests/industrialHeadroomAudit.test.ts  (13 tests, the audit)
          docs/roadmap/Step10AO.md               (this report)
modified: e2e/productionRun.mjs                  (hover retry, test-only)
```
Production code (`src/`), scenarios, constants and persistence: untouched.

