# NOVA — Construction

## 1. Construction Philosophy

The player establishes spatial rules; the simulation creates detailed structures.

## 2. Construction Categories

The MVP uses only residential zones, roads, one food source, one energy source and storage. All other categories below are post-MVP design space.

### Zones

- Residential
- Commercial
- Industrial
- Agricultural
- Civic
- Research
- Recreation
- Energy

### Infrastructure

- roads;
- bridges;
- water;
- power;
- transit;
- data network.

## 3. Zones

```ts
interface Zone {
  id: string
  type: ZoneType
  cells: CellId[]
  density: number
  priority: number
  growthRate: number
}
```

A zone defines a preferred land use, not a guaranteed building layout.

## 4. Roads

Road placement is a path-drawing interaction.

Required behavior:

- snap to existing roads;
- display preview;
- validate terrain;
- calculate construction cost;
- preserve connectivity.

## 5. Buildings

Building generation chooses from a type catalog and derives variations from a stable seed.

```text
Type
→ footprint
→ height
→ orientation
→ modules
→ lights
```

## 6. Building States

```text
PLANNED
UNDER_CONSTRUCTION
ACTIVE
UNDERUTILIZED
ABANDONED
```

## 7. Development Rules

A parcel can develop when:

- its zone allows the building type;
- it is accessible;
- required infrastructure exists;
- resources are available;
- demand exists.

The exact MVP eligibility, ordering, material cost and completion time are defined in [20-product-contract.md](./20-product-contract.md). Any future building type must define the same fields before implementation.

## 8. Upgrades

Buildings should evolve rather than always being demolished and replaced.

Example:

```text
House
→ Improved House
→ Dense Residence
→ Vertical Residence
```

Upgrades become more important in established districts.

## 9. Player Feedback

Placement preview must communicate:

- valid/invalid;
- estimated cost;
- affected cells;
- connection result.

Do not rely on color alone.

## 10. Undo

MVP should support undo for player construction commands where practical.

Simulation outcomes themselves are not individually undoable.
