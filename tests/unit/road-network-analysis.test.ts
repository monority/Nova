import { describe, expect, it } from 'vitest'
import { classifyRoad, getRoadComponent, isRoadIntersection } from '../../src/domain/city'
import { toRoadId, type Road } from '../../src/domain/city'

function roads(cells: Array<[number, number]>): Road[] {
  return cells.map(([x, y], index) => ({ id: toRoadId(`road:${index + 1}`), position: { x, y }, orientation: 'horizontal' }))
}

describe('road network structure', () => {
  it('finds connected components and intersections', () => {
    const network = roads([[1, 1], [2, 1], [3, 1], [3, 2], [3, 3]])
    expect(getRoadComponent(network, { x: 1, y: 1 })).toHaveLength(5)
    expect(isRoadIntersection(network, { x: 3, y: 1 })).toBe(false)
    expect(isRoadIntersection([...network, { id: toRoadId('road:6'), position: { x: 4, y: 1 }, orientation: 'horizontal' }], { x: 3, y: 1 })).toBe(true)
  })

  it('classifies a long network with a junction as arterial', () => {
    const network = roads([[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [3, 2], [3, 0]])
    expect(classifyRoad(network[0], network)).toBe('arterial')
  })
})
