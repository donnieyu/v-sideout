import type {SessionView} from './auth/contracts';
import type {MemberAdminView,MemberChanges,MemberDraft} from './auth/member-management';
import type {AuthErrorCode} from './auth/errors';

export type AccessErrorCode=AuthErrorCode|'NETWORK_ERROR';
export class MemberAccessError extends Error{
 constructor(readonly code:AccessErrorCode,readonly status:number,message:string){super(message);this.name='MemberAccessError'}
}

type AuthTransition={state:'active'|'password_change_required'|'anonymous'};
type MemberResult={member:MemberAdminView};
export type IssuedMemberResult=MemberResult&{temporaryPassword:string};
type ErrorBody={error?:{code?:string;message?:string}};
const codes=new Set<AccessErrorCode>(['INVALID_INPUT','INVALID_CREDENTIALS','UNAUTHENTICATED','FORBIDDEN','NOT_FOUND','CONFLICT','STORAGE_UNAVAILABLE']);
const unavailable=()=>new MemberAccessError('STORAGE_UNAVAILABLE',503,'서비스 응답을 확인할 수 없습니다. 다시 시도해 주세요.');
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function sessionView(value:unknown):SessionView{
 if(!record(value))throw unavailable();
 if(value.state==='anonymous')return {state:'anonymous'};
 if(value.state==='password_change_required'&&typeof value.expiresAt==='string')return value as SessionView;
 if(value.state==='active'&&record(value.me)&&typeof value.me.memberId==='string'&&typeof value.me.loginId==='string'&&typeof value.me.displayName==='string'&&typeof value.authorizationVersion==='number')return value as SessionView;
 throw unavailable();
}
function transition(value:unknown):AuthTransition{
 if(record(value)&&(value.state==='active'||value.state==='password_change_required'||value.state==='anonymous'))return value as AuthTransition;
 throw unavailable();
}
function memberView(value:unknown):value is MemberAdminView{
 if(!record(value)||typeof value.memberId!=='string'||typeof value.loginId!=='string'||typeof value.displayName!=='string')return false;
 if(value.homeClubId!==null&&typeof value.homeClubId!=='string')return false;
 if(value.kind!=='regular'&&value.kind!=='new')return false;
 if(typeof value.isMaster!=='boolean'||(value.homeRole!==null&&value.homeRole!=='chair'&&value.homeRole!=='staff'))return false;
 if(!Array.isArray(value.grants)||!value.grants.every(grant=>record(grant)&&typeof grant.clubId==='string'&&(grant.role==='chair'||grant.role==='staff')))return false;
 if(typeof value.active!=='boolean'||typeof value.mustChangePassword!=='boolean')return false;
 return (value.temporaryExpiresAt===null||typeof value.temporaryExpiresAt==='string')&&typeof value.authorizationVersion==='number';
}
function memberResult(value:unknown):MemberResult{
 if(record(value)&&memberView(value.member))return value as MemberResult;
 throw unavailable();
}
function issuedResult(value:unknown):IssuedMemberResult{
 const result=memberResult(value);
 if(!record(value)||typeof value.temporaryPassword!=='string'||!value.temporaryPassword)throw unavailable();
 return {...result,temporaryPassword:value.temporaryPassword};
}

export function createMemberAccessClient(fetcher:typeof fetch=fetch){
 async function request<T>(path:string,method:'GET'|'POST'|'PATCH'='GET',payload?:unknown):Promise<T>{
  const options:RequestInit={method,credentials:'same-origin',cache:'no-store',
   ...(payload===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})};
  let response:Response;
  try{response=await fetcher(path,options)}catch{throw new MemberAccessError('NETWORK_ERROR',0,'연결을 확인하고 다시 시도해 주세요.')}
  let value:unknown;
  try{value=await response.json()}catch{throw unavailable()}
  if(!response.ok){
   const error=(value&&typeof value==='object'?(value as ErrorBody).error:undefined);
   const code=error?.code&&codes.has(error.code as AccessErrorCode)?error.code as AccessErrorCode:'STORAGE_UNAVAILABLE';
   throw new MemberAccessError(code,response.status,error?.message||'요청을 완료하지 못했습니다. 다시 시도해 주세요.');
  }
  return value as T;
 }
 const memberPath=(id:string)=>`/api/members/${encodeURIComponent(id)}`;
 return {
  session:async()=>sessionView(await request<unknown>('/api/auth/session')),
  login:async(loginId:string,password:string)=>transition(await request<unknown>('/api/auth/login','POST',{loginId,password})),
  changePassword:async(currentPassword:string,newPassword:string)=>transition(await request<unknown>('/api/auth/password','POST',{currentPassword,newPassword})),
  logout:async()=>transition(await request<unknown>('/api/auth/logout','POST')),
  listMembers:async()=>{
   const result=await request<unknown>('/api/members');
   if(!record(result)||!Array.isArray(result.members)||!result.members.every(memberView))throw unavailable();
   return result.members as MemberAdminView[];
  },
  member:async(id:string)=>memberResult(await request<unknown>(memberPath(id))),
  createMember:async(draft:MemberDraft)=>issuedResult(await request<unknown>('/api/members','POST',draft)),
  updateMember:async(id:string,changes:MemberChanges)=>memberResult(await request<unknown>(memberPath(id),'PATCH',changes)),
  reissue:async(id:string)=>issuedResult(await request<unknown>(`${memberPath(id)}/reissue`,'POST',{})),
  deactivate:async(id:string)=>memberResult(await request<unknown>(`${memberPath(id)}/deactivate`,'POST',{})),
  reactivate:async(id:string)=>issuedResult(await request<unknown>(`${memberPath(id)}/reactivate`,'POST',{})),
 };
}

export type MemberAccessClient=ReturnType<typeof createMemberAccessClient>;
export const memberAccessClient=createMemberAccessClient();
