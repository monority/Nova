# Step 10CK — Post-Town Product Direction Gate

## Mission

NOVA has now reached a meaningful product milestone.

Recent work established:

- a deterministic core simulation;
- Food / Water / Material trade-offs;
- workforce allocation;
- roads and accessibility;
- Village → Town progression;
- Town workforce review;
- authored scenarios;
- three distinct Town-targeted scenarios;
- Town as a meaningful and legible authored endpoint.

The recent chain was:

```text
10CH — Town Product Direction Gate
        ↓
10CI — Town Goal Coverage
        ↓
10CJ — Town Scenario Experience Audit
        ↓
Town is now a valid authored endpoint
```

10CJ explicitly concluded:

> **STOP — no scenario-system change justified.**

Therefore, do not continue modifying the scenario layer.

The next question is no longer:

> "What mechanic is missing?"

It is:

> **"What should NOVA become after Town?"**

This is a **product vision and direction gate**.

No gameplay implementation is expected.

---

# 1. Read the existing product before deciding

Inspect the current repository and relevant documentation.

At minimum read:

```text
docs/roadmap/STEP10CH.md
docs/roadmap/Step10CI.md
docs/roadmap/STEP10CJ.md
docs/roadmap/STEP10CG.md
docs/roadmap/STEP10CF.md
docs/roadmap/STEP10CA.md
```

Also inspect the current product itself:

- simulation;
- progression;
- scenarios;
- buildings;
- workforce;
- roads;
- accessibility;
- resource economy;
- Town;
- rendering;
- UI;
- scenario UI;
- world/grid;
- current content catalogue;
- tests;
- E2E;
- any existing product/design documentation.

Do not base the decision exclusively on roadmap documents.

---

# 2. Reconstruct NOVA's actual current product

Describe what NOVA is **today**, not what it was intended to become.

Answer:

### Core player fantasy

What does the current game allow the player to feel they are doing?

For example, determine whether the actual experience is primarily:

- establishing a settlement;
- optimizing a constrained colony;
- designing a spatial settlement;
- managing an off-world outpost;
- growing a small autonomous community;
- solving a logistics puzzle;
- something else.

Do not choose from this list mechanically.

Infer the answer from the actual product.

---

# 3. Revisit the original product direction

Inspect existing repository documentation and design material for the intended identity of NOVA.

Pay particular attention to concepts such as:

- deterministic contemplative city-builder;
- limited square planet grid;
- off-world settlement;
- futuristic maquette;
- dark modern dystopian visual identity;
- readable futuristic lights;
- distinct buildings;
- workforce;
- roads;
- public infrastructure;
- progression;
- Wilderness → Village → Town → later stages;
- possible autonomous settlement direction;
- environmental / planetary context;
- Prometheus / origin / mystery concepts if they actually exist in current product documentation.

Separate:

### Existing product

What is implemented.

### Intended direction

What is documented or clearly established.

### Uncommitted ideas

Ideas that should not be treated as requirements.

Do not silently convert old brainstorming into mandatory scope.

---

# 4. Define the meaning of Town

Town is currently an authored endpoint.

Determine what that means in product terms.

Ask:

> Why does the game currently stop at Town?

Possible explanations include:

- Town is intentionally the end of the current vertical slice;
- Town represents the completion of the first settlement phase;
- Town is the beginning of the real city-builder layer;
- Town is merely a temporary milestone;
- the current product has not yet defined what comes after.

Do not assume one of these is correct.

Find evidence.

---

# 5. The post-Town question

Answer this explicitly:

> **If the player has successfully built Town, what would make them want to continue?**

Consider the actual product dimensions:

### A. World / Content

More buildings, infrastructure, environments, settlement identity, planetary context.

### B. Spatial Composition

More expressive settlement design using the grid, roads, density, districts, landmarks, or other spatial relationships.

Do not automatically invent zoning or adjacency systems.

### C. Progression

A continuation beyond Town.

Do not automatically call it City.

Determine what progression would actually mean.

### D. Player Goals / Scenarios

Longer or more contextual goals beyond Town.

Remember that 10CJ already found the current Town scenario layer sufficient. Do not reopen it unless the product vision requires a genuinely different goal layer.

### E. Presentation / Atmosphere

Strengthen the contemplative futuristic settlement identity through environment, architecture, lighting, atmosphere, visual feedback, and world presence.

Do not propose a generic graphical overhaul.

