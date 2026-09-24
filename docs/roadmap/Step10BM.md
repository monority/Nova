# NOVA — Step 10BM — Storage Resource Semantics & Control Decision

## Context

NOVA has completed:

### Step 10BG

Commit `9c7d600`

Introduced:

* `StorageHub`
* Food capacity 50
* Water capacity 30
* Material capacity 40
* overflow capture
* deterministic allocation
* SAVE_VERSION 8
* v7 → v8 migration

### Step 10BK

Commit `550852e`

Measured Material reserve dynamics:

* capacity = 40
* protected floor = 15
* releasable = 25
* protected share = 37.5%
* two-worker surplus reaches floor in 4 ticks
* reaches capacity in 10 ticks
* full reserve supports one complete construction
* prolonged crisis stops at floor
* recovery deterministic

### Step 10BL

Commit `f8d648a`

Added:

* compact Material reserve HUD row
* `Material reserve: N / 40 · 15 protected`
* causal feedback:

  * `Reserve released N material`
  * `Reserve +N material`

No simulation rules changed.

No storage controls, buildings or logistics added.

Real Chromium inspected.

GPU validation passed.

Typecheck/lint/build passed.

Focused Storage tests: 43 PASS.

Full suite still contains the known unrelated 5s timeout.

Working tree is clean.

---

# Mission

Now determine whether the **StorageHub is semantically coherent across Food, Water and Material**.

Do not immediately add controls.

Do not immediately add storage buildings.

Do not redesign the economy unless the evidence requires it.

The key question is:

> Are Food, Water and Material genuinely using the same storage concept, or did 10BG create a generalized abstraction before all three resources had the same gameplay semantics?

---

# 1. Inspect the real implementation

Read the current code, not only the previous reports.

Trace the complete lifecycle of:

* Food
* Water
* Material

For each resource determine:

1. production source;
2. immediate stock;
3. storage overflow;
4. storage capacity;
5. storage release;
6. consumption;
7. construction;
8. admission;
9. shortage;
10. whether storage can affect the outcome;
11. whether the resource can actually reach its StorageHub capacity;
12. whether the resource has a protected floor;
13. whether storage is persisted;
14. whether storage is deterministic.

Build a concrete semantic table.

---

# 2. Find the asymmetry

Material currently has demonstrated reserve behavior.

Determine whether Food and Water have equivalent behavior.

For example:

```text
Material
production → stock → overflow → reserve → release → construction
```

Compare with:

```text
Food
production → stock → ?
```

and:

```text
Water
production → stock → ?
```

Do not assume symmetry.

If they differ, determine whether the difference is:

* intentional;
* necessary;
* accidental;
* incomplete;
* or currently unused.

---

# 3. Determine whether Food storage is actually meaningful

Food has:

* Farm production;
* colonist consumption;
* shortage consequences.

Investigate whether storage can provide a meaningful buffer.

Measure:

* how quickly Food reserve fills;
* how quickly it is consumed;
* how long it can sustain the colony;
* whether a reserve changes the outcome of a temporary Farm disruption;
* whether Food storage can prevent a collapse;
* whether the current 50 capacity creates a meaningful decision.

Do not tune values yet.

The goal is understanding.

---

# 4. Determine whether Water storage is actually meaningful

Water has:

* Well production;
* colonist consumption;
* service/coverage semantics;
* capacity-based admission;
* Water shortage behavior.

This is potentially different from Food.

Investigate carefully:

* does stored Water count toward `resources.water`?
* does it increase Water capacity?
* can stored Water sustain existing population?
* can stored Water allow new admission?
* does a Water reserve make sense if Well capacity itself is the admission gate?
* what happens if Wells temporarily stop producing?
* does stored Water merely postpone a shortage or actually change the economic state?

This is important.

Do not hide contradictions behind UI.

---

# 5. Determine what "storage" means for each resource

Produce a table similar to:

| Resource | Immediate stock | Storage | Release | Main purpose | Player decision |
| -------- | --------------- | ------- | ------- | ------------ | --------------- |
| Material | ?               | ?       | ?       | ?            | ?               |
| Food     | ?               | ?       | ?       | ?            | ?               |
| Water    | ?               | ?       | ?       | ?            | ?               |

