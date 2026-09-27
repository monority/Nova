# Step 10DG — NOVA Full Product Vision Reconciliation

## Objective

NOVA's current simulation foundation is frozen and healthy, but the current implementation is only one part of the original product vision.

This step is a **product-design reconciliation step**, not another foundation audit and not a gameplay implementation step.

The goal is to recover the complete intended vision of NOVA from the existing Markdown design documents, compare it against the current implementation, and establish a credible long-term production roadmap for turning NOVA into a **solid, coherent, complete game**.

Do not invent a new direction merely because the current foundation is stable.

Use the existing product/design documentation as the primary source of truth.

---

# 1. Read the Existing Product Documentation First

Before making any recommendation, inspect the repository's existing NOVA design documentation thoroughly.

In particular, locate and read all relevant documents related to:

- product vision
- game design
- core loop
- player experience
- progression
- world structure
- simulation
- economy
- technology
- transportation
- growth
- external/world systems
- scenarios
- endgame
- replayability
- UX/UI
- visual direction
- MVP
- roadmap
- design rules
- product contract
- architecture constraints

Known historical documents include, but are not limited to:

- `README.md`
- `01-product-vision.md`
- `02-game-design.md`
- `03-core-loop.md`
- `12-visual-direction.md`
- `13-ux-and-interface.md`
- `23-product-contract.md`
- `25-mvp.md`
- `26-roadmap.md`
- `29-design-rules.md`
- `30-architecture-foundation.md`
- `31-determinism-and-verification.md`

There may be additional relevant documents.

**Do not assume the list above is exhaustive.**

Search the repository and establish the actual current documentation structure.

---

# 2. Recover the Original Product Vision

Extract the intended game from the documents.

Answer concretely:

### What is NOVA?

Describe:

- genre
- player fantasy
- tone
- intended emotional experience
- scale
- setting
- simulation philosophy
- relationship between planning and observation
- intended session structure
- intended long-term progression

Preserve the original intent rather than replacing it with generic city-builder conventions.

Pay particular attention to the original statement:

> "Build a civilization. Watch it become something else."

Explain what this means mechanically and experientially.

Do not reduce it to marketing language.

---

# 3. Reconstruct the Intended Full Game

Build a complete model of the game described by the documentation.

Identify the intended progression from the beginning of a settlement through its mature/end-state experience.

For every major phase, document:

- player's situation
- player's main decisions
- available systems
- constraints
- resources
- buildings/infrastructure
- workforce implications
- progression
- objectives
- failure states
- what changes from the previous phase
- why the phase exists

The objective is to determine whether the original design describes only the current settlement foundation or a substantially larger game.

---

# 4. Compare Vision vs Current Implementation

Inspect the actual codebase.

Do not rely only on historical roadmap documents.

Create a factual comparison:

| System / Experience | Original Vision | Current Implementation | Status |
|---|---|---|---|
| Settlement foundation | ... | ... | Implemented |
| Growth | ... | ... | Missing / Partial |
| Production | ... | ... | ... |
| Technology | ... | ... | ... |
| Transportation | ... | ... | ... |
| World / external demand | ... | ... | ... |
| etc. | ... | ... | ... |

Use precise terminology.

Possible statuses:

- Implemented
- Partially implemented
- Prototype
- Deferred
- Not implemented
- Superseded
- Contradicted by current design
- Ambiguous in documentation

Do not automatically treat every old idea as mandatory.

---

# 5. Resolve Historical DEFER Decisions

Several previous investigations intentionally deferred areas such as:

- production chains
- growth
- external/world demand
- currency/markets/pricing
- transport
- vehicles
- technology

These decisions were correct for the foundation phase.

However, they must now be reconsidered **in the context of the complete game vision**.

For each deferred area, determine:

1. Was it explicitly part of the original product vision?
2. What player problem was it intended to solve?
3. What decision would it create?
4. At what stage of the game would it become relevant?
5. Does the current foundation provide the necessary extension seam?
6. Should it become part of the full game?
7. If yes, what is the smallest coherent form that preserves NOVA's identity?
8. If no, what evidence/documentation supports removing it?

Do not resurrect mechanics merely because they appeared in an old roadmap.

---

# 6. Identify the Actual Missing Game

The most important output of this step is not a list of missing features.

Determine:

> **What experience is missing between the current Town/free-play state and the full NOVA experience described by the original vision?**

