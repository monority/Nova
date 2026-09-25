# Step 10CM — World / External Demand Investigation

## Role

You are continuing the NOVA deterministic contemplative colony-builder project.

This step is a **design investigation only**.

Do not implement gameplay, UI, persistence, commands, resources, buildings, progression stages, world simulation, narrative systems, scenarios, trade, transport, or external-demand mechanics unless this investigation reaches a concrete BUILD decision.

The purpose of this step is to investigate one specific product question:

> **If the internal settlement economy cannot naturally create post-Town demand, can the world around the settlement provide a meaningful reason for the player to act without turning NOVA into a generic quest/trade/city-builder system?**

This follows:

- 10CK — Post-Town Product Direction Gate
- 10CL — Growth Demand Investigation

10CL concluded:

> **DEFER. No growth mechanic is currently justified.**

The internal economy currently scales linearly and does not produce a new qualitative post-Town problem.

Therefore this step investigates whether the missing ingredient is **external/world context**, while preserving the possibility that the correct answer is still DEFER.

Do not assume external demand is required.
Do not assume narrative is required.
Do not assume exploration is required.
Do not manufacture a mechanic to avoid DEFER.

---

# 1. Read the existing decisions first

Before changing anything, read:

- `docs/roadmap/STEP10CL.md`
- `docs/roadmap/STEP10CK.md`
- `docs/roadmap/STEP10CJ.md`
- `docs/roadmap/STEP10CI.md`
- `docs/roadmap/STEP10CH.md`
- `docs/roadmap/STEP10CG.md`
- `docs/roadmap/STEP10CF.md`
- `docs/roadmap/STEP10CA.md`
- `docs/roadmap/STEP10BZ.md`
- `docs/roadmap/STEP10BY.md`

Also inspect the current repository for:

- world configuration;
- grid/world representation;
- map generation;
- scenario definitions;
- progression;
- objectives;
- population;
- buildings;
- resources;
- roads;
- accessibility;
- save/load;
- deterministic hashing;
- rendering/world presentation;
- any existing narrative, discovery, environment, event, or external-context concepts.

Search the repository for terms/concepts such as:

```text
world
planet
environment
discovery
exploration
outside
external
visitor
settlement
colony
origin
signal
anomaly
resource
deposit
land
region
scenario
objective
narrative
trade
mission
event
```

Do not treat a search hit as evidence that a system exists. Inspect the actual implementation/documentation.

---

# 2. Establish the actual current world model

Document what the "world" currently is in NOVA.

Answer concretely:

### Spatial world

- What does the 12×12 grid represent?
- Is it merely a buildable board or does it contain meaningful world information?
- Are cells homogeneous or differentiated?
- Are there currently environmental properties?
- Are there meaningful boundaries?
- Is there anything outside the buildable settlement?

### Temporal world

- Does anything external happen over time?
- Are there events?
- Does the environment change?
- Does anything observe or react to the settlement?

### External entities

Determine whether the current implementation contains:

- other settlements;
- factions;
- visitors;
- inhabitants outside the colony;
- trade partners;
- external infrastructure;
- wildlife;
- environmental systems;
- planetary phenomena;
- signals;
- discoveries;
- narrative objects.

If none exist, state that explicitly.

---

# 3. Verify the documented product identity

Inspect the actual current documentation and distinguish:

### Current implemented product

from:

### Historical / speculative concepts

Do not resurrect ideas simply because they appeared in old discussions.

In particular, verify whether concepts such as:

- Prometheus;
- mystery;
- alien origin;
- planetary discovery;
- external civilization;
- exploration;
- off-world resources;

are actually part of the current documented product direction.

If they are absent or explicitly deferred, say so.

The investigation must be grounded in the current repository.

---

# 4. Reconstruct the post-Town problem from 10CL

Start from the established result:

```text id="z0ub8w"
Town
  ↓
sustainable colony
  ↓
no internal demand
  ↓
growth would merely rescale existing systems
```

