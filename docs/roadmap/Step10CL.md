# Step 10CL — Growth Demand Investigation

## Role

You are continuing the NOVA deterministic contemplative colony-builder project.

This step is a **design investigation only**.

Do not implement gameplay, UI, persistence, commands, buildings, resources, progression stages, scenario mechanics, or new state unless this investigation reaches a concrete BUILD decision and the repository's existing evidence demonstrates that implementation is justified.

The purpose of this step is to answer one specific product question:

> **Once a colony reaches Town and is sustainable, what creates a meaningful demand for growth without turning NOVA into a resource treadmill?**

This is the first investigation after the Post-Town Product Direction Gate where a new mechanic may potentially be justified.

Do not assume that a mechanic exists merely because the product direction says "growth".

---

# 1. Read the existing product decisions first

Before changing anything, inspect the repository and read at minimum:

- `docs/roadmap/STEP10CK.md`
- `docs/roadmap/STEP10CJ.md`
- `docs/roadmap/STEP10CI.md`
- `docs/roadmap/STEP10CH.md`
- `docs/roadmap/STEP10CG.md`
- `docs/roadmap/STEP10CF.md`
- `docs/roadmap/STEP10CE.md`
- `docs/roadmap/STEP10CA.md`
- `docs/roadmap/STEP10BZ.md`
- `docs/roadmap/STEP10BY.md`

Also inspect the current implementation relevant to:

- population admission/growth;
- Town progression;
- Food;
- Water;
- Material;
- Workshop;
- workforce assignment;
- roads and accessibility;
- scenario architecture;
- world configuration;
- save/load;
- deterministic hashing;
- objective/progression queries;
- existing tests around growth/admission/Town.

Do not rely only on the roadmap documents. Verify important conclusions against the current source code.

---

# 2. Reconstruct the actual current growth model

Document what growth currently means mechanically.

Answer with concrete repository evidence:

### Population

- How is population represented?
- How does a new colonist enter the settlement?
- What currently limits admission?
- Is admission automatic, manual, scenario-driven, or derived?
- Which existing state variables affect admission?

### Capacity

Inspect the current admission/capacity relationship.

Determine:

- current population capacity;
- how Food relates to population;
- how Water relates to population;
- whether buildings create population capacity;
- whether housing exists as a true growth mechanism or merely as an admission constraint;
- whether capacity is permanent, temporary, or derived.

### Town

Determine exactly what Town certifies today.

Especially distinguish:

- "the colony is sustainable at its current population"
from
- "the colony has a reason to become larger."

Do not conflate those two.

---

# 3. Identify the actual post-Town vacuum

Reproduce the current product loop conceptually from:

```text
Wilderness
  ↓
resource production
  ↓
workforce allocation
  ↓
spatial/accessibility decisions
  ↓
sustainable settlement
  ↓
Town
```

Then inspect what happens after Town.

Answer:

1. What can the player still optimize?
2. What can the player still break?
3. What can the player still repair?
4. What can the player actually want to achieve after becoming sustainable?
5. What existing system generates pressure to increase population?
6. What existing system generates pressure to construct additional productive capacity?
7. What existing system generates pressure to expand spatially?
8. What existing system generates pressure to reorganize workforce?
9. If the player does nothing after Town, what changes over time?

The answer must be based on the current simulation, not on assumptions about what a city-builder "should" do.

---

# 4. Investigate candidate sources of growth demand

Explore possible sources of demand **using existing NOVA concepts first**.

At minimum investigate these dimensions:

## A. Internal settlement demand

Could growth be justified by an internal need such as:

- additional productive capacity;
- workforce specialization;
- housing/capacity pressure;
- maintaining production while reallocating workers;
- spatial constraints;
- accessibility constraints;
- balancing Food / Water / Material;
- increasing resilience rather than merely increasing stock.

Determine whether any of these produces a genuinely new decision after Town.

---

## B. Population-driven demand

Ask whether increasing population itself can create meaningful new pressure.

For example:

```text
more population
→ more needs
→ different workforce allocation
→ different building requirements
→ different spatial constraints
```

But do NOT assume this is automatically good.

Determine whether the current systems can produce a real decision frontier, or whether this merely creates a mathematical resource treadmill.

---

## C. Settlement-scale demand

Investigate whether the existing systems imply a natural reason for the settlement to become spatially larger.

Examples to examine conceptually:

- existing 12×12 world constraints;
- road/accessibility structure;
- building placement;
- workforce distribution;
- capacity constraints;
- increasing distance between residences/workplaces;
- network fragmentation.

