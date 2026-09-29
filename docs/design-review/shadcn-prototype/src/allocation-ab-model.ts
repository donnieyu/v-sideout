import {candidates, createTeam, placeOnBoard, locatePlayer, type Candidate, type BoardTeam, type CourtPosition} from './position-board-model'

export const reviewCandidates = candidates.filter(p => !['장준서', '김민서', '한지우'].includes(p.id))
export type Target = {teamId:string; slotId:string}
export type ReviewState = {board:BoardTeam[]; target:Target|null; pendingId:string|null; reviewed:boolean}
export type ReviewAction =
 | {type:'open'; target:Target}
 | {type:'pick'; playerId:string|null}
 | {type:'apply'; close:boolean}
 | {type:'discard'; close:boolean}
 | {type:'review'}
 | {type:'reset'}
 | {type:'select-role';role:CourtPosition}
 | {type:'select-free'}
 | {type:'continuous-assign';playerId:string;flow?:'position'|'free'}
 | {type:'auto-fill'}
 | {type:'release';target:Target;playerId:string}
export const initialReview = ():ReviewState => ({board:['A','B','C'].map(id=>createTeam(id)),target:null,pendingId:null,reviewed:false})
export const currentSlot = (state:ReviewState) => state.board.find(t=>t.id===state.target?.teamId)?.slots.find(s=>s.id===state.target?.slotId)
export const isPending = (state:ReviewState) => !!currentSlot(state) && currentSlot(state)!.playerId!==state.pendingId
export function nextVacant(board:BoardTeam[],role:CourtPosition,after?:Target):Target|null {
 const places=board.flatMap(team=>team.slots.filter(slot=>slot.position===role).map(slot=>({teamId:team.id,slotId:slot.id,playerId:slot.playerId}))).sort((a,b)=>role==='라이트'?Number(a.slotId==='6')-Number(b.slotId==='6'):0)
 const start=after?places.findIndex(p=>p.teamId===after.teamId&&p.slotId===after.slotId):-1
 for(let step=1;step<=places.length;step++){
  const place=places[(start+step)%places.length]
  if(!place.playerId)return {teamId:place.teamId,slotId:place.slotId}
 }
 return null
}
export function nextFreeVacant(board:BoardTeam[],after?:Target):Target|null {
 const places=board.flatMap(team=>team.slots.filter(slot=>slot.position!=='세터').map(slot=>({teamId:team.id,slotId:slot.id,playerId:slot.playerId})))
 const start=after?places.findIndex(p=>p.teamId===after.teamId&&p.slotId===after.slotId):-1
 for(let step=1;step<=places.length;step++){
  const place=places[(start+step)%places.length]
  if(!place.playerId)return {teamId:place.teamId,slotId:place.slotId}
 }
 return null
}
export function autoFillBoard(board:BoardTeam[],people:Candidate[]=reviewCandidates):BoardTeam[] {
 let result=board
 const used=new Set(board.flatMap(team=>team.slots.flatMap(slot=>slot.playerId?[slot.playerId]:[])))
 const places=board.flatMap(team=>team.slots.map(slot=>({teamId:team.id,slotId:slot.id,position:slot.position})))
 const order=['세터','레프트','센터','라이트'] as CourtPosition[]
 // Fill the six on-court places in every team before optional extra places.
 for(const extra of [false,true]){
  for(const match of ['primary','secondary','remaining'] as const){
   for(const position of order){
    for(const place of places.filter(p=>(p.slotId==='6'||p.slotId.startsWith('bench-'))===extra&&p.position===position)){
    if(result.find(t=>t.id===place.teamId)?.slots.find(s=>s.id===place.slotId)?.playerId)continue
    const player=people.find(p=>p.status!=='미신청 회원'&&!used.has(p.id)&&(match==='primary'?p.position===position:match==='secondary'?p.secondary===position:position==='세터'||p.position!=='세터'))
    if(!player)continue
    result=placeOnBoard(result,place.teamId,place.slotId,player.id)
    used.add(player.id)
    }
   }
  }
 }
 return result
}
export function reviewReducer(state:ReviewState,action:ReviewAction):ReviewState{return allocationReducer(state,action,reviewCandidates)}
export function allocationReducer(state:ReviewState, action:ReviewAction,people:Candidate[]):ReviewState {
 switch(action.type){
  case 'select-role': return isPending(state)?state:{...state,target:nextVacant(state.board,action.role),pendingId:null}
  case 'select-free': return isPending(state)?state:{...state,target:nextFreeVacant(state.board),pendingId:null}
  case 'auto-fill': {
   if(isPending(state))return state
   const board=autoFillBoard(state.board,people)
   return {...state,board,target:null,pendingId:null,reviewed:false}
  }
  case 'continuous-assign': {
   const slot=currentSlot(state)
   if(!state.target||!slot||!people.some(p=>p.id===action.playerId)||locatePlayer(state.board,action.playerId))return state
   if(action.flow==='free'&&slot.position!=='세터'&&people.find(p=>p.id===action.playerId)?.position==='세터'&&state.board.some(t=>t.slots.some(s=>s.position==='세터'&&!s.playerId)))return state
   const board=placeOnBoard(state.board,state.target.teamId,state.target.slotId,action.playerId)
   const next=action.flow==='free'?nextFreeVacant(board,state.target):nextVacant(board,slot.position,state.target)
   const target=slot.playerId||!next?state.target:next
   return {...state,board,target,pendingId:target===state.target?action.playerId:null,reviewed:false}
  }
  case 'release': {
   const slot=state.board.find(t=>t.id===action.target.teamId)?.slots.find(s=>s.id===action.target.slotId)
   if(!slot||!slot.playerId||slot.playerId!==action.playerId)return state
   return {...state,board:placeOnBoard(state.board,action.target.teamId,action.target.slotId,null),target:action.target,pendingId:null,reviewed:false}
  }
  case 'reset': return initialReview()
  case 'open': {
   if(isPending(state))return state
   const slot=state.board.find(t=>t.id===action.target.teamId)?.slots.find(s=>s.id===action.target.slotId)
   return slot?{...state,target:action.target,pendingId:slot.playerId}:state
  }
  case 'pick': return state.target&&(action.playerId===null||people.some(p=>p.id===action.playerId))?{...state,pendingId:action.playerId}:state
  case 'discard': return {...state,pendingId:action.close?null:currentSlot(state)?.playerId??null,target:action.close?null:state.target}
  case 'apply': return state.target&&isPending(state)?{...state,board:placeOnBoard(state.board,state.target.teamId,state.target.slotId,state.pendingId),target:action.close?null:state.target,pendingId:action.close?null:state.pendingId,reviewed:false}:state
  case 'review': return isPending(state)?state:{...state,reviewed:true}
 }
}
