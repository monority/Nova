# NOVA — Step 07B — Jobs / Workplace Design Contract

## Context

Step 07A is COMPLETE.

The audit established that the next documented gameplay layer is:

```text
Workplace
→ Job capacity
→ Colonist assignment
→ Labor
→ Economic output
```

The repository documentation points to Jobs / Work as the next layer:

* `docs/21-progression.md`
* `docs/26-roadmap.md`
* `docs/09-economy-foundation.md`
* `docs/11-time-and-events.md`
* `docs/07-population.md`

Step 06B already established the first complete food loop:

```text
Residence
→ Colonist
→ Food consumption
→ Food shortage
→ Farm
→ Food production
→ Colony sustainability
```

Current important semantics:

```text
applyCommand
→ advanceConstruction
→ updateNeeds
→ produceFood
→ consumeFood
→ updatePopulation
→ advanceTime
```

Farm currently:

* construction cost = 25 material;
* construction = 2 ticks;
* operational Farm = +2 food/tick;
* worker-independent;
* produces with zero colonists;
* no stock cap;
* multiple Farms add deterministically.

**Farm semantics MUST NOT be changed by this step.**

Step 07A also found one existing UX issue:

> Food forecast currently ignores production and can display a finite number of ticks even when net food is positive.

That is a separate small correction and should be specified here so it can be implemented before or alongside Jobs.

---

# 0. Objective

Create the authoritative **Jobs / Workplace Design Contract**.

This is a DESIGN-ONLY step.

Do not implement Jobs.

Do not modify simulation code.

Do not add tests except temporary investigation probes if absolutely necessary; delete them before completion.

The output must be precise enough that the next implementation step can be executed without inventing gameplay semantics.

---

# 1. Read authoritative documentation

Read:

* `docs/00-CMD.md`
* `docs/02-game-design.md`
* `docs/03-core-loop.md`
* `docs/07-population.md`
* `docs/08-economy.md`
* `docs/09-economy-foundation.md`
* `docs/11-time-and-events.md`
* `docs/20-strategy.md`
* `docs/21-progression.md`
* `docs/26-roadmap.md`
* `docs/29-design-rules.md`

Then search the repository for all references to:

```text
job
jobs
work
worker
workplace
employment
labor
labour
income
production
assignment
capacity
construction material
```

Do not assume the exact meaning from the word "Jobs".

Extract every explicit rule already defined by the repository.

Where documentation is silent, mark the item as:

```text
OPEN DESIGN DECISION
```

Do not silently invent a rule.

---

# 2. Preserve the existing Farm contract

This is a hard constraint.

The design must explicitly state:

```text
Farm remains worker-independent.
Farm output remains +2 Food per operational Farm per tick.
Farm production remains valid with zero colonists.
Farm production semantics are not revised by Jobs.
```

Do not introduce:

```text
Farm requires worker
Farm has worker slots
Farm production depends on worker efficiency
Farm output changes based on employment
```

unless an authoritative document explicitly requires it.

If a future document suggests worker-dependent production, record that as a future design conflict requiring an explicit revision.

Do not solve that conflict here.

---

# 3. Define the workplace concept

Determine whether the first workplace should be:

* a new concrete building;
* an existing building repurposed as a workplace;
* a special property of an existing building;
* or another documented concept.

Do not invent a workplace name if the documentation already specifies one.

If documentation does not define one, choose the smallest concrete concept necessary to create the Jobs loop and clearly label the choice as a design decision.

Define:

```text
Workplace:
- identity
- building type
- construction cost
- construction duration
- operational condition
- job capacity
```

Do not introduce a generic workplace framework unless there is already a second concrete use case requiring it.

---

# 4. Define job capacity

Specify exactly how many workers one workplace can employ.

The rule must be deterministic.

Examples of acceptable forms:

```text
1 workplace = 1 job
```

or:

```text
job capacity = fixed value from building catalog
```

Do not introduce:

* dynamic staffing;
* efficiency;
* skill levels;
* upgrades;
* worker quality;
* morale;
* happiness;
* commute distance.

Those are outside this step unless explicitly required by documentation.

---

# 5. Define colonist employment state

The current colonist is:

```text
ColonistState = {
  id,
  residenceId
}
```

Define the minimum additional state required.

Prefer the smallest representation.

Possible direction:

```text
employment:
  unemployed
  employed(workplaceId)
```

But do not assume this exact representation if another simpler canonical representation is better.

Answer:

* Can a colonist have at most one job?
* Can a colonist be unemployed?
* Can a workplace employ multiple colonists?
* Can a colonist work at the same building as their residence?
* Can employment exist while a workplace is under construction?
* Does employment require the workplace to be operational?

The expected answer should be deterministic and explicit.

---

# 6. Define assignment order

This is mandatory.

`docs/29-design-rules.md` / `docs/20-strategy.md` may already constrain deterministic ordering.

Determine the canonical assignment algorithm.

It must define:

1. order of colonists;
2. order of workplaces;
3. whether IDs are ascending;
4. whether existing employment is preserved;
5. how vacancies are filled;
6. what happens when there are more colonists than jobs;
7. what happens when there are more jobs than colonists.

Prefer a deterministic rule based on canonical IDs.

Example shape only:

```text
1. Preserve valid existing assignments.
2. Sort unemployed colonists by ID ascending.
3. Sort available workplaces by ID ascending.
4. Fill vacancies in ascending workplace order.
```

Do not adopt this example unless supported by the design.

---

# 7. Define labor output

This is the central unresolved design question from Step 07A.

The first Jobs loop must answer:

```text
What does one employed colonist produce?
```

The repository currently has one useful economic sink/output:

```text
construction material
```

The initial material stock is finite and currently limits the colony.

Determine whether the first Jobs loop should be:

```text
Colonist
→ Job
→ Labor
→ Construction Material
```

If documentation supports this, define the exact deterministic output.

For example:

```text
1 employed colonist = +N construction material / tick
```

The exact `N` must be justified by:

* existing game-design ratios;
* existing resource costs;
* pacing;
* deterministic playability.

Do not choose a value arbitrarily.

If no existing documentation specifies the number, perform a small quantitative pacing analysis using the existing:

* Residence cost = 25;
* Farm cost = 25;
* initial Material = 100;
* construction duration = 2 ticks;
* Food consumption = 1 / colonist / tick;
* Farm production = 2 Food / tick.

Then propose the smallest coherent value and explain the resulting early-game loop.

Do not implement it.

---

# 8. Define material production semantics

Specify:

* whether labor directly creates construction material;
* whether labor is an intermediate stored value;
* whether material is produced directly;
* whether production happens every simulation tick;
* whether workers produce while the colony has zero Food;
* whether workers produce while their workplace is operational;
* whether production is capped;
* whether multiple workers add linearly.

Avoid introducing a separate `LaborStock` unless documentation explicitly requires stored labor.

Prefer:

```text
employed colonists
→ direct construction material output
```

if that is sufficient.

---

# 9. Define tick ordering

The current simulation has:

```text
applyCommand
→ advanceConstruction
→ updateNeeds
→ produceFood
→ consumeFood
→ updatePopulation
→ advanceTime
```

Jobs must be inserted deliberately.

Determine whether the intended order is:

```text
...
→ updatePopulation
→ assignJobs
→ produceLaborOutput
→ ...
```

or another order.

Answer explicitly:

### New colonist

If a colonist is admitted on tick N:

* can they receive a job on tick N?
* can they produce on tick N?
* or only beginning tick N+1?

### Newly operational workplace

If a workplace becomes operational on tick N:

* can it receive workers on tick N?
* can those workers produce on tick N?
* or only from N+1?

### Starvation

If starvation occurs on tick N:

* are employment assignments removed immediately?
* does labor production occur before or after starvation?
* can starving colonists produce on the same tick they are removed?

The design must eliminate ambiguity.

---

# 10. Workplace failure / destruction

Even if destruction is not currently implemented, define the invariant for future-safe behavior.

If an employed workplace becomes unavailable:

```text
worker assignment must not reference an invalid workplace
```

Determine whether the assignment should be removed immediately or reconciled on the next simulation phase.

Do not implement destruction.

Do not add a destruction system.

---

# 11. Population / housing interaction

Define the relationship between:

```text
housing capacity
job capacity
colonist count
employment
```

At minimum explain:

```text
colonists <= housing capacity
employed colonists <= total job capacity
```

Determine whether unemployed colonists are valid.

The likely minimum model is:

```text
housing creates colonists;
workplaces create jobs;
jobs do not create colonists.
```

Do not introduce automatic population growth beyond the existing food/housing admission mechanism.

---

# 12. Economic loop

Produce the complete first Jobs loop.

It should be expressible as a causal chain such as:

```text
Residence
→ Colonist
→ Workplace
→ Employment
→ Construction Material
→ More Buildings
```

Then identify the limiting factors.

For example:

```text
Food limits population sustainability.
Housing limits population capacity.
Workplaces limit employment.
Material limits construction.
Labor increases material.
```

Do not add money/income/demand unless the documentation requires it at this stage.

---

# 13. Check for degenerate loops

Analyze whether the proposed Jobs mechanic creates any pathological behavior.

At minimum check:

### Infinite construction loop

Can workers generate unlimited buildings forever?

If yes, is that acceptable at this stage?

### Free growth

Can material production indirectly create unlimited colonists without food pressure?

### Food interaction

Can employment somehow bypass the existing Food rules?

### Zero-population economy

Can workplaces generate material with zero workers?

### Workerless workplace

Can an operational workplace produce without assigned workers?

### Job spam

Can jobs exist without an actual workplace?

The answers must be explicit.

---

# 14. Food forecast correction

Step 07A identified one concrete issue:

Current forecast is:

```text
food / consumption
```

and ignores production.

This becomes misleading when:

```text
production >= consumption
```

Define the corrected semantic.

Minimum expected behavior:

```text
population = 0
→ forecast = null / N/A

population > 0
and production < consumption
→ finite ticks remaining based on net food loss

production >= consumption
→ sustainable / ∞ / equivalent non-finite representation
```

Choose one representation consistent with the existing UI.

Important:

* forecast remains derived;
* not persisted;
* not hashed;
* no new simulation state;
* no generic forecasting framework.

Specify exact formula and UI wording.

---

# 15. Persistence and hashing

Determine the minimum persistence impact.

If ColonistState gains employment data:

* save format changes;
* SAVE_VERSION impact must be specified;
* old saves behavior must be defined;
* canonical hash must include employment;
* deterministic serialization order must remain explicit.

Do not implement migration.

If migration is not documented, specify explicit rejection rather than inventing migration semantics.

---

# 16. UI contract

Define the minimum UI needed to make Jobs causally understandable.

Do NOT redesign the HUD.

The player should be able to understand:

```text
Colonists
Jobs
Employed
Unemployed
Material production
```

Decide whether the minimum UI should include:

* population count;
* employed count;
* available jobs;
* workplace inspection;
* material production per tick;
* causal status message.

Do not add dashboards.

Do not add generic notifications.

The UI contract should be the smallest set required for first-time-player comprehension.

---

# 17. Playability acceptance criteria

Before implementation, define a future browser scenario.

The eventual implementation should be able to demonstrate:

```text
1. Start fresh.
2. Build housing.
3. Admit colonist.
4. Build workplace.
5. Workplace becomes operational.
6. Colonist becomes employed.
7. Material production becomes visible.
8. Material increases deterministically.
9. Player can understand why material increased.
10. Additional construction becomes possible because of labor.
```

Also define a failure case:

```text
More colonists than jobs
→ some colonists remain unemployed.
```

And:

```text
More jobs than colonists
→ vacancies remain.
```

The future E2E must use real browser interactions, not direct simulation mutation.

---

# 18. No implementation

Do NOT modify:

* domain code;
* application code;
* renderer;
* HTML;
* CSS;
* tests;
* E2E;
* persistence.

The only acceptable changes are temporary investigation artifacts, which must be removed before completion.

---

# 19. Final report

Return:

# Step 07B — COMPLETE / PARTIAL / BLOCKED

## 1. Authoritative documented rules

## 2. Explicit design decisions

## 3. Open decisions

There should be no unresolved decision that blocks implementation.

## 4. Workplace contract

Include exact:

* building;
* cost;
* construction duration;
* operational condition;
* job capacity.

## 5. Employment contract

Include:

* colonist state;
* assignment;
* deterministic assignment order;
* vacancy behavior.

## 6. Labor/output contract

Include exact:

* worker output;
* output resource;
* output timing;
* multi-worker behavior;
* zero-worker behavior;
* caps.

## 7. Tick-order contract

Show the complete resulting phase order.

## 8. Population / food / jobs interaction

## 9. Degenerate-loop analysis

## 10. Forecast correction contract

## 11. Persistence/hash contract

## 12. Minimal UI contract

## 13. Future E2E/playability acceptance criteria

## 14. Scope integrity

Confirm no implementation changes remain.

## 15. Validation

Report:

* tests;
* typecheck;
* lint;
* build;
* browser probe if performed;
* visual inspection only if actually performed.

## Final decision

Return exactly one of:

```text
READY FOR IMPLEMENTATION
```

or

```text
BLOCKED — <specific unresolved design question>
```

Do not implement anything in Step 07B.

