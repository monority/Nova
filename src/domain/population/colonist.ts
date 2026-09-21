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
 */

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
}
