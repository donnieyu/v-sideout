'use client';
import {Fragment,useEffect,useRef,useState,type CSSProperties} from 'react'
import {ChevronDown,Plus,Search,X} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {allocationCandidateGroups,candidateGroups,locatePlayer,canRemoveExtra,type AllocationScope,type Candidate,type CourtPosition,type Slot} from './position-board-model'
import {MemberFilterControls,filterUnregisteredMembers,emptyMemberFilters,type MemberFilters} from './member-filters'
import {currentSlot,type ReviewState,type ReviewAction,type Target} from './allocation-ab-model'

export const allocationRoles:CourtPosition[]=['세터','레프트','센터','라이트']
const positionAbbreviation:Record<Candidate['position'],string>={레프트:'OH',라이트:'OP',센터:'MB',세터:'S',미등록:''}
const title=(s:Slot)=>s.position==='교대'?'추가 자리':s.position+(s.position==='라이트'?` ${s.id==='6'?'2':'1'}`:['레프트','센터'].includes(s.position)?` ${Number(s.id)<3?'1':'2'}`:'')
type Props={state:ReviewState;role:CourtPosition;dispatch:(a:ReviewAction)=>void;onRole:(role:CourtPosition)=>void;onOpen:(target:Target,button:HTMLButtonElement)=>void;onReview:()=>void}
export type AllocationMode='position'|'free'
type ContinuousProps=Omit<Props,'onReview'>&{readOnly?:boolean;mode:AllocationMode;freePhase:boolean;onFreePhase:()=>void;hidden?:boolean;people:Candidate[];onAddExtra?:(teamId:string)=>void;onRemoveExtra?:(teamId:string,slotId:string)=>void}
const freeTitle=(team:ReviewState['board'][number],slot:Slot)=>slot.position==='세터'?'세터':`선수 ${team.slots.filter(s=>s.position!=='세터').findIndex(s=>s.id===slot.id)+1}`

