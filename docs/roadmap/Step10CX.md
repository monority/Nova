# Step 10CX — Roadmap Re-entry After Phase 8 Defer

## Objective

Re-enter the authoritative NOVA roadmap after Step 10CW deferred Phase 8.

This is a **roadmap selection gate only**.

Do not implement a gameplay mechanic.

The purpose is to determine what, if anything, should happen next based on the documented roadmap, current implementation, prerequisites, and previous evidence.

Current baseline:

- Latest commit: `1e08dcb` — `Step 10CW: Phase 8 Production Economy Investigation`
- Phase 7: COMPLETE
- Phase 8: DEFERRED by evidence
- Full Vitest: `1814/1814`
- Typecheck: PASS
- Lint: PASS
- Build: PASS
- SAVE_VERSION: `8`
- No Phase 8 runtime mechanic implemented
- `src/` unchanged by 10CW
- Phase 7 invariants frozen

---

# 1. Read authoritative roadmap material

Read completely:

- `docs/26-roadmap.md`
- `docs/roadmap/Step10CP.md`
- `docs/roadmap/Step10CU.md`
- `docs/roadmap/Step10CV.md`
- `docs/roadmap/Step10CW.md`

Also inspect any roadmap/design documents referenced by those files that define:

- Phase 8;
- Phase 9;
- Phase 10;
- Phase 11;
- Phase 12;
- prerequisites;
- intended causal order;
- explicit deferrals;
- product vision.

Do not infer priorities from generic city-builder conventions.

The repository roadmap is authoritative.

---

# 2. Reconstruct the current product state

Document what is actually implemented.

At minimum:

### Simulation

- world/grid;
- housing;
- colonists;
- needs;
- production;
- workforce;
- roads;
- construction;
- storage;
- population growth;
- Town;
- Material income;
- Material spending;
- affordability.

### Product layer

- scenarios;
- objectives;
- progression;
- save/load;
- deterministic hashing;
- rendering;
- UI.

### Explicitly absent

Identify systems that are genuinely absent, especially:

- production inputs;
- production chains;
- external demand;
- settlement growth beyond current population logic;
- transport simulation;
- vehicles;
- technology.

Do not treat an absent feature as a defect unless the roadmap says it should already exist.

---

# 3. Reconstruct the roadmap state

Build a factual phase table:

| Phase | Name | Status | Evidence |
|---|---|---|---|
| 0 | Foundation reset | ? | |
| 1 | Housing → Colonist | ? | |
| 2 | Time / simulation | ? | |
| 3 | Needs | ? | |
| 4 | First production flow | ? | |
| 5 | Additional service | ? | |
| 6 | Work | ? | |
| 7 | Money / affordability | ? | |
| 8 | Production economy | ? | |
| 9 | Transport | ? | |
| 10 | Settlement growth | ? | |
| 11 | Vehicles | ? | |
| 12 | Technology | ? | |

Use actual repository evidence for every status.

Do not rely on memory alone.

---

# 4. Evaluate Phase 8 after the DEFER

Step 10CW established:

- no current production input;
- no production chain;
- no new production sink;
- no new production bottleneck;
- no new specialization decision;
- no efficiency system;
- existing workforce allocation already expresses the relevant three-way production trade-off.

Determine whether anything in the roadmap nevertheless requires Phase 8 to be implemented now.

If the roadmap contains no concrete requirement beyond what 10CW investigated, mark Phase 8:

**DEFERRED — evidence required to reopen.**

Do not invent a production economy merely because Phase 8 exists in the roadmap.

---

# 5. Evaluate Phase 9 — Transport

Determine whether Phase 9 is independently actionable.

Inspect its documented requirements and determine:

- required systems;
- current prerequisites;
- whether roads alone are sufficient;
- whether transport requires Phase 8 production chains;
- whether transport requires money/markets;
- whether transport requires settlement growth;
- whether vehicles are required;
- whether a meaningful transport decision already exists in the current simulation.

Important:

Do not implement transport.

Only determine whether its prerequisites are satisfied and whether the roadmap explicitly permits starting it before deferred Phase 8.

If Phase 9 requires a missing Phase 8 capability, record that dependency.

---

# 6. Re-evaluate Phase 10 — Settlement Growth

Do not reopen growth speculatively.

Use the previous evidence:

- Step 10CL — Growth Demand Investigation
- Step 10CM — World / External Demand Investigation
- Step 10CN — Post-Town Product Reorientation Gate

