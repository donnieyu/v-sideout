import {z} from 'zod';
import {canRetainInactivePlacement} from './retained-placement';
import {COURT_SLOTS,type LineupRecord,type RosterRecord,type SessionRecord} from './read-model';
import {registerParticipants,started,isPublished,type ParticipationMember} from './participation';
import {SideoutError} from './errors';
import {generateTeamMatches} from './match-plan';
const id=z.string().min(1).max(128),position=z.enum(['OH','OP','MB','S']);
const lineupSchema=z.object({extraRows:z.number().int().nonnegative().max(200).optional(),teams:z.array(z.object({id,title:z.string().trim().min(1).max(40),players:z.array(z.object({memberId:id,slotId:id,assignedPosition:position}).strict()).max(200)}).strict()).min(1).max(4)}).strict();
export const teamDraftInput=z.object({action:z.literal('save'),sessionRevision:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),lineup:lineupSchema,confirmedMemberIds:z.array(id).max(200).refine(a=>new Set(a).size===a.length)}).strict();
export type TeamDraftInput=z.infer<typeof teamDraftInput>;
const bad=(message:string)=>new SideoutError('INVALID_INPUT',400,message);
export function saveTeamDraft(session:SessionRecord,roster:RosterRecord,lineup:LineupRecord,confirmedMemberIds:string[],members:ParticipationMember[],now:Date):RosterRecord{
 if(isPublished(roster))throw bad('공개 중에는 팀편성을 수정할 수 없습니다. 공개를 취소한 뒤 다시 시도해 주세요.');
 if(session.phase!=='open'||started(session,now))throw bad('팀편성을 수정할 수 있는 시간이 아닙니다.');
 const parsed=teamDraftInput.safeParse({action:'save',sessionRevision:0,lineup,confirmedMemberIds});if(!parsed.success)throw bad('팀과 선수 자리 입력을 확인해 주세요.');
 lineup=parsed.data.lineup;
 const seenTeams=new Set<string>(),seenMembers=new Set<string>(),directory=new Map(members.map(m=>[m.memberId,m]));
 const unregistered:ParticipationMember[]=[];
 for(const team of lineup.teams){
  if(seenTeams.has(team.id))throw bad('중복 팀을 확인해 주세요.');seenTeams.add(team.id);
  const slots=new Set<string>();
  for(const player of team.players){
   if(seenMembers.has(player.memberId)||slots.has(player.slotId))throw bad('중복 배정된 선수 또는 자리를 확인해 주세요.');
   seenMembers.add(player.memberId);slots.add(player.slotId);
   if(seenMembers.size>200)throw bad('배정 인원은 200명을 넘을 수 없습니다.');
   const slot=COURT_SLOTS.find(s=>s.id===player.slotId),expected=slot?.position??(player.slotId==='op2'?'OP':null);
   if(expected?player.assignedPosition!==expected:!/^bench-[A-Za-z0-9_-]+$/.test(player.slotId))throw bad('선수 자리와 배정 포지션을 확인해 주세요.');
   const member=directory.get(player.memberId);if(!member||!member.active&&!canRetainInactivePlacement(roster.draft,roster.published,team.id,player))throw bad('활성 회원만 새로 배정할 수 있습니다. 비활성 회원은 기존 공개 배정만 유지할 수 있습니다.');
   const participant=roster.participants[player.memberId];
   if(!participant||participant.status==='cancelled')unregistered.push(member);
  }
 }
 const confirmed=new Set(confirmedMemberIds);
 if(confirmed.size!==unregistered.length||unregistered.some(m=>!confirmed.has(m.memberId)))throw bad('미신청 회원의 참석 의사를 확인해 주세요.');
 const next=unregistered.length?registerParticipants(session,roster,unregistered,now,'manager'):structuredClone(roster);
 // Inactive unplaced applicants cannot be assigned. Retire their attendance on save,
 // including before first publication; preserve retained placements and public history.
 for(const [id,participant] of Object.entries(next.participants)){
  if(participant.status==='applied'&&directory.get(id)?.active===false&&!seenMembers.has(id))participant.status='cancelled';
 }
 // A saved placement is the manager's attendance decision, including extra seats.
 // Keep unplaced waiters and previously registered attendees unchanged.
 for(const memberId of seenMembers){const participant=next.participants[memberId];participant.status='applied';delete participant.waitReason}
 const oldIds=new Set(roster.draft.teams.map(t=>t.id)),sameTeams=oldIds.size===lineup.teams.length&&lineup.teams.every(t=>oldIds.has(t.id));
 next.draft=structuredClone(lineup);
 if(!sameTeams||!next.draftMatches)next.draftMatches=generateTeamMatches(lineup.teams.map(t=>t.id));
 return next;
}
