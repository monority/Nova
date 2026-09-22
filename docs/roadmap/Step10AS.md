# Step 10AS — Opening Economy & Scenario State Audit

## CONTEXTE

Starting commit: `4db33ff` — Step 10AR complete.

The current project has now exhausted the currently identified scenario candidates without needing a new core mechanic.

Current scenario catalogue:

* First settlement
* Water constraint
* Spatial efficiency
* Population expansion
* Industrial expansion
* Recovery
* Water-reserve-industry

Partitioned Valley is explicitly deferred because it is useful but overlapping without terrain/obstacles.

The current economic model remains frozen:

* Farm: 2 Food/tick
* Well: 2 Water/tick
* Workshop: 2 Material/tick gross
* Workshop upkeep: 1 Material/tick
* Food: 1/colonist/tick
* Water: 1/colonist/tick
* Residence: 25 Material, capacity 1
* Farm: 25 Material
* Well: 25 Material
* Workshop: 25 Material + 1 Water
* Road: 5 Material/cell
* Construction: 2 ticks, or 1 with Construction Crew
* Workshop storage: 25 Material
* Initial Material: 100
* Initial Water: 0
* SAVE_VERSION: 7

Do not change these values during this step.

---

# PRIMARY QUESTION

The remaining content/design concern is the opening economy.

The canonical "minimum Village" package costs:

* 2 Residences = 50 Material
* 1 Farm = 25 Material
* 1 Well = 25 Material
* 1 road = 5 Material

Total: **105 Material**

The default starting stock is **100 Material**.

This creates a precise question:

> Is the 100 → 105 gap an intentional gameplay constraint that creates meaningful construction-order pressure, or is it merely an accidental opening-state mismatch?

At the same time, audit the current **Industrial Expansion** scenario because 10AQ/10AR recorded that its starting Material stock can sit above the Workshop storage cap and therefore make its industrial objective framing less informative than intended.

The goal is to determine whether these are:

* content/framing problems,
* scenario-state problems,
* UX/readability problems,
* or evidence that the core economy itself needs retuning.

Do not assume the answer.

---

# STEP 1 — RECONSTRUCT THE OPENING STATE SPACE

Using the actual current simulation, enumerate meaningful opening sequences from the default 100 Material state.

At minimum test construction orders involving:

* Residence
* Residence
* Road
* Well
* Farm
* Workshop where affordable

Measure for each:

* tick of placement
* Material before/after placement
* Water before/after placement
* population
* Food
* Water capacity
* Water balance
* Water stock
* Water service
* workforce
* progression stage
* objective state
* eventual settlement/recovery/death
* final stable state where applicable

Do not merely enumerate permutations mechanically.

Group sequences by **causal outcome**.

---

# STEP 2 — ANALYSE THE 100 → 105 GAP

Test the following hypotheses.

### H1 — The gap is accidental

The player cannot construct the complete minimum self-sustaining Village package from the initial stock, and the missing 5 Material has no meaningful explanation.

### H2 — The gap is intentional construction-order pressure

The player must first create a functioning Settlement, survive long enough to generate the missing Material, and then complete the Village package.

### H3 — The gap is actually an information problem

The state is viable, but the UI does not explain why the player should delay one construction or how Material generation closes the gap.

### H4 — The gap creates multiple genuinely distinct openings

Different legal orders produce materially different outcomes, not merely different timestamps.

For each hypothesis, provide measured evidence.

Do not modify the initial stock.

---

# STEP 3 — MEASURE THE FIRST FIVE DECISION POINTS

For the default 100-Material opening, identify the first meaningful decisions.

For each decision determine:

1. What can the player choose?
2. What alternatives are legal?
3. What downstream state changes?
4. Is the consequence reversible?
5. Is the consequence visible?
6. Does the decision affect eventual success/failure?

Pay particular attention to:

* Well-first vs Farm-first
* Residence-first vs infrastructure-first
* road placement before/after production
* second Residence timing
* when the player can safely spend the final Material

The goal is to establish whether the opening already has sufficient strategic structure.

---

# STEP 4 — INDUSTRIAL EXPANSION AUDIT

Reproduce the current Industrial Expansion scenario exactly as implemented.

Investigate the previously recorded issue:

> Starting Material can exceed the Workshop's 25 Material storage cap, so Workshop production may be discarded rather than creating meaningful accumulated industrial reserve.

Measure:

* starting Material
* Workshop affordability
* Workshop storage
* Material production
* Material upkeep
* Material actually retained
* Water consumption
* industrial duration
* objective progress
* resulting state after industry
* whether excess starting Material is actually relevant to the intended objective

Then determine whether the scenario currently communicates a meaningful industrial decision.

Possible classifications:

* **A — Keep unchanged**
* **B — Reframe starting state**
* **C — Rework scenario state minimally**
* **D — Scenario should be deferred**

Do not change the simulation to rescue the scenario.

---

# STEP 5 — TEST SCENARIO-STATE REFRAMING

If the Industrial Expansion scenario is weak because of its initial state, test whether a different **existing-state configuration** can create meaningful content without new mechanics.

Permitted changes are only:

* initial building arrangement,
* initial road arrangement,
* initial colonist assignments where already legal,
* initial Material stock,
* initial Water stock,
* existing scenario objective/framing.

No new rules.

Do not choose values arbitrarily.

Any proposed value must be derived from an existing causal threshold, construction cost, storage cap, production rate, or measured state transition.

For example, if a 25-Material starting reserve is proposed, explain why 25 is causally meaningful rather than aesthetically convenient.

---

# STEP 6 — COMPARE OPENING AND INDUSTRIAL CONTENT

Compare:

### Default opening

100 Material / 0 Water

against:

### Industrial scenario

current actual initial state

against:

### Water-reserve-industry

current actual initial state

Determine whether these scenarios actually teach/demand different reasoning.

Use these criteria:

* distinct first decision
* distinct resource bottleneck
* distinct construction sequence
* distinct timing consequence
* distinct failure/recovery behavior
* distinct objective interpretation

A scenario is not distinct merely because it has a different starting number.

---

# STEP 7 — AUDIT WHETHER TUNING IS ACTUALLY NECESSARY

This is a decision gate.

Do NOT tune production rates, consumption, costs, or starting stock unless the evidence demonstrates a genuine systemic problem.

Classify the current opening economy:

### A — Healthy

The 100 → 105 gap creates useful order/timing pressure and the industrial scenario can be framed through existing state.

### B — Content/framing issue

The simulation is adequate, but one or more scenario states should be adjusted.

### C — Balance issue

The current numerical configuration prevents a meaningful strategic state and a controlled tuning step is justified.

### D — Missing capability

The problem cannot be solved by content/framing without introducing a new mechanic.

If C or D, **do not implement the new mechanic/tuning here**.

Instead document the evidence and define the next design step.

---

# STEP 8 — IMPLEMENT ONLY THE MINIMUM JUSTIFIED CHANGE

If the audit produces an A:

* no core implementation required,
* optionally improve scenario copy/readability if directly justified.

If B:

* adjust only declarative scenario data/framing,
* no domain changes,
* no economic constants.

If C:

* do not tune yet,
* produce a precise tuning proposal with measured before/after consequences,
* defer implementation to a dedicated co-design/tuning step.

If D:

* document the missing causal capability,
* do not invent it here.

---

# STEP 9 — ARCHITECTURAL INVARIANTS

Preserve:

* `SAVE_VERSION = 7`
* no new persistence
* deterministic simulation
* insertion-order invariance
* pure objective queries
* declarative scenario definitions
* domain/application/rendering separation
* no scenario-specific economic rules
* no hidden workforce
* no hidden resource
* no scenario-only bypasses

Prefer application/scenario/test changes.

Avoid `src/domain` changes unless the audit discovers an actual domain defect.

---

# STEP 10 — REQUIRED VALIDATION

Run:

* full Vitest
* typecheck
* lint
* build
* determinism
* insertion-order
* save/load
* browser E2E
* headed browser validation
* GPU validation

Browser inspection must cover:

1. Default 100-Material opening.
2. Construction affordability around the final 5 Material.
3. Settlement → Village progression.
4. Industrial Expansion initial state.
5. Industrial objective.
6. Workshop Material/storage display.
7. Water-reserve-industry.
8. Updated Water semantics from 10AR.

Confirm that the 10AR Water status fix remains correct:

* capacity
* balance
* stock
* service
* reserve depletion
* shortage

---

# STEP 11 — FINAL REPORT

Return exactly:

```text
STEP 10AS — FINAL REPORT

Starting commit:
Final commit:

OPENING ECONOMY
- Default state:
- Minimum Village cost:
- 100→105 gap:
- Opening sequences tested:
- Distinct outcomes:
- First meaningful decisions:

100→105 GAP
- H1:
- H2:
- H3:
- H4:
- Classification:

INDUSTRIAL EXPANSION
- Current initial state:
- Starting Material:
- Storage interaction:
- Industrial outcome:
- Objective:
- Classification:
- Reframed / unchanged / deferred:

SCENARIO COMPARISON
- Default opening:
- Industrial Expansion:
- Water-reserve-industry:
- Distinct decision spaces:

TUNING GATE
- Classification: A/B/C/D
- Evidence:
- Tuning justified: yes/no

IMPLEMENTATION
- Files:
- Domain changes:
- Economic changes:
- Persistence:
- SAVE_VERSION:

VALIDATION
- Tests:
- Typecheck:
- Lint:
- Build:
- Determinism:
- Insertion-order:
- Save/load:
- Browser:
- GPU:

TOWN
- Contractable: yes/no
- Evidence:

NEXT DEPENDENCY:
```

---

# HARD CONSTRAINTS

Do NOT:

* change Farm/Well/Workshop production,
* change consumption,
* change admission,
* change workforce rules,
* change road cost,
* change building costs,
* change storage caps,
* add terrain,
* add obstacles,
* add logistics,
* add food distribution,
* add pollution,
* add adjacency mechanics,
* add density mechanics,
* add service radii,
* add objective types,
* add persistence,
* implement Town,
* invent arbitrary scenario values,
* tune the economy merely to create content.

The central question is:

> **Is the current 100-Material opening already a meaningful construction-order problem, and can Industrial Expansion be made meaningful through existing scenario state/framing rather than changing the simulation?**

Use measured causal evidence to decide.

```

Après 10AS, on devrait avoir une décision beaucoup plus nette sur la suite : **soit on ferme la phase contenu/équilibrage avec le modèle 2/2, soit on ouvre enfin un step de tuning expérimental extrêmement ciblé**.
```


---

# Documentation (as-built) — Step 10AS

Starting commit: `4db33ff` (Step 10AR).
Final commit: this commit.

**Outcome: the 100-Material opening is `A — healthy` (no economic change), and
Industrial Expansion is `A — keep unchanged` with a readability fix (the storage
cap was invisible; it is now shown, and the scenario copy names it).**
No production rate, consumption value, cost, storage cap, starting stock,
scenario resource, requirement or domain rule changed. `SAVE_VERSION` stays 7.

---

## 1. MEASURED — the opening state space from 100 Material

Same stock, same world; only the order differs. Every plan runs through the real
`stepSimulation` with real `placeBuilding` / `placeRoads` / `reassignColonist`
commands and the real affordability gate.

| plan | purchases | outcome | measured |
| --- | --- | --- | --- |
| S1 settle core | Residence, road, Farm (55) | stable Settlement | settlement @5, pop 1, Food +1/tick (396 at t=303), 45 Material idle, no Well |
| S2 Well before Farm | Residence, road, Well (55) | **death** | wipe @104 (no Food producer; 99 Water banked) |
| S3 core + 2nd Residence | + Residence (80) | stable Settlement, **hard stall** | pop 2, Material 20, 1 colonist unemployed, no Water (supply `inactive`) |
| S4 core + Well | + Well (80) | stable Settlement, Well vacant | pop 1, Material 20, capacity 0, supply `shortage` |
| S5 the 105 package, buildings first | 4 buildings (100) then road | **death** | the road is 5 Material short → never placed → wipe @104 |
| S6 the whole 100 in buildings, no road | 4 buildings (100) | **death** | nothing is reachable (mobility gate) → wipe @104 |
| S8 industrial bootstrap | Residence, 2 roads, Well, Workshop (85) + two Water→Material cycles | **Village** | Village @116, pop 2, 2 employed, capacity 2, 5 buildings, Food 100 → 59 |

**Grouped by causal outcome**: (a) a stable but stalled Settlement, (b) death by
starvation in three different orders, (c) a Village reached only through the
industrial bootstrap. The three classes are materially different states, not
timestamps.

## 2. MEASURED — the 100 → 105 gap

```text
minimum functional Village = 2 Residences (50) + Farm (25) + Well (25) + 1 road (5) = 105
initial stock                                                            = 100
measured shortfall at the moment of the fifth purchase                   = 5 (the road)
```

The single road cell is not optional: with four buildings and no road **nothing
is reachable** (the 09K mobility gate and the 09E road-access rule) → measured
wipe at tick 104.

