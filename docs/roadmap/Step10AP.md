# NOVA — Step 10AP — Production Ratio Tuning & Town Candidate Decision

Starting commit: `22d3154`

## Objective

Make the first explicit **economic tuning decision** in NOVA.

Step 10AO established:

```text
Current:
Farm = 2 Food / tick
Well = 2 Water / tick
Colonist = 1 Food + 1 Water / tick
Job capacity = 1 / colonist
```

Therefore:

```text
balanced colony
≈ ceil(P/2) Farms + ceil(P/2) Wells
≈ P workers
```

and no worker remains for industry.

Sensitivity analysis also established that changing a single production rate from `2 → 3` can create workforce headroom beginning around `P = 6`.

This step must determine whether that change produces a **better causal progression model**, or whether the current survival economy should remain unchanged.

Do not implement a tuning change until the controlled comparison is complete.

---

# 1. BASELINE CONTRACT

Reproduce the current baseline from production code.

Record:

* Farm production
* Well production
* Workshop production
* Workshop upkeep
* Food consumption
* Water consumption
* Residence capacity
* workforce capacity
* admission
* Water admission gate
* Material storage
* construction costs

Do not infer values from old reports where code can be inspected directly.

The baseline must remain:

```text
Farm = 2
Well = 2
```

during the control runs.

---

# 2. TEST FOUR ECONOMIC CONFIGURATIONS

Run controlled simulations using the existing mechanics only.

Test:

### A — Current

```text
Farm 2
Well 2
```

### B — Food surplus

```text
Farm 3
Well 2
```

### C — Water surplus

```text
Farm 2
Well 3
```

### D — Both surplus

```text
Farm 3
Well 3
```

These are **experimental configurations only** initially.

Do not modify production constants in the repository until the final design decision.

---

# 3. POPULATION SWEEP

For each configuration test:

```text
P = 1 ... 12
```

Measure:

```text
Farms required
Wells required
free workers
Food delta
Water delta
maximum sustainable population
maximum sustainable Workshops
Workshop staffing
Material delta
```

The central question is:

> At what population does discretionary workforce first appear?

Do not use the phrase "Town" yet.

Call this:

```text
industrial headroom
```

until the qualitative effect has been validated.

---

# 4. QUALITATIVE HEADROOM TEST

For every configuration that produces spare workforce, test whether the spare worker actually creates a different gameplay state.

At minimum compare:

```text
survival state
vs
survival + Workshop
```

Measure:

* Food
* Water
* Material
* population
* Workshop staffing
* Workshop output
* construction throughput
* stability over 100 / 300 / 600 ticks

A spare worker is **not automatically** a Town phenomenon.

It qualifies only if it changes meaningful player decisions.

---

# 5. INDUSTRIAL PHASE TEST

For each viable configuration, test three policies:

### Policy A — Survival

Prioritize:

```text
Farm + Well
```

### Policy B — Industry

Prioritize:

```text
Farm + Well + Workshop
```

as soon as the model permits.

### Policy C — Expansion

Prioritize:

```text
Residence → population growth → production headroom → Workshop
```

Compare:

* time to first sustainable Workshop
* time to first industrial Material surplus
* population trajectory
* Food stability
* Water stability
* construction throughput
* final Material stock
* number of operational production buildings

The objective is to see whether the production-rate change creates **a new strategic choice**, rather than merely bigger numbers.

---

# 6. FARM 3 VS WELL 3

This comparison is especially important.

Determine whether:

### Farm 3

creates:

```text
Food headroom
→ fewer Farms needed
→ workforce freed
→ industrial capacity
```

while Water remains the growth constraint.

And whether:

### Well 3

creates:

```text
Water headroom
→ fewer Wells needed
→ workforce freed
→ industrial capacity
```

while Food remains the growth constraint.

Document which bottleneck remains in each configuration.

Do not call either configuration better.

Describe the causal differences.

---

# 7. BOTH 3

Test whether:

```text
Farm 3
Well 3
```

creates an excessive amount of headroom.

Measure whether:

* Workshop becomes trivial
* population growth becomes too easy
* Food/Water cease being meaningful constraints
* Material becomes the dominant bottleneck
* existing scenarios lose differentiation
* the simulation develops a new stable economic structure

This is particularly important because increasing both rates may remove too much of the current survival pressure.

---

# 8. EXISTING SCENARIO REPLAY

Replay the six existing scenarios under each viable experimental configuration.

Do not rewrite scenario definitions yet.

Measure:

* objective reachability
* Settlement tick
* Village tick
* Workshop state
* population
* Food
* Water
* Material
* failure/recovery
* scenario differentiation

Pay special attention to:

* Industrial Expansion
* Recovery
* Water Constraint
* Population Expansion

The goal is to determine whether tuning repairs Industrial Expansion **without making other scenarios redundant**.

---

# 9. TOWN CANDIDATE TEST

For each configuration that produces industrial headroom, test whether a future Town contract could honestly be:

> A settlement has entered a qualitatively different phase because it can sustain discretionary industrial production while maintaining its basic Food/Water economy.

Do not implement this contract yet.

Validate:

### Causal

Does the state arise from existing production/workforce rules?

### Stable

Can it persist for hundreds of ticks?

### Reproducible

Can multiple starting states reach it?

### Consequential

Does it change player decisions?

### Readable

Can the UI explain why it exists?

### Non-arbitrary

Can the contract be described without an arbitrary raw threshold?

