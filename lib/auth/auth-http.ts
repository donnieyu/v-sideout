import type {AuthPolicy} from './accounts';
import {login,logout,resolveSession,rotateAfterPasswordChange,type AuthRepository} from './auth-service';
import {clearSessionCookie,parseSessionCookie,sessionCookie} from './session-token';
import {AUTH_POLICY,SESSION_SECONDS} from './policy';

export {AUTH_POLICY} from './policy';
type AuthAction='session'|'login'|'password'|'logout';
const json=(value:unknown,status=200,cookie?:string)=>Response.json(value,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});

function safeOrigin(request:Request){
 const origin=request.headers.get('Origin');
 return !origin||origin===new URL(request.url).origin;
}
async function body(request:Request):Promise<Record<string,unknown>>{
 if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')throw new Error('invalid body');
 const raw=await request.text();
 if(raw.length>4000)throw new Error('invalid body');
 const value:unknown=JSON.parse(raw);
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('invalid body');
 return value as Record<string,unknown>;
}
function string(value:unknown){if(typeof value!=='string'||value.length>300)throw new Error('invalid body');return value}

export async function handleAuthRequest(repo:AuthRepository,action:AuthAction,request:Request,policy:AuthPolicy=AUTH_POLICY):Promise<Response>{
 const secure=new URL(request.url).protocol==='https:';
 const token=parseSessionCookie(request.headers.get('Cookie'));
 if(action==='session'){
  const result=await resolveSession(repo,token);
  if(result.state==='anonymous')return json({state:'anonymous'});
  if(result.state==='password_change_required')return json({state:'password_change_required',expiresAt:result.account.temporaryExpiresAt});
  const a=result.account;
  return json({state:'active',me:{memberId:a.id,displayName:a.displayName,homeClubId:a.homeClubId,kind:a.kind,isMaster:a.isMaster,homeRole:a.homeRole,grants:a.grants},authorizationVersion:a.authVersion});
 }
 if(request.method!=='POST')return json({error:'허용되지 않는 요청입니다.'},405);
 if(!safeOrigin(request))return json({error:'요청 출처를 확인해 주세요.'},403);
 try{
  if(action==='login'){
   const value=await body(request);
   const result=await login(repo,string(value.loginId),string(value.password),SESSION_SECONDS);
   return json({state:result.state},200,sessionCookie(result.token,SESSION_SECONDS,secure));
  }
  if(action==='password'){
   if(!token)return json({error:'로그인이 필요합니다.'},401);
   const value=await body(request);
   const result=await rotateAfterPasswordChange(repo,token,string(value.currentPassword),string(value.newPassword),policy,SESSION_SECONDS);
   return json({state:result.state},200,sessionCookie(result.token,SESSION_SECONDS,secure));
  }
  await logout(repo,token);
  return json({state:'anonymous'},200,clearSessionCookie(secure));
 }catch{
  return json({error:action==='login'?'아이디 또는 비밀번호를 확인해 주세요.':'입력 내용과 계정 상태를 확인해 주세요.'},400);
 }
}