Do not introduce transport, money, pollution, zoning, or other new systems merely to manufacture this pressure.

---

## D. Scenario-driven demand

10CI introduced authored Town goals.

Determine whether scenarios can create post-Town demand without changing the simulation.

Important distinction:

```text
A scenario can ask the player to achieve something.
```

versus

```text
The simulation itself gives the player a reason to grow.
```

Assess whether scenario goals alone can solve the product problem, or whether they would merely disguise the absence of an underlying growth loop.

---

## E. External/world demand

Investigate whether NOVA currently has any documented world/external context that could create demand.

Use repository evidence only.

Do not resurrect undocumented concepts merely because they appeared in old brainstorming.

In particular:

- do not invent an external faction;
- do not invent trade;
- do not invent missions;
- do not invent narrative visitors;
- do not invent planetary events;
- do not invent Prometheus/mystery mechanics unless they actually exist in current product documentation.

If the current product has no external demand model, explicitly state that.

---

# 5. Distinguish growth from a resource treadmill

This distinction is critical.

For every plausible demand source, ask:

### Does it create a decision?

or merely:

### Does it create a larger number to fill?

Reject designs whose core loop is:

```text
produce more
→ consume more
→ produce more
→ consume more
→ repeat
```

unless the investigation can demonstrate a new qualitative decision.

A valid growth pressure should ideally create a meaningful interaction between existing systems.

For example:

```text
population growth
→ workforce changes
→ production trade-off
→ spatial/accessibility consequences
→ player chooses how to adapt
```

This is qualitatively different from:

```text
population growth
→ +1 Food required
→ build Farm
→ repeat
```

Do not assume either model is valid until the repository evidence supports it.

---

# 6. Search for a minimum viable growth representation

If a real demand exists, determine the **smallest representation** capable of expressing it.

Do not design a full city system.

Explicitly evaluate whether the minimum representation could be:

- derived state;
- an extension of existing capacity;
- an existing building gaining a new role;
- an existing progression condition;
- a new demand value;
- a new population threshold;
- a new spatial constraint;
- a scenario-only construct;
- or no new state at all.

For each candidate, identify:

- what new information must exist;
- whether it must be persisted;
- whether it changes `SAVE_VERSION`;
- whether it changes hashing;
- whether it changes commands;
- whether it changes simulation ticks;
- whether it changes existing production;
- whether it introduces a new player decision.

Prefer derived state and existing primitives when they can express the concept honestly.

Do not force a derived implementation if the concept genuinely requires state.

---

# 7. Test whether the current simulation already contains latent growth pressure

This is an investigation, not a theoretical design exercise.

Build small deterministic fixtures mentally and/or through tests/scripts where useful.

At minimum inspect states around:

- population 4;
- population 5;
- population 6+ where the current model permits it;
- balanced Food/Water/Material;
- Food-tight;
- Water-tight;
- Material-tight;
- Workshop-heavy;
- Farm-heavy;
- Well-heavy;
- spatially split road networks;
- operational Workshop with/without access.

For each state determine:

- what happens if population increases;
- what becomes constrained first;
- whether the constraint creates a new decision;
- whether that decision is already solved by workforce reassignment;
- whether spatial placement changes the decision;
- whether the resulting problem is qualitatively different from the current Village/Town problem.

Do not manufacture a conclusion.

If population growth merely repeats existing allocation decisions at larger scale, say so.

---

# 8. Evaluate the growth question against the frozen simulation contracts

The simulation contracts remain frozen.

Current expectations include:

- deterministic simulation;
- deterministic derived queries;
- deterministic hashing;
- insertion-order determinism;
- save/load continuation;
- canonical workforce assignments;
- production/resource consistency;
- command rejection/no-op semantics;
- Town progression semantics.

Do not modify these contracts during this step.

If a proposed growth mechanic would require breaking or substantially rewriting one of them, identify that as a design cost rather than silently adapting the architecture.

Current `SAVE_VERSION` is expected to remain:

```text
8
```

for this investigation.

---

# 9. Identify the smallest genuine post-Town problem

The investigation must eventually answer:

> **What is the first genuinely new problem the player should have to solve after Town?**

Not:

- "build more buildings";
- "get more resources";
- "reach a bigger number";
- "unlock City";
- "expand because city-builders expand."

Instead describe the actual problem in player/system terms.

Use a formulation such as:

```text
The player has achieved X.

Existing systems now create Y.

Y cannot be resolved by simply repeating the existing Village/Town decision.

Therefore the player must decide Z.
```

