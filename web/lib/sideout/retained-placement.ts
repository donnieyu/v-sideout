import type {LineupRecord,Placement} from './read-model';
/** An inactive member can only keep the exact saved placement approved at publication. */
export function canRetainInactivePlacement(draft:LineupRecord,published:LineupRecord|null|undefined,teamId:string,player:Placement):boolean{
 const contains=(lineup:LineupRecord|null|undefined)=>!!lineup?.teams.find(t=>t.id===teamId)?.players.some(p=>p.memberId===player.memberId&&p.slotId===player.slotId&&p.assignedPosition===player.assignedPosition);
 return contains(draft)&&contains(published);
}
