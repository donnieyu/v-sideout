import {z} from 'zod';
import {saveTeamDraft,teamDraftInput} from './team-draft';
import {SideoutError} from './errors';
import type {LineupRecord,RosterRecord,SessionRecord} from './read-model';
import type {ParticipationMember} from './participation';
export const teamPublishInput=teamDraftInput.extend({action:z.literal('publish'),confirmed:z.literal(true)});
export function publishTeams(session:SessionRecord,roster:RosterRecord,lineup:LineupRecord,confirmedMemberIds:string[],members:ParticipationMember[],now:Date):RosterRecord{
 const next=saveTeamDraft(session,roster,lineup,confirmedMemberIds,members,now);
 const invalid=(message:string)=>new SideoutError('INVALID_INPUT',400,message);
 if(next.draft.teams.length<3)throw invalid('팀편성은 3~4팀일 때 공개할 수 있습니다.');
 if(next.draft.teams.some(t=>t.players.length===0))throw invalid('빈 팀을 배정하거나 삭제한 뒤 공개해 주세요.');
 const placed=new Set(next.draft.teams.flatMap(t=>t.players.map(p=>p.memberId)));
 if(Object.entries(next.participants).some(([id,p])=>p.status==='applied'&&!placed.has(id)))throw invalid('모든 신청자를 배정한 뒤 공개해 주세요.');
 next.publicationState='published';
 next.published=structuredClone(next.draft);
 next.publishedMatches=structuredClone(next.draftMatches);
 next.firstPublishedAt??=now.toISOString();
 return next;
}
