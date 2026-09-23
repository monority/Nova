/**
 * Step 10BA — Spatial & workforce readability closure (contract tests).
 *
 * UX/readability only: these tests pin the NEW surfaces (Water vocabulary,
 * colony-wide service count, workforce diagnosis, placement spatial preview)
 * and prove they READ the existing derivations without changing any simulation
 * rule: no domain file is touched, nothing is persisted, and every query is
 * pure (the canonical hash is identical before and after, repeated calls give
 * the same answer, and record insertion order never matters).
 *
 * Run:
 *   npx vitest run tests/spatialWorkforceReadability.test.ts
 */

import { describe, expect, it } from 'vitest'

import {
  applyCommand,
  assignJobs,
  canonicalJson,
  createBuilding,
  createColonist,
  createInitialState,
  createRoads,
  createScenarioState,
  formatResidenceService,
  formatWaterSupplySuffix,
  getBuildingRoadAccess,
  getPlacementSpatialPreview,
  getReassignmentOptions,
  getWaterCoverage,
  getWaterSupplyStatus,
  getWorkDiagnosis,
  hashCanonicalState,
  isResidenceWaterServed,
  iterateBuildings,
  SAVE_VERSION,
  SCENARIOS,
  stepSimulation,
  TERRAIN_CHOKEPOINT_FIXTURE,
  WATER_SUPPLY_LABELS,
  type BuildingType,
  type SimulationConfig,
  type SimulationState,
} from '@/index'

const audit = (label: string, value: unknown): void => {
  console.log(`AUDIT ${label}: ${JSON.stringify(value)}`)
}

const config = (): SimulationConfig => ({
  world: { seed: 'nova-step10ba', width: 14, height: 8 },
})

interface SceneSpec {
  readonly residences: readonly (readonly [number, number])[]
  readonly buildings: readonly {
    readonly type: BuildingType
    readonly x: number
    readonly y: number
  }[]
  readonly roads: readonly (readonly [number, number])[]
  readonly colonists: number
  readonly water?: number
}

const withBuilding = (
  state: SimulationState,
  type: BuildingType,
  x: number,
  y: number
): SimulationState => {
  const created = createBuilding(state, type, x, y, 2)
  const building = created.state.buildings[created.buildingId]
  if (building === undefined) {
    throw new Error('10ba: building missing')
  }
  return {
    ...created.state,
    buildings: {
      ...created.state.buildings,
      [created.buildingId]: {
        ...building,
        status: 'operational',
        constructionRemaining: 0,
      },
    },
  }
}

const withRoad = (state: SimulationState, x: number, y: number): SimulationState => {
  const created = createRoads(state, [{ x, y }])
  const id = created.roadIds[0]
  const road = id === undefined ? undefined : created.state.roads[id]
  if (id === undefined || road === undefined) {
    throw new Error('10ba: road missing')
  }
  return {
    ...created.state,
    roads: {
      ...created.state.roads,
      [id]: { ...road, status: 'operational', constructionRemaining: 0 },
    },
  }
}

const scene = (spec: SceneSpec): SimulationState => {
  let state = createInitialState(config())
  state = {
    ...state,
    resources: { construction: 200, food: 200, water: spec.water ?? 0 },
  }
  for (const [x, y] of spec.residences) {
    state = withBuilding(state, 'residence', x, y)
  }
  for (const building of spec.buildings) {
    state = withBuilding(state, building.type, building.x, building.y)
  }
  for (const [x, y] of spec.roads) {
    state = withRoad(state, x, y)
  }
  const residences = [...iterateBuildings(state)].filter(
    (building) => building.type === 'residence'
  )
  for (let index = 0; index < Math.min(spec.colonists, residences.length); index += 1) {
    const residence = residences[index]
    if (residence !== undefined) {
      state = createColonist(state, residence.id).state
    }
  }
  return assignJobs(state)
}

const residenceIds = (state: SimulationState): string[] =>
  [...iterateBuildings(state)]
    .filter((building) => building.type === 'residence')
    .map((building) => building.id)
    .sort()

