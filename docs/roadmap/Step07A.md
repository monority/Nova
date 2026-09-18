# NOVA — Step 07A — Economy / Population / Jobs Coherence & Playability Audit

## Context

Step 06B is COMPLETE.

The simulation now has the first complete economic loop:

```text
Residence
→ Colonist
→ Food consumption
→ Food shortage
→ Farm
→ Food production
→ Colony sustainability
```

Implemented and verified:

* deterministic population admission;
* food need/consumption;
* starvation;
* food production through operational Farms;
* production before consumption;
* recovery from starvation;
* causal UX feedback;
* food forecast;
* real-browser E2E;
* headed NVIDIA GPU validation;
* visual inspection;
* persistence and determinism.

Current production semantics:

```text
applyCommand
→ advanceConstruction
→ updateNeeds
→ produceFood
→ consumeFood
→ updatePopulation
→ advanceTime
```

Farm:

* construction cost = 25 material;
* construction = 2 ticks;
* operational Farm = +2 food/tick;
* produces with zero colonists;
* no stock cap;
* multiple Farms add deterministically.

Do NOT modify implementation in this step.

This is an AUDIT-ONLY step.

---

# 0. Primary objective

Determine what the next gameplay mechanic should actually be after the first production loop.

The main question is:

> Is NOVA now ready to introduce jobs/workers, or is another smaller prerequisite required first?

Do not assume that the answer is Jobs.

Use the repository's authoritative design documents and the actual implementation to determine the correct next step.

---

# 1. Read authoritative documentation first

Inspect at minimum:

* `docs/00-CMD.md`
* `docs/03-core-loop.md`
* `docs/07-population.md`
* `docs/08-economy.md`
* `docs/09-economy-foundation.md`
* `docs/11-time-and-events.md`
* `docs/26-roadmap.md`
* `docs/29-design-rules.md`

Also inspect any later documents specifically defining:

* jobs;
* workers;
* workplaces;
* employment;
* production;
* population behavior;
* housing;
* services;
* economy;
* demand;
* income;
* consumption.

Do not invent design intent when documentation already specifies it.

Produce a short authoritative dependency chain such as:

```text
Population
→ Needs
→ Consumption
→ Production
→ Jobs
→ Income
→ Demand
...
```

Only include stages actually supported by the repository documentation.

---

# 2. Audit the current implementation

Inspect the actual code rather than relying on previous reports.

Verify:

* `SimulationState`;
* `ResourceStock`;
* `BuildingType`;
* building catalog;
* construction lifecycle;
* population admission;
* food consumption;
* food production;
* phase ordering;
* persistence;
* hashing;
* render snapshot;
* current UI feedback;
* command dispatch;
* queries.

Confirm whether the implementation still matches the documented model.

Pay particular attention to:

### Population

* Is a colonist currently only residence-linked?
* Is there already any hidden employment/work state?
* Is population still entirely determined by housing + food?
* Is there any accidental dependency on Farms?

### Production

* Is Farm intentionally worker-independent?
* Does documentation expect future production to become worker-dependent?
* Would introducing workers now require changing Farm semantics?
* Is Farm meant to remain a special bootstrap producer?

### Economy

Determine whether:

```text
colonist → residence → food consumption
```

is currently enough to justify the next system, or whether another population/service concept is required first.

---

# 3. Important architectural question: worker dependency

Investigate whether future documentation requires:

```text
building
→ workplace
→ worker
→ production
```

If yes, determine whether Farm should eventually become worker-dependent.

Do NOT implement that change.

Instead report:

* current Farm semantics;
* documented future semantics;
* whether changing Farm later would be a breaking simulation change;
* whether a transition mechanism is explicitly documented.

Do not invent a migration.

---

# 4. Real playability audit

This section is mandatory.

Run the actual game in a real browser.

Prefer headed Chromium if the environment supports it.

If headed execution is unavailable, use the best available real-browser mode and explicitly report the deviation.

Do not replace browser playability with unit tests.

Perform a first-time-player style pass.

At minimum:

### Scenario A — bootstrap

1. Start fresh.
2. Observe the initial state.
3. Build a Residence.
4. Advance time.
5. Observe colonist arrival.

Ask:

> Can a new player understand why the colonist appeared?

### Scenario B — food

1. Let the colony consume food.
2. Observe the Food counter.
3. Observe the forecast.
4. Determine whether the player can understand that Food is being consumed.

### Scenario C — production

1. Build a Farm.
2. Wait for it to become operational.
3. Observe Food.
4. Determine whether the player can understand:

```text
Farm → produces Food
```

### Scenario D — sustainability

Determine whether the player can understand:

```text
production ≥ consumption
```

versus:

```text
production < consumption
```

### Scenario E — failure/recovery

If practical:

1. Create a shortage.
2. Observe starvation.
3. Build/activate production.
4. Determine whether the recovery mechanism is understandable.

---

# 5. Causal comprehension table

Produce this exact style of audit:

| Event                         | Visible? | Cause understandable? | Consequence understandable? |
| ----------------------------- | -------- | --------------------- | --------------------------- |
| Residence becomes operational |          |                       |                             |
| Colonist arrives              |          |                       |                             |
| Food decreases                |          |                       |                             |
| Farm becomes operational      |          |                       |                             |
| Farm produces Food            |          |                       |                             |
| Food shortage                 |          |                       |                             |
| Colony starves                |          |                       |                             |
| Production restores Food      |          |                       |                             |

Use actual observed behavior.

Do not infer comprehension merely from the existence of a UI element.

---

# 6. Check whether the current UI is now sufficient

Do NOT redesign the UI.

Determine whether another minimal UX correction is necessary before introducing the next gameplay mechanic.

Possible findings include:

* no correction required;
* one concrete causal feedback defect;
* one missing inspection value;
* one missing explanation;
* one misleading state.

Avoid recommending:

* dashboards;
* notification frameworks;
* generic event systems;
* large HUD redesign;
* tutorial systems;
* generic resource widgets.

The current UI should remain intentionally minimal.

---

# 7. Economy invariants audit

Verify the current invariants from the implementation and tests.

At minimum:

### Food

```text
food >= 0
```

### Production

```text
production =
sum(output of operational producers)
```

### Consumption

```text
consumption =
colonistCount × FOOD_PER_COLONIST_PER_TICK
```

### Sustainability

For a stable population:

```text
production >= consumption
```

should imply that Food does not trend downward indefinitely, assuming no other food sinks.

Do not modify these semantics during this step.

---

# 8. Determinism / architecture audit

Confirm that the new production layer preserves:

* pure simulation;
* no `Date.now()`;
* no `Math.random()`;
* no browser APIs in domain;
* deterministic iteration;
* immutable state transitions;
* canonical hashing;
* persistence equivalence.

Also inspect whether any abstractions introduced during Steps 04–06 are premature.

Explicitly flag unnecessary abstractions.

Do not refactor them in this step.

---

# 9. Determine the next mechanic

After documentation + code + browser playability audit, determine the smallest coherent next gameplay mechanic.

Candidates may include:

* Jobs/workers;
* workplace assignment;
* another service;
* income;
* demand;
* another population need;
* production dependency;
* housing refinement;
* another economic primitive.

Do NOT choose based on what seems interesting.

Choose based on the repository's documented dependency order and the smallest mechanic that creates the next meaningful causal loop.

If Jobs are next, explain why the prerequisite chain is complete.

If Jobs are NOT next, explain exactly what prerequisite is missing.

---

# 10. Do NOT implement

This step must not:

* add code;
* change domain semantics;
* add a new building;
* add jobs;
* add workers;
* add income;
* add another resource;
* redesign UI;
* refactor architecture.

Only audit and report.

---

# 11. Required validation

Run the existing relevant validation suite to ensure the audit itself did not disturb anything:

* unit tests;
* typecheck;
* lint;
* build;
* existing E2E suite if practical.

No source changes are expected.

If the repository is already dirty, do not modify or revert unrelated work.

---

# 12. Final report format

Return:

## Step 07A — COMPLETE / PARTIAL / BLOCKED

### 1. Documentation findings

### 2. Current implementation findings

### 3. Economic dependency chain

### 4. Real-browser playability

Include:

* browser mode;
* scenario executed;
* observed state transitions;
* console/page errors.

### 5. Causal comprehension

Use the requested table.

### 6. UX findings

Separate:

* required correction;
* optional future improvement;
* no correction required.

### 7. Economy invariants

### 8. Architecture/determinism audit

### 9. Next mechanic

State exactly:

```text
NEXT = <mechanic>
```

Then explain the minimum causal loop it would create.

### 10. Scope integrity

Confirm that no implementation changes were made.

### 11. Validation

Report exact results.

Do not claim visual inspection unless screenshots were actually opened/read.

Do not claim GPU validation unless headed hardware-backed WebGL was actually verified.

Final status should be:

```text
READY FOR IMPLEMENTATION
```

only if the next mechanic is sufficiently specified by the repository's existing design and no blocking ambiguity remains.

