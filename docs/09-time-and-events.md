# NOVA — Time, Events & History

## 1. Time

Simulation time is separate from real time.

```text
1 simulation tick
→ 1 simulation day
→ 30 ticks per month
→ 360 ticks per year
```

Years are derived from days.

## 2. Time Controls

```text
Pause
1×
2×
5×
20×
```

100× is post-MVP and may only be enabled after the performance gate passes.

## 3. Day / Night

Day/night affects:

- lighting;
- building windows;
- roads;
- energy visualization;
- ambient atmosphere.

It should not initially change the simulation dramatically.

## 4. Seasons

Optional post-MVP system.

Seasons can later influence:

- agriculture;
- energy demand;
- visual appearance.

## 5. Events

Events are generated from state and thresholds where possible.

Examples:

- first settlement;
- population milestone;
- resource shortage;
- technology discovery;
- major infrastructure project.

Every causal event receives a stable ID derived from the simulation tick, event type and source entity. Events are deduplicated within their threshold window and stored only when historically relevant.

## 6. Event Causality

Prefer:

```text
state change
→ event condition
→ historical event
```

over:

```text
random popup
→ arbitrary consequence
```

## 7. Historical Timeline

Events have:

```ts
interface HistoricalEvent {
  id: string
  time: number
  type: string
  title: string
  data: Record<string, unknown>
}
```

## 8. Milestones

Important milestones include:

- first house;
- first road;
- first 100 residents;
- first town;
- first power plant;
- first research institution;
- first autonomous system.

## 9. Replayability

The same world seed should support different histories because player commands change the state.

## 10. Observation Mode

At any time the player can hide most UI and watch the city.

This is a first-class experience, not merely a screenshot mode.
