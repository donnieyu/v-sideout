'use client';
import {createCommandId} from '@/lib/sideout/command-id';
import {useCallback,useState,useEffect,useContext,useRef} from 'react';
import {Plus,Users,EyeOff} from 'lucide-react';
import {Button} from '../ui/button';
import {Input} from '../ui/input';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter,DialogTrigger} from '../ui/dialog';
import type {SessionCardView,SessionDetailView,MemberLabel} from '@/lib/sideout/read-model';
import type {ParticipantCommand} from '@/lib/server/sideout-participation';
import {SideoutClientError} from '@/lib/sideout-client';
import {useRead,useSideout,ReadState,ReadWarning} from './access';
import {ScheduleSurface} from './week-schedule';
import {notifyRoster} from './participation-button';
import {PublicationWithdrawDialog} from './publication-withdraw-dialog';
import type {TeamEditorView} from '@/lib/sideout/team-editor';
import styles from './sideout.module.css';
const rosterDate=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',timeZone:'Asia/Seoul'});
export function RosterButton({card,detail,placement='card'}:{card:SessionCardView;detail?:SessionDetailView;placement?:'card'|'team'}){
 const {client,actions,session,drafts}=useSideout(),cacheKey='roster:'+useContext(ScheduleSurface)+':'+card.session.id;
 const cached=drafts.get(cacheKey) as {open:boolean;adding:boolean;selected:string[];query:string;command:{signature:string;id:string}|null}|undefined;
 const [open,setOpen]=useState(cached?.open??false),[adding,setAdding]=useState(cached?.adding??false),[selected,setSelected]=useState<string[]>(cached?.selected??[]),[query,setQuery]=useState(cached?.query??''),[busy,setBusy]=useState(false),[writeError,setWriteError]=useState('');
 const [withdrawal,setWithdrawal]=useState<TeamEditorView|null>(null),operation=useRef(false);
 const [command,setCommand]=useState<{signature:string;id:string}|null>(cached?.command??null);
 useEffect(()=>{if(open)drafts.set(cacheKey,{open,adding,selected,query,command});else drafts.delete(cacheKey)},[drafts,cacheKey,open,adding,selected,query,command]);
 // Always refresh the authoritative roster when the overlay opens; detail is only a parent view.
 const load=useCallback((signal:AbortSignal)=>!open?Promise.resolve(null):client.session(card.session.id,signal),[open,client,card.session.id]);
 const candidatesLoad=useCallback((signal:AbortSignal)=>open&&adding?client.candidates(card.session.id,signal):Promise.resolve(null),[open,adding,client,card.session.id]);
 const recheck=useCallback(()=>void actions.refresh(),[actions.refresh]);
 const {data,error,retry}=useRead(load,recheck,15000),candidates=useRead(candidatesLoad,recheck);
 const canWithdraw=!!data?.canManage&&data.teamPublished&&data.capabilities.canEditTeams;
 const canRemove=!!data?.capabilities.canCancelRoster&&!data.teamPublished;
 const canModify=!!data?.capabilities.canManageRoster&&!data.teamPublished;
 useEffect(()=>{if(adding&&data&&!canModify){setAdding(false);setSelected([]);setQuery('');setWriteError('팀편성이 공개되었거나 운동이 시작되어 추가할 수 없습니다.')}},[adding,data,canModify]);
 function close(){if(busy||withdrawal)return;drafts.delete(cacheKey);setOpen(false);setAdding(false);setSelected([]);setQuery('');setWriteError('');setCommand(null)}
 async function mutate(payload:ParticipantCommand,revision:number){
  if(operation.current)return;operation.current=true;setBusy(true);setWriteError('');
  try{const signature=JSON.stringify({payload,revision}),commandId=command?.signature===signature?command.id:createCommandId();setCommand({signature,id:commandId});
  await client.participate(card.session.id,{commandId,expectedRevision:revision,payload});
  // Native confirmation can trigger auth revalidation and remount this dialog.
  // Keep its open state after a successful write; only explicit close clears it.
  if(drafts.has(cacheKey))drafts.set(cacheKey,{open:true,adding:false,selected:[],query:'',command:null});
  setAdding(false);setSelected([]);setQuery('');setCommand(null);notifyRoster()}
  catch(e){setWriteError((e as Error).message);if(e instanceof SideoutClientError&&(e.status===401||e.code==='PASSWORD_CHANGE_REQUIRED'))void actions.refresh();else if(e instanceof SideoutClientError&&e.status===409){notifyRoster();candidates.retry()}}
  finally{operation.current=false;setBusy(false)}
 }
 async function prepareWithdrawal(){
  if(operation.current||!canWithdraw)return;operation.current=true;setBusy(true);setWriteError('');
  try{const fresh=await client.teamEditor(card.session.id);if(!fresh.teamPublished){notifyRoster();throw Error('이미 공개가 취소되었습니다. 최신 명단을 확인해 주세요.')}setWithdrawal(fresh)}
  catch(e){setWriteError((e as Error).message);if(e instanceof SideoutClientError&&(e.status===401||e.code==='PASSWORD_CHANGE_REQUIRED'))void actions.refresh()}
  finally{operation.current=false;setBusy(false)}
 }
 async function unpublish(source:'saved'|'published'){
  if(operation.current||!withdrawal)throw Error('이전 작업이 끝난 뒤 다시 시도해 주세요.');operation.current=true;setBusy(true);setWriteError('');
  const payload={action:'unpublish' as const,confirmed:true as const,draftSource:source,sessionRevision:withdrawal.sessionRevision},revision=withdrawal.rosterRevision;
  try{const signature=JSON.stringify({payload,revision}),commandId=command?.signature===signature?command.id:createCommandId();setCommand({signature,id:commandId});
   await client.saveTeams(card.session.id,{commandId,expectedRevision:revision,payload});
   if(drafts.has(cacheKey))drafts.set(cacheKey,{open:true,adding:false,selected:[],query:'',command:null});
   setCommand(null);notifyRoster();
  }catch(e){if(e instanceof SideoutClientError){if(e.status===401||e.code==='PASSWORD_CHANGE_REQUIRED')void actions.refresh();if(e.status===409){setWithdrawal(null);setWriteError('다른 곳에서 변경되었습니다. 명단을 확인한 뒤 다시 시도해 주세요.');notifyRoster()}}throw e}
  finally{operation.current=false;setBusy(false)}
 }
 if(card.session.phase==='draft'||(!card.canManage&&session.me.homeClubId!==card.club.id))return null;
 function remove(person:MemberLabel,waiting=false){if(!data||!window.confirm(`${person.displayName} 회원의 ${waiting?'대기 등록':'참석 신청'}을 취소할까요?\n팀편성에 배정되어 있다면 해당 자리도 함께 비워집니다.`))return;void mutate({action:'remove',memberId:person.memberId,sessionRevision:data.sessionRevision},data.rosterRevision)}
 const group=(title:string,people:MemberLabel[],own=false)=><section className={styles.rosterGroup}><div className={styles.rosterLabel}><h3>{title}</h3><span className={styles.rosterCount}>{people.length}명</span></div>{people.length?<div className={styles.rosterPeople}>{people.map(p=><div className={styles.rosterPerson} key={p.memberId}><div><strong>{p.displayName}{p.memberId===session.me.memberId&&<em>나</em>}</strong>{!own&&<small>{p.clubName??'소속 없음'}</small>}</div>{canRemove&&<Button variant="ghost" disabled={busy} aria-label={`${p.displayName} ${title==='대기자'?'대기':'참가'} 취소`} onClick={()=>remove(p,title==='대기자')}>취소</Button>}</div>)}</div>:<p className={styles.muted}>등록된 인원이 없습니다.</p>}</section>;
 const eligible=new Set(candidates.data?.members.map(p=>p.memberId)),selection=selected.filter(id=>eligible.has(id));
 const filtered=candidates.data?.members.filter(p=>(p.displayName+' '+(p.clubName??'소속 없음')).toLocaleLowerCase('ko').includes(query.trim().toLocaleLowerCase('ko')))??[];
 return <><Dialog open={open} onOpenChange={value=>{if(value)setOpen(true);else close()}}><DialogTrigger asChild><Button variant={placement==='team'?'outline':'link'} size="sm" className={`${styles.rosterTrigger} ${placement==='team'?styles.teamRosterTrigger:''}`}>{placement==='team'&&<Users className="size-3.5" aria-hidden="true"/>}명단 확인</Button></DialogTrigger><DialogContent className={styles.rosterDialog}><DialogHeader><DialogTitle>{adding?'참가자 추가':'함께하는 회원'}</DialogTitle><DialogDescription>{card.club.name} · {rosterDate.format(new Date(card.session.date+'T00:00:00+09:00'))} 운동{adding?' · 참가 의사를 확인한 회원을 선택하세요.':''}</DialogDescription></DialogHeader>{error&&data&&<ReadWarning retry={retry}/>} {writeError&&<p role="alert">{writeError}</p>}{adding?<><Input aria-label="회원 이름 또는 소속 검색" placeholder="이름 또는 소속 검색" value={query} onChange={e=>setQuery(e.target.value)} disabled={busy}/>{!candidates.data?<ReadState error={candidates.error} retry={candidates.retry}/>:<div className={styles.rosterScroll} role="region" aria-label="추가 가능한 회원" tabIndex={0}><p className={styles.muted}>{filtered.length}명 · {selection.length}명 선택</p><div className={styles.rosterPeople}>{filtered.map(p=><label className={styles.rosterSelect} key={p.memberId}><input type="checkbox" aria-label={`${p.displayName} · ${p.clubName??'소속 없음'}`} disabled={busy} checked={selected.includes(p.memberId)} onChange={e=>setSelected(old=>e.target.checked?[...old,p.memberId]:old.filter(id=>id!==p.memberId))}/><span><strong>{p.displayName}</strong><small>{p.clubName??'소속 없음'}</small></span></label>)}</div>{!filtered.length&&<p>추가할 수 있는 회원이 없습니다.</p>}</div>}</>:!data?<ReadState error={error} retry={retry}/>:<><div className={styles.rosterScroll} role="region" aria-label="참가 명단" tabIndex={0}>{group('소속 회원',data.visibleApplicants.filter(m=>m.homeClubId===card.session.clubId),true)}{data.canManage&&group('게스트',data.visibleApplicants.filter(m=>m.homeClubId!==card.session.clubId))}{data.canManage&&!!data.visibleWaiters?.length&&group('대기자',data.visibleWaiters)}</div>{!data.canManage&&<div className={styles.guestSummary}><Users size={17}/><span>게스트</span><strong>{data.guestCount??0}<small>명</small></strong></div>}</>}<DialogFooter className={styles.rosterFooter}>{adding?<><Button variant="outline" disabled={busy} onClick={()=>{setAdding(false);setSelected([]);setQuery('');setWriteError('')}}>취소</Button><Button disabled={busy||!canModify||!selection.length||!candidates.data} onClick={()=>{const current=candidates.data!;void mutate({action:'add',memberIds:selection,sessionRevision:current.sessionRevision},current.rosterRevision)}}>{busy?'추가 중…':`${selection.length}명 추가`}</Button></>:<>{canWithdraw&&<Button variant="outline" disabled={busy} onClick={()=>void prepareWithdrawal()}><EyeOff/>{busy?'불러오는 중…':'공개 취소'}</Button>}{canModify&&<Button variant="outline" disabled={busy} onClick={()=>{setAdding(true);setWriteError('')}}><Plus/>참가자 추가</Button>}<Button disabled={busy} onClick={close}>확인</Button></>}</DialogFooter></DialogContent></Dialog>{withdrawal&&<PublicationWithdrawDialog open onClose={()=>setWithdrawal(null)} onConfirm={unpublish} hasSavedChanges={JSON.stringify(withdrawal.draft)!==JSON.stringify(withdrawal.publishedLineup)||JSON.stringify(withdrawal.draftMatches)!==JSON.stringify(withdrawal.publishedMatches)}/>}</>;
}
