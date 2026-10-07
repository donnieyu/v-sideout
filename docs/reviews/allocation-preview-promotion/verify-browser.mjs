import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/allocation-preview-promotion',origin=process.env.APP_ORIGIN||'http://127.0.0.1:4180';
const creds=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8')),fixture=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/allocation-practice.json','utf8'));
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[],results=[];
page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
async function get(path){const r=await page.request.get(origin+path);assert.equal(r.status(),200,await r.text());return(await r.json()).data}
async function post(path,payload,expectedRevision){const r=await page.request.post(origin+path,{headers:{Origin:origin},data:{commandId:randomUUID(),expectedRevision,payload}});assert.equal(r.status(),200,await r.text());return(await r.json()).data}
const signature=teams=>JSON.stringify(teams.map(t=>({id:t.id,title:t.title,players:t.players.map(p=>({memberId:p.memberId,slotId:p.slotId,assignedPosition:p.assignedPosition})).sort((a,b)=>a.slotId.localeCompare(b.slotId))})).sort((a,b)=>a.id.localeCompare(b.id)));
const click=(name)=>page.getByRole('button',{name,exact:true}).click();
try{
 console.log('starting login');const master=creds.find(c=>c.loginId==='시험master');await page.goto(origin+'/home');await page.getByLabel('로그인 아이디',{exact:true}).fill(master.loginId);await page.getByLabel('비밀번호',{exact:true}).fill(master.password);await click('로그인');await page.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();
 console.log('logged in');const practiceBefore=await get('/api/sessions/'+fixture.sessionId+'/teams');
 const directory=await get('/api/clubs'),club=directory.clubs.find(c=>c.id===fixture.clubId);let day=new Date(fixture.date+'T12:00:00Z'),date;
 for(let i=0;i<60;i++){day.setUTCDate(day.getUTCDate()+7);date=day.toISOString().slice(0,10);const mon=new Date(day);mon.setUTCDate(day.getUTCDate()-6);const week=await get('/api/sessions?weekStart='+mon.toISOString().slice(0,10)+'&filter=all');if(!week.cards.some(c=>c.session.clubId===club.id&&c.session.date===date))break;}
 const created=await post('/api/sessions',{clubId:club.id,date,entry:club.entry,start:club.start,end:club.end,place:'UI 승격 검증 전용',notice:'자동 검증 전용 가상 회원. 사용자 연습 일정과 분리.',phase:'open',deadline:new Date(date+'T08:00:00+09:00').toISOString(),priorityUntil:null,cap:28},0),id=created.resourceId,path='/api/sessions/'+id,url=origin+'/session/'+id+'/teams/edit';
 console.log('created',id);results.push({check:'isolated synthetic session',id,date});let added=0;
 for(const [count,teamCount] of [[18,3],[19,3],[21,3],[24,4],[28,4]]){
  console.log('count',count);let detail=await get(path);await post(path+'/participants',{action:'add',sessionRevision:1,memberIds:fixture.members.slice(added,count).map(m=>m.id)},detail.rosterRevision);added=count;
  await page.goto(url);await page.getByRole('button',{name:'배정하기',exact:true}).waitFor();
  assert.equal(await page.locator('.allocation-session-header button').count(),1);
  if(teamCount===4&&await page.locator('.allocation-team-heading').count()===3)await click('팀 추가');
  if(count===18){
   assert.equal(await page.locator('.allocation-reserve-slot').count(),0);assert(await page.getByRole('button',{name:'공개',exact:true}).isDisabled());
   await page.screenshot({path:out+'/preview-empty-390.png'});
   await page.getByRole('button',{name:'추가 선수 자리',exact:true}).nth(1).click();assert.equal(await page.locator('.ab-candidate-list').count(),0);
   await click('B팀 추가 선수 라이트 2 배정');assert.equal(await page.getByRole('button',{name:/^신청자/}).getAttribute('aria-pressed'),'true');
   assert.equal(await page.getByText(/선택 가능한 세터/).count(),0);assert(await page.locator('.ab-position-match').count()>0);
   await click('미리보기');await click('B팀 라이트 2 삭제');await click('A팀 세터 배정');
   await click('센터');
   for(const width of [320,390,423,1024]){
    await page.setViewportSize({width,height:width===320?667:844});const size=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth,pool:document.querySelector('.ab-candidate-list').clientHeight,navBottom:document.querySelector('.allocation-session-nav').getBoundingClientRect().bottom,height:innerHeight}));assert.equal(size.width,size.content);assert(size.pool>=100,JSON.stringify(size));assert(size.navBottom<=size.height+1,JSON.stringify(size));
    await page.screenshot({path:out+'/assignment-'+width+'.png'});results.push({check:'responsive assignment',...size});
   }
   await page.setViewportSize({width:390,height:844});await click('세터');await page.getByRole('button',{name:/ 배정$/}).first().click();
   await click('초안 저장');await page.getByText('저장됨',{exact:true}).waitFor();assert(page.url().endsWith('/teams/edit'));assert.equal(await page.getByRole('button',{name:'미리보기',exact:true}).count(),1);
   await click('미리보기');assert.equal(await page.locator('.allocation-preview-slot[aria-current]').count(),0);
  }
  await click('자동 배치');await page.getByRole('dialog').getByRole('button',{name:'자동 배치',exact:true}).click();
  await page.getByText(`신청자 ${count}명 전원 배정 · 공개 가능`,{exact:true}).waitFor();
  await click('저장');await page.getByText('저장됨',{exact:true}).waitFor();
  const editor=await get(path+'/teams');detail=await get(path);
  assert.equal(editor.draft.teams.length,teamCount);assert.equal(editor.draft.teams.flatMap(t=>t.players).length,count);assert.equal(signature(detail.managerTeamPreview.teams),signature(editor.draft.teams));assert.equal(detail.teamPublished,false);
  await page.screenshot({path:out+'/ready-'+count+'.png'});results.push({check:'real save/detail roundtrip',count,teamCount});
 }
 await click('자동 배치');await page.getByRole('heading',{name:'신청자를 모두 배정했어요'}).waitFor();await click('확인');
 await click('공개');await page.getByRole('dialog').getByRole('button',{name:'취소',exact:true}).click();assert.equal((await get(path)).teamPublished,false);
 await click('공개');await page.getByRole('dialog').getByRole('button',{name:'확인',exact:true}).click();await page.getByRole('button',{name:'공개됨',exact:true}).waitFor();
 const published=await get(path+'/teams');assert.equal(signature(published.publishedLineup.teams),signature(published.draft.teams));
 await page.reload();await page.getByRole('button',{name:'공개됨',exact:true}).waitFor();assert(await page.getByRole('button',{name:'공개됨',exact:true}).isDisabled());await page.screenshot({path:out+'/published-390.png'});
 const changed=structuredClone(published.draft),a=changed.teams[0].players.find(p=>p.slotId==='s'),b=changed.teams[1].players.find(p=>p.slotId==='s');[a.memberId,b.memberId]=[b.memberId,a.memberId];await post(path+'/teams',{action:'save',sessionRevision:published.sessionRevision,lineup:changed,confirmedMemberIds:[]},published.rosterRevision);
 await page.reload();await page.getByText('미공개 변경 있음',{exact:true}).waitFor();assert(await page.getByRole('button',{name:'공개에 반영',exact:true}).isEnabled());
 const detail=await get(path);assert.equal(signature(detail.managerTeamPreview.teams),signature(changed.teams));assert.equal(signature(detail.publishedTeams),signature(published.publishedLineup.teams));assert.equal(detail.participation.canRegister,false);assert.equal(detail.participation.canCancel,false);
 const practiceAfter=await get('/api/sessions/'+fixture.sessionId+'/teams');assert.deepEqual(practiceAfter,practiceBefore);results.push({check:'publication confirmation/reload/draft separation; registration closed; practice unchanged'});
 assert.deepEqual(errors,[]);
}catch(error){await page.screenshot({path:out+'/failure.png'});console.error('FAILED AT',page.url(),await page.locator('body').innerText());throw error}finally{await writeFile(out+'/browser.json',JSON.stringify({verifiedAt:new Date().toISOString(),results,errors},null,2));await browser.close();console.log(JSON.stringify({results,errors},null,2))}
