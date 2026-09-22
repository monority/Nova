# Step 10AR — Partitioned Valley & Water Semantics Audit

## CONTEXTE

Starting commit: `b3158e3` — Step 10AQ complete.

The current model is deliberately frozen at:

* Farm: 2 Food/tick
* Well: 2 Water/tick
* Workshop: 2 Material/tick gross
* Workshop upkeep: 1 Material/tick
* Food consumption: 1/colonist/tick
* Water consumption: 1/colonist/tick
* Residence capacity: 1
* Residence/Farm/Well construction: 25 Material
* Workshop construction: 25 Material + 1 Water
* Road: 5 Material
* Construction: 2 ticks, or 1 with Construction Crew
* Workshop storage cap: 25 Material
* SAVE_VERSION: 7

No economic constants changed in 10AQ.

The current model already has one deliberately spatial resource:

**Water is network-local.**

Food remains colony-global.

The remaining distinct spatial scenario candidate from the previous audits is:

**Partitioned Valley**

The purpose of this step is NOT to invent a new spatial mechanic.

The purpose is to determine whether partitioning the road network already creates a sufficiently distinct, causal, readable scenario through the existing Water/network/mobility rules.

---

# PRIMARY QUESTION

Can `Partitioned Valley` provide a genuinely different player decision space using only:

* road topology,
* network separation,
* Water coverage,
* workforce mobility,
* existing buildings,
* existing construction costs,
* existing resource balances,
* existing objective types?

If yes, implement the minimum scenario/content needed.

If no, do not invent another spatial mechanic.

At the same time, resolve the semantic inconsistency discovered in 10AQ:

> A recovered colony can display Water as "not sustainable" because the current label is stock-based, even though Water production equals Water need and the Village capacity condition is satisfied.

Determine whether this is merely an inspection-label defect or evidence that the current semantic model needs a more precise derived status.

---

# STEP 1 — AUDIT THE EXISTING PARTITIONED VALLEY CANDIDATE

Do not modify the simulation first.

Find the previous 10AG/10AH/10AO evidence for partitioned layouts and reproduce the relevant cases from the current commit.

At minimum compare:

### Connected layout

One road network containing:

* Residences
* Farm(s)
* Well(s)
* Workshop where relevant

### Partitioned layout

Two or more independent road networks where:

* at least one Residence is separated from a Well,
* and/or a productive building is separated from the Residence network.

Measure:

* population
* Food balance
* Water production
* Water need
* Water stock
* Water service
* workforce assignment
* road distance
* Material
* construction affordability
* progression stage
* objective status
* recovery behavior

Do not rely on visual intuition.

Use deterministic controlled scenarios.

---

# STEP 2 — IDENTIFY THE ACTUAL PLAYER DECISION

Determine whether partitioning creates a decision that is materially different from the already existing:

* road efficiency,
* workforce mobility,
* Water capacity,
* Water reserve industry,
* construction order.

Ask explicitly:

1. Does the player have to decide **where to connect networks**?
2. Does a road extension restore a causal capability?
3. Does reconnecting networks change Water service?
4. Does it change workforce eligibility?
5. Does it change the number of sustainable colonists?
6. Does it change the ability to construct or operate buildings?
7. Is the consequence persistent enough to matter after several ticks?

If the answer is only "another way to make an inaccessible building accessible", classify the candidate as overlapping rather than distinct.

---

# STEP 3 — TEST THE EXISTING PARTITIONED VALLEY SCENARIO

Construct at least three deterministic variants using existing rules only:

### A — Correctly connected

The player has enough road connectivity for the settlement to function.

### B — Partitioned

The initial road topology deliberately separates an important Water-producing network from part of the settlement.

### C — Recoverable partition

The initial state is constrained, but a finite road intervention can restore the missing capability.

For each variant record:

* initial state
* first meaningful decision
* first failure/blocker
* intervention required
* resulting state
* time to recovery
* objective interpretation
* whether geometry itself matters

Do not create hidden scenario rules.

---

# STEP 4 — TEST SCENARIO DISTINCTNESS

Use the existing scenario-design criteria:

1. First meaningful decision
2. Resource trade-off
3. Construction consequence
4. Failure/recovery behavior
5. Timing consequence
6. Spatial consequence
7. Objective interpretation

Classify Partitioned Valley:

* **A — Distinct**
* **B — Useful but overlapping**
* **C — Weak**
* **D — Premature**
* **E — Rejected**

Do not implement it merely because it is the last candidate.

The measured behavior must justify the classification.

---

# STEP 5 — AUDIT WATER SEMANTICS

Investigate the current inspection/status terminology.

The 10AQ finding is:

> Water can read "not sustainable" when production == need and the Village capacity condition is satisfied, because the displayed status is influenced by current stock.

Determine exactly what each existing Water status means.

Separate, if already supported by existing state:

* **Water capacity** — how many colonists the staffed Wells can sustainably support.
* **Water balance** — production minus consumption.
* **Water stock** — currently stored Water reserve.
* **Water service** — whether Residences are connected to covered Well networks.
* **Water shortage** — whether current stock/production is insufficient for the relevant rule.

Do not add a new persisted field.

Do not create a new economic mechanic.

The goal is semantic precision.

If the existing label is simply wrong, fix the label/query.

If multiple concepts are currently conflated, make the smallest derived-query/UI correction that makes the distinction explicit.

Example of the desired conceptual distinction:

> Water capacity: sufficient
> Water balance: balanced
> Water reserve: 0

Do not blindly use this exact wording if the existing UI language has a better consistent vocabulary.

---

# STEP 6 — RECHECK THE INDUSTRIAL SCENARIO AFTER SEMANTIC FIX

The 10AQ industrial loop depends on:

* Water reserve
* Water production capacity
* Workshop conversion
* Recovery

After any inspection-label correction, rerun the industrial scenario.

Verify:

* objective still completes,
* Water capacity remains correctly reported,
* reserve depletion is distinguishable from unsustainable production,
* recovery remains deterministic,
* no objective semantics changed accidentally.

The scenario itself must remain mechanically unchanged.

---

# STEP 7 — IMPLEMENT ONLY IF JUSTIFIED

### If Partitioned Valley is A — Distinct

Add the minimum data-only scenario.

Constraints:

* no new mechanic,
* no new resource,
* no new objective type,
* no new persistence,
* no new domain rule,
* no arbitrary hidden threshold.

Use the existing scenario assembler and objective system.

### If Partitioned Valley is B/C/D/E

Do not add it merely for catalogue size.

Document why it remains deferred/rejected.

The existing scenario catalogue is allowed to remain smaller.

---

# STEP 8 — ARCHITECTURAL INVARIANTS

Preserve:

* `SAVE_VERSION = 7`
* no derived state persisted
* deterministic simulation
* insertion-order invariance
* pure objective queries
* declarative scenario definitions
* domain/application/rendering separation
* no scenario-specific economic bypass
* no hidden workforce
* no scenario-only production
* no changes to core economic constants

Prefer:

* `src/application/scenarios.ts`
* existing progression/objective/inspection queries
* tests
* E2E coverage

Avoid touching `src/domain` unless the audit proves an actual domain defect.

---

# STEP 9 — REQUIRED VALIDATION

Run:

* full Vitest suite
* typecheck
* lint
* build
* determinism tests
* insertion-order tests
* save/load tests
* browser E2E
* headed browser validation where relevant
* GPU/browser validation if the current project workflow supports it

For browser validation explicitly inspect:

1. Partitioned Valley scenario.
2. Water status while reserve is 0 but production == need.
3. Water status during an industrial burst.
4. Water status after recovery.
5. Reassignment UI for Farm / Well / Workshop.
6. Industrial objective completion.
7. Scenario objective/status panel.

The reassignment regression fixed in 10AQ must remain covered.

---

# STEP 10 — FINAL REPORT

Return exactly this structure:

```text
STEP 10AR — FINAL REPORT

Starting commit:
Final commit:

PARTITIONED VALLEY
- Variants tested:
- Causal differences:
- Player decision:
- Recovery:
- Classification:
- Implemented / deferred:

WATER SEMANTICS
- Capacity:
- Balance:
- Stock:
- Service:
- Previous ambiguity:
- Correction:
- Any domain change:

INDUSTRIAL REGRESSION
- Objective:
- Burst:
- Recovery:
- Status readability:

SCENARIO CATALOGUE
- Existing scenarios:
- New scenario:
- Deferred candidates:

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

* tune Farm/Well/Workshop production,
* change consumption,
* change admission,
* change workforce rules,
* change road cost,
* change building costs,
* add a new resource,
* add logistics,
* add food distribution,
* add pollution,
* add adjacency mechanics,
* add density mechanics,
* add service radii,
* add a new objective type,
* add persistence,
* implement Town,
* invent arbitrary scenario thresholds,
* create hidden scenario mechanics.

The central question is:

> **Does network partitioning already create a distinct spatial decision, and can the Water UI distinguish capacity, balance, reserve, and service without changing the simulation?**

Only implement what the measured existing model proves is necessary.

```

Ce step est volontairement plus **audit + sémantique** que 10AQ : on a maintenant suffisamment de contenu pour vérifier que le jeu ne donne pas simplement l'impression d'avoir plusieurs systèmes alors qu'ils décrivent parfois le même phénomène sous des formes différentes.
```


---

# Documentation (as-built) — Step 10AR

Starting commit: `b3158e3` (Step 10AQ).
Final commit: this commit.

**Outcome: the Partitioned Valley candidate is classified `B — useful but
overlapping` and is NOT implemented (the catalogue stays at 7 scenarios). The
Water semantics were made precise: one new derived query
(`getWaterSupplyStatus`) separates capacity, balance, reserve, service and
shortage, and the HUD, the Residence inspection and the E2E stats now use it.**
No simulation rule, constant or persisted field changed; `src/domain` is
untouched.

---

## 1. MEASURED — Partitioned Valley, three controlled layouts

Identical settlement (1 Farm, 1 Well, 100 Material, 100 Food), only the ROAD
TOPOLOGY differs. Numbers after the assignment phase and after 60 ticks.

| layout | population | capacity | need | served Residences | employed / unemployed | Food Δ | stage | supply |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A connected (one network) | 2 | 2 | 2 | **2 / 2** | 2 / 0 | 0 | **village** | noReserve |
| B partitioned (east Residence isolated) | 2 | **0** | 1 | **1 / 2** | 1 / **1** | 0 | **settlement** | shortage |
| C partitioned island (two stranded workers) | 3 | **0** | 1 | **1 / 3** | 1 / **2** | **-1** | **wilderness** | shortage |

* The partition strands **labour as well as service**: the reachable worker must
  hold the Farm, so the Well is vacant (capacity 0) and the isolated colonist is
  unemployed — the 09K mobility gate, not a new rule.
* Layout C is the new failure mode: **the stranded colonists eat the
  colony-global Food while they cannot produce anything** (measured foodNet −1
  with 3 colonists on one staffed Farm; Food 100 → 40 in 60 ticks).
* The consequence is **persistent**: 60 ticks change nothing but the Food stock.
* Food is colony-global, Water is network-local, labour is mobility-gated: one
  layout forces three different connectivity questions at once.

## 2. MEASURED — the player decision and its two recovery paths

| path | cost | served Residences | unemployed | capacity | stage | road cells |
| --- | --- | --- | --- | --- | --- | --- |
| bridge the 5-cell gap | **25** | 2 / 2 | 0 | 2 | village | 9 |
| second Well on the island | **25** | 2 / 2 | 0 | 2 | village | 4 |

Both interventions restore the **same** state at the **same** cost, because the
tie point is the model's own arithmetic: `25 Material ÷ 5 per road cell = 5 cells`.

| gap (cells) | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| cheaper | roads | roads | roads | roads | **equal** | second Well |

Answering the step's seven questions with measurements:

1. *Where to connect?* Yes, but the cheapest path is canonical (a straight
   line): the choice is a cost, not a placement puzzle.
2. *Does a road extension restore a causal capability?* Yes — **two** at once:
   Water coverage and workforce mobility (employed 1 → 2).
3. *Does reconnecting change Water service?* Yes — 1 of 2 Residences served → 2.
4. *Does it change workforce eligibility?* Yes — the stranded colonist stays
   unemployed until the networks merge.
5. *Does it change the number of sustainable colonists?* Yes — capacity 0 → 2,
   the stage returns to Village.
6. *Does it change construction/operation?* Yes — an unserved Residence blocks
   admission and an unreachable Workplace can never be staffed.
7. *Is it persistent?* Yes — stable over 60 ticks.

## 3. MEASURED — classification

```text
Partitioned valley — B — USEFUL BUT OVERLAPPING
```

**Distinct** (measured): the stranded-labour failure mode (global Food eaten by
unreachable workers) and the local-Water / global-Food / mobility-gated-labour
asymmetry.

**Overlapping** (measured):

* the decision **shape** — connect for `5 × gap` or duplicate for `25` — is the
  one **Recovery** (10AL) already measures for the stranded Farm;
* the objective is the one **Water constraint** already uses ("reach Village by
  restoring Water capacity");
* the cost comparison against a fixed 25-Material building is **Spatial
  efficiency**'s road-budget decision;
* the stranding itself is the existing 09K mobility gate (audited as a system in
  09M / 10N), not a new rule;
* the spatial choice is **knife-edge or dominated**: for a one-colonist island
  the paths cost the same only at exactly a 5-cell gap, and for a two-colonist
  island the bridge dominates up to a 9-cell gap (25 vs 50). The world has no
  terrain, so nothing forces a long gap — engineering a wider one would be an
  arbitrary scenario threshold.

**Objective limitation** (measured): no requirement kind can name coverage or
service, so the scenario goal can only be a proxy. The proxy is honest — a
vacant Farm *or* a vacant Well both block Village, and Village is unreachable
until the partition is repaired (measured in_progress → completed on the bridge)
— but it adds no new objective vocabulary.

**Decision: DEFERRED, not added.** The catalogue stays at 7. Revisit only if a
future step introduces terrain/obstacles (a NEW mechanic) that makes partitions
natural and gaps long, or an objective kind that can name coverage.

## 4. MEASURED — Water semantics: the five concepts

The Water rules use five different things, and before this step the HUD collapsed
them into one word:

| concept | source (unchanged) |
| --- | --- |
| **capacity** | staffed, road-accessible Wells × `WATER_PER_WELL_PER_TICK` (`getWaterProductionPerTick`) |
| **need** | served colonists × `WATER_PER_COLONIST_PER_TICK` (`getWaterNeedPerTick`) |
| **balance** | capacity − need (new field, derived) |
| **reserve** | the canonical stock (`getWaterStock`) |
| **service** | Residences sharing a covered network (`getWaterCoverage` / `getWaterServedResidenceCount`) |
| **shortage** | the existing tick-coverage rule (`getWaterShortage`) |

**Previous ambiguity**: the HUD printed ` · served` when
`isWaterSupplySustainable` was true (a *stock-coverage* test) and ` · shortage`
otherwise — so:

* a healthy connected Village with a balanced flow (capacity 2 == need 2) and an
  empty reserve read **"shortage"** (measured: layout A above);
* a colony with an operational Well that serves nobody read **"served"**
  (measured: `servedColonists === 0` ⇒ the legacy boolean is `true`).

**Correction** (derived only, no domain change): one new query
`getWaterSupplyStatus(state)` returns `{ state, capacity, need, balance, reserve,
servedResidences, residences, servedColonists, shortage }` with the **flow
evaluated before the reserve**, so an empty reserve with a sufficient flow is
named as such:

| state | condition | measured example |
| --- | --- | --- |
| `inactive` | no operational Well | bootstrap (the gate is inactive) |
| `noService` | a Well exists, no Residence served | roadless Well |
| `noReserve` | production ≥ need, reserve < need | balanced Village with stock 0 — **the 10AQ case** |
| `supplied` | production ≥ need, reserve ≥ need | the industrial scenario start (Water 51) |
| `draining` | production < need, reserve ≥ need | the industrial burst start (Well unstaffed, Water 50) |
| `shortage` | production < need, reserve < need | the industrial burst end (Water 0) |

**HUD vocabulary**: `'' / · no service / · shortage / · draining / · reserve 0 /
· served`. **Residence inspection** now names the service dimension:
`Housing — Capacity 1 · Residents 1 · Water served` or `… · Water not served (no
covered Well on this network)` — the HUD alone cannot say *which* Residence is
unserved. The E2E `stats` gained `waterSupply` (the state name); the legacy
`waterSustainable` boolean is kept unchanged and documented as the stock-coverage
test it always was.

**Domain change: none.** The Water rules, the admission gate and the shortage
rule are untouched; `src/domain` has no diff in this step.

## 5. MEASURED — industrial scenario regression after the semantic fix

The `water-reserve-industry` scenario is mechanically unchanged and still runs
end-to-end:

| step | Water | capacity | need | supply state |
| --- | --- | --- | --- | --- |
| scenario start | 51 | 2 | 2 | `supplied` |
| after the Workshop | 50 | 2 | 2 | `supplied` |
| burst start (Well unstaffed) | 50 | **0** | 2 | `draining` |
| burst end (25 ticks) | **0** | 0 | 2 | `shortage` |
| after the second Well + recovery | 0 | **2** | 2 | **`noReserve`** |

* the objective still completes (`in_progress` → `completed`), and its
  requirements read only stage/capacity — never the new status;
* reserve depletion is now **distinguishable from unsustainable production**:
  the recovered colony has a balanced flow with nothing stored (`noReserve`)
  while the domain's tick-coverage rule still reports `shortage: true` and the
  admission gate still blocks growth — the label names the cause, the rule is
  unchanged;
* the recovery stays deterministic and the 10AQ reassignment regression
  (Well targets in the inspector) remains covered by its own tests and by the
  industrial browser suite.

## 6. SCENARIO CATALOGUE

```text
existing (7):  First settlement, Water constraint, Industrial expansion,
               Water reserve industry, Spatial efficiency,
               Population expansion, Recovery
