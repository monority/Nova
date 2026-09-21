# Step 10V — Settlement Growth & Shelter Quality Design Audit

## Position

Starting commit: `f22a7d6` — Step 10U complete.

Step 10U closed the Material-demand question:

* Material is currently a healthy construction bottleneck.
* Construction is the intended major Material sink during settlement growth.
* Recurring Material demand is premature because it adds taxation without a distinct player decision.
* Phase 5 generic services are premature.
* Shelter Quality is the only currently identified candidate that could connect Material causally to settlement growth without duplicating Water.

This step is **AUDIT-ONLY**.

Do not implement Shelter Quality, population tiers, new services, new resources, new buildings, or settlement stages.

Production code must remain unchanged.

---

# Objective

Determine whether the next real dependency should be:

**A. Settlement growth through housing quality / Shelter Quality**

**B. Another settlement-growth mechanic discovered by evidence**

**C. No new mechanic yet; continue the existing simulation**

The audit must determine whether Shelter Quality creates a genuinely new causal dimension rather than merely adding another resource drain or housing score.

The central question:

> What happens when the colony has enough Food, Water, housing capacity, workforce and Material, but the settlement itself needs to become better rather than merely larger?

Do not answer this from intuition. Construct deterministic scenarios and measure the consequences.

---

# 1. Reconstruct the current settlement model

Document the exact current causal chain:

```text
Material
  ↓
Construction
  ↓
Residence count / housing capacity
  ↓
Water-served housing
  ↓
Food + Water admission gate
  ↓
Population
  ↓
Workforce
  ↓
Farm / Workshop / Well production
```

Also document what is currently missing:

* no housing quality
* no residential capacity tiers
* no overcrowding
* no residence maintenance
* no happiness
* no health
* no education
* no comfort
* no density consequence
* no settlement-stage progression

Do not create abstractions for these concepts.

---

# 2. Establish the current housing equilibrium

Build deterministic scenarios around:

* 1 Residence
* 2 Residences
* 4 Residences
* 6 Residences
* 10 Residences

Combine with:

* 1 Farm / 1 Workshop / 1 Well
* 2 Farms / 1 Workshop / 1 Well
* 1 Farm / 2 Workshops / 1 Well
* 2 Farms / 2 Workshops / 2 Wells

Run:

* 60 ticks
* 120 ticks
* 240 ticks
* 600 ticks

Record:

* population
* free residences
* Food
* Water
* Material
* staffed Farms
* staffed Workshops
* staffed Wells
* operational residences
* total buildings
* construction spending
* whether population growth stops because of:

  * Food
  * Water
  * housing
  * workforce
  * production capacity

The goal is to establish exactly what "housing growth" currently means.

---

# 3. Test the absence of housing quality

Construct a deliberately overbuilt colony:

```text
many Residences
few Farms
few Workshops
few Wells
large Material stock
large Food stock
large Water production capacity
```

Determine whether additional Residences currently provide any meaningful new state once population reaches the production/service equilibrium.

Test the inverse:

```text
few Residences
large production capacity
large Food/Water stock
```

Determine whether housing is already a meaningful bottleneck.

The audit must distinguish:

* **housing as capacity**
* **housing as quality**
* **housing as settlement progression**

These are different concepts.

---

# 4. Shelter Quality candidate

Model Shelter Quality **only in tests**.

Do not modify `src/`.

Evaluate at least these conceptual models:

### Candidate A — Residence tier

Example conceptual tiers:

```text
Basic Residence
Improved Residence
Advanced Residence
```

with increasing Material investment and increasing housing capacity/quality.

Determine whether this creates a meaningful choice between:

* building more residences
* upgrading existing residences

rather than simply:

> spend more Material to get more colonists.

### Candidate B — Quality from local conditions

Quality derived from existing spatial conditions such as:

* residence adjacency
* road access
* network connectivity
* density
* nearby production
* distance to productive buildings

Do not invent pollution or noise yet.

