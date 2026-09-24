# NOVA — Step 10BS — Economic Decision Loop Audit

## Context

Step 10BR is complete and committed as `788dfd5`.

Its conclusion is important:

* workforce contention is a persistent pressure;
* Food/Water are coupled to workforce availability;
* population 3 and 5 expose vacant productive jobs;
* population 4 and 6 can recover a healthy productive mix;
* spatial variation did not materially change the controlled 5-worker result;
* manual reassignment changes the productive mix;
* Construction Crew creates a temporary productive-workforce trade-off;
* the existing placement/composition/manual-assignment/construction controls already give the player meaningful responses;
* Town remains unjustified and undefined.

Therefore, do **not** add another workforce mechanic.

The next question is now broader:

> **Does the current NOVA economy already produce meaningful decision loops, where one action creates a constrained future choice, or is the current economy mostly a sequence of locally obvious placements?**

This step is an audit and measurement step.

It must not invent a new mechanic merely to create an interesting decision.

---

# Objective

Measure several complete deterministic economic trajectories using the existing simulation rules.

The goal is to identify whether the current systems already create:

1. short-term trade-offs;
2. delayed consequences;
3. competing economic objectives;
4. meaningful spatial/composition decisions;
5. recovery decisions after a temporary disturbance;
6. situations where two valid player choices lead to materially different futures.

The central question is:

> **Does NOVA already have an economic decision loop worth building on?**

Do not answer this from intuition alone.

Measure it.

---

# Mandatory AUDIT

Before implementing anything:

Inspect:

* current resource production/consumption;
* workforce assignment;
* manual workplace assignment;
* Construction Crew;
* residence admission;
* Food balance;
* Water capacity/service;
* Material production;
* Storage reserve;
* construction costs;
* road costs;
* progression;
* existing deterministic test fixtures;
* 10BO, 10BP, 10BQ and 10BR reports.

Do not reopen their already-closed design questions.

Explicitly document the current causal chain:

`placement → operationalization → staffing → production → consumption → balance → construction/admission → next available choices`

Identify which parts are:

* immediate;
* delayed by construction;
* delayed by resource accumulation;
* constrained by workforce;
* constrained by Water;
* constrained by Food;
* constrained by Material.

---

# Important distinction

Do not confuse:

### A constraint

Example:

> "I cannot construct this building because I have only 20 Material."

with:

### A decision

Example:

> "I can construct either X or Y, and choosing X changes what I can afford or sustain later."

The audit is specifically looking for the second.

A system is not automatically interesting simply because it has scarcity.

---

# Trajectory fixtures

Create a small deterministic audit suite.

Prefer tests over player-facing scenarios.

Do not add these fixtures to the scenario catalogue.

At least the following trajectories must be measured.

---

## A — Growth-first trajectory

Starting from a valid early settlement:

1. expand housing;
2. admit population;
3. expand productive capacity;
4. continue toward the current progression boundary.

Measure at every relevant tick:

* population;
* Food;
* Water capacity;
* Water balance;
* Material;
* Material reserve/storage;
* workforce utilization;
* vacant workplaces;
* operational buildings;
* construction in progress;
* progression stage.

Determine whether growth creates a meaningful future constraint or merely increases numbers.

---

## B — Production-first trajectory

Starting from the same or equivalent initial state:

1. invest in productive capacity before expanding housing;
2. accumulate resources;
3. expand housing later;
4. compare the resulting trajectory against A.

Do not judge which trajectory is better.

Measure whether the two trajectories actually diverge in a meaningful way.

A meaningful divergence should be concrete, for example:

* different resource headroom;
* different workforce composition;
* different construction timing;
* different admission timing;
* different reserve state;
* different progression timing.

If they converge rapidly, record that.

---

## C — Food/Water composition trajectory

Use a population where workforce contention is already observable.

Construct two valid economic compositions with comparable total productive capacity but different Farm/Well ratios.

Measure:

* Food balance;
* Water capacity;
* workforce allocation;
* vacant workplaces;
* admission;
* time to recover from imbalance.

The purpose is not to determine an optimal ratio.

The purpose is to determine whether the ratio creates a meaningful downstream consequence.

---

## D — Material versus expansion trajectory

Create a situation where Material is constrained enough that the player can choose between at least two legitimate investments, using only existing buildings/roads.

For example:

* expand productive capacity;
* expand housing;
* build roads;
* construct another required building.

Do not add a new mechanic to create the choice.

Measure:

* immediate cost;
* delayed production;
* construction completion;
* resulting reserve;
* subsequent available choices.

If the current economy does not permit a genuine choice, record that rather than artificially manufacturing one.

---

## E — Construction interruption / recovery

Use Construction Crew to create a temporary reduction in productive workforce.

Measure:

* production before construction;
* production while the worker is assigned to construction;
* construction completion;
* staffing recovery;
* resource recovery;
* time until the colony returns to its previous state.

The question is whether temporary workforce diversion creates an actual planning decision or merely a predictable delay.

---

## F — Recovery trajectory

Start from a deterministic state with an existing economic imbalance that is recoverable under current rules.

Do not invent a new crisis mechanic.

Examples may include:

* temporarily low Food;
* temporarily low Water headroom;
* reduced productive staffing;
* low Material reserve.

Measure the sequence of actions available under the existing model and whether recovery requires an actual trade-off.

Again, do not judge the strategy.

---

# Required comparison method

For each trajectory, record a compact state timeline.

At minimum:

```text
tick
population
food
water
waterCapacity
material
materialReserve
staffedFarm
staffedWell
staffedWorkshop
vacantEligibleWorkplaces
constructionCount
progressionStage
```

Add only measurements that are causally useful.

Do not build a generic analytics framework.

---

# Decision-loop test

For each pair of trajectories, explicitly test:

### 1. Divergence

Do the trajectories produce materially different states?

### 2. Persistence

Does the difference survive for multiple ticks?

### 3. Causality

Can the difference be traced to the player's earlier choice?

### 4. Consequence

Does that difference change a later available action, timing, admission, construction, staffing or progression state?

### 5. Reversibility

Can the player recover by changing later choices?

### 6. Agency

Does the player actually have a meaningful choice at the point of divergence?

A trajectory that simply produces a different number but no downstream consequence should not be classified as a meaningful decision loop.

---

# Decision-loop classification

After measurements, classify each observed loop descriptively.

Possible categories:

### Local choice

An action changes immediate state but has little lasting consequence.

### Delayed consequence

An action produces a meaningful later state difference.

### Persistent trade-off

Choosing one valid direction materially constrains another direction for a sustained period.

### Recovery decision

A temporary disturbance creates a meaningful choice in how to return to equilibrium.

### No meaningful loop

The apparent choice either:

* converges immediately;
* has no downstream consequence;
* is mechanically forced;
* or can be reversed without meaningful cost.

These are analysis categories, not rankings.

Do not identify a "best" trajectory.

---

# Critical design question

At the end, answer:

> **What is the first genuinely meaningful economic decision NOVA already produces?**

If one exists, describe it precisely using:

* starting state;
* available choices;
* causal consequence;
* duration;
* affected systems;
* available recovery path.

If none exists, state that explicitly.

Do not add a mechanic simply because the audit found no decision.

---

# Town gate

Do NOT design Town in this step.

Instead determine whether the current economy has reached the point where a new progression stage would need a new decision layer.

Town should only become designable if the evidence demonstrates a concrete unresolved problem such as:

* existing choices stop producing meaningful consequences at larger scale;
* an existing economic loop cannot express a necessary settlement-management decision;
* current progression has no causal next step;
* the player reaches a stable equilibrium where expansion becomes mechanically trivial.

If none of those is demonstrated, Town remains undefined.

Do not introduce a population threshold.

Do not invent a Town mechanic.

Do not invent a new building to make Town possible.

---

# Implementation constraints

This is primarily an audit/measurement step.

Allowed:

* deterministic audit tests;
* narrow test helpers;
* measurement fixtures;
* roadmap documentation.

Not allowed:

* new gameplay mechanics;
* new resources;
* new buildings;
* new infrastructure;
* new workforce rules;
* workforce priorities;
* professions;
* logistics;
* new Storage behavior;
* new scenarios;
* progression changes;
* Town;
* UI changes;
* persistence changes;
* SAVE_VERSION changes.

Do not modify existing economic rules merely to make the trajectories more interesting.

If a trajectory cannot produce the intended choice under current rules, that is a valid result.

---

# Determinism

Representative trajectories must verify:

* repeated simulation equivalence;
* insertion-order equivalence;
* save/load equivalence where applicable.

