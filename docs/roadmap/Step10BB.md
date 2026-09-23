# STEP 10BB — INDUSTRIAL HEADROOM & TOWN TUNING DECISION

## CONTEXTE

HEAD attendu :

```text id="008565c"
Step 10BA — Spatial & Workforce Readability Closure
```

La phase actuelle est maintenant largement fermée :

* 2/2 economy baseline stable ;
* Food = 2 / Farm / tick ;
* Water = 2 / Well / tick ;
* Workshop = 2 gross Material / tick, 1 upkeep ;
* one colonist = one workplace;
* Village progression implemented;
* Town+ intentionally undefined;
* terrain implemented as spatial constraint only;
* 7 scenarios;
* Water semantics closed;
* UX readability closed;
* no new causal capability discovered by 10AX;
* no housing scenario added by 10AZ.

10AP avait déjà démontré expérimentalement :

| Farm / Well | Sustainable spare-worker phenomenon   |
| ----------- | ------------------------------------- |
| 2 / 2       | no sustainable discretionary worker   |
| 3 / 2       | sustainable industry possible from P6 |
| 2 / 3       | sustainable industry possible from P6 |
| 3 / 3       | sustainable industry possible from P3 |

Mais 10AP n'a jamais choisi une production rate.

Cette étape doit donc être le **design decision gate** avant toute tuning.

---

# OBJECTIVE

Déterminer si le modèle économique doit rester :

```text
Farm 2
Well 2
Workshop 2 / upkeep 1
```

ou si une modification précise de production doit être adoptée pour créer un véritable **qualitative Town state**.

Cette étape doit produire une décision explicite.

Elle n'est PAS une implémentation.

---

# 1. FREEZE THE BASELINE

Reproduire exactement le baseline :

```text
Food = 2 / Farm / tick
Water = 2 / Well / tick
Material = 2 / Workshop / tick
Workshop upkeep = 1
Residence capacity = 1
```

Vérifier :

* P2 ;
* P4 ;
* P6 ;
* P8 ;
* P10 ;
* P12.

Mesurer :

* Farms staffed ;
* Wells staffed ;
* Workshops staffed ;
* spare workers ;
* Food balance ;
* Water balance ;
* Material net;
* stable state after 600 ticks.

Ne pas modifier le code.

---

# 2. TOWN DEFINITION

Avant de choisir une valeur, définir ce que le premier Town doit réellement représenter.

La définition doit être **qualitative**, pas :

```text
population >= N
```

ou :

```text
buildings >= N
```

Le candidat Town doit représenter au minimum :

> une colonie capable de maintenir simultanément sa survie et une activité industrielle discrétionnaire sans sacrifier sa couverture Food/Water.

Forme conceptuelle :

```text
survival economy
+
stable discretionary production
=
Town-capable state
```

Cette définition doit être testée contre le modèle actuel.

---

# 3. TEST THE TWO TUNING AXES

Comparer uniquement :

### Option F3

```text
Food = 3
Water = 2
```

### Option W3

```text
Food = 2
Water = 3
```

### Option F3W3

```text
Food = 3
Water = 3
```

avec :

```text
2/2 baseline
```

comme contrôle.

Ne pas tester d'autres valeurs dans cette étape sauf si nécessaire pour expliquer un résultat.

---

# 4. ECONOMIC MEASUREMENTS

Pour chaque configuration, mesurer P=2..12 :

* minimum Farms ;
* minimum Wells ;
* available workers ;
* sustainable Workshops ;
* Food balance ;
* Water balance ;
* Material balance ;
* maximum sustainable Workshops ;
* stable population;
* stable industry.

Produire une table :

| Config |  P | Farms | Wells | Spare | Workshops | Food Δ | Water Δ | Material Δ |
| ------ | -: | ----: | ----: | ----: | --------: | -----: | ------: | ---------: |

---

# 5. MINIMUM QUALITATIVE TOWN STATE

Chercher le plus petit P où :

```text
survival fully staffed
+
>=1 Workshop staffed
+
Food balance >= 0
+
Water balance >= 0
```

Mesurer :

* P minimum ;
* buildings required ;
* roads required ;
* construction Material;
* Water reserve requirement ;
* Food reserve requirement ;
* whether the state is stable for 600 ticks.

