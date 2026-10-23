export type Vec3 = [number, number, number]
export type Line = { p: Vec3; v: Vec3 }
export type Plane = { n: Vec3; d: number }
export type Circle = { center: Vec3; radius: number; normal: Vec3; basis: [Vec3, Vec3] }
export type ParametricCurve =
  | { kind: 'line'; points: [Vec3, Vec3]; tMin: number; tMax: number }
  | { kind: 'cubic-bezier'; points: [Vec3, Vec3, Vec3, Vec3]; tMin: number; tMax: number }
  | { kind: 'helix'; center: Vec3; radius: number; pitch: number; normal: Vec3; tMin: number; tMax: number }
  | { kind: 'parabola'; vertex: Vec3; axis: Vec3; transverse: Vec3; p: number; tMin: number; tMax: number }
  | { kind: 'ellipse'; center: Vec3; semiMajor: Vec3; semiMinor: Vec3; tMin: number; tMax: number }
  | { kind: 'spiral'; center: Vec3; radius: number; growth: number; pitch: number; normal: Vec3; tMin: number; tMax: number }

export type ParametricCurveTangent = { point: Vec3; tangent: Vec3; line: Line }
export const EPS = 1e-9
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0]+b[0],a[1]+b[1],a[2]+b[2]]
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0],a[1]-b[1],a[2]-b[2]]
export const scale = (a: Vec3, k: number): Vec3 => [a[0]*k,a[1]*k,a[2]*k]
export const dot = (a: Vec3, b: Vec3): number => a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
export const norm = (a: Vec3): number => Math.hypot(...a)
export const normalize = (a: Vec3): Vec3 => { const n=norm(a); if(n<EPS) throw new Error('A nulla vektor nem megengedett.'); return scale(a,1/n) }
export const angle = (a:Vec3,b:Vec3):number=>Math.acos(Math.max(-1,Math.min(1,dot(a,b)/(norm(a)*norm(b)))))
export const lineFromPoints = (p: Vec3,q: Vec3): Line => { const v=sub(q,p); if(norm(v)<EPS) throw new Error('A két pont nem lehet azonos.'); return {p:[...p],v} }
export const circleFromCenterRadiusNormal = (center: Vec3,radius: number,normal: Vec3): Circle => {
 if(!Number.isFinite(radius)||radius<=0)throw new Error('A kör sugara pozitív kell legyen.')
 const n=normalize(normal),reference:Vec3=Math.abs(n[0])<0.9?[1,0,0]:[0,1,0],u=normalize(cross(n,reference)),v=cross(n,u)
 return{center:[...center],radius,normal:n,basis:[u,v]}
}
export const circumcircleFromPoints = (a: Vec3,b: Vec3,c: Vec3): Circle => {
 const ab=sub(b,a),ac=sub(c,a),n=cross(ab,ac),n2=dot(n,n)
 if(norm(ab)<EPS||norm(ac)<EPS||norm(sub(c,b))<EPS||norm(n)<EPS)throw new Error('A pontok kollineárisak vagy azonosak.')
 const offset=scale(add(cross(scale(ac,dot(ab,ab)),n),cross(n,scale(ab,dot(ac,ac)))),1/(2*n2)),center=add(a,offset)
 return circleFromCenterRadiusNormal(center,distance(center,a),n)
}
export const circlePoint = (circle: Circle,t: number): Vec3 => add(circle.center,scale(add(scale(circle.basis[0],Math.cos(t)),scale(circle.basis[1],Math.sin(t))),circle.radius))

export function curveBasis(normal: Vec3): [Vec3, Vec3] {
 const n = normalize(normal)
 const ref: Vec3 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0]
 const u = normalize(cross(ref, n))
 const v = cross(n, u)
 return [u, v]
}

