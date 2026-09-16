# NOVA — Save Game Contract

## Requirements
A save/load cycle should satisfy:

`state A → save → load → state B`

with equivalent canonical state.

## Determinism test
For a deterministic seed and command sequence:

`commands + initial state → final hash`

must produce the same result across repeated runs under the same simulation version.

## Migration
Future schema migrations should be explicit rather than silently guessing missing fields.
