# NOVA — Step 10BW

## Town Progression / Capability Gate

Repository: NOVA
Baseline: `0743604`
Previous step: Step 10BV — Town Gate & Economic Pressure
Previous result: PASS

---

# 0. MISSION

Step 10BV established the first Town progression gate.

The current progression is now:

```
existing Village conditions
    +
staffed Workshop
    +
existing Village Water capacity condition
    +
Food balance
    ↓
Town becomes the next derived stage
```

Town is currently a meaningful progression state, but it must now be determined
what Town actually ENABLES.

Step 10BW is therefore a capability-design and implementation step.

The goal is NOT to add another economic resource or another workforce system.

The goal is:

> Give the Town stage one concrete, observable capability that naturally
> follows from the existing simulation and makes reaching Town meaningful.

The capability must be small, deterministic, reversible where appropriate,
and structurally consistent with NOVA.

---

# 1. BASELINE INVARIANTS

Start from:

```
0743604
```

Before implementation:

1. Inspect the current progression implementation.
2. Inspect the existing Village → Town derivation.
3. Inspect all existing stage/capability hooks.
4. Inspect building placement rules.
5. Inspect workforce rules.
6. Inspect resource rules.
7. Inspect persistence.
8. Inspect existing progression UI.
9. Inspect existing roadmap documentation around Town.

Do not infer missing architecture.

Use the actual repository as the source of truth.

---

# 2. WHAT 10BW MUST NOT DO

Do NOT introduce:

* a new resource;
* a new currency;
* taxes;
* happiness;
* pollution;
* population growth;
* housing demand;
* logistics;
* transport;
* pathfinding;
* commuting;
* technology trees;
* research;
* random events;
* quests;
* prestige;
* automation of workforce assignment;
* automatic resource balancing;
* complex Town tiers;
* a Town dashboard;
* a new progression tree;
* a second economy.

Do not redesign Farm, Well or Workshop.

Do not modify their production coefficients.

Do not modify Storage semantics.

Do not modify Construction Crew semantics.

Do not modify the existing Village → Town requirement established in 10BV.

Do not add speculative future mechanics.

---

# 3. FIRST DESIGN TASK

Before coding, inspect what capabilities already exist but are currently gated,
disabled, or naturally suited to Town.

Look specifically for existing systems that can become meaningful after Town,
such as:

* existing building categories;
* existing construction capabilities;
* existing placement constraints;
* existing colonist/building relationships;
* existing queries;
* existing progression hooks;
* existing UI affordances.

The preferred capability is one that requires:

```
existing state
+
existing command/query path
+
one explicit Town gate
```

rather than a brand-new subsystem.

---

# 4. CAPABILITY SELECTION CRITERIA

The selected capability must satisfy all of the following.

### A. It must be genuinely useful

Reaching Town should change what the player can do.

### B. It must fit the existing simulation

The capability must emerge naturally from systems already present.

### C. It must be visible

The player must be able to understand:

```
"Town is reached → this is now available."
```

### D. It must preserve agency

Town should unlock an option, not automatically perform an action.

### E. It must be deterministic

No randomness.

### F. It must not create a new economy

Use existing resources and existing production where applicable.

### G. It must be minimal

One capability is enough.

Do not implement multiple Town unlocks in this step.

---

# 5. PREFERRED IMPLEMENTATION SHAPE

Prefer:

```
Town stage
   ↓
capability query
   ↓
existing command/action
   ↓
existing simulation state
```

For example, structurally:

```
canUseTownCapability(state)
```

or an equivalent existing project convention.

The exact API name must follow the repository architecture.

Do not create an abstraction merely because the example above exists.

---

# 6. IMPORTANT: TOWN MUST NOT BECOME A DEAD END

The capability must remain usable after reaching Town.

Test:

1. Village satisfies Town requirements.
2. Town becomes available.
3. Capability becomes available.
4. Player uses the capability.
5. Simulation advances.
6. Existing Food/Water/Material economy continues correctly.
7. Existing workforce reassignment remains possible.

Town must not freeze the economy.

Town must not automatically consume workforce.

Town must not silently alter production rates.

---

# 7. WORKFORCE INTERACTION

The existing three-way workforce economy is now established:

```
Farm     → Food
Well     → Water
Workshop → Material
```

10BV established the Town gate using that existing economy.

10BW must preserve this relationship.

