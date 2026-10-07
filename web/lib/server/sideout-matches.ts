import {requireBusinessPrincipal} from './business-principal';
import {canManage} from './sideout-query';
import {errorResponse} from './sideout-http';
import {conflict} from './sideout-write-store';
import type {WriteDependencies} from './sideout-write';
import {SideoutError,unavailable} from '../sideout/errors';
import {started} from '../sideout/participation';
import {matchSaveInput,matchSaveVisibility,matchSource,type MatchEditorView} from '../sideout/match-editor';
import {generateTeamMatches,validateMatchPlan} from '../sideout/match-plan';
import {writeEnvelope} from '../sideout/write-model';
import {hashSessionToken,parseSessionCookie} from '../auth/session-token';
const denied=()=>new SideoutError('FORBIDDEN',403,'경기 순서를 수정할 권한이 없습니다.');
const bad=(message='경기 순서 입력을 확인해 주세요.')=>new SideoutError('INVALID_INPUT',400,message);
export async function handleMatchOrder(request:Request,id:string,deps:WriteDependencies):Promise<Response>{
 try{
  const actor=await requireBusinessPrincipal(request,deps.authRepo,deps.now()),session=await deps.store.getSession(id);
  if(!session)throw new SideoutError('NOT_FOUND',404,'일정을 찾을 수 없습니다.');
  if(!canManage(actor,session.value.clubId))throw denied();
  const respond=async(data:unknown)=>{const current=await requireBusinessPrincipal(request,deps.authRepo,deps.now());if(current.memberId!==actor.memberId||current.authorizationVersion!==actor.authorizationVersion)throw denied();return Response.json({ok:true,data},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}})};
  let command:ReturnType<typeof writeEnvelope.parse>|undefined,payload:ReturnType<typeof matchSaveInput.parse>|undefined,hash='';
  if(request.method==='POST'){
   if(request.headers.get('origin')!==new URL(request.url).origin)throw denied();
   if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw bad();
   const raw=await request.text();if(raw.length>65536)throw bad();
   try{command=writeEnvelope.parse(JSON.parse(raw));payload=matchSaveInput.parse(command.payload)}catch{throw bad()}
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({resource:'match-order',id,...command,payload})));
   hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
   const previous=await deps.writeStore.receipt(actor.memberId,command.commandId);if(previous){if(previous.hash!==hash)throw conflict();return await respond(previous.result)}
  }else if(request.method!=='GET')throw bad();
  if(session.value.phase!=='open'||started(session.value,deps.now()))throw bad('운동 시작 전 공개 모집 일정에서만 경기 순서를 수정할 수 있습니다.');
  const roster=await deps.store.getRoster(id);if(!roster)throw unavailable();
  const source=matchSource(roster.value),teamIds=source?.teams.map(t=>t.id)??[],generated=generateTeamMatches(teamIds);
  if(!generated)throw bad('팀편성을 3~4팀으로 먼저 저장해 주세요.');
  const visibility=matchSaveVisibility(roster.value);
  if(request.method==='GET'){
   const club=await deps.store.getClub(session.value.clubId);if(!club)throw unavailable();
   const saved=roster.value.draft.teams.length?roster.value.draftMatches:roster.value.publishedMatches;
   const plan=saved&&!validateMatchPlan(saved,teamIds)?saved:generated;
   // Do not return a mixed snapshot if team/schedule changed during the read.
   const latest=await deps.store.getSession(id);if(!latest||latest.revision!==session.revision)throw conflict();
   if(!canManage(actor,latest.value.clubId))throw denied();
   const view:MatchEditorView={session:session.value,club,sessionRevision:session.revision,rosterRevision:roster.revision,teams:source!.teams.map(({id,title})=>({id,title})),plan,saveVisibility:visibility};
   return await respond(view);
  }
  if(!command||!payload)throw bad();
  if(command.expectedRevision!==roster.revision||payload.sessionRevision!==session.revision)throw conflict();
  const error=validateMatchPlan(payload.plan,teamIds);if(error)throw bad(error);
  const next=structuredClone(roster.value);
  // Legacy published-only records need the same team source as their saved match plan.
  if(!next.draft.teams.length)next.draft=structuredClone(source!);
  next.draftMatches=structuredClone(payload.plan);
  if(visibility==='attendees')next.publishedMatches=structuredClone(payload.plan);
  const result=await deps.writeStore.commit({actor,tokenHash:await hashSessionToken(parseSessionCookie(request.headers.get('cookie'))!),now:deps.now(),commandId:command.commandId,hash,guards:[{key:`sideout:session:${id}`,revision:session.revision},{key:`sideout:roster:${id}`,revision:roster.revision}],writes:[{key:`sideout:roster:${id}`,data:next,revision:roster.revision+1}],result:{resourceId:id,revision:roster.revision+1}});
  return await respond(result);
 }catch(error){return errorResponse(error)}
}
