/**
 * Step 10DB — Narrow Viewport Framing Investigation (deterministic measurements).
 *
 * AUDIT ONLY. `src/` is untouched. The renderer uses a FIXED perspective camera
 * (`src/renderer/three/scene.ts`): fov 45, `cameraDistance = max(w,h) * 1.4`,
 * position `(0, 0.8d, 0.9d)` looking at the origin; `resize` only updates
 * `aspect`. This file reproduces that exact projection with three.js and
 * measures the board bounds and per-cell visibility at the three required
 * viewports, then checks whether any scenario-critical cell is clipped.
 *
 * The replication is validated against the browser-measured bounds from the
 * Step 10DA product audit (1280x800 board x∈[310, 970], y∈[255, 619]).
 */

import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'

import { SCENARIOS } from '@/index'
import { simulationCellToWorldPosition } from '@/renderer/three/coordinates.js'

const GRID = { width: 12, height: 12 } as const
const FOV = 45
const NEAR = 0.1
const FAR = 200
const CAMERA_DISTANCE = Math.max(GRID.width, GRID.height) * 1.4

const VIEWPORTS = [
  { width: 1280, height: 800, label: '1280x800' },
  { width: 420, height: 740, label: '420x740' },
  { width: 360, height: 640, label: '360x640' },
] as const

const createCamera = (width: number, height: number): PerspectiveCamera => {
  const camera = new PerspectiveCamera(FOV, width / height, NEAR, FAR)
  camera.position.set(0, CAMERA_DISTANCE * 0.8, CAMERA_DISTANCE * 0.9)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  return camera
}

interface Point {
  readonly x: number
  readonly y: number
}

const projectWorld = (
  camera: PerspectiveCamera,
  worldX: number,
  worldZ: number,
  width: number,
  height: number
): Point => {
  const vector = new Vector3(worldX, 0, worldZ).project(camera)
  return {
    x: ((vector.x + 1) / 2) * width,
    y: ((1 - vector.y) / 2) * height,
  }
}

const projectCellCenter = (
  camera: PerspectiveCamera,
  cell: { readonly x: number; readonly y: number },
  width: number,
  height: number
): Point => {
  const world = simulationCellToWorldPosition(cell, GRID)
  return projectWorld(camera, world.x, world.z, width, height)
}

/** Tile corners in world space (a cell is a 1x1 ground tile). */
const projectTile = (
  camera: PerspectiveCamera,
  cell: { readonly x: number; readonly y: number },
  width: number,
  height: number
): readonly Point[] => {
  const offsets = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ] as const
  return offsets.map(([dx, dy]) => {
    const world = simulationCellToWorldPosition(
      { x: cell.x + dx, y: cell.y + dy },
      GRID
    )
    return projectWorld(camera, world.x, world.z, width, height)
  })
}

const inside = (point: Point, width: number, height: number): boolean =>
  point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height

interface ViewportMeasurement {
  readonly viewport: string
  readonly bounds: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number }
  readonly centerVisible: readonly string[]
  readonly tileFullyVisible: readonly string[]
  readonly tilePartiallyVisible: readonly string[]
  readonly tileClipped: readonly string[]
  readonly clippedColumns: readonly number[]
  readonly clippedRows: readonly number[]
}

