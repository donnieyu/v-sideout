import {it,expect} from 'vitest';
import {settleWaiting,registerParticipants,cancelParticipant} from '../lib/sideout/participation';
import {session,roster,ids} from './fixtures/sideout';
const start=new Date('2026-10-01T00:00:00Z'),end=new Date('2026-10-02T00:00:00Z');
const s={...session,priorityUntil:end.toISOString(),cap:2};
const empty=()=>({...structuredClone(roster),participants:{},published:null,publishedMatches:null,firstPublishedAt:null});
const own={memberId:ids.applicant,homeClubId:s.clubId,active:true,version:1},guest={memberId:ids.guest,homeClubId:'other',active:true,version:1},guest2={...guest,memberId:ids.waiter};
it('allows guests to queue during priority and promotes in FIFO only into remaining seats',()=>{
 let r=registerParticipants(s,empty(),[guest,guest2],start,'self');expect(Object.values(r.participants).map(p=>p.status)).toEqual(['waiting','waiting']);
 r=registerParticipants(s,r,[own],start,'self');expect(r.participants[own.memberId].status).toBe('applied');
 r=settleWaiting(s,r,[guest2,own,guest],end);expect(r.participants[guest.memberId].status).toBe('applied');expect(r.participants[guest2.memberId].status).toBe('waiting');
 r=cancelParticipant(s,r,own.memberId,end,false);r=settleWaiting(s,r,[guest2,guest,own],end);expect(r.participants[guest2.memberId].status).toBe('applied');
});
it('never automatically promotes after publication and never cancels published participants for managers or self',()=>{
 let r=registerParticipants(s,empty(),[guest],start,'self');r={...r,firstPublishedAt:start.toISOString(),published:{teams:[]}};
 expect(settleWaiting(s,r,[guest],end).participants[guest.memberId].status).toBe('waiting');
 for(const manager of [true,false])expect(()=>cancelParticipant(s,r,guest.memberId,end,manager)).toThrow();
});
it('closed-period self entries stay waiting and started or draft sessions cannot accept members',()=>{
 const after=new Date('2026-10-03T10:00:00Z');const r=registerParticipants(s,empty(),[guest],after,'self');expect(r.participants[guest.memberId].waitReason).toBe('closed');
 expect(settleWaiting(s,r,[guest],after).participants[guest.memberId].status).toBe('waiting');
 expect(()=>registerParticipants({...s,phase:'draft'},empty(),[own],start,'self')).toThrow();expect(()=>registerParticipants(s,empty(),[own],new Date('2026-10-04T00:00:00Z'),'self')).toThrow();
});
it('removes draft placements with cancellation, rejoin goes to end, rejects partial duplicate/inactive batches',()=>{
 let r=registerParticipants(s,empty(),[guest,guest2],start,'self');r.draft.teams=[{id:'a',title:'A',players:[{memberId:guest.memberId,slotId:'s',assignedPosition:'S'}]}];r=cancelParticipant(s,r,guest.memberId,start,true);expect(r.draft.teams[0].players).toEqual([]);
 r=registerParticipants(s,r,[guest],start,'self');r=settleWaiting({...s,cap:1},r,[guest,guest2],end);expect(r.participants[guest2.memberId].status).toBe('applied');
 expect(()=>registerParticipants(s,r,[own,guest],start,'manager')).toThrow();expect(r.participants[own.memberId]).toBeUndefined();
 expect(()=>registerParticipants(s,r,[{...own,active:false}],start,'manager')).toThrow();
});

