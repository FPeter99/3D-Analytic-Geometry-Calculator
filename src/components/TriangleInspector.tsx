import{useState}from'react'
import{Copy,Check,Eye,EyeOff,Trash2,Plus}from'lucide-react'
import*as G from'../math/geometry'
import type{Vec3}from'../math/geometry'
import{triangleAnalysis}from'../math/triangle'

export type Language='en'|'hu'

export interface TriangleInspectorProps{
 object:{
  id:string
  name:string
  color:string
  visible:boolean
  data:Record<string,any>
 }
 update:(data:Record<string,any>)=>void
 meta:(key:string,value:any)=>void
 remove:()=>void
 toggle:(key:string)=>void
 planeAction:(o:any)=>void
 createLine?:(line:{p:Vec3;v:Vec3;name:string})=>void
 createCenterPoint?:(centerType:'centroid'|'orthocenter'|'circumcenter'|'incenter',coord:Vec3,nameHu:string,nameEn:string)=>void
 createCircle?:(circleType:'circumcircle'|'incircle',data:{center:Vec3;radius:number;normal:Vec3},name:string)=>void
 language:Language
 notify:(msg:string)=>void
}

const copyText=(en:string,hu:string,l:Language)=>l==='en'?en:hu
const fmt=(n:number)=>Number(n.toFixed(3)).toString()
const vecText=(v:Vec3)=>`(${v.map(fmt).join(', ')})`

function formatPlaneEquation(n:Vec3,d:number):string{
 const parts:string[]=[]
 const vars=['x','y','z']
 for(let i=0;i<3;i++){
  const val=Number(n[i].toFixed(4))
  if(Math.abs(val)<1e-6)continue
  const sign=val<0?'− ':(parts.length>0?'+ ':'')
  const absVal=Math.abs(val)
  const coefStr=Math.abs(absVal-1)<1e-6?'':`${Number(absVal.toFixed(3))}`
  parts.push(`${sign}${coefStr}${vars[i]}`)
 }
 if(!parts.length)return'0 = 0'
 return`${parts.join(' ')} = ${Number(d.toFixed(3))}`
}

function formatLineEquation(p:Vec3,v:Vec3):string{
 return`(x, y, z) = (${p.map(fmt).join(', ')}) + t(${v.map(fmt).join(', ')})`
}

