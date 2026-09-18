/**
 * Transport network queries (Step 09A §21). Thin application layer over the
 * domain connectivity rule: domain owns the spatial rule, this query exposes
 * it to UI/E2E. Pure derivations; nothing persisted.
 */

import { getAccessibleBuildingIds } from '../../domain/network/network.js'
import type { SimulationState } from '../../domain/simulation/state.js'

/** Count of accessible buildings (Step 09A §19 E2E surface). */
export const getAccessibleBuildingCount = (state: SimulationState): number =>
  getAccessibleBuildingIds(state).length