Think in terms of player experience and decisions.

For example, determine whether the current game is missing:

- meaningful growth
- new scales of planning
- new forms of resource interdependence
- technological transformation
- civilization-level consequences
- world interaction
- long-term objectives
- changing environmental/system constraints
- a true endgame
- a meaningful transition from settlement to civilization

Only identify these if supported by the documentation.

---

# 7. Define the Full Product Structure

Produce a proposed high-level structure for the complete game.

Do not turn this into dozens of small features.

Instead identify **major product phases**.

For each phase specify:

### Phase name

### Player experience

### New decisions introduced

### Systems involved

### What changes from the previous phase

### Completion condition

### Required foundation

### Persistence implications

### Whether it should be deterministic

### Whether it should remain compatible with SAVE_VERSION 8 or require a future migration

The goal is a production-level model, not implementation detail.

---

# 8. Define the Long-Term Gameplay Arc

NOVA should have a coherent arc.

Document the intended transformation:

```text
Wilderness
    ↓
Settlement
    ↓
Village
    ↓
Town
    ↓
?
    ↓
?
    ↓
Civilization / End State
```

Fill the later phases only from the recovered product vision and reasoned reconciliation.

Do not use generic city-builder progression simply because it is conventional.

For every transition, explain:

- what new problem appears;
- what new decision becomes possible;
- why the player cares;
- what makes the transition mechanically meaningful.

---

# 9. Define What "Complete Game" Means

Create an explicit completion contract.

A complete NOVA should have:

- a coherent beginning;
- a meaningful middle;
- a developed late game;
- meaningful progression;
- meaningful strategic decisions throughout;
- a recognizable long-term arc;
- a deliberate end state;
- replayability where appropriate;
- coherent UX;
- coherent visual identity;
- deterministic simulation;
- robust persistence;
- reliable browser verification.

Do not interpret "complete" as "contains many mechanics".

A smaller but coherent system is preferable to feature accumulation.

---

# 10. Preserve the Frozen Foundation

The current foundation is valuable and must not be casually rewritten.

Treat the following as frozen unless the reconciliation proves that the original product vision fundamentally requires a deliberate redesign:

- deterministic simulation architecture
- domain/application/rendering separation
- economy foundations
- workforce foundations
- road foundations
- progression foundations
- scenario foundations
- persistence architecture
- SAVE_VERSION = 8
- RenderSnapshot boundary
- current visual identity
- current HUD interaction model
- fixed-camera philosophy

If a future product phase genuinely requires changing one of these, document it explicitly as a **future architectural/product decision**.

Do not silently modify the foundation during 10DG.

---

# 11. Establish a Real Production Roadmap

Produce a roadmap after the reconciliation.

It should contain a limited number of major phases, for example:

```text
Foundation
    ↓
Early Settlement
    ↓
Town
    ↓
Phase X
    ↓
Phase Y
    ↓
Late Game
    ↓
End State
    ↓
Replay / Sandbox
```

Use actual names derived from the product vision.

For each major phase include:

- purpose
- player-facing outcome
- major systems
- dependencies
- risk
- verification strategy
- expected scope

Avoid turning the roadmap into 50 tiny tickets.

The roadmap should support **large coherent implementation steps**.

---

# 12. Define the Next Implementation Phase

After the full reconciliation, select the first concrete implementation phase.

This is important:

The step may conclude that more than one large phase remains.

That is fine.

But identify the **first implementation target** based on:

- product dependency;
- player experience;
- architectural readiness;
- alignment with the original vision.

Do not rank arbitrary alternatives.

Do not use a generic "next audit".

The next step after 10DG should be an actual product implementation step.

---

# 13. Documentation Updates

Create:

`docs/roadmap/Step10DG.md`

The document must contain:

1. Executive summary
2. Original vision recovered
3. Current product state
4. Vision vs implementation matrix
5. Historical DEFER reconciliation
6. Missing experience
7. Full game structure
8. Gameplay arc
9. Complete-game definition
10. Frozen foundation constraints
11. Long-term production roadmap
12. First implementation phase
13. Risks and unresolved questions
14. Explicit decision / handoff

If the existing documentation contains factual inconsistencies discovered during this work, document them clearly.

Do not rewrite historical documents merely to make history look cleaner.

Historical roadmap documents remain historical records.

---

# 14. Verification

