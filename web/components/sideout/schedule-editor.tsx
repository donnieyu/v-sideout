'use client';
import {useAppConfirm} from './confirm-dialog';
import {createCommandId} from '@/lib/sideout/command-id';
import {useCallback,useRef,useState,useEffect} from 'react';
import {useSearchParams,usePathname} from 'next/navigation';
import {Button} from '../ui/button';
import {ReadState,useRead,useSideout} from './access';
import {SideoutShell} from './shell';
import {useEditGuard} from './use-edit-guard';
import {dateLabel} from './home';
import {validDate} from '@/lib/sideout/calendar';
import {scheduleInput,type ScheduleInput} from '@/lib/sideout/write-model';
import type {SessionDetailView,ClubRecord} from '@/lib/sideout/read-model';
import {SideoutClientError} from '@/lib/sideout-client';
import styles from './sideout.module.css';
import {EditorActions} from './editor-controls';
import controls from './editor-controls.module.css';
import registration from './schedule-registration.module.css';
import {scheduleDefaults} from '@/lib/sideout/schedule-defaults';
import {RegistrationFields} from './schedule-registration';

type Draft={form:ScheduleInput;baseline:ScheduleInput;revision:number;resourceId?:string;command?:{signature:string;id:string};lastSaved?:string};
function Editor({initial,club,suffix,id,revision,noticeEntry=false}:{noticeEntry?:boolean;initial:ScheduleInput;club:ClubRecord;suffix:string;id?:string;revision:number}){
 const confirm=useAppConfirm();
 const {client,actions,drafts}=useSideout(),cacheKey=`schedule:${id??`${club.id}:${initial.date}`}`;
 const [draft,setDraft]=useState<Draft>(()=>drafts.get(cacheKey) as Draft??{form:initial,baseline:initial,revision,resourceId:id});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(draft.lastSaved??'');
 const [invalidFields,setInvalidFields]=useState<string[]>([]),operation=useRef(false),formRef=useRef<HTMLFormElement>(null),current=useRef(draft);
 const dirty=JSON.stringify(draft.form)!==JSON.stringify(draft.baseline),guard=useEditGuard(dirty,{blocked:busy,onLeave:()=>{drafts.delete(cacheKey);if(current.current.resourceId)drafts.delete('schedule:'+current.current.resourceId)}});
 const update=(next:Draft)=>{current.current=next;drafts.set(cacheKey,next);if(next.resourceId)drafts.set('schedule:'+next.resourceId,next);setDraft(next)};
 function change<K extends keyof ScheduleInput>(key:K,value:ScheduleInput[K]){update({...draft,lastSaved:undefined,form:{...draft.form,[key]:value}});setInvalidFields(fields=>fields.filter(field=>field!==key));setError('');setSaved('')}
 const detailHref=draft.resourceId?'/session/'+encodeURIComponent(draft.resourceId)+suffix:'/session/new?'+new URLSearchParams({...Object.fromEntries(new URLSearchParams(suffix.slice(1))),clubId:club.id,date:initial.date});
 async function save(){
  if(operation.current)return;
  const phase=draft.baseline.phase;
  const checked=scheduleInput.safeParse({...draft.form,phase});
  if(!checked.success){const fields=checked.error.issues.map(issue=>String(issue.path[0]));setInvalidFields(fields);setError('입력하지 않았거나 올바르지 않은 항목을 확인해 주세요.');requestAnimationFrame(()=>{const field=formRef.current?.querySelector<HTMLElement>(`[name="${fields[0]}"]`);field?.scrollIntoView?.({block:'center'});field?.focus()});return}
  operation.current=true;setInvalidFields([]);setBusy(true);setError('');setSaved('');
  try{const payload={...draft.form,phase},signature=JSON.stringify({id:draft.resourceId,revision:draft.revision,payload}),commandId=draft.command?.signature===signature?draft.command.id:createCommandId();const pending={...draft,command:{signature,id:commandId}};update(pending);
  const result=await client.saveSchedule({commandId,expectedRevision:draft.revision,payload},draft.resourceId);const next={form:payload,baseline:payload,revision:result.revision,resourceId:result.resourceId,lastSaved:phase==='draft'?'준비로 저장했어요.':'저장했어요. 계속 수정할 수 있습니다.'};update(next);drafts.set('schedule:'+result.resourceId,next);guard.saved();setSaved(phase==='draft'?'준비로 저장했어요.':'저장했어요. 계속 수정할 수 있습니다.');if(!draft.resourceId)history.replaceState(history.state,'','/session/'+encodeURIComponent(result.resourceId)+'/schedule/edit'+suffix)}catch(e){setError((e as Error).message);if(e instanceof SideoutClientError&&(e.status===401||e.code==='PASSWORD_CHANGE_REQUIRED'))void actions.refresh()}finally{operation.current=false;setBusy(false)}
 }
 useEffect(()=>{if(noticeEntry)formRef.current?.querySelector('[name=notice]')?.scrollIntoView?.({block:'start'})},[noticeEntry]);
 const form=draft.form;
 return <SideoutShell formEditor actionBar returnHidden={busy} contentHeading title={club.name} subtitle={dateLabel(form.date)+' · 일정 수정'} backHref={detailHref} backLabel="운동 상세로">
  <section className={registration.editor} aria-label="일정 편집기">
  <header className={controls.header} data-schedule-actions><div><h1>일정 정보 수정</h1><p className={styles.pageContext}>{club.name} · {dateLabel(form.date)}</p></div><EditorActions floating busy={busy} onSave={()=>void save()} saveLabel="저장"/></header>
  <div className={registration.scroll} data-registration-scroll>
  {error&&<div role="alert" className={styles.editorMessage}><p>{error}</p>{error.includes('최신')&&<Button variant="outline" onClick={async()=>{if(!dirty||await confirm({title:'최신 정보를 다시 불러올까요?',description:'작성 중인 일정 정보 변경사항은 사라집니다.',confirmLabel:'다시 불러오기'})){drafts.delete(cacheKey);drafts.delete('schedule:'+draft.resourceId);guard.saved();location.reload()}}}>최신 정보 다시 불러오기</Button>}</div>}{saved&&<p role="status" className={styles.editorMessage}>{saved}</p>}
  <form ref={formRef} onSubmit={e=>{e.preventDefault();void save()}}><fieldset disabled={busy} className={styles.editorFields}><RegistrationFields value={form} onChange={change} invalidFields={invalidFields}/></fieldset></form>
  </div></section>
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
 const initial=id?(()=>{const {id:_,...form}=data!.session;return form})():scheduleDefaults(club,date,directory.serverNow);
 return <Editor key={id??clubId+date} initial={initial} club={club} suffix={suffix} id={id} revision={data?.sessionRevision??0} noticeEntry={params.get('section')==='notice'}/>;
}
