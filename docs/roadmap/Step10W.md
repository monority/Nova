# Step 10W — Shelter Quality Consequence Design Audit

## Position

Starting commit: `07bd642` — Step 10V complete.

Step 10V established:

* housing capacity is already a healthy bottleneck;
* Shelter Quality has a real **more vs better** spatial/material decision;
* discrete housing improvement preserves Material as a construction bottleneck;
* settlement stages are premature because no existing system consumes them;
* Shelter Quality is promising but currently has **no independent consequence**.

This step is therefore a **small design audit**, not an implementation.

Production code must remain unchanged.

---

# Objective

Define exactly what Shelter Quality changes.

The consequence must introduce a new dimension without duplicating:

```text
Food     → survival
Water    → growth admission
Housing  → population capacity
Material → construction
```

The central question is:

> If two colonies have the same population, Food, Water, Material, buildings and workforce, but different Shelter Quality, what becomes observably different?

If the answer is "nothing", Shelter Quality is not ready to implement.

---

# 1. Reconstruct the ownership boundaries

Document the current responsibility of:

### Food

```text
Food shortage
→ population survival consequence
```

### Water

```text
Water production/headroom
→ admission/growth gate
```

### Housing

```text
Residence capacity
→ maximum population
```

### Material

```text
construction
→ buildings / roads / expansion
```

Then define what Shelter Quality must **not** become:

* another survival resource;
* another admission resource;
* another housing-capacity multiplier with no new consequence;
* recurring Material taxation;
* generic happiness;
* generic needs;
* generic service framework.

---

# 2. Candidate consequence A — Comfortable Capacity

Audit a conceptual model:

```text
Residence
→ basic capacity
→ comfortable capacity
```

For example, conceptually:

```text
Basic Residence:
  capacity = 1
  comfortableCapacity = 1

Improved Residence:
  capacity = 2
  comfortableCapacity = 2
```

Do not assume these numbers are correct.

The purpose is to determine whether there is a meaningful state where:

```text
comfortable capacity < population <= absolute capacity
```

If such a state exists, determine what it changes.

Possible consequences to evaluate:

* reduced growth;
* reduced workforce availability;
* settlement-quality degradation;
* reduced future admission capacity;
* no immediate penalty but a measurable quality state.

Do **not** make overcrowding kill colonists.

Food already owns survival.

---

# 3. Candidate consequence B — Growth quality

Evaluate whether Shelter Quality can affect **how efficiently the colony converts existing housing into future growth**.

Important constraint:

Water already owns the basic growth gate.

Therefore do not simply create:

```text
Water + Shelter Quality
→ admission
```

Instead test whether Shelter Quality could affect a distinct layer such as:

```text
Water permits growth
Shelter Quality determines sustainable residential growth capacity
```

Determine whether this actually differs from simply increasing Residence capacity.

Reject it if the only effect is:

> build better Residence = fit more colonists.

That is still housing capacity, not a new consequence.

---

# 4. Candidate consequence C — Settlement progression readiness

Evaluate whether Shelter Quality can become an input into a future settlement-stage system.

Conceptually:

```text
Shelter Quality
      ↓
Settlement readiness
      ↓
future stage progression
```

Do not implement settlement stages.

Determine whether this creates a meaningful measurable state now.

Test whether a colony can be:

```text
large but primitive
```

versus:

```text
smaller but developed
```

without introducing arbitrary scoring.

A valid model must use concrete existing state rather than a generic "development score".

Potential evidence:

* upgraded Residence count;
* proportion of population in improved housing;
* residential density;
* total residential capacity;
* network-connected housing.

Do not combine five metrics into a score unless the audit demonstrates that each has an independent causal reason.

---

# 5. Candidate consequence D — Residential density

Evaluate whether Shelter Quality could make density itself meaningful.

Compare:

```text
Sparse:
R — R — R — R
```

with:

```text
Dense:
R R
R R
```

and with vertically upgraded housing:

```text
Tier-2
Tier-2
```

The question is not visual density.

The question is:

> Does the simulation have a concrete reason why one residential arrangement should behave differently?

Use only existing concepts:

* roads;
* networks;
* mobility;
* employment distance;
* Material;
* population.

Do not invent pollution, noise or land-value systems.

