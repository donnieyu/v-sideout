import type {AccountRecord} from './accounts';
import type {AuthRepository,SessionRow} from './auth-service';

type D1Statement={first<T=Record<string,unknown>>():Promise<T|null>;run():Promise<{meta:{changes?:number}}>};
type D1Like={prepare(sql:string):{bind(...values:unknown[]):D1Statement};batch(statements:D1Statement[]):Promise<{meta:{changes?:number}}[]>};
type MemberRow={id:string;login_id:string;login_key:string;display_name:string;home_club_id:string|null;kind:'regular'|'new';is_master:number;home_role:'chair'|'staff'|null;grants_json:string;active:number;password_hash:string;must_change_password:number;temporary_expires_at:string|null;auth_version:number};
type SessionDbRow={token_hash:string;member_id:string;auth_version:number;restricted:number;expires_at:number};

function accountFromRow(row:MemberRow|null):AccountRecord|null{
 if(!row)return null;
 return {id:row.id,loginId:row.login_id,loginIdKey:row.login_key,displayName:row.display_name,homeClubId:row.home_club_id,kind:row.kind,isMaster:!!row.is_master,homeRole:row.home_role,grants:JSON.parse(row.grants_json),active:!!row.active,passwordHash:row.password_hash,mustChangePassword:!!row.must_change_password,temporaryExpiresAt:row.temporary_expires_at,authVersion:row.auth_version};
}

export function makeAuthRepository(db:D1Like):AuthRepository & {createAccount(account:AccountRecord):Promise<void>} {
 return {
  async getByLoginKey(key){return accountFromRow(await db.prepare('SELECT * FROM auth_members WHERE login_key=?').bind(key).first<MemberRow>())},
  async getById(id){return accountFromRow(await db.prepare('SELECT * FROM auth_members WHERE id=?').bind(id).first<MemberRow>())},
  async createAccount(a){
   await db.prepare('INSERT INTO auth_members (id,login_id,login_key,display_name,home_club_id,kind,is_master,home_role,grants_json,active,password_hash,must_change_password,temporary_expires_at,auth_version,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(a.id,a.loginId,a.loginIdKey,a.displayName,a.homeClubId,a.kind,Number(a.isMaster),a.homeRole,JSON.stringify(a.grants),Number(a.active),a.passwordHash,Number(a.mustChangePassword),a.temporaryExpiresAt,a.authVersion,new Date().toISOString()).run();
  },
  async saveAccount(a,expectedVersion){
   const result=await db.prepare('UPDATE auth_members SET login_id=?,login_key=?,display_name=?,home_club_id=?,kind=?,is_master=?,home_role=?,grants_json=?,active=?,password_hash=?,must_change_password=?,temporary_expires_at=?,auth_version=?,updated_at=? WHERE id=? AND auth_version=?')
    .bind(a.loginId,a.loginIdKey,a.displayName,a.homeClubId,a.kind,Number(a.isMaster),a.homeRole,JSON.stringify(a.grants),Number(a.active),a.passwordHash,Number(a.mustChangePassword),a.temporaryExpiresAt,a.authVersion,new Date().toISOString(),a.id,expectedVersion).run();
   return result.meta.changes===1;
  },
  async commitPasswordChange({expectedVersion,nextAccount:a,nextSession:s}){
   if(a.authVersion!==expectedVersion+1||s.memberId!==a.id||s.authVersion!==a.authVersion||s.restricted)throw new Error('Invalid password rotation');
   const updatedAt=new Date().toISOString();
   const results=await db.batch([
    db.prepare('UPDATE auth_members SET login_id=?,login_key=?,display_name=?,home_club_id=?,kind=?,is_master=?,home_role=?,grants_json=?,active=?,password_hash=?,must_change_password=?,temporary_expires_at=?,auth_version=?,updated_at=? WHERE id=? AND auth_version=? AND active=1')
     .bind(a.loginId,a.loginIdKey,a.displayName,a.homeClubId,a.kind,Number(a.isMaster),a.homeRole,JSON.stringify(a.grants),Number(a.active),a.passwordHash,Number(a.mustChangePassword),a.temporaryExpiresAt,a.authVersion,updatedAt,a.id,expectedVersion),
    db.prepare('INSERT INTO auth_sessions (token_hash,member_id,auth_version,restricted,expires_at,created_at) SELECT ?,?,?,?,?,? WHERE changes()=1')
     .bind(s.tokenHash,s.memberId,s.authVersion,Number(s.restricted),s.expiresAt,updatedAt),
    db.prepare('DELETE FROM auth_sessions WHERE member_id=? AND token_hash<>? AND changes()=1')
     .bind(a.id,s.tokenHash),
   ]);
   if(results[0]?.meta.changes===0)return 'conflict';
   if(results[0]?.meta.changes!==1||results[1]?.meta.changes!==1)throw new Error('Password rotation was not committed');
   return 'committed';
  },
  async getSession(hash){const row=await db.prepare('SELECT * FROM auth_sessions WHERE token_hash=?').bind(hash).first<SessionDbRow>();return row?{tokenHash:row.token_hash,memberId:row.member_id,authVersion:row.auth_version,restricted:!!row.restricted,expiresAt:row.expires_at}:null},
  async putSession(s:SessionRow){await db.prepare('INSERT INTO auth_sessions (token_hash,member_id,auth_version,restricted,expires_at,created_at) VALUES (?,?,?,?,?,?)').bind(s.tokenHash,s.memberId,s.authVersion,Number(s.restricted),s.expiresAt,new Date().toISOString()).run()},
  async deleteSession(hash){await db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(hash).run()},
  async deleteSessionsForMember(memberId){await db.prepare('DELETE FROM auth_sessions WHERE member_id=?').bind(memberId).run()},
 };
}