// ---------------------------------------------------------------------------
// 1. Water vocabulary: supply vs service
// ---------------------------------------------------------------------------

describe('1. water vocabulary', () => {
  it('never uses "served" for the colony-wide supply state', () => {
    const supplyLabels = Object.values(WATER_SUPPLY_LABELS)
    audit('WATER_SUPPLY_LABELS', { labels: WATER_SUPPLY_LABELS })
    // The word `served` belongs to Residential SERVICE only.
    expect(supplyLabels.some((label) => /served/i.test(label))).toBe(false)
    // `supplied` is the word for the healthy flow, and every state has a label
    // (the bootstrap `inactive` state is deliberately empty).
    expect(WATER_SUPPLY_LABELS.supplied).toBe('supplied')
    expect(WATER_SUPPLY_LABELS.inactive).toBe('')
    expect(Object.keys(WATER_SUPPLY_LABELS).sort()).toEqual([
      'draining',
      'inactive',
      'noReserve',
      'noService',
      'shortage',
      'supplied',
    ])
  })

  it('formats the two facts separately on a real state', () => {
    // A split colony: one Residence served by the Well, one outside coverage.
    const state = scene({
      residences: [
        [1, 0],
        [3, 0],
      ],
      buildings: [{ type: 'well', x: 3, y: 2 }],
      roads: [
        [1, 1],
        [3, 1],
      ],
      colonists: 2,
      water: 10,
    })
    const status = getWaterSupplyStatus(state)
    const rows = {
      supplySuffix: formatWaterSupplySuffix(status),
      serviceLabel: formatResidenceService(status),
      state: status.state,
      served: status.servedResidences,
      residences: status.residences,
    }
    audit('TWO_FACTS', rows)
    // Supply: `supplied` (a flow fact). Service: `1 / 2 served` (coverage).
    expect(rows.supplySuffix).toBe(' · supplied')
    expect(rows.serviceLabel).toBe('1 / 2 served')
    expect(rows.supplySuffix.includes('served')).toBe(false)
    // A Residence can be unserved while the colony supply is healthy — the two
    // labels never contradict each other because they are different facts.
    expect(isResidenceWaterServed(state, residenceIds(state)[0] ?? '')).toBe(false)
  })

  it('measures the served-residence count in the three coverage shapes', () => {
    const shape = (
      roads: readonly (readonly [number, number])[],
      buildings: SceneSpec['buildings']
    ): SimulationState =>
      scene({
        residences: [
          [1, 0],
          [3, 0],
        ],
        buildings,
        roads,
        colonists: 2,
        water: 10,
      })
    const well = [{ type: 'well' as const, x: 3, y: 2 }]
    const disconnectedWell = [{ type: 'well' as const, x: 6, y: 6 }]
    const rows = {
      both: formatResidenceService(
        getWaterSupplyStatus(shape([[1, 1], [2, 1], [3, 1]], well))
      ),
      one: formatResidenceService(getWaterSupplyStatus(shape([[1, 1], [3, 1]], well))),
      none: formatResidenceService(
        getWaterSupplyStatus(shape([[1, 1], [3, 1]], disconnectedWell))
      ),
    }
    audit('SERVED_COUNTS', rows)
    // One joined network -> both Residences share the Well's coverage.
    expect(rows.both).toBe('2 / 2 served')
    // Two networks, one of them the Well's -> exactly one Residence served.
    expect(rows.one).toBe('1 / 2 served')
    // A Well nobody can reach covers no network -> nothing is served.
    expect(rows.none).toBe('0 / 2 served')
    // A colony with no operational Residence at all reads 0 / 0.
    const empty = createInitialState(config())
    expect(formatResidenceService(getWaterSupplyStatus(empty))).toBe('0 / 0 served')
  })

  it('reads service from the 10P coverage authority only', () => {
    const state = scene({
      residences: [
        [1, 0],
        [3, 0],
      ],
      buildings: [{ type: 'well', x: 3, y: 2 }],
      roads: [
        [1, 1],
        [3, 1],
      ],
      colonists: 2,
    })
    const coverage = getWaterCoverage(state).servedResidenceIds
    for (const id of residenceIds(state)) {
      expect(isResidenceWaterServed(state, id)).toBe(coverage.includes(id))
    }
    expect(isResidenceWaterServed(state, 'nope')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 2. Workforce diagnosis
// ---------------------------------------------------------------------------

describe('2. workforce diagnosis', () => {
  it('names every existing cause without inventing a new one', () => {
    // (a) no operational workplace at all
    const noWorkplace = scene({
      residences: [[1, 0]],
      buildings: [],
      roads: [[1, 1]],
      colonists: 1,
    })
    // (b) a workplace on the other network
    const notConnected = scene({
      residences: [[1, 0]],
      buildings: [{ type: 'farm', x: 3, y: 2 }],
      roads: [
        [1, 1],
        [3, 1],
      ],
      colonists: 1,
    })
    // (c) the only reachable workplace is occupied by the other colonist
    const occupied = scene({
      residences: [
        [1, 0],
        [2, 0],
      ],
      buildings: [{ type: 'farm', x: 1, y: 2 }],
      roads: [
        [1, 1],
        [2, 1],
      ],
      colonists: 2,
    })
    // (d) the colonist is on a construction crew
    const crew = (() => {
      let base = scene({
        residences: [[1, 0]],
        buildings: [{ type: 'well', x: 1, y: 2 }],
        roads: [[1, 1]],
        colonists: 1,
      })
      // An AUTHORED under-construction site: no tick runs, so the crew
      // assignment below is measured on a site that is still being built.
      const created = createBuilding(base, 'farm', 5, 5, 2)
      base = created.state
      const siteId = created.buildingId
      const colonistId = Object.keys(base.colonists).sort()[0] ?? ''
      // The crew transaction itself (the same command the tick runs): a crewed
      // 2-tick site finishes ON the tick it is crewed, so the crewing state is
      // the transaction's result, which is exactly what the inspector shows
      // between the command and the next tick.
      return applyCommand(base, {
        type: 'assignConstructionCrew',
        colonistId,
        buildingId: siteId,
      }).state
    })()

    const diagnose = (state: SimulationState, index = 0) => {
      const colonistId = Object.keys(state.colonists).sort()[index] ?? ''
      return getWorkDiagnosis(state, colonistId)
    }
    const rows = {
      noWorkplace: diagnose(noWorkplace),
      notConnected: diagnose(notConnected),
      occupied: diagnose(occupied, 1),
      crew: diagnose(crew),
      unknown: getWorkDiagnosis(noWorkplace, 'nope'),
    }
    audit('WORK_DIAGNOSIS', rows)
    // (a) no candidate pool.
    expect(rows.noWorkplace?.operationalWorkplaces).toBe(0)
    expect(rows.noWorkplace?.reasons).toEqual({})
    expect(rows.noWorkplace?.employed).toBe(false)
    // (b) the existing `notConnected` reason, counted.
    expect(rows.notConnected?.operationalWorkplaces).toBe(1)
    expect(rows.notConnected?.reasons).toEqual({ notConnected: 1 })
    // (c) the existing `workplaceOccupied` reason, counted.
    expect(rows.occupied?.operationalWorkplaces).toBe(1)
    expect(rows.occupied?.reasons).toEqual({ workplaceOccupied: 1 })
    expect(rows.occupied?.employed).toBe(false)
    // (d) the existing construction-assignment field.
    expect(rows.crew?.onConstructionCrew).toBe(true)
    expect(rows.crew?.employed).toBe(false)
    // Unknown colonist: no diagnosis (never an invented one).
    expect(rows.unknown).toBeNull()
    // The reason keys are exactly the domain's reassignment reasons.
    const domainReasons = new Set(
      getReassignmentOptions(occupied, Object.keys(occupied.colonists).sort()[1] ?? '')
        .map((option) => option.reason)
        .filter((reason) => reason !== null)
    )
    expect([...domainReasons].sort()).toEqual(['workplaceOccupied'])
  })

  it('reports an employed colonist as employed with the assignment mode', () => {
    const state = scene({
      residences: [[1, 0]],
      buildings: [{ type: 'well', x: 1, y: 2 }],
      roads: [[1, 1]],
      colonists: 1,
    })
    const diagnosis = getWorkDiagnosis(state, Object.keys(state.colonists)[0] ?? '')
    audit('WORK_EMPLOYED', diagnosis)
    expect(diagnosis?.employed).toBe(true)
    expect(diagnosis?.onConstructionCrew).toBe(false)
    expect(diagnosis?.assignmentMode).toBe('automatic')
  })
})

// ---------------------------------------------------------------------------
// 3. Placement spatial preview
// ---------------------------------------------------------------------------

describe('3. placement spatial preview', () => {
  const layout = scene({
    residences: [[1, 0]],
    buildings: [
      { type: 'farm', x: 1, y: 2 },
      { type: 'well', x: 3, y: 2 },
    ],
    roads: [
      [1, 1],
      [3, 1],
    ],
    colonists: 1,
  })

  it('predicts the decisive 10AZ cells correctly', () => {
    const bridge = getPlacementSpatialPreview(layout, { x: 2, y: 1 })
    const farmNetwork = getPlacementSpatialPreview(layout, { x: 0, y: 1 })
    const noRoad = getPlacementSpatialPreview(layout, { x: 6, y: 6 })
    audit('PREVIEW', { bridge, farmNetwork, noRoad })
    // The bridge cell touches BOTH networks, is covered by the Well and reaches
    // the one vacant workplace.
    expect(bridge.adjacentRoads).toBe(2)
    expect(bridge.networkIds).toHaveLength(2)
    expect(bridge.waterCovered).toBe(true)
    // Both operational workplaces sit on the two networks the bridge touches
    // (the Well on one, the Farm on the other) — the decisive difference from
    // the Farm-network cell, which reaches only the Farm.
    expect(bridge.reachableWorkplaces).toBe(2)
    expect(farmNetwork.reachableWorkplaces).toBe(1)
    // The Farm-network cell is uncovered and reaches only the occupied Farm.
    expect(farmNetwork.adjacentRoads).toBe(1)
    expect(farmNetwork.networkIds).toHaveLength(1)
    expect(farmNetwork.waterCovered).toBe(false)
    // A cell with no adjacent road can never be served or produce.
    expect(noRoad.adjacentRoads).toBe(0)
    expect(noRoad.networkIds).toEqual([])
    expect(noRoad.waterCovered).toBe(false)
    expect(noRoad.reachableWorkplaces).toBe(0)
  })

  it('never diverges from the real access/coverage of an existing building', () => {
    const states = [
      layout,
      scene({
        residences: [
          [1, 0],
          [3, 0],
        ],
        buildings: [{ type: 'well', x: 3, y: 2 }],
        roads: [
          [1, 1],
          [3, 1],
        ],
        colonists: 2,
      }),
      createScenarioState(
        { world: { seed: 'nova-step10ba', width: 14, height: 12 } },
        TERRAIN_CHOKEPOINT_FIXTURE
      ),
    ]
    const rows = states.flatMap((state) =>
      [...iterateBuildings(state)].map((building) => {
        const preview = getPlacementSpatialPreview(state, {
          x: building.x,
          y: building.y,
        })
        const accessNetworks = getWaterCoverage(state)
        const coverageOfBuilding = getBuildingRoadAccess(state, building.id).networkIds
        const servedByPreview = preview.waterCovered
        const servedForReal = isResidenceWaterServed(state, building.id)
        return {
          building: `${building.type}@${building.x},${building.y}`,
          previewNetworks: preview.networkIds.length,
          realNetworks: coverageOfBuilding.length,
          previewCovered: servedByPreview,
          realCovered: coverageOfBuilding.some((id) =>
            accessNetworks.coveredNetworkIds.has(id)
          ),
          isResidence: building.type === 'residence',
          realServed: servedForReal,
        }
      })
    )
    audit('PREVIEW_EQUIVALENCE', rows)
    for (const row of rows) {
      // Same networks, same coverage verdict as the authority.
      expect(row.previewNetworks).toBe(row.realNetworks)
      expect(row.previewCovered).toBe(row.realCovered)
      if (row.isResidence) {
        // For a Residence the preview's coverage verdict IS the service verdict.
        expect(row.previewCovered).toBe(row.realServed)
      }
    }
  })

  it('is pure: no mutation, stable under repetition, order-independent', () => {
    const before = hashCanonicalState(layout)
    const beforeJson = canonicalJson(layout)
    const first = Array.from({ length: 5 }, () =>
      getPlacementSpatialPreview(layout, { x: 2, y: 1 })
    )
    // Shuffled road insertion order in an otherwise identical world.
    let shuffled = createInitialState(config())
    shuffled = { ...shuffled, resources: { ...shuffled.resources, construction: 200 } }
    shuffled = withBuilding(shuffled, 'residence', 1, 0)
    shuffled = withBuilding(shuffled, 'farm', 1, 2)
    shuffled = withBuilding(shuffled, 'well', 3, 2)
    shuffled = withRoad(shuffled, 3, 1)
    shuffled = withRoad(shuffled, 1, 1)
    shuffled = createColonist(shuffled, residenceIds(shuffled)[0] ?? '').state
    shuffled = assignJobs(shuffled)
    const shuffledPreview = getPlacementSpatialPreview(shuffled, { x: 2, y: 1 })
    const rows = {
      repeatedIdentical: first.every(
        (preview) => JSON.stringify(preview) === JSON.stringify(first[0])
      ),
      stateUnchanged: hashCanonicalState(layout) === before,
      jsonUnchanged: canonicalJson(layout) === beforeJson,
      orderIndependent: JSON.stringify(shuffledPreview) === JSON.stringify(first[0]),
    }
    audit('PREVIEW_PURITY', rows)
    expect(rows.repeatedIdentical).toBe(true)
    expect(rows.stateUnchanged).toBe(true)
    expect(rows.jsonUnchanged).toBe(true)
    expect(rows.orderIndependent).toBe(true)
  })

  it('does not change any gameplay outcome (same commands, same states)', () => {
    // The preview is a read; a tick before and after any number of preview
    // reads must produce the identical canonical state.
    const drive = (state: SimulationState): SimulationState => {
      let next = stepSimulation(state, {
        type: 'placeBuilding',
        x: 2,
        y: 1,
        buildingType: 'residence',
      })
      next = stepSimulation(next, { type: 'placeRoads', cells: [{ x: 2, y: 0 }] })
      for (let index = 0; index < 10; index += 1) {
        next = stepSimulation(next)
      }
      return next
    }
    const plain = drive(layout)
    // Preview reads weighted in between the same commands.
    let noisy = layout
    noisy = (() => {
      for (let index = 0; index < 3; index += 1) {
        getPlacementSpatialPreview(noisy, { x: 2, y: 1 })
        getPlacementSpatialPreview(noisy, { x: 0, y: 1 })
        getWorkDiagnosis(noisy, Object.keys(noisy.colonists)[0] ?? '')
        getWaterSupplyStatus(noisy)
      }
      return stepSimulation(noisy, {
        type: 'placeBuilding',
        x: 2,
        y: 1,
        buildingType: 'residence',
      })
    })()
    noisy = stepSimulation(noisy, { type: 'placeRoads', cells: [{ x: 2, y: 0 }] })
    for (let index = 0; index < 10; index += 1) {
      noisy = stepSimulation(noisy)
    }
    const rows = {
      identical: hashCanonicalState(plain) === hashCanonicalState(noisy),
      saveVersion: SAVE_VERSION,
      scenarioCatalogue: SCENARIOS.length,
    }
    audit('GAMEPLAY_INVARIANT', rows)
    expect(rows.identical).toBe(true)
    expect(rows.saveVersion).toBe(8)
    // 7 when this step ran; Step 10BE later added one content scenario.
    expect(rows.scenarioCatalogue).toBe(8)
  })
})
