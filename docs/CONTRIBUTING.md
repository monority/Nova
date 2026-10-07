# NOVA — Contributing

## 1. Objective

Keep NOVA coherent while allowing fast implementation by humans and coding agents.

Correctness and product coherence take priority over raw change volume.

## 2. Before coding

Read:

1. `AGENTS.md`
2. `README.md`
3. `docs/game/01-PRODUCT-VISION.md`
4. `docs/game/02-MVP.md`
5. `docs/game/03-DESIGN-RULES.md`
6. `docs/game/04-ARCHITECTURE.md`
7. relevant domain documentation
8. `docs/STATE.md`
9. relevant ADRs

Then inspect the actual repository.

## 3. Branch discipline

Prefer a dedicated branch for meaningful work.

Do not push to protected/main branches unless explicitly authorized.

Do not rewrite unrelated history.

## 4. Scope discipline

A change should have one clear purpose.

Do not combine:

- unrelated refactors;
- feature work;
- cosmetic cleanup;
- dependency migrations;
- speculative architecture.

If cleanup is required to implement the feature safely, keep it minimal and explain why.

## 5. Code changes

Prefer:

- explicit types;
- small cohesive modules;
- pure domain functions;
- dependency direction that remains obvious;
- deterministic behavior;
- derived state over duplicated state;
- explicit commands/actions;
- clear error handling.

Avoid:

- God objects;
- hidden global mutable state;
- circular dependencies;
- UI-driven domain logic;
- renderer-driven simulation;
- premature generic frameworks.

## 6. Dependencies

Adding a dependency requires a concrete current justification.

Before adding one, evaluate:

- whether the existing stack already solves the problem;
- bundle/runtime cost;
- maintenance quality;
- type quality;
- security;
- whether the dependency creates architectural coupling.

## 7. Tests

New behavior requires appropriate regression coverage.

Prefer:

- unit tests for domain rules;
- integration tests for system interactions;
- Playwright for critical user flows;
- deterministic fixtures for simulation scenarios.

Do not weaken tests merely to make a change pass.

## 8. Visual changes

For UI/rendering work, validate both:

- functional behavior;
- actual visual result.

A passing unit test does not prove that a visual feature is correct.

## 9. Commit quality

Commits should be:

- coherent;
- focused;
- reversible;
- understandable.

Avoid commits containing unrelated generated files or local configuration.

## 10. Documentation

Update documentation when behavior or architecture changes.

Do not update documentation merely to describe implementation details that are obvious from code.

Product decisions belong in product/ADR documentation.

Current implementation truth belongs in `STATE.md`.

## 11. Review checklist

Before considering a change complete:

- [ ] Product scope is respected.
- [ ] Architecture boundaries are respected.
- [ ] No unnecessary abstraction was introduced.
- [ ] Tests cover important behavior.
- [ ] Existing tests remain green.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Build passes.
- [ ] E2E/visual validation was performed where relevant.
- [ ] Git diff contains only intended changes.
- [ ] Documentation is updated when required.
