import type {Position} from '@/lib/sideout/read-model'
export type ProfilePosition='레프트'|'센터'|'라이트'|'세터'|'미등록'
export type Candidate={active?:boolean;id:string;name:string;club:string;position:ProfilePosition;secondary:ProfilePosition;status:'신청자'|'대기자'|'미신청 회원'}
export type CourtPosition='레프트'|'센터'|'라이트'|'세터'|'교대'
export type Slot={extraOrigin?:'auto'|'manual';id:string;position:CourtPosition;playerId:string|null;assignedPosition?:Position;assignmentMemberId?:string}
export type BoardTeam={id:string;title:string;slots:Slot[]}
export const createTeam=(id:string,names:(string|null)[]=[]):BoardTeam=>({id,title:id+'팀',slots:(['레프트','센터','세터','레프트','센터','라이트','라이트'] as CourtPosition[]).map((position,i)=>({id:String(i),position,playerId:names[i]??null}))})
export function fitsPosition(player:Candidate,position:CourtPosition,mode:string){return mode==='all'||position==='교대'||player.position===position||(['센터','라이트'].includes(position)&&player.position==='세터')||mode==='secondary'&&player.secondary===position}
export function placeOnBoard(board:BoardTeam[],teamId:string,slotId:string,playerId:string|null){if(!board.some(t=>t.id===teamId&&t.slots.some(s=>s.id===slotId)))return board;return board.map(t=>({...t,slots:t.slots.map(s=>({...s,playerId:t.id===teamId&&s.id===slotId?playerId:playerId&&s.playerId===playerId?null:s.playerId}))}))}
export const locatePlayer=(board:BoardTeam[],id:string)=>board.flatMap(team=>team.slots.map(slot=>({team,slot}))).find(x=>x.slot.playerId===id)

