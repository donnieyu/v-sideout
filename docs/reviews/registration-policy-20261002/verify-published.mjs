// Read public fixture and verify rejected writes only; its roster must remain unchanged.
import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/registration-policy-20261002',origin='http://192.168.219.173:4180';
const creds=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8'));
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/session/session-test-open');const c=creds.find(c=>c.loginId==='시험master');await page.getByLabel('로그인 아이디',{exact:true}).fill(c.loginId);await page.getByLabel('비밀번호',{exact:true}).fill(c.password);await page.getByRole('button',{name:'로그인',exact:true}).click();
 await page.getByRole('button',{name:'명단 확인',exact:true}).click();await page.getByRole('heading',{name:'함께하는 회원'}).waitFor();await page.getByRole('heading',{name:'소속 회원',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'참가자 추가',exact:true}).count(),0);
 const api=origin+'/api/sessions/session-test-open',before=(await (await page.request.get(api)).json()).data;assert(before.teamPublished);assert.equal(before.capabilities.canManageRoster,false);assert.equal(before.participation.canRegister,false);
 assert.equal((await page.request.get(api+'/participants')).status(),400);
 for(const payload of [{action:'register'},{action:'add',memberIds:[before.visibleApplicants[0].memberId]}]){
  const response=await page.request.post(api+'/participants',{headers:{Origin:origin},data:{commandId:randomUUID(),expectedRevision:before.rosterRevision,payload:{...payload,sessionRevision:before.sessionRevision}}});assert.equal(response.status(),400);assert((await response.text()).includes('팀편성 공개 후'));
 }
 const after=(await (await page.request.get(api)).json()).data;assert.equal(after.rosterRevision,before.rosterRevision);assert.deepEqual(after.counts,before.counts);assert.deepEqual(after.visibleWaiters,before.visibleWaiters);
 await page.waitForTimeout(300);await page.screenshot({path:out+'/published-roster-390.png'});results.push('published roster hides add, candidate/self/manager APIs reject; roster unchanged');
 await page.getByRole('button',{name:'확인',exact:true}).click();await page.goto(origin+'/home');await page.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();const home=(await (await page.request.get(origin+'/api/sessions')).json()).data;assert.equal(home.cards.find(c=>c.session.id==='session-test-open').participation.canRegister,false);results.push('home and detail expose the same closed capability');assert.deepEqual(errors,[]);
}finally{await writeFile(out+'/published-browser.json',JSON.stringify({results,errors},null,2));await browser.close();console.log({results,errors})}
