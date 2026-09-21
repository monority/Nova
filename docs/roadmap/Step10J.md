# Step 10J — Fundamental Farm Upkeep Audit

## Mission

Perform a **design audit only** of Farm operating cost.

Do NOT implement any new Farm upkeep rule.

Do NOT modify `src/`.

The previous audits 10G, 10H and 10I attempted several Material-upkeep formulas for staffed Farms. Step 10I demonstrated that coupling Farm upkeep to Workshop count removes the terminal states precisely by weakening the Farm cost in the configurations where the economy was previously constrained.

The project now needs to answer the more fundamental question:

> **Does Farm actually need a Material operating cost at all?**

Step 10E already introduced a meaningful labor competition:

```text
one colonist
    ↓
Farm OR Workshop
    ↓
+2 Food OR +2 Material
```

A Farm therefore already has an opportunity cost:
assigning a worker to Food production means that worker cannot produce Material.

This audit must determine whether that worker competition alone creates sufficient economic and spatial pressure.

---

# 1. Mandatory workflow

Follow exactly:

```text
AUDIT
→ OBSERVATIONS
→ DESIGN DECISION
→ NO IMPLEMENTATION
→ VERIFICATION
```

This is an audit, not an implementation step.

Before writing tests, inspect:

* current `assignJobs`;
* current Farm/Workshop competition;
* Food production;
* Material production;
* Workshop upkeep;
* Material storage;
* construction timing;
* population growth;
* 09M distance-aware employment;
* 10E worker competition;
* 10F–10I audit conclusions.

Do not infer mechanics from old documentation if current source behavior differs.

Clearly distinguish:

1. existing rule;
2. derived technical consequence;
3. intentional design rule;
4. historical candidate rule from 10G/10H/10I.

---

# 2. Models to compare

Use exactly these conceptual models.

## Model A — Current baseline

Farm:

```text
staffed operational Farm → +2 Food
```

No Farm Material upkeep.

Workshop:

```text
staffed operational Workshop → +2 Material
staffed operational Workshop → -1 Material upkeep
```

This is the current production model.

---

## Model B — Historical FULL upkeep

For comparison only:

```text
farmUpkeepDue = staffedFarms
```

Do not implement it.

This is the 10G candidate.

---

## Model C — No Farm upkeep, but isolate worker opportunity cost

This is not a new code model.

It means explicitly measuring the existing 10E competition:

```text
Worker assigned to Farm:
    +2 Food
    0 Material gross

Worker assigned to Workshop:
    0 Food
    +2 Material gross
    -1 Material upkeep
```

Therefore moving:

```text
Workshop → Farm
```

changes:

```text
Food      +2
Material  gross -2
Material  net -1
```

Verify this from actual simulation rather than merely documenting the arithmetic.

The key question is whether this is already sufficient pressure.

---

# 3. Core experiment matrix

Create:

```text
tests/farmUpkeepFundamentalAudit.test.ts
docs/roadmap/Step10J.md
```

Keep all previous Step 10J prompt text intact and append the As-Built audit report.

Do not overwrite existing roadmap documents.

Use deterministic fixtures.

At minimum test:

```text
1F + 0W
1F + 1W
1F + 2W
2F + 1W
2F + 2W
2F + 3W
3F + 1W
3F + 2W
3F + 3W
4F + 1W
4F + 2W
4F + 3W
4F + 4W
```

Use enough colonists to permit the intended staffing configurations.

Run:

* 60 ticks;
* 240 ticks.

Record:

```text
Food
Material
staffed Farms
staffed Workshops
unemployed colonists
Food shortage
Material upkeep
construction opportunities
```

Do not introduce new persisted state.

---

# 4. Worker opportunity-cost experiment

This is the central experiment.

Create matched scenarios where exactly one colonist changes workplace:

### Scenario A

```text
Farm worker count = F
Workshop worker count = W
```

### Scenario B

Move exactly one worker:

```text
Farm +1
Workshop -1
```

when both assignments are valid.

Measure:

```text
ΔFood
ΔMaterial gross
ΔMaterial net
ΔWorkshop upkeep
ΔFood shortage
```

