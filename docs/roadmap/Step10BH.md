# NOVA — Step 10BH — Storage Gameplay Contract & Player Control

**Status:** DESIGN COMPLETE — no implementation change recommended at this step

**Baseline:** Step 10BG, commit `9c7d600`; `SAVE_VERSION = 8`

## A. Current-state diagnosis

Step 10BG added a single settlement-level `StorageHub` with food, water, and material reserves. Capacities are 50 / 30 / 40. The object is persisted in `SimulationState` and included in save validation.

The implementation currently does one thing in the simulation: material production overflow is retained in `storage.material` when operational Workshop material capacity is already full. Main `resources.construction` is reduced by ordinary production and remains the only construction-spendable stock. Stored material therefore does **not** fund construction.

The hub is not currently connected to food or water production/consumption. `releaseFromStorage` exists as a pure domain helper, but no tick phase calls it. No player command, allocation priority setting, worker role, building, road rule, or storage network exists. `getStorageSummary` and critical/full helpers are UI-ready calculations, not gameplay systems.

Consequences:

- Overflow prevention is real for material only.
- “Strategic reserve” is not yet connected to shortages.
- A full hub silently refuses additional overflow. There is no player-facing explanation of what happened.
- Food and water capacities are currently dormant; they are data, not behavior.
- The parallel pool preserves the existing construction contract, but creates two resource locations with different spend rules.
- A global hub is cheap and deterministic, but it has no spatial meaning.

Step 10BG is therefore a useful prototype of an overflow buffer, not a complete storage gameplay loop.

## B. Comparable-game research

Research shows several distinct patterns. NOVA should borrow patterns, not copy feature sets.

