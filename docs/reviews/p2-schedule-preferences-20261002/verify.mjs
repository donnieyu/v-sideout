// Local synthetic D1 only. Creates one future test schedule; restores original favorites.
import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/p2-schedule-preferences-20261002',origin='http://127.0.0.1:4180';
const credentials=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8'));
const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
const login=async(page,role,url='/home')=>{const c=credentials.find(c=>c.loginId==='시험'+role);await page.goto(origin+url);await page.getByLabel('로그인 아이디',{exact:true}).fill(c.loginId);await page.getByLabel('비밀번호',{exact:true}).fill(c.password);await page.getByRole('button',{name:'로그인',exact:true}).click()};
const json=async(path)=>{const r=await page.request.get(origin+path);assert.equal(r.status(),200);return (await r.json()).data};
const post=async(path,body)=>page.request.post(origin+path,{headers:{Origin:origin},data:body});
let originalFavorites;
try{
 await login(page,'master');await page.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();
 const directory=await json('/api/clubs');originalFavorites=await json('/api/me/preferences');const club=directory.clubs[0];
 const today=new Date(directory.serverNow);today.setUTCDate(today.getUTCDate()+28);while(today.getUTCDay()!==club.weekday%7)today.setUTCDate(today.getUTCDate()+1);
 let date;for(let attempt=0;attempt<20;attempt++){date=today.toISOString().slice(0,10);const monday=new Date(today);monday.setUTCDate(today.getUTCDate()-((today.getUTCDay()+6)%7));const week=await json('/api/sessions?weekStart='+monday.toISOString().slice(0,10)+'&filter=all');if(!week.cards.some(c=>c.session.clubId===club.id&&c.session.date===date))break;today.setUTCDate(today.getUTCDate()+7)}const params=new URLSearchParams({clubId:club.id,date});
 await page.goto(origin+'/session/new?'+params);await page.getByLabel('장소',{exact:true}).fill('P2 실제 저장 확인용 체육관');
 const createdResponse=page.waitForResponse(r=>r.url()===origin+'/api/sessions'&&r.request().method()==='POST');await page.getByRole('button',{name:'준비로 저장',exact:true}).click();const created=await createdResponse;assert.equal(created.status(),200,await created.text());const createdId=(await created.json()).data.resourceId;
 await page.getByText('준비로 저장했어요.',{exact:true}).waitFor();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByLabel('장소',{exact:true}).waitFor();assert(page.url().includes('/'+createdId+'/schedule/edit'));assert.equal((await json('/api/sessions/'+createdId)).session.phase,'draft');results.push({check:'create draft with roster and remain in editor',id:createdId,date});
 await page.reload();await page.getByLabel('장소',{exact:true}).waitFor();assert.equal(await page.getByLabel('장소',{exact:true}).inputValue(),'P2 실제 저장 확인용 체육관');
 await page.getByRole('button',{name:'모집 시작',exact:true}).click();await page.getByText('저장했어요. 계속 수정할 수 있습니다.',{exact:true}).waitFor();assert.equal((await json('/api/sessions/'+createdId)).session.phase,'open');
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:844});await page.reload();await page.getByLabel('장소',{exact:true}).waitFor();assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),`overflow ${width}`);
  for(let i=0;i<4;i++)await page.getByLabel('소속 회원 우선 기간',{exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'저장',exact:true}).count(),1);await page.screenshot({path:`${out}/schedule-${width}.png`,fullPage:true});results.push({check:'editor layout and one action group',width});
 }
 await page.getByLabel('장소',{exact:true}).fill('P2 수정 저장 검증');await page.getByRole('button',{name:'저장',exact:true}).click();await page.getByText('저장했어요. 계속 수정할 수 있습니다.',{exact:true}).waitFor();
 await page.getByLabel('장소',{exact:true}).fill('저장하지 않은 입력');page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'취소',exact:true}).click();assert.equal(await page.getByLabel('장소',{exact:true}).inputValue(),'저장하지 않은 입력');
 const previous=page.url();page.once('dialog',d=>d.dismiss());await page.goBack().catch(()=>{});assert.equal(page.url(),previous);results.push({check:'dirty cancel and browser back rejected; form retained'});
 await page.getByLabel('장소',{exact:true}).fill('P2 수정 저장 검증');await page.getByRole('button',{name:'취소',exact:true}).click();await page.getByRole('heading',{name:'운동 일정',exact:true}).waitFor();assert.equal((await json('/api/sessions/'+createdId)).session.place,'P2 수정 저장 검증');
 const snapshot=await json('/api/sessions/'+createdId),{id,...payload}=snapshot.session;const command={commandId:randomUUID(),expectedRevision:snapshot.sessionRevision,payload};
 assert.equal((await post('/api/sessions/'+createdId,command)).status(),200);assert.equal((await post('/api/sessions/'+createdId,command)).status(),200);assert.equal((await post('/api/sessions/'+createdId,{...command,commandId:randomUUID()})).status(),409);results.push({check:'actual D1 replay and stale edit conflict'});
 await page.goto(origin+'/home');await page.getByRole('button',{name:'즐겨찾기 관리'}).click();await page.getByRole('checkbox',{name:club.name,exact:true}).check();await page.getByRole('button',{name:'저장',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert((await json('/api/me/preferences')).value.favoriteClubIds.includes(club.id));
 await page.reload();await page.getByRole('button',{name:'즐겨찾기 관리'}).click();assert(await page.getByRole('checkbox',{name:club.name,exact:true}).isChecked());await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/favorites-390.png',fullPage:true});results.push({check:'favorites save and reload'});
 const memberContext=await browser.newContext(),memberPage=await memberContext.newPage();await login(memberPage,'applicant','/session/'+createdId+'/schedule/edit');await memberPage.getByRole('alert').filter({hasText:'수정할 수 있는 일정'}).waitFor();const denied=await memberPage.request.post(origin+'/api/sessions/'+createdId,{headers:{Origin:origin},data:{...command,commandId:randomUUID()}});assert.equal(denied.status(),403);await memberContext.close();results.push({check:'member UI and write API deny schedule edit'});
 assert.deepEqual(errors,[]);
}finally{
 if(originalFavorites){const current=await json('/api/me/preferences');const restored=await post('/api/me/preferences',{commandId:randomUUID(),expectedRevision:current.revision,payload:originalFavorites.value});assert.equal(restored.status(),200)}
 await writeFile(out+'/browser.json',JSON.stringify({results,errors},null,2));await browser.close();console.log(JSON.stringify({results,errors},null,2));
}