Determine whether any new evidence since those steps invalidates their DEFER decision.

Specifically check for:

- new demand;
- new sink;
- new shortage;
- new scale-induced qualitative break;
- new external/world state;
- new player decision that requires growth.

If none exists, keep Phase 10 deferred.

Do not redesign growth in this step.

---

# 7. Evaluate Phase 11 — Vehicles

Determine only:

- documented purpose;
- prerequisites;
- whether those prerequisites exist;
- whether Phase 11 can meaningfully precede Phase 9;
- whether it is explicitly dependent on transport.

Do not design vehicles.

Do not add vehicle mechanics.

---

# 8. Evaluate Phase 12 — Technology

Determine only:

- documented purpose;
- prerequisites;
- whether Phase 12 is explicitly downstream of previous systems;
- whether efficiency/upgrades found in 10CW actually belong here.

Do not design a technology tree.

Do not add upgrades.

---

# 9. Check for hidden dependency loops

Explicitly map dependencies.

Example:

```text
Phase 7
  ↓
Phase 8 ?
  ↓
Phase 9 ?
  ↓
Phase 11 ?
```

And independently:

```text
Phase 10 growth
  ↕
Phase 8 / external demand
```

Determine whether the roadmap has a valid next branch or whether deferred phases block all future implementation.

If the roadmap reaches a genuine dependency dead-end, document it rather than inventing a bridge mechanic.

---

# 10. Product-direction gate

For each potentially actionable phase, determine:

1. Is it explicitly part of the roadmap?
2. Are its prerequisites implemented?
3. Does it introduce a documented capability?
4. Is it independent of a currently deferred prerequisite?
5. Can it be implemented without inventing intermediate mechanics?
6. Does it fit the current product identity?
7. Is there enough evidence to define the minimum implementation?

Do not assign scores.

Do not rank candidates numerically.

Do not declare a "best" feature.

---

# 11. Decision gate

Choose exactly one factual outcome.

### Outcome A — CONTINUE

A specific roadmap phase is independently actionable.

Document:

- exact phase;
- exact prerequisite evidence;
- why it does not require deferred Phase 8;
- smallest legitimate next investigation step.

Do not implement it in 10CX.

### Outcome B — FREEZE

No later roadmap phase is currently independently actionable without inventing a missing prerequisite or reopening a deferred direction without evidence.

Document:

- which phases are complete;
- which are deferred;
- which are blocked by dependencies;
- what evidence would reopen the roadmap.

### Outcome C — BLOCKED

The roadmap contains an actual contradiction or missing prerequisite definition that prevents selecting the next phase.

Document the contradiction precisely.

Do not resolve it speculatively.

---

# 12. Previous evidence must remain respected

Do not reopen these decisions without new evidence:

- 10CA — no new mechanic justified;
- 10CL — growth DEFER;
- 10CM — external/world demand DEFER;
- 10CN — product freeze;
- 10CW — production economy DEFER.

A roadmap re-entry step may overturn a previous decision only if it identifies **new evidence** that invalidates that decision.

---

# 13. No implementation

This step must not modify runtime behavior.

Allowed:

- investigation/measurement tests if genuinely necessary;
- `docs/roadmap/Step10CX.md`.

Forbidden:

- new gameplay mechanics;
- new resources;
- new buildings;
- transport;
- vehicles;
- technology;
- production chains;
- growth;
- UI features;
- commands;
- persistence fields;
- SAVE_VERSION changes.

If the answer can be established from existing code and documentation, do not add tests merely for the sake of adding tests.

---

# 14. Validation

Because this is a roadmap gate:

If no code changes:

- do not waste time rerunning the entire browser/GPU matrix;
- document that runtime/UI/rendering behavior is unchanged.

If investigation tests are added:

- run focused tests;
- full Vitest;
- typecheck;
- lint;
- build;
- `git diff --check`.

The existing baseline is:

`1814/1814 PASS`.

Do not introduce unrelated failures.

---

# 15. Documentation

Create:

`docs/roadmap/Step10CX.md`

Preserve this prompt verbatim at the top.

Append:

```markdown
## As-Built

### Current Product State

...

### Roadmap State

...

### Phase 8 Re-evaluation

...

### Phase 9 Evaluation

...

### Phase 10 Re-evaluation

...

### Phase 11 Evaluation

...

### Phase 12 Evaluation

...

### Dependency Map

...

### Decision Gate

...

### Reopening Evidence

...

### Validation

...

### Scope Audit

...
```

Clearly separate:

- implemented facts;
- roadmap requirements;
- deferred decisions;
- blocked dependencies;
- new evidence;
- final decision.

---

# 16. Final diff audit

Before committing:

```bash
git status --short
git diff --stat
git diff --check
```

Ensure:

- no runtime implementation;
- no unrelated files;
- `AGENTS.md` untouched;
- user-owned files untouched;
- no generated artifacts.

---

# 17. Commit

If the gate is complete:

```text
Step 10CX: Roadmap Re-entry After Phase 8 Defer
```

Commit locally.

Do not push.

---

# Completion criterion

10CX is complete only when:

- current roadmap state is reconstructed from authoritative documents;
- Phase 8 DEFER is respected;
- Phase 9–12 dependencies are explicitly checked;
- previous DEFER/FREEZE decisions are not reopened without new evidence;
- exactly one of CONTINUE / FREEZE / BLOCKED is selected;
- no gameplay mechanic is implemented;
- documentation is complete;
- validation is clean;
- diff scope is clean;
- commit is created locally;
- nothing is pushed.

The next step must follow the selected gate result rather than being predetermined.

---

## As-Built

### Current Product State

Reconstructed from `src/`, the test suite and the tracking docs at `1e08dcb`.

**Simulation (implemented)**

- world/grid: bounded 2D board, placement-only terrain (`domain/world`);
- housing -> colonists: residences, housing capacity, deterministic admission (`domain/housing`, `domain/population`);
- needs: Food (all-or-nothing feeding, starvation removes colonists) and Water (coverage/admission gate) (`domain/resource`, `domain/water`);
- production: Farm -> Food, Well -> Water, Workshop -> Material (road- and staffing-gated) (`domain/building`, `domain/simulation/phases`);
- workforce: job capacity, deterministic assignment, manual reassignment, construction crews (`domain/jobs`, `domain/mobility`);
- roads: placement, construction lifecycle, networks, building road access, mobility connectivity (`domain/road`, `domain/network`);
- construction: atomic `placeBuilding` / `placeRoads`, under-construction lifecycle, crew acceleration;
- storage: centralized hub (Food 50 / Water 30 / Material 40) with the protected Material floor 15 (`domain/storage`);
- population growth: food-and-water-gated admission (`updatePopulation`);
- Town: derived progression stages, workforce review (`application/queries/progression`);
- Material income: Farm +1, Well +1, Workshop +2 per employed colonist per tick (derived, Step 10CQ);
- Material spending: `placeBuilding` (25, +1 Water for a Workshop), `placeRoads` (5/cell);
- affordability: `getPlacementAffordability` (valid | stock + stored + income | 10BJ reserve release) and `getRoadsPlacementAffordability` (no reserve), Step 10CR/10CS/10CT.

**Product layer (implemented)**

- scenarios: an authored catalogue (11 entries incl. the terrain-chokepoint fixture) with objectives (`application/scenarios`, `application/queries/objective`);
- progression/objectives: settlement/village/town conditions and objective status (`application/queries/progression`, `objective`);
- save/load: versioned canonical save, `SAVE_VERSION = 8` (`application/persistence`);
- deterministic hashing: `hashCanonicalState` / canonical serialization (`domain/simulation/hash`);
- rendering: Three.js scene/renderer (`renderer/three`);
- UI: HUD, inspection, palette, hover feedback, scenario selector (`app/main.ts`).

**Explicitly absent (not defects)**

production inputs, production chains, external/world demand, settlement growth beyond
admission, transport movement/logistics, vehicles, technology. Each is a later
roadmap phase or an explicitly deferred branch, not a missing prerequisite for
the implemented ones.

### Roadmap State

