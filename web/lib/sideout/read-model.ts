export type Position='OH'|'OP'|'MB'|'S';
// Schema v1 uses explicit semantic slot IDs, independent of array order.
// Other IDs are additional places outside the six-player court (including op2).
// Prototype numeric 0..6 IDs must be explicitly converted by a future importer.
export const COURT_SLOTS=[{id:'oh1',position:'OH'},{id:'mb1',position:'MB'},{id:'s',position:'S'},{id:'oh2',position:'OH'},{id:'mb2',position:'MB'},{id:'op1',position:'OP'}] as const;
export type ClubRecord={id:string;name:string;mark:string;weekday:number;entry:string;start:string;end:string;place:string};
export type SessionRecord={id:string;clubId:string;date:string;entry:string;start:string;end:string;place:string;notice:string;phase:'draft'|'open';deadline:string;priorityUntil:string|null;cap:number|null};
export type Placement={memberId:string;slotId:string;assignedPosition:Position};
export type LineupRecord={teams:{id:string;title:string;players:Placement[]}[]};
export type MatchPlanRecord={teamCount:number;rookieTeamCount:number;matches:{id:string;kind:'regular'|'rookie';home:string;away:string}[]};
export type RosterRecord={sessionId:string;participants:Record<string,{status:'applied'|'waiting'|'cancelled';source:'self'|'manager'}>;draft:LineupRecord;published:LineupRecord|null;firstPublishedAt:string|null;draftMatches:MatchPlanRecord|null;publishedMatches:MatchPlanRecord|null};
export type Versioned<T>={value:T;revision:number};
export type Preferences={favoriteClubIds:string[]};
export type ReadSelection={weekStart:string;filter:string};
export type MemberLabel={memberId:string;displayName:string;clubName:string|null};
export type PublishedTeam={id:string;title:string;players:(MemberLabel&{slotId:string;assignedPosition:Position})[]};
export type ClubsView={serverNow:string;clubs:ClubRecord[];capabilities:{canManageMembers:boolean}};
export type SessionCardView={session:SessionRecord;club:ClubRecord;sessionRevision:number;counts:{applicants:number;waiting:number};selfStatus:'applied'|'waiting'|'cancelled'|null;teamPublished:boolean;canViewPublishedTeams:boolean;canManage:boolean};
export type HomeView={serverNow:string;weekStart:string;cards:SessionCardView[];registrationOpportunities:{clubId:string;date:string}[]};
export type SessionDetailView=SessionCardView&{rosterRevision:number;visibleApplicants:MemberLabel[];guestCount:number|null;publishedTeams:PublishedTeam[]|null;publishedMatches:MatchPlanRecord|null;capabilities:{canEditSchedule:boolean;canManageRoster:boolean;canEditTeams:boolean;canEditMatches:boolean;canPublish:boolean;canCancelSelf:boolean}};
