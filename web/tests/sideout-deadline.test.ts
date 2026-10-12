import {expect,it} from 'vitest';
import {deadlineStatus} from '../components/sideout/schedule-deadline';
it('counts Korean calendar dates instead of rounding elapsed hours',()=>{
 expect(deadlineStatus('2026-10-16T09:00:00Z','2026-10-13T14:59:00Z').label).toBe('D-3');
 expect(deadlineStatus('2026-10-16T09:00:00Z','2026-10-13T15:00:00Z').label).toBe('D-2');
 expect(deadlineStatus('2026-10-16T09:00:00Z','2026-10-16T00:00:00Z').label).toBe('오늘 마감');
});
it('uses the exact deadline and publication rather than implying new registration is allowed',()=>{
 expect(deadlineStatus('2026-10-16T09:00:00Z','2026-10-16T09:00:00Z').label).toBe('신청 마감');
 expect(deadlineStatus('2026-10-16T09:00:00Z','2026-10-13T00:00:00Z',true).label).toBe('접수 종료');
 expect(deadlineStatus('','2026-10-13T00:00:00Z').label).toBe('');
});