const measure = (viewport: (typeof VIEWPORTS)[number]): ViewportMeasurement => {
  const { width, height, label } = viewport
  const camera = createCamera(width, height)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  const centerVisible: string[] = []
  const tileFullyVisible: string[] = []
  const tilePartiallyVisible: string[] = []
  const tileClipped: string[] = []
  const clippedColumns = new Set<number>()
  const clippedRows = new Set<number>()

  for (let x = 0; x < GRID.width; x += 1) {
    for (let y = 0; y < GRID.height; y += 1) {
      const cell = { x, y }
      const center = projectCellCenter(camera, cell, width, height)
      minX = Math.min(minX, center.x)
      maxX = Math.max(maxX, center.x)
      minY = Math.min(minY, center.y)
      maxY = Math.max(maxY, center.y)
      const key = `${x},${y}`
      if (inside(center, width, height)) centerVisible.push(key)

      const corners = projectTile(camera, cell, width, height)
      const insideCount = corners.filter((corner) => inside(corner, width, height)).length
      if (insideCount === corners.length) {
        tileFullyVisible.push(key)
      } else if (insideCount === 0) {
        tileClipped.push(key)
        clippedColumns.add(x)
        clippedRows.add(y)
      } else {
        tilePartiallyVisible.push(key)
      }
    }
  }

  return {
    viewport: label,
    bounds: {
      minX: Math.round(minX),
      maxX: Math.round(maxX),
      minY: Math.round(minY),
      maxY: Math.round(maxY),
    },
    centerVisible,
    tileFullyVisible,
    tilePartiallyVisible,
    tileClipped,
    clippedColumns: [...clippedColumns].sort((a, b) => a - b),
    clippedRows: [...clippedRows].sort((a, b) => a - b),
  }
}

const measurements = VIEWPORTS.map(measure)
const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

describe('10DB — fixed-camera model', () => {
  it('the camera is fixed: distance, position and fov do not depend on the viewport', () => {
    expect(CAMERA_DISTANCE).toBeCloseTo(16.8, 9)
    for (const viewport of VIEWPORTS) {
      const camera = createCamera(viewport.width, viewport.height)
      expect(Number(camera.position.x.toFixed(6))).toBe(0)
      expect(Number(camera.position.y.toFixed(6))).toBe(Number((CAMERA_DISTANCE * 0.8).toFixed(6)))
      expect(Number(camera.position.z.toFixed(6))).toBe(Number((CAMERA_DISTANCE * 0.9).toFixed(6)))
      expect(camera.fov).toBe(45)
      expect(Number(camera.aspect.toFixed(6))).toBe(
        Number((viewport.width / viewport.height).toFixed(6))
      )
    }
  })

  it('reproduces the browser-measured desktop board bounds (validates the model)', () => {
    const desktop = measurements.find((entry) => entry.viewport === '1280x800')
    if (desktop === undefined) throw new Error('10db: missing desktop measurement')
    // Browser measurement from the Step 10DA product audit.
    expect(desktop.bounds.minX).toBeGreaterThanOrEqual(308)
    expect(desktop.bounds.minX).toBeLessThanOrEqual(312)
    expect(desktop.bounds.maxX).toBeGreaterThanOrEqual(968)
    expect(desktop.bounds.maxX).toBeLessThanOrEqual(972)
    expect(desktop.bounds.minY).toBeGreaterThanOrEqual(253)
    expect(desktop.bounds.minY).toBeLessThanOrEqual(257)
    expect(desktop.bounds.maxY).toBeGreaterThanOrEqual(617)
    expect(desktop.bounds.maxY).toBeLessThanOrEqual(621)
  })

  it('projects the full board inside a desktop viewport', () => {
    const desktop = measurements.find((entry) => entry.viewport === '1280x800')
    if (desktop === undefined) throw new Error('10db: missing desktop measurement')
    expect(desktop.tileClipped).toHaveLength(0)
    expect(desktop.tileFullyVisible).toHaveLength(GRID.width * GRID.height)
  })
})

