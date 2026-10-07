import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/p3-publish-20261003',origin='http://192.168.219.173:4180';
const creds=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8')),id=JSON.parse(await readFile(out+'/browser.json','utf8')).results[0].id;
const browser=await chromium.launch({channel:'chrome'}),results=[];
try{for(const login of ['시험master','시험waiter','시험outsider']){
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage(),c=creds.find(c=>c.loginId===login);
 await p.goto(origin+'/home');await p.getByLabel('로그인 아이디',{exact:true}).fill(c.loginId);await p.getByLabel('비밀번호',{exact:true}).fill(c.password);await p.getByRole('button',{name:'로그인',exact:true}).click();await p.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();await p.goto(origin+'/session/'+id);await p.getByRole('heading',{name:'함께할 인원',exact:true}).waitFor();
 if(login==='시험outsider')await p.getByText('참석 회원만 팀편성과 경기 순서를 확인할 수 있어요.',{exact:true}).waitFor();else await p.getByRole('heading',{name:'A팀',exact:true}).waitFor();
 const sizes=await p.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));assert.equal(sizes.width,390);assert.equal(sizes.content,390);
 await p.screenshot({path:out+'/'+login+'-390.png',fullPage:true});results.push({login,...sizes});await ctx.close();
}}finally{await browser.close();await writeFile(out+'/mobile.json',JSON.stringify(results,null,2));console.log(results)}