Verify that the actual simulation produces:

```text
ΔFood = +2
ΔMaterial gross = -2
ΔMaterial net = -1
```

for the normal steady-state case.

Also test the reverse:

```text
Farm → Workshop
```

Expected directional consequence:

```text
Food -2
Material gross +2
Material net +1
```

This establishes whether worker allocation alone is an economically meaningful lever.

---

# 5. Food pressure experiment

Determine whether Food itself creates meaningful pressure.

Compare:

```text
more Farms
vs
more Workshops
```

under identical population.

Measure how quickly:

* Food stock accumulates;
* Material stock accumulates;
* population can increase;
* new construction becomes affordable;
* a colony reaches Material storage equilibrium.

Important:

Do not assume Food is valuable merely because it exists.

Measure whether Food actually creates a constraint or merely accumulates indefinitely.

---

# 6. Material bottleneck experiment

Test whether Material remains the constraining resource under the current baseline.

Scenarios:

```text
1F + 1W
1F + 2W
2F + 1W
2F + 2W
3F + 1W
3F + 2W
```

For each, identify:

```text
time to next Residence
time to next Workshop
time to next Farm
Material storage equilibrium
Food equilibrium
```

Determine whether the player actually has to choose between:

```text
Food security
vs
Material expansion
```

or whether one resource dominates and the other simply accumulates.

---

# 7. Population feedback

The existing causal chain is:

```text
Farm
 ↓
Food
 ↓
Food availability
 ↓
Population
 ↓
Workers
 ↓
Farm / Workshop competition
```

Audit whether this produces a meaningful feedback loop.

Test at least:

```text
low Farm count
balanced Farm/Workshop count
high Farm count
```

Measure:

```text
population
available workers
staffed Farms
staffed Workshops
Food
Material
```

for 240 ticks.

Question:

> Does assigning more labor to Farms create a real opportunity cost because the resulting population growth eventually changes the labor market?

Do not add any new population rule.

---

# 8. Spatial pressure

09M remains active.

Test whether the existing distance-aware employment rule creates spatially meaningful economic choices without Farm upkeep.

Use:

```text
Residence
Farm
Workshop
```

with:

* equal-distance candidates;
* unequal-distance candidates;
* disconnected candidates;
* alternative road lengths.

Measure:

```text
selected workplace
Food production
Material production
Material upkeep
mobility
```

Especially test:

```text
equal distance + different building IDs
```

because ID tie-breaking can change:

```text
Farm vs Workshop allocation
```

and therefore:

```text
Food vs Material output
```

Determine whether this is already a genuine spatial decision.

---

# 9. Remove Farm upkeep counterfactual

Do NOT change production code.

Construct the audit mathematically and through fixtures using the existing baseline.

Compare every relevant result against the historical FULL-upkeep scenarios from 10G.

Explicitly identify what FULL upkeep added:

```text
economic pressure?
resource scarcity?
spatial pressure?
construction pressure?
worker pressure?
failure states?
```

Then identify which of those already exist without Farm upkeep.

The goal is to avoid keeping a rule merely because it creates "more pressure."

Pressure is useful only if it creates a meaningful decision.

---

# 10. Terminal-state analysis

Under the current baseline, search for terminal states caused by:

```text
Farm / Workshop allocation
Material scarcity
Food scarcity
storage caps
construction costs
population
```

Start from:

```text
Material = 0
Food = 0
```

and also:

```text
Material = 0
Food = 1000
```

Test representative:

```text
1F + 1W
2F + 1W
3F + 1W
3F + 2W
4F + 1W
4F + 2W
```

Determine whether the baseline has:

* recoverable scarcity;
* permanent Material traps;
* permanent Food traps;
* construction dead-ends;
* worker dead-ends.

Do not fix any discovered problem in this step.

Document it.

---

# 11. Agency test

The most important design question:

> Does removing Farm upkeep reduce the number of meaningful player decisions?

Define concrete player decisions that exist today.

At minimum inspect:

### Decision A — Farm vs Workshop

Does worker assignment change future outcomes?

### Decision B — Where to place Farm

Does road distance affect who works there?