### F. Simulation Depth

Only reopen simulation if the product vision demonstrates a concrete reason.

The previous audits did not establish a simulation deficiency.

### G. World / Discovery / Narrative Context

Determine whether NOVA needs a stronger reason for the colony to exist:

- planetary context;
- origin;
- environmental conditions;
- discovery;
- long-term settlement purpose;
- mystery.

Only use concepts supported by actual project direction.

---

# 6. Do not rank these dimensions

Do not produce:

- scores;
- rankings;
- winners;
- weighted matrices;
- "best direction";
- numerical priorities.

Instead describe the relationship between dimensions.

For example:

```text
Spatial composition currently depends on the building catalogue.

Progression currently depends on having a meaningful reason to develop the settlement.

Atmosphere can reinforce settlement identity but cannot substitute for player purpose.
```

The goal is understanding, not scoring.

---

# 7. Identify the current product ceiling

This is the most important analysis.

Complete:

> **NOVA currently becomes interesting up to ________, but then stops being interesting because ________.**

Base this on actual player experience.

Avoid vague answers like:

- "needs more depth";
- "needs more content";
- "needs more mechanics";
- "needs more progression".

Explain the concrete ceiling.

---

# 8. Identify the next product-level problem

Do not ask:

> "What feature should we add?"

Ask:

> **"What currently prevents NOVA from expressing its intended fantasy beyond Town?"**

Possible categories:

- insufficient world identity;
- insufficient construction expression;
- lack of long-term purpose;
- lack of progression;
- insufficient content;
- insufficient spatial meaning;
- insufficient atmosphere;
- unclear colony purpose;
- another concrete issue discovered in the repository.

The answer must be evidence-based.

---

# 9. Determine whether Town should remain an endpoint

Evaluate three possibilities.

### A — Town remains the current endpoint

The current product is coherent as a contained vertical slice.

In this case, identify what should be polished/expanded around that experience rather than extending progression.

### B — Town becomes the first major phase boundary

Town remains a meaningful endpoint, but the product should clearly continue into a new phase.

Identify what that phase represents.

### C — Town is currently an arbitrary stop

The existing progression does not yet correspond to a meaningful product boundary.

If this is the conclusion, explain why.

Do not create the next phase.

---

# 10. Define the next large product direction

If a continuation is justified, define **one coherent product direction**.

Not a feature list.

Not a roadmap of ten mechanics.

A direction should look like:

```text
Direction:
[clear product statement]

Player experience:
[what the player should now be able to experience]

Why it follows Town:
[concrete connection]

What existing systems it builds upon:
[...]

What it intentionally does not solve:
[...]

Required future capabilities:
[...]

First implementation-sized step:
[...]
```

If no continuation is justified, say so explicitly.

---

# 11. Distinguish direction from implementation

A direction might be:

> "Make the settlement itself become a form of player expression."

That is a direction.

It is **not yet**:

> "Add districts."

Likewise:

> "Give Town a reason to exist within a larger off-world settlement arc."

is a direction.

It is **not yet**:

> "Add City progression."

Do not jump from product direction to feature specification.

---

# 12. Identify the next coherent workstream

The final result should identify what kind of work would follow this gate.

Examples:

```text
World/content workstream
Spatial composition workstream
Progression workstream
Atmosphere/presentation workstream
Player-goal workstream
Simulation workstream
```

Only choose a workstream if evidence supports it.

Then describe what its **first meaningful implementation step** would investigate or establish.

Do not implement it in 10CK.

---

# 13. Product vision consistency check

Before finalizing the direction, verify that it remains compatible with NOVA's established identity.

Check against:

- contemplative tone;
- deterministic simulation;
- limited world;
- top-down presentation;
- futuristic maquette direction;
- readable architecture;
- meaningful spatial decisions;
- existing workforce system;
- existing economy;
- existing progression;
- absence of unnecessary busywork;
- absence of resource treadmill;
- no forced automation.

If the proposed direction conflicts with one of these, explain the conflict.

Do not silently discard existing product principles.

---

# 14. Anti-feature gate

Reject directions whose primary purpose would be:

- adding complexity for its own sake;
- increasing resource counts;
- creating more spreadsheets;
- extending playtime without adding meaning;
- adding arbitrary progression tiers;
- adding buildings solely to increase catalogue size;
- adding objectives solely because objectives already exist;
- adding automation because the game became repetitive;
- adding UI panels instead of solving a product problem;
- creating a quest framework without a narrative/product need;
- reopening frozen simulation without evidence;
- creating persistence requirements prematurely.

