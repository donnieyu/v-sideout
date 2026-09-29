import {createTeam,type BoardTeam,type Candidate} from './position-board-model'
import {type Lineup,type Player} from './team-model'

export function lineupToBoard(lineup:Lineup):BoardTeam[]{
 return lineup.teams.map(team=>{
  const board={...createTeam(team.id),title:team.title}
  for(const player of team.players){
   if(player.slotId?.startsWith('bench-')){board.slots.push({id:player.slotId,position:'교대',playerId:player.id});continue}
   const slot=player.slotId?board.slots.find(s=>s.id===player.slotId&&!s.playerId):board.slots.find(s=>s.position===player.position&&!s.playerId)
   if(slot)slot.playerId=player.id
   else board.slots.push({id:`bench-${board.slots.length}`,position:'교대',playerId:player.id})
  }
  return board
 })
}
export function boardToLineup(board:BoardTeam[],people:Candidate[]):Lineup{
 return {teams:board.map(team=>({id:team.id,title:team.title,players:team.slots.flatMap(slot=>{
  const player=people.find(p=>p.id===slot.playerId)
  if(!player)return []
  return [{id:player.id,name:player.name,club:player.club,slotId:slot.id,position:slot.position==='교대'?player.position:slot.position}]
 })}))}
}
export function sessionCandidates(applicants:Player[],waiters:Player[],assigned:Player[],all:Player[]=[],profiles:Candidate[]=[]):Candidate[]{
 const seen=new Set<string>()
 return ([['신청자',applicants],['대기자',waiters],['미신청 회원',[...assigned,...all]]] as const).flatMap(([status,players])=>players.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true}).map(player=>({...player,position:profiles.find(p=>p.id===player.id)?.position??player.position,secondary:profiles.find(p=>p.id===player.id)?.secondary??player.position,status})))
}
