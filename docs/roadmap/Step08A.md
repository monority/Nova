# NOVA — Step 08A — Economy / Progression Audit

## Context

NOVA est un city-builder/simulation déterministe.

Le système actuellement implémenté couvre :

```text
Residence
  ↓
Housing capacity
  ↓
Colonist admission
  ↓
Food consumption
  ↓
Food production via Farms
  ↓
Workplace assignment via Workshops
  ↓
Labor
  ↓
Construction material production
  ↓
More buildings
```

Current core mechanics:

* deterministic simulation;
* immutable `SimulationState`;
* pure simulation phases;
* Residence:

  * construction cost = 25 material;
  * construction = 2 ticks;
  * housing capacity = 1;
* Farm:

  * construction cost = 25 material;
  * construction = 2 ticks;
  * produces +2 food/tick while operational;
  * worker-independent;
* Workshop:

  * construction cost = 25 material;
  * construction = 2 ticks;
  * job capacity = 1;
  * each employed colonist produces +2 construction material/tick;
* Colonist:

  * admitted through housing + food;
  * consumes 1 food/tick;
  * can have one `workplaceId`;
* Jobs:

  * automatic deterministic assignment;
  * colonists ascending ID;
  * Workshops ascending ID;
  * unemployment is valid;
* starvation:

  * if food cannot feed the colony, all colonists are removed;
  * employment disappears with them;
* construction material:

  * initial stock = 100;
  * worker output is uncapped;
  * no money/income/demand system exists yet.

The latest implementation passed the existing unit, typecheck, lint, build and real-browser E2E validation.

Do NOT assume the next system is Money simply because the roadmap mentions Money.

---

# Mission

Perform **Step 08A — Economy / Progression Audit**.

This is an **AUDIT-ONLY step**.

Your job is to determine whether the current economy/progression loop is coherent, playable and appropriately paced, and what the **smallest justified next mechanic** should be.

Do not implement anything.

Do not refactor anything.

Do not modify gameplay code.

Do not modify UI.

Do not add tests except temporary non-committed instrumentation if absolutely necessary for the audit.

At the end, produce a detailed audit report and a clear implementation recommendation.

---

# 1. Read the authoritative documentation first

Before touching the implementation, inspect the relevant documentation.

At minimum inspect:

```text
docs/00-CMD.md
docs/02-game-design.md
docs/03-core-loop.md
docs/06-*
docs/07-population.md
docs/08-economy.md
docs/09-economy-foundation.md
docs/11-time-and-events.md
docs/18-*
docs/20-*
docs/21-progression.md
docs/26-roadmap.md
docs/29-design-rules.md
docs/30-*
docs/31-*
```

Also inspect any documents introduced or updated during Steps 05A–07C.

Determine:

1. What the intended progression currently is.
2. Where Jobs are supposed to lead.
3. Where Money/Income is supposed to appear.
4. Whether Money is actually a gameplay necessity at this point.
5. Whether another need/service/resource is expected before Money.
6. What the intended economic sinks are.
7. What the intended production/consumption relationship is.
8. What the intended scarcity/progression constraints are.

Clearly distinguish:

```text
DOCUMENTED REQUIREMENT
DESIGN INTENTION
CURRENT IMPLEMENTATION
OPEN DESIGN QUESTION
```

Do not silently reinterpret ambiguous documentation.

---

# 2. Audit the actual implementation

Inspect the current code.

Pay particular attention to:

```text
src/domain/
src/application/
src/app/
src/renderer/
tests/
e2e/
```

Verify the real current loop rather than relying on previous reports.

Confirm:

* resource initialization;
* building costs;
* construction duration;
* housing capacity;
* colonist admission;
* food consumption;
* farm production;
* job assignment;
* workshop capacity;
* material production;
* starvation;
* employment loss;
* persistence/version;
* hash participation;
* deterministic ordering;
* tick order.

Do not change any of these systems.

---

# 3. Build the actual economic model

Write down the current economy quantitatively.

At minimum derive:

### Starting state

```text
Material = ?
Food = ?
Colonists = ?
Housing = ?
Farms = ?
Workshops = ?
Jobs = ?
```