describe('10DB — measured clipping at narrow viewports', () => {
  it('measures board bounds, visible and clipped cells at every required viewport', () => {
    audit(
      'FRAMING',
      measurements.map((entry) => ({
        viewport: entry.viewport,
        bounds: entry.bounds,
        centerVisible: entry.centerVisible.length,
        fullyVisible: entry.tileFullyVisible.length,
        partiallyVisible: entry.tilePartiallyVisible.length,
        clipped: entry.tileClipped.length,
        clippedColumns: entry.clippedColumns,
        clippedRows: entry.clippedRows,
      }))
    )
    expect(measurements).toHaveLength(3)
    for (const entry of measurements) {
      expect(entry.tileFullyVisible.length + entry.tilePartiallyVisible.length + entry.tileClipped.length).toBe(
        GRID.width * GRID.height
      )
    }
  })

  it('narrow viewports clip only the two outer columns, never the centre', () => {
    const narrow = measurements.filter((item) => item.viewport !== '1280x800')
    expect(narrow).toHaveLength(2)
    for (const entry of narrow) {
      // The camera always frames the origin, so the centre cells stay visible.
      expect(entry.centerVisible).toContain('5,5')
      expect(entry.centerVisible).toContain('6,6')
      // Measured, deterministic clip set: the outer two columns on each side.
      expect(entry.tileFullyVisible).toHaveLength(100)
      expect(entry.tilePartiallyVisible).toHaveLength(28)
      expect(entry.tileClipped).toHaveLength(16)
      expect(entry.clippedColumns).toEqual([0, 1, GRID.width - 2, GRID.width - 1])
      for (const key of entry.tileClipped) {
        const column = Number(key.split(',')[0])
        expect(column <= 1 || column >= GRID.width - 2, `${entry.viewport} ${key}`).toBe(true)
      }
    }
  })
})

describe('10DB — scenario-critical cell coverage', () => {
  const scenarioCells = (id: string) => {
    const scenario = SCENARIOS.find((entry) => entry.id === id)
    if (scenario === undefined) throw new Error(`10db: unknown scenario ${id}`)
    const cells = new Set<string>()
    for (const building of scenario.buildings ?? []) cells.add(`${building.x},${building.y}`)
    for (const road of scenario.roads ?? []) cells.add(`${road.x},${road.y}`)
    for (const colonist of scenario.colonists ?? []) {
      cells.add(`${colonist.residence.x},${colonist.residence.y}`)
    }
    return [...cells].map((key) => {
      const [x, y] = key.split(',').map(Number)
      return { x: x ?? 0, y: y ?? 0 }
    })
  }

  const clippedSet = (viewport: string): Set<string> => {
    const entry = measurements.find((item) => item.viewport === viewport)
    if (entry === undefined) throw new Error(`10db: missing ${viewport}`)
    return new Set(entry.tileClipped)
  }

  it('no scenario start-state cell is fully clipped at 420x740 or 360x640', () => {
    const narrow = [clippedSet('420x740'), clippedSet('360x640')]
    const report: unknown[] = []
    for (const scenario of SCENARIOS) {
      const cells = scenarioCells(scenario.id)
      const clippedAt420 = cells.filter((cell) => narrow[0]?.has(`${cell.x},${cell.y}`))
      const clippedAt360 = cells.filter((cell) => narrow[1]?.has(`${cell.x},${cell.y}`))
      report.push({
        id: scenario.id,
        cells: cells.length,
        clippedAt420: clippedAt420.map((cell) => `${cell.x},${cell.y}`),
        clippedAt360: clippedAt360.map((cell) => `${cell.x},${cell.y}`),
      })
    }
    audit('SCENARIO_CELLS', report)
    const anyClipped = report.some(
      (entry) =>
        (entry as { clippedAt420: string[]; clippedAt360: string[] }).clippedAt420.length > 0 ||
        (entry as { clippedAt420: string[]; clippedAt360: string[] }).clippedAt360.length > 0
    )
    expect(anyClipped).toBe(false)
  })

  it('every scenario start state lies inside the simulated board (no off-board cells)', () => {
    for (const scenario of SCENARIOS) {
      for (const cell of scenarioCells(scenario.id)) {
        expect(cell.x).toBeGreaterThanOrEqual(0)
        expect(cell.x).toBeLessThan(GRID.width)
        expect(cell.y).toBeGreaterThanOrEqual(0)
        expect(cell.y).toBeLessThan(GRID.height)
      }
    }
  })
})
