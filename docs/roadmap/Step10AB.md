# Step 10AB — Workshop Water Bootstrap Audit

## Starting state

Repository starts from:

* commit `80b42f4` — `Step 10AA: audit producer dependency design`
* `src/` must remain untouched.
* This is an **audit-only** step.
* Do not implement `Workshop ← Water`.

## Objective

Resolve the bootstrap contradiction identified by Step 10AA.

Candidate dependency:

```text
Well
  → Water
  → Workshop operation
  → Material
  → Construction
```

Proposed concrete rule:

```text
Each staffed operational Workshop consumes 1 Water/tick.
```

The dependency is promising, but currently has two incompatible bootstrap behaviors:

### Without exemption

```text
Material = 0
→ cannot construct Well
→ cannot produce Water
→ Workshop cannot operate
→ cannot produce Material
→ unrecoverable deadlock
```

### With the 10P-style growth exemption

The first Workshop can operate without Water.

This avoids the deadlock but creates an undesirable opening:

```text
Workshop before Well
→ free Material production
→ delayed Water infrastructure
```

The audit must determine whether there is a clean bootstrap rule.

---

# 1. Hard constraints

Do not violate these constraints:

* no new resource;
* no new persistent state;
* no generic production/input framework;
* no generic bootstrap framework;
* no automatic build order;
* no priority system;
* no new service;
* no new population rule;
* no Food change;
* no Water admission rule change;
* no Material storage change;
* no construction cost change;
* no Construction Crew rule change.

The only thing being audited is:

> How can the first Workshop become a valid Water-consuming producer without making the colony unrecoverable or giving the Workshop a permanent free-input loophole?

---

# 2. Candidate bootstrap models

Audit at least the following concrete models.

## Model A — Strict from tick 1

Every staffed operational Workshop requires 1 Water.

No exemption.

Measure:

* starting Material 0;
* starting Material 1;
* starting Material 5;
* starting Material 25.

Determine exactly which starting states bootstrap.

If Material 0 is unrecoverable, document it.

Do not "fix" it inside the model.

---

## Model B — First Workshop exemption

The first operational Workshop is allowed to produce without Water until a qualifying Well exists.

Test:

* one Workshop;
* one Well;
* two Workshops;
* multiple colonists;
* delayed Well construction;
* Well construction by crew;
* Well removal/unavailability in the audit model.

Measure:

```text
Food
Water
Material
population
Workshop output
Well output
```

Specifically determine whether this becomes:

```text
temporary bootstrap exemption
```

or:

```text
permanent free Workshop
```

The exemption must not be accepted merely because it prevents deadlock.

---

## Model C — First Water reserve

Model a finite bootstrap Water reserve without changing the actual resource system.

Examples:

```text
initial Water = 1
initial Water = 2
initial Water = 3
```

This is an audit counterfactual only.

Determine:

* whether the reserve is sufficient to bootstrap;
* whether the reserve is effectively just hidden free Water;
* whether it creates a meaningful opening decision;
* whether the eventual implementation would require changing SAVE/resource initialization.

Do not modify `INITIAL_WATER`.

---

## Model D — Construction-time Water

Model the possibility that constructing a Well grants a one-time Water bootstrap amount upon completion.

Examples:

```text
Well completion → +1 Water
Well completion → +2 Water
```

This is audit-only.

Determine:

* whether this cleanly bridges the bootstrap;
* whether it creates a new source of Water outside production;
* whether it creates a resource-generation loophole;
* whether Construction Crew now propagates into the production chain.

---

## Model E — First Workshop batch exemption

Instead of exempting a Workshop indefinitely, allow only a finite initial production batch.

Examples:

```text
first Workshop gets 1 free production tick
first Workshop gets 2 free production ticks
```

After the allowance is exhausted:

```text
Workshop requires Water normally.
```

Measure whether this:

* bootstraps Material;
* remains deterministic;
* avoids a permanent free producer;
* creates an artificial "magic first building" rule.

Do not implement it.

---

# 3. Bootstrap matrix

For every model, test at least:

| Workers | Material | Well | Workshop | Expected question          |
| ------: | -------: | ---- | -------- | -------------------------- |
|       1 |        0 | no   | no       | can colony start?          |
|       1 |        0 | yes  | no       | can Water become useful?   |
|       1 |        0 | no   | yes      | can Workshop bootstrap?    |
|       2 |        0 | yes  | yes      | Water vs Workshop staffing |
|       2 |        0 | no   | yes      | deadlock or exemption?     |
|       3 |        0 | yes  | yes      | chain bootstrap            |
|       1 |        5 | no   | yes      | existing Material buffer   |
|       2 |        5 | no   | yes      | worker competition         |
|       3 |       25 | yes  | yes      | mature chain               |