import {queryFixture} from './helpers/sideout-fixture';
import {handleParticipantWrite,candidateView} from '../lib/server/sideout-participation';
import {handleSideoutRead} from '../lib/server/sideout-http';
import {makeSideoutWriteStore} from '../lib/server/sideout-write-store';
async function httpFixture(){const f=await queryFixture(),deps={...f.deps,writeStore:makeSideoutWriteStore(f.db)},requests=new Map<string,Request>();f.put('session',session.id,{...s,priorityUntil:new Date(f.now.getTime()+1000).toISOString()});f.put('roster',session.id,empty());
 async function request(member:string){if(!requests.has(member)){requests.set(member,await f.request(member));f.sqlite.prepare('UPDATE auth_sessions SET expires_at=? WHERE member_id=?').run(Date.parse('2030-01-01'),member)}return requests.get(member)!}
 async function write(member:string,payload:Record<string,unknown>,revision:number,commandId=crypto.randomUUID()){const r=await request(member);return handleParticipantWrite(new Request(r.url,{method:'POST',headers:{cookie:r.headers.get('cookie')!,origin:'http://local','content-type':'application/json'},body:JSON.stringify({commandId,expectedRevision:revision,payload:{sessionRevision:1,...payload}})}),session.id,deps)}
 async function read(member:string){return handleSideoutRead(await request(member),'session',deps,session.id)}
 return {...f,deps,write,read,request};}
