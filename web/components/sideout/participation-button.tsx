'use client';
import {createCommandId} from '@/lib/sideout/command-id';
import {useState} from 'react';
import {Button} from '../ui/button';
import {useSideout} from './access';
import {SideoutClientError} from '@/lib/sideout-client';
import type {SessionCardView} from '@/lib/sideout/read-model';
export const notifyRoster=()=>window.dispatchEvent(new Event('sideout:roster'));
export function ParticipationButton({card}:{card:SessionCardView}){
 const {client,actions}=useSideout(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[command,setCommand]=useState<{signature:string;id:string}|null>(null);
 const joined=card.selfStatus==='applied'||card.selfStatus==='waiting';
 const enabled=card.participation&&(joined?card.participation.canCancel:!card.teamPublished&&card.participation.canRegister);
 const label=joined?(card.teamPublished||card.participation?.canCancel===false?'취소 불가':card.selfStatus==='waiting'?'대기 취소':'참석 취소'):(card.teamPublished||card.participation?.canRegister===false?'접수 종료':card.participation?.registerLabel??(card.teamPublished?'대기자 등록':'참석 신청'));
 async function act(){
  if(busy||!enabled)return;if(joined&&!window.confirm(card.selfStatus==='waiting'?'대기 등록을 취소할까요?':'참석 신청을 취소할까요?'))return;
  setBusy(true);setError('');const payload={action:joined?'cancel' as const:'register' as const,sessionRevision:card.sessionRevision},expectedRevision=card.rosterRevision!;
  try{const signature=JSON.stringify({payload,expectedRevision}),commandId=command?.signature===signature?command.id:createCommandId();setCommand({signature,id:commandId});
  await client.participate(card.session.id,{commandId,expectedRevision,payload});setCommand(null);notifyRoster()}
  catch(e){setError((e as Error).message);if(e instanceof SideoutClientError&&(e.status===401||e.code==='PASSWORD_CHANGE_REQUIRED'))void actions.refresh();else if(e instanceof SideoutClientError&&e.status===409)notifyRoster()}
  finally{setBusy(false)}
 }
 return <><Button variant="outline" disabled={!enabled||busy} onClick={()=>void act()}>{busy?'처리 중…':label}</Button>{error&&<p role="alert">{error}</p>}</>;
}
