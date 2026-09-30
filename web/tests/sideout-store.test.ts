import {afterEach,it,expect} from 'vitest';
import {testDatabase} from './helpers/sideout-d1';
import {clubs,session,roster,ids} from './fixtures/sideout';
import {makeSideoutStore,makeClubDirectory} from '../lib/server/sideout-store';
const opened:ReturnType<typeof testDatabase>[]=[];
function fixture(){const f=testDatabase();opened.push(f);for(const club of clubs)f.put('club',club.id,club);f.put('session',session.id,session,3);f.put('roster',session.id,roster,5);return {...f,store:makeSideoutStore(f.db)}}
afterEach(()=>opened.splice(0).forEach(f=>f.close()));
it('reads independent revisions and immutable participant IDs without mutating storage',async()=>{const f=fixture();expect((await f.store.getSession(session.id))?.revision).toBe(3);expect((await f.store.getRoster(session.id))?.value.participants[ids.applicant].status).toBe('applied');expect((await f.store.listSessions('2026-09-28','2026-10-05')).length).toBe(1);expect(await f.store.getSession('unknown')).toBeNull();expect(f.statements.every(s=>s.startsWith('SELECT'))).toBe(true)});
it('uses the same club directory and isolated favorites',async()=>{const f=fixture();f.put('preferences',ids.applicant,{favoriteClubIds:[clubs[0].id]});expect(await makeClubDirectory(f.store).exists(clubs[0].id)).toBe(true);expect(await makeClubDirectory(f.store).exists('other')).toBe(false);expect(await f.store.getPreferences(ids.applicant)).toEqual({favoriteClubIds:[clubs[0].id]});expect(await f.store.getPreferences(ids.guest)).toEqual({favoriteClubIds:[]})});
it.each(['bad-json','{"schemaVersion":2,"data":{}}','{"schemaVersion":1,"data":{"id":"wrong"}}'])('fails closed on corrupt payload %s',async payload=>{const f=fixture();f.sqlite.prepare('UPDATE workspaces SET payload=? WHERE id=?').run(payload,`sideout:session:${session.id}`);await expect(f.store.getSession(session.id)).rejects.toMatchObject({code:'STORAGE_UNAVAILABLE'})});
it('does not fall back to a demo workspace',async()=>{const f=fixture();f.sqlite.exec('DELETE FROM workspaces');f.sqlite.prepare('INSERT INTO workspaces VALUES(?,?,?)').run('demo-v1',JSON.stringify(session),1);expect(await f.store.listSessions('2026-09-28','2026-10-05')).toEqual([])});
it('rejects mismatched valid IDs and orphan club references',async()=>{const f=fixture();f.put('session',session.id,{...session,id:'other'});await expect(f.store.getSession(session.id)).rejects.toMatchObject({code:'STORAGE_UNAVAILABLE'});f.put('session',session.id,{...session,clubId:'absent'});await expect(f.store.getSession(session.id)).rejects.toMatchObject({code:'STORAGE_UNAVAILABLE'})});
it.each(['missing-team','wrong-count','self-match','invalid-rookie','duplicate-slot','duplicate-player','duplicate-team','missing-published'] as const)('rejects structurally inconsistent roster %s',async mode=>{
 const f=fixture(),r=structuredClone(roster);
 if(mode==='missing-team')r.publishedMatches!.matches=[{id:'match',kind:'regular',home:'team-a',away:'missing'}];
 if(mode==='wrong-count')r.publishedMatches!.teamCount=3;
 if(mode==='self-match')r.publishedMatches!.matches=[{id:'match',kind:'regular',home:'team-a',away:'team-a'}];
 if(mode==='invalid-rookie')r.publishedMatches!.matches=[{id:'match',kind:'rookie',home:'R1',away:'R4'}];
 if(mode==='duplicate-slot')r.published!.teams[0].players[1].slotId='s';
 if(mode==='duplicate-player')r.published!.teams[0].players[1].memberId=ids.applicant;
 if(mode==='duplicate-team')r.published!.teams.push({...r.published!.teams[0],players:[]});
 if(mode==='missing-published')r.published=null;
 f.put('roster',session.id,r);await expect(f.store.getRoster(session.id)).rejects.toMatchObject({code:'STORAGE_UNAVAILABLE'});
});
