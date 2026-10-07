// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {SessionAllocation} from '../components/sideout/allocation/session-allocation';
import type {Candidate} from '../components/sideout/allocation/position-board-model';

vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
afterEach(cleanup);
const people:Candidate[]=[
 {id:'a',name:'김도윤',club:'뉴배동',position:'세터',secondary:'라이트',status:'신청자'},
 {id:'b',name:'이서준',club:'히어로즈',position:'센터',secondary:'라이트',status:'신청자'},
 {id:'c',name:'초대선수',club:'런업',position:'레프트',secondary:'센터',status:'미신청 회원'},
];
const baseline={teams:['A','B','C'].map(id=>({id,title:id+'팀',players:[]}))};
const props={entryMode:'board' as const,title:'시험',baseline,people,saved:true,onSave:vi.fn(),onCancel:vi.fn(),onDirty:vi.fn()};

it('closes the picker after assigning so the updated team is immediately visible',()=>{
 render(<SessionAllocation {...props}/>);
 const board=screen.getByRole('region',{name:'팀별 포지션 배정표'});
 fireEvent.click(within(board).getByRole('button',{name:'A팀 세터 선수 배정'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'김도윤 배정'}));
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(within(board).getByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'})).toBeTruthy();
});

it('highlights only the most recently assigned seat after the picker closes in rows and court',()=>{
 render(<SessionAllocation {...props}/>);
 const board=screen.getByRole('region',{name:'팀별 포지션 배정표'});
 fireEvent.click(within(board).getByRole('button',{name:'A팀 세터 선수 배정'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'김도윤 배정'}));
 const first=within(board).getByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'});
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(first.getAttribute('data-recent-assignment')).toBe('true');
 fireEvent.click(within(board).getByRole('button',{name:'B팀 센터 1 선수 배정'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'이서준 배정'}));
 const second=within(board).getByRole('button',{name:'B팀 센터 1 이서준 히어로즈 교체'});
 expect(first.hasAttribute('data-recent-assignment')).toBe(false);
 expect(second.getAttribute('data-recent-assignment')).toBe('true');
 fireEvent.click(screen.getByRole('button',{name:'코트'}));
 expect(screen.getByRole('button',{name:'B팀 센터 이서준 히어로즈'}).getAttribute('data-recent-assignment')).toBe('true');
 expect(screen.getByRole('button',{name:'A팀 세터 김도윤 뉴배동'}).hasAttribute('data-recent-assignment')).toBe(false);
});

it('removes the recent-assignment highlight when the player is released',()=>{
 render(<SessionAllocation {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'A팀 세터 선수 배정'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'김도윤 배정'}));
 fireEvent.click(screen.getByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'해제'}));
 expect(document.querySelector('.real-board-slot[data-team-id="A"][data-slot-id="2"]')?.hasAttribute('data-recent-assignment')).toBe(false);
});

it('clears the recent-assignment highlight after three seconds',()=>{
 vi.useFakeTimers();
 try{
  render(<SessionAllocation {...props}/>);
  fireEvent.click(screen.getByRole('button',{name:'A팀 세터 선수 배정'}));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'김도윤 배정'}));
  const tile=document.querySelector('.real-board-slot[data-team-id="A"][data-slot-id="2"]');
  expect(tile?.getAttribute('data-recent-assignment')).toBe('true');
  act(()=>vi.advanceTimersByTime(3000));
  expect(tile?.hasAttribute('data-recent-assignment')).toBe(false);
 }finally{vi.useRealTimers()}
});

it('closes the picker after replacing an assigned player',()=>{
 const assigned={teams:[{id:'A',title:'A팀',players:[{memberId:'a',slotId:'s',assignedPosition:'S' as const}]},...baseline.teams.slice(1)]};
 render(<SessionAllocation {...props} baseline={assigned}/>);
 const board=screen.getByRole('region',{name:'팀별 포지션 배정표'});
 fireEvent.click(within(board).getByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'이서준 교체'}));
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(within(board).getByRole('button',{name:'A팀 세터 이서준 히어로즈 교체'})).toBeTruthy();
});

