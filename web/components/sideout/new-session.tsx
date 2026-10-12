'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import type {ClubRecord} from '@/lib/sideout/read-model';
import {validDate} from '@/lib/sideout/calendar';
import {scheduleDefaults} from '@/lib/sideout/schedule-defaults';
import {createCommandId} from '@/lib/sideout/command-id';
import {SideoutClientError} from '@/lib/sideout-client';
import {useSideout} from './access';
import {SideoutShell} from './shell';
import {PreparedScheduleView} from './prepared-session-detail';
import {ScheduleEditorScreen} from './schedule-editor';
import {useEditGuard} from './use-edit-guard';

function NewPreparation({club,date,suffix,editHref}:{club:ClubRecord;date:string;suffix:string;editHref:string}){
 const {client,actions,directory}=useSideout();
 const [form]=useState(()=>scheduleDefaults(club,date,directory.serverNow));
 const [destination,setDestination]=useState('');
 const [busy,setBusy]=useState(false),[opened,setOpened]=useState(false),[error,setError]=useState('');
 const operation=useRef(false),command=useRef<string|null>(null);
 useEditGuard(false,{blocked:busy});
 // Navigate after the committed idle state clears the in-flight unload guard.
 useEffect(()=>{if(destination)window.location.assign(destination)},[destination]);
 async function start(){
  if(operation.current||opened)return;
  operation.current=true;setBusy(true);setError('');
  command.current??=createCommandId();
  try{
   const result=await client.saveSchedule({commandId:command.current,expectedRevision:0,payload:{...form,phase:'open'}});
   setOpened(true);
   setDestination('/session/'+encodeURIComponent(result.resourceId)+suffix);
  }catch(e){
   setError((e as Error).message);
   if(e instanceof SideoutClientError&&(e.status===401||e.code==='PASSWORD_CHANGE_REQUIRED'))void actions.refresh();
  }finally{operation.current=false;setBusy(false)}
 }
 return <PreparedScheduleView session={form} club={club} busy={busy} opened={opened} error={error} editHref={editHref} onStart={()=>void start()}/>;
}

export function NewSessionScreen(){
 const {directory}=useSideout(),params=useSearchParams(),path=usePathname();
 if(params.get('edit')==='1'||/^\/session\/[^/]+\/schedule\/edit$/.test(path))return <ScheduleEditorScreen/>;
 const clubId=params.get('clubId')??'',date=params.get('date')??'',club=directory.clubs.find(c=>c.id===clubId);
 if(!club||!validDate(date)||!directory.capabilities.managedClubIds?.includes(clubId)||Date.parse(`${date}T${club.start}:00+09:00`)<=Date.parse(directory.serverNow))return <SideoutShell title="운동 상세" floatingReturn><p role="alert">등록할 수 있는 일정이 아닙니다.</p></SideoutShell>;
 const query=new URLSearchParams();for(const key of ['weekStart','filter']){const value=params.get(key);if(value)query.set(key,value)}
 const suffix=query.size?'?'+query:'',edit=new URLSearchParams(query);edit.set('clubId',clubId);edit.set('date',date);edit.set('edit','1');
 return <NewPreparation key={clubId+date} club={club} date={date} suffix={suffix} editHref={'/session/new?'+edit}/>;
}
