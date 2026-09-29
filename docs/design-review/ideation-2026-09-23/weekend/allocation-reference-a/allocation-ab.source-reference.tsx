import {useReducer,useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {ArrowLeft,Check,ChevronLeft,ChevronRight,Info,LayoutGrid,Plus,RotateCcw,Rows3,Search,Sparkles,Volleyball,X} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {candidateGroups,fitsPosition,locatePlayer,type BoardTeam,type Slot,type CourtPosition} from './position-board-model'
import {initialReview,reviewReducer,reviewCandidates,currentSlot,isPending,type ReviewState,type ReviewAction,type Target} from './allocation-ab-model'
import {ContinuousAllocation,allocationRoles,type AllocationMode} from './continuous-allocation'
import './allocation-ab.css'

type Variant='a'|'b'
const roleTitle=(slot:Slot)=>slot.position+(['레프트','센터'].includes(slot.position)?` ${Number(slot.id)<3?'1':'2'}`:'')

function TeamBoard({board,view,onOpen,freeLabels=false}:{board:BoardTeam[];view:'court'|'rows';onOpen:(target:Target,button:HTMLButtonElement)=>void;freeLabels?:boolean}){
 return <div className={`ab-boards ${view}`}>{board.map(team=><section className="ab-team" key={team.id} aria-label={`${team.title} 편성`}>
  <header><h2>{team.title}</h2><span>{team.slots.filter(s=>s.playerId).length}명</span></header>
  {view==='court'&&<div className="ab-net"><span>네트</span></div>}
  <div className="ab-team-slots">{(view==='court'?team.slots:[...team.slots].sort((a,b)=>Number(b.position==='세터')-Number(a.position==='세터'))).map(slot=>{
   const player=reviewCandidates.find(p=>p.id===slot.playerId)
   const label=freeLabels&&slot.position!=='세터'?`선수 ${team.slots.filter(s=>s.position!=='세터').findIndex(s=>s.id===slot.id)+1}`:roleTitle(slot)
   return <Button variant="ghost" className={`ab-court-slot ${slot.position==='세터'?'setter':''} ${player?'filled':''}`} key={slot.id} aria-label={`${team.title} ${label} ${player?'변경':'추가'}`} onClick={e=>onOpen({teamId:team.id,slotId:slot.id},e.currentTarget)}>
    <span className="ab-role-label">{label}</span>{player?<><strong>{player.name}</strong><small>{player.club}</small></>:<><Plus/><span className="ab-slot-empty">배정</span></>}
   </Button>
  })}</div>
 </section>)}</div>
}

function Candidates({state,dispatch,inline,onApplied,onClose}:{state:ReviewState;dispatch:(action:ReviewAction)=>void;inline:boolean;onApplied:()=>void;onClose:()=>void}){
 const [query,setQuery]=useState(''),[range,setRange]=useState('primary')
 const slot=currentSlot(state),dirty=isPending(state)
 const pending=reviewCandidates.find(p=>p.id===state.pendingId)
 const previous=reviewCandidates.find(p=>p.id===slot?.playerId)
 const from=state.pendingId?locatePlayer(state.board,state.pendingId):undefined
 const moving=from&&(from.team.id!==state.target?.teamId||from.slot.id!==state.target?.slotId)
 const shown=reviewCandidates.filter(p=>p.id!==state.pendingId&&slot&&fitsPosition(p,slot.position,range)&&`${p.name} ${p.club} ${p.position} ${p.secondary}`.includes(query.trim()))
 return <div className={`ab-picker-body ${inline?'inline':''}`}>
  <div className="ab-picker-controls">
   {pending&&<div className="ab-current"><div><span>{dirty?'적용 전':'현재 배정'}</span><strong>{pending.name}</strong><small>{pending.club} · 주 {pending.position}</small></div><Button variant="outline" size="icon" aria-label={`${pending.name} 배정 해제`} onClick={()=>dispatch({type:'pick',playerId:null})}><X/></Button></div>}
   <div className="ab-search"><Search/><Input aria-label="선수 검색" placeholder="이름 또는 소속 검색" value={query} onChange={e=>setQuery(e.target.value)}/></div>
   <div className="ab-range" role="group" aria-label="후보 포지션 범위">{[['primary','주 포지션'],['secondary','부 포함'],['all','전체']].map(([value,label])=><Button key={value} variant={range===value?'secondary':'ghost'} aria-pressed={range===value} onClick={()=>setRange(value)}>{label}</Button>)}</div>
  </div>
  <div className="ab-candidate-list">{candidateGroups(shown,state.board,slot?.position).map(group=><section key={group.label}><h3>{group.label}</h3>{group.people.map(p=>{
   const location=locatePlayer(state.board,p.id)
   return <div className={`ab-candidate ${location?'used':'available'}`} key={p.id}>
    <div><strong>{p.name}</strong><span>{p.club}</span><small>주 {p.position} <span>·</span> 부 {p.secondary}</small>{location&&<small className="ab-used-label">배정됨 · {location.team.title} {roleTitle(location.slot)}</small>}</div>
    <Button variant={location?'outline':'default'} aria-label={`${p.name} 배정`} onClick={()=>dispatch({type:'pick',playerId:p.id})}>배정</Button>
   </div>
  })}</section>)}{!shown.length&&<div className="ab-no-result"><strong>조건에 맞는 선수가 없어요.</strong><p>검색어를 지우거나 전체 후보를 확인하세요.</p></div>}</div>
  <footer className="ab-apply-bar"><div className="ab-impact" role="status">{dirty?<><strong>{pending?`${pending.name} → ${state.target?.teamId}팀 ${slot?roleTitle(slot):''}`:`${previous?.name} 배정 해제`}</strong>{moving&&<span>{from.team.title} {roleTitle(from.slot)} 자리가 비워집니다.</span>}{previous&&previous.id!==pending?.id&&<span>{previous.name} 님은 미배정으로 돌아갑니다.</span>}</>:<span>{inline?'다른 팀 자리를 눌러 이어서 배정하세요.':'선수 타일의 배정 버튼을 눌러주세요.'}</span>}</div>
   <div className="ab-apply-actions"><Button variant="outline" disabled={inline&&!dirty} onClick={()=>inline?dispatch({type:'discard',close:false}):onClose()}>{inline?'되돌리기':'닫기'}</Button><Button disabled={!dirty} onClick={onApplied}><Check/>적용</Button></div>
  </footer>
 </div>
}

export function App(){
 const [variant,setVariant]=useState<Variant>(new URLSearchParams(location.search).get('variant')==='b'?'b':'a')
 const [a,dispatchA]=useReducer(reviewReducer,undefined,initialReview),[b,dispatchB]=useReducer(reviewReducer,undefined,()=>reviewReducer(initialReview(),{type:'open',target:{teamId:'A',slotId:'2'}}))
 const state=variant==='a'?a:b,dispatch=variant==='a'?dispatchA:dispatchB
 const [role,setRole]=useState<CourtPosition>('세터'),[overview,setOverview]=useState(false),[view,setView]=useState<'court'|'rows'>('court')
 const [mode,setMode]=useState<AllocationMode>('position'),[freePhase,setFreePhase]=useState(false)
 const [help,setHelp]=useState(false),[reset,setReset]=useState(false),[autoConfirm,setAutoConfirm]=useState(false),[notice,setNotice]=useState('')
 const opener=useRef<HTMLButtonElement|null>(null),pickerHeading=useRef<HTMLHeadingElement|null>(null)
 const dirty=isPending(state),slot=currentSlot(state)
 const total=state.board.flatMap(t=>t.slots).filter(s=>s.playerId).length
 const setters=state.board.flatMap(t=>t.slots).filter(s=>s.position==='세터'&&s.playerId).length
 const centers=state.board.flatMap(t=>t.slots).filter(s=>s.position==='센터'&&s.playerId).length
 const complete=setters===3&&centers>=2&&state.reviewed
 function changeVariant(next:Variant){if(dirty)return;setVariant(next);setOverview(false);setNotice('');const url=new URL(location.href);url.searchParams.set('variant',next);history.replaceState(null,'',url);}
 function open(target:Target,button:HTMLButtonElement){if(dirty)return;opener.current=button;dispatch({type:'open',target});setNotice('');if(variant==='b'){const s=state.board.find(t=>t.id===target.teamId)?.slots.find(s=>s.id===target.slotId);if(s){if(mode==='free'){setFreePhase(s.position!=='세터');setRole('세터')}else setRole(s.position)}setOverview(false)}}
 function changeRole(next:CourtPosition){setRole(next);if(mode==='free')setFreePhase(false);dispatchB({type:'select-role',role:next});setNotice('')}
 function changeMode(next:AllocationMode){if(mode===next)return;const nextRole=next==='free'?'세터':role;setMode(next);setRole(nextRole);setFreePhase(false);dispatchB({type:'select-role',role:nextRole});setOverview(false);setNotice('')}
 function beginFree(){setFreePhase(true);dispatchB({type:'select-free'});setNotice('')}
 function autoFill(){dispatchB({type:'auto-fill'});setAutoConfirm(false);setOverview(true);setView('rows');setNotice('주·부 포지션을 기준으로 빈자리를 채웠어요. 팀 구성을 확인해 주세요.')}
 function apply(){if(!dirty)return;dispatch({type:'apply',close:variant==='a'});setNotice(`${state.target?.teamId}팀 ${slot?roleTitle(slot):''} 변경을 적용했어요.`)}
 function review(){if(dirty)return;dispatch({type:'review'});setOverview(true);setView('rows');setNotice('전체 팀을 확인하고 빈 자리를 눌러 이어서 배정할 수 있어요.')}
 return <>
  <header className="ab-top"><a href="./" aria-label="SIDEOUT A/B 체험 홈"><Volleyball/><strong>SIDEOUT</strong></a><span>모바일 팀편성 체험</span><Button variant="ghost" size="icon" aria-label="체험 안내" onClick={()=>setHelp(true)}><Info/></Button></header>
  <main className="ab-main">
   <div className="ab-intro"><div><h1>뉴배동 팀편성</h1><p>가상 신청자 18명 · 3팀</p></div><Button variant="ghost" aria-label="현재 안 처음부터" disabled={dirty} onClick={()=>setReset(true)}><RotateCcw/><span>처음부터</span></Button></div>
   <nav className="ab-switch" aria-label="비교안 선택">{(['a','b'] as const).map(v=><Button key={v} variant="ghost" aria-pressed={variant===v} disabled={dirty&&variant!==v} onClick={()=>changeVariant(v)}><b>{v.toUpperCase()}</b><span>{v==='a'?'자리별 선택':'연속 배정'}</span></Button>)}</nav>
   {variant==='a'&&<div className="ab-exercise" aria-label="체험 진행"><span className={setters===3?'done':''}>{setters===3?<Check/>:<span className="ab-step">1</span>}세터 {setters}/3</span><ChevronRight/><span className={centers>=2?'done':''}>{centers>=2?<Check/>:<span className="ab-step">2</span>}센터 {Math.min(centers,2)}/2</span><ChevronRight/><Button variant="ghost" disabled={dirty} onClick={review} className={state.reviewed?'done':''}>{state.reviewed?<Check/>:<span className="ab-step">3</span>}전체 확인</Button></div>}
   {variant==='a'&&complete&&<div className="ab-complete" role="status"><Check/><span>체험 과제를 마쳤어요. 다른 안에서도 같은 순서로 비교해 보세요.</span></div>}
   <div className="ab-summary"><span>배정 <strong>{total}</strong> / 18명</span><span>미배정 {18-total}명</span><span className="ab-summary-notice" role="status">{notice}</span></div>
   {variant==='b'&&<section className="ab-mode-panel" aria-label="배정 방식 선택"><div className="ab-mode-options" role="group" aria-label="배정 방식"><Button variant={mode==='position'?'secondary':'ghost'} aria-pressed={mode==='position'} onClick={()=>changeMode('position')}>포지션별 배정</Button><Button variant={mode==='free'?'secondary':'ghost'} aria-pressed={mode==='free'} onClick={()=>changeMode('free')}>자율 배치</Button></div><Button variant="outline" className="ab-auto-trigger" onClick={()=>setAutoConfirm(true)}><Sparkles/>자동 배치</Button></section>}
   {(variant==='a'||overview)?<>
    <div className="ab-board-toolbar">{!overview&&<p>팀의 빈 자리를 눌러 배정하세요.</p>}<div role="group" aria-label="전체 팀 보기 방식"><Button variant={view==='court'?'secondary':'ghost'} aria-pressed={view==='court'} aria-label="코트로 보기" onClick={()=>setView('court')}><LayoutGrid/><span>코트</span></Button><Button variant={view==='rows'?'secondary':'ghost'} aria-pressed={view==='rows'} aria-label="행으로 보기" onClick={()=>setView('rows')}><Rows3/><span>행</span></Button></div></div>
    <TeamBoard board={state.board} view={view} onOpen={open} freeLabels={variant==='b'&&mode==='free'}/>
    <p className="ab-court-note">{variant==='b'&&mode==='free'?'자율 배치는 세터와 선수 순서만 정합니다. 나머지 포지션은 지정하지 않았어요.':'코트는 포지션 구성도입니다. 실제 로테이션은 현장에서 정합니다.'}</p>
    {variant==='a'&&!overview&&<div className="ab-review-bar"><span>{setters}/3 세터 · {Math.min(centers,2)}/2 센터</span><Button onClick={review}><LayoutGrid/>전체 팀 확인</Button></div>}
   </>:<ContinuousAllocation state={state} role={role} mode={mode} freePhase={freePhase} dispatch={dispatchB} onRole={changeRole} onFreePhase={beginFree} onOpen={open}/>}
   <p className="ab-sample-note">비교용 샘플 · A/B 작업은 각각 유지되며 새로고침하면 초기화됩니다.</p>
  </main>
  {variant==='b'&&<nav className="ab-bottom-nav" aria-label="팀 배정 내비게이션">{overview?<Button onClick={()=>setOverview(false)}><ArrowLeft/>배정으로</Button>:<><div>{(mode==='free'?freePhase:allocationRoles.indexOf(role)>0)&&<Button variant="outline" onClick={()=>mode==='free'?changeRole('세터'):changeRole(allocationRoles[allocationRoles.indexOf(role)-1])}><ChevronLeft/>이전: {mode==='free'?'세터':allocationRoles[allocationRoles.indexOf(role)-1]}</Button>}</div><Button variant="secondary" onClick={review}><LayoutGrid/>전체 팀</Button><div>{(mode==='free'?!freePhase:allocationRoles.indexOf(role)<allocationRoles.length-1)&&<Button onClick={()=>mode==='free'?beginFree():changeRole(allocationRoles[allocationRoles.indexOf(role)+1])}>다음: {mode==='free'?'자율 배치':allocationRoles[allocationRoles.indexOf(role)+1]}<ChevronRight/></Button>}</div></>}</nav>}
  <Dialog open={variant==='a'&&!!state.target} onOpenChange={value=>{if(!value)dispatch({type:'discard',close:true})}}><DialogContent className="ab-picker-dialog" showCloseButton={false} aria-describedby="ab-dialog-description" onPointerDownOutside={e=>{if(dirty)e.preventDefault()}} onInteractOutside={e=>{if(dirty)e.preventDefault()}} onOpenAutoFocus={e=>{e.preventDefault();pickerHeading.current?.focus()}} onCloseAutoFocus={e=>{if(opener.current?.isConnected){e.preventDefault();opener.current.focus({preventScroll:true})}}}>
   <DialogHeader className="ab-dialog-heading"><div><DialogTitle ref={pickerHeading} tabIndex={-1}>{state.target?.teamId}팀 · {slot?roleTitle(slot):''}에 배정</DialogTitle><DialogDescription id="ab-dialog-description">선수를 배정한 뒤 적용하세요.</DialogDescription></div><Button variant="ghost" size="icon" aria-label="선수 선택 닫기" onClick={()=>dispatch({type:'discard',close:true})}><X/></Button></DialogHeader>
   {state.target&&<Candidates key={`${state.target.teamId}-${state.target.slotId}`} state={state} dispatch={dispatch} inline={false} onApplied={apply} onClose={()=>dispatch({type:'discard',close:true})}/>}
  </DialogContent></Dialog>
  <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogHeader><DialogTitle>A/B는 이렇게 비교해 보세요</DialogTitle><DialogDescription>가상 선수로 배정 방식을 비교하는 체험본입니다.</DialogDescription></DialogHeader><ol className="ab-help"><li>B에서 포지션별 배정 또는 자율 배치를 고르세요.</li><li>자율 배치는 세터부터 고른 뒤 나머지 자리를 팀 순서대로 채웁니다.</li><li>하단 버튼으로 이전·다음 단계와 전체 팀을 확인하세요.</li></ol><p>B는 배정 즉시 다음 빈자리로 이동합니다. 자동 배치는 주·부 포지션으로 빈자리만 채우는 샘플 기능입니다.</p><p className="ab-help-note">저장·공개·실제 회원 연결과 실력 기반 균형은 다음 단계입니다.</p><Button onClick={()=>setHelp(false)}>체험하기</Button></DialogContent></Dialog>
  <Dialog open={autoConfirm} onOpenChange={setAutoConfirm}><DialogContent><DialogHeader><DialogTitle>빈자리를 자동으로 채울까요?</DialogTitle><DialogDescription>현재 배정은 유지하고, 가상 신청자의 주·부 포지션을 기준으로 빈자리만 채웁니다. 실력 평가는 반영하지 않습니다.</DialogDescription></DialogHeader><div className="ab-confirm-actions"><Button variant="outline" onClick={()=>setAutoConfirm(false)}>취소</Button><Button onClick={autoFill}><Sparkles/>자동 배치</Button></div></DialogContent></Dialog>
  <Dialog open={reset} onOpenChange={setReset}><DialogContent><DialogHeader><DialogTitle>{variant.toUpperCase()}안을 처음부터 체험할까요?</DialogTitle><DialogDescription>현재 안의 배정만 비웁니다. 다른 안의 작업은 유지됩니다.</DialogDescription></DialogHeader><div className="ab-confirm-actions"><Button variant="outline" onClick={()=>setReset(false)}>유지하기</Button><Button onClick={()=>{dispatch({type:'reset'});if(variant==='b'){dispatch({type:'open',target:{teamId:'A',slotId:'2'}});setFreePhase(false)}setRole('세터');setOverview(false);setNotice('');setReset(false)}}>처음부터</Button></div></DialogContent></Dialog>
 </>
}
const root=document.getElementById('root')
if(root)createRoot(root).render(<App/>);