If density has no existing consequence, classify it as a prerequisite rather than inventing one.

---

# 6. Candidate consequence E — Residential efficiency

Audit a simpler model:

```text
Material investment
→ housing quality
→ residential efficiency
```

But explicitly distinguish:

```text
capacity efficiency
```

from:

```text
settlement quality
```

For example:

```text
Basic ×4
= 4 capacity / 100 Material

Improved ×2
= 4 capacity / 100 Material
```

Step 10V already showed that equal Material-per-capacity makes this primarily a land/road decision.

Determine whether that is sufficient to justify Shelter Quality as a system.

If yes, explain why.

If no, identify the missing consequence.

---

# 7. Compare the candidates without ranking them

For each candidate, produce:

| Candidate              | New state | New player decision | Duplicates Food? | Duplicates Water? | Duplicates Housing? | Requires new prerequisite? |
| ---------------------- | --------- | ------------------- | ---------------- | ----------------- | ------------------- | -------------------------- |
| Comfortable Capacity   | ...       | ...                 | ...              | ...               | ...                 | ...                        |
| Growth Quality         | ...       | ...                 | ...              | ...               | ...                 | ...                        |
| Settlement Readiness   | ...       | ...                 | ...              | ...               | ...                 | ...                        |
| Density                | ...       | ...                 | ...              | ...               | ...                 | ...                        |
| Residential Efficiency | ...       | ...                 | ...              | ...               | ...                 | ...                        |

This is a comparison, not a ranking.

Do not select a winner merely because it is easiest to implement.

---

# 8. Find the smallest coherent consequence

After the candidate analysis, identify the **minimum additional concept** required to make Shelter Quality meaningful.

Examples of acceptable outcomes:

```text
Shelter Quality
→ comfortable capacity
→ overcrowding state
```

or:

```text
Shelter Quality
→ concrete settlement-readiness condition
→ future stage unlock
```

or:

```text
Shelter Quality
→ no consequence yet
→ defer until another prerequisite exists
```

Do not invent a consequence solely to justify the system.

---

# 9. Check causal independence

For the proposed consequence, construct a counterfactual:

### Colony A

```text
same population
same Food
same Water
same Material
same buildings
same workforce
lower Shelter Quality
```

### Colony B

```text
same population
same Food
same Water
same Material
same buildings
same workforce
higher Shelter Quality
```

There must be at least one observable simulation difference.

If not, the candidate is incomplete.

---

# 10. Agency test

For the proposed consequence, identify the actual player decision.

It must be possible to describe it as:

> "The player chooses X instead of Y because Shelter Quality changes Z."

Examples:

```text
build 4 basic residences
vs
build 2 upgraded residences
```

or:

```text
expand population now
vs
invest Material in better housing first
```

Reject any model where the only meaningful choice is:

```text
pay recurring Material
→ number goes down
```

---

# 11. Deadlock / recovery

Test conceptual scenarios:

* low Shelter Quality + low Material;
* low Shelter Quality + high Material;
* high Shelter Quality + low Water;
* high Shelter Quality + low Food;
* high Shelter Quality + insufficient housing;
* overcrowded colony;
* empty colony;
* maximum available housing quality.

Determine whether the proposed consequence can create an irreversible state.

No population-kill mechanic should be introduced.

No automatic recovery policy should be invented.

---

# 12. Architecture boundary

This remains audit-only.

Do not introduce:

* `ShelterQualitySystem`
* generic `QualitySystem`
* generic `Need`
* generic `Service`
* generic `Modifier`
* generic `Consumer`
* generic `Maintenance`

If a future implementation needs a concrete Residence property or derived query, document that explicitly.

Prefer:

```text
Residence-specific state
+
Residence-specific derived query
```

over a reusable framework.

---

# 13. Persistence / determinism

No production changes are expected.

Confirm:

* `SAVE_VERSION = 6`;
* no new persisted state;
* no migration;
* no hash change;
* deterministic replay;
* insertion-order independence;
* save/load equivalence.

---

# 14. Browser / performance

No UI implementation.

Run the existing browser suite and confirm:

* all suites pass;
* zero console errors;
* zero page errors.

Run a small deterministic performance sample only if the audit experiments require simulation execution.

