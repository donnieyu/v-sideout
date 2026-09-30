import {resolveVerifiedIdentity} from './identity';
import {parseSessionCookie} from './session-token';
import {AUTH_POLICY} from './policy';
import {AuthError,type AuthErrorCode} from './errors';
import {memberAdminView,prepareManagedMember,prepareManagedUpdate,prepareReissue,validateManagedAffiliations,type ClubDirectory} from './member-management';
import type {AuthRepository} from './auth-service';
import type {MemberRepository} from './member-repository';
import type {VerifiedPrincipal} from './contracts';
import type {AuthPolicy,AccountRecord} from './accounts';

export type MemberDependencies={authRepo:AuthRepository;memberRepo:MemberRepository;directory:ClubDirectory};
export type MemberAction='list'|'detail'|'create'|'update'|'reissue'|'deactivate'|'reactivate';

const statuses:Record<AuthErrorCode,number>={INVALID_INPUT:400,INVALID_CREDENTIALS:401,UNAUTHENTICATED:401,
 FORBIDDEN:403,NOT_FOUND:404,CONFLICT:409,STORAGE_UNAVAILABLE:503};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
function invalid():never{throw new AuthError('INVALID_INPUT','요청 내용을 확인해 주세요.')}
function conflict():never{throw new AuthError('CONFLICT','계정이 변경되었거나 아이디가 사용 중입니다. 다시 확인해 주세요.')}
function notFound():never{throw new AuthError('NOT_FOUND','회원을 찾을 수 없습니다.')}
const isRecord=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);

async function body(request:Request,allowed:string[]):Promise<Record<string,unknown>>{
 if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')invalid();
 let value:unknown;
 try{const raw=await request.text();if(raw.length>4000)invalid();value=JSON.parse(raw)}catch{invalid()}
 if(!isRecord(value)||Object.keys(value).some(key=>!allowed.includes(key)))invalid();
 return value;
}
async function principal(repo:AuthRepository,request:Request,now:number):Promise<VerifiedPrincipal>{
 const resolved=await resolveVerifiedIdentity(repo,parseSessionCookie(request.headers.get('Cookie')),now);
 if(resolved.state==='anonymous')throw new AuthError('UNAUTHENTICATED','로그인이 필요합니다.');
 if(resolved.state!=='active'||!resolved.principal.isMaster)throw new AuthError('FORBIDDEN','마스터 권한이 필요합니다.');
 return resolved.principal;
}
function memberId(id:string|undefined):string{
 if(typeof id!=='string'||!id||id.length>100||/[\s/\p{C}]/u.test(id))invalid();
 return id;
}
function failure(error:unknown){
 const known=error instanceof AuthError?error:new AuthError('STORAGE_UNAVAILABLE','잠시 후 다시 시도해 주세요.');
 return json({error:{code:known.code,message:known.message}},statuses[known.code]);
}
function atTime(now:number){return new Date(now).toISOString()}
function mustBeUpdated(result:'committed'|'conflict'){if(result==='conflict')conflict()}
function protectLastMaster(previous:AccountRecord,next:AccountRecord){
 return previous.active&&previous.isMaster&&!previous.mustChangePassword&&(!next.active||!next.isMaster||next.mustChangePassword);
}

export async function handleMemberRequest(dependencies:MemberDependencies|(()=>MemberDependencies),action:MemberAction,request:Request,id?:string,now=Date.now()):Promise<Response>{
 try{
  const deps=typeof dependencies==='function'?dependencies():dependencies;
  const method=action==='list'||action==='detail'?'GET':action==='update'?'PATCH':'POST';
  if(request.method!==method)invalid();
  const actor=await principal(deps.authRepo,request,now);
  if(method!=='GET'){
   const origin=request.headers.get('Origin');
   if(origin!==new URL(request.url).origin)throw new AuthError('FORBIDDEN','요청 출처를 확인해 주세요.');
  }
  if(action==='list'){
   const members=await deps.memberRepo.listManagedMembers(actor);
   return json({members:members.map(memberAdminView)});
  }
  if(action==='create'){
   const data=await body(request,['loginId','displayName','homeClubId','homeRole','grants','isMaster']);
   const {account,temporaryPassword}=await prepareManagedMember(data,AUTH_POLICY,deps.directory,now);
   mustBeUpdated(await deps.memberRepo.createManagedMember(actor,account,atTime(now)));
   return json({member:memberAdminView(account),temporaryPassword},201);
  }
  const targetId=memberId(id);
  const current=await deps.memberRepo.getManagedMember(actor,targetId);
  if(!current)notFound();
  if(action==='detail')return json({member:memberAdminView(current)});
  let next:AccountRecord,temporaryPassword:string|undefined;
  if(action==='update'){
   next=await prepareManagedUpdate(current,await body(request,['displayName','homeClubId','homeRole','grants','isMaster']),deps.directory);
  }else if(action==='reissue'||action==='reactivate'){
   await body(request,[]);
   if(action==='reactivate')await validateManagedAffiliations(current,deps.directory);
   const prepared=await prepareReissue(current,AUTH_POLICY,now,action==='reactivate');
   next=prepared.account;temporaryPassword=prepared.temporaryPassword;
  }else{
   await body(request,[]);
   if(!current.active)conflict();
   next={...current,active:false,authVersion:current.authVersion+1};
  }
  mustBeUpdated(await deps.memberRepo.commitManagedUpdate({actor,expectedVersion:current.authVersion,nextAccount:next,
   action:action==='update'?'member_updated':action==='reissue'?'password_reissued':action==='deactivate'?'member_deactivated':'member_reactivated',
   protectLastMaster:protectLastMaster(current,next),at:atTime(now)}));
  return json({member:memberAdminView(next),...(temporaryPassword?{temporaryPassword}:{})});
 }catch(error){return failure(error)}
}

// Server-only bootstrap. Deliberately not wired to an HTTP route.
export async function bootstrapFirstMaster(repo:MemberRepository,directory:ClubDirectory,input:unknown,policy:AuthPolicy=AUTH_POLICY,now=Date.now()){
 if(!isRecord(input)||Object.keys(input).some(key=>!['loginId','displayName'].includes(key)))invalid();
 const {account,temporaryPassword}=await prepareManagedMember({loginId:input.loginId,displayName:input.displayName,
  homeClubId:null,homeRole:null,grants:[],isMaster:true},policy,directory,now);
 mustBeUpdated(await repo.bootstrapFirstMaster(account,atTime(now)));
 return {member:memberAdminView(account),temporaryPassword};
}
