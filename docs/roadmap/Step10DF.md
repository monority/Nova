# Step 10DF — Next Product Direction & Experience Selection

## Objective

NOVA's foundation is now formally frozen by Step 10DE.

Do not reopen foundation-quality work.

Do not perform another generic gameplay-depth, UX, visual, camera, or architecture audit.

The purpose of Step 10DF is to define the **next explicit product objective** for NOVA.

This is a product-direction step.

The question is no longer:

> "What is missing from the foundation?"

The question is:

> "What experience should NOVA provide next, now that the foundation is stable?"

No implementation should happen in this step.

---

# 1. Read the Frozen Baseline

Read:

- `docs/roadmap/Step10DE.md`
- `docs/roadmap/Step10DD.md`
- `docs/roadmap/Step10DC.md`
- `docs/roadmap/Step10DB.md`
- `docs/roadmap/Step10DA.md`
- `docs/12-visual-direction.md`
- current scenario/content definitions
- domain/application/rendering architecture
- existing product-facing queries
- current E2E/browser coverage

Treat Step 10DE as the authoritative foundation baseline.

Do not reopen conclusions already established there unless new contradictory evidence is discovered.

---

# 2. Define the Current Product

Write a concise description of what NOVA currently is.

It should answer:

- What does the player do?
- What decisions do they make?
- What is the core loop?
- What makes NOVA distinct?
- What does the player experience from starting a settlement to reaching Town?
- What role do the 11 scenarios play?
- What does the player currently do after completing the authored scenarios?

Avoid marketing language.

Describe the actual product.

---

# 3. Identify the Current Experience Boundary

Determine where the current experience naturally ends.

Explicitly examine:

### Beginning

- starting state;
- first placement decisions;
- early resource pressure;
- first workforce choices.

### Middle

- spatial organization;
- roads/access;
- workforce tradeoffs;
- economic pressure;
- scenario objectives.

### End

- Town;
- final scenario objectives;
- settlement completion;
- post-Town sandbox.

Determine whether this boundary is:

- intentional and coherent;
- merely an implementation stopping point;
- or a genuine product opportunity.

Do not assume that a post-Town system is required.

---

# 4. Product Opportunity Exploration

Explore the extension seams identified in Step 10DE.

At minimum investigate these four directions:

## Direction A — More Authored Experiences

Possible scope:

- additional scenarios;
- new objective combinations;
- new starting constraints;
- new settlement situations.

Determine what new experience this would provide using the existing simulation.

---

## Direction B — New Product Layer Above the Simulation

Possible scope:

- a meta-layer;
- a settlement-management layer;
- a strategic layer;
- a narrative/context layer;
- another experience that consumes the existing simulation state.

Do not invent a complete system.

Identify what kind of experience could sit above the current deterministic simulation without corrupting the foundation.

---

## Direction C — Alternative Starting-State Modes

Possible scope:

- prebuilt settlements;
- constrained settlements;
- damaged settlements;
- partially developed settlements;
- specialized starting situations.

Investigate whether different starting states could create substantially different player experiences using the frozen rules.

---

## Direction D — Presentation / Observation Expansion

Possible scope:

- richer settlement observation;
- more state communication;
- expanded use of `RenderSnapshot`;
- stronger sense of settlement evolution;
- additional presentation layers.

Do not turn this into a visual redesign.

The existing visual direction remains frozen.

---

# 5. Evaluate Product Value, Not Feature Count

For every direction, determine:

1. What new player experience does it create?
2. Which existing systems does it reuse?
3. Which new rules would actually be required?
4. Does it create new meaningful decisions?
5. Does it create new temporal/spatial/economic consequences?
6. Does it increase authored variety?
7. Does it increase replayability?
8. Does it provide a meaningful reason to continue playing?
9. What is the smallest coherent version?
10. What foundation contracts would it need to touch, if any?

Do not count:

- more UI;
- more buildings;
- more screens;
- more data;
- more scenarios

as product value by themselves.

The output must describe **player experience**, not implementation volume.

---

# 6. Preserve the Frozen Foundation

