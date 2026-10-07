import {afterEach,it,expect} from 'vitest';
import type {HomeView,SessionDetailView} from '../lib/sideout/read-model';
import {queryFixture} from './helpers/sideout-fixture';
import {ids,session,roster,clubs} from './fixtures/sideout';
import {handleSideoutRead} from '../lib/server/sideout-http';
const opened:Awaited<ReturnType<typeof queryFixture>>[]=[];
async function fixture(){const f=await queryFixture();opened.push(f);return f}
afterEach(()=>opened.splice(0).forEach(f=>f.close()));
it.each(['applicant','guest','master','operator','multi'] as const)('permits published view for %s only through verified identity',async role=>{const f=await fixture();const r=await handleSideoutRead(await f.request(ids[role]),'session',f.deps,session.id);expect(r.status).toBe(200);const {data}=await r.json() as {data:SessionDetailView};expect(data.publishedTeams![0].players).toHaveLength(2);expect(JSON.stringify(data)).not.toMatch(/passwordHash|loginId|grants|firstPublishedAt|draftMatches/)});
it.each(['waiter','outsider','cancelled'] as const)('withholds published lineup and matches from %s',async role=>{const f=await fixture();const r=await handleSideoutRead(await f.request(ids[role]),'session',f.deps,session.id);const {data}=await r.json() as {data:SessionDetailView};expect(data.publishedTeams).toBeNull();expect(data.publishedMatches).toBeNull();expect(data.counts).toEqual({applicants:2,waiting:1})});
it('returns only home applicants and guest count to an ordinary home member',async()=>{const f=await fixture();const {data}=await (await handleSideoutRead(await f.request(),'session',f.deps,session.id)).json() as {data:HomeView & SessionDetailView};expect(data.visibleApplicants.map((m:{memberId:string})=>m.memberId)).toEqual([ids.applicant]);expect(data.guestCount).toBe(1);expect(Object.values(data.capabilities).every(v=>v===false)).toBe(true);expect(data).not.toHaveProperty('waiters')});
it('a guest sees published lineup but no club applicant directory',async()=>{const f=await fixture();const {data}=await (await handleSideoutRead(await f.request(ids.guest),'session',f.deps,session.id)).json() as {data:HomeView & SessionDetailView};expect(data.visibleApplicants).toEqual([]);expect(data.guestCount).toBeNull()});
it('draft detail is indistinguishable from a missing ID; role query cannot escalate',async()=>{const f=await fixture();const req=await f.request(ids.applicant,'http://local/?role=master');const a=await handleSideoutRead(req,'session',f.deps,'hidden'),b=await handleSideoutRead(req,'session',f.deps,'absent');expect(a.status).toBe(404);expect(await a.json()).toEqual(await b.json());const {data}=await (await handleSideoutRead(req,'sessions',f.deps)).json() as {data:HomeView & SessionDetailView};expect(data.cards.map((c:{session:{id:string}})=>c.session.id)).toEqual([session.id]);expect(data.registrationOpportunities).toEqual([])});
it('manager sees prepared sessions and only permitted registration opportunities',async()=>{const f=await fixture();const {data}=await (await handleSideoutRead(await f.request(ids.multi),'sessions',f.deps)).json() as {data:HomeView & SessionDetailView};expect(data.cards).toHaveLength(2);expect(data.cards.every((c:{canManage:boolean})=>c.canManage)).toBe(true)});
it('identity lookup retains separate IDs after rename or deactivation',async()=>{const f=await fixture();f.sqlite.prepare('UPDATE auth_members SET display_name=?,active=0 WHERE id=?').run('변경된 이름',ids.guest);const {data}=await (await handleSideoutRead(await f.request(),'session',f.deps,session.id)).json() as {data:HomeView & SessionDetailView};expect(data.publishedTeams![0].players.map((p:{displayName:string})=>p.displayName)).toEqual(['동명이인','변경된 이름'])});
it('unknown filters and orphan references fail rather than fabricate data',async()=>{const f=await fixture();expect((await handleSideoutRead(await f.request(ids.master,'http://local/?filter=missing'),'sessions',f.deps)).status).toBe(400);f.put('roster',session.id,{...roster,published:{teams:[{id:'team-a',title:'A',players:[{memberId:'missing',slotId:'s',assignedPosition:'S'}]}]}});expect((await handleSideoutRead(await f.request(),'session',f.deps,session.id)).status).toBe(503)});
it('favorites filter uses the current member preference only',async()=>{const f=await fixture();f.put('preferences',ids.applicant,{favoriteClubIds:[clubs[0].id]});for(const [id,count] of [[ids.applicant,1],[ids.guest,0]] as const){const {data}=await (await handleSideoutRead(await f.request(id,'http://local/?filter=favorites'),'sessions',f.deps)).json() as {data:HomeView & SessionDetailView};expect(data.cards.length).toBe(count)}});
it('only a permitted manager receives waiter labels for the roster overlay',async()=>{
 const f=await fixture();for(const [id,manager] of [[ids.master,true],[ids.operator,true],[ids.applicant,false],[ids.guest,false]] as const){
  const {data}=await (await handleSideoutRead(await f.request(id),'session',f.deps,session.id)).json() as {data:SessionDetailView};
  if(manager)expect(data.visibleWaiters!.map((m:{memberId:string})=>m.memberId)).toEqual([ids.waiter]);else expect(data).not.toHaveProperty('visibleWaiters');
 }
});
it.each(['applicant','guest','waiter','cancelled','outsider','master','operator'] as const)('past weeks list only the actual participation of %s',async role=>{
 const f=await fixture(),id='past-open';f.put('session',id,{...session,id,date:'2026-09-27'});f.put('roster',id,{...roster,sessionId:id});
 const {data}=await (await handleSideoutRead(await f.request(ids[role],'http://local/?weekStart=2026-09-21'),'sessions',f.deps)).json() as {data:HomeView};
 expect(data.cards.map(c=>c.session.id)).toEqual(['applicant','guest'].includes(role)?[id]:[]);expect(data.registrationOpportunities).toEqual([]);
});
it('past published participation includes an assigned waiting member but never exposes the private draft',async()=>{
 const f=await fixture(),id='past-waiter';f.put('session',id,{...session,id,date:'2026-09-27'});f.put('roster',id,{...roster,sessionId:id,published:{teams:[{id:'a',title:'A팀',players:[{memberId:ids.waiter,slotId:'s',assignedPosition:'S'}]}]}});
 const {data}=await (await handleSideoutRead(await f.request(ids.waiter,'http://local/?weekStart=2026-09-21'),'sessions',f.deps)).json() as {data:HomeView};expect(data.cards.map(c=>c.session.id)).toEqual([id]);
});
it.each([['2026-09-30T00:59:59Z',true],['2026-09-30T01:00:00Z',false],['2026-09-30T01:00:01Z',false]])('registration opportunity uses the exact server start boundary %s',async(instant,expected)=>{
 const f=await fixture();f.put('club','wednesday',{...clubs[0],id:'wednesday',weekday:3,start:'10:00',entry:'09:30'});
 const {data}=await (await handleSideoutRead(await f.request(ids.master),'sessions',{...f.deps,now:()=>new Date(instant)})).json() as {data:HomeView};expect(data.registrationOpportunities.some(o=>o.clubId==='wednesday')).toBe(expected);
});
it.each([false,true])('shows managers the public snapshot while published and draft otherwise (published=%s)',async published=>{
 const f=await fixture();const draft={teams:[{id:'B',title:'저장 B팀',players:[{memberId:ids.waiter,slotId:'s',assignedPosition:'S' as const}]}]};
 f.put('roster',session.id,{...roster,draft,published:published?roster.published:null,publishedMatches:published?roster.publishedMatches:null,firstPublishedAt:published?roster.firstPublishedAt:null});
 for(const actor of [ids.master,ids.operator,ids.applicant,ids.waiter,ids.guest]){
  const {data}=await(await handleSideoutRead(await f.request(actor),'session',f.deps,session.id)).json() as {data:SessionDetailView};
  if(actor===ids.master||actor===ids.operator){expect(data.managerTeamPreview?.teams[0].title).toBe(published?'A팀':'저장 B팀');expect(data.managerTeamPreview?.teams[0].players[0].memberId).toBe(published?roster.published!.teams[0].players[0].memberId:ids.waiter);expect(data.managerTeamPreview?.unpublishedChanges).toBe(!published)}
  else expect(data).not.toHaveProperty('managerTeamPreview');
  if(actor===ids.applicant)expect(data.publishedTeams?.[0].title??null).toBe(published?'A팀':null);
 }
 f.now.setTime(Date.parse(session.date+'T'+session.start+':00+09:00'));f.sqlite.prepare('DELETE FROM auth_sessions WHERE member_id=?').run(ids.master);const {data}=await(await handleSideoutRead(await f.request(ids.master),'session',f.deps,session.id)).json() as {data:SessionDetailView};expect(data).not.toHaveProperty('managerTeamPreview');
});
it('includes stable home club IDs in roster labels despite duplicate club names, renames, or no affiliation',async()=>{
 const f=await fixture(),request=await f.request(ids.master);
 f.put('club',clubs[1].id,{...clubs[1],name:clubs[0].name});
 let {data}=await (await handleSideoutRead(request,'session',f.deps,session.id)).json() as {data:SessionDetailView};
 expect(data.visibleApplicants.map(m=>({id:m.memberId,clubId:m.homeClubId}))).toEqual([{id:ids.applicant,clubId:clubs[0].id},{id:ids.guest,clubId:clubs[1].id}]);expect(data.guestCount).toBe(1);
 expect(data.visibleWaiters![0].homeClubId).toBe(clubs[0].id);expect(data.publishedTeams![0].players[1].homeClubId).toBe(clubs[1].id);
 f.put('club',clubs[0].id,{...clubs[0],name:'변경한 이름'});
 f.sqlite.prepare('UPDATE auth_members SET home_club_id=NULL WHERE id=?').run(ids.guest);
 ({data}=await (await handleSideoutRead(request,'session',f.deps,session.id)).json() as {data:SessionDetailView});
 expect(data.visibleApplicants[0]).toMatchObject({homeClubId:clubs[0].id,clubName:'변경한 이름'});expect(data.visibleApplicants[1]).toMatchObject({homeClubId:null,clubName:null});expect(data.guestCount).toBe(1);
});
