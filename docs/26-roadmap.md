# NOVA — Roadmap

The roadmap is a dependency graph, not a checklist of unrelated features.

## Phase 0 — Foundation reset

- audit current repository;
- establish canonical state;
- establish domain/application/rendering boundaries;
- remove accidental duplication;
- preserve useful infrastructure;
- lock determinism and verification rules.

## Phase 1 — Housing → Colonist

```text
house
→ construction
→ operational
→ housing capacity
→ colonist
→ residence
```

## Phase 2 — Time / simulation progression

Make tick progression explicit and observable. Ensure repeated runs produce identical state.

## Phase 3 — Needs

Introduce **one need** with a complete causal chain. Prefer one that can later connect naturally to production.

## Phase 4 — First production flow

```text
producer
→ output
→ availability/storage
→ household consumption
→ shortage consequence
```

## Phase 5 — Additional essential service

Introduce another service only when the first flow is stable and the new dependency adds meaningful simulation pressure.

## Phase 6 — Work

```text
workplace
→ job capacity
→ colonist assignment
→ labor
→ production
```

## Phase 7 — Money / affordability

```text
work
→ income
→ expenditure
→ affordability
```

Only introduce money if it creates meaningful decisions rather than UI accounting.

## Phase 8 — Production economy

Inputs → production → outputs → consumption.

## Phase 9 — Transport

Network → accessibility → movement/logistics.

## Phase 10 — Settlement growth

Demand and available capacity drive spatial development.

Roads may become an emergent consequence of growth, but transport simulation should not be implemented prematurely.

## Phase 11 — Vehicles / advanced mobility

Vehicles appear only when transport demand and network rules justify them.

## Phase 12 — Technology / specialization

Technology should solve real constraints or unlock meaningful new causal relationships.

## Phase 13+ — Original systems

Only after the foundation is stable should NOVA pursue deeper specialization, unusual mechanics or broader simulation complexity.

## Rule

If a future feature cannot be connected to an existing causal dependency, it remains deferred.
