# NOVA — Step 10AQ — Industrial Content & Progression Co-Design

Starting commit: `90ff6c8`

## Objective

Use the evidence from Steps 10AO and 10AP to define the **industrial gameplay contract using the current 2/2 economy**.

The current model must remain the baseline:

```text
Farm = 2 Food/tick
Well = 2 Water/tick
Colonist = 1 Food + 1 Water/tick
Workshop = 2 Material/tick gross
Workshop upkeep = 1 Material/tick
```

Step 10AP established:

* sustainable Workshop staffing is impossible in a fully balanced 2/2 colony;
* temporary industry is nevertheless repeatable;
* a player can convert a Water reserve into Material;
* the colony can recover by returning the worker to the Well;
* no production-rate tuning is justified;
* Farm 3 / Well 3 would invalidate a large amount of historical audit evidence without repairing current content;
* the existing economy therefore remains unchanged.

The purpose of this step is to **co-design the industrial scenario/content layer around the actual economy that already exists**.

This is not a new economic-mechanics step.

---

# 1. FREEZE THE ECONOMIC BASELINE

Before doing anything else, verify that production code still has:

```text
Farm = 2
Well = 2
Workshop = 2
Workshop upkeep = 1
Food consumption = 1
Water consumption = 1
```

Do not modify these values.

No domain economic change is allowed in this step.

---

# 2. FORMALIZE THE EXISTING INDUSTRIAL LOOP

Document the actual loop:

```text
sustainable colony
    ↓
accumulate Water reserve
    ↓
temporarily assign worker to Workshop
    ↓
Workshop converts reserve into Material
    ↓
Water reserve declines
    ↓
return worker to Well
    ↓
Water recovers
    ↓
repeat
```

Validate the exact economics.

For at least:

* P = 2
* P = 4
* P = 6

measure:

* maximum Water reserve
* industrial duration
* Material gained
* recovery duration
* construction enabled by the accumulated Material
* number of industrial cycles possible

The key question is:

> Is industrialization currently a meaningful **conversion decision**, rather than merely an economic failure mode?

---

# 3. DEFINE THE INDUSTRIAL PLAYER DECISION

Identify the actual trade-off.

The player appears to choose between:

```text
Water reserve
vs
Material reserve
```

while temporarily sacrificing the Well's Water production.

Determine exactly what the player gains by making this conversion.

Possible existing consequences:

* construction of additional buildings
* road expansion
* Workshop placement
* faster development
* reaching an objective
* recovery from an otherwise constrained opening

Do not invent new consequences.

If the current conversion produces a measurable advantage, quantify it.

If it does not, document why.

---

# 4. INDUSTRIAL EXPANSION SCENARIO REWORK

Step 10AN established that the current Industrial Expansion objective:

```text
Reach Village + build a Workshop
```

is reachable, but its previous description implied sustainable industrial operation that the current model cannot support.

Step 10AP further established that the scenario is not repaired by production tuning.

Now determine the correct **scenario framing**.

Test at least these conceptual framings:

### A — Material conversion

> Build a Workshop and convert stored Water capacity into Material.

### B — Industrial burst

> Establish a Workshop and use temporary industrial production to fund expansion.

### C — Industrial timing

> Reach Village, establish a Workshop, and complete a construction objective using its Material output.

### D — Current objective only

Retain the existing objective and simplify the description so it does not imply permanent industrial sustainability.

These are content hypotheses, not implementation instructions.

Run them through the existing simulation.

Choose based on actual measurable differentiation.

---

# 5. CONSTRUCTION CONSEQUENCE

The industrial loop only matters if Material has a useful destination.

Audit what Workshop-generated Material can actually accomplish.

Measure a controlled sequence:

```text
stable colony
→ industrial burst
→ Workshop output
→ construction
→ recovery
```

Compare against:

```text
stable colony
→ no industrial burst
→ normal Material generation
→ construction
```

Measure:

* construction completion tick
* number of structures built
* road cells
* final population
* final Food
* final Water
* final Material

The industrial scenario must have a consequence beyond:

> "a Workshop exists."

---

# 6. INDUSTRIAL CONTENT CANDIDATES

Evaluate these candidate scenario designs using the **unchanged 2/2 economy**:

