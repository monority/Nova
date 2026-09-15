# NOVA — Economy

## 1. Resource Philosophy

The economy should communicate systems, not become an accounting simulator.

Initial resources:

```text
Food
Materials
Energy
Knowledge
Credits
```

The MVP exposes food, materials, energy and derived water access. Knowledge and credits are post-MVP placeholders and must not affect MVP growth or construction unless added through the change-control process in [20-product-contract.md](./20-product-contract.md).

## 2. Resource Flow

Every resource has:

```ts
interface ResourceState {
  stock: number
  capacity: number
  production: number
  consumption: number
}
```

## 3. Production

Production comes from buildings, land and technologies.

Example:

```text
Farm
→ Food

Mine
→ Materials

Power Plant
→ Energy

University
→ Knowledge
```

## 4. Consumption

Consumption is driven by:

- population;
- buildings;
- infrastructure;
- technology level.

## 5. Balance

```text
balance = production - consumption
```

Negative balance does not immediately cause collapse.

Use thresholds and persistence.

The MVP resource quantities, storage behavior and shortage effects are defined in [20-product-contract.md](./20-product-contract.md). This avoids introducing undocumented economy rules through individual building implementations.

## 6. Shortages

A shortage should propagate:

```text
Energy shortage
→ infrastructure degradation
→ lower production
→ lower employment
→ lower satisfaction
```

The chain should remain bounded and recoverable.

## 7. Credits

Credits are an abstract construction/economic capacity.

Avoid introducing taxes, debt, interest rates and complex markets in the MVP.

## 8. Storage

Storage has capacity.

Overflow can be wasted initially.

Later technologies can improve storage efficiency.

## 9. Economic UI

The player should see:

- current stock;
- production;
- consumption;
- trend;
- projected balance.

Historical graphs can be added after the simulation is stable.

## 10. Deterministic Economy

Given identical world state and tick sequence, resource results must be identical.
