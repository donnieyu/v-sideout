import {chromium,webkit} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/schedule-save-only-20261012',base='http://127.0.0.1:4180';
const credential=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8')).find(x=>x.loginId==='시험master');
const results=[];
for(const [name,engine] of [['chrome',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chrome'?{channel:'chrome'}:{}),context=await browser.newContext(name==='webkit'?{isMobile:true,hasTouch:true}:{});
 await context.request.post(base+'/api/auth/login',{headers:{Origin:base},data:{loginId:credential.loginId,password:credential.password}});
 const directory=(await(await context.request.get(base+'/api/clubs')).json()).data,club=directory.clubs.find(c=>directory.capabilities.managedClubIds.includes(c.id));
 const id='new-preview-fixture',suffix='?weekStart=2027-03-08&filter=all',url=base+'/session/new'+suffix+'&clubId='+club.id+'&date=2027-03-14';
 let record,revision=0;const writes=[];
 await context.route('**/api/sessions',async route=>{
  assert.equal(route.request().method(),'POST');const body=route.request().postDataJSON();writes.push(body);assert.equal(body.expectedRevision,0);record={...body.payload,id};revision=1;await route.fulfill({json:{ok:true,data:{resourceId:id,revision}}});
 });
 await context.route('**/api/sessions/'+id,async route=>{
  if(route.request().method()==='POST'){const body=route.request().postDataJSON();writes.push(body);assert.equal(body.expectedRevision,revision);record={...body.payload,id};revision++;await route.fulfill({json:{ok:true,data:{resourceId:id,revision}}});return}
  await route.fulfill({json:{ok:true,data:{session:record,club,sessionRevision:revision,rosterRevision:1,counts:{applicants:0,waiting:0},selfStatus:null,teamPublished:false,canViewPublishedTeams:false,canManage:true,visibleApplicants:[],guestCount:0,publishedTeams:null,publishedMatches:null,capabilities:{canEditSchedule:true,canManageRoster:false,canCancelRoster:false,canEditTeams:false,canEditMatches:false,canPublish:false,canCancelSelf:false}}}});
 });
 const page=await context.newPage();
 for(const width of [390]){
  await page.setViewportSize({width,height:844});await page.goto(url);await page.getByRole('button',{name:'모집 시작',exact:true}).waitFor();
  assert.equal(await page.getByRole('textbox').count(),0);assert.equal(writes.length,0);assert.ok(await page.getByText(club.place,{exact:true}).count());
  const measurement=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,buttonHeight:document.querySelector('[data-floating-editor-actions] button').getBoundingClientRect().height}));
  assert.equal(measurement.viewport,measurement.scrollWidth);assert.equal(measurement.buttonHeight,44);results.push({name,...measurement});await page.screenshot({path:out+'/'+name+'-'+width+'.png',fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('link',{name:'일정 수정'}).click();await page.getByLabel('장소',{exact:true}).fill('새로 저장한 장소');assert.equal(await page.getByRole('button',{name:'모집 시작',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'준비로 저장',exact:true}).count(),0);await page.screenshot({path:out+'/'+name+'-editor.png',fullPage:true});await page.getByRole('button',{name:'저장',exact:true}).click();await page.getByText('준비로 저장했어요.',{exact:true}).waitFor();
 assert.equal(writes.length,1);assert.equal(writes[0].payload.phase,'draft');assert.ok(page.url().includes('/schedule/edit'));
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByLabel('장소',{exact:true}).waitFor();assert.equal(await page.getByLabel('장소',{exact:true}).inputValue(),'새로 저장한 장소');
 await page.getByRole('link',{name:'운동 상세로'}).click();await page.getByText('모집 준비 중',{exact:true}).waitFor();assert.ok(await page.getByText('새로 저장한 장소',{exact:true}).count());await page.getByRole('button',{name:'모집 시작',exact:true}).click();await page.getByRole('button',{name:'명단 확인',exact:true}).waitFor();assert.equal(writes.length,2);assert.equal(writes[1].expectedRevision,1);assert.equal(writes[1].payload.phase,'open');assert.equal(writes[1].payload.place,'새로 저장한 장소');
 // Independent direct start from untouched club defaults, all requests still intercepted.
 await page.goto(url);await page.getByRole('button',{name:'모집 시작',exact:true}).click();await page.getByRole('button',{name:'명단 확인',exact:true}).waitFor();assert.equal(writes.length,3);assert.equal(writes[2].expectedRevision,0);assert.equal(writes[2].payload.phase,'open');assert.equal(writes[2].payload.place,club.place);assert.equal(new URL(page.url()).searchParams.get('filter'),'all');
 results.push({name,readOnlyEntry:true,editSaveReturnStart:true,directStart:true,interceptedWrites:writes.length});await browser.close();
}
await writeFile(out+'/measure.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
