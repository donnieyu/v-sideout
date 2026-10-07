import {z} from 'zod';
import {isPublished,started} from './participation';
import {SideoutError} from './errors';
import type {RosterRecord,SessionRecord} from './read-model';
export const teamUnpublishInput=z.object({action:z.literal('unpublish'),confirmed:z.literal(true),sessionRevision:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),draftSource:z.enum(['saved','published'])}).strict();
export type TeamUnpublishInput=z.infer<typeof teamUnpublishInput>;
export function unpublishTeams(session:SessionRecord,roster:RosterRecord,source:TeamUnpublishInput['draftSource'],now:Date):RosterRecord{
 const bad=(message:string)=>new SideoutError('INVALID_INPUT',400,message);
 if(session.phase!=='open'||started(session,now))throw bad('운동 시작 전 공개 모집 일정에서만 공개를 취소할 수 있습니다.');
 if(!isPublished(roster))throw bad('이미 공개가 취소되었습니다. 최신 정보를 확인해 주세요.');
 const next=structuredClone(roster);
 // Keep both public snapshots and the lifetime self-service participation lock after withdrawal.
 next.publicationState='withdrawn';next.firstPublishedAt??=now.toISOString();
 if(source==='published'){
  if(JSON.stringify(next.draft)!==JSON.stringify(next.published)||JSON.stringify(next.draftMatches)!==JSON.stringify(next.publishedMatches))next.withdrawnDraft={lineup:structuredClone(next.draft),matches:structuredClone(next.draftMatches)};
  next.draft=structuredClone(next.published!);next.draftMatches=structuredClone(next.publishedMatches);
 }
 return next;
}