| hypothesis | verdict | evidence |
| --- | --- | --- |
| **H1 — accidental** | partially supported | the stated 105 package is unaffordable from 100, and the shortfall is exactly one road cell. But the 5 is not a tuned number: it is the road cost, and the road is what makes the package function |
| **H2 — construction-order pressure** | supported | the same 100 produces a surviving Settlement (S1), a stall (S3/S4), a wipe (S2/S5/S6) or a Village (S8) depending only on order |
| **H3 — information problem** | partially supported | the hover feedback is precise (`insufficient material (20/25)`, `(0/5)`), but nothing names the 105 package; the player discovers it by failing. The Material storage cap had the same problem (fixed below) |
| **H4 — multiple distinct openings** | supported | three outcome classes, and the bootstrap is a real strategic alternative: Village for 41 Food and ~116 ticks instead of a safe stagnant Settlement |

**Classification: `A — healthy opening`.** The gap is not a defect to remove; it
is what forces the choice between a safe small colony and an industrial
bootstrap. The initial stock stays 100.

### The first five decision points

| # | decision | alternatives | consequence | reversible | visible | terminal? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | first building = Residence | none (only a Residence creates a colonist) | a colonist exists and eats 1 Food/tick | no (25 committed) | yes | yes — without a Farm, Food ends at t≈104 |
| 2 | the first road cell | road now, or a second building first | without it no workplace can be staffed or produce | no demolition exists | yes (the preview names the shortage) | yes — the all-buildings order wipes (S6) |
| 3 | Farm or Well next | Farm (Food) or Well (Water capacity) | Farm settles; Well starves | no | yes (Food forecast, Water status) | yes — Well-first is fatal (S2) |
| 4 | second Residence timing | housing (a colonist) or a Well | both stall: 20 Material, one idle colonist, or a vacant Well | no | yes (resources, Jobs 1/2) | no |
| 5 | the last 20 Material | nothing costs 20: Well 25 (5 short), Workshop 25 + 1 Water (no Water exists) | the stock is stranded unless Material is manufactured | no | yes (`insufficient material (20/25)`) | only the industrial bootstrap converts it |

## 3. MEASURED — Industrial Expansion, exactly as implemented

The scenario is unchanged: 2 Residences + Farm + Well + 3 road cells, 2
colonists, Material 100, Food 50, Water 10, Village, objective
`Reach Village + build a Workshop`.

| measurement | value |
| --- | --- |
| starting Material / Water | 100 / 10 |
| storage capacity at start | **0** (no operational Workshop) |
| Workshop affordability | 25 Material + 1 Water → affordable at tick 1 |
| Material after the Workshop | 75 |
| storage once the Workshop is operational | 25 |
| gross / stored production per tick | **2 / 0** (the stock is 4× the cap) |
| upkeep per tick | 1 |
| measured net over the burst | **exactly −1 per staffed tick** (the Material loss equals the staffed ticks) |
| Water | 9 → 0 in ≤6 ticks; supply `draining` → `shortage` |
| objective | **completed by the Workshop alone** (no industry needed) |
| resulting state | stage Village → Settlement, capacity 0, the Workshop staffed and draining |
| after spending the stores down (75 → 50 → 25 → 0) | the SAME burst is **stored**: gross 2, stored 2, +10 Material over 10 ticks |

**MEASURED FACT**: the excess starting Material is irrelevant to the objective
(the Workshop costs 25 of the 100) but it *is* the scenario's industrial content:
the 25-per-Workshop storage cap bounds what industry can add, and a stock above
the cap makes the burst a net loss until it is spent. The defect is that the cap
was **invisible** — the HUD showed only the stock, so "Material 75 with a
Workshop producing 2/tick that does nothing" was inexplicable.

### Reframing candidates tested (all rejected)

| candidate | derived from | measured result | verdict |
| --- | --- | --- | --- |
| R1 as-is (100 / 10) | current data | burst −1/tick (stored 0) | **kept** |
| R2 (25 / 10) | 25 = the Workshop cost; 10 Water = 5 Material = one road cell | burst +24 stored, but the objective is complete before industry runs and funding a *building* with the burst is `water-reserve-industry` (Water 51) | rejected: no added decision, shadows the other scenario |
| R3 (100 / 51) | 51 = 25 × 2 + the Workshop's construction Water | the stock is still above the cap → the burst still loses (−1/tick); the Water budget duplicates `water-reserve-industry` | rejected: the cap, not the Water, binds |

