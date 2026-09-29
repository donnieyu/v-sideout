import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const dir=await mkdtemp(join(tmpdir(),'sideout-schema-'));
const db=join(dir,'test.sqlite');
try{
 const files=(await readdir(new URL('../drizzle/',import.meta.url))).filter(name=>/^000[01]_.*\.sql$/.test(name)).sort();
 assert.equal(files.length,2,'base and auth migrations must both exist');
 for(const file of files){
  const sql=await readFile(new URL(`../drizzle/${file}`,import.meta.url),'utf8');
  const result=spawnSync('sqlite3',[db],{input:sql,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
 }
 const insert=(id,loginKey,active)=>`INSERT INTO auth_members(id,login_id,login_key,display_name,kind,is_master,active,password_hash,must_change_password,auth_version,created_at) VALUES('${id}','${loginKey}','${loginKey}','회원','regular',0,${active},'hash',1,1,'2026-09-29T00:00:00Z');`;
 let result=spawnSync('sqlite3',[db],{input:insert('one','kimnarae',0),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 result=spawnSync('sqlite3',[db],{input:insert('two','kimnarae',1),encoding:'utf8'});
 assert.notEqual(result.status,0,'inactive member must still own the login ID');
 const tables=spawnSync('sqlite3',[db,'.tables'],{encoding:'utf8'}).stdout;
 assert.ok(tables.includes('auth_sessions'));
 assert.ok(tables.includes('join_requests'));
 console.log('PASS auth migration and inactive login ID uniqueness');
}finally{await rm(dir,{recursive:true,force:true})}