The purpose is to determine whether the existing spatial model already contains enough information for housing quality.

### Candidate C — Material investment

Conceptually:

```text
Residence
  + Material investment
  → higher Shelter Quality
  → higher housing capacity / growth consequence
```

Determine whether this is meaningfully different from simply increasing residence capacity.

### Candidate D — Overcrowding

Conceptually:

```text
population > comfortable housing capacity
→ Shelter Quality decreases
→ growth consequence
```

Determine whether overcrowding creates a useful pressure without creating arbitrary population punishment.

Do not implement population loss or health effects.

---

# 5. Agency test

For every viable Shelter Quality candidate, answer:

> What decision does the player actually make?

Possible decisions:

* build another Residence
* upgrade an existing Residence
* choose between dense and dispersed housing
* reserve Material for housing improvement
* choose housing placement
* accept lower quality to expand faster

Reject a candidate if its only meaningful decision is:

> build more Workshops to pay the tax.

Also reject candidates where the optimal behavior is mechanically obvious in every tested scenario.

---

# 6. Spatial test

This is especially important because NOVA already has:

```text
Road
→ Network
→ Building Access
→ Mobility
→ Employment
```

Determine whether Shelter Quality can create a **new spatial consequence**.

Test at minimum:

### Layout A

```text
Residence — Road — Residence
```

### Layout B

```text
Residence
   |
  Road
   |
Residence
```

### Layout C

Residences separated into disconnected networks.

### Layout D

Dense residential cluster.

### Layout E

Sparse residential distribution.

Compare whether Shelter Quality differs.

If all layouts remain economically equivalent, explicitly classify the candidate as insufficiently spatial.

Do not introduce generic distance graphs or logistics.

---

# 7. Material interaction

Use the result of Step 10U as a constraint.

Material must remain:

```text
construction bottleneck
```

Do not turn it into:

```text
mandatory recurring tax
```

Test whether Shelter Quality can consume Material through **discrete construction/upgrades** rather than continuous upkeep.

For example, conceptually:

```text
Residence upgrade
→ one-time Material cost
→ permanent quality/capacity change
```

Compare this with:

```text
Residence
→ Material/tick
```

The latter should be considered rejected unless the audit finds an independent reason for maintenance.

---

# 8. Population feedback

Analyze whether Shelter Quality should affect:

### Growth

```text
better shelter
→ more population can be admitted
```

### Housing capacity

```text
better shelter
→ larger comfortable capacity
```

### Stability

```text
poor shelter
→ growth slows
```

### Survival

Do NOT assume poor shelter kills colonists.

Food already owns the survival consequence.

Water already owns the growth gate.

A new Shelter system must avoid duplicating either.

The audit should explicitly determine whether Shelter Quality is:

* a capacity mechanic
* a growth modifier
* a settlement progression mechanic
* or premature

---

# 9. Settlement scale / stage test

Step 10U found that Phase 5 services lack a sufficient new consequence dimension.

Test whether settlement scale itself can become that dimension.

Conceptually examine:

```text
Wilderness
→ Settlement
→ Village
→ Town
→ City
```

Do not implement stages.

Determine what objective measurable state could trigger a stage:

* population
* housing capacity
* number of operational buildings
* production diversity
* network size
* Shelter Quality
* combination of existing state

Reject arbitrary thresholds that do not unlock a new system.

The important question is:

> Does reaching a larger settlement actually require a new type of player decision?

---

# 10. Alternative settlement-growth candidates

Without implementing them, briefly evaluate whether the current model suggests another dependency stronger than Shelter Quality.

Consider only evidence-backed candidates such as:

* residential specialization
* housing upgrades
* settlement stages
* density
* public-space/amenity concept
* second residential type

Do not introduce:

* money
* vehicles
* logistics
* travel simulation
* generic needs
* happiness framework
* generic service framework
* generic maintenance
* pollution
* arbitrary taxes

For each candidate, classify:

