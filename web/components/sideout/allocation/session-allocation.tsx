'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react'
import {Plus,Send,Sparkles,Trash2} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {TeamNameDialog} from './team-name-dialog'
import {BoardAllocation} from './board-allocation'
import {allocationReducer,withApplicantCapacity,type ReviewState,type Target} from './allocation-ab-model'
import {createTeam,addBenchRow,alignBenchRows,removeBenchRow,placeOnBoard,locatePlayer,type BoardTeam,type Candidate,type Slot} from './position-board-model'
import {fromBoard as boardToLineup,toBoard as lineupToBoard} from '@/lib/sideout/allocation-adapter'
import {canRetainInactivePlacement} from '@/lib/sideout/retained-placement'
import type {LineupRecord as Lineup} from '@/lib/sideout/read-model'

import {PublicationWithdrawDialog} from '../publication-withdraw-dialog'
import {EditorActions} from '../editor-controls'
import controls from '../editor-controls.module.css'
import './allocation-layout.css'
import './session-allocation.css'

export type EditorSnapshot={state:ReviewState;view:'rows'|'court';manualExtraRows?:boolean;pickerTarget?:Target|null;mode?:'legacy'|'board';boardEntryTarget?:Target|null}
type Props={readOnly?:boolean;wasPublished?:boolean;hasSavedChanges?:boolean;onUnpublish?:(source:'saved'|'published')=>Promise<void>;initial?:EditorSnapshot;entryMode?:'legacy'|'board';onSnapshot?:(snapshot:EditorSnapshot)=>void;title:string;baseline:Lineup;people:Candidate[];saved:boolean;publishedLineup?:Lineup|null;onSave:(lineup:Lineup,publish:boolean)=>Promise<void>;onCancel:()=>void;onDirty:(dirty:boolean)=>void}
export function SessionAllocation({readOnly=false,wasPublished=false,hasSavedChanges=false,onUnpublish,title,baseline,people,saved,publishedLineup,onSave,onCancel,onDirty,initial,entryMode='board',onSnapshot}:Props){
 const applicantCount=people.filter(p=>p.status==='신청자'&&p.active!==false).length
 const [manualExtraRows,setManualExtraRows]=useState(initial?.manualExtraRows??(baseline.extraRows!==undefined))
 const fitCapacity=(value:ReviewState,manual=manualExtraRows)=>{if(readOnly)return value;const fitted=manual?value:withApplicantCapacity(value,applicantCount);const board=alignBenchRows(fitted.board);return board===fitted.board?fitted:{...fitted,board}}
 const [rawState,setRawState]=useState<ReviewState>(()=>fitCapacity(initial?.state??{board:lineupToBoard(baseline),target:null,pendingId:null,reviewed:false}))
 const state=fitCapacity(rawState)
 const setState=(update:(previous:ReviewState)=>ReviewState)=>setRawState(previous=>fitCapacity(update(fitCapacity(previous))))

 const [view,setView]=useState<'rows'|'court'>(initial?.mode==='board'?'rows':initial?.view??(readOnly||entryMode==='legacy'?'court':'rows')),[confirm,setConfirm]=useState<'unpublish'|'publish'|'auto'|'auto-complete'|'save-unregistered'|null>(null),[error,setError]=useState('')
 const [renaming,setRenaming]=useState<{id:string;title:string}|null>(null)
 const [saveFeedback,setSaveFeedback]=useState(''),[busy,setBusy]=useState(false);const saving=useRef(false)
 const [teamToDelete,setTeamToDelete]=useState<string|null>(null)
 const [rowToDelete,setRowToDelete]=useState<number|null>(null)
 const [resetRequested,setResetRequested]=useState(false)
 const [pickerTarget,setPickerTarget]=useState<Target|null>(readOnly?null:initial?.pickerTarget??initial?.boardEntryTarget??null)
 const [recentAssignment,setRecentAssignment]=useState<(Target&{playerId:string})|null>(null)
 const pickerOrigin=useRef<HTMLElement|null>(null)
 const lastPickerTarget=useRef<Target|null>(pickerTarget)
 const preserveSaveFeedback=useRef(false)
 const body=useRef<HTMLDivElement>(null)
 const extraRows=Math.max(0,...state.board.map(team=>team.slots.length-6))
 const lineup=boardToLineup(state.board,people,manualExtraRows?extraRows:undefined),dirty=!readOnly&&JSON.stringify(lineup)!==JSON.stringify(boardToLineup(lineupToBoard(baseline),people,baseline.extraRows))
 useEffect(()=>{onDirty(dirty)},[dirty,onDirty])
 useEffect(()=>{onSnapshot?.({state,view,manualExtraRows,pickerTarget})},[state,view,manualExtraRows,pickerTarget,onSnapshot])
 useEffect(()=>{if(preserveSaveFeedback.current)preserveSaveFeedback.current=false;else setSaveFeedback('')},[state.board])
 useEffect(()=>()=>onDirty(false),[onDirty])
 useEffect(()=>{window.scrollTo(0,0)},[])
 useEffect(()=>{if(!recentAssignment)return;const timer=window.setTimeout(()=>setRecentAssignment(null),3000);return()=>window.clearTimeout(timer)},[recentAssignment])
 useLayoutEffect(()=>{
  // View changes start at the toolbar/list top; selection remains in the model.
  window.scrollTo(0,0)
  if(body.current){body.current.scrollTop=0;body.current.querySelectorAll<HTMLElement>('.allocation-overview, .real-board, .real-board-scroll').forEach(element=>{element.scrollTop=0;element.scrollLeft=0})}
 },[view])
 function dispatchAuto(){if(readOnly)return;setRecentAssignment(null);setState(prev=>allocationReducer(prev,{type:'auto-fill'},people));setError('')}
 function clearAssignments(){if(readOnly)return;setRecentAssignment(null);setState(prev=>allocationReducer(prev,{type:'clear-assignments'},people));setPickerTarget(null);setResetRequested(false);setError('')}
 function changePickerTarget(target:Target|null,origin?:HTMLElement){if(target){lastPickerTarget.current=target;pickerOrigin.current=origin??null}setPickerTarget(target)}
 function returnPickerFocus(){if(pickerOrigin.current?.isConnected&&!pickerOrigin.current.hasAttribute('disabled')){pickerOrigin.current.focus();return}const target=lastPickerTarget.current;if(!target)return;const slot=[...body.current?.querySelectorAll<HTMLElement>('[data-team-id][data-slot-id]')??[]].find(element=>element.dataset.teamId===target.teamId&&element.dataset.slotId===target.slotId);slot?.focus()}
 function open(target:Target,origin:HTMLElement){if(readOnly||!state.board.some(t=>t.id===target.teamId&&t.slots.some(s=>s.id===target.slotId)))return;changePickerTarget(target,origin)}
 function addRow(){if(readOnly)return;setManualExtraRows(true);setRawState(prev=>{const current=fitCapacity(prev);return fitCapacity({...current,board:addBenchRow(current.board),reviewed:false},true)});setError('')}
 function removeRow(index:number){if(readOnly||index<0||state.board.some(team=>!team.slots[index+6]))return;setRowToDelete(index)}
 function confirmRowDeletion(){if(rowToDelete===null||readOnly)return;setManualExtraRows(true);setRawState(prev=>{const current=fitCapacity(prev);return fitCapacity({...current,board:removeBenchRow(current.board,rowToDelete),target:null,pendingId:null,reviewed:false},true)});setPickerTarget(null);setRowToDelete(null);setError('')}
 function assignBoard(target:Target,personId:string){if(readOnly||!state.board.some(team=>team.id===target.teamId&&team.slots.some(slot=>slot.id===target.slotId))||!people.some(person=>person.id===personId&&person.active!==false)||locatePlayer(state.board,personId))return;setState(prev=>{if(locatePlayer(prev.board,personId))return prev;const board=placeOnBoard(prev.board,target.teamId,target.slotId,personId);return {...prev,board,target,pendingId:personId,reviewed:false}});setRecentAssignment({...target,playerId:personId});setError('')}
 function releaseBoard(target:Target,personId:string){if(readOnly)return;if(recentAssignment?.teamId===target.teamId&&recentAssignment.slotId===target.slotId)setRecentAssignment(null);setState(prev=>allocationReducer(prev,{type:'release',target,playerId:personId},people));setError('')}
 function requestTeamDeletion(teamId:string){if(readOnly||state.board.length<=3||!state.board.some(team=>team.id===teamId))return;setTeamToDelete(teamId)}
 function confirmTeamDeletion(){if(!teamToDelete||readOnly)return;setState(prev=>prev.board.length<=3?prev:{...prev,board:prev.board.filter(item=>item.id!==teamToDelete),target:prev.target?.teamId===teamToDelete?null:prev.target,pendingId:null,reviewed:false});setPickerTarget(null);setTeamToDelete(null);setError('')}
 function addTeam(){if(readOnly)return;setState(prev=>{const id=['A','B','C','D'].find(value=>!prev.board.some(team=>team.id===value));return id?{...prev,board:[...prev.board,createTeam(id)]}:prev})}
 async function commit(publish:boolean){
  if(saving.current||readOnly)return;
  const problem=publish?(state.board.length<3?'공개하려면 3~4팀을 구성해 주세요.':unassignedApplicants?'모든 신청자를 팀에 배정한 뒤 공개해 주세요.':state.board.some(t=>t.slots.every(s=>!s.playerId))?'빈 팀을 배정하거나 삭제해 주세요.':''):'';
  if(problem){setError(problem);setConfirm(null);return}
  saving.current=true;setBusy(true);setError('');
  try{await onSave(lineup,publish);setConfirm(null);preserveSaveFeedback.current=true;
   setState(prev=>prev);
   setSaveFeedback(publish?'공개됨':'저장됨');
  }catch(e){setError((e as Error).message);setConfirm(null)}finally{saving.current=false;setBusy(false)}
 }
 function renderResultSlot(team:BoardTeam,slot:Slot,extra=false){
  if(readOnly&&!slot.playerId)return null
  const courtIndex=team.slots.slice(0,6).findIndex(s=>s.id===slot.id)
  const courtPlacement=readOnly&&view==='court'&&!extra?{gridColumn:courtIndex%3+1,gridRow:Math.floor(courtIndex/3)+1}:undefined
  const player=people.find(p=>p.id===slot.playerId)
  const label=slot.id==='6'?'라이트 2':slot.position==='교대'?player?.position??'추가 자리':slot.position
  return <Button key={slot.id} style={courtPlacement} variant="outline" className={`allocation-preview-slot${extra?' allocation-reserve-slot':''}`} data-assigned={!!slot.playerId} data-recent-assignment={recentAssignment?.teamId===team.id&&recentAssignment.slotId===slot.id&&recentAssignment.playerId===slot.playerId||undefined} data-team-id={team.id} data-slot-id={slot.id} disabled={readOnly} aria-label={`${team.title} ${extra?'추가 선수 ':''}${label} ${player?.name??'배정'}${player?` ${player.club}`:''}`} onClick={event=>open({teamId:team.id,slotId:slot.id},event.currentTarget)}><span>{label}</span><strong>{player?.name??(extra?'＋ 추가 배정':'＋ 배정')}</strong>{player&&<small className="allocation-slot-club">{player.active===false?`비활성 · ${player.club}`:player.club}</small>}</Button>
 }
 const placedIds=new Set(state.board.flatMap(t=>t.slots).flatMap(s=>s.playerId?[s.playerId]:[]))
 const assignedCount=state.board.reduce((count,team)=>count+team.slots.filter(slot=>slot.playerId).length,0)
 const inactiveAssignedCount=state.board.reduce((count,team)=>count+team.slots.filter(slot=>slot.playerId&&people.find(person=>person.id===slot.playerId)?.active===false).length,0)
 const unregistered=people.filter(person=>person.status==='미신청 회원'&&placedIds.has(person.id))
 const unassignedApplicants=people.filter(p=>p.status==='신청자'&&p.active!==false&&!placedIds.has(p.id)).length
 const canRepairExtras=state.board.some(team=>team.slots.slice(0,6).some(slot=>!slot.playerId))&&state.board.some(team=>team.slots.slice(6).some(slot=>people.some(person=>person.id===slot.playerId&&person.active!==false&&person.position!=='미등록'&&(person.status==='신청자'||person.status==='대기자'))))
 const inactivePlaced=lineup.teams.some(t=>t.players.some(p=>people.find(person=>person.id===p.memberId)?.active===false&&!canRetainInactivePlacement(baseline,publishedLineup,t.id,p)))
 const retainedApplicants=people.filter(p=>p.status==='신청자'&&p.active===false&&placedIds.has(p.id)).length
 const attendanceCount=applicantCount+retainedApplicants
 const publishProblem=state.board.length<3||state.board.length>4?'공개하려면 3~4팀을 구성해 주세요.':unassignedApplicants?'모든 신청자를 팀에 배정해 주세요.':state.board.some(t=>t.slots.every(s=>!s.playerId))?'빈 팀을 배정하거나 삭제해 주세요.':inactivePlaced?'비활성 회원의 배정을 해제해 주세요.':''
 const ready=!publishProblem
 const signature=(value:Lineup)=>JSON.stringify(value.teams.map(t=>({...t,players:[...t.players].sort((a,b)=>a.slotId.localeCompare(b.slotId))})).sort((a,b)=>a.id.localeCompare(b.id)))
 const samePublic=!!publishedLineup&&signature(lineup)===signature(publishedLineup)
 const deletingTeam=state.board.find(team=>team.id===teamToDelete)
 const deletingPlayerCount=deletingTeam?.slots.filter(slot=>slot.playerId).length??0
 const deletingRowPlayerCount=rowToDelete===null?0:state.board.filter(team=>team.slots[rowToDelete+6]?.playerId).length
 const additional=people.filter(p=>p.status!=='신청자'&&placedIds.has(p.id)).length
 const progress=unassignedApplicants?`신청자 ${attendanceCount-unassignedApplicants}/${attendanceCount}명 배정 · ${unassignedApplicants}명 남음`:`신청자 ${attendanceCount}명 전원 배정`
 const statusText=readOnly?'공개 중 · 수정하려면 공개를 취소하세요':`${progress}${ready?' · 공개 가능':''}`
 return <fieldset disabled={busy} className="session-allocation" aria-label="팀편성 편집" data-session={title}>
  <header className={controls.header} data-allocation-actions><div><h2 id="allocation-title">팀편성 수정</h2><span className="allocation-save-feedback" role="status">{readOnly?'공개된 편성 · 읽기 전용':saveFeedback||(dirty?'저장하지 않은 변경':saved?'저장된 편성':'아직 저장하지 않음')}</span></div><EditorActions busy={busy} saveDisabled={readOnly} cancelLabel={readOnly?'돌아가기':'취소'} onCancel={onCancel} onSave={()=>unregistered.length?setConfirm('save-unregistered'):commit(false)}/></header>
  <div id="allocation-summary" className={`allocation-progress ${ready?'ready':''}`} role="status"><div><strong>{statusText}</strong>{!readOnly&&!unassignedApplicants&&publishProblem&&<small>{publishProblem}</small>}{!readOnly&&publishedLineup&&!samePublic&&<small>미공개 변경 있음</small>}{additional>0&&<small>추가 배정 {additional}명</small>}</div></div>
  {error&&<p role="alert" className="allocation-error">{error}</p>}
  {unregistered.length>0&&<p className="allocation-error" role="status">미신청 회원 {unregistered.length}명은 저장 시 참석자로 등록됩니다.</p>}
  {!readOnly&&inactivePlaced&&<p className="allocation-error" role="alert">비활성 회원은 기존 공개 배정만 유지할 수 있습니다. 새로 배정된 자리는 해제해 주세요.</p>}
  <div ref={body} className="allocation-session-body">
  <div className="ab-board-toolbar" aria-label="팀편성 보기 및 도구">
   <div className="allocation-view-switch" role="group" aria-label="팀 보기 방식"><Button variant={view==='court'?'default':'ghost'} aria-pressed={view==='court'} onClick={()=>setView('court')}>코트</Button><Button variant={view==='rows'?'default':'ghost'} aria-pressed={view==='rows'} onClick={()=>setView('rows')}>행</Button></div>
   {!readOnly&&<div className="allocation-board-actions"><Button className="allocation-auto-button" variant="outline" onClick={()=>setConfirm(unassignedApplicants===0&&!canRepairExtras?'auto-complete':'auto')}><Sparkles/>자동 배치</Button><Button className="allocation-reset-button" variant="ghost" disabled={!assignedCount} onClick={()=>setResetRequested(true)}>배정 초기화</Button></div>}
  </div>
   {view==='court'&&<div className="allocation-overview"><div className="allocation-team-columns court">{state.board.map(team=><section key={team.id}>
    <header className="allocation-team-heading"><div className="allocation-team-identity"><h2>{team.title}</h2></div><div className="allocation-team-actions"><small className="allocation-team-count">{team.slots.filter(s=>s.playerId).length}명</small>{!readOnly&&<Button variant="ghost" size="icon" className="allocation-court-team-delete" aria-label={`${team.title} 삭제`} title={state.board.length>3?`${team.title} 삭제`:'팀은 최소 3개가 필요합니다'} disabled={state.board.length<=3} onClick={()=>requestTeamDeletion(team.id)}><Trash2 aria-hidden="true"/></Button>}</div></header>
    <div className="allocation-court" role="group" aria-label={`${team.title} 코트`}><div className="allocation-net">네트</div><div className="allocation-result-slots">{team.slots.slice(0,6).map(slot=>renderResultSlot(team,slot))}</div></div>
    {(!readOnly||team.slots.slice(6).some(slot=>slot.playerId))&&<div className="allocation-reserve" role="group" aria-label={`${team.title} 추가 선수`}>
     <div className="allocation-reserve-heading">추가 인원{!readOnly&&<small>모든 팀 공통</small>}</div>
     <div className="allocation-reserve-slots">{team.slots.slice(6).filter(slot=>!readOnly||slot.playerId).map((slot,index)=><div className={`allocation-reserve-row${readOnly?'':' removable'}`} key={slot.id}>{renderResultSlot(team,slot,true)}{!readOnly&&<Button variant="outline" size="icon" aria-label={`전체 팀 추가 선수 ${index+1}줄 삭제`} title={`전체 팀 추가 선수 ${index+1}줄 삭제`} onClick={()=>removeRow(index)}><Trash2 aria-hidden="true"/></Button>}</div>)}</div>
     {!readOnly&&<Button variant="outline" className="allocation-add-extra" aria-label="모든 팀에 추가 선수 자리 한 줄 추가" onClick={addRow}><Plus aria-hidden="true"/>추가 선수 자리</Button>}
    </div>}
   </section>)}</div>{!readOnly&&<Button variant="outline" className="allocation-add-team" disabled={state.board.length>=4} onClick={addTeam}><Plus aria-hidden="true"/>팀 추가</Button>}</div>}
   <BoardAllocation state={state} people={people} readOnly={readOnly} showGrid={view==='rows'} target={pickerTarget} recentAssignment={recentAssignment} onTargetChange={changePickerTarget} onReturnFocus={returnPickerFocus} onAssign={assignBoard} onRelease={releaseBoard} onAddRow={addRow} onRemoveRow={removeRow} onAddTeam={addTeam} onRemoveTeam={requestTeamDeletion} onRename={(id,title)=>setRenaming({id,title})}/>
  </div>
  <nav className="allocation-session-nav" aria-label="팀 배정 내비게이션">{readOnly?<Button className="allocation-unpublish" variant="outline" onClick={()=>setConfirm('unpublish')}>공개 취소</Button>:<Button disabled={!ready} aria-describedby="allocation-summary" onClick={()=>setConfirm('publish')}><Send/>{wasPublished?'다시 공개':'공개'}</Button>}</nav>
  {!readOnly&&renaming&&<TeamNameDialog title={renaming.title} onClose={()=>setRenaming(null)} onApply={title=>{setState(previous=>({...previous,board:previous.board.map(team=>team.id===renaming.id?{...team,title}:team),reviewed:false}));setRenaming(null)}}/>}
  <Dialog open={!!deletingTeam} onOpenChange={open=>!open&&setTeamToDelete(null)}><DialogContent><DialogHeader><DialogTitle>{deletingTeam?.title}을 삭제할까요?</DialogTitle><DialogDescription>{deletingPlayerCount?`배정된 선수 ${deletingPlayerCount}명의 배정이 모두 해제되고 각 후보 목록으로 돌아갑니다.`:'빈 팀이 삭제됩니다.'} 저장 전까지 이 변경은 확정되지 않습니다.</DialogDescription></DialogHeader><div className="ab-confirm-actions"><Button variant="outline" onClick={()=>setTeamToDelete(null)}>취소</Button><Button variant="destructive" onClick={confirmTeamDeletion}>팀 삭제</Button></div></DialogContent></Dialog>
  <Dialog open={rowToDelete!==null} onOpenChange={open=>!open&&setRowToDelete(null)}><DialogContent><DialogHeader><DialogTitle>추가 선수 {(rowToDelete??0)+1}줄을 삭제할까요?</DialogTitle><DialogDescription>모든 팀에서 이 줄이 삭제됩니다. {deletingRowPlayerCount?`배정된 선수 ${deletingRowPlayerCount}명의 배정이 모두 해제되고 각 후보 목록으로 돌아갑니다.`:'빈 추가 선수 줄입니다.'} 저장 전까지 이 변경은 확정되지 않습니다.</DialogDescription></DialogHeader><div className="ab-confirm-actions"><Button variant="outline" onClick={()=>setRowToDelete(null)}>취소</Button><Button variant="destructive" onClick={confirmRowDeletion}>줄 삭제</Button></div></DialogContent></Dialog>
  <Dialog open={resetRequested} onOpenChange={open=>!open&&setResetRequested(false)}><DialogContent><DialogHeader><DialogTitle>선수 배정을 모두 초기화할까요?</DialogTitle><DialogDescription>배정된 선수 {assignedCount}명의 배정을 모두 해제합니다. 팀 이름·순서·추가 선수 줄과 신청 명단은 유지됩니다. 저장 전까지 실제 편성에 반영되지 않습니다.{inactiveAssignedCount>0&&` 비활성 회원 ${inactiveAssignedCount}명은 해제 후 다시 배정할 수 없습니다.`}</DialogDescription></DialogHeader><div className="ab-confirm-actions"><Button variant="outline" onClick={()=>setResetRequested(false)}>취소</Button><Button variant="destructive" onClick={clearAssignments}>배정 {assignedCount}명 해제</Button></div></DialogContent></Dialog>
  {onUnpublish&&<PublicationWithdrawDialog open={confirm==='unpublish'} onClose={()=>setConfirm(null)} onConfirm={onUnpublish} hasSavedChanges={hasSavedChanges}/>}
  <Dialog open={!!confirm&&confirm!=='unpublish'} onOpenChange={value=>!busy&&!value&&setConfirm(null)}><DialogContent onEscapeKeyDown={e=>{if(busy)e.preventDefault()}} onPointerDownOutside={e=>{if(busy)e.preventDefault()}}><DialogHeader><DialogTitle>{confirm==='publish'?'팀편성을 공개할까요?':confirm==='save-unregistered'?'미신청 회원을 참가자로 추가할까요?':confirm==='auto-complete'?'신청자를 모두 배정했어요':'빈자리를 자동 배치할까요?'}</DialogTitle><DialogDescription>{confirm==='publish'?`공개하면 참석 회원에게 팀편성과 경기 순서가 함께 노출됩니다.${unregistered.length?` 미신청 회원 ${unregistered.length}명은 참석자로 등록됩니다.`:''}`:confirm==='save-unregistered'?`미신청 회원 ${unregistered.length}명을 참석자로 추가하고 팀편성을 저장합니다. 저장 전 편집을 취소하면 등록되지 않습니다.`:confirm==='auto-complete'?'자동 배치할 신청자가 없습니다. 현재 편성은 그대로 유지됩니다. 추가 선수 줄은 코트·행 보기에서 관리할 수 있습니다.':'기존 기본 자리 배정은 유지하고, 신청자·대기자로 기본 자리를 먼저 채웁니다. 필요한 경우 추가 자리 선수를 빈 기본 자리로 옮기고 남은 선수만 추가 자리에 배치합니다.'}</DialogDescription></DialogHeader>
   {confirm==='auto-complete'?<div className="ab-confirm-actions"><Button onClick={()=>setConfirm(null)}>확인</Button></div>:<div className="ab-confirm-actions"><Button disabled={busy} variant="outline" onClick={()=>setConfirm(null)}>{confirm==='publish'?'취소':'돌아가기'}</Button><Button disabled={busy} onClick={()=>{if(confirm==='publish')commit(true);else if(confirm==='save-unregistered')commit(false);else{dispatchAuto();setConfirm(null)}}}>{confirm==='publish'?'확인':confirm==='save-unregistered'?'추가하고 저장':'자동 배치'}</Button></div>}</DialogContent></Dialog>
 </fieldset>
}