### Candidate 1 — Water Reserve Industry

Start with enough Water reserve to make a Workshop burst meaningful.

### Candidate 2 — Material Construction Sprint

Objective combines Workshop construction with a measurable existing construction consequence.

### Candidate 3 — Industrial Recovery

Begin from an existing stressed but recoverable state and require industrial construction before returning to equilibrium.

### Candidate 4 — Industrial Timing

The player must choose when to spend Water on Material.

### Candidate 5 — Current Industrial Expansion

Keep the current scenario with corrected wording only.

Do not add all five.

Determine which candidates produce genuinely distinct decision spaces.

---

# 7. SCENARIO DIFFERENTIATION

Compare the industrial candidate against the existing six scenarios.

A scenario is only justified if it changes at least one of:

* first meaningful decision
* resource trade-off
* construction sequence
* failure/recovery path
* timing decision
* spatial decision
* objective interpretation

A different starting number alone is insufficient.

Do not rank scenarios.

Classify them:

```text
A — genuinely distinct decision space
B — distinct consequence but overlapping decisions
C — mostly framing variation
D — redundant
```

---

# 8. OBJECTIVE CONTRACT

The objective system from Step 10AN is now available.

Use it, but do not expand the objective framework.

For the industrial scenario define an objective using only the existing closed requirement kinds:

* stage
* population
* Water capacity
* Food balance
* building

If a candidate requires a new requirement kind, reject it for this step.

The objective must be:

* deterministic
* derived from current state
* immediately explainable
* reachable
* non-persistent

Do not create historical objectives.

---

# 9. INDUSTRIAL SUCCESS CONDITION

The industrial scenario should answer:

> "What concrete existing state tells the player they successfully industrialized?"

Possible candidates include:

```text
Village + Workshop exists
Village + Workshop + Food balance
Village + Workshop + Water capacity
Village + Workshop + population threshold
Village + Workshop + construction milestone
```

Only use conditions actually justified by the measured scenario.

Do not create a raw "industrial score".

---

# 10. TOWN RELATIONSHIP

Do not implement Town.

Determine whether industrial content can serve as future evidence for Town.

The current possible Town phenomenon is:

> A colony can sustain basic survival while deliberately allocating workforce to discretionary industry.

But under 2/2, this is not continuously sustainable.

Therefore test whether Town should instead remain deferred until a future mechanic creates a qualitatively sustainable industrial economy.

Do not force industrial content to become Town.

Industrial scenario ≠ Town progression.

---

# 11. CONTENT DESIGN

Using the current mechanics, propose a small scenario catalogue.

Keep the existing meaningful archetypes:

* First Settlement
* Water Constraint
* Spatial Efficiency
* Population Expansion

Re-evaluate:

* Industrial Expansion
* Recovery

Then determine whether the previously identified candidates remain useful:

* Partitioned Valley
* Food Glut without Water
* Standing Industry

For each candidate record:

```text
Name
Starting state
Objective
Primary decision
Secondary decision
Expected failure mode
Expected success state
Why it is distinct
```

Do not implement a large content library.

Aim for **one or two** high-value industrial/content additions at most.

---

# 12. SCENARIO STARTING STATES

Scenario states must remain:

```text
initial state + existing constraints + objective/framing
```

They must not contain hidden mechanics.

Use existing constructors.

Do not:

* bypass costs
* fabricate production
* inject hidden workforce
* bypass Water
* bypass Food
* alter construction duration
* alter building prices
* add scenario-only rules

Every scenario must run on the identical simulation.

---

# 13. IMPLEMENTATION GATE

Only implement after the content comparison.

If the existing Industrial Expansion scenario is sufficient after wording correction:

* modify only its data/framing.

If one new scenario is clearly justified:

* add only that scenario.

If no candidate is sufficiently distinct:

* keep content unchanged and document the conclusion.

Do not implement speculative scenarios.

---

# 14. REGRESSION OF ALL EXISTING CONTRACTS

Any implementation must preserve:

* Food contract
* Water contract
* Material contract
* workforce
* mobility
* roads
* Construction Crew
* Workshop Water cost
* progression
* objective evaluation
* existing scenarios

Run the full suite.

---

# 15. BROWSER VALIDATION

Use the real browser.

