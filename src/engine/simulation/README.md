# Simulation Runtime

The runtime converts real elapsed time into deterministic fixed simulation ticks. It owns browser loop integration, accumulator limits and catch-up policy; it does not own gameplay rules.

The default policy bounds each frame delta to 250 ms and processes at most 120 ticks per update. Whole overdue ticks beyond that budget are discarded and exposed through `SimulationRuntimeMetrics.droppedSimulationTicks` rather than silently hidden.