```text
A — Fundamental
B — Useful but incomplete
C — Premature
D — Contradictory / reject
```

No ranking between candidates. The classification must be evidence-based and independently justified.

---

# 11. Deadlock and recovery audit

Test:

* too much housing
* too little housing
* too much production
* too little production
* high Material
* low Material
* high Food
* low Food
* high Water
* low Water
* housing upgrade unavailable
* colony with no possible quality improvement

Ensure no proposed Shelter Quality rule creates an irreversible terminal state merely because of an earlier construction decision.

If a candidate creates deadlocks, document them instead of fixing them with automatic policies.

---

# 12. Workforce interaction

Shelter Quality must not silently alter the existing workplace assignment algorithm.

Test:

```text
Farm | Workshop | Well
```

competition remains unchanged.

Determine whether housing improvements change:

* population capacity
* workforce size
* workplace competition

without introducing:

* new workforce priorities
* automatic reassignment
* hidden worker preference

---

# 13. Persistence / determinism / architecture

Because this is audit-only:

* `SAVE_VERSION` must remain `6`
* no migration
* no new persisted state
* no new generic framework
* no new resource
* no new service framework

Verify:

* deterministic replay
* insertion-order independence
* save/load equivalence
* no `Date.now()`
* no `Math.random()`

Run representative performance measurements.

Do not optimize code that is not changed.

---

# 14. Browser verification

No UI implementation is expected.

Run the existing E2E suite to ensure the audit-only commit introduces no regression.

Expected:

* all existing suites pass
* zero console errors
* zero page errors

No UI changes should be made.

---

# 15. Required test file

Add only:

```text
tests/settlementGrowthShelterAudit.test.ts
```

The tests should encode observed current behavior and candidate-model experiments.

Do not modify production code.

Also add:

```text
docs/roadmap/Step10V.md
```

---

# 16. Final classification

End the report with exactly:

```text
Current housing model:       A/B/C/D — ...
Shelter Quality:             A/B/C/D — ...
Settlement stages:           A/B/C/D — ...
Alternative growth mechanic: A/B/C/D — ...
Material interaction:        A/B/C/D — ...
```

Then provide:

```text
Next dependency:
```

Possible conclusions include:

### Outcome A

Shelter Quality is justified and should be implemented next.

### Outcome B

Shelter Quality is promising but requires one prerequisite audit/design step.

### Outcome C

Settlement growth itself is justified, but Shelter Quality is not yet the correct mechanic.

### Outcome D

No new growth mechanic is justified yet; continue closing existing model gaps.

Do not choose a conclusion because it seems more interesting. Choose it from the evidence produced by the tests.

---

# Final confirmations

The report must explicitly confirm:

* `src/` unchanged
* Food unchanged
* Water unchanged
* Material unchanged
* construction unchanged
* no new resource
* no new building
* no new service
* no generic framework
* no generic demand
* no generic maintenance
* no logistics
* no vehicles
* no travel simulation
* no new workforce priority
* `SAVE_VERSION = 6`
* deterministic replay intact
* save/load deterministic
* existing browser E2E green

```

Avec ce 10V, on teste surtout si **« construire plus » doit enfin devenir « améliorer ce qu’on a déjà construit »**. C’est la transition naturelle après la fermeture propre de Food/Water/Material, sans inventer prématurément un nouveau système.
```



---

## As-Built / Audit Report

**Type: AUDIT (Step 10V) — settlement growth & shelter quality.** `src/` is
untouched (`git diff -- src/` empty). Evidence comes from
`tests/settlementGrowthShelterAudit.test.ts` (19 tests); every number below is
a real `AUDIT ...` line. All Shelter Quality candidates are modelled
analytically or read from the existing spatial facts — no production rule was
changed.

### Repository

* starting commit `f22a7d6` (Step 10U);
* final commit = this audit commit;
* production code changed: **none**;
* tests added: `tests/settlementGrowthShelterAudit.test.ts` (19);
* docs changed: this file.