export function validateParametricCurve(curve: ParametricCurve): void {
 if (!Number.isFinite(curve.tMin) || !Number.isFinite(curve.tMax) || curve.tMin >= curve.tMax)
  throw new Error('Require finite bounds with tMin < tMax.')
 if (curve.kind === 'line') {
  if (curve.points.length !== 2 || curve.points.some(p => p.length !== 3 || p.some(n => !Number.isFinite(n))))
   throw new Error('Invalid points for 3D line.')
 } else if (curve.kind === 'cubic-bezier') {
  if (curve.points.length !== 4 || curve.points.some(p => p.length !== 3 || p.some(n => !Number.isFinite(n))))
   throw new Error('Invalid control points for 3D cubic Bézier.')
 } else if (curve.kind === 'helix') {
  if (curve.radius <= 0 || !Number.isFinite(curve.radius) || !Number.isFinite(curve.pitch) || norm(curve.normal) < EPS)
   throw new Error('3D Helix requires positive radius, finite pitch and valid normal.')
 } else if (curve.kind === 'parabola') {
  if (curve.p <= 0 || !Number.isFinite(curve.p) || norm(curve.axis) < EPS || norm(curve.transverse) < EPS)
   throw new Error('3D Parabola requires positive focal parameter p and non-zero direction vectors.')
 } else if (curve.kind === 'ellipse') {
  if (norm(curve.semiMajor) < EPS || norm(curve.semiMinor) < EPS)
   throw new Error('3D Ellipse requires non-zero semi-axis vectors.')
 } else if (curve.kind === 'spiral') {
  if (curve.radius <= 0 || !Number.isFinite(curve.radius) || norm(curve.normal) < EPS)
   throw new Error('3D Spiral requires positive initial radius and valid normal.')
 }
}

export function evaluateParametricCurve(curve: ParametricCurve, t: number): Vec3 {
 validateParametricCurve(curve)
 if (!Number.isFinite(t)) throw new Error('Parameter must be finite.')
 if (curve.kind === 'line') {
  const dt = curve.tMax - curve.tMin
  const u = (t - curve.tMin) / dt
  return add(curve.points[0], scale(sub(curve.points[1], curve.points[0]), u))
 }
 if (curve.kind === 'cubic-bezier') {
  const dt = curve.tMax - curve.tMin
  const u = (t - curve.tMin) / dt, s = 1 - u
  const p = curve.points
  return add(add(scale(p[0], s * s * s), scale(p[1], 3 * s * s * u)), add(scale(p[2], 3 * s * u * u), scale(p[3], u * u * u)))
 }
 if (curve.kind === 'helix') {
  const [u, v] = curveBasis(curve.normal)
  const n = normalize(curve.normal)
  const rad = curve.radius, h = curve.pitch
  return add(add(curve.center, add(scale(u, rad * Math.cos(t)), scale(v, rad * Math.sin(t)))), scale(n, (h * t) / (2 * Math.PI)))
 }
 if (curve.kind === 'parabola') {
  const a = normalize(curve.axis)
  let b = sub(curve.transverse, scale(a, dot(curve.transverse, a)))
  if (norm(b) < EPS) throw new Error('Transverse vector must not be parallel to axis.')
  b = normalize(b)
  return add(add(curve.vertex, scale(b, t)), scale(a, (t * t) / (4 * curve.p)))
 }
 if (curve.kind === 'ellipse') {
  return add(add(curve.center, scale(curve.semiMajor, Math.cos(t))), scale(curve.semiMinor, Math.sin(t)))
 }
 if (curve.kind === 'spiral') {
  const [u, v] = curveBasis(curve.normal)
  const n = normalize(curve.normal)
  const rad = curve.radius + curve.growth * t, h = curve.pitch
  return add(add(curve.center, add(scale(u, rad * Math.cos(t)), scale(v, rad * Math.sin(t)))), scale(n, (h * t) / (2 * Math.PI)))
 }
 throw new Error('Unknown curve kind.')
}

export function differentiateParametricCurve(curve: ParametricCurve, t: number): Vec3 {
 validateParametricCurve(curve)
 if (!Number.isFinite(t)) throw new Error('Parameter must be finite.')
 if (curve.kind === 'line') {
  const dt = curve.tMax - curve.tMin
  return scale(sub(curve.points[1], curve.points[0]), 1 / dt)
 }
 if (curve.kind === 'cubic-bezier') {
  const dt = curve.tMax - curve.tMin
  const u = (t - curve.tMin) / dt, s = 1 - u
  const p = curve.points
  const dp0 = sub(p[1], p[0]), dp1 = sub(p[2], p[1]), dp2 = sub(p[3], p[2])
  return scale(add(add(scale(dp0, 3 * s * s), scale(dp1, 6 * s * u)), scale(dp2, 3 * u * u)), 1 / dt)
 }
 if (curve.kind === 'helix') {
  const [u, v] = curveBasis(curve.normal)
  const n = normalize(curve.normal)
  const rad = curve.radius, h = curve.pitch
  return add(add(scale(u, -rad * Math.sin(t)), scale(v, rad * Math.cos(t))), scale(n, h / (2 * Math.PI)))
 }
 if (curve.kind === 'parabola') {
  const a = normalize(curve.axis)
  let b = sub(curve.transverse, scale(a, dot(curve.transverse, a)))
  b = normalize(b)
  return add(b, scale(a, t / (2 * curve.p)))
 }
 if (curve.kind === 'ellipse') {
  return add(scale(curve.semiMajor, -Math.sin(t)), scale(curve.semiMinor, Math.cos(t)))
 }
 if (curve.kind === 'spiral') {
  const [u, v] = curveBasis(curve.normal)
  const n = normalize(curve.normal)
  const rad = curve.radius + curve.growth * t, k = curve.growth, h = curve.pitch
  const dRadial = add(scale(u, k * Math.cos(t) - rad * Math.sin(t)), scale(v, k * Math.sin(t) + rad * Math.cos(t)))
  return add(dRadial, scale(n, h / (2 * Math.PI)))
 }
 throw new Error('Unknown curve kind.')
}