No derived audit data may be persisted.

---

# Verification

Run:

1. focused Economic Decision Loop audit tests;
2. relevant workforce tests;
3. relevant resource/economy tests;
4. relevant progression tests;
5. typecheck;
6. lint;
7. build;
8. full Vitest;
9. `git diff --check`.

Do not fix unrelated pre-existing timeout failures.

If the existing unrelated timeout in:

`productionRatioTuningAudit.test.ts`

remains, report it separately.

Because this step must not modify UI/runtime/rendering:

> Browser/GPU validation is not required unless implementation unexpectedly changes UI/runtime/rendering code.

If UI/runtime changes become necessary, stop and reassess scope rather than silently expanding this step.

---

# Required final QA / bilan

Provide:

## 1. Audit

What authoritative systems were inspected.

## 2. Trajectories

List all measured trajectories.

## 3. Timeline results

Summarize the meaningful state differences.

## 4. Decision loops

For every detected loop, report:

* choice;
* consequence;
* duration;
* downstream effect;
* reversibility;
* player agency.

## 5. Non-loops

Explicitly document apparent choices that turned out not to matter.

This is important: do not inflate the report by calling every resource constraint a decision.

## 6. Economic conclusion

State whether the current economy has:

* local choices;
* delayed consequences;
* persistent trade-offs;
* recovery decisions;
* or mostly deterministic/convergent behavior.

## 7. First meaningful decision

Identify the earliest genuinely meaningful economic decision already supported by the current mechanics.

If none exists, say so.

## 8. Town gate

State whether Town design is now justified.

If yes:

* identify the concrete unresolved problem;
* do NOT design the solution.

If no:

* explain what evidence is still missing;
* identify the next justified step.

## 9. Regression safety

Confirm:

* workforce unchanged;
* resource rules unchanged;
* Storage unchanged;
* progression unchanged;
* scenarios unchanged;
* persistence unchanged;
* no new mechanics.

## 10. Verification

Report:

* focused tests;
* compatibility tests;
* full Vitest;
* typecheck;
* lint;
* build;
* diff check;
* browser/GPU status.

## 11. Commit

Commit the completed step with a clear message.

Working tree must be clean except for the pre-existing user-owned:

`docs/roadmap/Step10BO - Copy.md`

Do not modify, stage, delete or commit that file.

---

# Definition of done

Step 10BS is complete only when:

* at least six deterministic economic trajectories have been measured;
* growth-first and production-first trajectories are compared;
* Food/Water composition is measured;
* Material-versus-expansion pressure is measured where possible;
* Construction Crew interruption/recovery is measured;
* an existing recoverable imbalance is measured;
* trajectory divergence and convergence are explicitly analyzed;
* meaningful decisions are distinguished from mere scarcity;
* no gameplay mechanics are added;
* Town remains undefined unless evidence independently justifies opening its design;
* all applicable verification passes;
* a complete QA/bilan is written;
* the commit is created;
* the working tree is clean apart from the pre-existing user-owned copy file.

## Core principle

> **Do not add depth to the economy until we know where the existing economy stops producing meaningful decisions.**

Measure the decision loop first.

---

# Documentation (as-built)

## 1. Audit

Inspected the current placement, operationalization, staffing, production, consumption, admission, construction, reserve, progression, and persistence paths, plus the 10BR/10BQ findings.

The causal chain remains:

```text
placement → operationalization → staffing → production → consumption → balance → construction/admission → next choices
```

Immediate costs are building resources and current-tick upkeep. Construction delays production until a site becomes operational. Admission can be delayed by Food, Water capacity, housing, or the current production-headroom gate. Material reserve release and construction spending remain unchanged.

## 2. Fixtures

All fixtures are deterministic test-only states using seed `nova-step10bs`; no scenario catalogue entry was added.

- growth-first versus production-first from an equivalent 3-worker, 1F/2W settlement;
- Farm-heavy versus Well-heavy 5-worker compositions;
- Workshop versus housing investment under Material scarcity;
- 4-worker 2F/2W construction with and without a Construction Crew;
- 5-worker manual Farm/Well reassignment and reversal;
- repeated construction, save/load, and canonical-hash replay.

Each timeline records population, Food, Water, Water capacity/need, Material, reserve, staffed Farm/Well/Workshop, vacant workplaces, construction count, and progression stage.

## 3. Results