Do not optimize production code.

---

# 15. Required files

Add only:

```text
tests/shelterQualityConsequenceAudit.test.ts
docs/roadmap/Step10W.md
```

Do not modify `src/`.

---

# 16. Final classification

End with:

```text
Current Shelter Quality concept: A/B/C/D — ...

Comfortable Capacity:             A/B/C/D — ...
Growth Quality:                   A/B/C/D — ...
Settlement Readiness:             A/B/C/D — ...
Residential Density:              A/B/C/D — ...
Residential Efficiency:           A/B/C/D — ...

Required prerequisite:            ...
```

Then:

```text
Next dependency:
```

Possible outcomes:

### Outcome A

A concrete Shelter Quality consequence is now sufficiently defined for implementation.

### Outcome B

Shelter Quality is valid, but one small prerequisite mechanic must be audited first.

### Outcome C

Shelter Quality remains a useful spatial/material choice but has no independent consequence yet; defer it.

### Outcome D

The entire Shelter Quality direction is contradicted by the current simulation and should be closed.

Do not implement anything in 10W.

---

# Final confirmations

Explicitly confirm:

* `src/` unchanged
* Food unchanged
* Water unchanged
* Material unchanged
* housing capacity unchanged
* no new resource
* no new building
* no new service
* no generic framework
* no generic quality system
* no generic modifier system
* no generic demand system
* no generic maintenance
* no logistics
* no vehicles
* no travel simulation
* no new workforce priority
* `SAVE_VERSION = 6`
* deterministic replay intact
* save/load deterministic
* browser E2E green

```

Je garderais **10W très petit**. On a déjà fait beaucoup d'audits économiques ; ici le but est simplement de répondre à une question de design : **« qualité du logement produit-elle une conséquence réellement différente de capacité du logement ? »**. Si la réponse est non, on ferme aussi cette piste au lieu de fabriquer artificiellement un système de bonheur/maintenance.
```



---

## As-Built / Audit Report

**Type: AUDIT (Step 10W) — Shelter Quality consequence design.** `src/` is
untouched (`git diff -- src/` empty). Evidence comes from
`tests/shelterQualityConsequenceAudit.test.ts` (18 tests); every number below
is a real `AUDIT ...` line. The "improved Residence" (capacity 2) is an audit
**model only** — it is produced by injecting a second colonist directly into a
Residence, never by a production rule.

### Repository

* starting commit `07bd642` (Step 10V);
* final commit = this audit commit;
* production code changed: **none**;
* tests added: `tests/shelterQualityConsequenceAudit.test.ts` (18);
* docs changed: this file.

### 1. Ownership boundaries

`AUDIT OWNERSHIP` — already owned:

```text
Food     -> shortage removes every colonist        -> survival
Water    -> production-headroom gate               -> growth admission
Housing  -> Residence capacity = 1 colonist each   -> maximum population
Material -> construction demand                     -> buildings/roads/expansion
```

Shelter Quality must **not** become another survival resource, another
admission resource, a capacity multiplier with no new consequence, recurring
Material taxation, generic happiness, generic needs, or a generic service
framework.

### 2. Candidate A — Comfortable Capacity

`AUDIT COMFORTABLE_CAPACITY_CURRENT` (4 Residences, 4 colonists):
`population 4, capacity 4, occupied 4, overOccupiedResidences 0`. With absolute
capacity fixed at 1 per Residence there is **no room** for
`comfortable < occupied <= capacity`.

`AUDIT COMFORTABLE_CAPACITY_MODEL` (1 improved Residence holding 2 vs 2 plain
Residences holding 2): both keep `population 2` and identical production. The
overcrowded state (`overOccupiedResidences 1`) is representable, but every
listed consequence — reduced growth, reduced workforce, degradation, reduced
future admission — **requires an authored rule that does not exist**.

`AUDIT AUTHORED_RULE` proves the point: a mirror of `stepSimulation` with the
rule disabled is byte-identical to the real step over 60 ticks
(`hashCanonicalState` equal). With an invented
`overcrowding-blocks-admission` rule on a state that is over-occupied but still
has free capacity and Water headroom, population ends at **4** instead of **6**.
The consequence is authored by the rule, not discovered in the state.

### 3. Candidate B — Growth Quality

