import {z} from 'zod';
import type {ClubDirectory} from '../auth/member-management';
import {validDate} from '../sideout/calendar';
import {unavailable} from '../sideout/errors';
import type {ClubRecord,SessionRecord,RosterRecord,Versioned,Preferences} from '../sideout/read-model';
const id=z.string().min(1).max(128);
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const instant=z.string().datetime({offset:true});
const clubSchema=z.object({id,name:z.string().min(1),mark:z.string(),weekday:z.number().int().min(1).max(7),entry:time,start:time,end:time,place:z.string()});
const sessionSchema=z.object({id,clubId:id,date:z.string().refine(validDate),entry:time,start:time,end:time,place:z.string(),notice:z.string(),phase:z.enum(['draft','open']),deadline:instant,priorityUntil:instant.nullable(),cap:z.number().int().positive().nullable()});
const lineup=z.object({teams:z.array(z.object({id,title:z.string(),players:z.array(z.object({memberId:id,slotId:id,assignedPosition:z.enum(['OH','OP','MB','S'])}))}))});
const matches=z.object({teamCount:z.number().int().min(1).max(4),rookieTeamCount:z.number().int().min(2).max(4),matches:z.array(z.object({id,kind:z.enum(['regular','rookie']),home:id,away:id}))});
const rosterSchema=z.object({sessionId:id,participants:z.record(id,z.object({status:z.enum(['applied','waiting','cancelled']),source:z.enum(['self','manager'])})),draft:lineup,published:lineup.nullable(),firstPublishedAt:instant.nullable(),draftMatches:matches.nullable(),publishedMatches:matches.nullable()});
const preferencesSchema=z.object({favoriteClubIds:z.array(id)});
type Row={id:string;payload:string;revision:number};
export interface SideoutStore {
 listClubs():Promise<ClubRecord[]>;getClub(id:string):Promise<ClubRecord|null>;
 listSessions(from:string,to:string):Promise<Versioned<SessionRecord>[]>;
 getSession(id:string):Promise<Versioned<SessionRecord>|null>;getRoster(id:string):Promise<Versioned<RosterRecord>|null>;
 getPreferences(memberId:string):Promise<Preferences>;
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
  async listClubs(){return (await rows('club')).map(r=>decode(r,clubSchema,'id').value)},
  async getClub(key){const r=await row('club',key);return r?decode(r,clubSchema,'id').value:null},
  async listSessions(from,to){const result=[];for(const r of await rows('session')){const s=decode(r,sessionSchema,'id');if(!await store.getClub(s.value.clubId))throw unavailable();if(s.value.date>=from&&s.value.date<to)result.push(s)}return result.sort((a,b)=>a.value.date.localeCompare(b.value.date)||a.value.start.localeCompare(b.value.start)||a.value.id.localeCompare(b.value.id))},
  async getSession(key){const r=await row('session',key);if(!r)return null;const s=decode(r,sessionSchema,'id');if(!await store.getClub(s.value.clubId))throw unavailable();return s},
  async getRoster(key){const r=await row('roster',key);if(!r)return null;return decode(r,rosterSchema,'sessionId')},
  async getPreferences(key){const r=await row('preferences',key);return r?decode(r,preferencesSchema).value:{favoriteClubIds:[]}},
 };
 return store;
}
export function makeClubDirectory(store:SideoutStore):ClubDirectory{return {exists:async id=>!!await store.getClub(id)}};