Fill this from the actual implementation.

Then answer:

> Can these three genuinely share one Storage abstraction?

Possible conclusions:

### A — Yes

All three behave sufficiently similarly.

Keep the abstraction.

### B — Mostly

The abstraction is valid, but each resource needs explicit resource-specific semantics.

### C — No

StorageHub is currently too generic and should be redesigned before more UI/control work.

Do not force A.

---

# 6. Investigate the current capacities

Current prototype capacities:

```text
Food     50
Water    30
Material 40
```

Do not rebalance them automatically.

Instead determine whether each value is currently meaningful.

For each:

* number of production ticks to fill;
* number of consumption ticks represented;
* behavior during shortage;
* effect on gameplay;
* whether capacity is ever reached naturally;
* whether it creates resilience;
* whether it is effectively dead data.

If a capacity is effectively unused, explicitly say so.

---

# 7. Revisit player control

Now answer the question we deliberately postponed.

Should the player control:

* which resources are stored;
* storage priority;
* storage capacity allocation;
* reserve release;
* production priority;
* anything else?

Do not assume that "player should control everything" means every system needs a UI control.

For each proposed control answer:

1. What decision does the player make?
2. What tradeoff exists?
3. What happens if they choose incorrectly?
4. Can the current automatic system already produce that decision?
5. Is the control meaningful often enough to justify interaction cost?

If no control is justified, explicitly recommend keeping storage automatic.

If a control is justified, define the **smallest possible control**.

---

# 8. Investigate whether storage should remain global

Evaluate:

```text
Global StorageHub
```

against:

```text
Physical storage buildings
```

and:

```text
Resource-specific storage
```

Use the current NOVA model as the constraint.

Ask:

* Would spatial storage interact meaningfully with roads?
* Would it introduce transportation?
* Would it create a new spatial optimization?
* Would that be valuable?
* Or would it create a second logistics game prematurely?

Do not add physical warehouses merely because Timberborn or other games have them.

---

# 9. Research comparable games only where useful

Use the previous research, but now focus narrowly on:

* whether different resources use different storage semantics;
* whether stored Food behaves differently from stored building materials;
* whether Water reserves have special rules;
* whether players control storage priorities;
* whether storage is global or spatial.

Relevant references should include:

* Timberborn
* Going Medieval
* Frostpunk
* any additional game previously found particularly relevant

Cite sources.

Do not repeat the entire previous research report.

---

# 10. Check the current UX

Inspect the real application after 10BL.

Verify whether the current UI creates an accidental implication:

> "Food, Water and Material all have the same storage behavior."

If that implication is false, identify the problem.

Also determine whether Material is currently the only resource that deserves visible reserve feedback.

Do not add Food/Water HUD rows simply for visual consistency.

If their semantics are not player-relevant yet, say so.

---

# 11. Do not modify the simulation before the decision

This is primarily a **semantic/design decision step**.

Do not:

* add storage controls;
* add warehouses;
* add logistics;
* change capacities;
* change floors;
* change production;
* change consumption;
* change Water admission;
* change Food collapse rules;

unless the investigation proves the current semantics are internally contradictory.

If an inconsistency exists, document it first and propose the minimum correction.

---

# 12. Required deliverable

Produce:

## A. Current implementation map

Exact lifecycle for Food, Water and Material.

## B. Semantic comparison

A table showing what Storage actually means for each.

## C. Capacity analysis

Measured behavior of 50 / 30 / 40.

## D. Abstraction verdict

Choose:

* keep StorageHub;
* refine StorageHub;
* redesign StorageHub.

Explain why.

## E. Player-control verdict

Choose:

* no control yet;
* one specific control;
* multiple controls;
* redesign required before controls.

Do not add UI just to demonstrate the decision.

## F. Spatial-storage verdict

Determine whether global storage is sufficient for the current game.

## G. UX verdict

Determine exactly which resource storage information should currently be exposed.

## H. Minimal next implementation

If changes are justified, define the smallest coherent next step.

---

# 13. Verification

If this remains a design-only step:

* do not modify runtime code;
* add tests only if they are genuinely useful for proving a discovered semantic fact;
* keep the tree clean except for the intended report/tests.

If implementation becomes necessary:

Run:

* typecheck;
* lint;
* build;
* focused tests;
* full Vitest;
* determinism;
* insertion-order;
* save/load;
* migration tests;
* real Chromium;
* GPU validation.

Known unrelated timeout:

`industrialHeadroomTownDecision.test.ts`

must remain explicitly separated from new regressions.

---

# 14. Final QA

Finish with:

```text
Step 10BM — [PASS / PARTIAL / BLOCKED]

StorageHub verdict:
...

Material semantics:
...

Food semantics:
...

Water semantics:
...

Capacity verdict:
...

Player-control verdict:
...

Global vs spatial storage:
...

Current UX verdict:
...

Runtime changes:
...

Tests:
...

Browser:
...

GPU:
...

Known limitations:
...

Next justified step:
...
```

---

# Core principle

10BG created a generalized storage mechanism.

10BK proved that Material reserve dynamics work.

10BL made Material storage visible.

10BM must now answer whether the generalized model is **actually justified across the entire economy**.

Do not expand Storage until this is clear.

The desired outcome is not "more storage features".

The desired outcome is:

> **A storage model whose semantics are simple enough to understand, strong enough to matter, and coherent with NOVA's existing Food, Water, Material and spatial systems.**

---

# 15. Resource semantics audit and decision report

## A. Current implementation map

### Food

```text
Farm production
→ resources.food
→ colonist consumption
→ shortage / collapse when insufficient
```

`produceFood` writes only to `resources.food`. `consumeFood` reads only that operational stock. No Food production path calls `allocateToStorage`, and no Food release path exists. `storage.food` is persisted and hashed but inert: it cannot feed colonists, prevent Food shortage, or change collapse behavior.

### Water

```text
Well production
→ resources.water
→ Water coverage and per-colonist consumption
→ capacity-based admission / service outcome
```

`produceWater` writes only to `resources.water`. Water service and admission derive from current Well production capacity and coverage; neither reads `storage.water`. No Water release path exists. `storage.water` is persisted and hashed but cannot sustain existing colonists, enable admission, or change service.

### Material

```text
Workshop production
→ operational resources.construction (25 per operational Workshop cap)
→ overflow to storage.material (capacity 40)
→ pre-production release of eligible excess (floor 15)
→ operational resources.construction
→ existing construction transaction
```

`produceMaterial` captures overflow into `storage.material`. For a valid building command, centralized release moves only `max(0, storage.material - 15)` into operational stock, bounded by the actual construction deficit. Release occurs before production, so new overflow cannot be released same tick. Construction reads and deducts only operational Material.

All three slots share one persisted `StorageHub` shape, but only Material has active gameplay semantics.

## B. Semantic comparison

| Resource | Immediate stock | Storage input | Release | Main purpose | Player decision |
|---|---|---|---|---|---|
| Material | `resources.construction` | Workshop overflow | Yes, above floor 15 for valid building demand | Construction shock buffer | Production/building timing; no storage control |
| Food | `resources.food` | None currently | None | None yet | Food production and consumption only |
| Water | `resources.water` | None currently | None | None yet | Well capacity, coverage, and admission only |

Food and Water reserve values are currently dead data from a gameplay perspective. Their shared schema is persistence structure, not shared behavior.

## C. Capacity analysis

### Food 50

- Equivalent to 50 colonist-tick meals at current consumption of 1 per colonist per tick.
- With one Farm's 2 Food/tick, it represents 25 production ticks.
- It is never filled by current production because no Food path allocates overflow.
- It cannot currently prevent a Food shortage. Capacity is prototype data, not an active buffer.

### Water 30

- Equivalent to 30 colonist-tick servings at current consumption of 1 per colonist per tick.
- With one Well's 2 Water/tick, it represents 15 production ticks.
- It is never filled by current production.
- It cannot extend service or admission because admission uses current Well capacity and coverage. Prototype data only.

### Material 40

- Active reserve capacity.
- Two-worker gross production is 4 Material/tick; measured dynamics from 10BK reached floor 15 in 4 ticks and capacity 40 in 10 ticks from a near-capacity main stock.
- Floor 15 preserves emergency reserve; releasable maximum 25 supports one standard 25-Material building.
- Capacity, overflow, release, and floor all affect outcomes.

