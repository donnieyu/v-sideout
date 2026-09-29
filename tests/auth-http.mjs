import assert from 'node:assert/strict';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-auth-http-'));
try{
 for(const name of ['credentials','accounts','session-token','auth-service','policy','auth-http']){
  const source=await readFile(new URL(`../lib/auth/${name}.ts`,import.meta.url),'utf8').catch(()=> 'export {}');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replaceAll(/from '\.\/(credentials|accounts|session-token|auth-service|policy)'/g,"from './$1.mjs'");
  await writeFile(join(dir,`${name}.mjs`),code);
 }
 const {prepareAccount}=await import(pathToFileURL(join(dir,'accounts.mjs')));
 const {handleAuthRequest,AUTH_POLICY:policy}=await import(pathToFileURL(join(dir,'auth-http.mjs')));
 assert.equal(policy.minPasswordLength,8);
 assert.equal(policy.temporaryCredentialDays,7);
 const account=await prepareAccount({id:'u1',loginId:'나래',displayName:'김나래',homeClubId:'seoul-demo',kind:'regular',isMaster:false,grants:[]},'TempPassword123',policy);
 const accounts=new Map([[account.id,account]]),sessions=new Map();
 const repo={async getByLoginKey(key){return [...accounts.values()].find(a=>a.loginIdKey===key)??null},async getById(id){return accounts.get(id)??null},async saveAccount(a,version){if(accounts.get(a.id)?.authVersion!==version)return false;accounts.set(a.id,a);return true},async getSession(hash){return sessions.get(hash)??null},async putSession(s){sessions.set(s.tokenHash,s)},async deleteSession(hash){sessions.delete(hash)},async deleteSessionsForMember(id){for(const [key,s] of sessions)if(s.memberId===id)sessions.delete(key)}};
 const url='https://sideout.example/api/auth';
 const request=(path,body,cookie,origin='https://sideout.example')=>new Request(`${url}/${path}`,{method:'POST',headers:{'Content-Type':'application/json','Origin':origin,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
 let response=await handleAuthRequest(repo,'session',new Request(`${url}/session`),policy);
 assert.equal((await response.json()).state,'anonymous');
 response=await handleAuthRequest(repo,'login',request('login',{loginId:'나래',password:'TempPassword123'},null,'https://attacker.example'),policy);
 assert.equal(response.status,403);
 response=await handleAuthRequest(repo,'login',request('login',{loginId:'나래',password:'TempPassword123'}),policy);
 assert.equal(response.status,200);
 assert.equal((await response.json()).state,'password_change_required');
 const oldCookie=response.headers.get('Set-Cookie').split(';')[0];
 assert.ok(response.headers.get('Set-Cookie').includes('HttpOnly'));
 response=await handleAuthRequest(repo,'password',request('password',{currentPassword:'TempPassword123',newPassword:'NewPassword123'},oldCookie),policy);
 assert.equal(response.status,200);
 assert.equal((await response.json()).state,'active');
 const newCookie=response.headers.get('Set-Cookie').split(';')[0];
 response=await handleAuthRequest(repo,'session',new Request(`${url}/session`,{headers:{Cookie:oldCookie}}),policy);
 assert.equal((await response.json()).state,'anonymous');
 response=await handleAuthRequest(repo,'session',new Request(`${url}/session`,{headers:{Cookie:newCookie}}),policy);
 const active=await response.json();assert.equal(active.state,'active');assert.equal(active.me.memberId,'u1');assert.equal(JSON.stringify(active).includes('passwordHash'),false);
 response=await handleAuthRequest(repo,'logout',request('logout',{},newCookie),policy);
 assert.equal(response.status,200);
 response=await handleAuthRequest(repo,'session',new Request(`${url}/session`,{headers:{Cookie:newCookie}}),policy);
 assert.equal((await response.json()).state,'anonymous');
 console.log('PASS auth HTTP: CSRF origin, restricted login, rotation, safe session, logout');
}finally{await rm(dir,{recursive:true,force:true})}