`AUDIT GROWTH_QUALITY`: `basic4x1` reaches population 4 with capacity 4;
`improved2x2` reaches population 3 with capacity 2. Nothing in the engine tracks
a sustainable-growth ceiling: Water permits growth and population fills
capacity, so "sustainable residential growth capacity" is **capacity under
another name** → duplicates Housing and Water.

### 4. Candidate C — Settlement Readiness

`AUDIT SETTLEMENT_READINESS`:

| colony | population | improved residences | improved share | capacity | connected housing |
| --- | --- | --- | --- | --- | --- |
| large but primitive | 10 | 0 | 0 | 10 | 10 |
| smaller but developed | 6 | 2 | 0.667 | 4 | 4 |

The state **is** concretely measurable and distinguishes "large but primitive"
from "smaller but developed" without arbitrary scoring. Metric independence:

* upgraded-residence count — independent and new;
* share of population in improved housing — perfectly correlated with the count
  in this model, so it collapses to one metric;
* residential density — not a stored state;
* total residential capacity — already owned by Housing;
* network-connected housing — already owned by Roads (09D/09E).

Consumer count: **0** — no system reads any readiness metric. The state is
measurable but inconsequential, and its only plausible consumer (settlement
progression) was found premature in Step 10V.

### 5. Candidate D — Residential Density

`AUDIT RESIDENTIAL_DENSITY`: dense and sparse layouts are identical
(`population 4, capacity 4, servedResidences 4, employed 2, staffedFarms 1`); the
disconnected layout differs (`servedResidences 1, employed 1, staffedFarms 0`).
The only layout-driven differences are already owned by roads/mobility —
employment reachability (09K), workplace preference (09M) and water coverage
(09D/09E + 10P). Density has **no independent consequence**.

### 6. Candidate E — Residential Efficiency

`AUDIT RESIDENTIAL_EFFICIENCY`: `Basic ×4` (100 Material, capacity 4, 4
buildings) and `Improved ×2` (100 Material, capacity 4, 2 buildings) have
identical Material per capacity (**25**). The observable difference is land and
road cells only — a saving already produced by the construction/road systems.
Capacity efficiency duplicates Housing.

### 7. Candidate comparison

`AUDIT CANDIDATE_TABLE` (comparison, not a ranking):

| Candidate | New state | New player decision | Dup Food | Dup Water | Dup Housing | New prerequisite |
| --- | --- | --- | --- | --- | --- | --- |
| Comfortable Capacity | comfortable occupancy per Residence | spread vs concentrate population | no | no | **yes** | a consequence rule for the overcrowded state |
| Growth Quality | none (reduces to capacity) | none distinct | no | **yes** | **yes** | a separate sustainable-growth concept |
| Settlement Readiness | share of population in improved housing | expand population vs invest in better housing first | no | no | no | a consumer (settlement progression), premature per 10V |
| Density | none | none distinct from road layout | no | no | no | an effect not already owned by roads/mobility |
| Residential Efficiency | none | basic vs improved housing for land/road efficiency | no | no | **yes** | a consequence beyond land/road savings |

### 8. Smallest coherent consequence

`AUDIT SMALLEST_COHERENT_CONSEQUENCE`: **none exists today.** Comfortable
Capacity needs two new concepts (a comfortable-capacity property *and* a
consequence rule); Settlement Readiness needs only one (a consumer for an
already-measurable state), but that consumer is premature per 10V. Recommended:
**defer** — do not invent a happiness/maintenance system to justify the concept.

### 9. Causal independence counterfactual

`AUDIT COUNTERFACTUAL`: Colony A and Colony B with the same population (4),
Food, Water, Material, buildings and workforce produce byte-identical
`hashCanonicalState` and identical behavioural projections. No derived query
accepts a quality input either — the query surface is
`housing{totalCapacity,occupiedCapacity,availableCapacity}`,
`employment{population,employed,unemployed,jobCapacity,vacantJobs}`,
`water{servedResidenceIds,servedColonistIds,coveredNetworkIds}`,
`roadAccess{buildingId,hasRoadAccess,roadIds,networkIds}`. With capacity held
equal, Shelter Quality is **observably identical**; making A and B differ
requires either a new authored rule or a capacity delta.