A possible contract may be based on **simultaneous sustainable production categories**, rather than population alone, but only use this if measurements support it.

---

# 10. CHECK FOR SECOND-ORDER EFFECTS

For every viable tuning configuration, inspect:

### Population

Does the admission gate behave differently?

### Water

Does the new production rate invalidate Water as a meaningful bottleneck?

### Food

Does Food become permanently abundant?

### Material

Does industry become dominant?

### Housing

Does residence capacity remain meaningful?

### Roads

Does road cost remain meaningful?

### Workforce

Does the player still have meaningful allocation choices?

### Construction Crew

Does Crew remain useful?

### Scenarios

Do existing scenario constraints still produce distinct outcomes?

Do not fix any issue during this step.

Record it.

---

# 11. BALANCE DECISION MATRIX

Produce a factual comparison:

| Configuration | Food pressure | Water pressure | Workforce headroom | Industry | Population pressure | Scenario impact |
| ------------- | ------------- | -------------- | ------------------ | -------- | ------------------- | --------------- |
| 2 / 2         | measure       | measure        | measure            | measure  | measure             | measure         |
| 3 / 2         | measure       | measure        | measure            | measure  | measure             | measure         |
| 2 / 3         | measure       | measure        | measure            | measure  | measure             | measure         |
| 3 / 3         | measure       | measure        | measure            | measure  | measure             | measure         |

Do not assign scores or rank configurations.

The purpose is to expose trade-offs.

---

# 12. DESIGN DECISION

At the end, choose one of these factual outcomes:

### A — Keep 2 / 2

Current survival economy remains coherent and industry intentionally stays temporary.

### B — Adopt Farm 3

The Food-side surplus creates the desired industrial headroom while preserving Water as a constraint.

### C — Adopt Well 3

The Water-side surplus creates the desired industrial headroom while preserving Food as a constraint.

### D — Adopt both 3 / 3

Only if both are necessary and the survival constraints remain meaningful.

### E — No tuning yet

The experiments reveal that the 3-rate configurations create undesirable second-order effects, so more design work is required.

This is a design decision based on measured consequences, not a ranking.

---

# 13. IF A TUNING CHANGE IS CHOSEN

Only then may production code be changed.

If one configuration is selected:

* change only the relevant existing production constant(s);
* do not introduce a new mechanic;
* do not change consumption;
* do not change admission;
* do not change workforce rules;
* do not change Workshop rules;
* do not change progression contracts yet.

Update affected tests to the new **causal contract**, not merely expected numbers.

Then rerun all existing scenarios.

---

# 14. TOWN IMPLEMENTATION GATE

Even if a tuning configuration is adopted:

**Do not implement Town progression in this step.**

First establish that the new state is:

* stable
* reproducible
* consequential
* readable

Town should be implemented only in a subsequent step after the tuned model has survived a full gameplay audit.

If no tuning is adopted:

```text
Town remains deferred.
```

---

# 15. CONTENT IMPACT

Re-evaluate the three candidate scenarios from Step 10AO:

* Partitioned Valley
* Food Glut without Water
* Standing Industry

For each, determine whether the experimental tuning makes it:

* more meaningful,
* less meaningful,
* unchanged,
* or invalid.

Do not add them yet.

---

# 16. ARCHITECTURAL INVARIANTS

Regardless of outcome:

* no new resource
* no new building
* no new job type
* no new persistence
* no new transport
* no adjacency mechanics
* no pollution
* no logistics
* no Town threshold
* objective query remains pure
* scenarios remain declarative
* SAVE_VERSION remains `7`
* deterministic behavior preserved
* insertion-order invariant preserved
* save/load invariant preserved

If no production change is justified, keep this step audit-only.

---

# 17. VALIDATION

Run:

```text id="p6e7yq"
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
* GPU/WebGL validation

If production constants change, perform a complete regression run rather than only targeted tests.

---

# 18. DOCUMENTATION

Create:

```text id="xq5s8d"
docs/roadmap/Step10AP.md
```

Separate clearly:

```text
MEASURED FACTS
EXPERIMENTAL RESULTS
SECOND-ORDER EFFECTS
DESIGN DECISION
IMPLEMENTED CHANGE
DEFERRED DECISIONS
```

Do not present experimental 3/2 or 2/3 values as canonical unless the final decision explicitly adopts them.

---

# 19. FINAL REPORT

Return:

```text id="b27m4k"
STEP 10AP — FINAL REPORT

Starting commit:
Final commit:

BASELINE
Farm:
Well:
Current industrial headroom:

CONFIGURATIONS
2/2:
3/2:
2/3:
3/3:

HEADROOM
First configuration with spare worker:
Population where it appears:
Stable industrial state:
Maximum sustainable Workshop count:

INDUSTRIAL PHASE
Survival policy:
Industry policy:
Expansion policy:
Strategic differences:

SECOND-ORDER EFFECTS
Food:
Water:
Material:
Population:
Workforce:
Housing:
Roads:
Construction Crew:
Scenarios:

TOWN
Qualitative state:
Causal:
Stable:
Reproducible:
Consequential:
Readable:
Non-arbitrary:

DESIGN DECISION
A / B / C / D / E

PRODUCTION CHANGE
None / exact constant(s) changed:

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

CONTENT
Partitioned Valley:
Food Glut without Water:
Standing Industry:

NEXT DEPENDENCY:
```

## Hard constraints

Do not:

* choose a tuning value before running the comparison
* implement Town
* invent a Town threshold
* add mechanics to compensate for poor balance
* change consumption to manufacture workforce headroom
* add automation
* add specialist workers
* add logistics
* alter Water admission
* alter Food collapse
* alter construction rules
* alter Workshop semantics
* add persistence

The central question is:

> **Does a small change to an existing production ratio create a genuinely new industrial phase while preserving the meaningful survival constraints that make NOVA's current simulation interesting?**

If yes, adopt only the smallest justified change.

If no, keep the current model and defer both tuning and Town.


---

# Documentation (as-built) — Step 10AP

Starting commit: `22d3154` (Step 10AO).
Final commit: this commit.

**Outcome: `E — NO TUNING YET`. No production constant was changed.** `git diff src/`
is empty; the canonical economy remains `Farm 2 / Well 2`, and Town remains deferred.

---

## 0. Method — how a 3/2 experiment was executed without touching the source

The step required the test of four economic configurations while forbidding a
production change before the decision. The audit therefore runs a
**parameterised replay of the production engine**: `stepSimulation` is rebuilt
inside the audit from the *same exported phases* in the *same order* with the
*same arguments*, with exactly one substitution — Farm and Well output is
`staffed count × rate` instead of `staffed count × constant`. Every other phase,
including the Water admission gate and the material storage clamp, is the real
function. The only structural addition is the 8a command position, so a
placement command sees the post-production / pre-upkeep stock exactly as
`stepSimulation(state, command)` does.

The engine is then **proven faithful**: at `rates = { farm: 2, well: 2 }` it is
byte-identical to `stepSimulation` for every scene in the audit.

```text
fidelity: 6 scenes (P = 1, 2, 3, 5, 6, 12) × 60 ticks — canonical hash equality: PASS
divergence: 3/2 hash 103bd2f944525787, 2/3 hash f5a5a68c43b14ec3, 2/2 hash e4e950ecd0b328a0
```

The experimental values are never presented as canonical anywhere in this
document; every 3-rate number is labelled as experimental.

---

## 1. MEASURED FACTS — baseline contract, read from the code

| contract | value | source |
| --- | --- | --- |
| Farm production | `2` Food / tick | `FOOD_PER_FARM_PER_TICK` |
| Well production | `2` Water / tick | `WATER_PER_WELL_PER_TICK` |
| Workshop production | `2` Material / employed worker / tick | `MATERIAL_PER_WORKER_PER_TICK` |
| Workshop upkeep | `1` Material / staffed operational Workshop / tick | `MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK` |
| Food consumption | `1` / colonist / tick | `FOOD_PER_COLONIST_PER_TICK` |
| Water consumption | `1` / water-served colonist / tick | `WATER_PER_COLONIST_PER_TICK` |
| Residence capacity | `1` colonist | `BUILDING_CATALOG` |
| Workforce capacity | `1` job per workplace (Farm, Well, Workshop) | `getJobCapacity` |
| Admission | vacant operational Residence **and** Food left after this tick's consumption | `updatePopulation` |
| Water admission gate | `productionCapacity >= servedNeed + admissionsThisTick + 1` and the Residence must be water-served | `updatePopulation` (10P + 10S) |
| Material storage | `25` per **operational** Workshop (vacant included) | `MATERIAL_STORAGE_PER_OPERATIONAL_WORKSHOP` |
| Construction cost | `25` Material each; Workshop additionally `1` Water; road `5` | catalog |
| Initial stock | Material `100`, Food `100`, Water `0` | `createInitialResourceStock` |
| `SAVE_VERSION` | `7` | save schema |

**The two facts that decide the step:**

```text
balanced colony   = ceil(P / FarmRate) Farms + ceil(P / WellRate) Wells workers
2 / 2             = ceil(P/2) + ceil(P/2) = P workers for even P, P+1 for odd P
                  => a balanced 2/2 colony NEVER has a discretionary worker (spare <= 0)