it('starts with position rows and assigns and releases from the current-player tile',()=>{
 render(<SessionAllocation {...props}/>);
 const board=screen.getByRole('region',{name:'팀별 포지션 배정표'});
 expect(within(board).getByRole('button',{name:'A팀 세터 선수 배정'})).toBeTruthy();
 expect(within(board).getAllByRole('button',{name:/팀 .* 선수 배정/}).length).toBeGreaterThan(10);
 fireEvent.click(within(board).getByRole('button',{name:'A팀 세터 선수 배정'}));
 const picker=screen.getByRole('dialog');expect(within(picker).getByText('주 포지션 · 신청자')).toBeTruthy();
 fireEvent.click(within(picker).getByRole('button',{name:'김도윤 배정'}));
 expect(screen.queryByRole('dialog')).toBeNull();
 const assigned=within(board).getByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'});expect(within(assigned).getByText('뉴배동')).toBeTruthy();
 fireEvent.click(assigned);expect(within(screen.getByRole('dialog')).getByRole('button',{name:'해제'})).toBeTruthy();
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'해제'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'선수 선택 닫기'}));
 expect(within(board).getByRole('button',{name:'A팀 세터 선수 배정'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'코트'}));expect(screen.getByRole('group',{name:'A팀 코트'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'행'}));expect(screen.getByRole('region',{name:'팀별 포지션 배정표'})).toBeTruthy();
});

it('adds and deletes a complete row, then adds and deletes an empty team in its column',()=>{
 render(<SessionAllocation {...props}/>);
 const board=screen.getByRole('region',{name:'팀별 포지션 배정표'});
 fireEvent.click(screen.getByRole('button',{name:'추가 선수 줄'}));
 for(const id of ['A','B','C'])expect(within(board).getByRole('button',{name:`${id}팀 라이트 2 선수 배정`})).toBeTruthy();
 fireEvent.click(within(board).getByRole('button',{name:'추가 선수 1줄 삭제'}));
 expect(screen.getByRole('dialog',{name:'추가 선수 1줄을 삭제할까요?'})).toBeTruthy();
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'줄 삭제'}));
 expect(within(board).queryByRole('button',{name:'A팀 라이트 2 선수 배정'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'팀 추가'}));
 expect(board.querySelector('[aria-label="D팀 삭제"]')).toBeTruthy();
 fireEvent.click(within(board).getByRole('button',{name:'D팀 삭제'}));
 expect(screen.getByRole('dialog',{name:'D팀을 삭제할까요?'})).toBeTruthy();
 expect(board.querySelector('[aria-label="D팀 삭제"]')).toBeTruthy();
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'팀 삭제'}));
 expect(within(board).queryByRole('button',{name:'D팀 삭제'})).toBeNull();
 expect(screen.queryByRole('button',{name:'실행 취소'})).toBeNull();
});

it('confirms deletion of an occupied team and returns its players to the candidate pool',()=>{
 render(<SessionAllocation {...props}/>);
 const board=screen.getByRole('region',{name:'팀별 포지션 배정표'});
 expect(within(board).getByRole('button',{name:'A팀 삭제'}).hasAttribute('disabled')).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'팀 추가'}));
 fireEvent.click(within(board).getByRole('button',{name:'A팀 세터 선수 배정'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'김도윤 배정'}));
 fireEvent.click(within(board).getByRole('button',{name:'A팀 삭제'}));
 const dialog=screen.getByRole('dialog',{name:'A팀을 삭제할까요?'});
 expect(within(dialog).getByText(/배정된 선수 1명/)).toBeTruthy();
 expect(board.querySelector('[aria-label="A팀 세터 김도윤 뉴배동 교체"]')).toBeTruthy();
 fireEvent.click(within(dialog).getByRole('button',{name:'취소'}));
 expect(within(board).getByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'})).toBeTruthy();
 fireEvent.click(within(board).getByRole('button',{name:'A팀 삭제'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'팀 삭제'}));
 expect(within(board).queryByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'})).toBeNull();
 fireEvent.click(within(board).getByRole('button',{name:'B팀 세터 선수 배정'}));
 expect(within(screen.getByRole('dialog')).getByRole('button',{name:'김도윤 배정'})).toBeTruthy();
});