The next direction must make NOVA **more itself**, not merely larger.

---

# 15. Architecture / simulation preservation

Confirm what remains frozen.

Unless strong evidence says otherwise:

- deterministic simulation remains;
- `SAVE_VERSION = 8`;
- workforce semantics remain;
- Food / Water / Material economy remains;
- roads/accessibility remain;
- Town progression remains;
- scenario system remains;
- objective semantics remain;
- domain/application/rendering separation remains.

Do not alter any of these during 10CK.

---

# 16. No implementation

This is a design/product gate.

Expected changes:

```text
docs/roadmap/STEP10CK.md
```

Potentially tests only if needed to verify an existing documented product invariant.

Do not modify gameplay.

Do not modify UI.

Do not modify rendering.

Do not modify persistence.

Do not modify simulation.

Do not modify scenarios.

---

# 17. Validation

Verify:

- all referenced documents were actually inspected;
- conclusions match the current code;
- proposed direction does not contradict recent audits;
- no implementation was accidentally introduced;
- `SAVE_VERSION` remains 8;
- user-owned files remain untouched.

No GPU validation is necessary unless unexpected runtime changes occur.

No full test suite is required for documentation-only work.

---

# 18. User-owned files

Never modify:

```text
docs/roadmap/Step10BO - Copy.md
docs/roadmap/Step10BT.md
```

---

# 19. Documentation

Create:

```text
docs/roadmap/STEP10CK.md
```

Document:

1. Current product identity.
2. Original intended direction.
3. Town's actual role.
4. Post-Town analysis.
5. Current product ceiling.
6. Concrete product problem.
7. Town endpoint decision.
8. Product direction selected, or explicit decision to remain contained.
9. Why that direction fits NOVA.
10. What it must not become.
11. Next workstream.
12. First meaningful implementation-sized step.
13. Frozen foundations.
14. Validation.
15. Files changed.

Do not turn this into a giant speculative roadmap.

---

# 20. Decision gate

The final section must use one of these exact forms.

### CONTINUE

```text
10CK DECISION

NOVA should continue beyond Town.

Product direction:
[...]

Reason:
[...]

Next workstream:
[...]

First meaningful step:
[...]

Simulation:
FROZEN / REOPENED

Persistence:
UNCHANGED / CHANGE REQUIRED
```

### CONTAIN

```text
10CK DECISION

Town remains the appropriate current product endpoint.

Reason:
[...]

Next product investment should focus on:
[...]

No post-Town system is justified yet.

Simulation:
FROZEN

Persistence:
UNCHANGED
```

### REDIRECT

```text
10CK DECISION

NOVA should not extend Town yet.

The next product direction is:
[...]

Reason:
[...]

Town remains:
[endpoint / phase boundary]

Next workstream:
[...]

Simulation:
FROZEN / REOPENED

Persistence:
UNCHANGED / CHANGE REQUIRED
```

Do not force CONTINUE.

---

# 21. Commit

When complete:

```text
Step 10CK: Post-Town Product Direction Gate
```

One commit only.

Do not rewrite previous history.

Do not force-push.

Do not claim a push unless one actually occurred.

---

# 22. Final report

Return:

```text
Step 10CK — Complete

1. Current product identity
2. Original direction verified
3. Town role
4. Post-Town motivation
5. Current product ceiling
6. Concrete product problem
7. Town endpoint decision
8. Product direction
9. Why now
10. Next workstream
11. First meaningful implementation step
12. Explicit non-goals
13. Frozen foundations
14. Validation
15. Files changed
16. Commit
```

## Final constraint

**Do not invent the next feature. Define the next product direction.**

10CK should answer one question decisively:

> **Now that NOVA can take a player from settlement formation to an authored Town goal, what experience should NOVA ultimately be about?**

If the answer is not sufficiently clear from the current product and documentation, the correct result is to **contain the current scope**, not to manufacture a feature.

The next implementation step must emerge from the product direction established here.

---

# Documentation (as-built)

## 0. Baseline and method