```

---

## 2. EXPERIMENTAL RESULTS — population sweep, P = 1..12

`freeWorkers = P - ceil(P / FarmRate) - ceil(P / WellRate)` (a colonist the
survival infrastructure does not occupy). Each row is also executed through the
parameterised engine for 120 ticks; the measured staffed counts match the
arithmetic exactly and the population is retained in every row.

### Farm / Well per population

| P | 2/2 farms·wells·free | 3/2 | 2/3 | 3/3 |
| --- | --- | --- | --- | --- |
| 1 | 1·1·**-1** | 1·1·**-1** | 1·1·**-1** | 1·1·**-1** |
| 2 | 1·1·0 | 1·1·0 | 1·1·0 | 1·1·0 |
| 3 | 2·2·**-1** | 1·2·0 | 2·1·0 | 1·1·**1** |
| 4 | 2·2·0 | 2·2·0 | 2·2·0 | 2·2·0 |
| 5 | 3·3·**-1** | 2·3·0 | 3·2·0 | 2·2·**1** |
| 6 | 3·3·0 | 2·3·**1** | 3·2·**1** | 2·2·**2** |
| 7 | 4·4·**-1** | 3·4·0 | 4·3·0 | 3·3·**1** |
| 8 | 4·4·0 | 3·4·**1** | 4·3·**1** | 3·3·**2** |
| 9 | 5·5·**-1** | 3·5·**1** | 5·3·**1** | 3·3·**3** |
| 10 | 5·5·0 | 4·5·**1** | 5·4·**1** | 4·4·**2** |
| 11 | 6·6·**-1** | 4·6·**1** | 6·4·**1** | 4·4·**3** |
| 12 | 6·6·0 | 4·6·**2** | 6·4·**2** | 4·4·**4** |

### Summary

| configuration | first population with a free worker | max free workers (P=12) | max sustainable Workshops | feasible balanced populations |
| --- | --- | --- | --- | --- |
| 2 / 2 current | **never** | 0 | 0 | 2, 4, 6, 8, 10, 12 |
| 3 / 2 food surplus | **P = 6** | 2 | 2 | 2..12 |
| 2 / 3 water surplus | **P = 6** | 2 | 2 | 2..12 |
| 3 / 3 both surplus | **P = 3** | 4 | 4 | 2..12 |

`max sustainable Workshops` is measured, not inferred: at P=12 each
configuration is built with `freeWorkers` Workshops and run for 120 ticks — all
of them stay staffed, Water and Food stay at their starting stocks, and
`foodNet = waterNet = 0`. At 2/2 a staffed Workshop always costs a Well or the
Food balance (below), so the sustainable count is `0`.

### Food / Water delta per tick of the balanced colony (engine-measured)

| P | 2/2 | 3/2 | 2/3 | 3/3 |
| --- | --- | --- | --- | --- |
| 1 *(infeasible)* | -1 / +1 | -1 / +1 | -1 / +2 | -1 / +2 |
| 2 | 0 / 0 | +1 / 0 | 0 / +1 | +1 / +1 |
| 3 | -1 / +1 | 0 / +1 | +1 / 0 | 0 / 0 |
| 4 | 0 / 0 | +2 / 0 | 0 / +2 | +2 / +2 |
| 5 | -1 / +1 | +1 / +1 | +1 / +1 | +1 / +1 |
| 6 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| 7 | -1 / +1 | +2 / +1 | +1 / +2 | +2 / +2 |
| 8 | 0 / 0 | +1 / 0 | 0 / +1 | +1 / +1 |
| 9 | -1 / +1 | 0 / +1 | +1 / 0 | 0 / 0 |
| 10 | 0 / 0 | +2 / 0 | 0 / +2 | +2 / +2 |
| 11 | -1 / +1 | +1 / +1 | +1 / +1 | +1 / +1 |
| 12 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

---

## 3. EXPERIMENTAL RESULTS — qualitative headroom at P = 6

Survival state = exactly the required infrastructure. Industry state = the same
colony plus one Workshop, staffed from whichever worker the configuration can
spare (at 2/2, one Worker leaves a Well: the 10AO temporary-industry loop).
Both are read after 100 / 300 / 600 ticks; the values are identical at all three
when the state is stable.

| configuration | free | survival Food/Water Δ | staffed Farms·Wells·Workshops | Water at 600 | Material at 600 |
| --- | --- | --- | --- | --- | --- |
| 2/2 current | 0 | 0 / 0 | 3·2·1 | **0** (drained at tick ~100) | 24 (cap-1) |
| 3/2 food surplus | 1 | 0 / 0 | 2·3·1 | 200 | 24 |
| 2/3 water surplus | 1 | 0 / 0 | 3·2·1 | 200 | 24 |
| 3/3 both surplus | 2 | 0 / 0 | 2·2·1 | 200 | 24 |

**MEASURED FACT**: under 2/2 the industry state is *operationally* industrial
(`staffedWorkshops = 1`, `materialNet = +1`) but permanently Water-negative
(`waterNet = -2`, stock 200 → 0 by tick 100, then shortage forever). Under every
3-rate configuration the identical Workshop is staffed **in addition** to the
whole required infrastructure and the colony has **no deficit at all**
(`foodNet = waterNet = 0`) for the full 600 ticks. That is the qualitative change
the step asked about.

### The 2/2 temporary loop, measured

`3 Farms + 2 Wells + 1 Workshop`, P = 6, Water 200, Material 0:

| tick | population | Food | Water | Material | Food Δ | Water Δ |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 6 | 400 | 200 | 0 | 0 | -2 |
| 25 | 6 | 400 | 150 | 24 | 0 | -2 |
| 50 | 6 | 400 | 100 | 24 | 0 | -2 |
| 100 | 6 | 400 | **0** | 24 | 0 | -2 |
| 300 | 6 | 400 | 0 | 24 | 0 | -2 |
| 600 | 6 | 400 | 0 | 24 | 0 | -2 |

The bank is real (one building per Water reserve, capped at 25 by the storage of
a single Workshop) and the population never starves — but the phase costs Water
permanently and can never be made whole again at the population the Water gate
allows.

### 2/2 is not a dead end: the Food-funded conversion loop (P = 2)

`1 Farm + 2 Wells + 1 Workshop`, P = 2, Food 600, Water 0, Material 0. Each
cycle: both workers on the Wells for 20 ticks, then Farm + Workshop for 20 ticks.

| cycle | Food | Water | Material |
| --- | --- | --- | --- |
| start | 600 | 0 | 0 |
| 1 | 560 | 0 | 20 |
| 2 | 520 | 0 | 24 |
| 3 | 480 | 0 | 24 |

**MEASURED FACT (correction to 10AO)**: the Water reserve returns to its
pre-loop level every cycle, so the industrial phase is **repeatable**, not
one-shot: the colony converts a Food reserve into Material at 2 Food per
Material, bounded by the 25-per-Workshop storage cap. The 10AO wording "the loop
only wastes Water until the stock is spent down" holds for a *fixed* assignment;
it does not hold for an assignment that cycles. Under 2/2 the conversion is
nevertheless **reserve-funded**: the 2/2 Food balance is exactly break-even at
every feasible population, so the reserve can only shrink.

---

## 4. EXPERIMENTAL RESULTS — industrial phase policies (Farm 3)

All three policies start from the same P = 6 colony (2 Farms, 3 Wells, 6
Residences, 600 ticks horizon). Material starts at 0; placement uses the real
`placeBuilding` command in the 8a position.

| policy | what it does | population | Food | Water | Material | staffed F·W·S | Food Δ | Water Δ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A — Survival | the freed worker stays unemployed | 6 | 400 | 200 | 0 | 2·3·0 | 0 | 0 |
| B — Industry | the freed worker staffs one Workshop | 6 | 400 | 200 | 24 | 2·3·1 | 0 | 0 |
| C — Expansion | spend the industrial income on 2 Residences, a 4th Well and a 3rd Farm | **8** | 976 | 202 | 24 | 3·4·1 | **+1** | 0 |

Policy C placements (real commands, material 100):

```text
residence@13,0  accepted at tick 1
residence@15,0  accepted at tick 4
well@25,2       accepted at tick 7
farm@27,2       accepted at tick 20
population 6 -> 8 through the UNCHANGED Water gate (capacity 8 >= served 6 + admissions + 1)
final state: 3 Farms + 4 Wells + 1 Workshop, all 8 colonists employed, no deficit
```

**MEASURED FACT**: the industrial phase is not a bigger number — it is a
different state. A cannot build anything; B banks Material forever (to the
storage cap); C turns the same Material into population growth that only exists
because the freed Farm worker exists, and ends at P = 8 with Food rising and
Water exactly balanced.

**RECORDED (not fixed, §10)**: a single staffed Workshop rests at `cap - 1`
(25 storage minus 1 upkeep), so a 25-Material building is only spendable on the
tick whose production crests the cap; the resting-state affordability query shows
24. This is a property of the canonical economy, not of the tuning.

---

## 5. EXPERIMENTAL RESULTS — Farm 3 versus Well 3

The two single-rate changes are arithmetically symmetric in headroom (first free
worker at P = 6, two at P = 12) and causally different in what they free.

| | 3/2 Farm 3 | 2/3 Well 3 |
| --- | --- | --- |
| infrastructure workers at P = 12 | 4 Farms + 6 Wells = 10 | 6 Farms + 4 Wells = 10 |
| freed workers at P = 12 | 2 (Farm side) | 2 (Well side) |
| balanced populations with a **Food** surplus | 7 of 11 — `2,4,5,7,8,10,11` | 5 of 11 — `3,5,7,9,11` (odd-P rounding only) |
| balanced populations with a **Water** surplus | 5 of 11 — `3,5,7,9,11` (odd-P rounding only) | 7 of 11 — `2,4,5,7,8,10,11` |
| the bottleneck that remains | Water: still `ceil(P/2)` Wells, and growth is still gated by Water **capacity** | Food: still `ceil(P/2)` Farms — but the Water capacity gate is itself rated |
| progression coupling | **none** | `COLONISTS_PER_STAFFED_WELL` **is** `WATER_PER_WELL_PER_TICK`, so a Well-3 change silently moves the Village contract from `population >= 2, capacity >= 2` to `population >= 3, capacity >= 3` |

**MEASURED FACT**: Farm 3 preserves the Water growth gate exactly; Well 3 does
not — it changes the gate's own rate *and* the progression threshold derived from
it. Neither is called better; they free a different worker and leave a different
bottleneck.

---

## 6. EXPERIMENTAL RESULTS — both 3/3

| P | free workers | share of population | Food surplus | Water surplus |
| --- | --- | --- | --- | --- |
| 3 | **1** | 33 % | 0 | 0 |
| 6 | 2 | 33 % | 0 | 0 |
| 9 | 3 | 33 % | 0 | 0 |
| 12 | **4** | 33 % | 0 | 0 |

A third of every colony is discretionary from P = 3, and both Food and Water run
a surplus at the same seven populations. The survival economy stops being the
structure of the colony. This is the configuration §7 of the step warned about.

---

## 7. EXPERIMENTAL RESULTS — existing scenario replay

The six declarative scenarios are **not rewritten**: the same scenario data is
played with the same policy through the parameterised engine under each rate.
`settlementTick` / `villageTick` are the first tick at which the objective's
stage holds (rate-aware), `wipeTick` the first population loss.

| scenario | 2/2 | 3/2 | 2/3 | 3/3 |
| --- | --- | --- | --- | --- |
| First settlement | settlement @7, pop 2 | settlement @7, pop 2 | settlement @7, pop 2 | settlement @7, pop 2 |
| Water constraint | village @2, pop 2 | village @2, pop 2 | village @2, pop 2 | village @2, pop 2 |
| Industrial expansion | village @0, pop 2, Food 50 | village @0, pop 2, Food 664 | **wiped at tick 61**, pop 0 | village @0, **pop 3**, Water **1831** |
| Spatial efficiency | settlement @7, pop 1 | settlement @7, pop 1 | settlement @7, pop 1 | settlement @7, pop 1 |
| Population expansion | village @2, **pop 2** | village @2, pop 2 | village @2, **pop 4** | village @2, **pop 4**, Food 709 |
| Recovery | settlement @2, pop 1 | settlement @2, pop 1 | settlement @2, pop 1 | settlement @2, pop 1 |

**MEASURED FACT**: Farm 3 changes **no** structural scenario outcome — identical
stages, identical objective ticks, identical populations; only the Food stock is
larger (98→302, 50→253, 50→664, 296→497, 100→412, 228→428). It also **repairs
nothing**: Industrial Expansion still ends with an unstaffed Workshop, because
its own Water gate caps it at population 2 where no worker can be freed.

**MEASURED FACT**: Well 3 and Both 3 do change scenario outcomes. Well 3 makes
Industrial Expansion **starve the whole colony at tick 61** (Water headroom with
no Food headroom: the gate admits more colonists than the Farm can feed) and
lifts Population Expansion to 4. Both 3 keeps the Village stage but rewards the
same policy with population 3 and a 1831 Water surplus. Existing scenario
differentiation is therefore damaged by 2/3 and 3/3, and untouched by 3/2.

---

## 8. EXPERIMENTAL RESULTS — Town candidate gate

| property | 2/2 | 3/2 | 2/3 | 3/3 |
| --- | --- | --- | --- | --- |
| Causal (arises from existing rules) | no | yes | yes | yes |
| Stable (persists 600 ticks) | no | yes | yes | yes |
| Reproducible (a second shape reaches it) | no | yes | yes | yes |
| Consequential (changes player decisions) | no | yes | yes | yes |
| Readable (UI can explain it) | — | yes: `free workers = population - staffed Farms - staffed Wells` | yes | yes |
| Non-arbitrary (no invented threshold) | — | yes: the model's own staffing relation | yes | yes |

The qualitative state is real and would be the first honest Town phenomenon:
*"a full-coverage colony sustaining discretionary industrial production"*. It is
**not** contractable at 2/2, and no Town contract or threshold is implemented in
this step (§14).

---

## 9. SECOND-ORDER EFFECTS

| configuration | feasible balanced populations | Food-surplus populations | Water-surplus populations | max free workers |
| --- | --- | --- | --- | --- |
| 2/2 current | 2,4,6,8,10,12 | **none** | **none** | 0 |
| 3/2 food surplus | 2..12 | `2,4,5,7,8,10,11` | `3,5,7,9,11` | 2 |
| 2/3 water surplus | 2..12 | `3,5,7,9,11` | `2,4,5,7,8,10,11` | 2 |
| 3/3 both surplus | 2..12 | `2,4,5,7,8,10,11` | `2,4,5,7,8,10,11` | 4 |

* **Food** — the decisive effect. The canonical balanced colony is a knife edge:
  its Food production equals its consumption at every feasible population, so
  Food starvation (the only population-loss rule) is always one lost Farm worker
  away. A Farm-3 rate produces a **structural Food surplus at 7 of the 11
  balanced populations** (+1 or +2 Food per tick, uncapped stock, no other sink).
  The failure mode does not disappear — the Recovery scenario still wipes, and
  P ≡ 0 (mod 3) still balances exactly — but it stops being the standing
  condition of the colony.
* **Water** — a Water *stock* surplus appears at the 5 odd populations under 3/2,
  but it does not relax growth: the admission gate is Water **capacity**, not
  stock. Water pressure is preserved by 3/2. Under 2/3 the gate's own rate
  changes (3 per Well), which is a different, larger change.
* **Material** — unchanged by any rate: production 2/worker, upkeep 1, storage
  25/Workshop. The tuning changes how many workers exist, never the Workshop
  arithmetic.
* **Population** — the admission gate's rule is unchanged; what changes is how
  many workplaces fit inside a given population. 2/2 makes every odd population
  infeasible (a required workplace cannot be staffed); the 3-rate configurations
  make all of P = 2..12 feasible.
* **Housing / Roads / Construction Crew** — untouched: housing capacity is 1 per
  Residence, road cost 5, the access and mobility gates are rate-independent, and
  crew credit is +1 construction tick. A freed Farm worker is a new *choice* for
  the crew, not a change to the rule.
* **Scenarios** — see §7: 3/2 neutral, 2/3 and 3/3 damaging.
* **Recorded, not fixed**: the single-Workshop crest (§4).

---

## 10. BALANCE DECISION MATRIX (factual, no score, no ranking)

| Configuration | Food pressure | Water pressure | Workforce headroom | Industry | Population pressure | Scenario impact |
| --- | --- | --- | --- | --- | --- | --- |
| 2 / 2 | knife edge at every feasible P (Δ = 0) | knife edge at every feasible P (Δ = 0) | none (spare ≤ 0) | temporary only: a Workshop worker leaves a Well or Farm | odd P infeasible; growth gated by Water capacity and Material | baseline: all six scenarios keep their measured outcomes |
| 3 / 2 | Food surplus at 7 of 11 balanced P (+1/+2) | unchanged ratio; +1 stock at odd P, gate unchanged | first free worker at P = 6, 2 at P = 12 | up to 2 permanently staffable Workshops; reachable at P = 8 through the gate (policy C) | all P = 2..12 feasible; growth still gated by Water capacity | none structural: identical stages, objective ticks and populations; only larger Food stocks; repairs nothing |
| 2 / 3 | +1 at odd P only | Water surplus at 7 of 11 balanced P; the gate's own rate becomes 3/Well | first free worker at P = 6, 2 at P = 12 | up to 2 permanently staffable Workshops | admission cap becomes 3 colonists per Well | Industrial Expansion **starves at tick 61**; Population Expansion reaches 4 instead of 2; Village threshold would move to 3 |
| 3 / 3 | Food surplus at 7 of 11 | Water surplus at 7 of 11 | first free worker at **P = 3**, 4 at P = 12 (33 % of the colony) | up to 4 permanently staffable Workshops | growth stops being the gate | Industrial Expansion reaches population 3 on a 1831 Water surplus; Population Expansion changes |

---

## 11. DESIGN DECISION

```text
E — NO TUNING YET
```

**Factual basis.**

1. Farm 3 does create the industrial phase the step was looking for: a first
   discretionary worker at P = 6, a Workshop staffed **inside** a fully staffed
   survival colony with `foodNet = waterNet = 0` for 600 ticks, and a policy path
   (C) that turns that worker into population 8 with no deficit. Causal, stable,
   reproducible, consequential, readable, non-arbitrary.
2. It does so **by removing the structural Food pressure** that is the current
   survival economy: 7 of the 11 balanced populations acquire an uncapped Food
   surplus, so starvation — the only population-loss rule — stops being the
   standing condition of a balanced colony.
3. It **repairs no existing content**: all six scenarios keep exactly their
   canonical stage, objective ticks and population. The tuning's benefit is
   entirely prospective (a future Town contract) while its cost is paid now.
4. Well 3 reaches the same headroom but additionally moves the Village contract
   (`COLONISTS_PER_STAFFED_WELL` is `WATER_PER_WELL_PER_TICK`) and makes
   Industrial Expansion starve at tick 61. It is not the smaller change.
5. Both 3 gives a third of every colony away from P = 3 and relaxes both
   constraints at once.
6. The canonical 2/2 economy is not a dead end, which was the premise for tuning:
   industry is reserve-funded but **repeatable** (the Food-funded conversion loop
   at P = 2), and a staffed Workshop always buys exactly one building per Water
   reserve. Keeping it is a coherent design ("industry costs reserves"), not a
   missing mechanic.

**Consequence**: the tuning decision is deferred, to be taken together with the
content that would exercise the industrial phase (and with a documented
re-baseline of the affected audits). Adopting it now would re-baseline 107
assertions across 26 test files — including the recorded measurements of Steps
06–10AO — without repairing anything in the current game.

---

## 12. IMPLEMENTED CHANGE

```text
none
```

`FOOD_PER_FARM_PER_TICK = 2`, `WATER_PER_WELL_PER_TICK = 2`,
`FOOD_PER_COLONIST_PER_TICK = 1`, `WATER_PER_COLONIST_PER_TICK = 1`,
`MATERIAL_PER_WORKER_PER_TICK = 2`,
`MATERIAL_UPKEEP_PER_STAFFED_WORKSHOP_PER_TICK = 1` — all unchanged.
`git diff src/` is empty. No mechanic, no resource, no building, no job, no
adjacency, no logistics, no persistence, no scenario, no progression contract and
no production constant was touched.

## 13. DEFERRED DECISIONS

* **Tuning** (Farm 3 / Well 3 / both) — deferred to a step that also ships the
  content exercising the industrial phase and re-baselines the audits.
* **Town** — deferred (§14). No threshold invented. The only candidate condition
  the measurements support is the model's own relation
  (`a staffed Workshop while every Farm and Well stays staffed and Food/Water stay
  non-negative`), which is exactly what a future step may contract — after the
  tuned model has survived a full gameplay audit.
* **Industrial Expansion's unstaffed Workshop** and its above-cap starting stock
  — recorded in 10AO, unchanged here.
* **The single-Workshop crest (cap−1 at rest)** — recorded, not fixed.

## 14. CONTENT IMPACT (the three 10AO candidates)

| candidate | 2/2 (canonical) | 3/2 | 2/3 | 3/3 |
| --- | --- | --- | --- | --- |
| Partitioned valley | meaningful (spatial/coverage) | unchanged | unchanged | unchanged |
| Food glut without Water | meaningful (growth timing vs Water capacity) | *less* meaningful: the Food glut no longer costs the Farms that create it | *more* meaningful: Water capacity decides the growth window | **invalid**: neither constraint binds |
| Standing industry | meaningful: the Workshop runs only by displacing a Well | *less* meaningful: the freed worker makes industry permanent, removing the choice | *less* meaningful: same | **invalid**: industry is available from P = 3 |

None is added to `SCENARIOS` in this step.

## 15. ARCHITECTURAL INVARIANTS

```text
no new resource / building / job type / persistence / transport / adjacency /
pollution / logistics / Town threshold
objective query pure                     PASS (repeated calls are identical)
scenarios declarative                     PASS (data only, one shared assembler)
SAVE_VERSION                            7 (unchanged)
deterministic behaviour                  PASS (hash equality over 50 ticks)
insertion-order invariant                PASS
save/load invariant                      PASS (serialize -> load hash equality)
```

## 16. VALIDATION

```text
pnpm typecheck   PASS
pnpm lint        PASS
pnpm build       PASS
pnpm test        71 files / 1341 tests PASS   (70 / 1321 before: +1 audit file, +20 tests)
determinism      PASS (tests/determinism.test.ts)
insertion-order  PASS (tests/determinism.test.ts)
save/load        PASS (tests/persistence.test.ts)
browser          13 / 13 suites ALL PASS (headless: run, food, resource, temporal,
                 production, jobs, upkeep, transport, road, reassign, water,
                 construction crew, progression)