new:           none
deferred:      Partitioned valley (B — useful but overlapping, see §3)
               Food glut without Water, Standing industry (10AP findings)
```

## 7. IMPLEMENTATION

```text
added:    tests/waterSemanticsPartitionAudit.test.ts  (9 tests, this audit)
modified: src/application/queries/resources.ts        (getWaterSupplyStatus)
          src/app/main.ts                             (HUD vocabulary, Residence
                                                       service line, stats.waterSupply)
          e2e/waterRun.mjs                            (supply states + Residence service)
          e2e/industrialRun.mjs                       (supplied/draining/shortage/noReserve)
          docs/roadmap/Step10AR.md                    (this as-built block)
domain changes:      none
economic changes:    none
persistence:         none (the status is derived, never stored or hashed)
SAVE_VERSION:        7 (unchanged)
```

## 8. VALIDATION

```text
pnpm typecheck   PASS
pnpm lint        PASS
pnpm build       PASS
pnpm test        73 files / 1364 tests PASS   (72 / 1355 before: +1 audit file, +9 tests)
determinism      PASS
insertion-order  PASS
save/load        PASS
browser          14 / 14 suites ALL PASS (headless)
GPU              GPU E2E ALL PASS (headed, real renderer)
```

Browser checks the step explicitly asked for:

1. **Partitioned Valley scenario** — not shipped (classification B). Its symptom
   is covered instead: the `water` suite drives a roadless Well + an unserved
   Residence and asserts the supply state `noService` and the Residence line
   "Water not served (no covered Well on this network)".
2. **Water while the reserve is 0 but production == need** — `waterRun` asserts
   `noReserve` and the HUD "reserve 0" on a connected, balanced colony.
3. **Water during an industrial burst** — `industrialRun` asserts `draining`
   then `shortage`.
4. **Water after recovery** — `industrialRun` asserts `noReserve` (not
   "shortage") with `waterSustainable` still false.
5. **Reassignment UI for Farm / Well / Workshop** — covered by the 10AQ contract
   test and by the `reassign` + `industrial` suites (Well targets present).
6. **Industrial objective completion** — asserted in `industrialRun`.
7. **Scenario objective/status panel** — asserted in `progressionRun` for all
   seven scenarios and in `industrialRun` for the industrial flow.

---

## 9. FINAL REPORT

```text
STEP 10AR — FINAL REPORT