If you cannot honestly complete this chain, that is important evidence.

---

# 10. Compare candidate directions without ranking them

Identify at least 2–4 plausible demand directions if the evidence supports that many.

For each, document:

- source of demand;
- player problem;
- existing systems involved;
- new state required;
- new command required;
- persistence impact;
- simulation impact;
- spatial impact;
- deterministic impact;
- whether it creates a genuinely new decision;
- whether it risks becoming a treadmill;
- minimum implementation footprint;
- what would need to be tested.

Do NOT assign scores.

Do NOT rank them.

Do NOT select a "winner" using a numeric rubric.

The purpose is to expose the design trade-offs clearly.

---

# 11. BUILD / DEFER gate

End the investigation with exactly one of these conclusions:

## BUILD

Use BUILD only if the evidence demonstrates:

1. a concrete post-Town demand;
2. a qualitatively new player decision;
3. a clear relationship to existing NOVA systems;
4. a minimal representation;
5. an implementation boundary that can be specified precisely;
6. no need for speculative parallel systems.

If BUILD is justified, specify:

- the exact mechanic;
- the minimum state;
- whether it is derived or persisted;
- commands;
- tick behavior;
- affected queries;
- affected UI surfaces;
- save/hash implications;
- focused test plan;
- browser/GPU validation requirements;
- the exact next implementation step.

Do not implement it in 10CL.

The implementation belongs to the next step.

---

## DEFER

Use DEFER if the investigation finds that:

- current population growth only repeats existing resource/workforce pressure;
- no new qualitative decision emerges;
- proposed mechanics require speculative systems;
- growth would currently become a treadmill;
- or the product does not yet contain enough structure to justify a growth mechanic.

If DEFER is justified, explicitly state:

- what evidence is missing;
- what current system should be investigated next;
- what condition would make growth mechanically justified;
- whether the product direction should remain frozen.

Do not invent another mechanic merely to avoid DEFER.

---

# 12. Anti-feature audit

Explicitly reject premature additions such as:

- City tier;
- money;
- taxes;
- commerce;
- trade;
- transport;
- vehicles;
- pollution;
- zoning;
- happiness;
- prestige;
- quests;
- timers;
- random events;
- procedural disasters;
- automation;
- population quotas;
- arbitrary stock thresholds;
- decorative buildings with no systemic role;
- a generic "growth meter";
- a second objective/quest framework;
- new resources whose only purpose is to create scarcity.

Explain why each rejected category is premature **for the current product state**.

Do not turn the anti-feature list into a roadmap.

---

# 13. Product-direction check

Re-evaluate the conclusion against the documented product identity:

> deterministic contemplative colony optimizer

and the 10CK direction:

> demand-driven settlement growth through existing systems first.

Ask:

- Does the proposed demand preserve the contemplative character?
- Does it preserve optimization rather than management busywork?
- Does it deepen existing systems rather than replace them?
- Does it create a new question for the player?
- Does it preserve the clean deterministic model?
- Does it avoid turning NOVA into a generic city-builder?

If the answer is no, say so.

---

# 14. Documentation

Create:

```text
docs/roadmap/STEP10CL.md
```

The document must contain:

1. Context from 10CK.
2. Current growth model.
3. Current post-Town state.
4. Evidence from actual source code.
5. Population/capacity investigation.
6. Existing-system demand investigation.
7. Candidate demand directions.
8. Growth-vs-treadmill analysis.
9. Minimum representation analysis.
10. Determinism/persistence impact.
11. BUILD / DEFER decision.
12. Exact next step if BUILD.
13. Conditions for future reconsideration if DEFER.
14. Anti-feature audit.
15. Validation performed.
16. Final scope statement.

Do not create additional roadmap documents.

---

# 15. Testing / validation

Because this is a design investigation:

### Required

- inspect existing tests relevant to population/growth/admission/Town;
- if useful, add narrowly scoped **measurement/audit tests only**;
- do not add product behavior tests for an unimplemented mechanic;
- run any new focused audit tests;
- run relevant existing compatibility tests;
- run full Vitest if tests were changed;
- run typecheck;
- run lint;
- run build;
- run the repository diff/scope audit.

### Browser/GPU

If no runtime/UI code changes:

- browser E2E is optional and should normally be skipped;
- GPU/WebGL2 validation should be skipped.

If you discover an existing UI behavior that must be verified to support the investigation, inspect it without modifying it.

Do not touch rendering solely to produce a validation result.

