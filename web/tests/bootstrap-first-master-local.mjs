import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const state=await mkdtemp(join(tmpdir(),'sideout-bootstrap-'));
const wrangler='./node_modules/.bin/wrangler';
const config='dist/server/wrangler.json';
const common=['d1','execute','DB','--config',config,'--local','--persist-to',state];
try{
 for(const migration of ['0000_windy_omega_red.sql','0001_glamorous_iron_lad.sql','0002_modern_triathlon.sql']){
  execFileSync(wrangler,[...common,'--file',`drizzle/${migration}`],{stdio:'pipe'});
 }
 const args=['scripts/bootstrap-first-master-local.mjs','--login-id','마스터','--display-name','첫 마스터','--state-path',state];
 const first=spawnSync(process.execPath,args,{encoding:'utf8'});
 assert.equal(first.status,0,first.stderr);
 assert.match(first.stdout,/로그인 아이디: 마스터/);
 assert.match(first.stdout,/임시 비밀번호: [A-Za-z0-9]{20}/);
 assert.equal(first.stdout.includes('pbkdf2-sha256'),false);
 const temporaryPassword=first.stdout.match(/임시 비밀번호: ([A-Za-z0-9]{20})/)[1];
 const rows=JSON.parse(execFileSync(wrangler,[...common,'--command',"SELECT login_id,display_name,is_master,must_change_password,password_hash,temporary_expires_at FROM auth_members",'--json'],{encoding:'utf8'}));
 const saved=rows[0].results[0];
 assert.equal(saved.login_id,'마스터');
 assert.equal(saved.display_name,'첫 마스터');
 assert.equal(saved.is_master,1);
 assert.equal(saved.must_change_password,1);
 assert.match(saved.password_hash,/^pbkdf2-sha256\$/);
 assert.equal(JSON.stringify(saved).includes(temporaryPassword),false);
 assert.ok(Date.parse(saved.temporary_expires_at)-Date.now()>6*86400000);
 assert.ok(Date.parse(saved.temporary_expires_at)-Date.now()<=7*86400000);
 const second=spawnSync(process.execPath,args,{encoding:'utf8'});
 assert.notEqual(second.status,0);
 assert.doesNotMatch(second.stdout+second.stderr,/임시 비밀번호: /);
 const count=JSON.parse(execFileSync(wrangler,[...common,'--command','SELECT COUNT(*) AS n FROM auth_members','--json'],{encoding:'utf8'}));
 assert.equal(count[0].results[0].n,1);
 const audit=JSON.parse(execFileSync(wrangler,[...common,'--command',"SELECT COUNT(*) AS n FROM auth_member_audit WHERE action='master_bootstrapped'",'--json'],{encoding:'utf8'}));
 assert.equal(audit[0].results[0].n,1);
 execFileSync(wrangler,[...common,'--command',"UPDATE auth_members SET is_master=0 WHERE login_id='마스터'"],{stdio:'pipe'});
 const existingNonMaster=spawnSync(process.execPath,args,{encoding:'utf8'});
 assert.notEqual(existingNonMaster.status,0,'a non-master member still occupies the account database');
 assert.doesNotMatch(existingNonMaster.stdout+existingNonMaster.stderr,/임시 비밀번호: /);
 const finalCount=JSON.parse(execFileSync(wrangler,[...common,'--command','SELECT COUNT(*) AS n FROM auth_members','--json'],{encoding:'utf8'}));
 assert.equal(finalCount[0].results[0].n,1);
 console.log('bootstrap-first-master-local: pass');
}finally{await rm(state,{recursive:true,force:true})}