For every implemented/modified scenario verify:

* scenario framing
* objective label
* objective constraint
* objective status
* initial state
* progression
* Workshop construction
* Material change
* recovery
* final success state

Check for:

* fabricated transient values
* incorrect scenario framing
* stale objective status
* broken panel state
* console errors

Run GPU/WebGL validation.

---

# 16. ARCHITECTURAL INVARIANTS

Must remain:

```text
SAVE_VERSION = 7
src/domain unchanged
no new persisted state
objective query pure
scenario data declarative
deterministic assembly
insertion-order invariant
save/load invariant
```

No new economic constant.

No new mechanic.

No Town implementation.

---

# 17. REQUIRED TESTING

Run:

```text
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

Also:

* determinism
* insertion-order
* save/load
* complete browser suite
* GPU/WebGL

Add tests for any new scenario/objective contract.

Tests must encode actual content contracts, not hypothetical future mechanics.

---

# 18. DOCUMENTATION

Create:

```text
docs/roadmap/Step10AQ.md
```

Document:

* baseline industrial loop
* measured industrial conversion
* construction consequence
* Industrial Expansion candidate framings
* scenario differentiation
* selected content change, if any
* objective contract
* Town relationship
* deferred decisions
* validation

Clearly separate:

```text
MEASURED
DESIGNED
IMPLEMENTED
DEFERRED
```

---

# 19. FINAL REPORT

Return:

```text
STEP 10AQ — FINAL REPORT

Starting commit:
Final commit:

ECONOMIC BASELINE
Farm:
Well:
Workshop:
Upkeep:
Food consumption:
Water consumption:

INDUSTRIAL LOOP
P=2:
P=4:
P=6:

Water → Material conversion:
Recovery:
Construction consequence:

INDUSTRIAL SCENARIO
Candidate framings:
Selected framing:
Objective:
Success condition:
Distinct decision:

SCENARIO CATALOGUE
Existing distinct scenarios:
Industrial status:
Recovery status:
New scenario added:

TOWN
Industrial relevance:
Qualitative Town state:
Town contractable:
Reason:

IMPLEMENTATION
Files:
Domain changes:
Economic changes:
Persistence:
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

* change Farm/Well production
* change Workshop production
* change consumption
* change admission
* change workforce rules
* add automation
* add specialist workers
* add logistics
* add new resources
* add new buildings
* add new objective types
* add persistence
* implement Town
* invent arbitrary thresholds
* create scenario-only simulation mechanics

The central question is:

> **Can the existing 2/2 economy support a genuinely meaningful industrial scenario through timing, Water→Material conversion, and construction consequences — without changing the simulation?**

If yes, implement the smallest content change that exposes that gameplay.

If no, keep Industrial Expansion as documented content and leave future industrial/Town design explicitly deferred.


---

# Documentation (as-built) — Step 10AQ

Starting commit: `90ff6c8` (Step 10AP).
Final commit: this commit.

**Outcome: the existing 2/2 economy DOES support a meaningful industrial
scenario.** One content addition was implemented — the `water-reserve-industry`
scenario — plus one observability fix the browser validation proved necessary.
No economic value, admission rule, workforce rule, objective kind or persistence
changed.

---

## 1. MEASURED — the economic baseline is frozen

```text
Farm = 2 Food/tick      Well = 2 Water/tick      Colonist = 1 Food + 1 Water/tick
Workshop = 2 Material/tick gross, upkeep = 1 Material/tick
Material storage = 25 per operational Workshop
```

`git diff` on those values is empty; the audit asserts every one of them plus
`SAVE_VERSION = 7`.

## 2. MEASURED — the existing industrial loop

Protocol: a balanced colony (ceil(P/2) Farms + ceil(P/2) Wells), one operational
Workshop, a Water reserve, one real `reassignColonist` command moving a staffed
Well worker onto the Workshop (the burst), then the reverse command (the
recovery). All numbers come from `stepSimulation`.

| P | reserve | industrial ticks | Water drained | Material gained | Water refilled after recovery | cycles |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | 50 | 25 | 50 | 24 | **0** | 1 |
| 4 | 50 | 25 | 50 | 24 | **0** | 1 |
| 6 | 50 | 25 | 50 | 24 | **0** | 1 |