### 1. Current settlement model

`AUDIT SETTLEMENT_MODEL`:

```text
Material -> construction -> Residence count -> Water-served housing
-> Food + Water admission -> population -> workforce -> Farm/Workshop/Well
```

Present today: **housing as capacity** (1 colonist per operational Residence),
Water-served housing, the Food survival gate, the Water growth gate. Absent:
housing quality, residential capacity tiers, overcrowding, residence
maintenance, happiness, health, education, comfort, density consequence,
settlement-stage progression.

### 2. Current housing equilibrium

`AUDIT HOUSING_EQUILIBRIUM` (residences 1/2/4/6/10 × four production mixes,
60/120/240/600 ticks): with one Residence the colony is permanently
`limit: housing` (population 1); with several Residences the limit moves to
Water or Food depending on the mix. `AUDIT HOUSING_MEANINGS`: a colony with
6 Residences and 6 Wells is `population 6, capacity 6, limit housing`; quality
has `mechanism: none`; progression has `mechanism: none`.

Three distinct meanings, only the first implemented:

* **capacity** — real: 1 colonist per operational Residence;
* **quality** — absent: every Residence gives exactly 1 capacity;
* **progression** — absent: no settlement stage is derived or persisted.

### 3. Absence of housing quality

`AUDIT OVERBUILT` (6 vs 10 Residences, 6 Wells): both staff exactly **6 Wells**;
the four extra Residences add population but **no additional staffed workplace
or production**. `AUDIT UNDERBUILT` (2 Residences, 10 Wells): population 2,
`limit housing`, Water headroom 20 — housing is a genuine bottleneck when
production capacity is abundant. Extra housing matters only up to the number of
workplaces; beyond that it is surplus population.

### 4. Shelter Quality candidate models

* **A — Residence tier / C — Material investment** (`AUDIT RESIDENCE_TIER`):
  `Basic × 4` (100 Material, 4 capacity, 4 land) and `Tier-2 × 2`
  (100 Material, 4 capacity, 2 land) have **identical Material per capacity
  (25)**; tiers save land and road cells, not Material. The decision is
  "more vs better" for land/road efficiency.
* **B — Quality from local conditions** (`AUDIT QUALITY_CONDITIONS`): the
  existing spatial facts (09E road access, 09D networks, 09K mobility, 09M
  distance) are available for a quality rule, but **no consequence exists** for
  quality to affect.
* **D — Overcrowding** (`AUDIT OVERCROWDING`): with 1 colonist per Residence,
  `overcrowdedPossibleToday: false`; overcrowding needs a comfortable-capacity
  concept before it can mean anything.

### 5. Agency test

`AUDIT AGENCY`: residence tier = "more vs better" (land/road efficiency, not a
Material decision); quality-from-conditions = placement/adjacency, real only if
quality has a consequence; material investment = same as tier with a one-time
cost; overcrowding duplicates the existing capacity limit. Any model whose only
decision is "build more Workshops to pay the tax" is rejected.

### 6. Spatial test

`AUDIT SPATIAL_LAYOUTS` (horizontal, vertical, disconnected, dense, sparse):
horizontal, vertical, dense and sparse all serve their Residences (one shared
network); the **disconnected** layout serves none (0). The only spatial
differentiation today is network connectivity/coverage; layouts are otherwise
economically equivalent per Residence. A quality-from-conditions rule could
read these facts but has no consequence, so no layout currently differs by
quality.

### 7. Material interaction

