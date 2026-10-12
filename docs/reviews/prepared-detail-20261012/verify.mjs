import {chromium,webkit} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/prepared-detail-20261012',base='http://127.0.0.1:4180',id='a09b333e-04c5-498b-97a3-29a12c6930bc';
const credential=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8')).find(x=>x.loginId==='시험master');
const results=[];
for(const [name,engine] of [['chrome',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chrome'?{channel:'chrome'}:{});
 const context=await browser.newContext(name==='webkit'?{isMobile:true,hasTouch:true}:{});
 await context.request.post(base+'/api/auth/login',{headers:{Origin:base},data:{loginId:credential.loginId,password:credential.password}});
 const response=await context.request.get(base+'/api/sessions/'+id);assert.equal(response.status(),200);
 const original=(await response.json()).data;
 const data={...original,session:{...original.session,date:'2027-03-14',phase:'draft',place:'검토용 체육관',notice:'실내 운동화를 준비해 주세요.\n입장은 운동 시작 30분 전부터 가능합니다.',deadline:'2027-03-13T09:00:00Z'},teamPublished:false,managerTeamPreview:undefined,publishedTeams:null,publishedMatches:null,counts:{applicants:0,waiting:0},capabilities:{...original.capabilities,canEditSchedule:true,canEditTeams:false,canManageRoster:false}};
 let writes=[];
 await context.route('**/api/sessions/'+id,async route=>{
  if(route.request().method()==='POST'){
   const body=route.request().postDataJSON();writes.push(body);assert.equal(body.payload.phase,'open');assert.equal(body.payload.place,'검토용 체육관');assert.equal(body.expectedRevision,data.sessionRevision);
   data.session.phase='open';await route.fulfill({json:{ok:true,data:{resourceId:id,revision:data.sessionRevision+1}}});
  }else await route.fulfill({json:{ok:true,data}});
 });
 const page=await context.newPage();
 for(const width of [320,390,1024]){
  data.session.phase='draft';await page.setViewportSize({width,height:844});await page.goto(base+'/session/'+id+'?weekStart=2027-03-08&filter=all');
  await page.getByRole('button',{name:'모집 시작',exact:true}).waitFor();
  assert.equal(await page.getByRole('textbox').count(),0);
  const layout=await page.evaluate(()=>{const b=document.querySelector('[data-floating-editor-actions] button'),s=getComputedStyle(b);return {width:innerWidth,scroll:document.documentElement.scrollWidth,button:b.getBoundingClientRect().toJSON(),font:s.fontSize,weight:s.fontWeight}});
  assert.ok(layout.scroll<=width);if(width<760){assert.equal(layout.button.height,44);assert.equal(layout.font,'13px')}
  results.push({name,...layout});await page.screenshot({path:out+'/'+name+'-'+width+'.png',fullPage:true});
 }
 await page.getByRole('button',{name:'모집 시작',exact:true}).click();await page.getByRole('button',{name:'명단 확인',exact:true}).waitFor();assert.equal(writes.length,1);assert.equal(await page.getByRole('button',{name:'모집 시작',exact:true}).count(),0);
 results.push({name,startFlow:'passed',writesIntercepted:writes.length});await browser.close();
}
await writeFile(out+'/measure.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
