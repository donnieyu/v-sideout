import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-auth-rotation-'));
try{
 const source=await readFile(new URL('../lib/auth/d1-repository.ts',import.meta.url),'utf8');
 await writeFile(join(dir,'repo.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
 const {makeAuthRepository}=await import(pathToFileURL(join(dir,'repo.mjs')));
 const schema=await Promise.all(['0000_windy_omega_red','0001_glamorous_iron_lad'].map(name=>readFile(new URL(`../drizzle/${name}.sql`,import.meta.url),'utf8')));
 const account={id:'member-1',loginId:'나래',loginIdKey:'나래',displayName:'김나래',homeClubId:'club-a',kind:'regular',isMaster:false,homeRole:null,grants:[],active:true,passwordHash:'old-hash',mustChangePassword:true,temporaryExpiresAt:'2026-10-06T00:00:00Z',authVersion:1};
 const oldToken='a'.repeat(64),otherToken='b'.repeat(64),nextToken='c'.repeat(64);
 function fixture(){
  const db=new DatabaseSync(':memory:');
  for(const sql of schema)db.exec(sql.replaceAll('--> statement-breakpoint',''));
  let failAt=0;
  let pending=Promise.resolve();
  const query=(sql,args)=>({
   first:async()=>db.prepare(sql).get(...args)??null,
   run:async()=>{const result=db.prepare(sql).run(...args);return {meta:{changes:result.changes}}},
  });
  const d1={
   prepare(sql){return {bind(...args){return query(sql,args)}}},
   batch(statements){
    const transaction=async()=>{
     db.exec('BEGIN');
     try{
      const results=[];
      for(let i=0;i<statements.length;i++){
       if(failAt===i+1)throw new Error(`injected statement ${i+1} failure`);
       results.push(await statements[i].run());
      }
      db.exec('COMMIT');
      return results;
     }catch(error){db.exec('ROLLBACK');throw error}
    };
    const result=pending.then(transaction);
    pending=result.catch(()=>{});
    return result;
   },
  };
  const repo=makeAuthRepository(d1);
  const rows=()=>({
   member:{...db.prepare('SELECT password_hash,auth_version,active,must_change_password FROM auth_members WHERE id=?').get(account.id)},
   sessions:db.prepare('SELECT token_hash,auth_version,restricted FROM auth_sessions WHERE member_id=? ORDER BY token_hash').all(account.id).map(row=>({...row})),
  });
  return {db,repo,rows,failAt(value){failAt=value}};
 }
 async function seeded(){
  const f=fixture();
  await f.repo.createAccount(account);
  await f.repo.putSession({tokenHash:oldToken,memberId:account.id,authVersion:1,restricted:true,expiresAt:1e13});
  await f.repo.putSession({tokenHash:otherToken,memberId:account.id,authVersion:1,restricted:true,expiresAt:1e13});
  return f;
 }
 const input={expectedVersion:1,nextAccount:{...account,passwordHash:'new-hash',authVersion:2,mustChangePassword:false,temporaryExpiresAt:null},nextSession:{tokenHash:nextToken,memberId:account.id,authVersion:2,restricted:false,expiresAt:1e13}};
 for(const stage of [1,2,3]){
  const f=await seeded();
  const before=f.rows();
  f.failAt(stage);
  await assert.rejects(()=>f.repo.commitPasswordChange(input),new RegExp(`statement ${stage} failure`));
  assert.deepEqual(f.rows(),before,`statement ${stage} failure must roll back account and sessions`);
  f.db.close();
 }
 {
  const f=await seeded();
  assert.equal(await f.repo.commitPasswordChange(input),'committed');
  assert.deepEqual(f.rows().member,{password_hash:'new-hash',auth_version:2,active:1,must_change_password:0});
  assert.deepEqual(f.rows().sessions,[{token_hash:nextToken,auth_version:2,restricted:0}]);
  assert.equal(await f.repo.commitPasswordChange(input),'conflict');
  assert.deepEqual(f.rows().sessions,[{token_hash:nextToken,auth_version:2,restricted:0}]);
  f.db.close();
 }
 {
  const f=await seeded();
  const rival={...input,nextAccount:{...input.nextAccount,passwordHash:'rival-hash'},nextSession:{...input.nextSession,tokenHash:'d'.repeat(64)}};
  const outcomes=await Promise.all([f.repo.commitPasswordChange(input),f.repo.commitPasswordChange(rival)]);
  assert.deepEqual(outcomes.sort(),['committed','conflict']);
  assert.equal(f.rows().member.auth_version,2);
  assert.equal(f.rows().sessions.length,1);
  assert.equal(f.rows().sessions[0].restricted,0);
  f.db.close();
 }
 {
  const f=await seeded();
  await f.repo.saveAccount({...account,active:false,authVersion:2},1);
  const before=f.rows();
  assert.equal(await f.repo.commitPasswordChange(input),'conflict');
  assert.deepEqual(f.rows(),before);
  f.db.close();
 }
 console.log('PASS atomic password rotation: rollback, CAS conflict, session replacement');
}finally{await rm(dir,{recursive:true,force:true})}
