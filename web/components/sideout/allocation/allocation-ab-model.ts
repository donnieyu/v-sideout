import {createTeam, adjustExtraSlots, placeOnBoard, locatePlayer, type Candidate, type BoardTeam, type CourtPosition} from './position-board-model'


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
 | {type:'continuous-assign';playerId:string;flow?:'position'|'free'|'extra'}
 | {type:'auto-fill'}
 | {type:'clear-assignments'}
 | {type:'release';target:Target;playerId:string}
export const initialReview = ():ReviewState => ({board:['A','B','C'].map(id=>createTeam(id)),target:null,pendingId:null,reviewed:false})
export function withApplicantCapacity(state:ReviewState,applicants:number):ReviewState {
 const board=adjustExtraSlots(state.board,applicants)
 let target=state.target
 if(target&&!board.find(t=>t.id===target!.teamId)?.slots.some(s=>s.id===target!.slotId)){
  const team=board.find(t=>t.id===target!.teamId)
  target=team?{teamId:team.id,slotId:team.slots[6]?.id??'5'}:null
 }
 if(board===state.board&&target===state.target)return state
 return {...state,board,target,pendingId:target===state.target?state.pendingId:board.find(t=>t.id===target?.teamId)?.slots.find(s=>s.id===target?.slotId)?.playerId??null}
}
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
export function nextExtraVacant(board:BoardTeam[],teamId:string,after?:Target):Target|null {
 const places=board.find(team=>team.id===teamId)?.slots.slice(6)??[]
 const start=after?places.findIndex(slot=>slot.id===after.slotId):-1
 for(let step=1;step<=places.length;step++){
  const slot=places[(start+step)%places.length]
  if(!slot.playerId)return {teamId,slotId:slot.id}
 }
 return null
}
export function autoFillBoard(board:BoardTeam[],people:Candidate[]):BoardTeam[] {
 let result=board
 const used=new Set(board.flatMap(team=>team.slots.flatMap(slot=>slot.playerId?[slot.playerId]:[])))
 const places=board.flatMap(team=>team.slots.map(slot=>({teamId:team.id,slotId:slot.id,position:slot.position})))
 const order=['세터','레프트','센터','라이트'] as CourtPosition[]
 const occupied=(teamId:string,slotId:string)=>!!result.find(team=>team.id===teamId)?.slots.find(slot=>slot.id===slotId)?.playerId
 const corePlaces=places.filter(place=>!place.slotId.startsWith('bench-')&&place.slotId!=='6')
 const extraPlaces=places.filter(place=>place.slotId==='6'||place.slotId.startsWith('bench-'))
 const recyclable=corePlaces.some(place=>!occupied(place.teamId,place.slotId))?extraPlaces.flatMap(place=>{
  const playerId=result.find(team=>team.id===place.teamId)?.slots.find(slot=>slot.id===place.slotId)?.playerId
  const player=people.find(person=>person.id===playerId)
  return playerId&&player?.active!==false&&player?.position!=='미등록'&&(player?.status==='신청자'||player?.status==='대기자')?[{...place,playerId}]:[]
 }):[]
 for(const place of recyclable){
  result=placeOnBoard(result,place.teamId,place.slotId,null)
  used.delete(place.playerId)
 }
 const fill=(available:typeof places)=>{
  for(const status of ['신청자','대기자'] as const){
   for(const match of ['primary','secondary','remaining'] as const){
    for(const position of order){
     for(const place of available.filter(item=>item.position===position)){
      if(occupied(place.teamId,place.slotId))continue
      const player=people.find(person=>person.active!==false&&person.position!=='미등록'&&person.status===status&&!used.has(person.id)&&(
       match==='primary'?person.position===position:
       match==='secondary'?person.secondary===position:
       position==='세터'||person.position!=='세터'||!corePlaces.some(item=>item.position==='세터'&&!occupied(item.teamId,item.slotId))
      ))
      if(!player)continue
      result=placeOnBoard(result,place.teamId,place.slotId,player.id)
      used.add(player.id)
     }
    }
   }
   for(const place of available.filter(item=>item.position==='교대')){
    if(occupied(place.teamId,place.slotId))continue
    const player=people.find(person=>person.active!==false&&person.position!=='미등록'&&person.status===status&&!used.has(person.id))
    if(player){result=placeOnBoard(result,place.teamId,place.slotId,player.id);used.add(player.id)}
   }
  }
 }
 fill(corePlaces)
 if(corePlaces.every(place=>occupied(place.teamId,place.slotId))){
  for(const place of recyclable){
   if(used.has(place.playerId)||occupied(place.teamId,place.slotId))continue
   result=placeOnBoard(result,place.teamId,place.slotId,place.playerId)
   used.add(place.playerId)
  }
  fill(extraPlaces)
 }
 return result
}

export function allocationReducer(state:ReviewState, action:ReviewAction,people:Candidate[]):ReviewState {
 switch(action.type){
  case 'select-role': return isPending(state)?state:{...state,target:nextVacant(state.board,action.role),pendingId:null}
  case 'select-free': return isPending(state)?state:{...state,target:nextFreeVacant(state.board),pendingId:null}
  case 'auto-fill': {
   if(isPending(state))return state
   const board=autoFillBoard(state.board,people)
   return {...state,board,target:null,pendingId:null,reviewed:false}
  }
  case 'clear-assignments': return {...state,board:state.board.map(team=>({...team,slots:team.slots.map(slot=>{
   const cleared={...slot,playerId:null}
   delete cleared.assignedPosition
   delete cleared.assignmentMemberId
   return cleared
  })})),target:null,pendingId:null,reviewed:false}
  case 'continuous-assign': {
   const slot=currentSlot(state)
   if(!state.target||!slot||!people.some(p=>p.id===action.playerId&&p.active!==false)||locatePlayer(state.board,action.playerId))return state
   if(action.flow==='free'&&slot.position!=='세터'&&people.find(p=>p.id===action.playerId)?.position==='세터'&&state.board.some(t=>t.slots.some(s=>s.position==='세터'&&!s.playerId)))return state
   const board=placeOnBoard(state.board,state.target.teamId,state.target.slotId,action.playerId)
   const next=action.flow==='free'?nextFreeVacant(board,state.target):action.flow==='extra'?nextExtraVacant(board,state.target.teamId,state.target):nextVacant(board,slot.position,state.target)
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
  case 'pick': return state.target&&(action.playerId===null||people.some(p=>p.id===action.playerId&&p.active!==false))?{...state,pendingId:action.playerId}:state
  case 'discard': return {...state,pendingId:action.close?null:currentSlot(state)?.playerId??null,target:action.close?null:state.target}
  case 'apply': return state.target&&isPending(state)?{...state,board:placeOnBoard(state.board,state.target.teamId,state.target.slotId,state.pendingId),target:action.close?null:state.target,pendingId:action.close?null:state.pendingId,reviewed:false}:state
  case 'review': return isPending(state)?state:{...state,reviewed:true}
 }
}
