# NOVA — Population

## 1. Population Model

The simulation uses aggregated demographic groups.

```ts
interface PopulationGroup {
  population: number
  housingNeed: number
  foodNeed: number
  energyNeed: number
  transportNeed: number
  employmentRate: number
  satisfaction: number
}
```

## 2. Population Lifecycle

```text
Birth
→ childhood
→ working age
→ older age
→ death
```

The MVP may model this through aggregate rates rather than explicit age cohorts.

## 3. Migration

Migration responds to differences in:

- housing availability;
- employment;
- satisfaction;
- safety;
- infrastructure.

Migration must have inertia so population does not oscillate unrealistically.

## 4. Housing

Housing provides capacity.

```text
housingCapacity
-
population
=
availableHousing
```

Persistent shortage increases dissatisfaction and can slow growth or trigger migration.

## 5. Employment

Jobs come from buildings and economic sectors.

Employment affects:

- income/credits;
- satisfaction;
- production;
- migration.

## 6. Needs

The MVP models housing, food, energy and network access. Water, transport, health, education and employment remain extension points; they must not silently affect MVP growth until their production and failure rules are specified.

Initial needs:

- housing;
- food;
- water;
- energy;
- transport;
- health;
- education;
- employment.

Each need is normalized to `[0, 1]`.

## 7. Satisfaction

A weighted average produces overall satisfaction.

Weights should be configurable and tested.

For the MVP, wellbeing weights and the population-change clamp are fixed by [20-product-contract.md](./20-product-contract.md), not by UI configuration.

## 8. District Identity

Districts acquire derived identities from dominant characteristics.

Examples:

- residential;
- industrial;
- academic;
- commercial;
- civic;
- technological.

Identity can later influence architecture and behavior.

## 9. Population Scale

Population numbers are abstract.

A displayed population of 100,000 does not imply 100,000 simulated agents.

This is essential for performance and for keeping the game focused on civilization-level behavior.
