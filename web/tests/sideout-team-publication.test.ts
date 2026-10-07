import {it,expect} from 'vitest';
import type {SessionDetailView} from '../lib/sideout/read-model';
import {queryFixture} from './helpers/sideout-fixture';
import {handleTeamDraft} from '../lib/server/sideout-teams';
import {handleSideoutRead} from '../lib/server/sideout-http';
import {makeSideoutWriteStore} from '../lib/server/sideout-write-store';
import {cancelParticipant,registerParticipants} from '../lib/sideout/participation';
import {session,roster,ids} from './fixtures/sideout';
const command=()=>({action:'publish',confirmed:true,sessionRevision:1,confirmedMemberIds:[] as string[],lineup:{teams:[ids.applicant,ids.guest,ids.waiter].map((memberId,i)=>({id:['A','C','D'][i],title:['A','C','D'][i]+'팀',players:[{memberId,slotId:'s',assignedPosition:'S'}]}))}});
async function fixture(){
 const f=await queryFixture(),deps={...f.deps,writeStore:makeSideoutWriteStore(f.db)},requests=new Map<string|null,Request>();
 const base={...structuredClone(roster),published:null,publishedMatches:null,firstPublishedAt:null};base.participants[ids.multi]={status:'waiting',source:'self'};f.put('roster',session.id,base);
 async function request(actor:string|null){if(!requests.has(actor))requests.set(actor,await f.request(actor));return requests.get(actor)!}
 async function call(actor:string|null,payload:unknown=command(),revision=1,key=crypto.randomUUID()){
  const req=await request(actor);return handleTeamDraft(new Request(req.url,{method:'POST',headers:{...Object.fromEntries(req.headers),origin:'http://local','content-type':'application/json'},body:JSON.stringify({commandId:key,expectedRevision:revision,payload})}),session.id,deps);
 }
 return {...f,deps,base,call,request};
}
it('publishes once, preserves replay semantics and visibility, closes registration/cancellation',async()=>{
 const f=await fixture();try{
  const key=crypto.randomUUID(),payload=command();expect((await f.call(ids.operator,payload,1,key)).status).toBe(200);expect((await f.call(ids.operator,payload,1,key)).status).toBe(200);
  const saved=(await f.deps.store.getRoster(session.id))!;expect(saved.revision).toBe(2);expect(saved.value.published).toEqual(payload.lineup);expect(saved.value.publishedMatches!.matches).toHaveLength(11);expect(saved.value.participants[ids.waiter].status).toBe('applied');expect(saved.value.participants[ids.multi].status).toBe('waiting');
  for(const actor of [ids.applicant,ids.waiter,ids.outsider]){const response=await handleSideoutRead(await f.request(actor), 'session',f.deps,session.id);expect(response.status).toBe(200);const view=(await response.json() as {data:SessionDetailView}).data;expect(view.publishedTeams!==null).toBe(actor!==ids.outsider);expect(view.publishedMatches!==null).toBe(actor!==ids.outsider);expect(view.participation?.canRegister).toBe(false);expect(view.participation?.canCancel).toBe(false)}
  expect(()=>cancelParticipant(session,saved.value,ids.applicant,f.now,true)).toThrow('공개 후');expect(()=>registerParticipants(session,saved.value,[{memberId:ids.outsider,homeClubId:null,active:true,version:1}],f.now,'manager')).toThrow('공개 후');
  expect((await f.call(ids.master)).status).toBe(409);
 }finally{f.close()}
});
it.each([1,2])('refuses publication of %i teams without saving a partial draft',async n=>{
 const f=await fixture();try{const payload=command();payload.lineup.teams=payload.lineup.teams.slice(0,n);const before=await f.deps.store.getRoster(session.id);expect((await f.call(ids.master,payload)).status).toBe(400);expect(await f.deps.store.getRoster(session.id)).toEqual(before)}finally{f.close()}
});
it('requires confirmation and rejects anonymous, nonstaff and unrelated operator',async()=>{
 const f=await fixture();try{
  expect((await f.call(ids.master,{...command(),confirmed:false})).status).toBe(400);
  for(const actor of [null,ids.applicant])expect((await f.call(actor)).status).toBe(actor?403:401);
  f.put('session',session.id,{...session,clubId:'club-test-heroes'});expect((await f.call(ids.operator)).status).toBe(403);
 }finally{f.close()}
});
it.each(['cancel','new-applicant','session','member','actor'] as const)('rejects concurrent %s with no partial publication or promotion',async kind=>{
 const f=await fixture();try{
  const commit=f.deps.writeStore.commit.bind(f.deps.writeStore);
  f.deps.writeStore.commit=async input=>{
   if(kind==='cancel')f.put('roster',session.id,cancelParticipant(session,f.base,ids.applicant,f.now,true),2);
   if(kind==='new-applicant')f.put('roster',session.id,{...f.base,participants:{...f.base.participants,[ids.outsider]:{status:'applied',source:'self'}}},2);
   if(kind==='session')f.put('session',session.id,{...session,cap:12},2);
   if(kind==='member'||kind==='actor')f.sqlite.prepare('UPDATE auth_members SET active=0,auth_version=auth_version+1 WHERE id=?').run(kind==='member'?ids.waiter:ids.master);
   return commit(input);
  };
  expect((await f.call(ids.master)).status).toBe(409);const saved=(await f.deps.store.getRoster(session.id))!;
  expect(saved.value.published).toBeNull();expect(saved.value.firstPublishedAt).toBeNull();expect(saved.value.publishedMatches).toBeNull();expect(saved.value.participants[ids.waiter].status).toBe('waiting');
 }finally{f.close()}
});
it('does not register a confirmed outsider if publication fails',async()=>{
 const f=await fixture();try{const payload=command();payload.lineup.teams[0].players[0].memberId=ids.outsider;payload.confirmedMemberIds=[ids.outsider];expect((await f.call(ids.master,payload)).status).toBe(400);expect((await f.deps.store.getRoster(session.id))!.value).toEqual(f.base)}finally{f.close()}
});
it('settles FIFO before publication so newly eligible applicants cannot be silently omitted',async()=>{
 const f=await fixture();try{
  f.put('roster',session.id,{...f.base,participants:{...f.base.participants,[ids.outsider]:{status:'waiting',source:'self',waitReason:'priority',order:1}}});
  expect((await f.call(ids.master)).status).toBe(400);const saved=(await f.deps.store.getRoster(session.id))!;expect(saved.revision).toBe(1);expect(saved.value.published).toBeNull();
 }finally{f.close()}
});

