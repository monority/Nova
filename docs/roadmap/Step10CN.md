# Step 10CN — Post-Town Product Reorientation Gate

## Role

You are continuing the NOVA deterministic contemplative colony-builder project.

This is a **product-direction gate**, not an implementation step.

The purpose of this step is to answer:

> **Now that both internal growth demand and external/world demand have been investigated and deferred, what is the next real product problem NOVA should solve — if any?**

Do not assume there must be a next mechanic.

Do not create another speculative system.

Do not continue the audit loop merely because the roadmap needs another step.

The possible outcomes are:

```text
CONTINUE
REDIRECT
FREEZE
```

Where:

- **CONTINUE** = the current product direction remains valid and one concrete next product problem is sufficiently demonstrated.
- **REDIRECT** = the current direction is no longer the best description of the actual product, and a different concrete product direction is justified.
- **FREEZE** = the current product is coherent enough that no additional product direction is currently justified by repository evidence.

This step must determine which of those conclusions is actually supported.

---

# 1. Read the complete decision chain

Before reaching any conclusion, read:

- `docs/roadmap/STEP10CM.md`
- `docs/roadmap/STEP10CL.md`
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

Also inspect the current repository implementation.

Do not rely exclusively on roadmap summaries.

---

# 2. Reconstruct the actual product

Describe the current NOVA product from implementation evidence.

Do not describe the product from aspiration alone.

Reconstruct the actual player experience:

```text
starting state
    ↓
resource production
    ↓
workforce decisions
    ↓
building placement
    ↓
roads / accessibility
    ↓
population / capacity
    ↓
Town
    ↓
scenario completion / free play
```

Determine:

- what the player actually does;
- what decisions they actually make;
- what consequences they actually observe;
- what can fail;
- what can recover;
- what is deterministic;
- what is authored;
- what remains unchanged after Town.

---

# 3. Reconcile the product direction with the evidence

10CK established:

> Town is a first major phase boundary.

10CL established:

> Internal growth does not currently create a qualitatively new decision.

10CM established:

> No external/world demand currently exists, and introducing one would currently be speculative.

10CJ established:

> The Town scenario experience is meaningful and legible; no scenario-system change is justified.

Treat these as established evidence unless current source inspection reveals a contradiction.

Now answer:

> **What does NOVA actually have enough structure to become today?**

Do not assume the answer is "a larger city-builder."

---

# 4. Examine all remaining product dimensions

Investigate each dimension below.

Do not score or rank them.

The goal is to determine whether each represents:

- an actual current product problem;
- an already-solved problem;
- an underdeveloped opportunity;
- or a speculative direction.

---

## A. Simulation Depth

Inspect whether existing systems still contain meaningful unresolved interactions.

Examine:

- Food;
- Water;
- Material;
- Workshop;
- workforce allocation;
- population;
- capacity;
- roads;
- accessibility;
- production;
- stock limits;
- temporal behavior.

Ask:

> Is there a qualitatively new decision available inside the existing simulation without adding another system?

If yes, describe it precisely.

If no, state why.

Do not manufacture complexity by adding additional resources or coefficients.

---

## B. Spatial Composition

NOVA is fundamentally a spatial settlement optimizer.

Investigate whether the current spatial layer is sufficiently expressive.

Examine:

- 12×12 grid;
- building placement;
- roads;
- road networks;
- accessibility;
- residence/workplace relationships;
- network fragmentation;
- available space;
- placement constraints.

Ask:

> Is the player currently designing a settlement, or merely satisfying binary placement/accessibility constraints?

This distinction is important.

If spatial composition is already meaningful, demonstrate how.

If it is underdeveloped, identify the smallest **existing-system** improvement that would make composition meaningful without introducing a generic city-building system.

Do not add zoning, traffic, pollution, decoration bonuses, or adjacency systems unless actual evidence requires them.

---

## C. Settlement Design

Inspect whether NOVA currently allows the player to make meaningful choices about settlement structure.

Consider:

- where residences go;
- where production goes;
- road layout;
- network structure;
- workforce distribution;
- density;
- expansion within the 12×12 board.

Ask:

> Does the player have a coherent settlement-design problem, or only a constraint-satisfaction problem?

If the latter, determine whether this is a real product deficiency or simply the intended minimalist design.

Do not assume more complexity is automatically better.

---

## D. Goals / Scenarios

10CI added three Town scenarios.

10CJ found them:

- discoverable;
- distinct;
- causally understandable;
- player-controlled within their constraints;
- canonical in their Town completion;
- sufficiently meaningful;
- not requiring scenario-system changes.

Investigate what this means for the product as a whole.

Ask:

- Are scenarios currently the product's authored challenge layer?
- Can the current scenario architecture express enough meaningful situations?
- Would additional scenarios create depth or merely repetition?
- Is the product becoming a scenario/puzzle colony optimizer rather than a continuous city-builder?
- Does that identity remain coherent?

Do not add scenarios in 10CN.

---

## E. Progression

Inspect:

- Village;
- Town;
- progression conditions;
- progression UI;
- scenario endpoints.

Ask:

> Is progression itself currently a product problem?

If Town is a deliberate phase boundary, determine whether another stage is actually justified.

Do not propose City simply because Town exists.

A new stage must represent a genuinely new product dimension, not a larger number.

---

## F. Presentation / Atmosphere

NOVA has a deliberately contemplative, dark, futuristic-maquette presentation.

Inspect the actual product.

Determine whether:

- the presentation currently communicates the settlement;
- spatial relationships are readable;
- important consequences are legible;
- the visual language supports contemplation;
- the UI is coherent;
- there is an actual presentation problem blocking the product.

Do not turn this into a visual-polish backlog.

Only identify presentation as the next direction if the evidence demonstrates that presentation currently limits the product experience.

---

## G. World / Discovery

10CM demonstrated:

- no external world model;
- no external actors;
- no external demand;
- homogeneous cells;
- immutable board;
- no documented world/discovery system.

Do not reopen this branch unless current source inspection reveals contradictory evidence.

Ask only:

> Does the absence of world content currently prevent the product from functioning as the intended experience?

If not, do not invent world content.

---

## H. Continuous Play

This dimension is particularly important.

After Town, determine:

- what the player can still do;
- whether free play has meaningful decisions;
- whether existing systems remain active;
- whether the player can meaningfully optimize further;
- whether the product naturally terminates;
- whether termination is a defect or a deliberate boundary.

Do not assume that every game needs indefinite play.

Ask:

> Is NOVA currently a short authored optimization experience, a settlement sandbox, or an incomplete continuous game?

Base the answer on actual implementation and documentation.

---

# 5. Separate "missing" from "not required"

This is a critical gate.

For every apparent absence, distinguish:

### Missing

The product promises or requires it, but it is not implemented.

### Not required

The product can coherently function without it.

### Speculative

It could be interesting, but there is not enough evidence to justify it.

Use concrete evidence.

Do not convert every absence into a backlog item.

---

# 6. Revisit the original product vision

Inspect the original project documentation and roadmap.

Identify what the product explicitly promises.

Compare:

```text
documented promise
```

against:

```text
implemented reality
```

Then classify the differences:

- fulfilled;
- partially fulfilled;
- deferred;
- obsolete;
- unsupported by current direction.

Do not revive old ideas merely because they are written somewhere.

If an old concept conflicts with the current evidence chain, document the conflict rather than silently restoring it.

---

# 7. Determine the current product identity

Based on all evidence, formulate the most accurate current product identity.

It should describe what NOVA **actually is**, not what it might eventually become.

For example, only if supported by evidence:

```text
A deterministic contemplative colony optimizer where the player
solves increasingly constrained settlement layouts and workforce
allocations through authored settlement scenarios.
```

Do not copy this example automatically.

Construct the description from the repository.

---

# 8. Identify the actual product ceiling

Answer:

> **What is the first thing that prevents the current product from becoming a stronger version of what it already is?**

Potential answers include:

- insufficient spatial expressiveness;
- insufficient scenario variety;
- weak settlement composition;
- unclear player feedback;
- lack of continuous purpose;
- insufficient simulation depth;
- presentation limits;
- missing progression;
- no real problem at all.

But do not choose one without evidence.

If there is no meaningful ceiling yet, that is a valid conclusion.

---

# 9. Avoid the "bigger game" trap

Explicitly test proposed directions against this failure mode:

```text
Town
  ↓
City
  ↓
Metro
  ↓
more resources
  ↓
more buildings
  ↓
more systems
  ↓
more UI
```

This is not automatically product growth.

Ask whether the proposed direction:

- deepens the existing experience;
- introduces a new decision;
- improves the existing spatial/planning problem;
- or merely increases scale.

Reject scale for scale's sake.

---

# 10. Identify candidate next directions

If the evidence reveals genuine product problems, identify **2–4 candidate directions**.

Candidates may include:

- spatial composition;
- scenario depth;
- settlement-design depth;
- simulation interaction;
- presentation/readability;
- continuous play;
- progression;
- another direction supported by repository evidence.

For each candidate describe:

- actual problem;
- evidence;
- player-facing consequence;
- affected systems;
- new state required;
- implementation scope;
- architectural impact;
- persistence impact;
- deterministic impact;
- why it belongs to the current product.

Do not score or rank them.

Do not declare a winner.

---

# 11. Determine whether a next step is actually justified

A direction is actionable only if:

1. The problem exists in the current product.
2. The problem is visible to the player.
3. Solving it would improve the existing product identity.
4. The solution can be bounded.
5. It does not require several speculative systems simultaneously.
6. It does not merely increase numerical scale.
7. It can be expressed as a concrete next workstream.

If none satisfies these conditions:

> **FREEZE**

is the correct outcome.

Do not invent work.

---

# 12. CONTINUE / REDIRECT / FREEZE gate

End the investigation with exactly one outcome.

## CONTINUE

Choose CONTINUE when:

- the current product direction remains coherent;
- a concrete unresolved product problem exists;
- the problem can be addressed without speculative parallel systems.

Define:

- exact product problem;
- next workstream;
- minimum meaningful next step;
- explicit non-goals.

Do not implement it.

---

## REDIRECT

Choose REDIRECT only if:

- the current documented direction no longer accurately describes the product;
- another product identity is better supported by evidence;
- that alternative is concrete enough to guide implementation.

Define:

- current identity;
- evidence for the mismatch;
- new identity;
- exact next workstream;
- what existing direction should be frozen.

Do not implement the redirect.

---

## FREEZE

Choose FREEZE if:

- the current product is coherent;
- remaining gaps are speculative;
- no next direction is sufficiently demonstrated;
- additional mechanics would currently be feature invention rather than problem solving.

If FREEZE:

Document:

- what is complete;
- what remains intentionally absent;
- why those absences are not currently defects;
- what concrete evidence would justify reopening development;
- which existing foundations should remain frozen.

FREEZE is a legitimate product decision, not a failure state.

---

# 13. Anti-feature audit

Explicitly reject premature expansion such as:

- City stage;
- more resources;
- money;
- trade;
- diplomacy;
- transport;
- traffic;
- pollution;
- happiness;
- prestige;
- technology trees;
- automation;
- random events;
- disasters;
- NPC simulation;
- quest frameworks;
- world simulation;
- procedural generation;
- larger maps;
- arbitrary unlock trees;
- generic progression layers;
- resource sinks without decisions.

Only retain one of these if repository evidence independently demonstrates that it solves an actual current product problem.

Do not create a future roadmap from rejected features.

---

# 14. Architecture and simulation protection

Unless the investigation explicitly proves otherwise, preserve:

- deterministic simulation;
- canonical workforce semantics;
- Food / Water / Material rules;
- roads/accessibility;
- Town progression;
- scenario semantics;
- save/load;
- deterministic hashing;
- command boundaries.

Current expected:

```text
SAVE_VERSION = 8
```

Do not change it during this step.

Do not implement anything.

---

# 15. User-owned files

Do not modify:

```text
docs/roadmap/Step10BO - Copy.md
docs/roadmap/Step10BT.md
```

Do not rename, normalize, delete, or rewrite them.

---

# 16. Documentation

Create exactly:

```text
docs/roadmap/STEP10CN.md
```

The document must contain:

1. Context from 10CK.
2. Evidence from 10CL.
3. Evidence from 10CM.
4. Current product reconstruction.
5. Current product identity.
6. Product vision reconciliation.
7. Simulation-depth assessment.
8. Spatial-composition assessment.
9. Settlement-design assessment.
10. Goals/scenarios assessment.
11. Progression assessment.
12. Presentation/atmosphere assessment.
13. World/discovery assessment.
14. Continuous-play assessment.
15. Missing vs not-required vs speculative classification.
16. Product ceiling.
17. Candidate directions, without ranking.
18. CONTINUE / REDIRECT / FREEZE decision.
19. Exact next workstream if applicable.
20. Anti-feature audit.
21. Validation.
22. Final scope statement.

Do not create additional roadmap documents.

---

# 17. Testing / validation

This is a design gate.

### Required

Inspect relevant implementation and tests.

If useful, create narrowly scoped measurement/audit tests.

Do not implement product behavior.

If tests change:

- run focused tests;
- relevant compatibility tests;
- full Vitest;
- typecheck;
- lint;
- build;
- diff-check.

