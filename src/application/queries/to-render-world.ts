import type { World } from '../../domain/world'
import type { RenderWorld } from '../contracts/render-snapshot'

export function toRenderWorld(world: World): RenderWorld {
  return {
    width: world.width,
    height: world.height,
    cells: world.cells.map((cell) => ({
      x: cell.x,
      y: cell.y,
      elevation: cell.elevation,
      water: cell.water,
      buildable: cell.buildable,
    })),
  }
}