| Game | Pattern | Relevance to NOVA |
|---|---|---|
| **Timberborn** | Warehouses are physical buildings. A warehouse holds one solid good type; its capacity is added to a connected district. Districts make reachability relevant. | Specialization and spatial capacity are meaningful when a player must place and connect warehouses. NOVA has neither gameplay need nor warehouse placement yet. Sources: [Timberborn warehouse category](https://timberborn.wiki.gg/wiki/Category:Goods_stored_in_Warehouses), [Large Warehouse](https://timberborn.org/wiki/buildings/large-warehouse). |
| **Going Medieval** | Storage is spatial and environmental. Stockpiles can be restricted by resource, while cellars and insulation manage food spoilage/temperature. | A physical reserve can create siting and preservation decisions. Temperature, spoilage, hauling, and stockpiles are not present in NOVA; importing them would add unrelated simulation systems. Sources: [underground storage guide](https://www.noobfeed.com/articles/going-medieval-build-underground), [cellar/stockpile guide](https://arcader.org/news/going-medieval-how-to-build-underground-storage/). These are secondary sources. |
| **Frostpunk** | Resource Depots are explicit, specialized capacity. Original-game depots distinguish coal from other resources; Frostpunk 2 uses Stockpile Hubs by resource category. Capacity can be upgraded. | Resource-specific capacity and infrastructure investment create planning. That is a good later pattern, but not a reason to add storage buildings in NOVA now. Sources: [Frostpunk buildings reference](https://frostpunk.game-vault.net/wiki/Buildings), [Frostpunk 2 resources reference](https://frostpunk-2.game-vault.net/wiki/Resources). Exact values are prototype/tertiary data and should not drive NOVA tuning. |
| **Oxygen Not Included** | Storage Bins and Mini Fridges hold bounded contents. Bins interact with their local environment; delivery and automation are separate systems. | Storage can be a physical access/preservation constraint. NOVA has no hauling, temperature, or automation model, so this would be a new logistics game rather than an incremental storage fix. Source: [ONI Storage Bin](https://oxygennotincluded.wiki.gg/wiki/Storage_Bin), [Mini Fridge](https://oxygennotincluded.wiki.gg/wiki/Mini_Fridge). |
| **Factorio** | Chests, buffers, requester chests, and logistic networks have different priorities. Storage receives leftovers; logistics determines movement and availability. | Priority and transport are powerful when a logistics network exists. NOVA has roads and mobility contracts, but no resource-hauling semantics. Adding those now would be premature. Sources: [Storage tank](https://wiki.factorio.com/Storage_tank), [logistic network](https://wiki.factorio.com/Logistic_network), [storage chest](https://wiki.factorio.com/Infobox:Storage_chest). |

### Pattern conclusion

Comparable games get interesting storage from one of four pressures: physical placement, specialization, preservation, or transport. NOVA currently has only a deterministic resource ledger and an overflow event. The smallest useful NOVA storage contract should solve that real event; it should not imitate the pressures that its simulation does not contain.

## C. Options considered

### Model A — Reserve only

`resources.material` is spendable stock; `storage.material` is a protected reserve. Overflow enters storage; release is manual or policy-driven later.

- **Decision created:** save surplus for future interruptions versus spend it now.
- **Failure state:** reserve is full and production overflow is rejected.
- **Causality:** player production choices affect reserve depth.
- **Cost:** requires a clear release policy and player-facing explanation; otherwise reserve is dead state.

### Model B — Physical reserve

Stored resources must be moved or retrieved before use.

- **Decision created:** invest in access/haul infrastructure and manage location.
- **Failure state:** inaccessible reserve.
- **Causality:** transport becomes required.
- **Cost:** workers, routes, network rules, and new timing. Not justified by current architecture.

### Model C — Unified inventory

Storage is additional capacity for the same resource pool. A full stock buffer plus storage total determines spendable inventory; overflow is captured automatically.

- **Decision created:** invest in capacity or accept a full-production condition.
- **Failure state:** production throttling or waste when all capacity is full.
- **Causality:** storage changes total economic capacity.
- **Cost:** requires merging two state fields or carefully defining transition semantics; can remove the useful reserve distinction.

### Model D — Spatial storage

Each building or district owns resources; availability depends on location/connectivity.

- **Decision created:** place, specialize, and connect storage.
- **Failure state:** stranded or unreachable stock.
- **Causality:** roads and buildings gain a new economic role.
- **Cost:** highest. Existing road logic is access/production oriented, not a general goods network.

### Model E — Hybrid

A small global reserve supports food/water continuity while a later local logistics system handles material or specialized goods.

- **Decision created:** potentially different policies by resource.
- **Failure state:** inconsistent availability rules.
- **Causality:** two storage economies with different mental models.
- **Cost:** premature abstraction and difficult UX.

## D. Decision

Choose **Model A: protected, deterministic reserve**, with these scope limits:

1. Storage is a parallel reserve pool, not a new resource and not additional construction stock.
2. Overflow is captured only when the corresponding reserve has headroom.
3. Food, water, and material are not silently treated as spendable from storage in this step.
4. No storage sliders, priority controls, storage workers, storage buildings, hauling, networks, or production throttling are added.
5. The existing automatic overflow behavior remains correct as a prototype safety mechanism.
6. Storage becomes gameplay only when a later contract defines when and how reserve is released. Until then, it is a bounded reserve whose depth is an observable economic state, not an active resource sink.

This is the smallest model that preserves Step 10BG’s useful distinction and avoids pretending NOVA has a logistics simulation. The design answers the product problem: storage prevents avoidable production loss and creates a visible buffer, but does not yet add a new player action.

## E. Storage Gameplay Contract

### What Storage is

- A settlement-level, deterministic reserve of Food, Water, and Material.
- A destination for resource surplus that cannot enter its normal primary capacity.
- A bounded record of retained production, persisted explicitly in `SimulationState.storage`.

### What Storage is not

- Not a new resource, recipe, currency, or workforce assignment.
- Not a second spendable construction balance.
- Not a global market or trade network.
- Not a building, placed object, or road-connected network.
- Not a player-selectable priority system yet.
- Not a promise that all resources currently flow into it.

### Capacity

Capacity is per resource. Current prototype capacities remain 50 Food, 30 Water, and 40 Material. A full slot rejects additional overflow; it never wraps, goes negative, or changes capacity automatically.

### Availability

- Primary `resources` and `storage` remain separate.
- Stored resources are not available for construction under this contract.
- Food and Water storage availability is unspecified until their production/consumption flow is connected; until then, it must not be presented as consumable.
- No road, worker, or location access check applies.

### Overflow

- Material overflow from the existing Workshop cap is retained up to Material capacity.
- Overflow beyond reserve capacity is discarded by existing production behavior, with no negative state or hidden debt.
- Deterministic ordering is preserved.
- Food and Water do not allocate to storage yet. Their slots are reserved for future contracts, not active overflow sinks.

### Consumption and construction

- Primary resource consumption remains unchanged.
- Stored Material cannot start construction.
- No release behavior is added because no player command or policy has been selected. Adding automatic release would make stored material effectively spendable and would require a new construction-spend contract.

### Player control

No new player control in Step 10BH. Existing production and construction choices indirectly affect reserve depth. Sliders are rejected because they would create a preference with no distinct consequence. Allocation priorities are rejected because the simulation has one deterministic overflow producer and no competing claims on the reserve.

### Failure states

- Reserve full: additional eligible overflow is rejected.
- Reserve low: an informative UI warning may be added later, but low reserve currently has no gameplay effect.
- Primary stock shortage: existing primary-stock behavior remains authoritative.

### Persistence

Retain `StorageHub` fields and validation exactly as implemented. No `SAVE_VERSION` bump, migration, or derived-state change is needed. The hub is canonical because its retained quantities affect save equivalence and future behavior; it is not derived from production logs.

## F. Capacity decision

Retain **50 / 30 / 40** for this step. These are documented prototype values, not balanced constants.

Measured against current rules:

- Food: 50 units is 50 colonist-tick meals, or 25 ticks at one farm’s 2-food/tick output when no other consumption exists. It does not yet buffer food because Food never enters the hub.
- Water: 30 units is 30 colonist-tick servings, or 15 ticks at one well’s 2-water/tick output. It does not yet buffer water.
- Material: 40 units is 20 worker-ticks of gross material at 2 material/worker/tick, or 40 staffed-Workshop upkeep ticks at 1 material/Workshop/tick. Actual overflow is smaller and depends on the separate 25-per-operational-Workshop production cap.
- The values are therefore meaningful scale references, but there is no evidence that any one is too generous or too restrictive during normal play.
- Rebalancing now would be speculative and could obscure the missing contract: what reserve behavior is intended?

A later balance pass must use measured traces, not these arithmetic comparisons alone.

## G. UX contract

Minimum information for the current prototype:

- Show each resource’s stored amount and capacity, if storage is surfaced at all.
- Distinguish **available stock** from **retained reserve**.
- Explain “full: overflow was not retained” when a relevant full slot rejects material.
- Do not label reserve as available Food, Water, or Material.
- Do not imply that storage prevents all waste; it only absorbs eligible overflow while headroom exists.

Do not add a large storage panel, allocation sliders, priority selectors, or empty-state actions. A compact read-only status summary is enough until a release/control contract exists.

## H. Town relationship

Storage could support future Town complexity, but it should remain a supporting economy feature rather than a Town prerequisite. A future Town could causally progress from:

`production → retained reserve → explicit release/distribution policy → spatial logistics`

Storage would be one input to that progression. No Town threshold, warehouse, or distribution mechanic is specified here.

## I. Implementation scope

### Retain unchanged

- `StorageHub` and 50 / 30 / 40 capacities.
- Explicit persistence and v7 → v8 migration.
- Material overflow capture.
- Deterministic ordering and no new randomness.
- Current primary construction-spend rules.

### Defer

- Food/Water storage integration.
- Storage release policy or command.
- Player allocation controls.
- Storage workers, buildings, hauling, roads, networks, and production throttling.
- Capacity rebalancing.

### Reason

The current implementation is correct enough for the narrow prototype hypothesis: retain overflow in a bounded parallel reserve. The requested broader storage system is not sufficiently defined to justify code changes. The next step should be a measured trace/audit of reserve behavior and a design choice for release semantics, not automatic UI expansion.

## J. Verification and QA

No implementation changed in Step 10BH. Therefore no new typecheck, lint, build, Vitest, browser, or GPU result is claimed. Existing Step 10BG verification remains the baseline: 1608 tests passed per Step 10BG’s recorded state. This step adds design evidence only.

Recommended next evidence, before changing code:

1. Instrument or audit traces for material overflow, reserve fullness, and primary-stock construction spend.
2. Decide whether reserve release is automatic, command-driven, or never intended for the current phase.
3. Only then implement the smallest matching behavior and test save/load plus determinism.

## Sources

- Timberborn warehouse category: https://timberborn.wiki.gg/wiki/Category:Goods_stored_in_Warehouses
- Timberborn Large Warehouse: https://timberborn.org/wiki/buildings/large-warehouse
- Going Medieval underground storage guide: https://www.noobfeed.com/articles/going-medieval-build-underground
- Going Medieval cellar/stockpile guide: https://arcader.org/news/going-medieval-how-to-build-underground-storage/
- Frostpunk buildings reference: https://frostpunk.game-vault.net/wiki/Buildings
- Frostpunk 2 resources reference: https://frostpunk-2.game-vault.net/wiki/Resources
- Oxygen Not Included Storage Bin: https://oxygennotincluded.wiki.gg/wiki/Storage_Bin
- Oxygen Not Included Mini Fridge: https://oxygennotincluded.wiki.gg/wiki/Mini_Fridge
- Factorio storage tank: https://wiki.factorio.com/Storage_tank
- Factorio logistic network: https://wiki.factorio.com/Logistic_network
- Factorio storage chest: https://wiki.factorio.com/Infobox:Storage_chest

Source quality note: Timberborn and ONI references are wiki-level documentation. Going Medieval and Frostpunk references include secondary documentation, so exact values and implementation details are treated as illustrative rather than authoritative. NOVA decisions above rely on the recurring patterns, not copied numeric tuning.

## Final QA report

```text
Step 10BH — PASS (design decision complete; implementation intentionally unchanged)

Design decision:
Storage remains a deterministic parallel reserve for retained production overflow. It is not yet an active player-controlled economy.

Storage model:
Model A — protected reserve. No physical movement, unified inventory, buildings, workers, or networks.

Player control:
None added. Existing production/construction choices indirectly determine reserve depth.

Capacity:
50 Food / 30 Water / 40 Material retained as prototype values; no rebalance without trace evidence.

10BG changes retained/reworked:
Retained: hub, capacities, material overflow capture, persistence, deterministic ordering.
Reworked: none.

Files changed:
docs/roadmap/Step10BH.md

Tests:
No new code tests. Step 10BG baseline recorded 1608 passing tests.

Browser:
Not run; no UI implementation changed.

GPU:
Not run; no UI/WebGL implementation changed.

Known limitations:
Food and Water storage are not connected to simulation flow. Material reserve cannot fund construction. No release policy or player-facing storage control exists.

Next justified step:
Run a measured reserve-behavior audit and decide release semantics before implementing any further storage feature.
```
