import {it,expect} from 'vitest';
import {queryFixture} from './helpers/sideout-fixture';
import {handleSideoutWrite} from '../lib/server/sideout-write';
import {makeSideoutWriteStore} from '../lib/server/sideout-write-store';
import {ids,session,clubs} from './fixtures/sideout';
const payload=()=>{const {id,...value}=session;return {...value,date:'2026-10-11',deadline:'2026-10-10T09:00:00Z',priorityUntil:null}};
async function setup(){const f=await queryFixture();const deps={...f.deps,writeStore:makeSideoutWriteStore(f.db)},requests=new Map<string,Request>();async function call(resource:'create'|'update'|'preferences',member=ids.master,body:unknown={commandId:crypto.randomUUID(),expectedRevision:0,payload:payload()},id?:string,origin='http://local'){
 const read=requests.get(member)??await f.request(member);requests.set(member,read);const request=new Request('http://local/api/sessions'+(id?'/'+id:''),{method:'POST',headers:{cookie:read.headers.get('cookie')!,origin,'content-type':'application/json'},body:JSON.stringify(body)});
 return handleSideoutWrite(request,resource,deps,id);
 }return {...f,deps,call}}
it('creates one session and roster, replays response loss and rejects changed command reuse',async()=>{
 const f=await setup();try{const body={commandId:crypto.randomUUID(),expectedRevision:0,payload:payload()};const first=await f.call('create',ids.master,body);expect(first.status).toBe(200);const result=(await first.json() as {data:{resourceId:string}}).data;
 expect((await f.deps.store.getRoster(result.resourceId))?.value.participants).toEqual({});expect((await f.call('create',ids.master,body)).status).toBe(200);
 expect((await f.call('create',ids.master,{...body,payload:{...payload(),place:'다른 장소'}})).status).toBe(409);
 expect((await f.call('create',ids.master,{...body,commandId:crypto.randomUUID()})).status).toBe(409);
 }finally{f.close()}
});
it('rejects unauthorized creation and foreign origins',async()=>{
 const f=await setup();try{expect((await f.call('create',ids.applicant)).status).toBe(403);expect((await f.call('create',ids.master,{},undefined,'http://foreign')).status).toBe(403);expect((await f.deps.store.listSessions('2026-10-11','2026-10-12')).length).toBe(0)}finally{f.close()}
});
it('uses CAS for edits and rejects date changes or returning open to draft',async()=>{
 const f=await setup();try{const {id,...original}=session;const body={commandId:crypto.randomUUID(),expectedRevision:1,payload:{...original,place:'수정 장소'}};
 expect((await f.call('update',ids.master,body,id)).status).toBe(200);expect((await f.call('update',ids.master,{...body,commandId:crypto.randomUUID()},id)).status).toBe(409);expect((await f.deps.store.getSession(id))?.value.place).toBe('수정 장소');
 for(const change of[{date:'2026-10-11'},{phase:'draft'}])expect((await f.call('update',ids.master,{commandId:crypto.randomUUID(),expectedRevision:2,payload:{...original,...change}},id)).status).toBe(400);
 }finally{f.close()}
});
it.each([{start:'07:00'},{deadline:'2027-01-01T00:00:00Z'},{priorityUntil:'2027-01-01T00:00:00Z'},{cap:201},{place:''},{unknown:'x'},{deadline:'2026-10-10T18:00:00+99:99'},{priorityUntil:'2026-10-09T18:00:00+24:00'}])('rejects invalid schedule %j',async change=>{
 const f=await setup();try{expect((await f.call('create',ids.master,{commandId:crypto.randomUUID(),expectedRevision:0,payload:{...payload(),...change}})).status).toBe(400)}finally{f.close()}
});
it('saves favorites only for actor and prevents stale writes',async()=>{
 const f=await setup();try{const body={commandId:crypto.randomUUID(),expectedRevision:0,payload:{favoriteClubIds:[clubs[0].id]}};expect((await f.call('preferences',ids.applicant,body)).status).toBe(200);expect((await f.deps.store.getPreferences(ids.applicant)).favoriteClubIds).toEqual([clubs[0].id]);expect((await f.deps.store.getPreferences(ids.guest)).favoriteClubIds).toEqual([]);expect((await f.call('preferences',ids.applicant,{...body,commandId:crypto.randomUUID()})).status).toBe(409)}finally{f.close()}
});
it.each(['revoke','logout','failure'] as const)('guards commit against %s without partial session/receipt',async kind=>{
 const f=await setup();try{const original=f.deps.writeStore.commit.bind(f.deps.writeStore);f.deps.writeStore.commit=async input=>{
 if(kind==='revoke')f.sqlite.prepare('UPDATE auth_members SET auth_version=auth_version+1 WHERE id=?').run(ids.master);
 if(kind==='logout')f.sqlite.prepare('DELETE FROM auth_sessions WHERE member_id=?').run(ids.master);
 if(kind==='failure')f.sqlite.exec("CREATE TRIGGER reject_session BEFORE INSERT ON workspaces WHEN NEW.id LIKE 'sideout:session:%' BEGIN SELECT RAISE(ABORT,'simulated failure'); END;");
 return original(input)};
 const response=await f.call('create');expect(response.status).not.toBe(200);expect((await f.deps.store.listSessions('2026-10-11','2026-10-12')).length).toBe(0);expect(f.sqlite.prepare("SELECT COUNT(*) AS n FROM workspaces WHERE id LIKE 'sideout:command:%'").get()?.n).toBe(0);
 }finally{f.close()}
});
