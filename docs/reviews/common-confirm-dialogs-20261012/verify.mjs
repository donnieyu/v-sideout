import {chromium,webkit} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/common-confirm-dialogs-20261012',base='http://127.0.0.1:4180',id='a09b333e-04c5-498b-97a3-29a12c6930bc';
const credential=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8')).find(x=>x.loginId==='시험master');
const results=[];
for(const [name,engine] of [['chrome',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chrome'?{channel:'chrome'}:{}),context=await browser.newContext({viewport:{width:390,height:844},...(name==='webkit'?{isMobile:true,hasTouch:true}:{})});
 await context.request.post(base+'/api/auth/login',{headers:{Origin:base},data:{loginId:credential.loginId,password:credential.password}});
 const original=(await(await context.request.get(base+'/api/sessions/'+id)).json()).data;
 const data={...original,session:{...original.session,date:'2027-03-14',phase:'open',deadline:'2027-03-13T09:00:00Z'},teamPublished:false,managerTeamPreview:undefined,publishedTeams:null,publishedMatches:null,selfStatus:'applied',participation:{canRegister:true,canCancel:true,registerLabel:'참석 신청'},counts:{applicants:2,waiting:0},visibleApplicants:['가상선수1','가상선수2'].map((displayName,i)=>({memberId:'probe'+i,displayName,homeClubId:original.club.id,clubName:original.club.name})),visibleWaiters:[],capabilities:{...original.capabilities,canEditSchedule:true,canCancelRoster:true,canManageRoster:true}};
 let writes=[];
 await context.route('**/api/sessions/'+id,async route=>{assert.notEqual(route.request().method(),'POST');await route.fulfill({json:{ok:true,data}})});
 await context.route('**/api/sessions/'+id+'/participants',async route=>{
  assert.equal(route.request().method(),'POST');const body=route.request().postDataJSON();writes.push(body);
  if(body.payload.action==='remove')data.visibleApplicants=data.visibleApplicants.filter(p=>p.memberId!==body.payload.memberId);else if(body.payload.action==='cancel')data.selfStatus=null;
  data.counts.applicants=data.visibleApplicants.length;data.rosterRevision++;await route.fulfill({json:{ok:true,data:{resourceId:id,revision:data.rosterRevision}}});
 });
 await context.route('**/api/me/preferences',async route=>{assert.notEqual(route.request().method(),'POST');await route.fulfill({json:{ok:true,data:{value:{favoriteClubIds:[]},revision:0}}})});
 const page=await context.newPage();page.on('dialog',dialog=>{throw Error('Unexpected native '+dialog.type())});
 const capture=async(label,dialog)=>{
  await dialog.evaluate(async el=>{await Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})))});
  const m=await dialog.evaluate(el=>({width:el.getBoundingClientRect().width,viewport:innerWidth,buttons:[...el.querySelectorAll('button')].map(b=>({text:b.textContent.trim(),height:b.getBoundingClientRect().height}))}));assert.ok(m.width<=m.viewport-24);assert.ok(m.buttons.every(b=>b.height>=44));results.push({name,label,...m});await page.screenshot({path:out+'/'+name+'-'+label+'.png'});
 };
 // Dirty link navigation: cancel preserves input, confirm leaves without a second browser alert.
 await page.goto(base+'/session/'+id+'/schedule/edit');await page.getByLabel('장소',{exact:true}).fill('미저장 시험 내용');await page.getByRole('link',{name:'운동 상세로'}).click();
 let dialog=page.getByRole('dialog',{name:'저장하지 않고 이동할까요?'});await dialog.waitFor();await capture('dirty-navigation',dialog);await dialog.getByRole('button',{name:'계속 수정'}).click();await dialog.waitFor({state:'hidden'});assert.equal(await page.getByLabel('장소',{exact:true}).inputValue(),'미저장 시험 내용');
 await page.getByRole('link',{name:'운동 상세로'}).click();await page.getByRole('dialog',{name:'저장하지 않고 이동할까요?'}).getByRole('button',{name:'이동',exact:true}).click();await page.waitForURL(base+'/session/'+id);
 // Roster confirmation on top of its open parent, including consecutive removals.
 await page.getByRole('button',{name:'명단 확인',exact:true}).click();const roster=page.getByRole('dialog',{name:'명단 확인',exact:true});await roster.waitFor();
 await roster.getByRole('button',{name:'가상선수1 참가 취소'}).click();dialog=page.getByRole('dialog',{name:'가상선수1 회원의 참석 신청을 취소할까요?'});await dialog.waitFor();await capture('roster-cancel',dialog);assert.equal(writes.length,0);
 await dialog.getByRole('button',{name:'유지',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.ok(await roster.isVisible());assert.ok(await roster.getByText('가상선수1',{exact:true}).isVisible());assert.ok(await roster.evaluate(el=>el.contains(document.activeElement)));results.push({name,focus:'returned to roster'});
 for(const player of ['가상선수1','가상선수2']){
  await roster.getByRole('button',{name:player+' 참가 취소'}).click();await page.getByRole('dialog',{name:player+' 회원의 참석 신청을 취소할까요?'}).getByRole('button',{name:'신청 취소',exact:true}).click();await page.getByRole('dialog',{name:player+' 회원의 참석 신청을 취소할까요?'}).waitFor({state:'hidden'});await roster.waitFor({state:'visible'});await roster.getByText(player,{exact:true}).waitFor({state:'hidden'});assert.ok(await roster.isVisible());
 }
 assert.equal(writes.length,2);await roster.getByRole('button',{name:'확인',exact:true}).click();await roster.waitFor({state:'hidden'});
 // Self cancellation: dismiss does not write, confirm does.
 await page.getByRole('button',{name:'참석 취소',exact:true}).click();dialog=page.getByRole('dialog',{name:'참석 신청을 취소할까요?'});await dialog.waitFor();await capture('self-cancel',dialog);await dialog.getByRole('button',{name:'유지',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(writes.length,2);
 await page.getByRole('button',{name:'참석 취소',exact:true}).click();await page.getByRole('dialog',{name:'참석 신청을 취소할까요?'}).getByRole('button',{name:'신청 취소',exact:true}).click();await page.getByRole('button',{name:'참석 신청',exact:true}).waitFor();assert.equal(writes.length,3);
 // Favorite discard: a second modal must preserve the parent selection on dismiss.
 await page.goto(base+'/home');await page.getByRole('button',{name:'즐겨찾기 관리'}).click();const favorites=page.getByRole('dialog',{name:'즐겨찾는 모임'});await favorites.waitFor();const checkbox=favorites.getByRole('checkbox').first();await checkbox.check();await favorites.getByRole('button',{name:'취소',exact:true}).click();
 dialog=page.getByRole('dialog',{name:'변경한 즐겨찾기를 저장하지 않고 닫을까요?'});await dialog.waitFor();await capture('favorites-discard',dialog);await dialog.getByRole('button',{name:'계속 수정'}).click();await dialog.waitFor({state:'hidden'});assert.equal(await checkbox.isChecked(),true);assert.ok(await favorites.evaluate(el=>el.contains(document.activeElement)));results.push({name,focus:'returned to favorites'});
 await favorites.getByRole('button',{name:'취소',exact:true}).click();await page.getByRole('dialog',{name:'변경한 즐겨찾기를 저장하지 않고 닫을까요?'}).getByRole('button',{name:'변경사항 버리기'}).click();await favorites.waitFor({state:'hidden'});
 results.push({name,flows:'passed',interceptedWrites:writes.length});await browser.close();
}
await writeFile(out+'/measure.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
