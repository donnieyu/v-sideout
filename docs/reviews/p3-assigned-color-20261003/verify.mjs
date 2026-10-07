import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/p3-assigned-color-20261003',origin='http://192.168.219.173:4180',id='session-allocation-practice-20261003';
const creds=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8'));
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
try {
 const master=creds.find(c=>c.loginId==='시험master');await page.goto(origin+'/home');await page.getByLabel('로그인 아이디',{exact:true}).fill(master.loginId);await page.getByLabel('비밀번호',{exact:true}).fill(master.password);await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();
 const baseline=await (await page.request.get(origin+'/api/sessions/'+id+'/teams')).json();
 await page.goto(origin+'/session/'+id+'/teams/edit');await page.getByRole('button',{name:'배정으로',exact:true}).waitFor();

 const saveBefore=baseline;
 await page.getByRole('button',{name:'A팀 세터 배정',exact:true}).click();await page.getByRole('button',{name:/ 배정$/,exact:false}).filter({hasText:'배정'}).first().click();
 await page.getByRole('button',{name:'미리보기',exact:true}).click();
 const group=page.getByRole('group',{name:'A팀 추가 선수',exact:true});await group.getByRole('button',{name:'추가 선수 자리',exact:true}).click();await group.locator('.allocation-reserve-slot').first().click();await page.locator('.ab-candidate button').first().click();await page.getByRole('button',{name:'미리보기',exact:true}).click();
 await page.getByRole('button',{name:'B팀 세터 배정',exact:true}).click();await page.getByRole('button',{name:'미리보기',exact:true}).click();
 const a=page.locator('.allocation-preview-slot[data-assigned="true"]').first(),b=page.locator('.allocation-preview-slot[aria-current]'),empty=page.getByRole('button',{name:'C팀 세터 배정',exact:true}),extra=group.locator('.allocation-reserve-slot');
 async function style(l){return l.evaluate(e=>{const s=getComputedStyle(e);return {bg:s.backgroundColor,border:s.borderColor,height:e.getBoundingClientRect().height,name:getComputedStyle(e.querySelector('strong')).color,label:getComputedStyle(e.querySelector('span')).color}})}
 for(const width of [390,1024]){
  await page.setViewportSize({width,height:844});await page.mouse.move(0,0);await page.getByRole('button',{name:'코트',exact:true}).click();await a.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
  await page.waitForTimeout(250);const filledStyle=await style(a),selectedStyle=await style(b),emptyStyle=await style(empty),extraStyle=await style(extra);
  assert.equal(filledStyle.bg,'rgb(231, 242, 235)');assert.equal(extraStyle.bg,filledStyle.bg);assert.equal(selectedStyle.bg,'rgb(231, 239, 248)');assert.notEqual(emptyStyle.bg,filledStyle.bg);assert.equal(filledStyle.height,emptyStyle.height);
  results.push({width,filledStyle,selectedStyle,emptyStyle,extraStyle});await page.screenshot({path:out+'/court-'+width+'.png'});
  await page.getByRole('button',{name:'행',exact:true}).click();await page.mouse.move(0,0);await page.waitForTimeout(250);assert.equal((await style(a)).bg,filledStyle.bg);assert.equal((await style(extra)).bg,filledStyle.bg);await page.screenshot({path:out+'/rows-'+width+'.png'});
 }
 await a.click();await page.getByRole('button',{name:/A팀 세터 .* 배정 해제/}).click();await page.getByRole('button',{name:'미리보기',exact:true}).click();await page.getByRole('button',{name:'B팀 세터 배정',exact:true}).click();await page.getByRole('button',{name:'미리보기',exact:true}).click();await page.mouse.move(0,0);await page.waitForTimeout(250);const released=page.getByRole('button',{name:'A팀 세터 배정',exact:true});assert.equal(await released.getAttribute('data-assigned'),'false');assert.notEqual((await style(released)).bg,'rgb(231, 242, 235)');
 assert.deepEqual(await (await page.request.get(origin+'/api/sessions/'+id+'/teams')).json(),saveBefore);assert.deepEqual(errors,[]);results.push({check:'release restores empty color; saved user data unchanged'});
}finally{await writeFile(out+'/browser.json',JSON.stringify({results,errors},null,2));await browser.close();console.log(JSON.stringify({results,errors},null,2))}
