'use client';
import {useRef,useState} from 'react';
import {Send} from 'lucide-react';
import type {SessionDetailView,SessionRecord,ClubRecord} from '@/lib/sideout/read-model';
import {createCommandId} from '@/lib/sideout/command-id';
import {SideoutClientError} from '@/lib/sideout-client';
import {Button} from '../ui/button';
import {Dialog,DialogTrigger,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '../ui/dialog';
import {useSideout,ReadWarning} from './access';
import {SideoutShell} from './shell';
import {ScheduleInformation} from './schedule-information';
import {EditorActionBar} from './editor-action-bar';
import {useEditGuard} from './use-edit-guard';
import {notifyRoster} from './participation-button';
import {dateLabel} from './home';
import styles from './sideout.module.css';
import preparation from './prepared-session-detail.module.css';

export function PreparedSessionDetail({data,query,readError,retry}:{data:SessionDetailView;query:string;readError:boolean;retry:()=>void}){
 const {client,actions,directory,drafts}=useSideout();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[opened,setOpened]=useState(false);
 const operation=useRef(false),command=useRef<{signature:string;id:string}|null>(null);
 useEditGuard(false,{blocked:busy});
 const {session,club}=data;
 const started=Date.parse(`${session.date}T${session.start}:00+09:00`)<=Date.parse(directory.serverNow);
 const canStart=data.canManage&&data.capabilities.canEditSchedule&&!started;
 async function start(){
  if(operation.current||opened||!canStart)return;
  operation.current=true;setBusy(true);setError('');
  const {id,...fields}=session,payload={...fields,phase:'open' as const};
  const signature=JSON.stringify({id,revision:data.sessionRevision,payload});
  if(command.current?.signature!==signature)command.current={signature,id:createCommandId()};
  try{
   await client.saveSchedule({commandId:command.current.id,expectedRevision:data.sessionRevision,payload},id);
   drafts.delete('schedule:'+id);setOpened(true);notifyRoster();
  }catch(e){
   setError((e as Error).message);
   if(e instanceof SideoutClientError){
    if(e.status===401||e.code==='PASSWORD_CHANGE_REQUIRED')void actions.refresh();
    if(e.status===409)notifyRoster();
   }
  }finally{operation.current=false;setBusy(false)}
 }
 return <PreparedScheduleView session={session} club={club} canStart={canStart} started={started} opened={opened} busy={busy} error={error} readError={readError} retry={retry} editHref={'/session/'+encodeURIComponent(session.id)+'/schedule/edit'+(query?'?'+query:'')} onStart={()=>void start()}/>;
}

export function PreparedScheduleView({session,club,canStart=true,started=false,opened=false,busy=false,error='',readError=false,retry=()=>{},editHref,onStart}:{session:Omit<SessionRecord,'id'>;club:ClubRecord;canStart?:boolean;started?:boolean;opened?:boolean;busy?:boolean;error?:string;readError?:boolean;retry?:()=>void;editHref:string;onStart:()=>void}){
 const [confirmOpen,setConfirmOpen]=useState(false),startButton=useRef<HTMLButtonElement>(null);
 return <SideoutShell title="운동 상세" contentHeading actionBar={canStart} floatingReturn={!canStart}>
  {readError&&<ReadWarning retry={retry}/>}
  <header className={styles.sessionContext}>
   <h1 className={styles.detailTitle}>운동 상세</h1>
   <div><span className={styles.mark} data-club-id={club.id}>{club.mark}</span><h2>{club.name} · {dateLabel(session.date)}</h2></div>
  </header>
  <div className={preparation.state}>
   <span className={styles.statusBadge} data-tone="neutral">{opened?'모집 시작 완료':'모집 준비 중'}</span>
   <p>{opened?'모집을 시작했습니다. 화면을 갱신하고 있습니다.':started?'운동 시작 시각이 지나 모집을 시작할 수 없습니다.':'아직 회원에게 공개되지 않았습니다. 정보를 확인한 뒤 모집을 시작하세요.'}</p>
  </div>
  {error&&<p role="alert" className={styles.editorMessage}>{error}</p>}
  <ScheduleInformation session={session} editHref={canStart&&!busy&&!opened?editHref:undefined}/>
  {canStart&&<Dialog open={confirmOpen&&!busy&&!opened} onOpenChange={setConfirmOpen}>
   <EditorActionBar busy={busy}><DialogTrigger asChild><Button ref={startButton} disabled={busy||opened}><Send aria-hidden="true"/>{busy?'시작 중…':opened?'모집 시작 완료':'모집 시작'}</Button></DialogTrigger></EditorActionBar>
   <DialogContent onCloseAutoFocus={event=>{event.preventDefault();if(!busy&&!opened)requestAnimationFrame(()=>startButton.current?.focus({preventScroll:true}))}}><DialogHeader><DialogTitle>모집을 시작할까요?</DialogTitle><DialogDescription>회원들에게 일정이 공개되며, 참석 신청을 받을 수 있습니다.</DialogDescription></DialogHeader>
    <DialogFooter className="flex-row justify-end [&>button]:min-h-11"><Button variant="outline" onClick={()=>setConfirmOpen(false)}>취소</Button><Button disabled={busy||opened} onClick={()=>{setConfirmOpen(false);if(!busy&&!opened)onStart()}}>확인</Button></DialogFooter>
   </DialogContent>
  </Dialog>}
 </SideoutShell>;
}
