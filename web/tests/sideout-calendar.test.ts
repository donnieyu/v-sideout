import {describe,it,expect} from 'vitest';
import {kstWeekStart,parseReadSelection,resolveWeekOffset,addDays} from '../lib/sideout/calendar';
const now=new Date('2026-09-30T00:00:00Z');
describe('KST calendar and input boundaries',()=>{
 it.each([['2026-09-27T14:59:59Z','2026-09-21'],['2026-09-27T15:00:00Z','2026-09-28'],['2027-01-01T00:00:00Z','2026-12-28']])('uses Monday at Korean midnight: %s',(instant,week)=>expect(kstWeekStart(new Date(instant))).toBe(week));
 it('moves across year boundaries',()=>{expect(resolveWeekOffset(1,new Date('2026-12-31T00:00:00Z'))).toBe('2027-01-04');expect(addDays('2024-02-28',1)).toBe('2024-02-29')});
 it.each(['weekStart=2026-02-30','weekStart=2026-09-29','weekStart=2026-09-28&weekStart=2026-09-21','week=1.5','week=1000','filter=all&filter=favorites'])('rejects invalid query %s',q=>expect(()=>parseReadSelection(new URL('http://local/?'+q),now)).toThrow());
 it('defaults to current week while retaining an opaque filter',()=>expect(parseReadSelection(new URL('http://local/?filter=club-test'),now)).toEqual({weekStart:'2026-09-28',filter:'club-test'}));
});
