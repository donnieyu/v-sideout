import {settledSnapshot} from './sideout-participation';
import {canRegister,canManagerAdd,canCancel,registrationState,isPublished} from '../sideout/participation';
import type {AuthRepository} from '../auth/auth-service';
import type {VerifiedPrincipal} from '../auth/contracts';
import {addDays,kstWeekStart} from '../sideout/calendar';
import {invalid,SideoutError,unavailable} from '../sideout/errors';
import type {ClubsView,HomeView,SessionCardView,SessionDetailView,ReadSelection,Versioned,SessionRecord,RosterRecord,MemberLabel} from '../sideout/read-model';
import type {SideoutStore} from './sideout-store';
export type SideoutDependencies={authRepo:AuthRepository;store:SideoutStore;now:()=>Date};
export function canManage(p:VerifiedPrincipal,clubId:string){return p.isMaster||p.grants.some(g=>g.clubId===clubId)}
const notFound=()=>new SideoutError('NOT_FOUND',404,'일정을 찾을 수 없습니다.');
export async function getClubsView(p:VerifiedPrincipal,store:SideoutStore,now:Date):Promise<ClubsView>{return {serverNow:now.toISOString(),clubs:await store.listClubs(),capabilities:{canManageMembers:p.isMaster,managedClubIds:(await store.listClubs()).filter(c=>canManage(p,c.id)).map(c=>c.id)}}}
async function card(p:VerifiedPrincipal,s:Versioned<SessionRecord>,r:RosterRecord,store:SideoutStore,now:Date,rosterRevision:number):Promise<SessionCardView>{
 const club=await store.getClub(s.value.clubId);if(!club)throw unavailable();
 const selfStatus=r.participants[p.memberId]?.status??null;
 const manager=canManage(p,club.id);
 const hasPublished=isPublished(r);
 return {session:s.value,club,sessionRevision:s.revision,counts:{applicants:Object.values(r.participants).filter(m=>m.status==='applied').length,waiting:Object.values(r.participants).filter(m=>m.status==='waiting').length},selfStatus,teamPublished:hasPublished,publicationWithdrawn:r.publicationState==='withdrawn',canViewPublishedTeams:hasPublished&&(manager||selfStatus==='applied'||!!r.published?.teams.some(t=>t.players.some(m=>m.memberId===p.memberId))),canManage:manager,rosterRevision,participation:{canRegister:canRegister(s.value,r,now)&&selfStatus!=='applied'&&selfStatus!=='waiting',canCancel:!!selfStatus&&selfStatus!=='cancelled'&&canCancel(s.value,r,now),registerLabel:!canRegister(s.value,r,now)?'접수 종료':registrationState(s.value,r,p,now).status==='waiting'?'대기자 등록':'참석 신청'}};
}
export async function getHomeView(p:VerifiedPrincipal,selection:ReadSelection,deps:SideoutDependencies):Promise<HomeView>{
 const {store}=deps,clubs=await store.listClubs(),{weekStart,filter}=selection,now=deps.now();
 if(!['all','favorites',...clubs.map(c=>c.id)].includes(filter))throw invalid();
 const favorites=filter==='favorites'?(await store.getPreferences(p.memberId)).favoriteClubIds:[];
 const include=(id:string)=>filter==='all'||filter===id||(filter==='favorites'&&favorites.includes(id));
 const records=await store.listSessions(weekStart,addDays(weekStart,7));
 const cards:SessionCardView[]=[];
 const past=weekStart<kstWeekStart(now);
 for(let s of records){if(!include(s.value.clubId)||s.value.phase==='draft'&&!canManage(p,s.value.clubId))continue;const snapshot=await settledSnapshot(s.value.id,deps);if(!snapshot)throw unavailable();s=snapshot.session;const r=snapshot.roster;
  const attended=r.value.participants[p.memberId]?.status==='applied'||!!r.value.published?.teams.some(t=>t.players.some(m=>m.memberId===p.memberId));
  if(past&&(s.value.phase==='draft'||!attended))continue;
  cards.push(await card(p,s,r.value,store,now,r.revision))}
 const registrationOpportunities=clubs.filter(c=>include(c.id)&&canManage(p,c.id)).flatMap(c=>{const date=addDays(weekStart,c.weekday-1);return Date.parse(`${date}T${c.start}:00+09:00`)>now.getTime()&&!records.some(s=>s.value.clubId===c.id&&s.value.date===date)?[{clubId:c.id,date}]:[]});
 cards.sort((a,b)=>a.session.date.localeCompare(b.session.date)||a.session.entry.localeCompare(b.session.entry)||a.club.name.localeCompare(b.club.name,'ko'));
 return {serverNow:now.toISOString(),weekStart,cards,registrationOpportunities};
}
export async function getSessionView(p:VerifiedPrincipal,id:string,deps:SideoutDependencies):Promise<SessionDetailView>{
 const {store}=deps;let s=await store.getSession(id);
 if(!s||s.value.phase==='draft'&&!canManage(p,s.value.clubId))throw notFound();
 const snapshot=await settledSnapshot(id,deps);if(!snapshot)throw unavailable();s=snapshot.session;const r=snapshot.roster;
 const summary=await card(p,s,r.value,store,deps.now(),r.revision),labels=new Map<string,MemberLabel>();
 const previewLineup=isPublished(r.value)?r.value.published!:r.value.draft;
 const previewMatches=isPublished(r.value)?r.value.publishedMatches:r.value.draftMatches;
 const showSaved=summary.canManage&&Date.parse(`${s.value.date}T${s.value.start}:00+09:00`)>deps.now().getTime()&&previewLineup.teams.length>0;
 const identities=new Map((await store.getParticipationMembers([...new Set([...Object.keys(r.value.participants),...(showSaved?previewLineup.teams.flatMap(t=>t.players.map(p=>p.memberId)):[]),...(summary.canViewPublishedTeams?r.value.published?.teams.flatMap(t=>t.players.map(p=>p.memberId))??[]:[])])])).map(m=>[m.memberId,m]));
 const clubsById=new Map((await store.listClubs()).map(c=>[c.id,c]));
 async function label(memberId:string):Promise<MemberLabel>{
  const old=labels.get(memberId);if(old)return old;
  const m=identities.get(memberId);if(!m)throw unavailable();
  const c=m.homeClubId?clubsById.get(m.homeClubId):null;if(m.homeClubId&&!c)throw unavailable();
  const result={memberId:m.memberId,displayName:m.displayName,homeClubId:m.homeClubId,clubName:c?.name??null};labels.set(memberId,result);return result;
 }
 const visibleApplicants:MemberLabel[]=[];let guestCount:number|null=null;
 if(summary.canManage||p.homeClubId===s.value.clubId){
  guestCount=0;
  for(const [memberId,participant] of Object.entries(r.value.participants)){
   if(participant.status!=='applied')continue;
   const m=identities.get(memberId);if(!m)throw unavailable();
   if(m.homeClubId!==s.value.clubId)guestCount++;
   if(summary.canManage||m.homeClubId===s.value.clubId)visibleApplicants.push(await label(memberId));
  }
 }
 const visibleWaiters=summary.canManage?await Promise.all(Object.entries(r.value.participants).filter(([,p])=>p.status==='waiting').map(([id])=>label(id))):undefined;
 const publishedTeams=summary.canViewPublishedTeams&&r.value.published?await Promise.all(r.value.published.teams.map(async t=>({id:t.id,title:t.title,players:await Promise.all(t.players.map(async m=>({...await label(m.memberId),slotId:m.slotId,assignedPosition:m.assignedPosition})))}))):null;
 const managerTeamPreview=showSaved?{teams:await Promise.all(previewLineup.teams.map(async t=>({id:t.id,title:t.title,players:await Promise.all(t.players.map(async m=>({...await label(m.memberId),slotId:m.slotId,assignedPosition:m.assignedPosition})))}))),matches:previewMatches,unpublishedChanges:!isPublished(r.value)}:undefined;
 return {...summary,...(managerTeamPreview?{managerTeamPreview}:{}),rosterRevision:r.revision,visibleApplicants,...(visibleWaiters?{visibleWaiters}:{}),guestCount,publishedTeams,publishedMatches:summary.canViewPublishedTeams?r.value.publishedMatches:null,capabilities:{canEditSchedule:summary.canManage&&Date.parse(`${s.value.date}T${s.value.start}:00+09:00`)>deps.now().getTime(),canManageRoster:summary.canManage&&canManagerAdd(s.value,r.value,deps.now()),canCancelRoster:summary.canManage&&canCancel(s.value,r.value,deps.now(),true),canEditTeams:summary.canManage&&s.value.phase==='open'&&Date.parse(`${s.value.date}T${s.value.start}:00+09:00`)>deps.now().getTime(),canEditMatches:summary.canManage&&s.value.phase==='open'&&Date.parse(`${s.value.date}T${s.value.start}:00+09:00`)>deps.now().getTime()&&[3,4].includes((r.value.draft.teams.length?r.value.draft:r.value.published)?.teams.length??0),canPublish:false,canCancelSelf:summary.participation?.canCancel??false}};
}
