# NOVA — Testing Strategy

## 1. Testing Priorities

The most valuable tests cover deterministic simulation behavior.

## 2. Unit Tests

Test:

- population growth;
- migration;
- resource production;
- consumption;
- housing capacity;
- technology prerequisites;
- zone validation;
- road connectivity;
- world generation;
- seeded randomness.

## 3. Property / Invariant Tests

Examples:

```text
population >= 0
resource.stock >= 0
technology prerequisites are satisfied
building positions are valid
```

Where practical, use generated inputs to test invariants.

## 4. Integration Tests

Example:

```text
Place residential zone
→ build road
→ provide energy
→ advance time
→ housing appears
→ population grows
```

## 5. Determinism Tests

Given:

```text
same seed
same initial state
same commands
same number of ticks
```

the resulting serialized state must be identical.

The comparison includes the PRNG state, command log ordering, simulation tick and canonical state hash. The required 100-tick save continuation test is part of the MVP acceptance gates.

## 6. Save Tests

```text
Create state
→ save
→ reload
→ compare state
```

Then advance both states and compare again.

## 7. Rendering Tests

Do not make unit tests depend on pixel-perfect screenshots.

Test renderer contracts and selected visual smoke cases.

## 8. E2E

Minimum Playwright scenario:

```text
Launch
→ create world
→ place zone
→ build road
→ advance time
→ observe growth
→ save
→ reload
```

## 9. Performance Tests

Keep a representative benchmark world.

Track:

- average tick time;
- worst tick;
- frame time;
- memory.

Use the reference device and p95 budgets in [20-product-contract.md](./20-product-contract.md). Test WebGL2 as the baseline and treat WebGPU as an optional backend with the same contract.

## 10. Validation and Accessibility

Add tests for:

- rejected malformed saves without active-state mutation;
- migration from each supported save version;
- keyboard access to every MVP control;
- visible focus and contrast of UI controls;
- reduced motion and reduced bloom settings;
- throttled canvas status updates for assistive technology.

## 10. Test Philosophy

Tests should protect behavior and architecture.

Avoid tests that merely reproduce implementation details.
