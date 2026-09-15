# NOVA — Game Design

## 1. Design Pillars

1. **Emergence over micromanagement** — the player establishes conditions; systems create the detailed city.
2. **Readable simulation** — every major outcome should have an understandable cause.
3. **Visual progression** — technological and demographic progress must visibly transform the city.
4. **Contemplation** — observing the simulation is a valid activity, not dead time.
5. **Deterministic worlds** — seeds and saved state should reproduce the same simulation.

## 2. Player Agency

The player controls five strategic levers:

- Territory: where development is permitted.
- Infrastructure: how districts connect.
- Priorities: which zones and services receive attention.
- Technology: which capabilities are researched.
- Policies: later-game rules that influence autonomous behavior.

The player does **not** manually place every generated house.

## 3. Game State

The canonical state contains:

```text
World
City
Population
Economy
Technology
Policies
Events
SimulationClock
```

UI state and renderer state are derived and must not become authoritative game state.

## 4. Progression

```text
Wilderness → Settlement → Village → Town → City → Metropolis → Autonomous Civilization
```

Progression is driven by population, infrastructure, resource stability and technology rather than a single arbitrary score.

## 5. Failure Philosophy

NOVA has no mandatory game-over loop in the initial design.

A civilization can experience:

- decline;
- depopulation;
- shortages;
- abandoned districts;
- technological stagnation.

Recovery remains possible unless a future scenario explicitly defines irreversible failure.

## 6. Player Feedback

Every major change should be visible through at least one of:

- geometry;
- movement;
- lighting;
- resource flow;
- timeline event;
- contextual statistic.

Avoid modal interruptions for routine simulation changes.

## 7. Difficulty

Initial sandbox:

- forgiving resource model;
- no hostile factions;
- no hard bankruptcy;
- no irreversible disasters.

Later scenarios can introduce stronger constraints without changing the simulation foundations.
