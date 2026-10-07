import type {RosterRecord,SessionRecord,Participant} from './read-model';
import {SideoutError} from './errors';
export type ParticipationMember={memberId:string;homeClubId:string|null;active:boolean;version:number};
const invalid=(message:string)=>new SideoutError('INVALID_INPUT',400,message);
export const isPublished=(roster:RosterRecord)=>roster.published!==null&&roster.publicationState!=='withdrawn';
export const hasPublished=(roster:RosterRecord)=>!!roster.firstPublishedAt||roster.published!==null;
export const started=(session:SessionRecord,now:Date)=>Date.parse(`${session.date}T${session.start}:00+09:00`)<=now.getTime();
export const isPriority=(session:SessionRecord,now:Date)=>!!session.priorityUntil&&Date.parse(session.priorityUntil)>now.getTime();
export const canRegister=(session:SessionRecord,roster:RosterRecord,now:Date)=>session.phase==='open'&&!started(session,now)&&!hasPublished(roster);
export const canManagerAdd=(session:SessionRecord,roster:RosterRecord,now:Date)=>session.phase==='open'&&!started(session,now)&&!isPublished(roster);
const count=(roster:RosterRecord)=>Object.values(roster.participants).filter(p=>p.status==='applied').length;
// Legacy waiters without a recorded reason are never silently promoted.
export function settleWaiting(session:SessionRecord,roster:RosterRecord,members:ParticipationMember[],now:Date):RosterRecord{
 if(session.phase!=='open'||started(session,now)||hasPublished(roster))return roster;
 let seats=(session.cap??Infinity)-count(roster);if(seats<=0)return roster;
 const next=structuredClone(roster),directory=new Map(members.map(m=>[m.memberId,m]));
 const queue=Object.entries(next.participants).filter(([,p])=>p.status==='waiting'&&(p.waitReason==='priority'||p.waitReason==='capacity')).sort((a,b)=>(a[1].order??Infinity)-(b[1].order??Infinity)||a[0].localeCompare(b[0]));
 for(const [id,p] of queue){const m=directory.get(id);if(!m?.active||isPriority(session,now)&&m.homeClubId!==session.clubId)continue;if(seats--<=0)break;p.status='applied';delete p.waitReason}
 return next;
}
export function registrationState(session:SessionRecord,roster:RosterRecord,member:Pick<ParticipationMember,'homeClubId'>,now:Date):Pick<Participant,'status'|'waitReason'>{
 if(hasPublished(roster))throw invalid('팀편성 공개 후에는 추가 신청할 수 없습니다.');
 return availableRegistrationState(session,roster,member,now);
}
function availableRegistrationState(session:SessionRecord,roster:RosterRecord,member:Pick<ParticipationMember,'homeClubId'>,now:Date):Pick<Participant,'status'|'waitReason'>{
 if(Date.parse(session.deadline)<=now.getTime())return {status:'waiting',waitReason:'closed'};
 if(isPriority(session,now)&&member.homeClubId!==session.clubId)return {status:'waiting',waitReason:'priority'};
 if(session.cap!==null&&count(roster)>=session.cap)return {status:'waiting',waitReason:'capacity'};
 return {status:'applied'};
}
export function registerParticipants(session:SessionRecord,roster:RosterRecord,members:ParticipationMember[],now:Date,source:'self'|'manager'):RosterRecord{
 // Manager additions confirm attendance; ordinary members retain the signup rules.
 if(source==='manager'?isPublished(roster):hasPublished(roster))throw invalid('팀편성 공개 후에는 추가 신청할 수 없습니다.');
 if(!(source==='manager'?canManagerAdd(session,roster,now):canRegister(session,roster,now)))throw invalid('신청할 수 있는 시간이 아닙니다.');
 if(!members.length||new Set(members.map(m=>m.memberId)).size!==members.length)throw invalid('추가할 회원을 확인해 주세요.');
 for(const m of members){if(!m.active)throw invalid('활성 회원만 추가할 수 있습니다.');if(['applied','waiting'].includes(roster.participants[m.memberId]?.status))throw new SideoutError('CONFLICT',409,'이미 신청하거나 대기 중인 회원이 있습니다. 최신 명단을 확인해 주세요.')}
 const next=structuredClone(roster);let order=Math.max(Object.keys(next.participants).length,...Object.values(next.participants).map(p=>p.order??0));
 for(const member of members)next.participants[member.memberId]={...(source==='manager'?{status:'applied' as const}:availableRegistrationState(session,next,member,now)),source,registeredAt:now.toISOString(),order:++order};
 return next;
}
export function canCancel(session:SessionRecord,roster:RosterRecord,now:Date,manager=false){return manager?canManagerAdd(session,roster,now):!hasPublished(roster)&&!started(session,now)&&Date.parse(session.deadline)>now.getTime()}
export function cancelParticipant(session:SessionRecord,roster:RosterRecord,memberId:string,now:Date,manager:boolean):RosterRecord{
 if(!canCancel(session,roster,now,manager))throw invalid((manager?isPublished(roster):hasPublished(roster))?'팀편성 공개 후에는 참가를 취소할 수 없습니다.':'참가를 취소할 수 있는 시간이 아닙니다.');
 const member=roster.participants[memberId];if(!member||member.status==='cancelled')throw new SideoutError('CONFLICT',409,'이미 취소되었거나 신청하지 않은 회원입니다.');
 const next=structuredClone(roster);next.participants[memberId]={...member,status:'cancelled'};next.draft.teams=next.draft.teams.map(t=>({...t,players:t.players.filter(p=>p.memberId!==memberId)}));return next;
}
