import type {VerifiedPrincipal} from '../auth/contracts';
import type {WriteResult} from '../sideout/write-model';
import {SideoutError,unavailable} from '../sideout/errors';
export const conflict=()=>new SideoutError('CONFLICT',409,'다른 변경이 반영되었거나 같은 날짜에 일정이 있습니다. 최신 정보를 확인해 주세요.');
type Receipt={hash:string;nonce:string;result:WriteResult};
type Commit={actor:VerifiedPrincipal;tokenHash:string;now:Date;commandId:string;hash:string;guards:{key:string;revision:number|null}[];writes:{key:string;data:unknown;revision:number}[];result:WriteResult;uniqueSession?:{clubId:string;date:string};members?:{memberId:string;version:number;active?:boolean}[]};
const receiptKey=(actor:string,command:string)=>`sideout:command:${actor}:${command}`;
export function makeSideoutWriteStore(db:D1Database){
 return {
  async receipt(actor:string,commandId:string):Promise<Receipt|null>{
   const row=await db.prepare('SELECT payload FROM workspaces WHERE id=?').bind(receiptKey(actor,commandId)).first<{payload:string}>();
   if(!row)return null;try{const value=JSON.parse(row.payload) as Receipt;if(typeof value.hash!=='string'||typeof value.nonce!=='string'||typeof value.result?.resourceId!=='string'||!Number.isSafeInteger(value.result.revision))throw unavailable();return value}catch{throw unavailable()}
  },
  async revision(key:string){const row=await db.prepare('SELECT revision FROM workspaces WHERE id=?').bind(key).first<{revision:number}>();return row?.revision??0},
  async commit(input:Commit){
   const {actor,tokenHash,now,commandId,hash,guards,writes,result,uniqueSession}=input;
   const key=receiptKey(actor.memberId,commandId),nonce=crypto.randomUUID();
   const checks=[`EXISTS (SELECT 1 FROM auth_members m JOIN auth_sessions s ON s.member_id=m.id WHERE m.id=? AND m.auth_version=? AND m.active=1 AND m.must_change_password=0 AND s.token_hash=? AND s.auth_version=m.auth_version AND s.restricted=0 AND s.expires_at>?)`];
   const args:unknown[]=[actor.memberId,actor.authorizationVersion,tokenHash,now.getTime()];
   if(input.members?.length){checks.push("NOT EXISTS (SELECT 1 FROM json_each(?) target LEFT JOIN auth_members m ON m.id=json_extract(target.value,'$.memberId') WHERE m.id IS NULL OR m.auth_version<>json_extract(target.value,'$.version') OR m.active<>COALESCE(json_extract(target.value,'$.active'),1))");args.push(JSON.stringify(input.members))}
   for(const guard of guards){checks.push(guard.revision===null?'NOT EXISTS (SELECT 1 FROM workspaces WHERE id=?)':'EXISTS (SELECT 1 FROM workspaces WHERE id=? AND revision=?)');args.push(guard.key);if(guard.revision!==null)args.push(guard.revision)}
   if(uniqueSession){checks.push("NOT EXISTS (SELECT 1 FROM workspaces WHERE id LIKE 'sideout:session:%' AND json_extract(payload,'$.data.clubId')=? AND json_extract(payload,'$.data.date')=?)");args.push(uniqueSession.clubId,uniqueSession.date)}
   const receipt={hash,nonce,result};
   const statements=[db.prepare(`INSERT INTO workspaces(id,payload,revision) SELECT ?,?,1 WHERE ${checks.join(' AND ')} ON CONFLICT(id) DO NOTHING`).bind(key,JSON.stringify(receipt),...args),...writes.map(write=>db.prepare("INSERT INTO workspaces(id,payload,revision) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM workspaces WHERE id=? AND json_extract(payload,'$.nonce')=?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision").bind(write.key,JSON.stringify({schemaVersion:1,data:write.data}),write.revision,key,nonce))];
   const committed=await db.batch(statements);
   if(committed[0].meta.changes!==1){const old=await this.receipt(actor.memberId,commandId);if(old?.hash===hash)return old.result;throw conflict()}
   if(committed.some(r=>r.meta.changes!==1))throw unavailable();
   return result;
  },
 };
}
export type SideoutWriteStore=ReturnType<typeof makeSideoutWriteStore>;
