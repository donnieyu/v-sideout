'use client';
import {useCallback,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {createPortal} from 'react-dom';
import {useMatchDrag} from './use-match-drag';
import {GripVertical,Plus,Trash2} from 'lucide-react';
import {Button} from '../ui/button';
import {SideoutShell} from './shell';
import {ReadState,useRead,useSideout} from './access';
import {useEditGuard} from './use-edit-guard';
import {dateLabel} from './home';
import {createCommandId} from '@/lib/sideout/command-id';
import {SideoutClientError} from '@/lib/sideout-client';
import type {MatchEditorView} from '@/lib/sideout/match-editor';
import type {MatchPlanRecord} from '@/lib/sideout/read-model';
import {toggleRookieMatches,setRookieTeamCount,addRookieMatch,removeRookieMatch,rookiePairOptions,setRookieMatchPair,moveMatchTo,matchTimes} from '@/lib/sideout/match-plan';
import styles from './match-editor.module.css';
import {EditorActions} from './editor-controls';
import controls from './editor-controls.module.css';
type Cached={data:MatchEditorView;plan:MatchPlanRecord;command?:{id:string;signature:string};stale?:boolean};
function Editor({data,suffix}:{data:MatchEditorView;suffix:string}){
 const {client,drafts,actions}=useSideout(),key='matches:'+data.session.id;
 const [cache,setCache]=useState<Cached>(()=>drafts.get(key) as Cached??{data,plan:structuredClone(data.plan)}),current=useRef(cache);
 const [busy,setBusy]=useState(false),operation=useRef(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[announcement,setAnnouncement]=useState('');
 const dirty=JSON.stringify(cache.plan)!==JSON.stringify(cache.data.plan),guard=useEditGuard(dirty||busy,{onLeave:()=>drafts.delete(key)}),back='/session/'+encodeURIComponent(data.session.id)+suffix;
 const update=(next:Cached)=>{current.current=next;drafts.set(key,next);setCache(next)};
 const change=(plan:MatchPlanRecord)=>{if(operation.current||current.current.stale)return;update({...current.current,plan});setNotice('');setError('')};
 const name=(id:string,rookie:boolean)=>rookie?`신입 ${id.slice(1)}팀`:cache.data.teams.find(t=>t.id===id)?.title??'팀 확인 필요';
 const move=(id:string,to:number)=>{const before=current.current.plan,after=moveMatchTo(before,id,to);if(after!==before){change(after);setAnnouncement(`${to+1}번째로 이동했습니다.`)}};
 const dnd=useMatchDrag(move),drag=dnd.drag;
 async function save(){
  if(operation.current||current.current.stale||dnd.isBusy())return;operation.current=true;setBusy(true);setError('');setNotice('');
  const c=current.current,payload={action:'save' as const,sessionRevision:c.data.sessionRevision,plan:c.plan},signature=JSON.stringify({revision:c.data.rosterRevision,payload}),commandId=c.command?.signature===signature?c.command.id:createCommandId();update({...c,command:{signature,id:commandId}});
  try{const result=await client.saveMatches(data.session.id,{commandId,expectedRevision:c.data.rosterRevision,payload});update({data:{...c.data,plan:structuredClone(c.plan),rosterRevision:result.revision},plan:c.plan});guard.saved();setNotice('저장했습니다. 계속 수정할 수 있습니다.')}
  catch(e){setError((e as Error).message);if(e instanceof SideoutClientError){if(e.status===409)update({...current.current,stale:true});if(e.status===401||e.code==='PASSWORD_CHANGE_REQUIRED')void actions.refresh()}}
  finally{operation.current=false;setBusy(false)}
 }
 async function reload(){if(operation.current||dirty&&!window.confirm('작성 중인 경기 순서를 버리고 최신 정보를 불러올까요?'))return;operation.current=true;dnd.cancel();setBusy(true);setError('');try{const fresh=await client.matchEditor(data.session.id);update({data:fresh,plan:structuredClone(fresh.plan)});guard.saved();setNotice('최신 경기 순서를 불러왔습니다.')}catch(e){setError((e as Error).message)}finally{operation.current=false;setBusy(false)}}
 const plan=cache.plan,rookies=plan.matches.filter(m=>m.kind==='rookie').length,times=matchTimes(plan,cache.data.session.start);
 const minutes=(s:string)=>{const [h,m]=s.split(':').map(Number);return h*60+m},overflow=minutes(cache.data.session.start)+plan.matches.length*20>minutes(cache.data.session.end);
 const locked=busy||cache.stale;
 return <SideoutShell title={cache.data.club.name} subtitle={dateLabel(cache.data.session.date)+' · 경기 순서 수정'} backHref={back} backLabel="일정 상세로 돌아가기">
  <section className={styles.editor} aria-label="경기 순서 수정">
   <header className={`${styles.actions} ${controls.header}`} data-match-actions><div><h1>경기 순서 수정</h1><small>{dirty?'저장하지 않은 변경':'저장된 경기 순서'}</small></div><EditorActions busy={busy} cancelDisabled={!!drag} saveDisabled={locked||!!drag} onCancel={()=>guard.cancel(back)} onSave={()=>void save()}/></header>
   <p className={styles.visibility}>{cache.data.saveVisibility==='attendees'?'저장하면 참석 회원에게 바로 반영됩니다.':'저장한 순서는 팀편성을 공개할 때 함께 반영됩니다.'}</p>
   {notice&&<p role="status" className={styles.message}>{notice}</p>}
   {error&&<div role="alert" className={styles.error}><p>{error}</p>{cache.stale&&<Button variant="outline" disabled={busy} onClick={()=>void reload()}>최신 정보 불러오기</Button>}</div>}
   <fieldset disabled={locked||!!drag} className={styles.settings}>
    <div className={styles.toggle}><label htmlFor="rookie-games">신입 경기 포함</label><button id="rookie-games" type="button" role="switch" aria-checked={rookies>0} onClick={()=>change(toggleRookieMatches(plan,!rookies))}><span/></button></div>
    {rookies>0&&<div className={styles.rookieSettings}><label>신입팀 수<select value={plan.rookieTeamCount} onChange={e=>change(setRookieTeamCount(plan,Number(e.target.value)))}>{[2,3,4].map(n=><option value={n} key={n}>{n}팀</option>)}</select></label><Button variant="outline" disabled={plan.matches.length>=100} onClick={()=>change(addRookieMatch(plan))}><Plus/>신입 경기 추가</Button></div>}
   </fieldset>
   <div className={styles.summary}><strong>{plan.teamCount}팀 · 일반 {plan.matches.length-rookies}경기 · 신입 {rookies}경기</strong><span>경기당 20분 · 손잡이를 끌어 순서 변경</span></div>
   <p id="match-drag-help" className={styles.srOnly}>순서 이동 버튼에 초점을 두고 위 또는 아래 화살표 키를 눌러 이동할 수 있습니다. 드래그 중 Escape를 누르면 취소합니다.</p><p role="status" className={styles.srOnly}>{announcement}</p>
   <div className={styles.listFrame}><ol ref={dnd.listRef} className={`${styles.list} ${dnd.gap?styles.withGap:''} ${drag?.phase==='drop'?styles.settling:''}`} aria-label="경기 순서 편집">{plan.matches.map((game,index)=><li key={game.id} style={{transform:dnd.gap&&index>=dnd.gap.boundary?'translateY(12px)':undefined}} data-match-id={game.id} data-kind={game.kind} className={`${styles.row} ${game.kind==='rookie'?styles.rookie:''} ${drag?.id===game.id?styles.dragging:''} ${dnd.landed===game.id?styles.landed:''}`}>
    <div className={styles.number}><strong>{index+1}</strong><span>{times[index].start}–{times[index].end}</span></div>
    <div className={styles.pair}><small>{game.kind==='rookie'?'신입 경기':'일반 경기'}</small>{game.kind==='regular'?<strong>{name(game.home,false)} <span>vs</span> {name(game.away,false)}</strong>:<select disabled={locked||!!drag} aria-label={`${index+1}번째 신입 경기 대진`} value={`${game.home}|${game.away}`} onChange={e=>{const [home,away]=e.target.value.split('|');change(setRookieMatchPair(plan,game.id,home,away))}}>{rookiePairOptions(plan.rookieTeamCount).map(([home,away])=><option key={home+away} value={home+'|'+away}>{name(home,true)} vs {name(away,true)}</option>)}</select>}</div>
    <div className={styles.rowActions}><Button className={styles.handle} variant="ghost" size="icon" disabled={locked} aria-label={`${index+1}번째 경기 순서 이동`} aria-describedby="match-drag-help" aria-keyshortcuts="ArrowUp ArrowDown" onPointerDown={e=>{if(!operation.current&&!current.current.stale)dnd.start(e,game.id)}} onPointerMove={dnd.move} onPointerUp={dnd.finish} onPointerCancel={dnd.cancel} onLostPointerCapture={dnd.lost} onKeyDown={e=>{if(e.key==='Escape'){dnd.cancel();return}if(!dnd.isBusy()&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();move(game.id,index+(e.key==='ArrowUp'?-1:1))}}}><GripVertical/></Button>{game.kind==='rookie'&&<Button variant="ghost" size="icon" disabled={locked||!!drag} aria-label={`${index+1}번째 신입 경기 삭제`} onClick={()=>change(removeRookieMatch(plan,game.id))}><Trash2/></Button>}</div>
   </li>)}</ol>{dnd.gap&&<div className={styles.insertion} data-drop-index={dnd.gap.index} aria-hidden="true" style={{top:(drag?.lineTop??0)+6}}/>}</div>
   {drag&&createPortal(<div ref={dnd.overlayRef} data-drag-overlay aria-hidden="true" className={styles.overlay} style={{width:drag.width,transform:`translate3d(${drag.left}px,${drag.y-drag.offsetY}px,0)`}}><GripVertical/><div><small>{plan.matches.find(m=>m.id===drag.id)?.kind==='rookie'?'신입 경기':'일반 경기'} · {drag.target?`${drag.target.index+1}번째로 이동`:'놓으면 이동 취소'}</small><strong>{(()=>{const m=plan.matches.find(m=>m.id===drag.id)!;return `${name(m.home,m.kind==='rookie')} vs ${name(m.away,m.kind==='rookie')}`})()}</strong></div></div>,document.body)}
   {overflow&&<p role="alert" className={styles.warning}>마지막 경기 종료는 {times.at(-1)?.end}입니다. 운동 종료 시각({cache.data.session.end})을 넘습니다. 경기 수를 확인해 주세요.</p>}
  </section>
 </SideoutShell>;
}
export function MatchEditorScreen({id}:{id:string}){
 const {client,actions}=useSideout(),params=useSearchParams(),load=useCallback((signal:AbortSignal)=>client.matchEditor(id,signal),[client,id]),auth=useCallback(()=>void actions.refresh(),[actions.refresh]),{data,error,retry}=useRead(load,auth);
 const q=new URLSearchParams();for(const key of ['weekStart','filter']){const v=params.get(key);if(v)q.set(key,v)}
 if(!data)return <SideoutShell title="경기 순서 수정" backHref={'/session/'+encodeURIComponent(id)+(q.size?'?'+q:'')} backLabel="일정 상세로 돌아가기"><ReadState error={error} retry={retry}/></SideoutShell>;
 return <Editor key={id} data={data} suffix={q.size?'?'+q:''}/>;
}
