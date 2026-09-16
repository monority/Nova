# NOVA — Product Project Architecture

## Project structure principle
Organize around stable product responsibilities rather than temporary feature names.

Recommended conceptual areas:
- world
- construction
- population
- services
- economy
- transport
- simulation/time
- persistence
- rendering
- UI

Actual repository structure takes precedence.

## Change policy
When implementing a step, touch the minimum number of areas necessary. If a cross-domain change is required, document the dependency explicitly.
