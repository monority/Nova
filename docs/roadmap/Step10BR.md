# NOVA — Step 10BR — Scale Pressure Remeasurement

## Context

Step 10BQ is complete and committed as `fa70fe4`.

10BO identified the first concrete scale pressure:

> At population 3, Farms and Wells can contend for the same limited workforce.

10BP audited the possible responses and concluded that the existing workforce model is sufficient:

* workforce remains type-blind;
* automatic assignment remains distance-first, then building-ID tie-break;
* manual reassignment already provides player agency;
* Construction Crew remains mutually exclusive with workplace assignment;
* no new labour priority/profession system was justified.

10BQ then implemented only the missing UX diagnosis:

* derived `getWorkplaceWorkforceDiagnosis()`;
* explicit precedence between construction, accessibility, available worker, worker shortage and staffed states;
* contention feedback when all eligible workers are already assigned;
* manual reassignment visibly resolves the diagnosis;
* responsive HUD handling;
* no persistence/schema/mechanical changes;
* headed Playwright + GPU validation passed.

The current question is therefore no longer:

> "How should workforce contention work?"

That question is closed.

The current question is:

> **Does workforce contention remain a small local pressure, or does it become a systemic scale pressure as the settlement grows?**

Do not design Town yet.

---

# Objective

Perform a focused **scale-pressure measurement and audit** using the current NOVA rules exactly as implemented.

The purpose is to determine whether the existing simulation naturally reaches a point where a new simulation capability becomes justified.

This is a measurement step, not a feature-expansion step.

Do not add mechanics merely because larger city-builders normally have them.

---

# Mandatory first action: AUDIT

Before changing code, inspect the current implementation and recent roadmap reports, especially:

* 10BO
* 10BP
* 10BQ
* current workforce assignment logic
* current road/accessibility logic
* current admission logic
* current construction crew logic
* current resource production/consumption
* current progression definitions
* existing scenario fixtures

Do not repeat closed audits unless a new measurement directly contradicts one of their conclusions.

Explicitly identify the authoritative predicates currently determining:

1. workforce eligibility;
2. workplace eligibility;
3. automatic assignment;
4. manual assignment;
5. construction-crew exclusion;
6. road-network membership;
7. workplace accessibility;
8. residence admission;
9. Food balance;
10. Water capacity/service;
11. Material production/storage.

---

# Measurement design

Create a small deterministic measurement suite.

Do not turn these into player-facing scenarios unless the existing architecture already makes that unavoidable.

Prefer test fixtures / audit tests over product content.

The measurements should cover at least the following scales.

## A — Small baseline

Reproduce the known 10BO contention fixture.

Purpose:

* establish that the current behavior is unchanged;
* establish the baseline for comparison.

Record:

* population;
* number of operational workplaces;
* staffed workplaces by type;
* vacant eligible workplaces;
* workers assigned;
* resource production;
* resource consumption;
* resulting balances;
* workforce diagnosis.

---

## B — Population 4

Increase population without changing the fundamental spatial model.

Measure:

* how many productive buildings can actually be staffed;
* whether contention grows;
* whether resource balances become limiting;
* whether automatic assignment creates a stable equilibrium;
* whether manual reassignment materially changes the outcome.

Do not prescribe which workplace should win.

Record what the current deterministic rules actually produce.

---

## C — Population 5–6

Create a larger but still compact settlement with enough productive workplaces to expose workforce scarcity.

Use combinations of:

* Farm;
* Well;
* Workshop.

Measure:

* workforce utilization;
* vacant eligible workplaces;
* resource production;
* resource consumption;
* Water capacity;
* Food balance;
* Material balance;
* Storage reserve where relevant;
* construction throughput;
* number of workers temporarily removed by Construction Crew.

The important distinction is:

> Is workforce scarcity merely visible, or does it materially constrain settlement development?

---

## D — Spatial variant

Construct an equivalent economic setup with a materially different road geometry.

At minimum compare:

### Compact geometry

Workers and workplaces are close on the same operational road network.

### Distributed geometry

Workplaces are separated spatially while remaining eligible.

Measure how the existing distance-based assignment changes:

* staffing;
* Food production;
* Water production;
* Material production;
* vacant workplaces;
* construction throughput.

The purpose is to test whether spatial pressure is actually emerging from the existing mechanics.

Do not add a new logistics system.

---

## E — Production composition

Compare different productive mixes at similar population.

For example:

* Food-heavy;
* Water-heavy;
* Material-heavy;
* mixed.

Do not call one "better" or "worse".

Measure the resulting consequences under the current deterministic assignment rules.

Pay particular attention to whether the type-blind workforce model creates an unavoidable structural conflict between:

* feeding the population;
* providing Water capacity;
* producing Material;
* constructing additional infrastructure.

If such a conflict appears, quantify it rather than solving it.

---

## F — Construction pressure

Measure the interaction between:

* productive workforce;
* Construction Crew;
* expanding housing;
* expanding production;
* roads.

At least one fixture should compare:

1. no Construction Crew;
2. one colonist temporarily assigned to Construction Crew.

Measure the resulting change in:

* productive staffing;
* resource production;
* construction completion;
* resource balances;
* time to recover after construction completes.

Do not modify Construction Crew semantics.

---

# Required measurements

For every fixture, capture a compact deterministic result containing at least:

* population;
* operational Residences;
* operational Farms;
* operational Wells;
* operational Workshops;
* operational Roads;
* staffed workplaces by type;
* vacant eligible workplaces;
* inaccessible workplaces;
* workers assigned;
* Construction Crew workers;
* Food production;
* Food consumption;
* Food balance;
* Water capacity;
* Water production;
* Water consumption;
* Material production;
* Material consumption;
* Material storage/reserve where relevant;
* current progression stage;
* number of simulation ticks required for the observed state;
* workforce diagnoses.

Where meaningful, also record:

* road-network count;
* workplace distance ordering;
* manual-assignment outcome;
* construction completion time.

Keep measurements deterministic and insertion-order independent.

---

# Critical analysis question

Do not merely report raw numbers.

After collecting the measurements, classify the observed pressure into one of these factual categories:

### 1. Local pressure

Contention exists but does not materially constrain development.

### 2. Persistent workforce bottleneck

Workforce scarcity becomes a recurring limitation as population and productive capacity increase.

### 3. Resource/workforce coupling

Workforce scarcity creates a meaningful trade-off between Food, Water, Material and construction.

### 4. Spatial workforce pressure

Road geometry and distance materially affect economic output at larger scale.

### 5. Multiple interacting pressures

Several of the above become coupled strongly enough that the current model begins to produce a qualitatively different settlement-management problem.

These are descriptive categories for the measurement report, not rankings.

Do not select a "winner".

---

# Important: distinguish pressure from missing features

A missing feature is not automatically a problem.

For example, do NOT conclude that NOVA needs:

* worker priorities;
* professions;
* logistics;
* warehouses;
* production chains;
* happiness;
* taxation;
* services;
* traffic;
* zoning;
* high-density housing;
* Town;
* additional resources;

merely because the current model does not contain them.

Only identify a new mechanic as potentially justified if the measurements demonstrate a concrete limitation or decision problem that the current system cannot express.

---

# Town gate

At the end of the measurement, explicitly answer:

> Does the measured scale pressure provide enough causal foundation to begin designing Town?

Use evidence from the measurements.

If yes, identify the **specific problem Town would need to solve**, without designing the solution yet.

If no, state what remains missing and continue measuring/implementing only the next justified capability.

Do not invent a Town population threshold.

Do not introduce a Town threshold in this step.

Do not modify progression.

---

# Implementation constraints

This step is primarily measurement/audit.

Allowed:

* new deterministic audit tests;
* measurement helpers only where genuinely necessary;
* roadmap/report documentation;
* narrowly scoped test fixtures.

Not allowed:

* new gameplay mechanics;
* new workforce rules;
* workforce priorities;
* professions/specializations;
* new resources;
* new buildings;
* new infrastructure;
* new storage mechanics;
* new logistics;
* new Town stage;
* new progression threshold;
* new scenarios;
* changes to automatic assignment;
* changes to manual assignment;
* changes to Construction Crew;
* changes to road distance;
* changes to resource production/consumption;
* SAVE_VERSION changes.

If an existing helper is sufficient, reuse it.

Avoid creating a generalized measurement framework for a handful of fixtures.

---

# Determinism requirements

Every measurement must be reproducible.

For representative fixtures verify:

* repeated simulation equivalence;
* insertion-order equivalence;
* save/load equivalence where relevant.

Do not persist derived measurement data.

---

# Verification

Because this step should not alter the player-facing UI, browser/GPU validation is only required if implementation unexpectedly changes runtime/UI/rendering code.

Otherwise run:

1. focused measurement/audit tests;
2. relevant workforce tests;
3. relevant progression/resource tests;
4. typecheck;
5. lint;
6. build;
7. `git diff --check`;
8. full Vitest suite.

The existing unrelated 5-second timeout tests must remain identified separately if they persist.

Do not "fix" unrelated timeout tests as part of this step.

If no UI/runtime changes were made, explicitly state:

> Browser/GPU not rerun because this step contains no UI/rendering/runtime change.