export function TriangleInspector({
 object:o,
 update,
 meta,
 remove,
 toggle,
 planeAction,
 createLine,
 createCenterPoint,
 createCircle,
 language:lang,
 notify
}:TriangleInspectorProps){
 const d=o.data
 const[copiedKey,setCopiedKey]=useState<string|null>(null)

 const copyToClipboard=(text:string,key:string)=>{
  if(navigator.clipboard){
   navigator.clipboard.writeText(text)
  }
  setCopiedKey(key)
  notify(copyText('Copied to clipboard','Vágólapra másolva',lang))
  setTimeout(()=>setCopiedKey(null),2000)
 }

 let z:any
 try{
  z=triangleAnalysis({a:d.a,b:d.b,c:d.c})
 }catch{
  return(
   <div className="inspector">
    <div className="inspector-card">
     <div className="form-error" style={{padding:12}}>
      {copyText('Degenerate triangle: vertices are collinear.','Degenerált háromszög: a csúcsok egy egyenesre esnek.',lang)}
     </div>
    </div>
   </div>
  )
 }

 const planeEq=formatPlaneEquation(z.plane.n,z.plane.d)
 const opts=new Set(Object.keys(d).filter(k=>d[k]===true))

 const renderLineEqRow=(name:string,line:{p:Vec3;v:Vec3},labelHu:string,labelEn:string)=>{
  const eq=formatLineEquation(line.p,line.v)
  const lineName=`${o.name}_${name}`
  return(
   <div key={name} className="equation-row">
    <code><strong>{name}:</strong> {eq}</code>
    <div style={{display:'flex',gap:4,flexShrink:0}}>
     <button
      className="copy-icon-btn"
      style={{width:26,height:26}}
      title={copyText('Copy equation','Egyenlet másolása',lang)}
      onClick={()=>copyToClipboard(eq,`eq-${name}`)}
     >
      {copiedKey===`eq-${name}`?<Check size={11} color="#55d6be"/>:<Copy size={11}/>}
     </button>
     <button
      className="action-btn primary"
      style={{width:'auto',height:26,padding:'0 8px',fontSize:10,gap:3}}
      title={copyText(`Create ${labelEn} in scene`,`${labelHu} létrehozása a színtérben`,lang)}
      onClick={()=>{
       createLine?.({p:line.p,v:line.v,name:lineName})
       notify(copyText(`Line ${lineName} created in scene`,`${lineName} egyenes létrehozva a színtérben`,lang))
      }}
     >
      <Plus size={11}/>
      <span>{copyText('Create','Létrehozás',lang)}</span>
     </button>
    </div>
   </div>
  )
 }

 return(
  <div className="inspector">
   {/* 1. Header Overview */}
   <div className="inspector-card" style={{borderColor:o.color}}>
    <div style={{padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
     <div style={{display:'flex',alignItems:'center',gap:8}}>
      <span style={{width:14,height:14,borderRadius:3,backgroundColor:o.color,display:'inline-block'}}/>
      <input
       style={{fontSize:14,fontWeight:700,background:'transparent',border:'none',color:'var(--text)',outline:'none',width:110}}
       value={o.name}
       onChange={e=>meta('name',e.target.value)}
      />
     </div>
     <div style={{display:'flex',alignItems:'center',gap:4}}>
      <input
       type="color"
       value={o.color}
       title={copyText('Color','Szín',lang)}
       onChange={e=>meta('color',e.target.value)}
       style={{width:24,height:24,border:'none',padding:0,background:'transparent',cursor:'pointer'}}
      />
      <button
       className="copy-icon-btn"
       title={o.visible?copyText('Hide','Elrejtés',lang):copyText('Show','Megjelenítés',lang)}
       onClick={()=>meta('visible',!o.visible)}
      >
       {o.visible?<Eye size={14}/>:<EyeOff size={14}/>}
      </button>
      <button
       className="copy-icon-btn"
       title={copyText('Delete triangle','Háromszög törlése',lang)}
       onClick={remove}
       style={{color:'#ff6b6b'}}
      >
       <Trash2 size={14}/>
      </button>
     </div>
    </div>
   </div>

   {/* 2. Vertices */}
   <details className="inspector-card" open>
    <summary>
     <span>{copyText('Vertices (3D)','Csúcsok koordinátái (3D)',lang)}</span>
    </summary>
    <div className="inspector-card-body">
     <div className="coord-grid">
      {(['a','b','c']as const).map((k,idx)=>{
       const p=d[k]||[0,0,0]
       const label=['A','B','C'][idx]
       return(
        <div key={k} className="coord-row">
         <strong>{label}</strong>
         {(['x','y','z']as const).map((axis,aIdx)=>(
          <div key={axis} className="coord-cell">
           <span>{axis}</span>
           <input
            type="number"
            step="any"
            value={p[aIdx]}
            onChange={e=>{
             const next=[...p] as Vec3
             next[aIdx]=+e.target.value||0
             update({[k]:next})
            }}
           />
          </div>
         ))}
         <button
          className="copy-icon-btn"
          title={copyText('Copy coordinates','Koordináták másolása',lang)}
          onClick={()=>copyToClipboard(vecText(p),`v-${k}`)}
         >
          {copiedKey===`v-${k}`?<Check size={12} color="#55d6be"/>:<Copy size={12}/>}
         </button>
        </div>
       )
      })}
     </div>
    </div>
   </details>

   {/* 3. Sides and Angles */}
   <details className="inspector-card" open>
    <summary>
     <span>{copyText('Sides & Angles','Oldalak és szögek',lang)}</span>
    </summary>
    <div className="inspector-card-body">
     <div className="sides-table">
      <div className="side-item">
       <div className="side-item-info">
        <strong>a</strong>
        <span>|BC|</span>
       </div>
       <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span className="side-item-val">{fmt(z.lengths[1])}</span>
        <button
         className="action-btn"
         style={{width:'auto',height:24,padding:'0 6px',fontSize:9,gap:2}}
         title={copyText('Create side a line in scene','a oldal egyenesének létrehozása a színtérben',lang)}
         onClick={()=>{
          createLine?.({p:d.b,v:G.sub(d.c,d.b),name:`${o.name}_a`})
          notify(copyText('Side a line created','a oldal egyenese létrehozva',lang))
         }}
        >
         <Plus size={10}/>
         <span>{copyText('Line','Egyenes',lang)}</span>
        </button>
       </div>
      </div>
      <div className="side-item">
       <div className="side-item-info">
        <strong>b</strong>
        <span>|CA|</span>
       </div>
       <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span className="side-item-val">{fmt(z.lengths[2])}</span>
        <button
         className="action-btn"
         style={{width:'auto',height:24,padding:'0 6px',fontSize:9,gap:2}}
         title={copyText('Create side b line in scene','b oldal egyenesének létrehozása a színtérben',lang)}
         onClick={()=>{
          createLine?.({p:d.c,v:G.sub(d.a,d.c),name:`${o.name}_b`})
          notify(copyText('Side b line created','b oldal egyenese létrehozva',lang))
         }}
        >
         <Plus size={10}/>
         <span>{copyText('Line','Egyenes',lang)}</span>
        </button>
       </div>
      </div>
      <div className="side-item">
       <div className="side-item-info">
        <strong>c</strong>
        <span>|AB|</span>
       </div>
       <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span className="side-item-val">{fmt(z.lengths[0])}</span>
        <button
         className="action-btn"
         style={{width:'auto',height:24,padding:'0 6px',fontSize:9,gap:2}}
         title={copyText('Create side c line in scene','c oldal egyenesének létrehozása a színtérben',lang)}
         onClick={()=>{
          createLine?.({p:d.a,v:G.sub(d.b,d.a),name:`${o.name}_c`})
          notify(copyText('Side c line created','c oldal egyenese létrehozva',lang))
         }}
        >
         <Plus size={10}/>
         <span>{copyText('Line','Egyenes',lang)}</span>
        </button>
       </div>
      </div>
     </div>

     <div className="angles-badge-row">
      <div className="angle-badge">
       <span>α (A)</span>
       <strong>{(z.angles[0]*180/Math.PI).toFixed(1)}°</strong>
      </div>
      <div className="angle-badge">
       <span>β (B)</span>
       <strong>{(z.angles[1]*180/Math.PI).toFixed(1)}°</strong>
      </div>
      <div className="angle-badge">
       <span>γ (C)</span>
       <strong>{(z.angles[2]*180/Math.PI).toFixed(1)}°</strong>
      </div>
     </div>

     <div className="metrics-row">
      <div className="metric-box">
       <span className="metric-label">{copyText('Perimeter (K)','Kerület (K)',lang)}</span>
       <span className="metric-value">{fmt(z.perimeter)}</span>
      </div>
      <div className="metric-box">
       <span className="metric-label">{copyText('Area (T)','Terület (T)',lang)}</span>
       <span className="metric-value">{fmt(z.area)}</span>
      </div>
     </div>
    </div>
   </details>

   {/* 4. Supporting Plane */}
   <details className="inspector-card" open>
    <summary>
     <span>{copyText('Supporting Plane','Tartósík egyenlete',lang)}</span>
    </summary>
    <div className="inspector-card-body">
     <div className="math-block">
      <code>{planeEq}</code>
      <button
       className="copy-icon-btn"
       title={copyText('Copy plane equation','Síkegyenlet másolása',lang)}
       onClick={()=>copyToClipboard(planeEq,'plane-eq')}
      >
       {copiedKey==='plane-eq'?<Check size={12} color="#55d6be"/>:<Copy size={12}/>}
      </button>
     </div>
     <div style={{fontSize:11,color:'var(--muted)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span>{copyText('Normal vector:','Normálvektor:',lang)}</span>
      <code>n = {vecText(z.plane.n)}</code>
     </div>
     <button
      className="action-btn primary"
      style={{height:34,fontSize:11,gap:6}}
      title={copyText('Create supporting plane in scene','Tartósík létrehozása a színtérben',lang)}
      onClick={()=>{
       planeAction(o)
       notify(copyText('Supporting plane created in scene','Tartósík létrehozva a színtérben',lang))
      }}
     >
      <Plus size={14}/>
      {copyText('Create plane in scene (1-click)','Tartósík létrehozása 1 kattintással',lang)}
     </button>
    </div>
   </details>

   {/* 5. Notable Geometry Toggles */}
   <details className="inspector-card" open>
    <summary>
     <span>{copyText('Notable Geometry (3D)','Nevezetes geometriai alakzatok',lang)}</span>
    </summary>
    <div className="inspector-card-body">
     <div className="switch-list">
      {[
       {k:'showMedians',en:'Medians & centroid',hu:'Súlyvonalak és súlypont'},
       {k:'showAltitudes',en:'Altitudes & orthocenter',hu:'Magasságvonalak és magasságpont'},
       {k:'showBisectors',en:'Perpendicular bisectors',hu:'Oldalfelező merőlegesek'},
       {k:'showAngleBisectors',en:'Angle bisectors',hu:'Belső szögfelezők'},
       {k:'showEuler',en:'Euler line',hu:'Euler-egyenes'},
       {k:'showCircles',en:'Incircle & circumcircle',hu:'Beírt és körülírt kör'},
       {k:'showPlane',en:'Supporting plane surface',hu:'Tartósík síklap megjelenítése'}
      ].map(item=>{
       const active=opts.has(item.k)
       return(
        <div
         key={item.k}
         className={`switch-row ${active?'active':''}`}
         onClick={()=>toggle(item.k)}
        >
         <span className="switch-label">{copyText(item.en,item.hu,lang)}</span>
         <span className={`switch-pill ${active?'active':''}`}>
          <span className="switch-thumb"/>
         </span>
        </div>
       )
      })}
     </div>
    </div>
   </details>

   {/* 6. Notable Centers and Radii */}
   <details className="inspector-card" open>
    <summary>
     <span>{copyText('Notable Centers','Nevezetes pontok koordinátái',lang)}</span>
    </summary>
    <div className="inspector-card-body">
     <div className="notable-points-grid">
      <div className="notable-point-card">
       <div className="notable-point-left">
        <div className="point-symbol" style={{backgroundColor:'#f2b84b'}}>G</div>
        <div className="notable-point-info">
         <strong>{copyText('Centroid (Súlypont)','Súlypont (G)',lang)}</strong>
         <span>{vecText(z.centers.centroid)}</span>
        </div>
       </div>
       <div style={{display:'flex',alignItems:'center',gap:4}}>
        <button
         className="action-btn primary"
         style={{width:'auto',height:24,padding:'0 6px',fontSize:9,gap:2}}
         title={copyText('Create Dot in scene','Pont létrehozása a színtérben',lang)}
         onClick={()=>createCenterPoint?.('centroid',z.centers.centroid,'Súlypont (G)','Centroid G')}
        >
         <Plus size={10}/>
         <span>{copyText('Dot','+ Pont',lang)}</span>
        </button>
        <button
         className="copy-icon-btn"
         onClick={()=>copyToClipboard(vecText(z.centers.centroid),'pt-G')}
        >
         {copiedKey==='pt-G'?<Check size={12} color="#55d6be"/>:<Copy size={12}/>}
        </button>
       </div>
      </div>

      <div className="notable-point-card">
       <div className="notable-point-left">
        <div className="point-symbol" style={{backgroundColor:'#ff7272'}}>M</div>
        <div className="notable-point-info">
         <strong>{copyText('Orthocenter (Magasságpont)','Magasságpont (M)',lang)}</strong>
         <span>{vecText(z.centers.orthocenter)}</span>
        </div>
       </div>
       <div style={{display:'flex',alignItems:'center',gap:4}}>
        <button
         className="action-btn primary"
         style={{width:'auto',height:24,padding:'0 6px',fontSize:9,gap:2}}
         title={copyText('Create Dot in scene','Pont létrehozása a színtérben',lang)}
         onClick={()=>createCenterPoint?.('orthocenter',z.centers.orthocenter,'Magasságpont (M)','Orthocenter M')}
        >
         <Plus size={10}/>
         <span>{copyText('Dot','+ Pont',lang)}</span>
        </button>
        <button
         className="copy-icon-btn"
         onClick={()=>copyToClipboard(vecText(z.centers.orthocenter),'pt-M')}
        >
         {copiedKey==='pt-M'?<Check size={12} color="#55d6be"/>:<Copy size={12}/>}
        </button>
       </div>
      </div>

      <div className="notable-point-card">
       <div className="notable-point-left">
        <div className="point-symbol" style={{backgroundColor:'#61a5ff'}}>O</div>
        <div className="notable-point-info">
         <strong>{copyText('Circumcenter','Körülírt kör kp. (O)',lang)}</strong>
         <span>{vecText(z.centers.circumcenter)} · R = {fmt(z.radii.circumradius)}</span>
        </div>
       </div>
       <div style={{display:'flex',alignItems:'center',gap:4}}>
        <button
         className="action-btn primary"
         style={{width:'auto',height:24,padding:'0 6px',fontSize:9,gap:2}}
         title={copyText('Create Dot in scene','Pont létrehozása a színtérben',lang)}
         onClick={()=>createCenterPoint?.('circumcenter',z.centers.circumcenter,'Körülírt kör kp. (O)','Circumcenter O')}
        >
         <Plus size={10}/>
         <span>{copyText('Dot','+ Pont',lang)}</span>
        </button>
        <button
         className="copy-icon-btn"
         onClick={()=>copyToClipboard(vecText(z.centers.circumcenter),'pt-O')}
        >
         {copiedKey==='pt-O'?<Check size={12} color="#55d6be"/>:<Copy size={12}/>}
        </button>
       </div>
      </div>

      <div className="notable-point-card">
       <div className="notable-point-left">
        <div className="point-symbol" style={{backgroundColor:'#e6a7ff'}}>I</div>
        <div className="notable-point-info">
         <strong>{copyText('Incenter','Beírt kör kp. (I)',lang)}</strong>
         <span>{vecText(z.centers.incenter)} · r = {fmt(z.radii.inradius)}</span>
        </div>
       </div>
       <div style={{display:'flex',alignItems:'center',gap:4}}>
        <button
         className="action-btn primary"
         style={{width:'auto',height:24,padding:'0 6px',fontSize:9,gap:2}}
         title={copyText('Create Dot in scene','Pont létrehozása a színtérben',lang)}
         onClick={()=>createCenterPoint?.('incenter',z.centers.incenter,'Beírt kör kp. (I)','Incenter I')}
        >
         <Plus size={10}/>
         <span>{copyText('Dot','+ Pont',lang)}</span>
        </button>
        <button
         className="copy-icon-btn"
         onClick={()=>copyToClipboard(vecText(z.centers.incenter),'pt-I')}
        >
         {copiedKey==='pt-I'?<Check size={12} color="#55d6be"/>:<Copy size={12}/>}
        </button>
       </div>
      </div>
     </div>
    </div>
   </details>

   {/* 7. Notable Circles (Beírt és körülírt kör) */}
   {opts.has('showCircles')&&(
    <details className="inspector-card" open>
     <summary>
      <span>{copyText('Notable Circles (Equations & 3D)','Nevezetes körök (Egyenletek & 3D)',lang)}</span>
     </summary>
     <div className="inspector-card-body">
      {/* Circumcircle */}
      <div style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:6,padding:10}}>
       <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <strong style={{color:'#61a5ff',fontSize:12}}>
         {copyText('Circumcircle (Körülírt kör)','Körülírt kör (O, R)',lang)}
        </strong>
        <button
         className="action-btn primary"
         style={{width:'auto',height:24,padding:'0 8px',fontSize:10,gap:3}}
         title={copyText('Create circumcircle in scene','Körülírt kör létrehozása a színtérben',lang)}
         onClick={()=>{
          createCircle?.('circumcircle',{center:z.centers.circumcenter,radius:z.radii.circumradius,normal:z.plane.n},`${o.name}_KörülírtKör`)
          notify(copyText('Circumcircle created in scene','Körülírt kör létrehozva a színtérben',lang))
         }}
        >
         <Plus size={11}/>
         <span>{copyText('Create Circle','+ Kör',lang)}</span>
        </button>
       </div>
       <div style={{fontSize:10.5,color:'var(--muted)',marginBottom:4}}>
        {copyText('Center: O = ','Középpont: O = ',lang)}{vecText(z.centers.circumcenter)} · R = {fmt(z.radii.circumradius)}
       </div>
       <div style={{fontSize:10,color:'var(--muted)',marginBottom:2}}>{copyText('3D Parametric Equation:','3D Paraméteres egyenlet:',lang)}</div>
       <div className="math-block" style={{marginBottom:6}}>
        <code style={{fontSize:10}}>{`X(t) = ${vecText(z.centers.circumcenter)} + ${fmt(z.radii.circumradius)}(u cos t + v sin t)`}</code>
        <button className="copy-icon-btn" onClick={()=>copyToClipboard(`X(t) = ${vecText(z.centers.circumcenter)} + ${fmt(z.radii.circumradius)}(u cos t + v sin t)`,'circ-par')}>
         {copiedKey==='circ-par'?<Check size={11} color="#55d6be"/>:<Copy size={11}/>}
        </button>
       </div>
       <div style={{fontSize:10,color:'var(--muted)',marginBottom:2}}>{copyText('Plane & Sphere Constraint:','Implicit egyenletrendszer:',lang)}</div>
       <div className="math-block">
        <code style={{fontSize:10}}>{`||X − O||² = ${fmt(z.radii.circumradius*z.radii.circumradius)};  ${planeEq}`}</code>
        <button className="copy-icon-btn" onClick={()=>copyToClipboard(`||X − O||² = ${fmt(z.radii.circumradius*z.radii.circumradius)}; ${planeEq}`,'circ-imp')}>
         {copiedKey==='circ-imp'?<Check size={11} color="#55d6be"/>:<Copy size={11}/>}
        </button>
       </div>
      </div>

      {/* Incircle */}
      <div style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:6,padding:10}}>
       <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <strong style={{color:'#e6a7ff',fontSize:12}}>
         {copyText('Incircle (Beírt kör)','Beírt kör (I, r)',lang)}
        </strong>
        <button
         className="action-btn primary"
         style={{width:'auto',height:24,padding:'0 8px',fontSize:10,gap:3}}
         title={copyText('Create incircle in scene','Beírt kör létrehozása a színtérben',lang)}
         onClick={()=>{
          createCircle?.('incircle',{center:z.centers.incenter,radius:z.radii.inradius,normal:z.plane.n},`${o.name}_BeírtKör`)
          notify(copyText('Incircle created in scene','Beírt kör létrehozva a színtérben',lang))
         }}
        >
         <Plus size={11}/>
         <span>{copyText('Create Circle','+ Kör',lang)}</span>
        </button>
       </div>
       <div style={{fontSize:10.5,color:'var(--muted)',marginBottom:4}}>
        {copyText('Center: I = ','Középpont: I = ',lang)}{vecText(z.centers.incenter)} · r = {fmt(z.radii.inradius)}
       </div>
       <div style={{fontSize:10,color:'var(--muted)',marginBottom:2}}>{copyText('3D Parametric Equation:','3D Paraméteres egyenlet:',lang)}</div>
       <div className="math-block" style={{marginBottom:6}}>
        <code style={{fontSize:10}}>{`X(t) = ${vecText(z.centers.incenter)} + ${fmt(z.radii.inradius)}(u cos t + v sin t)`}</code>
        <button className="copy-icon-btn" onClick={()=>copyToClipboard(`X(t) = ${vecText(z.centers.incenter)} + ${fmt(z.radii.inradius)}(u cos t + v sin t)`,'inc-par')}>
         {copiedKey==='inc-par'?<Check size={11} color="#55d6be"/>:<Copy size={11}/>}
        </button>
       </div>
       <div style={{fontSize:10,color:'var(--muted)',marginBottom:2}}>{copyText('Plane & Sphere Constraint:','Implicit egyenletrendszer:',lang)}</div>
       <div className="math-block">
        <code style={{fontSize:10}}>{`||X − I||² = ${fmt(z.radii.inradius*z.radii.inradius)};  ${planeEq}`}</code>
        <button className="copy-icon-btn" onClick={()=>copyToClipboard(`||X − I||² = ${fmt(z.radii.inradius*z.radii.inradius)}; ${planeEq}`,'inc-imp')}>
         {copiedKey==='inc-imp'?<Check size={11} color="#55d6be"/>:<Copy size={11}/>}
        </button>
       </div>
      </div>
     </div>
    </details>
   )}

   {/* 8. Notable Line Equations */}
   {(opts.has('showMedians')||opts.has('showAltitudes')||opts.has('showBisectors')||opts.has('showAngleBisectors')||opts.has('showEuler'))&&(
    <details className="inspector-card" open>
     <summary>
      <span>{copyText('Notable Line Equations','Nevezetes egyenesek egyenletei',lang)}</span>
     </summary>
     <div className="inspector-card-body">
      <div className="line-equation-group">
       {opts.has('showMedians')&&(
        <div>
         <div style={{fontSize:11,fontWeight:600,color:'var(--accent)',marginBottom:4}}>
          {copyText('Medians (Súlyvonalak):','Súlyvonalak egyenletei:',lang)}
         </div>
         {(['sa','sb','sc']as const).map((name,i)=>
          renderLineEqRow(name,z.medians[i],`${name} súlyvonal`,`${name} median`)
         )}
        </div>
       )}

       {opts.has('showAltitudes')&&(
        <div>
         <div style={{fontSize:11,fontWeight:600,color:'var(--accent)',marginBottom:4,marginTop:6}}>
          {copyText('Altitudes (Magasságvonalak):','Magasságvonalak egyenletei:',lang)}
         </div>
         {(['ma','mb','mc']as const).map((name,i)=>
          renderLineEqRow(name,z.altitudes[i],`${name} magasságvonal`,`${name} altitude`)
         )}
        </div>
       )}

       {opts.has('showBisectors')&&(
        <div>
         <div style={{fontSize:11,fontWeight:600,color:'var(--accent)',marginBottom:4,marginTop:6}}>
          {copyText('Perpendicular Bisectors:','Oldalfelező merőlegesek:',lang)}
         </div>
         {(['fa','fb','fc']as const).map((name,i)=>
          renderLineEqRow(name,z.perpendicularBisectors[i],`${name} oldalfelező`,`${name} perp bisector`)
         )}
        </div>
       )}

       {opts.has('showAngleBisectors')&&(
        <div>
         <div style={{fontSize:11,fontWeight:600,color:'var(--accent)',marginBottom:4,marginTop:6}}>
          {copyText('Angle Bisectors:','Szögfelezők egyenletei:',lang)}
         </div>
         {(['ia','ib','ic']as const).map((name,i)=>
          renderLineEqRow(name,z.angleBisectors[i],`${name} szögfelező`,`${name} angle bisector`)
         )}
        </div>
       )}

       {opts.has('showEuler')&&z.euler&&(
        <div>
         <div style={{fontSize:11,fontWeight:600,color:'var(--accent)',marginBottom:4,marginTop:6}}>
          {copyText('Euler Line:','Euler-egyenes egyenlete:',lang)}
         </div>
         {renderLineEqRow('Euler',z.euler,'Euler-egyenes','Euler line')}
        </div>
       )}
      </div>
     </div>
    </details>
   )}
  </div>
 )
}