* The conversion is **population-independent**: one displaced Well worker drains
  exactly `WATER_PER_WELL_PER_TICK` (2) Water per tick and the Workshop nets
  exactly 1 Material per tick (2 produced − 1 upkeep). **2 Water : 1 Material.**
* A 50-Water reserve is one building of Material (24-25). The resting stock of a
  lone staffed Workshop is `cap − 1 = 24`; the placement query accepts a
  25-cost building on the tick whose production crests the cap (10AD-1).
* **Storage bound**: a 200-Water reserve buys 100 industrial ticks but the *same*
  24 Material — the 25-per-Workshop clamp (08F), not the reserve, owns the limit.
* At the balanced colony the reserve does **not** refill: Water production equals
  Water need at the capacity the admission gate allows, so the burst is one-way.
* The loop becomes **repeatable** when the colony can afford a Water surplus.
  Measured at P=2 with two Wells: alternating "both workers on the Wells" (20
  ticks) and "Farm + Workshop" (20 ticks) restores the Water reserve every cycle
  and accumulates Material (Food 600 → 556 → 512 for Material 0 → 20 → 24). The
  price is Food, not Water.

## 3. MEASURED — what the player actually gains

The conversion is **material-neutral in steady state**: the burst yields 24-25
Material and the Workshop costs 25. Measured head-to-head on a balanced P=4
colony with Material 25 (exactly one building) and a 51-Water reserve, asking for
a third Well:

| plan | Workshop | third Well | Material left | operational buildings |
| --- | --- | --- | --- | --- |
| no industry | — | placed at tick 1 | 0 | 9 |
| with industry | placed at tick 1, burst 25 ticks, recovered | placed at tick 32 | 0 | **10** |

**MEASURED FACT**: what the conversion buys is **substitution, not profit** — a
colony holding Water but little Material can still build, and it pays with the
Water reserve plus the Water *capacity* lost while the Well is unstaffed. A
second building needs a second reserve. This is a genuine player decision only
where the scenario makes Material scarce: that is the design lever the new
scenario uses.

## 4. MEASURED — the Industrial Expansion framings (existing data)

The existing scenario starts with Material 100 and Water 10.

| framing | measurement | verdict |
| --- | --- | --- |
| **A — Material conversion** | build the Workshop (Material 100 → 75), burst 6 ticks: Water 9 → 3, Material 75 → **74** (delta −1) | the burst **loses** Material: the stock is above the 25-per-Workshop cap, so output is discarded and each industrial tick only pays upkeep |
| **B — Industrial burst funds expansion** | a Residence is placeable at tick 6 from the **100-Material grant**, while the burst contributes ≤ 0 | the burst funds nothing on this data |
| **C — Industrial timing / construction objective** | `[stage, workshop, well≥2]` probe: `in_progress`, blocker `Well built` — unreachable (Water 10 → 5 Material, no second building) | rejected on this data |
| **D — Current objective + corrected wording** | the Workshop is buildable at tick 1 and the objective is honest | **selected for the existing scenario** — wording only |

**MEASURED FACT**: no wording can repair the existing scenario's industrial loop,
because its Water 10 and above-cap Material make the burst worthless. The
conversion archetype therefore needs its own starting state (a **new** scenario),
not a reworded objective on the old one. The existing scenario's framing was
corrected to state that its Workshop output is "a reserve-funded burst, never a
permanent income" (no data, requirement or resource changed) — framing D.

## 5. MEASURED — construction consequence

See §3. The industrial plan and the non-industrial plan spend the *same* 25
Material on different things; the industrial plan ends with one more operational
building (the Workshop) and the same Well, at the cost of the whole Water reserve
and a Water-capacity outage while the burst runs.

## 6. DESIGNED — candidate evaluation

| candidate | start state | objective | decision | distinct? |
| --- | --- | --- | --- | --- |
| **C1 Water reserve industry** | Village + 1 Well, Material 25, Water 51 (exactly one Workshop + one burst building) | Village + Workshop + a second Well | spend the last Material on the converter or on the goal, and when to run the burst | **yes — selected** |
| C2 Material construction sprint | same, larger objective | two buildings from one burst | none: the 25-per-Workshop cap limits one burst to one building | no |
| C3 Industrial recovery | a stressed colony | repair + Workshop | overlaps Recovery; needs a longer horizon | no |
| C4 Industrial timing | two affordable orders | either | without a hard budget it is C1 without the decision | no |
| C5 Current Industrial Expansion | Village, Material 100, Water 10 | Village + Workshop | none beyond building the Workshop (the loop is worthless on its data — §4) | no |