If any runtime/UI change becomes necessary, stop and reassess scope rather than silently expanding the step.

---

# Required final QA / bilan

Before committing, provide a concise report with:

## 1. Audit

What current authoritative systems were inspected.

## 2. Fixtures

List every measurement fixture and its purpose.

## 3. Results

Provide the important deterministic measurements.

## 4. Scale pressure

Explain whether the observed pressure is:

* local;
* persistent workforce bottleneck;
* resource/workforce coupling;
* spatial workforce pressure;
* multiple interacting pressures.

Do not rank these.

## 5. Player agency

Explain whether the existing controls already give the player meaningful responses.

Specifically account for:

* spatial placement;
* road layout;
* workplace composition;
* manual reassignment;
* Construction Crew.

## 6. Town gate

Answer whether the evidence now justifies beginning Town design.

If yes, identify the concrete unresolved problem.

If no, identify the next measurement/capability that is justified.

## 7. Regression safety

Confirm:

* no workforce rule changes;
* no progression changes;
* no resource-rule changes;
* no Storage changes;
* no scenario catalogue changes;
* no persistence changes.

## 8. Verification

Report:

* focused tests;
* relevant compatibility tests;
* full Vitest;
* typecheck;
* lint;
* build;
* diff check;
* browser/GPU status if applicable.

## 9. Commit

Commit the completed step with a clear message.

Working tree should be clean except for the pre-existing user-owned:

`docs/roadmap/Step10BO - Copy.md`

Do not modify, stage, delete, or commit that file.

---

# Definition of done

Step 10BR is complete only when:

* the known 10BO contention fixture is reproduced;
* larger population fixtures are measured;
* spatial variation is measured;
* production composition is measured;
* Construction Crew interaction is measured;
* results are deterministic;
* the current workforce model remains unchanged;
* no premature Town mechanic is introduced;
* the scale-pressure conclusion is evidence-based;
* the next step is justified from the measurements;
* all applicable verification passes;
* a post-implementation QA/bilan is written;
* the commit is created;
* the working tree is clean apart from the pre-existing user-owned copy file.

**Core principle:**

> Measure the pressure before designing the system that would respond to it.

Do not solve a problem that has not yet emerged.

---

# Documentation (as-built)

## 1. Audit

Inspected the current implementations and reports for:

- `ColonistState.workplaceId`, `workplaceAssignmentMode`, and `constructionAssignmentId`;
- `assignJobs` eligibility, distance ordering, ID tie-break, manual preservation, and construction exclusion;
- `validateReassignment` and `getReassignmentOptions`;
- road access, road networks, and building-to-building mobility;
- `updatePopulation` Food/Water admission rules;
- Food production/consumption;
- Well capacity and service semantics;
- Workshop production, upkeep, and Material reserve behavior;
- Construction progress and crew release;
- progression thresholds;
- existing scenarios and 10BO/10BP/10BQ findings.

Authoritative conclusions:

- one type-blind workforce pool is canonical;
- automatic assignment is operational/accessibility-gated, nearest-road-distance-first, then building-ID tie-break;
- manual reassignment uses the same capacity and mobility rules;
- construction crew is mutually exclusive with a workplace and accelerates construction;
- Water capacity is distinct from Water stock/service;
- progression and Storage remain unchanged.

## 2. Fixtures

All fixtures are deterministic test-only states using seed `nova-step10br`, high resource buffers to isolate allocation, and no player-facing scenario additions.

- **Compact population curve:** 3, 4, 5, and 6 population with 2F/2W at 3–4 and 3F/3W at 5–6.
- **Spatial variant:** the same five-worker, 3F/3W economic composition in compact and distributed connected-road geometries.
- **Production composition:** four workers with Food-heavy, Water-heavy, Material-heavy, and mixed Farm/Well/Workshop compositions.
- **Construction pressure:** compact 4-population 2F/2W colony with no crew versus one colonist assigned to a four-tick Residence expansion.
- **Manual response:** the same 5-worker compact contention state with one existing Well worker manually moved to an eligible Farm.
- **Determinism:** repeated construction, reversed record insertion order, and save/load replay of the 5-worker mixed state.

## 3. Results

### Population curve

| Population | Staffed Farms | Staffed Wells | Vacant eligible jobs | Workers | Food net/tick | Water capacity | Stage |
|---:|---:|---:|---:|---:|---:|---:|---|
| 3 | 2 | 1 | 1 | 3 | +1 | 2 | Village |
| 4 | 2 | 2 | 0 | 4 | 0 | 4 | Village |
| 5 | 3 | 2 | 1 | 5 | +1 | 4 | Village |
| 6 | 3 | 3 | 0 | 6 | 0 | 6 | Village |