// The first six slots form the court; right slot 6 is the default extra player.
// Profile positions remain candidate information, separate from assigned roles.
export function courtSlots(team:BoardTeam):Slot[]{return [...team.slots]}
export function prioritizeCandidates(people:Candidate[],position?:CourtPosition){
 if(position!=='센터')return people
 const rank=(p:Candidate)=>p.position==='센터'?0:p.secondary==='센터'?1:p.position==='세터'?2:3
 return [...people].sort((a,b)=>rank(a)-rank(b))
}
export const requiredExtras=(applicants:number,teams:number)=>teams?Math.max(0,Math.ceil(applicants/teams)-6):0
/** Six court positions are stable. Optional seats are shared by every allocation view. */
export function adjustExtraSlots(board:BoardTeam[],applicants:number):BoardTeam[]{
 const required=requiredExtras(applicants,board.length)
 let changed=false
 const result=board.map(team=>{
  const extras=team.slots.slice(6),kept=extras.filter(s=>s.playerId||s.extraOrigin==='manual')
  for(const slot of extras)if(kept.length<required&&!kept.includes(slot))kept.push(slot)
  while(kept.length<required){
   const id=!kept.some(s=>s.id==='6')?'6':`bench-${1+Math.max(0,...kept.map(s=>s.id.startsWith('bench-')?Number(s.id.slice(6))||0:0))}`
   kept.push({id,position:id==='6'?'라이트':'교대',playerId:null,extraOrigin:'auto'})
  }
  kept.sort((a,b)=>Number(b.id==='6')-Number(a.id==='6'))
  if(kept.length===extras.length&&kept.every((s,i)=>s===extras[i]))return team
  changed=true;return {...team,slots:[...team.slots.slice(0,6),...kept]}
 })
 return changed?result:board
}
export function addBenchSlot(board:BoardTeam[],teamId:string):BoardTeam[]{
 return board.map(team=>{
  if(team.id!==teamId)return team
  if(!team.slots.some(s=>s.id==='6'))return {...team,slots:[...team.slots.slice(0,6),{id:'6',position:'라이트',playerId:null,extraOrigin:'manual'},...team.slots.slice(6)]}
  const next=1+Math.max(0,...team.slots.map(s=>s.id.startsWith('bench-')?Number(s.id.slice(6))||0:0))
  return {...team,slots:[...team.slots,{id:`bench-${next}`,position:'교대',playerId:null,extraOrigin:'manual'}]}
 })
}
/** Align optional seats from older drafts before displaying them as shared rows. */
export function alignBenchRows(board:BoardTeam[]):BoardTeam[]{
 const count=Math.max(0,...board.map(team=>team.slots.length-6))
 let result=board
 for(const team of board){
  for(let missing=team.slots.length-6;missing<count;missing++)result=addBenchSlot(result,team.id)
 }
 return result
}
export function addBenchRow(board:BoardTeam[]):BoardTeam[]{
 let result=alignBenchRows(board)
 for(const team of board)result=addBenchSlot(result,team.id)
 return result
}
export function canRemoveBenchRow(board:BoardTeam[],rowIndex:number,applicants:number){
 if(rowIndex<0||!board.length)return false
 const seats=board.map(team=>team.slots[rowIndex+6])
 return seats.every(seat=>seat&&!seat.playerId)&&board.reduce((sum,team)=>sum+team.slots.length,0)-board.length>=applicants
}
export function removeEmptyBenchRow(board:BoardTeam[],rowIndex:number,applicants:number):BoardTeam[]{
 if(!canRemoveBenchRow(board,rowIndex,applicants))return board
 return board.map(team=>({...team,slots:team.slots.filter((_,index)=>index!==rowIndex+6)}))
}
export function removeBenchRow(board:BoardTeam[],rowIndex:number):BoardTeam[]{
 if(rowIndex<0||!board.length||board.some(team=>!team.slots[rowIndex+6]))return board
 return board.map(team=>({...team,slots:team.slots.filter((_,index)=>index!==rowIndex+6)}))
}
export function canRemoveEmptyTeam(board:BoardTeam[],teamId:string,applicants:number){
 const team=board.find(item=>item.id===teamId)
 return !!team&&board.length>1&&team.slots.every(slot=>!slot.playerId)&&board.reduce((sum,item)=>sum+item.slots.length,0)-team.slots.length>=applicants
}
export function canRemoveExtra(team:BoardTeam,slot:Slot,applicants:number,teamCount:number){return team.slots.slice(6).includes(slot)&&!slot.playerId&&team.slots.length-6>requiredExtras(applicants,teamCount)}
export function removeEmptyBenchSlot(board:BoardTeam[],teamId:string,slotId:string):BoardTeam[]{
 return board.map(team=>team.id!==teamId?team:{...team,slots:team.slots.filter((slot,i)=>i<6||slot.id!==slotId||slot.playerId!==null)})
}
export function saveBoard(board:BoardTeam[]):BoardTeam[]{
 return board.map(team=>({...team,slots:team.slots.filter((s,i)=>i<6||s.playerId!==null).map(s=>({...s}))}))
}
export function candidateGroups(people:Candidate[],board:BoardTeam[],position?:CourtPosition){
 const assigned=new Set(board.flatMap(t=>t.slots.flatMap(s=>s.playerId?[s.playerId]:[])))
 return [false,true].flatMap(used=>(['신청자','대기자','미신청 회원'] as const).map(status=>({
  label:`${used?'배정됨':'미배정'} · ${status}`,
  people:prioritizeCandidates(people.filter(p=>p.active!==false&&assigned.has(p.id)===used&&p.status===status),position)
 }))).filter(group=>group.people.length>0)
}

export type AllocationScope=Candidate['status']
export function allocationCandidateGroups(people:Candidate[],board:BoardTeam[],position:CourtPosition,scope:AllocationScope,query:string){
 const assigned=new Set(board.flatMap(team=>team.slots.flatMap(slot=>slot.playerId?[slot.playerId]:[])))
 const searching=query.trim().length>0
 const matching=people.filter(p=>p.active!==false&&!assigned.has(p.id)&&(!searching||`${p.name} ${p.club} ${p.position} ${p.secondary}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))&&(searching||p.status===scope))
 const statuses:AllocationScope[]=searching?['신청자','대기자','미신청 회원']:[scope]
 return statuses.flatMap(status=>{
  const available=matching.filter(p=>p.status===status)
  if(position==='교대')return available.length?[{label:`추가 자리 후보 · ${status}`,people:available}]:[]
  const categories:[string,(p:Candidate)=>boolean][]=[
   ['주 포지션',p=>p.position===position],
   ['부 포지션',p=>p.position!==position&&p.secondary===position],
   ['다른 포지션',()=>true],
  ]
  const used=new Set<string>()
  return categories.flatMap(([label,predicate])=>{
   const group=available.filter(p=>!used.has(p.id)&&predicate(p))
   group.forEach(p=>used.add(p.id))
   return group.length?[{label:`${label} · ${status}`,people:group}]:[]
  })
 })
}