### Per-tick flows

For a population of `P`:

```text
Food consumption = P × 1
Food production = Farms × 2
Material production = employedColonists × 2
```

### Construction

Every building currently costs:

```text
25 material
```

and requires:

```text
2 construction ticks
```

Model how quickly a colony can create:

* its first Residence;
* its first Farm;
* its first Workshop;
* multiple Workshops;
* multiple Residences;
* a sustainable food system;
* a material-producing workforce.

Explicitly identify the bottleneck at each stage.

---

# 4. Perform actual progression simulations

Do not only reason from source code.

Run deterministic simulations for several meaningful colony configurations.

At minimum evaluate:

### Scenario A — Housing only

```text
Residence × N
```

Determine:

* when colonists appear;
* when food declines;
* when starvation happens;
* whether additional housing is meaningful.

### Scenario B — Food stabilization

```text
Residence + Farm
```

Determine:

* food net/tick;
* whether the colony becomes sustainable;
* whether the player can understand why.

### Scenario C — First workplace

```text
Residence + Farm + Workshop
```

Determine:

* when the first worker appears;
* material production rate;
* time required to afford another building.

### Scenario D — Workforce scaling

Evaluate:

```text
2 colonists / 1 Workshop
2 colonists / 2 Workshops
4 colonists / 2 Workshops
4 colonists / 4 Workshops
```

Determine:

* employed vs unemployed;
* material production;
* food consumption;
* whether Jobs creates meaningful choices.

### Scenario E — Expansion

Simulate a colony attempting to grow continuously.

Measure:

* material generation;
* building acquisition rate;
* food sustainability;
* housing expansion;
* workforce expansion.

Determine whether the loop naturally creates:

```text
investment → growth → constraint → investment
```

or whether it becomes:

```text
build workshop → wait → print material → build everything
```

---

# 5. Audit pacing carefully

This is one of the main goals of this step.

Current worker output is:

```text
+2 material / worker / tick
```

Current building cost:

```text
25 material
```

Therefore one continuously employed worker theoretically generates one building's material cost in:

```text
12.5 ticks
```

Do not automatically call this good or bad.

Instead determine what it means in actual gameplay.

Measure:

* time from first colonist to first worker;
* time from first worker to next building;
* time from one Workshop to another;
* time from one Residence to sustainable population growth;
* time required to reach several workers;
* how quickly material generation compounds.

Check whether there is a meaningful decision between:

```text
Residence
Farm
Workshop
```

or whether one building dominates economically.

Specifically investigate:

> Is Workshop investment always superior once food is stable?

> Is housing merely a prerequisite for more workers?

> Is Farm investment merely a tax required to prevent starvation?

> Does the player have a meaningful reason to delay expansion?

> Does the economy have a meaningful sink?

Do not answer these subjectively. Support conclusions with concrete simulations and numbers.

---

# 6. Audit economic sinks

Current construction material is primarily a construction currency.

Determine whether the current game has enough sinks to make material production meaningful.

Map:

```text
Material
  ↓
Construction
  ↓
?
```

Identify what currently consumes material.

Then determine whether the current loop has:

* production;
* consumption;
* scarcity;
* opportunity cost;
* compounding production;
* meaningful limits.

If material becomes effectively infinite after establishing one stable worker, document that precisely.

Do NOT invent a sink just to solve the problem.

---

# 7. Audit the role of Money

This is a critical part of Step 08A.

Read the documentation surrounding:

```text
Money
Income
Demand
Consumption
Trade
Jobs
Work
Economy
Progression
```

Then determine whether introducing Money **now** is justified.

Possible outcomes include:

### Outcome A

Money is the natural next mechanic.

Explain exactly why:

```text
current system → missing relationship → Money solves it
```

### Outcome B

Money is documented but premature.

Explain what system should exist first.

### Outcome C

Another mechanic is required before Money.

Identify the smallest one and explain its causal role.

Do not implement anything.

Do not choose Money merely because it is listed next in a roadmap.

---

# 8. Verify whether Jobs currently has enough gameplay meaning

