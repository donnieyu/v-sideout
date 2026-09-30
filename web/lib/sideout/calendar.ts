import {invalid} from './errors';
import type {ReadSelection} from './read-model';
const DAY=86400000;
export function validDate(value:string):boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function kstDate(now:Date):string {if(!Number.isFinite(now.getTime()))throw invalid();return new Date(now.getTime()+9*3600000).toISOString().slice(0,10)}
export function addDays(date:string,days:number):string {if(!validDate(date)||!Number.isInteger(days))throw invalid();return new Date(Date.parse(date+'T00:00:00Z')+days*DAY).toISOString().slice(0,10)}
export function kstWeekStart(now:Date):string {const day=kstDate(now);const weekday=new Date(day+'T00:00:00Z').getUTCDay();return addDays(day,-((weekday+6)%7))}
export function resolveWeekOffset(week:number,now:Date):string {if(!Number.isInteger(week)||Math.abs(week)>999)throw invalid();return addDays(kstWeekStart(now),week*7)}
export function parseReadSelection(url:URL,now:Date):ReadSelection {
 for(const key of ['week','weekStart','filter'])if(url.searchParams.getAll(key).length>1)throw invalid();
 const week=url.searchParams.get('week');
 if(week!==null&&(!/^-?\d+$/.test(week)||Math.abs(Number(week))>999))throw invalid();
 if(week!==null&&url.searchParams.has('weekStart'))throw invalid();
 const weekStart=url.searchParams.get('weekStart')??resolveWeekOffset(Number(week??0),now);
 if(!validDate(weekStart)||new Date(weekStart+'T00:00:00Z').getUTCDay()!==1)throw invalid();
 const filter=url.searchParams.get('filter')??'all';
 if(!filter||filter.length>128)throw invalid();
 return {weekStart,filter};
}