it('opens the first nonempty status and explains when every applicant is assigned',()=>{
 const assigned={teams:[{id:'A',title:'A팀',players:[{memberId:'a',slotId:'s',assignedPosition:'S' as const}]},{id:'B',title:'B팀',players:[{memberId:'b',slotId:'mb1',assignedPosition:'MB' as const}]},{id:'C',title:'C팀',players:[]}]};
 const waitlisted:Candidate={id:'w',name:'대기선수',club:'뉴배동',position:'세터',secondary:'센터',status:'대기자'};
 const {unmount}=render(<SessionAllocation {...props} baseline={assigned} people={[...people,waitlisted]}/>);
 const board=screen.getByRole('region',{name:'팀별 포지션 배정표'});
 fireEvent.click(within(board).getByRole('button',{name:'C팀 세터 선수 배정'}));
 let dialog=screen.getByRole('dialog');
 expect(within(dialog).getByRole('button',{name:/^대기자/}).getAttribute('aria-pressed')).toBe('true');
 expect(within(dialog).getByText('신청자는 모두 배정되었습니다.')).toBeTruthy();
 fireEvent.click(within(dialog).getByRole('button',{name:'선수 선택 닫기'}));
 unmount();
 render(<SessionAllocation {...props} baseline={assigned}/>);
 fireEvent.click(screen.getByRole('button',{name:'C팀 세터 선수 배정'}));
 dialog=screen.getByRole('dialog');
 expect(within(dialog).getByRole('button',{name:/^신청자/}).getAttribute('aria-pressed')).toBe('true');
 expect(within(dialog).getByText('신청자를 모두 배정했어요.')).toBeTruthy();
 fireEvent.click(within(dialog).getByRole('button',{name:'미신청 회원 목록 확인'}));
 expect(within(dialog).getByRole('button',{name:'미신청 회원'}).getAttribute('aria-pressed')).toBe('true');
 expect(within(dialog).getByRole('button',{name:'초대선수 배정'})).toBeTruthy();
});

it('keeps unregistered search results behind their explicit tab',()=>{
 const assigned={teams:[{id:'A',title:'A팀',players:[{memberId:'a',slotId:'s',assignedPosition:'S' as const}]},{id:'B',title:'B팀',players:[{memberId:'b',slotId:'mb1',assignedPosition:'MB' as const}]},{id:'C',title:'C팀',players:[]}]};
 render(<SessionAllocation {...props} baseline={assigned}/>);
 fireEvent.click(screen.getByRole('button',{name:'C팀 세터 선수 배정'}));
 const dialog=screen.getByRole('dialog');
 fireEvent.change(within(dialog).getByRole('textbox',{name:'선수 검색'}),{target:{value:'초대선수'}});
 expect(within(dialog).queryByRole('button',{name:'초대선수 배정'})).toBeNull();
 fireEvent.click(within(dialog).getByRole('button',{name:'미신청 회원'}));
 expect(within(dialog).getByRole('button',{name:'초대선수 배정'})).toBeTruthy();
});

it('keeps the selected-seat tile after release, then closes on reassignment',()=>{
 const assigned={teams:[{id:'A',title:'A팀',players:[{memberId:'a',slotId:'s',assignedPosition:'S' as const}]},{id:'B',title:'B팀',players:[]},{id:'C',title:'C팀',players:[]}]};
 render(<SessionAllocation {...props} baseline={assigned}/>);
 const board=screen.getByRole('region',{name:'팀별 포지션 배정표'});
 fireEvent.click(within(board).getByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'}));
 const tile=within(screen.getByRole('dialog')).getByRole('group',{name:'선택된 선수 자리'});
 expect(tile.textContent).toContain('김도윤');
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'해제'}));
 const picker=screen.getByRole('dialog');
 expect(within(picker).getByRole('group',{name:'선택된 선수 자리'})).toBe(tile);
 expect(tile.textContent).toContain('선수를 배정하면 여기에 표시됩니다.');
 expect(within(picker).queryByRole('button',{name:'해제'})).toBeNull();
 expect(within(picker).getByRole('button',{name:'이서준 배정'})).toBeTruthy();
 fireEvent.click(within(picker).getByRole('button',{name:'이서준 배정'}));
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(within(board).getByRole('button',{name:'A팀 세터 이서준 히어로즈 교체'})).toBeTruthy();
});

