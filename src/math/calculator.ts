import * as G from './geometry'
import type {Line,Plane,Vec3,Circle} from './geometry'

export type Language = 'en' | 'hu'

export type CalcResult={
 title:string
 formula:string
 steps:string[]
 value:string
 point?:Vec3
 points?:Vec3[]
 line?:Line
 segment?:{p:Vec3;q:Vec3}
 circle?:Circle
}

const vtxt=(v:Vec3)=>`(${v.map(x=>Number(x.toFixed(4))).join(', ')})`
const fmt=(n:number)=>Number(n.toFixed(4)).toString()

const kindName=(k:string,lang:Language)=>{
 if(lang==='en'){
  switch(k){
   case 'point':return'point'
   case 'vector':return'vector'
   case 'line':return'line'
   case 'segment':return'segment'
   case 'plane':return'plane'
   case 'triangle':return'triangle'
   case 'sphere':return'sphere'
   case 'circle':return'circle'
   default:return k
  }
 }else{
  switch(k){
   case 'point':return'pont'
   case 'vector':return'vektor'
   case 'line':return'egyenes'
   case 'segment':return'szakasz'
   case 'plane':return'sík'
   case 'triangle':return'háromszög'
   case 'sphere':return'gömb'
   case 'circle':return'kör'
   default:return k
  }
 }
}

const pairTitle=(a:{kind:string;name:string},b:{kind:string;name:string},lang:Language)=>{
 if(lang==='en'){
  return `${a.name} (${kindName(a.kind,'en')}) and ${b.name} (${kindName(b.kind,'en')})`
 }
 return `${a.name} ${kindName(a.kind,'hu')} és ${b.name} ${kindName(b.kind,'hu')}`
}

