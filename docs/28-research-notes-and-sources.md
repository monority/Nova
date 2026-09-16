# NOVA — Research Notes & Sources

The goal of this document is not to copy other games. It records useful established simulation patterns that support NOVA's foundation.

## OpenTTD
OpenTTD documents explicit relationships between towns, buildings, population, cargo, roads, industries and growth. Town population is derived from buildings/inhabitants; towns can expand roads and then construct buildings; cargo is produced and accepted by agents; economy settings include growth, production, infrastructure maintenance and timekeeping. These are useful references for causal simulation design. citeturn0search1turn0search4turn0search5turn0search0

## Design conclusions for NOVA
These sources support several general principles:

1. **Population should connect to physical settlement capacity.**
2. **Production and consumption should be explicit flows.**
3. **Infrastructure can influence growth and accessibility.**
4. **Time should be an explicit simulation concept.**
5. **Maintenance and operating constraints can become meaningful economic sinks later.**
6. **Road/network structure can be generated or extended as a consequence of settlement growth.**

These are design references, not requirements to reproduce OpenTTD mechanics.

## Future research targets
Before implementing advanced systems, research can be added for:
- Cities: Skylines / Cities: Skylines II service and traffic abstractions
- Anno production chains and workforce dependencies
- Frostpunk needs, heat and workforce pressure
- Banished / Foundation population and production loops
- Workers & Resources: Soviet Republic logistics and production chains
- RimWorld agent needs and emergent behavior

When a mechanic becomes important, document the relevant source and extract the general principle rather than copying a game's implementation.
