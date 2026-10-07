import {it,expect} from 'vitest';
import {createTeam,adjustExtraSlots,addBenchSlot,addBenchRow,alignBenchRows,canRemoveBenchRow,removeEmptyBenchRow,canRemoveEmptyTeam,saveBoard,type Candidate} from '../components/sideout/allocation/position-board-model';
import {autoFillBoard,nextVacant} from '../components/sideout/allocation/allocation-ab-model';
import {fromBoard,toBoard} from '../lib/sideout/allocation-adapter';
const board=(teams=3)=>Array.from({length:teams},(_,i)=>createTeam(String.fromCharCode(65+i)));
it.each([[18,3,0],[19,3,1],[21,3,1],[22,3,2],[24,3,2],[24,4,0],[25,4,1],[28,4,1]])('provides %i applicants/%i teams exactly %i default extra seats per team',(n,t,extra)=>{
 const result=adjustExtraSlots(board(t),n);expect(result.map(t=>t.slots.length)).toEqual(Array(t).fill(6+extra));expect(result.every(t=>t.slots.slice(0,6).map(s=>s.id).join(',')==='0,1,2,3,4,5')).toBe(true);
});
it('retains occupied and manually added extras on capacity decrease, clears only empty manual seats on save',()=>{
 let result=adjustExtraSlots(board(),21);result[0].slots[6].playerId='saved';result=addBenchSlot(result,'B');
 result=adjustExtraSlots(result,18);expect(result[0].slots[6].playerId).toBe('saved');expect(result[1].slots.slice(6)).toHaveLength(1);expect(result[2].slots).toHaveLength(6);
 result=adjustExtraSlots(saveBoard(result),18);expect(result[0].slots[6].playerId).toBe('saved');expect(result[1].slots).toHaveLength(6);
});
it('first manual extra is right2, and hidden right2 is not a continuous destination',()=>{
 let result=adjustExtraSlots(board(),18);for(const t of result)t.slots[5].playerId='filled'+t.id;expect(nextVacant(result,'라이트')).toBeNull();
 result=addBenchSlot(result,'B');expect(result[1].slots[6]).toMatchObject({id:'6',position:'라이트',extraOrigin:'manual'});expect(nextVacant(result,'라이트')).toEqual({teamId:'B',slotId:'6'});
});
it('adds a shared extra row, aligns a legacy uneven board, and deletes only an empty dispensable row',()=>{
 let result=adjustExtraSlots(board(),18);result=addBenchSlot(result,'B');
 result=alignBenchRows(result);expect(result.map(team=>team.slots.length)).toEqual([7,7,7]);
 result=addBenchRow(result);expect(result.map(team=>team.slots.length)).toEqual([8,8,8]);
 expect(canRemoveBenchRow(result,0,19)).toBe(true);
 result=removeEmptyBenchRow(result,0,19);expect(result.map(team=>team.slots.length)).toEqual([7,7,7]);
 expect(canRemoveBenchRow(result,0,22)).toBe(false);
 result[1].slots[6].playerId='occupied';expect(canRemoveBenchRow(result,0,18)).toBe(false);
 expect(removeEmptyBenchRow(result,0,18)).toBe(result);
});
it('keeps team deletion local to an empty column with enough remaining capacity',()=>{
 const result=adjustExtraSlots(board(4),18);
 expect(canRemoveEmptyTeam(result,'D',18)).toBe(true);
 expect(canRemoveEmptyTeam(result,'D',19)).toBe(false);
 result[3].slots[0].playerId='occupied';expect(canRemoveEmptyTeam(result,'D',18)).toBe(false);
});
it('auto fills 24 applicants into 3 teams using general extras and roundtrips their positions',()=>{
 const positions:Candidate['position'][]=['세터','레프트','레프트','센터','센터','라이트','라이트','센터'];const people:Candidate[]=Array.from({length:24},(_,i)=>({id:'p'+i,name:'선수'+i,club:'시험',status:'신청자',position:positions[i%8],secondary:'레프트'}));
 const result=autoFillBoard(adjustExtraSlots(board(),24),people);expect(new Set(result.flatMap(t=>t.slots.flatMap(s=>s.playerId?[s.playerId]:[]))).size).toBe(24);
 expect(result.every(team=>team.slots.slice(0,6).every(slot=>slot.playerId))).toBe(true);
 const payload=fromBoard(result,people);expect(fromBoard(toBoard(payload),people)).toEqual(payload);
});
it('fills every court position before placing a remaining applicant in an extra seat',()=>{
 const profiles:Candidate['position'][]=['세터','세터','레프트','센터','센터','라이트'];
 const people:Candidate[]=profiles.map((position,i)=>({id:`p${i}`,name:`선수${i}`,club:'시험',status:'신청자',position,secondary:position==='세터'?'라이트':'미등록'}));
 const result=autoFillBoard([createTeam('A')],people);
 expect(result[0].slots.slice(0,6).every(slot=>slot.playerId)).toBe(true);
 expect(result[0].slots[6].playerId).toBeNull();
 expect(new Set(result[0].slots.slice(0,6).map(slot=>slot.playerId))).toEqual(new Set(people.map(person=>person.id)));
});
it('uses only the 18 court seats for 18 applicants even when setters outnumber setter seats',()=>{
 const profiles:Candidate['position'][]=['세터','세터','레프트','센터','센터','라이트'];
 const people:Candidate[]=Array.from({length:18},(_,i)=>({id:`p${i}`,name:`선수${i}`,club:'시험',status:'신청자',position:profiles[i%6],secondary:profiles[i%6]==='세터'?'라이트':'미등록'}));
 const result=autoFillBoard(board(),people);
 expect(result.every(team=>team.slots.slice(0,6).every(slot=>slot.playerId))).toBe(true);
 expect(result.every(team=>!team.slots[6].playerId)).toBe(true);
});
it('moves an earlier extra assignment into a vacant court seat when auto fill is run again',()=>{
 const people:Candidate[]=[{id:'setter',name:'세터선수',club:'시험',status:'신청자',position:'세터',secondary:'라이트'}];
 const before=[createTeam('A')];before[0].slots[6].playerId='setter';
 const result=autoFillBoard(before,people);
 expect(result[0].slots[2].playerId).toBe('setter');
 expect(result[0].slots[6].playerId).toBeNull();
});
