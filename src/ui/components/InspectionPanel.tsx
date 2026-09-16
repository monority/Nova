import type { Inspection } from '../../application/queries/to-inspection'

export function InspectionPanel({ inspection }: { inspection: Inspection | null }) {
  if (!inspection) return null
  return <aside className="inspection-panel" aria-label="Urban inspection">
    <p className="eyebrow">INSPECTION</p>
    <h2>{inspection.title}</h2>
    <p className="inspection-description">{inspection.description}</p>
    {inspection.kind === 'building' && <>
      <p className="inspection-line"><span>CAPACITY</span><strong>{inspection.capacity}</strong></p>
      {inspection.foodPerDay > 0 && <p className="inspection-line"><span>FOOD / DAY</span><strong>{inspection.foodPerDay}</strong></p>}
      <p className="inspection-line"><span>ROAD</span><strong>{inspection.roadAccess ? 'CONNECTED' : 'NO ACCESS'}</strong></p>
      <p className="inspection-line"><span>COMMUNITY</span><strong>{inspection.serviceCoverage ? 'COVERED' : 'OUTSIDE'}</strong></p>
      <p className="inspection-line"><span>STATUS</span><strong>{inspection.status}</strong></p>
    </>}
    {inspection.kind === 'road' && <>
      <p className="inspection-line"><span>CLASS</span><strong>{inspection.roadClass}</strong></p>
      <p className="inspection-line"><span>NETWORK</span><strong>{inspection.connectedCells} CELLS</strong></p>
      <p className="inspection-line"><span>STATUS</span><strong>{inspection.status}</strong></p>
    </>}
    {inspection.kind === 'service' && <>
      <p className="inspection-line"><span>COVERAGE</span><strong>RADIUS {inspection.coverageRadius}</strong></p>
      <p className="inspection-line"><span>STATUS</span><strong>{inspection.status}</strong></p>
    </>}
    {inspection.kind === 'zone' && <>
      <p className="inspection-line"><span>CELLS</span><strong>{inspection.cells}</strong></p>
      <p className="inspection-line"><span>STATUS</span><strong>{inspection.status}</strong></p>
    </>}
  </aside>
}
