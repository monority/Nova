/**
 * Colonist domain model (docs/07-population.md).
 *
 * A colonist is an agent with stable identity, a residence and — since
 * Step 07C — at most one workplace. Employment is stored as the concrete
 * relationship itself (`workplaceId`), not as a Job/Worker/EmploymentSystem
 * abstraction: one concrete use case does not justify a generic framework.
 */

export interface ColonistState {
  readonly id: string
  /** Residence building id, or null when homeless. Step 0 never creates homeless colonists. */
  readonly residenceId: string | null
  /**
   * Workplace building id, or null while unemployed. Canonical employment
   * state: assigned and cleared only by the deterministic `assignJobs` phase.
   */
  readonly workplaceId: string | null
}
