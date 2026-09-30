import {afterEach,it,expect} from 'vitest';
import {queryFixture} from './helpers/sideout-fixture';
import {ids,session} from './fixtures/sideout';
import {handleSideoutRead} from '../lib/server/sideout-http';
import {GET,POST} from '../app/api/workspace/route';
const opened:Awaited<ReturnType<typeof queryFixture>>[]=[];
async function fixture(){const f=await queryFixture();opened.push(f);return f}
afterEach(()=>opened.splice(0).forEach(f=>f.close()));
it.each(['none','expired','inactive','restricted'] as const)('blocks %s sessions',async mode=>{const f=await fixture();const req=await f.request(mode==='none'?null:ids.applicant);if(mode==='expired')f.sqlite.exec('UPDATE auth_sessions SET expires_at=0');if(mode==='inactive')f.sqlite.exec('UPDATE auth_members SET active=0');if(mode==='restricted'){f.sqlite.prepare('UPDATE auth_members SET must_change_password=1,temporary_expires_at=?').run('2026-10-01T00:00:00Z');f.sqlite.exec('UPDATE auth_sessions SET restricted=1')};const r=await handleSideoutRead(req,'session',f.deps,session.id);expect(r.status).toBe(mode==='restricted'?403:401);expect(r.headers.get('cache-control')).toContain('no-store');expect(await r.json()).not.toHaveProperty('data')});
it('clears a response when authorization was revoked during reads',async()=>{const f=await fixture();const req=await f.request(ids.master);const get=f.deps.store.getSession;f.deps.store.getSession=async id=>{const s=await get(id);f.sqlite.prepare('UPDATE auth_members SET auth_version=2 WHERE id=?').run(ids.master);return s};expect((await handleSideoutRead(req,'session',f.deps,session.id)).status).toBe(401)});
it('returns 503 on binding or store failure without exception details',async()=>{const f=await fixture();f.deps.store.listClubs=async()=>{throw Error('private database detail')};const r=await handleSideoutRead(await f.request(),'clubs',f.deps);expect(r.status).toBe(503);expect(await r.text()).not.toContain('private')});
it('closes both legacy demo paths',async()=>{for(const handler of [GET,POST]){const r=await handler(new Request('http://local/api/workspace?role=master'));expect(r.status).toBe(410);expect(await r.json()).toEqual({ok:false,error:{code:'LEGACY_API_DISABLED',message:'이전 데모 API는 사용할 수 없습니다.'}})}});