If no runtime/UI changes:

- browser E2E may be skipped;
- GPU/WebGL2 validation should be skipped.

Do not modify runtime code merely to obtain validation.

---

# 18. Final report

Provide a concise evidence-based report containing:

### Product identity
What NOVA actually is today.

### Current product state
What is implemented and working.

### Product ceiling
The first demonstrated limitation, if one exists.

### Candidate directions
Factual comparison without ranking.

### Decision
Exactly one:

```text
CONTINUE
REDIRECT
FREEZE
```

### Next workstream
Only if justified.

### Explicitly frozen areas
What must not be touched.

### Validation
- focused tests;
- compatibility tests;
- full Vitest;
- typecheck;
- lint;
- build;
- diff-check.

### Files changed
Exact list.

### Commit

If the investigation completes successfully, create exactly one commit:

```text
Step 10CN: Post-Town Product Reorientation Gate
```

Do not push unless explicitly instructed.

The final report must clearly distinguish:

- repository facts;
- measured evidence;
- product interpretation;
- decision.

Do not create a next feature merely because the roadmap needs one.

---

# Documentation (as-built)

## 0. Baseline and method

- HEAD at execution: `39e37ca` (Step 10CM), worktree clean, one audit test
  added, zero production lines changed.
- Decision chain re-read (10BY→10CM as-builts; prompt uppercase variants do
  not exist — mixed-case files consulted) and verified against code:
  admission gate, Town conditions, WORLD_CONFIG 12×12, catalogue (11),
  storage caps, auto-assignment.
- New measurement: compact-vs-spread layout equivalence (scratch probe,
  then committed as `spatialEquivalenceMeasurement.test.ts`).

## 1. Context from 10CK

10CK CONTINUED toward demand-driven growth via a gated investigation.
Both investigation branches returned DEFER (10CL internal, 10CM external).
This gate answers what, if anything, remains actionable.

## 2. Evidence from 10CL

Zero-slack scaling (P=4–10: every colonist consumed by survival, Workshop
vacant); shocks recover through the existing build/reassign repertoire;
growth self-consuming; capped stocks remove accumulation purpose. No new
qualitative decision at larger scale.

## 3. Evidence from 10CM

Homogeneous board, placement-only terrain, zero external/narrative
concepts in code+docs+saves+catalogue; all external candidates speculative
or decorative. World branch closed with terms.

## 4. Current product reconstruction

Wilderness → production → allocation → placement/roads → capacity → Town
→ scenario completion → free play. Player: builds, connects, staffs,
rebalances through 11 authored scenarios + free play. Failable (starvation,
terminal orders), recoverable (same repertoire), fully deterministic,
authored goals end at Town, free play static after.

## 5. Current product identity

```text
A deterministic contemplative colony optimizer: the player solves
increasingly constrained settlement layouts and workforce allocations
through authored scenarios on a small fixed board, with a static
free-play sandbox after Town.
```

## 6. Product vision reconciliation

- Fulfilled: deterministic causal sim, readability, infrastructure-first,
  minimalism, workforce/roads/Town/scenarios, design-test discipline.
- Partially fulfilled: believable settlement growth (promised 01/04,
  unmechanized), urban growth (21, 26-Phase 10 — still scheduled, unfunded).
- Deferred (not obsolete): transport, technology, money — each gated behind
  a demonstrated need that has not appeared.
- Unsupported by current direction: nothing revived; no conflict requiring
  resolution. The vision stands; its growth chapters stay frozen,
  not abandoned.

## 7. Simulation-depth assessment

No unresolved interaction: CA/CE/CF/CG + 10CL probes converge — every
pressure resolves through reallocation/construction. Nothing new inside
without new systems, which no evidence justifies.

## 8. Spatial-composition assessment

Measured: compact vs 11-cell-spread layouts (same buildings) produce
IDENTICAL rates, stage and stocks over 24 ticks — distance/geometry change
nothing once access holds; road cost is the sole differentiator. The player
satisfies binary validity constraints; design beyond cost-minimization has
no economic meaning. Real thinness, but no bounded existing-system fix
(all deepeners — adjacency, zoning, yields — are speculative systems).

## 9. Settlement-design assessment

Constraint-satisfaction, not design — and that matches the minimalist
intent (small fixed board, few rules). Treating it as deficiency would
require importing a city-builder design layer the evidence has repeatedly
refused. Not a defect; a boundary.

## 10. Goals/scenarios assessment

