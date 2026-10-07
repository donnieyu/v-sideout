import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/allocation-preview-promotion',origin=process.env.APP_ORIGIN||'http://127.0.0.1:4180';
const evidence=JSON.parse(await readFile(out+'/browser.json','utf8')),id=evidence.results[0].id,creds=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8'));
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(15000);
try{
 const master=creds.find(c=>c.loginId==='시험master');await page.goto(origin+'/home');await page.getByLabel('로그인 아이디',{exact:true}).fill(master.loginId);await page.getByLabel('비밀번호',{exact:true}).fill(master.password);await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();
 await page.goto(origin+'/session/'+id);await page.getByRole('link',{name:'팀편성 수정',exact:true}).click();await page.getByRole('button',{name:'배정하기',exact:true}).waitFor();
 const assigned=page.locator('.allocation-preview-slot[data-assigned="true"]').first();await assigned.click();const release=page.getByRole('button',{name:/배정 해제$/}).first();const releasedName=await release.getAttribute('aria-label');await release.click();await page.getByText('저장하지 않은 변경',{exact:true}).waitFor();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const dialog=page.waitForEvent('dialog');const navigation=page.goBack({timeout:10000}).catch(()=>null);const prompt=await dialog;assert.equal(prompt.type(),'beforeunload');await prompt.dismiss();await navigation;
 assert(page.url().includes('/teams/edit'));assert.equal(await page.getByRole('button',{name:releasedName,exact:true}).count(),0);
 await page.getByRole('button',{name:'미리보기',exact:true}).click();page.once('dialog',d=>d.accept());await page.getByRole('link',{name:'일정 상세로 돌아가기',exact:true}).click();await page.waitForURL(origin+'/session/'+id);await page.getByRole('link',{name:'팀편성 수정',exact:true}).click();await page.getByRole('button',{name:'배정하기',exact:true}).waitFor();
 await page.locator('.allocation-preview-slot[data-assigned="true"]').first().click();assert.equal(await page.getByRole('button',{name:releasedName,exact:true}).count(),1);
 await writeFile(out+'/navigation.json',JSON.stringify({passed:true,checks:['native Back cancellation preserves dirty assignment','confirmed header exit discards cached edits','re-entry loads saved allocation'],physicalIPhone:false},null,2));console.log('PASS native Back cancellation, confirmed exit, saved re-entry');
}finally{await browser.close()}
