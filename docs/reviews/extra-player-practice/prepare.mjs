import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import{readFile,writeFile}from'node:fs/promises';import{randomUUID}from'node:crypto';import assert from'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',origin='http://127.0.0.1:4180',source='session-allocation-practice-20261003',out=root+'/docs/reviews/extra-player-practice';
const creds=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8')),fixture=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/allocation-practice.json','utf8'));
const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:390,height:844}});
async function get(path){const r=await p.request.get(origin+path);assert.equal(r.status(),200,await r.text());return(await r.json()).data}
async function post(path,payload,expectedRevision){const r=await p.request.post(origin+path,{headers:{Origin:origin},data:{commandId:randomUUID(),expectedRevision,payload}});assert.equal(r.status(),200,await r.text());return(await r.json()).data}
try{
 const m=creds.find(c=>c.loginId==='시험master');await p.goto(origin+'/home');await p.getByLabel('로그인 아이디',{exact:true}).fill(m.loginId);await p.getByLabel('비밀번호',{exact:true}).fill(m.password);await p.getByRole('button',{name:'로그인',exact:true}).click();await p.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();
 const original=await get('/api/sessions/'+source+'/teams'),detail=await get('/api/sessions/'+source);assert.equal(detail.session.clubId,'club-test-nb');assert.equal(detail.counts.applicants,18);assert.equal(original.draft.teams.flatMap(t=>t.players).length,18);
 const dateObj=new Date(detail.session.date+'T12:00:00Z');let date,weekStart;
 for(let i=0;i<52;i++){dateObj.setUTCDate(dateObj.getUTCDate()+7);date=dateObj.toISOString().slice(0,10);const mon=new Date(dateObj);mon.setUTCDate(mon.getUTCDate()-6);weekStart=mon.toISOString().slice(0,10);const week=await get('/api/sessions?weekStart='+weekStart+'&filter=all');if(!week.cards.some(c=>c.session.clubId===detail.session.clubId&&c.session.date===date))break;if(i===51)throw Error('No free practice date')}
 const {id:_,...sourceSettings}=detail.session;
 const created=await post('/api/sessions',{...sourceSettings,date,phase:'open',place:'추가 선수 배정 연습 · 가상 체육관',notice:'가상 신청자 28명. 기존 18명 배정을 복사했고 추가 10명은 미배정 상태입니다. 추가 선수 자리와 4팀 구성을 시험할 수 있습니다. 기존 공개 일정과 별도인 연습용입니다.',deadline:new Date(date+'T08:00:00+09:00').toISOString(),priorityUntil:null,cap:28},0);
 const id=created.resourceId,path='/api/sessions/'+id;
 await writeFile(out+'/created.json',JSON.stringify({id,date,weekStart,source},null,2));
 const initial=await get(path+'/teams');await post(path+'/participants',{action:'add',sessionRevision:initial.sessionRevision,memberIds:fixture.members.map(m=>m.id)},initial.rosterRevision);
 const enrolled=await get(path+'/teams');await post(path+'/teams',{action:'save',sessionRevision:enrolled.sessionRevision,lineup:original.draft,confirmedMemberIds:[]},enrolled.rosterRevision);
 const ready=await get(path+'/teams'),readyDetail=await get(path);assert.equal(ready.people.filter(p=>p.status==='신청자').length,28);assert.equal(readyDetail.counts.waiting,0);assert.equal(readyDetail.teamPublished,false);assert.deepEqual(ready.draft,original.draft);assert.deepEqual(await get('/api/sessions/'+source+'/teams'),original);
 await p.goto(origin+'/session/'+id+'/teams/edit');await p.getByRole('button',{name:'자동 배치',exact:true}).waitFor();await p.getByText(/신청자 18\/28명 배정 · 10명 남음/).waitFor();await p.screenshot({path:out+'/ready-390.png',animations:'disabled'});
 // Inspect the actual applicant picker without changing a saved assignment.
 await p.getByRole('button',{name:'배정하기',exact:true}).click();await p.getByRole('button',{name:/신청자 10/}).waitFor();
 await p.screenshot({path:out+'/candidates-390.png',animations:'disabled'});
 const assigned=new Set(ready.draft.teams.flatMap(t=>t.players.map(p=>p.memberId)));const result={id,date,weekStart,applicants:28,assigned:18,unassigned:10,unassignedPlayers:ready.people.filter(p=>p.status==='신청자'&&!assigned.has(p.id)).map(p=>({name:p.name,position:p.position,secondary:p.secondary})),sourcePreserved:true,published:false};await writeFile(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(e){await p.screenshot({path:out+'/failure.png'});console.error((await p.locator('body').innerText()).slice(0,1500));throw e}finally{await b.close()}
