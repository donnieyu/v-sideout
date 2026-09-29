import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-auth-db-'));
try{
 const db=new DatabaseSync(join(dir,'auth.sqlite'));
 for(const name of ['0000_windy_omega_red','0001_glamorous_iron_lad']){
  const sql=await readFile(new URL(`../drizzle/${name}.sql`,import.meta.url),'utf8');
  db.exec(sql.replaceAll('--> statement-breakpoint',''));
 }
 const source=await readFile(new URL('../lib/auth/d1-repository.ts',import.meta.url),'utf8').catch(()=> 'export {}');
 await writeFile(join(dir,'repo.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
 const {makeAuthRepository}=await import(pathToFileURL(join(dir,'repo.mjs')));
 const d1={prepare(sql){return {bind(...args){return {
  async first(){return db.prepare(sql).get(...args)??null},
  async run(){const result=db.prepare(sql).run(...args);return {meta:{changes:result.changes}}},
 }}}}};
 const repo=makeAuthRepository(d1);
 const account={id:'member-1',loginId:'나래',loginIdKey:'나래',displayName:'김나래',homeClubId:'seoul-demo',kind:'regular',isMaster:false,homeRole:null,grants:[],active:true,passwordHash:'hash',mustChangePassword:true,temporaryExpiresAt:'2026-10-06T00:00:00Z',authVersion:1};
 await repo.createAccount(account);
 assert.equal((await repo.getByLoginKey('나래'))?.id,account.id);
 assert.equal((await repo.getById(account.id))?.homeClubId,'seoul-demo');
 await assert.rejects(()=>repo.createAccount({...account,id:'member-2'}),'login ID must stay unique');
 assert.equal(await repo.saveAccount({...account,displayName:'새 이름',authVersion:2},1),true);
 assert.equal(await repo.saveAccount({...account,displayName:'경합',authVersion:2},1),false);
 const tokenHash='a'.repeat(64);
 await repo.putSession({tokenHash,memberId:account.id,authVersion:2,restricted:true,expiresAt:Date.now()+100000});
 assert.equal((await repo.getSession(tokenHash))?.restricted,true);
 await repo.deleteSessionsForMember(account.id);
 assert.equal(await repo.getSession(tokenHash),null);
 assert.equal((await repo.getById(account.id))?.displayName,'새 이름');
 db.close();
 console.log('PASS D1 repository: unique login, CAS account, sessions');
}finally{await rm(dir,{recursive:true,force:true})}
