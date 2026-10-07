import {hashSessionToken,parseSessionCookie} from '../auth/session-token';
import {scheduleInput,preferencesInput,writeEnvelope,type ScheduleInput} from '../sideout/write-model';
import {SideoutError} from '../sideout/errors';
import {errorResponse} from './sideout-http';
import {requireBusinessPrincipal} from './business-principal';
import {canManage,type SideoutDependencies} from './sideout-query';
import {conflict,type SideoutWriteStore} from './sideout-write-store';
import type {SessionRecord} from '../sideout/read-model';
export type WriteResource='create'|'update'|'preferences';
export type WriteDependencies=SideoutDependencies&{writeStore:SideoutWriteStore};
const bad=(message='입력 내용을 확인해 주세요.')=>new SideoutError('INVALID_INPUT',400,message);
const forbidden=()=>new SideoutError('FORBIDDEN',403,'이 작업을 수행할 권한이 없습니다.');
function validateSchedule(value:ScheduleInput,now:Date,original?:SessionRecord){
 const start=Date.parse(`${value.date}T${value.start}:00+09:00`),deadline=Date.parse(value.deadline),priority=value.priorityUntil?Date.parse(value.priorityUntil):null;
 if(value.entry>value.start||value.start>=value.end)throw bad('입장 → 운동 시작 → 종료 순서로 확인해 주세요.');
 if(start<=now.getTime()||original&&Date.parse(`${original.date}T${original.start}:00+09:00`)<=now.getTime())throw bad('이미 시작한 운동은 수정하거나 등록할 수 없습니다.');
 if(deadline>=start||deadline<=now.getTime()&&value.deadline!==original?.deadline)throw bad('신청 마감은 현재 이후, 운동 시작 전이어야 합니다.');
 if(priority!==null&&(priority>deadline||priority<=now.getTime()&&value.priorityUntil!==original?.priorityUntil))throw bad('우선 신청 종료 시각을 확인해 주세요.');
 if(original&&(original.clubId!==value.clubId||original.date!==value.date||original.phase==='open'&&value.phase==='draft'))throw bad('모임·날짜 및 모집 상태는 되돌릴 수 없습니다.');
}
export async function handleSideoutWrite(request:Request,resource:WriteResource,deps:WriteDependencies,id?:string){
 try{
  if(request.method!=='POST')throw bad();
  const actor=await requireBusinessPrincipal(request,deps.authRepo,deps.now());
  if(request.headers.get('origin')!==new URL(request.url).origin)throw forbidden();
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw bad();
  const raw=await request.text();if(raw.length>16000)throw bad();
  let parsed;try{parsed=writeEnvelope.parse(JSON.parse(raw))}catch{throw bad()}
  const schema=resource==='preferences'?preferencesInput:scheduleInput;
  const validation=schema.safeParse(parsed.payload);if(!validation.success)throw bad();
  const payload=validation.data,token=parseSessionCookie(request.headers.get('cookie'))!;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({resource,id:id??null,...parsed,payload})));
  const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  let original=null;
  if(resource==='update'){
   if(!id||id.length>128)throw bad();original=await deps.store.getSession(id);
   if(!original)throw new SideoutError('NOT_FOUND',404,'일정을 찾을 수 없습니다.');
   if(!canManage(actor,original.value.clubId))throw forbidden();
  }
  if(resource!=='preferences'&&!canManage(actor,(payload as ScheduleInput).clubId))throw forbidden();
  const respond=async(result:unknown)=>{
   const current=await requireBusinessPrincipal(request,deps.authRepo,deps.now());
   if(current.memberId!==actor.memberId||current.authorizationVersion!==actor.authorizationVersion)throw forbidden();
   return Response.json({ok:true,data:result},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
  };
  const old=await deps.writeStore.receipt(actor.memberId,parsed.commandId);
  if(old){if(old.hash!==hash)throw conflict();return await respond(old.result)}
  const command={actor,tokenHash:await hashSessionToken(token),now:deps.now(),commandId:parsed.commandId,hash};
  let result;
  if(resource==='preferences'){
   const value=preferencesInput.parse(payload);const clubs=await deps.store.listClubs();if(value.favoriteClubIds.some(id=>!clubs.some(c=>c.id===id)))throw bad('모임을 확인해 주세요.');
   const key=`sideout:preferences:${actor.memberId}`,revision=await deps.writeStore.revision(key);if(revision!==parsed.expectedRevision)throw conflict();
   result=await deps.writeStore.commit({...command,guards:[{key,revision:revision||null}],writes:[{key,data:value,revision:revision+1}],result:{resourceId:actor.memberId,revision:revision+1}});
  }else{
   const value=scheduleInput.parse(payload);if(!await deps.store.getClub(value.clubId))throw bad('모임을 확인해 주세요.');validateSchedule(value,command.now,original?.value);
   if(parsed.expectedRevision!==(original?.revision??0))throw conflict();
   const resourceId=original?.value.id??crypto.randomUUID(),key=`sideout:session:${resourceId}`,revision=(original?.revision??0)+1;
   const guards=[{key,revision:original?.revision??null}],writes=[{key,data:{...value,id:resourceId} as unknown,revision}];
   if(!original){const rosterKey=`sideout:roster:${resourceId}`;guards.push({key:rosterKey,revision:null});writes.push({key:rosterKey,data:{sessionId:resourceId,participants:{},draft:{teams:[]},published:null,firstPublishedAt:null,draftMatches:null,publishedMatches:null},revision:1})}
   result=await deps.writeStore.commit({...command,guards,writes,result:{resourceId,revision},...(!original?{uniqueSession:{clubId:value.clubId,date:value.date}}:{})});
  }
  return await respond(result);
 }catch(e){return errorResponse(e)}
}
