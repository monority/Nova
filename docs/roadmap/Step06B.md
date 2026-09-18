# NOVA — Step 06B — First Food Production & Causal UX

## Objective

Implement the first real food production loop and fix the small but important causal UX problems discovered during Step 06A.

Step 06A established:

```text
Current simulation:
Housing
→ Colonist
→ Food consumption
→ Food shortage
→ Colony starvation
```

The next intended mechanic is:

```text
Producer
→ Food production
→ Food storage
→ Food consumption
→ Shortage
→ Population consequence
```

The authoritative roadmap identifies this as the beginning of Phase 4: the first production flow.

This step must remain deliberately small.

Do NOT build a general economy or production framework.

---

# 0. Important implementation order

Implement this step in two explicit parts:

### Part A — causal UX corrections

Fix the currently observed feedback problems first.

### Part B — first food producer

Then implement the smallest deterministic producer capable of restoring the food loop.

This ordering is intentional.

The player must be able to understand the existing Food loop before the new production mechanic is introduced.

---

# 1. Re-read authoritative sources

Before changing code, inspect:

```text
docs/00-CMD.md
docs/02-game-design.md
docs/03-core-loop.md
docs/07-population.md
docs/08-economy.md
docs/09-economy-foundation.md
docs/11-time-and-events.md
docs/22-canonical-simulation.md
docs/26-roadmap.md
docs/29-design-rules.md
docs/roadmap/Step05B.md
```

Also inspect the Step 06A audit result and the current implementation.

Do not assume the exact file structure.

---

# 2. Part A — Fix the causal UX

These fixes are required because Step 06A found concrete playability problems.

Do NOT redesign the UI.

Do NOT introduce a new UI system.

Use the existing status/query infrastructure.

---

## 2.1 Fix starvation message overwrite

Current problem:

```text
dispatch/subscribe
→ refreshUi()
→ "Food shortage — colony starved"

then:

STEP handler
→ setStatus("stepped one tick")
→ starvation explanation disappears
```

Fix the ordering/ownership so that a major causal event cannot immediately be overwritten by generic `"stepped one tick"` feedback.

After a starvation tick, the player must visibly receive an explanation such as:

```text
Food shortage — colony starved
```

The exact existing wording may be preserved or minimally improved.

Do not create a toast framework.

Do not create an event bus.

Do not add global notification state.

---

# 3. Colonist arrival feedback

When a colonist is admitted, the player should receive minimal causal feedback.

Example:

```text
Colonist arrived — housing available and food is sufficient
```

The exact wording should be short and factual.

Do not invent lore.

Do not create a notification subsystem.

Use the existing state transition information.

The message must be based on actual state, not hardcoded simulation assumptions.

---

# 4. Food consumption feedback

The player currently sees:

```text
Food: 94
Food: 90
Food: 86
...
```

but does not understand why.

Add minimal causal feedback.

It should make the relationship visible:

```text
4 colonists consumed 4 food
```

or an equally concise factual equivalent.

Do NOT add a permanent log.

Do NOT add charts.

Do NOT add per-colonist indicators.

Do NOT add a generic event system.

A simple status-line update is sufficient.

---

# 5. Blocked admission feedback

After:

```text
food = 0
population = 0
```

the player currently sees nothing when further population admission is impossible.

Make the reason observable.

Example:

```text
No colonist admitted — food unavailable
```

Only show this when an admission opportunity exists but food prevents admission.

Do not spam the message every simulation tick.

Do not create a notification queue.

Do not turn every simulation state into an event.

---

# 6. Food remaining / anticipation

Step 06A identified that food shortage is difficult to anticipate.

Add only the smallest useful derived information.

A pure query may expose:

```text
food
population
foodPerColonistPerTick
foodTicksRemaining
```

where:

```text
foodTicksRemaining = floor(food / requiredFoodPerTick)
```

For population = 0:

```text
foodTicksRemaining = null
```

or the repository's most semantically appropriate equivalent.

Do not persist this value.

Do not add it to canonical state.

Do not hash it.

It is a derived presentation/query value.

Display it minimally, for example:

```text
Food: 40
~10 ticks of food
```

Only if this fits naturally into the existing HUD.

Do not build a dashboard.

---

# 7. Validate Part A before production

Before implementing production, run the relevant tests/browser scenario and verify:

### Colonist arrival

The player can understand why a colonist appeared.

### Consumption

The player can understand why Food decreases.

### Starvation

The starvation message remains visible after STEP.

### Admission block

The player can understand why another colonist does not appear.

