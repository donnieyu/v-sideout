import ts from 'typescript';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const dir=await mkdtemp(join(tmpdir(),'vteam-test-'));
try{
 for(const name of ['model','operations']){
 const source=await readFile(new URL(`../lib/${name}.ts`,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replaceAll("'./model'","'./model.mjs'");
 await writeFile(join(dir,`${name}.mjs`),code);
 }
 const {seedWorkspace,projection,counts,DEMO_MEMBER}=await import(pathToFileURL(join(dir,'model.mjs')));
 const {operate}=await import(pathToFileURL(join(dir,'operations.mjs')));
 const now=Date.parse('2026-09-22T02:00:00Z');let passed=0;
 function check(name,run){run();passed++;console.log(`PASS ${name}`)}
 const seed=()=>seedWorkspace(new Date(now));
 const act=(w,a,role='master',n=now)=>operate(w,{sessionId:'s1',...a},role,n);
 check('upper limit sends a new response to candidate',()=>{const w=seed();w.sessions[0].cap=21;const u=act(w,{type:'respond',response:'yes'},'member');assert.equal(u.sessions[0].participants.find(p=>p.memberId===DEMO_MEMBER).category,'candidate');assert.equal(counts(u.sessions[0]).regular,21)});
 check('deadline blocks absence but accepts candidate',()=>{const w=seed();w.sessions[0].phase='candidates';assert.throws(()=>act(w,{type:'respond',response:'no'},'member'));assert.equal(act(w,{type:'respond',response:'yes'},'member').sessions[0].participants.at(-1).category,'candidate')});
 check('candidate stops at exact exercise start',()=>{const w=seed();assert.throws(()=>act(w,{type:'respond',response:'yes'},'member',Date.parse(w.sessions[0].start)))});
 check('staff cannot proxy while chair and master can',()=>{const w=seed();assert.throws(()=>act(w,{type:'proxy',memberId:'m24'},'staff'));for(const r of ['master','chair'])assert.ok(act(w,{type:'proxy',memberId:'m24'},r).sessions[0].participants.find(p=>p.memberId==='m24'))});
 check('proxy plus self response cannot duplicate membership',()=>{const w=act(seed(),{type:'proxy',memberId:DEMO_MEMBER});const u=act(w,{type:'respond',response:'yes'},'member');assert.equal(u.sessions[0].participants.filter(p=>p.memberId===DEMO_MEMBER).length,1)});
 check('new member exception requires leader and retains type',()=>{const w=seed();assert.throws(()=>act(w,{type:'assign',participantId:'m27',team:0},'staff'));const u=act(w,{type:'assign',participantId:'m27',team:0},'chair');assert.equal(u.members.find(m=>m.id==='m27').kind,'new');assert.equal(u.sessions[0].participants.find(p=>p.id==='m27').team,0)});
 check('member projection hides roster, evaluation, draft assignment',()=>{let w=act(seed(),{type:'proxy',memberId:DEMO_MEMBER});w=act(w,{type:'assign',participantId:DEMO_MEMBER,team:0});const v=projection(w,'member',DEMO_MEMBER,0);assert.deepEqual(v.members,[]);assert.equal(v.sessions[0].participants.length,1);assert.equal(v.sessions[0].participants[0].team,null);assert.equal(v.sessions[0].participants[0].at,'');assert.equal(v.sessions[0].participants[0].position,undefined);assert.deepEqual(Object.keys(v.sessions[0].counts).sort(),['candidate','regular'])});
 check('published names and positions contain no evaluation or times',()=>{const w=act(seed(),{type:'publish'});const pub=projection(w,'member',DEMO_MEMBER,0).sessions[0].published;assert.equal(pub.people.length,21);assert.ok(pub.people.every(p=>!('level' in p)&&!('at' in p)&&!('source' in p)));assert.equal(pub.people[0].name,[...pub.people].sort((a,b)=>a.name.localeCompare(b.name,'ko'))[0].name)});
 check('draft changes do not alter the last published snapshot',()=>{let w=act(seed(),{type:'publish'});const before=JSON.stringify(w.sessions[0].published);w=act(w,{type:'assign',participantId:'m1',team:0});assert.equal(JSON.stringify(w.sessions[0].published),before)});
 check('guest removal removes exactly one record',()=>{let w=act(seed(),{type:'guest',name:'테스트 게스트'});const g=w.sessions[0].participants.at(-1);w=act(w,{type:'removeGuest',participantId:g.id});assert.equal(w.sessions[0].participants.length,21);assert.ok(w.sessions[0].participants.some(p=>p.id==='m1'))});
 check('next week does not copy people or published results',()=>{let w=act(seed(),{type:'guest',name:'게스트'});w=act(w,{type:'publish'});w=act(w,{type:'clone'});assert.equal(w.sessions.at(-1).participants.length,0);assert.equal(w.sessions.at(-1).published,null);assert.equal(w.sessions.at(-1).phase,'draft')});
 check('setter role and seat persist independently of profile',()=>{let w=act(seed(),{type:'position',participantId:'m1',position:'S',setterSeat:'MB'});assert.equal(w.members[0].main,'S');assert.equal(w.sessions[0].participants[0].setterSeat,'MB')});
 check('member and staff cannot edit club defaults',()=>{for(const r of ['member','staff'])assert.throws(()=>act(seed(),{type:'club'},r))});
 check('seven-player team permits repeated positions',()=>{let w=act(seed(),{type:'template',teamCount:3,teamSize:7});for(let i=1;i<=7;i++){w=act(w,{type:'assign',participantId:`m${i}`,team:0});w=act(w,{type:'position',participantId:`m${i}`,position:'OH'})}assert.equal(w.sessions[0].participants.filter(p=>p.team===0).length,7)});
 check('session date validation and member write restrictions',()=>{assert.throws(()=>act(seed(),{type:'saveSession',start:'bad',end:'bad',deadline:'bad'}));assert.throws(()=>act(seed(),{type:'publish'},'member'));assert.throws(()=>act(seed(),{type:'post',category:'notice',title:'a',body:'b'},'member'))});
 console.log(`${passed} domain checks passed`);
}finally{await rm(dir,{recursive:true,force:true})}
