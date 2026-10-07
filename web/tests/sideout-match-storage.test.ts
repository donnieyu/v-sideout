import {it,expect} from 'vitest';
import {queryFixture} from './helpers/sideout-fixture';
import {makeSideoutWriteStore} from '../lib/server/sideout-write-store';
import {handleMatchOrder} from '../lib/server/sideout-matches';
import {generateTeamMatches,toggleRookieMatches} from '../lib/sideout/match-plan';
import {requireBusinessPrincipal} from '../lib/server/business-principal';
import {getSessionView} from '../lib/server/sideout-query';
import {session,roster,ids} from './fixtures/sideout';
const teams=[{id:'A',title:'A팀',players:roster.published!.teams[0].players},{id:'B',title:'B팀',players:[]},{id:'C',title:'C팀',players:[]}];
async function fixture(){const f=await queryFixture(),deps={...f.deps,writeStore:makeSideoutWriteStore(f.db)},plan=generateTeamMatches(['A','B','C'])!;
 f.put('roster',session.id,{...roster,draft:{teams},published:{teams},draftMatches:plan,publishedMatches:plan});
 const requests=new Map<string|null,Request>();
 async function call(actor:string|null,payload?:unknown,revision=1,key=crypto.randomUUID(),origin='http://local'){
 if(!requests.has(actor))requests.set(actor,await f.request(actor));const req=requests.get(actor)!;return handleMatchOrder(payload===undefined?req:new Request(req.url,{method:'POST',headers:{...Object.fromEntries(req.headers),origin,'content-type':'application/json'},body:JSON.stringify({commandId:key,expectedRevision:revision,payload})}),session.id,deps)}
 const payload={action:'save',sessionRevision:1,plan:toggleRookieMatches(plan,false)};
 return {...f,deps,plan,payload,call};
}
it('authorized save updates only match snapshots, replay is idempotent and attendees read the result',async()=>{
 const f=await fixture();try{
 const before=(await f.deps.store.getRoster(session.id))!,key=crypto.randomUUID();
 const read=await f.call(ids.operator);expect(read.status).toBe(200);expect((await read.json() as any).data.saveVisibility).toBe('attendees');
 expect((await f.call(ids.master,f.payload,1,key)).status).toBe(200);expect((await f.call(ids.master,f.payload,1,key)).status).toBe(200);
 const after=(await f.deps.store.getRoster(session.id))!;expect(after.revision).toBe(2);expect(after.value.draftMatches!.matches).toHaveLength(9);expect(after.value.publishedMatches).toEqual(after.value.draftMatches);
 expect(after.value.participants).toEqual(before.value.participants);expect(after.value.published).toEqual(before.value.published);expect(after.value.draft).toEqual(before.value.draft);
 const view=await getSessionView(await requireBusinessPrincipal(await f.request(ids.applicant),f.deps.authRepo,f.now),session.id,f.deps);expect(view.publishedMatches!.matches).toHaveLength(9);
 expect((await f.call(ids.master,{...f.payload,plan:f.plan},1,key)).status).toBe(409);expect((await f.call(ids.master,f.payload,1)).status).toBe(409);
 }finally{f.close()}
});
it('different draft team IDs keep the public matches intact and never expose draft teams to attendees',async()=>{
 const f=await fixture();try{
 const old=(await f.deps.store.getRoster(session.id))!;const draft={teams:teams.map(t=>({...t,id:t.id+'new'}))};f.put('roster',session.id,{...old.value,draft,draftMatches:generateTeamMatches(draft.teams.map(t=>t.id))});
 const read=await f.call(ids.master);expect((await read.json() as any).data.saveVisibility).toBe('draft');
 expect((await f.call(ids.master,{...f.payload,plan:toggleRookieMatches(generateTeamMatches(['Anew','Bnew','Cnew'])!,false)})).status).toBe(200);
 const next=(await f.deps.store.getRoster(session.id))!;expect(next.value.publishedMatches).toEqual(old.value.publishedMatches);expect(next.value.published).toEqual(old.value.published);
 }finally{f.close()}
});
it('saving a published-only legacy lineup keeps the roster readable and creates a matching draft',async()=>{
 const f=await fixture();try{
  const before=(await f.deps.store.getRoster(session.id))!;
  f.put('roster',session.id,{...before.value,draft:{teams:[]},draftMatches:null});
  expect((await f.call(ids.master)).status).toBe(200);
  expect((await f.call(ids.master,f.payload)).status).toBe(200);
  const after=(await f.deps.store.getRoster(session.id))!;
  expect(after.value.draft).toEqual(before.value.published);
  expect(after.value.draftMatches).toEqual(f.payload.plan);
  expect(after.value.published).toEqual(before.value.published);
  expect(after.value.publishedMatches).toEqual(f.payload.plan);
  expect(after.value.participants).toEqual(before.value.participants);
  expect((await f.call(ids.master)).status).toBe(200);
 }finally{f.close()}
});
it('draft player edits with same team IDs are never published by a match save',async()=>{
 const f=await fixture();try{const old=(await f.deps.store.getRoster(session.id))!;f.put('roster',session.id,{...old.value,draft:{teams:teams.map(t=>({...t,players:[]}))}});expect((await f.call(ids.master,f.payload)).status).toBe(200);expect((await f.deps.store.getRoster(session.id))!.value.published).toEqual(old.value.published)}finally{f.close()}
});
it('anonymous, members, foreign club staff and cross-origin posts cannot edit',async()=>{
 const f=await fixture();try{for(const actor of [null,ids.applicant,ids.waiter]){expect((await f.call(actor)).status).toBe(actor?403:401);expect((await f.call(actor,f.payload)).status).toBe(actor?403:401)}expect((await f.call(ids.master,f.payload,1,crypto.randomUUID(),'http://evil')).status).toBe(403);f.put('session',session.id,{...session,clubId:'club-test-heroes'});expect((await f.call(ids.operator)).status).toBe(403)}finally{f.close()}
});
it.each(['roster','session','actor'] as const)('rejects concurrent %s changes atomically',async change=>{
 const f=await fixture();try{const commit=f.deps.writeStore.commit.bind(f.deps.writeStore);f.deps.writeStore.commit=async input=>{if(change==='actor')f.sqlite.prepare('UPDATE auth_members SET active=0,auth_version=auth_version+1 WHERE id=?').run(ids.master);else if(change==='session')f.put('session',session.id,session,2);else f.put('roster',session.id,(await f.deps.store.getRoster(session.id))!.value,2);return commit(input)};expect((await f.call(ids.master,f.payload)).status).toBe(409);expect((await f.deps.store.getRoster(session.id))!.value.draftMatches).toEqual(f.plan)}finally{f.close()}
});
it.each(['started','draft','two','bad-games'] as const)('rejects %s edit without mutation',async state=>{
 const f=await fixture();try{if(state==='started')f.now.setTime(Date.parse(session.date+'T'+session.start+':00+09:00'));if(state==='draft')f.put('session',session.id,{...session,phase:'draft'});if(state==='two')f.put('roster',session.id,{...roster,draft:{teams:teams.slice(0,2)}});const payload=structuredClone(f.payload);if(state==='bad-games')payload.plan.matches.pop();expect((await f.call(ids.master,payload)).status).toBe(400);expect((await f.deps.store.getRoster(session.id))!.revision).toBe(1)}finally{f.close()}
});
