# Step 10CI — Town Goal Coverage

## Mission

Implement the product direction established by `Step 10CH: Town Product Direction Gate`.

The 10CH conclusion is explicit:

> NOVA's current simulation, progression, spatial systems, and UI foundations are sufficiently established and legible. The concrete product gap is that authored goals/scenarios stop at Village while progression continues to Town.

Current mismatch:

```text
Simulation        → Town
Progression       → Town
UI                 → Town
Goals / Scenarios  → Village
```

Therefore the next step is **Town Goal Coverage**.

The objective is to make Town a meaningful authored goal within the existing scenario system.

This is **not** a new quest system, objective framework, progression system, or simulation mechanic.

---

# 1. Read first

Before touching code, inspect:

- `docs/roadmap/STEP10CH.md`
- `docs/roadmap/STEP10CG.md`
- `docs/roadmap/STEP10CF.md`
- `docs/roadmap/STEP10BZ.md`
- current `scenarios.ts`
- objective definitions / objective evaluation
- scenario catalogue
- scenario playability tests
- scenario-related UI
- Town progression implementation
- all existing scenario fixtures and tests.

Do not infer APIs before inspecting the repository.

---

# 2. Preserve the existing architecture

The existing scenario/objective system is the system to use.

Do not introduce:

- `quest.ts`
- a new goal engine;
- a second objective evaluator;
- a Town-specific progression subsystem;
- new persistence state;
- scenario scripting;
- event systems;
- objective dependencies;
- timers;
- stock quotas;
- arbitrary scenario-only simulation rules.

If an existing objective primitive can express the desired Town goal, use it.

If an existing primitive cannot express a proposed goal, **do not extend the objective system automatically**.

Stop and report the limitation instead.

---

# 3. Inspect the current scenario catalogue

Build a factual map of the current catalogue.

For every existing scenario, determine:

- title;
- intent;
- starting state;
- objective(s);
- target stage;
- completion condition;
- player-visible purpose;
- whether it reaches Village only;
- whether Town is currently reachable but not authored as a goal.

Pay particular attention to the statement from 10CH:

> `Zero "town" in scenarios.ts; all 10 scenarios end at Settlement/Village.`

Verify this against the current repository rather than assuming the audit is still perfectly current.

---

# 4. Define the Town scenario role

Before adding scenarios, establish what Town should mean as an authored goal.

Town scenarios should not simply duplicate:

```text
Build enough buildings.
Assign workers.
Reach Town.
```

The purpose is to make the Town milestone **intentional and meaningful**.

Use the systems already present:

- workforce;
- Farm;
- Well;
- Workshop;
- Food;
- Water;
- Material;
- roads;
- accessibility;
- Town progression;
- existing objective primitives.

Do not invent a new mechanic to make a scenario interesting.

---

# 5. Scenario design constraints

Create **2–4 Town-targeted scenarios**.

Prefer **3** if three genuinely distinct scenarios can be expressed cleanly.

Use fewer if fewer are justified.

Do not add four scenarios merely to satisfy a number.

Each scenario must have a distinct authored purpose.

For example, the catalogue may cover different ways of approaching the existing Town milestone:

- economic stabilization;
- workforce balancing;
- infrastructure/accessibility;
- deliberate progression toward Town.

These are examples of possible themes, **not requirements**.

Only use themes that the existing objective primitives can represent cleanly.

---

# 6. Avoid fake diversity

Do not create scenarios that differ only in:

- title;
- flavour text;
- numeric starting values;
- arbitrary resource amounts;
- trivial building counts.

Two scenarios should represent meaningfully different player intentions.

However, do not manufacture differences by adding new mechanics.

The diversity must come from **how the existing systems are framed**, not from expanding the simulation.

---

# 7. Town must be an actual goal

A Town-targeted scenario must have a completion condition that corresponds to the existing Town progression semantics.

Do not duplicate Town logic inside scenarios.

Do not create:

```text
scenarioTownCondition()
```

if the existing progression/query system already provides the required information.

The scenario should consume existing domain/application facts.

The canonical Town definition remains the existing one.

---

# 8. No persistence changes

`SAVE_VERSION` must remain:

```text
8
```

Do not add scenario-specific persistent state.

Do not modify save format.

Do not add scenario progress fields unless the existing scenario system already requires them and the implementation is strictly compatible with its established model.

Prefer data-only catalogue changes.

---

# 9. Scenario data should remain declarative

Prefer a structure such as the repository's existing scenario representation.