### Forecast

The player can approximately understand how long the current food reserve lasts.

If any of these are not observable, fix them before moving to Part B.

---

# 8. Part B — First food producer

Now implement the smallest producer described by the authoritative design.

Before coding, determine from the repository whether the canonical first producer is already specified.

Do NOT invent a farm if the docs define another producer.

If the docs explicitly permit a first food producer without a specific building, use the smallest concrete building concept consistent with the existing building catalog.

The producer must have:

```text
operational state
→ deterministic food output
→ food added to shared stock
```

No workers/jobs are required unless the authoritative docs explicitly require them for this first production flow.

Do not invent workforce assignment merely because it is common in city-builders.

---

# 9. Production semantics

Define the exact production contract before implementation.

It must answer:

* What building produces food?
* How much food does it produce per tick?
* Does it produce only while operational?
* Does it produce before or after consumption?
* Does production occur on the same tick the building becomes operational?
* Can it produce with zero colonists?
* Is production deterministic?
* Can food exceed 100?
* Is there a stock cap?
* What happens when multiple producers exist?

Use authoritative documentation wherever available.

If any of these questions are unresolved by the repository, STOP and report the design ambiguity instead of inventing a large system.

---

# 10. Recommended minimal production model

If the authoritative docs permit the minimal model below, use it:

```text
operational food producer
→ +N food / tick
```

with:

* fixed deterministic output;
* no worker system;
* no jobs;
* no efficiency;
* no upgrades;
* no recipes;
* no distance;
* no logistics;
* no storage building;
* shared food stock.

The first goal is simply to close the causal loop:

```text
Producer
→ Food
→ Consumption
→ Population viability
```

Do not build the final economy.

---

# 11. Production phase ordering

Production must have an explicit place in the canonical tick order.

The final order must be documented and deterministic.

The implementation must make the causal relationship obvious.

For example, depending on authoritative documentation:

```text
applyCommand
→ advanceConstruction
→ updateNeeds
→ produceFood
→ consumeFood
→ updatePopulation
→ advanceTime
```

or another explicitly documented order.

Do NOT choose the order merely because it is convenient in code.

The order must answer an important gameplay question:

> If a producer becomes operational or produces food on a tick where food would otherwise be insufficient, does that food save the colony on that tick or only the next tick?

This must be deterministic and tested.

---

# 12. Multiple producers

Verify deterministic behavior for:

```text
1 producer
2 producers
multiple producers
```

Production should simply sum deterministic outputs.

Do not introduce producer priority unless the authoritative design requires it.

---

# 13. Resource semantics

Food may now increase.

Update the previous Step 05 assumption that food was monotonic decreasing.

The new invariant becomes:

```text
food >= 0
```

not:

```text
food <= previousFood
```

unless a documented stock cap exists.

Do not add a stock cap unless explicitly required.

---

# 14. Persistence

If production requires new simulation state:

* update save version;
* validate the new state;
* update canonical serialization;
* update hash;
* update persistence tests.

Do not add persisted state unless production actually requires it.

A producer should ideally be represented through the existing building state/catalog rather than a separate production subsystem.

If a new building property is needed, use the smallest concrete representation.

Do not introduce:

```text
ProductionComponent<T>
ProducerSystem
RecipeSystem
ProductionEngine
```

---

# 15. Building catalog

If a new food-producing building is needed:

Add only the concrete catalog/building definition required.

It must integrate with the existing:

```text
placement
→ construction
→ operational
```

lifecycle.

Define its construction cost explicitly.

Do not introduce a generic building behavior system merely because this building has production.

---

# 16. Unit and integration tests

Add tests for the complete causal loop.

## Producer

Verify:

```text
non-operational producer
→ no production
```

and:

```text
operational producer
→ deterministic food output
```

## Tick behavior

Verify exact production timing.

## Multiple producers

Verify deterministic additive production.

## Consumption interaction

Verify:

```text
production
→ food stock
→ consumption
```

according to the selected phase order.

## Starvation recovery

Construct a scenario where:

```text
food would reach shortage
```

but a producer provides enough food.

Verify the colony survives.

## Persistent starvation

Construct a scenario where production remains insufficient.

Verify the documented shortage behavior remains intact.

## Determinism

Same state + same command sequence must produce identical states/hashes.

## No mutation

Existing immutability guarantees remain valid.

---

# 17. E2E playability scenario

Create or extend a real-browser scenario.

The player should be able to experience:

```text
1. Build housing
2. Colonists arrive
3. Food decreases
4. Build food producer
5. Producer becomes operational
6. Food begins increasing / stabilizing
7. Colonists consume food
8. Colony survives
```

The test must use:

* real browser;
* real clicks;
* real STEP/PLAY;
* real UI;
* real simulation state.

Do not invoke simulation functions directly from the E2E script.

---

# 18. Player comprehension test — mandatory

After implementation, perform a fresh blind playability pass.

Pretend you have never seen the source code.

Play the following scenario:

```text
Start
→ build housing
→ wait for colonists
→ observe food consumption
→ observe warning
→ build food producer
→ wait for producer
→ observe food production
→ verify colony survives
```

Answer:

### Can the player understand why colonists appear?

### Can the player understand why food decreases?

### Can the player understand what is causing the food shortage?

### Can the player understand what building fixes the shortage?

### Can the player understand when the producer starts working?

### Can the player understand that production feeds the same food stock?

### Can the player distinguish production from consumption?

### Can the player tell whether the colony is currently sustainable?

Use:

```text
YES
PARTIAL
NO
```

with concrete evidence.

Do not give an overall gameplay score.

---

# 19. Visual inspection

Regenerate the relevant screenshots.

Inspect them visually if actual image reading is available.

Check only:

* readability;
* hierarchy;
* overlap;
* feedback visibility;
* producer state visibility;
* food production visibility;
* shortage visibility.

Do not redesign the visual system.

If visual inspection is unavailable:

```text
Visual inspection: NOT EXECUTED
```

Do not infer visual quality from image metadata.

---

# 20. GPU regression

Run the existing headed GPU E2E.

Verify:

```text
WebGL2
NVIDIA RTX 3070
software renderer = false
console errors = 0
page errors = 0
```

Headless SwiftShader is not evidence of hardware GPU success.

Do not claim GPU success without the headed evidence.

---

# 21. Validation order

Run:

### Focused tests

```text
food
population
production
simulation
persistence
determinism
```

### Static validation

```text
pnpm lint
pnpm typecheck
pnpm build
```

### Food/production E2E

```text
food/production browser scenario
```

### Existing regressions

```text
resource E2E
temporal E2E
GPU E2E
full E2E
```

### Full test suite

Everything must remain green.

---

# 22. Scope protection

Do NOT implement:

* jobs;
* workers;
* money;
* markets;
* logistics;
* transport;
* generic production framework;
* generic resource framework;
* recipes;
* efficiency;
* upgrades;
* storage buildings;
* worker assignment;
* multiple resource types;
* second need;
* UI redesign;
* visual polish campaign.

The goal is only:

```text
First producer
→ Food
→ Consumption
→ Population viability
```

---

# 23. Final audit

Inspect the final diff.

Verify:

* production is deterministic;
* production has an explicit phase;
* production order is documented;
* operational state matters;
* food remains canonical;
* consumption remains distinct from production;
* starvation remains deterministic;
* no hidden state exists;
* UI reads real state;
* feedback is not overwritten;
* no generic abstraction was introduced without a second use case;
* existing Step 04/05 behavior remains valid.

---

# 24. Final report

Return:

## Implementation

Exact files and changes.

## Production contract

State:

* producer;
* construction cost;
* output per tick;
* operational condition;
* phase order;
* stock behavior;
* multiple producer behavior.

## UX corrections

Report:

* starvation message;
* arrival feedback;
* consumption feedback;
* blocked admission feedback;
* food remaining/forecast.

## Tests

Exact counts/results.

## E2E

Exact browser results.

## GPU

Exact headed renderer evidence.

## Playability

Report the blind player test:

| Question                    | Result         | Evidence |
| --------------------------- | -------------- | -------- |
| Understand colonist arrival | YES/PARTIAL/NO | ...      |
| Understand food consumption | YES/PARTIAL/NO | ...      |
| Understand shortage         | YES/PARTIAL/NO | ...      |
| Understand producer         | YES/PARTIAL/NO | ...      |
| Understand production       | YES/PARTIAL/NO | ...      |
| Understand sustainability   | YES/PARTIAL/NO | ...      |

## Visual inspection

Only claim it if actually performed.

## Scope integrity

Confirm no unrelated systems were introduced.

## Final status

Use exactly:

```text
COMPLETE
```

only if implementation, tests, real-browser behavior, and playability verification all pass.

Otherwise:

```text
PARTIAL
```

or:

```text
BLOCKED
```

with the exact missing evidence.

Do not declare COMPLETE because the automated tests are green if the blind playability test reveals that the mechanic cannot be understood.

