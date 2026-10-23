import { describe, expect, it } from 'vitest'
import { evaluateParametricCurve, differentiateParametricCurve, validateParametricCurve, type ParametricCurve } from './geometry'

describe('3D spatial parametric curves', () => {
  it('evaluates 3D line and exact tangent', () => {
    const curve: ParametricCurve = { kind: 'line', points: [[1, 2, 3], [3, 6, 9]], tMin: 0, tMax: 1 }
    expect(evaluateParametricCurve(curve, .5)).toEqual([2, 4, 6])
    expect(differentiateParametricCurve(curve, .5)).toEqual([2, 4, 6])
  })

  it('evaluates 3D Bézier endpoints and derivatives', () => {
    const curve: ParametricCurve = { kind: 'cubic-bezier', points: [[0,0,0],[1,0,0],[1,1,0],[0,1,0]], tMin: 0, tMax: 1 }
    expect(evaluateParametricCurve(curve, 0)).toEqual([0,0,0])
    expect(evaluateParametricCurve(curve, 1)).toEqual([0,1,0])
    expect(differentiateParametricCurve(curve, 0)).toEqual([3,0,0])
  })

  it('evaluates 3D Parabola with exact 3D tangent', () => {
    const parabola: ParametricCurve = { kind: 'parabola', vertex: [0,0,0], axis: [0,1,0], transverse: [1,0,0], p: 1, tMin: -2, tMax: 2 }
    expect(evaluateParametricCurve(parabola, 2)).toEqual([2, 1, 0])
    expect(differentiateParametricCurve(parabola, 2)).toEqual([1, 1, 0])
  })

  it('evaluates 3D Helix and 3D Ellipse', () => {
    const helix: ParametricCurve = { kind: 'helix', center: [0,0,0], radius: 2, pitch: 4, normal: [0,0,1], tMin: 0, tMax: 10 }
    expect(evaluateParametricCurve(helix, 0)[0]).toBeCloseTo(2)
    const ellipse: ParametricCurve = { kind: 'ellipse', center: [0,0,0], semiMajor: [3,0,0], semiMinor: [0,2,0], tMin: 0, tMax: 6.28 }
    expect(evaluateParametricCurve(ellipse, 0)).toEqual([3,0,0])
  })

  it('rejects invalid parameters', () => {
    expect(() => validateParametricCurve({ kind: 'line', points: [[0,0,0], [1,1,1]], tMin: 1, tMax: 1 })).toThrow()
  })
})