Then ask:

> What could exist outside the settlement that gives the player a meaningful reason to make a decision?

Do not answer with "quests" or "missions" yet.

First identify the **underlying source of demand**.

---

# 5. Investigate categories of external demand

Explore these categories independently.

## A. Environmental demand

Could the world/environment itself create meaningful decisions?

Examples to investigate conceptually:

- finite usable territory;
- different terrain;
- environmental constraints;
- distant resources;
- hazardous areas;
- changing conditions;
- planetary conditions.

But do not add arbitrary terrain modifiers merely to create complexity.

Ask:

> Does the environment create a decision that interacts with existing settlement systems?

---

## B. Resource discovery

Could external deposits or locations create demand?

Investigate:

```text
discovery
→ new strategic location
→ settlement response
→ workforce / roads / production consequences
```

But distinguish:

```text
new resource
```

from:

```text
new strategic spatial decision
```

A resource that simply increases Material/Food/Water production is not automatically a new product dimension.

---

## C. External actors

Could something outside the settlement create demand?

Potential conceptual categories:

- another settlement;
- expedition;
- visitors;
- external population;
- neutral actor;
- environmental system.

Do not invent personalities, factions, diplomacy, or trading systems unless evidence indicates that they belong in NOVA.

The question is not:

> "Could we make NPCs?"

It is:

> "Does the product currently have a justified external actor that creates a meaningful settlement decision?"

---

## D. Discovery / observation

Investigate whether **discovering information** could itself create meaningful demand.

For example:

```text
observe
→ learn something about world
→ revise settlement decision
```

Determine whether this would be:

- meaningful gameplay;
- merely lore;
- merely UI content;
- or a new system requiring substantial speculative infrastructure.

Do not equate "interesting lore" with "gameplay demand."

---

## E. External objectives

Investigate whether a world context could produce authored goals.

But explicitly distinguish:

### Scenario goal

```text
"Achieve X."
```

from:

### World-driven demand

```text
"The world contains X, therefore the settlement must decide how to respond."
```

10CJ already established that scenarios can produce meaningful authored endpoints.

Do not simply create more scenarios to mask the absence of world demand.

---

## F. Expansion / exploration

Investigate whether the settlement could eventually interact with territory beyond its current usable area.

This must be treated carefully.

Ask:

- Is the current 12×12 grid the entire world?
- Is it the settlement's local planning area?
- Is there evidence for a larger world?
- Would expansion create a genuinely new spatial problem?
- Would it merely increase board size?
- Would it require transport/pathfinding?
- Would it require new persistence structures?
- Would it change the contemplative nature of the product?

Do not implement expansion.

---

# 6. Determine whether external demand actually solves the product problem

For each plausible external source, complete this chain:

```text
External fact
    ↓
Player-visible consequence
    ↓
New settlement pressure
    ↓
Existing systems affected
    ↓
New decision
    ↓
Meaningful consequence
```

Reject candidates where the chain collapses into:

```text
External event
    ↓
arbitrary quest
    ↓
do task
    ↓
receive reward
```

That would be a content treadmill, not a new product loop.

Also reject:

```text
External resource
    ↓
more resource production
    ↓
more population
    ↓
more resource production
```

if no qualitative decision emerges.

---

# 7. Preserve the contemplative identity

Evaluate whether a world/external system would preserve NOVA's current identity:

> deterministic contemplative colony optimizer

Specifically examine:

- planning rather than reaction spam;
- spatial composition;
- workforce allocation;
- deterministic consequences;
- readable causality;
- low-noise presentation;
- meaningful but limited decisions;
- absence of generic management clutter.

Be cautious about systems based on:

- random events;
- timers;
- surprise attacks;
- constant notifications;
- daily quests;
- urgent external requests;
- procedural interruptions.

They may conflict with the established product direction.

Do not reject them automatically; determine whether they are actually compatible based on the product evidence.

---

