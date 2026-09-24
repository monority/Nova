# NOVA — Step 10BV

## Town Gate & Economic Pressure

Repository: NOVA
Baseline: `542d378`
Previous step: Step 10BU — Three-Way Workforce Economy Audit
Previous result: PASS

---

# 0. OBJECTIVE

The Step 10BU audit established that the current workforce model already creates
a genuine three-way economic trade-off:

```
Farm    → Food
Well    → Water
Workshop → Material
```

and that reallocating workers between these activities is:

* observable;
* persistent;
* reversible;
* deterministic;
* save/load stable.

The missing piece is not another production mechanic.

The missing piece is:

> What existing or future Town capability should make those economic
> trade-offs matter at the city level?

Step 10BV must answer that question and, where justified, implement the
smallest coherent Town gate that gives the existing economy a meaningful
purpose.

This is a PRODUCT / SIMULATION DESIGN step, not an excuse to expand the game.

---

# 1. HARD RULES

Do NOT introduce:

* a new resource;
* a new workforce profession;
* automatic workforce optimization;
* logistics;
* transportation;
* happiness;
* pollution;
* taxes;
* population growth systems;
* housing demand;
* random events;
* quests;
* technology trees;
* prestige systems;
* abstract currencies;
* complex Town progression;
* multiple Town tiers;
* speculative "city simulation" mechanics.

Do not redesign Farm, Well or Workshop.

Do not alter their existing production rules unless the current code contains
a concrete bug discovered during implementation.

Do not alter Storage semantics.

Do not alter Construction Crew semantics.

Do not alter save/load architecture unless strictly necessary.

Do not create a second economy.

The objective is to connect the existing economy to Town with the smallest
possible deterministic rule.

---

# 2. FIRST: RECONSTRUCT THE CURRENT TOWN STATE

Before writing code, inspect the repository and identify exactly what currently
exists around:

* Town;
* population;
* colonists;
* buildings;
* Construction Crew;
* workforce;
* resources;
* progression;
* scenario;
* unlocks;
* save/load;
* existing roadmap references.

Do not infer missing mechanics.

Produce a short internal map:

```
Current Town state
    ↓
Existing prerequisites
    ↓
Existing economic state
    ↓
Existing progression hooks
```

If Town is currently only partially defined, preserve that architecture rather
than creating a parallel system.

---

# 3. CORE DESIGN QUESTION

The three-way workforce audit proved:

```
increasing Material production costs Food or Water production.
```

But an economy becomes meaningful only when resource pressure creates decisions.

The step must determine:

> What is the smallest Town-level requirement that makes the player care about
> Food, Water and Material simultaneously?

The answer must be based on mechanics already present in NOVA.

Do not use arbitrary numerical requirements merely to make the system harder.

---

# 4. REQUIRED DESIGN CONSTRAINT

The Town mechanic must satisfy all of these:

### A. Economic relevance

Food, Water and Material must each have a legitimate role in the resulting
Town loop.

### B. Workforce relevance

Changing:

```
Farm ↔ Well ↔ Workshop
```

must remain a meaningful player decision.

### C. Determinism

No randomness.

### D. Reversibility

The player must be able to recover from a suboptimal workforce allocation
without entering an irreversible dead-end.

### E. Small state surface

Prefer derived state and existing resources over new persistent state.

### F. No artificial punishment

Do not add starvation, death, collapse or cascading failure merely to create
pressure.

### G. No hidden requirements

Town requirements must be visible and explainable.

---

# 5. ECONOMIC LOOP TO TARGET

The preferred shape is:

```
workforce allocation
        ↓
Food / Water / Material rates
        ↓
resource availability
        ↓
Town requirement
        ↓
progression / capability
        ↓
new reason to optimize workforce
```

The resulting loop must NOT require a complex progression tree.

A simple deterministic threshold or capability gate is preferable if the
existing architecture supports it.

---

# 6. TOWN SHOULD NOT BECOME A RESOURCE SINK

Do not simply implement:

```
"Town costs 10 Food + 10 Water + 10 Material"
```

unless the existing model demonstrates that this is actually coherent.

A Town requirement must have semantic meaning.

For example, distinguish between:

* maintaining a population;
* completing a civic construction;
* reaching a development milestone;
* unlocking a capability;
* satisfying an existing simulation prerequisite.

Choose only a concept that fits the architecture already present.

Do not invent narrative justification to hide an arbitrary number.

---

# 7. DECISION MODEL

Before implementation, compare the smallest viable models internally.

Potential models include:

### Model A — Threshold

Town becomes operational when existing resource conditions are satisfied.

### Model B — Construction

Town is represented by an existing/buildable structure whose completion
requires existing resources.

### Model C — Sustained condition

Town requires existing resource production/availability over time.

### Model D — Existing progression hook

Town consumes no new resource at all and simply becomes the next existing
progression capability once current prerequisites are met.

Do not implement all four.

Select the model that requires the least new state and least architectural
change while giving the three-way economy an actual consequence.

---

# 8. IMPORTANT: DO NOT FORCE FOOD/WATER/MATERIAL SYMMETRY

The three resources do not have to play identical roles.

