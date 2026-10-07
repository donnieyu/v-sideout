// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {SessionAllocation} from '../components/sideout/allocation/session-allocation';
import type {Candidate} from '../components/sideout/allocation/position-board-model';

vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
afterEach(cleanup);
const people:Candidate[]=[
 {id:'a',name:'김도윤',club:'뉴배동',position:'세터',secondary:'라이트',status:'신청자'},
 {id:'b',name:'이서준',club:'히어로즈',position:'센터',secondary:'라이트',status:'신청자'},
];
const baseline={teams:['A','B','C'].map(id=>({id,title:id+'팀',players:[]}))};
const props={title:'시험',baseline,people,saved:true,onSave:vi.fn(),onCancel:vi.fn(),onDirty:vi.fn()};
const board=()=>screen.getByRole('region',{name:'팀별 포지션 배정표'});
const picker=()=>screen.getByRole('dialog',{name:/배정|교체/});

it('edits the same seat in the row and court views and saves without leaving the editor',async()=>{
 const onSave=vi.fn().mockResolvedValue(undefined);
 render(<SessionAllocation {...props} onSave={onSave}/>);
 expect(screen.getByRole('button',{name:'행'}).getAttribute('aria-pressed')).toBe('true');
 fireEvent.click(within(board()).getByRole('button',{name:'A팀 세터 선수 배정'}));
 fireEvent.click(within(picker()).getByRole('button',{name:'김도윤 배정'}));
 expect(screen.queryByRole('dialog')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'코트'}));
 expect(screen.getByRole('button',{name:'A팀 세터 김도윤 뉴배동'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'저장'}));
 await screen.findByText('저장됨');
 expect(onSave.mock.calls[0][0].teams[0].players[0]).toEqual({memberId:'a',slotId:'s',assignedPosition:'S'});
 expect(screen.getByRole('button',{name:'코트'}).getAttribute('aria-pressed')).toBe('true');
 expect(screen.queryByRole('button',{name:'미리보기'})).toBeNull();
});

it('keeps a failed save editable and prevents publishing a two-team draft',async()=>{
 const onSave=vi.fn().mockRejectedValue(new Error('충돌: 최신 정보를 확인해 주세요.'));
 render(<SessionAllocation {...props} baseline={{teams:baseline.teams.slice(0,2)}} onSave={onSave}/>);
 expect((screen.getByRole('button',{name:'공개'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'저장'}));
 await screen.findByText('충돌: 최신 정보를 확인해 주세요.');
 expect(board()).toBeTruthy();
});

it('retains an inactive assigned member until released and never offers them again',()=>{
 const assigned={teams:[{id:'A',title:'A팀',players:[{memberId:'a',slotId:'s',assignedPosition:'S' as const}]},...baseline.teams.slice(1)]};
 render(<SessionAllocation {...props} baseline={assigned} people={[{...people[0],active:false}]}/>);
 fireEvent.click(within(board()).getByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'}));
 fireEvent.click(within(picker()).getByRole('button',{name:'해제'}));
 expect(within(picker()).queryByRole('button',{name:'김도윤 배정'})).toBeNull();
 fireEvent.click(within(picker()).getByRole('button',{name:'선수 선택 닫기'}));
 expect(within(board()).getByRole('button',{name:'A팀 세터 선수 배정'})).toBeTruthy();
});

it('adds an optional row to all teams and keeps it after switching tabs and saving',async()=>{
 const onSave=vi.fn().mockResolvedValue(undefined);
 render(<SessionAllocation {...props} onSave={onSave}/>);
 fireEvent.click(screen.getByRole('button',{name:'추가 선수 줄'}));
 for(const id of ['A','B','C'])expect(within(board()).getByRole('button',{name:`${id}팀 라이트 2 선수 배정`})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'코트'}));
 expect(screen.getByRole('button',{name:'B팀 추가 선수 라이트 2 배정'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'저장'}));
 await screen.findByText('저장됨');
 expect(onSave.mock.calls[0][0].extraRows).toBe(1);
 fireEvent.click(screen.getByRole('button',{name:'행'}));
 expect(within(board()).getByRole('button',{name:'B팀 라이트 2 선수 배정'})).toBeTruthy();
});

it('keeps auto placement a no-op when all applicants are assigned',()=>{
 const assigned={teams:[
  {id:'A',title:'A팀',players:[{memberId:'a',slotId:'s',assignedPosition:'S' as const}]},
  {id:'B',title:'B팀',players:[{memberId:'b',slotId:'mb1',assignedPosition:'MB' as const}]},
  {id:'C',title:'C팀',players:[]},
 ]};
 render(<SessionAllocation {...props} baseline={assigned} people={[...people,{...people[0],id:'w',name:'대기선수',status:'대기자'}]}/>);
 fireEvent.click(screen.getByRole('button',{name:'자동 배치'}));
 expect(screen.getByRole('dialog',{name:'신청자를 모두 배정했어요'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'확인'}));
 expect(within(board()).getByRole('button',{name:'C팀 세터 선수 배정'})).toBeTruthy();
});

