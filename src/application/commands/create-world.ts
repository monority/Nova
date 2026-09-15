import { generateWorld } from '../../engine/terrain/world-generator'
import type { World } from '../../domain/world'

export interface CreateWorldCommand {
  seed: number
  width: number
  height: number
}

export function createWorld(command: CreateWorldCommand): World {
  return generateWorld(command)
}