export function parametricCurveTangent(curve: ParametricCurve, t: number): ParametricCurveTangent {
 const point = evaluateParametricCurve(curve, t), tangent = differentiateParametricCurve(curve, t)
 if (norm(tangent) < EPS) throw new Error('The curve has no unique tangent at this parameter.')
 return { point, tangent, line: { p: point, v: tangent } }
}

export const planeFromPointNormal = (p: Vec3,n: Vec3): Plane => { if(norm(n)<EPS) throw new Error('A normálvektor nem lehet nulla.'); return {n:[...n],d:dot(n,p)} }
export const planeFromDirections = (p: Vec3,u: Vec3,v: Vec3): Plane => { const n=cross(u,v); if(norm(u)<EPS||norm(v)<EPS||norm(n)<EPS) throw new Error('A két irányvektor nem határoz meg egyértelmű síkot.'); return planeFromPointNormal(p,n) }
export const lineRelation = (a: Line,b: Line): {kind:string; point?:Vec3; distance?:number; closestA?:Vec3; closestB?:Vec3} => {
 const w=sub(b.p,a.p),c=cross(a.v,b.v),cn=norm(c),aa=dot(a.v,a.v),bb=dot(a.v,b.v),cc=dot(b.v,b.v)
 if(aa<EPS||cc<EPS)throw new Error('Egyenes irányvektora nem lehet nulla.')
 if(cn<EPS){const distance=norm(cross(w,a.v))/Math.sqrt(aa),t=dot(w,a.v)/aa,closestA=add(a.p,scale(a.v,t));return distance<EPS?{kind:'coincident',distance:0,closestA,closestB:closestA}:{kind:'parallel',distance,closestA,closestB:b.p}}
 const triple=dot(w,c)
 const dd=dot(a.v,w),ee=dot(b.v,w),den=aa*cc-bb*bb
 const s=(cc*dd-bb*ee)/den,t=(bb*dd-aa*ee)/den,closestA=add(a.p,scale(a.v,s)),closestB=add(b.p,scale(b.v,t)),distance=norm(sub(closestA,closestB))
 if(Math.abs(triple)>EPS*cn*Math.max(1,norm(w)))return{kind:'skew',distance,closestA,closestB}
 return{kind:'intersect',point:scale(add(closestA,closestB),.5),distance:0,closestA,closestB}
}
export const planeRelation = (a: Plane,b: Plane): {kind:string; line?:Line; distance?:number} => {
 const direction=cross(a.n,b.n),m=norm(direction),na=norm(a.n),nb=norm(b.n)
 if(na<EPS||nb<EPS)throw new Error('A sík normálvektora nem lehet nulla.')
 if(m<EPS){const signed=b.d*dot(a.n,b.n)/dot(b.n,b.n),distance=Math.abs(a.d-signed)/na;return distance<EPS?{kind:'coincident'}:{kind:'parallel',distance}}
 const nn=dot(a.n,a.n),nm=dot(a.n,b.n),mm=dot(b.n,b.n),den=nn*mm-nm*nm
 const alpha=(a.d*mm-b.d*nm)/den,beta=(b.d*nn-a.d*nm)/den
 return {kind:'intersect',line:{p:add(scale(a.n,alpha),scale(b.n,beta)),v:direction}}
}
export const linePlaneRelation = (l:Line,p:Plane): {kind:string;point?:Vec3;distance?:number} => {
 const den=dot(p.n,l.v),num=p.d-dot(p.n,l.p)
 if(Math.abs(den)<EPS)return Math.abs(num)<EPS?{kind:'contained'}:{kind:'parallel',distance:Math.abs(num)/norm(p.n)}
 return {kind:'intersect',point:add(l.p,scale(l.v,num/den))}
}
export const pointPlaneDistance=(p:Vec3,s:Plane):number=>Math.abs(dot(s.n,p)-s.d)/norm(s.n)
export const pointPlaneProjection=(p:Vec3,s:Plane):Vec3=>sub(p,scale(s.n,(dot(s.n,p)-s.d)/dot(s.n,s.n)))
export const pointLineProjection=(p:Vec3,l:Line):Vec3=>{const den=dot(l.v,l.v);if(den<EPS)throw new Error('Egyenes irányvektora nem lehet nulla.');return add(l.p,scale(l.v,dot(sub(p,l.p),l.v)/den))}
export const pointLineDistance=(p:Vec3,l:Line):number=>norm(sub(p,pointLineProjection(p,l)))
export const lineAngle=(a:Line,b:Line):number=>Math.acos(Math.max(-1,Math.min(1,Math.abs(dot(a.v,b.v))/(norm(a.v)*norm(b.v)))))
export const linePlaneAngle=(l:Line,p:Plane):number=>Math.asin(Math.max(-1,Math.min(1,Math.abs(dot(l.v,p.n))/(norm(l.v)*norm(p.n)))))
export const planeAngle=(a:Plane,b:Plane):number=>Math.acos(Math.max(-1,Math.min(1,Math.abs(dot(a.n,b.n))/(norm(a.n)*norm(b.n)))))
export const closestLineSegment=(a:Line,b:Line)=>{const r=lineRelation(a,b);return{...r,segment:r.closestA&&r.closestB?{p:r.closestA,q:r.closestB}:undefined}}
export const triangleMetrics=(a:Vec3,b:Vec3,c:Vec3)=>{const ab=sub(b,a),ac=sub(c,a),bc=sub(c,b),crossN=cross(ab,ac),twice=norm(crossN);if(twice<EPS)throw new Error('A pontok kollineárisak, nem alkotnak háromszöget.');const lengths=[norm(ab),norm(bc),norm(sub(a,c))],angleAt=(x:number,y:number,z:number)=>Math.acos(Math.max(-1,Math.min(1,(x*x+z*z-y*y)/(2*x*z))));const centroid=scale(add(add(a,b),c),1/3),normal=normalize(crossN),d=dot(crossN,a),altitude=(vertex:Vec3,s:Vec3,t:Vec3)=>pointLineProjection(vertex,{p:s,v:sub(t,s)});const hA=altitude(a,b,c),hB=altitude(b,a,c),hC=altitude(c,a,b);const orthocenter=add(a,scale(cross(crossN,bc),dot(sub(b,a),sub(a,c))/dot(crossN,crossN)));return{lengths,angles:[angleAt(lengths[0],lengths[2],lengths[1]),angleAt(lengths[0],lengths[1],lengths[2]),angleAt(lengths[1],lengths[0],lengths[2])],perimeter:lengths.reduce((x,y)=>x+y,0),area:twice/2,centroid,normal,d,altitudes:[hA,hB,hC],orthocenter,plane:{n:crossN,d:dot(crossN,a)}}}
export const distance=(a:Vec3,b:Vec3)=>norm(sub(a,b))
/** Minimum Euclidean distance between supported geometric objects. */
export const objectDistance=(a:{kind:string;data:any},b:{kind:string;data:any}):number=>{
 if(a.kind==='vector')a={...a,kind:'segment',data:{p:[0,0,0],q:a.data.v}}
 if(b.kind==='vector')b={...b,kind:'segment',data:{p:[0,0,0],q:b.data.v}}
 const k1=a.kind,k2=b.kind,x=a.data,y=b.data
 const pair=(p:string,q:string)=>(k1===p&&k2===q)||(k1===q&&k2===p)
 const get=(k:string)=>k1===k?x:y
 const point=(o:any):Vec3=>o.p as Vec3
 const line=(o:any):Line=>o as Line
 const plane=(o:any):Plane=>o as Plane
 const center=(o:any):Vec3=>o.center as Vec3
 const radius=(o:any)=>Number(o.radius)
 const asLine=(o:any):Line=>o.p&&o.q?lineFromPoints(o.p,o.q):o
 const ball=(k:string)=>k==='sphere'||k==='circle'
 if(k1==='point'&&k2==='point')return distance(point(x),point(y))
 if(pair('point','line'))return pointLineDistance(point(get('point')),line(get('line')))
 if(pair('point','segment'))return distance(point(get('point')),closestPointOnSegment(point(get('point')),asLine(get('segment'))))
 if(pair('point','plane'))return pointPlaneDistance(point(get('point')),plane(get('plane')))
 if(pair('point','sphere')||pair('point','circle')){const o=get(k1==='point'?k2:k1);return Math.max(0,distance(point(get('point')),center(o))-radius(o))}
 if(pair('point','triangle')){const t=get('triangle');return pointTriangleDistance(point(k1==='point'?x:y),t.a,t.b,t.c)}
 if(pair('triangle','triangle')){const t=get('triangle'),u=k1==='triangle'?y:x;return Math.min(...[t.a,t.b,t.c].map(p=>pointTriangleDistance(p,u.a,u.b,u.c)),...[u.a,u.b,u.c].map(p=>pointTriangleDistance(p,t.a,t.b,t.c)))}
 if(pair('triangle','sphere')||pair('triangle','circle')){const t=get('triangle'),o=get(k1==='triangle'?k2:k1);return Math.max(0,pointTriangleDistance(center(o),t.a,t.b,t.c)-radius(o))}
 if(pair('plane','sphere')||pair('plane','circle')){const o=get(k1==='plane'?k2:k1);return Math.max(0,pointPlaneDistance(center(o),plane(get('plane')))-radius(o))}
 if(pair('line','triangle'))return lineTriangleDistance(line(get('line')),get('triangle'))
 if(pair('segment','triangle'))return segmentTriangleDistance(asLine(get('segment')),get('triangle'))
 if(pair('triangle','sphere')||pair('triangle','circle')){const t=get('triangle'),o=get(k1==='triangle'?k2:k1);return Math.max(0,pointTriangleDistance(center(o),t.a,t.b,t.c)-radius(o))}
 if(pair('plane','triangle'))return Math.min(...[get('triangle').a,get('triangle').b,get('triangle').c].map(p=>pointPlaneDistance(p,plane(get('plane')))))
 if(pair('line','line'))return lineRelation(line(x),line(y)).distance??0
 if(pair('line','segment'))return lineRelation(asLine(get('line')),asLine(get('segment'))).distance??0
 if(pair('segment','segment'))return segmentDistance(asLine(x),asLine(y))
 if(pair('line','plane'))return linePlaneRelation(line(get('line')),plane(get('plane'))).distance??0
 if(pair('segment','plane'))return segmentPlaneDistance(asLine(get('segment')),plane(get('plane')))
 if(k1==='plane'&&k2==='plane')return planeRelation(plane(x),plane(y)).distance??0
 if(ball(k1)&&ball(k2))return Math.max(0,distance(center(x),center(y))-radius(x)-radius(y))
 if(ball(k1)&&k2==='point')return Math.max(0,distance(center(x),point(y))-radius(x))
 if(k1==='point'&&ball(k2))return Math.max(0,distance(point(x),center(y))-radius(y))
 if(ball(k1)&&k2==='plane')return Math.max(0,pointPlaneDistance(center(x),plane(y))-radius(x))
 if(k1==='plane'&&ball(k2))return Math.max(0,pointPlaneDistance(center(y),plane(x))-radius(y))
 if(ball(k1)&&k2==='line')return Math.max(0,pointLineDistance(center(x),line(y))-radius(x))
 if(k1==='line'&&ball(k2))return Math.max(0,pointLineDistance(center(y),line(x))-radius(y))
 if(ball(k1)&&k2==='segment')return Math.max(0,distance(center(x),closestPointOnSegment(center(x),asLine(y)))-radius(x))
 if(k1==='segment'&&ball(k2))return Math.max(0,distance(center(y),closestPointOnSegment(center(y),asLine(x)))-radius(y))
 throw new Error('Ehhez az objektumpárhoz nem érhető el távolságszámítás.')
}
const closestPointOnSegment=(p:Vec3,l:Line):Vec3=>{const t=Math.max(0,Math.min(1,dot(sub(p,l.p),l.v)/dot(l.v,l.v)));return add(l.p,scale(l.v,t))}
const pointTriangleDistance=(p:Vec3,a:Vec3,b:Vec3,c:Vec3):number=>{
 const n=cross(sub(b,a),sub(c,a));if(norm(n)<EPS)throw new Error('A háromszög elfajult.')
 const projected=pointPlaneProjection(p,{n,d:dot(n,a)}), v0=sub(b,a),v1=sub(c,a),v2=sub(projected,a),d00=dot(v0,v0),d01=dot(v0,v1),d11=dot(v1,v1),d20=dot(v2,v0),d21=dot(v2,v1),den=d00*d11-d01*d01
 const v=(d11*d20-d01*d21)/den,w=(d00*d21-d01*d20)/den,u=1-v-w
 if(u>=0&&v>=0&&w>=0)return pointPlaneDistance(p,{n,d:dot(n,a)})
 return Math.min(...[[a,b],[b,c],[c,a]].map(([s,e])=>distance(p,closestPointOnSegment(p,lineFromPoints(s,e)))))
}
const lineTriangleDistance=(l:Line,t:{a:Vec3;b:Vec3;c:Vec3}):number=>{
 const n=cross(sub(t.b,t.a),sub(t.c,t.a)), hit=linePlaneRelation(l,{n,d:dot(n,t.a)})
 if(hit.point&&pointInTriangle(hit.point,t.a,t.b,t.c))return 0
 return Math.min(pointTriangleDistance(l.p,t.a,t.b,t.c),...[[t.a,t.b],[t.b,t.c],[t.c,t.a]].map(([a,b])=>lineSegmentDistance(l,lineFromPoints(a,b))))
}
const pointInTriangle=(p:Vec3,a:Vec3,b:Vec3,c:Vec3):boolean=>{
 const v0=sub(b,a),v1=sub(c,a),v2=sub(p,a),d00=dot(v0,v0),d01=dot(v0,v1),d11=dot(v1,v1),d20=dot(v2,v0),d21=dot(v2,v1),den=d00*d11-d01*d01,v=(d11*d20-d01*d21)/den,w=(d00*d21-d01*d20)/den
 return v>=-EPS&&w>=-EPS&&v+w<=1+EPS
}
const lineSegmentDistance=(l:Line,s:Line):number=>{
 const r=lineRelation(l,s);if(r.kind==='intersect'||r.kind==='coincident')return 0
 const q0=closestPointOnSegment(l.p,s),q1=closestPointOnSegment(add(l.p,l.v),s)
 const t0=pointLineProjection(s.p,l),t1=pointLineProjection(add(s.p,s.v),l)
 return Math.min(distance(l.p,q0),distance(add(l.p,l.v),q1),distance(s.p,t0),distance(add(s.p,s.v),t1))
}
const segmentTriangleDistance=(s:Line,t:{a:Vec3;b:Vec3;c:Vec3}):number=>{
 const n=cross(sub(t.b,t.a),sub(t.c,t.a)),hit=linePlaneRelation(s,{n,d:dot(n,t.a)})
 if(hit.point&&dot(sub(hit.point,s.p),s.v)>=-EPS&&dot(sub(hit.point,s.p),s.v)<=dot(s.v,s.v)+EPS&&pointInTriangle(hit.point,t.a,t.b,t.c))return 0
 return Math.min(pointTriangleDistance(s.p,t.a,t.b,t.c),pointTriangleDistance(add(s.p,s.v),t.a,t.b,t.c),...[ [t.a,t.b],[t.b,t.c],[t.c,t.a] ].map(([a,b])=>segmentDistance(s,lineFromPoints(a,b))))
}
const segmentPlaneDistance=(l:Line,p:Plane):number=>{const r=linePlaneRelation(l,p);return r.kind==='intersect'?0:Math.min(pointPlaneDistance(l.p,p),pointPlaneDistance(add(l.p,l.v),p))}
const segmentDistance=(a:Line,b:Line):number=>{
 const candidates=[distance(a.p,closestPointOnSegment(a.p,b)),distance(add(a.p,a.v),closestPointOnSegment(add(a.p,a.v),b)),distance(b.p,closestPointOnSegment(b.p,a)),distance(add(b.p,b.v),closestPointOnSegment(add(b.p,b.v),a))]
 if(segmentPlaneDistance(a,{n:cross(a.v,b.v),d:dot(cross(a.v,b.v),b.p)})<EPS&&norm(cross(a.v,b.v))>EPS)return 0
 if(norm(cross(a.v,b.v))<EPS&&norm(cross(sub(b.p,a.p),a.v))<EPS)return 0
 return Math.min(...candidates)
}
export const midpoint=(a:Vec3,b:Vec3):Vec3=>scale(add(a,b),.5)
export function triangleGeometry(a:Vec3,b:Vec3,c:Vec3){const metrics=triangleMetrics(a,b,c),ab=sub(b,a),ac=sub(c,a),bc=sub(c,b),sideA=norm(bc),sideB=norm(ac),sideC=norm(ab),incenter=scale(add(add(scale(a,sideA),scale(b,sideB)),scale(c,sideC)),1/(sideA+sideB+sideC)),inradius=2*metrics.area/metrics.perimeter;
 const circumcenter=(()=>{const u=ab,v=ac,n=metrics.normal,rhs1=(dot(b,b)-dot(a,a))/2,rhs2=(dot(c,c)-dot(a,a))/2,nrhs=dot(n,a),n2=dot(n,n),w1=cross(v,n),w2=cross(n,u),w3=n;return scale(add(add(scale(w1,rhs1),scale(w2,rhs2)),scale(w3,nrhs)),1/(n2*n2))})(),circumradius=norm(sub(circumcenter,a));
 const unitAB=normalize(ab),unitAC=normalize(ac),unitBA=normalize(scale(ab,-1)),unitBC=normalize(bc),unitCA=normalize(scale(ac,-1)),unitCB=normalize(scale(bc,-1));
 const n=metrics.plane.n,bisector=(p:Vec3,u:Vec3,v:Vec3):Line=>({p,v:add(u,v)}),medians=[{p:a,v:sub(metrics.centroid,a)},{p:b,v:sub(metrics.centroid,b)},{p:c,v:sub(metrics.centroid,c)}],altitudes=[{p:a,v:cross(n,bc)},{p:b,v:cross(n,scale(ac,-1))},{p:c,v:cross(n,ab)}],perpendicularBisectors=[{p:midpoint(b,c),v:cross(n,bc)},{p:midpoint(c,a),v:cross(n,scale(ac,-1))},{p:midpoint(a,b),v:cross(n,ab)}],angleBisectors=[bisector(a,unitAB,unitAC),bisector(b,unitBA,unitBC),bisector(c,unitCA,unitCB)],eulerDirection=sub(metrics.orthocenter,circumcenter);
 return{...metrics,centers:{centroid:metrics.centroid,incenter,circumcenter,orthocenter:metrics.orthocenter},radii:{inradius,circumradius},midpoints:[midpoint(b,c),midpoint(c,a),midpoint(a,b)],medians,altitudes,perpendicularBisectors,angleBisectors,euler:eulerDirection.some(x=>Math.abs(x)>EPS)?{p:circumcenter,v:eulerDirection}:null}}