For each possible direction, explicitly identify whether it can operate:

### Above the foundation

Consuming existing state/queries without changing core rules.

### Beside the foundation

Adding a separate mode/content layer while keeping existing scenarios intact.

### Inside the foundation

Requiring changes to frozen economy/workforce/road/progression/persistence rules.

Prefer directions that can be implemented above or beside the foundation.

If a direction requires changing a frozen contract, explain exactly why.

Do not modify it.

---

# 7. Look for the Strongest Product Opportunity

Do not use numerical scoring.

Do not create a "best feature" ranking.

Instead, identify which direction has the clearest **evidence-backed product rationale**, and explain why.

The evidence should come from:

- the current player journey;
- existing scenario structure;
- existing mechanics;
- current extension seams;
- known product boundaries;
- actual implementation constraints.

If no direction has sufficient evidence, say so.

It is acceptable for this step to conclude:

> No new product direction is sufficiently justified yet.

Do not manufacture certainty.

---

# 8. Define the Next Product Objective

The step must end with one explicit product objective if evidence supports one.

The objective should be expressed in player terms.

Good form:

> "Give the player a new way to experience X by using Y, while preserving Z."

Avoid implementation-first objectives such as:

> "Add a new BuildingState."

The objective must be testable.

It should be possible for a future implementation step to answer:

- What experience was added?
- What decisions did it create?
- What existing contracts remained unchanged?
- How do we know the experience works?

---

# 9. Define the First Implementation Boundary

Once the product objective is selected, define the smallest coherent first implementation step.

Document:

- included experience;
- excluded experience;
- affected systems;
- unaffected frozen contracts;
- required UI surface;
- required domain/application changes;
- persistence implications;
- scenario implications;
- testing strategy.

Do not implement it.

Do not prematurely split it into ten micro-steps.

The first implementation should be large enough to deliver a complete player-visible slice.

---

# 10. Explicit Non-Goals

The selected direction must explicitly state what it does **not** change.

At minimum consider:

- economy contracts;
- workforce contracts;
- road/access contracts;
- progression;
- existing 11 scenarios;
- persistence;
- visual direction;
- camera;
- HUD foundation.

This prevents the new phase from becoming accidental foundation drift.

---

# 11. Create the Product Direction Document

Create:

`docs/roadmap/Step10DF.md`

Structure:

1. Objective
2. Frozen baseline
3. Current product definition
4. Current experience boundary
5. Product opportunity exploration
6. Direction A — authored experiences
7. Direction B — new product layer
8. Direction C — starting-state modes
9. Direction D — presentation/observation
10. Comparative evidence
11. Selected product objective
12. Why this objective
13. First implementation boundary
14. Frozen contracts preserved
15. Explicit non-goals
16. Acceptance criteria for the future implementation
17. Final handoff

If no direction is sufficiently justified, document that conclusion instead of selecting one.

---

# 12. No Implementation

This step must NOT:

- add gameplay;
- add buildings;
- add resources;
- add production chains;
- modify economy;
- modify workforce;
- modify roads;
- modify progression;
- modify existing scenarios;
- modify persistence;
- modify rendering;
- modify camera;
- redesign HUD;
- change `SAVE_VERSION`.

Prefer zero `src/` changes.

---

# 13. Validation

Because this is a product-direction step, validate the analysis against the actual repository.

At minimum run:

- relevant existing product tests;
- full Vitest;
- typecheck;
- lint;
- build;
- `git diff --check`;
- relevant browser/product smoke suites if necessary to verify claims.

Do not claim tests passed without running them.

No GPU verification is required unless source/rendering changes occur.

---

# 14. Final Diff Audit

Before committing:

```bash
git status --short
git diff --stat
git diff --check
git diff
```

Confirm:

- only intended files changed;
- no `src/` gameplay changes;
- no economy/workforce/road changes;
- no scenario changes;
- no persistence changes;
- `SAVE_VERSION = 8`;
- no user-owned files modified;
- no temporary artifacts.

Leave these untouched if present:

- `AGENTS.md`
- `docs/roadmap/Step10BO - Copy.md`
- `docs/roadmap/Step10BT.md`

If absent, do not recreate them.

---

# 15. Commit

If validation passes, create exactly one commit:

`Step 10DF: Define Next Product Direction`

Do not push.

---

# Final Report

Return:

## Step 10DF — Next Product Direction & Experience Selection

### 1. Current product
- ...

### 2. Experience boundary
- ...

### 3. Direction A
- ...

### 4. Direction B
- ...

### 5. Direction C
- ...

### 6. Direction D
- ...

### 7. Evidence
- ...

### 8. Selected product objective
- ...

### 9. First implementation boundary
- ...

### 10. Frozen contracts preserved
- ...

### 11. Non-goals
- ...

### 12. Future acceptance criteria
- ...

### 13. Validation
- focused
- full Vitest
- typecheck
- lint
- build
- diff/guardrails

### 14. Files changed
- ...

### 15. Commit
- exact hash
- `Step 10DF: Define Next Product Direction`

### 16. Scope confirmation
Explicitly confirm:

- no gameplay implementation;
- no economy changes;
- no workforce changes;
- no road changes;
- no progression changes;
- no scenario changes;
- no persistence changes;
- no rendering changes;
- `SAVE_VERSION = 8`;
- no push.

Do not automatically implement the selected direction in this step.

---

# Product Direction Document (as-built)

No implementation. `src/` is unchanged; the deliverable is this document.

## 1. Objective

Define NOVA's next explicit product objective now that the foundation is frozen
(Step 10DE). This step evaluates direction options against the repository's own
evidence and either selects one objective or documents why none is yet
justified. It does not reopen foundation-quality work or implement anything.

## 2. Frozen Baseline

Step 10DE is authoritative: economy (income 1/1/2, Workshop 2 production / 1
upkeep, cap 25/Workshop, hub 50/30/40 with protected Material floor 15,
affordability incl. same-tick inflow and building-only reserve), workforce (one
job, mobility-gated, manual override), roads (5/cell, 2 ticks, networks gate
access and employment), progression (Wilderness → Settlement → Village → Town),
persistence (`SAVE_VERSION = 8`, derived state never persisted), HUD
non-occlusion, dark visual identity, and the 11 authored scenarios are frozen.
Deferred/blocked: production economy (10CW), growth (10CL/10CM/10CN), transport
(10CX), vehicles/technology, camera redesign (10DB), visual-tier expansion
(10DC). Do-not-reopen list and extension seams recorded in 10DE.

## 3. Current Product Definition

NOVA is a small, deterministic, contemplative settlement-planning puzzle.
On a 12x12 board the player places four building types and one-cell roads,
staffs workplaces (auto with manual override), balances Food / Water /
Material, and satisfies authored objectives as the settlement moves
Wilderness → Settlement → Village → Town. Every stock is explained by a derived
cause (production, income, upkeep, consumption, access, affordability). The 11
scenarios are data-only starting states + constraints + objectives that make
the same causal chain bite differently (tight budgets, stranded farms, two
networks, industrial conversion, Town). After a scenario completes, free play
continues as a goal-less sandbox.

## 4. Current Experience Boundary

- **Beginning** — empty or prebuilt start, first placement decisions, first
  Food/Water/Material pressure, first workforce choice. Deliberate and legible.
- **Middle** — spatial organization, roads/access, workforce tradeoffs,
  economic pressure, scenario objectives. The validated decision core.
- **End** — Town, final objectives, `Objective complete`, post-Town sandbox.

The boundary is **intentional and coherent** (10CN: scenario boundary; 10CJ:
nothing new unlocks at Town by design). The only open boundary the repository
itself flags is **free-play post-Town purpose**, which 10CJ explicitly calls "a
new product-direction decision, not a repair this layer requires" — i.e. it is
this step's remit, not a defect. There is no demonstrated player demand for it
(10CM/10CN recorded none), so it is an opportunity to *decide*, not evidence of
a problem.

## 5. Product Opportunity Exploration

