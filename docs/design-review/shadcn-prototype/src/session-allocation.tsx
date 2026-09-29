import {useEffect,useRef,useState} from 'react'
import {ArrowLeft,ChevronLeft,ChevronRight,LayoutGrid,Plus,Save,Send,Sparkles} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {ContinuousAllocation,allocationRoles} from './continuous-allocation'
import {allocationReducer,nextVacant,type ReviewState,type ReviewAction,type Target} from './allocation-ab-model'
import {createTeam,addBenchSlot,type BoardTeam,type Candidate,type CourtPosition,type Slot} from './position-board-model'
import {boardToLineup,lineupToBoard} from './session-allocation-model'
import {validateLineup,type Lineup} from './team-model'
import {rosterErrorMessage,type RosterCommandResult} from './roster-state'
import './allocation-layout.css'
import './session-allocation.css'

type Props={title:string;baseline:Lineup;people:Candidate[];saved:boolean;onSave:(lineup:Lineup,publish:boolean)=>RosterCommandResult|void;onCancel:()=>void;onDirty:(dirty:boolean)=>void}
export function SessionAllocation({title,baseline,people,saved,onSave,onCancel,onDirty}:Props){
 const [state,setState]=useState<ReviewState>(()=>{const board=lineupToBoard(baseline);return {board,target:nextVacant(board,'세터'),pendingId:null,reviewed:false}})
 const [role,setRole]=useState<CourtPosition>('세터'),[overview,setOverview]=useState(false),[view,setView]=useState<'rows'|'court'>('court'),[confirm,setConfirm]=useState<'publish'|'auto'|'save-unregistered'|null>(null),[error,setError]=useState('')
 const heading=useRef<HTMLHeadingElement>(null)
 const lineup=boardToLineup(state.board,people),dirty=JSON.stringify(lineup)!==JSON.stringify(boardToLineup(lineupToBoard(baseline),people))
 useEffect(()=>{onDirty(dirty)},[dirty,onDirty])
 useEffect(()=>()=>onDirty(false),[onDirty])
 useEffect(()=>{window.scrollTo(0,0);heading.current?.focus({preventScroll:true})},[])
 function dispatch(action:ReviewAction){setState(prev=>allocationReducer(prev,action,people));setError('')}
 function changeRole(next:CourtPosition){setRole(next);dispatch({type:'select-role',role:next})}
 function open(target:Target){const slot=state.board.find(t=>t.id===target.teamId)?.slots.find(s=>s.id===target.slotId);if(!slot)return;dispatch({type:'open',target});setRole(slot.position);setOverview(false)}
 function commit(publish:boolean){const problem=publish?(unassignedApplicants?'모든 신청자를 팀에 배정한 뒤 공개해 주세요.':validateLineup(lineup)):'';if(problem){setError(problem);setConfirm(null);return}const result=onSave(lineup,publish);if(result&&!result.ok){setError(rosterErrorMessage(result.code));setConfirm(null);return}setError('');setConfirm(null)}
 function renderResultSlot(team:BoardTeam,slot:Slot,extra=false){
  const player=people.find(p=>p.id===slot.playerId)
  const label=slot.id==='6'?'라이트 2':slot.position==='교대'?player?.position??'추가 자리':slot.position
  return <Button key={slot.id} variant="outline" className={extra?'allocation-reserve-slot':undefined} aria-label={`${team.title} ${extra?'추가 선수 ':''}${label} ${player?.name??'배정'}${player?` ${player.club}`:''}`} onClick={()=>open({teamId:team.id,slotId:slot.id})}><span>{label}</span><strong>{player?.name??'배정'}</strong>{player&&<small className="allocation-slot-club">{player.club}</small>}</Button>
 }
 const placedIds=new Set(state.board.flatMap(t=>t.slots).flatMap(s=>s.playerId?[s.playerId]:[]))
 const unregistered=people.filter(person=>person.status==='미신청 회원'&&placedIds.has(person.id))
 const total=placedIds.size,unassignedApplicants=people.filter(p=>p.status==='신청자'&&!placedIds.has(p.id)).length
 const roleIndex=allocationRoles.indexOf(role)
 const previousRole=roleIndex<0?'라이트':allocationRoles[(roleIndex+allocationRoles.length-1)%allocationRoles.length]
 const nextRole=roleIndex<0?'세터':allocationRoles[(roleIndex+1)%allocationRoles.length]
 return <section className="session-allocation" aria-label="팀편성 편집" data-session={title}>
  <header className="allocation-session-header"><div><h2 id="allocation-title" ref={heading} tabIndex={-1}>팀편성 수정</h2><p id="allocation-summary">배정 {total}명 · 미배정 신청자 {unassignedApplicants}명</p></div><div><Button variant="outline" onClick={onCancel}>취소</Button><Button variant="secondary" onClick={()=>unregistered.length?setConfirm('save-unregistered'):commit(false)}><Save/>{saved?'저장':'초안 저장'}</Button><Button disabled={unassignedApplicants>0} aria-describedby="allocation-summary" onClick={()=>setConfirm('publish')}><Send/>공개</Button></div></header>
  {error&&<p role="alert" className="allocation-error">{error}</p>}
  {unregistered.length>0&&<p className="allocation-error" role="status">미신청 회원 {unregistered.length}명은 저장하면 참가자로 등록됩니다.</p>}
  <div className="allocation-session-body">{overview?
   <div className="allocation-overview">
    <div className="ab-board-toolbar">
     <div className="allocation-view-switch" role="group" aria-label="팀 보기 방식"><Button variant={view==='court'?'default':'ghost'} aria-pressed={view==='court'} onClick={()=>setView('court')}>코트</Button><Button variant={view==='rows'?'default':'ghost'} aria-pressed={view==='rows'} onClick={()=>setView('rows')}>행</Button></div>
     <Button variant="outline" onClick={()=>setConfirm('auto')}><Sparkles/>자동 배치</Button>
     <Button variant="outline" disabled={state.board.length>=4} onClick={()=>setState(prev=>({...prev,board:[...prev.board,createTeam(['A','B','C','D'].find(id=>!prev.board.some(t=>t.id===id))!)]}))}><Plus/>팀 추가</Button>
    </div>
    <div className={`allocation-team-columns ${view}`}>{state.board.map(team=><section key={team.id}>
     <h2>{team.title} <small>{team.slots.filter(s=>s.playerId).length}명</small></h2>
     <div className="allocation-court" role="group" aria-label={`${team.title} 코트`}>
      {view==='court'&&<div className="allocation-net">네트</div>}
      <div className="allocation-result-slots">{(view==='court'?team.slots.slice(0,6):[...team.slots.slice(0,6)].sort((a,b)=>Number(b.position==='세터')-Number(a.position==='세터'))).map(slot=>renderResultSlot(team,slot))}</div>
     </div>
     <div className="allocation-reserve" role="group" aria-label={`${team.title} 추가 선수`}>
      <div className="allocation-reserve-heading">추가 인원</div>
      <div className="allocation-reserve-slots">{team.slots.slice(6).map(slot=>renderResultSlot(team,slot,true))}</div>
     </div>
     <Button variant="ghost" onClick={()=>setState(prev=>({...prev,board:addBenchSlot(prev.board,team.id)}))}><Plus/>추가 선수 자리</Button>
     {team.slots.every(s=>!s.playerId)&&state.board.length>1&&<Button variant="ghost" onClick={()=>setState(prev=>({...prev,board:prev.board.filter(t=>t.id!==team.id),target:null,pendingId:null}))}>빈 팀 삭제</Button>}
    </section>)}</div>
   </div>
  :<ContinuousAllocation state={state} role={role} mode="position" freePhase={false} dispatch={dispatch} onRole={changeRole} onFreePhase={()=>{}} onOpen={open} people={people}/>}</div>
  <nav className="allocation-session-nav" aria-label="팀 배정 내비게이션">{overview?<Button onClick={()=>setOverview(false)}><ArrowLeft/>배정으로</Button>:<><Button variant="outline" onClick={()=>changeRole(previousRole)}><ChevronLeft/>이전: {previousRole}</Button><Button variant="secondary" onClick={()=>setOverview(true)}><LayoutGrid/>팀 구성</Button><Button variant="outline" onClick={()=>changeRole(nextRole)}>다음: {nextRole}<ChevronRight/></Button></>}</nav>
  <Dialog open={!!confirm} onOpenChange={value=>!value&&setConfirm(null)}><DialogContent><DialogHeader><DialogTitle>{confirm==='publish'?'팀편성을 공개할까요?':confirm==='save-unregistered'?'미신청 회원을 참가자로 추가할까요?':'빈자리를 자동 배치할까요?'}</DialogTitle><DialogDescription>{confirm==='publish'?`현재 편성을 참석자에게 공개합니다. 저장된 공개본이 있다면 교체합니다.${unregistered.length?` 미신청 회원 ${unregistered.length}명은 참가자로 등록됩니다.`:''}`:confirm==='save-unregistered'?`미신청 회원 ${unregistered.length}명을 참가자로 추가하고 초안을 저장합니다. 저장 전 편집을 취소하면 등록되지 않습니다.`:'현재 배정은 유지하고 신청자, 대기자 순서로 주·부 포지션을 참고해 빈자리를 채웁니다.'}</DialogDescription></DialogHeader><div className="ab-confirm-actions"><Button variant="outline" onClick={()=>setConfirm(null)}>돌아가기</Button><Button onClick={()=>{if(confirm==='publish')commit(true);else if(confirm==='save-unregistered')commit(false);else{dispatch({type:'auto-fill'});setConfirm(null)}}}>{confirm==='publish'?'공개':confirm==='save-unregistered'?'추가하고 저장':'자동 배치'}</Button></div></DialogContent></Dialog>
 </section>
}
