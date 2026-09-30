import {it,expect} from 'vitest';
import {safeReturnPath,legacyHashToPath} from '../lib/sideout/navigation';
const now=new Date('2026-09-30T00:00:00Z');
it.each(['https://evil.example','//evil.example','/session/%','/session/%2F%2Fevil','/session/..','/home?week=oops'])('rejects unsafe return path %s',s=>expect(safeReturnPath(s)).toBe('/home'));
it('preserves opaque IDs and allowed query context only',()=>expect(safeReturnPath('/session/opaque-id?weekStart=2026-09-28&filter=favorites&role=master')).toBe('/session/opaque-id?weekStart=2026-09-28&filter=favorites'));
it('converts legacy week and edit URL using server date',()=>expect(legacyHashToPath('#/session/opaque-id/teams/edit?week=1&filter=all',now)).toBe('/session/opaque-id?weekStart=2026-10-05&filter=all'));
it('invalid legacy date falls back safely',()=>expect(legacyHashToPath('#/home?week=1000',now)).toBe('/home'));
