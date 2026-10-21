import{useState}from'react'
import{Copy,Check,ArrowLeft,Plus,Layers,SlidersHorizontal}from'lucide-react'
import*as G from'../math/geometry'
import type{Vec3}from'../math/geometry'
import{triangleAnalysis}from'../math/triangle'
import{calculate}from'../math/calculator'
import type{Language}from'./TriangleInspector'

export interface SubConstructionInspectorProps{
 parent:{
  id:string
  name:string
  kind:string
  color:string
  data:Record<string,any>
 }
 role:string
 allObjects:Array<{id:string;name:string;kind:string;color:string;data:any}>
 language:Language
  notify:(msg:string)=>void
  onBack:()=>void
  embedded?:boolean
 onPromotePoint?:(point:{p:Vec3;name:string})=>void
 onPromoteLine?:(line:{p:Vec3;v:Vec3;name:string})=>void
 onPromoteCircle?:(circle:{center:Vec3;radius:number;normal:Vec3;name:string})=>void
}

const copyText=(en:string,hu:string,l:Language)=>l==='en'?en:hu
const fmt=(n:number)=>Number(n.toFixed(3)).toString()
const vecText=(v:Vec3)=>`(${v.map(fmt).join(', ')})`

function formatLineEq(p:Vec3,v:Vec3):string{
 return`(x, y, z) = (${p.map(fmt).join(', ')}) + t(${v.map(fmt).join(', ')})`
}

function formatPlaneEq(n:Vec3,d:number):string{
 const parts:string[]=[]
 const vars=['x','y','z']
 for(let i=0;i<3;i++){
  const val=Number(n[i].toFixed(4))
  if(Math.abs(val)<1e-6)continue
  const sign=val<0?'− ':(parts.length>0?'+ ':'')
  const absVal=Math.abs(val)
  const coefStr=Math.abs(absVal-1)<1e-6?'':`${Number(absVal.toFixed(3))} `
  parts.push(`${sign}${coefStr}${vars[i]}`)
 }
 if(!parts.length)return'0 = 0'
 return`${parts.join(' ')} = ${Number(d.toFixed(3))}`
}