Current Jobs provide:

```text
Workshop
→ employment
→ +2 material/tick
```

Determine whether this creates a genuine economic relationship.

Questions to answer:

* Does population size matter beyond food consumption?
* Does housing capacity create an economic decision?
* Does unemployment matter?
* Does Workshop capacity matter?
* Is labor scarce?
* Is labor abundant?
* Can the player deliberately choose between more housing and more workplaces?
* Does increasing population create both benefits and costs?
* Is food currently the main governor?
* Is material currently the main governor?
* Does Workshop output create a runaway loop?

Again, use numbers and actual play.

---

# 9. REAL BROWSER PLAYABILITY — REQUIRED

This is not optional.

Use the real browser E2E environment already established by the project.

Prefer the established headed Windows Chromium workflow when available.

Do not substitute a unit test for player validation.

Actually play the current build as a first-time player.

At minimum perform:

1. Load fresh game.
2. Identify available building choices.
3. Place a Residence.
4. Advance time.
5. Observe colonist admission.
6. Place a Farm.
7. Observe food behavior.
8. Place a Workshop.
9. Observe employment.
10. Observe material production.
11. Expand housing/workplaces.
12. Observe unemployment.
13. Attempt to construct while material is insufficient.
14. Observe recovery after generating material.
15. Let the colony run long enough to observe whether the economy stabilizes, compounds or collapses.

Record actual visible values.

---

# 10. First-time-player comprehension

Play without relying on source code knowledge.

Ask:

### Can a new player understand:

* what to build first?
* why they need a Residence?
* why colonists appear?
* why food decreases?
* why Farms matter?
* why Workshops matter?
* why Jobs matter?
* why material increases?
* why another building becomes affordable?
* what the limiting resource is?
* what they are trying to achieve?

Also inspect whether the current UI communicates:

```text
current state
cause
consequence
next meaningful action
```

Do not propose a visual redesign unless the existing UI genuinely prevents understanding.

---

# 11. Audit the current forecast

The Food forecast was previously made net-aware.

Verify it remains mathematically correct under:

```text
population = 0
production > consumption
production = consumption
production < consumption
```

Also determine whether the forecast is sufficient for the current economic loop.

Do not add additional dashboards unless required.

---

# 12. Visual inspection

If screenshots are produced during the browser audit:

**Actually inspect them.**

Do not merely verify:

```text
file exists
PNG is non-empty
resolution is correct
```

Inspect the screenshots as a player.

Look for:

* hierarchy;
* readability;
* building differentiation;
* Jobs visibility;
* Material visibility;
* Food visibility;
* causal messages;
* overcrowding;
* misleading information;
* missing feedback.

If visual inspection cannot be performed in the current environment, explicitly say so.

Do not claim visual validation from file existence alone.

---

# 13. Determinism and architectural regression audit

Confirm that the audit scenarios do not reveal architectural inconsistencies.

Check:

* no `Math.random()`;
* no `Date.now()`;
* no hidden mutable simulation state;
* deterministic assignment;
* deterministic production;
* stable iteration order;
* immutable state transitions;
* derived values not persisted;
* hash includes authoritative state;
* persistence version remains coherent.

Do not refactor.

Only report findings.

---

# 14. Explicitly test for runaway progression

This is mandatory.

Try to establish whether:

```text
Workshop
→ Worker
→ Material
→ Workshop
→ Worker
→ Material
→ ...
```

creates an accelerating economy.

Quantify:

```text
workers
material/tick
food/tick
net food/tick
building affordability
```

over multiple stages.

For example, investigate trajectories such as:

```text
1 worker
2 workers
4 workers
8 workers
```

where the housing/food constraints permit it.

Determine whether the current food system naturally limits this expansion.

Do not propose arbitrary caps merely to slow the game down.

---

# 15. Identify the smallest missing economic relationship

At the end of the audit, explicitly write:

```text
CURRENT LOOP

A → B → C → D

MISSING RELATIONSHIP

X → Y

WHY IT MATTERS

...

SMALLEST NEXT MECHANIC

...

NOT YET NEEDED

...
```

The next mechanic must satisfy all of:

* documented or strongly implied by the design;
* causally connected to existing mechanics;
* adds a meaningful gameplay relationship;
* does not require a speculative abstraction;
* preserves existing Farm semantics;
* preserves existing Food semantics;
* preserves deterministic simulation;
* can be implemented as one focused step.

---

# 16. Do not implement

This step must produce **zero gameplay implementation changes**.

Do not:

* add Money;
* add Income;
* add Demand;
* add another resource;
* add another Need;
* modify Farm;
* modify Workshop;
* rebalance values;
* change building costs;
* change food consumption;
* change material production;
* change population rules;
* redesign the UI;
* refactor architecture.

If you discover a bug, document it.

If you discover a tiny UX issue, document it.

If a balance change appears necessary, document the measured reason rather than changing it.

---

# 17. Validation required before closure

Run the existing validation suite to prove the audit did not accidentally modify the project.

At minimum:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Run the relevant existing E2E suites as appropriate.

Prefer the complete E2E suite if practical.

Also verify:

```bash
git status --short
```

The expected result is **no implementation changes**.

If temporary audit instrumentation was created, remove it before closure.

---

# Final report format

Return a report with exactly these major sections:

## 1. Executive Summary

State:

```text
STATUS: READY FOR NEXT STEP
```

or:

```text
STATUS: BLOCKED
```

Explain why.

---

## 2. Documentation Findings

Table:

| Topic | Documented intent | Current implementation | Gap |
| ----- | ----------------- | ---------------------- | --- |

---

## 3. Current Economic Model

Include concrete formulas and current values.

---

## 4. Progression Simulation

Table:

| Colony configuration | Population | Food/tick | Material/tick | Jobs | Bottleneck | Observation |
| -------------------- | ---------: | --------: | ------------: | ---: | ---------- | ----------- |

Include multiple stages.

---

## 5. Pacing Analysis

Provide actual tick counts.

Especially:

* first colonist;
* first worker;
* next building;
* workforce scaling;
* food sustainability;
* material compounding.

---

## 6. Runaway / Bottleneck Analysis

Explicitly answer:

* What limits growth?
* What limits material?
* What limits population?
* What limits employment?
* Does the economy compound?
* At what point does scarcity disappear?

---

## 7. Real Browser Playability

Report:

* browser/environment;
* actual interactions;
* visible values;
* player-facing behavior;
* errors;
* screenshots inspected or not inspected.

---

## 8. First-Time Player Comprehension

Use:

```text
CLEAR
PARTIAL
UNCLEAR
```

for:

* first objective;
* Residence;
* Colonist;
* Food;
* Farm;
* Workshop;
* Jobs;
* Material;
* expansion;
* shortage.

Explain each briefly.

---

## 9. UX Findings

Separate:

```text
MUST FIX BEFORE NEXT MECHANIC
NICE TO HAVE
NO CHANGE REQUIRED
```

Do not redesign unnecessarily.

---

## 10. Money Decision

Choose one factual conclusion:

```text
MONEY IS THE NATURAL NEXT SYSTEM
```

or

```text
MONEY IS PREMATURE
```

or

```text
ANOTHER SYSTEM SHOULD PRECEDE MONEY
```

Then justify the conclusion from documentation + actual gameplay + economic relationships.

---

## 11. Smallest Next Mechanic

State exactly one recommended next mechanic.

Describe:

```text
Input
→ State change
→ Causal effect
→ Player-visible consequence
```

Keep it minimal.

Do not write implementation code.

---

## 12. Regression / Architecture Audit

Report:

* determinism;
* state purity;
* phase order;
* persistence;
* hashing;
* tests;
* E2E;
* build;
* git hygiene.

---

## 13. Final Verdict

End with exactly:

```text
NEXT STEP:
<single next step>

IMPLEMENTATION:
NOT PERFORMED

STATUS:
READY FOR DESIGN CONTRACT
```

If the economy requires another audit before implementation, say so explicitly.

The goal is not to maximize the number of systems.

The goal is to identify the **smallest next causal relationship that makes NOVA deeper without breaking the existing deterministic simulation**.