Verify that after Town:

* Farm reassignment still changes Food;
* Well reassignment still changes Water;
* Workshop reassignment still changes Material;
* manual allocation remains authoritative;
* no Town logic secretly overrides allocation.

Do not add Town-specific workforce priorities.

---

# 8. ECONOMIC CONSEQUENCES

The selected capability may use existing resources if that is already natural
to the repository.

If it requires Material, use the existing Material system.

If it requires Food or Water, use the existing resource semantics.

Do NOT create an artificial:

```
"Town tax"
```

or:

```
"Town maintenance"
```

just to make the capability expensive.

The cost, if any, must have an existing semantic basis.

If no cost is justified by the existing model, the capability may be free.

Do not force symmetry between resources.

---

# 9. RESOURCE FAILURE / RECOVERY

If the capability has a resource requirement:

Test:

```
enough resources
    → capability available

insufficient resources
    → capability unavailable
```

Then:

```
restore production
    → resources recover
    → capability becomes available
```

No permanent failure.

No hidden automatic correction.

No destructive rollback.

---

# 10. MULTI-TICK TEST

If the capability has an effect on simulation state:

1. establish Town;
2. record state;
3. use capability;
4. advance several ticks;
5. verify expected state;
6. verify unrelated economy remains unchanged.

If the capability is purely an unlock and does not affect simulation state,
document that explicitly rather than inventing a tick effect.

---

# 11. SAVE / LOAD

Test:

```
Village
  ↓
Town
  ↓
capability available/used
  ↓
save
  ↓
load
  ↓
continue
```

Verify:

* Town state survives correctly;
* capability availability is reconstructed correctly;
* capability state survives if it is legitimately persisted;
* no unnecessary new persistence field is introduced.

Prefer derived capability state.

Do NOT bump SAVE_VERSION unless absolutely unavoidable.

If a version bump appears necessary:

STOP and report why before implementation.

---

# 12. DETERMINISM

Equivalent simulations must produce identical:

* progression stage;
* capability availability;
* resource state;
* building state;
* workforce state;
* relevant derived queries;
* hashes where applicable.

No wall-clock state.

No random state.

No iteration-order-dependent behavior.

---

# 13. UI

Reuse the existing progression UI from 10BV.

The player should be able to see:

```
current stage: Town
```

and:

```
newly available capability
```

or the existing equivalent representation.

Do NOT add:

* dashboard;
* modal;
* tutorial;
* large Town panel;
* new navigation;
* redundant status cards.

If the existing progression UI already supports "next capability", extend it
minimally.

The UI must consume authoritative derived state.

It must not duplicate progression logic.

---

# 14. BROWSER VALIDATION

Run headed browser validation.

At minimum verify:

### Village

Town requirement blockers remain correctly displayed.

### Town

Once requirements are satisfied:

* Town is displayed;
* the new capability is visible;
* the capability can be exercised through the intended existing UI path;
* resulting state is correct.

### Regression

Verify:

* workforce allocation still works;
* resource indicators remain correct;
* existing progression UI remains correct.

Responsive validation:

```
1280×800
420×740
360×640
```

Do not create a separate mobile implementation.

---

# 15. GPU / WEBGL2

Because the repository already has working GPU validation:

Run the existing headed GPU/WebGL2 E2E where relevant.

Expected environment:

```
NVIDIA RTX 3070
WebGL2
```

Do not add rendering-specific systems.

---

# 16. TESTS

Add focused tests for the capability.

At minimum cover:

1. capability locked before Town;
2. capability unlocked at Town;
3. capability availability is derived correctly;
4. capability action follows the authoritative command path;
5. valid use;
6. invalid use where applicable;
7. resource consequences where applicable;
8. workforce remains unaffected;
9. multi-tick behavior where applicable;
10. save/load;
11. determinism;
12. Town progression regression.

Do not duplicate existing 10BV tests unnecessarily.

Reuse existing fixtures/helpers.

---

# 17. ARCHITECTURE

Preserve:

```
domain
    ↓
application
    ↓
rendering/UI
```

Town capability rules belong in domain/application logic.

UI only observes authoritative state and dispatches existing commands.

Avoid:

* UI-owned progression state;
* duplicate capability checks;
* rendering-layer economic calculations;
* speculative generic "CapabilityManager" abstractions.

Keep the implementation proportional to one Town capability.