Starting commit: b3158e3 (Step 10AQ)
Final commit:    this commit

PARTITIONED VALLEY
- Variants tested: A connected / B partitioned (1 stranded colonist) /
  C partitioned island (2 stranded colonists), same settlement, only topology
  differs; plus both recovery paths and a 1..6 cell gap table
- Causal differences: capacity 2 → 0, served Residences 2/2 → 1/2, employed
  2 → 1, stage Village → Settlement; on the island the global Food drains
  (-1/tick, Food 100 → 40 in 60 ticks) because stranded colonists eat but
  cannot produce
- Player decision: bridge the gap (5 Material per cell) or place a second Well
  (25 Material) — the same two options at the same cost when the gap is 5 cells
  (model-derived tie: 25 / 5 = 5); roads are cheaper below, the Well above
- Recovery: both paths restore the identical state (2/2 served, 0 unemployed,
  capacity 2, Village) — the intervention is spatial, not economic
- Classification: B — useful but overlapping (Recovery's connect-or-duplicate
  decision, Water constraint's objective, Spatial efficiency's road budget; the
  spatial choice is knife-edge or dominated and no terrain forces a long gap)
- Implemented / deferred: DEFERRED — not added; the catalogue stays at 7

WATER SEMANTICS
- Capacity: staffed road-accessible Wells x 2 (getWaterProductionPerTick) —
  unchanged
