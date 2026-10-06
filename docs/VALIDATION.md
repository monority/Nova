# NOVA — Validation Contract

## 1. Purpose

Validation is evidence, not a statement of intent.

A gate is green only when the command or inspection was actually executed and its result was observed.

Never report a check as passed because:

- it passed previously;
- another test covers something similar;
- the code appears correct;
- the command was started but its exit status was not captured.

## 2. Validation levels

### G0 — Repository integrity

Verify:

- current branch;
- HEAD;
- worktree;
- intended changed files;
- no unexpected local modifications.

### G1 — Type safety

Run the repository's canonical typecheck.

Acceptance:

- exit code 0;
- no suppressed or ignored new type errors.

### G2 — Lint

Run the canonical lint command.

Acceptance:

- exit code 0;
- no new warnings hidden without justification.

### G3 — Unit tests

Run relevant tests and, for a meaningful milestone, the complete unit suite.

Acceptance:

- exit code 0;
- no test silently excluded to obtain a green result.

### G4 — Integration/domain validation

For simulation changes, validate system interactions such as:

- production → storage;
- storage → logistics;
- logistics → consumption;
- needs → population;
- population → workforce;
- environment → consequences.

### G5 — Build

Run the production build.

Acceptance:

- exit code 0;
- generated output is usable.

### G6 — E2E

Run critical Playwright flows when the change affects user behavior.

Minimum MVP flow eventually becomes:

    start
    → build
    → produce
    → store
    → distribute
    → consume
    → inspect
    → optimise
    → milestone
    → age transition

### G7 — Visual validation

For rendering/UI changes, inspect the actual result.

Check:

- readability;
- layout;
- camera;
- scale;
- visual hierarchy;
- absence of obvious artifacts;
- interaction states.

### G8 — Performance

Measure only the relevant scenario.

Record:

- population;
- building count;
- simulation speed;
- frame behavior where relevant;
- memory if relevant;
- hardware/environment.

Do not claim performance from intuition.

### G9 — Persistence

For save/load changes:

1. create a known state;
2. save;
3. reload;
4. compare canonical state;
5. verify version handling.

### G10 — Final diff audit

Before delivery:

- inspect `git diff`;
- inspect `git status`;
- confirm intended files only;
- confirm no credentials/local settings/generated junk;
- confirm tests correspond to the actual implementation.

## 3. Validation report

Every substantial step should report:

| Gate | Command / Method | Result | Evidence |
|---|---|---|---|
| G0 | repository inspection | PASS/FAIL | actual output |
| G1 | typecheck | PASS/FAIL | exit code |
| G2 | lint | PASS/FAIL | exit code |
| G3 | tests | PASS/FAIL | counts |
| G4 | integration | PASS/FAIL | scenario |
| G5 | build | PASS/FAIL | exit code |
| G6 | E2E | PASS/FAIL/N/A | counts |
| G7 | visual | PASS/FAIL/N/A | observation |
| G8 | performance | PASS/FAIL/N/A | measurements |
| G9 | persistence | PASS/FAIL/N/A | comparison |
| G10 | diff audit | PASS/FAIL | inspected diff |

## 4. Failure handling

If a gate fails:

1. preserve the evidence;
2. identify the root cause;
3. repair;
4. rerun the relevant gate;
5. rerun dependent gates;
6. report the final state.

Never hide a failure by filtering output without preserving the real exit status.
