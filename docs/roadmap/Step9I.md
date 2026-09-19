# NOVA — Step 09I — Bootstrap Economy Audit

## Context

NOVA has now completed:

* 08B–08G — Material production, upkeep, labor capacity, storage and construction timing;
* 09A — transport network foundation;
* 09B — road infrastructure contract;
* 09C — player-independent road construction domain;
* 09D — road network connectivity;
* 09E — building road access;
* 09F — Workshop production requires road access;
* 09G — derived Residence ↔ Workplace mobility connectivity;
* 09H — player-facing road construction and the complete browser gameplay loop.

09H proved the following causal chain in real Chromium:

```text
Residence
→ Colonist
→ Workshop
→ roadless production blocked
→ player constructs road
→ road operational
→ road access
→ production resumes
```

09H also exposed a design question:

> The first productive Workshop now requires road infrastructure, but roads cost Material. Is the resulting bootstrap economy intentional and playable, or merely an artifact of the incremental implementation?

This step MUST answer that question before introducing another economic or mobility rule.

---

# 1. Primary objective

Perform a rigorous **bootstrap economy audit** of the current NOVA rules.

This is primarily a research/verification step.

## Default rule

**Do not modify gameplay rules unless the audit discovers a correctness bug rather than a design question.**

Do not:

* reduce road cost;
* increase starting Material;
* change Workshop production;
* change upkeep;
* add free roads;
* add a first-Workshop exception;
* add subsidies;
* add money;
* alter construction duration;
* alter storage;
* alter food rules.

The purpose is to understand the current system, not rebalance it.

---

# 2. Mandatory workflow

Follow:

```text
AUDIT
→ MODEL THE CURRENT ECONOMY
→ RUN DETERMINISTIC SCENARIOS
→ IDENTIFY BOTTLENECKS
→ DISTINGUISH BUG FROM DESIGN CONSTRAINT
→ DESIGN DECISION
→ NO-CODE-CHANGE VERIFICATION
```

Do not implement a solution merely because the current economy is inconvenient.

---

# 3. Audit the authoritative rules

Inspect the actual repository and identify the current values and phase ordering for:

## Starting state

* initial Material;
* initial Food;
* initial colonists;
* initial buildings;
* initial time;
* world configuration.

## Construction

* Residence cost;
* Farm cost;
* Workshop cost;
* Road cost;
* construction duration;
* construction transaction timing.

## Population

* Residence housing capacity;
* colonist admission timing;
* residence assignment;
* homeless behavior.

## Food

* food production;
* food consumption;
* food shortage behavior;
* food production timing.

## Labor

* Workshop job capacity;
* worker assignment;
* productive worker count;
* behavior when Workshop is roadless.

## Material

* Material production rate;
* Workshop upkeep;
* operational Workshop requirement;
* road-access production requirement;
* storage capacity;
* overflow behavior.

## Roads

* road cost;
* road construction duration;
* operational timing;
* road access rule;
* network connectivity.

Document the values from source code/tests rather than assuming them from previous reports.

---

# 4. Establish the canonical simulation sequence

Document the actual phase order currently executed by `stepSimulation`.

For example, determine whether the effective order is:

```text
needs
→ food
→ population
→ jobs
→ production
→ construction
→ upkeep
→ time
```

or something else.

Do not copy this example blindly.

The audit must report the actual source-of-truth order.

Explain why the ordering matters for bootstrap economics.

---

# 5. Define canonical bootstrap scenarios

Create deterministic scenarios representing realistic early settlement progression.

Do NOT invent arbitrary late-game scenarios.

At minimum analyze:

## Scenario A — Minimum viable settlement

```text
empty world
→ first Residence
→ colonist
```

Determine:

* Material spent;
* Food state;
* colonist count;
* remaining Material;
* resulting capacity.

---

## Scenario B — Add Workshop without road

```text
Scenario A
→ Workshop
→ operational
→ staffed
→ no road
```

Measure:

* construction cost;
* remaining Material;
* worker assignment;
* gross potential production;
* actual stored production;
* upkeep;
* net Material delta;
* Food delta;
* resulting state after multiple ticks.

Explicitly confirm:

```text
roadless Workshop
→ worker assigned
→ production = 0
→ upkeep still applies
```

if that is the current rule.

---

## Scenario C — Minimum road-served Workshop

Starting from the minimum viable settlement:

```text
Residence
→ Workshop
→ Road
→ operational Workshop
→ operational Road
```

Measure the exact Material trajectory.

Determine the first tick at which production actually resumes.

Report:

* starting Material;
* Residence cost;
* Workshop cost;
* Road cost;
* construction timing;
* Material remaining after each transaction;
* production;
* upkeep;
* storage;
* net balance.

---

## Scenario D — Sustained one-Workshop economy

Once the Workshop is road-accessible, simulate enough ticks to determine whether:

```text
production - upkeep
```

is positive, zero, or negative.

Use the actual current rules.

Do not extrapolate from one tick if storage or construction timing changes the result.

---

## Scenario E — First expansion

After achieving a stable road-served Workshop, determine whether the player can afford the next meaningful construction step.

Use an actual early-game building already present in the game.

For example:

```text
first productive Workshop
→ next Residence / Farm / Workshop
```

Do not introduce a new building solely for this audit.

---

# 6. Bootstrap reachability

Answer this precise question:

> From the canonical initial state, can the player reach a productive road-served Workshop using only currently available actions and resources?

If yes:

* show the minimal sequence;
* show the resource balance at each step;
* identify any tight points.

If no:

* identify the exact blocking transaction;
* distinguish whether the block is:

  * insufficient starting resource;
  * construction timing;
  * food starvation;
  * housing capacity;
  * road cost;
  * Workshop cost;
  * upkeep;
  * another existing rule.

Do not fix the block.

---

# 7. Bootstrap sustainability

Measure the economy after the first productive Workshop becomes operational.

At minimum calculate:

```text
gross Material production / tick
Material upkeep / tick
net Material / tick
storage capacity
```

Also determine whether construction can consume the accumulated stock faster than it can recover.

Report both:

### Steady-state

No construction occurring.

### Expansion state

Construction continues.

This distinction is important because a positive steady-state economy can still be unable to finance expansion.

---

# 8. Storage interaction

Audit the current storage rule.

Determine whether the first Workshop can reach:

```text
storage capacity
```

under the current upkeep rule.

Measure the equilibrium.

Explicitly check the already-known 08F relationship:

```text
1 staffed operational Workshop
→ storage capacity 25
→ production 2
→ upkeep 1
→ net +1/tick
```

Do not assume these values are still unchanged; verify them from source.

Explain whether storage creates a meaningful early-game bottleneck.

---

# 9. Construction timing interaction

Because construction occurs during the simulation rather than instantaneously, measure timing carefully.

For each early construction:

* command tick;
* transaction tick;
* constructionRemaining;
* operational tick;
* production eligibility tick;
* upkeep eligibility tick.

Do not collapse these into a single abstract "cost".

The audit should expose the actual temporal sequence.

---

# 10. Food interaction

The bootstrap economy must include the existing Food system.

Determine:

* when the first colonist consumes Food;
* whether the initial Food stock is sufficient;
* whether a Farm is required before the first productive Workshop;
* whether Food becomes the actual bootstrap bottleneck;
* whether food production competes with Material construction decisions.

Do not change Food rules.

If the current rules allow a player to construct a Workshop before a Farm, document that fact rather than assuming a Farm is required.

---

# 11. Roadless Workshop as a sink

09H makes this state player-accessible:

```text
Workshop operational
+
staffed
+
no road access
```

Measure its economic behavior.

Determine exactly:

```text
production = ?
upkeep = ?
net Material = ?
```

over several ticks.

Then answer descriptively:

> Does the current system make a roadless staffed Workshop economically self-draining?

Do not label that good or bad.

That is a design input for a future decision.

---

# 12. Player-action dependency graph

Construct a small dependency graph showing what must happen before productive Material exists.

For example:

```text
Material
  ↓
Residence
  ↓
Colonist
  ↓
Workshop
  ↓
Road
  ↓
Road access
  ↓
Production
```

But derive the actual graph from the current rules.

Include Food if it is genuinely required.

Include Housing if it is genuinely required.

The final report should clearly identify:

* mandatory dependencies;
* optional dependencies;
* bootstrap resources;
* first recurring positive flow.

---

# 13. Scenario automation

Prefer deterministic automated simulation over manual arithmetic.

If useful, create a focused test/helper/script for the audit.

However:

## No production code changes

Do not alter `src/` gameplay implementation.

Audit tooling may be placed in an appropriate test/audit location if consistent with repository conventions.

