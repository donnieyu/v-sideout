import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',origin='http://127.0.0.1:4180';
const c=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8')).find(c=>c.loginId==='시험master');
const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();let writes=0;
try{
 await context.request.post(origin+'/api/auth/login',{headers:{Origin:origin},data:{loginId:c.loginId,password:c.password}});
 await page.route('**/api/sessions/**',async route=>{if(route.request().method()==='POST'){writes++;await route.fulfill({status:200,json:{ok:true,data:{resourceId:'30e24320-0faa-4437-9dee-88778dd02d67',revision:999}}});return}await route.continue()});
 await page.goto(origin+'/session/30e24320-0faa-4437-9dee-88778dd02d67/schedule/edit');
 await page.getByRole('textbox',{name:'장소',exact:true}).fill('키보드 저장 검증 - API 모의 응답');
 await page.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:460});visualViewport.dispatchEvent(new Event('resize'))});await page.getByRole('button',{name:'키보드 닫기',exact:true}).waitFor();
 const box=await page.getByRole('button',{name:'저장',exact:true}).boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.up();
 await page.getByText('저장했어요. 계속 수정할 수 있습니다.').waitFor({timeout:3000});assert.equal(writes,1);
 await writeFile(root+'/docs/reviews/unified-schedule-20261012/keyboard-save.json',JSON.stringify({mockSaves:writes,realWrites:0,pointerSequence:'down -> focusout -> up',passed:true}));console.log('Keyboard pointer save passed, realWrites=0');
}finally{await browser.close()}
