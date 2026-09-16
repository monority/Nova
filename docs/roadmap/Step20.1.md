# NOVA — Step 20.1 Product Contract Validation

Date: 2026-09-16

Project:

```text
C:\Users\monority\Desktop\Nova
```

## Context

NOVA has completed:

* Step 16 — Urban Inspection & Causality
* Step 17 — Urban Rules & Player Intent
* Step 18 — Urban Feedback Loop & Simulation Timeline
* Step 19 — Urban State & Causal Readout
* Step 19.1 — Product QA
* Step 19.2 — Browser/WebGL diagnosis
* Step 19.3 — GPU E2E validation
* Step 19.4 — E2E contract alignment

The GPU Playwright path is now validated:

```bash
pnpm test:e2e:gpu
```

Result:

```text
4/4 PASS
```

Hardware WebGL:

```text
NVIDIA GeForce RTX 3070
ANGLE / Direct3D11
```

The relevant product contract is:

```text
docs/20-product-contract.md
```

and the MVP specification is:

```text
docs/19-mvp.md
```

## Product promise

NOVA should allow a player to:

> found a settlement, understand why it grows, and watch a small city form.

The current gameplay loop is:

```text
PLAYER INTENT
    ↓
ZONES
    ↓
DETERMINISTIC SIMULATION
    ↓
AUTONOMOUS DEVELOPMENT
    ↓
BUILDINGS & ROADS
    ↓
DENSIFICATION
    ↓
TEMPORAL FEEDBACK
    ↓
INSPECTION
    ↓
NEW INTENT
```

---

# Objective

Validate the CURRENT implementation against the Product Contract.

This is primarily an audit and playtest step.

Do not add new gameplay systems unless a contract requirement cannot be validated without a minimal implementation correction.

The goal is to answer:

> What parts of the MVP contract are already genuinely implemented, what parts are partially implemented, and what parts are still missing?

Do not assume that an existing file or UI control means the corresponding product capability is complete.

---

# Step 1 — Read the contract first

Read:

```text
docs/20-product-contract.md
docs/19-mvp.md
```

Extract the explicit requirements.

Create a temporary internal checklist covering:

## World

```text
128×128 seed
plains
hills
coast
river
lake
```

## Construction

```text
roads
residential zones
food nodes
energy nodes
```

## Population

```text
households
workers
aggregated population
```

## Economy

```text
food
energy
materials
storage
```

## Growth

```text
Settlement
Village
Town
```

## Time

```text
pause
1×
2×
5×
20×
```

## Rendering

```text
WebGL2 baseline
day/night
```

## Persistence

```text
1 manual save slot
1 autosave
```

## UX

```text
build tools
controls
metrics
inspector
```

---

# Step 2 — Audit the simulation contract

Verify the following actual runtime invariants.

## Tick

Confirm:

```text
1 tick = 1 simulated day
30 ticks = 1 month
360 ticks = 1 year
```

## Tick order

Confirm the actual implementation follows:

```text
commands
→ accessibility
→ production
→ consumption
→ housing
→ construction
→ events
→ hash
```

Do not infer this from filenames.

Trace the actual execution path.

## Initial state

Verify the actual starting state:

```text
40 people
12 households
180 food
120 energy
300 materials
```

If the current implementation intentionally differs, document the difference.

Do not silently modify it.

---

# Step 3 — Audit civilization progression

Verify the actual transition conditions:

```text
Wilderness
    ↓
Settlement
    house + population ≥ 20
    ↓
Village
    population ≥ 50
    ↓
Town
    population ≥ 500
```

For each transition determine:

* where the rule is implemented;
* whether it is deterministic;
* whether it is observable in the UI;
* whether the player receives meaningful feedback.

Do not change thresholds during this step.

---

# Step 4 — Audit deterministic simulation

Verify:

```text
same seed
+
same commands
=
same state hash
```

Locate the existing hashing implementation.

Determine whether the hash covers the complete simulation state required by the contract.

Do not replace the current hashing system unless it is demonstrably incorrect.

Create or extend deterministic tests only if required to validate the contract.

---

# Step 5 — Audit persistence

Determine whether the current implementation actually provides:

```text
1 manual save slot
1 autosave
```

Trace:

```text
save
→ serialized state
→ storage
→ reload
→ restored state
```

Verify:

```text
save/reload
=
same state hash
```

after:

```text
100 ticks
```

If persistence does not yet exist, report it as missing.

Do not invent a persistence implementation in this step unless the repository already contains the corresponding system and only lacks validation.

---

# Step 6 — Audit performance

Identify existing performance instrumentation/budgets.

At minimum inspect:

* simulation tick cost;
* render frame cost;
* object/entity count;
* memory growth;
* WebGL rendering stability.