Use the actual current starting population/housing semantics.

---

# 4. Opening-order audit

For every viable model, compare:

```text
Well first
Workshop first
Well + Workshop parallel
```

Where possible also compare:

```text
crew Well
crew Workshop
```

Measure:

* first Water;
* first Material;
* first additional Residence;
* first additional colonist;
* first stable Water/Material equilibrium.

The goal is not to determine an "optimal strategy".

The goal is to detect whether the bootstrap rule creates a **dominant artificial opening**.

Report factual differences only.

---

# 5. Permanent-free-producer test

For every model that avoids deadlock, deliberately delay the Well.

Test:

```text
Workshop exists
Workshop staffed
Well absent for 1 / 5 / 20 / 60 ticks
```

Measure cumulative Workshop output.

A valid candidate must make the Water dependency eventually matter.

Reject any rule where:

```text
Workshop can continue indefinitely without Water
```

unless the rule has an explicitly measured and justified finite bootstrap boundary.

---

# 6. Recovery audit

Force:

```text
Water = 0
```

after the colony has:

* one Workshop;
* one Well;
* two Workshops;
* multiple Wells.

Measure:

* Workshop output;
* Material stock;
* ability to recover Water;
* population;
* construction ability;
* whether the player can recover by reallocating workers.

Important:

A temporary Water shortage must not silently create an irreversible Material deadlock unless the current game rules genuinely leave no recovery path.

---

# 7. Construction Crew propagation

For each viable bootstrap model:

```text
no crew
vs
crew Well
vs
crew Workshop
```

Measure whether the one-tick construction advantage now propagates:

```text
construction
→ Water availability
→ Workshop production
→ Material
```

The exact question:

> Does completing the Well one tick earlier produce a measurable downstream advantage that survives beyond the original construction tick?

Also test the reverse:

> Does completing the Workshop one tick earlier produce a downstream advantage, or does it merely expose the bootstrap loophole earlier?

---

# 8. Long-run behavior

Run viable models for:

* 60 ticks;
* 120 ticks;
* 240 ticks;
* 600 ticks.

Track:

```text
Food
Water
Material
population
Farms
Workshops
Wells
Residence count
```

Identify:

* temporary bootstrap effect;
* persistent equilibrium change;
* stock oscillation;
* deadlock;
* runaway production;
* hidden free production.

Do not introduce new balancing rules during the audit.

---

# 9. Circularity

Explicitly verify:

```text
Water → Workshop → Material → Well
```

is not a runtime deadlock once the bootstrap rule is applied.

The intended graph may contain a construction dependency:

```text
Material
  → Well construction
  → Water
  → Workshop
  → Material
```

That is acceptable only if there is a concrete bootstrap root.

The report must identify that root.

Possible roots may include:

* initial Material;
* finite initial Water;
* finite bootstrap production;
* construction reward.

Do not assume one is acceptable without measurement.

---

# 10. Candidate evaluation

Score nothing and do not rank political-style.

Instead classify each model:

* **VALID** — resolves bootstrap cleanly;
* **VALID WITH COST** — resolves bootstrap but introduces a measurable tradeoff;
* **INVERTED** — resolves deadlock but creates a perverse opening;
* **DEADLOCK** — unrecoverable;
* **DUPLICATIVE** — merely clones an existing mechanic;
* **UNJUSTIFIED** — requires a rule not supported by current causal structure.

For every VALID / VALID WITH COST model, explain:

1. bootstrap root;
2. finite/infinite exemption;
3. recovery;
4. economic tradeoff;
5. Construction Crew propagation;
6. long-run behavior;
7. persistence implications.

---

# 11. Decision threshold

Do not choose a model simply because it works technically.

A model is a genuine implementation candidate only if all are true:

* no unrecoverable zero-Material bootstrap;
* no permanent free Workshop;
* no artificial hidden resource economy;
* no duplicate Water/Food gate;
* no new generic framework;
* meaningful Water ↔ Material workforce tradeoff remains;
* Construction Crew has at least a plausible downstream propagation path;
* long-run behavior remains bounded;
* recovery remains player-controlled.

If no model satisfies all criteria:

```text
NO IMPLEMENTATION CANDIDATE
```

is the correct result.

---

# 12. Files

Audit-only changes:

```text
tests/workshopWaterBootstrapAudit.test.ts
docs/roadmap/Step10AB.md
```

No `src/` changes.

No SAVE version change.

