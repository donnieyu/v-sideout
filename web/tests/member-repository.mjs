import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-member-db-'));
try{
 for(const name of ['d1-repository','member-repository']){
  const source=await readFile(new URL(`../lib/auth/${name}.ts`,import.meta.url),'utf8').catch(()=> 'export {}');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
   .replaceAll("from './d1-repository'","from './d1-repository.mjs'");
  await writeFile(join(dir,`${name}.mjs`),code);
 }
 const {makeMemberRepository}=await import(pathToFileURL(join(dir,'member-repository.mjs')));
 assert.equal(typeof makeMemberRepository,'function');
 const migrations=(await readdir(new URL('../drizzle/',import.meta.url))).filter(name=>/^000[0-2]_.*\.sql$/.test(name)).sort();
 assert.equal(migrations.length,3);
 const schema=await Promise.all(migrations.map(name=>readFile(new URL(`../drizzle/${name}`,import.meta.url),'utf8')));
 const at='2026-09-30T00:00:00.000Z';
const master={id:'master-1',loginId:'마스터',loginIdKey:'마스터',displayName:'마스터',homeClubId:null,kind:'regular',isMaster:true,
  homeRole:null,grants:[],active:true,passwordHash:'master-hash',mustChangePassword:true,temporaryExpiresAt:'2026-10-07T00:00:00.000Z',authVersion:1};
 const member={...master,id:'member-1',loginId:'나래',loginIdKey:'나래',displayName:'나래',isMaster:false,passwordHash:'member-hash',mustChangePassword:true,temporaryExpiresAt:'2026-10-07T00:00:00.000Z'};
 const actor={memberId:master.id,authorizationVersion:2};
 function fixture(){
  const db=new DatabaseSync(':memory:');
  for(const sql of schema)db.exec(sql.replaceAll('--> statement-breakpoint',''));
  let failAt=0,pending=Promise.resolve();
  const d1={
   prepare(sql){return {bind(...args){return {
    async first(){return db.prepare(sql).get(...args)??null},
    async all(){return {results:db.prepare(sql).all(...args)}},
    async run(){const result=db.prepare(sql).run(...args);return {meta:{changes:result.changes}}},
   }}}},
   batch(statements){
    const transaction=async()=>{
     db.exec('BEGIN');
     try{
      const results=[];
      for(let i=0;i<statements.length;i++){
       if(failAt===i+1)throw new Error(`injected stage ${i+1} failure`);
       results.push(await statements[i].run());
      }
      db.exec('COMMIT');
      return results;
     }catch(error){db.exec('ROLLBACK');throw error}
    };
    const result=pending.then(transaction);pending=result.catch(()=>{});return result;
   },
  };
  const repo=makeMemberRepository(d1);
  const state=id=>({member:db.prepare('SELECT id,login_key,active,is_master,password_hash,must_change_password,temporary_expires_at,auth_version FROM auth_members WHERE id=?').get(id)??null,
   sessions:db.prepare('SELECT token_hash FROM auth_sessions WHERE member_id=?').all(id).length,
   audit:db.prepare('SELECT action,target_member_id,actor_member_id FROM auth_member_audit ORDER BY rowid').all().map(row=>({...row}))});
  return {db,repo,state,failAt(value){failAt=value}};
 }
 const f=fixture();
 assert.equal(await f.repo.bootstrapFirstMaster(master,at),'committed');
 assert.equal(await f.repo.bootstrapFirstMaster({...master,id:'other',loginId:'other',loginIdKey:'other'},at),'conflict');
 assert.equal(f.state(master.id).audit.length,1);
 f.db.prepare('UPDATE auth_members SET must_change_password=0,temporary_expires_at=NULL,auth_version=2 WHERE id=?').run(master.id);
 assert.equal(await f.repo.createManagedMember(actor,member,at),'committed');
 assert.equal(await f.repo.createManagedMember(actor,{...member,id:'member-2'},at),'conflict','inactive or active owner keeps unique login');
 assert.equal((await f.repo.listManagedMembers(actor)).length,2);
 assert.equal((await f.repo.getManagedMember(actor,member.id)).id,member.id);
 assert.equal(f.state(member.id).audit.length,2);
 assert.equal(f.state(member.id).audit[1].actor_member_id,master.id);
 assert.equal(await f.repo.commitManagedUpdate({actor,expectedVersion:2,nextAccount:{...master,active:false,mustChangePassword:false,temporaryExpiresAt:null,authVersion:3},action:'member_deactivated',protectLastMaster:true,at}),'conflict');
 assert.equal(f.state(master.id).member.active,1);

 const secondMaster={...master,id:'master-2',loginId:'둘째',loginIdKey:'둘째',passwordHash:'second-hash'};
 assert.equal(await f.repo.createManagedMember(actor,secondMaster,at),'committed');
 f.db.prepare('UPDATE auth_members SET temporary_expires_at=? WHERE id=?').run('2026-09-29T23:59:59.999Z',secondMaster.id);
 f.db.prepare('INSERT INTO auth_sessions(token_hash,member_id,auth_version,restricted,expires_at,created_at) VALUES(?,?,?,?,?,?)')
  .run('b'.repeat(64),master.id,2,0,1e13,at);
 const beforeLastMaster=f.state(master.id);
 const deactivateLast={actor,expectedVersion:2,nextAccount:{...master,active:false,mustChangePassword:false,temporaryExpiresAt:null,authVersion:3},
  action:'member_deactivated',protectLastMaster:true,at};
 assert.equal(await f.repo.commitManagedUpdate(deactivateLast),'conflict','expired temporary master cannot replace the last usable master');
 assert.deepEqual(f.state(master.id),beforeLastMaster,'rejected deactivation leaves account, audit, and session intact');
 assert.equal(await f.repo.commitManagedUpdate({...deactivateLast,nextAccount:{...master,isMaster:false,mustChangePassword:false,temporaryExpiresAt:null,authVersion:3},action:'member_updated'}),'conflict',
  'expired temporary master cannot replace a demoted master');
 assert.deepEqual(f.state(master.id),beforeLastMaster,'rejected demotion leaves account, audit, and session intact');
 f.db.prepare('UPDATE auth_members SET temporary_expires_at=? WHERE id=?').run('2026-10-07T00:00:00.000Z',secondMaster.id);
 assert.equal(await f.repo.commitManagedUpdate(deactivateLast),'conflict','an unrotated master can expire after the last usable master leaves');
 assert.deepEqual(f.state(master.id),beforeLastMaster);
 f.db.prepare('UPDATE auth_members SET must_change_password=0,temporary_expires_at=NULL,auth_version=2 WHERE id=?').run(secondMaster.id);
 f.db.prepare('INSERT INTO auth_sessions(token_hash,member_id,auth_version,restricted,expires_at,created_at) VALUES(?,?,?,?,?,?)')
  .run('a'.repeat(64),member.id,1,1,1e13,at);
 const reissue={...member,passwordHash:'new-hash',authVersion:2};
 const before=f.state(member.id);
 f.failAt(2);
 await assert.rejects(()=>f.repo.commitManagedUpdate({actor,expectedVersion:1,nextAccount:reissue,action:'password_reissued',protectLastMaster:false,at}),/stage 2 failure/);
 assert.deepEqual(f.state(member.id),before,'audit failure rolls back account and session changes');
 f.failAt(0);
 assert.equal(await f.repo.commitManagedUpdate({actor,expectedVersion:1,nextAccount:reissue,action:'password_reissued',protectLastMaster:false,at}),'committed');
 assert.equal(f.state(member.id).member.password_hash,'new-hash');
 assert.equal(f.state(member.id).sessions,0);
 assert.equal(f.state(member.id).audit.at(-1).action,'password_reissued');
 assert.equal(await f.repo.commitManagedUpdate({actor,expectedVersion:1,nextAccount:reissue,action:'password_reissued',protectLastMaster:false,at}),'conflict');
 assert.equal(await f.repo.commitManagedUpdate({actor,expectedVersion:2,nextAccount:{...master,active:false,mustChangePassword:false,temporaryExpiresAt:null,authVersion:3},action:'member_deactivated',protectLastMaster:true,at}),'committed');
 assert.equal(f.state(master.id).sessions,0,'committed deactivation revokes the old master session');
 assert.equal(await f.repo.commitManagedUpdate({actor:{memberId:'master-2',authorizationVersion:2},expectedVersion:2,nextAccount:{...secondMaster,active:false,mustChangePassword:false,temporaryExpiresAt:null,authVersion:3},action:'member_deactivated',protectLastMaster:true,at}),'conflict');
 assert.equal(await f.repo.createManagedMember(actor,{...member,id:'late',loginId:'새회원',loginIdKey:'새회원'},at),'conflict','revoked actor cannot write');
 assert.deepEqual(await f.repo.listManagedMembers(actor),[],'revoked actor cannot read list');
 assert.equal(await f.repo.getManagedMember(actor,member.id),null);
 f.db.close();
 const race=fixture();
 assert.equal(await race.repo.bootstrapFirstMaster(master,at),'committed');
 race.db.prepare('UPDATE auth_members SET must_change_password=0,temporary_expires_at=NULL,auth_version=2 WHERE id=?').run(master.id);
 const competing=[member,{...member,id:'member-2'}];
 assert.deepEqual((await Promise.all(competing.map(account=>race.repo.createManagedMember(actor,account,at)))).sort(),
  ['committed','conflict'],'concurrent requests issue exactly one account for a login key');
 assert.equal(race.db.prepare('SELECT COUNT(*) AS count FROM auth_members WHERE login_key=?').get(member.loginIdKey).count,1);
 assert.equal(race.db.prepare("SELECT COUNT(*) AS count FROM auth_member_audit WHERE action='member_created'").get().count,1);
 assert.equal(await race.repo.createManagedMember(actor,secondMaster,at),'committed');
 race.db.prepare('UPDATE auth_members SET must_change_password=0,temporary_expires_at=NULL,auth_version=2 WHERE id=?').run(secondMaster.id);
 for(const [id,hash] of [[master.id,'c'.repeat(64)],[secondMaster.id,'d'.repeat(64)]]){
  race.db.prepare('INSERT INTO auth_sessions(token_hash,member_id,auth_version,restricted,expires_at,created_at) VALUES(?,?,?,?,?,?)')
   .run(hash,id,2,0,1e13,at);
 }
 const disableMaster=(who,target)=>race.repo.commitManagedUpdate({actor:{memberId:who,authorizationVersion:2},expectedVersion:2,
  nextAccount:{...(target===master.id?master:secondMaster),active:false,mustChangePassword:false,temporaryExpiresAt:null,authVersion:3},
  action:'member_deactivated',protectLastMaster:true,at});
 assert.deepEqual((await Promise.all([disableMaster(master.id,secondMaster.id),disableMaster(secondMaster.id,master.id)])).sort(),
  ['committed','conflict'],'concurrent cross-deactivation leaves an active master');
 assert.equal(race.db.prepare('SELECT COUNT(*) AS count FROM auth_members WHERE active=1 AND is_master=1').get().count,1);
 const survivingMaster=race.state(master.id).member.active?master.id:secondMaster.id;
 const disabledMaster=survivingMaster===master.id?secondMaster.id:master.id;
 assert.equal(race.state(survivingMaster).sessions,1,'the rejected cross-deactivation preserves its session');
 assert.equal(race.state(disabledMaster).sessions,0,'the committed cross-deactivation revokes its session');
 assert.equal(race.state(master.id).audit.filter(row=>row.action==='member_deactivated').length,1,
  'cross-deactivation writes only the committed audit record');
 race.db.close();
 console.log('PASS member repository: one master bootstrap, unique IDs, atomic audit/session and last-master protection');
}finally{await rm(dir,{recursive:true,force:true})}