Do not optimize blindly.

If explicit budgets exist in the contract, validate those exact budgets.

If they are undefined, document:

```text
budget not currently measurable / not explicitly specified
```

rather than inventing arbitrary thresholds.

---

# Step 7 — Real browser playtest

Use the validated GPU configuration:

```bash
pnpm test:e2e:gpu
```

Then run the application in the GPU-capable browser environment.

Perform a manual product flow:

```text
1. Start NOVA
2. Observe initial settlement
3. Inspect existing objects
4. Select a build tool
5. Place a road
6. Create a residential zone
7. Create/inspect a food or energy node if available
8. Start simulation
9. Observe autonomous development
10. Pause
11. Change simulation speed
12. STEP
13. Inspect a newly created building
14. Follow recent changes
15. Select a feed event
16. Verify selection/inspection
17. Remove a zone if available
18. Continue simulation
```

Do not modify the product during this playtest.

Record actual behavior.

---

# Step 8 — Validate the product promise

Answer these three questions from observable behavior:

### 1. Can the player found an establishment?

Identify the exact interaction path.

### 2. Can the player understand why it grows?

Check:

* timeline;
* recent changes;
* spatial context;
* inspection;
* simulation state.

Do not claim causal explanations that the system does not actually establish.

### 3. Can the player watch a small city form?

Observe autonomous development over multiple ticks.

Record:

* buildings created;
* roads created;
* evolution;
* population changes;
* zones;
* settlement progression.

---

# Step 9 — Create a contract gap matrix

Create a report:

```text
docs/qa/step20.1-product-contract-validation.md
```

Use this structure:

| Contract area | Requirement   | Status               | Evidence | Gap |
| ------------- | ------------- | -------------------- | -------- | --- |
| World         | 128×128       | PASS/PARTIAL/MISSING | ...      | ... |
| World         | terrain types | ...                  | ...      | ... |
| Construction  | roads         | ...                  | ...      | ... |
| Population    | households    | ...                  | ...      | ... |
| Economy       | food          | ...                  | ...      | ... |
| Growth        | Settlement    | ...                  | ...      | ... |
| Growth        | Village       | ...                  | ...      | ... |
| Growth        | Town          | ...                  | ...      | ... |
| Time          | pause         | ...                  | ...      | ... |
| Rendering     | WebGL2        | ...                  | ...      | ... |
| Persistence   | manual save   | ...                  | ...      | ... |
| Persistence   | autosave      | ...                  | ...      | ... |
| UX            | inspector     | ...                  | ...      | ... |

Use only:

```text
PASS
PARTIAL
MISSING
BLOCKED
```

Do not use subjective ratings.

---

# Step 10 — Classify gaps

Every discovered gap must be classified as one of:

```text
A — Contract violation
B — Contract partially implemented
C — Contract implemented but not observable
D — Contract implemented and validated
E — Environment limitation
```

This classification is important.

Do not automatically turn every gap into a development task.

---

# Step 11 — No speculative implementation

During this step:

DO NOT:

* redesign the UI;
* redesign the simulation;
* add new buildings;
* add new economy systems;
* add persistence from scratch;
* add new progression mechanics;
* change terrain generation;
* change simulation thresholds;
* rewrite the renderer;
* add causal explanations;
* modify the product promise.

Only make code changes if a tiny validation hook/test is required and it does not alter product behavior.

---

# Step 12 — Existing validation

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e:gpu
```

Record exact results.

Do not use the default:

```bash
pnpm test:e2e
```

as the WebGL acceptance gate for this machine.

The validated hardware-WebGL gate is:

```bash
pnpm test:e2e:gpu
```

---

# Final report

Return:

## Product Contract Coverage

A complete table of every MVP contract item.

## Playtest

Document the actual player flow and observed behavior.

## Product Promise

Answer:

```text
Can the player found an establishment?
Can the player understand why it grows?
Can the player watch a small city form?
```

Use evidence, not impressions.

## Gaps

List only actual gaps.

For each:

```text
Requirement:
Status:
Evidence:
Impact:
Suggested next step:
```

Do not implement the suggested next step unless explicitly required.

## Validation

```text
pnpm typecheck:
pnpm lint:
pnpm test:
pnpm build:
pnpm test:e2e:gpu:
```

## Production changes

Explicitly state:

```text
Production files modified: YES/NO
Behavior changed: YES/NO
```

## Final status

Use one:

```text
PASS — Product Contract validated
```

if the MVP contract is sufficiently implemented and observable.

Otherwise:

```text
PARTIAL — Product Contract has implementation gaps
```

or:

```text
BLOCKED — Product Contract cannot currently be validated
```

Do not hide missing functionality behind passing technical tests.
