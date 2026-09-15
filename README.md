# NOVA

NOVA is a deterministic, contemplative city-builder. This repository follows [docs/21-project-architecture.md](docs/21-project-architecture.md), the authoritative organization contract.

## Commands

```bash
pnpm install
pnpm dev
pnpm test:run
pnpm test:e2e
pnpm lint
pnpm build
```

## Boundaries

- `src/domain/` owns game rules and imports no browser, React, Three.js or persistence code.
- `src/application/` coordinates use cases, commands and queries.
- `src/engine/` owns generic computational runtime services.
- `src/rendering/` consumes render contracts and owns visual resources.
- `src/ui/` owns presentation and accessibility.
- `src/infrastructure/` owns browser storage and serialization adapters.
- `tests/` mirrors unit, integration and end-to-end responsibilities.

The architecture document describes the full growth map. Only folders with a current responsibility are materialized in the repository; new capability folders are created when their first meaningful code or contract is added.
