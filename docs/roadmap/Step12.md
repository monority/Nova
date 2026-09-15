# NOVA — Step 12
# Urban Density & Building Evolution

## Objective

Introduce the first real form of urban densification.

Until now, NOVA can:

- create residential buildings
- create farms
- grow population
- consume/produce food
- create zones
- evaluate development pressure
- use road accessibility
- extend roads autonomously
- classify road networks

The next step is to make the existing city evolve spatially.

A city should no longer only grow by adding more identical houses.

It should progressively transform some residential structures into denser structures when the simulation creates enough pressure.

The intended progression is:

```text
empty land
    ↓
house
    ↓
dense housing
    ↓
apartment / urban block

Do not solve the whole city-builder yet.

Make the existing simulation capable of transforming its own built environment.