it('locks published saves, withdraws visibility atomically and only reopens manager roster edits',async()=>{
 const f=await fixture();try{
  const payload=command();expect((await f.call(ids.master,payload)).status).toBe(200);
  const publicRoster=(await f.deps.store.getRoster(session.id))!;
  expect((await f.call(ids.master,{...payload,action:'save',confirmed:undefined},2)).status).toBe(400);
  const key=crypto.randomUUID(),withdraw={action:'unpublish',confirmed:true,sessionRevision:1,draftSource:'saved'};
  expect((await f.call(ids.operator,withdraw,2,key)).status).toBe(200);expect((await f.call(ids.operator,withdraw,2,key)).status).toBe(200);
  const withdrawn=(await f.deps.store.getRoster(session.id))!;expect(withdrawn.revision).toBe(3);expect(withdrawn.value.firstPublishedAt).toBe(publicRoster.value.firstPublishedAt);expect(withdrawn.value.published).toEqual(publicRoster.value.published);expect(withdrawn.value.draft).toEqual(publicRoster.value.draft);
  for(const actor of [ids.applicant,ids.waiter,ids.outsider]){const response=await handleSideoutRead(await f.request(actor),'session',f.deps,session.id);const view=(await response.json() as {data:SessionDetailView}).data;expect(view.teamPublished).toBe(false);expect(view.publishedTeams).toBeNull();expect(view.publishedMatches).toBeNull();expect(view.participation?.canRegister).toBe(false);expect(view.participation?.canCancel).toBe(false)}
  expect(()=>cancelParticipant(session,withdrawn.value,ids.applicant,f.now,false)).toThrow('공개 후');
  expect(cancelParticipant(session,withdrawn.value,ids.applicant,f.now,true).participants[ids.applicant].status).toBe('cancelled');
  expect((await f.call(ids.master,{...payload,action:'save',confirmed:undefined},3)).status).toBe(200);
  expect((await f.call(ids.master,payload,4)).status).toBe(200);
  expect((await f.deps.store.getRoster(session.id))!.value.firstPublishedAt).toBe(publicRoster.value.firstPublishedAt);
 }finally{f.close()}
});
it('requires authorized, confirmed, current withdrawal and preserves both legacy versions',async()=>{
 const f=await fixture();try{
  await f.call(ids.master);const stored=(await f.deps.store.getRoster(session.id))!,legacy=structuredClone(stored.value);legacy.draft.teams[0].title='미공개 초안';f.put('roster',session.id,legacy,2);
  const withdraw={action:'unpublish',confirmed:true,sessionRevision:1,draftSource:'published'};
  expect((await f.call(ids.applicant,withdraw,2)).status).toBe(403);
  expect((await f.call(ids.master,{...withdraw,confirmed:false},2)).status).toBe(400);
  expect((await f.call(ids.master,withdraw,1)).status).toBe(409);
  expect((await f.call(ids.master,withdraw,2)).status).toBe(200);
  const next=(await f.deps.store.getRoster(session.id))!.value;expect(next.draft).toEqual(legacy.published);expect((next as any).withdrawnDraft.lineup).toEqual(legacy.draft);expect(next.published).toEqual(legacy.published);
  expect((await f.call(ids.master,withdraw,3)).status).toBe(400);
 }finally{f.close()}
});
it.each(['session','roster','actor','started'] as const)('does not withdraw a stale or unauthorized %s publication',async kind=>{
 const f=await fixture();try{
  await f.call(ids.master);const published=(await f.deps.store.getRoster(session.id))!;
  if(kind==='started')f.put('session',session.id,{...session,date:f.now.toISOString().slice(0,10),start:'00:00'});
  else{const commit=f.deps.writeStore.commit.bind(f.deps.writeStore);f.deps.writeStore.commit=async input=>{if(kind==='session')f.put('session',session.id,{...session,cap:12},2);if(kind==='roster')f.put('roster',session.id,published.value,3);if(kind==='actor')f.sqlite.prepare('UPDATE auth_members SET active=0,auth_version=auth_version+1 WHERE id=?').run(ids.master);return commit(input)}}
  expect((await f.call(ids.master,{action:'unpublish',confirmed:true,sessionRevision:1,draftSource:'saved'},2)).status).toBe(kind==='started'?400:409);
  expect((await f.deps.store.getRoster(session.id))!.value.publicationState).toBe('published');
 }finally{f.close()}
});
it('preserves inactive published attendees, retains only their existing placement, and retires attendance on saved release',async()=>{
 const f=await fixture();try{
  const payload=command();payload.lineup.teams[0].players.push({memberId:ids.multi,slotId:'op2',assignedPosition:'OP'});
  expect((await f.call(ids.master,payload)).status).toBe(200);
  const published=(await f.deps.store.getRoster(session.id))!.value;
  f.sqlite.prepare('UPDATE auth_members SET active=0,auth_version=auth_version+1 WHERE id=?').run(ids.applicant);
  const detail=(await(await handleSideoutRead(await f.request(ids.master),'session',f.deps,session.id)).json() as {data:SessionDetailView}).data;
  expect(detail.publishedTeams![0].players.map(p=>p.memberId)).toContain(ids.applicant);expect(detail.visibleApplicants.map(p=>p.memberId)).toContain(ids.applicant);expect(detail.counts.applicants).toBe(4);
  expect((await f.call(ids.master,{action:'unpublish',confirmed:true,sessionRevision:1,draftSource:'published'},2)).status).toBe(200);
  expect((await f.call(ids.master,{...payload,action:'save',confirmed:undefined},3)).status).toBe(200);
  const moved=structuredClone(payload);moved.lineup.teams[0].players[0].slotId='oh1';moved.lineup.teams[0].players[0].assignedPosition='OH';expect((await f.call(ids.master,moved,4)).status).toBe(400);
  expect((await f.call(ids.master,payload,4)).status).toBe(200);
  expect((await f.call(ids.master,{action:'unpublish',confirmed:true,sessionRevision:1,draftSource:'published'},5)).status).toBe(200);
  const released=structuredClone(payload);released.lineup.teams[0].players=released.lineup.teams[0].players.filter(p=>p.memberId!==ids.applicant);
  expect((await f.call(ids.master,{...released,action:'save',confirmed:undefined},6)).status).toBe(200);
  const saved=(await f.deps.store.getRoster(session.id))!.value;expect(saved.participants[ids.applicant].status).toBe('cancelled');expect(saved.published).toEqual(published.published);
  expect((await f.call(ids.master,{...payload,action:'save',confirmed:undefined},7)).status).toBe(400);
  expect((await f.call(ids.master,released,7)).status).toBe(200);
  const final=(await(await handleSideoutRead(await f.request(ids.master),'session',f.deps,session.id)).json() as {data:SessionDetailView}).data;expect(final.counts.applicants).toBe(3);expect(final.visibleApplicants.some(p=>p.memberId===ids.applicant)).toBe(false);
 }finally{f.close()}
});
it('rejects concurrent reactivation when saving the release of an inactive attendee',async()=>{
 const f=await fixture();try{
  const payload=command();await f.call(ids.master,payload);f.sqlite.prepare('UPDATE auth_members SET active=0,auth_version=auth_version+1 WHERE id=?').run(ids.applicant);await f.call(ids.master,{action:'unpublish',confirmed:true,sessionRevision:1,draftSource:'published'},2);
  const before=(await f.deps.store.getRoster(session.id))!,commit=f.deps.writeStore.commit.bind(f.deps.writeStore);f.deps.writeStore.commit=async input=>{f.sqlite.prepare('UPDATE auth_members SET active=1,auth_version=auth_version+1 WHERE id=?').run(ids.applicant);return commit(input)};
  payload.lineup.teams[0].players=[];expect((await f.call(ids.master,{...payload,action:'save',confirmed:undefined},3)).status).toBe(409);expect(await f.deps.store.getRoster(session.id)).toEqual(before);
 }finally{f.close()}
});