The 3 and 5 cases reproduce the same qualitative pressure: one more required service job than available staffed capacity, with Water capacity below population. The 4 and 6 cases are healthy. The curve is therefore intermittent, not monotonic failure.

### Spatial variant

The compact and distributed five-worker 3F/3W fixtures both measured:

- 2 staffed Farms;
- 3 staffed Wells;
- 1 worker-shortage diagnosis;
- 0 inaccessible workplaces;
- 1 connected network;
- Food production 4/tick against consumption 5/tick;
- Water capacity 6/tick;
- Wilderness progression because the mixed type-blind allocation left Food short.

The distributed road geometry changed road count and distances but did not change the final staffed mix in this controlled composition. No spatial chokepoint or distance penalty emerged here. This is a negative spatial measurement, not evidence that spatial effects are impossible.

### Production composition

At four workers and four workplaces, every tested composition staffed all four jobs:

- Food-heavy: Food production 4/tick and Water capacity 4/tick.
- Water-heavy: Water capacity 4/tick and Food production 4/tick.
- Material-heavy: 2 Workshops produced a positive net Material balance after upkeep, while the single Farm left Food at the existing 4-worker balance.
- Mixed: 1 Farm, 1 Well, and 2 Workshops staffed all four jobs; Food was lower than the Food-heavy mix and Material was positive.

No composition created a new hard limit at four workers. The type-blind model created different economic consequences without an additional mechanic.

### Construction pressure

Without crew, the 4-worker 2F/2W baseline staffed all four productive jobs. Assigning one colonist to the four-tick Residence construction reduced productive employment to 3 and left one productive job vacant for the duration of crew assignment. The site completed under the existing accelerated construction rule, the crew was released, and automatic assignment restored all four productive workers within the fixture's three-tick recovery window.

This is a real opportunity cost, but it is temporary, visible, reversible, and already controlled by the player. It did not permanently prevent expansion.

### Manual response

Manual reassignment changed which productive type received the constrained worker while preserving the same five-worker total. The current control therefore materially changes the Food/Water outcome; it does not create or solve a new rule.

## 4. Scale pressure

The observed pressure is both:

- **persistent workforce bottleneck**: the same shortage recurs at population 3 and 5 when the productive composition requires more service jobs than available workers;
- **resource/workforce coupling**: the type-blind assignment can leave Water capacity below population or leave a Farm/Well mix with a different production balance.

It is not classified as a spatial workforce pressure in the controlled distributed fixture. It is not yet a multiple-interacting-pressure failure: the colony remains functional at 4 and 6, and the player can respond through placement, composition, manual reassignment, and Construction Crew.

## 5. Player agency

Existing responses are meaningful:

- spatial placement and road layout determine accessibility and distance preference;
- workplace composition determines the required Farm/Well/Workshop balance;
- manual reassignment moves a worker between eligible workplaces;
- Construction Crew explicitly trades current production for faster expansion;
- the player can choose which service or construction activity receives the scarce worker.

No new control is required to express the observed decision. What remains weak is not agency but the fact that scarcity is intermittent: the same settlement can be healthy at 4 and pressured at 5.

## 6. Town gate

**Does the evidence justify beginning Town design? NO.**

The measurement establishes a real recurring bottleneck and a Food/Water coupling, but not a qualitatively new settlement-management problem. The current controls already let the player choose a response, and healthy populations 4 and 6 show that the pressure is not yet structurally unavoidable. No Town threshold, capability, or mechanic is justified by this evidence.

The next justified step is continued measurement of coupled production/construction at larger scale, specifically looking for a case where workforce contention persists after spatial planning, manual reassignment, and composition changes have been exhausted. Do not design Town yet.

## 7. Regression safety

- no workforce rule changes;
- no progression changes;
- no resource-rule changes;
- no Storage changes;
- no scenario catalogue changes;
- no persistence changes;
- no UI/rendering changes;
- no SAVE_VERSION change.

## 8. Verification

- focused Step 10BR tests: 6 PASS;
- relevant compatibility tests: 75 PASS across progression, Water service, persistence, inspection, and road-network suites;
- typecheck: PASS;
- lint: PASS;
- build: PASS;
- full Vitest: 1,665 / 1,666 PASS; one unrelated existing 5-second timeout remains in `productionRatioTuningAudit.test.ts` (`Town candidate gate`);
- determinism: PASS in focused measurement suite;
- insertion-order: PASS in focused measurement suite;
- save/load: PASS in focused measurement suite;
- browser/GPU: not rerun; this step contains no UI, runtime, rendering, or player-facing changes.

## 9. Commit

`cdfc155` — Step 10BR: remeasure scale pressure

