import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/p3-extra-add-flow-20261003',origin='http://192.168.219.173:4180',id='session-allocation-practice-20261003';
const creds=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8'));
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
try {
 const master=creds.find(c=>c.loginId==='시험master');await page.goto(origin+'/home');await page.getByLabel('로그인 아이디',{exact:true}).fill(master.loginId);await page.getByLabel('비밀번호',{exact:true}).fill(master.password);await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();
 const baseline=await (await page.request.get(origin+'/api/sessions/'+id+'/teams')).json();
 await page.goto(origin+'/session/'+id+'/teams/edit');await page.getByRole('button',{name:'배정으로',exact:true}).waitFor();
 for(const width of [390,320,1024]){
  await page.setViewportSize({width,height:844});const add=page.getByRole('button',{name:'추가 선수 자리',exact:true}).first();await add.scrollIntoViewIfNeeded();
  const style=await add.evaluate(b=>{const svg=b.querySelector('svg'),s=getComputedStyle(svg),c=getComputedStyle(b);return {justify:c.justifyContent,iconWidth:svg.getBoundingClientRect().width,iconHeight:svg.getBoundingClientRect().height,iconMargin:s.margin,height:b.getBoundingClientRect().height}});
  if(!process.argv.includes('--before')){assert.equal(style.justify,'center');assert(style.iconWidth<=16);assert.equal(style.iconMargin,'0px');assert(style.height>=44)}
  results.push({width,style});if(width===390)await page.screenshot({path:out+(process.argv.includes('--before')?'/before.png':'/after-empty.png')});
 }
 if(!process.argv.includes('--before')){
  await page.setViewportSize({width:390,height:844});
  const group=page.getByRole('group',{name:'A팀 추가 선수',exact:true}),slots=group.locator('.allocation-reserve-slot');const count=await slots.count(),names=await slots.evaluateAll(bs=>bs.map(b=>b.getAttribute('aria-label')));
  const current=await page.locator('[aria-current="location"]').getAttribute('aria-label');
  await group.getByRole('button',{name:'추가 선수 자리',exact:true}).click();assert.equal(await slots.count(),count+1);assert(await page.getByRole('button',{name:'배정으로',exact:true}).isVisible());assert.equal(await page.locator('[aria-current="location"]').getAttribute('aria-label'),current);
  const addedName=(await slots.evaluateAll(bs=>bs.map(b=>b.getAttribute('aria-label')))).find(n=>!names.includes(n));const added=group.getByRole('button',{name:addedName,exact:true});await added.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/after-added.png'});await added.click();await page.getByRole('button',{name:'포지션 배정으로',exact:true}).waitFor();assert(await page.getByRole('button',{name:'미리보기',exact:true}).isVisible());await page.screenshot({path:out+'/after-slot-click.png'});
  const unchanged=await (await page.request.get(origin+'/api/sessions/'+id+'/teams')).json();assert.deepEqual(unchanged,baseline);results.push({check:'add preserves preview and selection; slot click enters assignment; saved data unchanged'});
 }
 assert.deepEqual(errors,[]);
} finally {await writeFile(out+(process.argv.includes('--before')?'/before.json':'/browser.json'),JSON.stringify({results,errors},null,2));await browser.close();console.log(JSON.stringify({results,errors},null,2))}
