import type {Session} from './model'
import {canManage,sessionDeadline,type Access} from './registration-model'
import {copyLineup,emptyLineup,isInLineup,removePlayer,validateLineup,type Lineup,type Player,type TeamRecord} from './team-model'

export type ParticipationStatus='applied'|'waiting'|'cancelled'
export type Participation={player:Player;status:ParticipationStatus;source:'self'|'manager'|'fixture';registeredAt:string;updatedAt:string}
export type SessionRoster={sessionId:string;revision:number;participants:Record<string,Participation>;teams:TeamRecord;firstPublishedAt:string|null}
export type RosterCommand=
 |{type:'REGISTER_SELF';sessionId:string;expectedRevision:number}
 |{type:'ADD_MEMBERS';sessionId:string;expectedRevision:number;playerIds:string[]}
 |{type:'CANCEL_PARTICIPATION';sessionId:string;expectedRevision:number;playerId:string}
 |{type:'SAVE_DRAFT'|'PUBLISH_TEAMS';sessionId:string;expectedRevision:number;lineup:Lineup;confirmUnregisteredIds:string[]}
export type RosterErrorCode='wrong_session'|'stale_revision'|'forbidden'|'not_open'|'past'|'deadline_locked'|'published_locked'|'already_registered'|'not_participant'|'unknown_member'|'nothing_to_add'|'invalid_lineup'|'unassigned_applicants'|'unregistered_confirmation_required'
export type RosterCommandResult={ok:true;next:SessionRoster}|{ok:false;code:RosterErrorCode}
export function rosterErrorMessage(code:RosterErrorCode){return ({wrong_session:'운동 정보를 다시 확인해 주세요.',stale_revision:'명단이 변경됐어요. 편집 내용을 확인한 뒤 다시 시도해 주세요.',forbidden:'이 운동을 변경할 권한이 없어요.',not_open:'등록된 운동에서만 처리할 수 있어요.',past:'운동 시작 후에는 변경할 수 없어요.',deadline_locked:'신청 마감 후에는 취소할 수 없어요.',published_locked:'팀편성 공개 후에는 신청을 취소할 수 없어요.',already_registered:'이미 신청한 회원이에요.',not_participant:'현재 신청·대기 중인 회원이 아니에요.',unknown_member:'회원 정보를 찾을 수 없어요.',nothing_to_add:'새로 추가할 회원이 없어요.',invalid_lineup:'팀편성의 중복·빈 팀을 확인해 주세요.',unassigned_applicants:'모든 신청자를 팀에 배정한 뒤 공개해 주세요.',unregistered_confirmation_required:'미신청 회원의 참가자 추가를 확인해 주세요.'} satisfies Record<RosterErrorCode,string>)[code]}
export type RosterCommandContext={session:Session;actorId:string;access:Access;now:string;members:Player[]}
export type RosterViewer={playerId:string;homeClubId:string|null;manager:boolean}
export type RosterView={
 applicants:Player[];waiters:Player[];
 counts:{applicants:number;waiting:number;unassignedApplicants:number;guests:number};
 visibleRoster:{applicants:Player[];waiters:Player[];guestCount:number};
 selfStatus:ParticipationStatus|null;canViewPublishedTeams:boolean;canCancelSelf:boolean;canCancelMembers:boolean;
}

export const createEmptyRoster=(sessionId:string):SessionRoster=>({sessionId,revision:0,participants:{},teams:{draft:emptyLineup()},firstPublishedAt:null})

const active=(p:Participation|undefined)=>p?.status==='applied'||p?.status==='waiting'
const beforeStart=(session:Session,now:string)=>session.date+'T'+session.club.start>now
const isOpen=(session:Session)=>session.phase!=='draft'&&session.phase!=='unregistered'
const hasDuplicates=(lineup:Lineup)=>{const ids=lineup.teams.flatMap(team=>team.players.map(player=>player.id));return ids.length!==new Set(ids).size}
const failure=(code:RosterErrorCode):RosterCommandResult=>({ok:false,code})
const changed=(state:SessionRoster,patch:Partial<SessionRoster>):RosterCommandResult=>({ok:true,next:{...state,...patch,revision:state.revision+1}})