This step changes documentation/product planning only.

Therefore:

### Required

- inspect all relevant Markdown documentation;
- inspect relevant source architecture;
- inspect current tests where necessary to verify implementation claims;
- ensure the roadmap does not contradict frozen contracts;
- ensure `SAVE_VERSION = 8` remains unchanged;
- `git diff --check`;
- repository status audit;
- verify no unintended source changes.

### Do not perform unnecessary implementation work.

No gameplay implementation.

No new mechanics.

No UI redesign.

No persistence changes.

No camera changes.

No rendering changes.

No SAVE_VERSION migration.

GPU/browser testing is not required unless the investigation reveals an actual current implementation discrepancy that must be verified.

---

# 15. Git Discipline

Before starting:

```bash
git status --short
git branch --show-current
git log -5 --oneline
```

Preserve user-owned/untracked files.

In particular, do not modify or recreate:

- `AGENTS.md`
- `docs/roadmap/Step10BO - Copy.md`
- `docs/roadmap/Step10BT.md`

if they are absent or untracked from the existing workspace.

Do not clean unrelated work.

At the end:

```bash
git diff --check
git status --short
git diff --stat
git diff
```

The final diff must contain only the intended 10DG documentation work.

---

# 16. Commit

If all verification passes, create exactly one commit:

```text
docs(nova): reconcile full product vision
```

Do not push.

---

# 17. Final Report

Report:

### Product conclusion

What is the complete NOVA game according to the recovered vision?

### Current position

Where are we today relative to that game?

### Missing experience

What major experience remains to be built?

### Roadmap

What are the major remaining production phases?

### First implementation target

What should the next implementation step build, and why?

### Documentation

Which files were created/changed?

### Verification

Include exact results for:

- documentation consistency
- tests, if run
- typecheck, if run
- lint, if run
- build, if run
- `git diff --check`
- final git status
- commit hash

Do not claim checks that were not actually executed.

---

# Critical Product Principle

This is the point where NOVA moves from:

> **"We have a very solid simulation foundation."**

to:

> **"We are deliberately building the complete game that this foundation was created to support."**

Do not invent filler mechanics.

Do not restart the foundation.

Do not perform another generic depth audit.

Recover the vision, reconcile it with reality, define the complete product, and establish the production path forward.

Then stop and report.

No push.

---

# Full Product Vision Reconciliation (as-built)

Documentation/product planning only. `src/` is unchanged. Sources: `docs/00-CMD.md`,
`01-product-vision.md`, `02-game-design.md`, `03-core-loop.md`,
`04-city-simulation.md`, `05-world-and-terrain.md`, `06-construction.md`,
`07-population.md`, `08-economy.md`, `09-economy-foundation.md`,
`10-technology.md`, `11-time-and-events.md`, `12-visual-direction.md`,
`13-ux-and-interface.md`, `14`-`18`, `19-accessibility.md`, `20-strategy.md`,
`21-simulation-progression.md`, `22-canonical-simulation.md`,
`23-product-contract.md`, `24`-`31`, and the frozen baseline recorded in
`docs/roadmap/Step10DE.md`.

## 1. Executive Summary

The documentation describes a game **larger** than the current implementation,
but it also **deliberately leaves the later game undecided**. `docs/README.md` §8
names what is intentionally unresolved: exact colonist depth, exact resource
catalogue, detailed needs model, economic granularity, **end-state / progression
structure**, advanced transport, technology progression, late-game
specialization.

The current build implements the *settlement foundation* (Phases 0-7):
infrastructure → housing → colonists → needs → first production → additional
service → work → money/affordability, plus roads/access/mobility, storage,
progression to Town and 11 authored scenarios. The vision's remaining loop
(`demand → investment → capacity → usage → growth → new demand`) is **not
implemented as spatial development**: population grows automatically, but the
settlement does not grow itself, and the later arc (production economy,
transport logistics, technology/specialization, end state) is undecided.

The reconciliation therefore (a) records the recovered vision, (b) maps it
against the implementation, (c) resolves the historical DEFERs *in the context
of the full vision* rather than the foundation phase, and (d) selects the first
implementation phase: **G1 — Demand-Driven Settlement Growth**, whose smallest
slice reuses the frozen construction economy and adds no persisted state.

## 2. Original Vision Recovered

