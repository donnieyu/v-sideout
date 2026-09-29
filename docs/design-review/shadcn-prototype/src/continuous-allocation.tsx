import {Fragment,useEffect,useRef,useState,type CSSProperties} from 'react'
import {ChevronDown,Plus,Search,X} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {allocationCandidateGroups,candidateGroups,locatePlayer,type AllocationScope,type Candidate,type CourtPosition,type Slot} from './position-board-model'
import {reviewCandidates,currentSlot,type ReviewState,type ReviewAction,type Target} from './allocation-ab-model'

export const allocationRoles:CourtPosition[]=['세터','레프트','센터','라이트']
const title=(s:Slot)=>s.position==='교대'?'추가 자리':s.position+(s.position==='라이트'?` ${s.id==='6'?'2':'1'}`:['레프트','센터'].includes(s.position)?` ${Number(s.id)<3?'1':'2'}`:'')
type Props={state:ReviewState;role:CourtPosition;dispatch:(a:ReviewAction)=>void;onRole:(role:CourtPosition)=>void;onOpen:(target:Target,button:HTMLButtonElement)=>void;onReview:()=>void}
export type AllocationMode='position'|'free'
type ContinuousProps=Omit<Props,'onReview'>&{mode:AllocationMode;freePhase:boolean;onFreePhase:()=>void;hidden?:boolean;people?:Candidate[]}
const freeTitle=(team:ReviewState['board'][number],slot:Slot)=>slot.position==='세터'?'세터':`선수 ${team.slots.filter(s=>s.position!=='세터').findIndex(s=>s.id===slot.id)+1}`

