// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,within,fireEvent,cleanup} from '@testing-library/react';
import {SessionAllocation} from '../components/sideout/allocation/session-allocation';
vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
afterEach(cleanup);
it('still auto fills after manually assigning in A and then deleting another team',()=>{
 const people=[{id:'a',name:'가선수',club:'시험',position:'세터' as const,secondary:'라이트' as const,status:'신청자' as const},{id:'b',name:'나선수',club:'시험',position:'센터' as const,secondary:'라이트' as const,status:'신청자' as const}];
 render(<SessionAllocation title="시험" baseline={{teams:['A','B','C'].map(id=>({id,title:id+'팀',players:[]}))}} people={people} saved={true} onSave={async()=>{}} onCancel={()=>{}} onDirty={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'A팀 세터 선수 배정'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'가선수 배정'}));
 fireEvent.click(screen.getByRole('button',{name:'팀 추가'}));
 fireEvent.click(screen.getByRole('button',{name:'D팀 삭제'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'팀 삭제'}));
 fireEvent.click(screen.getByRole('button',{name:'자동 배치'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'자동 배치'}));
 expect(document.querySelectorAll('.real-board-slot[data-assigned="true"]').length).toBe(2);
});

it('shows a compact reason entry after auto fill skips an applicant without a profile',()=>{
 const people=[{id:'a',name:'미등록선수',club:'뉴배동',position:'미등록' as const,secondary:'미등록' as const,status:'신청자' as const}];
 render(<SessionAllocation title="시험" baseline={{teams:['A','B','C'].map(id=>({id,title:id+'팀',players:[]}))}} people={people} saved={true} onSave={async()=>{}} onCancel={()=>{}} onDirty={()=>{}}/>);
 expect(screen.queryByRole('button',{name:/이유 보기/})).toBeNull();
 expect(document.getElementById('allocation-summary')?.classList.contains('attention')).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'자동 배치'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'자동 배치'}));
 expect(document.getElementById('allocation-summary')?.classList.contains('attention')).toBe(true);
 expect(document.getElementById('allocation-summary')?.textContent).toContain('1명 미배정');
 fireEvent.click(screen.getByRole('button',{name:/이유 보기/}));
 const dialog=screen.getByRole('dialog',{name:'미배정 신청자 이유'});
 expect(within(dialog).getByText(/주포지션 미등록 1명/)).toBeTruthy();
 expect(within(dialog).getByText(/미등록선수/)).toBeTruthy();
 expect(within(dialog).queryByText(/맞는 포지션이 없음/)).toBeNull();
});

it('explains capacity shortage and invalidates the result after changing the board',()=>{
 const people=Array.from({length:19},(_,index)=>({id:`p${index}`,name:`선수${index}`,club:'시험',position:'레프트' as const,secondary:'레프트' as const,status:'신청자' as const}));
 render(<SessionAllocation title="시험" baseline={{teams:['A','B','C'].map(id=>({id,title:id+'팀',players:[]})),extraRows:0}} people={people} saved={true} onSave={async()=>{}} onCancel={()=>{}} onDirty={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'자동 배치'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'자동 배치'}));
 fireEvent.click(screen.getByRole('button',{name:/이유 보기/}));
 expect(within(screen.getByRole('dialog',{name:'미배정 신청자 이유'})).getByText(/빈자리 부족 1명/)).toBeTruthy();
 fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button',{name:'닫기'})[0]);
 fireEvent.click(screen.getByRole('button',{name:'추가 선수 줄'}));
 expect(screen.queryByRole('button',{name:/이유 보기/})).toBeNull();
 expect(document.getElementById('allocation-summary')?.classList.contains('attention')).toBe(false);
});
