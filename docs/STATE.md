# NOVA — Current Project State

> **Authority:** this file describes the repository's actual implementation state. It is not a product wish-list.

## Purpose

`STATE.md` is the operational snapshot for humans and coding agents.

It answers:

- What exists?
- What is currently being worked on?
- What is validated?
- What is known to be incomplete?
- What is the next approved implementation boundary?

## Rules

1. Never invent state.
2. Update this document only from observed repository evidence.
3. Distinguish implemented, tested, partially implemented, planned and unknown.
4. Do not mark a feature complete because its code exists; completion requires its acceptance criteria and validation.
5. Historical details belong in step reports or Git history, not here.
6. If the state is stale or contradictory, inspect the repository before continuing.

## Project Identity

- Product: NOVA
- Genre: 3D stylized city-builder / civilization-builder
- Initial mode: Sandbox
- MVP target: complete Age 1 + beginning of Age 2
- Primary gameplay: build → produce → store → distribute → consume → analyse → optimise → develop → milestone → new age

## Repository State

> Fill from actual repository inspection.

- Branch: `UNKNOWN — inspect git`
- HEAD: `UNKNOWN — inspect git`
- Worktree: `UNKNOWN — inspect git`
- Package manager: `pnpm`
- Runtime/toolchain: `UNKNOWN — inspect repository`
- Build status: `UNKNOWN`
- Test status: `UNKNOWN`
- E2E status: `UNKNOWN`

## Implementation State

Use only observed values.

| Area | Status | Evidence |
|---|---|---|
| Repository foundation | NOT VERIFIED | Inspect repository |
| Deterministic world | NOT VERIFIED | Inspect repository |
| Camera / navigation | NOT VERIFIED | Inspect repository |
| Construction | NOT VERIFIED | Inspect repository |
| Population | NOT VERIFIED | Inspect repository |
| Needs | NOT VERIFIED | Inspect repository |
| Production | NOT VERIFIED | Inspect repository |
| Storage | NOT VERIFIED | Inspect repository |
| Logistics | NOT VERIFIED | Inspect repository |
| Analysis | NOT VERIFIED | Inspect repository |
| Economy | NOT VERIFIED | Inspect repository |
| Environment | NOT VERIFIED | Inspect repository |
| Technology | NOT VERIFIED | Inspect repository |
| Age 1 | NOT VERIFIED | Inspect repository |
| Age 2 beginning | NOT VERIFIED | Inspect repository |
| Persistence | NOT VERIFIED | Inspect repository |
| Performance | NOT VERIFIED | Inspect repository |

## Known Issues

Only record reproducible issues with evidence.

- None recorded until repository inspection.

## Deferred Scope

Unless explicitly promoted by a product decision, these remain post-MVP:

- advanced diplomacy;
- complex BOT civilizations;
- advanced warfare;
- large-scale colonization;
- complete world economy;
- full resource catalogue;
- scenarios/challenges;
- multiplayer;
- individual citizen simulation;
- individual courier simulation;
- advanced finance;
- factions.

## Current Approved Step

`UNKNOWN — must be established from repository state and roadmap.`

## Update Protocol

After a meaningful implementation step:

1. inspect Git state;
2. inspect changed files;
3. run required validation;
4. update only facts supported by evidence;
5. record the next approved step;
6. commit the state change together with the relevant work when appropriate.