`AUDIT MATERIAL_INTERACTION`: one-time upgrade 25 Material per Residence vs
recurring upkeep 600 Material over 600 ticks. Discrete upgrades keep Material a
**construction bottleneck** (Step 10U's requirement); recurring upkeep would be
a mandatory tax, already rejected in 10U.

### 8. Population feedback

`AUDIT POPULATION_FEEDBACK`: Food owns **survival**, Water owns **growth**,
housing owns **capacity**. Shelter could own capacity/quality/progression, but
capacity duplicates housing, growth duplicates Water and survival duplicates
Food. The only non-duplicated role is **quality**, and it still needs a
consequence.

### 9. Settlement scale / stage test

`AUDIT SETTLEMENT_SCALE`: population, housing, building count, road cells and
staffed Wells are all measurable and grow with the settlement (small: pop 2,
4 buildings; large: pop 10, 20 buildings). But **no system reads a settlement
stage**, so a stage threshold would unlock nothing and would be arbitrary.

### 10. Alternative growth candidates

`AUDIT ALTERNATIVE_CANDIDATES`: residential specialization **C** (no
specialization concept or consumer); housing upgrades/tiers **B** (real
land/road decision, no new consequence); settlement stages **C** (triggers
exist, no consumer); density **C** (no density model/consequence); public
space/amenity **B** (placement decision, needs a non-duplicative consequence);
second residence type **B** (same capacity/land trade).

### 11. Deadlock and recovery

`AUDIT DEADLOCK_RECOVERY` (nine over/under-built, high/low resource
configurations, 240 ticks): every configuration keeps its population; no
terminal state was found. A bad construction decision is recoverable by
building/connecting/staffing the missing production.

### 12. Workforce interaction

`AUDIT WORKFORCE`: the pool stays `Farm | Workshop | Well`; the assignment
algorithm is unchanged; housing capacity changes the workforce size only by
adding colonists, with no new priority, automatic reassignment or hidden
preference.

### 13. Persistence / determinism / performance

`AUDIT PERSISTENCE`: `SAVE_VERSION = 6`; every audited candidate is derived or
analytic, so no new persisted state, migration or hash field is required; replay
is deterministic (`hash 928077560803ab57`). `AUDIT PERFORMANCE` (20 residences /
24 workplaces / 20 colonists): 60 ticks 470.9 ms, 120 ticks 1142.9 ms, 600 ticks
5952.9 ms — linear in ticks.

### 14. Browser verification

All existing E2E suites pass with no UI change: `run` 11, `road` 15,
`transport` 10, `production` 12, `resource` 12, `food` 12, `temporal` 17,
`jobs` 21, `upkeep` 35, `reassign` 7, `water` 7. Zero console/page errors.

### 16. Final classification

```text
Current housing model:       A — healthy capacity bottleneck
Shelter Quality:             B — useful but incomplete
Settlement stages:           C — premature
Alternative growth mechanic: C — premature
Material interaction:        A — discrete upgrades keep Material a construction bottleneck
```

### Next dependency

```text
Outcome B — Shelter Quality is promising but requires one prerequisite
audit/design step.
```

The current housing model is healthy (A): capacity is the workforce lever and a
real bottleneck when Water production is abundant. Shelter Quality has a genuine
"more vs better" land/road decision and a causal one-time Material cost, so it
is not premature — but it has **no new consequence dimension**: capacity,
growth and survival are already owned by housing, Water and Food. The
prerequisite design step must define what quality *changes* for the settlement
without duplicating those three (the candidates are a comfortable-capacity /
overcrowding concept, or a quality-gated settlement-progression consumer).

Settlement stages and the other alternatives are premature (C) because objective
triggers exist but nothing consumes them.

The next step is therefore a small **Shelter Quality consequence design
intake** — not an implementation — that answers "what does better housing do
for population, given Food = survival, Water = growth, housing = capacity?"

### Scope verdict

```text
COMPLETE — AUDIT
```

Final confirmations:

```text
- src/ unchanged
- Food unchanged
- Water unchanged
- Material unchanged
- construction unchanged
- no new resource
- no new building
- no new service
- no generic framework
- no generic demand
- no generic maintenance
- no logistics
- no vehicles
- no travel simulation
- no new workforce priority
- SAVE_VERSION = 6
- deterministic replay intact
- save/load deterministic
- existing browser E2E green
```
