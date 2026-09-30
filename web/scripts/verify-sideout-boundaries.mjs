// Local synthetic fixture only; first run rotates the outsider's temporary password.
// Run from repository root. Passwords remain in the ignored 0600 credential file.
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.P1_ORIGIN||'http://127.0.0.1:4180';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const file='web/.wrangler/sideout-p1/credentials.json';
const credentials=JSON.parse(await readFile(file,'utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'}),results=[];
async function login(page,role,path='/home'){
 const c=credentials.find(c=>c.loginId==='시험'+role);
 await page.goto(origin+path);
 await page.getByLabel('로그인 아이디',{exact:true}).fill(c.loginId);
 await page.getByLabel('비밀번호',{exact:true}).fill(c.password);
 await page.getByRole('button',{name:'로그인',exact:true}).click();
 return c;
}
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 const c=await login(page,'outsider');
 await page.waitForFunction(()=>document.body.innerText.includes('첫 비밀번호 변경')||document.body.innerText.includes('이번 주, 어느 코트에서 만날까요?'));
 if(await page.getByRole('heading',{name:'첫 비밀번호 변경',exact:true}).count()){
  assert.equal((await page.request.get(origin+'/api/sessions')).status(),403);
  const next='Test'+randomBytes(18).toString('hex');
  await page.getByLabel('현재 임시 비밀번호',{exact:true}).fill(c.password);
  await page.locator('input[autocomplete="new-password"]').nth(0).fill(next);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(next);
  await page.getByRole('button',{name:'비밀번호 변경',exact:true}).click();
  await page.getByRole('heading',{name:'이번 주, 어느 코트에서 만날까요?'}).waitFor();
  c.password=next;await writeFile(file,JSON.stringify(credentials,null,2),{mode:0o600});
  results.push({check:'first-password-change and restricted API',status:'pass'});
 }else results.push({check:'first-password-change',status:'already activated; repeat run'});
 await page.goto(origin+'/session/session-test-open');
 await page.getByText('참석 회원만 팀편성과 경기 순서를 확인할 수 있어요.').waitFor();
 results.push({check:'outsider published lineup withheld',status:'pass'});
 await page.goto(origin+'/session/session-test-draft');
 await page.getByRole('alert').waitFor();assert.equal((await page.request.get(origin+'/api/sessions/session-test-draft')).status(),404);
 results.push({check:'member hidden prepared direct URL',status:'pass'});
 await page.goto(origin+'/home');await page.getByRole('heading',{name:'이번 주, 어느 코트에서 만날까요?'}).waitFor();
 let fail=true;
 await page.route('**/api/sessions?*',route=>fail?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:{code:'STORAGE_UNAVAILABLE',message:'시험 저장소 오류'}})}):route.continue());
 await page.reload();await page.getByText('시험 저장소 오류').waitFor();fail=false;
 await page.getByRole('button',{name:'다시 시도'}).click();await page.getByRole('link',{name:'뉴배동 · 시험 상세 정보'}).waitFor();
 results.push({check:'503 retry returns live D1 data',status:'pass'});
 await page.request.post(origin+'/api/auth/logout',{headers:{Origin:origin}});
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.getByRole('button',{name:'로그인',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'뉴배동 · 시험 상세 정보'}).count(),0);
 results.push({check:'revoked session hidden on focus',status:'pass'});
 await context.close();
 const manager=await browser.newContext(),p=await manager.newPage();
 await login(p,'master','/session/session-test-draft');await p.getByRole('heading',{name:'운동 일정'}).waitFor();
 assert.equal((await p.request.get(origin+'/api/sessions/session-test-draft')).status(),200);
 results.push({check:'manager prepared direct URL',status:'pass'});
 const malformed=await p.request.get(origin+'/api/sessions/%ZZ');
 assert(malformed.status()<500,`Malformed ID became ${malformed.status()}`);
 results.push({check:'malformed encoded API ID',status:malformed.status()});
 await manager.close();
}finally{await browser.close();await writeFile('docs/reviews/p1-evidence/boundary-results.json',JSON.stringify(results,null,2))}
console.log(JSON.stringify(results));
