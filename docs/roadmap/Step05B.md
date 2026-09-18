# NOVA — Step 05B — First Colonist Need Design Contract

**Status: COMPLETE — READY FOR IMPLEMENTATION.** Referenced by Step05C (docs/roadmap/Step05C.md).

---

# NOVA — Step 05B Food Need Design Contract

## Authoritative docs inspected

docs/02-game-design.md, docs/03-core-loop.md, docs/07-population.md, docs/08-economy.md, docs/09-economy-foundation.md, docs/11-time-and-events.md, docs/22-canonical-simulation.md, docs/18-save-game.md, docs/26-roadmap.md, docs/29-design-rules.md, docs/00-CMD.md; plus src/domain/*, tests/, e2e/ to ground every choice in the real repository. No contradictions with the Step 05A audit were found.

## Key constraints recovered from the docs

- docs/00-CMD.md:93-101 — the distinction Infrastructure → Operational state → Service → Need → Consumption → Outcome must never collapse into one boolean.
- docs/11-time-and-events.md:11-24 — canonical phase order lists needs (4) and consumption (5) before population changes (9); order may evolve but must stay explicit/deterministic.
- docs/07-population.md:17-27 — food availability is a population growth condition; growth must be caused by settlement viability, not a timer.
- docs/08-economy.md:20-27 — resources need producer, consumer, reason, storage semantics, failure consequence.
- docs/22-canonical-simulation.md:62-71 — schema change requires save version, validation, hash, tests, explicit backward-compat or rejection.
- docs/18-save-game.md:17-18 — migrations explicit, never silent guessing.
- docs/29-design-rules.md — rules 6, 8, 9, 15, 21 central to this design.

## Current colonist model

ColonistState = { id: string; residenceId: string | null } (src/domain/population/colonist.ts:8). It has no need, no consumption, no behavior. Admission (src/domain/simulation/phases.ts:174-186) triggers on operational residence + free capacity, ascending residence id. Food does not exist anywhere.

## Food resource semantics

- ResourceStock becomes { construction: number; food: number } (additive, matching Step04's { construction }).
- Measured in whole units (integers, never negative — deduction guarded as in deductResources, src/domain/resource/resource.ts:25-35).
- INITIAL_FOOD = 100 (deterministic constant, same pattern as INITIAL_CONSTRUCTION_MATERIAL = 100). Two identical initial states ⇒ identical food.
- One colonist needs 1 unit per tick (FOOD_PER_COLONIST_PER_TICK = 1).
- Consumption happens every tick while at least one colonist exists. No passive decay, no wall-clock.
- All-or-nothing feeding at colony level (see Multiple colonists): either the colony is fed that tick or nobody is. This mirrors the Step04 colony-level access rule (hasSufficientResources before any deduction).
- Stock has no maximum in Step 05 (no production; stock is monotonic non-increasing). A stock cap is deferred.
- No partial consumption by default: food < population ⇒ food set to 0 and the colony starves (below).
- Intentional Step 05 behaviour: with no production (roadmap, Phase 3 = Needs precedes Phase 4 = First production flow), any non-empty colony is guaranteed to exhaust food and starve. Death-by-scarcity is the accepted, explicit cost of the smallest needs step; production restoring the loop is Phase 4 and stays out of scope.
- Deduction is atomic and pure: hasSufficientFood/deductFood mirror the Step04 hasSufficientResources/deductResources pair and never throw across a phase boundary (shortage is a branch, never an exception). Negative input values throw, same as Step04.
- Food is consumed only when the colony can actually be fed for the whole tick (food ≥ population). Nothing is consumed while population = 0. On a shortage tick the remaining reserve is exhausted (food := 0) as part of the starvation event.

## Food need semantics

- **There is no stored per-colonist need meter, and no stored colony-level need number.** The need is a *derived* value: every living colonist requires FOOD_PER_COLONIST_PER_TICK = 1 food per tick. `foodRequirement(state) = colonistCount(state)`.
- Why this minimal representation: the requirement is uniform, consumption is all-or-nothing at colony level, and there is no production/recovery in Step 05. A stored `foodNeed` value could only ever read "1 while alive, deleted at death" — a tautology with zero gameplay meaning and no current use case (design rule 21).
- The Need → Consumption → Outcome chain (docs/00-CMD:93-101) is NOT collapsed: it stays structurally explicit as three distinct, documented, pure phases (updateNeeds → consumeFood → updatePopulation-with-starvation), with the fed/starved decision carried as an explicit intra-tick value between phases (docs/22:47 — a later phase depending on an earlier result must make that dependency explicit). Canonical state stays minimal.
- Answers per the Step 05B brief:
  - what does the number mean? → food is a colony reserve measured in meal-units; one unit feeds one colonist for one tick.
  - range? → integer, 0 ≤ food ≤ 100 in Step 05 (strictly non-increasing; initial 100; cap deferred).
  - initial value? → 100 (INITIAL_FOOD), deterministic.
  - how does it change per tick? → −population on fed ticks (all-or-nothing), → 0 on the first unfed tick.
  - when does consumption occur? → every tick with population ≥ 1, before admission (docs/11: consumption #5 precedes population changes #9).
  - what does "satisfied" mean? → the whole colony was fed that tick: food ≥ population at consumption time.
  - what happens when it reaches zero? → shortage tick: food stays 0, starvation consequence fires (below), growth halts.

## Tick order

Current order (src/domain/simulation/step.ts): applyCommand → advanceConstruction → updatePopulation → advanceTime.

Recommended order (docs/11 compliant — needs #4 and consumption #5 precede population changes #9):

```text
1. applyCommand          (unchanged)
2. advanceConstruction   (unchanged)
3. updateNeeds           (NEW: requirement = colonist count; pure derivation)
4. consumeFood           (NEW: all-or-nothing feed; returns { state, fed })
5. updatePopulation      (CHANGED: starvation removal when not fed, then food-gated admission)
6. advanceTime           (unchanged)
```

Comparing the proposed options:
- **Option A (need decreases → consume → consequence):** requires a stored, depleting hunger meter that accumulates. Without production/recovery the meter only ever declines to death — it adds state and phase complexity for zero causal gain. REJECT.
- **Option B (consume → need decreases → consequence):** equivalent result to C for a uniform 1/tick requirement, but it makes the *cause* (the need) an afterthought of the *effect* (consumption), which reads backwards against docs/00-CMD's causal chain. REJECT.
- **Option C (need expressed → if food available consume → if unavailable consequence):** chosen. It mirrors the existing Step04 pattern exactly (`hasSufficientResources` is checked before any deduction) and matches docs/11 phase numbering. When a new colonist is admitted in phase 5, it is first fed on the *next* tick — deterministic, causal, and simple to verify.

Every phase stays a pure function; `fed` is an explicit local value threaded within stepSimulation (never stored, never persisted). Same input + same command ⇒ same output, regardless of wall-clock.

## Shortage consequence

- **The consequence: the entire colony starves.** On the first tick where food < population, food is set to 0 and all colonists leave (population → 0). Residences are freed and remain vacant.
- Why this and not gating only: docs/29 rule 8 — every shortage must have a measurable consequence; docs/29 rule 9 — major consequences need an understandable explanation. "Growth stops" alone is barely observable and reads as decorative (Step 05A warned against a purely decorative need). All-or-nothing feeding means nobody was fed that tick, so nobody survives — the sharpest, most legible consequence of the rule "either the colony is fed or nobody is."
- Why not "one colonist leaves per deficient unit": that is de facto partial rationing — it lets a colony ratchet down to population = food and then coast, silently re-introducing the per-colonist priority logic and tie-break ordering (design rule 20) that all-or-nothing deliberately avoids. REJECT for Step 05.
- When it occurs: immediately, in the same tick as the first insufficient consumption; never retroactively, never after a grace period.
- Reversible? Not within Step 05 — no production. The colony remains dead (food 0, population 0, no admission) until a future step provides a food flow. Documented as intentional.
- Residence assignment: all colonists removed, so no residence keeps an occupant; getHousingSummary returns 0 occupied, free capacity restored.
- Population count: → 0 via removal, never negative; no hidden ordered iteration is needed because the whole colony is removed (only the *admission* path needs ordering, below).
- Determinism: preserved — the starved/fed decision derives entirely from canonical state; removal is a pure function; no randomness.

## Initial population / admission semantics

- Admission channel stays: operational residence + free capacity, ascending residence id (unchanged, src/domain/housing/housing.ts availableResidenceIds).
- Admission is additionally gated on food availability (docs/07 growth conditions): a colonist is admitted only while `food > 0` *after* this tick's consumption. A starved colony (food 0) admits nobody; a colonist admitted on tick N is first fed on tick N+1.
- No production is introduced to make this work: with INITIAL_FOOD = 100, the first colonist always has a deterministic, valid, fed starting state. The player can grow the colony until it overreaches its food and then watch the documented starvation.
- docs/07's "growth caused by settlement viability" is therefore realized: food does not grow population on a timer — it *allows* growth while the pantry lasts and *terminates* it on exhaustion.

## Multiple colonists

- 1, 2, 4 colonists: one shared colony-level stock; no per-colonist feeding records.
- All-or-nothing at colony level: every tick, either `food >= population` (deduct exactly population) and everyone is fed, or nobody is fed and the starvation consequence fires. This mirrors the Step04 colony-level access rule (hasSufficientResources before any deduction).
- No hidden priority when food is enough for only some colonists: with all-or-nothing that case is structurally impossible — "food enough for only some" is precisely the triggering condition, and the result is uniform (colony starves), so no tie-break is ever consulted (design rule 20 only applies where multiple valid outcomes exist; here there is exactly one).
- Deterministic iteration order is required only on the admission path, where it is inherited from the existing ascending-residence-id order; feeding and starvation removal require no iteration at all.

## Persistence contract

- **SAVE_VERSION 2 → 3** (schema change per docs/22:62-71: new simulation-critical field ⇒ version, validation, hash, tests, explicit compatibility).
- New field in validated shape: `resources.food` — integer, finite, ≥ 0. Missing or invalid ⇒ SaveValidationError.
- Colonist need field(s): **none** — the need is derived, so colonist records are unchanged; a v3 save has the same colonist shape as v2.
- Backward compatibility: **explicit rejection.** v2 saves are rejected with an unsupported-version error (existing behavior, cf. persistence.test.ts rejecting version 999). No v2 → v3 migration is defined because no honest one exists: guessing an initial food value for an old save is exactly the "silently guessing missing fields" that docs/18:17-18 forbids.
- Round-trip: serializeSave/loadSave must preserve canonical state bit-for-bit (canonical hash and serialized form equal), produce an identical render snapshot, and continue simulating identically (behavioral equivalence, cf. persistence.test.ts).
- Canonical hash integration: adding `resources.food` automatically changes every FNV-1a hash — intended and expected (docs/22); determinism tests are re-run.

## Hash / determinism contract

- New hash surface: exactly `resources.food` (integer) plus the existing state. No colonist shape change, no hidden field.
- Invariants (all existing determinism.test.ts patterns extended):
  - same canonical state ⇒ same hash; same state + same command ⇒ same next state;
  - food change ⇒ hash changes; population change ⇒ hash changes (already true);
  - starvation is deterministic: same state ⇒ same fed/starved outcome, hence same removal set, same hash;
  - no Math.random(), no Date.now(), no wall-clock, no browser/platform state in any new code.
- The `fed` value is intra-tick and never serialized, so it does not broaden the hash surface or create replay divergence.

## UI contract

Minimum to make Food understandable (docs/02 design test: which visible element communicates this?):

- **MUST HAVE:** a `Food` counter in the existing HUD line, sourced from the real resource query (getResourceStock now returns food; main.ts refreshUi reads it), identical pattern to the current material counter.
- **MUST HAVE:** a food status readout on global shortage: when food reaches insufficiency, the existing status line shows an explainable message (e.g. "Food shortage — colony starved") so the consequence is legible (design rule 9). Values come from real queries, never hardcoded presentation.
- **SHOULD HAVE:** a derived "food status" classification (fed when food ≥ population, shortage/unfed otherwise) as a pure query (getFoodStatus or equivalent), shown in the status line: "Food: 12 · feeding 4 colonists" / "Food: 0 — shortage".
- **DEFER:** per-colonist need bars, consumption forecasts, "ticks of food remaining", charts, resource panels, dashboards, production UI. No new UI framework, no charts.
- E2E hook: window.__nova.stats gains `food` and `foodStatus` (read-only, presenting real state), so real-browser tests assert actual simulation values.

## Unit-test contract

MUST HAVE:
- initial state: construction 100 + food 100; two identical initial states identical (hash equal).
- single colonist consumes exactly 1 food/tick; two colonist → 2/tick; four → 4/tick.
- fed boundary: food == population ⇒ fed tick, food → 0, colonists survive one more tick.
- shortage: food < population ⇒ food → 0 and all colonists removed (population → 0), residences freed.
- admission gating: no new colonist when food == 0.
- newly admitted colonist first consumes on the next tick.
- admission tie-break: two residence slots, food > 0 ⇒ ascending residence id (existing test extended).
- starvation is deterministic and complete in one tick; no partial removal.
- no mutation: stepSimulation does not mutate its input (existing pattern).
- hash changes when food changes and when population changes; same scenario same hash.
- persistence: round-trip v3; v2 rejected; missing/invalid food rejected; unexpected fields rejected; render snapshot equal; behavioral equivalence after load.
- regression: every existing Step 04 test (resources, determinism, persistence, simulation, inspection, app boundary) keeps passing.

SHOULD HAVE:
- food never goes negative even with population 0 (consume 0).
- resource stock shape assertions updated to { construction, food }.
- food status query unit tests (fed / shortage transitions).

FUTURE (not in this step): need meters, diets, rationing, stock caps, production-led recovery, starvation persistent-event records.

## E2E contract

New `e2e/foodRun.mjs` (pattern: e2e/resourceRun.mjs), screenshots under `artifacts/food/`. Real browser, real clicks, real STEP/PLAY. No simulation logic duplicated — assertions are invariants plus contract constants.

Deterministic scenario (globally affordable: 4 residences × 25 = 100 material; food 100):
1. LOAD → assert food = 100, material = 100, colonists = 0. Shot `01-initial.png`.
2. Real-click 4 residences (ticks 1-4); STEP to operational → colonists = 4, food decreasing. Shot `02-colonists-fed.png`.
3. STEP through feeding: assert food decreases by exactly the current colonist count each fed tick (property assertion), food never negative.
4. Continue until the fed-empty/shortage boundary: assert the documented end state — food → 0, colonists → 0 (starvation), residences vacant. Shot `03-shortage.png`.
5. Further STEPs: colonists stay 0, food stays 0, no re-admission (food gate). Shot `04-after-starvation.png` / `05-rejected-growth.png`.
6. PLAY/PAUSE sanity: no spontaneous changes. Remove-ance asserts console errors = 0, page errors = 0.
7. Exact expected milestone values (tick numbers) are derived from the deterministic contract and locked once Step 05C pins phase timing — the E2E asserts the relationship (delta = population, shortage ⇒ 0/0, gate ⇒ no admission), not a re-implementation.

## City-builder sanity check

Colonist → measurable need (1 food/tick) → need drives state over time (food declines deterministically) → resource consumed (tickly deduction) → resource can become scarce (food hits 0) → scarcity has a measurable consequence (colony starves, population → 0, growth halted). Yes — the colonist is now meaningfully more than a decorative token, without production, jobs, money, services beyond housing, transport or logistics (docs/03, docs/25 MVP).

## Premature abstractions explicitly deferred

- `Need<T>` — DEFER (single concrete need; no generics without a second use case, rule 21).
- `NeedSystem` — DEFER (updateNeeds is one phase function, not a system).
- `ResourceSystem` — DEFER (ResourceStock is a plain record, as in Step 04).
- `ConsumptionSystem<T>` — DEFER (one consumeFood function).
- `Recipe<T>` — DEFER; `ProductionSystem<T>` — DEFER (roadmap Phase 4).
- `JobSystem` / `WorkerSystem` — DEFER; `EconomyEngine` — REJECT.
- Stored per-colonist need meter — DEFER (no use case yet); partial rationing / deficit removal — REJECT.

## Step 05C implementation scope

- Domain: ResourceStock += food; INITIAL_FOOD = 100; FOOD_PER_COLONIST_PER_TICK = 1; hasSufficientFood / deductFood mirrors; phases updateNeeds + consumeFood; updatePopulation gains starvation + food gate. fed threaded inside stepSimulation. No ColonistState change.
- Persistence: SAVE_VERSION = 3; validate food (finite int ≥ 0); reject v2 explicitly; no migration.
- App: resource query flows through (no new architecture); window.__nova.stats += food + foodStatus; status-line scarcity/starvation message.
- Tests + E2E as contracted above. Out of scope: production, jobs, money, water/power, generic needs, stock caps, migrations, save upgrade tooling.

## Acceptance criteria

- Simulation: food exists and is consumed deterministically; need is visible; fed-empty and shortage boundary behave exactly as documented; starvation removes colonists in one tick; admission is food-gated.
- Architecture: domain stays browser-independent; pure functions; no randomness; no wall-clock; deterministic ordering; no new premature abstraction.
- Persistence: v3 persists, v2 rejected, invalid food rejected, hash includes food, exact round-trip and behavioral equivalence.
- UI: food and shortage are understandable from real queries.
- E2E: real browser ticks prove food consumption and starvation; console = 0, page errors = 0.
- Regression: full existing Step 04 suite (unit + E2E resource + GPU) still passes.

## Decision

**READY FOR IMPLEMENTATION**