One candidate is genuinely distinct, and it is implemented as a **new scenario**
rather than by rewriting the existing one, because §4 shows the existing
scenario's data — not its wording — is what makes industry meaningless there.

## 7. MEASURED — differentiation

| scenario | stage | pop | Material | Water | requirement kinds |
| --- | --- | --- | --- | --- | --- |
| First settlement | wilderness | 0 | 100 | 0 | stage |
| Water constraint | settlement | 2 | 100 | 0 | stage |
| Industrial expansion | village | 2 | 100 | 10 | stage, building |
| **Water reserve industry** | village | 2 | **25** | **51** | stage, building, building |
| Spatial efficiency | wilderness | 0 | 55 | 0 | stage |
| Population expansion | settlement | 2 | 100 | 0 | population, waterCapacity, foodBalance |
| Recovery | wilderness | 1 | 30 | 0 | stage |

Classification of the new scenario — **A — genuinely distinct decision space**:

* **first meaningful decision**: spend the last 25 Material on the Workshop (the
  converter) or on the second Well (the goal);
* **resource trade-off**: Water stock → Material at 2 Water per Material, bounded
  by the 25-per-Workshop storage — no other scenario converts a resource;
* **construction sequence**: Workshop → burst → Well → recovery (the first
  building pays for the second);
* **failure/recovery path**: spending the budget before the converter is
  terminal (measured: Material 0 forever, the Workshop never affordable after
  300 ticks) — the same class of hard budget lock as First settlement /
  Spatial efficiency;
* **timing decision**: the burst drops the colony out of Village while it runs;
* **objective interpretation**: build the second Well *with the Workshop output*.

The five other archetypes keep their 10AM classifications; the new scenario does
not overlap Recovery (no repair) or Population expansion (no capacity growth).

## 8-9. DESIGNED — objective contract and success condition

```text
label:      Reach Village, build a Workshop and a second Well.
constraint: Material 25, Water 51: the Workshop first, then the reserve buys the Well.
requirements: [ stage: village, building: workshop >= 1, building: well >= 2 ]
failsWithoutColonists: true
```

Only the existing closed requirement set is used (`stage`, `building`,
`population`, `waterCapacity`, `foodBalance`) — the audit asserts the catalogue's
kinds are exactly those five. The objective is deterministic, derived from
canonical state, non-persistent, immediately explainable (it names the two
buildings), and reachable with real commands (measured: in_progress →
in_progress(Village unmet during the burst) → in_progress(Well unmet) →
completed after the recovery).

**Success condition**: `Village + Workshop + 2 operational Wells` — a
construction milestone, not a raw "industrial score". The momentary evaluation
semantics of 10AN are visible: industry costs the Village requirement *while it
runs*, and only the recovery completes the objective. That is the loop's lesson
in one state transition.

## 10. DESIGNED — Town relationship

```text
sustainableIndustryPossible: false
townContractable:            false
TOWN REMAINS DEFERRED
```

Industrial content is **not** Town progression. Every industrial tick is still
paid out of a finite reserve (Water, or Food for the repeatable cycle), so the
10AN/10AP Town candidate — "basic survival sustained while workforce is
deliberately allocated to industry" — still does not exist. No threshold was
invented.

## 11. IMPLEMENTED — content design

```text
id:          water-reserve-industry
name:        Water reserve industry
description: A Village whose Water reserve is the only construction budget left:
             the Workshop turns Water into Material.
resources:   Material 25, Food 50, Water 51
state:       2 operational Residences, 1 Farm, 1 Well, 4 operational road cells,
             2 colonists (a Village: Food balanced, Water capacity 2)
objective:   see §8-9
```

Every number is derived from the canonical rates, not chosen:

```text
Material 25 = the Workshop's construction cost (nothing else is affordable)
Water 51    = 25 x 2 (the burst: 25 ticks x 2 Water/tick) + 1 (the Workshop's
              construction Water)
```