it('keeps an empty selected-seat tile when a release is followed by closing the picker',()=>{
 const assigned={teams:[{id:'A',title:'A팀',players:[{memberId:'a',slotId:'s',assignedPosition:'S' as const}]},{id:'B',title:'B팀',players:[]},{id:'C',title:'C팀',players:[]}]};
 render(<SessionAllocation {...props} baseline={assigned}/>);
 const board=screen.getByRole('region',{name:'팀별 포지션 배정표'});
 fireEvent.click(within(board).getByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'해제'}));
 expect(within(screen.getByRole('dialog')).getByRole('group',{name:'선택된 선수 자리'}).textContent).toContain('선수를 배정하면 여기에 표시됩니다.');
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'선수 선택 닫기'}));
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(within(board).getByRole('button',{name:'A팀 세터 선수 배정'})).toBeTruthy();
});

it('closes the picker after a confirmed unregistered assignment',()=>{
 render(<SessionAllocation {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'A팀 세터 선수 배정'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'미신청 회원'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'초대선수 배정'}));
 fireEvent.click(within(screen.getByRole('dialog',{name:'신청하지 않은 회원을 배정할까요?'})).getByRole('button',{name:'확인 후 배정'}));
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(screen.getByRole('button',{name:'A팀 세터 초대선수 런업 교체'})).toBeTruthy();
});

it('allows deleting an auto-created row after confirmation and asks before assigning an unregistered member',()=>{
 const applicants=Array.from({length:28},(_,index)=>({...people[index%2],id:'p'+index,name:'신청자'+index}));
 render(<SessionAllocation {...props} baseline={{teams:['A','B','C','D'].map(id=>({id,title:id+'팀',players:[]}))}} people={[...applicants,people[2]]}/>);
 const board=screen.getByRole('region',{name:'팀별 포지션 배정표'});
 expect(within(board).getByText('추가 1')).toBeTruthy();
 expect(within(board).getByRole('button',{name:'추가 선수 1줄 삭제'})).toBeTruthy();
 fireEvent.click(within(board).getByRole('button',{name:'추가 선수 1줄 삭제'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'줄 삭제'}));
 expect(within(board).queryByText('추가 1')).toBeNull();
 fireEvent.click(within(board).getByRole('button',{name:'A팀 세터 선수 배정'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'미신청 회원'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'초대선수 배정'}));
 expect(screen.getByText('신청하지 않은 회원을 배정할까요?')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'취소'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'선수 선택 닫기'}));
 expect(within(board).getByRole('button',{name:'A팀 세터 선수 배정'})).toBeTruthy();
});

it('deletes an occupied additional row after confirmation and returns its player to the pool',()=>{
 render(<SessionAllocation {...props}/>);
 const board=screen.getByRole('region',{name:'팀별 포지션 배정표'});
 fireEvent.click(screen.getByRole('button',{name:'추가 선수 줄'}));
 fireEvent.click(within(board).getByRole('button',{name:'A팀 라이트 2 선수 배정'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'김도윤 배정'}));
 fireEvent.click(within(board).getByRole('button',{name:'추가 선수 1줄 삭제'}));
 let dialog=screen.getByRole('dialog',{name:'추가 선수 1줄을 삭제할까요?'});
 expect(within(dialog).getByText(/배정된 선수 1명/)).toBeTruthy();
 fireEvent.click(within(dialog).getByRole('button',{name:'취소'}));
 expect(within(board).getByRole('button',{name:'A팀 라이트 2 김도윤 뉴배동 교체'})).toBeTruthy();
 fireEvent.click(within(board).getByRole('button',{name:'추가 선수 1줄 삭제'}));
 dialog=screen.getByRole('dialog',{name:'추가 선수 1줄을 삭제할까요?'});
 fireEvent.click(within(dialog).getByRole('button',{name:'줄 삭제'}));
 expect(within(board).queryByText('추가 1')).toBeNull();
 fireEvent.click(within(board).getByRole('button',{name:'A팀 세터 선수 배정'}));
 expect(within(screen.getByRole('dialog')).getByRole('button',{name:'김도윤 배정'})).toBeTruthy();
});