No production implementation.

---

# 13. Verification

Run:

1. focused bootstrap audit;
2. full Vitest;
3. typecheck;
4. lint;
5. build;
6. browser E2E;
7. GPU/browser verification;
8. deterministic replay;
9. insertion-order independence;
10. save/load equivalence where applicable;
11. `git diff -- src/`;
12. inspect final diff.

Expected:

```text
git diff -- src/
```

is empty.

---

# 14. Final report

Return:

```text
STEP 10AB — COMPLETE

Starting commit:
Final commit:

SRC CHANGES:
NONE

Model A — Strict:
classification:
bootstrap:
recovery:
long-run:
crew propagation:

Model B — First Workshop exemption:
classification:
bootstrap:
recovery:
long-run:
crew propagation:

Model C — Water reserve:
classification:
bootstrap:
recovery:
long-run:
crew propagation:

Model D — Well completion Water:
classification:
bootstrap:
recovery:
long-run:
crew propagation:

Model E — First Workshop batch:
classification:
bootstrap:
recovery:
long-run:
crew propagation:

Chosen model:
...

Why:
...

Why it is not a permanent free Workshop:
...

Bootstrap root:
...

Construction Crew downstream effect:
...

Next implementation step:
...
```

The decisive question is:

> Can `Workshop ← Water` become a real dependency without either deadlocking the colony or making the first Workshop effectively free forever?

If yes, identify the smallest concrete rule.

If no, stop the chain and return to the dependency graph rather than forcing Phase 8.

---

## As-Built / Audit Report

**Type: AUDIT (Step 10AB) — Workshop Water bootstrap.** `src/` is untouched
(`git diff -- src/` empty). Evidence comes from
`tests/workshopWaterBootstrapAudit.test.ts` (16 tests); every number below is a
real `AUDIT ...` line. Every model is an audit-only, phase-exact mirror of
`stepSimulation`, asserted byte-identical when the rule is disabled.

### Repository

* starting commit `80b42f4` (Step 10AA);
* production code changed: **none**;
* tests added: `tests/workshopWaterBootstrapAudit.test.ts` (16);
* docs changed: this file.

### Model A — strict from tick 1

`AUDIT MODEL_A_STRICT_MATRIX` (2 residences, 1 farm, 1 staffed Workshop, no
Well, Water 0):

| starting Material | Material ever rises? | max Material | staffed Workshops | Water |
| --- | --- | --- | --- | --- |
| 0 | **no** | 0 | 1 | 0 |
| 1 | **no** | 1 | 1 | 0 |
| 5 | **no** | 5 | 1 | 0 |
| 24 | **no** | 24 | 1 | 0 |
| 25 | **no** | 25 | 1 | 0 |

`AUDIT MODEL_A_ESCAPE_WITH_25`: a colony holding 25 Material can build the Well
itself and the chain starts — so the strict model is survivable **only while the
player keeps the price of a Well in the stock**. **Classification: DEADLOCK.**

### Model B — first Workshop exemption

`AUDIT FREE_PRODUCER_DELAYED_WELL` (Workshop staffed, Well deliberately absent):

| Well absent ticks | Material | staffed Workshops |
| --- | --- | --- |
| 1 | 1 | 1 |
| 5 | 5 | 1 |
| 20 | 20 | 1 |
| 60 | **24** | 1 |

The exemption never expires while no operational Well exists, so a Well-less
colony runs a free producer indefinitely; the stock saturates only because the
25-Material Workshop storage cap binds. Step 10AA's opening inversion is
reproduced by `AUDIT OPENING_ORDER`. **Classification: INVERTED** — both
`colonyExemption` and `firstWorkshopExemption` (identical whenever the colony
owns one Workshop, which is exactly the opening it must survive).

### Model C — first Water reserve

`AUDIT MODEL_C_WATER_RESERVE` (audit counterfactual on the initial stock):

| initial Water | free Workshop ticks | material end | staffed Workshops |
| --- | --- | --- | --- |
| 1 | 1 | 0 | 1 |
| 2 | 2 | 0 | 1 |
| 3 | 3 | 0 | 1 |
| 10 | 10 | 0 | 1 |

The reserve defers the deadlock by exactly its size and is hidden free Water; a
real implementation would need `INITIAL_WATER` changed (resource initialization
and every existing save). **Classification: UNJUSTIFIED.**

### Model D — Well completion grants Water

`AUDIT MODEL_D_WELL_COMPLETION_WATER`: the deadlock probe still reports
`recovered: false, maxMaterial: 0`. A grant needs a **completed** Well and a Well
needs 25 Material, so the bootstrap root is unchanged; the grant is also Water
produced outside production, bounded only by how many Wells are built.
**Classification: DEADLOCK.**