Any audit-only helper must be clearly identified as such and must not become a hidden runtime dependency.

---

# 14. Correctness verification

The audit must verify that current arithmetic is internally consistent.

Check:

```text
resource never negative
construction cost deducted exactly once
road cost deducted exactly once
upkeep deducted exactly once
production stored according to capacity
food consumption applied exactly once
```

If a genuine implementation bug is found:

1. document it first;
2. determine whether it affects canonical gameplay;
3. fix only the correctness bug;
4. add a regression test.

Do NOT classify a balance preference as a correctness bug.

---

# 15. Determinism

Every scenario must be reproducible.

Verify:

```text
same initial state
+
same commands
=
same state
+
same hash
```

Run important bootstrap scenarios more than once.

If audit tooling produces numerical reports, they must be deterministic.

No random simulation.

No wall-clock dependency.

---

# 16. Persistence

Do not change SAVE_VERSION.

Verify that an audited bootstrap state can still:

```text
save
→ load
→ continue simulation
```

with identical state/hash.

If the audit helper creates temporary state, do not persist new fields.

---

# 17. Browser verification

This is an audit step, so do not create new UI merely for testing.

Use the existing 09H browser scenario if useful to confirm that the automated model corresponds to actual gameplay.

At minimum, if practical, reproduce:

```text
Residence
→ Colonist
→ Workshop
→ roadless
→ production blocked
→ Road
→ production resumes
```

The browser is not the primary measurement tool here; deterministic simulation is.

Do not claim browser results that were not actually executed.

---

# 18. GPU

No new rendering work is required.

If the existing E2E suite automatically runs the normal browser path, run it.

A dedicated hardware-GPU run is optional for this audit unless the repository's standard verification requires it.

Do not spend the step implementing GPU infrastructure.

---

# 19. Documentation

Create:

```text
docs/roadmap/Step09I.md
```

IMPORTANT:

If the file already exists as a committed roadmap document, NEVER overwrite it with the raw prompt.

Preserve the existing document and append the as-built audit report.

The document must contain:

### A. Audit

### B. Canonical Rules

### C. Phase Order

### D. Bootstrap Scenarios

### E. Resource Trajectories

### F. Bootstrap Reachability

### G. Sustainability

### H. Storage

### I. Construction Timing

### J. Food Interaction

### K. Roadless Workshop

### L. Dependency Graph

### M. Correctness Findings

### N. Determinism

### O. Persistence

### P. Browser Verification

### Q. Scope Audit

### R. Design Decision

### S. Next Design Question

---

# 20. Critical design rule

At the end, classify the result into exactly one of these categories:

## A — Bootstrap is reachable and coherent

Current rules allow the player to establish a productive Workshop and continue expanding.

No gameplay change proposed.

## B — Bootstrap is reachable but creates a deliberate economic pressure

The player can establish production, but a specific resource/timing pressure is significant.

Do not rebalance it automatically.

Document the pressure as a future design decision.

## C — Bootstrap is unreachable because of current rules

The canonical initial state cannot reach productive Workshop infrastructure.

Identify the exact blocking dependency.

Do not automatically add an exception.

## D — Correctness bug

The intended existing rules are not being implemented correctly.

Fix only the correctness defect and add regression coverage.

Do not use this category for balance preferences.

---

# 21. No premature solution

Do NOT decide in advance that the answer should be:

* free first road;
* free first Workshop;
* extra starting Material;
* road subsidy;
* Workshop road exception;
* delayed upkeep;
* reduced road cost;
* increased production;
* increased storage.

Those are possible future design choices, not assumptions.

The audit must provide the evidence needed to choose among them later.

---

# 22. Required verification

Run the repository's normal checks:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Run relevant E2E suites.

Run deterministic bootstrap scenarios multiple times.

If audit-only files are introduced, ensure they do not affect production/build behavior.

---

# 23. Git

Prefer one focused commit:

```text
Step 09I: Bootstrap Economy Audit
```

Before finishing:

```text
git status --short
git diff --stat
git log -1 --oneline
```

Working tree should be clean.

Do not commit:

* temporary screenshots;
* generated logs;
* machine-specific artifacts;
* secrets.

---

# 24. Final report

Return a concise but complete report:

### A. Audit

### B. Canonical Rules

### C. Phase Order

### D. Bootstrap Scenarios

### E. Resource Trajectories

### F. Bootstrap Reachability

### G. Sustainability

