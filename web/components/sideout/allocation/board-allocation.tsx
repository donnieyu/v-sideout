'use client';
import {useState,type CSSProperties} from 'react';
import {Pencil,Plus,Search,Trash2,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {MemberFilterControls,filterUnregisteredMembers,emptyMemberFilters,type MemberFilters} from './member-filters';
import {allocationCandidateGroups,locatePlayer,type AllocationScope,type Candidate,type CourtPosition,type Slot} from './position-board-model';
import type {ReviewState,Target} from './allocation-ab-model';
import './board-allocation.css';

const rows:[string,string][]=[['2','세터'],['0','레프트 1'],['3','레프트 2'],['1','센터 1'],['4','센터 2'],['5','라이트']];
type Props={state:ReviewState;people:Candidate[];readOnly:boolean;showGrid:boolean;target:Target|null;recentAssignment:(Target&{playerId:string})|null;onTargetChange:(target:Target|null,origin?:HTMLElement)=>void;onReturnFocus:()=>void;onAssign:(target:Target,personId:string)=>void;onRelease:(target:Target,personId:string)=>void;onAddRow:()=>void;onRemoveRow:(index:number)=>void;onAddTeam:()=>void;onRemoveTeam:(teamId:string)=>void;onRename:(teamId:string,title:string)=>void};

export function BoardAllocation({state,people,readOnly,showGrid,target,recentAssignment,onTargetChange,onReturnFocus,onAssign,onRelease,onAddRow,onRemoveRow,onAddTeam,onRemoveTeam,onRename}:Props){
 const [pending,setPending]=useState<{target:Target;person:Candidate}|null>(null);
 const [selection,setSelection]=useState<{key:string;scope:AllocationScope;query:string;filters:MemberFilters}|null>(null);
 const assignedIds=new Set(state.board.flatMap(team=>team.slots.flatMap(slot=>slot.playerId?[slot.playerId]:[])));
 const targetKey=target?`${target.teamId}/${target.slotId}`:'';
 const firstStatus=(['신청자','대기자'] as AllocationScope[]).find(status=>people.some(person=>person.active!==false&&person.status===status&&!assignedIds.has(person.id)))??'신청자';
 const currentSelection=selection?.key===targetKey?selection:{key:targetKey,scope:firstStatus,query:'',filters:emptyMemberFilters};
 const {scope,query,filters}=currentSelection;
 const setScope=(next:AllocationScope)=>setSelection({...currentSelection,scope:next});
 const setQuery=(next:string)=>setSelection({...currentSelection,query:next});
 const setFilters=(next:MemberFilters)=>setSelection({...currentSelection,filters:next});
 const team=state.board.find(item=>item.id===target?.teamId),seat=team?.slots.find(item=>item.id===target?.slotId);
 const player=people.find(person=>person.id===seat?.playerId);
 const candidatePosition:CourtPosition=seat?.id==='6'?'라이트':seat?.position??'교대';
 const source=scope==='미신청 회원'?filterUnregisteredMembers(people,query,filters):people.filter(person=>person.status===scope);
 const groups=allocationCandidateGroups(source,state.board,candidatePosition,scope,scope==='미신청 회원'?'':query);
 const memberClubs=[...new Set(people.filter(person=>person.active!==false&&person.status==='미신청 회원').map(person=>person.club))].sort((a,b)=>a.localeCompare(b,'ko'));
 const extraCount=Math.max(0,...state.board.map(item=>item.slots.length-6));
 const extraIndexes=Array.from({length:extraCount},(_,index)=>index).filter(index=>!readOnly||state.board.some(item=>item.slots[index+6]?.playerId));
 const groupWidth={"--board-teams":state.board.length} as CSSProperties;
 const unassigned=(status:AllocationScope)=>people.filter(person=>person.active!==false&&person.status===status&&!assignedIds.has(person.id)).length;
 const allApplicants=people.filter(person=>person.active!==false&&person.status==='신청자').length;
 const showUnregisteredAction=scope==='신청자'&&!query.trim()&&unassigned('신청자')===0&&unassigned('대기자')===0;
 const seatLabel=(slot:Slot,index?:number)=>index===undefined?rows.find(([id])=>id===slot.id)?.[1]??slot.position:slot.id==='6'?'라이트 2':`추가 선수 ${index+1}`;
 const open=(next:Target,origin:HTMLElement)=>{if(!readOnly)onTargetChange(next,origin)};
 const close=()=>{onTargetChange(null);setSelection(null);setPending(null)};
 const assign=(person:Candidate)=>{
 if(!target||readOnly||person.active===false||locatePlayer(state.board,person.id))return;
  if(person.status==='미신청 회원'){setPending({target,person});return}
  onAssign(target,person.id);
  close();
 };
 const slotButton=(teamId:string,slot:Slot,label:string)=>{
  const person=people.find(item=>item.id===slot.playerId);
  if(readOnly&&!person)return <span className="real-board-empty" aria-hidden="true"/>;
  return <button type="button" key={`${teamId}-${slot.id}`} className="real-board-slot" data-assigned={!!person} data-recent-assignment={recentAssignment?.teamId===teamId&&recentAssignment.slotId===slot.id&&recentAssignment.playerId===slot.playerId||undefined} data-team-id={teamId} data-slot-id={slot.id} disabled={readOnly} aria-label={`${state.board.find(item=>item.id===teamId)?.title} ${label} ${person?`${person.name} ${person.club} 교체`:'선수 배정'}`} onClick={event=>open({teamId,slotId:slot.id},event.currentTarget)}>{person?<><strong title={person.name}>{person.name}</strong><small title={person.club}>{person.active===false?`비활성 · ${person.club}`:person.club}</small></>:<Plus aria-hidden="true"/>}</button>;
 };
 return <>
  {showGrid&&<section className="real-board" aria-label="전체 팀 배정표">
  <div className="real-board-scroll" role="region" aria-label="팀별 포지션 배정표" tabIndex={0}>
   <div className="real-board-grid" data-team-count={state.board.length} style={groupWidth}>
    <div className="real-board-label real-board-corner" aria-hidden="true"/>
    {state.board.map(item=>{
     return <div className="real-board-team" key={item.id}><div className="real-board-team-title">{readOnly?<strong title={item.title}>{item.title}</strong>:<button type="button" className="real-board-team-rename" title={`${item.title} 이름 수정`} aria-label={`${item.title} 이름 수정`} onClick={()=>onRename(item.id,item.title)}><span>{item.title}</span><Pencil aria-hidden="true"/></button>}</div><div className="real-board-team-meta"><small>{item.slots.filter(slot=>slot.playerId).length}명</small>{!readOnly&&<Button variant="ghost" size="icon" className="real-board-team-delete" title={state.board.length>3?`${item.title} 삭제`:'팀은 최소 3개가 필요합니다'} aria-label={`${item.title} 삭제`} disabled={state.board.length<=3} onClick={()=>onRemoveTeam(item.id)}><Trash2 aria-hidden="true"/></Button>}</div></div>
    })}
    {rows.map(([id,label])=><div className="real-board-row" key={id}><div className="real-board-label">{label}</div>{state.board.map(item=><div className="real-board-cell" key={item.id}>{slotButton(item.id,item.slots.find(slot=>slot.id===id)!,label)}</div>)}</div>)}
    {extraIndexes.map(index=>{
     return <div className="real-board-row extra" key={`extra-${index}`}><div className="real-board-label">{!readOnly?<Button variant="ghost" className="real-board-row-delete" title={`추가 선수 ${index+1}줄 삭제`} aria-label={`추가 선수 ${index+1}줄 삭제`} onClick={()=>onRemoveRow(index)}><span>추가 {index+1}</span><Trash2 aria-hidden="true"/></Button>:<span>추가 {index+1}</span>}</div>{state.board.map(item=>{const slot=item.slots[index+6];return <div className="real-board-cell" key={item.id}>{slot?slotButton(item.id,slot,seatLabel(slot,index)):<span className="real-board-empty" aria-hidden="true"/>}</div>})}</div>
    })}
   </div>
  </div>
  {!readOnly&&<div className="real-board-additions"><Button variant="outline" onClick={onAddRow}><Plus aria-hidden="true"/>추가 선수 줄</Button><Button variant="outline" disabled={state.board.length>=4} onClick={onAddTeam}><Plus aria-hidden="true"/>팀 추가</Button></div>}
  </section>}
  <Dialog open={!!target&&!pending} onOpenChange={next=>!next&&close()}><DialogContent showCloseButton={false} className="real-board-picker" onCloseAutoFocus={event=>{event.preventDefault();onReturnFocus()}}><DialogHeader className="real-board-picker-heading"><div><DialogDescription>선수 선택</DialogDescription><DialogTitle>{team?.title} · {seat?seatLabel(seat,seat.id==='6'||seat.position==='교대'?team?.slots.slice(6).findIndex(item=>item.id===seat.id):undefined):''} {player?'교체':'배정'}</DialogTitle></div><Button variant="ghost" size="icon" aria-label="선수 선택 닫기" onClick={close}><X aria-hidden="true"/></Button></DialogHeader>
   <div className={`real-board-current${player?'':' empty'}`} role="group" aria-label="선택된 선수 자리"><div>{player?<><strong>{player.name}</strong><span>{player.club}</span><small>주 {player.position} · 부 {player.secondary}</small></>:<><strong>빈 자리</strong><span>선수를 배정하면 여기에 표시됩니다.</span></>}</div>{player&&<Button variant="outline" onClick={()=>{if(target){onRelease(target,player.id);setScope(player.status)}}}>해제</Button>}</div>
   <div className="real-board-picker-controls"><div className="real-board-search"><Search aria-hidden="true"/><Input aria-label="선수 검색" placeholder="이름 또는 소속 검색" value={query} onChange={event=>setQuery(event.target.value)}/></div>{scope==='미신청 회원'&&<MemberFilterControls clubs={memberClubs} value={filters} onChange={setFilters}/>}</div>
   <div className="real-board-scopes" role="group" aria-label="후보 참가 상태">{(['신청자','대기자','미신청 회원'] as AllocationScope[]).map(value=><Button key={value} variant={scope===value?'secondary':'ghost'} aria-pressed={scope===value} onClick={()=>setScope(value)}>{value}{value!=='미신청 회원'&&<small>{unassigned(value)}</small>}</Button>)}</div>
   <div className="real-board-candidates" role="region" aria-label="선수 후보 목록">{scope==='대기자'&&allApplicants>0&&unassigned('신청자')===0&&<p className="real-board-applicant-complete">신청자는 모두 배정되었습니다.</p>}{groups.map(group=><section key={group.label}><h4>{group.label} <span>{group.people.length}명</span></h4>{group.people.map(person=><div className={`real-board-candidate ${person.status==='미신청 회원'?'unregistered':''}`} key={person.id}><div><strong>{person.name}</strong><span>{person.club}</span><small>주 {person.position} · 부 {person.secondary}</small></div><Button aria-label={`${person.name} ${player?'교체':'배정'}`} onClick={()=>assign(person)}>{player?'교체':'배정'}</Button></div>)}</section>)}{!groups.length&&<div className="real-board-no-result"><strong>{query.trim()?'검색 결과가 없어요.':scope==='신청자'?(allApplicants?'신청자를 모두 배정했어요.':'신청자가 없어요.'):scope==='대기자'?'대기자가 없어요.':'조건에 맞는 선수가 없어요.'}</strong>{showUnregisteredAction&&<><p>추가로 배정할 회원이 있다면 미신청 회원 목록을 확인하세요.</p><Button variant="outline" onClick={()=>setScope('미신청 회원')}>미신청 회원 목록 확인</Button></>}</div>}</div>
  </DialogContent></Dialog>
  <Dialog open={!!pending} onOpenChange={next=>!next&&setPending(null)}><DialogContent><DialogHeader><DialogTitle>신청하지 않은 회원을 배정할까요?</DialogTitle><DialogDescription>{pending?.person.name}님은 이번 운동에 신청하지 않았습니다. 참석 의사를 확인한 경우에만 배정하세요. 팀편성을 저장하면 참석자로 등록됩니다.</DialogDescription></DialogHeader><div className="real-board-confirm"><Button variant="outline" onClick={()=>setPending(null)}>취소</Button><Button onClick={()=>{if(pending){onAssign(pending.target,pending.person.id);close()}}}>확인 후 배정</Button></div></DialogContent></Dialog>
 </>;
}