**Classification: `A — keep unchanged`**, plus the readability fix below.

## 4. MEASURED — comparison of the three openings

| criterion | default opening (100 / 0) | Industrial expansion (100 / 10) | Water reserve industry (25 / 51) |
| --- | --- | --- | --- |
| distinct first decision | Residence first, then Farm or Well | build the Workshop | spend the last 25 on the converter or the Well |
| distinct bottleneck | 100 vs the 105 package; no Material producer exists | a worker + Water (2 workers, 2 workplaces, 10 Water) | Material 25 with Water as the only budget |
| distinct construction sequence | Residence → road → Farm → (2nd Residence \| Well) → stall | Workshop at tick 1 | Workshop → burst → Well → recovery |
| distinct timing | the bootstrap needs ~116 ticks and 41 Food | the burst is optional and counter-productive above the cap | the burst is mandatory; reversing the order is terminal |
| distinct failure | starvation at 104 (three orders) | a permanently draining Workshop | a terminal Material lock |
| distinct objective | none (free play) | Village + Workshop (a limit tutorial) | Village + Workshop + a second Well (a conversion puzzle) |

**MEASURED FACT**: the three demand different reasoning — budget/order with a
discovered industrial answer, a buildable-but-unrunnable limit, and a
conversion with a terminal ordering.

## 5. TUNING GATE

```text
Classification: A — HEALTHY
Tuning justified: no
```

Evidence: the 5-Material gap produces three measured outcome classes from the
same stock; Village is reachable from 100 in ~116 ticks through existing rules
(an industrial bootstrap paid for with the Food reserve); the industrial
scenario is coherent once the storage cap is visible; and **no measured state
requires a production, consumption, cost, storage or starting-stock change to
become meaningful**. No tuning proposal is produced, and no mechanic is
requested. The content phase closes on the frozen 2/2 model.

## 6. IMPLEMENTED — the minimum justified change (readability only)

1. **`index.html` + `src/app/main.ts`** — the Material row now shows the storage
   cap when a producer exists (` · storage 25`) and names the discard
   (` · full`) when gross output exceeds what was stored (08F). Derived from
   `getMaterialStorageCapacity` / `getMaterialProductionPerTick` /
   `getMaterialStoredProductionPerTick`: no new persisted value. Without a
   Workshop the row is unchanged (the cap bounds production, so claiming
   "storage 0" would be misleading).
2. **`src/application/scenarios.ts`** — Industrial Expansion's description and
   constraint now name the 25-per-Workshop storage cap and state that the stores
   already exceed it. **Scenario data (resources, buildings, roads, colonists,
   requirements) is untouched.**

## 7. VALIDATION

```text
pnpm typecheck   PASS
pnpm lint        PASS
pnpm build       PASS
pnpm test        74 files / 1376 tests PASS   (73 / 1364 before: +1 audit file, +12 tests)
determinism      PASS
insertion-order  PASS
save/load        PASS
browser          14 / 14 suites ALL PASS (headless)
GPU              GPU E2E ALL PASS (headed, real renderer)
```

Browser checks the step asked for:

1. **Default 100-Material opening** — `progressionRun` (free play: Wilderness,
   100/100, blockers).
2. **Construction affordability around the final 5 Material** — new
   `progressionRun` block: four purchases spend 80 → the Well hover reports
   `insufficient material (20/25)` (the same 5-Material shortfall), and the
   Material row claims no storage cap without a Workshop.
3. **Settlement → Village progression** — `progressionRun` (repair → Settlement,
   Well → Village, deferred next stage).
4. **Industrial Expansion initial state** — `progressionRun` (Village, 4
   buildings, objective + constraint displayed).
5. **Industrial objective** — `progressionRun` (in progress → complete on the
   Workshop).
6. **Workshop Material/storage display** — `progressionRun` (Vacant Workshop:
   ` · storage 25` with a 75 stock) and `industrialRun` (staffed Workshop at the
   cap: ` · storage 25 · full`).
7. **Water-reserve-industry** — `industrialRun` (framing, budget, burst,
   funded Well, recovery, completed objective).
8. **The 10AR Water semantics** — `waterRun` + `industrialRun` (`inactive`,
   `noService`, `noReserve`, `supplied`, `draining`, `shortage`; the Residence
   "Water served / not served" line).

---

## 8. FINAL REPORT