**Catalogue after this step (7 scenarios)**: the four preserved archetypes
(First settlement, Water constraint, Spatial efficiency, Population expansion),
Recovery, the reworded Industrial expansion (framing D), and the new
Water reserve industry. The three 10AO/10AP candidates were re-evaluated:
Partitioned valley (spatial) remains the next distinct candidate for a future
content step; Food glut without Water and Standing industry are covered better by
the new scenario and the existing set (recorded, not added — the step's limit is
one or two additions).

## 12. MEASURED — scenario starting states stay pure

The scenario is data only: resources + existing buildings + roads + colonists +
an objective, assembled by the shared `createScenarioState` on the **same
simulation**. No cost bypass (the Workshop really spends 25 Material + 1 Water in
the browser), no fabricated production, no hidden workforce, no scenario-only
rule. `deterministic` and `save/load` round-trip are asserted.

## 13. IMPLEMENTED — the two production-code changes

1. **`src/application/scenarios.ts`** — the new scenario plus the Industrial
   expansion wording (framing D). Data only.
2. **`src/application/queries/inspection.ts` + `src/app/main.ts`** —
   **observability fix found by the browser validation**: `getReassignmentOptions`
   listed only Farm/Workshop targets while `validateReassignment` and
   `applyCommand` have accepted **Wells** since Step 10P. The inspector could
   therefore move a colonist *off* a Well but never *back onto* one, which made
   the industrial recovery — the step's core loop — impossible in the real UI.
   The options list now covers every workplace type the command accepts and the
   inspector numbers the targets per type (a Well is no longer labelled
   "Workshop 2"). `src/domain` is untouched: this is an observability contract,
   not a new mechanic, and the audit now pins it (a test asserts the options list
   and the command validation agree).

**RECORDED, not fixed**: the recovered colony has Water production == need with a
0 stock, so the HUD reports Water "not sustainable" (a *stock*-based label) while
the objective's Village condition (*capacity*-based) is met. Same class of
observation the 10AO/10AP audits recorded for the Water cap.

## 14-17. VALIDATION

```text
pnpm typecheck   PASS
pnpm lint        PASS
pnpm build       PASS
pnpm test        72 files / 1355 tests PASS   (71 / 1341 before: +1 audit file,
                 +14 tests)
determinism      PASS
insertion-order  PASS
save/load        PASS
browser          14 / 14 suites ALL PASS (headless: run, food, resource,
                 temporal, production, jobs, upkeep, transport, road, reassign,
                 water, construction crew, progression, industrial)
GPU              GPU E2E ALL PASS (headed, real renderer)
regression       full suite + every browser suite re-run, not only the new tests
```

The new browser suite `e2e/industrialRun.mjs` (registered as
`pnpm test:e2e:industrial`) drives the whole loop with real clicks: scenario
framing and budget, Workshop placement (Material 25 → 0, Water 51 → 50), the
manual reassignment onto the Workshop through the real inspector control, the
25-tick burst (Water → 0, Material → 24, stage Village → Settlement), the second
Well paid out of the burst Material, the recovery through the inspector, the
completed objective, and the persistence boundaries (version 7, 7 keys, no
scenario state). Screenshots: `artifacts/industrial/01..07`.

## 18. FILES CHANGED

```text
added:    tests/industrialContentCoDesign.test.ts  (14 tests, this audit)
          e2e/industrialRun.mjs                    (the new scenario, real browser)
          docs/roadmap/Step10AQ.md                 (this as-built block)
modified: src/application/scenarios.ts             (new scenario + framing D)
          src/application/queries/inspection.ts    (Well targets in the options)
          src/app/main.ts                          (per-type ordinals)
          tests/scenarios.test.ts                  (catalogue now 7)
          tests/industrialHeadroomAudit.test.ts    (catalogue count 7)
          e2e/progressionRun.mjs                   (new scenario start row)
          package.json                             (test:e2e:industrial)
```

`src/domain`, the production constants, the admission rule, the workforce rules,
the objective kinds and the save schema are untouched.

---

## 19. FINAL REPORT