### 10. Agency test

`AUDIT AGENCY`: Comfortable Capacity = spread vs concentrate (only after an
overcrowding rule exists); Growth Quality = none distinct; Settlement Readiness =
expand now vs invest Material in better housing first (real, but the payoff
needs a stage consumer); Density = none distinct from road layout; Residential
Efficiency = 4 basic vs 2 improved (a land/road choice, not a Material choice).
Rejected: "pay recurring Material so a number goes down" (10U).

### 11. Deadlock and recovery

`AUDIT DEADLOCK_RECOVERY`: low/high Material, low Water, insufficient housing,
overcrowded, empty and max-quality colonies all remain recoverable; the only
population loss is `highQualityLowFood` (population 4 → 0), which is the existing
**Food survival** gate, not a shelter mechanic. `AUDIT NO_KILL_NO_AUTO_RECOVERY`:
the overcrowded state persists (`true`) with population intact (2) — no
population-kill and no automatic recovery policy exists.

### 12. Architecture boundary

`AUDIT ARCHITECTURE_PERSISTENCE`: systems introduced — **none**. If a future
implementation ever needs this, the documented shape is a **concrete
Residence-specific property (e.g. tier) plus a Residence-specific derived
query** — never a generic `Quality`/`Modifier`/`Need`/`Service`/`Consumer`/
`Maintenance` framework, and never `ShelterQualitySystem`.

### 13. Persistence / determinism

`SAVE_VERSION = 6`; no new persisted state; no migration; no hash change
(`hash bfdb9394920b911c` for the reference run); deterministic replay
(`hashCanonicalState(run()) === hashCanonicalState(run())`); save/load
equivalence (`serializeCanonicalState(loadSave(serializeSave(state)))` equals
the original); `AUDIT ORDER_INDEPENDENCE` confirms reversing building and
colonist insertion order leaves `getHousingSummary` and population unchanged.

### 14. Browser / performance

All existing browser suites pass with no UI change: `run` 11, `road` 15,
`transport` 10, `production` 12, `resource` 12, `food` 12, `temporal` 17,
`jobs` 21, `upkeep` 35, `reassign` 7, `water` 7 — every suite reports "zero
console/page errors". `AUDIT PERFORMANCE` (10 residences / 8 workplaces / 10
colonists): 60 ticks 151.2 ms, 120 ticks 304.9 ms.

### 16. Final classification

```text
Current Shelter Quality concept: C — premature (no quality state or consequence; only housing capacity exists)
Comfortable Capacity:             C — needs a comfortable-capacity property AND a consequence rule
Growth Quality:                   D — reduces to housing capacity; duplicates Water's growth gate
Settlement Readiness:             B — one concrete independent metric, but its only consumer is premature
Residential Density:              C — its only effects are already owned by roads/mobility (09K/09M)
Residential Efficiency:           C — duplicates housing capacity; land/road savings already owned by construction/roads

Required prerequisite:            a consequence consumer for shelter quality that is not Food, Water or housing capacity — none exists
```

### Next dependency

```text
Outcome C — Shelter Quality remains a useful spatial/material choice but has
no independent consequence yet; defer it.
```

Answering the central question: if two colonies have the same population, Food,
Water, Material, buildings and workforce but different Shelter Quality, the
answer today is **"nothing becomes observably different"**. Every candidate that
does change the simulation either duplicates Housing capacity (Comfortable
Capacity, Growth Quality, Residential Efficiency) or needs a consumer that does
not exist yet (Settlement Readiness → settlement progression, premature per
10V). The only layout-driven effects in the engine are already owned by
roads/mobility.

Shelter Quality is therefore **not contradicted** — the "more vs better"
spatial/material choice is real — but it has **no independent consequence**, so
it should be deferred rather than implemented. No happiness, comfort,
maintenance, generic quality or generic modifier system is introduced to
justify it.

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
- housing capacity unchanged
- no new resource
- no new building
- no new service
- no generic framework
- no generic quality system
- no generic modifier system
- no generic demand system
- no generic maintenance
- no logistics
- no vehicles
- no travel simulation
- no new workforce priority
- SAVE_VERSION = 6
- deterministic replay intact
- save/load deterministic
- browser E2E green
```