export function SubConstructionInspector({
 parent,
 role,
 allObjects,
 language:lang,
  notify,
  onBack,
  embedded=false,
 onPromotePoint,
 onPromoteLine,
 onPromoteCircle
}:SubConstructionInspectorProps){
 const[copiedKey,setCopiedKey]=useState<string|null>(null)
 const[compareTargetId,setCompareTargetId]=useState<string>('')

 const copyToClipboard=(text:string,key:string)=>{
  if(navigator.clipboard)navigator.clipboard.writeText(text)
  setCopiedKey(key)
  notify(copyText('Copied to clipboard','Vágólapra másolva',lang))
  setTimeout(()=>setCopiedKey(null),2000)
 }

 let z:any=null
 try{
  if(parent.kind==='triangle'){
   z=triangleAnalysis({a:parent.data.a,b:parent.data.b,c:parent.data.c})
  }
 }catch{}

 // Identify item type and values
 let itemKind:'point'|'line'|'segment'|'circle'='line'
 let titleEn=''
 let titleHu=''
 let descEn=''
 let descHu=''

 let pointCoord:Vec3=[0,0,0]
 let lineP:Vec3=[0,0,0]
 let lineV:Vec3=[1,0,0]
 let circleCenter:Vec3=[0,0,0]
 let circleRadius=1
 let circleNormal:Vec3=[0,1,0]
 let circleBasis:[Vec3,Vec3]=[[1,0,0],[0,0,1]]

 if(parent.kind==='triangle'&&z){
  const a=parent.data.a as Vec3
  const b=parent.data.b as Vec3
  const c=parent.data.c as Vec3

  // Vertices
  if(role==='vertex0'){
   itemKind='point'
   titleEn='Vertex A'
   titleHu='A csúcs'
   descEn='First vertex of triangle '+parent.name
   descHu=`A(z) ${parent.name} háromszög első csúcsa.`
   pointCoord=a
  }else if(role==='vertex1'){
   itemKind='point'
   titleEn='Vertex B'
   titleHu='B csúcs'
   descEn='Second vertex of triangle '+parent.name
   descHu=`A(z) ${parent.name} háromszög második csúcsa.`
   pointCoord=b
  }else if(role==='vertex2'){
   itemKind='point'
   titleEn='Vertex C'
   titleHu='C csúcs'
   descEn='Third vertex of triangle '+parent.name
   descHu=`A(z) ${parent.name} háromszög harmadik csúcsa.`
   pointCoord=c
  }
  // Notable Centers
  else if(role==='centroid'){
   itemKind='point'
   titleEn='Centroid G'
   titleHu='Súlypont (G)'
   descEn='Intersection of the three triangle medians: G = (A + B + C) / 3.'
   descHu='A háromszög három súlyvonalának metszéspontja: G = (A + B + C) / 3.'
   pointCoord=z.centers.centroid
  }else if(role==='orthocenter'){
   itemKind='point'
   titleEn='Orthocenter M'
   titleHu='Magasságpont (M)'
   descEn='Intersection point of the three altitudes.'
   descHu='A háromszög három magasságvonalának közös metszéspontja.'
   pointCoord=z.centers.orthocenter
  }else if(role==='circumcenter'){
   itemKind='point'
   titleEn='Circumcenter O'
   titleHu='Körülírt kör középpontja (O)'
   descEn=`Center of the circumscribed circle (R = ${fmt(z.radii.circumradius)}), intersection of perpendicular bisectors.`
   descHu=`A háromszög körülírt körének középpontja (R = ${fmt(z.radii.circumradius)}), az oldalfelező merőlegesek metszéspontja.`
   pointCoord=z.centers.circumcenter
  }else if(role==='incenter'){
   itemKind='point'
   titleEn='Incenter I'
   titleHu='Beírt kör középpontja (I)'
   descEn=`Center of the inscribed circle (r = ${fmt(z.radii.inradius)}), intersection of angle bisectors.`
   descHu=`A háromszög beírt körének középpontja (r = ${fmt(z.radii.inradius)}), a belső szögfelezők metszéspontja.`
   pointCoord=z.centers.incenter
  }
  // Sides
  else if(role==='sideA'){
   itemKind='segment'
   titleEn='Side a (BC segment)'
   titleHu='a oldal (BC szakasz)'
   descEn=`Finite segment between vertex B and vertex C. Length: |BC| = ${fmt(z.lengths[1])}`
   descHu=`Véges szakasz a B és C csúcsok között. Hosszúság: |BC| = ${fmt(z.lengths[1])}`
   lineP=b
   lineV=G.sub(c,b)
  }else if(role==='sideB'){
   itemKind='segment'
   titleEn='Side b (CA segment)'
   titleHu='b oldal (CA szakasz)'
   descEn=`Finite segment between vertex C and vertex A. Length: |CA| = ${fmt(z.lengths[2])}`
   descHu=`Véges szakasz a C és A csúcsok között. Hosszúság: |CA| = ${fmt(z.lengths[2])}`
   lineP=c
   lineV=G.sub(a,c)
  }else if(role==='sideC'){
   itemKind='segment'
   titleEn='Side c (AB segment)'
   titleHu='c oldal (AB szakasz)'
   descEn=`Finite segment between vertex A and vertex B. Length: |AB| = ${fmt(z.lengths[0])}`
   descHu=`Véges szakasz az A és B csúcsok között. Hosszúság: |AB| = ${fmt(z.lengths[0])}`
   lineP=a
   lineV=G.sub(b,a)
  }
  // Altitudes
  else if(role==='showAltitudes0'||role==='ma'){
   itemKind='line'
   titleEn='Altitude ma'
   titleHu='ma magasságvonal'
   descEn='Line through vertex A perpendicular to opposite side BC. Passes through orthocenter M.'
   descHu='Az A csúcson áthaladó, szemközti BC oldalra merőleges egyenes. Áthalad a magasságponton (M).'
   lineP=a
   lineV=z.altitudes[0].v
  }else if(role==='showAltitudes1'||role==='mb'){
   itemKind='line'
   titleEn='Altitude mb'
   titleHu='mb magasságvonal'
   descEn='Line through vertex B perpendicular to opposite side CA. Passes through orthocenter M.'
   descHu='A B csúcson áthaladó, szemközti CA oldalra merőleges egyenes. Áthalad a magasságponton (M).'
   lineP=b
   lineV=z.altitudes[1].v
  }else if(role==='showAltitudes2'||role==='mc'){
   itemKind='line'
   titleEn='Altitude mc'
   titleHu='mc magasságvonal'
   descEn='Line through vertex C perpendicular to opposite side AB. Passes through orthocenter M.'
   descHu='A C csúcson áthaladó, szemközti AB oldalra merőleges egyenes. Áthalad a magasságponton (M).'
   lineP=c
   lineV=z.altitudes[2].v
  }
  // Medians
  else if(role==='showMedians0'||role==='sa'){
   itemKind='line'
   titleEn='Median sa'
   titleHu='sa súlyvonal'
   descEn='Line through vertex A and the midpoint of side BC. Passes through centroid G.'
   descHu='Az A csúcsot a BC oldal felezőpontjával összekötő egyenes. Áthalad a súlyponton (G).'
   lineP=a
   lineV=z.medians[0].v
  }else if(role==='showMedians1'||role==='sb'){
   itemKind='line'
   titleEn='Median sb'
   titleHu='sb súlyvonal'
   descEn='Line through vertex B and the midpoint of side CA. Passes through centroid G.'
   descHu='A B csúcsot a CA oldal felezőpontjával összekötő egyenes. Áthalad a súlyponton (G).'
   lineP=b
   lineV=z.medians[1].v
  }else if(role==='showMedians2'||role==='sc'){
   itemKind='line'
   titleEn='Median sc'
   titleHu='sc súlyvonal'
   descEn='Line through vertex C and the midpoint of side AB. Passes through centroid G.'
   descHu='A C csúcsot az AB oldal felezőpontjával összekötő egyenes. Áthalad a súlyponton (G).'
   lineP=c
   lineV=z.medians[2].v
  }
  // Perpendicular Bisectors
  else if(role==='showBisectors0'||role==='fa'){
   itemKind='line'
   titleEn='Perpendicular bisector fa'
   titleHu='fa oldalfelező merőleges'
   descEn='Line perpendicular to side BC at its midpoint. Passes through circumcenter O.'
   descHu='A BC oldal felezőpontjára állított merőleges a háromszög síkjában. Áthalad a körülírt kör középpontján (O).'
   lineP=z.midpoints[1]
   lineV=z.perpendicularBisectors[0].v
  }else if(role==='showBisectors1'||role==='fb'){
   itemKind='line'
   titleEn='Perpendicular bisector fb'
   titleHu='fb oldalfelező merőleges'
   descEn='Line perpendicular to side CA at its midpoint. Passes through circumcenter O.'
   descHu='A CA oldal felezőpontjára állított merőleges a háromszög síkjában. Áthalad a körülírt kör középpontján (O).'
   lineP=z.midpoints[2]
   lineV=z.perpendicularBisectors[1].v
  }else if(role==='showBisectors2'||role==='fc'){
   itemKind='line'
   titleEn='Perpendicular bisector fc'
   titleHu='fc oldalfelező merőleges'
   descEn='Line perpendicular to side AB at its midpoint. Passes through circumcenter O.'
   descHu='Az AB oldal felezőpontjára állított merőleges a háromszög síkjában. Áthalad a körülírt kör középpontján (O).'
   lineP=z.midpoints[0]
   lineV=z.perpendicularBisectors[2].v
  }
  // Angle Bisectors
  else if(role==='showAngleBisectors0'||role==='ia'){
   itemKind='line'
   titleEn='Angle bisector ia'
   titleHu='ia belső szögfelező'
   descEn='Interior angle bisector line through vertex A. Passes through incenter I.'
   descHu='Az A csúcsnál lévő belső szögfelező egyenes. Áthalad a beírt kör középpontján (I).'
   lineP=a
   lineV=z.angleBisectors[0].v
  }else if(role==='showAngleBisectors1'||role==='ib'){
   itemKind='line'
   titleEn='Angle bisector ib'
   titleHu='ib belső szögfelező'
   descEn='Interior angle bisector line through vertex B. Passes through incenter I.'
   descHu='A B csúcsnál lévő belső szögfelező egyenes. Áthalad a beírt kör középpontján (I).'
   lineP=b
   lineV=z.angleBisectors[1].v
  }else if(role==='showAngleBisectors2'||role==='ic'){
   itemKind='line'
   titleEn='Angle bisector ic'
   titleHu='ic belső szögfelező'
   descEn='Interior angle bisector line through vertex C. Passes through incenter I.'
   descHu='A C csúcsnál lévő belső szögfelező egyenes. Áthalad a beírt kör középpontján (I).'
   lineP=c
   lineV=z.angleBisectors[2].v
  }
  // Euler line
  else if(role==='euler'){
   itemKind='line'
   titleEn='Euler Line'
   titleHu='Euler-egyenes'
   descEn='Line passing through centroid G, circumcenter O, and orthocenter M.'
   descHu='A háromszög súlypontján (G), körülírt körének középpontján (O) és magasságpontján (M) áthaladó egyenes.'
   if(z.euler){
    lineP=z.euler.p
    lineV=z.euler.v
   }
  }
  // Circles
  else if(role==='circumcircle'){
   itemKind='circle'
   titleEn='Circumcircle'
   titleHu='Körülírt kör'
   descEn=`Circle passing through all three vertices of triangle ${parent.name}. Center O, radius R = ${fmt(z.radii.circumradius)}.`
   descHu=`A(z) ${parent.name} háromszög mindhárom csúcsán áthaladó kör. Középpontja O, sugara R = ${fmt(z.radii.circumradius)}.`
   circleCenter=z.centers.circumcenter
   circleRadius=z.radii.circumradius
   circleNormal=z.plane.n
   try{
    const cObj=G.circleFromCenterRadiusNormal(circleCenter,circleRadius,circleNormal)
    circleBasis=cObj.basis
   }catch{}
  }else if(role==='incircle'){
   itemKind='circle'
   titleEn='Incircle'
   titleHu='Beírt kör'
   descEn=`Circle tangent to all three sides of triangle ${parent.name}. Center I, radius r = ${fmt(z.radii.inradius)}.`
   descHu=`A(z) ${parent.name} háromszög mindhárom oldalát belülről érintő kör. Középpontja I, sugara r = ${fmt(z.radii.inradius)}.`
   circleCenter=z.centers.incenter
   circleRadius=z.radii.inradius
   circleNormal=z.plane.n
   try{
    const cObj=G.circleFromCenterRadiusNormal(circleCenter,circleRadius,circleNormal)
    circleBasis=cObj.basis
   }catch{}
  }
 }

 const lineEq=formatLineEq(lineP,lineV)
 const parametricCircleEq=`X(t) = ${vecText(circleCenter)} + ${fmt(circleRadius)}(${vecText(circleBasis[0])} cos t + ${vecText(circleBasis[1])} sin t)`
 const planeEq=formatPlaneEq(circleNormal,G.dot(circleNormal,circleCenter))

 // Comparison calculation
 const targetObj=allObjects.find(o=>o.id===compareTargetId)
 let comparisonResult:any=null
 if(targetObj){
  try{
   let compareSource:any
   if(itemKind==='point'){
    compareSource={kind:'point',name:copyText(titleEn,titleHu,lang),data:{p:pointCoord}}
   }else if(itemKind==='line'){
    compareSource={kind:'line',name:copyText(titleEn,titleHu,lang),data:{p:lineP,v:lineV}}
   }else if(itemKind==='segment'){
    compareSource={kind:'segment',name:copyText(titleEn,titleHu,lang),data:{p:lineP,q:G.add(lineP,lineV)}}
   }else{
    compareSource={kind:'circle',name:copyText(titleEn,titleHu,lang),data:{center:circleCenter,radius:circleRadius,normal:circleNormal}}
   }
   comparisonResult=calculate(compareSource,targetObj,lang)
  }catch(e:any){
   comparisonResult={value:e?.message||'Nem számítható'}
  }
 }

 return(
   <div className={embedded ? 'subconstruction-embedded' : 'inspector'}>
    {!embedded && (
     <div className="inspector-card" style={{borderColor:parent.color}}>
      <div style={{padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
      <button
       className="action-btn"
       style={{width:'auto',padding:'4px 8px',height:28}}
      onClick={onBack}
     >
      <ArrowLeft size={13}/>
      <span>{copyText('Back to '+parent.name,'Vissza: '+parent.name,lang)}</span>
     </button>
      <span style={{fontSize:11,color:'var(--muted)'}}>
       {parent.name}
      </span>
      </div>
     </div>
    )}

   {/* Main Info Card */}
   <div className="inspector-card" style={{borderLeft:'3px solid var(--accent)'}}>
    <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:8}}>
     <div style={{display:'flex',alignItems:'center',gap:8}}>
      <Layers size={16} color="var(--accent)"/>
      <strong style={{fontSize:13,color:'var(--text)'}}>
       {copyText(titleEn,titleHu,lang)}
      </strong>
     </div>
     <p style={{fontSize:11,color:'var(--muted)',margin:0,lineHeight:1.4}}>
      {copyText(descEn,descHu,lang)}
     </p>
    </div>
   </div>

   {/* Point Inspector details */}
   {itemKind==='point'&&(
    <details className="inspector-card" open>
     <summary>
      <span>{copyText('Point Coordinates (3D)','Pont koordinátái (3D)',lang)}</span>
     </summary>
     <div className="inspector-card-body">
      <div className="math-block">
       <code>P = {vecText(pointCoord)}</code>
       <button
        className="copy-icon-btn"
        title={copyText('Copy coordinates','Koordináták másolása',lang)}
        onClick={()=>copyToClipboard(vecText(pointCoord),'pt-coord')}
       >
        {copiedKey==='pt-coord'?<Check size={12} color="#55d6be"/>:<Copy size={12}/>}
       </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
       {(['X','Y','Z']as const).map((axis,i)=>(
        <div key={axis} className="metric-box">
         <span className="metric-label">{axis}</span>
         <span className="metric-value">{fmt(pointCoord[i])}</span>
        </div>
       ))}
      </div>

      {onPromotePoint&&(
       <button
        className="action-btn primary"
        onClick={()=>{
         const ptName=`${parent.name}_${copyText(titleEn,titleHu,lang).split(' ')[0]}`
         onPromotePoint({p:pointCoord,name:ptName})
         notify(copyText(`Point ${ptName} created in scene`,`${ptName} pont létrehozva a színtérben`,lang))
        }}
       >
        <Plus size={13}/>
        <span>{copyText('Create as standalone Point in scene','Létrehozás önálló pontként a színtérben',lang)}</span>
       </button>
      )}
     </div>
    </details>
   )}

   {/* Line or Segment Inspector details */}
   {(itemKind==='line'||itemKind==='segment')&&(
    <details className="inspector-card" open>
     <summary>
      <span>{copyText('Line Equation & Direction','Paraméteres egyenlet és irányvektor',lang)}</span>
     </summary>
     <div className="inspector-card-body">
      <div className="math-block">
       <code>{lineEq}</code>
       <button
        className="copy-icon-btn"
        onClick={()=>copyToClipboard(lineEq,'line-eq')}
        title={copyText('Copy equation','Egyenlet másolása',lang)}
       >
        {copiedKey==='line-eq'?<Check size={12} color="#55d6be"/>:<Copy size={12}/>}
       </button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:11}}>
       <div className="metric-box">
        <span className="metric-label">{copyText('Base point P','Talppont P',lang)}</span>
        <span className="metric-value">{vecText(lineP)}</span>
       </div>
       <div className="metric-box">
        <span className="metric-label">{copyText('Direction vector v','Irányvektor v',lang)}</span>
        <span className="metric-value">{vecText(lineV)}</span>
       </div>
      </div>
      {onPromoteLine&&(
       <button
        className="action-btn primary"
        onClick={()=>{
         const lName=`${parent.name}_${copyText(titleEn,titleHu,lang).split(' ')[0]}`
         onPromoteLine({p:lineP,v:lineV,name:lName})
         notify(copyText(`Line ${lName} created in scene`,`${lName} egyenes létrehozva a színtérben`,lang))
        }}
       >
        <Plus size={13}/>
        <span>{copyText('Create as permanent Line in scene','Létrehozás önálló egyenesként a színtérben',lang)}</span>
       </button>
      )}
     </div>
    </details>
   )}

   {/* Circle Inspector details */}
   {itemKind==='circle'&&(
    <details className="inspector-card" open>
     <summary>
      <span>{copyText('Circle Equations (3D)','Kör egyenletei (3D)',lang)}</span>
     </summary>
     <div className="inspector-card-body">
      <div>
       <div style={{fontSize:10,color:'var(--muted)',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>
        {copyText('3D Parametric Equation:','3D Paraméteres egyenlet:',lang)}
       </div>
       <div className="math-block">
        <code style={{fontSize:10}}>{parametricCircleEq}</code>
        <button className="copy-icon-btn" onClick={()=>copyToClipboard(parametricCircleEq,'c-par')}>
         {copiedKey==='c-par'?<Check size={12} color="#55d6be"/>:<Copy size={12}/>}
        </button>
       </div>
      </div>

      <div>
       <div style={{fontSize:10,color:'var(--muted)',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>
        {copyText('Plane Constraint:','Tartósík egyenlete:',lang)}
       </div>
       <div className="math-block">
        <code>{planeEq}</code>
        <button className="copy-icon-btn" onClick={()=>copyToClipboard(planeEq,'c-plane')}>
         {copiedKey==='c-plane'?<Check size={12} color="#55d6be"/>:<Copy size={12}/>}
        </button>
       </div>
      </div>

      <div className="metrics-row">
       <div className="metric-box">
        <span className="metric-label">{copyText('Radius (R)','Sugár (R)',lang)}</span>
        <span className="metric-value">{fmt(circleRadius)}</span>
       </div>
       <div className="metric-box">
        <span className="metric-label">{copyText('Circumference (K)','Kerület (K)',lang)}</span>
        <span className="metric-value">{fmt(2*Math.PI*circleRadius)}</span>
       </div>
      </div>

      <div className="metrics-row">
       <div className="metric-box">
        <span className="metric-label">{copyText('Area (T)','Terület (T)',lang)}</span>
        <span className="metric-value">{fmt(Math.PI*circleRadius*circleRadius)}</span>
       </div>
       <div className="metric-box">
        <span className="metric-label">{copyText('Center','Középpont',lang)}</span>
        <span className="metric-value" style={{fontSize:11}}>{vecText(circleCenter)}</span>
       </div>
      </div>

      {onPromoteCircle&&(
       <button
        className="action-btn primary"
        onClick={()=>{
         const cName=`${parent.name}_${role==='circumcircle'?'KörülírtKör':'BeírtKör'}`
         onPromoteCircle({center:circleCenter,radius:circleRadius,normal:circleNormal,name:cName})
         notify(copyText(`Circle ${cName} created in scene`,`${cName} létrehozva a színtérben`,lang))
        }}
       >
        <Plus size={13}/>
        <span>{copyText('Create as standalone Circle in scene','Létrehozás önálló körként a színtérben',lang)}</span>
       </button>
      )}
     </div>
    </details>
   )}

   {/* Universal Comparison with another plane or line */}
   <details className="inspector-card" open>
    <summary>
     <span>{copyText('Compare with other object (RELATION CHECKER)','Kapcsolatvizsgálat más alakzattal',lang)}</span>
    </summary>
    <div className="inspector-card-body">
     <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <label style={{fontSize:11,color:'var(--muted)'}}>
       {copyText('Select object to check relation:','Válassz alakzatot az összehasonlításhoz:',lang)}
      </label>
      <select
       style={{width:'100%',height:30,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:5,color:'var(--text)',padding:'0 8px',fontSize:11}}
       value={compareTargetId}
       onChange={e=>setCompareTargetId(e.target.value)}
      >
       <option value="">{copyText('-- Select plane, line, sphere, triangle --','-- Válassz síkot, egyenest, gömböt, háromszöget --',lang)}</option>
       {allObjects.filter(o=>o.id!==parent.id).map(o=>(
        <option key={o.id} value={o.id}>
         {o.name} ({o.kind})
        </option>
       ))}
      </select>
     </div>

     {comparisonResult&&(
      <div style={{background:'var(--bg)',border:'1px solid var(--accent)',borderRadius:6,padding:10,marginTop:4,display:'flex',flexDirection:'column',gap:6}}>
       <strong style={{fontSize:11,color:'var(--accent)',display:'flex',alignItems:'center',gap:6}}>
        <SlidersHorizontal size={13}/>
        {comparisonResult.title||copyText('Result','Eredmény',lang)}
       </strong>
       <div style={{fontSize:12,fontWeight:600,color:'var(--text)',lineHeight:1.4}}>
        {comparisonResult.value}
       </div>
       {comparisonResult.steps?.map((step:string,idx:number)=>(
        <div key={idx} style={{fontSize:10,color:'var(--muted)',fontFamily:'DM Mono, monospace'}}>
         {step}
        </div>
       ))}
      </div>
     )}
    </div>
   </details>
  </div>
 )
}
