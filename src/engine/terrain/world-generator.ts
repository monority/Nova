import { createRandom } from '../random/random-source'
import { toCellId, toWorldId, type Buildability, type TerrainCell, type World } from '../../domain/world'

export interface WorldGenerationOptions {
  seed: number
  width: number
  height: number
}

function validateDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('World dimensions must be positive integers')
  }
}

function createTerrainCell(x: number, y: number, width: number, height: number, random: ReturnType<typeof createRandom>): TerrainCell {
  const normalizedX = (x / Math.max(width - 1, 1)) * 2 - 1
  const normalizedY = (y / Math.max(height - 1, 1)) * 2 - 1
  const edgeDistance = Math.max(Math.abs(normalizedX), Math.abs(normalizedY))
  const variation = Math.sin(x * 0.17) * 0.06 + Math.cos(y * 0.13) * 0.05 + random.nextFloat(-0.035, 0.035)
  const elevation = Math.min(1, Math.max(0, 0.68 - edgeDistance * 0.4 + variation))
  const water = elevation < 0.35
  const buildable: Buildability = water ? 'water' : elevation > 0.72 ? 'restricted' : 'buildable'

  return {
    id: toCellId(`cell-${x}-${y}`),
    x,
    y,
    elevation,
    water,
    buildable,
  }
}

export function generateWorld({ seed, width, height }: WorldGenerationOptions): World {
  validateDimensions(width, height)
  const random = createRandom(seed)
  const cells = Array.from({ length: width * height }, (_, index) => {
    const x = index % width
    const y = Math.floor(index / width)
    return createTerrainCell(x, y, width, height, random)
  })

  return {
    id: toWorldId(`world-${Math.trunc(seed)}-${width}x${height}`),
    seed,
    width,
    height,
    cells,
  }
}
