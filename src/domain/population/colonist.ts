/**
 * Colonist domain model (docs/07-population.md).
 *
 * A colonist is an agent with stable identity and a residence.
 * Needs / employment / economy do not exist yet (later phases).
 */

export interface ColonistState {
  readonly id: string
  /** Residence building id, or null when homeless. Step 0 never creates homeless colonists. */
  readonly residenceId: string | null
}