Four directions are evaluated on player experience (not implementation volume),
reuse, required new rules, new decisions, above/beside/inside the foundation,
and the evidence that would be needed to select them.

## 6. Direction A — More Authored Experiences

Additional scenarios, objective combinations, constraints and situations using
the frozen rules.

- **Experience**: a new *situation* (different starting budget, layout,
  workforce, or terminal order) with the same decision shapes.
- **Reuse**: everything; the scenario assembler is data-only and uses domain
  constructors.
- **New rules**: none. **Persistence**: none. **Position**: beside the
  foundation (new content, existing scenarios untouched).
- **New decisions**: generally no — it re-parametrises existing decisions.
- **Evidence for**: scenarios are the product's primary variety source (10DD);
  zero rule risk. **Evidence against**: 10DD classified the catalogue as
  sufficient (intro/learning/pressure/mastery/variety); more scenarios are
  content volume, which the prompt (and 10DE) explicitly refuse as value by
  itself. **Missing evidence**: a concrete decision shape the catalogue cannot
express at all.

## 7. Direction B — New Product Layer Above the Simulation

A meta/management/strategic/narrative layer consuming derived state (e.g. a
continuation purpose for free play, or a comparable settlement-performance
readout).

- **Experience**: purpose and continuation beyond the authored endpoints, and/or
  a reason to replay for a better settlement.
- **Reuse**: derived queries only (ticks, stocks, roads, employment, reserve).
- **New rules**: none if derived-only. **Persistence**: a goal/score that must
  survive sessions would need persisted state — forbidden by the freeze; a
  derived-only layer resets each session (consistent with scenarios, which do
  not persist completion).
- **Position**: above the foundation.
- **New decisions**: weak. A goal/score layer mostly *guides* or *quantifies*
  existing decisions; it risks the anti-feature the project has repeatedly
  refused — UI accounting without a decision.
- **Evidence for**: 10DD measured comparable-but-different outcomes (compact 4
  roads vs distributed 7; bridge vs separate networks; allocation divergence)
  that currently have no consequence; 10CJ names free-play motivation as a
  product-direction decision. **Evidence against**: no demonstrated player
  demand; 10CN froze post-Town purpose as intentionally absent; a derived
  summary does not itself create a new decision unless it introduces targets
  the scenario layer does not already provide. **Missing evidence**: a specific
  continuation goal that demonstrably creates a new meaningful decision (not a
  readout), or evidence that players seek continuation.

## 8. Direction C — Alternative Starting-State Modes

Prebuilt, constrained, damaged, partially developed or specialized starts.

- **Experience**: play a settlement already in motion (repair, finish, optimize)
  rather than from zero.
- **Reuse**: the scenario assembler already expresses arbitrary starts as data;
  `recovery` and `housing-composition` already exercise a damaged/stranded
  shape.
- **New rules / persistence**: none. **Position**: beside the foundation.
- **New decisions**: same shapes with a different starting point.
- **Evidence for**: data-only, zero rule risk, immediate variety. **Evidence
  against**: it is Direction A with a different label; no evidence of a start
  shape that changes the decision set. **Missing evidence**: a start state that
  provably creates a decision the current catalogue cannot.

## 9. Direction D — Presentation / Observation Expansion

Richer use of `RenderSnapshot`: settlement evolution, state communication,
additional presentation layers.

- **Experience**: stronger sense of the settlement living/evolving.
- **Reuse**: the renderer consumes `RenderSnapshot`; no simulation change.
- **Position**: above the foundation (presentation only).
- **Evidence for**: none required to *imagine* it. **Evidence against**: 10DC
  found the rendered presentation healthy with no Class-A problem, and the
  visual direction is frozen; the visual-direction document explicitly avoids
  decorative effects. Presentation added without a demonstrated deficiency or
  decision purpose is the "decorative content masquerading as simulation"
  anti-pattern. **Missing evidence**: a Class-A presentation/observation
  deficiency (none exists) or a product decision that observation itself is the
  experience.

## 10. Comparative Evidence