Le résultat doit être reproductible.

---

# 6. INDUSTRIAL STATE QUALITY

Un état ne compte comme Town-capable que si le Workshop :

* reste staffed ;
* ne force pas une Food deficit ;
* ne force pas une Water deficit ;
* ne dépend pas d'une finite pre-stocked reserve pour survivre ;
* continue à fonctionner après 600 ticks ;
* ne nécessite pas de scénario-specific exemption.

Donc :

```text
temporary Workshop
```

≠

```text
Town industry
```

---

# 7. COMPARE F3 VS W3

Ne pas simplement regarder lequel crée un Workshop.

Comparer les conséquences secondaires.

### Food3

Mesurer :

* disparition du starvation pressure ;
* populations impaires ;
* population ceiling ;
* scenario openings ;
* existing Food collapse scenarios ;
* usefulness of Food stock.

### Water3

Mesurer :

* Village threshold ;
* admission capacity;
* Water constraint scenarios;
* Workshop Water opportunity cost;
* Population Expansion;
* Water Reserve Industry;
* Partitioned Valley.

### Food3 + Water3

Mesurer :

* workforce headroom ;
* scenario collapse;
* Water objective meaning;
* Food objective meaning;
* maximum sustainable Workshops.

---

# 8. SCENARIO REGRESSION MATRIX

For every experimental configuration:

| Scenario               | 2/2 | F3 | W3 | F3W3 |
| ---------------------- | --: | -: | -: | ---: |
| First Settlement       |     |    |    |      |
| Water Constraint       |     |    |    |      |
| Spatial Efficiency     |     |    |    |      |
| Population Expansion   |     |    |    |      |
| Industrial Expansion   |     |    |    |      |
| Recovery               |     |    |    |      |
| Water Reserve Industry |     |    |    |      |

For each cell classify:

```text
unchanged
meaningful change
weakened
invalidated
strengthened
```

Do not rank the configurations.

---

# 9. CONTENT REGRESSION

The current 7 scenarios are valuable content.

A tuning decision is not acceptable if it destroys most of their decision spaces.

For every scenario that changes materially:

Document:

```text
Current decision:
Current consequence:
After tuning:
New decision:
New consequence:
```

In particular check:

### Food failure

Does Food3 make starvation cease to be a meaningful failure mode?

### Water constraint

Does Water3 make Water scarcity too weak?

### Industrial Expansion

Does industry become sustainable too early?

### Water Reserve Industry

Does the conversion puzzle become trivial?

### Population Expansion

Does additional housing remain meaningful?

---

# 10. TOWN THRESHOLD

Do NOT invent a Town threshold yet.

Instead derive candidate state conditions from actual causal quantities.

For each configuration, test whether the state can be expressed as:

```text
Village
+
stable discretionary industry
```

without introducing arbitrary numbers.

A potential Town contract may eventually be:

```text
Village
AND
at least one sustainably staffed Workshop
```

but this step must only establish whether that state is genuinely causal.

Do not implement it.

---

# 11. TUNING VALUE SELECTION

If tuning is justified, select **one exact configuration**.

The choice must be explained using measurable properties:

* minimum population where spare worker appears;
* percentage of workforce available for industry;
* stability;
* existing scenario preservation;
* resource meaning;
* progression consequences.

Do not use subjective labels such as:

* better;
* best;
* ideal;
* more fun;
* superior.

Use factual language:

```text
At P=6:
2/2 → 0 spare workers
3/2 → 1 spare worker
2/3 → 1 spare worker
3/3 → 2 spare workers
```

Then explain the resulting causal difference.

---

# 12. TOWN READABILITY

Use the UX work from 10BA.

If a Town-capable state exists, verify that the current UI can already expose:

* Food balance;
* Water balance;
* Workshop staffing;
* Material production;
* worker allocation;
* Village stage.

Determine whether the future Town condition would be readable without new UI.

Do not implement Town UI.

---

# 13. ARCHITECTURE IMPACT

For the chosen configuration, document:

* constants changed;
* tests requiring rebaseline;
* scenarios requiring rebaseline;
* objectives potentially affected;
* progression potentially affected;
* no persistence changes expected;
* no new simulation subsystem expected.

If tuning would require architectural changes:

> stop and classify the tuning as insufficiently isolated.

---

# 14. NO IMPLEMENTATION

This is a **design decision step**.

Do not change:

* production constants;
* simulation;
* scenarios;
* progression;
* objectives;
* UI;
* save version.

Only:

* audit tests;
* experimental fixtures;
* measurement scripts;
* documentation.

The working tree must remain clean after the audit commit.

---

# 15. DECISION GATE

There are only three valid outcomes.

## A — KEEP 2/2

If changing rates damages more existing causal content than it creates, keep the frozen baseline.

Then Town remains deferred.

---

## B — TUNE

If one exact configuration creates a reproducible, stable, consequential qualitative state while preserving sufficient existing content:

Select that exact configuration.

Do not implement it here.

The next step becomes:

```text
10BC — Economic Rebaseline + Town Contract
```

---

## C — MORE EVIDENCE NEEDED

Only if F3/W3/F3W3 produce materially different outcomes that cannot be resolved from current measurements.

Do not invent another tuning value.

---

# 16. VALIDATION

Run:

```text
pnpm typecheck
pnpm lint
pnpm build
```

Then:

* Vitest;
* determinism;
* insertion-order;
* save/load;
* browser if experimental fixtures require it;
* GPU if browser is run.

The baseline 2/2 behavior must remain byte-identical.

---

# FINAL REPORT

Return:

```text
STEP 10BB — FINAL REPORT

Starting commit:
Final commit:

BASELINE
- Food:
- Water:
- Workshop:
- Upkeep:
- P2:
- P4:
- P6:
- P8:
- P10:
- P12:

EXPERIMENT MATRIX
| Config | P | Farms | Wells | Spare | Workshops | Food Δ | Water Δ | Material Δ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|

TOWN-CAPABLE STATES
| Config | Minimum P | Stable 600t | Food ≥0 | Water ≥0 | Sustainable Workshop | Qualitative difference |
|---|---:|---:|---:|---:|---:|---|

SCENARIO REGRESSION
| Scenario | 2/2 | F3 | W3 | F3W3 | Consequence |
|---|---|---|---|---|---|

RESOURCE CONSEQUENCES
- Food3:
- Water3:
- Food3+Water3:

TOWN READABILITY
- Existing metrics:
- Existing UI:
- Missing information:

ARCHITECTURE
- src changes:
- constants changed:
- persistence:
- SAVE_VERSION:
- scenario changes:
- progression changes:

VALIDATION
- typecheck:
- lint:
- build:
- Vitest:
- determinism:
- insertion-order:
- save/load:
- browser:
- GPU:

DECISION

A — KEEP 2/2
B — TUNE
C — MORE EVIDENCE NEEDED

SELECTED CONFIGURATION

[Only if B.]

NEXT DEPENDENCY:
```

# HARD BOUNDARIES

Do not:

* implement the tuning;
* implement Town;
* change SAVE_VERSION;
* add a new resource;
* add a new workplace type;
* add a new colonist type;
* add production chains;
* add pollution;
* add density;
* add adjacency;
* add traffic;
* add new scenario mechanics;
* invent a Town threshold;
* rank configurations by subjective quality.

The sole question is:

> **Does changing Food/Water production create a stable, causal, readable industrial state that is sufficiently distinct from Village to justify making that tuning change?**

If not, keep 2/2 and stop trying to manufacture Town.


# Documentation (as-built) — Step 10BB

Starting commit: `008565c` (Step 10BA).
Final commit: this commit.

**AUDIT ONLY — DESIGN DECISION STEP.** No production constant changed: `src/` is
untouched. The step adds one audit file
(`tests/industrialHeadroomTownDecision.test.ts`, 15 tests) and this document.
SAVE_VERSION stays 7, the catalogue stays at 7 scenarios, no scenario, objective,
progression rule or UI was changed.

## 1. Instrument: the parameterised replay, re-verified

The experimental configurations run through the same *parameterised replay of the
production engine* Step 10AP introduced: every phase is the real exported phase
in the real order (`advanceConstruction → updateNeeds → Food production →
Water production → consumeFood → coverage/gate → consumeWater → updatePopulation
→ assignJobs → produceMaterial → applyCommand → progressPlacedRoads →
upkeepBuildings → releaseCompletedConstructionCrew → advanceTime`), with only the
Farm/Well output amount parameterised. `AUDIT REPLAY_FIDELITY` proves it is
**byte-identical to the production engine at 2/2** for P = 2…12 over 60 ticks.