Scenario definitions should contain authored data, not executable simulation logic.

Avoid:

```text
scenario.update()
scenario.tick()
scenario.compute()
scenario.apply()
```

or any equivalent new runtime behavior.

The simulation remains responsible for simulation.

The scenario system remains responsible for describing and evaluating goals.

---

# 10. Player-facing language

Inspect the existing scenario naming and description style.

Town scenarios should clearly communicate:

- what the player is trying to accomplish;
- why the objective exists in the scenario;
- what milestone they are approaching.

Do not expose implementation terminology such as:

- `TownProgressionState`;
- `getTownState`;
- internal IDs;
- raw simulation terminology.

Do not redesign the scenario UI.

Use the existing presentation.

---

# 11. Tests

Add or update focused scenario tests.

At minimum verify:

### Catalogue

- Town scenarios exist;
- scenario IDs are unique;
- catalogue remains valid;
- existing scenarios remain intact.

### Playability

For every new Town scenario:

- starting state is valid;
- scenario is playable;
- objective can actually be completed;
- Town can actually be reached;
- completion is deterministic.

### Regression

Verify that:

- existing scenario completion semantics remain unchanged;
- existing Village/Settlement scenarios remain playable;
- no duplicate IDs exist;
- no impossible objective was introduced.

### Town semantics

At least one focused test must establish that the Town-targeted objective completes according to the **canonical existing Town progression state**, not a scenario-specific approximation.

---

# 12. Determinism

Preserve all existing deterministic guarantees.

Scenario evaluation must not introduce:

- randomness;
- timestamps;
- ordering-dependent behavior;
- unstable iteration;
- nondeterministic IDs;
- hidden state.

If scenario catalogue ordering is hashed, serialized, or otherwise contract-sensitive, preserve the repository's existing ordering conventions.

---

# 13. Scope discipline

This step is explicitly limited to:

```text
scenario catalogue
+
existing objective primitives
+
scenario tests
+
documentation
```

Do NOT modify:

- economy coefficients;
- workforce semantics;
- roads;
- accessibility;
- Town progression;
- building behavior;
- simulation tick;
- save format;
- rendering;
- HUD;
- global navigation;
- objective engine semantics;
- command architecture.

If implementation appears to require one of those changes, stop and report the blocker rather than expanding scope.

---

# 14. Do not solve the future

10CH identified Town Goal Coverage as the next meaningful product step.

It did **not** establish:

- City;
- advanced progression;
- endgame;
- quests;
- missions;
- achievements;
- automation;
- scenario branching;
- resource quotas;
- new buildings;
- new resources.

Therefore none of those belong in 10CI.

After Town coverage is complete, the next product direction can be decided from the resulting experience.

---

# 15. Documentation

Create:

```text
docs/roadmap/STEP10CI.md
```

Document:

1. Starting product gap from 10CH.
2. Existing scenario architecture inspected.
3. Existing objective primitives used.
4. Town scenarios added.
5. Purpose of each scenario.
6. Why each scenario is meaningfully distinct.
7. Why no new objective primitive was necessary.
8. Tests added/updated.
9. Validation.
10. Explicit non-goals.
11. SAVE_VERSION status.
12. Final player-facing effect.

Keep the document concise and factual.

---

# 16. Browser validation

Because this step changes authored scenario content and potentially the scenario-facing experience, perform a headed browser regression if scenarios are exposed through the application UI.

Verify at minimum:

### Desktop

```text
1280 × 800
```

### Mobile

```text
420 × 740
360 × 640
```

Verify:

- scenario catalogue remains usable;
- new Town scenarios are discoverable;
- titles/descriptions are readable;
- selecting a scenario works;
- objective display is correct;
- Town completion is correctly reflected;
- no overflow or layout regression occurs.

Do not redesign the UI to accommodate the scenarios.

If no scenario UI is currently exposed in a way that can exercise this, document that fact and test the underlying catalogue/evaluation instead.

---

# 17. GPU validation

Only rerun GPU/WebGL2 validation if the implementation touches runtime/rendering/UI code that can affect the application runtime.

If this remains genuinely data-only, do not waste time running an unrelated GPU audit.

---

# 18. Full validation

Before committing:

```text
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Use the repository's actual scripts if names differ.

Run focused scenario/Town tests first.

Then full Vitest.

Report exact counts.

If a test fails:

- determine whether it is caused by 10CI;
- fix only if within scope;
- do not hide or weaken an existing contract;
- do not increase global timeouts as a shortcut.

---

# 19. Diff audit

Before commit:

Verify:

- only intended files changed;
- no unrelated formatting churn;
- no generated artifacts;
- no accidental persistence changes;
- `SAVE_VERSION` remains 8;
- user-owned files remain untouched.

Explicitly protect:

```text
docs/roadmap/Step10BO - Copy.md
docs/roadmap/Step10BT.md
```

Do not modify them.

---

# 20. Commit

When implementation and validation are complete, create exactly:

```text
Step 10CI: Town Goal Coverage
```

One commit.

Do not rewrite previous commits.

Do not force-push.

Do not claim the repository is pushed unless you actually pushed it.

---

# 21. Final report

Return a concise but complete report:

```text
Step 10CI — Complete

1. Product gap addressed
2. Existing scenario architecture
3. Town scenarios added
4. Scenario-by-scenario purpose
5. Objective primitives reused
6. New mechanics added: NONE
7. Simulation changes: NONE
8. Persistence changes: NONE
9. SAVE_VERSION: 8
10. Tests
11. Typecheck
12. Lint
13. Build
14. Browser validation
15. GPU validation
16. Diff audit
17. Files changed
18. Commit
```

For each scenario, explicitly state:

```text
Scenario:
Purpose:
Town relation:
Existing objective primitive(s):
Why it is distinct:
```

## Final gate

The implementation is successful only if the result makes this statement true:

> **Town is now an authored player goal, not merely a technical progression endpoint.**

But achieve that using the **existing NOVA systems**, with the smallest coherent change.

Do not turn Town Goal Coverage into a new game system.

---

# Documentation (as-built)

## 1. Starting product gap (10CH)

Goals/Scenarios stopped at Village while Simulation, Progression and UI
reached Town. Verified pre-step: zero `"town"` in `scenarios.ts`,
`nextStage: null` at Town. The catalogue ceiling sat one stage below the
progression ceiling.

## 2. Existing scenario architecture inspected

- `src/application/scenarios.ts`: DATA ONLY. `ScenarioDefinition` =
  id/name/description + `ObjectiveDefinition` + resources/buildings/roads/
  colonists; shared `createScenarioState` assembler over domain
  constructors; `SCENARIOS` catalogue (8) + `SCENARIO_FIXTURES` (terrain
  only) + default game. No `blockedCells` in catalogue entries.
- `src/application/queries/objective.ts`: derived evaluation, five closed
  requirement kinds (`stage | population | waterCapacity | foodBalance |
  building`), `STAGE_RANK` already ranked `town: 3`.
- UI: scenario `<select>` populated from `SCENARIOS`; objective panel shows
  `objective.label`, constraint and requirement blockers (`main.ts`
  `renderProgression`). Catalogue scenarios load through the select;
  `?scenario=` deep link is fixture-only.
- Contract tests pin catalogue size (8), per-scenario starting stages, and
  several closure decisions (`scenarioContentClosureAudit`: NINTH_SCENARIO
  rejection, `townReferenced === false`).

## 3. Existing objective primitives used

All three scenarios use exactly one requirement: `{ kind: 'stage',
stage: 'town' }` — the canonical Town progression state, consumed (never
redefined). No new kind, no evaluation change.

## 4. Town scenarios added

- `town-threshold` — "Town threshold". Village, 4 colonists, idle fourth:
  spend the 30-Material reserve on the missing Workshop (25 + 1 Water
  cost), construction finishes, auto-staffing crosses the threshold.
- `town-balance` — "Town balance". Wilderness start (five mouths, two
  Farms, Food-short): build the third Farm (25), keep the staffed Workshop
  running, Town needs both.
- `town-connection` — "Town connection". Village, operational Workshop
  beyond the single road network: extend two road cells (10) to its door,
  access switches it on.

## 5. Purpose of each scenario

- threshold: deliberate progression — committing the reserve to the last
  Town condition (construction prioritization).
- balance: stabilization — holding Food balance while industry stays
  staffed (growth at the Food edge).
- connection: spatial — access as the only missing condition (infrastructure
  as switch).

## 6. Why each scenario is meaningfully distinct

Different starting stages (Village / Wilderness / Village), blockers
(Staffed Workshop / Food balance / Staffed Workshop via access), solutions
(building / building+different economy / roads), and measured structures
(all `structureOf` hashes distinct; connection keeps a single network so
`housing-composition` remains the only split start). Recorded in the
closure matrix: distinct PRIMARY_DECISION, UNIQUE_CONSEQUENCE and marks
for all three. Not title/flavour/number swaps: the first player decisions
differ in kind.

## 7. Why no new objective primitive was necessary

`stage: 'town'` evaluates through `getProgression` + `STAGE_RANK`, which
predates this step. The three completions coincide tick-exactly with the
canonical Town stage (tested). The ONLY gap was a display label: the
`stage` requirement status named every non-settlement stage 'Village'
(dead ternary arm — Town was never required before). Fixed minimally in
`objective.ts` (label only; evaluation untouched), because shipping Town
goals whose status line reads "Reach Village" would misname the authored
goal in the UI. Regression test pins the 'Reach Town' label.

## 8. Tests added/updated

- NEW `tests/townGoalCoverage.test.ts` (13 tests): catalogue validity
  (11 entries, unique ids, data shape, world bounds, determinism, distinct
  hashes), real-command playability per scenario (completes at Town,
  `completedTick === townTick`, no wipe, deterministic tick), canonical
  semantics (pre-solution stage below Town, post-solution `stage town` +
  `detail 'stage town'`), label, single-network start, Village-floor water.
- `tests/scenarios.test.ts`: catalogue 8 → 11 + three starting-stage entries.
- Compatibility pins updated to the intended catalogue growth (all with
  `10CI` comments; no semantic assertion weakened):
  `scenarioContentClosureAudit` (matrix maps + policies + FIRST/MAIN
  decisions + NINTH reframed as MECHANIC-closure superseded by 10CH +
  `townReferenced → true` + Workshop-start allowlist),
  `contentReadabilityClosureAudit` (3 completion policies, matrix marks),
  plus count pins in `industrialHeadroomAudit`,
  `industrialHeadroomTownDecision`, `industrialContentCoDesign`,
  `openingEconomyScenarioStateAudit`, `spatialWorkforceReadability`,
  `terrainContentScenarioIntegrationAudit`, `terrainSpatialInput`,
  `waterSemanticsPartitionAudit` (2), `nextCausalCapabilityDiscovery` (2),
  `phaseFreezeTownDependencyAudit` (catalogue + drift allowlists for the
  data/display Town mentions), `housingCompositionScenario(All)`.

## 9. Validation

- Focused 10CI: 13/13 PASS.
- Full Vitest: 105 files, 1,736/1,736 PASS (1723 pre-existing + 13 new).
- Typecheck: PASS. Lint: PASS. Build: PASS (chunk-size warning pre-existing).
- Headed browser (throwaway `e2e/zz-townScenarioRun.mjs` script, deleted after): all 3
  Town scenarios listed, selectable, `Objective — Reach Town` in progress,
  correct start stages, no overflow at 1280×800 / 420×740 / 360×640, zero
  console/page errors. PASS.
- GPU/WebGL2: not rerun per prompt §17 — no runtime/rendering change
  (data + one display string; existing GPU regression unaffected).
- `git diff --check`: clean. SAVE_VERSION: 8 (untouched).
- Determinism: solution replays tick-identical with identical hashes.

## 10. Explicit non-goals (all respected)

No City/endgame/quests/missions/achievements/automation/branching/quotas/
new buildings/resources/commands/stages; no `quest.ts`, no second evaluator,
no persistence field, no engine-semantics change, no scenario UI redesign,
no progression/tick/economy change.

## 11. SAVE_VERSION status

8. No save-format, migration, or persisted-field change. Objectives and
catalogue remain derived/code, never saved.

## 12. Final player-facing effect

> **Town is now an authored player goal, not merely a technical progression
> endpoint.** The scenario select offers three distinct paths to Town —
> spend the reserve (threshold), hold the balance while growing (balance),
> connect the cut-off Workshop (connection) — each ending at the canonical
> Town state with a `Reach Town` objective, framed in the existing UI.

## Files changed

- `src/application/scenarios.ts` (+3 data entries)
- `src/application/queries/objective.ts` (1 display-label line + comment)
- `tests/townGoalCoverage.test.ts` (new, 13 tests)
- 15 existing test files: catalogue-size pins and closure-decision updates
  (see §8)
- `docs/roadmap/Step10CI.md` (prompt + this as-built)

## Scope confirmation

No gameplay rule, coefficient, workforce/road/progression semantic, tick,
rendering, HUD, command, or persistence change. The single `src/` logic
touch is a requirement-status display string.