| Phase | Name | Status | Repository evidence |
| --- | --- | --- | --- |
| 0 | Foundation reset | **COMPLETE** | `docs/30-architecture-foundation.md`, domain/application/renderer boundaries, hashing + determinism tests |
| 1 | Housing -> Colonist | **COMPLETE** | residence/housing capacity + colonist creation/admission, `housing*` tests |
| 2 | Time / simulation | **COMPLETE** | `step.ts` explicit tick pipeline, `advanceTime`, determinism/hash tests |
| 3 | Needs | **COMPLETE** | Food need with starvation consequence; Water need (`phases.ts`, `resource.ts`, `water.ts`) |
| 4 | First production flow | **COMPLETE** | Farm -> Food -> stock -> household consumption -> starvation (`produceFood`/`consumeFood`) |
| 5 | Additional essential service | **COMPLETE** | Well -> Water -> coverage/admission gate (Step 10P) |
| 6 | Work | **COMPLETE** | workplaces, job capacity, assignment, labour -> production (Steps 07C, 10M, 10Y) |
| 7 | Money / affordability | **COMPLETE** | income + two expenditure paths + affordability, handoff at Step 10CU (`aee2389`) |
| 8 | Production economy | **DEFERRED** | Step 10CW Outcome B; no input/chain/sink/decision measured |
| 9 | Transport | **PARTIAL / BLOCKED** | network + accessibility implemented (roads, 09F access, 09M mobility); movement/logistics absent and needs a movement reason |
| 10 | Settlement growth | **DEFERRED** | Steps 10CL / 10CM / 10CN (FREEZE), no new evidence since |
| 11 | Vehicles | **BLOCKED** | roadmap: "Vehicles appear only when transport demand ... justify them"; `docs/29` rule 17 |
| 12 | Technology | **BLOCKED** | roadmap: "solve real constraints"; `docs/29` rule 18; 10CW found no efficiency state |
| 13+ | Original systems | **DEFERRED** | roadmap: only after the foundation is stable |

### Phase 8 Re-evaluation

Step 10CW measured the production economy and returned Outcome B (DEFER): no
input, no chain, no new sink or bottleneck, no new specialization decision, no
efficiency system, and the existing three-way workforce allocation already
expresses the production trade-off.

Nothing in `docs/26-roadmap.md` adds a requirement beyond "Inputs -> production
-> outputs -> consumption". That line is a schema, not a mandate: because no
measured bottleneck demands an input or a chain, implementing one now would
invent a prerequisite for its own sake. **Phase 8 remains DEFERRED — evidence
required to reopen.** No new evidence has appeared since 10CW.

### Phase 9 Evaluation

Documented requirement (`docs/26-roadmap.md`): `Network -> accessibility ->
movement/logistics`.

- Network: implemented (`domain/network`, road networks 09D).
- Accessibility: implemented (building road access 09F, mobility connectivity
  gating employment 09M).
- Movement/logistics: absent, and it is the only remaining promise.

Prerequisites for movement/logistics:

- needs something to move (production inputs / intermediate goods) -> that is
  Phase 8, **DEFERRED**;
- or an external destination/demand -> Step 10CM, **DEFERRED**;
- or a spatial decision where comparable layout outcomes differ -> Step 10CN/10CA,
  measured as validity rather than strategy, no new evidence since.

Vehicles are not required for Phase 9 (they are Phase 11), and money already
exists (Phase 7 complete) — but money alone does not create transport demand.
`docs/26-roadmap.md` Phase 10 also states "transport simulation should not be
implemented prematurely", which reinforces the dependency.

Conclusion: **Phase 9 is not independently actionable.** Its remaining half is
blocked by deferred Phase 8 and/or deferred external demand; roads alone are
sufficient for every decision the simulation currently expresses.

### Phase 10 Re-evaluation

Prior decisions:

- `Step10CL.md`: DEFER — growth only repeats existing resource/workforce
  pressure at larger scale; no new qualitative decision.
- `Step10CM.md`: DEFER — no external demand; homogeneous board, placement-only
  terrain, no documented external concept.
- `Step10CN.md`: FREEZE — the ceiling is the twice-deferred growth mechanism;
  no next workstream is justified by repository evidence.

Checked for new evidence since those steps:

- new demand: none (no input/chain/external consumer added);
- new sink: none (the only sink added since is the Step 10BJ reserve release,
  which is an affordability rule, not a new consumer);
- new shortage: none (Step 10CW measured the same three resources);
- scale-induced qualitative break: none measured;
- external/world state: none added (10CM branch was never opened);
- new player decision requiring growth: none.

Phase 7 completion (10CU/10CV/10CT) closed the money loop but did not create a
growth decision. **Phase 10 stays DEFERRED.**

### Phase 11 Evaluation

Documented purpose (`docs/26-roadmap.md`): "Vehicles / advanced mobility".
Prerequisite, by the roadmap's own wording and `docs/29-design-rules.md` rule 17:
transport demand and network rules justify them. Phase 9 is the transport phase
and is blocked (above), so Phase 11 cannot precede it. **Phase 11 is BLOCKED by
Phase 9.** No vehicle design is proposed here.

### Phase 12 Evaluation