GPU              GPU E2E ALL PASS (headed, real renderer); the headless variant is
                 expected to FAIL by design because SwiftShader is not a hardware GPU
regression       complete suite re-run, not only the new audit
```

## 17. FILES CHANGED

```text
added:    tests/productionRatioTuningAudit.test.ts   (20 tests, this audit)
          docs/roadmap/Step10AP.md                  (this as-built block)
modified: none
```

`src/`, the scenario set, the production constants and the save schema are
untouched.

---

## 18. FINAL REPORT

```text
STEP 10AP — FINAL REPORT

Starting commit: 22d3154 (Step 10AO)
Final commit:    this commit

BASELINE
Farm: 2 Food / tick
Well: 2 Water / tick
Current industrial headroom: none — ceil(P/2) Farms + ceil(P/2) Wells = P workers
  (P+1 for odd P), so a balanced 2/2 colony has spare <= 0 at every population

CONFIGURATIONS
2/2: no discretionary worker at any P; industry costs a Well or the Food balance
3/2: first discretionary worker at P=6, 2 at P=12; Food surplus at 7 balanced P
2/3: first discretionary worker at P=6, 2 at P=12; Water gate becomes 3/Well
3/3: first discretionary worker at P=3, 4 at P=12 (33% of the colony)

HEADROOM
First configuration with spare worker: 3/2 and 2/3 at P=6; 3/3 at P=3
Population where it appears: 6 (3/2, 2/3), 3 (3/3)
Stable industrial state: yes for all three (600 ticks, foodNet = waterNet = 0,
  Workshop staffed inside a fully staffed survival colony)
