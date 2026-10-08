/**
 * Wood deposits (Step003) — the first physical world resource.
 *
 * A deposit is a finite, cell-keyed quantity of wood that exists in the
 * sector BEFORE the colony arrives (validated product decision: resources are
 * physical and geography has an economic function). Extraction decrements
 * `remaining`; an exhausted deposit keeps its entry with `remaining: 0` —
 * exhaustion never makes the cell disappear (audit D1/D2).
 *
 * Structural decisions (audit D1/D2, docs/audits/
 * RESOURCE-ECONOMIC-SYSTEM-AUDIT-2026-10-08.md):
 * - deposits mirror the canonical `blockedCells` pattern: a plain record
 *   keyed by the canonical `"x,y"` cell key, never a parallel world model;
 * - no regeneration, no fertility, no generic resource framework — wood is
 *   the first concrete slice and stays a concrete type.
 */

import type { CellCoordinate } from './grid.js'

/** One finite wood deposit on one cell. */
export interface WoodDeposit {
  readonly x: number
  readonly y: number
  /** Extractable wood units left. 0 = exhausted (entry remains). */
  readonly remaining: number
}

/** Canonical deposit map: keyed by `"x,y"`, iterated in sorted-key order. */
export type WoodDeposits = Readonly<Record<string, WoodDeposit>>

/** Canonical `"x,y"` key, identical to the road/terrain key convention. */
export const woodDepositKey = (x: number, y: number): string => `${x},${y}`

/** The four orthogonal neighbours of a cell (same deltas as road contact). */
const NEIGHBOR_DELTAS: readonly CellCoordinate[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

/**
 * Total extractable wood in the deposits orthogonally adjacent to a building
 * cell. Deterministic: sorted-key iteration, pure.
 */
export const adjacentWoodRemaining = (
  deposits: WoodDeposits,
  x: number,
  y: number
): number => {
  let total = 0
  for (const key of Object.keys(deposits).sort()) {
    const deposit = deposits[key]
    if (deposit === undefined) continue
    if (
      NEIGHBOR_DELTAS.some(
        (delta) =>
          deposit.x === x + delta.x && deposit.y === y + delta.y
      )
    ) {
      total += deposit.remaining
    }
  }
  return total
}

/**
 * Extract up to `amount` wood from the deposits orthogonally adjacent to a
 * building cell, draining the lowest canonical key first. Pure: returns the
 * extracted quantity (may be less than requested when deposits run low) and
 * the next deposits record. Exhausted deposits stay in the map with
 * `remaining: 0`.
 */
export const extractAdjacentWood = (
  deposits: WoodDeposits,
  x: number,
  y: number,
  amount: number
): { readonly deposits: WoodDeposits; readonly extracted: number } => {
  if (amount < 0) {
    throw new Error(`Negative wood extraction: ${amount}`)
  }
  let remaining = amount
  const next: Record<string, WoodDeposit> = { ...deposits }
  for (const key of Object.keys(deposits).sort()) {
    if (remaining === 0) break
    const deposit = deposits[key]
    if (deposit === undefined || deposit.remaining === 0) continue
    if (
      !NEIGHBOR_DELTAS.some(
        (delta) => deposit.x === x + delta.x && deposit.y === y + delta.y
      )
    ) {
      continue
    }
    const taken = Math.min(deposit.remaining, remaining)
    if (taken === 0) continue
    next[key] = { ...deposit, remaining: deposit.remaining - taken }
    remaining -= taken
  }
  return { deposits: next, extracted: amount - remaining }
}

/** True iff the cell hosts a wood deposit (placement must not overwrite it). */
export const hasWoodDepositAt = (deposits: WoodDeposits, x: number, y: number): boolean =>
  deposits[woodDepositKey(x, y)] !== undefined

/** Normalize a deposit seed list: validate, dedupe by cell, sort by key. */
export const normalizeWoodDeposits = (
  deposits: readonly WoodDeposit[]
): WoodDeposits => {
  const map: Record<string, WoodDeposit> = {}
  for (const deposit of deposits) {
    if (
      !Number.isInteger(deposit.x) ||
      !Number.isInteger(deposit.y) ||
      !Number.isInteger(deposit.remaining) ||
      deposit.remaining < 0
    ) {
      throw new Error(
        `Malformed wood deposit: ${JSON.stringify(deposit)}`
      )
    }
    map[woodDepositKey(deposit.x, deposit.y)] = {
      x: deposit.x,
      y: deposit.y,
      remaining: deposit.remaining,
    }
  }
  return map
}
