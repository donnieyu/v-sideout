import {handleSideoutRead} from '../lib/server/sideout-http';
import {it,expect} from 'vitest';
import type {TeamEditorView} from '../lib/sideout/team-editor';
import {queryFixture} from './helpers/sideout-fixture';
import {handleTeamDraft} from '../lib/server/sideout-teams';
import {makeSideoutWriteStore} from '../lib/server/sideout-write-store';
import {session,roster,ids} from './fixtures/sideout';
const lineup={teams:[{id:'A',title:'A팀',players:[{memberId:ids.applicant,slotId:'s',assignedPosition:'S'}]},{id:'C',title:'C팀',players:[]},{id:'D',title:'D팀',players:[]}]};
async function fixture(){const f=await queryFixture(),deps={...f.deps,writeStore:makeSideoutWriteStore(f.db)};
 f.put('roster',session.id,{...roster,publicationState:'withdrawn'});
 const requests=new Map<string|null,Request>();
 async function call(actor:string|null,payload?:unknown,revision=1,commandId=crypto.randomUUID()){
  if(!requests.has(actor))requests.set(actor,await f.request(actor));const req=requests.get(actor)!;return handleTeamDraft(payload===undefined?req:new Request(req.url,{method:'POST',headers:{...Object.fromEntries(req.headers),origin:'http://local','content-type':'application/json'},body:JSON.stringify({commandId,expectedRevision:revision,payload})}),session.id,deps);
 }
 return {...f,deps,call};
}
const command=()=>({action:'save',sessionRevision:1,lineup:structuredClone(lineup),confirmedMemberIds:[] as string[]});
it('preserves an explicit zero additional-row count in the saved draft',async()=>{
 const f=await fixture();try{
  const value={...command(),lineup:{...structuredClone(lineup),extraRows:0}};
  expect((await f.call(ids.master,value)).status).toBe(200);
  expect((await f.deps.store.getRoster(session.id))!.value.draft.extraRows).toBe(0);
  const response=await f.call(ids.master);
  expect(response.status).toBe(200);
  expect(((await response.json()) as {data:TeamEditorView}).data.draft.extraRows).toBe(0);
 }finally{f.close()}
});
it('manager reads and saves a draft atomically, replays once and preserves the public snapshot',async()=>{
 const f=await fixture();try{
  const key=crypto.randomUUID(),before=await f.deps.store.getRoster(session.id);
  expect((await f.call(ids.master,command(),1,key)).status).toBe(200);expect((await f.call(ids.master,command(),1,key)).status).toBe(200);
  const saved=(await f.deps.store.getRoster(session.id))!;expect(saved.revision).toBe(2);expect(saved.value.draft).toEqual(lineup);expect(saved.value.published).toEqual(before!.value.published);expect(saved.value.publishedMatches).toEqual(before!.value.publishedMatches);
  const read=await f.call(ids.operator);expect(read.status).toBe(200);const text=await read.text();expect(text).toContain('draftMatches');expect(text).not.toMatch(/password|loginId|grants/);
  expect((await f.call(ids.master,command(),1)).status).toBe(409);const different=command();different.lineup.teams[0].title='변경';expect((await f.call(ids.master,different,1,key)).status).toBe(409);
 }finally{f.close()}
});
it('anonymous, normal members and cross-club staff cannot read or write draft data',async()=>{
 const f=await fixture();try{
  for(const actor of [null,ids.applicant,ids.guest]){expect((await f.call(actor)).status).toBe(actor?403:401);expect((await f.call(actor,command())).status).toBe(actor?403:401)}
  f.put('session',session.id,{...session,clubId:'club-test-heroes'});expect((await f.call(ids.operator)).status).toBe(403);
 }finally{f.close()}
});
it('rejects new-member assignments while published without partial writes',async()=>{
 const f=await fixture();try{
  f.put('roster',session.id,roster);
  const initial=(await f.deps.store.getRoster(session.id))!;
  for(const memberId of [ids.outsider,ids.cancelled]){const value=command();value.lineup.teams[0].players[0].memberId=memberId;value.confirmedMemberIds=[memberId];expect((await f.call(ids.master,value)).status).toBe(400)}
  f.sqlite.prepare('UPDATE auth_members SET active=0 WHERE id=?').run(ids.applicant);expect((await f.call(ids.master,command())).status).toBe(400);
  expect(await f.deps.store.getRoster(session.id)).toEqual(initial);
 }finally{f.close()}
});
it('unpublished confirmed registration and draft are saved together and assigned attendance are saved together',async()=>{
 const f=await fixture();try{
  f.put('session',session.id,{...session,cap:2});f.put('roster',session.id,{...roster,published:null,publishedMatches:null,firstPublishedAt:null});
  const value=command();value.lineup.teams[0].players[0].memberId=ids.outsider;
  expect((await f.call(ids.master,value)).status).toBe(400);value.confirmedMemberIds=[ids.outsider];expect((await f.call(ids.master,value)).status).toBe(200);
  const saved=(await f.deps.store.getRoster(session.id))!;expect(saved.value.participants[ids.outsider].status).toBe('applied');expect(saved.value.draft.teams[0].players[0].memberId).toBe(ids.outsider);
 }finally{f.close()}
});
it.each(['roster','session','member','actor'] as const)('rejects concurrent %s changes at commit',async change=>{
 const f=await fixture();try{
  const commit=f.deps.writeStore.commit.bind(f.deps.writeStore);
  f.deps.writeStore.commit=async input=>{
   if(change==='roster')f.put('roster',session.id,{...roster,participants:{...roster.participants,[ids.applicant]:{status:'cancelled',source:'self'}}},2);
   else if(change==='session')f.put('session',session.id,{...session,cap:12},2);
   else f.sqlite.prepare('UPDATE auth_members SET active=0,auth_version=auth_version+1 WHERE id=?').run(change==='member'?ids.applicant:ids.master);
   return commit(input);
  };
  expect((await f.call(ids.master,command())).status).toBe(409);expect((await f.deps.store.getRoster(session.id))!.value.draft).toEqual(roster.draft);
 }finally{f.close()}
});