### Model E — first Workshop free batch

The free window is bounded in **time** (`state.time.tick < N`), but the deadlock
is a **stock** condition, so a colony that reaches 0 Material later still
deadlocks (`AUDIT EXPIRY_DIMENSIONS`: `freeBatch2` reaches material 0). It is
also a magic global rule. **Classification: DEADLOCK.**

### Model F — Material-floor exemption (added by this audit)

The only derived rule that tracks the actual deadlock condition: a staffed
Workshop is exempt while `Material < 25` (the price of a Well). Measured:
`materialFloor` saturates at 24 and then the input binds; a late 0-Material
colony is rescued the same way. It needs **no new persisted state** (derived
from the stock). Its cost is a bounded 25-Material free window — a hidden
subsidy. **Classification: VALID WITH COST.**

### Opening order, recovery, crew, long run

* `AUDIT OPENING_ORDER` (Well first vs Workshop first, injected producers, one
  colonist): under strict the Workshop-first opening yields no Material at all
  (`firstMaterialTick -1`, Water 0) while the Well-first opening yields Water at
  tick 1 — the dependency does make build order matter, but only under the rules
  that already deadlock or invert.
* `AUDIT RECOVERY_WATER_ZERO`: with one or two Workshops and one or two Wells,
  forcing Water to 0 leaves the population alive (Water is a growth gate, never
  survival) and every model recovers through player action (unstaff a Workshop,
  or build/keep Wells). Recovery is always player-controlled **except** in the
  strict model's zero-Material, no-Well state.
* `AUDIT CREW_PROPAGATION_BOOTSTRAP` (crew Well vs crew Workshop under strict):
  Material stays 0 in all three arms — with two staffed Wells the Water is fully
  consumed by the four served colonists, so the Workshop is never payable and
  the crew's saved tick has no downstream effect at all.
* `AUDIT LONG_RUN` (60/120/240/600 ticks with a Well present): the exemption
  models collapse onto strict (the input is active) and the long-run equilibria
  match; only the no-Well case differs — where the exemption never expires.

### Circularity and the bootstrap root

`AUDIT BOOTSTRAP_ROOT`:

```text
Water -> Workshop -> Material -> Well construction -> Water
```

The cycle closes on the **finite initial Material stock**. That is the only
runtime root the current model offers; every alternative root was measured and
rejected: finite initial Water (hidden free Water plus an initialization change),
finite bootstrap production (time-bounded in E, a 25-Material subsidy in F),
construction reward (needs a completed Well, so it cannot break the deadlock).

### Decision threshold

`AUDIT DECISION_THRESHOLD` — failing criteria per model:

| model | fails |
| --- | --- |
| A strict | no unrecoverable zero-Material bootstrap |
| B1 / B2 exemption | no permanent free Workshop; bounded long run |
| C water reserve | zero-Material bootstrap; hidden resource economy; player-controlled recovery |
| D well-completion grant | zero-Material bootstrap; hidden resource economy; player-controlled recovery |
| E free batch | zero-Material bootstrap; player-controlled recovery |
| F material floor | no artificial hidden resource economy |

```text
passingModels: []   ->   NO IMPLEMENTATION CANDIDATE
```

### Determinism

`AUDIT DETERMINISM`: replay stable, insertion-order stable, save/load
byte-stable, `SAVE_VERSION = 7`, and no `Date.now()`/`Math.random()` anywhere in
the audit. Per-model persistence impact: A/B1/B2/D/E/F need no new state; C
would require an initialization change.

### Verification

1. focused bootstrap audit — **16 passed**;
2. full Vitest — **54 files, 1105 tests passed**;
3. `tsc --noEmit` passed; 4. `eslint .` passed; 5. `npm run build` passed;
6. browser E2E — run, road, transport, production, resource, food, temporal,
   jobs, upkeep, reassign, water, crew all pass;
7. GPU E2E — ALL PASS;
8. deterministic audit replay stable; 9. insertion-order independence stable;
10. save/load equivalence stable; 11. `git diff -- src/` **empty**;
12. final diff inspected (two new files only).

### Commit

* Message: `Step 10AB: audit Workshop Water bootstrap`
* Parent: `80b42f4` (Step 10AA)

---

## Final report (Step 10AB)