- **What NOVA is**: a minimal, visual and causal **colony/city simulator** where
a small number of understandable rules produce *believable settlement growth*
(`01-product-vision.md`).
- **Player role**: the settlement planner/operator; agents execute daily life
inside the system the player creates (`02-game-design.md`).
- **Pillars**: Causality, Readability, Determinism, Infrastructure first,
Minimalism, Visual feedback, Progressive complexity.
- **Tone/setting**: dark, restrained, futuristic maquette (frozen by 10DC,
`12-visual-direction.md`); contemplative rather than noisy.
- **Scale**: intentionally small — a controlled grid, not a procedural
mega-simulator; the explicit foundation non-goals forbid a giant tech tree,
dozens of resources, complex politics, vehicles as collectibles, decorative
city spam, arbitrary population growth and procedural complexity without
gameplay value — **"Original mechanics can come later. First establish a sound
simulation."**
- **Simulation philosophy**: the simulation owns truth; every important outcome
has an understandable cause; infrastructure ≠ operational state ≠ satisfied
service ≠ satisfied need (`00-CMD.md`, `23-product-contract.md`).
- **Planning vs observation**: the player builds/connects/enables/expands;
consequences appear over time and must be readable.
- **Session/long-term structure**: start almost empty; establish infrastructure;
attract colonists; grow into a functioning settlement; later specialize. The
long-term dependency order is `Infrastructure → services/capacity → needs →
agents → work/economy → production → transport → settlement growth →
specialization/technology` (`00-CMD.md`).
- **The tagline**: "Build a civilization. Watch it become something else."
  **appears nowhere in the design documents** — only in this step's prompt. It
  is a documentation inconsistency (the tagline is the product owner's framing,
  not repository content). Mechanically it means: the same causal rules should
  keep producing **emergent, explainable change** beyond the player's direct
  placement — the settlement should *become something else* (grow, densify,
specialize) without a scripted script. That is exactly the demand-driven growth
principle the docs name but the build does not yet express.

## 3. Current Product State

Per Step 10DE (authoritative frozen baseline): a 12x12 deterministic board; four
building types + one-cell roads; construction lifecycle (2 ticks, crew −1);
housing capacity → colonist admission (food/water gated); Food/Water/Material
stocks with producers, consumers, storage hub and upkeep; Material income
(1/1/2), affordability (same-tick inflow + building-only protected reserve);
workforce assignment (mobility-gated, manual override); roads/access/mobility;
derived progression Wilderness → Settlement → Village → Town; 11 authored
scenarios; `SAVE_VERSION = 8`; 1872 tests; verified browser + GPU paths.

## 4. Vision vs Implementation Matrix

| System / Experience | Original Vision | Current Implementation | Status |
| --- | --- | --- | --- |
| Controlled world/grid, placement, lifecycle | required (`01`,`06`) | implemented | **Implemented** |
| Housing → colonist causal chain | required (`03`,`25`) | implemented | **Implemented** |
| Needs (Food, Water) | one need then a second essential service (`26` P3-P5) | Food + Water with consequences | **Implemented** |
| Work / employment / labour | required (`26` P6) | jobs, assignment, mobility gating | **Implemented** |
| Money / income / affordability | required (`26` P7) | Material as currency, income + spending + affordability | **Implemented** |
| Roads / accessibility / mobility | infra-first (`00`,`26` P9 pre-req) | networks, access, mobility connectivity | **Implemented (access half)** |
| Storage / capacity / reserve | storage + failure semantics (`08`) | hub + protected reserve | **Implemented** |
| Progression to Town | derived stages (`21`) | Wilderness→Town + scenarios | **Implemented (to Town)** |
| Production economy (inputs→outputs→consumption) | `26` P8 | none (no inputs/chains) | **Not implemented** |
| Transport movement/logistics | `26` P9 | none (no movement) | **Not implemented** |
| Settlement growth (demand → spatial development) | `04`,`26` P10, core loop closure | population admission only; no spatial self-growth | **Partially implemented** |
| Vehicles | `26` P11 | none | **Not implemented** |
| Technology / specialization | `26` P12, `10` | none | **Not implemented** |
| End state / full progression structure | "intentionally undecided" (`README` §8) | undefined | **Ambiguous / undecided** |
| Zones / autonomous development | earlier validated concept (`README` §4; MVP "useful") | none | **Not implemented / deferred** |
| Construction `disabled/abandoned` state | `06` lifecycle | operational/underConstruction only | **Partially implemented** |
| Construction consuming labour/time | `06` future extension | Material/Water only | **Partially implemented** |
| Power / other services | `07` future conditions | none | **Not implemented** |

