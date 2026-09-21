# Step 10U — Material Demand & Phase 5 Service Audit

## 1. OBJECTIVE

Step 10T closes the Food dependency.

Starting point:

* Step 10T commit: `a8d1ed5`
* Step 10S Water growth loop is closed
* Food is a real survival gate and workforce competitor
* Food storage / Granary is rejected as premature
* Farm input is rejected as a mandatory Material tax
* Material is now the main exposed economic gap

This step is **AUDIT-ONLY**.

Do not modify production code under `src/`.

The objective is to determine whether the next dependency should be:

### Candidate A — Ongoing Material demand

Introduce a meaningful recurring Material consumer connected to the existing colony.

### Candidate B — Phase 5 essential service

Introduce another essential service whose existence creates a new causal loop and gives Material an ongoing purpose through construction or operation.

### Candidate C — Neither yet

If Material's current bounded surplus is acceptable at this stage, identify the actual next missing dependency.

Do not assume that Material must have a sink merely because it has a surplus.

---

# 2. HARD RULE

No implementation.

Only:

```text
AUDIT
→ OBSERVATIONS
→ CAUSAL ANALYSIS
→ DESIGN DECISION
```

Do not add:

* Material consumers,
* new service buildings,
* new resources,
* upkeep rules,
* housing upkeep,
* population Material consumption,
* generic demand systems,
* generic service systems,
* money,
* vehicles,
* logistics,
* Food mechanics.

Audit-only tests and documentation are allowed.

---

# 3. RECONSTRUCT CURRENT MATERIAL LOOP

Read the actual implementation.

Document:

```text
Construction
→ Material spending
→ Workshop production
→ Material storage
→ Workshop upkeep
→ future construction
```

Determine exactly:

* Workshop gross production,
* Workshop upkeep,
* storage capacity,
* storage equilibrium,
* construction costs,
* construction timing,
* whether Material can become negative,
* whether excess production is discarded,
* whether Material is spatial,
* whether Material production is road/mobility dependent,
* whether Material consumption is currently only construction/upkeep.

Do not infer from previous reports.

---

# 4. CURRENT MATERIAL EQUILIBRIUM

Establish the actual equations.

For one staffed Workshop:

```text
gross Material = ?
upkeep = ?
net Material = ?
storage capacity = ?
```

For `W` staffed Workshops determine:

```text
production
upkeep
net
storage cap
equilibrium stock
```

Verify the reported relationship:

```text
equilibrium ≈ 24 × staffed Workshops
storage cap = 25 × staffed Workshops
```

Do not assume this relationship remains true in every state.

---

# 5. DETERMINE WHETHER MATERIAL SURPLUS IS ACTUALLY A PROBLEM

Run long simulations:

* 60 ticks,
* 120 ticks,
* 240 ticks,
* 600 ticks,
* 1200 ticks if practical.

Test:

### Scenario A

1 Farm + 1 Workshop + 1 Well.

### Scenario B

2 Farms + 1 Workshop + 1 Well.

### Scenario C

1 Farm + 2 Workshops + 1 Well.

### Scenario D

2 Farms + 2 Workshops + 1 Well.

### Scenario E

2 Farms + 2 Workshops + 2 Wells.

Record:

* population,
* Food,
* Water,
* Material,
* Material production,
* Material upkeep,
* construction events,
* workforce allocation,
* housing capacity,
* number of operational buildings.

Determine whether Material:

* accumulates,
* reaches storage equilibrium,
* is repeatedly consumed by construction,
* becomes permanently irrelevant after build-out,
* creates meaningful worker opportunity cost,
* or creates actual pressure.

---

# 6. CONSTRUCTION AS EXISTING MATERIAL SINK

Before inventing an ongoing consumer, measure the existing construction sink.

Test:

* housing-first,
* Farm-first,
* Workshop-first,
* Well-first,
* road-first,
* mixed construction.

Measure how long Material remains economically relevant.

Determine:

1. Does construction already provide sufficient demand during colony growth?
2. Does Material become irrelevant only after the colony reaches a stable built state?
3. Is that actually a problem?
4. Does the player currently have enough meaningful construction decisions?

Do not add an artificial sink merely to keep the resource moving.

---

# 7. MATERIAL STORAGE CAP ANALYSIS