it('settles an earlier priority waiter before registering a newly confirmed draft player',async()=>{
 const f=await fixture();try{
  f.put('session',session.id,{...session,cap:1,priorityUntil:new Date(f.now.getTime()-1).toISOString()});
  f.put('roster',session.id,{...roster,published:null,publishedMatches:null,firstPublishedAt:null,participants:{[ids.guest]:{status:'waiting',source:'self',waitReason:'priority',order:1}}});
  const value=command();value.lineup.teams[0].players[0].memberId=ids.outsider;value.confirmedMemberIds=[ids.outsider];
  expect((await f.call(ids.master,value)).status).toBe(200);const saved=(await f.deps.store.getRoster(session.id))!;
  expect(saved.value.participants[ids.guest].status).toBe('applied');expect(saved.value.participants[ids.outsider].status).toBe('applied');
 }finally{f.close()}
});
it.each(['draft','started'] as const)('rejects draft GET and POST when session is %s',async state=>{
 const f=await fixture();try{
  if(state==='draft')f.put('session',session.id,{...session,phase:'draft'});
  else f.now.setTime(Date.parse(session.date+'T'+session.start+':00+09:00'));
  expect((await f.call(ids.master)).status).toBe(400);expect((await f.call(ids.master,command())).status).toBe(400);
  expect((await f.deps.store.getRoster(session.id))!.revision).toBe(1);
 }finally{f.close()}
});
it('returns manager-only editor candidates with real status and no invented profile data',async()=>{
 const f=await fixture();try{
  f.put('roster',session.id,{...roster,published:null,publishedMatches:null,firstPublishedAt:null});
  const first=await f.call(ids.master);const body=await first.json() as {data:{people:{id:string;status:string;position:string|null;secondary:string|null}[]}};
  expect(body.data.people.find(p=>p.id===ids.applicant)?.status).toBe('신청자');expect(body.data.people.find(p=>p.id===ids.waiter)?.status).toBe('대기자');expect(body.data.people.find(p=>p.id===ids.outsider)?.status).toBe('미신청 회원');expect(body.data.people.find(p=>p.id===ids.cancelled)?.status).toBe('미신청 회원');expect(body.data.people.every(p=>p.position===null&&p.secondary===null)).toBe(true);
  f.put('roster',session.id,roster,2);const published=await (await f.call(ids.master)).json() as typeof body;expect(published.data.people.some(p=>p.status==='미신청 회원')).toBe(false);
 }finally{f.close()}
});
it('rechecks session permission after settling editor GET before returning candidate identities',async()=>{
 const f=await fixture();try{const get=f.deps.store.getSession.bind(f.deps.store);let reads=0;f.deps.store.getSession=async id=>{if(++reads===2)f.put('session',session.id,{...session,clubId:'club-test-heroes'},2);return get(id)};expect((await f.call(ids.operator)).status).toBe(403)}finally{f.close()}
});

it('reads valid personal profiles only for eligible manager candidates and rejects corrupt values',async()=>{
 const f=await fixture();try{
  f.sqlite.prepare('INSERT INTO member_position_profiles VALUES(?,?,?,?)').run(ids.applicant,'S','S',f.now.toISOString());
  f.sqlite.prepare('UPDATE auth_members SET active=0 WHERE id=?').run(ids.cancelled);
  f.sqlite.prepare('INSERT INTO member_position_profiles VALUES(?,?,?,?)').run(ids.cancelled,'invalid','MB',f.now.toISOString());
  const response=await f.call(ids.master);expect(response.status).toBe(200);const body=await response.json() as {data:{people:{id:string;position:string|null;secondary:string|null}[]}};
  expect(body.data.people.find(p=>p.id===ids.applicant)).toMatchObject({position:'S',secondary:'S'});
  expect(body.data.people.find(p=>p.id===ids.waiter)).toMatchObject({position:null,secondary:null});
  expect((await f.call(ids.applicant)).status).toBe(403);
  f.sqlite.prepare('UPDATE member_position_profiles SET main_position=? WHERE member_id=?').run('invalid',ids.applicant);
  expect((await f.call(ids.master)).status).toBe(503);
 }finally{f.close()}
});