# 8. Determine whether the world should be simulation or context

This distinction is important.

A world layer can be:

### A. Simulated

The world has state and changes over time.

### B. Derived

The world is computed from existing deterministic state.

### C. Authored context

The world provides fixed facts, locations, or discoverable information.

### D. Scenario-only context

The world exists only as authored scenario framing.

Determine which category, if any, is actually needed.

Do not introduce a simulation layer simply because the word "world" appears in the product vision.

---

# 9. Minimum viable world representation

If a meaningful external demand is found, identify the smallest representation capable of expressing it.

Explicitly evaluate:

- fixed world facts;
- authored world locations;
- derived world state;
- deterministic world entities;
- external demand values;
- discovery state;
- spatial regions;
- world-level objectives.

For each candidate determine:

- required state;
- persisted or derived;
- save implications;
- hash implications;
- deterministic requirements;
- command requirements;
- tick requirements;
- UI requirements;
- rendering requirements;
- test requirements.

Prefer the smallest representation that produces a real decision.

If no representation is both meaningful and minimal, DEFER.

---

# 10. Investigate whether world context can create growth demand

This is the bridge back to 10CL.

For every viable external-demand candidate, ask:

> Does this eventually create a reason for the settlement to grow?

If yes, explain the causal chain.

For example, only if actually justified:

```text
world condition
    ↓
new spatial opportunity / obligation
    ↓
existing settlement cannot satisfy it at current scale
    ↓
population / workforce / capacity becomes relevant
    ↓
growth becomes a response to a real problem
```

Do not assume that "growth" must be the outcome.

A valid external demand might instead create a new spatial, production, workforce, or planning problem without immediately increasing population.

That distinction matters.

---

# 11. Test the "world as context" alternative

Before proposing simulation, test the possibility that NOVA simply needs stronger **world context** rather than a new world system.

Ask:

- Could the product become more meaningful through authored world framing alone?
- Could scenarios eventually reference a richer world without creating a quest engine?
- Could fixed discoverable context create purpose?
- Would this solve the post-Town problem?
- Or would it only make the existing terminal state more interesting?

Be explicit.

A richer fiction is not automatically a gameplay solution.

---

# 12. Evaluate candidate directions without ranking

If multiple viable directions emerge, document them side-by-side.

For each:

- underlying demand;
- player decision;
- affected existing systems;
- required new state;
- simulation requirements;
- persistence requirements;
- deterministic requirements;
- spatial consequences;
- UI consequences;
- rendering consequences;
- growth consequences;
- treadmill risk;
- speculative complexity;
- smallest possible implementation.

Do **not**:

- score;
- rank;
- select a winner;
- label one "best";
- produce a tier list.

The goal is to expose the design space.

---

# 13. Define the actual missing product problem

At the end of the investigation, formulate the smallest true problem.

Use this structure:

```text id="bq2f7v"
Current state:
...

Missing demand:
...

External/world fact that could create it:
...

Player decision:
...

Existing systems involved:
...

Why this is qualitatively different:
...
```

If this cannot be filled honestly, the correct conclusion is DEFER.

---

# 14. BUILD / DEFER gate

End with exactly one of:

## BUILD

Only if all of the following are demonstrated:

1. A concrete world/external fact or condition.
2. A player-visible consequence.
3. A genuine new settlement decision.
4. Clear interaction with existing NOVA systems.
5. A minimal representation.
6. No need for speculative parallel game systems.
7. The mechanic preserves deterministic and contemplative product identity.

If BUILD:

Define only the **next implementation step**.

Specify:

- exact mechanic;
- minimum state;
- derived vs persisted;
- commands;
- tick behavior;
- affected queries;
- affected progression;
- UI surface;
- rendering impact;
- save/hash impact;
- focused tests;
- browser/GPU requirements.

Do not implement it in 10CM.

---

## DEFER

Use DEFER if:

- no external demand is currently justified;
- world context would only be narrative decoration;
- external actors would require a speculative game system;
- exploration would only enlarge the board;
- discoveries would only produce more resources;
- scenarios remain the only meaningful external framing;
- or the world cannot currently create a qualitatively new settlement decision.

If DEFER:

Explicitly document what evidence would justify reopening this branch.

Do not invent another system.

---

# 15. Anti-feature audit

Explicitly evaluate and reject as premature unless repository evidence directly justifies them:

- generic quest system;
- missions;
- faction diplomacy;
- trading;
- currency;
- caravans;
- transport;
- vehicles;
- NPC simulation;
- random events;
- disasters;
- timers;
- daily/weekly tasks;
- reputation;
- happiness;
- prestige;
- technology trees;
- procedural exploration;
- fog of war;
- arbitrary resource deposits;
- generic "world events";
- narrative choice trees;
- combat;
- enemies;
- procedural planets;
- a generic discovery/collection system.

For each rejection, explain the concrete mismatch with the current product state.

Do not turn this into a future feature roadmap.

---

# 16. Contract protection

Preserve the established simulation contract.

Do not modify:

- deterministic tick semantics;
- workforce semantics;
- Food/Water/Material production;
- road/accessibility rules;
- Town progression;
- scenario semantics;
- save/load;
- hashing;
- command boundaries;
- `SAVE_VERSION`.

Expected current value:

```text
SAVE_VERSION = 8
```

10CL established that growth is currently frozen/deferred.

10CM must not bypass that conclusion by introducing an indirect growth mechanic.

---

# 17. User-owned files

Do not modify:

```text
docs/roadmap/Step10BO - Copy.md
docs/roadmap/Step10BT.md
```

Do not rename, normalize, delete, or rewrite them.

---

# 18. Documentation

Create exactly:

```text
docs/roadmap/STEP10CM.md
```

The document must contain:

1. Context from 10CL and 10CK.
2. Current world model.
3. Current documented product identity.
4. Current external/world concepts actually present.
5. Historical/speculative concepts explicitly separated.
6. External-demand investigation.
7. Environmental investigation.
8. Discovery investigation.
9. External-actor investigation.
10. Exploration/expansion investigation.
11. Scenario-vs-world-demand distinction.
12. World-as-context investigation.
13. Candidate directions and trade-offs.
14. Minimum representation analysis.
15. Growth-demand bridge.
16. BUILD / DEFER decision.
17. Exact next step if BUILD.
18. Reconsideration conditions if DEFER.
19. Anti-feature audit.
20. Validation.
21. Final scope statement.

Do not create additional roadmap documents.

---

# 19. Testing / validation

This is primarily a design investigation.

### Required

Inspect existing tests related to:

- world/grid;
- scenarios;
- objectives;
- progression;
- population;
- resources;
- roads;
- determinism;
- save/load.

If useful, add narrowly scoped measurement/audit tests only.

Do not implement product behavior merely to test a hypothesis.

If tests are changed:

- run focused tests;
- run relevant compatibility tests;
- run full Vitest;
- typecheck;
- lint;
- build;
- diff-check.

If no runtime/UI/rendering code changes:

- browser E2E may be skipped;
- GPU/WebGL2 validation should be skipped.

Do not alter runtime code for validation purposes.

---

# 20. Final report

Provide a concise evidence-based final report containing:

### Investigation result
- BUILD or DEFER.

### Current world model
- what actually exists.

### External-demand finding
- what can and cannot currently create demand.

### World-as-context finding
- whether context alone is sufficient.

### Candidate directions
- factual comparison without ranking.

### Missing product problem
- exact formulation.

### Growth relationship
- whether/how external demand could eventually create growth pressure.

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
- diff-check.

### Files changed
- exact list.

### Commit

If the investigation completes successfully, create exactly one commit:

```text
Step 10CM: World External Demand Investigation
```

Do not push unless explicitly instructed.

The final report must distinguish clearly between:

- observed repository facts;
- measured evidence;
- design interpretation;
- BUILD / DEFER conclusion.

Do not claim that a world/external mechanic is justified unless the investigation demonstrates a genuinely new player decision.

---

# Documentation (as-built)

## 1. Context from 10CL and 10CK

10CL DEFERRED internal growth (zero-slack linear scaling, no new decision).
10CK's growth direction stays standing but unfunded. This step tests the
other branch: world/external demand. (Prompt asks for `STEP10CM.md`;
appended here — case-insensitive FS, dual-purpose convention.)

## 2. Current world model (repository facts)

- Spatial: fixed 12×12 homogeneous board (`WORLD_CONFIG`, `main.ts`). Cells
  have no identity beyond coordinates; `WorldConfig` keys are exactly
  seed/width/height (+ optional blockedCells).
- Terrain: binary blocked only (`grid.ts`, 10AV). Sole simulation reads are
  building/road placement validators (`phases.ts`, reason `terrainBlocked`)
  plus renderer display (`renderSnapshot.ts`). Never an economy: a distant
  blocked cell changes no rate, no progression (measured).
- Temporal: nothing external happens over time; board fixed (24-tick
  measurement: world config identical).
- External entities: none — no settlements, factions, visitors, trade,
  wildlife, signals, discoveries, narrative objects in code, saves, or
  catalogue text (measured across 18 search terms with word boundaries).

## 3. Current documented product identity

Deterministic contemplative colony optimizer (vision pillars +
foundation loop). Colony/city simulator whose growth promise (01/04) is
still unmechanized. No change since 10CK.

## 4. Current external/world concepts actually present

Placement-blocking terrain, road networks, scenario framing sentences.
That is the complete list. Scenario descriptions (already UI-invisible per
10CJ) are the richest "world" content and carry no mechanics.

## 5. Historical/speculative concepts explicitly separated