| Direction | New experience | New decisions | Reuses | Changes frozen rules | Position | Evidence strength |
| --- | --- | --- | --- | --- | --- | --- |
| A — authored experiences | new situation | no (re-parameterised) | all | no | beside | catalogue already sufficient (10DD) |
| B — layer above | purpose/replay | weak (accounting risk) | derived queries | no (derived) | above | measured differences exist but no decision/demand |
| C — start modes | in-motion start | no (Direction A) | scenario assembler | no | beside | same as A |
| D — presentation | sense of evolution | no | RenderSnapshot | no | above | frozen visuals, no deficiency (10DC) |

No direction simultaneously shows (a) a new meaningful decision or a
demonstrated experience need, (b) an above/beside attachment, and (c) evidence
rather than preference. Direction B is the only one tied to a real measured
fact (10DD's unrewarded layout differences) and a repo-flagged decision (10CJ),
but its decision value and player demand are unproven; selecting it now would
manufacture a direction the evidence does not yet support.

## 11. Selected Product Objective

**None selected — no direction is sufficiently justified by current evidence.**

Documented deliberately, as Step 10DF permits, rather than manufacturing
certainty. The foundation is frozen and healthy; the product's next objective
must come from new evidence, not from the existence of an extension seam.

## 12. Why This Objective (None) Is the Evidence-Backed Conclusion

- Every previously investigated direction (growth, external demand, production
economy, transport) was deferred for lack of a demonstrated new decision
  (10CL/10CM/10CW/10CX) and its reopening terms remain unmet — no new evidence
  has appeared since (10DA–10DD only confirmed health).
- The remaining candidates reduce to content volume (A/C) or presentation (D),
  which the product's own rules refuse as value by themselves, or to a layer
  whose decision value and demand are unproven (B).
- Choosing any of them now would be a preference-driven direction, violating the
  freeze's requirement for "a new product objective and explicit evidence".

## 13. First Implementation Boundary

Not applicable — no objective was selected, so no implementation boundary is
defined. (If a future step selects one, its first slice must be one complete
player-visible experience per Step 10DE's seam rules.)

## 14. Frozen Contracts Preserved

Unchanged and re-affirmed: economy, workforce, roads/access, progression,
persistence (`SAVE_VERSION = 8`), the 11 scenarios, HUD foundation, visual
direction, camera, and the domain/application → Three.js boundary.

## 15. Explicit Non-Goals

This step does not add gameplay, buildings, resources, production chains,
roads, progression, scenarios, persistence, rendering, camera or HUD changes,
and does not change `SAVE_VERSION`. It does not reopen any frozen or deferred
direction.

## 16. Acceptance Criteria for Any Future Product Objective

A future objective must satisfy all of the following before implementation:

1. **Experience evidence**: it delivers an experience a player demonstrably
   seeks or a new meaningful decision not already expressible today — not more
   content or accounting.
2. **Position**: it attaches above or beside the foundation (consumes derived
   state or adds data-only content) without modifying frozen rules.
3. **Contracts**: economy, workforce, roads, progression, persistence, visuals
   and camera stay untouched; `SAVE_VERSION` remains 8.
4. **Testability**: the added experience has deterministic tests and a browser
   verification path; the frozen foundation suites stay green.

Direction-specific evidence that would justify selection:

- **A/C** — a concrete decision shape (spatial, workforce, economic or temporal)
  that the current catalogue provably cannot express.
- **B** — a continuation/replay goal that creates a measurable new decision, or
  evidence that players want purpose beyond the authored endpoints (with a
  derived-only design if persistence must stay frozen).
- **D** — a reproducible Class-A presentation/observation deficiency, or a
  product decision that observation is itself the intended experience.

## 17. Final Handoff

The NOVA foundation is frozen and the product is healthy for its intended
scope. **No next product objective is selected by this step.** The next NOVA
step must begin from a new explicit product objective backed by the evidence
criteria in section 16 — not from another foundation audit, and not from a
extension seam alone. If no such evidence is available, continuing to leave the
product frozen is the correct product decision.

Commit: `Step 10DF: Define Next Product Direction`