The current economy may naturally support:

```
Food → population / survival
Water → population / survival
Material → construction
```

If that is already the architecture, preserve it.

The objective is not:

```
"make all three resources do the same thing."
```

The objective is:

```
"make the existing differences create an understandable decision."
```

---

# 9. WORKFORCE TEST CASE

The resulting Town mechanic must be validated against at least these states.

## State A — balanced

```
Farm-heavy enough to sustain Food
Well-heavy enough to sustain Water
Workshop staffed enough to produce Material
```

## State B — Material-heavy

```
move one worker:
    Farm → Workshop
```

Verify that:

* Material improves;
* Food changes according to existing rules;
* Town consequence is observable;
* no unrelated resource changes.

## State C — Water-heavy

```
move one worker:
    Workshop → Well
```

Verify that:

* Water improves;
* Material changes according to existing rules;
* Town consequence is observable.

## State D — Food-heavy

```
move one worker:
    Workshop → Farm
```

Verify equivalent behavior for Food.

The player must be able to understand why these states differ.

---

# 10. NO DEAD-ENDS

Explicitly test:

1. player reaches a Town-relevant state;
2. reallocates workforce badly;
3. resource production changes;
4. player reallocates back;
5. economy recovers.

No permanent lock.

No hidden reset.

No automatic correction.

No irreversible progression loss.

---

# 11. MULTI-TICK VALIDATION

Do not validate only one tick.

For the selected Town mechanic:

1. establish a valid allocation;
2. advance several ticks;
3. observe the Town condition;
4. change workforce allocation;
5. advance several ticks;
6. observe the consequence;
7. reverse the allocation;
8. advance again;
9. verify recovery.

This must demonstrate that Town reacts to the actual economy rather than a
one-frame or one-command artifact.

---

# 12. SAVE / LOAD

Validate:

```
allocation
    ↓
Town-relevant economic state
    ↓
save
    ↓
load
    ↓
continue simulation
```

The result must be identical to uninterrupted simulation.

No new persistence fields unless absolutely necessary.

If persistence is required, explain why and keep the schema minimal.

Do not bump SAVE_VERSION casually.

---

# 13. DETERMINISM

Two equivalent simulations must produce identical:

* Town state;
* resource state;
* workforce allocation;
* derived queries;
* hashes where applicable.

No wall-clock dependencies.
No random values.
No iteration-order-dependent behavior.

---

# 14. UI / UX

10BT1 already established the workforce HUD:

```
Farms X/Y · Wells A/B · Food +/-N/tick · Water headroom +/-N
```

Do not replace it.

Extend the UI only if Town state requires a genuinely necessary indication.

The player must be able to understand:

1. current Town state;
2. what requirement matters;
3. which resources are involved;
4. how workforce allocation affects those resources.

Prefer a compact derived indicator over a new panel.

No dashboard.

No modal tutorial.

No large new UI system.

---

# 15. BROWSER VALIDATION

If Town becomes observable through existing UI:

Run headed browser validation.

Verify at minimum:

* Town state is visible;
* workforce allocation remains actionable;
* resource consequences update correctly;
* Town requirement/state updates correctly;
* responsive layouts remain valid.

Validate:

```
1280×800
420×740
360×640
```

Do not add browser-only behavior.

---

# 16. GPU VALIDATION

Run the existing headed GPU/WebGL2 path if the implemented changes affect
the application/browser surface.

Expected environment:

```
NVIDIA RTX 3070
WebGL2
```

Do not create rendering-specific work unrelated to this step.

---

# 17. TESTS

Add focused tests for the selected Town model.

At minimum:

1. Town baseline state;
2. valid Town condition;
3. invalid Town condition;
4. Farm → Workshop consequence;
5. Workshop → Farm consequence;
6. Well → Workshop consequence;
7. Workshop → Well consequence;
8. multi-tick progression;
9. recovery after reallocation;
10. save/load;
11. determinism.

Do not duplicate existing 10BU tests unnecessarily.

Reuse existing fixtures/helpers where appropriate.

---

# 18. ARCHITECTURE

Maintain the existing NOVA separation:

```
domain
    ↓
application
    ↓
rendering/UI
```

Town rules belong to the appropriate domain/application layer.

UI must not calculate Town requirements itself.

Resource rates must continue to come from simulation/query logic.

Prefer:

```
getTown...
getTownStatus...
canAdvanceTown...
```

or equivalent existing query naming conventions.

Do not create speculative abstractions.

---

# 19. ROADMAP / DOCUMENTATION

Create:

```
docs/roadmap/STEP10BV.md
```

Document:

* initial problem;
* existing 10BU finding;
* selected Town model;
* rejected alternatives;
* exact rule;
* economic consequences;
* persistence impact;
* deterministic behavior;
* UX behavior;
* validation;
* future implications.

The document must describe the system AS BUILT.

Do not document hypothetical mechanics as implemented.

---

# 20. USER-OWNED FILES

The following files are user-owned and MUST remain untouched:

```
docs/roadmap/Step10BO - Copy.md
docs/roadmap/Step10BT.md
```

Do not:

* modify;
* rename;
* delete;
* stage;
* commit

