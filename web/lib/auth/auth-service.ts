import {authenticateAccount,changePassword, type AccountRecord, type AuthPolicy} from './accounts';
import {normalizeLoginId} from './credentials';
import {createSessionToken,hashSessionToken} from './session-token';
import {AuthError} from './errors';

export type SessionRow={tokenHash:string;memberId:string;authVersion:number;restricted:boolean;expiresAt:number};
export type AuthRepository={
 getByLoginKey(key:string):Promise<AccountRecord|null>;
 getById(id:string):Promise<AccountRecord|null>;
 saveAccount(next:AccountRecord,expectedVersion:number):Promise<boolean>;
 getSession(hash:string):Promise<SessionRow|null>;
 putSession(row:SessionRow):Promise<void>;
 deleteSession(hash:string):Promise<void>;
 deleteSessionsForMember(memberId:string):Promise<void>;
 commitPasswordChange(input:{expectedVersion:number;nextAccount:AccountRecord;nextSession:SessionRow}):Promise<'committed'|'conflict'>;
};
type ActiveSession={state:'active';account:AccountRecord};
type RestrictedSession={state:'password_change_required';account:AccountRecord};
type AnonymousSession={state:'anonymous'};
export type ResolvedSession=ActiveSession|RestrictedSession|AnonymousSession;

function validTtl(seconds:number){
 if(!Number.isSafeInteger(seconds)||seconds<1)throw new Error('Invalid session lifetime');
 return seconds*1000;
}

async function issueSession(repo:AuthRepository,account:AccountRecord,restricted:boolean,ttlSeconds:number,now:number){
 const token=createSessionToken();
 await repo.putSession({tokenHash:await hashSessionToken(token),memberId:account.id,authVersion:account.authVersion,restricted,expiresAt:now+validTtl(ttlSeconds)});
 return token;
}

export async function login(repo:AuthRepository,loginId:string,password:string,ttlSeconds:number,now=Date.now()):Promise<{state:'active'|'password_change_required';token:string}>{
 let key:string;
 try{key=normalizeLoginId(loginId)}catch{throw new AuthError('INVALID_INPUT','로그인 아이디를 확인해 주세요.')}
 const account=await repo.getByLoginKey(key);
 if(!account)throw new AuthError('INVALID_CREDENTIALS','아이디 또는 비밀번호를 확인해 주세요.');
 const result=await authenticateAccount(account,password,now);
 if(result==='invalid'||result==='inactive'||result==='expired')throw new AuthError('INVALID_CREDENTIALS','아이디 또는 비밀번호를 확인해 주세요.');
 const restricted=result==='change_required';
 return {state:restricted?'password_change_required':'active',token:await issueSession(repo,account,restricted,ttlSeconds,now)};
}

export async function resolveSession(repo:AuthRepository,token:string|null,now=Date.now()):Promise<ResolvedSession>{
 if(!token)return {state:'anonymous'};
 let hash:string;
 try{hash=await hashSessionToken(token)}catch{return {state:'anonymous'}}
 const session=await repo.getSession(hash);
 if(!session||session.expiresAt<=now)return {state:'anonymous'};
 const account=await repo.getById(session.memberId);
 if(!account||!account.active||account.authVersion!==session.authVersion)return {state:'anonymous'};
 if(account.mustChangePassword||session.restricted){
  if(!account.mustChangePassword||!session.restricted||account.temporaryExpiresAt&&Date.parse(account.temporaryExpiresAt)<=now)return {state:'anonymous'};
  return {state:'password_change_required',account};
 }
 return {state:'active',account};
}

export async function rotateAfterPasswordChange(repo:AuthRepository,token:string,currentPassword:string,newPassword:string,policy:AuthPolicy,ttlSeconds:number,now=Date.now()):Promise<{state:'active';token:string}>{
 const resolved=await resolveSession(repo,token,now);
 if(resolved.state==='anonymous')throw new AuthError('UNAUTHENTICATED','로그인이 필요합니다.');
 let next:AccountRecord;
 try{next=await changePassword(resolved.account,currentPassword,newPassword,policy,now)}catch{throw new AuthError('INVALID_INPUT','입력 내용과 계정 상태를 확인해 주세요.')}
 const successorToken=createSessionToken();
 const nextSession:SessionRow={tokenHash:await hashSessionToken(successorToken),memberId:next.id,authVersion:next.authVersion,restricted:false,expiresAt:now+validTtl(ttlSeconds)};
 if(await repo.commitPasswordChange({expectedVersion:resolved.account.authVersion,nextAccount:next,nextSession})==='conflict')throw new AuthError('CONFLICT','계정이 변경되었습니다. 다시 시도해 주세요.');
 return {state:'active',token:successorToken};
}

export async function logout(repo:AuthRepository,token:string|null):Promise<void>{
 if(!token)return;
 let hash:string;
 try{hash=await hashSessionToken(token)}catch{return}
 await repo.deleteSession(hash);
}
