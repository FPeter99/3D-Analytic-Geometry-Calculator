import{useState}from'react'
import{Copy,Check,ArrowLeft,Plus,Layers,SlidersHorizontal}from'lucide-react'
import*as G from'../math/geometry'
import type{Vec3}from'../math/geometry'
import{triangleAnalysis}from'../math/triangle'
import{calculate}from'../math/calculator'
import type{Language}from'./TriangleInspector'

export interface LineConstructionInspectorProps{
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
 onPromote:(line:{p:Vec3;v:Vec3;name:string})=>void
}

const copyText=(en:string,hu:string,l:Language)=>l==='en'?en:hu
const fmt=(n:number)=>Number(n.toFixed(3)).toString()
const vecText=(v:Vec3)=>`(${v.map(fmt).join(', ')})`

function formatLineEq(p:Vec3,v:Vec3):string{
 return`(x, y, z) = (${p.map(fmt).join(', ')}) + t(${v.map(fmt).join(', ')})`
}

export function LineConstructionInspector({
 parent,
 role,
 allObjects,
 language:lang,
 notify,
 onBack,
 onPromote
}:LineConstructionInspectorProps){
 const[copied,setCopied]=useState(false)
 const[compareTargetId,setCompareTargetId]=useState<string>('')

 let z:any=null
 try{
  if(parent.kind==='triangle'){
   z=triangleAnalysis({a:parent.data.a,b:parent.data.b,c:parent.data.c})
  }
 }catch{
  return null
 }

 let titleEn=''
 let titleHu=''
 let descEn=''
 let descHu=''
 let lineP:Vec3=[0,0,0]
 let lineV:Vec3=[1,0,0]

 if(parent.kind==='triangle'&&z){
  const a=parent.data.a as Vec3
  const b=parent.data.b as Vec3
  const c=parent.data.c as Vec3

  if(role==='sideA'){
   titleEn='Side a (BC segment)'
   titleHu='a oldal (BC szakasz)'
   descEn='Segment between vertex B and vertex C. Length: '+fmt(z.lengths[1])
   descHu=`Szakasz a B és C csúcsok között. Hosszúság: ${fmt(z.lengths[1])}`
   lineP=b
   lineV=G.sub(c,b)
  }else if(role==='sideB'){
   titleEn='Side b (CA segment)'
   titleHu='b oldal (CA szakasz)'
   descEn='Segment between vertex C and vertex A. Length: '+fmt(z.lengths[2])
   descHu=`Szakasz a C és A csúcsok között. Hosszúság: ${fmt(z.lengths[2])}`
   lineP=c
   lineV=G.sub(a,c)
  }else if(role==='sideC'){
   titleEn='Side c (AB segment)'
   titleHu='c oldal (AB szakasz)'
   descEn='Segment between vertex A and vertex B. Length: '+fmt(z.lengths[0])
   descHu=`Szakasz az A és B csúcsok között. Hosszúság: ${fmt(z.lengths[0])}`
   lineP=a
   lineV=G.sub(b,a)
  }else if(role==='showAltitudes0'||role==='ma'){
   titleEn='Altitude ma (from vertex A)'
   titleHu='ma magasságvonal (A csúcsból a BC oldalra)'
   descEn='Line through vertex A perpendicular to opposite side BC. Passes through orthocenter M.'
   descHu='Az A csúcson áthaladó, szemközti BC oldalra merőleges egyenes. Áthalad a magasságponton (M).'
   lineP=a
   lineV=z.altitudes[0].v
  }else if(role==='showAltitudes1'||role==='mb'){
   titleEn='Altitude mb (from vertex B)'
   titleHu='mb magasságvonal (B csúcsból a CA oldalra)'
   descEn='Line through vertex B perpendicular to opposite side CA. Passes through orthocenter M.'
   descHu='A B csúcson áthaladó, szemközti CA oldalra merőleges egyenes. Áthalad a magasságponton (M).'
   lineP=b
   lineV=z.altitudes[1].v
  }else if(role==='showAltitudes2'||role==='mc'){
   titleEn='Altitude mc (from vertex C)'
   titleHu='mc magasságvonal (C csúcsból az AB oldalra)'
   descEn='Line through vertex C perpendicular to opposite side AB. Passes through orthocenter M.'
   descHu='A C csúcson áthaladó, szemközti AB oldalra merőleges egyenes. Áthalad a magasságponton (M).'
   lineP=c
   lineV=z.altitudes[2].v
  }else if(role==='showMedians0'||role==='sa'){
   titleEn='Median sa (from vertex A)'
   titleHu='sa súlyvonal (A csúcsból a BC felezőpontjába)'
   descEn='Line connecting vertex A with the midpoint of side BC. Passes through centroid G.'
   descHu='Az A csúcsot a BC oldal felezőpontjával összekötő egyenes. Áthalad a súlyponton (G).'
   lineP=a
   lineV=z.medians[0].v
  }else if(role==='showMedians1'||role==='sb'){
   titleEn='Median sb (from vertex B)'
   titleHu='sb súlyvonal (B csúcsból a CA felezőpontjába)'
   descEn='Line connecting vertex B with the midpoint of side CA. Passes through centroid G.'
   descHu='A B csúcsot a CA oldal felezőpontjával összekötő egyenes. Áthalad a súlyponton (G).'
   lineP=b
   lineV=z.medians[1].v
  }else if(role==='showMedians2'||role==='sc'){
   titleEn='Median sc (from vertex C)'
   titleHu='sc súlyvonal (C csúcsból az AB felezőpontjába)'
   descEn='Line connecting vertex C with the midpoint of side AB. Passes through centroid G.'
   descHu='A C csúcsot az AB oldal felezőpontjával összekötő egyenes. Áthalad a súlyponton (G).'
   lineP=c
   lineV=z.medians[2].v
  }else if(role==='showBisectors0'||role==='fa'){
   titleEn='Perpendicular bisector fa (side BC)'
   titleHu='fa oldalfelező merőleges (BC oldalhoz)'
   descEn='Line perpendicular to side BC at its midpoint. Passes through circumcenter O.'
   descHu='A BC oldal felezőpontjára állított merőleges a háromszög síkjában. Áthalad a körülírt kör középpontján (O).'
   lineP=z.midpoints[1]
   lineV=z.perpendicularBisectors[0].v
  }else if(role==='showBisectors1'||role==='fb'){
   titleEn='Perpendicular bisector fb (side CA)'
   titleHu='fb oldalfelező merőleges (CA oldalhoz)'
   descEn='Line perpendicular to side CA at its midpoint. Passes through circumcenter O.'
   descHu='A CA oldal felezőpontjára állított merőleges a háromszög síkjában. Áthalad a körülírt kör középpontján (O).'
   lineP=z.midpoints[2]
   lineV=z.perpendicularBisectors[1].v
  }else if(role==='showBisectors2'||role==='fc'){
   titleEn='Perpendicular bisector fc (side AB)'
   titleHu='fc oldalfelező merőleges (AB oldalhoz)'
   descEn='Line perpendicular to side AB at its midpoint. Passes through circumcenter O.'
   descHu='Az AB oldal felezőpontjára állított merőleges a háromszög síkjában. Áthalad a körülírt kör középpontján (O).'
   lineP=z.midpoints[0]
   lineV=z.perpendicularBisectors[2].v
  }else if(role==='showAngleBisectors0'||role==='ia'){
   titleEn='Angle bisector ia (at vertex A)'
   titleHu='ia belső szögfelező (A csúcsnál)'
   descEn='Interior angle bisector line through vertex A. Passes through incenter I.'
   descHu='Az A csúcsnál lévő belső szögfelező egyenes. Áthalad a beírt kör középpontján (I).'
   lineP=a
   lineV=z.angleBisectors[0].v
  }else if(role==='showAngleBisectors1'||role==='ib'){
   titleEn='Angle bisector ib (at vertex B)'
   titleHu='ib belső szögfelező (B csúcsnál)'
   descEn='Interior angle bisector line through vertex B. Passes through incenter I.'
   descHu='A B csúcsnál lévő belső szögfelező egyenes. Áthalad a beírt kör középpontján (I).'
   lineP=b
   lineV=z.angleBisectors[1].v
  }else if(role==='showAngleBisectors2'||role==='ic'){
   titleEn='Angle bisector ic (at vertex C)'
   titleHu='ic belső szögfelező (C csúcsnál)'
   descEn='Interior angle bisector line through vertex C. Passes through incenter I.'
   descHu='A C csúcsnál lévő belső szögfelező egyenes. Áthalad a beírt kör középpontján (I).'
   lineP=c
   lineV=z.angleBisectors[2].v
  }else if(role==='euler'){
   titleEn='Euler Line'
   titleHu='Euler-egyenes'
   descEn='Line passing through the centroid G, circumcenter O, and orthocenter M.'
   descHu='A háromszög súlypontján (G), körülírt körének középpontján (O) és magasságpontján (M) áthaladó egyenes.'
   if(z.euler){
    lineP=z.euler.p
    lineV=z.euler.v
   }
  }
 }

 const eqString=formatLineEq(lineP,lineV)

 const copyToClipboard=()=>{
  if(navigator.clipboard)navigator.clipboard.writeText(eqString)
  setCopied(true)
  notify(copyText('Equation copied to clipboard','Egyenlet vágólapra másolva',lang))
  setTimeout(()=>setCopied(false),2000)
 }

 // Comparison calculation
 const targetObj=allObjects.find(o=>o.id===compareTargetId)
 let comparisonResult:any=null
 if(targetObj){
  try{
   const thisLineObj={kind:'line',name:copyText(titleEn,titleHu,lang),data:{p:lineP,v:lineV}}
   comparisonResult=calculate(thisLineObj,targetObj,lang)
  }catch(e:any){
   comparisonResult={value:e?.message||'Nem számítható'}
  }
 }

 return(
  <div className="inspector">
   {/* Header with back button */}
   <div className="inspector-card" style={{borderColor:parent.color}}>
    <div style={{padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
     <button
      className="action-btn"
      style={{width:'auto',padding:'4px 8px',height:28}}
      onClick={onBack}
     >
      <ArrowLeft size={13}/>
      <span>{copyText('Back to triangle','Vissza a háromszöghöz',lang)}</span>
     </button>
     <span style={{fontSize:11,color:'var(--muted)'}}>
      {parent.name}
     </span>
    </div>
   </div>

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

   {/* Parametric Equation Card */}
   <details className="inspector-card" open>
    <summary>
     <span>{copyText('Parametric Line Equation','Paraméteres egyenlet',lang)}</span>
    </summary>
    <div className="inspector-card-body">
     <div className="math-block">
      <code>{eqString}</code>
      <button className="copy-icon-btn" onClick={copyToClipboard} title={copyText('Copy equation','Egyenlet másolása',lang)}>
       {copied?<Check size={12} color="#55d6be"/>:<Copy size={12}/>}
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
     <button
      className="action-btn primary"
      onClick={()=>onPromote({p:lineP,v:lineV,name:copyText(titleEn,titleHu,lang)})}
     >
      <Plus size={13}/>
      <span>{copyText('Save as permanent Line in scene','Létrehozás önálló egyenesként',lang)}</span>
     </button>
    </div>
   </details>

   {/* Comparison with another plane or line */}
   <details className="inspector-card" open>
    <summary>
     <span>{copyText('Compare with other object (Plane/Line)','Metszéspont vizsgálat más alakzattal',lang)}</span>
    </summary>
    <div className="inspector-card-body">
     <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <label style={{fontSize:11,color:'var(--muted)'}}>
       {copyText('Select plane or object to find intersection:','Válassz síkot vagy egyenest a metszéshez:',lang)}
      </label>
      <select
       style={{width:'100%',height:30,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:5,color:'var(--text)',padding:'0 8px',fontSize:11}}
       value={compareTargetId}
       onChange={e=>setCompareTargetId(e.target.value)}
      >
       <option value="">{copyText('-- Select plane, line, sphere --','-- Válassz síkot, egyenest, gömböt --',lang)}</option>
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