A repo-wide search (code + product docs) for Prometheus/mystery/aliens/
factions/trade/NPCs/quests/narrative/diplomacy/combat/reputation/
happiness/fog-of-war/disasters returns only incidental hits
(`requestAnimationFrame`, `requestedScenario`, "deliberately not a quest
framework", consumption/satisfaction). No external concept exists even as
brainstorming. There is nothing to resurrect and nothing deferred — the
branch was never opened.

## 6. External-demand investigation (A–F)

- A Environmental: finiteness exists (144 cells) but never binds (colonies
  use ~25); terrain decisions already exercised by existing scenarios
  (recovery, housing-composition, terrain-chokepoint, town-connection).
  No unmade decision found.
- B Resource discovery: cells are homogeneous; deposits would be new
  resources/scarcity mechanics — speculative, treadmill-prone.
- C External actors: zero foundation; NPCs/diplomacy/trade = parallel game.
- D Discovery/observation: full visibility, nothing hidden; lore ≠ demand.
- E External objectives: scenarios already the goal vehicle (10CJ STOP);
  more scenarios repackage linearity (10CL §6D).
- F Expansion/exploration: board has headroom; bigger board = same
  decisions larger; true expansion needs transport/pathfinding/persistence
  — speculative stack.

## 7. Environmental investigation

Covered in §6A: the environment constrains placement (solved tool: roads)
but creates no pressure that survives existing controls. No changing
conditions, hazards, or yields exist to build on.

## 8. Discovery investigation

Nothing to discover mechanically. Information revelation (e.g. map
reveal) without hidden state is UI content, not gameplay.

## 9. External-actor investigation

No justified actor: any actor needs behavior, which needs simulation,
which needs a product need — circular. Rejected as parallel-game scope.

## 10. Exploration/expansion investigation

No evidence for a larger world (single fixed config); expansion currently
solves no demonstrated problem. Treated as board-size scaling, not a new
spatial problem.

## 11. Scenario-vs-world-demand distinction

Scenario goal ("Achieve X") is authored framing over the existing loop;
world-driven demand ("world contains X, respond") needs an X — none
exists. 10CJ STOP is therefore unaffected: scenarios remain sufficient
framing, insufficient loop-fix, exactly as established.

## 12. World-as-context investigation

Richer fiction alone changes no decision: meaning in NOVA comes from
mechanics (10CJ: invisible descriptions prove text doesn't carry play).
It would decorate the terminal state. Insufficient as a solution;
harmless only if free — but authoring is never free (tests/catalogue).
World context stays a possible future seasoning, never the meal.

## 13. Candidate directions and trade-offs (no ranking)

1. Terrain-as-economy (yields/hazards) — new scarcity sim; treadmill risk;
   contradicts 10AV minimalism without evidence.
2. Deposits/discovery — new resources; accumulation without purpose
   (capped stocks); speculative.
3. External actors/trade — parallel game; breaks contemplative identity
   (notifications, timers, reaction spam risk).
4. Board expansion — same decisions larger + transport/persistence stack.
5. World-context enrichment — no decision created; decoration.

## 14. Minimum representation analysis

Moot: no justified demand. For the record, terrain already has the minimal
representation (binary list, derived reads, persisted only when non-empty
with hash stability) — the model for how any future world fact should look.

## 15. Growth-demand bridge

No external candidate creates growth pressure: finiteness doesn't bind,
deposits would feed the capped-stock dead end, actors are absent,
expansion scales the treadmill. Growth stays unfunded from this side too.
A spatial (non-population) problem was considered and not found — placement
is validity, not strategy (10CA/10CF).

## 16. BUILD / DEFER decision

```text
DEFER — no external demand is currently justified: the world is a
homogeneous board with placement-only terrain, no external concepts exist
even in documentation, and every candidate requires a speculative system
or decorates the terminal state. Scenarios remain the only meaningful
external framing (10CJ).
```

## 17. Exact next step if BUILD

N/A (DEFER).

## 18. Reconsideration conditions (DEFER terms)

- Footprint approaching capacity: colonies using most of 144 cells with
  measured density/routing decisions unsolvable by roads.
- A documented world concept with a causal role (design-test-passing).
- Any external fact creating a settlement decision surviving existing
  controls (10CF standard).
- Until then: world branch closed; 10CK direction stays standing intent.

## 19. Anti-feature audit

Quests/missions/factions/diplomacy/trade/currency/caravans/transport/
vehicles/NPCs/random events/disasters/timers/dailies/reputation/happiness/
prestige/tech-trees/fog-of-war/deposits/world-events/choice-trees/combat/
enemies/procedural planets/discovery-collection: each rejected for concrete
mismatch — assumes the demand this step could not demonstrate, needs a
parallel sim, or threatens contemplative/deterministic identity (reaction
spam, notification noise, hidden state). Not roadmaped.

## 20. Validation

- New measurement suite: 5/5 PASS (`worldExternalDemandMeasurement`).
- Full Vitest: 1747/1748 per run; sole failure is the known 5s-timeout load
  flake class (settlementGrowthShelterAudit 5317ms; previously townDecision
  and waterConstruction — all pass isolated: 34–41 green; 10CC precedent).
  Untouched per the no-shortcut rule.
- Typecheck: PASS (after narrowing fix on validator result unions — test
  code only). Lint: PASS. Build: PASS (pre-existing chunk warning).
- Browser/GPU: skipped per §19 (no runtime/UI change).
- `git diff --check`: clean. SAVE_VERSION 8 unchanged.
- Scope: one measurement test file + this doc; zero production lines.

## 21. Final scope statement

Investigation only. World/external branch DEFERRED with explicit
reconsideration terms; 10CL DEFER stands unmodified (this step bypasses
nothing — no indirect growth mechanic introduced).

## Files changed

- `tests/worldExternalDemandMeasurement.test.ts` (new, 5 measurement tests)
- `docs/roadmap/Step10CM.md` (prompt + this as-built)