Two measurement rules were necessary to get honest numbers:

* **flows, not stock deltas** — a shortage clamps the stock at 0, so a delta can
  hide a deficit. Every condition below is evaluated on
  `staffed count x rate` (shadow flows).
* the domain's `shortage` flag is a **stock** test (10AR): on a balanced colony
  with an empty reserve it reads `true` while the flow is perfectly balanced, so
  it is reported but never used as a Town condition.

## 2. Frozen baseline (real engine, 2/2)

```text
Food = 2 / Farm / tick · Water = 2 / Well / tick · Material = 2 / staffed Workshop / tick
upkeep = 1 · Residence capacity 1 · road 5 Material · construction 2 ticks
```

`AUDIT BASELINE_2_2`, minimum safe infrastructure (`ceil(P/rate)` of each), 600
ticks, P = 2…12: **every colonist is employed, no Workshop is ever staffed, and
the two nets always cancel** — even P: Food 0 / Water 0; odd P: one service +1
(the extra mandatory building) and the other −1 (the workplace that lost its
worker). Odd populations therefore cannot be simultaneously fully staffed and
fully served at 2/2: `AUDIT ODD_POPULATION_SHAPES` measures the fully balanced
staffing shape (floor Farms) running a real Food deficit and being **wiped**
(population 0 at tick 300), while the minimum safe shape keeps one workplace
permanently vacant.

## 3. Experiment matrix

```text
AUDIT EXPERIMENT_MATRIX  (600 ticks, shadow flows; spare = P − ceil(P/farmRate) − ceil(P/wellRate))
| Config            | P=2 | P=3 | P=4 | P=6 | P=8 | P=12 |
|-------------------|-----|-----|-----|-----|-----|------|
| 2/2 spare         |  0  | -1  |  0  |  0  |  0  |  0   |   Workshops staffed: 0 everywhere
| Food3 (3/2) spare |  0  |  0  |  0  |  1  |  1  |  2   |   first staffed Workshop at P=6
| Water3 (2/3) spare|  0  |  0  |  0  |  1  |  1  |  2   |   first at P=6
| 3/3 spare         |  0  |  1  |  0  |  2  |  2  |  4   |   first at P=3
```

This reproduces the step's own table exactly. `AUDIT FLOW_STRUCTURE` (P = 2…12):

| Config | Food surplus populations | Food balanced | Water surplus | Water balanced |
| --- | ---: | ---: | ---: | ---: |
| 2/2 | 5 (the odd-P extra building) | 6 | **0** | 6 |
| Food3 | **7** | 4 | 5 | 6 |
| Water3 | 5 | 6 | **7** | 4 |
| 3/3 | **7** | 4 | **7** | 4 |

## 4. Town-capable state (`AUDIT TOWN_CAPABLE_STATES`)

Condition: survival fully staffed **and** ≥ 1 sustainably staffed Workshop **and**
Food net ≥ 0 **and** Water net ≥ 0 **and** no reserve needed (the fixture starts
with Food 0 and Water 0) **and** stable for 600 ticks.

| Config | Minimum P | Stable 600 t | Food ≥ 0 | Water ≥ 0 | Sustainable Workshop | Qualitative difference |
| --- | ---: | --- | --- | --- | --- | --- |
| 2/2 baseline | **none** | — | — | — | — | no discretionary worker at any P |
| Food3 (3/2) | **6** | yes | 0 | 0 | 1 (600/600 ticks) | the Workshop is staffed *in addition to* every survival workplace |
| Water3 (2/3) | **6** | yes | 0 | 0 | 1 (600/600) | same, via the Well rate |
| 3/3 | **3** | yes | 0 | 0 | 1 (600/600) | a three-colonist hamlet is already "Town-capable" |

`AUDIT TOWN_STATE_COSTS`: the P = 6 candidate costs 12 buildings / 6 road cells
(330 Material, roads included) with **no Food or Water reserve required** and a
net +1 Material/tick; the 3/3 candidate needs 6 buildings / 3 road cells (165).