it('clears only player assignments after confirmation and saves the unchanged team structure',async()=>{
 const onSave=vi.fn().mockResolvedValue(undefined);
 const assigned={teams:[
  {id:'A',title:'파랑팀',players:[{memberId:'a',slotId:'s',assignedPosition:'S' as const},{memberId:'u',slotId:'op2',assignedPosition:'OP' as const}]},
  {id:'B',title:'B팀',players:[{memberId:'b',slotId:'mb1',assignedPosition:'MB' as const}]},
  {id:'C',title:'C팀',players:[]},
  {id:'D',title:'D팀',players:[]},
 ],extraRows:1};
 const candidates=[...people,{id:'u',name:'초대선수',club:'런업',position:'라이트' as const,secondary:'센터' as const,status:'미신청 회원' as const}];
 render(<SessionAllocation {...props} baseline={assigned} people={candidates} onSave={onSave}/>);
 fireEvent.click(screen.getByRole('button',{name:'배정 초기화'}));
 const dialog=screen.getByRole('dialog',{name:'선수 배정을 모두 초기화할까요?'});
 expect(within(dialog).getByText(/배정된 선수 3명/)).toBeTruthy();
 fireEvent.click(within(dialog).getByRole('button',{name:'취소'}));
 expect(within(board()).getByRole('button',{name:'파랑팀 세터 김도윤 뉴배동 교체'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'배정 초기화'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'배정 3명 해제'}));
 expect(within(board()).getByRole('button',{name:'파랑팀 세터 선수 배정'})).toBeTruthy();
 expect(within(board()).getByRole('button',{name:'파랑팀 라이트 2 선수 배정'})).toBeTruthy();
 expect(within(board()).getByRole('button',{name:'D팀 세터 선수 배정'})).toBeTruthy();
 expect((screen.getByRole('button',{name:'공개'}) as HTMLButtonElement).disabled).toBe(true);
 expect(onSave).not.toHaveBeenCalled();
 fireEvent.click(within(board()).getByRole('button',{name:'파랑팀 세터 선수 배정'}));
 expect(within(picker()).getByRole('button',{name:'김도윤 배정'})).toBeTruthy();
 fireEvent.click(within(picker()).getByRole('button',{name:'선수 선택 닫기'}));
 fireEvent.click(screen.getByRole('button',{name:'저장'}));
 await screen.findByText('저장됨');
 expect(onSave.mock.calls[0][0].teams.map((team:{title:string;players:unknown[]})=>[team.title,team.players.length])).toEqual([['파랑팀',0],['B팀',0],['C팀',0],['D팀',0]]);
 expect(onSave.mock.calls[0][0].extraRows).toBe(1);
});

it('disables assignment reset when the board is empty and hides it after publication',()=>{
 const view=render(<SessionAllocation {...props}/>);
 expect((screen.getByRole('button',{name:'배정 초기화'}) as HTMLButtonElement).disabled).toBe(true);
 view.unmount();
 render(<SessionAllocation {...props} readOnly/>);
 expect(screen.queryByRole('button',{name:'배정 초기화'})).toBeNull();
});

it('keeps published court and row views read-only and requires confirmation to withdraw',async()=>{
 const onUnpublish=vi.fn().mockResolvedValue(undefined);
 const published={teams:[{id:'A',title:'A팀',players:[{memberId:'a',slotId:'s',assignedPosition:'S' as const}]},...baseline.teams.slice(1)]};
 render(<SessionAllocation {...props} baseline={published} readOnly onUnpublish={onUnpublish}/>);
 expect((screen.getByRole('button',{name:'저장'}) as HTMLButtonElement).disabled).toBe(true);
 expect(screen.queryByRole('button',{name:'자동 배치'})).toBeNull();
 expect(screen.queryByRole('button',{name:'팀 추가'})).toBeNull();
 expect(screen.getByRole('button',{name:'A팀 세터 김도윤 뉴배동'}).hasAttribute('disabled')).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'행'}));
 expect((screen.getByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'}) as HTMLButtonElement).disabled).toBe(true);
 expect(screen.queryByRole('button',{name:'선수 선택 닫기'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'공개 취소'}));
 expect(screen.getByRole('dialog')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'공개 유지'}));
 expect(onUnpublish).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'공개 취소'}));
 fireEvent.click(screen.getByRole('dialog').querySelector('button:last-child')!);
 await waitFor(()=>expect(onUnpublish).toHaveBeenCalledTimes(1));
});

