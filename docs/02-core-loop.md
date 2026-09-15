# NOVA — Core Loop

## 1. Primary Loop

```text
Observe → Plan → Build → Advance Time → Evaluate → Adapt → Research → Observe
```

The loop must work even when the player spends most of a session watching rather than clicking.

## 2. Early Game

```text
Choose world
→ establish settlement
→ connect water/food
→ build first homes
→ advance time
→ population grows
```

The first meaningful success should happen quickly.

## 3. Mid Game

```text
Zone districts
→ connect roads
→ balance resources
→ expand employment
→ research
→ respond to congestion
```

## 4. Late Game

```text
Automate
→ define policies
→ monitor systems
→ intervene selectively
→ observe emergent development
```

## 5. Time Controls

Required:

- Pause
- 1×
- 2×
- 5×
- 20×

Simulation uses a fixed timestep internally. Rendering remains frame-rate independent. A 100× mode is post-MVP and requires a passing performance benchmark before it can be exposed.

## 6. Meaningful Decisions

A decision is useful when it changes future behavior.

Good:

- placing a road changes accessibility;
- zoning a district changes construction pressure;
- researching electricity changes energy options.

Bad:

- clicking a button solely to increment a counter.

## 7. Moment-to-Moment Experience

The player alternates between:

- strategic placement;
- short observation periods;
- contextual interventions;
- longer accelerated simulation periods.

The UI must make it obvious when the city is doing work without player input.
