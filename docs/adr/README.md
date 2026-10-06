# NOVA — Architecture Decision Records

## Purpose

ADRs record decisions that materially affect architecture or long-term maintainability.

They prevent future agents from repeatedly reopening settled questions.

## When to create an ADR

Create one when a decision:

- changes architectural boundaries;
- introduces a significant dependency;
- changes persistence;
- changes simulation strategy;
- changes performance strategy;
- creates a long-lived constraint;
- resolves competing technical approaches.

Do not create an ADR for ordinary implementation details.

## Naming

Use:

`ADR-NNN-short-kebab-case.md`

Example:

`ADR-001-simulation-independent-from-rendering.md`

## Required structure

```markdown
# ADR-NNN — Title

## Status
Proposed | Accepted | Superseded | Rejected

## Context

## Decision

## Alternatives Considered

## Consequences

## Validation / Evidence

## Related Documents
```

## Rules

- One decision per ADR.
- Explain why, not only what.
- Record rejected alternatives when useful.
- Do not edit history to hide superseded decisions.
- If a decision is superseded, link the replacement ADR.