```text
STEP 10AB — COMPLETE

Starting commit: 80b42f4 (Step 10AA)
Final commit:    this audit commit

SRC CHANGES:
NONE

Model A — Strict:
classification: DEADLOCK
bootstrap: no. With no operational Well there is no Water, so the staffed
  Workshop never produces: max Material stays at the starting stock for 0, 1, 5,
  24 and 25 Material over 40 ticks. The colony survives only while the player
  keeps the price of a Well (25) in reserve, and no rule enforces that.
recovery: none from 0 Material with no Well and no Workshop output: unstaffing,
  reassigning and building all require Material.
long-run: the colony freezes (population alive on Food, zero Material income).
crew propagation: none; the crew cannot act on a state that cannot construct.

Model B — First Workshop exemption:
classification: INVERTED
bootstrap: yes, but it never expires: 1/5/20/60 absent-Well ticks yield
  1/5/20/24 Material with the Workshop staffed the whole time (the stock
  saturates only because the 25-Material storage cap binds).
recovery: trivially safe, which is exactly the problem.
long-run: unbounded free production; the Water dependency never binds without a
  Well, so industry-before-Water is the optimal opening (Step 10AA §11).
crew propagation: none needed; the exemption already grants the output.

Model C — Water reserve:
classification: UNJUSTIFIED
bootstrap: only by exactly the reserve size (1/2/3 initial Water -> 1/2/3 free
  Workshop ticks), then the strict deadlock returns (materialEnd 0).
recovery: none after the reserve is spent.
long-run: identical to strict once the reserve is gone.
crew propagation: none.
cost: hidden free Water, and it requires changing INITIAL_WATER (resource
  initialization and every save), which the step forbids.

Model D — Well completion Water:
classification: DEADLOCK
bootstrap: no. The grant requires a completed Well; a Well requires 25 Material;
  the deadlock probe still reports recovered: false, maxMaterial: 0.
recovery: unchanged from strict.
long-run: Water outside production, bounded by the number of Wells built.
crew propagation: only after the chain already works, so it cannot bootstrap it.

Model E — First Workshop batch:
classification: DEADLOCK
bootstrap: no. The window is bounded in TIME while the deadlock is a STOCK
  condition: a colony reaching 0 Material after the window still deadlocks.
recovery: none after the window.
long-run: identical to strict after N ticks.
crew propagation: none.

Model F — Material-floor exemption (added by this audit):
classification: VALID WITH COST
bootstrap: yes, and fully derived (no new persisted state): a staffed Workshop is
  exempt while Material < 25, so the exemption expires exactly where the deadlock
  would occur (saturation at 24; a late 0-Material colony is rescued too).
recovery: player-controlled (unstaff a Workshop, or keep/build Wells).
long-run: bounded — the free window is at most 25 Material.
crew propagation: plausible in principle, not demonstrated.
cost: a bounded hidden subsidy of up to 25 Material per colony.

Chosen model:
NONE. NO IMPLEMENTATION CANDIDATE.

Why:
The decision threshold fails for every model: A/D/E deadlock, B1/B2 invert the
opening and never expire, C is hidden free Water plus an initialization change,
and F — the only derived, stock-bounded rule — is exactly the "artificial hidden
resource economy" the threshold forbids.

Why it is not a permanent free Workshop:
It cannot be avoided: every exemption derivable from existing state is a function
of "no operational Well exists" (unbounded in time) or "Material < 25" (a
subsidy). A finite exemption needs a counter, i.e. new persisted state, which the
hard constraints forbid — and Model E shows a time-bounded allowance still misses
late deadlocks.

Bootstrap root:
Water -> Workshop -> Material -> Well construction -> Water closes on the finite
initial Material stock (100) and nothing else. The only other producer is the
Farm, which needs no Material and therefore cannot feed the cycle; using Food as
the industrial input would duplicate the survival gate.

Construction Crew downstream effect:
None measurable here: under strict with the chain present, two staffed Wells are
fully consumed by the four served colonists, so the Workshop is never payable and
the crew's saved tick has no downstream consequence (firstMaterialTick -1 in
every arm). Step 10AA's bounded-propagation finding gets worse once the bootstrap
rule is enforced.

Next implementation step:
STOP the Workshop <- Water chain. Do not implement Phase 8 through a per-tick
producer input: with only three outputs, two of them (Water, Material) close a
construction cycle whose only root is the finite initial Material stock, and the
third (Food) duplicates the survival gate. Return to the dependency graph and
prefer a dependency that does not require an input to be consumed by a producer
Material itself must first build. The natural next audit is a construction-time
(one-off) Water requirement: it needs no exemption, cannot deadlock (a Workshop
already built keeps running), adds no hidden economy, and creates a real
Water-versus-growth decision at build time.
```
