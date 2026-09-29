import {memberPool,type Player,type Position} from './team-model'
export type Candidate=Player&{secondary:Position;status:'신청자'|'대기자'|'미신청 회원'}
export type CourtPosition='레프트'|'센터'|'라이트'|'세터'|'교대'
export type Slot={id:string;position:CourtPosition;playerId:string|null}
export type BoardTeam={id:string;title:string;slots:Slot[]}
export const candidates:Candidate[]=memberPool.map(p=>({...p,secondary:p.position==='세터'?'라이트':p.position==='센터'?'라이트':'센터',status:['김민서','한지우'].includes(p.id)?'대기자':'신청자'}))
export const createTeam=(id:string,names:(string|null)[]=[]):BoardTeam=>({id,title:id+'팀',slots:(['레프트','센터','세터','레프트','센터','라이트','라이트'] as CourtPosition[]).map((position,i)=>({id:String(i),position,playerId:names[i]??null}))})
export const initialBoard=():BoardTeam[]=>[createTeam('A',['강현우',null,'김도윤','박지훈','이서준','김나래']),createTeam('B',['신하은','윤지호','서유진','정하준','임건우','남지안']),createTeam('C',['김서현','조시우','이도현','이수민','최민준','박서준'])]
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
export function addBenchSlot(board:BoardTeam[],teamId:string):BoardTeam[]{
 return board.map(team=>{
  if(team.id!==teamId)return team
  const next=1+Math.max(0,...team.slots.map(s=>s.id.startsWith('bench-')?Number(s.id.slice(6))||0:0))
  return {...team,slots:[...team.slots,{id:`bench-${next}`,position:'교대',playerId:null}]}
 })
}
export function saveBoard(board:BoardTeam[]):BoardTeam[]{
 return board.map(team=>({...team,slots:team.slots.filter(s=>s.position!=='교대'||s.playerId!==null).map(s=>({...s}))}))
}
export function candidateGroups(people:Candidate[],board:BoardTeam[],position?:CourtPosition){
 const assigned=new Set(board.flatMap(t=>t.slots.flatMap(s=>s.playerId?[s.playerId]:[])))
 return [false,true].flatMap(used=>(['신청자','대기자','미신청 회원'] as const).map(status=>({
  label:`${used?'배정됨':'미배정'} · ${status}`,
  people:prioritizeCandidates(people.filter(p=>assigned.has(p.id)===used&&p.status===status),position)
 }))).filter(group=>group.people.length>0)
}

export type AllocationScope=Candidate['status']
export function allocationCandidateGroups(people:Candidate[],board:BoardTeam[],position:CourtPosition,scope:AllocationScope,query:string){
 const assigned=new Set(board.flatMap(team=>team.slots.flatMap(slot=>slot.playerId?[slot.playerId]:[])))
 const searching=query.trim().length>0
 const matching=people.filter(p=>!assigned.has(p.id)&&(!searching||`${p.name} ${p.club} ${p.position} ${p.secondary}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))&&(searching||p.status===scope))
 const statuses:AllocationScope[]=searching?['신청자','대기자','미신청 회원']:[scope]
 return statuses.flatMap(status=>{
  const available=matching.filter(p=>p.status===status)
  if(position==='교대')return available.length?[{label:`추가 자리 후보 · ${status}`,people:available}]:[]
  const categories:[string,(p:Candidate)=>boolean][]=[
   ['주 포지션',p=>p.position===position],
   ['부 포지션',p=>p.position!==position&&p.secondary===position&&!(p.position==='세터'&&['센터','라이트'].includes(position))],
   ['선택 가능한 세터',p=>p.position==='세터'&&['센터','라이트'].includes(position)],
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
