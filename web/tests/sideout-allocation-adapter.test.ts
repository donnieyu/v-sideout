import {it,expect} from 'vitest';
import {toBoard,fromBoard} from '../lib/sideout/allocation-adapter';
import type {LineupRecord} from '../lib/sideout/read-model';
it('roundtrips every fixed and extra slot, IDs and assigned position without profile substitution',()=>{
 const lineup:LineupRecord={teams:[{id:'C',title:'C팀',players:[{memberId:'m1',slotId:'s',assignedPosition:'S'},{memberId:'m2',slotId:'op2',assignedPosition:'OP'},{memberId:'m3',slotId:'bench-9',assignedPosition:'MB'}]}]};
 const board=toBoard(lineup);expect(board[0].slots).toHaveLength(8);expect(board[0].slots[2].playerId).toBe('m1');expect(board[0].slots[6].playerId).toBe('m2');expect(fromBoard(board,[])).toEqual(lineup);
});
it('starts three empty teams but preserves saved one-team and intermediate IDs',()=>{
 expect(toBoard({teams:[]})).toHaveLength(3);expect(toBoard({teams:[{id:'D',title:'D팀',players:[]}]}).map(t=>t.id)).toEqual(['D']);
});
it('roundtrips an explicitly removed additional row without recreating it from applicant capacity',()=>{
 const lineup:LineupRecord={extraRows:0,teams:['A','B','C','D'].map(id=>({id,title:id+'팀',players:[]}))};
 const board=toBoard(lineup);
 expect(board.every(team=>team.slots.length===6)).toBe(true);
 expect(fromBoard(board,[],0)).toEqual(lineup);
 const withRow={...lineup,extraRows:1};
 expect(toBoard(withRow).every(team=>team.slots.length===7)).toBe(true);
});
it('requires a known assignment role for a newly assigned extra slot and never silently loses a player',()=>{
 const board=toBoard({teams:[]});board[0].slots.push({id:'bench-1',position:'교대',playerId:'unknown'});expect(()=>fromBoard(board,[])).toThrow();
});

import {autoFillBoard} from '../components/sideout/allocation/allocation-ab-model';
import type {Candidate} from '../components/sideout/allocation/position-board-model';
it('auto allocation prioritizes an applicant over a primary-position waiter and ignores unknown profiles',()=>{
 const board=toBoard({teams:[{id:'A',title:'A팀',players:[]}]});board[0].slots.forEach(s=>{if(s.id!=='2')s.playerId='filled-'+s.id});
 const people:Candidate[]=[{id:'waiting',name:'가',club:'모임',position:'세터',secondary:'센터',status:'대기자'},{id:'applicant',name:'나',club:'모임',position:'센터',secondary:'세터',status:'신청자'},{id:'unknown',name:'다',club:'모임',position:'미등록',secondary:'미등록',status:'신청자'}];
 expect(autoFillBoard(board,people)[0].slots[2].playerId).toBe('applicant');
});