Maximum sustainable Workshop count: 0 (2/2), 2 (3/2), 2 (2/3), 4 (3/3)

INDUSTRIAL PHASE
Survival policy: material 0, 0 Workshops, Food/Water exactly balanced
Industry policy: 1 Workshop, +1 net Material/tick, Food/Water exactly balanced
Expansion policy: population 6 -> 8 through the unchanged Water gate, 3 Farms +
  4 Wells + 1 Workshop, Food +1/tick, Water 0 net, material 24
Strategic differences: the freed worker is a real allocation choice (survive /
  bank / grow); at 2/2 the same Workshop is reserve-funded and permanently
  Water-negative

SECOND-ORDER EFFECTS
Food: Farm 3 gives 7 of 11 balanced populations an uncapped Food surplus (the
  canonical economy has none) — starvation stops being the standing condition
Water: unchanged by Farm 3 (stock-only surplus at odd P; the capacity gate is
  untouched); Well 3 replaces the gate's rate and moves the Village threshold
Material: unchanged (production 2, upkeep 1, storage 25/Workshop)
Population: 2/2 makes odd P infeasible; all 3-rate configs make P=2..12 feasible
Workforce: one job per workplace unchanged; the rate changes how many
  infrastructure workplaces are needed, not the allocation rule
Housing: unchanged (1 per Residence)
Roads: unchanged (cost 5, access/mobility gates rate-independent)
Construction Crew: unchanged (+1 tick); a freed Farm worker is a new choice
Scenarios: 3/2 neutral (identical outcomes, only larger Food stocks); 2/3 wipes
  Industrial Expansion at tick 61 and changes Population Expansion; 3/3 changes
  both Industrial Expansion (pop 3, Water 1831) and Population Expansion

