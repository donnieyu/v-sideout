// Run from repository root with an existing local P1 Worker and Playwright installation.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.P1_ORIGIN||'http://127.0.0.1:4180';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Local synthetic fixture only');
const creds=JSON.parse(await readFile('web/.wrangler/sideout-p1/credentials.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const results=[];
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.stack)});
  const c=creds.find(c=>c.loginId==='시험applicant');
  await page.goto(origin+'/home');
  await page.getByLabel('로그인 아이디',{exact:true}).fill(c.loginId);await page.getByLabel('비밀번호',{exact:true}).fill(c.password);await page.getByRole('button',{name:'로그인',exact:true}).click();
  await page.getByRole('heading',{name:'이번 주, 어느 코트에서 만날까요?'}).waitFor();
  await page.getByRole('link',{name:'뉴배동 · 시험 상세 정보'}).waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`home overflow ${width}`);
  await page.screenshot({path:`docs/reviews/p1-evidence/home-${width}.png`,fullPage:true});
  await page.getByRole('link',{name:'뉴배동 · 시험 상세 정보'}).click();await page.getByRole('heading',{name:'운동 일정'}).waitFor({timeout:8000}).catch(async e=>{console.error('FAILED URL',page.url());console.error((await page.locator('body').innerText()).slice(0,1500));throw e});
  await page.getByRole('heading',{name:'팀편성',exact:true}).waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`detail overflow ${width}`);
  await page.screenshot({path:`docs/reviews/p1-evidence/detail-${width}.png`,fullPage:true});
  await page.reload();await page.getByRole('heading',{name:'운동 일정'}).waitFor();
  await page.goBack();await page.getByRole('heading',{name:'이번 주, 어느 코트에서 만날까요?'}).waitFor();
  await page.goForward();await page.getByRole('heading',{name:'운동 일정'}).waitFor();
  if(width<760){await page.getByRole('button',{name:'메뉴 열기'}).click();await page.getByRole('link',{name:'동명이인, 계정 정보'}).click()}else await page.getByRole('link',{name:'동명이인, 계정 정보'}).click();
  await page.getByRole('heading',{name:'계정 정보',exact:true}).waitFor();
  await page.getByRole('button',{name:'비밀번호 변경',exact:true}).click();await page.getByRole('heading',{name:'비밀번호 변경',exact:true}).waitFor();await page.getByRole('button',{name:'돌아가기',exact:true}).click();
  await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.getByRole('button',{name:'로그인',exact:true}).waitFor();
  assert(!await page.getByRole('heading',{name:'동명이인',exact:true}).count());assert.deepEqual(errors,[]);
  results.push({width,status:'pass',checks:['login','home','detail','no horizontal overflow','reload','history','account','password entry','logout']});
  await context.close();
 }
}finally{await browser.close();await writeFile('docs/reviews/p1-evidence/browser-results.json',JSON.stringify(results,null,2))}
console.log(JSON.stringify(results));