### Decision C — Where to place Workshop

Does it compete for the same labor pool?

### Decision D — Expansion order

Does:

```text
Farm first
vs
Workshop first
```

produce meaningfully different trajectories?

### Decision E — Spatial arrangement

Does moving a Farm/Workshop/residence change the resulting economy?

Do not score these decisions.

Classify each:

```text
REAL
WEAK
INFORMATIONAL
ABSENT
```

No overall ranking.

---

# 12. Counterfactual expansion experiment

Run a deterministic 240-tick comparison of several player strategies.

Do not optimize automatically.

Use fixed scripted construction strategies such as:

```text
Strategy A:
Residence → Farm → Workshop → Farm → Workshop

Strategy B:
Residence → Workshop → Farm → Workshop → Farm

Strategy C:
Residence → Farm → Farm → Workshop → Workshop

Strategy D:
Residence → Workshop → Workshop → Farm → Farm
```

The point is not to find the best strategy.

Measure differences in:

```text
Food
Material
population
staffing
construction timing
unemployed workers
```

The question is simply:

> Does build order create materially different trajectories under the current baseline?

If yes, document why.

If no, identify what is missing.

Do not introduce a balancing rule.

---

# 13. Storage and construction interaction

Pay particular attention to the existing:

```text
Material storage = operational Workshops × 25
```

and:

```text
construction cost = 25 Material
```

Determine whether this already creates an important pressure.

Test:

```text
1 Workshop
2 Workshops
3 Workshops
```

with varying Farm counts.

Record:

```text
storage capacity
Material equilibrium
time to construction
```

Determine whether Workshop expansion already creates a natural Material-capacity incentive.

This may be more meaningful than charging Farms an additional operating cost.

---

# 14. Design quality criteria

Evaluate the baseline using three separate dimensions.

## Safety

Does the system avoid irreversible traps under normal play?

```text
GREEN
YELLOW
RED
```

## Pressure

Does the system create constraints that force meaningful tradeoffs?

```text
GREEN
YELLOW
RED
```

## Agency

Can player choices about:

```text
labor
building order
building placement
spatial arrangement
```

produce different causal outcomes?

```text
GREEN
YELLOW
RED
```

These are independent dimensions.

Do not collapse them into a single score.

---

# 15. Decision tree

At the end, classify the result.

## A — Farm upkeep is unnecessary

Use this if:

* worker competition already creates meaningful pressure;
* Farm placement/order matters;
* Food and Material interact meaningfully;
* removing Farm upkeep does not remove important decisions;
* FULL upkeep mainly adds resource drain or failure states.

Design decision:

```text
DO NOT IMPLEMENT FARM UPKEEP.
KEEP THE 10E WORKER-COMPETITION MODEL.
```

If this happens, explicitly close the Farm-upkeep investigation.

Do not invent another upkeep formula.

---

## B — Farm upkeep is useful but not Material upkeep

Use this only if evidence shows:

* Farm needs an operating cost for gameplay;
* but Material is the wrong resource or creates undesirable failure behavior.

Do NOT implement an alternative cost.

Identify the smallest future design experiment.

---

## C — Farm upkeep is genuinely required

Use this only if removing it causes a clearly demonstrated loss of meaningful agency that cannot be explained by worker competition.

If this happens:

* do not implement it;
* identify the exact missing causal relationship;
* propose the smallest isolated future experiment.

Do not immediately invent another formula.

---

## D — Current economy has a deeper missing constraint

Use this if the audit shows:

```text
Farm upkeep is neither necessary nor sufficient.
```

Then stop touching Farm upkeep.

Identify the actual missing economic constraint.

Examples may include:

```text
Food demand
population scaling
housing pressure
construction demand
Material bottleneck
storage pressure
```

Only identify evidence-backed candidates.

---

# 16. Verification requirements

Run:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Run all current E2E suites:

```text
road
transport
production
resource
food
temporal
jobs
upkeep
```

All must pass.

Verify:

* SAVE_VERSION remains `4`;
* no persisted Farm-upkeep state;
* no hash schema changes;
* deterministic replay remains identical;
* insertion-order determinism remains intact;
* no `Date.now()` / `Math.random()` in domain/application;
* no `src/` modifications.