```text
STEP 10AS — FINAL REPORT

Starting commit: 4db33ff (Step 10AR)
Final commit:    this commit

OPENING ECONOMY
- Default state: 100 Material, 100 Food, 0 Water, nothing built, 0 colonists
- Minimum Village cost: 105 (2 Residences 50 + Farm 25 + Well 25 + one shared
  road cell 5)
- 100→105 gap: measured shortfall exactly 5 at the fifth purchase; the missing
  road is mandatory (without it nothing is reachable and the colony starves)
- Opening sequences tested: 7 plans — settle core, Well-first, core+2nd
  Residence, core+Well, the 105 package buildings-first, the 100 all-buildings
  no-road package, and the industrial bootstrap
- Distinct outcomes: settlement-and-stall / starvation (three orders) / Village
  via the industrial bootstrap (tick 116, Food 100 → 59)
- First meaningful decisions: 1 Residence first, 2 the first road cell, 3 Farm
  or Well, 4 second-Residence timing, 5 what the last 20 Material can do
  (nothing — the Well is 5 short)

100→105 GAP
- H1 accidental: partially supported (the stated package is unaffordable; the 5
  is the road cost rather than a tuned value)
- H2 order pressure: supported (same stock, four different outcomes)
- H3 information: partially supported (precise hover feedback, no framing of the
  105 package; the Material storage cap was likewise invisible)
- H4 distinct openings: supported (a real choice between a safe stagnant colony
  and a 116-tick industrial Village)
- Classification: A — healthy opening; the stock stays 100

INDUSTRIAL EXPANSION
- Current initial state: Village, Material 100, Water 10, Food 50, 2 Residences
  + Farm + Well + 3 roads, 2 colonists
- Starting Material: 100 (four times the 25-per-Workshop storage)
- Storage interaction: gross 2/tick, stored 0/tick, upkeep 1/tick → the burst is
  a net loss of exactly 1 per staffed tick until the stores are spent below 25
- Industrial outcome: immediately after the Workshop the burst loses Material
  (75 → 49 over 25 ticks); after spending to 0 the same burst is stored
  (gross 2, stored 2, +10 over 10 ticks)
- Objective: Reach Village + build a Workshop — completed by the Workshop alone
- Classification: A — keep unchanged
- Reframed / unchanged / deferred: unchanged; readability fix only (the storage
  cap is now displayed and named in the copy)

SCENARIO COMPARISON
- Default opening: budget/order puzzle with a discovered industrial answer
- Industrial Expansion: a buildable-but-unrunnable Workshop (the storage cap
  bounds what industry could add)
- Water-reserve-industry: a conversion puzzle where the Water reserve is the
  only budget and the build order is terminal if reversed
- Distinct decision spaces: yes — different first decision, bottleneck,
  sequence, timing, failure mode and objective

TUNING GATE
- Classification: A — healthy
- Evidence: three outcome classes from the same stock; Village reachable from
  100 through existing rules; the industrial scenario coherent once the cap is
  visible; no measured state needs a numeric change
- Tuning justified: no

IMPLEMENTATION
- Files: index.html, src/app/main.ts (Material storage display),
  src/application/scenarios.ts (Industrial Expansion copy),
  tests/openingEconomyScenarioStateAudit.test.ts,
  e2e/progressionRun.mjs, e2e/industrialRun.mjs, docs/roadmap/Step10AS.md
- Domain changes: none
- Economic changes: none
- Persistence: none
- SAVE_VERSION: 7

VALIDATION
- Tests: 74 files / 1376 tests PASS
- Typecheck: PASS
- Lint: PASS
- Build: PASS
- Determinism: PASS
- Insertion-order: PASS
- Save/load: PASS
- Browser: 14/14 suites ALL PASS (headless)
- GPU: ALL PASS (headed, hardware renderer)

TOWN
- Contractable: no
- Evidence: the opening already contains the industrial bootstrap (a real
  conversion decision), but it is reserve-funded and finite; no state sustains
  discretionary industry indefinitely. TOWN REMAINS DEFERRED.

NEXT DEPENDENCY:
The content/balance phase closes on the frozen 2/2 model: the opening is healthy,
the seven scenarios each hold a distinct decision space, and no tuning is
justified by measurement. The only open candidate that would need a NEW mechanic
is terrain/obstacles (the sole thing that makes Partitioned valley distinct),
which every step so far has excluded. Absent an explicit decision to authorise
that mechanic, the next work is verification/refinement of the existing content
rather than new systems.
```