The current bounded storage is:

```text
25 × operational Workshops
```

with equilibrium around:

```text
24 × staffed Workshops
```

Audit whether this cap is doing meaningful gameplay work.

Test:

* 1 Workshop,
* 2 Workshops,
* 3 Workshops,
* Workshop construction before staffing,
* Workshop becoming vacant,
* Workshop becoming operational,
* Workshop becoming inaccessible.

Determine whether the storage cap:

* prevents runaway stock,
* creates construction timing pressure,
* matters only numerically,
* interacts meaningfully with workforce,
* or is effectively invisible after equilibrium.

Do not change the cap.

---

# 8. CANDIDATE A — ONGOING MATERIAL DEMAND

Model possible recurring Material consumers **without implementation**.

Do not invent an arbitrary tax.

Possible categories to investigate:

### A1 — Population-coupled consumption

Example concept:

```text
population → Material demand
```

### A2 — Housing/building maintenance

Example concept:

```text
operational housing/buildings → Material demand
```

### A3 — Essential service operation

Example concept:

```text
service building → Material demand
```

### A4 — Expansion/construction pressure

Example concept:

```text
higher settlement stage → increasing Material demand
```

These are audit models only.

For each determine:

* what causal dependency it creates,
* whether it creates a new decision,
* whether it merely taxes the player,
* whether it creates deadlocks,
* whether it interacts with Water/Food,
* whether it makes Workshops strategically meaningful,
* whether it creates spatial pressure.

Do not choose one yet.

---

# 9. CANDIDATE B — PHASE 5 ESSENTIAL SERVICE

Review the original roadmap intent for Phase 5:

> Additional essential service.

Water is now the first implemented service.

Determine whether the next service should exist independently of Material demand.

Potential service categories may include:

* health,
* sanitation,
* energy,
* education,
* shelter quality,
* another essential residential condition.

Do not select one by intuition.

Use the existing causal architecture to determine what kind of service would add a genuinely new dependency.

For each plausible category, ask:

1. Does it affect population?
2. Does it affect growth rather than survival?
3. Does it require spatial coverage?
4. Does it require workforce?
5. Does it require construction?
6. Does it create a new resource?
7. Can it use existing resources?
8. Does it create meaningful placement decisions?
9. Can it avoid generic Service abstraction?
10. Does it teach something new compared with Water?

---

# 10. WATER VS NEXT SERVICE

Water currently establishes:

```text
Well
→ road/network
→ coverage
→ served Residence
→ growth eligibility
→ Water production
→ workforce competition
```

The next service must not merely duplicate this loop with a renamed resource.

Determine what new dimension it would introduce.

Examples of genuinely new dimensions could include:

* service quality rather than binary access,
* a different spatial topology,
* population consequence rather than growth gating,
* a different workforce tradeoff,
* a different construction dependency,
* a different temporal behavior.

Do not implement any of these yet.

---

# 11. MATERIAL ↔ SERVICE RELATIONSHIP

This is critical.

Determine whether a new essential service naturally gives Material an ongoing role.

For example:

```text
Material
→ construct service
→ service affects population
→ population affects economy
```

or:

```text
Material
→ maintain service
→ service remains operational
→ population depends on service
```

But do not add upkeep merely because it creates a Material sink.

The causal direction must come from the service itself.

Ask:

> If Material were removed from the service design, would the service still make sense?

If yes, Material demand may be artificial.

If no, explain why.

---

# 12. DEADLOCK ANALYSIS

For every candidate recurring Material consumer and every plausible service category, search for terminal states.

At minimum:

### Economy states

* no Farms,
* no Workshops,
* no Wells,
* one of each,
* low Material,
* low Food,
* low Water,
* high Material,
* high Food,
* high Water.

### Construction orders

* Residence-first,
* Farm-first,
* Workshop-first,
* Well-first,
* service-first if modeled,
* mixed.

Determine:

* terminal deadlock,
* recoverable shortage,
* player-controlled recovery,
* automatic recovery.

Do not add automatic recovery.

---

# 13. PLAYER AGENCY

This is mandatory.

For every candidate, answer:

> What decision does the player actually gain?

A candidate should not qualify merely because it:

* consumes Material,
* reduces stock,
* adds another number,
* creates scarcity.

A valid new dependency should create a meaningful choice involving:

* placement,
* workforce,
* construction order,
* expansion,
* resource allocation,
* population,
* or infrastructure.

---

# 14. WORKFORCE COMPETITION

Measure whether an ongoing Material demand changes workforce decisions.

Current pool:

```text
Farm
Workshop
Well
```

Test whether a hypothetical Material demand would cause meaningful shifts.

Avoid models where:

```text
more population
→ automatically more Material tax
→ therefore build more Workshops
```

unless the resulting player decision is more than simply "build more Workshops."

---

# 15. SPATIAL ANALYSIS

Material is currently spatially influenced through Workshop employment:

```text
Residence
→ network
→ workplace eligibility
→ Workshop
→ Material
```

Determine whether a new Material consumer could use existing spatial structure meaningfully.

Do not introduce:

* material logistics,
* trucks,
* pipelines,
* delivery simulation,
* warehouse networks.

If the candidate requires logistics to become interesting, classify it as premature unless logistics is independently justified.

---

# 16. POPULATION FEEDBACK

Model whether each candidate creates a useful loop.

Current closed loops include:

### Food

```text
population
→ Food need
→ Food consumption
→ shortage
→ population consequence
```

### Water

```text
population
→ Water need
→ growth eligibility
→ Well workforce
→ Water production
→ growth capacity
```

### Material

```text
Workshops
→ Material
→ construction
→ buildings
→ workforce/housing/service capacity
```

The question is:

> Does Material need another loop now, or is the construction loop sufficient until a later settlement-growth phase?

Test before deciding.

---

# 17. PHASE 5 DEPENDENCY AUDIT

Determine whether the roadmap should now enter Phase 5.

A Phase 5 feature should:

1. depend on existing systems,
2. teach a new simulation concept,
3. create a real player decision,
4. remain concrete,
5. avoid premature generic architecture,
6. avoid duplicating Water.

If no candidate satisfies these conditions, explicitly defer Phase 5.

---

# 18. SAVE / DETERMINISM IMPACT

Audit-only.

For each candidate determine likely effects on:

* canonical state,
* derived state,
* save version,
* migration,
* hash,
* replay determinism.

Do not modify persistence.

Prefer derived state whenever possible.

---

# 19. PERFORMANCE

Run current baseline simulation performance.

If modeling candidates in audit tests, keep the models simple.

Do not introduce:

* generic dependency graphs,
* generic resource systems,
* logistics graphs,
* per-pair BFS,
* global service abstractions.

---

# 20. BROWSER QA

Run the existing browser suites.

Verify the current economy remains intact:

* Food survival,
* Water growth,
* Water production-headroom,
* Material production,
* construction,
* road/network mobility,
* manual workforce reassignment.

No UI changes.

---

# 21. ARCHITECTURE AUDIT

Confirm:

* resources remain concrete,
* buildings remain concrete,
* services remain concrete,
* simulation phases remain explicit,
* spatial networks remain derived,
* no generic demand framework,
* no generic maintenance framework,
* no generic Service framework,
* no generic resource-consumer framework.

Do not introduce abstractions during this audit.

---

# 22. DESIGN CLASSIFICATION

Classify independently:

### Current Material model

A — Fundamental / healthy
B — Useful but incomplete
C — Premature
D — Contradictory

### Ongoing Material demand

A/B/C/D

### Phase 5 essential service

A/B/C/D

### Candidate service categories

Classify individually where evidence is sufficient.

Do not produce an overall ranking or winner.

---

# 23. NEXT DEPENDENCY

Possible outcomes:

### Outcome A

Material demand is justified.

Next step defines the smallest concrete Material consumer.

### Outcome B

Phase 5 service is justified.

Next step defines the service contract.

### Outcome C

Both are premature.

Continue with the current economy and identify the actual next dependency.

### Outcome D

Material needs no new sink until settlement growth.

Explicitly close the Material concern and move to the next roadmap phase.

Do not implement the next feature in 10U.

---

# 24. FILES

Read:

* `src/domain/resource/resource.ts`
* `src/domain/building/building.ts`
* `src/domain/jobs/jobs.ts`
* `src/domain/simulation/phases.ts`
* `src/domain/simulation/step.ts`
* construction command/application code
* population/admission code
* Water implementation
* Food implementation
* relevant Material tests
* workforce tests
* construction tests
* `docs/roadmap/Step10O.md`
* `docs/roadmap/Step10P.md`
* `docs/roadmap/Step10Q.md`
* `docs/roadmap/Step10R.md`
* `docs/roadmap/Step10S.md`
* `docs/roadmap/Step10T.md`

Add only:

* `tests/materialDemandPhase5Audit.test.ts`
* `docs/roadmap/Step10U.md`

Do not modify production code.

---

# 25. VERIFICATION

Run:

* full tests,
* audit tests,
* lint,
* typecheck,
* build,
* browser E2E.

Expected:

* `src/` unchanged,
* Water behavior unchanged,
* Food behavior unchanged,
* Material behavior unchanged,
* deterministic replay unchanged.

---

# 26. FINAL REPORT

End `docs/roadmap/Step10U.md` with:

```text
Step 10U COMPLETE — AUDIT

Repository

Starting commit:
Final commit:

Production code changed:
Tests added:
Docs changed:

Current Material causal loop

...

Current Material pressure

...

Material equilibrium

...

Construction as Material sink

...

Material storage analysis

...

Ongoing Material demand candidates

...

Phase 5 essential service candidates

...

Material ↔ Service relationship

...

Deadlock analysis

...

Player agency

...

Workforce competition

...

Spatial analysis

...

Population feedback

...

Phase 5 dependency audit

...

Persistence / migration

...

Determinism

...

Performance

...

Browser verification

...

Architecture audit

...

Design classification

Current Material model: A/B/C/D
Ongoing Material demand: A/B/C/D
Phase 5 service: A/B/C/D

Candidate service classifications:

...

Reason:

Next dependency

...

Scope verdict

COMPLETE — AUDIT

Final confirmations:

- src/ unchanged
- Water production-headroom admission unchanged
- Water remains the growth gate
- Food remains the survival gate
- Material construction rules unchanged
- no ongoing Material consumer implemented
- no new service implemented
- no generic demand framework
- no generic maintenance framework
- no generic Service framework
- no generic resource-consumer framework
- no logistics
- no vehicles
- no travel simulation
- no new workforce priority
- deterministic save/load remains intact
- replay remains deterministic
- SAVE_VERSION remains 6
```



---

## As-Built / Audit Report

**Type: AUDIT (Step 10U) — Material demand and the Phase 5 service question.**
`src/` is untouched (`git diff -- src/` empty). Evidence comes from
`tests/materialDemandPhase5Audit.test.ts` (20 tests); every number below is a
real `AUDIT ...` line. Candidate Material-demand models are audit-only mirrors
of the existing tick (never persisted).

### Repository

* starting commit `a8d1ed5` (Step 10T);
* final commit = this audit commit;
* production code changed: **none**;
* tests added: `tests/materialDemandPhase5Audit.test.ts` (20);
* docs changed: this file.

### Current Material causal loop

`AUDIT MATERIAL_LOOP`:

```text
gross            : 2 per staffed Workshop (MATERIAL_PER_WORKER_PER_TICK)
upkeep           : 1 per staffed Workshop
net              : +1 per staffed Workshop while below the storage cap
storage          : 25 per operational Workshop (staffing-independent)
construction     : 25 per building, 5 per road cell
negative Material: impossible (deductions clamp; placement is rejected before spending)
overflow         : stored production is clamped to free space and discarded
spatial          : Material itself is global; only Workshop WORKFORCE is spatial
consumption      : construction + Workshop upkeep only
```

### Material equilibrium

`AUDIT MATERIAL_EQUILIBRIUM`:

| Staffed Workshops | gross/tick | upkeep/tick | net/tick | storage cap | equilibrium |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 2 | 1 | +1 | 25 | 24 |
| 2 | 4 | 2 | +2 | 50 | 48 |
| 3 | 6 | 3 | +3 | 75 | 72 |

`AUDIT MATERIAL_CAP`: a 2-Workshop colony settles at exactly 48 and never
exceeds capacity. The `24 × W` equilibrium and `25 × W` cap hold.

### Current Material pressure

