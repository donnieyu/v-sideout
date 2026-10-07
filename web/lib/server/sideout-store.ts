import {z} from 'zod';
import type {ClubDirectory} from '../auth/member-management';
import {validDate} from '../sideout/calendar';
import {unavailable} from '../sideout/errors';
import {COURT_SLOTS,type ClubRecord,type SessionRecord,type RosterRecord,type Versioned,type Preferences,type LineupRecord,type MatchPlanRecord} from '../sideout/read-model';
const profilePosition=z.enum(['OH','OP','MB','S']);
const id=z.string().min(1).max(128);
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const instant=z.string().datetime({offset:true}).refine(v=>Number.isFinite(Date.parse(v)));
const clubSchema=z.object({id,name:z.string().min(1),mark:z.string(),weekday:z.number().int().min(1).max(7),entry:time,start:time,end:time,place:z.string()});
const sessionSchema=z.object({id,clubId:id,date:z.string().refine(validDate),entry:time,start:time,end:time,place:z.string(),notice:z.string(),phase:z.enum(['draft','open']),deadline:instant,priorityUntil:instant.nullable(),cap:z.number().int().positive().nullable()});
const lineup=z.object({extraRows:z.number().int().nonnegative().max(200).optional(),teams:z.array(z.object({id,title:z.string(),players:z.array(z.object({memberId:id,slotId:id,assignedPosition:z.enum(['OH','OP','MB','S'])}))}))});
const matches=z.object({teamCount:z.number().int().min(1).max(4),rookieTeamCount:z.number().int().min(2).max(4),matches:z.array(z.object({id,kind:z.enum(['regular','rookie']),home:id,away:id}))});
const rosterSchema=z.object({publicationState:z.enum(['published','withdrawn']).optional(),withdrawnDraft:z.object({lineup,matches:matches.nullable()}).optional(),sessionId:id,participants:z.record(id,z.object({status:z.enum(['applied','waiting','cancelled']),source:z.enum(['self','manager']),registeredAt:instant.optional(),order:z.number().int().nonnegative().optional(),waitReason:z.enum(['priority','capacity','closed']).optional()})),draft:lineup,published:lineup.nullable(),firstPublishedAt:instant.nullable(),draftMatches:matches.nullable(),publishedMatches:matches.nullable()});
const preferencesSchema=z.object({favoriteClubIds:z.array(id)});
function validateLineup(board:LineupRecord|null,plan:MatchPlanRecord|null){
 if(!board){if(plan)throw unavailable();return}
 const teams=new Set<string>(),members=new Set<string>();
 for(const team of board.teams){
  if(teams.has(team.id))throw unavailable();teams.add(team.id);
  const slots=new Set<string>();
  for(const player of team.players){
   if(slots.has(player.slotId)||members.has(player.memberId))throw unavailable();
   slots.add(player.slotId);members.add(player.memberId);
   const court=COURT_SLOTS.find(slot=>slot.id===player.slotId);
   if(court&&court.position!==player.assignedPosition)throw unavailable();
  }
 }
 if(!plan)return;
 if(plan.teamCount!==teams.size)throw unavailable();
 const gameIds=new Set<string>(),rookies=new Set(Array.from({length:plan.rookieTeamCount},(_,i)=>`R${i+1}`));
 for(const game of plan.matches){
  const eligible=game.kind==='regular'?teams:rookies;
  if(gameIds.has(game.id)||game.home===game.away||!eligible.has(game.home)||!eligible.has(game.away))throw unavailable();
  gameIds.add(game.id);
 }
}
type Row={id:string;payload:string;revision:number};
export interface SideoutStore {
 getPositionProfiles(ids:string[]):Promise<{memberId:string;position:'OH'|'OP'|'MB'|'S';secondary:'OH'|'OP'|'MB'|'S'}[]>;
 getParticipationMembers(ids:string[]):Promise<{memberId:string;displayName:string;homeClubId:string|null;active:boolean;version:number}[]>;
 listCandidateIdentities():Promise<{memberId:string;displayName:string;homeClubId:string|null}[]>;
 compareAndSetRoster(session:Versioned<SessionRecord>,roster:Versioned<RosterRecord>,next:RosterRecord,members:{memberId:string;version:number}[]):Promise<boolean>;
 listClubs():Promise<ClubRecord[]>;getClub(id:string):Promise<ClubRecord|null>;
 listSessions(from:string,to:string):Promise<Versioned<SessionRecord>[]>;
 getSession(id:string):Promise<Versioned<SessionRecord>|null>;getRoster(id:string):Promise<Versioned<RosterRecord>|null>;
 getPreferences(memberId:string):Promise<Preferences>;getPreferencesVersion(memberId:string):Promise<Versioned<Preferences>>;
}
export function makeSideoutStore(db:D1Database):SideoutStore {
 function decode<T>(row:Row,schema:z.ZodType<T>,key?:string):Versioned<T>{
  try{
   const envelope=z.object({schemaVersion:z.literal(1),data:z.unknown()}).parse(JSON.parse(row.payload));
   const value=schema.parse(envelope.data);
   if(!Number.isSafeInteger(row.revision)||row.revision<0)throw unavailable();
   if(key&&(value as Record<string,unknown>)[key]!==row.id.slice(row.id.indexOf(':',8)+1))throw unavailable();
   return {value,revision:row.revision};
  }catch{throw unavailable()}
 }
 async function row(kind:string,key:string){return db.prepare('SELECT id,payload,revision FROM workspaces WHERE id=?').bind(`sideout:${kind}:${key}`).first<Row>()}
 async function rows(kind:string){return (await db.prepare('SELECT id,payload,revision FROM workspaces WHERE id LIKE ? ORDER BY id').bind(`sideout:${kind}:%`).all<Row>()).results}
 const store:SideoutStore={
  async getPositionProfiles(ids){
   if(!ids.length)return [];
   const rows=await db.prepare('SELECT member_id AS memberId,main_position AS position,sub_position AS secondary FROM member_position_profiles WHERE member_id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids)).all();
   const parsed=z.array(z.object({memberId:id,position:profilePosition,secondary:profilePosition})).safeParse(rows.results);
   if(!parsed.success)throw unavailable();return parsed.data;
  },
  async getParticipationMembers(ids){if(!ids.length)return [];const rows=await db.prepare('SELECT id AS memberId,display_name AS displayName,home_club_id AS homeClubId,active,auth_version AS version FROM auth_members WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids)).all<{memberId:string;displayName:string;homeClubId:string|null;active:number;version:number}>();return rows.results.map(m=>({...m,active:!!m.active}))},
  async listCandidateIdentities(){return (await db.prepare('SELECT id AS memberId,display_name AS displayName,home_club_id AS homeClubId FROM auth_members WHERE active=1 ORDER BY display_name,id').all<{memberId:string;displayName:string;homeClubId:string|null}>()).results},
  async compareAndSetRoster(session,roster,next,members){
   const result=await db.prepare("UPDATE workspaces SET payload=?,revision=revision+1 WHERE id=? AND revision=? AND EXISTS (SELECT 1 FROM workspaces WHERE id=? AND revision=?) AND NOT EXISTS (SELECT 1 FROM json_each(?) target LEFT JOIN auth_members m ON m.id=json_extract(target.value,'$.memberId') WHERE m.id IS NULL OR m.auth_version<>json_extract(target.value,'$.version') OR m.active<>1)").bind(JSON.stringify({schemaVersion:1,data:next}),`sideout:roster:${session.value.id}`,roster.revision,`sideout:session:${session.value.id}`,session.revision,JSON.stringify(members)).run();return result.meta.changes===1;
  },
  async listClubs(){return (await rows('club')).map(r=>decode(r,clubSchema,'id').value)},
  async getClub(key){const r=await row('club',key);return r?decode(r,clubSchema,'id').value:null},
  async listSessions(from,to){const result=[];for(const r of await rows('session')){const s=decode(r,sessionSchema,'id');if(!await store.getClub(s.value.clubId))throw unavailable();if(s.value.date>=from&&s.value.date<to)result.push(s)}return result.sort((a,b)=>a.value.date.localeCompare(b.value.date)||a.value.start.localeCompare(b.value.start)||a.value.id.localeCompare(b.value.id))},
  async getSession(key){const r=await row('session',key);if(!r)return null;const s=decode(r,sessionSchema,'id');if(!await store.getClub(s.value.clubId))throw unavailable();return s},
  async getRoster(key){const r=await row('roster',key);if(!r)return null;const result=decode(r,rosterSchema,'sessionId');validateLineup(result.value.draft,result.value.draftMatches);validateLineup(result.value.published,result.value.publishedMatches);return result},
  async getPreferences(key){return (await store.getPreferencesVersion(key)).value},
  async getPreferencesVersion(key){const r=await row('preferences',key);return r?decode(r,preferencesSchema):{value:{favoriteClubIds:[]},revision:0}},
 };
 return store;
}
export function makeClubDirectory(store:SideoutStore):ClubDirectory{return {exists:async id=>!!await store.getClub(id)}};