TOWN
Qualitative state: a full-coverage colony sustaining discretionary industrial
  production (exists only under a 3-rate configuration)
Causal: yes — arises from the existing staffing and admission rules
Stable: yes — 600 ticks, no deficit
Reproducible: yes — a second, differently shaped colony reaches it
Consequential: yes — survive / bank / grow become three real policies
Readable: yes — free workers = population - staffed Farms - staffed Wells
Non-arbitrary: yes — the condition is the model's own staffing relation
Town implementation: DEFERRED (§14); no threshold invented

DESIGN DECISION
E — no tuning yet. The 3/2 configuration creates the industrial phase but removes
the structural Food pressure and repairs no existing content; 2/3 additionally
moves the Village contract and starves Industrial Expansion; 3/3 over-supplies
labour. The tuning is deferred to a step that ships the content exercising it.

PRODUCTION CHANGE
None. No constant changed; git diff src/ is empty.

SAVE_VERSION
7 (unchanged)

VALIDATION
Tests: 71 files / 1341 tests PASS
Typecheck: PASS
Lint: PASS
Build: PASS
Determinism: PASS
Insertion-order: PASS
Save/load: PASS
Browser: 13/13 suites ALL PASS (headless)
GPU: ALL PASS (headed, hardware renderer)

CONTENT
Partitioned Valley: meaningful under 2/2; unchanged by every experimental rate
Food Glut without Water: meaningful under 2/2; less meaningful under 3/2;
  more meaningful under 2/3; invalid under 3/3
Standing Industry: meaningful under 2/2 (industry costs a Well); less meaningful
  under 3/2 and 2/3 (industry becomes permanent); invalid under 3/3

NEXT DEPENDENCY:
A design step that co-designs the industrial content (the content that exercises
a discretionary worker) WITH the production-rate decision, then re-baselines the
affected audits in the same commit. Until then the canonical economy stays 2/2,
industry stays reserve-funded, and Town stays deferred.
```
