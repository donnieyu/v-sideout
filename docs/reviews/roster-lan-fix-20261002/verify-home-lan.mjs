import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const creds=JSON.parse(await readFile('/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1/web/.wrangler/sideout-p1/credentials.json','utf8'));
const browser=await chromium.launch({channel:'chrome'});
try {
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message)});
await page.goto('http://192.168.219.173:4180/home');
console.log('crypto',await page.evaluate(()=>({secure:isSecureContext,uuid:typeof crypto.randomUUID,random:typeof crypto.getRandomValues})));
const c=creds.find(c=>c.loginId==='시험master');await page.getByLabel('로그인 아이디',{exact:true}).fill(c.loginId);await page.getByLabel('비밀번호',{exact:true}).fill(c.password);await page.getByRole('button',{name:'로그인',exact:true}).click();
await page.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();
await page.getByRole('button',{name:'명단 확인',exact:true}).first().click();await page.getByRole('button',{name:'참가자 추가',exact:true}).click();
await page.getByRole('checkbox').first().waitFor();console.log('picker opens',await page.getByRole('dialog').count());
// Prevent a successful mutation while reproducing: network write capture fulfills error instead.
let posted=false;await page.route('**/api/sessions/*/participants',async route=>{if(route.request().method()==='POST'){posted=true;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:{code:'TEST',message:'test'}})})}else await route.continue()});
await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'1명 추가',exact:true}).click();await page.waitForTimeout(500);
assert.equal(posted,true);assert.deepEqual(errors,[]);assert.equal(await page.getByRole('button',{name:'추가 중…',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'1명 추가',exact:true}).isEnabled(),true);console.log('LAN failure recovered, retry enabled');
await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(1000);assert.equal(await page.getByRole('dialog').count(),1);assert.equal(await page.getByRole('checkbox').first().isChecked(),true);console.log('focus restored exactly one dialog with selection');await page.screenshot({path:'/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1/docs/reviews/roster-lan-fix-20261002/home-picker-390.png'});const box=await page.getByRole('dialog').boundingBox();assert(box.x>=0&&box.x+box.width<=390);await page.getByRole('button',{name:'취소',exact:true}).click();await page.getByRole('button',{name:'확인',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.deepEqual(errors,[]);console.log('close and UI recovered');
} finally {await browser.close()}
