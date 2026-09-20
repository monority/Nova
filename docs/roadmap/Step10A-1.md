STOP — DO NOT EXECUTE THE CURRENT Step10A PROMPT.

The current `docs/roadmap/Step10A.md` contains a design drift that must be corrected before any implementation.

## Problem

The current document turns Food into a road-gated distribution/logistics system:

* Farm production gated by road access;
* residential food access gated by shared road network;
* isolated residences exempt from food consumption;
* food effectively transported through the road network;
* distance deferred as a future food distribution constraint.

This is NOT the intended Step 10A design.

It would prematurely extend the transport system after Step 09N explicitly concluded:

> transport remains minimal infrastructure; do not deepen it yet; return to the main roadmap.

It also conflates Phase 3 — Needs with later transport/logistics dependencies.

## Required correction

Rewrite `docs/roadmap/Step10A.md` before execution.

The correct Step 10A mission is:

# Step 10A — First Need: Food Security

Food is the first explicit population need.

The causal chain is:

```text
population
    ↓
food need
    ↓
food stock availability
    ↓
food consumption
    ↓
satisfied / shortage
    ↓
existing deterministic population consequence
```

## Food must remain independent of transport

For Step 10A:

```text
Farm production
    X road access

Food consumption
    X road access

Food need
    X road network

Residence food availability
    X mobility

Food satisfaction
    X Workshop network

Food shortage
    X transport
```

Do NOT introduce any food logistics system.

Do NOT make Farms require roads.

Do NOT make residences share a road network with Farms.

Do NOT exempt isolated residences from food need.

Do NOT introduce a food travel distance.

Do NOT introduce a future food distance cap as part of this step.

## Preserve existing Food mechanics

First audit the existing implementation.

Determine exactly:

* where Food is stored;
* current Farm production rule;
* current consumption rule;
* current population consequence;
* current tick ordering;
* existing starvation tests;
* existing bootstrap behavior.

Reuse the existing rules wherever possible.

Do not duplicate Food logic.

Do not change Food coefficients unless the audit proves a real inconsistency.

## First need contract

Formalize:

```text
foodNeed =
    colonistCount × existing food need coefficient
```

Then:

```text
foodConsumed =
    min(foodStockBeforeConsumption, foodNeed)
```

and:

```text
foodShortage =
    foodNeed - foodConsumed
```

with:

```text
foodStock >= 0
foodConsumed >= 0
foodShortage >= 0
foodConsumed <= foodNeed
foodConsumed <= foodStockBeforeConsumption
```

Food satisfaction is:

```text
foodConsumed === foodNeed
    → SATISFIED

foodConsumed < foodNeed
    → SHORTAGE
```

Use the existing population consequence for shortage if one already exists.

Do not create a second starvation mechanism.

## Important distinction

The fact that Food is a resource does NOT automatically mean Food needs logistics.

Phase 3 asks:

> What happens when colonists cannot satisfy a need?

It does not yet ask:

> How does food physically travel through the settlement?

That belongs to a later production/transport dependency if the simulation eventually demonstrates that it is needed.

## Road independence test

Explicitly test:

### Scenario A

Farm without road + colonists.

Food production must follow the existing Farm rule.

### Scenario B

Same Farm + road.

Food behavior must not change merely because the road exists.

### Scenario C

Residence isolated from every road.

The colonist still has a Food need.

### Scenario D

Same residence connected to roads.

Food need must be identical.

### Scenario E

Same Food stock, different road topology.

Food satisfaction must be identical.

These tests are specifically intended to prevent accidental transport coupling.

## Keep transport out of Step 10A

Do not modify:

* road domain;
* mobility;
* employment mobility;
* road access;
* network connectivity;
* road distance;
* transport queries.

Existing transport tests must continue to pass unchanged.

## No generic Need framework

Do not create:

```text
NeedSystem
NeedManager
NeedRegistry
NeedDefinition
GenericSatisfactionEngine
Need[]
```

One concrete need is sufficient.

Food should remain explicit until a second need proves that an abstraction is justified.

## Scope

Allowed:

* `docs/roadmap/Step10A.md`;
* focused Food/domain implementation if the audit identifies a real missing rule;
* focused Food tests;
* Food-related E2E/debug instrumentation where required.

Not allowed:

* road changes;
* mobility changes;
* transport changes;
* logistics;
* food distribution;
* food distance;
* congestion;
* vehicles;
* transit;
* road upkeep;
* new generic Need architecture.

## Documentation

Rewrite the existing untracked `docs/roadmap/Step10A.md`.

Do not delete the useful audit material blindly.

Preserve useful observations where applicable, but remove the road-gated Food design.

The final document must clearly contain:

```text
## Audit
## Existing Food Rules
## Design Decision
## Food Need Contract
## Satisfaction
## Shortage
## Population Consequence
## Tick Ordering
## Implementation
## Tests
## E2E
## Persistence
## Determinism
## Gameplay Result
## Known Limitations
## Deferred
## As-Built
```

## Important

Do not implement anything yet.

First rewrite the document and report:

1. what was wrong with the previous Step10A design;
2. what was removed;
3. what the corrected design now says;
4. which existing Food rules will be reused;
5. what remains to audit before implementation.

Leave the working tree with only the corrected untracked `docs/roadmap/Step10A.md`.

Do NOT commit yet.

Do NOT modify `src/`.

