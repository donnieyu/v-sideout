import type {AccountRecord} from './accounts';
import type {VerifiedPrincipal} from './contracts';
import {accountFromRow,type MemberRow} from './d1-repository';

type Actor=Pick<VerifiedPrincipal,'memberId'|'authorizationVersion'>;
type MutationAction='member_updated'|'password_reissued'|'member_deactivated'|'member_reactivated';
type D1Statement={first<T=Record<string,unknown>>():Promise<T|null>;all<T=Record<string,unknown>>():Promise<{results:T[]}>;run():Promise<{meta:{changes?:number}}>};
type D1Like={prepare(sql:string):{bind(...values:unknown[]):D1Statement};batch(statements:D1Statement[]):Promise<{meta:{changes?:number}}[]>};

const actorGuard='EXISTS (SELECT 1 FROM auth_members actor WHERE actor.id=? AND actor.auth_version=? AND actor.active=1 AND actor.is_master=1 AND actor.must_change_password=0)';
const memberColumns='id,login_id,login_key,display_name,home_club_id,kind,is_master,home_role,grants_json,active,password_hash,must_change_password,temporary_expires_at,auth_version,created_at';
const memberValues='?,?,?,?,?,?,?,?,?,?,?,?,?,?,?';

function memberParams(a:AccountRecord,at:string){
 return [a.id,a.loginId,a.loginIdKey,a.displayName,a.homeClubId,a.kind,Number(a.isMaster),a.homeRole,JSON.stringify(a.grants),
  Number(a.active),a.passwordHash,Number(a.mustChangePassword),a.temporaryExpiresAt,a.authVersion,at];
}
function validateNew(a:AccountRecord){
 if(a.authVersion!==1||!a.active||!a.mustChangePassword||!a.temporaryExpiresAt)throw new Error('Invalid new member account');
}
function committed(results:{meta:{changes?:number}}[],auditIndex:number){
 if(results[0]?.meta.changes===0)return 'conflict' as const;
 if(results[0]?.meta.changes!==1||results[auditIndex]?.meta.changes!==1)throw new Error('Member mutation was not committed');
 return 'committed' as const;
}

export function makeMemberRepository(db:D1Like){
 return {
  async bootstrapFirstMaster(account:AccountRecord,at:string){
   validateNew(account);
   if(!account.isMaster||account.homeClubId!==null||account.homeRole!==null||account.grants.length)throw new Error('Invalid first master');
   const results=await db.batch([
    db.prepare(`INSERT INTO auth_members (${memberColumns}) SELECT ${memberValues} WHERE NOT EXISTS (SELECT 1 FROM auth_members) ON CONFLICT(login_key) DO NOTHING`).bind(...memberParams(account,at)),
    db.prepare('INSERT INTO auth_member_audit (id,actor_member_id,target_member_id,action,target_auth_version,created_at) SELECT ?,NULL,?,?,?,? WHERE changes()=1')
     .bind(crypto.randomUUID(),account.id,'master_bootstrapped',account.authVersion,at),
   ]);
   return committed(results,1);
  },
  async createManagedMember(actor:Actor,account:AccountRecord,at:string){
   validateNew(account);
   const results=await db.batch([
    db.prepare(`INSERT INTO auth_members (${memberColumns}) SELECT ${memberValues} WHERE ${actorGuard} ON CONFLICT(login_key) DO NOTHING`)
     .bind(...memberParams(account,at),actor.memberId,actor.authorizationVersion),
    db.prepare('INSERT INTO auth_member_audit (id,actor_member_id,target_member_id,action,target_auth_version,created_at) SELECT ?,?,?,?,?,? WHERE changes()=1')
     .bind(crypto.randomUUID(),actor.memberId,account.id,'member_created',account.authVersion,at),
   ]);
   return committed(results,1);
  },
  async listManagedMembers(actor:Actor):Promise<AccountRecord[]>{
   const rows=await db.prepare(`SELECT m.* FROM auth_members m WHERE ${actorGuard} ORDER BY m.display_name COLLATE NOCASE,m.id`)
    .bind(actor.memberId,actor.authorizationVersion).all<MemberRow>();
   return rows.results.map(row=>accountFromRow(row)!);
  },
  async getManagedMember(actor:Actor,id:string):Promise<AccountRecord|null>{
   return accountFromRow(await db.prepare(`SELECT m.* FROM auth_members m WHERE m.id=? AND ${actorGuard}`)
    .bind(id,actor.memberId,actor.authorizationVersion).first<MemberRow>());
  },
  async commitManagedUpdate(input:{actor:Actor;expectedVersion:number;nextAccount:AccountRecord;action:MutationAction;protectLastMaster:boolean;at:string}){
   const {actor,expectedVersion,nextAccount:a,action,protectLastMaster,at}=input;
   if(a.authVersion!==expectedVersion+1)throw new Error('Invalid member version');
   const results=await db.batch([
    db.prepare(`UPDATE auth_members SET display_name=?,home_club_id=?,kind=?,is_master=?,home_role=?,grants_json=?,active=?,password_hash=?,must_change_password=?,temporary_expires_at=?,auth_version=?,updated_at=? WHERE id=? AND auth_version=? AND ${actorGuard} AND (?=0 OR EXISTS (SELECT 1 FROM auth_members other WHERE other.id<>? AND other.active=1 AND other.is_master=1))`)
     .bind(a.displayName,a.homeClubId,a.kind,Number(a.isMaster),a.homeRole,JSON.stringify(a.grants),Number(a.active),a.passwordHash,
      Number(a.mustChangePassword),a.temporaryExpiresAt,a.authVersion,at,a.id,expectedVersion,actor.memberId,actor.authorizationVersion,Number(protectLastMaster),a.id),
    db.prepare('INSERT INTO auth_member_audit (id,actor_member_id,target_member_id,action,target_auth_version,created_at) SELECT ?,?,?,?,?,? WHERE changes()=1')
     .bind(crypto.randomUUID(),actor.memberId,a.id,action,a.authVersion,at),
    db.prepare('DELETE FROM auth_sessions WHERE member_id=? AND changes()=1').bind(a.id),
   ]);
   return committed(results,1);
  },
 };
}

export type MemberRepository=ReturnType<typeof makeMemberRepository>;