## 5. Historical DEFER Reconciliation

Each DEFER was correct **for the foundation phase**. Reconsidered against the
full vision:

| Deferred area | In the vision? | Player problem it would solve | Decision it would create | Stage | Extension seam present? | Should it be in the full game? | Smallest coherent form |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Production inputs/chains (P8) | yes (roadmap; economy docs) | interdependence beyond the three stocks | allocate/convert resources across a chain | mid | yes (resources + buildings + RenderSnapshot) | yes, later | one input → one output conversion on an existing building |
| Settlement growth (P10) | yes (core loop + `04`) | settlement does not develop itself; the loop never closes | steer where/when growth happens; stage capacity | **next** | yes (roads/access + construction economy) | **yes — selected** | demand-driven Residence expansion on road-adjacent cells, funded by the existing Material economy |
| External/world demand (10CM) | implied (transport as a system) | a reason to move goods/people | trade/export decisions | late | no world state | not yet (no documented concept) | — |
| Currency/markets/pricing | money exists; markets are a non-goal | — | — | — | Phase 7 complete | no (explicitly refused) | — |
| Transport movement/logistics (P9) | yes | accessibility/cost of distance | routing/logistics decisions | after growth + production | access half exists | yes, later (needs a movement reason) | movement over the existing network with a cost/consequence |
| Vehicles (P11) | yes (design rule 17) | — | — | after transport demand | no | only when transport demand justifies | — |
| Technology/specialization (P12) | yes (`10`) | solving real constraints | choose capabilities that unbind a constraint | late | derived constraints exist | yes, when constraints exist worth solving | one technology that removes one named constraint |
| Camera/framing (10DB) | fixed maquette framing | — | — | — | — | no (accepted) | — |
| Visual tier (10DC) | restrained | — | — | — | — | no (healthy) | — |

**Resolution**: the DEFERs of *mechanism* stand where the docs remain silent on
structure (production chains, transport, technology), but the vision explicitly
names **settlement growth as the core-loop closure**. The earlier growth
investigations (10CL/10CM) tested *population* growth and external demand — both
already present or undocumented — and therefore found no new decision. **Spatial
self-growth (autonomous development / roads as an emergent consequence) is a
distinct, vision-named experience that was never implemented.** That is the gap
this reconciliation reopens, by product decision recorded here.

## 6. Missing Experience

Between the current Town/free-play state and the documented full vision, the
missing experience is:

1. **The closed causal loop** — `demand → investment → capacity → usage →
growth → new demand`. Today the player places every building; nothing grows in
response to the demand the player created. The settlement cannot "become
something else".
2. **A new scale of planning** — roads/coverage as *growth infrastructure*
(where can the settlement grow, and can services keep up) rather than only as an
access gate for buildings the player places.
3. **Interdependence** (production economy) and **distance cost** (transport)
that would give the later settlement a reason to specialize.
4. **Transformation** (technology/specialization) and **a deliberate end
state** — both explicitly undecided in the documentation.

The first three are consequences of growth; growth is therefore the correct
first missing experience. Technology/end-state cannot be defined until the
society they transform exists.

## 7. Full Game Structure

Major product phases (not features):

| Phase | Purpose | Player experience | New decisions | Systems | Completion condition | Foundation required | Persistence | Deterministic | Save version |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F0 Foundation | causal settlement core | build a viable settlement | placement, workforce, economy | all current | Town reachable, scenarios authored | — (done) | current | yes | 8 |
| **G1 Settlement growth** | close the loop: demand drives spatial development | the settlement grows around your infrastructure | where growth may happen; staging capacity/services; funding growth | growth demand + autonomous Residence expansion over existing roads/construction | the settlement expands sustainably for N ticks | F0 + roads/access | none (reuses buildings/roads; no new ledger) | yes | **8 (no change)** |
| G2 Interdependence | production economy + distance cost | manage inputs/outputs and logistics | convert, transport, prioritize | production inputs/outputs; transport movement | a settled chain delivers a good to consumers | G1 | likely new state | yes | future decision |
| G3 Transformation | technology/specialization | unbind a named constraint | choose capabilities | technology as constraint-solving | a specialization changes the settlement's limits | G2 | likely new state | yes | future decision |
| G4 End state | deliberate mature civilization | reach and recognize a mature state | long-horizon tradeoffs | derived from G1-G3 | the documented end-state contract is met | G3 | derived | yes | future decision |
| S Replay/sandbox | revisit and experiment | replay scenarios; extend the sandbox | — | scenarios + sandbox | — | all | current | yes | 8 |

