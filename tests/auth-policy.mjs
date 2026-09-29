import assert from 'node:assert/strict';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-auth-policy-'));
try{
 for(const name of ['credentials','policy','accounts']){
  const source=await readFile(new URL(`../lib/auth/${name}.ts`,import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replaceAll("'./credentials'","'./credentials.mjs'");
  await writeFile(join(dir,`${name}.mjs`),code);
 }
 const {AUTH_POLICY,SESSION_SECONDS}=await import(pathToFileURL(join(dir,'policy.mjs')));
 const {validatePassword,normalizeLoginId}=await import(pathToFileURL(join(dir,'credentials.mjs')));
 const {prepareAccount,authenticateAccount,changePassword,deactivateAccount}=await import(pathToFileURL(join(dir,'accounts.mjs')));
 assert.equal(AUTH_POLICY.minPasswordLength,8);
 assert.equal(AUTH_POLICY.temporaryCredentialDays,7);
 assert.equal(SESSION_SECONDS,43200);
 assert.equal(validatePassword('abc12345',AUTH_POLICY.minPasswordLength),true);
 assert.equal(validatePassword('a19900101',AUTH_POLICY.minPasswordLength),true);
 assert.equal(validatePassword('abc1234',AUTH_POLICY.minPasswordLength),false);
 assert.equal(validatePassword('abcdefgh',AUTH_POLICY.minPasswordLength),false);
 assert.equal(validatePassword('12345678',AUTH_POLICY.minPasswordLength),false);
 assert.throws(()=>normalizeLoginId('김 나래'));
 const now=Date.parse('2026-09-29T00:00:00Z');
 const temporaryPassword='abc12345';
 const account=await prepareAccount({id:'member-1',loginId:'나래',displayName:'나래',homeClubId:null,kind:'regular',isMaster:false,grants:[]},temporaryPassword,AUTH_POLICY,now);
 assert.equal(account.temporaryExpiresAt,new Date(now+7*86400000).toISOString());
 assert.equal(await authenticateAccount(account,temporaryPassword,now+7*86400000-1),'change_required');
 assert.equal(await authenticateAccount(account,temporaryPassword,now+7*86400000),'expired');
 await assert.rejects(()=>changePassword(account,temporaryPassword,temporaryPassword,AUTH_POLICY,now));
 const inactive=deactivateAccount(account);
 assert.equal(inactive.id,account.id);
 assert.equal(inactive.loginIdKey,account.loginIdKey);
 console.log('PASS approved password length, composition, seven-day temporary policy, session setting');
}finally{await rm(dir,{recursive:true,force:true})}
