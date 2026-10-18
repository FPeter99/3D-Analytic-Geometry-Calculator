import { describe, expect, it } from 'vitest'
import { calculate } from './calculator'

describe('universal calculator relations', () => {
 it('checks triangle and plane intersection (segment)', () => {
  const tri = { kind: 'triangle', name: 'ABC', data: { a: [0,0,0], b: [4,0,0], c: [2,4,0] } }
  const pl = { kind: 'plane', name: 'S1', data: { n: [0,1,0], d: 2 } }
  const res = calculate(tri, pl)
  expect(res.segment).toBeDefined()
  expect(res.value).toContain('átmetszi a háromszöget')
  expect(res.segment?.p).toBeDefined()
  expect(res.segment?.q).toBeDefined()
 })

 it('checks point and triangle containment and distance', () => {
  const tri = { kind: 'triangle', name: 'ABC', data: { a: [0,0,0], b: [4,0,0], c: [0,4,0] } }
  const ptInside = { kind: 'point', name: 'P1', data: { p: [1,1,0] } }
  const resInside = calculate(ptInside, tri)
  expect(resInside.value).toContain('belső pontja')

  const ptOutside = { kind: 'point', name: 'P2', data: { p: [5,5,0] } }
  const resOutside = calculate(ptOutside, tri)
  expect(resOutside.value).toContain('háromszögön kívül')
 })

 it('checks line and triangle piercing', () => {
  const tri = { kind: 'triangle', name: 'ABC', data: { a: [0,0,0], b: [4,0,0], c: [0,4,0] } }
  const lineHit = { kind: 'line', name: 'L1', data: { p: [1,1,-5], v: [0,0,1] } }
  const res = calculate(lineHit, tri)
  expect(res.point).toEqual([1,1,0])
  expect(res.value).toContain('átdöfi')
 })

 it('checks sphere and sphere intersection circle', () => {
  const s1 = { kind: 'sphere', name: 'G1', data: { center: [0,0,0], radius: 3 } }
  const s2 = { kind: 'sphere', name: 'G2', data: { center: [4,0,0], radius: 3 } }
  const res = calculate(s1, s2)
  expect(res.circle).toBeDefined()
  expect(res.circle?.radius).toBeCloseTo(Math.sqrt(5), 4)
 })

 it('checks plane and sphere relation in Hungarian and English', () => {
  const plane = { kind: 'plane', name: 'S1', data: { n: [0, 1, 0], d: 0 } }
  const sphere = { kind: 'sphere', name: 'G1', data: { center: [0, 0, 0], radius: 3 } }

  const resHu = calculate(plane, sphere, 'hu')
  expect(resHu.title).toBe('S1 sík és G1 gömb')
  expect(resHu.value).toContain('Metsző sík · metszetkör középpontja:')
  expect(resHu.value).toContain('sugara: 3')

  const resEn = calculate(plane, sphere, 'en')
  expect(resEn.title).toBe('S1 (plane) and G1 (sphere)')
  expect(resEn.value).toContain('Intersecting plane · section circle center:')
  expect(resEn.value).toContain('radius: 3')
 })
})
