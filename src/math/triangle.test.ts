import{describe,expect,it}from'vitest';import{triangleAnalysis}from'./triangle'
const right={a:[0,0,0] as [number,number,number],b:[4,0,0] as [number,number,number],c:[0,3,0] as [number,number,number]}
describe('triangle derived geometry',()=>{it('computes sides, angles, area and centroid',()=>{const t=triangleAnalysis(right);expect(t.lengths).toEqual([4,5,3]);expect(t.area).toBe(6);expect(t.perimeter).toBe(12);expect(t.centers.centroid).toEqual([4/3,1,0])});it('computes the plane normal perpendicular to its sides',()=>{const t=triangleAnalysis(right);expect(t.plane.n).toEqual([0,0,12]);expect(t.plane.d).toBe(0)});it('computes circumcenter and radius',()=>{const t=triangleAnalysis(right);expect(t.centers.circumcenter).toEqual([2,1.5,0]);expect(t.radii.circumradius).toBe(2.5)});it('computes incenter and inradius',()=>{const t=triangleAnalysis(right);expect(t.centers.incenter[0]).toBeCloseTo(1);expect(t.centers.incenter[1]).toBeCloseTo(1);expect(t.radii.inradius).toBe(1)});it('computes correct altitude direction vectors',()=>{const t=triangleAnalysis(right);expect(t.altitudes[0].v[0]*-4+t.altitudes[0].v[1]*3).toBeCloseTo(0);expect(t.altitudes[1].v[1]).toBeCloseTo(0)});it('computes orthocenter as exact altitude intersection',()=>{
  const a:[number,number,number]=[1,2,1], b:[number,number,number]=[4,1,3], c:[number,number,number]=[3,4,2];
  const t = triangleAnalysis({a,b,c});
  const H = t.centers.orthocenter;
  expect(H[0]).toBeCloseTo(8/3, 5);
  expect(H[1]).toBeCloseTo(43/15, 5);
  expect(H[2]).toBeCloseTo(29/15, 5);
});



it('rejects collinear vertices',()=>expect(()=>triangleAnalysis({a:[0,0,0],b:[1,0,0],c:[2,0,0]})).toThrow())})