it('HTTP projection materializes priority promotion once, with equal counts for two users and restricted roster labels',async()=>{
 const f=await httpFixture();try{
 expect((await f.write(ids.guest,{action:'register'},1)).status).toBe(200);expect((await f.write(ids.applicant,{action:'register'},2)).status).toBe(200);
 const before=await (await f.read(ids.master)).json() as any;expect(before.data.counts).toEqual({applicants:1,waiting:1});f.now.setTime(f.now.getTime()+1000);
 const master=await (await f.read(ids.master)).json() as any,member=await (await f.read(ids.applicant)).json() as any;expect(master.data.counts).toEqual({applicants:2,waiting:0});expect(member.data.counts).toEqual(master.data.counts);expect(member.data.rosterRevision).toBe(master.data.rosterRevision);expect(member.data.visibleWaiters).toBeUndefined();expect(member.data.visibleApplicants.map((m:any)=>m.memberId)).toEqual([ids.applicant]);
 expect((await f.deps.store.getRoster(session.id))?.value.participants[ids.guest].status).toBe('applied');
 }finally{f.close()}
});
it('HTTP manager batch is atomic, roster CAS rejects stale last-seat writes, and candidate projection omits credentials',async()=>{
 const f=await httpFixture();try{
 expect((await f.write(ids.applicant,{action:'add',memberIds:[ids.guest]},1)).status).toBe(403);
 expect((await f.write(ids.operator,{action:'add',memberIds:[ids.applicant,ids.guest]},1)).status).toBe(200);
 expect((await f.write(ids.master,{action:'add',memberIds:[ids.outsider,ids.applicant]},2)).status).toBe(409);expect((await f.deps.store.getRoster(session.id))?.value.participants[ids.outsider]).toBeUndefined();
 expect((await f.write(ids.outsider,{action:'register'},1)).status).toBe(409);
 const candidates=await handleSideoutRead(await f.request(ids.master),'candidates',f.deps,session.id);expect(candidates.status).toBe(200);const text=await candidates.text();expect(text).not.toMatch(/password|loginId|authVersion|grants/);expect(text).not.toContain(ids.applicant);expect((await handleSideoutRead(await f.request(ids.waiter),'candidates',f.deps,session.id)).status).toBe(403);
 }finally{f.close()}
});
it('HTTP cancel removes draft and replays once; publication at commit prevents cancellation',async()=>{
 const f=await httpFixture();try{
 expect((await f.write(ids.applicant,{action:'register'},1)).status).toBe(200);const old=(await f.deps.store.getRoster(session.id))!;old.value.draft.teams=[{id:'a',title:'A',players:[{memberId:ids.applicant,slotId:'s',assignedPosition:'S'}]}];f.put('roster',session.id,old.value,old.revision);
 const cmd=crypto.randomUUID();expect((await f.write(ids.applicant,{action:'cancel'},2,cmd)).status).toBe(200);expect((await f.write(ids.applicant,{action:'cancel'},2,cmd)).status).toBe(200);expect((await f.deps.store.getRoster(session.id))?.value.draft.teams[0].players).toEqual([]);
 expect((await f.write(ids.applicant,{action:'register'},3)).status).toBe(200);
 const commit=f.deps.writeStore.commit.bind(f.deps.writeStore);f.deps.writeStore.commit=async input=>{const current=(await f.deps.store.getRoster(session.id))!;f.put('roster',session.id,{...current.value,firstPublishedAt:f.now.toISOString(),published:current.value.draft},current.revision+1);return commit(input)};
 expect((await f.write(ids.master,{action:'remove',memberId:ids.applicant},4)).status).toBe(409);expect((await f.deps.store.getRoster(session.id))?.value.participants[ids.applicant].status).toBe('applied');
 }finally{f.close()}
});
it('a competing last-seat commit cannot overbook and a fresh retry becomes waiting',async()=>{
 const f=await httpFixture();try{
 f.put('session',session.id,{...s,priorityUntil:null,cap:1});
 const commit=f.deps.writeStore.commit.bind(f.deps.writeStore);let interleave=true;
 f.deps.writeStore.commit=async input=>{if(interleave){interleave=false;const current=(await f.deps.store.getRoster(session.id))!;f.put('roster',session.id,registerParticipants({...s,priorityUntil:null,cap:1},current.value,[own],f.now,'self'),current.revision+1)}return commit(input)};
 expect((await f.write(ids.guest,{action:'register'},1)).status).toBe(409);expect((await f.write(ids.guest,{action:'register'},2)).status).toBe(200);
 const r=(await f.deps.store.getRoster(session.id))!.value;expect(Object.values(r.participants).filter(p=>p.status==='applied')).toHaveLength(1);expect(r.participants[ids.guest].status).toBe('waiting');
 }finally{f.close()}
});
it('100-member add and promotion fit D1 parameter/query limits and retain atomic member guards',async()=>{
 const f=await httpFixture();try{
 const template=(await f.deps.authRepo.getById(ids.guest))!,members=[] as string[];
 for(let i=0;i<100;i++){const id=crypto.randomUUID();members.push(id);await (f.deps.authRepo as typeof f.deps.authRepo&{createAccount(a:typeof template):Promise<void>}).createAccount({...template,id,loginId:'bulk'+i,loginIdKey:'bulk'+i,displayName:'일괄'+i})}
 f.put('session',session.id,{...s,cap:100,priorityUntil:new Date(f.now.getTime()+1000).toISOString()});
 let maxBindings=0;const prepare=f.db.prepare.bind(f.db);f.db.prepare=((sql:string)=>{const statement=prepare(sql),bind=statement.bind.bind(statement);statement.bind=(...values:unknown[])=>{maxBindings=Math.max(maxBindings,values.length);return bind(...values)};return statement}) as typeof f.db.prepare;
 expect((await f.write(ids.master,{action:'add',memberIds:members},1)).status).toBe(200);f.now.setTime(f.now.getTime()+1000);const count=f.statements.length;
 const response=await f.read(ids.master);expect(response.status).toBe(200);const view=await response.json() as any;expect(view.data.counts).toEqual({applicants:100,waiting:0});expect(view.data.visibleApplicants).toHaveLength(100);
 expect(maxBindings).toBeLessThanOrEqual(100);expect(f.statements.length-count).toBeLessThanOrEqual(50);
 const membersSnapshot=await f.deps.store.getParticipationMembers([members[0]]),snapshot=(await f.deps.store.getRoster(session.id))!,scheduled=(await f.deps.store.getSession(session.id))!;
 f.sqlite.prepare('UPDATE auth_members SET active=0,auth_version=auth_version+1 WHERE id=?').run(members[0]);
 expect(await f.deps.store.compareAndSetRoster(scheduled,snapshot,snapshot.value,membersSnapshot)).toBe(false);
 }finally{f.close()}
});
it.each(['self','manager'] as const)('blocks current publication for %s and lifetime publication for self',source=>{
 for(const published of [{...empty(),firstPublishedAt:start.toISOString()},{...empty(),published:{teams:[]}}]){
  if(source==='self'||published.published)expect(()=>registerParticipants(s,published,[own],start,source)).toThrow('팀편성 공개 후');
  else expect(registerParticipants(s,published,[own],start,source).participants[own.memberId].status).toBe('applied');
  expect(published.participants).toEqual({});
 }
});
it('HTTP publication blocks self, manager and candidate access without changing existing waiters',async()=>{
 const f=await httpFixture();try{
  const published={...empty(),firstPublishedAt:f.now.toISOString(),published:{teams:[]},participants:{[ids.waiter]:{status:'waiting' as const,source:'self' as const,waitReason:'priority' as const,order:1}}};f.put('roster',session.id,published);
  for(const actor of [ids.master,ids.operator])expect((await f.write(actor,{action:'add',memberIds:[ids.applicant]},1)).status).toBe(400);
  expect((await f.write(ids.outsider,{action:'register'},1)).status).toBe(400);
  expect((await handleSideoutRead(await f.request(ids.master),'candidates',f.deps,session.id)).status).toBe(400);
  const detail=(await (await f.read(ids.master)).json() as any).data;expect(detail.capabilities.canManageRoster).toBe(false);expect(detail.participation.canRegister).toBe(false);
  const home=await handleSideoutRead(await f.request(ids.master),'sessions',f.deps);expect((await home.json() as any).data.cards.find((c:any)=>c.session.id===session.id).participation.canRegister).toBe(false);
  expect((await f.deps.store.getRoster(session.id))?.value).toEqual(published);
 }finally{f.close()}
});
it('publication between candidate selection and commit rejects the stale add',async()=>{
 const f=await httpFixture();try{
  const commit=f.deps.writeStore.commit.bind(f.deps.writeStore);f.deps.writeStore.commit=async input=>{const current=(await f.deps.store.getRoster(session.id))!;f.put('roster',session.id,{...current.value,firstPublishedAt:f.now.toISOString(),published:{teams:[]}},current.revision+1);return commit(input)};
  expect((await f.write(ids.master,{action:'add',memberIds:[ids.applicant]},1)).status).toBe(409);
  expect((await f.deps.store.getRoster(session.id))?.value.participants).toEqual({});
 }finally{f.close()}
});
it('priority expiry promotes all eligible guests in order when there is no capacity limit',()=>{
 const unlimited={...s,cap:null};const waiting=registerParticipants(unlimited,empty(),[guest2,guest],start,'self');
 expect(Object.values(settleWaiting(unlimited,waiting,[guest,guest2],new Date(end.getTime()-1)).participants).map(p=>p.status)).toEqual(['waiting','waiting']);
 const promoted=settleWaiting(unlimited,waiting,[guest,guest2],end);
 expect(Object.keys(promoted.participants)).toEqual([guest2.memberId,guest.memberId]);expect(Object.values(promoted.participants).map(p=>p.status)).toEqual(['applied','applied']);
});

