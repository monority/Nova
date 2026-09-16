# NOVA — Design & Engineering Source of Truth

This directory is the **single design foundation for NOVA**.

It supersedes the previous fragmented documentation packs by merging their product, simulation, architecture, UX, rendering, persistence, testing and agent-workflow rules into one coherent hierarchy.

## 1. How to read this documentation

### Always read first

1. `00-CMD.md` — non-negotiable project rules and agent contract.
2. `23-product-contract.md` — what a healthy NOVA must preserve.
3. `29-design-rules.md` — design invariants.
4. `30-architecture-foundation.md` — canonical architecture and dependency direction.
5. `31-determinism-and-verification.md` — determinism and mandatory verification.
6. `25-mvp.md` — current MVP boundary.
7. `26-roadmap.md` — progression and dependency order.

### Then read the documents relevant to the task

| Concern | Documents |
|---|---|
| Product | `01`, `02`, `03`, `19`, `23`, `25`, `26`, `29` |
| World | `04`, `05` |
| Simulation | `03`, `04`, `11`, `21`, `22`, `30`, `31` |
| Population | `06` |
| Construction | `06` |
| Economy | `07`, `08`, `09`, `20` |
| Technology | `10` |
| Visual / UX | `12`, `13`, `19` |
| Rendering | `14` |
| Technical architecture | `15`, `24`, `30` |
| Performance | `16` |
| Persistence | `17`, `18` |
| Accessibility | `19` |
| Research | `28` |
| Agent work | `27`, `31` |

## 2. Documentation hierarchy

When documents appear to conflict, use this order:

```text
00-CMD.md
    ↓
23-product-contract.md
    ↓
29-design-rules.md
    ↓
30-architecture-foundation.md
    ↓
31-determinism-and-verification.md
    ↓
25-mvp.md
    ↓
26-roadmap.md
    ↓
feature-specific documents
```

A lower document must not silently contradict a higher one. If a product decision requires changing a higher-level rule, document the decision before implementing it.

## 3. Current status: foundation reset

NOVA has an existing implementation containing useful infrastructure and several gameplay systems developed during earlier iterations. The goal is **not to throw that work away blindly**.

The current engineering direction is a **controlled foundation reset**:

- inspect the existing repository;
- preserve validated infrastructure where it fits the target architecture;
- preserve validated domain concepts where they remain coherent;
- isolate or replace systems that conflict with the new causal model;
- avoid carrying accidental complexity forward;
- rebuild the simulation around one canonical state and explicit phases.

The existing code is evidence, not automatically the source of truth. These documents define the intended product and architecture; the repository audit determines what can be safely retained.

## 4. Current validated concepts to preserve when compatible

Earlier implementation work established useful concepts including:

- deterministic world/grid coordinates;
- building placement and lifecycle;
- operational versus non-operational housing capacity;
- population/residence relationships;
- zones and autonomous development;
- roads and road influence;
- simulation clock / tick progression;
- canonical state hashing;
- save/load versioning;
- render snapshots;
- picking and inspection separated from rendering;
- automated tests and browser/GPU diagnostics.

These concepts must be re-audited during the foundation reset rather than duplicated or assumed correct.

## 5. Product principle

NOVA is a **minimal, visual, causal colony/city simulation**.

The player should be able to look at the settlement and understand why important things happen.

```text
player action
    ↓
infrastructure
    ↓
capacity / service
    ↓
colonist need
    ↓
consumption / satisfaction
    ↓
work / behavior
    ↓
production
    ↓
economic activity
    ↓
new demand
    ↓
player action
```

The exact systems may evolve, but the causal structure must remain understandable.

## 6. MVP philosophy

The MVP is a **vertical slice**, not a miniature version of every planned system.

The first proof should establish:

```text
BUILD
→ CONSTRUCT
→ OPERATE
→ CREATE CAPACITY
→ ADMIT COLONIST
→ ASSIGN RESIDENCE
→ ADVANCE TIME
→ OBSERVE CAUSAL STATE
```

Later systems are introduced only when they have a clear dependency on this foundation.

## 7. Agent rule

A coding agent must not treat the roadmap as permission to implement future systems early.

For every task:

1. inspect the repository;
2. read the relevant docs;
3. identify the smallest causal change;
4. implement it in the correct layer;
5. add/update tests;
6. run the required validation;
7. report what was verified and what was not.

If verification is blocked, the result is **BLOCKED**, not `COMPLETE`.

## 8. What this pack intentionally does not decide yet

Some future product choices remain intentionally open, including:

- exact colonist depth;
- exact resource catalogue;
- detailed needs model;
- economic granularity;
- end-state / progression structure;
- advanced transport;
- technology progression;
- late-game specialization.

These must be resolved from the product direction before becoming implementation requirements.

## 9. Naming and status convention

Documentation should distinguish:

- **Target** — intended future behavior.
- **MVP** — required for the current vertical slice.
- **Implemented** — verified in the current repository.
- **Validated** — implemented and covered by appropriate tests/verification.
- **Deferred** — intentionally postponed.
- **Blocked** — cannot currently be verified or implemented because of a known dependency.

Do not describe an aspirational feature as implemented.
