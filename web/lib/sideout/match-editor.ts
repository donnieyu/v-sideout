import {z} from 'zod';
import {isPublished} from './participation';
import type {ClubRecord,SessionRecord,MatchPlanRecord,RosterRecord} from './read-model';
export type MatchEditorView={session:SessionRecord;club:ClubRecord;sessionRevision:number;rosterRevision:number;teams:{id:string;title:string}[];plan:MatchPlanRecord;saveVisibility:'attendees'|'draft'};
const id=z.string().min(1).max(128);
export const matchPlanSchema=z.object({teamCount:z.number().int().min(3).max(4),rookieTeamCount:z.number().int().min(2).max(4),matches:z.array(z.object({id,kind:z.enum(['regular','rookie']),home:id,away:id}).strict()).min(1).max(100)}).strict();
export const matchSaveInput=z.object({action:z.literal('save'),sessionRevision:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),plan:matchPlanSchema}).strict();
export type MatchSaveInput=z.infer<typeof matchSaveInput>;
export function matchSource(roster:RosterRecord){return roster.draft.teams.length?roster.draft:roster.published}
export function matchSaveVisibility(roster:RosterRecord):MatchEditorView['saveVisibility']{
 const source=matchSource(roster),published=roster.published;
 // Team identity, not player assignments: a match-only save must never publish draft players.
 return isPublished(roster)&&source&&published&&source.teams.length===published.teams.length&&source.teams.every(t=>published.teams.some(p=>p.id===t.id))?'attendees':'draft';
}
