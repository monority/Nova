/**
 * Colonist domain model (docs/07-population.md).
 *
 * A colonist is an agent with stable identity, a residence and — since
 * Step 07C — at most one workplace. Employment is stored as the concrete
 * relationship itself (`workplaceId`), not as a Job/Worker/EmploymentSystem
 * abstraction: one concrete use case does not justify a generic framework.
 *
 * Step 10M adds ONE explicit bit: whether the current workplace was chosen
 * automatically by `assignJobs` or manually by the player. The colonist
 * remains the canonical owner of employment state; there is no reverse index
 * and no workplace-side worker array.
 *
 * Step 10Y adds ONE more concrete relationship: an optional construction crew
 * assignment (`constructionAssignmentId`). It is a MANUAL-only relationship —
 * `assignJobs` never creates one — and it is mutually exclusive with
 * employment: a colonist either holds a workplace or crews one construction
 * site, never both. There is no generic Task/Assignment abstraction.
 */

import type { BuildingType } from '../building/building.js'

/**
 * How this colonist's workplace was chosen.
 *
 * - `automatic`: `assignJobs` owns the choice (the default, and the meaning
 *   of every pre-Step-10M save);
 * - `manual`: the player explicitly reassigned this colonist; `assignJobs`
 *   preserves the choice while it stays valid and clears it otherwise.
 */
export type WorkplaceAssignmentMode = 'automatic' | 'manual'

export interface ColonistState {
  readonly id: string
  /** Residence building id, or null when homeless. Step 0 never creates homeless colonists. */
  readonly residenceId: string | null
  /**
   * Workplace building id, or null while unemployed. Canonical employment
   * state: assigned by the deterministic `assignJobs` phase, and reassigned
   * by the explicit `reassignColonist` command (Step 10M).
   */
  readonly workplaceId: string | null
  /**
   * Owner of the workplace choice (Step 10M). `automatic` is the default and
   * the migration value for every pre-Step-10M save.
   */
  readonly workplaceAssignmentMode: WorkplaceAssignmentMode
  /**
   * Under-construction building this colonist crews, or null (Step 10Y).
   * Canonical, manual-only: `assignJobs` never sets it, and while it is set
   * the colonist holds no workplace (`workplaceId` is null). It is cleared
   * deterministically by the construction phase as soon as the site becomes
   * operational, after which `assignJobs` may employ the colonist again.
   */
  readonly constructionAssignmentId: string | null
}

/**
 * Step 10CQ: construction Material earned per tick by an employed colonist.
 * Reuses the existing Material resource as the initial currency: no new
 * resource is introduced.
 *
 * Product-model correction: the Workshop is the SOLE Material producer
 * (Farm → Food, Well → Water, Workshop → Material). Farm and Well
 * employment generates no Material — their economic role is fully captured
 * by their own resource output. Only Workshop employment earns income, at a
 * higher rate because Workshops are the only producers of Material.
 * Fixed rate × employment state, no prices, no markets, no spending.
 */
export const MATERIAL_INCOME_PER_FARM_WORKER_PER_TICK = 0
export const MATERIAL_INCOME_PER_WELL_WORKER_PER_TICK = 0
export const MATERIAL_INCOME_PER_WORKSHOP_WORKER_PER_TICK = 2

/**
 * Deterministic per-tick Material income rate for a colonist employed at a
 * given workplace type (Step 10CQ).
 */
export const getWorkplaceMaterialIncomeRate = (
  workplaceType: BuildingType
): number => {
  if (workplaceType === 'farm') return MATERIAL_INCOME_PER_FARM_WORKER_PER_TICK
  if (workplaceType === 'well') return MATERIAL_INCOME_PER_WELL_WORKER_PER_TICK
  if (workplaceType === 'workshop') return MATERIAL_INCOME_PER_WORKSHOP_WORKER_PER_TICK
  return 0
}