The authored challenge layer works (10CJ: discoverable, distinct, causal,
canonical). More scenarios risk repetition (closure matrix guards
uniqueness); the layer is complete for the current product stage.

## 11. Progression assessment

Not a problem: Town as phase boundary is coherent; no new stage represents
a new dimension (City would be a bigger number). Frozen correctly.

## 12. Presentation/atmosphere assessment

No blocking problem (10CG legible, 10CJ responsive-clean, GPU green).
Polish would be preference, not product unblocking.

## 13. World/discovery assessment

Closed per 10CM; no contradictory evidence found. Absence does not prevent
the intended experience (optimizer + scenarios function fully).

## 14. Continuous-play assessment

NOVA is a short authored optimization experience with a static sandbox
tail — not an incomplete continuous game. Termination (scenario
completion) is a deliberate boundary; free-play stasis is the documented
vacuum, already investigated twice with DEFER outcomes. Indefinite play
would need the growth loop nobody has demonstrated.

## 15. Missing vs not-required vs speculative

- Missing (promised, absent): believable growth/urban growth — the only
  genuine gap, already DEFERRED twice for lack of mechanism, not need.
- Not required: post-Town systems, new stages, world content, continuous
  purpose — coherent without them.
- Speculative: everything in the §13 anti-feature list.

## 16. Product ceiling

> **The first thing preventing a stronger NOVA is not a missing feature
> but a missing mechanism for growth — and two investigations could not
demonstrate one without speculation.** The ceiling is structural honesty:
everything buildable with evidence is built.

## 17. Candidate directions, without ranking

1. Spatial composition depth — real thinness (measured), but every fix is
a speculative system; fails the bounded-solution test.
2. Scenario depth — risks repetition; closure guards would need weakening.
3. Settlement-design depth — same as (1) with a different name.
4. Presentation polish — preference, no evidence of blocking.
No candidate satisfies §11 conditions 1–7 simultaneously.

## 18. CONTINUE / REDIRECT / FREEZE decision

```text
FREEZE — the current product is coherent (optimizer + authored scenarios +
static sandbox); remaining gaps are the twice-deferred growth mechanism
(need demonstrated, mechanism not) or speculative systems. No next
workstream is justified by repository evidence; additional mechanics now
would be feature invention.
```

Not CONTINUE (no actionable problem passes §11), not REDIRECT (the growth
vision still describes the product's unfinished business better than any
alternative; "puzzle optimizer" names what exists, not what to build).

What is complete: deterministic sim, allocation tradeoff, spatial
validity, Town gate + review, 11 scenarios, legible UI, frozen contracts.
Intentionally absent (not defects): growth, post-Town purpose, world
content, new stages, continuous play.
Reopening evidence: 10CL/10CM DEFER terms, plus — new for this gate — a
spatial decision with comparable-but-different outcomes expressible in
existing systems, or any demonstrated new decision surviving all controls
(10CF standard).
Frozen: sim, workforce, economy, roads, Town, scenarios, objectives,
save/load, hashing, commands, SAVE_VERSION 8.

## 19. Exact next workstream

N/A (FREEZE). No workstream ordered.

## 20. Anti-feature audit

City/more resources/money/trade/diplomacy/transport/traffic/pollution/
happiness/prestige/tech-trees/automation/random events/disasters/NPCs/
quests/world-sim/procedural maps/unlocks/sinks-without-decisions: all
rejected — each assumes the undemonstrated growth/demand mechanism or
scales numbers without decisions (bigger-game trap tested and refused).

## 21. Validation

- New measurement: 1/1 PASS (`spatialEquivalenceMeasurement`).
- Full Vitest: 1748/1749; sole failure the known 5s-timeout load flake
  (industrialHeadroomTownDecision 5691ms; green isolated repeatedly,
  10CC-class, untouched).
- Typecheck: PASS. Lint: PASS. Build: PASS (pre-existing chunk warning).
- Browser/GPU: skipped (no runtime/UI change).
- `git diff --check`: clean. SAVE_VERSION 8 unchanged.
- Scope: one audit test + this doc; zero production lines.
- User-owned files untouched.

## 22. Final scope statement

Gate only. Product development beyond Town is FROZEN pending the stated
evidence; the 10CK growth intent and 10CJ scenario STOP stand unmodified.

## Files changed

- `tests/spatialEquivalenceMeasurement.test.ts` (new, 1 measurement test)
- `docs/roadmap/Step10CN.md` (prompt + this as-built)