**The decisive pair** (`AUDIT TUNED_VS_CONTROL`) uses the *same building count* at
P = 6 (7 workplaces, 6 colonists):

| | Food3 (2 Farms + 3 Wells + 1 Workshop) | 2/2 control (3 Farms + 3 Wells + 1 Workshop) |
| --- | --- | --- |
| staffed Workshops | 1 (600/600 ticks) | 1 (600/600 ticks) |
| foodNet / waterNet | **0 / 0** | 0 / **−2** |
| materialNet | +1 | +1 |
| employment | 6/6, no vacancy | 6 employed, 1 vacant |
| stage | (Village only once the rate changes) | Village |

So the tuning does exactly what 10AO predicted: with the frozen rate the same
colony must leave a Well unstaffed (a permanent Water deficit) to run the
Workshop; with a single rate raised the Workshop runs *in addition to* a fully
staffed survival economy, with no reserve and no shortage.

## 5. Food3 vs Water3 — secondary consequences (measured)

**Food3** (`AUDIT FOOD3_EFFECTS`): the 7-colonist colony with 3 Farms starves at
2/2 (foodNet −1, population 0 at tick 300) and is **+2 Food under 3/2** (population
retained). Starvation itself survives every rate (a colony with no Farm dies
under 2/2 and under 3/2 alike), so the *failure mode* is intact but the designed
odd-population **pressure** disappears: the Food surplus count rises 5 → 7 and
`foodBalance` objectives stop discriminating (the `water-constraint` scenario's
Food net becomes +1 where the baseline is 0).

**Water3** (`AUDIT WATER3_EFFECTS`): capacity per staffed Well 2 → **3**, i.e. the
*gate's own rate* moves (one Well serves 3 colonists instead of 2); the Workshop's
one-off Water construction cost drops from 1/2 to 1/3 of a Well-tick of
opportunity cost; and because `progression.ts` derives both
`COLONISTS_PER_STAFFED_WELL` and the Village `Water capacity >= N` condition from
`WATER_PER_WELL_PER_TICK`, **a progression threshold moves with the tuning**.

**Both** (3/3): a Town-capable state at P = 3, i.e. the label would no longer
distinguish Town from Village.

**The conversion puzzle is rate-invariant** (`AUDIT RESERVE_CONVERSION`): running
the `water-reserve-industry` policy (place the Workshop, move the Well worker onto
it) for 60 ticks gains the identical **24 Material** and drains the same reserve
under 2/2 and 2/3 — the burst is worker-time bound because the Well is vacant
during it, so the tuning neither trivialises nor repairs that scenario.

## 6. Scenario regression (`AUDIT SCENARIO_REGRESSION`, 200 ticks, no commands)

No scenario changes its objective state or stage under any tuning in the
do-nothing trajectory; the measured changes are Food/Water numbers:

| Scenario | 2/2 | F3 | W3 | F3W3 | Consequence |
| --- | --- | --- | --- | --- | --- |
| First Settlement | control | unchanged | unchanged | unchanged | starts empty: no service to re-rate |
| Water Constraint | control | meaningful change (Food net 0 → +1) | unchanged (no Well yet) | meaningful change | the Food half of its framing loosens |
| Spatial Efficiency | control | unchanged | unchanged | unchanged | pure road-budget scenario |
| Population Expansion | control | unchanged | unchanged | unchanged | its do-nothing run wipes under every rate |
| Industrial Expansion | control | meaningful change | meaningful change | meaningful change | its stated constraint ("needs a fourth pair of hands") becomes outdated at 3/2 |
| Recovery | control | unchanged | unchanged | unchanged | the stranded-Farm puzzle is rate-independent |
| Water Reserve Industry | control | meaningful change | meaningful change | meaningful change | its authored Water arithmetic (51 = 25 x 2 + 1) is 2/2-specific |

`AUDIT BLAST_RADIUS`: **4 of 7** scenario texts embed 2/2 arithmetic, **2 objective
kinds** (`waterCapacity`, `foodBalance`) are rate-derived, and progression derives
the Village threshold from the Well rate — so a tuning rebaselines content *and* a
progression threshold, not only a constant.

## 7. Town contract candidate and readability (`AUDIT TOWN_CONTRACT_CANDIDATE`)

