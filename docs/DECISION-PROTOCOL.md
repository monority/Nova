# NOVA — Decision Protocol

## Purpose

AI agents must know when they can implement autonomously and when a product or architectural decision is required.

## Decision classes

### CLASS A — Implement

Proceed without asking when:

- the requirement is explicit;
- it fits the MVP;
- it does not contradict an ADR;
- the architecture already supports it;
- the change is local and reversible;
- acceptance criteria are clear.

### CLASS B — Record and Implement

Proceed, but create/update an ADR when:

- a meaningful technical decision is required;
- multiple reasonable implementations exist;
- the choice affects future architecture;
- the decision is local enough not to alter product scope.

The ADR must record alternatives and consequences.

### CLASS C — Stop and Ask

Stop before implementation when:

- the request contradicts the product vision;
- the request changes MVP scope materially;
- two authoritative documents conflict;
- a new gameplay system is required;
- a new resource is required without justification;
- an irreversible player-facing rule is being introduced;
- persistence compatibility would be broken;
- the architecture would need a major redesign;
- an optimization is being proposed without evidence;
- required information cannot be established from the repository.

## Product change rule

Code must not silently change:

- game rules;
- progression;
- resource semantics;
- population behavior;
- economic rules;
- win/failure conditions;
- age structure;
- MVP scope.

Such changes require an explicit product decision.

## Architecture change rule

Before introducing a new architectural layer, ask:

1. What concrete problem exists?
2. What evidence demonstrates it?
3. Why does the existing architecture fail?
4. What is the smallest viable change?
5. What are the alternatives?
6. What future cost does the decision create?

## Optimization rule

> **Measure first. Optimize second.**

A theoretical future bottleneck is not sufficient.

## Ambiguity rule

When requirements are ambiguous:

- resolve using existing documentation first;
- prefer the smallest coherent interpretation;
- preserve existing behavior;
- do not invent product requirements.

If ambiguity materially affects gameplay or architecture, stop and ask.

## Contradiction rule

When two documents conflict:

1. do not choose silently;
2. identify the conflict;
3. determine which document has higher authority;
4. if authority is insufficient, stop;
5. record the resolution.

## New-system test

Before implementing a new system:

- What decision does it create?
- What existing system does it interact with?
- Why is it needed now?
- Is it MVP?
- How will it be observed?
- How will it be tested?
- What is explicitly not being built?

If these questions cannot be answered, defer it.