it('retains inactive assigned identities for display without exposing inactive unassigned candidates',async()=>{
 const f=await fixture();try{
  f.put('roster',session.id,{...roster,draft:lineup});
  f.sqlite.prepare('UPDATE auth_members SET active=0 WHERE id IN (?,?)').run(ids.applicant,ids.outsider);
  const response=await f.call(ids.master);expect(response.status).toBe(200);const body=await response.json() as {data:{people:{id:string;name:string;active?:boolean}[]}};
  expect(body.data.people.find(p=>p.id===ids.applicant)).toMatchObject({id:ids.applicant,active:false});expect(body.data.people.find(p=>p.id===ids.applicant)?.name).toBeTruthy();expect(body.data.people.find(p=>p.id===ids.outsider)).toBeUndefined();
 }finally{f.close()}
});
it('reports saved draft from stored teams rather than participant revision and returns the published baseline',async()=>{
 const f=await fixture();try{
  f.put('roster',session.id,{...roster,publicationState:'withdrawn',draft:{teams:[]}},9);
  let data=(await (await f.call(ids.master)).json() as {data:TeamEditorView}).data;expect(data.hasSavedDraft).toBe(false);expect(data.publishedLineup).toEqual(roster.published);
  expect((await f.call(ids.master,command(),9)).status).toBe(200);
  data=(await (await f.call(ids.master)).json() as {data:TeamEditorView}).data;expect(data.hasSavedDraft).toBe(true);expect(data.publishedLineup).toEqual(roster.published);
 }finally{f.close()}
});

it('includes all active nonparticipants and cancelled members after withdrawal for managers only',async()=>{
 const f=await fixture();try{f.put('roster',session.id,{...roster,publicationState:'withdrawn'},2);const response=await f.call(ids.master);expect(response.status).toBe(200);const body=await response.json() as {data:TeamEditorView};expect(body.data.people.find(p=>p.id===ids.cancelled)?.status).toBe('미신청 회원');expect(body.data.people.find(p=>p.id===ids.outsider)?.status).toBe('미신청 회원');expect((await f.call(ids.applicant)).status).toBe(403)}finally{f.close()}
});

it('atomically registers a cancelled member with confirmed allocation after withdrawal',async()=>{
 const f=await fixture();try{const before=(await f.deps.store.getRoster(session.id))!;const payload=command();payload.lineup.teams[0].players[0].memberId=ids.cancelled;expect((await f.call(ids.master,payload)).status).toBe(400);expect(await f.deps.store.getRoster(session.id)).toEqual(before);payload.confirmedMemberIds=[ids.cancelled];expect((await f.call(ids.operator,payload)).status).toBe(200);const after=(await f.deps.store.getRoster(session.id))!;expect(after.value.participants[ids.cancelled].status).not.toBe('cancelled');expect(after.value.draft.teams[0].players[0].memberId).toBe(ids.cancelled);expect(after.value.published).toEqual(before.value.published);expect(after.revision).toBe(before.revision+1)}finally{f.close()}
});

it('projects saved additional players into attendance counts and member/guest lists without publishing',async()=>{
 const f=await fixture();try{const value=command();value.lineup.teams[0].players.push({memberId:ids.waiter,slotId:'op2',assignedPosition:'OP'},{memberId:ids.outsider,slotId:'bench-extra',assignedPosition:'OH'});value.confirmedMemberIds=[ids.outsider];expect((await f.call(ids.operator,value)).status).toBe(200);
 const response=await handleSideoutRead(await f.request(ids.master),'session',f.deps,session.id);expect(response.status).toBe(200);const {data}=await response.json() as {data:import('../lib/sideout/read-model').SessionDetailView};
 expect(data.visibleApplicants.map(p=>p.memberId)).toEqual(expect.arrayContaining([ids.waiter,ids.outsider]));expect(data.visibleWaiters?.some(p=>p.memberId===ids.waiter)).toBe(false);expect(data.counts.applicants).toBe(data.visibleApplicants.length);expect(data.teamPublished).toBe(false);
 const own=await handleSideoutRead(await f.request(ids.applicant),'session',f.deps,session.id);const ownData=(await own.json() as {data:import('../lib/sideout/read-model').SessionDetailView}).data;expect(ownData.counts).toEqual(data.counts);
 }finally{f.close()}
});