Documented purpose (`docs/26-roadmap.md`): "Technology / specialization" that
"should solve real constraints or unlock meaningful new causal relationships";
`docs/29-design-rules.md` rule 18: "Technology comes after constraints worth
solving". Phase 12 is explicitly downstream of the systems that create such
constraints. Step 10CW confirmed there is no efficiency/upgrade state and no
constraint beyond the existing three-way allocation. **Phase 12 is BLOCKED /
DEFERRED** until Phase 8-9 create constraints worth solving. No technology tree
is designed here.

### Dependency Map

```text
Phase 0-6  COMPLETE
Phase 7    COMPLETE (income -> expenditure -> affordability)
   |
   +-- Phase 8  Production economy        DEFERRED (10CW: no new decision)
   |      |
   |      +-- Phase 9  Transport movement/logistics   BLOCKED
   |             (needs a movement reason: Phase 8 chain OR external demand)
   |             |
   |             +-- Phase 11 Vehicles                BLOCKED (needs Phase 9 demand)
   |
   +-- Phase 10 Settlement growth         DEFERRED (10CL/10CM/10CN)
   |
   +-- Phase 12 Technology                BLOCKED (needs constraints worth solving)
```

Phase 9's network/accessibility half is already built, so Phase 9 is
"half-done": the implemented half required no deferred prerequisite, and the
missing half cannot be defined without one. This is a genuine dependency stop,
not a contradiction: the roadmap is internally coherent, it simply has no
justified next mechanic. Therefore this is Outcome B, not Outcome C.

### Decision Gate

**Outcome B — FREEZE.**

No later roadmap phase is currently independently actionable without inventing
a missing prerequisite (Phase 8 input/chain, or external demand) or reopening a
deferred direction without evidence (Phase 10 growth).

- Complete: Phases 0-7.
- Deferred: Phase 8 (evidence required), Phase 10 (10CL/10CM/10CN, unchanged).
- Blocked by dependency: Phase 9 (movement/logistics), Phase 11 (vehicles,
  needs Phase 9), Phase 12 (technology, needs constraints worth solving).

This confirms and does not weaken the Step 10CN FREEZE. It is not Outcome A
(nothing is independently actionable) and not Outcome C (no contradiction or
missing prerequisite *definition* — the prerequisites are explicitly deferred,
not undefined).

No gameplay mechanic is implemented in 10CX. The next step is not
predetermined; it depends on the reopening evidence below.

### Reopening Evidence

Consolidated from `Step10CL.md`, `Step10CM.md`, `Step10CN.md`, `Step10CW.md`
(no new terms invented):

1. a measured, player-visible shortage or surplus that the existing three-way
   reallocation repertoire provably cannot restore (10CL terms);
2. a demonstrated intermediate good/input whose consumption creates a decision
   not expressible through Food/Water/Material allocation and construction
   (10CW terms);
3. a producer output with no sink (today Food/Water/Material all have sinks);
4. a documented world/external concept with a causal role, or colonies
   approaching the 144-cell board with unsolvable routing density (10CM terms);
5. a spatial decision with comparable-but-different outcomes expressible in
   existing systems, or any demonstrated new decision surviving all existing
   controls — the 10CF standard (10CN terms).

Only new evidence against these terms may reopen Phase 8-12.

### Validation

No code changed in 10CX, so the existing baseline is preserved rather than
re-verified feature by feature:

- full Vitest: **1814 passed / 0 failed (112 files)**
- typecheck: PASS
- lint: PASS
- production build: PASS
- `git diff --check`: clean
- browser / responsive / GPU: **skipped** — this step adds documentation only;
  no runtime, UI or rendering behavior changed, so there is nothing new to
  exercise. Runtime/UI/rendering behavior is identical to `1e08dcb`.

No investigation test was added: the answer is established entirely from the
existing code, tests and roadmap documents, so adding one would be a test for
the sake of a test.

### Scope Audit

Implemented facts, roadmap requirements, deferred decisions, blocked
dependencies, new evidence and the final decision are kept separate above.

- Changed files: `docs/roadmap/Step10CX.md` only (this as-built; force-added
  because `docs/` is gitignored).
- No `src/`, `tests/`, `e2e/` or `package.json` change; no gameplay mechanic,
  resource, building, transport, vehicle, technology, chain, growth, UI,
  command, persistence field or `SAVE_VERSION` change.
- `AGENTS.md` remains untracked and untouched; user-owned roadmap files
  untouched; no generated artifacts.

Commit: `Step 10CX: Roadmap Re-entry After Phase 8 Defer`
