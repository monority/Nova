/**
 * Keyed reconciliation (Step 1 #6, #15).
 *
 * Deterministic create/update/remove over keyed entities. Pure logic,
 * view-agnostic: tests run it against plain objects, the renderer plugs
 * Three.js factories in. Stable Object3D identity: existing views are
 * updated in place, never rebuilt.
 */

export interface ReconciliationOps<TView, TData> {
  create: (data: TData) => TView
  update: (view: TView, data: TData) => void
  remove: (view: TView) => void
}

export const reconcile = <TView, TData>(
  views: Map<string, TView>,
  data: readonly TData[],
  keyOf: (data: TData) => string,
  ops: ReconciliationOps<TView, TData>
): void => {
  const seen = new Set<string>()
  for (const item of data) {
    const key = keyOf(item)
    seen.add(key)
    const existing = views.get(key)
    if (existing === undefined) {
      views.set(key, ops.create(item))
    } else {
      ops.update(existing, item)
    }
  }
  for (const [key, view] of views) {
    if (!seen.has(key)) {
      ops.remove(view)
      views.delete(key)
    }
  }
}
