import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
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
console.log('submit',{posted,errors,busy:await page.getByRole('button',{name:'추가 중…',exact:true}).count()});
await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(1000);console.log('after focus dialogs',await page.getByRole('dialog').count());
} finally {await browser.close()}
