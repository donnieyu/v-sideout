// Verify that the team editor keeps its tools visible while either view scrolls.
// Run against a local P1 Worker with PLAYWRIGHT_MODULE set if Playwright is external.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.P1_ORIGIN||'http://127.0.0.1:4180';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Local test server only');
const sessionId=process.env.P1_TEST_SESSION||'4a03a759-7ec2-4a7f-a584-f63c0ac74f60';
const credentials=JSON.parse(await readFile('web/.wrangler/sideout-p1/credentials.json','utf8'))
  .find(item=>item.loginId==='시험master');
assert(credentials,'Test master credential is required');

const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 for(const {width,height} of [{width:320,height:667},{width:390,height:844}]){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  await page.goto(origin+'/home');
  await page.getByLabel('로그인 아이디',{exact:true}).fill(credentials.loginId);
  await page.getByLabel('비밀번호',{exact:true}).fill(credentials.password);
  await page.getByRole('button',{name:'로그인',exact:true}).click();
  await page.goto(`${origin}/session/${sessionId}/teams/edit`);
  const toolbar=page.locator('.allocation-session-body > .ab-board-toolbar');
  await toolbar.waitFor();
  const autoButton=toolbar.getByRole('button',{name:'자동 배치'});
  if(await autoButton.count())assert(await autoButton.isVisible(),'Automatic allocation must remain in the toolbar');
  for(const {tab,panel} of [{tab:'코트',panel:'.allocation-overview'},{tab:'행',panel:'.real-board'}]){
   await toolbar.getByRole('button',{name:tab,exact:true}).click();
   const measurements=await page.evaluate(selector=>{
    const body=document.querySelector('.allocation-session-body');
    const bar=body.querySelector(':scope > .ab-board-toolbar');
    const content=body.querySelector(selector);
    const nav=document.querySelector('.allocation-session-nav');
    const before={toolbarTop:bar.getBoundingClientRect().top,navTop:nav.getBoundingClientRect().top};
    content.scrollTop=content.scrollHeight;
    return {before,after:{toolbarTop:bar.getBoundingClientRect().top,navTop:nav.getBoundingClientRect().top},
      panelScroll:content.scrollTop,panelOverflow:content.scrollHeight-content.clientHeight,
      bodyScroll:body.scrollTop,documentOverflow:document.documentElement.scrollWidth-innerWidth,
      panelHeight:content.clientHeight};
   },panel);
   if(measurements.panelOverflow>20)assert(measurements.panelScroll>20,`${tab} should scroll within its panel at ${width}px: ${JSON.stringify(measurements)}`);
   else assert.equal(measurements.panelScroll,0,`${tab} already fits at ${width}px`);
   assert(measurements.panelHeight>200,`${tab} needs usable content height at ${width}px`);
   assert(Math.abs(measurements.after.toolbarTop-measurements.before.toolbarTop)<1,`${tab} toolbar moved at ${width}px`);
   assert(Math.abs(measurements.after.navTop-measurements.before.navTop)<1,`${tab} footer moved at ${width}px`);
   assert.equal(measurements.bodyScroll,0,`${tab} editor body should not scroll at ${width}px`);
   assert(measurements.documentOverflow<=1,`${tab} document overflow at ${width}px`);
   if(process.env.P1_CAPTURE_DIR)await page.screenshot({path:`${process.env.P1_CAPTURE_DIR}/${width}-${tab}.png`});
   console.log(JSON.stringify({width,height,tab,...measurements}));
  }
  await context.close();
 }
}finally{await browser.close()}