If performance is measured, compare against the latest known baseline rather than inventing a new benchmark methodology.

---

# 17. Scope guardrails

Forbidden:

* modifying `src/`;
* implementing Farm upkeep;
* implementing a new Need framework;
* changing Food production;
* changing Material production;
* changing population rules;
* changing construction costs;
* changing storage capacity;
* changing road rules;
* changing mobility rules;
* changing 09M distance preference;
* adding demolition;
* adding transport;
* adding travel time;
* adding vehicles;
* adding congestion;
* adding new persisted state;
* changing SAVE_VERSION.

This step exists to answer one design question.

Do not expand the simulation.

---

# 18. Documentation

Create:

```text
docs/roadmap/Step10J.md
tests/farmUpkeepFundamentalAudit.test.ts
```

Preserve the prompt section.

Append:

```text
# As-Built Report

## Repository

## Baseline Rules

## Worker Opportunity Cost

## Food Pressure

## Material Pressure

## Population Feedback

## Spatial Pressure

## Terminal States

## Expansion Experiments

## Storage / Construction Pressure

## Safety

## Pressure

## Agency

## Classification

## Design Decision

## Scope Verdict

## Verification
```

Include actual measured values.

Do not write conclusions unsupported by tests.

---

# 19. Commit

If and only if the audit is complete and all verification passes:

```text
Step 10J: audit fundamental Farm upkeep
```

Expected scope:

```text
tests/farmUpkeepFundamentalAudit.test.ts
docs/roadmap/Step10J.md
```

`src/` must remain untouched.

---

# 20. Final report

Return a concise final report containing exactly:

```text
Step 10J COMPLETE — AUDIT

Repository
- starting commit
- final commit
- files changed
- src untouched

Baseline
- current Farm rule
- current Workshop rule

Worker opportunity cost
- measured ΔFood
- measured ΔMaterial gross
- measured ΔMaterial net

Food pressure

Material pressure

Population feedback

Spatial pressure

Terminal states

Expansion/build-order pressure

Storage/construction pressure

Safety
Pressure
Agency

Classification

Design decision

Scope verdict

Verification
- tests
- lint
- typecheck
- build
- E2E
- persistence/hash
- determinism
```

The final report must answer one question clearly:

> **Does NOVA need Farm Material upkeep at all?**

Do not implement the answer in this step.



---

# As-Built Report

**Type: AUDIT. No production rule was changed.** `src/` is byte-identical to
Step 10I (`git diff -- src/` empty; `git status` shows only this file and
`tests/farmUpkeepFundamentalAudit.test.ts`). Every number below is a real
`AUDIT ...` line from that suite; re-run with

```text
npx vitest run tests/farmUpkeepFundamentalAudit.test.ts --reporter=verbose
```

Three conceptual models are measured:

```text
MODEL A  BASELINE  farm upkeep 0 (current production, real stepSimulation)
MODEL B  FULL      farm upkeep = staffedFarms (historical 10G; harness only)
MODEL C  WORKER    the existing 10E competition, measured directly
```

## Repository

* starting commit `a315aca` (Step 10I), previous audits preserved;
* this audit commit contains `tests/farmUpkeepFundamentalAudit.test.ts` and
  `docs/roadmap/Step10J.md` only;
* `src/` untouched (`git diff -- src/` empty); `SAVE_VERSION = 4`.

## Baseline Rules

Verified from current source behavior (`AUDIT BASELINE_RULES`):

| Rule | Value |
| --- | --- |
| staffed operational Farm | `+2 Food/tick`, **0 Material upkeep** |
| staffed operational Workshop | `+2 Material gross/tick`, `-1 Material upkeep` |
| Material storage | `25` per operational Workshop |
| Material equilibrium | `24 x W` (measured 24 / 48 / 72 for W = 1/2/3) |
| Construction cost | `25` per building; `5` per road |
| Food need | population x 1, all-or-nothing colony feeding |

`AUDIT BASELINE_EQUILIBRIUM`: `[24, 48, 72]` for W = 1, 2, 3. Farm count
never changes storage or equilibrium — only `W` does.

