import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/mobile-navigation-phase1-20261010',origin='http://127.0.0.1:4180';
const c=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8')).find(c=>c.loginId==='시험master');
const published='30e24320-0faa-4437-9dee-88778dd02d67',editable='a09b333e-04c5-498b-97a3-29a12c6930bc';
const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext(),page=await context.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
const measures=()=>{
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
 const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&r.bottom>0&&r.y<innerHeight};
 const main=document.querySelector('#sideout-main'),link=main.querySelector('[data-return-placement]');
 const floating=link&&getComputedStyle(link).position==='fixed';
 const zone=floating?rect(link):{x:(innerWidth-160)/2,y:innerHeight-60,width:160,height:44,bottom:innerHeight-16,right:(innerWidth+160)/2};
 const controls=[...main.querySelectorAll('button,a,input,select,textarea')].filter(e=>e!==link&&visible(e)).map(e=>({label:e.getAttribute('aria-label')||e.textContent?.trim().slice(0,65)||e.tagName,...rect(e)}));
 const overlaps=controls.filter(r=>r.x<zone.right&&r.right>zone.x&&r.y<zone.bottom&&r.bottom>zone.y);
 const footer=document.querySelector('.allocation-session-nav');
 return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,title:main.querySelector('h1')?.textContent,titleY:main.querySelector('h1')?.getBoundingClientRect().y,returnPlacement:link?.getAttribute('data-return-placement')??'none',returnPosition:link?getComputedStyle(link).position:'none',floating:!!floating,zone,overlaps,footer:footer?{text:footer.textContent,position:getComputedStyle(footer).position,...rect(footer)}:null,controls};
};
try{
 assert.equal((await context.request.post(origin+'/api/auth/login',{headers:{Origin:origin},data:{loginId:c.loginId,password:c.password}})).status(),200);
 const clubs=(await(await context.request.get(origin+'/api/clubs')).json()).data.clubs;
 const routes=[['home','운동 일정','/home?weekStart=2026-10-12&filter=all','applied'],['detail','운동 상세','/session/'+published,'applied'],['account','계정 정보','/account','applied'],['schedule','일정 수정','/session/'+published+'/schedule/edit','review'],['teams','팀편성 수정','/session/'+editable+'/teams/edit','review'],['published','공개된 팀편성','/session/'+published+'/teams/edit','review'],['matches','경기 순서 수정','/session/'+published+'/matches/edit','review'],['new','일정 등록','/session/new?clubId='+encodeURIComponent(clubs[0].id)+'&date=2027-03-14','review']];
 await page.route('**/api/sessions**',async route=>{assert.equal(route.request().method(),'GET','No session writes in review');await route.continue()});
 for(const size of [{width:320,height:667},{width:390,height:844},{width:1280,height:900}]){
  await page.setViewportSize(size);let homeY;
  for(const [key,label,route,stage] of routes){
   await page.goto(origin+route);await page.locator('#sideout-main h1').waitFor();
   if(stage==='review')await page.locator('[data-editor-actions]').waitFor();
   if(key==='home')await page.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();
   if(key==='detail')await page.locator('#teams').waitFor();
   const top=await page.evaluate(measures);assert.equal(top.scrollWidth,size.width,key+' horizontal overflow');
   if(key==='home')homeY=top.titleY;
   if(size.width<761&&['detail','account'].includes(key)){assert.equal(top.floating,true);assert.equal(top.titleY,homeY,key+' heading alignment')}
   if(stage==='review')assert.equal(top.floating,false,'editor must not be opted in');
   await page.screenshot({path:out+'/'+key+'-'+size.width+'-top.png',animations:'disabled'});
   await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
   const bottom=await page.evaluate(measures);
   if(bottom.floating)assert.deepEqual(bottom.overlaps,[],key+' bottom controls must clear floating return');
   await page.screenshot({path:out+'/'+key+'-'+size.width+'-bottom.png',animations:'disabled'});
   results.push({key,label,route,stage,size,top,bottom});
  }
 }
 // Dialog/menu consume the foreground: background return must disappear.
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/session/'+published);await page.locator('#teams').waitFor();
 const back=page.locator('[data-return-placement="floating"]');
 for(const name of ['메뉴 열기','운동 안내','명단 확인']){
  await page.getByRole('button',{name,exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(await back.isVisible(),false,name+' hides return');
  await page.screenshot({path:out+'/overlay-'+name+'-390.png',animations:'disabled'});await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await back.isVisible(),true);
 }
 // Explicit return restores URL context even on a directly opened detail.
 await page.goto(origin+'/session/'+published+'?weekStart=2026-10-12&filter=favorites');await page.locator('#teams').waitFor();await page.getByRole('link',{name:'운동 일정으로',exact:true}).click();await page.waitForURL('**/home?weekStart=2026-10-12&filter=favorites');
 assert.deepEqual(errors,[]);
 await writeFile(out+'/browser.json',JSON.stringify({results,errors,checks:['read page heading alignment','bottom controls clear floating return','editors not opted in','overlay hides background return','return retains week/filter'],sessionWrites:false,physicalIPhone:false},null,2));
 console.log(JSON.stringify({screens:results.length,errors}));
}catch(e){await page.screenshot({path:out+'/failure.png',animations:'disabled'});console.error((await page.locator('body').innerText()).slice(0,1100));throw e}finally{await browser.close()}