`AUDIT MATERIAL_PRESSURE` (scenarios A–E, 60/120/240/600/1200 ticks): every
scenario plateaus at its cap and stays there — A `24`, B `24`, C `48`, D `48`,
E `48` — with `stored 1–2` and `upkeep 1–2` offsetting to net 0. Population is
stable (2/3/3/4/5). `AUDIT MATERIAL_PLATEAU`: a 2-Workshop colony is 48 at
tick 60 and still 48 at tick 1200 (`growsAfterCap: false`).

Material is fully consumed by construction during growth; without construction
it plateaus and stops mattering. That is the intended "construction done"
state, not a fault.

### Construction as Material sink

`AUDIT CONSTRUCTION_ORDERS` (real command chains, 300 Material start): housing-
first, farm-first, workshop-first and mixed orders all complete; total spent
115–118 and all end at 24. `AUDIT BUILD_OUT_DEMAND`: a full small settlement
(10 buildings + 12 road cells) costs **310 Material**, i.e. 310 ticks of one
staffed Workshop's net +1. Construction is a large, real sink throughout
growth; it only stops once the colony is built out.

### Material storage analysis

`AUDIT STORAGE_CAP_TRACE` (1 Workshop, 1 colonist): stock climbs 1 → 24, then
stalls; at equilibrium `stored 1`, `upkeep 1` → net 0 (`AUDIT
STORAGE_CAP_SUMMARY`). The cap bounds production inflow and creates the known
"24 vs 25" crest-timing decision (a 25-cost building can be placed on the tick
the stock crests 25). `AUDIT STORAGE_STAFFING`: capacity counts operational
Workshops regardless of staffing (two vacant operational Workshops still give
50), so the cap is infrastructure, not labour.

### Ongoing Material demand candidates

`AUDIT MATERIAL_DEMAND_A1` (population-coupled, 240 ticks):

| Material per colonist | population | Material |
| ---: | ---: | ---: |
| 0 | 4 | 48 |
| 1 | 4 | 0 |
| 2 | 4 | 0 |

`AUDIT MATERIAL_DEMAND_A2` (per operational building): 0 → 48, 1 → 0, 2 → 0.
Both models simply drain the bounded stock to 0 without changing population,
production or any decision. `AUDIT MATERIAL_DEMAND_A3_A4`: a service-operation
demand depends on Candidate B, and expansion pressure has no settlement-stage
model to attach to.

### Phase 5 essential service candidates

`AUDIT SERVICE_CANDIDATES`:

| Category | Population effect | New dimension vs Water | Verdict |
| --- | --- | --- | --- |
| Sanitation | growth (like Water) | none — coverage topology duplicates Water | duplicates Water |
| Health | survival/quality | graded quality rather than binary access | needs a quality/consequence model |
| Energy | indirect | requires devices/machines to consume | no device model — premature |
| Education | long-term quality | requires a time-scale/cohort model | no long-horizon model — premature |
| Shelter quality | housing capacity/quality | couples Material to housing | only natural Material coupling |

### Material ↔ Service relationship

`AUDIT MATERIAL_SERVICE_RELATION`: for sanitation, health, energy and education
the service would still make sense without Material, so attaching Material to
them would be an artificial sink. Only **shelter quality** is literally built
and maintained with Material — a causal, not attached, demand. The audit
explicitly avoids adding upkeep merely to create a sink.

### Deadlock analysis

`AUDIT DEADLOCK_ANALYSIS` (six economy states, 600 ticks): current, A1 and A2
all keep population > 0; the demand mirrors drive Material to 0 but never kill
(Food and Water are untouched). No terminal state was found in the current
model.

### Player agency

`AUDIT PLAYER_AGENCY`: population-coupled demand collapses to "build more
Workshops"; building maintenance collapses to "own fewer buildings" (penalising
the settlement the player already built); service operation depends on
Candidate B; expansion pressure has no model. **None of the recurring-demand
models adds a distinct player decision.**

### Workforce competition

`AUDIT WORKFORCE_SPATIAL`: the pool remains `Farm | Workshop | Well`. Material
is global; only Workshop workforce is spatial. The demand mirrors add no new
placement or order decision and leave the automatic workplace choice unchanged.

### Spatial analysis

Material is spatial only through Workshop employment (residence → network →
workplace eligibility → Workshop). No material logistics/trucks/pipelines are
justified; any candidate requiring logistics to become interesting would be
premature.

### Population feedback