export function calculate(
 a:{kind:string;name:string;data:any},
 b:{kind:string;name:string;data:any},
 lang:Language='hu'
):CalcResult{
 const k1=a.kind, k2=b.kind
 const x=a.data, y=b.data
 const t=(en:string,hu:string)=>lang==='en'?en:hu

 // Symmetry helper for commutative pairs
 const isPair=(t1:string, t2:string)=>(k1===t1&&k2===t2)||(k1===t2&&k2===t1)
 const get=(type:string)=>k1===type?{obj:a,d:x}:{obj:b,d:y}

 // 1. POINT & POINT
 if(k1==='point'&&k2==='point'){
  const p=x.p as Vec3, q=y.p as Vec3, diff=G.sub(q,p), d=G.norm(diff)
  if(d<G.EPS)return{
   title:t(`Points ${a.name} and ${b.name}`,`${a.name} és ${b.name} pontok`),
   formula:'P = Q',
   steps:[t('The two points are at the identical position.','A két pont azonos pozícióban van.')],
   value:t('Coincident points (d = 0).','Egybeeső pontok (d = 0).'),
   point:p
  }
  return{
   title:t(`Points ${a.name} and ${b.name}`,`${a.name} és ${b.name} pontok`),
   formula:'d = ||Q − P||',
   steps:[t(`Vector: v = Q − P = ${vtxt(diff)}`,`Vektor: v = Q − P = ${vtxt(diff)}`),t(`Distance: d = ${fmt(d)}`,`Távolság: d = ${fmt(d)}`)],
   value:t(`Distance: ${fmt(d)} · vector: ${vtxt(diff)}`,`Távolság: ${fmt(d)} · vektor: ${vtxt(diff)}`),
   segment:{p,q}
  }
 }

 // 2. VECTOR & VECTOR
 if(k1==='vector'&&k2==='vector'){
  const u=x.v as Vec3, v=y.v as Vec3, d=G.dot(u,v), c=G.cross(u,v), nu=G.norm(u), nv=G.norm(v)
  const theta=G.angle(u,v)*180/Math.PI
  const proj=G.scale(v,d/G.dot(v,v))
  const isParallel=G.norm(c)<1e-5
  const isPerp=Math.abs(d)<1e-5
  return{
   title:t(`Vectors ${a.name} and ${b.name}`,`${a.name} és ${b.name} vektorok`),
   formula:'u · v = |u||v| cos φ',
   steps:[
    t(`Dot product: u · v = ${fmt(d)}`,`Skaláris szorzat: u · v = ${fmt(d)}`),
    t(`Cross product: u × v = ${vtxt(c)} (|u × v| = ${fmt(G.norm(c))})`,`Vektoriális szorzat: u × v = ${vtxt(c)} (|u × v| = ${fmt(G.norm(c))})`),
    t(`Lengths: |${a.name}| = ${fmt(nu)}, |${b.name}| = ${fmt(nv)}`,`Hosszak: |${a.name}| = ${fmt(nu)}, |${b.name}| = ${fmt(nv)}`),
    t(`Projection proj_v(u) = ${vtxt(proj)}`,`Vetület proj_v(u) = ${vtxt(proj)}`)
   ],
   value:isParallel?t(`Parallel vectors (${d>0?'same direction':'opposite direction'}) · angle: ${theta.toFixed(1)}°`,`Párhuzamos vektorok (${d>0?'egyirányú':'ellentétes'}) · szög: ${theta.toFixed(1)}°`):isPerp?t('Perpendicular vectors (u ⊥ v · angle: 90°)','Egymásra merőleges vektorok (u ⊥ v · szög: 90°)'):t(`Angle: ${theta.toFixed(2)}° · dot product: ${fmt(d)}`,`Szög: ${theta.toFixed(2)}° · skalárszorzat: ${fmt(d)}`)
  }
 }

 // 3. POINT & VECTOR
 if(isPair('point','vector')){
  const pO=get('point'), vO=get('vector')
  const p=pO.d.p as Vec3, v=vO.d.v as Vec3, vStart=(vO.d.start||[0,0,0]) as Vec3
  const line:Line={p:vStart,v}
  const proj=G.pointLineProjection(p,line), dist=G.distance(p,proj)
  return{
   title:pairTitle(pO.obj,vO.obj,lang),
   formula:'d(P, v_egyenes)',
   steps:[t(`Vector origin: ${vtxt(vStart)}`,`Vektor kezdőpontja: ${vtxt(vStart)}`),t(`Projected point: ${vtxt(proj)}`,`Vetített pont az egyenesen: ${vtxt(proj)}`),t(`Perpendicular distance: ${fmt(dist)}`,`Merőleges távolság: ${fmt(dist)}`)],
   value:dist<1e-5?t('Point lies on the supporting line of the vector.','A pont illeszkedik a vektor hordozóegyenesére.'):t(`Distance to vector line: ${fmt(dist)} · projection: ${vtxt(proj)}`,`Távolság a vektor hordozóegyenesétől: ${fmt(dist)} · vetület: ${vtxt(proj)}`),
   point:proj,
   segment:{p,q:proj}
  }
 }

 // 4. LINE & LINE
 if(k1==='line'&&k2==='line'){
  const l1=x as Line, l2=y as Line, r=G.lineRelation(l1,l2), theta=G.lineAngle(l1,l2)*180/Math.PI
  const result:CalcResult={
   title:t(`Lines ${a.name} and ${b.name}`,`${a.name} és ${b.name} egyenesek`),
   formula:'P₁ = A + s·u,  P₂ = B + t·v',
   steps:[t(`Dot product: u · v = ${fmt(G.dot(l1.v,l2.v))}`,`Irányvektorok skalárszorzata: u · v = ${fmt(G.dot(l1.v,l2.v))}`),t(`Angle: ${theta.toFixed(3)}°`,`Irányszög: ${theta.toFixed(3)}°`),t(`Distance: ${fmt(r.distance||0)}`,`Legkisebb távolság: ${fmt(r.distance||0)}`)],
   value:r.kind==='intersect'?t(`Intersection point: ${vtxt(r.point!)} · angle: ${theta.toFixed(2)}°`,`Metszéspont: ${vtxt(r.point!)} · szög: ${theta.toFixed(2)}°`):r.kind==='parallel'?t(`Parallel lines · distance: ${fmt(r.distance!)}`,`Párhuzamos egyenesek · távolság: ${fmt(r.distance!)}`):r.kind==='coincident'?t('Coincident lines','Egybeeső egyenesek'):t(`Skew lines · distance: ${fmt(r.distance!)} · angle: ${theta.toFixed(2)}°`,`Kitérő egyenesek · távolság: ${fmt(r.distance!)} · szög: ${theta.toFixed(2)}°`)
  }
  if(r.point)result.point=r.point
  if(r.closestA&&r.closestB&&r.kind==='skew')result.segment={p:r.closestA,q:r.closestB}
  return result
 }

 // 5. POINT & LINE
 if(isPair('point','line')){
  const pO=get('point'), lO=get('line')
  const p=pO.d.p as Vec3, l=lO.d as Line, proj=G.pointLineProjection(p,l), dist=G.pointLineDistance(p,l)
  return{
   title:pairTitle(pO.obj,lO.obj,lang),
   formula:'H = A + ((P − A) · v / |v|²) · v',
   steps:[t(`Perpendicular foot: ${vtxt(proj)}`,`Talppont (vetület): ${vtxt(proj)}`),t(`Distance: d = ${fmt(dist)}`,`Távolság: d = ${fmt(dist)}`)],
   value:dist<1e-5?t('Point lies on the line.','A pont rajta van az egyenesen.'):t(`Distance: ${fmt(dist)} · perpendicular foot: ${vtxt(proj)}`,`Távolság: ${fmt(dist)} · merőleges talppont: ${vtxt(proj)}`),
   point:proj,
   segment:{p,q:proj}
  }
 }

 // 6. POINT & SEGMENT
 if(isPair('point','segment')){
  const pO=get('point'), sO=get('segment')
  const p=pO.d.p as Vec3, sp=sO.d.p as Vec3, sq=sO.d.q as Vec3
  const v=G.sub(sq,sp), vlenSq=G.dot(v,v)
  const tr=vlenSq>G.EPS?Math.max(0,Math.min(1,G.dot(G.sub(p,sp),v)/vlenSq)):0
  const closest=G.add(sp,G.scale(v,tr)), dist=G.distance(p,closest)
  const onSegment=dist<1e-5
  return{
   title:pairTitle(pO.obj,sO.obj,lang),
   formula:'P(t) = P₁ + t(P₂ − P₁), t ∈ [0, 1]',
   steps:[t(`Closest point on segment (t = ${tr.toFixed(3)}): ${vtxt(closest)}`,`Legközelebbi pont a szakaszon (t = ${tr.toFixed(3)}): ${vtxt(closest)}`),t(`Distance: ${fmt(dist)}`,`Távolság: ${fmt(dist)}`)],
   value:onSegment?t('Point lies on the segment.','A pont a szakaszon fekszik.'):t(`Distance to segment: ${fmt(dist)} · closest point: ${vtxt(closest)}`,`Távolság a szakasztól: ${fmt(dist)} · legközelebbi pont: ${vtxt(closest)}`),
   point:closest,
   segment:{p,q:closest}
  }
 }

 // 7. LINE & SEGMENT
 if(isPair('line','segment')){
  const lO=get('line'), sO=get('segment')
  const l=lO.d as Line, sp=sO.d.p as Vec3, sq=sO.d.q as Vec3
  const sLine:Line={p:sp,v:G.sub(sq,sp)}
  const r=G.lineRelation(l,sLine)
  if(r.kind==='coincident')return{title:pairTitle(lO.obj,sO.obj,lang),formula:t('Segment on line','Szakasz az egyenesen'),steps:[t('Segment lies entirely on the line.','A szakasz teljes egészében az egyenesen fekszik.')],value:t('Segment is part of the line.','A szakasz az egyenes része.')}
  if(r.kind==='intersect'&&r.point){
   const tr=G.dot(G.sub(r.point,sp),sLine.v)/G.dot(sLine.v,sLine.v)
   if(tr>=-1e-5&&tr<=1+1e-5){
    return{title:pairTitle(lO.obj,sO.obj,lang),formula:t('Intersection point','Metszéspont'),steps:[t(`Intersection point on segment: ${vtxt(r.point)}`,`Metszéspont a szakaszon: ${vtxt(r.point)}`)],value:t(`Intersect on segment at ${vtxt(r.point)}`,`Metszik egymást a szakaszon: ${vtxt(r.point)}`),point:r.point}
   }
   return{title:pairTitle(lO.obj,sO.obj,lang),formula:t('Supporting line intersection','Hordozóegyenes metszés'),steps:[t(`Supporting line intersection is outside the segment (t = ${tr.toFixed(3)})`,`A hordozóegyenes metszéspontja kívül esik a szakaszon (t = ${tr.toFixed(3)})`)],value:t(`Do not intersect on segment (intersection outside: ${vtxt(r.point)}).`,`Nem metszik egymást (metszés a szakaszon kívül: ${vtxt(r.point)}).`)}
  }
  return{title:pairTitle(lO.obj,sO.obj,lang),formula:t('Skew or parallel','Kitérő vagy párhuzamos'),steps:[t(`Distance: ${fmt(r.distance||0)}`,`Távolság: ${fmt(r.distance||0)}`)],value:t(`Do not intersect · distance: ${fmt(r.distance||0)}`,`Nem metszik egymást · távolság: ${fmt(r.distance||0)}`)}
 }

 // 8. SEGMENT & SEGMENT
 if(k1==='segment'&&k2==='segment'){
  const s1p=x.p as Vec3, s1q=x.q as Vec3, s2p=y.p as Vec3, s2q=y.q as Vec3
  const l1:Line={p:s1p,v:G.sub(s1q,s1p)}, l2:Line={p:s2p,v:G.sub(s2q,s2p)}
  const r=G.lineRelation(l1,l2)
  if(r.kind==='intersect'&&r.point){
   const t1=G.dot(G.sub(r.point,s1p),l1.v)/G.dot(l1.v,l1.v)
   const t2=G.dot(G.sub(r.point,s2p),l2.v)/G.dot(l2.v,l2.v)
   if(t1>=-1e-5&&t1<=1+1e-5&&t2>=-1e-5&&t2<=1+1e-5){
    return{title:pairTitle(a,b,lang),formula:t('Intersection point','Metszéspont'),steps:[t(`Common point: ${vtxt(r.point)}`,`Közös pont: ${vtxt(r.point)}`)],value:t(`Segments intersect at ${vtxt(r.point)}`,`A két szakasz metszi egymást: ${vtxt(r.point)}`),point:r.point}
   }
  }
  return{title:pairTitle(a,b,lang),formula:'d(s₁, s₂)',steps:[t(`Supporting lines distance: ${fmt(r.distance||0)}`,`Hordozóegyenesek távolsága: ${fmt(r.distance||0)}`)],value:t('Segments do not intersect.','A két szakasz nem metszi egymást.')}
 }

 // 9. PLANE & PLANE
 if(k1==='plane'&&k2==='plane'){
  const p1=x as Plane, p2=y as Plane, r=G.planeRelation(p1,p2), theta=G.planeAngle(p1,p2)*180/Math.PI
  return{
   title:t(`Planes ${a.name} and ${b.name}`,`${a.name} és ${b.name} síkok`),
   formula:'v = n₁ × n₂,  n₁ · n₂',
   steps:[t(`Angle between normal vectors: ${theta.toFixed(3)}°`,`Normálvektorok szöge: ${theta.toFixed(3)}°`),t(`Normal vectors: n₁ = ${vtxt(p1.n)}, n₂ = ${vtxt(p2.n)}`,`Normálvektorok: n₁ = ${vtxt(p1.n)}, n₂ = ${vtxt(p2.n)}`)],
   value:r.kind==='intersect'?t(`Intersection line: r = ${vtxt(r.line!.p)} + t ${vtxt(r.line!.v)} · angle: ${theta.toFixed(2)}°`,`Metszésvonal: r = ${vtxt(r.line!.p)} + t ${vtxt(r.line!.v)} · szög: ${theta.toFixed(2)}°`):r.kind==='coincident'?t('Coincident planes','Egybeeső síkok'):t(`Parallel planes · distance: ${fmt(r.distance!)}`,`Párhuzamos síkok · távolság: ${fmt(r.distance!)}`),
   ...(r.line?{line:r.line}:{})
  }
 }

 // 10. POINT & PLANE
 if(isPair('point','plane')){
  const pO=get('point'), sO=get('plane')
  const p=pO.d.p as Vec3, s=sO.d as Plane, proj=G.pointPlaneProjection(p,s), dist=G.pointPlaneDistance(p,s)
  const onPlane=dist<1e-5
  return{
   title:pairTitle(pO.obj,sO.obj,lang),
   formula:'d = |n · P − D| / |n|',
   steps:[t(`Plane equation: ${fmt(s.n[0])}x + ${fmt(s.n[1])}y + ${fmt(s.n[2])}z = ${fmt(s.d)}`,`Síkegyenlet: ${fmt(s.n[0])}x + ${fmt(s.n[1])}y + ${fmt(s.n[2])}z = ${fmt(s.d)}`),t(`Projected point: ${vtxt(proj)}`,`Vetített pont: ${vtxt(proj)}`),t(`Distance: ${fmt(dist)}`,`Merőleges távolság: ${fmt(dist)}`)],
   value:onPlane?t('Point lies in the plane.','A pont a síkban fekszik.'):t(`Distance to plane: ${fmt(dist)} · perpendicular projection: ${vtxt(proj)}`,`Távolság a síktól: ${fmt(dist)} · merőleges vetület: ${vtxt(proj)}`),
   point:proj,
   segment:{p,q:proj}
  }
 }

 // 11. LINE & PLANE
 if(isPair('line','plane')){
  const lO=get('line'), pO=get('plane')
  const l=lO.d as Line, p=pO.d as Plane, r=G.linePlaneRelation(l,p), theta=G.linePlaneAngle(l,p)*180/Math.PI
  return{
   title:pairTitle(lO.obj,pO.obj,lang),
   formula:'t = (D − n·P) / (n·v)',
   steps:[t(`Inclination angle: ${theta.toFixed(3)}°`,`Hajlásszög: ${theta.toFixed(3)}°`),`n · v = ${fmt(G.dot(p.n,l.v))}`],
   value:r.kind==='intersect'?t(`Intersection point: ${vtxt(r.point!)} · inclination angle: ${theta.toFixed(2)}°`,`Metszéspont: ${vtxt(r.point!)} · hajlásszög: ${theta.toFixed(2)}°`):r.kind==='contained'?t('Line lies entirely in the plane.','Az egyenes teljes egészében a síkban fekszik.'):t(`Parallel · distance: ${fmt(r.distance!)}`,`Párhuzamosak · távolság: ${fmt(r.distance!)}`),
   ...(r.point?{point:r.point}:{})
  }
 }

 // 12. SEGMENT & PLANE
 if(isPair('segment','plane')){
  const sO=get('segment'), pO=get('plane')
  const sp=sO.d.p as Vec3, sq=sO.d.q as Vec3, p=pO.d as Plane
  const rel=G.segmentPlaneIntersection(sp,sq,p)
  const d1=G.pointPlaneDistance(sp,p), d2=G.pointPlaneDistance(sq,p)
  return{
   title:pairTitle(sO.obj,pO.obj,lang),
   formula:'P(t) = P₁ + t(P₂ − P₁), n · P(t) = D',
   steps:[t(`P₁ endpoint distance to plane: ${fmt(d1)}`,`P₁ végpont távolsága a síktól: ${fmt(d1)}`),t(`P₂ endpoint distance to plane: ${fmt(d2)}`,`P₂ végpont távolsága a síktól: ${fmt(d2)}`)],
   value:rel.kind==='contained'?t('Segment lies in the plane.','A szakasz a síkban fekszik.'):rel.kind==='intersect'?t(`Intersection on segment: ${vtxt(rel.point!)}`,`Metszéspont a szakaszon: ${vtxt(rel.point!)}`):t('Segment does not intersect the plane (lies on one side).','A szakasz nem metszi a síkot (a sík azonos oldalán fekszik).'),
   ...(rel.point?{point:rel.point}:{})
  }
 }

 // 13. POINT & TRIANGLE
 if(isPair('point','triangle')){
  const pO=get('point'), tO=get('triangle')
  const p=pO.d.p as Vec3, aT=tO.d.a as Vec3, bT=tO.d.b as Vec3, cT=tO.d.c as Vec3
  const tm=G.triangleMetrics(aT,bT,cT), plane=tm.plane
  const distPlane=G.pointPlaneDistance(p,plane), proj=G.pointPlaneProjection(p,plane)
  const inside=G.isPointInTriangle(proj,aT,bT,cT)
  return{
   title:pairTitle(pO.obj,tO.obj,lang),
   formula:'P_proj ∈ △ABC ?',
   steps:[t(`Distance to triangle plane: ${fmt(distPlane)}`,`Távolság a háromszög síkjától: ${fmt(distPlane)}`),t(`Projection: ${vtxt(proj)}`,`Vetület: ${vtxt(proj)}`),t(`Projection is inside triangle: ${inside?'Yes':'No'}`,`A vetület a háromszög belsejében van: ${inside?'Igen':'Nem'}`)],
   value:distPlane<1e-5?(inside?t('Point is inside the triangle boundary.','A pont a háromszöglap belső pontja.'):t('Point lies in the triangle plane but outside the triangle.','A pont a háromszög síkjában fekszik, de a háromszögön kívül.')):t(`Spatial point · plane distance: ${fmt(distPlane)} (${inside?'perpendicularly above the triangle':'outside the triangle'}).`,`Térbeli pont · síktávolság: ${fmt(distPlane)} (${inside?'merőlegesen a háromszög fölött':'a háromszögön kívül esik'}).`),
   point:proj,
   segment:{p,q:proj}
  }
 }

 // 14. LINE & TRIANGLE
 if(isPair('line','triangle')){
  const lO=get('line'), tO=get('triangle')
  const l=lO.d as Line, aT=tO.d.a as Vec3, bT=tO.d.b as Vec3, cT=tO.d.c as Vec3
  const rel=G.triangleLineIntersection(aT,bT,cT,l)
  return{
   title:pairTitle(lO.obj,tO.obj,lang),
   formula:'L(t) ∩ △ABC',
   steps:[t(`Intersection type: ${rel.kind}`,`Metszés jellege: ${rel.kind}`)],
   value:rel.kind==='intersect'?t(`Line pierces the triangle plane at ${vtxt(rel.point!)}.`,`Az egyenes átdöfi a háromszöglapot a ${vtxt(rel.point!)} pontban.`):rel.kind==='contained'?t('Line lies in the triangle plane.','Az egyenes a háromszög síkjában fekszik.'):t('Line does not intersect the triangle (passes outside).','Az egyenes nem metszi a háromszöglapot (kívül halad el).'),
   ...(rel.point?{point:rel.point}:{})
  }
 }

 // 15. SEGMENT & TRIANGLE
 if(isPair('segment','triangle')){
  const sO=get('segment'), tO=get('triangle')
  const sp=sO.d.p as Vec3, sq=sO.d.q as Vec3, aT=tO.d.a as Vec3, bT=tO.d.b as Vec3, cT=tO.d.c as Vec3
  const sLine:Line={p:sp,v:G.sub(sq,sp)}
  const rel=G.triangleLineIntersection(aT,bT,cT,sLine)
  if(rel.kind==='intersect'&&rel.point){
   const tr=G.dot(G.sub(rel.point,sp),sLine.v)/G.dot(sLine.v,sLine.v)
   if(tr>=-1e-5&&tr<=1+1e-5){
    return{title:pairTitle(sO.obj,tO.obj,lang),formula:t('Segment pierces triangle','Szakasz átdöfi a háromszöget'),steps:[t(`Piercing point on segment: ${vtxt(rel.point)}`,`Döféspont a szakaszon: ${vtxt(rel.point)}`)],value:t(`Segment pierces the triangle at ${vtxt(rel.point)}`,`A szakasz átdöfi a háromszöglapot: ${vtxt(rel.point)}`),point:rel.point}
   }
  }
  return{title:pairTitle(sO.obj,tO.obj,lang),formula:t('Disjoint','Diszjunkt'),steps:[t('Segment does not intersect the triangle surface.','A szakasz nem metszi a háromszöglap belsejét.')],value:t('Segment does not intersect the triangle.','A szakasz nem metszi a háromszöget.')}
 }

 // 16. PLANE & TRIANGLE
 if(isPair('plane','triangle')){
  const pO=get('plane'), tO=get('triangle')
  const p=pO.d as Plane, aT=tO.d.a as Vec3, bT=tO.d.b as Vec3, cT=tO.d.c as Vec3
  const rel=G.trianglePlaneIntersection(aT,bT,cT,p)
  if(rel.kind==='contained')return{title:pairTitle(pO.obj,tO.obj,lang),formula:'△ABC ⊂ Plane',steps:[t('All 3 vertices of triangle lie in the plane.','A háromszög mindhárom csúcsa a síkban van.')],value:t('Triangle lies entirely in the plane.','A háromszög teljes egészében a síkban fekszik.')}
  if(rel.kind==='point')return{title:pairTitle(pO.obj,tO.obj,lang),formula:t('Tangent vertex','Érintő helyzet'),steps:[t(`Tangent vertex: ${vtxt(rel.point!)}`,`Érintési csúcs: ${vtxt(rel.point!)}`)],value:t(`Plane touches a single vertex of triangle: ${vtxt(rel.point!)}`,`A sík a háromszög egyetlen csúcsát érinti: ${vtxt(rel.point!)}`),point:rel.point}
  if(rel.kind==='segment'&&rel.segment){
   const len=G.distance(rel.segment.p,rel.segment.q)
   return{
    title:pairTitle(pO.obj,tO.obj,lang),
    formula:t('Intersection segment: P₁P₂','Metszésszakasz: P₁P₂'),
    steps:[`P₁ = ${vtxt(rel.segment.p)}`,`P₂ = ${vtxt(rel.segment.q)}`,t(`Segment length: ${fmt(len)}`,`Metszésszakasz hossza: ${fmt(len)}`)],
    value:t(`Plane intersects triangle in a segment of length ${fmt(len)}: ${vtxt(rel.segment.p)} — ${vtxt(rel.segment.q)}`,`A sík átmetszi a háromszöget egy ${fmt(len)} hosszúságú szakaszon: ${vtxt(rel.segment.p)} — ${vtxt(rel.segment.q)}`),
    segment:rel.segment
   }
  }
  return{title:pairTitle(pO.obj,tO.obj,lang),formula:t('Disjoint','Diszjunkt'),steps:[t('Triangle lies on one side of the plane.','A háromszög a sík egyik oldalán fekszik.')],value:t('Plane and triangle do not intersect.','A sík és a háromszög nem metszi egymást.')}
 }

 // 17. POINT & SPHERE
 if(isPair('point','sphere')){
  const po=get('point'), so=get('sphere')
  const p=po.d.p as Vec3, s=so.d, c=s.center as Vec3, r=Number(s.radius), dist=G.distance(p,c), diff=dist-r
  const nearest=dist>G.EPS?G.add(c,G.scale(G.sub(p,c),r/dist)):G.add(c,[r,0,0] as Vec3)
  const status=Math.abs(diff)<=1e-4?t('Point lies exactly on the sphere surface.','A pont pontosan a gömb felületén fekszik.'):diff<0?t(`Point is inside the sphere (distance to surface: ${fmt(Math.abs(diff))}).`,`A pont a gömb belsejében van (távolság a felülettől: ${fmt(Math.abs(diff))}).`):t(`Point is outside the sphere (distance to surface: ${fmt(diff)}).`,`A pont a gömbön kívül esik (távolság a felülettől: ${fmt(diff)}).`)
  return{title:pairTitle(po.obj,so.obj,lang),formula:'d(P, C) = ||P − C||,  Δ = d − R',steps:[t(`Center distance: d = ${fmt(dist)}`,`Középpont távolsága: d = ${fmt(dist)}`),t(`Sphere radius: R = ${fmt(r)}`,`Gömb sugara: R = ${fmt(r)}`),t(`Closest surface point: ${vtxt(nearest)}`,`Legközelebbi felületi pont: ${vtxt(nearest)}`)],value:status,point:nearest,segment:{p,q:nearest}}
 }

 // 18. PLANE & SPHERE
 if(isPair('plane','sphere')){
  const so=get('sphere'), po=get('plane')
  const s=so.d, p=po.d as Plane, r=G.planeSphereSection(p,s.center,s.radius), d=G.pointPlaneDistance(s.center,p)
  if(r.kind==='circle'&&r.center){
   const circ=G.circleFromCenterRadiusNormal(r.center,r.radius,p.n)
   return{
    title:pairTitle(po.obj,so.obj,lang),
    formula:'ρ = √(R² − d(C, sík)²)',
    steps:[t(`Distance from center to plane: d = ${fmt(d)}`,`Középpont távolsága a síktól: d = ${fmt(d)}`),t(`Sphere radius: R = ${fmt(Number(s.radius))}`,`Gömb sugara: R = ${fmt(Number(s.radius))}`),t(`Section circle center: ${vtxt(r.center)}`,`Metszetkör középpontja: ${vtxt(r.center)}`),t(`Section circle radius: ρ = ${fmt(r.radius)}`,`Metszetkör sugara: ρ = ${fmt(r.radius)}`)],
    value:t(`Intersecting plane · section circle center: ${vtxt(r.center)} · radius: ${fmt(r.radius)}`,`Metsző sík · metszetkör középpontja: ${vtxt(r.center)} · sugara: ${fmt(r.radius)}`),
    point:r.center,
    circle:circ
   }
  }
  return{
   title:pairTitle(po.obj,so.obj,lang),
   formula:'ρ = √(R² − d²)',
   steps:[`d = ${fmt(d)}, R = ${fmt(Number(s.radius))}`],
   value:r.kind==='disjoint'?t(`Plane is outside the sphere (gap: ${fmt(d-s.radius)}).`,`A sík a gömbön kívül halad el (hézag: ${fmt(d-s.radius)}).`):t(`Tangent plane · point of tangency: ${vtxt(r.center!)}`,`Érintősík · érintési pont: ${vtxt(r.center!)}`),
   ...(r.center?{point:r.center}:{})
  }
 }

 // 19. LINE & SPHERE
 if(isPair('line','sphere')){
  const lo=get('line'), so=get('sphere')
  const l=lo.d as Line, s=so.d, pts=G.lineSphereIntersections(l,s.center,s.radius), d=G.pointLineDistance(s.center,l)
  return{
   title:pairTitle(lo.obj,so.obj,lang),
   formula:'||A + t·v − C||² = R²',
   steps:[t(`Distance from center to line: d = ${fmt(d)}`,`Középpont távolsága az egyenestől: d = ${fmt(d)}`),t(`Sphere radius: R = ${fmt(Number(s.radius))}`,`Gömb sugara: R = ${fmt(Number(s.radius))}`),t(`Number of intersection points: ${pts.length}`,`Metszéspontok száma: ${pts.length}`)],
   value:pts.length===0?t(`Line passes outside the sphere (gap: ${fmt(d-s.radius)}).`,`Az egyenes kívül halad el a gömb mellett (hézag: ${fmt(d-s.radius)}).`):pts.length===1?t(`Tangent line · point of tangency: ${vtxt(pts[0])}`,`Érintő egyenes · érintési pont: ${vtxt(pts[0])}`):t(`Secant line · 2 intersection points: P₁ ${vtxt(pts[0])}, P₂ ${vtxt(pts[1])} · chord length: ${fmt(G.distance(pts[0],pts[1]))}`,`Metsző egyenes · 2 metszéspont: P₁ ${vtxt(pts[0])}, P₂ ${vtxt(pts[1])} · húrhossz: ${fmt(G.distance(pts[0],pts[1]))}`),
   ...(pts[0]?{point:pts[0]}:{})
  }
 }

 // 20. SEGMENT & SPHERE
 if(isPair('segment','sphere')){
  const so=get('sphere'), se=get('segment')
  const s=so.d, p=se.d.p as Vec3, q=se.d.q as Vec3, c=s.center as Vec3, r=Number(s.radius), dp=G.distance(p,c), dq=G.distance(q,c)
  const line:Line={p,v:G.sub(q,p)}, intersections=G.lineSphereIntersections(line,c,r)
  const segPts=intersections.filter(pt=>{const dt=G.dot(G.sub(pt,p),line.v)/G.dot(line.v,line.v);return dt>=-G.EPS&&dt<=1+G.EPS})
  return{
   title:pairTitle(se.obj,so.obj,lang),
   formula:'P(t) = P + t(Q − P), t ∈ [0, 1]',
   steps:[t(`P endpoint distance: ${fmt(dp)}`,`P végpont távolsága: ${fmt(dp)}`),t(`Q endpoint distance: ${fmt(dq)}`,`Q végpont távolsága: ${fmt(dq)}`),t(`Intersections on segment: ${segPts.length}`,`Metszéspontok a szakaszon: ${segPts.length}`)],
   value:segPts.length===2?t(`Segment passes through the sphere (2 points: ${vtxt(segPts[0])}, ${vtxt(segPts[1])}).`,`A szakasz átmetszi a gömböt (2 metszéspont: ${vtxt(segPts[0])}, ${vtxt(segPts[1])}).`):segPts.length===1?t(`Segment intersects sphere surface (point: ${vtxt(segPts[0])}).`,`A szakasz metszi a gömb felületét (metszéspont: ${vtxt(segPts[0])}).`):dp<=r&&dq<=r?t('Segment lies entirely inside the sphere.','A szakasz teljes egészében a gömb belsejében fekszik.'):t('Segment passes outside the sphere.','A szakasz a gömbön kívül halad el.')
  }
 }

 // 21. TRIANGLE & SPHERE
 if(isPair('triangle','sphere')){
  const to=get('triangle'), so=get('sphere')
  const aT=to.d.a as Vec3, bT=to.d.b as Vec3, cT=to.d.c as Vec3, s=so.d, sc=s.center as Vec3, r=Number(s.radius)
  const tm=G.triangleMetrics(aT,bT,cT)
  const distPlane=G.pointPlaneDistance(sc,tm.plane), proj=G.pointPlaneProjection(sc,tm.plane)
  const inside=G.isPointInTriangle(proj,aT,bT,cT)
  if(distPlane>r+G.EPS)return{title:pairTitle(to.obj,so.obj,lang),formula:'d(C, sík) > R',steps:[t(`Distance from sphere center to triangle plane: ${fmt(distPlane)}`,`Gömbközéppont távolsága a háromszög síkjától: ${fmt(distPlane)}`),t(`Sphere radius: ${fmt(r)}`,`Gömb sugara: ${fmt(r)}`)],value:t(`Sphere does not reach the triangle plane (gap: ${fmt(distPlane-r)}).`,`A gömb nem éri el a háromszög síkját (hézag: ${fmt(distPlane-r)}).`)}
  const secRad=Math.sqrt(Math.max(0,r*r-distPlane*distPlane))
  return{
   title:pairTitle(to.obj,so.obj,lang),
   formula:t('Section circle in triangle plane','Metszetkör a háromszög síkjában'),
   steps:[t(`Section circle radius in plane: ρ = ${fmt(secRad)}`,`Síkbeli metszetkör sugara: ρ = ${fmt(secRad)}`),t(`Projection inside triangle: ${inside?'Yes':'No'}`,`Gömb vetülete a háromszög belsejében: ${inside?'Igen':'Nem'}`)],
   value:inside?t(`Sphere intersects triangle plane within the triangle area (section radius: ${fmt(secRad)}).`,`A gömb metszi a háromszög síkját a háromszöglap területén (síkban képződő körsugár: ${fmt(secRad)}).`):t('Sphere plane section passes outside the triangle or across its edges.','A gömb síkmetszete a háromszögön kívül vagy az oldalain halad át.')
  }
 }

 // 22. POINT & CIRCLE
 if(isPair('point','circle')){
  const po=get('point'), co=get('circle')
  const p=po.d.p as Vec3, c=co.d.center as Vec3, n=G.normalize(co.d.normal as Vec3), r=Number(co.d.radius)
  const plane:Plane={n,d:G.dot(n,c)}, distPlane=G.pointPlaneDistance(p,plane), proj=G.pointPlaneProjection(p,plane), distCenter=G.distance(proj,c)
  return{
   title:pairTitle(po.obj,co.obj,lang),
   formula:'d(P, sík),  d(P_proj, C)',
   steps:[t(`Distance to circle plane: ${fmt(distPlane)}`,`Távolság a kör síkjától: ${fmt(distPlane)}`),t(`Projection distance to center: ${fmt(distCenter)}`,`Vetület távolsága a kör középpontjától: ${fmt(distCenter)}`),t(`Circle radius: R = ${fmt(r)}`,`Kör sugara: R = ${fmt(r)}`)],
   value:distPlane>1e-4?t(`Point is not in the circle plane (distance: ${fmt(distPlane)}).`,`A pont nincs a kör síkjában (síktávolság: ${fmt(distPlane)}).`):Math.abs(distCenter-r)<=1e-4?t('Point lies on the circle boundary.','A pont a kör kerületén fekszik.'):distCenter<r?t('Point is inside the circle disk.','A pont a körlap belső pontja.'):t('Point is outside the circle disk.','A pont a körlapon kívül esik.')
  }
 }

 // 23. LINE & CIRCLE
 if(isPair('line','circle')){
  const lo=get('line'), co=get('circle')
  const l=lo.d as Line, c=co.d.center as Vec3, n=G.normalize(co.d.normal as Vec3), r=Number(co.d.radius)
  const circ:Circle=G.circleFromCenterRadiusNormal(c,r,n)
  const rel=G.lineCircleIntersection(l,circ)
  return{
   title:pairTitle(lo.obj,co.obj,lang),
   formula:'L(t) ∩ Circle',
   steps:[t(`Intersection points count: ${rel.points.length}`,`Metszéspontok száma: ${rel.points.length}`)],
   value:rel.kind==='tangent'?t(`Tangent line · point of tangency: ${vtxt(rel.points[0])}`,`Érintő egyenes · érintési pont: ${vtxt(rel.points[0])}`):rel.kind==='intersect'?t(`Secant line · 2 points: ${vtxt(rel.points[0])}, ${vtxt(rel.points[1])}`,`Metsző egyenes · 2 pont: ${vtxt(rel.points[0])}, ${vtxt(rel.points[1])}`):t('Line does not intersect the circle perimeter.','Az egyenes nem metszi a körvonalat.'),
   ...(rel.points[0]?{point:rel.points[0]}:{})
  }
 }

 // 24. PLANE & CIRCLE
 if(isPair('plane','circle')){
  const po=get('plane'), co=get('circle')
  const p=po.d as Plane, c=co.d.center as Vec3, n=G.normalize(co.d.normal as Vec3), r=Number(co.d.radius)
  const circ:Circle=G.circleFromCenterRadiusNormal(c,r,n)
  const rel=G.planeCircleIntersection(p,circ)
  return{
   title:pairTitle(po.obj,co.obj,lang),
   formula:'Plane ∩ Circle',
   steps:[t(`Plane relationship: ${rel.kind}`,`Kör síkja és a sík viszonya: ${rel.kind}`)],
   value:rel.kind==='contained'?t('Circle lies in the plane.','A kör a síkban fekszik.'):rel.kind==='tangent'?t(`Plane is tangent to circle at ${vtxt(rel.points[0])}.`,`A sík érinti a kört a ${vtxt(rel.points[0])} pontban.`):rel.kind==='intersect'?t(`Plane intersects circle at 2 points: ${vtxt(rel.points[0])}, ${vtxt(rel.points[1])}`,`A sík átmetszi a kört 2 pontban: ${vtxt(rel.points[0])}, ${vtxt(rel.points[1])}`):t('Plane does not intersect the circle.','A sík nem metszi a kört.'),
   ...(rel.points[0]?{point:rel.points[0]}:{})
  }
 }

 // 25. CIRCLE & SPHERE
 if(isPair('circle','sphere')){
  const co=get('circle'), so=get('sphere')
  const cc=co.d.center as Vec3, cr=Number(co.d.radius), cn=G.normalize(co.d.normal as Vec3)
  const sc=so.d.center as Vec3, sr=Number(so.d.radius)
  const cPlane:Plane={n:cn,d:G.dot(cn,cc)}
  const sec=G.planeSphereSection(cPlane,sc,sr)
  if(sec.kind==='disjoint')return{title:pairTitle(co.obj,so.obj,lang),formula:'Disjoint',steps:[t('Sphere does not reach the circle plane.','A kör síkja és a gömb diszjunkt.')],value:t('Circle and sphere are disjoint (no common points).','A kör és a gömb diszjunkt (nincs közös pont).')}
  const dCenters=G.distance(cc,sec.center!)
  return{
   title:pairTitle(co.obj,so.obj,lang),
   formula:'Circle vs Sphere Section',
   steps:[t(`Sphere plane section radius: ${fmt(sec.radius)}`,`Gömb síkmetszetének sugara: ${fmt(sec.radius)}`),t(`Circle radius: ${fmt(cr)}`,`Kör sugara: ${fmt(cr)}`),t(`Distance between centers in plane: ${fmt(dCenters)}`,`Középpontok távolsága a síkban: ${fmt(dCenters)}`)],
   value:Math.abs(dCenters)<1e-4&&Math.abs(cr-sec.radius)<1e-4?t('Circle matches the sphere great circle/section exactly.','A kör pontosan megegyezik a gömb főkörével/síkmetszetével.'):t('Circle and sphere section intersect or are concentric.','A kör és a gömb síkmetszete metszik egymást vagy koncentrikusak.')
  }
 }

 // 26. SPHERE & SPHERE
 if(k1==='sphere'&&k2==='sphere'){
  const s1=x, s2=y, c1=s1.center as Vec3, c2=s2.center as Vec3, r1=Number(s1.radius), r2=Number(s2.radius), d=G.distance(c1,c2), sumR=r1+r2, diffR=Math.abs(r1-r2)
  if(d<G.EPS&&Math.abs(r1-r2)<G.EPS)return{title:t(`Spheres ${a.name} and ${b.name}`,`${a.name} és ${b.name} gömbök`),formula:'C₁ = C₂,  R₁ = R₂',steps:[t('Centers and radii are identical.','A két gömb középpontja és sugara megegyezik.')],value:t('Coincident spheres.','Egybeeső gömbök.')}
  if(d<G.EPS)return{title:t(`Spheres ${a.name} and ${b.name}`,`${a.name} és ${b.name} gömbök`),formula:'C₁ = C₂,  R₁ ≠ R₂',steps:[t(`Common center: ${vtxt(c1)}`,`Közös középpont: ${vtxt(c1)}`),t(`Radii: R₁ = ${fmt(r1)}, R₂ = ${fmt(r2)}`,`Sugarak: R₁ = ${fmt(r1)}, R₂ = ${fmt(r2)}`)],value:t(`Concentric spheres · shell thickness: ${fmt(diffR)}`,`Koncentrikus gömbök · rétegvastagság: ${fmt(diffR)}`)}
  if(d>sumR+G.EPS)return{title:t(`Spheres ${a.name} and ${b.name}`,`${a.name} és ${b.name} gömbök`),formula:'d(C₁, C₂) > R₁ + R₂',steps:[t(`Distance between centers: d = ${fmt(d)}`,`Középpontok távolsága: d = ${fmt(d)}`),t(`Sum of radii: R₁ + R₂ = ${fmt(sumR)}`,`Sugarak összege: R₁ + R₂ = ${fmt(sumR)}`)],value:t(`Disjoint spheres (external) · gap: ${fmt(d-sumR)}`,`Egymáson kívül elhelyezkedő diszjunkt gömbök · hézag: ${fmt(d-sumR)}`)}
  if(Math.abs(d-sumR)<=1e-4){
   const pt=G.add(c1,G.scale(G.sub(c2,c1),r1/d))
   return{title:t(`Spheres ${a.name} and ${b.name}`,`${a.name} és ${b.name} gömbök`),formula:'d(C₁, C₂) = R₁ + R₂',steps:[t(`Distance between centers: d = ${fmt(d)}`,`Középpontok távolsága: d = ${fmt(d)}`),t('Externally tangent spheres','Kívülről érintkező gömbök')],value:t(`Externally tangent spheres · point of tangency: ${vtxt(pt)}`,`Kívülről érintkező gömbök · érintési pont: ${vtxt(pt)}`),point:pt}
  }
  if(d<diffR-G.EPS){
   const inside=r1<r2?`${a.name} ⊂ ${b.name}`:`${b.name} ⊂ ${a.name}`
   return{title:t(`Spheres ${a.name} and ${b.name}`,`${a.name} és ${b.name} gömbök`),formula:'d(C₁, C₂) < |R₁ − R₂|',steps:[t(`Distance between centers: d = ${fmt(d)}`,`Középpontok távolsága: d = ${fmt(d)}`),t(`Difference of radii: |R₁ − R₂| = ${fmt(diffR)}`,`Sugarak különbsége: |R₁ − R₂| = ${fmt(diffR)}`)],value:t(`${inside} lies inside (disjoint) · gap: ${fmt(diffR-d)}`,`${inside} belsejében fekszik (diszjunkt) · minimális hézag: ${fmt(diffR-d)}`)}
  }
  if(Math.abs(d-diffR)<=1e-4){
   const pt=r1>r2?G.add(c1,G.scale(G.sub(c2,c1),r1/d)):G.add(c2,G.scale(G.sub(c1,c2),r2/d))
   return{title:t(`Spheres ${a.name} and ${b.name}`,`${a.name} és ${b.name} gömbök`),formula:'d(C₁, C₂) = |R₁ − R₂|',steps:[t(`Distance between centers: d = ${fmt(d)}`,`Középpontok távolsága: d = ${fmt(d)}`),t('Internally tangent spheres','Belülről érintkező gömbök')],value:t(`Internally tangent spheres · point of tangency: ${vtxt(pt)}`,`Belülről érintkező gömbök · érintési pont: ${vtxt(pt)}`),point:pt}
  }
  const intCircle=G.sphereSphereIntersectionCircle(c1,r1,c2,r2)
  if(intCircle){
   return{
    title:t(`Spheres ${a.name} and ${b.name}`,`${a.name} és ${b.name} gömbök`),
    formula:t('Intersecting spheres (Section Circle)','Metsző gömbök (Metszetkör)'),
    steps:[t(`Distance between centers: d = ${fmt(d)}`,`Középpontok távolsága: d = ${fmt(d)}`),t(`Section circle center: ${vtxt(intCircle.center)}`,`Metszetkör középpontja: ${vtxt(intCircle.center)}`),t(`Section circle radius: ρ = ${fmt(intCircle.radius)}`,`Metszetkör sugara: ρ = ${fmt(intCircle.radius)}`)],
    value:t(`Intersecting spheres · section circle radius: ${fmt(intCircle.radius)} · center: ${vtxt(intCircle.center)}`,`Metsző gömbök · metszetkör sugara: ${fmt(intCircle.radius)} · középpontja: ${vtxt(intCircle.center)}`),
    point:intCircle.center,
    circle:intCircle
   }
  }
  return{title:t(`Spheres ${a.name} and ${b.name}`,`${a.name} és ${b.name} gömbök`),formula:'Intersecting Spheres',steps:[t(`Distance: d = ${fmt(d)}`,`Középpontok távolsága: d = ${fmt(d)}`)],value:t('Intersecting spheres.','Metsző gömbök.')}
 }

 // Fallback explanation
 return{
  title:pairTitle(a,b,lang),
  formula:t('Relation analysis','Reláció vizsgálat'),
  steps:[t(`Types: ${kindName(a.kind,'en')} and ${kindName(b.kind,'en')}`,`Típusok: ${kindName(a.kind,'hu')} és ${kindName(b.kind,'hu')}`)],
  value:t(`Relationship between ${a.name} (${kindName(a.kind,'en')}) and ${b.name} (${kindName(b.kind,'en')}) determined directly.`,`${a.name} (${kindName(a.kind,'hu')}) és ${b.name} (${kindName(b.kind,'hu')}) kapcsolata közvetlenül meghatározva.`)
 }
}
