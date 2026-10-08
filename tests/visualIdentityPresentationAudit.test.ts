/**
 * Step 10DC — Visual Identity & Presentation Audit (deterministic checks).
 *
 * AUDIT ONLY. `src/` is untouched. These tests pin the measurable parts of the
 * rendered visual identity: per-building silhouette/colour/height, the
 * construction vs operational distinction, staffed vs vacant Workshop, the
 * road lifecycle and connection-derived marking, colonist markers, and the
 * documented HUD/world palette tokens. Subjective aesthetic judgments are not
 * encoded here (see `docs/roadmap/Step10DC.md`).
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import type {
  RenderBuilding,
  RenderColonist,
  RenderRoad,
} from '@/application/queries/renderSnapshot.js'
import {
  buildingOps,
  colonistOps,
  roadOps,
} from '@/renderer/three/entityViews.js'

const GRID = { width: 12, height: 12 } as const

// Documented operational identity (src/renderer/three/entityViews.ts).
const CONSTRUCTION_GRAY = 0x6b7280
const RESIDENCE_GOLD = 0xd9a441
const FARM_GREEN = 0x5da85f
const WORKSHOP_STAFFED_BLUE = 0x4a90d9
const WORKSHOP_VACANT_BLUE = 0x2f4a63
const WELL_TEAL = 0x39c5bb
const COLONIST_TEAL = 0x7fd1c8
const ROAD_CONSTRUCTION_GRAY = 0x6b7280
const ROAD_OPERATIONAL_SLATE = 0x39404f
const ROAD_SPAN = 0.9
const ROAD_PAD = 0.34

const renderBuilding = (
  type: RenderBuilding['type'],
  status: RenderBuilding['status'],
  workers = 0,
  id = `b-${type}`
): RenderBuilding => ({ id, type, x: 6, y: 6, status, workers })

const renderRoad = (
  status: RenderRoad['status'],
  connections: RenderRoad['connections'],
  id = 'r-1'
): RenderRoad => ({ id, x: 6, y: 6, status, connections })

const renderColonist = (cell: RenderColonist['cell'], id = 'c-1'): RenderColonist => ({
  id,
  residenceId: cell === null ? null : 'res-1',
  cell,
})

const NONE = { north: false, east: false, south: false, west: false } as const

describe('10DC — building identity: silhouette and colour', () => {
  it('gives every operational building type a distinct colour', () => {
    const colours = new Map<RenderBuilding['type'], number>()
    for (const type of ['residence', 'farm', 'workshop', 'well'] as const) {
      const view = buildingOps(GRID).ops.create(
        renderBuilding(type, 'operational', type === 'workshop' ? 1 : 0)
      )
      colours.set(type, view.material.color.getHex())
    }
    expect(colours.get('residence')).toBe(RESIDENCE_GOLD)
    expect(colours.get('farm')).toBe(FARM_GREEN)
    expect(colours.get('workshop')).toBe(WORKSHOP_STAFFED_BLUE)
    expect(colours.get('well')).toBe(WELL_TEAL)
    expect(new Set(colours.values()).size).toBe(4)
  })

  it('separates silhouettes: boxes for Residence/Farm, cylinders for Workshop/Well', () => {
    const expected: Readonly<Record<RenderBuilding['type'], string>> = {
      residence: 'BoxGeometry',
      farm: 'BoxGeometry',
      workshop: 'CylinderGeometry',
      lumberCamp: 'BoxGeometry',
      colonyCenter: 'BoxGeometry',
      well: 'CylinderGeometry',
    }
    for (const type of ['residence', 'farm', 'workshop', 'well'] as const) {
      const view = buildingOps(GRID).ops.create(renderBuilding(type, 'operational'))
      expect(view.mesh.geometry.type, type).toBe(expected[type])
    }
  })

  it('renders every under-construction building as the same short grey form', () => {
    for (const type of ['residence', 'farm', 'workshop', 'well'] as const) {
      const view = buildingOps(GRID).ops.create(renderBuilding(type, 'underConstruction', 1))
      expect(view.material.color.getHex(), type).toBe(CONSTRUCTION_GRAY)
      expect(view.mesh.scale.y, type).toBeCloseTo(0.18, 9)
    }
  })

  it('distinguishes operational from construction with both colour and height', () => {
    for (const type of ['residence', 'farm', 'workshop', 'well'] as const) {
      const ops = buildingOps(GRID)
      const operational = ops.ops.create(renderBuilding(type, 'operational', 1, `op-${type}`))
      const construction = ops.ops.create(
        renderBuilding(type, 'underConstruction', 1, `con-${type}`)
      )
      expect(operational.material.color.getHex(), type).not.toBe(
        construction.material.color.getHex()
      )
      expect(operational.mesh.scale.y, type).toBeGreaterThan(construction.mesh.scale.y)
    }
  })

  it('separates a staffed Workshop from a vacant one (same silhouette, clear value change)', () => {
    const ops = buildingOps(GRID)
    const staffed = ops.ops.create(renderBuilding('workshop', 'operational', 1, 'staffed'))
    const vacant = ops.ops.create(renderBuilding('workshop', 'operational', 0, 'vacant'))
    expect(staffed.material.color.getHex()).toBe(WORKSHOP_STAFFED_BLUE)
    expect(vacant.material.color.getHex()).toBe(WORKSHOP_VACANT_BLUE)
    expect(staffed.material.color.getHex()).not.toBe(vacant.material.color.getHex())
    expect(staffed.mesh.geometry.type).toBe(vacant.mesh.geometry.type)
  })

  it('makes the Workshop taller than the other operational buildings', () => {
    const ops = buildingOps(GRID)
    const workshop = ops.ops.create(renderBuilding('workshop', 'operational', 1))
    const residence = ops.ops.create(renderBuilding('residence', 'operational'))
    expect(workshop.mesh.scale.y).toBeCloseTo(0.72, 9)
    expect(residence.mesh.scale.y).toBeCloseTo(0.55, 9)
    expect(workshop.mesh.scale.y).toBeGreaterThan(residence.mesh.scale.y)
  })
})

describe('10DC — roads and colonists', () => {
  it('shows the road marking only once the road is operational', () => {
    const ops = roadOps(GRID)
    const operational = ops.ops.create(
      renderRoad('operational', { ...NONE, east: true }, 'op')
    )
    const construction = ops.ops.create(renderRoad('underConstruction', NONE, 'con'))
    expect(operational.material.color.getHex()).toBe(ROAD_OPERATIONAL_SLATE)
    expect(operational.marking.visible).toBe(true)
    expect(construction.material.color.getHex()).toBe(ROAD_CONSTRUCTION_GRAY)
    expect(construction.marking.visible).toBe(false)
  })

  it('derives the marking shape from the authoritative connections', () => {
    const ops = roadOps(GRID)
    const straight = ops.ops.create(renderRoad('operational', { ...NONE, east: true }, 's'))
    const isolated = ops.ops.create(renderRoad('operational', NONE, 'i'))
    const corner = ops.ops.create(
      renderRoad('operational', { ...NONE, east: true, north: true }, 'c')
    )
    expect(straight.marking.scale.x).toBeCloseTo(ROAD_SPAN, 9)
    expect(straight.marking.scale.z).toBeCloseTo(ROAD_PAD, 9)
    expect(isolated.marking.scale.x).toBeCloseTo(ROAD_PAD, 9)
    expect(isolated.marking.scale.z).toBeCloseTo(ROAD_PAD, 9)
    expect(corner.marking.scale.x).toBeCloseTo(ROAD_SPAN, 9)
    expect(corner.marking.scale.z).toBeCloseTo(ROAD_SPAN, 9)
  })

  it('renders a colonist marker above its residence and hides a homeless one', () => {
    const visible = colonistOps(GRID).ops.create(renderColonist({ x: 2, y: 2 }))
    expect(visible.mesh.visible).toBe(true)
    expect(visible.material.color.getHex()).toBe(COLONIST_TEAL)
    expect(visible.mesh.position.y).toBeCloseTo(0.75, 9)

    const hidden = colonistOps(GRID).ops.create(renderColonist(null, 'c-2'))
    expect(hidden.mesh.visible).toBe(false)
  })
})

describe('10DC — HUD/world palette tokens', () => {
  it('keeps the documented dark-maquette palette in index.html', () => {
    const html = readFileSync('index.html', 'utf8')
    // World / panel background and border.
    expect(html).toContain('#0b0e13')
    expect(html).toContain('rgba(13, 17, 24, 0.86)')
    expect(html).toContain('#2a3140')
    // Identity accents: product name/objective gold, status teal, blocked red.
    expect(html).toContain('#d9a441')
    expect(html).toContain('#7fd1c8')
    expect(html).toContain('#d98f8f')
  })

  it('reuses a single accent language for selection and placement', () => {
    // The placement indicator and road preview share the valid/invalid accents,
    // and the colonist marker reuses the status teal: one coherent language.
    expect(COLONIST_TEAL).toBe(0x7fd1c8)
    expect(WELL_TEAL).not.toBe(COLONIST_TEAL)
    expect(WORKSHOP_STAFFED_BLUE).not.toBe(COLONIST_TEAL)
  })
})
