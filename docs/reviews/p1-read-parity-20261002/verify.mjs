import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/p1-read-parity-20261002';
const credentials=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8')),credential=credentials.find(c=>c.loginId==='시험master');
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext(),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const results=[];
try{
 await page.goto('http://127.0.0.1:4180/home');await page.getByLabel('로그인 아이디',{exact:true}).fill(credential.loginId);await page.getByLabel('비밀번호',{exact:true}).fill(credential.password);await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('link',{name:'뉴배동 · 시험 상세 정보'}).waitFor();
 const api=await page.request.get('http://127.0.0.1:4180/api/sessions/session-test-open'),detail=(await api.json()).data;assert(detail);
 const allClubs=(await (await page.request.get('http://127.0.0.1:4180/api/clubs')).json()).data;
 const baseClub={...detail.club,name:'뉴배동',weekday:7},satClub={...baseClub,id:'visual-sat',name:'히어로즈',mark:'H',weekday:6},pmClub={...baseClub,id:'visual-pm',name:'아스팍',mark:'A',entry:'13:00',start:'13:30',weekday:7};
 const open={...detail,club:baseClub,session:{...detail.session,date:'2026-10-04',clubId:baseClub.id},counts:{applicants:18,waiting:0}};
 const positions=['S','OH','OH','MB','MB','OP'];open.publishedTeams=['A','B','C'].map((title,j)=>({id:title,title:title+'팀',players:positions.map((pos,i)=>({memberId:`visual-${j}-${i}`,displayName:i===5?'김가나다라마바사':'시험회원'+(j*6+i+1),clubName:i===5?'아주긴소속모임이름테스트':'뉴배동',slotId:String(i),assignedPosition:pos}))}));open.publishedMatches={teamCount:3,rookieTeamCount:2,matches:[{id:'m1',kind:'rookie',home:'R1',away:'R2'},{id:'m2',kind:'regular',home:'A',away:'B'},{id:'m3',kind:'regular',home:'B',away:'C'},{id:'m4',kind:'regular',home:'A',away:'C'}]};
 let scenario='home';
 await page.route('**/api/clubs',route=>route.fulfill({json:{ok:true,data:{...allClubs,serverNow:'2026-09-30T00:00:00Z',clubs:[baseClub,satClub,pmClub]}}}));
 await page.route('**/api/sessions?*',route=>{const u=new URL(route.request().url()),past=u.searchParams.get('weekStart')==='2026-09-21',filter=u.searchParams.get('filter');let cards=past?[{...open,session:{...open.session,date:'2026-09-27'}}]:[open];let registrationOpportunities=past?[]:[{clubId:satClub.id,date:'2026-10-03'},{clubId:pmClub.id,date:'2026-10-04'}];if(filter&&filter!=='all'){cards=cards.filter(c=>c.club.id===filter);registrationOpportunities=registrationOpportunities.filter(o=>o.clubId===filter)}return route.fulfill({json:{ok:true,data:{serverNow:'2026-09-30T00:00:00Z',weekStart:past?'2026-09-21':'2026-09-28',cards,registrationOpportunities}}})});
 await page.route('**/api/sessions/session-test-open',route=>route.fulfill({json:{ok:true,data:{...open,session:{...open.session,date:scenario==='past'?'2026-09-27':'2026-10-04'},...(scenario==='pre'?{teamPublished:false,publishedTeams:null,publishedMatches:null}:{})}}}));
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:844});await page.goto('http://127.0.0.1:4180/home');await page.getByRole('link',{name:'뉴배동 상세 정보'}).waitFor();
  const home=await page.evaluate(()=>{const visible=e=>!!e.getClientRects().length;const cards=[...document.querySelectorAll('article[class*="eventCard"]')].filter(visible);return{overflow:document.documentElement.scrollWidth>innerWidth,cards:cards.map(e=>({name:e.querySelector('h3').textContent,height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width})),board:[...document.querySelectorAll('[aria-label="요일과 시간대별 일정"]')].some(visible),agenda:[...document.querySelectorAll('[aria-label="날짜별 일정"]')].some(visible)}});
  assert(!home.overflow);assert.equal(home.board,width>760);assert.equal(home.agenda,width<=760);assert.equal(home.cards.length,3);
  assert(Math.max(...home.cards.map(c=>c.height))-Math.min(...home.cards.map(c=>c.height))<2,'registered and registration card heights match');
  await page.screenshot({path:`${out}/home-${width}.png`,fullPage:true});results.push({width,scenario:'home',...home});
  await page.getByRole('button',{name:'히어로즈',exact:false}).click();await page.getByRole('button',{name:'모임 등록',exact:true}).waitFor();assert.equal(await page.locator('article[class*="eventCard"]:visible').count(),1);await page.screenshot({path:`${out}/single-day-${width}.png`,fullPage:true});
  for(scenario of ['pre','published','past']){
   await page.goto('http://127.0.0.1:4180/session/session-test-open?weekStart=2026-09-28&filter=all');await page.getByRole('heading',{name:scenario==='past'?'당시 공개된 팀편성':'팀편성',exact:true}).waitFor();
   if(scenario==='pre')await page.getByText('화면 구성 예시',{exact:true}).waitFor();if(scenario==='past'){assert.equal(await page.getByRole('button',{name:/수정/}).count(),0);assert.equal(await page.getByText('신청 마감',{exact:true}).count(),0)}
   assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
   await page.screenshot({path:`${out}/detail-${scenario}-${width}.png`,fullPage:true});results.push({width,scenario,overflow:false});
  }
  await page.goto('http://127.0.0.1:4180/home?weekStart=2026-09-21&filter=all');await page.getByRole('heading',{name:'내가 함께했던 운동'}).waitFor();assert.equal(await page.getByRole('button',{name:/참석 취소|참석 신청/}).count(),0);await page.screenshot({path:`${out}/past-home-${width}.png`,fullPage:true});
 }
 // Long labels must grow without overflowing or being hidden.
 open.session.place='아주 긴 장소 이름을 가진 다목적 체육관 별관 지하 2층 배구 전용 코트';open.counts.applicants=21;await page.setViewportSize({width:320,height:844});await page.goto('http://127.0.0.1:4180/home');await page.getByRole('link',{name:'뉴배동 상세 정보'}).waitFor();assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));await page.screenshot({path:out+'/home-long-320.png',fullPage:true});
 open.counts.applicants=0;open.session.place='시험 체육관';await page.reload();await page.getByRole('link',{name:'뉴배동 상세 정보'}).waitFor();const zeroCard=page.locator('article:visible').filter({has:page.getByRole('heading',{name:'뉴배동',exact:true})});assert.equal(await zeroCard.locator('[class*=count] strong').innerText(),'0명');assert.equal(await zeroCard.locator('[class*=progress] > span').evaluate(e=>e.getBoundingClientRect().width),0);await page.screenshot({path:out+'/home-zero-320.png',fullPage:true});
 assert.deepEqual(errors,[]);await writeFile(out+'/browser.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({scenarios:results.length,errors,heights:results.filter(r=>r.scenario==='home')},null,2));
}finally{await browser.close()}
