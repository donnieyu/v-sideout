import type {BoardTeam,Candidate} from './position-board-model'

/** Explain the current board, rather than inferring a reason from a previous run. */
export function explainUnassignedApplicants(board:BoardTeam[],people:Candidate[]){
 const slots=board.flatMap(team=>team.slots)
 const placed=new Set(slots.flatMap(slot=>slot.playerId?[slot.playerId]:[]))
 const unassigned=people.filter(person=>person.status==='신청자'&&person.active!==false&&!placed.has(person.id))
 const missingProfile=unassigned.filter(person=>person.position==='미등록')
 const registered=unassigned.filter(person=>person.position!=='미등록')
 const hasVacancy=slots.some(slot=>!slot.playerId)
 const occupiedByOthers=slots.filter(slot=>slot.playerId&&people.find(person=>person.id===slot.playerId)?.status!=='신청자').length
 return {
  remaining:unassigned.length,
  missingProfile,
  noCapacity:hasVacancy?[]:registered,
  unfilledDespiteVacancy:hasVacancy?registered:[],
  occupiedByOthers,
 }
}
