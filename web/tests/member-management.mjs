import assert from 'node:assert/strict';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-member-management-'));
try{
 for(const name of ['credentials','accounts','errors','member-management']){
  const source=await readFile(new URL(`../lib/auth/${name}.ts`,import.meta.url),'utf8').catch(()=> 'export {}');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
   .replaceAll(/from '\.\/(credentials|accounts|errors)'/g,"from './$1.mjs'");
  await writeFile(join(dir,`${name}.mjs`),code);
 }
 const {validatePassword,verifyPassword}=await import(pathToFileURL(join(dir,'credentials.mjs')));
 const {makeTemporaryPassword,prepareManagedMember,prepareManagedUpdate,prepareReissue,memberAdminView}=await import(pathToFileURL(join(dir,'member-management.mjs')));
 const now=Date.parse('2026-09-30T00:00:00Z');
 const policy={minPasswordLength:8,temporaryCredentialDays:7};
 const clubIds={exists:async id=>new Set(['seoul-demo','heroes']).has(id)};
 const password=makeTemporaryPassword();
 assert.equal(validatePassword(password,8),true);
 assert.match(password,/^[A-Za-z0-9]+$/);
 assert.notEqual(makeTemporaryPassword(),password);
 const created=await prepareManagedMember({loginId:'  나래  ',displayName:'김나래',homeClubId:null,homeRole:null,grants:[],isMaster:false},policy,clubIds,now);
 assert.equal(created.account.loginId,'나래');
 assert.equal(created.account.loginIdKey,'나래');
 assert.equal(created.account.homeClubId,null);
 assert.equal(created.account.kind,'regular');
 assert.equal(created.account.mustChangePassword,true);
 assert.equal(created.account.temporaryExpiresAt,'2026-10-07T00:00:00.000Z');
 assert.equal(await verifyPassword(created.temporaryPassword,created.account.passwordHash),true);
 assert.equal(JSON.stringify(memberAdminView(created.account)).includes('passwordHash'),false);
 assert.deepEqual(Object.keys(memberAdminView(created.account)).sort(),
  ['active','authorizationVersion','displayName','grants','homeClubId','homeRole','isMaster','kind','loginId','memberId','mustChangePassword','temporaryExpiresAt']);

 const chair=await prepareManagedMember({loginId:'VOLLEY_1',displayName:'회장',homeClubId:'seoul-demo',homeRole:'chair',grants:[{clubId:'heroes',role:'staff'}],isMaster:false},policy,clubIds,now);
 assert.equal(chair.account.loginIdKey,'volley_1');
 const updated=await prepareManagedUpdate(chair.account,{displayName:'새 회장',grants:[{clubId:'heroes',role:'chair'}]},clubIds);
 assert.equal(updated.authVersion,chair.account.authVersion+1);
 assert.equal(updated.loginId,chair.account.loginId);
 assert.equal(updated.passwordHash,chair.account.passwordHash);
 assert.equal(updated.grants[0].role,'chair');
 const promoted=await prepareManagedUpdate(chair.account,{isMaster:true,homeClubId:null,homeRole:null,grants:[]},clubIds);
 assert.equal(promoted.isMaster,true);
 assert.equal(promoted.homeClubId,null);
 const reissued=await prepareReissue({...created.account,mustChangePassword:false,temporaryExpiresAt:null},policy,now);
 assert.equal(reissued.account.authVersion,created.account.authVersion+1);
 assert.equal(reissued.account.mustChangePassword,true);
 assert.equal(reissued.account.temporaryExpiresAt,'2026-10-07T00:00:00.000Z');
 assert.equal(await verifyPassword(reissued.temporaryPassword,reissued.account.passwordHash),true);
 assert.equal(await verifyPassword(created.temporaryPassword,reissued.account.passwordHash),false);

 for(const loginId of ['배구 왕','Volley Ball','']){
  await assert.rejects(()=>prepareManagedMember({loginId,displayName:'회원',homeClubId:null,homeRole:null,grants:[],isMaster:false},policy,clubIds,now));
 }
 for(const draft of [
  {loginId:'회원1',displayName:'',homeClubId:null,homeRole:null,grants:[],isMaster:false},
  {loginId:'회원2',displayName:'회원',homeClubId:'missing',homeRole:null,grants:[],isMaster:false},
  {loginId:'회원3',displayName:'회원',homeClubId:null,homeRole:'chair',grants:[],isMaster:false},
  {loginId:'회원4',displayName:'회원',homeClubId:null,homeRole:null,grants:[{clubId:'heroes',role:'staff'},{clubId:'heroes',role:'chair'}],isMaster:false},
  {loginId:'회원5',displayName:'회원',homeClubId:'seoul-demo',homeRole:null,grants:[],isMaster:true},
 ])await assert.rejects(()=>prepareManagedMember(draft,policy,clubIds,now));
 await assert.rejects(()=>prepareManagedUpdate(chair.account,{loginId:'new-id'},clubIds),'login ID edits are not available in M2');
 await assert.rejects(()=>prepareManagedUpdate(chair.account,{displayName:null},clubIds),'explicit null display name is invalid');
 await assert.rejects(()=>prepareManagedUpdate(chair.account,{grants:null},clubIds),'explicit null grants are invalid');
 console.log('PASS member management: draft validation, one-time credentials, safe views and updates');
}finally{await rm(dir,{recursive:true,force:true})}
