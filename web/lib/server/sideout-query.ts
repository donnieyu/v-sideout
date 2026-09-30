import type {AuthRepository} from '../auth/auth-service';
import type {VerifiedPrincipal} from '../auth/contracts';
import {getMemberIdentity} from '../auth/identity';
import {addDays,kstDate} from '../sideout/calendar';
import {invalid,SideoutError,unavailable} from '../sideout/errors';
import type {ClubsView,HomeView,SessionCardView,SessionDetailView,ReadSelection,Versioned,SessionRecord,RosterRecord,MemberLabel} from '../sideout/read-model';
import type {SideoutStore} from './sideout-store';
export type SideoutDependencies={authRepo:AuthRepository;store:SideoutStore;now:()=>Date};
export function canManage(p:VerifiedPrincipal,clubId:string){return p.isMaster||p.grants.some(g=>g.clubId===clubId)}
const notFound=()=>new SideoutError('NOT_FOUND',404,'일정을 찾을 수 없습니다.');
export async function getClubsView(p:VerifiedPrincipal,store:SideoutStore,now:Date):Promise<ClubsView>{return {serverNow:now.toISOString(),clubs:await store.listClubs(),capabilities:{canManageMembers:p.isMaster}}}
async function card(p:VerifiedPrincipal,s:Versioned<SessionRecord>,r:RosterRecord,store:SideoutStore):Promise<SessionCardView>{
 const club=await store.getClub(s.value.clubId);if(!club)throw unavailable();
 const selfStatus=r.participants[p.memberId]?.status??null;
 const manager=canManage(p,club.id);
 const hasPublished=r.published!==null;
 return {session:s.value,club,sessionRevision:s.revision,counts:{applicants:Object.values(r.participants).filter(m=>m.status==='applied').length,waiting:Object.values(r.participants).filter(m=>m.status==='waiting').length},selfStatus,teamPublished:hasPublished,canViewPublishedTeams:hasPublished&&(manager||selfStatus==='applied'||!!r.published?.teams.some(t=>t.players.some(m=>m.memberId===p.memberId))),canManage:manager};
}
export async function getHomeView(p:VerifiedPrincipal,selection:ReadSelection,deps:SideoutDependencies):Promise<HomeView>{
 const {store}=deps,clubs=await store.listClubs(),{weekStart,filter}=selection,now=deps.now();
 if(!['all','favorites',...clubs.map(c=>c.id)].includes(filter))throw invalid();
 const favorites=filter==='favorites'?(await store.getPreferences(p.memberId)).favoriteClubIds:[];
 const include=(id:string)=>filter==='all'||filter===id||(filter==='favorites'&&favorites.includes(id));
 const records=await store.listSessions(weekStart,addDays(weekStart,7));
 const cards:SessionCardView[]=[];
 for(const s of records){if(!include(s.value.clubId)||s.value.phase==='draft'&&!canManage(p,s.value.clubId))continue;const r=await store.getRoster(s.value.id);if(!r)throw unavailable();cards.push(await card(p,s,r.value,store))}
 const registrationOpportunities=clubs.filter(c=>include(c.id)&&canManage(p,c.id)).flatMap(c=>{const date=addDays(weekStart,c.weekday-1);return date>=kstDate(now)&&!records.some(s=>s.value.clubId===c.id&&s.value.date===date)?[{clubId:c.id,date}]:[]});
 return {serverNow:now.toISOString(),weekStart,cards,registrationOpportunities};
}
export async function getSessionView(p:VerifiedPrincipal,id:string,deps:SideoutDependencies):Promise<SessionDetailView>{
 const {store,authRepo}=deps,s=await store.getSession(id);
 if(!s||s.value.phase==='draft'&&!canManage(p,s.value.clubId))throw notFound();
 const r=await store.getRoster(id);if(!r)throw unavailable();
 const summary=await card(p,s,r.value,store),labels=new Map<string,MemberLabel>();
 async function label(memberId:string):Promise<MemberLabel>{
  const old=labels.get(memberId);if(old)return old;
  const m=await getMemberIdentity(authRepo,memberId);if(!m)throw unavailable();
  const c=m.homeClubId?await store.getClub(m.homeClubId):null;if(m.homeClubId&&!c)throw unavailable();
  const result={memberId:m.memberId,displayName:m.displayName,clubName:c?.name??null};labels.set(memberId,result);return result;
 }
 const visibleApplicants:MemberLabel[]=[];let guestCount:number|null=null;
 if(summary.canManage||p.homeClubId===s.value.clubId){
  guestCount=0;
  for(const [memberId,participant] of Object.entries(r.value.participants)){
   if(participant.status!=='applied')continue;
   const m=await getMemberIdentity(authRepo,memberId);if(!m)throw unavailable();
   if(m.homeClubId!==s.value.clubId)guestCount++;
   if(summary.canManage||m.homeClubId===s.value.clubId)visibleApplicants.push(await label(memberId));
  }
 }
 const publishedTeams=summary.canViewPublishedTeams&&r.value.published?await Promise.all(r.value.published.teams.map(async t=>({id:t.id,title:t.title,players:await Promise.all(t.players.map(async m=>({...await label(m.memberId),slotId:m.slotId,assignedPosition:m.assignedPosition})))}))):null;
 return {...summary,rosterRevision:r.revision,visibleApplicants,guestCount,publishedTeams,publishedMatches:summary.canViewPublishedTeams?r.value.publishedMatches:null,capabilities:{canEditSchedule:false,canManageRoster:false,canEditTeams:false,canEditMatches:false,canPublish:false,canCancelSelf:false}};
}
