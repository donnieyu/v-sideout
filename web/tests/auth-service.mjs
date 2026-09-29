import assert from 'node:assert/strict';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-auth-service-'));
try{
 for(const name of ['credentials','accounts','session-token','errors','auth-service']){
  const source=await readFile(new URL(`../lib/auth/${name}.ts`,import.meta.url),'utf8').catch(()=> 'export {}');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
   .replaceAll("'./credentials'","'./credentials.mjs'").replaceAll("'./accounts'","'./accounts.mjs'").replaceAll("'./session-token'","'./session-token.mjs'").replaceAll("'./errors'","'./errors.mjs'");
  await writeFile(join(dir,`${name}.mjs`),code);
 }
 const {prepareAccount}=await import(pathToFileURL(join(dir,'accounts.mjs')));
 const {login,resolveSession,rotateAfterPasswordChange,logout}=await import(pathToFileURL(join(dir,'auth-service.mjs')));
 const now=Date.parse('2026-09-29T00:00:00Z'),policy={minPasswordLength:12,temporaryCredentialDays:7};
 const account=await prepareAccount({id:'user-1',loginId:'나래',displayName:'김나래',homeClubId:'seoul-demo',kind:'regular',isMaster:false,grants:[]},'TempPassword123',policy,now);
 const members=new Map([[account.id,account]]),sessions=new Map();
 let rotationFailure=false;
 const repository={
  async getByLoginKey(key){return [...members.values()].find(member=>member.loginIdKey===key)??null},
  async getById(id){return members.get(id)??null},
  async saveAccount(){throw new Error('legacy non-atomic write forbidden')},
  async commitPasswordChange({expectedVersion,nextAccount,nextSession}){
   if(rotationFailure)throw new Error('storage failure');
   if(members.get(nextAccount.id)?.authVersion!==expectedVersion)return 'conflict';
   members.set(nextAccount.id,nextAccount);
   for(const [hash,row] of sessions)if(row.memberId===nextAccount.id)sessions.delete(hash);
   sessions.set(nextSession.tokenHash,nextSession);
   return 'committed';
  },
  async getSession(hash){return sessions.get(hash)??null},
  async putSession(row){sessions.set(row.tokenHash,row)},
  async deleteSession(hash){sessions.delete(hash)},
  async deleteSessionsForMember(memberId){for(const [hash,row] of sessions)if(row.memberId===memberId)sessions.delete(hash)},
 };
 await assert.rejects(()=>login(repository,'나래','wrong-password',3600,now));
 const signedIn=await login(repository,' 나래 ','TempPassword123',3600,now);
 assert.equal(signedIn.state,'password_change_required');
 assert.equal(sessions.has(signedIn.token),false,'raw token must not be the stored key');
 assert.equal((await resolveSession(repository,signedIn.token,now)).state,'password_change_required');
 const changed=await rotateAfterPasswordChange(repository,signedIn.token,'TempPassword123','NewPassword123',policy,3600,now);
 assert.equal(changed.state,'active');
 assert.equal((await resolveSession(repository,signedIn.token,now)).state,'anonymous');
 assert.equal((await resolveSession(repository,changed.token,now)).state,'active');
 rotationFailure=true;
 await assert.rejects(()=>rotateAfterPasswordChange(repository,changed.token,'NewPassword123','AnotherPassword123',policy,3600,now),/storage failure/);
 assert.equal((await resolveSession(repository,changed.token,now)).state,'active');
 assert.equal(members.get(account.id).authVersion,2);
 rotationFailure=false;
 await rotateAfterPasswordChange(repository,changed.token,'NewPassword123','AnotherPassword123',policy,3600,now);
 const afterLostResponse=await login(repository,'나래','AnotherPassword123',3600,now);
 assert.equal(afterLostResponse.state,'active','new password must work if rotation response was lost');
 await logout(repository,changed.token);
 assert.equal((await resolveSession(repository,changed.token,now)).state,'anonymous');
 console.log('PASS login, restricted session, password rotation and logout');
}finally{await rm(dir,{recursive:true,force:true})}