## Worker Opportunity Cost

`AUDIT WORKER_MOVE_WORKSHOP_TO_FARM` — one worker moves Workshop → Farm in a
matched 2-colonist world:

| Measure | at Workshop | at Farm | Δ |
| --- | ---: | ---: | ---: |
| Food production | 2 | 4 | **+2** |
| Material gross | 2 | 0 | **−2** |
| Material net | 1 | 0 | **−1** |
| Workshop upkeep | 1 | 0 | **−1** |

`AUDIT WORKER_MOVE_FARM_TO_WORKSHOP` reverses exactly: `ΔFood −2`,
`ΔMaterial gross +2`, `ΔMaterial net +1`. This is Model C, measured — not
documented arithmetic. Over 60 ticks the same one-worker move produces
`Food 620 vs 500` (+120) and `Material 20 vs 24`
(`AUDIT WORKER_MOVE_TRAJECTORY_60`). **The worker allocation is already a real
economic lever with no Farm upkeep.**

## Food Pressure

`AUDIT FOOD_PRESSURE` at identical population = 4:

| Config | Food slope/tick | Material end | Material/tick |
| --- | ---: | ---: | ---: |
| 3F+1W | **+2** | 24 | +1 |
| 2F+2W | **0** | 48 | +2 |
| 1F+3W | **−2** | 72 | +3 |

`AUDIT FOOD_UNCAPPED`: a Food-surplus colony goes `100 → 580` over 240 ticks
(`+2/tick`). Food has no storage ceiling and no sink beyond feeding and the
admission gate. Food pressure is therefore **existential and temporary**: it
binds only while `2 x staffedFarms < population`, then stops being a constraint
entirely. It does not create an ongoing tradeoff once the ratio is met.

## Material Pressure

`AUDIT MATERIAL_BOTTLENECK` and `AUDIT CORE_MATRIX` (60 and 240 ticks):

| Scenario | net Material/tick | ticks to 25 | storage | equilibrium |
| --- | ---: | ---: | ---: | ---: |
| 1F+1W | +1 | 24 | 25 | 24 |
| 1F+2W | +2 | 12 | 50 | 48 |
| 2F+1W | +1 | 24 | 25 | 24 |
| 2F+2W | +2 | 12 | 50 | 48 |
| 3F+1W | +1 | 24 | 25 | 24 |
| 3F+2W | +2 | 12 | 50 | 48 |

Across all 13 matrix configs Material lands exactly on `24 x W` and never
exceeds it; every colony has `constructionAvailableTicks` in the tens-to-
hundreds by tick 240. Material is the **developmental** resource: storage
(`25W`) and cost (`25`) make Workshop count the binding variable, and a
single-Workshop colony rests at 24 — one unit below the next build cost, with
the phase-8a crest still allowing a timed build. `AUDIT RESOURCE_ROLES`
confirms the asymmetry: Food gates survival/admission, Material gates building.

## Population Feedback

`AUDIT POPULATION_FEEDBACK` — six operational residences, one injected
colonist, 240 ticks:

| Colony | population (t0/t4/t50/t240) | staffed F/W | food end | material end |
| --- | --- | --- | ---: | ---: |
| lowFarm (1F+5W) | 6 / 6 / 6 / 6 | 1 / 5 | 3045 | 120 |
| balanced (3F+3W) | 6 / 6 / 6 / 6 | 3 / 3 | 4001 | 72 |
| highFarm (5F+1W) | 6 / 6 / 6 / 6 | 5 / 1 | 4957 | 24 |

Population admission fills **every free residence in a single tick** while
Food remains after consumption, so the labour market is housing-gated, not
gradual: the feedback loop `Farm -> Food -> population -> workers` is real but
**binary**, released by building Residences, not by a slow growth curve. The
Farm/Workshop mix is decided by build order and geometry, not by a labor
market that develops over time.

## Spatial Pressure

`AUDIT SPATIAL_UNEQUAL / _ID_TIE / _DISCONNECTED / _ROAD_LENGTH` (09M
unchanged):