it('keeps a deliberately removed auto row gone after saving and reopening with 28 applicants',async()=>{
 const applicants=Array.from({length:28},(_,index)=>({...people[index%2],id:'p'+index,name:'신청자'+index}));
 const fourTeams={teams:['A','B','C','D'].map(id=>({id,title:id+'팀',players:[]}))};
 const onSave=vi.fn().mockResolvedValue(undefined);
 const {unmount}=render(<SessionAllocation {...props} baseline={fourTeams} people={applicants} onSave={onSave}/>);
 const board=screen.getByRole('region',{name:'팀별 포지션 배정표'});
 expect(within(board).getByRole('button',{name:'추가 선수 1줄 삭제'})).toBeTruthy();
 fireEvent.click(within(board).getByRole('button',{name:'추가 선수 1줄 삭제'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'줄 삭제'}));
 fireEvent.click(screen.getByRole('button',{name:'저장'}));
 await screen.findByText('저장됨');
 expect(onSave.mock.calls[0][0].extraRows).toBe(0);
 const saved=onSave.mock.calls[0][0];
 unmount();
 render(<SessionAllocation {...props} baseline={saved} people={applicants}/>);
 expect(screen.getByRole('region',{name:'팀별 포지션 배정표'}).querySelector('.real-board-row.extra')).toBeNull();
});

it('opens the matching board picker from a position in court view without changing tabs',()=>{
 render(<SessionAllocation {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'코트'}));
 fireEvent.click(screen.getByRole('button',{name:'B팀 세터 배정'}));
 expect(screen.getByRole('dialog',{name:/B팀 · 세터 배정/})).toBeTruthy();
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'선수 선택 닫기'}));
 expect(screen.getByRole('button',{name:'코트'}).getAttribute('aria-pressed')).toBe('true');
});

it('uses one editor with row and court tabs and the same picker without a preview navigation step',()=>{
 render(<SessionAllocation {...props}/>);
 expect(screen.getByRole('button',{name:'행'}).getAttribute('aria-pressed')).toBe('true');
 expect(screen.queryByRole('button',{name:'미리보기'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'코트'}));
 expect(screen.getByRole('button',{name:'코트'}).getAttribute('aria-pressed')).toBe('true');
 fireEvent.click(screen.getByRole('button',{name:'A팀 세터 배정'}));
 const picker=screen.getByRole('dialog',{name:/A팀 · 세터 배정/});
 fireEvent.click(within(picker).getByRole('button',{name:'김도윤 배정'}));
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(screen.getByRole('button',{name:/A팀 세터 김도윤/})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'행'}));
 expect(screen.getByRole('region',{name:'팀별 포지션 배정표'})).toBeTruthy();
 expect(screen.getByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'})).toBeTruthy();
});

it('preserves optional rows and assignments when saving from the court tab',async()=>{
 const onSave=vi.fn().mockResolvedValue(undefined);
 render(<SessionAllocation {...props} onSave={onSave}/>);
 fireEvent.click(screen.getByRole('button',{name:'추가 선수 줄'}));
 fireEvent.click(screen.getByRole('button',{name:'코트'}));
 expect(screen.getByRole('button',{name:'A팀 추가 선수 라이트 2 배정'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'저장'}));
 await screen.findByText('저장됨');
 expect(onSave.mock.calls[0][0].extraRows).toBe(1);
 fireEvent.click(screen.getByRole('button',{name:'행'}));
 expect(screen.getByRole('button',{name:'A팀 라이트 2 선수 배정'})).toBeTruthy();
});