export const lineSphereIntersections=(l:Line,c:Vec3,r:number):Vec3[]=>{const m=sub(l.p,c),aa=dot(l.v,l.v),bb=2*dot(m,l.v),cc=dot(m,m)-r*r,disc=bb*bb-4*aa*cc;if(disc<-EPS)return[];if(Math.abs(disc)<EPS)return[add(l.p,scale(l.v,-bb/(2*aa)))];const root=Math.sqrt(disc);return[add(l.p,scale(l.v,(-bb-root)/(2*aa))),add(l.p,scale(l.v,(-bb+root)/(2*aa)))]}
export const planeSphereSection=(p:Plane,c:Vec3,r:number)=>{const distance=pointPlaneDistance(c,p);if(distance>r+EPS)return{kind:'disjoint' as const};const center=pointPlaneProjection(c,p),radius=Math.sqrt(Math.max(0,r*r-distance*distance));return{kind:radius<EPS?'tangent' as const:'circle' as const,center,radius}}
export const sphereRelation=(c1:Vec3,r1:number,c2:Vec3,r2:number)=>{const d=norm(sub(c2,c1));if(d>r1+r2+EPS)return{kind:'disjoint' as const};if(d<EPS&&Math.abs(r1-r2)<EPS)return{kind:'coincident' as const};if(d<Math.abs(r1-r2)-EPS)return{kind:'contained' as const};if(Math.abs(d-r1-r2)<EPS||Math.abs(d-Math.abs(r1-r2))<EPS)return{kind:'tangent' as const};return{kind:'circle' as const}}
export const sphereSphereIntersectionCircle=(c1:Vec3,r1:number,c2:Vec3,r2:number):Circle|null=>{const d=norm(sub(c2,c1));if(d<EPS||d>r1+r2-EPS||d<Math.abs(r1-r2)+EPS)return null;const h=(d*d-r2*r2+r1*r1)/(2*d),rSq=r1*r1-h*h;if(rSq<=0)return null;const rad=Math.sqrt(rSq),dir=scale(sub(c2,c1),1/d),center=add(c1,scale(dir,h));return circleFromCenterRadiusNormal(center,rad,dir)}
export const isPointInTriangle=(p:Vec3,a:Vec3,b:Vec3,c:Vec3):boolean=>{const ab=sub(b,a),bc=sub(c,b),ca=sub(a,c),ap=sub(p,a),bp=sub(p,b),cp=sub(p,c),n=cross(ab,sub(c,a));const c1=cross(ab,ap),c2=cross(bc,bp),c3=cross(ca,cp);return dot(c1,n)>=-1e-7&&dot(c2,n)>=-1e-7&&dot(c3,n)>=-1e-7}
export const segmentPlaneIntersection=(p1:Vec3,p2:Vec3,plane:Plane):{kind:'disjoint'|'contained'|'intersect';point?:Vec3}=>{const d1=dot(plane.n,p1)-plane.d,d2=dot(plane.n,p2)-plane.d;if(Math.abs(d1)<EPS&&Math.abs(d2)<EPS)return{kind:'contained'};if(d1*d2>EPS)return{kind:'disjoint'};const t=d1/(d1-d2);return{kind:'intersect',point:add(p1,scale(sub(p2,p1),t))}}
export const trianglePlaneIntersection=(a:Vec3,b:Vec3,c:Vec3,plane:Plane):{kind:'disjoint'|'contained'|'point'|'segment';point?:Vec3;segment?:{p:Vec3;q:Vec3}}=>{const da=dot(plane.n,a)-plane.d,db=dot(plane.n,b)-plane.d,dc=dot(plane.n,c)-plane.d;const za=Math.abs(da)<EPS,zb=Math.abs(db)<EPS,zc=Math.abs(dc)<EPS;if(za&&zb&&zc)return{kind:'contained'};if(da>EPS&&db>EPS&&dc>EPS||da<-EPS&&db<-EPS&&dc<-EPS)return{kind:'disjoint'};const pts:Vec3[]=[];const cut=(p1:Vec3,p2:Vec3,d1:number,d2:number)=>{if(d1*d2<-EPS){const t=d1/(d1-d2);pts.push(add(p1,scale(sub(p2,p1),t)))}};if(za)pts.push(a);if(zb)pts.push(b);if(zc)pts.push(c);cut(a,b,da,db);cut(b,c,db,dc);cut(c,a,dc,da);const unique:Vec3[]=[];for(const pt of pts){if(!unique.some(u=>distance(u,pt)<1e-5))unique.push(pt)}if(unique.length===0)return{kind:'disjoint'};if(unique.length===1)return{kind:'point',point:unique[0]};return{kind:'segment',segment:{p:unique[0],q:unique[1]}}}
export const triangleLineIntersection=(a:Vec3,b:Vec3,c:Vec3,l:Line):{kind:'disjoint'|'contained'|'intersect';point?:Vec3}=>{const n=cross(sub(b,a),sub(c,a));const plane:Plane={n,d:dot(n,a)};const rel=linePlaneRelation(l,plane);if(rel.kind==='contained')return{kind:'contained'};if(!rel.point)return{kind:'disjoint'};if(isPointInTriangle(rel.point,a,b,c))return{kind:'intersect',point:rel.point};return{kind:'disjoint'}}
export const lineCircleIntersection=(l:Line,circle:Circle):{kind:'disjoint'|'tangent'|'intersect';points:Vec3[]}=>{const plane:Plane={n:circle.normal,d:dot(circle.normal,circle.center)};const rel=linePlaneRelation(l,plane);if(rel.kind==='contained'){const proj=pointLineProjection(circle.center,l),dist=distance(proj,circle.center);if(dist>circle.radius+EPS)return{kind:'disjoint',points:[]};if(Math.abs(dist-circle.radius)<=1e-4)return{kind:'tangent',points:[proj]};const half=Math.sqrt(Math.max(0,circle.radius*circle.radius-dist*dist)),u=normalize(l.v);return{kind:'intersect',points:[add(proj,scale(u,half)),sub(proj,scale(u,half))]}}if(!rel.point)return{kind:'disjoint',points:[]};const dist=distance(rel.point,circle.center);if(Math.abs(dist-circle.radius)<=1e-4)return{kind:'tangent',points:[rel.point]};return{kind:'disjoint',points:[]}}
export const planeCircleIntersection=(p:Plane,circle:Circle):{kind:'disjoint'|'contained'|'tangent'|'intersect';points:Vec3[]}=>{const circlePlane:Plane={n:circle.normal,d:dot(circle.normal,circle.center)};const pr=planeRelation(p,circlePlane);if(pr.kind==='coincident')return{kind:'contained',points:[]};if(!pr.line)return{kind:'disjoint',points:[]};return lineCircleIntersection(pr.line,circle)}
