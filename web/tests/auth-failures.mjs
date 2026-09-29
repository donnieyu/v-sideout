import assert from 'node:assert/strict';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-auth-failures-'));
try{
 for(const name of ['credentials','accounts','session-token','errors','policy','auth-service','auth-http']){
  const source=await readFile(new URL(`../lib/auth/${name}.ts`,import.meta.url),'utf8').catch(()=> 'export {}');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
   .replaceAll(/from '\.\/(credentials|accounts|session-token|errors|policy|auth-service)'/g,"from './$1.mjs'");
  await writeFile(join(dir,`${name}.mjs`),code);
 }
 const {AUTH_POLICY}=await import(pathToFileURL(join(dir,'policy.mjs')));
 const {prepareAccount}=await import(pathToFileURL(join(dir,'accounts.mjs')));
 const {createSessionToken,hashSessionToken}=await import(pathToFileURL(join(dir,'session-token.mjs')));
 const {resolveSession}=await import(pathToFileURL(join(dir,'auth-service.mjs')));
 const {handleAuthRequest}=await import(pathToFileURL(join(dir,'auth-http.mjs')));
 const now=Date.now(),url='https://sideout.example/api/auth';
 const original=await prepareAccount({id:'member-1',loginId:'나래',displayName:'나래',homeClubId:null,kind:'regular',isMaster:false,grants:[]},'abc12345',AUTH_POLICY,now);
 let account=original,deleteFails=false,getFails=false,loginLookupFails=false,deleteCalls=0;
 const sessions=new Map();
 const repo={
  async getByLoginKey(key){if(loginLookupFails)throw new Error('synthetic database outage');return account.loginIdKey===key?account:null},
  async getById(id){return id===account.id?account:null},
  async saveAccount(){throw new Error('unused')},
  async getSession(hash){if(getFails)throw new Error('synthetic database outage');return sessions.get(hash)??null},
  async putSession(row){sessions.set(row.tokenHash,row)},
  async deleteSession(hash){deleteCalls++;if(deleteFails)throw new Error('synthetic database outage');sessions.delete(hash)},
  async deleteSessionsForMember(){throw new Error('unused')},
 };
 const cookieFor=async (restricted)=>{
  const token=createSessionToken(),hash=await hashSessionToken(token);
  sessions.set(hash,{tokenHash:hash,memberId:account.id,authVersion:account.authVersion,restricted,expiresAt:now+3600000});
  return {token,cookie:`sideout_session=${token}`};
 };
 const get=(cookie)=>new Request(`${url}/session`,{headers:cookie?{Cookie:cookie}:{}});
 const post=(path,cookie,body)=>new Request(`${url}/${path}`,{method:'POST',headers:{Origin:'https://sideout.example',...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 for(const restricted of [true,false]){
  account=restricted?original:{...original,mustChangePassword:false,temporaryExpiresAt:null,authVersion:2};
  const {token,cookie}=await cookieFor(restricted);
  deleteFails=true;
  let response=await handleAuthRequest(repo,'logout',post('logout',cookie),AUTH_POLICY);
  assert.equal(response.status,503);
  assert.equal((await response.json()).error.code,'STORAGE_UNAVAILABLE');
  assert.equal(response.headers.get('set-cookie'),null);
  assert.equal((await resolveSession(repo,token,now)).state,restricted?'password_change_required':'active');
  deleteFails=false;
  response=await handleAuthRequest(repo,'logout',post('logout',cookie),AUTH_POLICY);
  assert.equal(response.status,200);
  assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
  assert.equal((await resolveSession(repo,token,now)).state,'anonymous');
 }
 const beforeBadCookie=deleteCalls;
 const badCookie=await handleAuthRequest(repo,'logout',post('logout','sideout_session=invalid'),AUTH_POLICY);
 assert.equal(badCookie.status,200);
 assert.equal(deleteCalls,beforeBadCookie);
 getFails=true;
 const unavailable=await handleAuthRequest(repo,'session',get((await cookieFor(false)).cookie),AUTH_POLICY);
 assert.equal(unavailable.status,503);
 assert.equal((await unavailable.json()).error.code,'STORAGE_UNAVAILABLE');
 assert.equal(unavailable.headers.get('set-cookie'),null);
 getFails=false;
 loginLookupFails=true;
 const loginUnavailable=await handleAuthRequest(repo,'login',post('login',null,{loginId:'나래',password:'abc12345'}),AUTH_POLICY);
 assert.equal(loginUnavailable.status,503);
 assert.equal((await loginUnavailable.json()).error.code,'STORAGE_UNAVAILABLE');
 loginLookupFails=false;
 const absent=await handleAuthRequest(repo,'login',post('login',null,{loginId:'없는아이디',password:'abc12345'}),AUTH_POLICY);
 const wrong=await handleAuthRequest(repo,'login',post('login',null,{loginId:'나래',password:'wrong123'}),AUTH_POLICY);
 assert.equal(absent.status,401);
 assert.equal(wrong.status,401);
 assert.deepEqual(await absent.json(),await wrong.json());
 const missingAuth=await handleAuthRequest(repo,'password',post('password',null,{currentPassword:'abc12345',newPassword:'new12345'}),AUTH_POLICY);
 assert.equal(missingAuth.status,401);
 assert.equal((await missingAuth.json()).error.code,'UNAUTHENTICATED');
 const invalidBody=await handleAuthRequest(repo,'login',post('login',null,{loginId:12,password:'abc12345'}),AUTH_POLICY);
 assert.equal(invalidBody.status,400);
 assert.equal((await invalidBody.json()).error.code,'INVALID_INPUT');
 console.log('PASS auth HTTP storage failure, logout revocation, invalid cookie, credential privacy and typed errors');
}finally{await rm(dir,{recursive:true,force:true})}
