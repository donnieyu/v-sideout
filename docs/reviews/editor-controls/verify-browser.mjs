import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/editor-controls',origin='http://127.0.0.1:4180';
const creds=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8')),prior=JSON.parse(await readFile(root+'/docs/reviews/allocation-preview-promotion/browser.json','utf8')),id=prior.results[0].id;
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844}}),results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const styles=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {width:r.width,height:r.height,font:s.fontSize,background:s.backgroundColor,border:s.borderRadius}};
try{
 const master=creds.find(c=>c.loginId==='시험master');await page.goto(origin+'/home');await page.getByLabel('로그인 아이디',{exact:true}).fill(master.loginId);await page.getByLabel('비밀번호',{exact:true}).fill(master.password);await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();
 for(const width of [320,390,1024]){
  await page.setViewportSize({width,height:844});await page.goto(origin+'/session/'+id);await page.locator('#teams').waitFor();
  const edits=page.locator('[data-sideout-edit]');assert.equal(await edits.count(),3);const editStyles=await edits.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {width:r.width,height:r.height,font:s.fontSize,background:s.backgroundColor,border:s.borderRadius}}));assert.deepEqual(editStyles[0],editStyles[1]);assert.deepEqual(editStyles[1],editStyles[2]);assert(editStyles[0].height>=44);await page.locator('#teams').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/detail-'+width+'.png'});
  const editorResults=[];
  for(const kind of ['schedule','teams','matches']){
   await page.goto(origin+'/session/'+id+'/'+kind+'/edit');const actions=page.locator('[data-editor-actions]');await actions.waitFor();const cancel=actions.getByRole('button',{name:'취소',exact:true}),save=actions.getByRole('button',{name:'저장',exact:true});await save.waitFor();const cb=await cancel.boundingBox(),sb=await save.boundingBox();assert(cb.x<sb.x&&Math.abs(cb.y-sb.y)<1);assert.equal(cb.height,44);assert.equal(sb.height,44);const saveStyle=await save.evaluate(styles);editorResults.push({kind,saveStyle});await page.screenshot({path:out+'/'+kind+'-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  }
  assert.deepEqual(editorResults[0].saveStyle,editorResults[1].saveStyle);assert.deepEqual(editorResults[1].saveStyle,editorResults[2].saveStyle);results.push({width,editStyles:editStyles[0],editorResults});
 }
 // Test dirty cancellation through each actual editor without writing fixture data.
 await page.setViewportSize({width:390,height:844});
 for(const kind of ['schedule','teams','matches']){
  await page.goto(origin+'/session/'+id+'/'+kind+'/edit');const actions=page.locator('[data-editor-actions]');await actions.waitFor();
  if(kind==='schedule')await page.getByLabel('장소',{exact:true}).fill('취소 검증 장소');
  if(kind==='teams'){await page.getByRole('button',{name:'행',exact:true}).click();await page.locator('.allocation-result-slots button').first().click();await page.getByRole('button',{name:/배정 해제$/}).first().click();}
  if(kind==='matches')await page.getByRole('switch',{name:'신입 경기 포함'}).click();
  let message='';page.once('dialog',async d=>{message=d.message();await d.dismiss()});await actions.getByRole('button',{name:'취소',exact:true}).click();assert(message);assert(page.url().includes('/edit'));page.once('dialog',d=>d.accept());await actions.getByRole('button',{name:'취소',exact:true}).click();await page.waitForURL(origin+'/session/'+id);results.push({check:'dirty cancel dismiss retains editor; confirm returns to detail',kind});
 }
 assert.deepEqual(errors,[]);
}catch(e){await page.screenshot({path:out+'/failure.png'});console.error((await page.locator('body').innerText()).slice(0,1500));throw e}finally{await writeFile(out+'/browser.json',JSON.stringify({results,errors,dataWrites:false},null,2));await browser.close();console.log(JSON.stringify(results));}