- HEAD at execution: `c135ccc` (Step 10CJ), worktree clean, no code changed.
- Docs read: `01-product-vision`, `02-game-design`, `03-core-loop`,
  `04-city-simulation`, `10-technology`, `20-strategy`,
  `21-simulation-progression`, `25-mvp`, `26-roadmap`, plus 10CH / 10CI /
  10CJ / 10CG / 10CF / 10CA as-builts (mixed-case paths; prompt uppercase
  variants do not exist on disk). No Prometheus/origin/mystery concept
  exists in current product documentation — treated as uncommitted ideas,
  not requirements.
- Code verified: `WORLD_CONFIG` 12×12 (`main.ts`), Water admission gate
  (`phases.ts`: admission only while Water capacity sustains the resulting
  served population), Town conditions + terminal `nextStage: null`
  (`progression.ts`), 11-scenario catalogue ending at Town.

## 1. Current product identity

NOVA today is a deterministic contemplative colony optimizer on a 12×12
maquette. Player as planner/operator: build, connect, enable, expand;
consequences appear over time. The lived fantasy is establishing a viable
outpost under constraint and solving its logistics puzzles (11 authored
scenarios). It operates a living system more than it arranges decoration —
but the system, once viable, goes quiet.

## 2. Original intended direction

- Vision: "visual colony/city simulator where a small number of
  understandable rules produce believable settlement GROWTH"; pillars
  causality, readability, determinism, infrastructure-first, minimalism.
- Foundation loop: `demand → investment → capacity → usage → growth →
  new demand` (04). Game-design loop ends at "growth creates new demand"
  (02). MVP is explicitly "not a complete city simulator" (25).
- Progression order (21): Housing → Population → Needs → Services →
  Food/Water → Work → Production → **Transport → Urban growth →
  Technology → Larger systems**, one causal dimension at a time.
- Roadmap Phase 10 (26): "Settlement growth — demand and available
  capacity drive spatial development." Technology only to solve real
  constraints (10). Design test required for every mechanic (02).
- Intended direction therefore INCLUDES growth beyond the foundation; the
  foundation (now built through Town) was always the means, not the end.

## 3. Town's actual role

Town is the completion of the first settlement phase: its conditions
(staffed Workshop + Water capacity + Food balance) certify a
SELF-SUSTAINING settlement. Evidence it is a phase end, not a game end:
the vision's growth promise is unaddressed, the foundation loop stalls at
`usage`, and every scenario goal terminates at sustainability. Town was
never designed as a final state — nothing declares it one; it is simply
where the authored road currently runs out.

## 4. Post-Town analysis (dimensions as relationships, no ranking)

- Content: 4 buildings carry the foundation; more buildings without demand
  would be catalogue size, not purpose. Content depends on growth asking
  for it.
- Spatial: placement is validity + weak composition; richer expression
  needs a reason to expand, which only demand provides.
- Progression: a post-Town tier without a growth model would repeat Town's
  old defect one level up (10CH §7 logic). Progression depends on demand.
- Goals: 10CJ closed this layer; reopening needs a genuinely new goal
  layer, which presupposes a post-Town experience to frame.
- Presentation: sufficient (10CG/10CJ); atmosphere reinforces identity but
  cannot substitute purpose.
- Simulation: no deficiency established (CA/CE/CF/CG); growth-demand is a
  product question first, a simulation question only after it is defined.
- Discovery/narrative: no planetary-origin concept exists in the docs;
  inventing one now would be manufacturing scope. The colony's purpose can
  come from growth itself (a settlement becoming a town becoming more),
  which IS documented.

## 5. Current product ceiling

> **NOVA currently becomes interesting up to Town — mastering the Food /
> Water / Material allocation and spatial validity on a small grid — but
> then stops being interesting because a sustainable colony generates no
> new demand: the Water gate caps admission, every need is met, nothing
> grows, and the foundation loop stalls at usage.**

Concretely: post-Town play is re-optimizing a solved allocation. The
vision's core promise (believable settlement growth) has no mechanism and
no representation.

## 6. Concrete product problem

> **What prevents NOVA from expressing its intended fantasy beyond Town is
> the absence of demand: nothing in the product converts a working
> settlement into further growth, so the demand → investment → capacity →
> usage → growth → new demand loop — the documented foundation loop — is
> broken after usage.**

## 7. Town endpoint decision

**B — Town becomes the first major phase boundary.** It remains a
meaningful authored endpoint (the self-sustaining settlement), and the
product continues into a growth phase. Not A (the product is not coherent
as a contained slice — its own vision promises growth), not C (Town DOES
correspond to a real boundary: sustainability achieved).