export function executeRosterCommand(state:SessionRoster,command:RosterCommand,ctx:RosterCommandContext):RosterCommandResult{
 if(command.sessionId!==state.sessionId||ctx.session.id!==state.sessionId)return failure('wrong_session')
 if(command.expectedRevision!==state.revision)return failure('stale_revision')
 if(!isOpen(ctx.session))return failure('not_open')
 if(!beforeStart(ctx.session,ctx.now))return failure('past')
 const manager=canManage(ctx.access,ctx.session.club.id)
 const memberById=new Map(ctx.members.map(member=>[member.id,member]))

 if(command.type==='REGISTER_SELF'){
  const player=memberById.get(ctx.actorId)
  if(!player)return failure('unknown_member')
  if(active(state.participants[player.id]))return failure('already_registered')
  const status:ParticipationStatus=state.firstPublishedAt||sessionDeadline(ctx.session)<=ctx.now?'waiting':'applied'
  return changed(state,{participants:{...state.participants,[player.id]:{player,status,source:'self',registeredAt:ctx.now,updatedAt:ctx.now}}})
 }

 if(command.type==='ADD_MEMBERS'){
  if(!manager)return failure('forbidden')
  const ids=[...new Set(command.playerIds)]
  if(!ids.length)return failure('nothing_to_add')
  if(ids.some(id=>!memberById.has(id)))return failure('unknown_member')
  const fresh=ids.filter(id=>!active(state.participants[id]))
  if(!fresh.length)return failure('nothing_to_add')
  const status:ParticipationStatus=state.firstPublishedAt||sessionDeadline(ctx.session)<=ctx.now?'waiting':'applied'
  const participants={...state.participants}
  for(const id of fresh)participants[id]={player:memberById.get(id)!,status,source:'manager',registeredAt:ctx.now,updatedAt:ctx.now}
  return changed(state,{participants})
 }

 if(command.type==='CANCEL_PARTICIPATION'){
  if(state.firstPublishedAt)return failure('published_locked')
  if(!manager&&command.playerId!==ctx.actorId)return failure('forbidden')
  if(!manager&&sessionDeadline(ctx.session)<=ctx.now)return failure('deadline_locked')
  const previous=state.participants[command.playerId]
  if(!active(previous))return failure('not_participant')
  return changed(state,{
   participants:{...state.participants,[command.playerId]:{...previous,status:'cancelled',updatedAt:ctx.now}},
   teams:{...state.teams,draft:removePlayer(state.teams.draft,command.playerId)}
  })
 }

 if(!manager)return failure('forbidden')
 const lineup=command.lineup
 if(hasDuplicates(lineup)||command.type==='PUBLISH_TEAMS'&&validateLineup(lineup))return failure('invalid_lineup')
 const ids=lineup.teams.flatMap(team=>team.players.map(player=>player.id))
 if(ids.some(id=>!memberById.has(id)))return failure('unknown_member')
 if(command.type==='PUBLISH_TEAMS'&&Object.values(state.participants).some(entry=>entry.status==='applied'&&!ids.includes(entry.player.id)))return failure('unassigned_applicants')
 const unregistered=ids.filter(id=>!active(state.participants[id]))
 if(unregistered.some(id=>state.participants[id]?.status==='cancelled'))return failure('not_participant')
 const confirmed=[...new Set(command.confirmUnregisteredIds)]
 if(confirmed.length!==unregistered.length||confirmed.some(id=>!unregistered.includes(id)))return failure('unregistered_confirmation_required')
 if(unregistered.length&&!ctx.access.master)return failure('forbidden')
 const participants={...state.participants}
 for(const id of unregistered){
  const player=memberById.get(id)!
  participants[id]={player,status:command.type==='PUBLISH_TEAMS'?'applied':state.firstPublishedAt||sessionDeadline(ctx.session)<=ctx.now?'waiting':'applied',source:'manager',registeredAt:ctx.now,updatedAt:ctx.now}
 }
 if(command.type==='PUBLISH_TEAMS')for(const id of ids){const previous=participants[id];if(previous?.status==='waiting')participants[id]={...previous,status:'applied',updatedAt:ctx.now}}
 const teams:TeamRecord={draft:copyLineup(lineup),shared:command.type==='PUBLISH_TEAMS'?copyLineup(lineup):state.teams.shared?copyLineup(state.teams.shared):undefined}
 return changed(state,{participants,teams,firstPublishedAt:command.type==='PUBLISH_TEAMS'?state.firstPublishedAt??ctx.now:state.firstPublishedAt})
}

export function selectRosterView(state:SessionRoster,viewer:RosterViewer,members:Player[],session:Session,now:string):RosterView{
 const directory=new Map(members.map(member=>[member.id,member]))
 const roster=Object.values(state.participants).map(entry=>({...entry,player:directory.get(entry.player.id)??entry.player}))
 const applicants=roster.filter(entry=>entry.status==='applied').map(entry=>entry.player)
 const waiters=roster.filter(entry=>entry.status==='waiting').map(entry=>entry.player)
 const guestCount=applicants.filter(player=>player.club!==session.club.name).length
 const showRoster=viewer.manager||viewer.homeClubId===session.club.id
 const visibleApplicants=viewer.manager?applicants:applicants.filter(player=>showRoster&&player.club===session.club.name)
 const published=state.teams.shared
 const selfStatus=state.participants[viewer.playerId]?.status??null
 return {
  applicants,waiters,
  counts:{applicants:applicants.length,waiting:waiters.length,unassignedApplicants:applicants.filter(player=>!isInLineup(state.teams.draft,player.id)).length,guests:guestCount},
  visibleRoster:{applicants:visibleApplicants,waiters:viewer.manager?waiters:[],guestCount:showRoster?guestCount:0},
  selfStatus,canViewPublishedTeams:viewer.manager||selfStatus==='applied'||isInLineup(published,viewer.playerId),
  canCancelSelf:!state.firstPublishedAt&&beforeStart(session,now)&&sessionDeadline(session)>now&&selfStatus==='applied',
  canCancelMembers:viewer.manager&&!state.firstPublishedAt&&beforeStart(session,now)
 }
}