Each later phase stays gated by the product rules (evidence + no premature
complexity); only G1 is selected now.

## 8. Gameplay Arc

```text
Wilderness        (nothing built)
  ↓              build a place to live
Settlement        (pop ≥ 1, food balance, a road network)
  ↓              add a second service and jobs
Village           (pop ≥ 2, water capacity, food balance)
  ↓              staff production and survive the storage/upkeep economy
Town              (Village + staffed Workshop)  ← implemented today
  ↓              G1: demand makes the settlement grow on the roads you built
Growth            (the settlement expands; you stage capacity and services)
  ↓              G2: growth needs goods it cannot make locally
Interdependence   (inputs → production → outputs → transport/logistics)
  ↓              G3: constraints become solvable by capability
Transformation    (technology/specialization removes named limits)
  ↓              G4: the society reaches a deliberate mature state
Civilization      (end state / mature settlement)
  ↓
Replay / Sandbox
```

Transition rationale:

- **Town → Growth**: today nothing changes when the settlement has capacity but
  no construction; with demand-driven growth, the player's roads/services become
  the *shape* of the future settlement, so infrastructure planning gains a second
  horizon. This is the mechanical meaning of "watch it become something else".
- **Growth → Interdependence**: a larger settlement with more specialised
  buildings needs goods that are not universally producible; conversion and
  distance become real costs.
- **Interdependence → Transformation**: constraints that logistics cannot solve
  (a cap, a shortage, a rate) become technology's job — technology must *solve a
  named constraint*, not decorate a tree (`10-technology.md`, design rule 18).
- **Transformation → End state**: the mature state is not a new mechanic but the
  recognisable sum of the previous decisions; its exact contract remains a future
  product decision (documentation currently undecided).

## 9. Complete-Game Definition

A complete NOVA keeps the current contract (`23-product-contract.md`) and adds:

- a coherent beginning (empty → viable), middle (Town + growth) and late game
  (interdependence → specialization);
- the closed causal loop: every settlement change traces to demand, capacity,
  investment or capability;
- meaningful decisions at every scale (placement → growth steering → conversion →
  capability), never timers or decoration;
- a recognisable long-term arc and a deliberate, readable end state;
- replayability from scenarios, growth variation and specialisation;
- deterministic simulation, robust persistence and browser verification
  throughout.

Completeness ≠ mechanic count: the same minimalism rule applies — each new
system must answer the design test (who needs it, what provides it, what does it
consume, what happens when absent, what communicates it).

## 10. Frozen Foundation Constraints

Preserved unless a future product decision explicitly changes them: domain/
application/rendering separation (no Three.js in domain/application),
deterministic tick pipeline and hashing, economy foundations (income 1/1/2,
Workshop 2/1, cap 25, hub 50/30/40, protected reserve 15, affordability),
workforce rules, road/access rules, progression to Town, `SAVE_VERSION = 8`,
the `RenderSnapshot` boundary, the visual identity, the HUD interaction model
and the fixed-camera philosophy. G1 is designed to add a deterministic phase
without changing any of these and without new persisted state.

## 11. Long-Term Production Roadmap

| Phase | Purpose | Player-facing outcome | Major systems | Dependencies | Risk | Verification | Expected scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F0 Foundation | done | playable settlement core | all current | — | — | 1872 tests, browser, GPU | done |
| **G1 Growth** | close the causal loop | the settlement visibly grows on your infrastructure | growth demand query + deterministic expansion phase using the existing construction economy | roads/access, construction, housing, storage | treadmill growth; over-expansion; service collapse; determinism of the cell choice | deterministic unit tests (order, no-growth when unaffordable/unsustainable), replay/hash, save/load, browser + GPU, responsive | large single slice (one phase, one decision) |
| G2 Interdependence | production economy + distance cost | goods and logistics add a second constraint axis | inputs/outputs, transport movement over existing networks | G1 | speculative chains, balance | determinism, chain invariants, browser | large |
| G3 Transformation | technology/specialization | a capability removes a named limit | constraint-solving capabilities | G2 | tech-tree sprawl | constraint deltas, determinism | medium |
| G4 End state | deliberate mature state | a recognisable civilization end | derived state + end-state contract | G3 | undefined contract | end-state acceptance tests | medium |
| S Replay/sandbox | revisiting and experimenting | replayable scenarios + sandbox | scenarios, growth variation | all | — | browser | continuous |