| Case | Result |
| --- | --- |
| Residence nearer the Farm | Farm staffed: `+2 Food`, 0 Material |
| Residence nearer the Workshop | Workshop staffed: `0 Food`, `+2 Material` |
| Equal distance, Farm lower id | Farm wins: `+2 Food` |
| Equal distance, Workshop lower id | Workshop wins: `+2 Material` |
| Workplace disconnected from housing | never staffed (09K gate), colonist idle |
| Longer road network | nearest workplace still wins (same employer in the test) |

The distance rule plus the id tie-break already turns placement into a Food-vs-
Material decision, and disconnection already removes a workplace from the labor
pool. Spatial agency exists without Farm upkeep.

## Terminal States

`AUDIT TERMINAL_FOOD_ZERO` (Material 0 / Food 0):

| Config | pop end | food production / need | starvation tick |
| --- | ---: | --- | --- |
| 1F+1W | 2 | 2 / 2 | none |
| 2F+1W | 3 | 4 / 3 | none |
| 3F+1W | 4 | 6 / 4 | none |
| 3F+2W | 5 | 6 / 5 | none |
| 4F+1W | 5 | 8 / 5 | none |
| 4F+2W | 6 | 8 / 6 | none |

Because `produceFood` runs before `consumeFood`, a Farm-rich colony survives
**even from zero Food and zero Material** and rebuilds both. `AUDIT
TERMINAL_FOOD_SHORT`: `1F+2W` (production 2 < need 3) starves on tick 0 and
never recovers. `AUDIT TERMINAL_MATERIAL_ZERO`: from Material 0 and Food 1000
every config recovers to `24`/`48`. `AUDIT TERMINAL_FOOD_SCARCITY`: `1F+2W`
from Food 3 dies at tick 3.

The baseline has **no Material terminal trap**. The only terminal is the
pre-existing 05B colony-wide starvation when Farm output cannot cover the
population — a Food-economy failure, not a Material-upkeep one.

One order-dependent construction dead-end was found and is documented, not
fixed (see Expansion Experiments, strategy C): with housing-capped population
and no demolish/reassign, a Farm-first order can leave the Workshop vacant and
Material permanently at 5. It is caused by the 10E worker pool + housing gate,
not by Farm upkeep, and FULL upkeep makes it worse.

## Expansion Experiments

`AUDIT EXPANSION_STRATEGIES` — two pre-built homes, four scripted workplace
orders, 240 ticks, Material 100 / Food 800:

| Strategy | Order | placement ticks | Material end | staffed F/W | Food end |
| --- | --- | --- | ---: | --- | ---: |
| A | F, W, F, W | 0, 1, 3, 24 | 49 | 1 / 1 | 796 |
| B | W, F, W, F | 0, 1, 3, 25 | 49 | 1 / 1 | 794 |
| C | F, F, W, W | 0, 1, 3, **null** | **5** | **2 / 0** | 1270 |
| D | W, W, F, F | 0, 1, 3, 12 | 48 | **0 / 2** | 320 |

Build order materially changes the trajectory. **Strategy C stalls**: the two
Farms claim both workers, the Workshop is built but never staffed, so Material
income is zero and the fourth building is never affordable (no demolish, no
reassignment exists). Strategy D reaches the same four workplaces but ends with
two Workshops staffed and Food draining. This is agency with teeth — and it
exists under the current baseline.

## Storage / Construction Pressure

`AUDIT STORAGE_CONSTRUCTION` and `AUDIT WORKSHOP_CEILING`:

| W | storage | equilibrium | ticks to 25 |
| ---: | ---: | ---: | ---: |
| 1 | 25 | 24 | 24 |
| 2 | 50 | 48 | 12 |
| 3 | 75 | 72 | 8 |
| 4 | 100 | 96 | — |

Storage and equilibrium depend **only** on Workshop count, never on Farm count
(rows for F = 1, 2, 3 are identical). Building Workshops is therefore already
the natural Material-capacity incentive: each one doubles the ceiling and the
income rate, so `25 x W` storage + `25` construction cost already create the
meaningful Material decision. This is a stronger and more legible pressure than
charging Farms an operating cost.

