import {z} from 'zod';
import {requireBusinessPrincipal} from './business-principal';
import type {SideoutDependencies} from './sideout-query';
import {canManage} from './sideout-query';
import {errorResponse} from './sideout-http';
import {SideoutError,unavailable} from '../sideout/errors';
import {writeEnvelope} from '../sideout/write-model';
import type {RosterRecord} from '../sideout/read-model';
import {registerParticipants,cancelParticipant,settleWaiting,canManagerAdd,type ParticipationMember} from '../sideout/participation';
import {hashSessionToken,parseSessionCookie} from '../auth/session-token';
import type {WriteDependencies} from './sideout-write';
import {conflict} from './sideout-write-store';
const inputSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('register'),sessionRevision:z.number().int().nonnegative()}).strict(),
 z.object({action:z.literal('cancel'),sessionRevision:z.number().int().nonnegative()}).strict(),
 z.object({action:z.literal('add'),sessionRevision:z.number().int().nonnegative(),memberIds:z.array(z.string().min(1).max(128)).min(1).max(100).refine(a=>new Set(a).size===a.length)}).strict(),
 z.object({action:z.literal('remove'),sessionRevision:z.number().int().nonnegative(),memberId:z.string().min(1).max(128)}).strict(),
]);
export type ParticipantCommand=z.infer<typeof inputSchema>;
const denied=()=>new SideoutError('FORBIDDEN',403,'이 명단을 변경할 권한이 없습니다.');
export async function participationMembers(deps:SideoutDependencies,ids:string[]):Promise<ParticipationMember[]>{
 return deps.store.getParticipationMembers([...new Set(ids)]);
}
// Materialize time-based promotions on reads. Both schedule and roster revisions are
// guarded; every viewer sees the same committed roster, never a per-viewer projection.
export async function settledSnapshot(id:string,deps:SideoutDependencies){
 for(let attempt=0;attempt<4;attempt++){
  const session=await deps.store.getSession(id);if(!session)return null;
  const roster=await deps.store.getRoster(id);if(!roster)throw unavailable();
  const members=await participationMembers(deps,Object.entries(roster.value.participants).filter(([,p])=>p.status==='waiting'&&p.waitReason&&p.waitReason!=='closed').map(([id])=>id));
  const next=settleWaiting(session.value,roster.value,members,deps.now());
  if(JSON.stringify(next)===JSON.stringify(roster.value))return {session,roster};
  const promoted=members.filter(m=>m.active&&next.participants[m.memberId]?.status==='applied');
  if(await deps.store.compareAndSetRoster(session,roster,next,promoted))return {session,roster:{value:next,revision:roster.revision+1}};
 }
 throw conflict();
}
export async function candidateView(id:string,deps:SideoutDependencies,actor:Awaited<ReturnType<typeof requireBusinessPrincipal>>){
 const session=await deps.store.getSession(id);if(!session)throw new SideoutError('NOT_FOUND',404,'일정을 찾을 수 없습니다.');if(!canManage(actor,session.value.clubId))throw denied();
 const snapshot=await settledSnapshot(id,deps);if(!snapshot)throw unavailable();
 if(!canManage(actor,snapshot.session.value.clubId))throw denied();
 if(!canManagerAdd(snapshot.session.value,snapshot.roster.value,deps.now()))throw new SideoutError('INVALID_INPUT',400,'회원 추가가 가능한 일정이 아닙니다.');
 const clubs=await deps.store.listClubs(),members=await deps.store.listCandidateIdentities();
 return {sessionRevision:snapshot.session.revision,rosterRevision:snapshot.roster.revision,members:members.filter(m=>!['applied','waiting'].includes(snapshot.roster.value.participants[m.memberId]?.status)).map(m=>({memberId:m.memberId,displayName:m.displayName,homeClubId:m.homeClubId,clubName:clubs.find(c=>c.id===m.homeClubId)?.name??null}))};
}
export async function handleParticipantWrite(request:Request,id:string,deps:WriteDependencies){
 try{
  const actor=await requireBusinessPrincipal(request,deps.authRepo,deps.now());
  if(request.method!=='POST'||request.headers.get('origin')!==new URL(request.url).origin)throw denied();
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new SideoutError('INVALID_INPUT',400,'입력을 확인해 주세요.');
  const raw=await request.text();let command,payload;try{if(raw.length>16000)throw Error();command=writeEnvelope.parse(JSON.parse(raw));payload=inputSchema.parse(command.payload)}catch{throw new SideoutError('INVALID_INPUT',400,'입력을 확인해 주세요.')}
  const session=await deps.store.getSession(id);if(!session)throw new SideoutError('NOT_FOUND',404,'일정을 찾을 수 없습니다.');
  const manager=payload.action==='add'||payload.action==='remove';if(manager&&!canManage(actor,session.value.clubId))throw denied();
  const respond=async(result:unknown)=>{const current=await requireBusinessPrincipal(request,deps.authRepo,deps.now());if(current.authorizationVersion!==actor.authorizationVersion||current.memberId!==actor.memberId)throw denied();return Response.json({ok:true,data:result},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}})};
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({id,...command,payload})));
  const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
  const previous=await deps.writeStore.receipt(actor.memberId,command.commandId);if(previous){if(previous.hash!==hash)throw conflict();return await respond(previous.result)}
  const roster=await deps.store.getRoster(id);if(!roster)throw unavailable();
  if(command.expectedRevision!==roster.revision||payload.sessionRevision!==session.revision)throw conflict();
  const targets=payload.action==='add'?payload.memberIds:payload.action==='remove'?[payload.memberId]:[actor.memberId];
  const members=await participationMembers(deps,[...targets,...Object.keys(roster.value.participants)]),now=deps.now();
  let next:RosterRecord=settleWaiting(session.value,roster.value,members,now);
  next=payload.action==='register'||payload.action==='add'?registerParticipants(session.value,next,targets.map(id=>members.find(m=>m.memberId===id)??{memberId:id,homeClubId:null,active:false,version:0}),now,manager?'manager':'self'):cancelParticipant(session.value,next,targets[0],now,manager);
  next=settleWaiting(session.value,next,members,now);
  const result=await deps.writeStore.commit({actor,tokenHash:await hashSessionToken(parseSessionCookie(request.headers.get('cookie'))!),now,commandId:command.commandId,hash,guards:[{key:`sideout:session:${id}`,revision:session.revision},{key:`sideout:roster:${id}`,revision:roster.revision}],members:members.filter(m=>m.active&&(targets.includes(m.memberId)||roster.value.participants[m.memberId]?.status==='waiting'&&next.participants[m.memberId]?.status==='applied')),writes:[{key:`sideout:roster:${id}`,data:next,revision:roster.revision+1}],result:{resourceId:id,revision:roster.revision+1}});
  return await respond(result);
 }catch(error){return errorResponse(error)}
}