it('allows manager additions after withdrawal but keeps self, draft and current-publication restrictions',()=>{
 const r={...empty(),firstPublishedAt:start.toISOString(),published:{teams:[]},publicationState:'withdrawn' as const};
 expect(()=>registerParticipants(s,r,[own],start,'self')).toThrow();expect(registerParticipants(s,r,[own],start,'manager').participants[own.memberId].status).toBe('applied');
 expect(()=>registerParticipants({...s,phase:'draft'},r,[own],start,'manager')).toThrow();expect(()=>registerParticipants(s,{...r,publicationState:'published'},[own],start,'manager')).toThrow();
});
it.each([ids.master,ids.operator])('allows manager %s to add and cancel from a withdrawn roster while self actions remain locked',async actor=>{
 const f=await httpFixture();try{
  f.put('roster',session.id,{...empty(),publicationState:'withdrawn',firstPublishedAt:f.now.toISOString(),published:{teams:[]}});
  const detail=(await (await f.read(actor)).json() as any).data;expect(detail.capabilities.canManageRoster).toBe(true);expect(detail.capabilities.canCancelRoster).toBe(true);expect(detail.participation.canRegister).toBe(false);
  expect((await handleSideoutRead(await f.request(actor),'candidates',f.deps,session.id)).status).toBe(200);
  expect((await f.write(ids.applicant,{action:'add',memberIds:[ids.guest]},1)).status).toBe(403);expect((await f.write(ids.applicant,{action:'register'},1)).status).toBe(400);
  expect((await f.write(actor,{action:'add',memberIds:[ids.guest,ids.applicant]},1)).status).toBe(200);
  expect((await f.write(ids.applicant,{action:'cancel'},2)).status).toBe(400);
  expect((await f.write(actor,{action:'remove',memberId:ids.applicant},2)).status).toBe(200);
 }finally{f.close()}
});
it.each(['priority','full','closed'] as const)('manager additions bypass %s while ordinary members retain the waiting rule',kind=>{
 const setting={...s,priorityUntil:kind==='priority'?s.priorityUntil:null,cap:kind==='full'?0:24,deadline:kind==='closed'?new Date(start.getTime()-1).toISOString():s.deadline};
 const registered=registerParticipants(setting,empty(),[guest,guest2],start,'manager');expect(Object.values(registered.participants).map(p=>p.status)).toEqual(['applied','applied']);expect(registered.participants[guest.memberId].waitReason).toBeUndefined();
 expect(registerParticipants(setting,empty(),[guest],start,'self').participants[guest.memberId].status).toBe('waiting');
});
it.each([-1,0,1])('manager add permission and command share the exact start boundary (%s ms)',async offset=>{
 const f=await httpFixture();try{
  f.now.setTime(Date.parse(session.date+'T'+session.start+':00+09:00')+offset);
  const expected=offset<0;const detail=(await(await f.read(ids.master)).json() as any).data;expect(detail.capabilities.canManageRoster).toBe(expected);
  expect((await handleSideoutRead(await f.request(ids.master),'candidates',f.deps,session.id)).status).toBe(expected?200:400);
  expect((await f.write(ids.master,{action:'add',memberIds:[ids.guest]},1)).status).toBe(expected?200:400);
  if(expected)expect((await f.deps.store.getRoster(session.id))!.value.participants[ids.guest].status).toBe('applied');
 }finally{f.close()}
});

