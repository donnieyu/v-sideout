import {addBenchRow,adjustExtraSlots,createTeam,type BoardTeam,type Candidate} from '@/components/sideout/allocation/position-board-model';
import type {LineupRecord,Position} from './read-model';
import type {EditorPerson} from './team-editor';
export const positionNames={OH:'레프트',OP:'라이트',MB:'센터',S:'세터'} as const;
const code:Record<string,Position>={레프트:'OH',라이트:'OP',센터:'MB',세터:'S'};
const ids=['oh1','mb1','s','oh2','mb2','op1','op2'];
export const editorCandidates=(people:EditorPerson[]):Candidate[]=>people.map(p=>({...p,position:p.position?positionNames[p.position]:'미등록',secondary:p.secondary?positionNames[p.secondary]:'미등록'}));
export function toBoard(lineup:LineupRecord):BoardTeam[]{
 if(!lineup.teams.length)return ['A','B','C'].map(id=>createTeam(id));
 let board=lineup.teams.map(t=>{const team={...createTeam(t.id),title:t.title};for(const p of t.players){const index=ids.indexOf(p.slotId);if(index>=0)Object.assign(team.slots[index],{playerId:p.memberId,...(index===6?{extraOrigin:'manual' as const}:{})});else team.slots.push({id:p.slotId,position:'교대',extraOrigin:'manual',playerId:p.memberId,assignedPosition:p.assignedPosition,assignmentMemberId:p.memberId})}return team});
 if(lineup.extraRows!==undefined)board=adjustExtraSlots(board,0);
 while(Math.max(0,...board.map(team=>team.slots.length-6))<(lineup.extraRows??0))board=addBenchRow(board);
 return board;
}
export function fromBoard(board:BoardTeam[],people:Candidate[],extraRows?:number):LineupRecord{
 return {...(extraRows===undefined?{}:{extraRows}),teams:board.map(t=>({id:t.id,title:t.title,players:t.slots.flatMap(s=>{
  if(!s.playerId)return [];
  const assignedPosition=s.position==='교대'?(s.assignmentMemberId===s.playerId?s.assignedPosition:code[people.find(p=>p.id===s.playerId)?.position??'']):code[s.position];
  if(!assignedPosition)throw Error('추가 자리에 배정하려면 회원의 주포지션을 등록해 주세요.');
  return [{memberId:s.playerId,slotId:ids[Number(s.id)]??s.id,assignedPosition}];
 })}))};
}
