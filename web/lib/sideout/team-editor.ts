import type {LineupRecord,MatchPlanRecord,Position} from './read-model';
export type EditorPerson={active?:boolean;id:string;name:string;club:string;position:Position|null;secondary:Position|null;status:'신청자'|'대기자'|'미신청 회원'};
export type TeamEditorView={sessionId:string;sessionRevision:number;rosterRevision:number;draft:LineupRecord;draftMatches:MatchPlanRecord|null;teamPublished:boolean;hasSavedDraft:boolean;publishedLineup:LineupRecord|null;publishedMatches?:MatchPlanRecord|null;people:EditorPerson[]};
