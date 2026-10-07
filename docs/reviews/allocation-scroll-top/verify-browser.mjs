import{chromium}from'/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';import{readFile,writeFile}from'node:fs/promises';import assert from'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/allocation-scroll-top',origin='http://127.0.0.1:4180',id=JSON.parse(await readFile(root+'/docs/reviews/allocation-preview-promotion/browser.json','utf8')).results[0].id;
const creds=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8'));const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:390,height:844}}),results=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
try{const m=creds.find(c=>c.loginId==='시험master');await p.goto(origin+'/home');await p.getByLabel('로그인 아이디',{exact:true}).fill(m.loginId);await p.getByLabel('비밀번호',{exact:true}).fill(m.password);await p.getByRole('button',{name:'로그인',exact:true}).click();await p.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();
 const get=async()=>{const r=await p.request.get(origin+'/api/sessions/'+id+'/teams');assert.equal(r.status(),200);return(await r.json()).data};const before=await get();
 for(const width of [320,390,1024]){
 await p.setViewportSize({width,height:844});await p.goto(origin+'/session/'+id+'/teams/edit');const overview=p.locator('.allocation-overview');await overview.waitFor();
 // Select C's occupied setter, which used to anchor the preview to C on every transition.
 await p.getByRole('group',{name:'C팀 코트',exact:true}).locator('button').nth(2).click();
 const selected=await p.locator('.ab-cont-slot.active>button').first().getAttribute('aria-label');assert(selected.startsWith('C팀 세터'));
 await p.locator('.ab-candidate-list').evaluate(el=>{el.scrollTop=el.scrollHeight});await p.getByRole('button',{name:'미리보기',exact:true}).click();await overview.waitFor();assert.equal(await overview.evaluate(el=>el.scrollTop),0);assert.equal(await p.evaluate(()=>scrollY),0);
 // Invoke the same control at a retained nonzero scroll offset, without locator auto-scrolling masking the reset.
 await overview.evaluate(el=>{el.scrollTop=200});await p.getByRole('button',{name:'행',exact:true}).evaluate(el=>el.click());await p.waitForFunction(()=>document.querySelector('.allocation-overview').scrollTop===0);
 await overview.evaluate(el=>{el.scrollTop=300});await p.getByRole('button',{name:'코트',exact:true}).evaluate(el=>el.click());await p.waitForFunction(()=>document.querySelector('.allocation-overview').scrollTop===0);
 await p.screenshot({path:out+'/preview-'+width+'.png',animations:'disabled'});
 await p.getByRole('button',{name:'배정하기',exact:true}).click();assert.equal(await p.locator('.ab-cont-slot.active>button').first().getAttribute('aria-label'),selected);assert.equal(await p.locator('.ab-candidate-list').evaluate(el=>el.scrollTop),0);assert.equal(await p.evaluate(()=>scrollY),0);results.push({width,previewTop:true,courtRowsTop:true,pickerTop:true,selectionPreserved:selected});
 }
 assert.deepEqual(await get(),before);assert.deepEqual(errors,[]);await writeFile(out+'/browser.json',JSON.stringify({results,errors,savedDataUnchanged:true,physicalIPhone:false},null,2));console.log(JSON.stringify(results));
}catch(e){await p.screenshot({path:out+'/failure.png'});console.error((await p.locator('body').innerText()).slice(0,1000));throw e}finally{await b.close()}