`Village AND at least one sustainably staffed Workshop` needs only existing reads
(`getProgression`, `countWorkersAt`/`getEmploymentSummary`,
`getFoodProductionPerTick`/`getWaterProductionPerTick`) — no new primitive, no
arbitrary number. But it is **coupled to the tuning**: the P = 6 candidate state
scores `wilderness` under the current contract (2 Farms cannot feed 6 colonists at
the frozen rate, so even Settlement's Food balance fails) and only becomes Village
once the rate changes. The 2/2 counterpart at the same building count *is* Village
and has **no** staffed Workshop. Readability is already there (10BA surfaces: Stage,
Water row, Food row, Jobs row, Material row, Residence Work line); the only
missing information is a per-Workshop "sustainably staffed" indicator and, of
course, the Town condition itself (deliberately undefined).

## 8. Baseline integrity

```text
typecheck PASS · lint PASS · build PASS
Vitest 83 files / 1561 tests PASS (+1 file / +15 tests; 82/1546 before)
determinism / insertion-order / save-load PASS
browser 18 / 18 suites headless ALL PASS · GPU E2E ALL PASS (headed)
src/ unchanged (no constant, rule, scenario, objective, progression or UI change)
SAVE_VERSION 7
```

---

## 9. FINAL REPORT

```text
STEP 10BB — FINAL REPORT

Starting commit: 008565c (Step 10BA)
Final commit:    this commit

BASELINE
- Food: 2 / Farm / tick
- Water: 2 / Well / tick
- Workshop: 2 Material / staffed Workshop / tick (gross)
- Upkeep: 1 Material / staffed Workshop / tick
- P2:  1 Farm + 1 Well, spare 0, Food 0 / Water 0, no Workshop, stable 600 t
- P4:  2 + 2, spare 0, Food 0 / Water 0, no Workshop, stable
- P6:  3 + 3, spare 0, Food 0 / Water 0, no Workshop, stable
- P8:  4 + 4, spare 0, Food 0 / Water 0, no Workshop, stable
- P10: 5 + 5, spare 0, Food 0 / Water 0, no Workshop, stable
- P12: 6 + 6, spare 0, Food 0 / Water 0, no Workshop, stable
- (odd P: every colonist employed, one workplace permanently vacant, one
  service +1 and the other −1; the fully balanced staffing shape starves and is
  wiped — measured)

EXPERIMENT MATRIX
| Config | P | Farms | Wells | Spare | Workshops | Food Δ | Water Δ | Material Δ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2/2 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| 2/2 | 4 | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| 2/2 | 6 | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| 2/2 | 12 | 6 | 6 | 0 | 0 | 0 | 0 | 0 |
| Food3 | 6 | 2 | 3 | 1 | 1 | 0 | 0 | +1 |
| Food3 | 12 | 4 | 6 | 2 | 2 | 0 | 0 | +2 |
| Water3 | 6 | 3 | 2 | 1 | 1 | 0 | 0 | +1 |
| Water3 | 12 | 6 | 4 | 2 | 2 | 0 | 0 | +2 |
| 3/3 | 3 | 1 | 1 | 1 | 1 | 0 | 0 | +1 |
| 3/3 | 6 | 2 | 2 | 2 | 2 | 0 | 0 | +2 |
(all rows stable for 600 ticks; Material Δ is net of upkeep and capped by the
25-per-Workshop storage)

TOWN-CAPABLE STATES
| Config | Minimum P | Stable 600t | Food ≥0 | Water ≥0 | Sustainable Workshop | Qualitative difference |
|---|---:|---:|---:|---:|---:|---|
| 2/2 baseline | none | — | — | — | 0 | no discretionary worker at any P |
| Food3 (3/2) | 6 | yes | yes | yes | 1 (600/600) | industry runs IN ADDITION to a fully staffed survival economy |
| Water3 (2/3) | 6 | yes | yes | yes | 1 (600/600) | same, reached through the Well rate |
| 3/3 | 3 | yes | yes | yes | 1 (600/600) | a 3-colonist hamlet is already Town-capable |

SCENARIO REGRESSION
| Scenario | 2/2 | F3 | W3 | F3W3 | Consequence |
|---|---|---|---|---|---|
| First Settlement | control | unchanged | unchanged | unchanged | starts empty |
| Water Constraint | control | meaningful change | unchanged | meaningful change | Food net 0 → +1; its Food framing loosens |
| Spatial Efficiency | control | unchanged | unchanged | unchanged | road-budget scenario, rate-free |
| Population Expansion | control | unchanged | unchanged | unchanged | do-nothing wipes under every rate |
| Industrial Expansion | control | meaningful change | meaningful change | meaningful change | "a fourth pair of hands" becomes outdated |
| Recovery | control | unchanged | unchanged | unchanged | stranded-Farm puzzle is rate-independent |
| Water Reserve Industry | control | meaningful change | meaningful change | meaningful change | authored Water 51 = 25x2 + 1 is 2/2-specific |

RESOURCE CONSEQUENCES
- Food3: the odd-population Food pressure disappears (the 7-colonist/3-Farm
  colony is foodNet −1 and wiped at 2/2, +2 and alive at 3/2); Food surpluses at
  7 of 11 populations instead of 5; `foodBalance` objectives stop discriminating.
- Water3: capacity per staffed Well 2 → 3, i.e. the ADMISSION GATE's own rate
  moves; the Workshop's one-off Water opportunity cost falls by a third; and
  because progression derives `COLONISTS_PER_STAFFED_WELL` and the Village
  "Water capacity >= N" test from the Well rate, a PROGRESSION THRESHOLD moves.
- Food3+Water3: both, plus a Town-capable state at P = 3, so the label stops
  distinguishing Town from Village.
- Also measured: the `water-reserve-industry` conversion is RATE-INVARIANT (24
  Material gained over 60 ticks under both 2/2 and 2/3), so tuning neither
  trivialises nor repairs that puzzle.

TOWN READABILITY
- Existing metrics: stage (getProgression), Water capacity/balance/reserve
  (getWaterSupplyStatus), Food production/consumption, Workshop staffing
  (countWorkersAt / getEmploymentSummary), Material production/upkeep.
- Existing UI: Stage/Next, Water row (stock + supply state), Food row (stock +
  forecast), Jobs row (employed / capacity), Material row, Residence Work line
  (10BA), Workshop inspector.
- Missing information: no per-Workshop "sustainably staffed" indicator (the Jobs
  row aggregates) and no Town condition display (Town is deliberately undefined).

ARCHITECTURE
- src changes: none (audit only)
- constants changed: none
- persistence: untouched (7 keys, resources = construction/food/water)
- SAVE_VERSION: 7
- scenario changes: none (4 scenario texts + 2 objective kinds + the Village
  threshold WOULD need rebaselining if a tuning were adopted)
- progression changes: none

VALIDATION
- typecheck: PASS
- lint: PASS
- build: PASS
- Vitest: 83 files / 1561 tests PASS (+1 file / +15 tests)
- determinism: PASS   - insertion-order: PASS   - save/load: PASS
- browser: 18 / 18 suites headless ALL PASS (re-run although src/ is untouched)
- GPU: ALL PASS (headed)

DECISION

A — KEEP 2/2

SELECTED CONFIGURATION

(none — option B is not adopted)

NEXT DEPENDENCY:
- Content and UX, outside Town progression. The industrial-headroom question is
  closed: at 2/2 no population sustains a staffed Workshop, a single rate change
  would create exactly the state 10AO predicted (measured: Food3 or Water3 at
  P = 6, 600/600 ticks, no reserve, balanced flows) but it converts the Food
  pressure (7 of 11 populations in structural surplus) or the Water gate's own
  rate into a surplus and moves a progression threshold derived from the Well
  rate, while 4 scenario texts and 2 objective kinds embed the 2/2 arithmetic —
  so the change would need a content and contract rebaseline (the "10BC" step
  the prompt names) that the current evidence does not justify. If the product
  ever decides it wants a Town stage, the exact option is recorded here
  (Food3 = 3/2, first sustainable Workshop at P = 6, 12 buildings / 330 Material,
  no reserve) together with its complete consequence list; nothing else in the
  economy should be re-tuned. Otherwise the next work remains content (the 10AZ
  housing question is content-blocked, not readability-blocked) and the
  outstanding UX items from 10AW/10BA.
```