`AUDIT POPULATION_FEEDBACK`: three loops are already closed — Food
(need → shortage → population loss), Water (need → growth eligibility → Well
workforce → production → capacity), Material (Workshops → Material →
construction → buildings → workforce/housing capacity). The Material loop is
active for the whole growth phase and only plateaus once built out, so it does
not need another loop now.

### Phase 5 dependency audit

`AUDIT PHASE5_AUDIT`: no service category yet adds a genuinely new simulation
concept beyond Water coverage, none creates a decision that is not a tax or a
duplicate, and sanitation/health would duplicate Water's coverage topology. The
conditions for entering Phase 5 are not met; **defer Phase 5** until the
settlement scale or a new consequence dimension exists.

### Persistence / migration

`AUDIT PERSISTENCE_IMPACT`: population-coupled and building-maintenance demand
would need no new state (derived each tick); a Phase 5 service would add a
building type (and possibly a resource), a shape change and a version bump.
`SAVE_VERSION = 6` unchanged.

### Determinism

`AUDIT PERFORMANCE`: the demand mirror is deterministic
(`mirrorDeterministic: true`, hash `d981275007d995c5`); serialized states are
identical. No `Date.now()` / `Math.random()` in `src/`.

### Performance

`AUDIT PERFORMANCE` baseline (20 residences / 18 workplaces / 20 colonists):
60 ticks 247.1 ms, 120 ticks 489.8 ms, 600 ticks 3800.8 ms — linear in ticks,
no new graph or logistics work.

### Browser verification

All E2E suites pass with no UI change: `run` 11, `road` 15, `transport` 10,
`production` 12, `resource` 12, `food` 12, `temporal` 17, `jobs` 21,
`upkeep` 35, `reassign` 7, `water` 7. Water and Food behaviour are unchanged.

### Architecture audit

Concrete resources, buildings, phases and derived networks only; no generic
demand/maintenance/Service/resource-consumer framework; no abstraction added by
the audit. `src/` unchanged.

### Design classification

```text
Current Material model:    A — Fundamental / healthy
Ongoing Material demand:   C — Premature
Phase 5 essential service: C — Premature
```

Candidate service classifications:

```text
Sanitation:      D — Contradictory / reject (duplicates Water)
Health:          C — Premature (needs a quality/consequence model)
Energy:          C — Premature (needs devices)
Education:       C — Premature (needs a time-scale)
Shelter quality: B — Useful but incomplete (the only causal Material coupling)
```

Reason:

* **Current Material model (A):** a bounded, self-limiting stock (`24 × W`
  equilibrium under a `25 × W` cap) that is a genuine bottleneck during
  growth, drives Workshop construction and competes for the shared workforce.
  The plateau after build-out is the intended end state.
* **Ongoing Material demand (C):** A1/A2 drain the stock to 0 with no change to
  population, production or any decision; they are a tax, not a dependency.
* **Phase 5 service (C, as a whole now):** no category adds a new concept or
  decision without duplicating Water, and several require models (quality,
  devices, time-scale) that do not exist. Shelter quality is the exception but
  is incomplete on its own.

### Next dependency

**Outcome D — Material needs no new sink until settlement growth. Close the
Material concern.** The construction loop already supplies demand for the whole
growth phase; an ongoing consumer would be a tax with no new decision.

The next roadmap phase should therefore be a **settlement-growth / Phase 5
design intake**, with **shelter quality** as the single evidence-backed first
candidate: it is the only category that (a) does not duplicate Water's coverage
topology, (b) uses an existing resource, and (c) gives Material a causal
ongoing role through housing. That intake must first establish the housing/
quality consequence model (what shelter quality changes for population) before
any implementation. Do not implement it in 10U.

### Scope verdict

```text
COMPLETE — AUDIT
```

Final confirmations:

```text
- src/ unchanged
- Water production-headroom admission unchanged
- Water remains the growth gate
- Food remains the survival gate
- Material construction rules unchanged
- no ongoing Material consumer implemented
- no new service implemented
- no generic demand framework
- no generic maintenance framework
- no generic Service framework
- no generic resource-consumer framework
- no logistics
- no vehicles
- no travel simulation
- no new workforce priority
- deterministic save/load remains intact
- replay remains deterministic
- SAVE_VERSION remains 6
```
