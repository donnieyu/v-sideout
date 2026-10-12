import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/floating-controls-20261012',origin='http://127.0.0.1:4180';
const c=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8')).find(c=>c.loginId==='시험master');
const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext(),page=await context.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
const published='30e24320-0faa-4437-9dee-88778dd02d67',editable='a09b333e-04c5-498b-97a3-29a12c6930bc';
try{
 assert.equal((await context.request.post(origin+'/api/auth/login',{headers:{Origin:origin},data:{loginId:c.loginId,password:c.password}})).status(),200);
 const clubs=(await(await context.request.get(origin+'/api/clubs')).json()).data.clubs;
 const routes=[['schedule','/session/'+published+'/schedule/edit'],['teams','/session/'+editable+'/teams/edit'],['published','/session/'+published+'/teams/edit'],['matches','/session/'+published+'/matches/edit'],['new','/session/new?clubId='+encodeURIComponent(clubs[0].id)+'&date=2027-03-14'],['detail','/session/'+published]];
 let longNotice=false;
 await page.route('**/api/sessions**',async route=>{assert.equal(route.request().method(),'GET','Review must not mutate saved sessions');if(longNotice){const res=await route.fetch(),body=await res.json();if(body.data?.session)body.data.session.notice='준비물과 입장 안내입니다.\n'.repeat(15);await route.fulfill({response:res,json:body})}else await route.continue()});
 for(const size of [{width:320,height:667},{width:390,height:844},{width:1280,height:900}]){
  await page.setViewportSize(size);
  for(const [key,route] of routes){
   await page.goto(origin+route);await page.locator(key==='detail'?'#teams':'[data-editor-actions]').waitFor();
   const measure=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,returnPosition:getComputedStyle(document.querySelector('[data-floating-editor-actions]')??document.querySelector('[data-return-placement]')).position,buttons:[...document.querySelectorAll('[data-editor-actions] button')].map(e=>e.textContent.trim()),body:document.querySelector('[data-registration-scroll]')?.getBoundingClientRect().toJSON()}));
   assert.equal(measure.scrollWidth,size.width,key+' overflow');if(key!=='detail'&&size.width<761){const buttons=await page.locator('[data-floating-editor-actions] > *').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().toJSON()));for(const b of buttons){assert.ok(b.x>=0&&b.x+b.width<=size.width);assert.ok(b.height>=44)}}if(size.width<761)assert.equal(measure.returnPosition,'fixed',key+' return');
   if(key==='published')assert.deepEqual(measure.buttons,['공개 취소']);
   if(['schedule','matches'].includes(key))assert.deepEqual(measure.buttons,['저장']);
   if(size.width<761&&key!=='detail'){const style=await page.locator('[data-floating-editor-actions]>a').evaluate(e=>({font:getComputedStyle(e).fontSize,weight:getComputedStyle(e).fontWeight,height:e.getBoundingClientRect().height}));assert.deepEqual(style,{font:'13px',weight:'400',height:44});}await page.screenshot({path:out+'/'+key+'-'+size.width+'.png',animations:'disabled'});
   if(key==='new'||key==='schedule'){
    const top=await page.locator('[data-schedule-actions]').boundingBox();await page.locator('[data-registration-scroll]').evaluate(el=>el.scrollTop=el.scrollHeight);assert.deepEqual(await page.locator('[data-schedule-actions]').boundingBox(),top);
    assert.ok(measure.body.height>200);if(size.width<761)assert.ok(measure.body.bottom>=size.height-2,'scroll reaches behind floating buttons');const notice=await page.getByRole('textbox',{name:'운동 공지'}).boundingBox(),bar=await page.locator('[data-floating-editor-actions]').boundingBox();if(size.width<761)assert.ok(notice.y+notice.height<bar.y,'last field clears buttons');await page.screenshot({path:out+'/new-'+size.width+'-bottom.png'});
   }
   results.push({key,size,...measure});
  }
 }
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/session/'+published+'/schedule/edit?weekStart=2026-10-12&filter=all&section=notice');
 await page.getByRole('textbox',{name:'운동 공지'}).waitFor();assert.equal(await page.getByRole('tab').count(),0);assert.equal(await page.locator('[data-schedule-information]').count(),1);
 await page.getByRole('textbox',{name:'운동 공지'}).fill('검토용 수정: 저장하지 않습니다.');await page.getByRole('textbox',{name:'운동 공지'}).blur();
 let confirmed=false;page.once('dialog',async d=>{confirmed=true;await d.dismiss()});await page.getByRole('link',{name:'운동 상세로',exact:true}).click();assert.ok(confirmed);assert.ok(page.url().includes('/schedule/edit'));
 page.once('dialog',d=>d.accept());await page.getByRole('link',{name:'운동 상세로',exact:true}).click();await page.waitForURL('**/session/'+published+'?weekStart=2026-10-12&filter=all');
 await page.goto(origin+'/session/'+published+'/teams/edit');await page.getByRole('button',{name:'공개 취소',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(await page.locator('[data-floating-editor-actions]').isVisible(),false);await page.screenshot({path:out+'/unpublish-confirm-390.png'});await page.getByRole('dialog').getByRole('button',{name:'공개 유지',exact:true}).click();

 await page.goto(origin+'/session/'+published+'/schedule/edit');await page.getByRole('textbox',{name:'장소',exact:true}).focus();assert.equal(await page.getByRole('link',{name:'운동 상세로',exact:true}).isVisible(),true);
 await page.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:460});visualViewport.dispatchEvent(new Event('resize'))});
 await page.getByRole('button',{name:'키보드 닫기',exact:true}).waitFor();await page.screenshot({path:out+'/keyboard-simulated-390.png'});await page.getByRole('button',{name:'키보드 닫기',exact:true}).click();await page.getByRole('link',{name:'운동 상세로',exact:true}).waitFor();
 longNotice=true;await page.goto(origin+'/session/'+published);await page.getByRole('button',{name:'펼치기',exact:true}).waitFor();
 const expand=page.getByRole('button',{name:'펼치기',exact:true});assert.equal(await expand.getAttribute('aria-expanded'),'false');await expand.click();await page.getByRole('button',{name:'접기',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),0);await page.screenshot({path:out+'/notice-collapsed-390.png'});
 assert.equal(await page.getByRole('link',{name:'운동 공지 수정',exact:true}).count(),0);await page.getByRole('link',{name:'일정 수정',exact:true}).click();await page.getByRole('textbox',{name:'운동 공지'}).waitFor();
 longNotice=false;await page.goto(origin+'/session/'+published+'/matches/edit');const handle=page.getByRole('button',{name:'1번째 경기 순서 이동',exact:true});const box=await handle.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2+80,{steps:8});await page.locator('[data-drag-overlay]').waitFor();assert.equal(await page.locator('[data-floating-editor-actions]').isVisible(),false);await page.keyboard.press('Escape');await page.mouse.up();await page.locator('[data-drag-overlay]').waitFor({state:'hidden'});assert.equal(await page.locator('[data-floating-editor-actions]').isVisible(),true);await handle.focus();await page.keyboard.press('ArrowDown');await page.screenshot({path:out+'/match-keyboard-reorder-390.png'});
 page.once('dialog',d=>d.accept());await page.getByRole('link',{name:'운동 상세로',exact:true}).click();await page.waitForURL('**/session/'+published);
 assert.deepEqual(errors,[]);await writeFile(out+'/browser.json',JSON.stringify({results,errors,checks:['fixed registration actions','mobile returns','no horizontal overflow','notice deep link','dirty return dismiss/accept','unpublish confirmation cancel and overlay return hidden','one card and whole-card edit link','pointer drag return hide/restore','keyboard match reorder and discard'],sessionWrites:false,physicalIPhone:false},null,2));console.log(JSON.stringify({screens:results.length,errors}));
}catch(e){await page.screenshot({path:out+'/failure.png'});console.error((await page.locator('body').innerText()).slice(0,1500));throw e}finally{await browser.close()}
