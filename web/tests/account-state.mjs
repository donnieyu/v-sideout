import assert from 'node:assert/strict';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-account-'));
try{
 for(const name of ['credentials','accounts','policy']){
  const source=await readFile(new URL(`../lib/auth/${name}.ts`,import.meta.url),'utf8').catch(()=> 'export {}');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replaceAll("'./credentials'","'./credentials.mjs'");
  await writeFile(join(dir,`${name}.mjs`),code);
 }
 const {prepareAccount,authenticateAccount,changePassword,deactivateAccount,clubRole}=await import(pathToFileURL(join(dir,'accounts.mjs')));
 const {AUTH_POLICY:policy}=await import(pathToFileURL(join(dir,'policy.mjs')));
 const now=Date.parse('2026-09-29T00:00:00Z');
 assert.equal(policy.minPasswordLength,8);
 const original=await prepareAccount({id:'id-1',loginId:' KimNarae ',displayName:'김나래',homeClubId:'seoul-demo',kind:'regular',isMaster:false,grants:[{clubId:'heroes',role:'staff'}]},'TempPassword123',policy,now);
 assert.equal(original.id,'id-1');
 assert.equal(original.loginId,'KimNarae');
 assert.equal(original.loginIdKey,'kimnarae');
 assert.equal(original.mustChangePassword,true);
 assert.equal(original.temporaryExpiresAt,new Date(now+7*86400000).toISOString());
 assert.equal(await authenticateAccount(original,'TempPassword123',now),'change_required');
 assert.equal(await authenticateAccount(original,'wrong-password',now),'invalid');
 assert.equal(await authenticateAccount(original,'TempPassword123',now+7*86400000),'expired');
 assert.equal(clubRole(original,'seoul-demo'),'member');
 assert.equal(clubRole(original,'heroes'),'staff');

 await assert.rejects(()=>changePassword(original,'TempPassword123','TempPassword123',policy,now));
 await assert.rejects(()=>changePassword(original,'TempPassword123','short1',policy,now));
 const active=await changePassword(original,'TempPassword123','NewPassword123',policy,now);
 assert.equal(active.mustChangePassword,false);
 assert.equal(active.authVersion,original.authVersion+1);
 assert.equal(await authenticateAccount(active,'NewPassword123',now),'active');
 assert.equal(await authenticateAccount(active,'TempPassword123',now),'invalid');
 const inactive=deactivateAccount(active);
 assert.equal(inactive.active,false);
 assert.equal(inactive.loginIdKey,'kimnarae');
 assert.equal(inactive.id,'id-1');
 assert.equal(inactive.authVersion,active.authVersion+1);
 assert.equal(await authenticateAccount(inactive,'NewPassword123',now),'inactive');
 console.log('PASS account first-change, expiry, club grant, deactivation and stable ID');
}finally{await rm(dir,{recursive:true,force:true})}
