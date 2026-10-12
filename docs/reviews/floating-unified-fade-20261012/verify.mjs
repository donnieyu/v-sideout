import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';import {readFile} from 'node:fs/promises';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',base='http://127.0.0.1:4180',c=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8')).find(x=>x.loginId==='시험master');const b=await chromium.launch({channel:'chrome'}),ctx=await b.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage();await ctx.request.post(base+'/api/auth/login',{headers:{Origin:base},data:{loginId:c.loginId,password:c.password}});
const checks=[];
for(const width of [320,390,1280]){await p.setViewportSize({width,height:844});for(const suffix of ['','/schedule/edit','/teams/edit']){
 await p.goto(base+'/session/30e24320-0faa-4437-9dee-88778dd02d67'+suffix);await p.locator(suffix?'[data-floating-editor-actions]':'[data-return-placement]').waitFor();
 const result=await p.evaluate(()=>{const bar=document.querySelector('[data-floating-editor-actions]')??document.querySelector('[data-return-placement]'),s=getComputedStyle(bar,'::before');return {gradient:s.backgroundImage,pointer:s.pointerEvents,visibility:s.visibility,height:(bar.querySelector('a')??bar).getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth}});
 if(result.overflow||width<761&&((!result.gradient.includes('linear-gradient')||!result.gradient.includes('0.82'))||result.pointer!=='none'||result.height!==44)||width>760&&result.gradient!=='none')throw Error(JSON.stringify(result));
 checks.push({width,suffix,...result});await p.screenshot({path:root+'/docs/reviews/floating-unified-fade-20261012/'+(suffix.split('/')[1]||'detail')+'-'+width+'.png'});
 if(width===390&&suffix==='/teams/edit'){await p.getByRole('button',{name:'공개 취소',exact:true}).click();await p.getByRole('dialog').waitFor();if(await p.locator('[data-floating-editor-actions]').isVisible())throw Error('Backdrop must hide with modal');await p.getByRole('dialog').getByRole('button',{name:'공개 유지',exact:true}).click()}
}}
console.log(JSON.stringify(checks));await b.close();
