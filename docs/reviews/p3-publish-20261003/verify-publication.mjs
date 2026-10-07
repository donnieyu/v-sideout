import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/p3-publish-20261003',origin='http://192.168.219.173:4180';
const creds=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8'));
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844}}),results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const get=async path=>{const r=await page.request.get(origin+path);assert.equal(r.status(),200,await r.text());return(await r.json()).data};
const post=async(path,payload,expectedRevision,commandId=randomUUID())=>page.request.post(origin+path,{headers:{Origin:origin},data:{commandId,expectedRevision,payload}});
try{
 const c=creds.find(c=>c.loginId==='시험master');await page.goto(origin+'/home');await page.getByLabel('로그인 아이디',{exact:true}).fill(c.loginId);await page.getByLabel('비밀번호',{exact:true}).fill(c.password);await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();
 const directory=await get('/api/clubs'),club=directory.clubs.find(c=>c.id==='club-test-nb'),day=new Date(directory.serverNow);day.setUTCDate(day.getUTCDate()+70);while(day.getUTCDay()!==0)day.setUTCDate(day.getUTCDate()+1);let date;
 for(let i=0;i<20;i++){date=day.toISOString().slice(0,10);const monday=new Date(day);monday.setUTCDate(day.getUTCDate()-6);const week=await get('/api/sessions?weekStart='+monday.toISOString().slice(0,10)+'&filter=all');if(!week.cards.some(c=>c.session.clubId===club.id&&c.session.date===date))break;day.setUTCDate(day.getUTCDate()+7)}
 const created=await post('/api/sessions',{clubId:club.id,date,entry:club.entry,start:club.start,end:club.end,place:'P3 공개 검증 합성 일정',notice:'합성 자료',phase:'open',deadline:new Date(day.getTime()-86400000).toISOString(),priorityUntil:null,cap:2},0);assert.equal(created.status(),200,await created.text());const id=(await created.json()).data.resourceId,path='/api/sessions/'+id;
 const members=['시험applicant','시험guest','시험waiter'].map(login=>creds.find(c=>c.loginId===login));
 const added=await post(path+'/participants',{action:'add',sessionRevision:1,memberIds:members.map(m=>m.memberId)},1);assert.equal(added.status(),200,await added.text());
 const before=await get(path+'/teams'),payload={action:'publish',confirmed:true,sessionRevision:1,confirmedMemberIds:[],lineup:{teams:members.map((m,i)=>({id:['A','C','D'][i],title:['A','C','D'][i]+'팀',players:[{memberId:m.memberId,slotId:'s',assignedPosition:'S'}]}))}},key=randomUUID();
 const invalid=structuredClone(payload);invalid.lineup.teams=invalid.lineup.teams.slice(0,2);assert.equal((await post(path+'/teams',invalid,before.rosterRevision)).status(),400);assert.equal((await get(path+'/teams')).rosterRevision,before.rosterRevision);
 const saved=await post(path+'/teams',payload,before.rosterRevision,key);assert.equal(saved.status(),200,await saved.text());assert.equal((await post(path+'/teams',payload,before.rosterRevision,key)).status(),200);assert.equal((await post(path+'/teams',payload,before.rosterRevision)).status(),409);
 const after=await get(path+'/teams'),detail=await get(path);assert.equal(after.rosterRevision,before.rosterRevision+1);assert.equal(detail.counts.applicants,3);assert.equal(detail.counts.waiting,0);assert.equal(detail.publishedTeams.length,3);assert.equal(detail.publishedMatches.matches.length,11);assert.equal(detail.teamPublished,true);
 assert.equal((await post(path+'/participants',{action:'remove',sessionRevision:1,memberId:members[0].memberId},after.rosterRevision)).status(),400);
 assert.equal((await post(path+'/participants',{action:'add',sessionRevision:1,memberIds:[creds.find(c=>c.loginId==='시험outsider').memberId]},after.rosterRevision)).status(),400);
 results.push({check:'D1 publish, waiter promotion, retry, 2-team rejection, post-publication registration and cancellation blocked',id,date});
 const changed={action:'save',sessionRevision:1,confirmedMemberIds:[],lineup:structuredClone(payload.lineup)};changed.lineup.teams[0].title='초안만 변경';assert.equal((await post(path+'/teams',changed,after.rosterRevision)).status(),200);assert.equal((await get(path)).publishedTeams[0].title,'A팀');
 await page.goto(origin+'/session/'+id);await page.getByRole('heading',{name:'A팀',exact:true}).waitFor();await page.screenshot({path:out+'/published-detail-390.png',fullPage:true});
 for(const login of ['시험waiter','시험outsider']){
  const context=await browser.newContext({viewport:{width:390,height:844}}),mp=await context.newPage(),m=creds.find(c=>c.loginId===login);await mp.goto(origin+'/home');await mp.getByLabel('로그인 아이디',{exact:true}).fill(m.loginId);await mp.getByLabel('비밀번호',{exact:true}).fill(m.password);await mp.getByRole('button',{name:'로그인',exact:true}).click();await mp.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();
  const r=await mp.request.get(origin+path);assert.equal(r.status(),200);const d=(await r.json()).data;assert.equal(d.publishedTeams!==null,login==='시험waiter');assert.equal(d.publishedMatches!==null,login==='시험waiter');assert.equal(d.participation.canRegister,false);assert.equal((await mp.request.get(origin+path+'/teams')).status(),403);
  await mp.goto(origin+'/session/'+id);await mp.getByRole('heading',{name:'함께할 인원',exact:true}).waitFor();await mp.screenshot({path:out+'/'+login+'-390.png',fullPage:true});await context.close();results.push({check:login+' publication visibility and draft prohibition'});
 }
 assert.deepEqual(errors,[]);
}finally{await writeFile(out+'/browser.json',JSON.stringify({results,errors},null,2));await browser.close();console.log({results,errors})}