- Balance: capacity - need, now exposed as its own derived field
- Stock: the canonical reserve (getWaterStock) — unchanged, never persisted
- Service: Residences sharing a covered network (getWaterCoverage), now also
  named per Residence in the inspection panel
- Previous ambiguity: the HUD printed "served" when the STOCK covered the tick
  and "shortage" otherwise, so a balanced colony with an empty reserve read
  "shortage" and a Well serving nobody read "served"
- Correction: getWaterSupplyStatus (derived, flow evaluated before reserve) with
  six named states — inactive / noService / noReserve / supplied / draining /
  shortage — used by the HUD ("no service", "shortage", "draining",
  "reserve 0", "served"), the Residence inspection and the E2E stats
- Any domain change: NONE (application query + UI only; src/domain untouched)

INDUSTRIAL REGRESSION
- Objective: unchanged, still completes (in_progress → completed);
  requirements read stage/capacity only
- Burst: 25 ticks, Water 51 → 0, Material → 24; supply states supplied →
  draining → shortage
- Recovery: capacity back to 2, balance 0, reserve 0 → noReserve
- Status readability: reserve depletion is now distinguishable from
  unsustainable production (noReserve vs shortage), while the domain's
  tick-coverage rule and the admission gate are untouched

SCENARIO CATALOGUE
- Existing scenarios: 7 (First settlement, Water constraint, Industrial
  expansion, Water reserve industry, Spatial efficiency, Population expansion,
  Recovery)
- New scenario: none
- Deferred candidates: Partitioned valley (B); Food glut without Water and
  Standing industry (10AP findings)

IMPLEMENTATION
- Files: src/application/queries/resources.ts, src/app/main.ts,
  tests/waterSemanticsPartitionAudit.test.ts, e2e/waterRun.mjs,
  e2e/industrialRun.mjs, docs/roadmap/Step10AR.md
- Domain changes: none
- Economic changes: none
- Persistence: none (derived query; no new persisted or hashed field)
- SAVE_VERSION: 7

VALIDATION
- Tests: 73 files / 1364 tests PASS
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
- Evidence: the industrial economy remains reserve-funded (10AQ) and this step
  added no new sustainable-industrial rule; the Water semantics fix is
  observational only. TOWN REMAINS DEFERRED.

NEXT DEPENDENCY:
The content candidates are now exhausted: 7 scenarios, with Partitioned valley
classified B and the two 10AP candidates recorded. The remaining recorded
follow-ups are the Industrial Expansion above-cap starting stock (100 Material >
the 25 storage cap makes its burst lose Material) and its unstaffed-Workshop
objective, the 100-vs-105 opening, and a possible terrain/obstacle mechanic
which is the only thing that would make Partitioned valley distinct (a NEW
mechanic — out of scope for every step so far).
```
