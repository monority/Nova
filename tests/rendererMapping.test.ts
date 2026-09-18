import { describe, expect, it } from 'vitest'

import {
  stepSimulation,
  toRenderSnapshot,
  type PlaceBuildingCommand,
  type RenderSnapshot,
} from '@/index'
import {
  reconcile,
  type ReconciliationOps,
} from '@/renderer/three/reconcile.js'
import {
  simulationCellToWorldPosition,
  worldPositionToSimulationCell,
  isInGrid,
} from '@/renderer/three/coordinates.js'
import { createTestState } from './helpers.js'

describe('coordinate boundary', () => {
  const grid = { width: 12, height: 8 }

  it('centers the grid on the world origin', () => {
    const origin = simulationCellToWorldPosition({ x: 0, y: 0 }, grid)
    const last = simulationCellToWorldPosition(
      { x: grid.width - 1, y: grid.height - 1 },
      grid
    )
    // Symmetric around origin.
    expect(origin.x).toBeCloseTo(-last.x)
    expect(origin.z).toBeCloseTo(-last.z)
  })

  it('round-trips cell -> world -> cell', () => {
    for (let x = 0; x < grid.width; x++) {
      for (let y = 0; y < grid.height; y++) {
        const world = simulationCellToWorldPosition({ x, y }, grid)
        const cell = worldPositionToSimulationCell(world.x, world.z, grid)
        expect(cell).toEqual({ x, y })
      }
    }
  })

  it('maps fractional world positions to nearest cell', () => {
    const world = simulationCellToWorldPosition({ x: 3, y: 4 }, grid)
    const cell = worldPositionToSimulationCell(world.x + 0.3, world.z - 0.45, grid)
    expect(cell).toEqual({ x: 3, y: 4 })
  })

  it('rejects cells outside the grid', () => {
    expect(isInGrid({ x: -1, y: 0 }, grid)).toBe(false)
    expect(isInGrid({ x: grid.width, y: 0 }, grid)).toBe(false)
    expect(isInGrid({ x: 0, y: grid.height }, grid)).toBe(false)
    expect(isInGrid({ x: 0, y: 0 }, grid)).toBe(true)
  })
})

describe('keyed reconciliation', () => {
  interface FakeView {
    readonly id: string
    updated: number
    removed: boolean
  }

  const makeOps = (): {
    views: Map<string, FakeView>
    ops: ReconciliationOps<FakeView, { id: string; value: number }>
    log: string[]
  } => {
    const views = new Map<string, FakeView>()
    const log: string[] = []
    const ops: ReconciliationOps<FakeView, { id: string; value: number }> = {
      create: (data) => {
        log.push(`create:${data.id}`)
        const view = { id: data.id, updated: 0, removed: false }
        views.set(data.id, view)
        return view
      },
      update: (view, data) => {
        log.push(`update:${data.id}`)
        view.updated += 1
      },
      remove: (view) => {
        log.push(`remove:${view.id}`)
        view.removed = true
      },
    }
    return { views, ops, log }
  }

  it('creates missing, updates existing, removes gone', () => {
    const { views, ops, log } = makeOps()
    reconcile(views, [{ id: 'a', value: 1 }, { id: 'b', value: 2 }], (d) => d.id, ops)
    expect(log).toEqual(['create:a', 'create:b'])

    log.length = 0
    reconcile(views, [{ id: 'a', value: 3 }], (d) => d.id, ops)
    expect(log).toEqual(['update:a', 'remove:b'])
  })

  it('keeps view identity stable across snapshots', () => {
    const { views, ops } = makeOps()
    reconcile(views, [{ id: 'a', value: 1 }], (d) => d.id, ops)
    const viewA = views.get('a')
    reconcile(views, [{ id: 'a', value: 2 }], (d) => d.id, ops)
    expect(views.get('a')).toBe(viewA)
    expect(views.get('a')?.updated).toBe(1)
  })

  it('handles empty snapshots', () => {
    const { views, ops } = makeOps()
    reconcile(views, [{ id: 'a', value: 1 }], (d) => d.id, ops)
    reconcile(views, [], (d) => d.id, ops)
    expect(views.size).toBe(0)
  })
})

describe('snapshot -> renderer mapping contract', () => {
  const placeResidence = (x: number, y: number): PlaceBuildingCommand => ({
    type: 'placeBuilding',
    x,
    y,
    buildingType: 'residence',
  })

  const buildSnapshotWithBuilding = (): RenderSnapshot => {
    let state = stepSimulation(createTestState(), placeResidence(2, 2))
    state = stepSimulation(state)
    state = stepSimulation(state)
    return toRenderSnapshot(state)
  }

  it('building identity and status survive snapshot derivation', () => {
    const snapshot = buildSnapshotWithBuilding()
    const building = snapshot.buildings[0]
    expect(building).toBeDefined()
    expect(building?.id).toBe('building-1')
    expect(building?.status).toBe('operational')
  })

  it('colonist cell references the residence position', () => {
    const snapshot = buildSnapshotWithBuilding()
    const colonist = snapshot.colonists[0]
    expect(colonist?.residenceId).toBe('building-1')
    expect(colonist?.cell).toEqual({ x: 2, y: 2 })
  })
})