---

# 16. Scope protection

Do NOT:

- implement the growth mechanic;
- add City;
- add new buildings;
- add new resources;
- add new commands;
- change production ratios;
- change population rules;
- change Town rules;
- change scenarios;
- change persistence;
- change SAVE_VERSION;
- refactor architecture;
- redesign UI;
- modify rendering;
- add automation;
- add transport;
- add narrative systems;
- "improve" unrelated code.

The only expected product artifact is the investigation document and, if genuinely necessary, narrowly scoped measurement tests.

---

# 17. User-owned files

Do not modify these files:

```text
docs/roadmap/Step10BO - Copy.md
docs/roadmap/Step10BT.md
```

Do not rename, normalize, delete, or rewrite them.

---

# 18. Final report

At the end, provide a concise but evidence-based report containing:

### Investigation result
- BUILD or DEFER.

### Current growth model
- exact current behavior.

### Post-Town problem
- exact identified gap.

### Demand finding
- what can/cannot currently create growth demand.

### Candidate directions
- concise factual comparison, without ranking.

### Minimum representation
- only if BUILD is justified.

### Simulation impact
- state / commands / tick / persistence / hashing.

### Validation
- focused tests;
- compatibility tests;
- full Vitest;
- typecheck;
- lint;
- build;
- diff audit.

### Files changed
- exact list.

### Commit

If the investigation completed successfully, create exactly one commit:

```text
Step 10CL: Growth Demand Investigation
```

Do not push unless explicitly instructed.

The final report must clearly distinguish:

- observed repository facts;
- measured results;
- design interpretation;
- BUILD / DEFER conclusion.

Do not claim a mechanic is justified unless the investigation actually demonstrates a new post-Town decision.

---

# Documentation (as-built)

## 1. Context from 10CK

10CK CONTINUED toward demand-driven settlement growth and ordered a
Growth Demand Investigation ending in a build/defer gate. This step is
that investigation. (Prompt asks for `STEP10CL.md`; appended here instead
— case-insensitive FS, dual-purpose convention.)

## 2. Current growth model (repository facts)

- Population: automatic admission each tick (`updatePopulation`,
  `phases.ts`): a colonist arrives while food stock > 0 AND a vacant
  Water-served residence exists AND Water production headroom sustains the
  resulting served population (10S invariant). Zero colonists exempt
  (bootstrap). Food starvation wipes all colonists same-tick.
- Capacity: derived, never persisted. Food need = 1/colonist; water
  capacity = 2 per staffed road-accessible Well; housing 1:1, consumed in
  ascending id order. Residences are an admission constraint, not a growth
  engine — nothing demands a new resident.
- Storage is capped (food 50 / water 30 / material 40 + 25 per operational
  Workshop; 10BG/10BH/10BJ): surplus production is wasted, not banked.
- Town certifies "sustainable at current population" (staffed Workshop +
  Water capacity + Food balance). It says nothing about becoming larger.

## 3. Current post-Town state (answers to §3)

1. Optimize: re-balance the same 3-way allocation at larger scale.
2. Break: starve by over-expanding residences beyond Water headroom.
3. Repair: the same build/reassign repertoire.
4. Want: nothing authored — scenarios end at Town (10CJ STOP).
5–8. No system pressures population, productive capacity, spatial
expansion, or workforce reorganization: all needs are met at Town by
definition, and every lever just re-scales the solved tradeoff.
9. Doing nothing: nothing changes — stable stocks, stable stage.

## 4. Evidence from source code

Admission gate (`phases.ts:998-1080`), Town conditions
(`progression.ts`), storage caps (`storage.ts:27-32`, `resource.ts:58`),
workshop upkeep, distance/ID auto-assignment — all inspected, not assumed.

## 5. Population/capacity investigation (measured)

New `tests/growthDemandMeasurement.test.ts` (7 tests) on exact-balance
colonies (P residences, P/2 Farms, P/2 Wells, 1 vacant Workshop):

- P=4/6/8/10: every colonist consumed by survival work — zero slack, food
  net 0, water capacity exactly P. The Workshop stays vacant.
- +1 population shock (P=8→9): drops below Town; newcomer auto-absorbed by
  the Workshop (no Food gain). Recovery = build 5th Farm (real command) +
  reassign a Well worker onto it (real command) → food 10/9, Village. The
  known repertoire, repeated larger — measured, tick-exact.
- Surplus workplaces stay vacant without the growth that would consume
  their output: +2 served Farms add zero food at full employment, and the
  extra workers needed would eat exactly their output. Growth is
  self-consuming; no slack dimension exists.