these files.

---

# 21. VALIDATION GATE

Before committing:

* focused tests: PASS
* relevant compatibility tests: PASS
* full Vitest: PASS
* typecheck: PASS
* lint: PASS
* build: PASS
* headed browser: PASS where applicable
* GPU/WebGL2: PASS where applicable
* save/load: PASS
* determinism: PASS
* git diff --check: PASS

Inspect:

```
git status
git diff --stat
git diff
```

The final diff must contain only Step 10BV work.

---

# 22. COMMIT

If and only if all validation passes:

```
Step 10BV: Town Gate & Economic Pressure
```

Exactly one commit.

Do not amend `542d378`.

Do not include unrelated files.

---

# 23. FINAL REPORT

Return:

## Step 10BV — PASS / FAIL

### Design decision

State exactly what Town now represents and why this model was selected.

### Economic loop

Show:

```
Workforce
   ↓
Food / Water / Material
   ↓
Town requirement
   ↓
Town state / capability
```

### Before / After

Explain what existed at `542d378` and what 10BV adds.

### Files changed

List every changed file.

### Tests

Report exact counts.

### Browser / GPU

Report exact validation performed.

### Persistence

State whether SAVE_VERSION changed.

### Determinism

State result.

### Future Work

Only record mechanics genuinely discovered during implementation.

Do not propose a large new system merely to extend the roadmap.

---

# CORE PRINCIPLE

10BU proved:

```
Food ↔ Water ↔ Material
```

is already a real workforce trade-off.

10BV must answer:

```
"Why does the city care?"
```

It should accomplish this with the smallest possible Town rule.

Do not make NOVA deeper by adding systems.

Make the existing systems matter.

---

# Documentation (as-built)

## Design decision

Town now represents a derived industrial/service capability: a Village economy that keeps Food balanced, retains the existing Village Water-capacity condition, and keeps at least one Workshop staffed.

This is Model D, the existing progression hook. Town adds no resource sink, building, construction transaction, or persistent field. It makes the existing Farm/Well/Workshop workforce allocation consequential without making the three resources artificially symmetric.

## Economic loop

```text
Farm / Well / Workshop workforce
        ↓
Food / Water / Material rates
        ↓
Town requirements: Food balance + Village Water capacity + staffed Workshop
        ↓
Town progression state
```

A worker moved between production types changes the current rates immediately. The Town checklist then shows whether the current allocation still satisfies the derived capability conditions.

## Exact rule

`getTownConditions(state)` returns three derived conditions in order:

1. `Staffed Workshop` — at least one operational staffed Workshop.
2. `Water capacity 2` — the existing model-produced Village capacity condition.
3. `Food balance` — existing authoritative Food sustainability query.

`getProgression(state)` reaches Town only when the Village conditions and all Town conditions are met. Otherwise a qualifying Village remains Village and exposes Town as `nextStage` with blockers. Town is derived and has no new persistence.

## Before / After

At `542d378`, progression ended at Village and reported further stages as deferred. The workforce economy already had a real Farm/Well/Workshop trade-off, but nothing connected that economy to a city-level capability.

10BV adds the smallest visible consequence: Town is available when the existing economy can sustain Village services while retaining a staffed Workshop. It changes no Farm, Well, Workshop, Storage, Construction Crew, or resource rule.

## Rejected alternatives

- Resource-sink Town: rejected because it would turn the existing economy into an arbitrary tax.
- New Town building: rejected because no new building capability was required.
- Automatic workforce optimization: rejected because manual assignment is the existing player agency.
- New Water/population threshold: rejected because it duplicated existing service semantics and created an unnecessary large threshold.
- Multiple Town tiers: rejected as premature.

## Persistence and determinism

`SAVE_VERSION` remains 8. No new persisted fields were added. The Town query is pure, sorted through existing canonical derivations, deterministic, insertion-order invariant, and save/load stable.

## Files changed

- `docs/roadmap/STEP10BV.md`
- `src/application/queries/progression.ts`
- `src/application/queries/objective.ts`
- `package.json`
- `tests/progression.test.ts`
- `tests/contentReadabilityClosureAudit.test.ts`
- `tests/phaseFreezeTownDependencyAudit.test.ts`
- `tests/scenarioPlayabilityAudit.test.ts`
- `tests/scenarios.test.ts`
- `tests/townQualitativeStateAudit.test.ts`
- `e2e/townGateRun.mjs`

## Verification

- focused Town/progression/allocation tests: 22 PASS;
- migrated Town compatibility tests: 67 PASS;
- relevant compatibility tests: 67 PASS across progression readability, architecture, scenarios, Town audit, and persistence;
- typecheck: PASS;
- lint: PASS;
- build: PASS;
- headed Town browser E2E: PASS;
- headed GPU/WebGL2 E2E: PASS with NVIDIA RTX 3070;
- full Vitest: 1,683 / 1,683 PASS;
- determinism: covered by progression and existing save/load suites;
- save/load: covered by existing persistence suites and unchanged schema;
- `git diff --check`: PASS.

## Commit

`9090afe` — Step 10BV: Town Gate & Economic Pressure