it('manages shared extra rows and teams directly from the court view',()=>{
 render(<SessionAllocation {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'코트'}));
 expect(screen.queryByRole('group',{name:'추가 선수 줄 관리'})).toBeNull();
 expect(screen.getAllByRole('button',{name:'모든 팀에 추가 선수 자리 한 줄 추가'})).toHaveLength(3);
 fireEvent.click(screen.getAllByRole('button',{name:'모든 팀에 추가 선수 자리 한 줄 추가'})[1]);
 expect(screen.queryByRole('dialog')).toBeNull();
 for(const id of ['A','B','C'])expect(screen.getByRole('button',{name:`${id}팀 추가 선수 라이트 2 배정`})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'팀 추가'}));
 expect(screen.getByRole('button',{name:'D팀 추가 선수 라이트 2 배정'})).toBeTruthy();
 expect(screen.getByRole('button',{name:'팀 추가'})).toHaveProperty('disabled',true);
 fireEvent.click(screen.getAllByRole('button',{name:'전체 팀 추가 선수 1줄 삭제'})[1]);
 fireEvent.click(within(screen.getByRole('dialog',{name:'추가 선수 1줄을 삭제할까요?'})).getByRole('button',{name:'줄 삭제'}));
 expect(screen.queryByRole('button',{name:'A팀 추가 선수 라이트 2 배정'})).toBeNull();
 expect(screen.queryByRole('button',{name:'D팀 추가 선수 라이트 2 배정'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'D팀 삭제'}));
 fireEvent.click(within(screen.getByRole('dialog',{name:'D팀을 삭제할까요?'})).getByRole('button',{name:'팀 삭제'}));
 expect(screen.queryByRole('heading',{name:'D팀'})).toBeNull();
});

it('opens the first available candidate status when a court seat is chosen after applicants are placed',()=>{
 const waitlisted:Candidate={id:'w',name:'대기선수',club:'뉴배동',position:'세터',secondary:'센터',status:'대기자'};
 render(<SessionAllocation {...props} people={[people[0],waitlisted]}/>);
 fireEvent.click(screen.getByRole('button',{name:'A팀 세터 선수 배정'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'김도윤 배정'}));
 fireEvent.click(screen.getByRole('button',{name:'코트'}));
 fireEvent.click(screen.getByRole('button',{name:'B팀 세터 배정'}));
 expect(within(screen.getByRole('dialog')).getByRole('button',{name:/^대기자/}).getAttribute('aria-pressed')).toBe('true');
});

it('hides wholly empty optional rows after publication while keeping occupied optional rows',()=>{
 const emptyExtra={teams:baseline.teams,extraRows:1};
 const {unmount}=render(<SessionAllocation {...props} baseline={emptyExtra} readOnly/>);
 fireEvent.click(screen.getByRole('button',{name:'행'}));
 expect(screen.getByRole('region',{name:'팀별 포지션 배정표'}).querySelector('.real-board-row.extra')).toBeNull();
 unmount();
 const occupied={teams:[{id:'A',title:'A팀',players:[{memberId:'a',slotId:'op2',assignedPosition:'OP' as const}]},...baseline.teams.slice(1)],extraRows:1};
 render(<SessionAllocation {...props} baseline={occupied} readOnly/>);
 fireEvent.click(screen.getByRole('button',{name:'행'}));
 expect(screen.getByRole('region',{name:'팀별 포지션 배정표'}).querySelector('.real-board-row.extra')).toBeTruthy();
});

it('returns keyboard focus to the selected seat after closing the shared picker',async()=>{
 render(<SessionAllocation {...props}/>);
 const seat=screen.getByRole('button',{name:'A팀 세터 선수 배정'});
 fireEvent.click(seat);
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'선수 선택 닫기'}));
 await waitFor(()=>expect(document.activeElement).toBe(seat));
 fireEvent.click(screen.getByRole('button',{name:'코트'}));
 const courtSeat=screen.getByRole('button',{name:'B팀 세터 배정'});
 fireEvent.click(courtSeat);
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'선수 선택 닫기'}));
 await waitFor(()=>expect(document.activeElement).toBe(courtSeat));
});