it('withdrawn manager cancellation removes the current draft and attendance but preserves the previous public snapshot',async()=>{
 const f=await httpFixture();try{
  const withdrawn={...structuredClone(roster),publicationState:'withdrawn' as const,draft:structuredClone(roster.published!)};f.put('roster',session.id,withdrawn);
  const before=(await f.deps.store.getRoster(session.id))!.value;
  expect((await f.write(ids.operator,{action:'remove',memberId:ids.guest},1)).status).toBe(200);
  let saved=(await f.deps.store.getRoster(session.id))!;expect(saved.value.participants[ids.guest].status).toBe('cancelled');expect(saved.value.draft.teams.flatMap(t=>t.players).some(p=>p.memberId===ids.guest)).toBe(false);expect(saved.value.published).toEqual(before.published);expect(saved.value.publishedMatches).toEqual(before.publishedMatches);
  expect((await f.write(ids.master,{action:'remove',memberId:ids.waiter},2)).status).toBe(200);
  const view=(await (await f.read(ids.master)).json() as any).data;expect(view.counts).toEqual({applicants:1,waiting:0});
  expect((await f.write(ids.operator,{action:'add',memberIds:[ids.guest]},3)).status).toBe(200);saved=(await f.deps.store.getRoster(session.id))!;expect(saved.value.participants[ids.guest].status).toBe('applied');expect(saved.value.draft.teams.flatMap(t=>t.players).some(p=>p.memberId===ids.guest)).toBe(false);
 }finally{f.close()}
});
it.each([-1,0,1])('withdrawn manager cancellation checks the exact start boundary (%s ms)',async offset=>{
 const f=await httpFixture();try{
  f.put('roster',session.id,{...roster,publicationState:'withdrawn'});f.now.setTime(Date.parse(session.date+'T'+session.start+':00+09:00')+offset);
  const detail=(await(await f.read(ids.master)).json() as any).data;expect(detail.capabilities.canCancelRoster).toBe(offset<0);
  expect((await f.write(ids.master,{action:'remove',memberId:ids.applicant},1)).status).toBe(offset<0?200:400);
 }finally{f.close()}
});