## Safety

```text
YELLOW
```

No Material-upkeep trap exists under the baseline, and Farm-rich colonies
recover even from `(Food 0, Material 0)`. The only terminal is the pre-existing
colony-wide starvation when Farm output cannot cover the population, plus the
order-dependent strategy-C construction dead-end (housing-capped population,
vacant Workshop, no demolish/reassign). Both are baseline properties that Farm
Material upkeep does not fix.

## Pressure

```text
GREEN
```

Material is a genuine developmental bottleneck: `net = W`, storage `25W`,
equilibrium `24W`, and a one-Workshop colony cannot rest at its own build cost.
The 10E worker pool makes Food and Material mutually exclusive (`ΔFood +2`
costs `ΔMaterial gross −2`, `Δnet −1`), and build order (A/B/C/D) changes the
outcome. Food adds a real existential constraint while the food ratio is unmet.

## Agency

```text
GREEN
```

`AUDIT AGENCY` — all five decisions are REAL, measured without Farm upkeep:

| Decision | Classification | Evidence |
| --- | --- | --- |
| A. Farm vs Workshop | **REAL** | worker move changes Food +2, Material gross −2, net −1 |
| B. Where to place a Farm | **REAL** | 09M nearest-workplace selection flips the employer |
| C. Where to place a Workshop | **REAL** | shares one candidate pool; competes for the same worker |
| D. Expansion order | **REAL** | A/B finish at 49 Material, C stalls at 5, D staffs 2 Workshops |
| E. Spatial arrangement | **REAL** | moving a Residence two columns flips Food vs Material output |

## Classification

```text
A — Farm upkeep is unnecessary
```

Every §15-A condition holds:

* worker competition already creates meaningful pressure (§Worker Opportunity
  Cost, §Pressure);
* Farm placement/order matters (§Spatial Pressure, §Expansion Experiments);
* Food and Material interact meaningfully (§Food Pressure, §Material Pressure);
* removing Farm upkeep removes no important decision — all five Agency
  decisions are REAL under the baseline;
* FULL upkeep (`AUDIT BASELINE_VS_FULL`) reduces Material in **all 13**
  scenarios and adds only drain and the 10G/10H failure states, while
  `AUDIT FULL_UPKEEP_EFFECT` shows it adds **zero** Food shortages or
  qualitative outcomes that baseline lacks.

## Design Decision

```text
DO NOT IMPLEMENT FARM UPKEEP.
KEEP THE 10E WORKER-COMPETITION MODEL.
```

The Farm-upkeep investigation opened in 10G is hereby **closed**. Three
successive Material-upkeep formulas (10G full, 10H threshold, 10I coupled) each
traded stability against the pressure they were meant to add; this audit shows
the intended pressure already exists in the baseline through the 10E worker
pool, 09M distance preference, and the `25W` storage/construction bottleneck.
No further upkeep formula should be invented.

The audit does surface one **evidence-backed candidate for a future, separate
investigation** (not a Farm-upkeep rule): the strategy-C construction dead-end
where a housing-capped colony with a vacant Workshop cannot recover because the
simulation has no demolish or reassignment action. If that is judged worth
fixing, it belongs to a housing/labor-agency step, not to Farm upkeep.

## Scope Verdict

```text
COMPLETE — AUDIT
```

## Verification

* `src/` untouched: `git diff --stat -- src/` empty.
* `npx tsc --noEmit` clean; `npx eslint tests/farmUpkeepFundamentalAudit.test.ts`
  clean; `npm run build` succeeds.
* `npx vitest run` → **36 files, 708 tests passed** (29 new audit tests;
  existing tests unchanged).
* E2E (headless): `road` 15, `transport` 10, `production` 12, `resource` 12,
  `food` 12, `temporal` 17, `jobs` 21, `upkeep` 35, plus `run` 11 — all pass.
* `SAVE_VERSION = 4`; no persisted Farm-upkeep state; no hash schema change.
* Determinism: 120-tick replay byte-identical (`hash c837d88af666eb16`);
  insertion-order determinism holds; no `Date.now()` / `Math.random()` in
  `src/`.