### H. Storage

### I. Construction Timing

### J. Food Interaction

### K. Roadless Workshop

### L. Dependency Graph

### M. Correctness Findings

### N. Determinism

### O. Persistence

### P. Browser Verification

### Q. Scope Audit

### R. Design Decision

### S. Next Design Question

The most important output is not the test count.

It is a precise answer to:

> **Can a fresh NOVA settlement reach a productive road-served Workshop with the current rules, and what does the Material/Food economy look like during that bootstrap?**

Do not make the design decision for the next step beyond documenting the evidence.

---

# As-built audit report (Step 09I execution)

Evidence: `tests/bootstrapEconomy.test.ts` (13 tests, all passing) drives the UNMODIFIED simulation through canonical sequences and pins every trajectory below. Full suite: 23 files / 344 tests pass; lint, typecheck, build clean.

## A. Audit

All values read from source (`resource.ts`, `building.ts` catalog, `road.ts`, `jobs.ts`, `phases.ts`, `step.ts`), then pinned by test A0. No value below is quoted from a previous report.

## B. Canonical Rules

- Start: Material 100, Food 100, 0 colonists/buildings, tick 0.
- Costs: Residence/Farm/Workshop 25; Road 5/cell. Durations: 2 ticks (buildings and roads).
- Housing: Residence 1; Farm/Workshop 0. Job capacity: 1/workshop.
- Food: need 1/colonist/tick (all-or-nothing colony feeding; shortage wipes all colonists); farm output 2/tick; admission requires food > 0 after consumption.
- Material: 2/worker/tick gross, gated by operational + staffed + road access (09F); upkeep 1/staffed Workshop/tick AFTER production+construction, partial payment clamped to stock, no debt/deactivation; storage = 25/operational Workshop (vacant counts), bounds inflow only.
- Roads: orthogonal operational adjacency; networks = connected components; access = operational building + adjacent operational road.

## C. Phase Order (actual source of truth)

```text
advanceConstruction → updateNeeds → produceFood → consumeFood → updatePopulation
→ assignJobs → produceMaterial → applyCommand (8a) → progressPlaced* → upkeepBuildings → advanceTime
```

Why it matters for bootstrap: (1) production runs BEFORE the construction transaction, so this tick's stored inflow is spendable the same tick; (2) upkeep runs AFTER production and construction, so same-tick output pays same-tick upkeep and shortfalls clamp to stock without debt; (3) admission runs after consumption, so a colonist admitted this tick is first fed next tick.

## D. Bootstrap Scenarios

- A (test A1): t1 Residence (−25) → M75; t2 operational + colonist-1, food untouched (100).
- B (test B1): t3 Workshop (−25) → M50, first meal F99; t4 operational + staffed, roadless → production 0, upkeep 1 → M49; t5–t9 drain exactly −1/tick (M44, F93 at t9).
- C (test C1): t4 adjacent Road (−5) → M44, road under construction, still 0; t5 road operational → access, gross 2 resumes, stored 0 (stock 44 ≥ cap 25) → M43. First resumed-production tick = 5; bootstrap spend = 55 + 1 upkeep.
- D (test D1): sustained → M38 (t10) → 28 (t20) → 24 (t24), then fixed: gross 2, stored 1, upkeep 1, net 0.
- E (tests E1–E3): farm from transient stock (43→17, recovers to 24; food +1/tick after); equilibrium buys via same-tick inflow (24+1=25 → M0, upkeep shortfall absorbed); second vacant Workshop → capacity 50 → accumulation through 24 toward 49 (M25 at t14, M31 at t20).

## E. Resource Trajectories

Minimum path t0–t5: M 100→75→75→50→44→43; F 100→100→100→99→98→97. Employment 0 until t4, then 1. Gross production 0 until t5, then 2. Full 16-row t0–t15 trajectory pinned by test I1.

## F. Bootstrap Reachability

YES. Minimal sequence: Residence (t1) → colonist (t2) → Workshop (t3) → adjacent Road (t4) → production resumes (t5). No tight point on resources (peak spend 55 of 100); the only timing constraint is the fixed 2-tick construction lifecycle. No Farm, no second building, no special action required.

## G. Sustainability

Steady state (no construction): gross 2, upkeep 1, stored 1, net 0 at M24. Expansion state: savings accumulate +1/tick whenever stock < capacity; one 25-cost building per ~25 ticks from equilibrium, faster from transient stock or with added storage capacity. A positive steady state is therefore NOT required for expansion — the same-tick inflow finances it.