export function ContinuousAllocation({readOnly=false,state,role,mode,freePhase,dispatch,onRole,onFreePhase,onOpen,onAddExtra,onRemoveExtra,hidden=false,people}:ContinuousProps){
 const name=(id:string|null)=>people.find(p=>p.id===id)?.name
 const [query,setQuery]=useState(''),[scope,setScope]=useState<AllocationScope>('신청자'),[notice,setNotice]=useState('')
 const [memberFilters,setMemberFilters]=useState<MemberFilters>(emptyMemberFilters)
 const memberScope=scope==='미신청 회원'
 const memberClubs=[...new Set(people.filter(p=>p.active!==false&&p.status==='미신청 회원').map(p=>p.club))].sort((a,b)=>a.localeCompare(b,'ko'))
 const [pendingUnregistered,setPendingUnregistered]=useState<{playerId:string;target:Target}|null>(null)
 const workspace=useRef<HTMLElement|null>(null),focusNext=useRef(false)
 const slot=currentSlot(state),filled=!!slot?.playerId
 const extraTeam=role==='교대'?state.board.find(team=>team.id===state.target?.teamId):undefined
 const candidatePosition=role==='교대'&&slot?.id==='6'?'라이트':role
 const candidateList=useRef<HTMLDivElement|null>(null)
 useEffect(()=>{if(candidateList.current)candidateList.current.scrollTop=0},[candidatePosition,scope,query,memberFilters])
 const setterVacant=state.board.some(team=>team.slots.some(s=>s.position==='세터'&&!s.playerId))
 const assigned=people.filter(p=>locatePlayer(state.board,p.id))
 const candidates=memberScope?filterUnregisteredMembers(people,query,memberFilters):people
 const groups=mode==='free'&&freePhase?candidateGroups(people.filter(p=>(!setterVacant||p.position!=='세터')&&`${p.name} ${p.club} ${p.position} ${p.secondary}`.includes(query.trim())),state.board):allocationCandidateGroups(candidates,state.board,candidatePosition,scope,memberScope?'':query)
 const positionSlots=role==='교대'?[]:[...new Map(state.board.flatMap(t=>t.slots.filter(s=>s.position===role&&(!readOnly||s.playerId))).map(s=>[s.id,s])).values()].sort((a,b)=>Number(a.id)-Number(b.id))
 const applicantCount=people.filter(p=>p.status==='신청자').length
 const count=(status:AllocationScope)=>people.filter(p=>p.active!==false&&p.status===status&&!locatePlayer(state.board,p.id)).length
 const scopeTotal=people.filter(p=>p.active!==false&&p.status===scope).length
 const emptyTitle=query.trim()?'검색 결과가 없어요.':scope==='신청자'?(scopeTotal?'신청자를 모두 배정했어요.':'신청자가 없어요.'):scope==='대기자'?(scopeTotal?'대기자를 모두 배정했어요.':'대기자가 없어요.'):'조건에 맞는 선수가 없어요.'
 const emptyDescription=query.trim()?'검색어를 바꾸거나 지워 주세요.':scope==='신청자'?(scopeTotal?'미리보기에서 편성을 확인하세요. 추가 인원은 대기자·미신청 회원 탭에서 선택할 수 있어요.':'신청자가 등록되면 여기에 표시됩니다. 다른 탭에서 추가 인원을 선택할 수도 있어요.'):scope==='대기자'?'다른 탭에서 배정할 선수를 선택할 수 있어요.':'검색어와 필터를 확인해 주세요.'
 const label=(teamId:string,s:Slot)=>mode==='free'&&freePhase?freeTitle(state.board.find(t=>t.id===teamId)!,s):s.position==='교대'?`추가 자리 ${state.board.find(t=>t.id===teamId)!.slots.filter(slot=>slot.position==='교대').findIndex(slot=>slot.id===s.id)+1}`:title(s)
 useEffect(()=>{setQuery('');setScope('신청자');setNotice('')},[role,mode,freePhase])
 useEffect(()=>{
  if(hidden)return
  const matrix=workspace.current?.querySelector<HTMLElement>('.ab-position-matrix')
  const active=matrix?.querySelector<HTMLElement>('.ab-cont-slot.active')
  if(!matrix||!active)return
  const parent=matrix.getBoundingClientRect(),tile=active.getBoundingClientRect()
  if(tile.right>parent.right)matrix.scrollLeft+=tile.right-parent.right
  else if(tile.left<parent.left)matrix.scrollLeft-=parent.left-tile.left
 },[state.target?.teamId,state.target?.slotId,hidden,role])
 useEffect(()=>{if(!focusNext.current)return;focusNext.current=false;workspace.current?.querySelector<HTMLButtonElement>('.ab-cont-slot.active > button:first-child')?.focus({preventScroll:true})},[state])
 function assign(playerId:string){
  if(readOnly||!state.target||!slot||locatePlayer(state.board,playerId))return
  setNotice(`${name(playerId)} 님을 ${state.target.teamId}팀 ${label(state.target.teamId,slot)}에 ${filled?'교체':'배정'}했어요.`)
  focusNext.current=true
  dispatch({type:'continuous-assign',playerId,flow:mode==='free'&&freePhase?'free':role==='교대'?'extra':'position'});setQuery('')
 }
 function requestAssign(person:Candidate){
  if(person.status==='미신청 회원'){
   if(state.target)setPendingUnregistered({playerId:person.id,target:state.target})
   return
  }
  assign(person.id)
 }
 function confirmUnregisteredAssignment(){
  const pending=pendingUnregistered
  if(pending&&pending.target.teamId===state.target?.teamId&&pending.target.slotId===state.target?.slotId)assign(pending.playerId)
  setPendingUnregistered(null)
 }
 const pendingPerson=people.find(person=>person.id===pendingUnregistered?.playerId)
 const pendingTeam=state.board.find(team=>team.id===pendingUnregistered?.target.teamId)
 const pendingSlot=pendingTeam?.slots.find(candidate=>candidate.id===pendingUnregistered?.target.slotId)
 const pendingDestination=pendingTeam&&pendingSlot?`${pendingTeam.title} ${label(pendingTeam.id,pendingSlot)}`:'선택한 자리'
 const pendingMessage=pendingPerson?`${pendingPerson.name}님은 이번 운동에 신청하지 않았습니다. 참석 의사를 직접 확인한 경우에만 ${pendingDestination}에 배정하세요. 팀편성을 저장하면 참석자로 등록되어 함께할 인원과 명단에 포함됩니다.`:''
 function slotButton(team:ReviewState['board'][number],s:Slot){
  if(readOnly&&!s.playerId)return <span key={s.id} aria-hidden="true"/>
  const active=state.target?.teamId===team.id&&state.target.slotId===s.id
  const splitAction=!!s.playerId&&mode==='position'
  const player=people.find(p=>p.id===s.playerId)
  function release(){
   if(readOnly||!s.playerId)return
   focusNext.current=true
   dispatch({type:'release',target:{teamId:team.id,slotId:s.id},playerId:s.playerId})
   setNotice(`${name(s.playerId)} 님의 ${team.title} ${label(team.id,s)} 배정을 취소했어요.`)
  }
  return <div key={s.id} className={`ab-cont-slot ${active?'active':''} ${s.playerId?'filled':''}`}>
   <Button variant="ghost" className={splitAction?'ab-cont-name':undefined} aria-pressed={active} aria-description={splitAction&&player?`주포지션 ${player.position}`:undefined} aria-label={s.playerId?`${team.title} ${label(team.id,s)} ${name(s.playerId)} ${splitAction?'선택':'배정 취소'}`:`${team.title} ${label(team.id,s)} 선택`} onClick={e=>readOnly||splitAction||!s.playerId?onOpen({teamId:team.id,slotId:s.id},e.currentTarget):release()}><small>{label(team.id,s)}</small><strong>{name(s.playerId)||(readOnly?'미배정':<Plus/>)}</strong>{splitAction&&player&&<abbr className="ab-cont-primary" title={`주포지션 ${player.position}`}>{player.active===false?'비활성':positionAbbreviation[player.position]}</abbr>}{!readOnly&&s.playerId&&!splitAction?<X className="ab-inline-remove-icon" aria-hidden="true"/>:!s.playerId?<span>{!readOnly&&active?'배정할 자리':'\u00a0'}</span>:null}</Button>
   {!readOnly&&splitAction&&<Button variant="ghost" size="icon" className="ab-cont-release" aria-label={`${team.title} ${label(team.id,s)} ${name(s.playerId)} 배정 해제`} onClick={release}><X aria-hidden="true"/></Button>}
  </div>
 }
 return <section ref={workspace} data-readonly={readOnly} className="ab-workspace continuous" aria-label="연속 배정 작업" hidden={hidden}>
  {role!=='교대'&&<div className={`ab-cont-roles ${mode==='free'?'free':''}`} role="group" aria-label={mode==='free'?'배정 단계':'배정 포지션'}>{mode==='free'?<><Button variant={!freePhase?'default':'ghost'} aria-pressed={!freePhase} onClick={()=>onRole('세터')}>세터</Button><Button variant={freePhase?'default':'ghost'} aria-pressed={freePhase} onClick={onFreePhase}>자율 배치</Button></>:allocationRoles.map(r=><Button key={r} variant={role===r?'default':'ghost'} aria-pressed={role===r} onClick={()=>onRole(r)}>{r}</Button>)}</div>}
  <div className="ab-workspace-summary">
   {mode==='position'&&role==='교대'&&extraTeam?<div className="ab-extra-team" role="group" aria-label={`${extraTeam.title} 추가 인원 배정`}>
    <div className="ab-extra-team-heading"><strong>{extraTeam.title} · 추가 인원</strong><span>코트 밖 선수</span></div>
    <div className="ab-extra-slot-list">{extraTeam.slots.slice(6).filter(s=>!readOnly||s.playerId).map(s=><div className={`ab-extra-slot-row ${!readOnly&&canRemoveExtra(extraTeam,s,applicantCount,state.board.length)?'removable':''}`} key={s.id}>
     {slotButton(extraTeam,s)}
     {!readOnly&&canRemoveExtra(extraTeam,s,applicantCount,state.board.length)&&onRemoveExtra&&<Button variant="ghost" size="icon" className="ab-extra-delete" aria-label={`${extraTeam.title} ${label(extraTeam.id,s)} 삭제`} onClick={()=>{focusNext.current=true;onRemoveExtra(extraTeam.id,s.id)}}><X aria-hidden="true"/></Button>}
    </div>)}</div>
    {onAddExtra&&<Button variant="ghost" className="ab-extra-add" onClick={()=>{focusNext.current=true;onAddExtra(extraTeam.id)}}><Plus/>{extraTeam.title} 추가 자리 추가</Button>}
   </div>:mode==='position'?<div className="ab-position-matrix" data-team-count={state.board.length} style={{"--team-count":state.board.length} as CSSProperties} role="group" aria-label="현재 포지션 팀별 배치">
    <div className="ab-matrix-head"><span>포지션</span>{state.board.map(team=><div className="ab-matrix-team" key={team.id}><strong>{team.title}</strong><small>{role==='세터'?`${team.slots.filter(s=>s.playerId).length}명 배정`:`세터 ${name(team.slots.find(s=>s.position==='세터')?.playerId||null)||'미배정'}`}</small></div>)}</div>
    {positionSlots.map(positionSlot=><div className="ab-matrix-row" key={positionSlot.id}><span className="ab-matrix-position">{title(positionSlot)}</span>{state.board.map(team=><Fragment key={team.id}>{team.slots.find(s=>s.id===positionSlot.id)?slotButton(team,team.slots.find(s=>s.id===positionSlot.id)!):<span className="ab-matrix-unavailable">{!readOnly&&'자리 없음'}</span>}</Fragment>)}</div>)}
   </div>:<div className="ab-team-map free">{state.board.map(team=><div key={team.id}><h2>{team.title}<small>{team.slots.filter(s=>s.playerId).length}명</small></h2>{team.slots.filter(s=>freePhase?s.position!=='세터':s.position===role).map(s=>slotButton(team,s))}</div>)}</div>}
   {notice&&<p className="sr-only" role="status">{notice}</p>}
  </div>
  {!readOnly&&<div className="ab-picker-body inline" role="region" aria-label="선수 풀">
    <div className="ab-picker-controls"><div className="ab-search-row"><div className="ab-search"><Search/><Input aria-label="선수 검색" placeholder="이름 또는 소속 검색" value={query} onChange={e=>setQuery(e.target.value)}/></div>{memberScope&&<MemberFilterControls clubs={memberClubs} value={memberFilters} onChange={setMemberFilters}/>}</div>{!(mode==='free'&&freePhase)&&<div className="ab-range" role="group" aria-label="후보 참가 상태">{(['신청자','대기자','미신청 회원'] as AllocationScope[]).map(value=><Button key={value} variant={scope===value?'secondary':'ghost'} aria-pressed={scope===value} onClick={()=>setScope(value)}>{value}{value!=='미신청 회원'&&<span className="ab-scope-count">{count(value)}</span>}</Button>)}</div>}{!memberScope&&query.trim()&&<p className="ab-search-context">모든 참가 상태의 검색 결과</p>}</div>
    <div className="ab-candidate-list" ref={candidateList}>{groups.map(group=><section key={group.label}><h3 className="ab-candidate-group-title"><span>{group.label}</span>{' '}<span className="ab-candidate-group-count">{group.people.length}명</span></h3>{group.people.map(p=>{
     const used=locatePlayer(state.board,p.id)
     return <div className={`ab-candidate ${used?'used':p.status==='미신청 회원'?'unregistered':'available'}`} key={p.id}><div><strong>{p.name}</strong><span>{p.club}</span><small>{p.position==='미등록'?'포지션 미등록':<><span className={p.position===candidatePosition?'ab-position-match':undefined}>주 {p.position}</span> · <span className={p.secondary===candidatePosition?'ab-position-match':undefined}>부 {p.secondary}</span></>}</small></div><Button variant="default" disabled={!state.target||(slot?.position==='교대'&&p.position==='미등록')} aria-label={`${p.name} ${filled?'교체':'배정'}`} onClick={()=>requestAssign(p)}>{filled?'교체':'배정'}</Button></div>
    })}</section>)}{!groups.length&&<div className="ab-no-result"><strong>{emptyTitle}</strong><p>{emptyDescription}</p></div>}{assigned.length>0&&<details className="ab-assigned-pool"><summary>배정된 선수 {assigned.length}명<ChevronDown aria-hidden="true"/></summary><div>{assigned.map(p=>{const used=locatePlayer(state.board,p.id)!;return <p key={p.id}><strong>{p.name}</strong><span>{used.team.title} · {label(used.team.id,used.slot)}</span></p>})}</div></details>}</div>
  </div>}
  <Dialog open={!!pendingUnregistered} onOpenChange={open=>!open&&setPendingUnregistered(null)}><DialogContent><DialogHeader><DialogTitle>신청하지 않은 회원을 배정할까요?</DialogTitle><DialogDescription>{pendingMessage}</DialogDescription></DialogHeader><div className="ab-confirm-actions"><Button variant="outline" onClick={()=>setPendingUnregistered(null)}>취소</Button><Button onClick={confirmUnregisteredAssignment}>확인 후 배정</Button></div></DialogContent></Dialog>
 </section>
}
