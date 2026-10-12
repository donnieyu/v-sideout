import type {ClubRecord} from './read-model';
import type {ScheduleInput} from './write-model';
import {addDays} from './calendar';
export function scheduleDefaults(club:ClubRecord,date:string,now:string):ScheduleInput{
 const start=Date.parse(`${date}T${club.start}:00+09:00`),current=Date.parse(now);let deadline=Date.parse(`${addDays(date,-1)}T18:00:00+09:00`);if(deadline<=current)deadline=current+(start-current)/2;
 const priority=Date.parse(`${addDays(date,-2)}T18:00:00+09:00`);
 return {clubId:club.id,date,entry:club.entry,start:club.start,end:club.end,place:club.place,notice:'',phase:'draft',deadline:new Date(deadline).toISOString(),priorityUntil:priority>current?new Date(priority).toISOString():null,cap:null};
}