## H. Storage

08F values verified unchanged (25/2/1). Storage is the dominant early-game shaper: above capacity all resumed production is discarded (C t5 stores 0); the single-workshop attractor is exactly 24; capacity only rises with more operational Workshops (vacant count). It paces but never blocks expansion.

## I. Construction Timing

Per build: command tick (deduct, remaining 2) → catch-up (remaining 1) → next tick operational at phase 1. Employment/upkeep/production eligibility all attach the tick the Workshop turns operational (phase order guarantees same-tick staffing and upkeep, and same-tick production once road access exists). Road: same 2-tick shape; access activates the tick the road completes.

## J. Food Interaction

First consumption t3 (F99); F97 at first production tick — no Farm needed before the first productive Workshop. Runway ≈ 97 ticks; Food is not the bootstrap bottleneck but becomes a hard deadline (~tick 100 without a Farm). Farm (+2/−1 = +1/tick) removes the clock permanently. Food never competes with Material construction in the bootstrap window (no shared stock).

## K. Roadless Workshop

Production 0, upkeep 1, net Material −1/tick, plus −1 Food/tick for its worker (test G1, 5 ticks pinned). Descriptively: yes, self-draining at exactly the upkeep rate with no countervailing inflow. Good/bad is a design decision, not an audit finding.

## L. Dependency Graph (derived from current rules)

```text
Material(100)
  → Residence(25) → Colonist (mandatory: no residence, no worker)
    → Workshop(25) → worker assigned (mandatory)
      → Road(5) → Road access (mandatory for production)
        → Production (2 gross, 1 net of upkeep, clamped by storage)
Food(100, optional early / mandatory by ~tick 100) → Farm(25, optional)
```

Mandatory: Material → Residence → Colonist → Workshop → Road → access. Optional: Farm. First recurring positive flow: gross 2 − upkeep 1 = +1 stored/tick (while stock < capacity).

## M. Correctness Findings

No correctness bug found. Test H1 replays a mixed 8-tick run phase by phase through the same exported functions `stepSimulation` composes, asserting every intermediate delta (construction/progress free; food = +prod − need; material = +stored; command = −cost iff accepted; upkeep = −min(stock, due)) and proving the replay identical to the real path. Two hand-model surprises were resolved as intended rule interactions, not bugs: (1) same-tick stored inflow financing construction (phase 8a after production); (2) `stored` as a state query describes next-tick inflow. Stocks never negative across all scenarios.

## N. Determinism

Test I1: identical 16-row trajectory + identical hash across runs. All scenario tables are exact-equality assertions.

## O. Persistence

Test J1: save/load mid-bootstrap (road under construction) → identical hash → 5 continued ticks identical (M39 both). SAVE_VERSION = 4, no new fields.

## P. Browser Verification

Re-ran `e2e/roadRun.mjs` (NOVA_ROAD_MODE=headless) against the current build: ROAD E2E RESULT: ALL PASS (A–G + zero console/page errors). The automated model corresponds to actual gameplay; no new UI was created for this audit. GPU: no new rendering work; hardware-GPU run still pending per 09H (environmental, unrelated).

## Q. Scope Audit

New: `tests/bootstrapEconomy.test.ts` (audit tooling, clearly marked, no runtime dependency — test-only, excluded from build). Modified: this doc (append-only). No `src/` change. `git status` shows exactly these two paths.

## R. Design Decision — classification: **B**

Bootstrap is reachable and coherent (A is true as far as it goes), but the audit finds significant deliberate pressures that must stay explicit rather than accidental, so **B — reachable but creates a deliberate economic pressure**:

1. Slow savings: +1/tick net below capacity → ~25 ticks per 25-cost building from equilibrium.
2. Roadless sink: −1 Material/−1 Food per tick punishes every tick of delay before the first road.
3. Food clock: ~97-tick runway forces Farm prioritization before tick ~100.

No gameplay change proposed (per §1 default rule). No correctness defect found (D rejected with evidence).

## S. Next Design Question

Is the Category-B pressure profile (slow savings + draining roadless state + food clock) the intended new-player experience, or should a future step soften exactly one of them — and if so, which, since §21 forbids assuming the answer (free road, subsidy, exception, cheaper cost, higher output) in advance? The trajectories above are the evidence base for that choice.