```text
STEP 10AQ — FINAL REPORT

Starting commit: 90ff6c8 (Step 10AP)
Final commit:    this commit

ECONOMIC BASELINE
Farm: 2 Food/tick
Well: 2 Water/tick
Workshop: 2 Material/worker/tick gross
Upkeep: 1 Material/staffed Workshop/tick
Food consumption: 1/colonist/tick
Water consumption: 1/served colonist/tick

INDUSTRIAL LOOP
P=2: 50 Water -> 25 industrial ticks -> 24 Material; recovery refills 0
P=4: 50 Water -> 25 industrial ticks -> 24 Material; recovery refills 0
P=6: 50 Water -> 25 industrial ticks -> 24 Material; recovery refills 0
Water -> Material conversion: exactly 2 Water : 1 Material, one building per
  50-Water reserve, bounded by the 25-per-Workshop storage (200 Water buys the
  same 24 Material over 100 ticks)
Recovery: at the balanced colony the reserve does NOT refill (production ==
  need); the conversion is repeatable only where a Water surplus is affordable
  (measured at P=2 with two Wells: 3 cycles, Water restored, Food 600 -> 480)
Construction consequence: the conversion is MATERIAL-NEUTRAL (24-25 gained vs
  the Workshop's 25): it substitutes Water for absent Material. In the measured
  head-to-head the industrial plan ends with one more operational building (the
  Workshop) and the same third Well, at the price of the whole reserve

INDUSTRIAL SCENARIO
Candidate framings: A material conversion (fails: the stock is above the cap, the
  burst loses Material), B industrial burst (fails: funds nothing), C industrial
  timing with a construction objective (fails: unreachable on Water 10),
  D current objective + corrected wording (selected for the EXISTING scenario)
Selected framing: a NEW scenario, "Water reserve industry" — the conversion
  archetype needs its own budget, not a reworded objective
Objective: Reach Village, build a Workshop and a second Well
  [stage village, building workshop>=1, building well>=2]
Success condition: Village + Workshop + 2 operational Wells (a construction
  milestone; the Village requirement is unmet exactly while the burst runs)
Distinct decision: spend the last 25 Material on the converter or on the goal,
  and when to run the burst (the wrong order is terminal — measured)

SCENARIO CATALOGUE
Existing distinct scenarios: First settlement, Water constraint, Spatial
  efficiency, Population expansion (A, per 10AM); Industrial expansion and
  Recovery are B
Industrial status: Industrial expansion keeps its objective and is reworded
  (framing D); the conversion archetype is the new water-reserve-industry
  scenario (A — genuinely distinct)
Recovery status: unchanged (still B; repair vs replace)
New scenario added: water-reserve-industry (1 of the 5 candidates; the other 4
  are variants, overlaps or unreachable on the canonical economy)

TOWN
Industrial relevance: the industrial loop is a reserve-funded conversion; it is
  not a sustainable industrial economy
Qualitative Town state: still absent (a colony cannot allocate a worker to
  industry without unstaffing a Well)
Town contractable: false
Reason: every industrial tick costs a finite reserve; the 10AN/10AP Town
  candidate does not exist under 2/2. TOWN REMAINS DEFERRED

IMPLEMENTATION
Files: src/application/scenarios.ts, src/application/queries/inspection.ts,
  src/app/main.ts, tests/scenarios.test.ts, tests/industrialHeadroomAudit.test.ts,
  e2e/progressionRun.mjs, package.json, + the new test and e2e suite
Domain changes: none
Economic changes: none
Persistence: none
SAVE_VERSION: 7 (unchanged)

VALIDATION
Tests: 72 files / 1355 tests PASS
Typecheck: PASS
Lint: PASS
Build: PASS
Determinism: PASS
Insertion-order: PASS
Save/load: PASS
Browser: 14/14 suites ALL PASS (headless)
GPU: ALL PASS (headed, hardware renderer)

NEXT DEPENDENCY:
A content step for the remaining distinct archetype (Partitioned valley —
spatial/coverage: two road networks sharing one Well), and/or the recorded
follow-ups: Industrial expansion's above-cap starting stock and unstaffed
Workshop objective; the stock-vs-capacity Water sustainability label; the
100-vs-105 opening. Town stays deferred until a mechanic creates a
qualitatively sustainable industrial economy.
```
