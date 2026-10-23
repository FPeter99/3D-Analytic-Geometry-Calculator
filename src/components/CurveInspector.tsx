import { useState } from 'react'
import type { ParametricCurve } from '../math/geometry'
import { evaluateParametricCurve, parametricCurveTangent } from '../math/geometry'

export function CurveInspector({object,createTangent,language,notify}:{object:{name:string;data:any};createTangent:(object:any,t:number)=>void;language:'en'|'hu';notify:(message:string)=>void}) {
 const [parameter,setParameter]=useState('0.5'), curve=object.data.curve as ParametricCurve, hu=language==='hu'
 const eqMap: Record<ParametricCurve['kind'], string> = {
  'line': 'r(t) = P₀ + u(P₁ - P₀)',
  'cubic-bezier': 'r(u) = (1-u)³P₀ + 3(1-u)²uP₁ + 3(1-u)u²P₂ + u³P₃',
  'helix': 'r(t) = C + r·cos(t)u + r·sin(t)v + (h·t / 2π)n',
  'parabola': 'r(t) = V + t·u + (t² / 4p)v',
  'ellipse': 'r(t) = C + cos(t)a + sin(t)b',
  'spiral': 'r(t) = C + (r + k·t)(cos(t)u + sin(t)v) + (h·t / 2π)n'
 }
 const labelMap: Record<ParametricCurve['kind'], string> = {
  'line': hu ? '3D Egyenes' : '3D Line segment',
  'cubic-bezier': hu ? '3D Bézier-görbe' : '3D Bézier curve',
  'helix': hu ? '3D Csavarvonal' : '3D Helix',
  'parabola': hu ? '3D Parabola' : '3D Parabola',
  'ellipse': hu ? '3D Ellipszis' : '3D Ellipse',
  'spiral': hu ? '3D Kúpos Spirál' : '3D Spatial Spiral'
 }
 return <section className="curve-inspector">
  <h3>{hu ? '3D Térbeli Görbe' : '3D Spatial Curve'} — {labelMap[curve.kind]}</h3>
  <code>{eqMap[curve.kind]}, &nbsp; t ∈ [{curve.tMin}, {curve.tMax}]</code>
  <label>{hu ? 'Érintési paraméter t' : 'Tangent parameter t'}
   <input value={parameter} onChange={e=>setParameter(e.target.value)} inputMode="decimal" />
  </label>
  <button onClick={()=>{
   const t=Number(parameter);
   if(!Number.isFinite(t) || t < curve.tMin || t > curve.tMax){
    notify(hu ? 'A paraméter az intervallumon kívül van' : 'Parameter is outside domain');return
   }
   try{
    const tangent=parametricCurveTangent(curve,t);
    createTangent(object,t);
    notify(`${hu?'Érintő és érintési pont létrehozva':'Tangent and contact point created'} · (${tangent.point.map(x=>Number(x.toFixed(4))).join(', ')})`)
   }catch(e){notify(e instanceof Error?e.message:'Tangent unavailable')}
  }}>{hu?'Érintő és érintési pont létrehozása':'Create tangent and contact point'}</button>
  <small>γ({parameter || 't'}) = ({(() => {try{return evaluateParametricCurve(curve,Number(parameter)).map(x=>Number(x.toFixed(3))).join(', ')}catch{return '—'}})()})</small>
 </section>
}
