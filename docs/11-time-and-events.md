# NOVA — Time & Events

## Time
Simulation time must be deterministic and independent from render frame rate.

Conceptually:

`real time → simulation clock → fixed/controlled ticks → state transitions`

## Tick responsibilities
A future tick can process domains in a stable order:
1. commands
2. construction/infrastructure
3. service capacity
4. agent needs
5. consumption
6. employment/production
7. economy
8. movement/transport
9. population changes
10. derived metrics
11. snapshot/render state

The exact order can evolve, but it must be explicit and deterministic.

## Events
Events should represent meaningful state transitions, not every frame-level mutation.

Examples:
- HouseCompleted
- ColonistArrived
- ServiceDepleted
- JobStarted
- ProductionCompleted