it('renames a draft team in the row view and preserves its assignment',async()=>{
 const onSave=vi.fn().mockResolvedValue(undefined);
 const assigned={teams:[{id:'A',title:'A팀',players:[{memberId:'a',slotId:'s',assignedPosition:'S' as const}]},...baseline.teams.slice(1)]};
 render(<SessionAllocation {...props} baseline={assigned} onSave={onSave}/>);
 fireEvent.click(screen.getByRole('button',{name:'A팀 이름 수정'}));
 fireEvent.change(screen.getByRole('textbox',{name:'팀 이름'}),{target:{value:'  블루 팀  '}});
 fireEvent.click(screen.getByRole('button',{name:'적용'}));
 fireEvent.click(screen.getByRole('button',{name:'코트'}));
 expect(screen.getByRole('button',{name:'블루 팀 세터 김도윤 뉴배동'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'저장'}));
 await screen.findByText('저장됨');
 expect(onSave.mock.calls[0][0].teams[0].title).toBe('블루 팀');
});

it('filters unregistered members within the shared picker and confirms their assignment',()=>{
 const candidates:Candidate[]=[...people,
  {id:'u1',name:'찾을회원',club:'모임하나',position:'세터',secondary:'라이트',status:'미신청 회원'},
  {id:'u2',name:'다른회원',club:'모임둘',position:'센터',secondary:'레프트',status:'미신청 회원'},
 ];
 render(<SessionAllocation {...props} people={candidates}/>);
 fireEvent.click(within(board()).getByRole('button',{name:'A팀 세터 선수 배정'}));
 fireEvent.click(within(picker()).getByRole('button',{name:'미신청 회원'}));
 expect(within(picker()).getByRole('button',{name:'찾을회원 배정'})).toBeTruthy();
 fireEvent.click(within(picker()).getByRole('button',{name:'미신청 회원 필터'}));
 fireEvent.click(screen.getByRole('checkbox',{name:'모임하나'}));
 expect(within(picker()).queryByRole('button',{name:'다른회원 배정'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'필터 닫기'}));
 fireEvent.click(within(picker()).getByRole('button',{name:'찾을회원 배정'}));
 expect(screen.getByRole('dialog',{name:'신청하지 않은 회원을 배정할까요?'})).toBeTruthy();
});

it('allows empty candidate tabs and distinguishes absent from fully assigned applicants',()=>{
 const view=render(<SessionAllocation {...props} people={[]}/>);
 fireEvent.click(within(board()).getByRole('button',{name:'A팀 세터 선수 배정'}));
 fireEvent.click(within(picker()).getByRole('button',{name:/^신청자\s*0$/}));
 expect(within(picker()).getByText('신청자가 없어요.')).toBeTruthy();
 for(const name of [/^대기자\s*0$/,'미신청 회원',/^신청자\s*0$/]){
  const tab=within(picker()).getByRole('button',{name});fireEvent.click(tab);expect(tab.getAttribute('aria-pressed')).toBe('true');
 }
 fireEvent.click(within(picker()).getByRole('button',{name:'선수 선택 닫기'}));
 view.unmount();
 const assigned={teams:[{id:'A',title:'A팀',players:[{memberId:'a',slotId:'s',assignedPosition:'S' as const}]},...baseline.teams.slice(1)]};
 render(<SessionAllocation {...props} baseline={assigned} people={[people[0]]}/>);
 fireEvent.click(within(board()).getByRole('button',{name:'B팀 세터 선수 배정'}));
 expect(within(picker()).getByText('신청자를 모두 배정했어요.')).toBeTruthy();
 expect(within(picker()).getByRole('button',{name:'미신청 회원 목록 확인'})).toBeTruthy();
});

it('offers auto fill to repair an extra assignment while a court position is empty',()=>{
 const assigned={teams:[{id:'A',title:'A팀',players:[{memberId:'a',slotId:'op2',assignedPosition:'S' as const}]},...baseline.teams.slice(1)]};
 render(<SessionAllocation {...props} baseline={assigned} people={[people[0]]}/>);
 fireEvent.click(screen.getByRole('button',{name:'자동 배치'}));
 const confirm=screen.getByRole('dialog',{name:'빈자리를 자동 배치할까요?'});
 fireEvent.click(within(confirm).getByRole('button',{name:'자동 배치'}));
 expect(screen.getByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'})).toBeTruthy();
});

it('cancels without saving',()=>{
 const onCancel=vi.fn(),onSave=vi.fn();
 render(<SessionAllocation {...props} onCancel={onCancel} onSave={onSave}/>);
 fireEvent.click(screen.getByRole('button',{name:'취소'}));
 expect(onCancel).toHaveBeenCalledTimes(1);
 expect(onSave).not.toHaveBeenCalled();
});