export function ContinuousAllocation({state,role,mode,freePhase,dispatch,onRole,onFreePhase,onOpen,hidden=false,people=reviewCandidates}:ContinuousProps){
 const name=(id:string|null)=>people.find(p=>p.id===id)?.name
 const [query,setQuery]=useState(''),[scope,setScope]=useState<AllocationScope>('신청자'),[notice,setNotice]=useState('')
 const workspace=useRef<HTMLElement|null>(null),focusNext=useRef(false)
 const slot=currentSlot(state),filled=!!slot?.playerId
 const setterVacant=state.board.some(team=>team.slots.some(s=>s.position==='세터'&&!s.playerId))
 const complete=state.board.every(t=>t.slots.filter(s=>mode==='free'&&freePhase?s.position!=='세터':s.position===role).every(s=>s.playerId))
 const assigned=people.filter(p=>locatePlayer(state.board,p.id))
 const groups=mode==='free'&&freePhase?candidateGroups(people.filter(p=>(!setterVacant||p.position!=='세터')&&`${p.name} ${p.club} ${p.position} ${p.secondary}`.includes(query.trim())),state.board):allocationCandidateGroups(people,state.board,role,scope,query)
 const positionSlots=role==='교대'?(state.target?[state.board.find(team=>team.id===state.target?.teamId)?.slots.find(s=>s.id===state.target?.slotId)].filter((s):s is Slot=>!!s):[]):state.board[0].slots.filter(s=>s.position===role)
 const count=(status:AllocationScope)=>people.filter(p=>p.status===status&&!locatePlayer(state.board,p.id)).length
 const label=(teamId:string,s:Slot)=>mode==='free'&&freePhase?freeTitle(state.board.find(t=>t.id===teamId)!,s):title(s)
 useEffect(()=>{setQuery('');setScope('신청자');setNotice('')},[role,mode,freePhase])
 useEffect(()=>{if(!focusNext.current)return;focusNext.current=false;workspace.current?.querySelector<HTMLButtonElement>('.ab-cont-slot.active > button:first-child')?.focus({preventScroll:true})},[state])
 function assign(playerId:string){
  if(!state.target||!slot||locatePlayer(state.board,playerId))return
  setNotice(`${name(playerId)} 님을 ${state.target.teamId}팀 ${label(state.target.teamId,slot)}에 ${filled?'교체':'배정'}했어요.`)
  focusNext.current=true
  dispatch({type:'continuous-assign',playerId,flow:mode==='free'&&freePhase?'free':'position'});setQuery('')
 }
 function slotButton(team:ReviewState['board'][number],s:Slot){
  const active=state.target?.teamId===team.id&&state.target.slotId===s.id
  const splitAction=!!s.playerId&&mode==='position'
  function release(){
   if(!s.playerId)return
   focusNext.current=true
   dispatch({type:'release',target:{teamId:team.id,slotId:s.id},playerId:s.playerId})
   setNotice(`${name(s.playerId)} 님의 ${team.title} ${label(team.id,s)} 배정을 취소했어요.`)
  }
  return <div key={s.id} className={`ab-cont-slot ${active?'active':''} ${s.playerId?'filled':''}`}>
   <Button variant="ghost" className={splitAction?'ab-cont-name':undefined} aria-pressed={active} aria-label={s.playerId?`${team.title} ${label(team.id,s)} ${name(s.playerId)} ${splitAction?'선택':'배정 취소'}`:`${team.title} ${label(team.id,s)} 선택`} onClick={e=>splitAction||!s.playerId?onOpen({teamId:team.id,slotId:s.id},e.currentTarget):release()}><small>{label(team.id,s)}</small><strong>{name(s.playerId)||<Plus/>}</strong>{s.playerId&&!splitAction?<X className="ab-inline-remove-icon" aria-hidden="true"/>:!s.playerId?<span>{active?'배정할 자리':'\u00a0'}</span>:null}</Button>
   {splitAction&&<Button variant="ghost" size="icon" className="ab-cont-release" aria-label={`${team.title} ${label(team.id,s)} ${name(s.playerId)} 배정 해제`} onClick={release}><X aria-hidden="true"/></Button>}
  </div>
 }
 return <section ref={workspace} className="ab-workspace continuous" aria-label="연속 배정 작업" hidden={hidden}>
  <div className={`ab-cont-roles ${mode==='free'?'free':''}`} role="group" aria-label={mode==='free'?'배정 단계':'배정 포지션'}>{mode==='free'?<><Button variant={!freePhase?'default':'ghost'} aria-pressed={!freePhase} onClick={()=>onRole('세터')}>세터</Button><Button variant={freePhase?'default':'ghost'} aria-pressed={freePhase} onClick={onFreePhase}>자율 배치</Button></>:role==='교대'?<strong className="ab-extra-context">추가 선수 자리 배정</strong>:allocationRoles.map(r=><Button key={r} variant={role===r?'default':'ghost'} aria-pressed={role===r} onClick={()=>onRole(r)}>{r}</Button>)}</div>
  <div className="ab-workspace-summary">
   {mode==='position'?<div className="ab-position-matrix" data-team-count={state.board.length} style={{"--team-count":state.board.length} as CSSProperties} role="group" aria-label="현재 포지션 팀별 배치">
    <div className="ab-matrix-head"><span>포지션</span>{state.board.map(team=><div className="ab-matrix-team" key={team.id}><strong>{team.title}</strong><small>{role==='세터'?`${team.slots.filter(s=>s.playerId).length}명 배정`:`세터 ${name(team.slots.find(s=>s.position==='세터')?.playerId||null)||'미배정'}`}</small></div>)}</div>
    {positionSlots.map(positionSlot=><div className="ab-matrix-row" key={positionSlot.id}><span className="ab-matrix-position">{title(positionSlot)}</span>{state.board.map(team=><Fragment key={team.id}>{team.slots.find(s=>s.id===positionSlot.id)?slotButton(team,team.slots.find(s=>s.id===positionSlot.id)!):<span className="ab-matrix-unavailable">자리 없음</span>}</Fragment>)}</div>)}
   </div>:<div className="ab-team-map free">{state.board.map(team=><div key={team.id}><h2>{team.title}<small>{team.slots.filter(s=>s.playerId).length}명</small></h2>{team.slots.filter(s=>freePhase?s.position!=='세터':s.position===role).map(s=>slotButton(team,s))}</div>)}</div>}
   {notice&&<p className="sr-only" role="status">{notice}</p>}
  </div>
  <div className="ab-picker-body inline" role="region" aria-label="선수 풀">
    <div className="ab-picker-controls"><div className="ab-search"><Search/><Input aria-label="선수 검색" placeholder="이름 또는 소속 검색" value={query} onChange={e=>setQuery(e.target.value)}/></div>{!(mode==='free'&&freePhase)&&<div className="ab-range" role="group" aria-label="후보 참가 상태">{(['신청자','대기자','미신청 회원'] as AllocationScope[]).map(value=><Button key={value} variant={scope===value?'secondary':'ghost'} aria-pressed={scope===value} disabled={count(value)===0&&!query.trim()} onClick={()=>setScope(value)}>{value}<span className="ab-scope-count">{count(value)}</span></Button>)}</div>}{query.trim()&&<p className="ab-search-context">모든 참가 상태의 검색 결과</p>}</div>
    <div className="ab-candidate-list">{groups.map(group=><section key={group.label}><h3>{group.label}</h3>{group.people.map(p=>{
     const used=locatePlayer(state.board,p.id)
     return <div className={`ab-candidate ${used?'used':p.status==='미신청 회원'?'unregistered':'available'}`} key={p.id}><div><strong>{p.name}</strong><span>{p.club}</span><small>주 {p.position} · 부 {p.secondary}</small></div><Button variant="default" disabled={!state.target} aria-label={`${p.name} ${filled?'교체':'배정'}`} onClick={()=>assign(p.id)}>{filled?'교체':'배정'}</Button></div>
    })}</section>)}{!groups.length&&<div className="ab-no-result"><strong>{complete?'현재 포지션 배정을 마쳤어요.':'조건에 맞는 선수가 없어요.'}</strong><p>{complete?'다음 포지션으로 이동하거나 배정된 자리를 눌러 교체할 수 있어요.':'검색하거나 다른 참가 상태를 선택해 주세요.'}</p></div>}{assigned.length>0&&<details className="ab-assigned-pool"><summary>배정된 선수 {assigned.length}명<ChevronDown aria-hidden="true"/></summary><div>{assigned.map(p=>{const used=locatePlayer(state.board,p.id)!;return <p key={p.id}><strong>{p.name}</strong><span>{used.team.title} · {label(used.team.id,used.slot)}</span></p>})}</div></details>}</div>
  </div>
 </section>
}