## 8. Product direction selected

```text
Direction:
Demand-driven settlement growth: the living settlement produces demand
(housing, service, spatial) that drives investment, capacity and physical
growth — the roadmap Phase 10 / progression-order Urban growth step,
expressed first through existing systems.

Player experience:
A Town that fills up, presses outward and grows because its own life
requires it — growth that is explainable through interacting systems, not
a population timer.

Why it follows Town:
Town certifies sustainability; sustainability is the precondition for
growth. Growth is the documented next causal dimension, and the only one
that answers the ceiling in §5 without inventing a parallel game.

What existing systems it builds upon:
Housing/admission, Water service, roads/accessibility, workforce
allocation, construction, derived progression, scenario framing.

What it intentionally does not solve:
City tiers, money, power, transport logistics, vehicles, technology trees,
inter-settlement relations, narrative origin.

Required future capabilities:
A definition of demand in terms of existing state; a growth cost model in
existing currencies (material, labour, water service); visible spatial
consequences; a decision gate before any simulation change.

First implementation-sized step:
A Growth Demand Investigation (audit/design, no implementation): define
what demand means with current systems, what growth would consume, what
the player would see and decide — ending in a build/defer decision. It
must pass the 02 design test and the complexity budget (one dimension).
```

## 9. Why that direction fits NOVA

It is the documented next step (21, 26-Phase 10), it completes the
documented foundation loop (02/04) instead of adding a parallel loop, it
uses existing systems first (dependency rule), and it makes NOVA more
itself (believable growth from few rules) rather than larger.

## 10. What it must not become

A City tier for its own sake; money/power/transport sims; population
timers; sprawl spam; quotas; treadmill scarcity; automation to mask
repetition; dashboard panels; a quest framework; premature persistence; a
simulation reopen without the investigation's evidence.

## 11. Next workstream

```text
Progression/growth workstream — demand-model investigation first.
```

## 12. First meaningful implementation-sized step

"Growth Demand Investigation": (1) enumerate demand candidates expressible
in current state; (2) test each against the 02 design test (who needs it,
what provides/consumes it, unavailability consequence, visible element);
(3) propose the minimal growth representation (or defer with evidence);
(4) end in an explicit build/defer gate. No simulation, UI, persistence, or
scenario change inside the investigation.

## 13. Frozen foundations

Deterministic simulation, SAVE_VERSION 8, workforce semantics, Food/Water/
Material economy, roads/accessibility, Town progression, scenario system,
objective semantics, domain/application/rendering separation — all FROZEN
through the investigation. The freeze is not reopened by this gate; only
the investigation's evidence could justify reopening later.

## 14. Validation

- Referenced documents actually read (list in §0); no reliance on roadmap
  text alone — WORLD_CONFIG, admission gate, Town conditions and catalogue
  verified in code.
- No contradiction with recent audits: CA/CE/CF/CG refused NEW MECHANICS
  for unmeasured pressures; this gate proposes no mechanic, only the
  investigation the vision already schedules (21, 26-Phase 10).
- No implementation introduced: zero tracked-file modifications;
  SAVE_VERSION remains 8 (verified `save.ts:62` pattern unchanged, suite
  pins green at HEAD).
- Full suite / typecheck / lint / build: NOT rerun — documentation-only,
  worktree untouched; HEAD values stand (1736/1736, all PASS).
- GPU: not applicable. User-owned files untouched.

## 15. Files changed

- `docs/roadmap/Step10CK.md` (prompt + this as-built, dual-purpose
  convention; no uppercase variant — case-insensitive FS)

## 10CK DECISION

```text
10CK DECISION

NOVA should continue beyond Town.

Product direction:
Demand-driven settlement growth (urban growth): the sustained Town
produces demand that drives investment, capacity and physical growth
through existing systems first.

Reason:
Town certifies sustainability but the vision promises believable growth;
post-Town play stalls because no demand converts a working settlement
into further growth (water gate caps admission, all needs met). Growth is
the documented next causal dimension (21, 26-Phase 10) and the only one
that completes the foundation loop without a parallel game.

Next workstream:
Progression/growth workstream, beginning with a Growth Demand
Investigation (design-only, gated).

First meaningful step:
Define demand in current-state terms, pass the 02 design test, propose the
minimal growth representation or defer with evidence.

Simulation:
FROZEN

Persistence:
UNCHANGED
```