### Growth-first versus production-first

The two branches initially differed in construction type and immediate cost, but after eight ticks they converged to the same state: population 3, Food 91, Water 109, Water capacity 4, Material 100, 1 Farm plus 2 Wells staffed, no vacant productive workplace, and no construction. This is a **local choice**, not a persistent decision loop.

### Farm/Well composition

At five workers and six Farm/Well jobs, the Farm-heavy composition staffed 3 Farms and 2 Wells, while the Well-heavy composition staffed 2 Farms and 3 Wells. Both left one eligible job vacant, but Food production and Water capacity were different: the Farm-heavy branch had more Food and less Water capacity; the Well-heavy branch had the reverse.

The divergence persisted over the measured ticks and changed the next balance/admission conditions. This is a **persistent trade-off**. The player can reverse it through manual reassignment without changing the simulation rules.

### Material investment

Starting from three workers with 1 Farm, 1 Well, and 1 Workshop, the available 25 Material could be spent on either a second Workshop or a Residence. Both choices had the same immediate Material result and the same later vacancy count in this fixture: the existing workforce could not productively use the second Workshop, while the Water/production-headroom boundary did not make the Residence immediately useful.

This is a **constrained local choice**, not a meaningful delayed investment loop. The current economy does not yet provide two affordable investments with distinct downstream returns at this scale.

### Construction interruption and recovery

A 4-worker 2F/2W settlement had four staffed productive jobs before construction. Assigning one worker to a four-tick Residence site reduced productive staffing to three and left one eligible workplace vacant. The existing accelerated construction rule completed the site, released the crew, and automatic assignment restored all four productive jobs within the fixture's three-tick recovery window.

This is a **recovery decision**: the player chooses temporary production loss for faster construction, then receives a deterministic staffing recovery. It is meaningful but bounded and fully reversible.

### Manual reassignment

At five workers with three Farms and three Wells, moving the worker on the first Well to the third Farm changed the staffed mix and left a different Well vacant. Moving the same worker back restored the prior mix. This is a **persistent but reversible composition trade-off**, measured directly from existing manual assignment.

### Determinism

Repeated fixture construction, save/load, and canonical hash checks passed. No derived decision-loop data was persisted.

## 4. Decision-loop classification

- **Local choice:** growth-first versus production-first; Material investment under the current 3-worker constraint.
- **Persistent trade-off:** Farm-heavy versus Well-heavy composition; manual Farm/Well reassignment.
- **Recovery decision:** Construction Crew interruption followed by release and automatic staffing recovery.
- **No meaningful loop:** the tested growth/production investment comparison converged, and the tested Material choice did not produce distinct later returns.

The first genuinely meaningful existing economic decision is the Farm/Well workforce allocation at five workers: choosing which service receives the constrained worker changes Food and Water headroom, persists across ticks, affects later balance/admission conditions, and can be reversed through the existing manual assignment control.

## 5. Town gate

**Town design is not justified yet.**

The audit found real persistent tradeoffs and a recovery decision, but no unresolved settlement-management problem that current controls cannot express. Growth/production investment converged, the constrained Material choice did not create differentiated returns, and spatial pressure remained absent in the prior controlled measurement. No new progression layer or Town mechanic is justified.

The next justified step is further measurement of larger, mixed production/construction trajectories only if a concrete persistent divergence is found. Do not add professions, priorities, logistics, new resources, or Town by assumption.

## 6. Regression safety

- no gameplay mechanics changed;
- no workforce rules changed;
- no progression or resource rules changed;
- no Storage behavior changed;
- no scenarios added;
- no persistence or `SAVE_VERSION` changes;
- no UI or rendering changes.

## 7. Verification

- focused Economic Decision Loop audit: 6 PASS;
- relevant workforce/resource/progression compatibility tests: 75 PASS across the focused 10BR workforce/resource/progression set;
- typecheck: PASS;
- lint: PASS;
- build: PASS;
- full Vitest: 1,672 / 1,672 PASS;
- determinism: PASS in focused audit;
- insertion-order: PASS through existing focused suites and unchanged traversal semantics;
- save/load: PASS in focused audit;
- browser/GPU: not rerun; this step contains no UI, runtime, rendering, or player-facing changes;
- `git diff --check`: PASS.

## 8. Commit

`76aec6f` — Step 10BS: audit economic decision loops

