export type Club={id:string;name:string;mark:string;day:number;entry:string;start:string;end:string;place:string;count:number}
export type Session={id:string;club:Club;date:string;offset:number;attended:boolean;published:boolean;count:number;phase?:'unregistered'|'draft'|'open';recordId?:string;registration?:{deadline:string;priorityUntil:string|null;cap:number|null;notice:string}}
export const clubs:Club[]=[
{id:'asp',name:'아스팍',mark:'I',day:5,entry:'08:00',start:'08:30',end:'13:00',place:'궁산다목적체육관',count:15},
{id:'run',name:'런업',mark:'R',day:5,entry:'13:00',start:'13:30',end:'18:00',place:'삼성중학교 체육관',count:22},
{id:'heroes',name:'히어로즈',mark:'H',day:5,entry:'13:30',start:'14:00',end:'18:00',place:'양강초등학교 체육관',count:17},
{id:'nb',name:'뉴배동',mark:'N',day:6,entry:'12:30',start:'13:00',end:'17:00',place:'양강초등학교 체육관',count:20},
{id:'thev',name:'더브이',mark:'V',day:6,entry:'13:00',start:'13:30',end:'18:00',place:'삼성중학교 체육관',count:12}]
export const dateAt=(offset:number,day=0)=>new Date(Date.UTC(2026,8,21+offset*7+day))
export const iso=(date:Date)=>date.toISOString().slice(0,10)
export const formatDate=(date:string|Date)=>{const d=typeof date==='string'?new Date(date+'T00:00:00Z'):date;return `${d.getUTCMonth()+1}월 ${d.getUTCDate()}일`}
// Only these fixture weeks have records. Navigation never synthesizes past attendance.
export const fixtures:Session[]=[-2,-1,0].flatMap(offset=>clubs.map(club=>({id:`${iso(dateAt(offset,club.day))}-${club.id}`,club,date:iso(dateAt(offset,club.day)),offset,attended:offset===-1&&club.id==='nb'||offset===-2&&club.id==='heroes',published:offset<0&&['nb','heroes'].includes(club.id),count:offset>0?0:offset<0?21:club.count})))
export function visibleSessions(offset:number,filter:string,favorites:Set<string>){return fixtures.filter(s=>s.offset===offset&&(offset>=0||s.attended)&&(filter==='all'||filter==='favorites'&&favorites.has(s.club.id)||s.club.id===filter))}
export function progress(n:number){const target=[18,21,24,28].find(t=>n<=t)??Math.max(n,1);return Math.min(100,n/target*100)}
export const ownNames=['강현우','김도윤','남지안','박지훈','서유진','신하은','오수빈','윤지호','이서준','임건우','장준서','정하준','조시우','최민준']
export const positions=['세터','레프트','센터','라이트'] as const
export const teams=[
{title:'A팀',players:{세터:['김도윤'],레프트:['강현우','박지훈','장준서'],센터:['오수빈','이서준'],라이트:['김나래']}},
{title:'B팀',players:{세터:['서유진'],레프트:['김민서','신하은','정하준'],센터:['윤지호','임건우'],라이트:['남지안']}},
{title:'C팀',players:{세터:['이도현'],레프트:['김서현','이수민','한지우'],센터:['조시우','최민준'],라이트:['박서준']}}
]
export function matchSchedule(){const sequence=[['a','b'],['A','B'],['B','C'],['A','C']];return Array.from({length:12},(_,i)=>{const pair=sequence[i%4],minutes=13*60+i*20,fmt=(m:number)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;return {number:i+1,start:fmt(minutes),end:fmt(minutes+20),pair,rookie:i%4===0}})}

// Fictional profile affiliations for the design fixture, not real member records.
export const memberAffiliations:Record<string,string>={...Object.fromEntries([...ownNames,'김나래'].map(name=>[name,'뉴배동'])),김민서:'히어로즈',이도현:'히어로즈',김서현:'더브이',이수민:'런업',한지우:'아스팍',박서준:'무소속'}
export const cancellationLocked=(registered:boolean,teamPublished:boolean)=>registered&&teamPublished

// Monday–Sunday weeks belong to the month containing their Thursday.
export function weekLabel(offset:number){const d=dateAt(offset,3);return `${d.getUTCFullYear()===dateAt(0).getUTCFullYear()?'':d.getUTCFullYear()+'년 '}${d.getUTCMonth()+1}월 ${Math.ceil(d.getUTCDate()/7)}주`}