---

# 18. DOCUMENTATION

Create:

```
docs/roadmap/STEP10BW.md
```

Document:

## Problem

What was missing after 10BV.

## Existing state

What Town already represented.

## Selected capability

Exactly what Town now enables.

## Alternatives considered

Briefly document other plausible directions that were rejected and why they
were not justified by the existing architecture.

## Economic interaction

Explain whether Food / Water / Material are affected.

## Persistence

State whether any persisted state was added.

## Determinism

State validation result.

## UX

Explain how the capability is exposed.

## Validation

Report exact test and browser results.

## Future Work

Record only discoveries made during implementation.

Do not turn the document into a speculative roadmap.

---

# 19. USER-OWNED FILES

These MUST remain untouched:

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

either file.

---

# 20. VALIDATION GATE

Before commit:

* focused tests: PASS
* relevant compatibility tests: PASS
* full Vitest: PASS
* typecheck: PASS
* lint: PASS
* build: PASS
* headed browser E2E: PASS
* responsive validation: PASS
* GPU/WebGL2 E2E: PASS
* save/load: PASS
* determinism: PASS
* git diff --check: PASS

Inspect:

```
git status
git diff --stat
git diff
```

The final diff must contain ONLY Step 10BW work.

---

# 21. COMMIT

Only after every validation passes:

```
Step 10BW: Town Progression Capability
```

Create exactly one commit.

Do not amend:

```
0743604
```

Do not include unrelated files.

---

# 22. FINAL REPORT

Return:

# Step 10BW — PASS / FAIL

## Capability

What Town now enables.

## Why this capability

Why it fits the existing simulation.

## Before / After

What existed at `0743604`.
What 10BW adds.

## Economic impact

Explicitly state:

```
Food:
Water:
Material:
```

and whether each changed.

## Workforce

Confirm Farm / Well / Workshop allocation remains unchanged.

## Persistence

State whether SAVE_VERSION changed.

## Determinism

State result.

## Files changed

Exact list.

## Validation

Exact counts for:

* focused tests;
* compatibility tests;
* full Vitest;
* typecheck;
* lint;
* build;
* browser;
* responsive;
* GPU/WebGL2;
* save/load;
* determinism.

## Future Work

Only concrete findings.

---

# CORE PRINCIPLE

10BU proved:

```
Food ↔ Water ↔ Material
```

10BV established:

```
Village economy
    ↓
Town gate
```

10BW must establish:

```
Town
  ↓
one meaningful new capability
```

Do not build a Town system.

Build the smallest capability that makes Town matter.

---

# Documentation (as-built)

## Design decision

Town enables one derived capability: **Town workforce allocation review**. When the Town gate is met, the existing progression panel exposes a compact status:

```text
Town workforce allocation — Farm / Well / Workshop allocation is active; use Move worker to rebalance.
```

The capability is deliberately an existing action made meaningful by Town. It does not add a new command, workforce priority, building, resource, or automatic behavior. The player still uses the authoritative `reassignColonist` path and the existing 10BQ diagnosis.

## Economic loop

```text
Town gate
  ↓
Town workforce allocation review
  ↓
manual Farm / Well / Workshop reassignment
  ↓
Food / Water / Material consequences remain live
```

## Exact capability behavior

- Before Town: status is `Town workforce allocation locked`.
- At Town: status is `Town workforce allocation` and points to the existing Move worker control.
- The capability remains available after Town.
- Farm, Well, and Workshop reassignment continue to use existing validation, capacity, mobility, and deterministic tie-break rules.
- No Town-specific workforce priority or production adjustment was added.

## Files changed

- `docs/roadmap/STEP10BW.md`
- `src/application/queries/progression.ts`
- `src/app/main.ts`
- `index.html`
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
- relevant compatibility tests: 67 PASS;
- typecheck: PASS;
- lint: PASS;
- build: PASS;
- headed Town browser E2E: PASS, including capability visibility and responsive 1280×800, 420×740, 360×640;
- headed GPU/WebGL2 E2E: PASS with NVIDIA RTX 3070;
- full Vitest: 1,683 / 1,683 PASS;
- determinism and save/load: PASS through existing progression/persistence coverage;
- `git diff --check`: PASS;
- `SAVE_VERSION`: unchanged at 8.

## Commit

`fedbb3a` — Step 10BW: add Town capability

