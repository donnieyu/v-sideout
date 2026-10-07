// Synthetic local accounts only; creates one future fixture and exercises real D1 writes.
import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/roster-lan-fix-20261002',origin=process.env.SIDEOUT_TEST_ORIGIN??'http://192.168.219.173:4180',creds=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8'));
const browser=await chromium.launch({channel:'chrome'}),results=[],errors=[];
const contexts=[];async function login(role,path='/home'){const context=await browser.newContext({viewport:{width:390,height:844}});contexts.push(context);const page=await context.newPage(),c=creds.find(c=>c.loginId==='시험'+role);page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+path);await page.getByLabel('로그인 아이디',{exact:true}).fill(c.loginId);await page.getByLabel('비밀번호',{exact:true}).fill(c.password);await page.getByRole('button',{name:'로그인',exact:true}).click();return page}
async function get(page,path){const r=await page.request.get(origin+path);assert.equal(r.status(),200,await r.text());return (await r.json()).data}
async function post(page,path,payload,revision){const r=await page.request.post(origin+path,{headers:{Origin:origin},data:{commandId:randomUUID(),expectedRevision:revision,payload}});assert.equal(r.status(),200,await r.text());return (await r.json()).data}
try{
 const master=await login('master');await master.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();const directory=await get(master,'/api/clubs'),club=directory.clubs.find(c=>c.id==='club-test-nb');
 const day=new Date(directory.serverNow);day.setUTCDate(day.getUTCDate()+14);while(day.getUTCDay()!==0)day.setUTCDate(day.getUTCDate()+1);let date;
 for(let n=0;n<20;n++){date=day.toISOString().slice(0,10);const monday=new Date(day);monday.setUTCDate(day.getUTCDate()-6);const week=await get(master,'/api/sessions?weekStart='+monday.toISOString().slice(0,10)+'&filter=all');if(!week.cards.some(c=>c.session.clubId===club.id&&c.session.date===date))break;day.setUTCDate(day.getUTCDate()+7)}
 const payload={clubId:club.id,date,entry:club.entry,start:club.start,end:club.end,place:'P2 참가·대기·명단 검증',notice:'합성 계정 검증용 일정',phase:'open',deadline:new Date(day.getTime()-86400000).toISOString(),priorityUntil:new Date(Date.now()+3600000).toISOString(),cap:2};
 const created=await post(master,'/api/sessions',payload,0),id=created.resourceId,detail='/session/'+id;
 const guest=await login('guest',detail);await guest.getByRole('button',{name:'대기자 등록',exact:true}).click();await guest.getByRole('button',{name:'대기 취소',exact:true}).waitFor();
 const own=await login('applicant',detail);await own.getByRole('button',{name:'참석 신청',exact:true}).click();await own.getByRole('button',{name:'참석 취소',exact:true}).waitFor();
 let d=await get(master,'/api/sessions/'+id);assert.deepEqual(d.counts,{applicants:1,waiting:1});results.push({check:'priority guest waiting and home member applied',id,date});
 await master.goto(origin+detail);await master.getByRole('button',{name:'명단 확인',exact:true}).click();await master.getByRole('heading',{name:'대기자',exact:true}).waitFor();await master.screenshot({path:out+'/roster-before-promotion-390.png',fullPage:true});
 const {id:ignore,...schedule}=d.session;await post(master,'/api/sessions/'+id,{...schedule,priorityUntil:new Date(Date.now()+1000).toISOString()},d.sessionRevision);
 await guest.getByRole('button',{name:'참석 취소',exact:true}).waitFor({timeout:23000});d=await get(master,'/api/sessions/'+id);assert.deepEqual(d.counts,{applicants:2,waiting:0});assert.deepEqual((await get(own,'/api/sessions/'+id)).counts,d.counts);results.push({check:'timed promotion visible in two accounts and persisted roster'});
 await master.getByRole('button',{name:'참가자 추가',exact:true}).click();const candidates=await get(master,'/api/sessions/'+id+'/participants'),chosen=candidates.members.find(p=>p.displayName.includes('outsider'));assert(chosen);
 await master.getByLabel('회원 이름 또는 소속 검색').fill(chosen.displayName);await master.getByRole('checkbox',{name:chosen.displayName+' · '+(chosen.clubName??'소속 없음'),exact:true}).check();
 for(const width of [320,390,1280]){await master.setViewportSize({width,height:844});assert(!(await master.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));await master.screenshot({path:`${out}/roster-add-${width}.png`,fullPage:true})}
 await master.getByRole('button',{name:'1명 추가',exact:true}).click();await master.getByRole('heading',{name:'대기자',exact:true}).waitFor();assert.deepEqual((await get(master,'/api/sessions/'+id)).counts,{applicants:2,waiting:1});
 const ownView=await get(own,'/api/sessions/'+id),ownId=(await (await own.request.get(origin+'/api/auth/session')).json()).me.memberId,ownLabel=ownView.visibleApplicants.find(p=>p.memberId===ownId);assert(ownLabel);
 const ownerRegion=master.getByRole('heading',{name:'소속 회원',exact:true}).locator('..').locator('..');master.once('dialog',dialog=>dialog.accept());await ownerRegion.getByRole('button',{name:ownLabel.displayName+' 참가 취소',exact:true}).click();await master.getByRole('heading',{name:'대기자',exact:true}).waitFor({state:'hidden'});
 d=await get(master,'/api/sessions/'+id);assert.deepEqual(d.counts,{applicants:2,waiting:0});assert.equal((await get(own,'/api/sessions/'+id)).selfStatus,'cancelled');results.push({check:'manager add at capacity -> wait, cancellation -> oldest waiter promotion'});
 await master.setViewportSize({width:390,height:844});await master.screenshot({path:out+'/roster-after-390.png',fullPage:true});assert.equal((await guest.request.get(origin+'/api/sessions/'+id+'/participants')).status(),403);results.push({check:'ordinary guest cannot fetch manager candidate list'});
 await own.reload();await own.getByRole('button',{name:'대기자 등록',exact:true}).waitFor();assert.deepEqual(errors,[]);
}finally{await writeFile(out+'/participant-browser.json',JSON.stringify({results,errors},null,2));await browser.close();console.log(JSON.stringify({results,errors},null,2))}
