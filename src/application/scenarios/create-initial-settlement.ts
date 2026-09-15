import { createSimulationState, type SimulationState } from '../../domain/simulation/simulation-state'
import { createZone, placeCommunityService } from '../../domain/city'
import { placeBuilding, placeRoad } from '../../domain/construction'
import type { GridPosition } from '../../domain/city'
import type { World } from '../../domain/world'

export function createInitialSettlement(world: World): SimulationState {
  const initial = createSimulationState(world)
  const center = { x: Math.floor(world.width / 2), y: Math.floor(world.height / 2) }
  const candidates = world.cells
    .filter((cell) => cell.buildable === 'buildable' && !cell.water)
    .map((cell) => ({ x: cell.x, y: cell.y }))
    .sort((a, b) => distance(a, center) - distance(b, center) || a.y - b.y || a.x - b.x)
  const used = new Set<string>()
  const nextCell = (): GridPosition => {
    const cell = candidates.find((candidate) => !used.has(key(candidate)))
    if (!cell) throw new Error('Initial settlement could not find a buildable cell')
    used.add(key(cell))
    return cell
  }

  let city = initial.city
  for (let index = 0; index < 5; index += 1) {
    const result = placeRoad(world, city, nextCell())
    if (result.valid) city = result.city
  }
  const residentialCells: GridPosition[] = []
  for (let index = 0; index < 6; index += 1) {
    const position = nextCell(); const result = placeBuilding(world, city, 'house', position)
    if (result.valid) { city = result.city; residentialCells.push(position) }
  }
  const agriculturalCells: GridPosition[] = []
  for (let index = 0; index < 2; index += 1) {
    const position = nextCell(); const result = placeBuilding(world, city, 'farm', position)
    if (result.valid) { city = result.city; agriculturalCells.push(position) }
  }
  const service = placeCommunityService(world, city, nextCell())
  if (service.valid) city = service.city
  const residentialZoneCells = [...residentialCells, ...Array.from({ length: 12 }, () => nextCell())]
  const agriculturalZoneCells = [...agriculturalCells, ...Array.from({ length: 6 }, () => nextCell())]
  const residentialZone = createZone(world, city.zones, 'residential', residentialZoneCells, city.nextZoneSequence)
  if (residentialZone.valid) city = { ...city, zones: residentialZone.zones, nextZoneSequence: city.nextZoneSequence + 1 }
  const agriculturalZone = createZone(world, city.zones, 'agricultural', agriculturalZoneCells, city.nextZoneSequence)
  if (agriculturalZone.valid) city = { ...city, zones: agriculturalZone.zones, nextZoneSequence: city.nextZoneSequence + 1 }
  return {
    ...initial,
    city,
    population: { total: Math.min(12, city.buildings.filter((building) => building.type === 'house').length * 4), growthProgress: 0 },
    economy: { ...initial.economy, food: 18 },
  }
}

function key(position: GridPosition): string { return `${position.x}:${position.y}` }
function distance(a: GridPosition, b: GridPosition): number { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) }
