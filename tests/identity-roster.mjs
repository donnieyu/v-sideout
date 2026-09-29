import ts from 'typescript';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-identity-'));
try{
 for(const name of ['model','operations']){
  const source=await readFile(new URL(`../lib/${name}.ts`,import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replaceAll("'./model'","'./model.mjs'");
  await writeFile(join(dir,`${name}.mjs`),code);
 }
 const model=await import(pathToFileURL(join(dir,'model.mjs')));
 const operations=await import(pathToFileURL(join(dir,'operations.mjs')));
 const at=Date.parse('2026-09-22T02:00:00Z');
 let passed=0;
 function check(name,run){run();passed++;console.log(`PASS ${name}`)}

 check('self registration uses the verified member ID even when names match',()=>{
  const workspace=model.seedWorkspace(new Date(at));
  workspace.members.find(m=>m.id==='m25').name=workspace.members.find(m=>m.id==='m24').name;
  const next=operations.operateForActor(workspace,{type:'respond',sessionId:'s1',response:'yes'},{memberId:'m25',role:'member'},at);
  assert.equal(next.sessions[0].participants.filter(p=>p.memberId==='m25').length,1);
  assert.equal(next.sessions[0].participants.filter(p=>p.memberId==='m24').length,0);
 });

 check('trusted additional-club chair can add a member outside their home club',()=>{
  const workspace=model.seedWorkspace(new Date(at),'heroes');
  const next=operations.operateForActor(workspace,{type:'proxy',sessionId:'s1',memberId:'m25'},{memberId:'m22',role:'chair'},at);
  assert.equal(next.sessions[0].participants.filter(p=>p.memberId==='m25').length,1);
 });

 check('unregistered member and unassigned late candidate cannot fetch published teams',()=>{
  const workspace=model.seedWorkspace(new Date(at));
  const published=operations.operate(workspace,{type:'publish',sessionId:'s1'},'master',at);
  published.sessions[0].participants.push({id:'m25',memberId:'m25',response:'yes',category:'candidate',source:'self',at:new Date(at).toISOString(),team:null});
  for(const id of ['m24','m25']){
   const view=model.projectionForActor(published,{memberId:id,role:'member'},1);
   assert.equal(view.sessions[0].published,null);
  }
 });

 check('registration after publication is waiting and cannot reveal the published lineup',()=>{
  const workspace=model.seedWorkspace(new Date(at));
  const published=operations.operate(workspace,{type:'publish',sessionId:'s1'},'master',at);
  const next=operations.operateForActor(published,{type:'respond',sessionId:'s1',response:'yes'},{memberId:'m25',role:'member'},at);
  assert.equal(next.sessions[0].participants.find(p=>p.memberId==='m25')?.category,'candidate');
  assert.equal(model.projectionForActor(next,{memberId:'m25',role:'member'},2).sessions[0].published,null);
 });

 check('publication prevents a member from cancelling their participation',()=>{
  const workspace=model.seedWorkspace(new Date(at));
  const published=operations.operate(workspace,{type:'publish',sessionId:'s1'},'master',at);
  assert.throws(()=>operations.operateForActor(published,{type:'respond',sessionId:'s1',response:'no'},{memberId:'m1',role:'member'},at));
  assert.equal(published.sessions[0].participants.find(p=>p.memberId==='m1')?.response,'yes');
 });

 check('publication exposes assigned people only and promotes an assigned waiter',()=>{
  const workspace=model.seedWorkspace(new Date(at));
  let next=operations.operateForActor(workspace,{type:'assign',sessionId:'s1',participantId:'m1',team:0},{memberId:'m22',role:'master'},at);
  next=operations.operateForActor(next,{type:'publish',sessionId:'s1'},{memberId:'m22',role:'master'},at);
  assert.deepEqual(model.projectionForActor(next,{memberId:'m1',role:'member'},1).sessions[0].published.people.map(p=>p.id),['m1']);
  next=operations.operateForActor(next,{type:'respond',sessionId:'s1',response:'yes'},{memberId:'m25',role:'member'},at);
  next=operations.operateForActor(next,{type:'assign',sessionId:'s1',participantId:'m25',team:1},{memberId:'m22',role:'master'},at);
  next=operations.operateForActor(next,{type:'publish',sessionId:'s1'},{memberId:'m22',role:'master'},at);
  assert.equal(next.sessions[0].participants.find(p=>p.memberId==='m25')?.category,'regular');
  assert.ok(model.projectionForActor(next,{memberId:'m25',role:'member'},4).sessions[0].published?.people.some(p=>p.id==='m25'));
 });

 check('manager cancellation before publication removes a draft assignment and locks after publication',()=>{
  const workspace=model.seedWorkspace(new Date(at));
  let next=operations.operateForActor(workspace,{type:'assign',sessionId:'s1',participantId:'m1',team:0},{memberId:'m22',role:'master'},at);
  next=operations.operateForActor(next,{type:'cancelParticipation',sessionId:'s1',memberId:'m1'},{memberId:'m22',role:'chair'},at);
  assert.equal(next.sessions[0].participants.find(p=>p.memberId==='m1')?.response,'no');
  assert.equal(next.sessions[0].participants.find(p=>p.memberId==='m1')?.team,null);
  const published=operations.operateForActor(workspace,{type:'publish',sessionId:'s1'},{memberId:'m22',role:'master'},at);
  assert.throws(()=>operations.operateForActor(published,{type:'cancelParticipation',sessionId:'s1',memberId:'m1'},{memberId:'m22',role:'master'},at));
 });

 check('public member view includes only their participation and allowed same-club names',()=>{
  const workspace=model.seedWorkspace(new Date(at));
  const view=model.projectionForActor(workspace,{memberId:'m22',role:'member'},3);
  assert.equal(view.members.length,0);
  assert.ok(view.sessions[0].participants.every(p=>p.memberId==='m22'&&p.at===''));
  assert.ok(view.sessions[0].roster.every(p=>workspace.members.find(m=>m.id===p.id)?.homeClubId==='seoul-demo'));
  assert.equal(JSON.stringify(view).includes('"level"'),false);
 });

 console.log(`${passed} identity-roster checks passed`);
}finally{await rm(dir,{recursive:true,force:true})}
