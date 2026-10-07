'use client';
import {createCommandId} from '@/lib/sideout/command-id';
import {useCallback,useState} from 'react';
import {useSearchParams,usePathname} from 'next/navigation';
import {Button} from '../ui/button';
import {Input} from '../ui/input';
import {Textarea} from '../ui/textarea';
import {ReadState,useRead,useSideout} from './access';
import {SideoutShell} from './shell';
import {useEditGuard} from './use-edit-guard';
import {dateLabel} from './home';
import {validDate,addDays} from '@/lib/sideout/calendar';
import type {ScheduleInput} from '@/lib/sideout/write-model';
import type {SessionDetailView,ClubRecord} from '@/lib/sideout/read-model';
import {SideoutClientError} from '@/lib/sideout-client';
import styles from './sideout.module.css';
import {EditorActions} from './editor-controls';
import controls from './editor-controls.module.css';
const local=(iso:string)=>new Date(Date.parse(iso)+9*3600000).toISOString().slice(0,16);
const instant=(value:string)=>value?new Date(value+':00+09:00').toISOString():'';
function defaults(club:ClubRecord,date:string,now:string):ScheduleInput{
 const start=Date.parse(`${date}T${club.start}:00+09:00`),current=Date.parse(now);let deadline=Date.parse(`${addDays(date,-1)}T18:00:00+09:00`);if(deadline<=current)deadline=current+(start-current)/2;
 const priority=Date.parse(`${addDays(date,-2)}T18:00:00+09:00`);
 return {clubId:club.id,date,entry:club.entry,start:club.start,end:club.end,place:club.place,notice:'',phase:'draft',deadline:new Date(deadline).toISOString(),priorityUntil:priority>current?new Date(priority).toISOString():null,cap:null};
}
type Draft={form:ScheduleInput;baseline:ScheduleInput;revision:number;resourceId?:string;command?:{signature:string;id:string};lastSaved?:string};
function Editor({initial,club,suffix,id,revision}:{initial:ScheduleInput;club:ClubRecord;suffix:string;id?:string;revision:number}){
 const {client,actions,drafts}=useSideout(),cacheKey=`schedule:${id??`${club.id}:${initial.date}`}`;
 const [draft,setDraft]=useState<Draft>(()=>drafts.get(cacheKey) as Draft??{form:initial,baseline:initial,revision,resourceId:id});
 const [tab,setTab]=useState('info'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(draft.lastSaved??'');
 const dirty=JSON.stringify(draft.form)!==JSON.stringify(draft.baseline),guard=useEditGuard(dirty);
 const update=(next:Draft)=>{drafts.set(cacheKey,next);setDraft(next)};
 function change<K extends keyof ScheduleInput>(key:K,value:ScheduleInput[K]){update({...draft,lastSaved:undefined,form:{...draft.form,[key]:value}});setError('');setSaved('')}
 const detailHref=draft.resourceId?'/session/'+encodeURIComponent(draft.resourceId)+suffix:'/home'+suffix;
 async function save(phase:'draft'|'open'){
  setBusy(true);setError('');setSaved('');
  try{const payload={...draft.form,phase},signature=JSON.stringify({id:draft.resourceId,revision:draft.revision,payload}),commandId=draft.command?.signature===signature?draft.command.id:createCommandId();const pending={...draft,command:{signature,id:commandId}};update(pending);
  const result=await client.saveSchedule({commandId,expectedRevision:draft.revision,payload},draft.resourceId);const next={form:payload,baseline:payload,revision:result.revision,resourceId:result.resourceId,lastSaved:phase==='draft'?'준비로 저장했어요.':'저장했어요. 계속 수정할 수 있습니다.'};update(next);drafts.set('schedule:'+result.resourceId,next);guard.saved();setSaved(phase==='draft'?'준비로 저장했어요.':'저장했어요. 계속 수정할 수 있습니다.');if(!draft.resourceId)history.replaceState(history.state,'','/session/'+encodeURIComponent(result.resourceId)+'/schedule/edit'+suffix)}catch(e){setError((e as Error).message);if(e instanceof SideoutClientError&&(e.status===401||e.code==='PASSWORD_CHANGE_REQUIRED'))void actions.refresh()}finally{setBusy(false)}
 }
 const form=draft.form;
 return <SideoutShell title={club.name} subtitle={dateLabel(form.date)+' · 일정 수정'} backHref={detailHref} backLabel={draft.resourceId?'일정 상세로 돌아가기':'모임 홈으로 돌아가기'}>
  <header className={controls.header}><div><h1>{draft.baseline.phase==='open'?'일정 정보 수정':'일정 등록'}</h1></div><EditorActions busy={busy} onCancel={()=>guard.cancel(detailHref)} onSave={()=>void save('open')} saveLabel={draft.baseline.phase==='open'?'저장':'모집 시작'}>{draft.baseline.phase!=='open'&&<Button variant="outline" disabled={busy} onClick={()=>void save('draft')}>준비로 저장</Button>}</EditorActions></header>
  {error&&<div role="alert" className={styles.editorMessage}><p>{error}</p>{error.includes('최신')&&<Button variant="outline" onClick={()=>{if(!dirty||window.confirm('작성 중인 내용을 버리고 최신 정보를 불러올까요?')){drafts.delete(cacheKey);drafts.delete('schedule:'+draft.resourceId);guard.saved();location.reload()}}}>최신 정보 다시 불러오기</Button>}</div>}{saved&&<p role="status" className={styles.editorMessage}>{saved}</p>}
  <form onSubmit={e=>{e.preventDefault();void save('open')}}><fieldset disabled={busy} className={styles.editorFields}><div className={styles.detailLayout}>
   <article className={styles.infoCard}><div className={styles.tabs} role="tablist" aria-label="일정 편집"><button type="button" role="tab" aria-selected={tab==='info'} onClick={()=>setTab('info')}>정보</button><button type="button" role="tab" aria-selected={tab==='notice'} onClick={()=>setTab('notice')}>공지</button></div><div className={styles.infoContent} role="tabpanel">{tab==='info'?<><h2>운동 일정</h2><div className={styles.editorTimeline}>{([['entry','입장 · 몸풀기'],['start','운동 시작'],['end','종료']] as const).map(([key,label])=><label key={key}>{label}<Input type="time" value={form[key]} onChange={e=>change(key,e.target.value)}/></label>)}</div><label className={styles.editorField}>장소<Input value={form.place} maxLength={100} onChange={e=>change('place',e.target.value)}/></label><p className={styles.muted}>{dateLabel(form.date)}</p><p className={styles.muted}>변경한 장소·시간은 이번 운동에만 적용됩니다.</p></>:<label className={styles.editorField}>이번 운동 공지<Textarea rows={7} maxLength={2000} value={form.notice} onChange={e=>change('notice',e.target.value)}/></label>}</div></article>
   <article className={styles.joinCard}><h2>신청 설정</h2><label className={styles.editorCheck}><input type="checkbox" checked={form.priorityUntil!==null} onChange={e=>change('priorityUntil',e.target.checked?form.deadline:null)}/>소속 회원 우선 기간</label>{form.priorityUntil!==null&&<label className={styles.editorField}>우선 신청 종료<Input type="datetime-local" value={form.priorityUntil?local(form.priorityUntil):''} onChange={e=>change('priorityUntil',instant(e.target.value))}/></label>}<label className={styles.editorField}>일반 신청 마감<Input type="datetime-local" value={form.deadline?local(form.deadline):''} onChange={e=>change('deadline',instant(e.target.value))}/></label><label className={styles.editorCheck}><input type="checkbox" checked={form.cap!==null} onChange={e=>change('cap',e.target.checked?24:null)}/>일반 신청 상한</label>{form.cap!==null?<label className={styles.editorField}>일반 신청 상한 (명)<Input type="number" min={1} max={200} value={form.cap||''} onChange={e=>change('cap',Number(e.target.value))}/></label>:<p className={styles.muted}>인원 제한 없음</p>}</article>
  </div></fieldset></form>
 </SideoutShell>;
}
export function ScheduleEditorScreen({id:routeId}:{id?:string}){
 const path=usePathname(),id=routeId??(path.match(/^\/session\/([^/]+)\/schedule\/edit$/)?.[1]?decodeURIComponent(path.split('/')[2]):undefined);
 const {directory,client,actions}=useSideout(),params=useSearchParams(),clubId=params.get('clubId')??'',date=params.get('date')??'';
 const load=useCallback((signal:AbortSignal)=>id?client.session(id,signal):Promise.resolve(null),[client,id]),recheck=useCallback(()=>void actions.refresh(),[actions.refresh]),{data,error,retry}=useRead<SessionDetailView|null>(load,recheck);
 const query=new URLSearchParams();for(const key of ['weekStart','filter']){const value=params.get(key);if(value)query.set(key,value)}const suffix=query.size?'?'+query:'';
 if(id&&!data)return <SideoutShell title="일정 수정"><ReadState error={error} retry={retry}/></SideoutShell>;
 const club=id?data?.club:directory.clubs.find(c=>c.id===clubId);
 if(!club||(id?!data?.capabilities.canEditSchedule:!validDate(date)||!directory.capabilities.managedClubIds?.includes(clubId)||Date.parse(`${date}T${club.start}:00+09:00`)<=Date.parse(directory.serverNow)))return <SideoutShell title="일정 수정"><p role="alert">수정할 수 있는 일정이 아닙니다.</p></SideoutShell>;
 const initial=id?(()=>{const {id:_,...form}=data!.session;return form})():defaults(club,date,directory.serverNow);
 return <Editor key={id??clubId+date} initial={initial} club={club} suffix={suffix} id={id} revision={data?.sessionRevision??0}/>;
}