## 6. Existing-system demand investigation

- A (internal): crew/construction prioritization, specialization, resilience
  — same decisions, bigger numbers. No new decision.
- B (population): linear self-consuming scaling (measured §5) — a
  mathematical treadmill, rejected.
- C (settlement-scale): 12×12 has headroom; split networks are validity
  constraints solved by roads (10CF). No scale break found through P=12
  (prior audits) and P=4–10 here.
- D (scenario-driven): scenarios can ASK for growth but the loop stays
  linear — disguise, not a loop. 10CJ STOP stands.
- E (external): no world/external demand model exists in the docs;
  inventing factions/trade/events/narrative would manufacture scope.
  Explicitly: none.

## 7. Candidate demand directions (trade-offs, no ranking)

1. Internal efficiency pressure — existing systems only, but no new
   decision; treadmill risk high; footprint zero (nothing to build).
2. Population scaling — automatic via housing/water; self-consuming
   (measured); treadmill certain; footprint zero.
3. Spatial expansion pressure — headroom exists, constraints solvable by
   roads; no evidence of a strategy-level problem; footprint speculative.
4. Scenario-framed growth goals — no sim change, but repackages linearity;
   contradicts 10CJ STOP unless the loop underneath changes first.

## 8. Growth-vs-treadmill analysis

Every plausible source reduces to `produce more → consume more → repeat`
with no qualitative interaction: each added colonist consumes exactly the
labor that sustains them (zero-slack measurement), capped stocks remove
even accumulation purpose, and shocks resolve through the existing
repertoire. No candidate passes the "new decision" bar.

## 9. Minimum representation analysis

Moot: with no justified demand, no representation — derived or persisted —
is proposed. For the record, any future demand would have to create slack
or sinks, which the current economy structurally lacks.

## 10. Determinism/persistence impact

None: no mechanic proposed. SAVE_VERSION remains 8; hashing, commands,
ticks, queries untouched.

## 11. BUILD / DEFER decision

```text
DEFER — population growth only repeats existing resource/workforce
pressure at larger scale (measured zero-slack scaling + shock recovery
through the existing repertoire); no new qualitative decision emerges;
all non-treadmill candidates require speculative systems.
```

## 12. Exact next step if BUILD

N/A (DEFER).

## 13. Conditions for future reconsideration (DEFER terms)

- Missing evidence: a scale-induced qualitative break — a population where
  reallocation provably cannot restore balance (measured false through
  P=12 + P=4–10 here), or a player-visible sink/demand in current systems.
- Next system to investigate: none ordered; the growth question stays
  closed until such evidence appears. Scenario-layer work stays stopped
  per 10CJ.
- Justification condition: demonstrated new post-Town decision surviving
  all existing controls (the 10CF standard).
- Product direction: 10CK growth direction remains the standing intent but
  unfunded — frozen, not abandoned.

## 14. Anti-feature audit

City/money/taxes/commerce/trade/transport/vehicles/pollution/zoning/
happiness/prestige/quests/timers/random events/disasters/automation/
quotas/stock thresholds/decorative buildings/growth meters/second quest
framework/new scarcity resources: all premature — each assumes the demand
this investigation could not demonstrate, or smuggles a parallel game past
the complexity budget. Rejected as scope, not roadmaped.

## 15. Validation performed

- Focused new suite: 7/7 PASS.
- Full Vitest: 1741/1743 per run; the only failures are migrating
  5-second default-timeout flakes in pre-existing expensive tests
  (industrialHeadroomTownDecision, settlementGrowthShelterAudit,
  waterConstructionWorkforcePressureAudit — 600-tick/shadow class from
  10CC). All pass in isolation (15 + 34 + 41 green). Untouched per the
  no-shortcut rule; reported as known load flakiness.
- Typecheck: PASS. Lint: PASS. Build: PASS (pre-existing chunk warning).
- Browser/GPU: skipped per §15 (no runtime/UI change).
- `git diff --check`: clean. SAVE_VERSION 8 verified unchanged.
- Scope: no gameplay/UI/persistence/scenario/simulation change; one new
  measurement test file + this doc.

## 16. Final scope statement

Investigation only. One audit test file added; zero production lines
changed; growth mechanic DEFERRED with explicit reconsideration terms.

## Files changed

- `tests/growthDemandMeasurement.test.ts` (new, 7 measurement tests)
- `docs/roadmap/Step10CL.md` (prompt + this as-built)
