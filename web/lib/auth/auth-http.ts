import type {AuthPolicy} from './accounts';
import {login,logout,resolveSession,rotateAfterPasswordChange,type AuthRepository} from './auth-service';
import {clearSessionCookie,parseSessionCookie,sessionCookie} from './session-token';
import {AUTH_POLICY,SESSION_SECONDS} from './policy';
import {AuthError,type AuthErrorCode} from './errors';
import {toSessionView} from './identity';

export {AUTH_POLICY} from './policy';
type AuthAction='session'|'login'|'password'|'logout';
const json=(value:unknown,status=200,cookie?:string)=>Response.json(value,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
const errorStatus:Record<AuthErrorCode,number>={
 INVALID_INPUT:400,
 INVALID_CREDENTIALS:401,
 UNAUTHENTICATED:401,
 FORBIDDEN:403,
 CONFLICT:409,
 STORAGE_UNAVAILABLE:503,
};
function errorResponse(error:unknown){
 const known=error instanceof AuthError?error:new AuthError('STORAGE_UNAVAILABLE','잠시 후 다시 시도해 주세요.');
 return json({error:{code:known.code,message:known.message}},errorStatus[known.code]);
}

function safeOrigin(request:Request){
 const origin=request.headers.get('Origin');
 return !origin||origin===new URL(request.url).origin;
}
async function body(request:Request):Promise<Record<string,unknown>>{
 if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')throw new AuthError('INVALID_INPUT','요청 내용을 확인해 주세요.');
 let value:unknown;
 try{
  const raw=await request.text();
  if(raw.length>4000)throw new Error('body too long');
  value=JSON.parse(raw);
 }catch{throw new AuthError('INVALID_INPUT','요청 내용을 확인해 주세요.')}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new AuthError('INVALID_INPUT','요청 내용을 확인해 주세요.');
 return value as Record<string,unknown>;
}
function string(value:unknown){if(typeof value!=='string'||value.length>300)throw new AuthError('INVALID_INPUT','요청 내용을 확인해 주세요.');return value}

export async function handleAuthRequest(repo:AuthRepository,action:AuthAction,request:Request,policy:AuthPolicy=AUTH_POLICY):Promise<Response>{
 const secure=new URL(request.url).protocol==='https:';
 const token=parseSessionCookie(request.headers.get('Cookie'));
 if(action==='session'){
  try{
   return json(toSessionView(await resolveSession(repo,token)));
  }catch(error){return errorResponse(error)}
 }
 if(request.method!=='POST')return json({error:{code:'INVALID_INPUT',message:'허용되지 않는 요청입니다.'}},405);
 if(!safeOrigin(request))return errorResponse(new AuthError('FORBIDDEN','요청 출처를 확인해 주세요.'));
 try{
  if(action==='login'){
   const value=await body(request);
   const result=await login(repo,string(value.loginId),string(value.password),SESSION_SECONDS);
   return json({state:result.state},200,sessionCookie(result.token,SESSION_SECONDS,secure));
  }
  if(action==='password'){
   if(!token)return errorResponse(new AuthError('UNAUTHENTICATED','로그인이 필요합니다.'));
   const value=await body(request);
   const result=await rotateAfterPasswordChange(repo,token,string(value.currentPassword),string(value.newPassword),policy,SESSION_SECONDS);
   return json({state:result.state},200,sessionCookie(result.token,SESSION_SECONDS,secure));
  }
  await logout(repo,token);
  return json({state:'anonymous'},200,clearSessionCookie(secure));
 }catch(error){
  return errorResponse(error);
 }
}
