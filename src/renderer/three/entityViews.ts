/**
 * Entity views for buildings and colonists (Step 1 #6, #7).
 *
 * Stable visual identity: one view per canonical entity id, created once,
 * updated in place, removed when the snapshot drops the entity.
 * Three.js objects never carry authoritative state; colors/heights derive
 * only from RenderSnapshot data.
 */

import {
  BoxGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three'
import type { RenderBuilding, RenderColonist } from '../../application/queries/renderSnapshot.js'
import type { GridDimensions } from './coordinates.js'
import { simulationCellToWorldPosition } from './coordinates.js'
import type { ReconciliationOps } from './reconcile.js'

const CONSTRUCTION_COLOR = 0x6b7280
const OPERATIONAL_COLOR = 0xd9a441
const FARM_OPERATIONAL_COLOR = 0x5da85f
/** Step 07C §13: a Workshop must be distinguishable at a glance. */
const WORKSHOP_STAFFED_COLOR = 0x4a90d9
/** Vacant Workshop: same silhouette, clearly dimmer (no worker inside). */
const WORKSHOP_VACANT_COLOR = 0x2f4a63
const CONSTRUCTION_HEIGHT = 0.18
const OPERATIONAL_HEIGHT = 0.55
/** Workshops are taller as well as blue: shape + color + height all differ. */
const WORKSHOP_OPERATIONAL_HEIGHT = 0.72

const COLONIST_COLOR = 0x7fd1c8

const buildingGeometry = new BoxGeometry(0.7, 1, 0.7)
buildingGeometry.translate(0, 0.5, 0) // pivot at ground level

/** Distinct silhouette: residences and farms are boxes, workshops cylinders. */
const workshopGeometry = new CylinderGeometry(0.34, 0.34, 1, 16)
workshopGeometry.translate(0, 0.5, 0) // pivot at ground level

const colonistGeometry = new SphereGeometry(0.12, 12, 12)

/** Presentation only: derived from RenderSnapshot type, never domain state. */
const operationalColorOf = (data: RenderBuilding): number => {
  if (data.type === 'farm') {
    return FARM_OPERATIONAL_COLOR
  }
  if (data.type === 'workshop') {
    return data.workers > 0 ? WORKSHOP_STAFFED_COLOR : WORKSHOP_VACANT_COLOR
  }
  return OPERATIONAL_COLOR
}

const operationalHeightOf = (type: RenderBuilding['type']): number =>
  type === 'workshop' ? WORKSHOP_OPERATIONAL_HEIGHT : OPERATIONAL_HEIGHT

const geometryOf = (type: RenderBuilding['type']): BoxGeometry | CylinderGeometry =>
  type === 'workshop' ? workshopGeometry : buildingGeometry

export interface BuildingView {
  readonly mesh: Mesh
  readonly material: MeshStandardMaterial
}

export const buildingOps = (
  grid: GridDimensions
): {
  readonly views: Map<string, BuildingView>
  readonly ops: ReconciliationOps<BuildingView, RenderBuilding>
} => {
  const views = new Map<string, BuildingView>()
  const apply = (view: BuildingView, data: RenderBuilding): void => {
    const operational = data.status === 'operational'
    // Presentation only: color and height derive from snapshot type + status.
    // Farms read green when producing, staffed workshops bright blue, vacant
    // workshops dim blue, residences gold, everything gray under construction.
    view.material.color.setHex(
      operational ? operationalColorOf(data) : CONSTRUCTION_COLOR
    )
    view.mesh.scale.y = operational
      ? operationalHeightOf(data.type)
      : CONSTRUCTION_HEIGHT
  }
  return {
    views,
    ops: {
      create: (data) => {
        const material = new MeshStandardMaterial({ color: CONSTRUCTION_COLOR })
        const mesh = new Mesh(geometryOf(data.type), material)
        const position = simulationCellToWorldPosition(data, grid)
        mesh.position.set(position.x, 0, position.z)
        mesh.userData['entityId'] = data.id
        const view = { mesh, material }
        // New views must reflect snapshot data immediately: reconcile()
        // calls create() without a follow-up update().
        apply(view, data)
        return view
      },
      update: apply,
      remove: (view) => {
        view.mesh.removeFromParent()
        view.material.dispose()
      },
    },
  }
}

export interface ColonistView {
  readonly mesh: Mesh
  readonly material: MeshStandardMaterial
}

export const colonistOps = (
  grid: GridDimensions
): {
  readonly views: Map<string, ColonistView>
  readonly ops: ReconciliationOps<ColonistView, RenderColonist>
} => {
  const views = new Map<string, ColonistView>()
  const apply = (view: ColonistView, data: RenderColonist): void => {
    // Deterministic position: residence cell. No autonomous movement
    // in Step 1; colonists stay stationary at their derived location.
    if (data.cell !== null) {
      const position = simulationCellToWorldPosition(data.cell, grid)
      view.mesh.position.set(position.x, 0.75, position.z + 0.28)
      view.mesh.visible = true
    } else {
      view.mesh.visible = false
    }
  }
  return {
    views,
    ops: {
      create: (data) => {
        const material = new MeshStandardMaterial({ color: COLONIST_COLOR })
        const mesh = new Mesh(colonistGeometry, material)
        mesh.userData['entityId'] = data.id
        const view = { mesh, material }
        // Same as buildings: position immediately so the first frame is
        // correct even before any update() call.
        apply(view, data)
        return view
      },
      update: apply,
      remove: (view) => {
        view.mesh.removeFromParent()
        view.material.dispose()
      },
    },
  }
}