Each phase is a large coherent implementation step, not a ticket list; later
phases remain gated by the product rules and the documentation's undecided items.

## 12. First Implementation Phase

**G1 — Demand-Driven Settlement Growth (first vertical slice).**

Why this phase: it is the only vision-named experience that is missing *and*
unblocked by the frozen foundation, and it closes the documented core loop
(`demand → investment → capacity → usage → growth → new demand`). It is distinct
from the deferred *population* growth (already implemented) and from external
demand (undocumented).

Smallest coherent slice:

- **New derived signal**: settlement **growth demand** — e.g. unhoused colonist
  desire (population at capacity / waiting admission) plus unserved-residence
  demand, derived from existing state (no new stock).
- **New deterministic phase**: when growth demand exists and the settlement can
  afford it, the settlement places **one Residence per tick** on the next
  eligible cell in a stable order (road-adjacent to an operational network,
  in-bounds, free), using the **existing construction transaction** (25 Material,
  2 ticks, road access, housing capacity, admission) so the economy, storage,
  workforce and progression contracts are untouched.
- **New decision**: roads and service placement become *growth infrastructure* —
  the player decides where the settlement may expand and whether services can
  keep up; letting growth run can outpace Water/Food and stall admission.
- **No new persisted state**: expansion consumes existing Material and creates
  existing buildings; the cell choice is a pure function of state, so
  `SAVE_VERSION` stays 8 (documented: if a growth ledger proves necessary, a
  future migration would be a separate product decision).

Explicitly excluded from the first slice: population growth changes, external
world, production chains, transport movement, vehicles, technology, a new HUD
panel, new building types, and any change to existing rules or scenarios.

## 13. Risks and Unresolved Questions

- **Freeze tension**: G1 adds a simulation phase, which the 10DE freeze permits
  only via an explicit product decision. This document records that decision;
  the earlier growth DEFER (10CL) is superseded for the *full-vision* phase, not
  by new mechanical evidence. This must be stated honestly in any implementation
  step.
- **Treadmill risk**: autonomous growth could repeat existing pressure at a
  larger scale (10CL's finding). Mitigation: growth must be gated by real
  demand *and* affordability *and* service sustainability, and it must create the
  new decision (where/whether growth can happen) rather than a timer.
- **Determinism of the expansion cell**: the choice must use a stable ordering
  (coordinate/id tie-break) and be covered by replay/hash tests.
- **Savings/service collapse**: growth spending could starve upkeep/Food/Water;
  this is intended pressure but must remain recoverable and legible.
- **Undecided documentation**: the end state, resource catalogue, needs depth,
  economic granularity, transport, technology and late-game specialization are
  still explicitly undecided (`docs/README.md` §8); G2-G4 must make those product
  decisions before implementation.
- **Tagline provenance**: "Build a civilization. Watch it become something else."
  is not in the design documents; it should be added to `01-product-vision.md`
  if it is authoritative, or treated as an external framing.

## 14. Explicit Decision / Handoff

**Decision**: recover the vision as above; keep the frozen foundation; select
**G1 — Demand-Driven Settlement Growth** as the next product phase, with the
first slice defined in §12. The historical DEFERs for production/transport/
technology remain in force as *gated* later phases; growth is reopened by this
full-vision product decision.

**Handoff**: the next step is an implementation step for G1's first vertical
slice — a new deterministic growth phase + derived demand query + tests +
browser verification — preserving economy, workforce, roads, progression,
scenarios, visuals, camera, HUD and `SAVE_VERSION = 8`. Do not start G2-G4
before G1 is complete and verified.

**Documentation inconsistencies found** (recorded, not rewritten): the tagline
absent from the docs; the roadmap's later phases named but structurally
undecided; `26-roadmap.md` Phase 9 transport assumes a movement reason that the
foundation does not yet provide.

Commit: `docs(nova): reconcile full product vision`