No capacity is rebalanced in this step.

## D. Abstraction verdict

### B — Mostly, with explicit resource-specific semantics

Keep `StorageHub` as the persistence shape and Material reserve implementation. Do not treat all three fields as active gameplay storage.

The generalized type is acceptable because it keeps future resource data canonical and migration-compatible. The abstraction is not semantically uniform: Material is an active reserve, while Food and Water are currently inactive placeholders. The correct next design is resource-specific contracts, not a generic “all resources have a reserve” claim. No redesign is justified until Food or Water gains a real buffer need.

## E. Player-control verdict

### No control yet

There is no meaningful conflict over which resource to store, allocation priority, capacity split, or manual release. Material release is deterministic and demand-driven. Adding controls would create micromanagement without a new causal decision. Production, Workshop timing, Well capacity, and construction remain existing player decisions.

## F. Global versus spatial storage

Global storage is sufficient for current NOVA. Roads currently govern mobility and production access, not goods transport. There is no hauling, delivery time, network inventory, or spatial resource availability. Physical storage would introduce a second logistics game before Food/Water reserve semantics are coherent. Keep global `StorageHub`; defer warehouses and networks.

## G. UX verdict

Only Material reserve information is player-relevant today:

```text
Material reserve: N / 40 · 15 protected
```

Do not add Food or Water reserve rows merely for visual symmetry; that would falsely imply those resources are buffered. Keep immediate Food/Water rows and production/service feedback separate. The UI must not claim that all three resources share identical Storage behavior.

Comparable-game sources support the same narrow conclusion: Timberborn warehouses, Going Medieval stockpiles/cellars, Frostpunk depots, and Factorio logistics all attach distinct spatial/resource semantics to stored goods. NOVA has not earned those semantics. Sources: [Timberborn warehouse category](https://timberborn.wiki.gg/wiki/Category:Goods_stored_in_Warehouses), [Going Medieval storage guide](https://www.noobfeed.com/articles/going-medieval-build-underground), [Frostpunk buildings](https://frostpunk.game-vault.net/wiki/Buildings), [Factorio logistic network](https://wiki.factorio.com/Logistic_network).

## H. Minimal next implementation

No runtime implementation is justified. Next work should be one of:

1. keep Material reserve as supporting economy feature; or
2. design a Food buffer contract if Food volatility becomes a measured gameplay problem; or
3. design a Water reserve/service contract if Water interruption resilience becomes a measured gameplay problem.

Do not add generic controls, Food/Water storage rows, warehouses, or logistics before one of those needs is demonstrated.

## Tests

Added `tests/storageResourceSemantics.test.ts` with 5 tests proving Food and Water storage values remain inert through simulation ticks while the common persistence shape remains intact. Existing Material reserve/release/dynamics tests remain authoritative.

## Final QA

```text
Step 10BM — PASS

StorageHub verdict:
Keep StorageHub as a shared persistence shape with explicit resource-specific semantics. Current active gameplay is Material-only.

Material semantics:
Workshop overflow enters reserve; reserve above floor 15 releases to valid construction demand before production; construction spends operational stock only.

Food semantics:
Food storage is persisted but inert. Food production and consumption use resources.food only.

Water semantics:
Water storage is persisted but inert. Water service and admission use current Well production/coverage only.

Capacity verdict:
Food 50 and Water 30 are currently dead prototype capacity values. Material 40 is active. No rebalance.

Player-control verdict:
No controls justified. Keep automatic Material reserve behavior.

Global vs spatial storage:
Global remains sufficient. Spatial storage and logistics are premature.

Current UX verdict:
Show Material reserve only. Do not imply Food/Water reserve behavior.

Runtime changes:
None.

Tests:
5 new resource-semantics tests pass. Existing 43 focused Storage/app tests pass.

Browser:
No UI changes in this step. Prior Step 10BL Chromium inspection remains valid.

GPU:
Not rerun; no rendering/UI changes.

Known limitations:
Food and Water Storage slots are canonical but have no lifecycle semantics. StorageHub is not uniform across resources.

Next justified step:
Keep Storage as a Material supporting mechanic. Reconsider only when measured Food or Water volatility creates a real buffer requirement.
```

