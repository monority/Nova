# NOVA — Step006: First Physical Transformation

## Mission

Implement the smallest complete physical transformation loop using the existing Wood/Stone extraction systems.

**Baseline:** use the actual current `HEAD`. Confirm it once with `git log -1 --oneline` and `git status --short`.

Step003–005 are established. Do not repeat their audits.

## 0. Mandatory token discipline

- Treat prior implementation reports and existing code/tests as ground truth.
- **Do not perform repository-wide discovery unless a concrete unresolved implementation question requires it.**
- Inspect only: current Workshop implementation, Wood/Stone stocks and extraction phases, production tick order, storage/capacity rules, construction costs, and directly relevant tests.
- Reuse the existing Workshop and resource-accounting patterns. Do not read whole directories or summarize unrelated systems.
- Do not repeat previous decisions or audits. Do not narrate routine progress.
- Batch inspections and edits. Implement one coherent vertical slice before broad validation.
- Do not rerun a successful validation command without new evidence.
- Spend tokens on correctness, migration safety, regression tests, and validation—not rediscovery or verbose explanations.
- Do not sacrifice necessary testing to save tokens.
- Preserve all pre-existing working-tree changes; never overwrite unrelated work.

## 1. First resolve the smallest product question

The current Workshop previously generated commerce without consuming physical resources. The audit established that transformation must consume inputs and produce something real.

Inspect the current Workshop and construction/resource contracts. Select the **smallest useful transformation** compatible with the current model.

Preferred direction:
- Workshop becomes the first transformation building.
- It consumes a finite, explicitly defined input from existing physical stock.
- It produces a distinct processed resource with a real downstream use.

Do not add a new building if the Workshop can fulfil this role cleanly.

If the repository does not provide a coherent output resource or useful downstream purpose without a larger design decision, stop and report the exact blocker. Do not invent a broad technology/economy design.

## 2. Define one minimal transformation recipe

Implement exactly one initial recipe.

Choose inputs and output based on existing resource types, building roles, and construction contracts. Prefer a recipe that demonstrates a meaningful distinction between extraction and transformation.

Requirements:
- Inputs are consumed from available stock.
- Output is added to canonical stock.
- No input means no production.
- Partial input cannot produce a full recipe.
- Inputs cannot become negative.
- Production is deterministic.
- No resource is created ex nihilo.
- Unstaffed or non-operational Workshop produces nothing.
- Respect the existing tick order and staffing contract.
- No new generic recipe engine for one recipe.

Document the exact input/output quantities and cadence.

## 3. Preserve the extraction layer

Do not modify the established physical extraction contracts:

- Wood deposits remain finite.
- Stone deposits remain finite.
- Lumber Camp and Quarry retain their existing staffing and adjacency requirements.
- Colony Center retains its primitive Wood recovery path.
- Deposits at zero remain present.
- Deterministic deposit-drain ordering remains unchanged.

Add regression coverage proving the new transformation cannot break these invariants.

## 4. Downstream use

The processed output must have a concrete purpose, preferably through an existing construction or resource contract.

However:
- Do not broadly migrate every construction cost.
- Do not make the new output a prerequisite for the Colony Center, primitive Wood recovery, or another fundamental recovery path.
- Do not make Day 0 or existing saves unrecoverable.
- Do not add multiple recipes or resource sinks.
- If no safe downstream use exists without a larger product decision, stop and report the smallest decision needed rather than introducing an arbitrary sink.

## 5. Economy boundaries

Do not rebalance taxes, maintenance, population revenue, or construction prices.

Do not yet re-anchor commerce to transformation throughput unless the existing architecture requires it and the scope can remain genuinely minimal.

Do not add money generation to the recipe. The purpose of this step is to prove a physical input → transformation → useful output loop.

Document any temporary separation between physical production and commerce.

## 6. State, capacity, and saves

Reuse canonical resource stock and current capacity rules.

- Respect capacity and overflow behavior.
- Do not silently discard produced resources.
- Follow the existing tick-order conventions.
- Preserve deterministic state/hash behavior.
- Increment `SAVE_VERSION` only if the persisted schema changes.
- If a migration is needed, provide deterministic defaults and test old-save compatibility.
- Update only directly affected fixtures and version-pinned tests.

## 7. UI

No redesign.

Use existing inspection/state-injection conventions. Change production or resource UI only if required to make the mechanic understandable and testable. Avoid fragile palette-layout changes.

## 8. Focused tests

Add targeted tests for:
- Normal staffed transformation.
- Unstaffed Workshop produces nothing.
- Missing inputs produce nothing.
- Insufficient inputs do not produce output.
- Inputs are consumed exactly as specified.
- Output is added exactly as specified.
- Capacity/overflow follows existing rules.
- Deterministic results and tick integration.
- Existing Wood/Stone extraction and Colony Center recovery remain valid.
- Save migration, if applicable.

Reuse established test patterns. Do not create a general simulation framework.

## 9. Explicitly deferred

Do not implement:
- Multiple recipes or a generic recipe engine;
- Commerce re-anchoring or economic balancing;
- Technology/age progression;
- Additional resource types without necessity;
- Warehouses, logistics, transporters, or production chains;
- Fertility, regeneration, recycling;
- Demolition;
- Broad construction-cost migration;
- Unrelated UI, rendering, or architecture refactoring.

## 10. Validation

Run:
1. Targeted transformation and shared resource tests.
2. TypeScript.
3. ESLint.
4. Full Vitest suite.
5. Build.
6. Full E2E suite once.

Investigate new failures. Isolate known E2E hover races before classifying them as regressions. Report unrun checks and flaky failures accurately.

## 11. Final report

Return only:

RESULT: PASS / BLOCKED

RECIPE
- Inputs:
- Output:
- Cadence:
- Downstream use:

IMPLEMENTED
- ...

RESOURCE INVARIANTS
- ...

SAVE
- ...

VALIDATION
- Targeted tests:
- TypeScript:
- ESLint:
- Vitest:
- Build:
- E2E:

DEFERRED
- ...

GIT
- Commit:
- Working tree:
- Push:

Do not append a repository overview or repeat previous audit findings. If blocked by a genuine product decision, state the exact decision needed and stop.
