import {chromium} from '/Users/donnieyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1',out=root+'/docs/reviews/compact-member-filter',origin='http://127.0.0.1:4180';
const id=JSON.parse(await readFile(root+'/docs/reviews/unregistered-member-filters/browser.json','utf8')).id;
const c=JSON.parse(await readFile(root+'/web/.wrangler/sideout-p1/credentials.json','utf8')).find(c=>c.loginId==='시험master');
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage(),results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
async function get(){const r=await page.request.get(origin+'/api/sessions/'+id+'/teams');assert.equal(r.status(),200);return(await r.json()).data}
try{
 await page.goto(origin+'/home');await page.getByLabel('로그인 아이디',{exact:true}).fill(c.loginId);await page.getByLabel('비밀번호',{exact:true}).fill(c.password);await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('button',{name:'즐겨찾기 관리'}).waitFor();
 const before=await get(),used=before.draft.teams.flatMap(t=>t.players.map(p=>p.memberId)),members=before.people.filter(p=>p.status==='미신청 회원'&&p.active!==false&&!used.includes(p.id));
 const clubs=[...new Set(members.map(p=>p.club))].slice(0,2),posLabels={S:'세터',OH:'레프트',MB:'센터',OP:'라이트'},positions=['S','OP'];
 for(const [width,height] of [[320,844],[390,844],[1024,844],[390,480]]){
  await page.setViewportSize({width,height});await page.goto(origin+'/session/'+id+'/teams/edit');await page.getByRole('button',{name:'배정하기',exact:true}).click();await page.getByRole('button',{name:'미신청 회원',exact:true}).click();
  const trigger=page.getByRole('button',{name:/^미신청 회원 필터/}),search=page.getByRole('textbox',{name:'선수 검색'}),panel=page.getByRole('dialog',{name:'미신청 회원 필터 설정'});
  const tb=await trigger.boundingBox(),sb=await search.boundingBox();assert(tb.width>=44&&tb.height>=44);assert(Math.abs(tb.y-sb.y)<2);assert.equal(await page.locator('.ab-member-filters').count(),0);assert.equal(await page.getByRole('button',{name:'초기화',exact:true}).count(),0);
  const listHeight=(await page.locator('.ab-candidate-list').boundingBox()).height;await page.screenshot({animations:'disabled',path:out+`/closed-${width}-${height}.png`});
  await trigger.click();await panel.waitFor();for(const club of clubs)await panel.getByRole('checkbox',{name:club,exact:true}).click();for(const position of positions)await panel.getByRole('checkbox',{name:posLabels[position],exact:true}).click();
  const badge=await page.locator('.ab-filter-count').boundingBox(),anchor=await trigger.boundingBox();assert(badge.x>=anchor.x&&badge.x<=anchor.x+anchor.width&&badge.y>=anchor.y-5&&badge.y<anchor.y+anchor.height);const pb=await panel.boundingBox();assert(pb.x>=0&&pb.x+pb.width<=width+1&&pb.y>=0&&pb.y+pb.height<=height+1);assert.equal(await panel.getByRole('checkbox',{checked:true}).count(),clubs.length+positions.length);
  await page.screenshot({animations:'disabled',path:out+`/open-${width}-${height}.png`});await panel.getByRole('button',{name:'필터 닫기'}).click();
  const expected=members.filter(p=>clubs.includes(p.club)&&(positions.includes(p.position)||positions.includes(p.secondary)));
  assert.equal(await page.locator('.ab-candidate').count(),expected.length);assert.equal(await trigger.getAttribute('aria-label'),`미신청 회원 필터, ${clubs.length+positions.length}개 선택`);
  const person=expected[0];assert(person);await search.fill(person.name);assert.equal(await page.locator('.ab-candidate').count(),expected.filter(p=>p.name.includes(person.name)||p.club.includes(person.name)).length);
  await trigger.click();await panel.getByRole('button',{name:'초기화',exact:true}).click();assert.equal(await panel.getByRole('checkbox',{checked:true}).count(),0);await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')?.startsWith('미신청 회원 필터'),{},{timeout:3000});assert.equal(await search.inputValue(),person.name);
  await search.fill('');assert.equal(await page.locator('.ab-candidate').count(),members.length);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  results.push({width,height,searchAndFilterSameRow:true,touchSize:tb.width,panelInViewport:true,multipleClubsAndPositions:true,searchCombined:true,resetPreservesSearch:true,escapeReturnsFocus:true,listHeight});
 }
 assert.deepEqual(await get(),before);assert.deepEqual(errors,[]);
}catch(e){await page.screenshot({animations:'disabled',path:out+'/failure.png'});throw e}finally{await writeFile(out+'/browser.json',JSON.stringify({id,results,errors,noWrites:true,physicalIPhone:false},null,2));await browser.close();console.log(JSON.stringify(results));}
