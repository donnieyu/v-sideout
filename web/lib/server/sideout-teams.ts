import {requireBusinessPrincipal} from './business-principal';
import {canManage} from './sideout-query';
import {errorResponse} from './sideout-http';
import {SideoutError,unavailable} from '../sideout/errors';
import {saveTeamDraft,teamDraftInput} from '../sideout/team-draft';
import {publishTeams,teamPublishInput} from '../sideout/team-publish';
import {unpublishTeams,teamUnpublishInput} from '../sideout/team-unpublish';
import {writeEnvelope} from '../sideout/write-model';
import {settleWaiting,started,isPublished} from '../sideout/participation';
import {settledSnapshot} from './sideout-participation';
import type {EditorPerson} from '../sideout/team-editor';
import {conflict} from './sideout-write-store';
import type {WriteDependencies} from './sideout-write';
import {hashSessionToken,parseSessionCookie} from '../auth/session-token';
const denied=()=>new SideoutError('FORBIDDEN',403,'팀편성을 수정할 권한이 없습니다.');
const bad=()=>new SideoutError('INVALID_INPUT',400,'팀편성 입력을 확인해 주세요.');
/** Draft and confirmed publication commands share the same atomic revision boundary. */
export async function handleTeamDraft(request:Request,id:string,deps:WriteDependencies):Promise<Response>{
 try{
  const actor=await requireBusinessPrincipal(request,deps.authRepo,deps.now());
  const scheduled=await deps.store.getSession(id);if(!scheduled)throw new SideoutError('NOT_FOUND',404,'일정을 찾을 수 없습니다.');
  if(!canManage(actor,scheduled.value.clubId))throw denied();
  const respond=async(data:unknown)=>{
   const current=await requireBusinessPrincipal(request,deps.authRepo,deps.now());
   if(current.memberId!==actor.memberId||current.authorizationVersion!==actor.authorizationVersion)throw denied();
   return Response.json({ok:true,data},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
  };
  if(request.method==='GET'){
   if(scheduled.value.phase!=='open'||started(scheduled.value,deps.now()))throw bad();
   const snapshot=await settledSnapshot(id,deps);if(!snapshot)throw unavailable();
   if(!canManage(actor,snapshot.session.value.clubId))throw denied();
   if(snapshot.session.value.phase!=='open'||started(snapshot.session.value,deps.now()))throw bad();
   const teamPublished=isPublished(snapshot.roster.value);
   const identities=await deps.store.listCandidateIdentities(),clubs=new Map((await deps.store.listClubs()).map(c=>[c.id,c.name]));
   const people:EditorPerson[]=identities.flatMap(m=>{const status=snapshot.roster.value.participants[m.memberId]?.status;if(teamPublished&&(!status||status==='cancelled'))return [];return [{id:m.memberId,name:m.displayName,club:m.homeClubId?clubs.get(m.homeClubId)??'소속 미확인':'무소속',position:null,secondary:null,status:status==='applied'?'신청자':status==='waiting'?'대기자':'미신청 회원'}]});
   // Preserve occupied slots as named, inactive identities; these are not candidates.
   const known=new Set(people.map(p=>p.id));
   const missing=[...new Set([...snapshot.roster.value.draft.teams,...(snapshot.roster.value.published?.teams??[])].flatMap(t=>t.players.map(p=>p.memberId)))].filter(id=>!known.has(id));
   const retained=await deps.store.getParticipationMembers(missing);
   for(const memberId of missing){const member=retained.find(m=>m.memberId===memberId);if(!member)throw unavailable();const status=snapshot.roster.value.participants[memberId]?.status;people.push({id:memberId,name:member.displayName,club:member.homeClubId?clubs.get(member.homeClubId)??'소속 미확인':'무소속',position:null,secondary:null,active:false,status:status==='applied'?'신청자':status==='waiting'?'대기자':'미신청 회원'})}
   const profiles=new Map((await deps.store.getPositionProfiles(people.filter(p=>p.active!==false).map(p=>p.id))).map(p=>[p.memberId,p]));
   for(const person of people){const profile=profiles.get(person.id);if(profile){person.position=profile.position;person.secondary=profile.secondary}}
   return await respond({sessionId:id,sessionRevision:snapshot.session.revision,rosterRevision:snapshot.roster.revision,people,hasSavedDraft:snapshot.roster.value.draft.teams.length>0,publishedLineup:snapshot.roster.value.published,publishedMatches:snapshot.roster.value.publishedMatches,draft:snapshot.roster.value.draft,draftMatches:snapshot.roster.value.draftMatches,teamPublished:isPublished(snapshot.roster.value)});
  }
  if(request.method!=='POST')throw bad();
  if(request.headers.get('origin')!==new URL(request.url).origin)throw denied();
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw bad();
  const raw=await request.text();if(raw.length>131072)throw bad();
  let command,payload;try{command=writeEnvelope.parse(JSON.parse(raw));payload=teamDraftInput.or(teamPublishInput).or(teamUnpublishInput).parse(command.payload)}catch{throw bad()}
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({resource:payload.action==='save'?'team-draft':'team-'+payload.action,id,...command,payload})));
  const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
  const previous=await deps.writeStore.receipt(actor.memberId,command.commandId);
  if(previous){if(previous.hash!==hash)throw conflict();return await respond(previous.result)}
  const roster=await deps.store.getRoster(id);if(!roster)throw unavailable();
  if(command.expectedRevision!==roster.revision||payload.sessionRevision!==scheduled.revision)throw conflict();
  const placed=new Set((payload.action==='unpublish'?{teams:[]}:payload.lineup).teams.flatMap(t=>t.players.map(p=>p.memberId)));
  const members=await deps.store.getParticipationMembers([...new Set([...placed,...Object.keys(roster.value.participants)])]),now=deps.now();
  const settled=settleWaiting(scheduled.value,roster.value,members,now);
  const next=payload.action==='unpublish'?unpublishTeams(scheduled.value,roster.value,payload.draftSource,now):(payload.action==='publish'?publishTeams:saveTeamDraft)(scheduled.value,settled,payload.lineup,payload.confirmedMemberIds,members,now);
  const memberGuards=members.filter(m=>placed.has(m.memberId)||roster.value.participants[m.memberId]?.status!==next.participants[m.memberId]?.status);
  const result=await deps.writeStore.commit({actor,tokenHash:await hashSessionToken(parseSessionCookie(request.headers.get('cookie'))!),now,commandId:command.commandId,hash,guards:[{key:`sideout:session:${id}`,revision:scheduled.revision},{key:`sideout:roster:${id}`,revision:roster.revision}],members:memberGuards,writes:[{key:`sideout:roster:${id}`,data:next,revision:roster.revision+1}],result:{resourceId:id,revision:roster.revision+1}});
  return await respond(result);
 }catch(error){return errorResponse(error)}
}
