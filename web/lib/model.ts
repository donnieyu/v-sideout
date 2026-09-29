export type Role = 'master' | 'chair' | 'staff' | 'member';
export type Position = 'S' | 'MB' | 'OH' | 'OP';
export const positionNames: Record<Position, string> = { S: '세터', MB: '센터', OH: '레프트', OP: '라이트' };
export type Club = { id: string; name: string; english: string; location: string; address: string; weekday: number; entryTime: string; startTime: string; endTime: string };
export const EXAMPLE_CLUBS: Club[] = [
 {id:'seoul-demo',name:'뉴배동',english:'NEW BAEDONG',location:'양강초등학교 체육관',address:'양강초등학교 체육관',weekday:0,entryTime:'12:30',startTime:'13:00',endTime:'17:00'},
 {id:'heroes',name:'히어로즈',english:'Heroes',location:'양강초등학교 체육관',address:'양강초등학교 체육관',weekday:6,entryTime:'13:30',startTime:'14:00',endTime:'18:00'},
];
export const DEMO_MEMBER='m22';
export const policies={proxyByLeaders:true,specialTeamAssignment:true};
export type Account={name:string;bio:string;homeClubId?:string|null};
export type Member={id:string;name:string;homeClubId?:string|null;kind:'regular'|'new';main:Position;sub:Position;level:number|null};
export type Participant={id:string;memberId?:string;name?:string;guest?:boolean;response:'yes'|'no';category:'regular'|'candidate';source:'self'|'proxy'|'guest';at:string;team:number|null;position?:Position;setterSeat?:'MB'|'OP';slot?:string;guaranteed?:boolean;homeClubAtSignup?:string|null};
export type Published={at:string;teams:number;teamSize:number;people:{id:string;name:string;team:number|null;position?:Position;setterSeat?:'MB'|'OP';slot?:string}[]};
export type Session={id:string;title:string;entry?:string;start:string;end:string;deadline:string;priorityUntil?:string|null;roster?:{id:string;name:string}[];location:string;address:string;note:string;cap:number|null;phase:'draft'|'open'|'candidates'|'closed'|'ended'|'cancelled';teamCount:number;teamSize:number;setterSeats?:('MB'|'OP')[];participants:Participant[];published:Published|null};
export type Post={id:string;category:'notice'|'event'|'board';title:string;body:string;author:string;at:string;pinned:boolean;comments:{id:string;body:string;author:string;at:string}[]};
export type Workspace={schemaVersion?:number;club:Club;members:Member[];sessions:Session[];posts:Post[];audit:{at:string;actor:string;action:string;sessionId?:string}[]};
export type View={revision:number;role:Role;memberId:string;club:Club;clubs:Club[];sessions:Session[];members:Member[];posts:Post[];myName:string;account?:Account;accountRevision?:number;directoryRevision?:number;homeClubId?:string|null;myKind?:Member['kind']};
export type BusinessActor={memberId:string;role:Role};
export function onDate(date:string,time:string){return new Date(`${date}T${time}:00+09:00`).toISOString()}
export function kstDate(date:string){return new Date(Date.parse(date)+9*3600000).toISOString().slice(0,10)}
export function nextDate(weekday:number,now=new Date()){
 const kst=new Date(now.getTime()+9*3600000);
 const distance=(weekday-kst.getUTCDay()+7)%7||7;
 return new Date(Date.UTC(kst.getUTCFullYear(),kst.getUTCMonth(),kst.getUTCDate()+distance)).toISOString().slice(0,10);
}
export function deadlineLabel(deadline:string,now=Date.now()){
 const today=Date.parse(`${kstDate(new Date(now).toISOString())}T00:00:00Z`);
 const target=Date.parse(`${kstDate(deadline)}T00:00:00Z`);
 if(Date.parse(deadline)<=now)return '마감';
 const days=Math.round((target-today)/86400000);return days===0?'D-DAY':`D-${days}`;
}
export type CourtSlot={id:string;position:Position;label:string;seat?:'MB'|'OP'};
export function courtSlots(seat:'MB'|'OP'='OP'):CourtSlot[]{
 return [{id:'OH1',position:'OH',label:'레프트 1'},{id:'MB1',position:'MB',label:'센터 1'},{id:'OP1',position:'OP',label:seat==='OP'?'라이트':'라이트 1'},
 {id:'OH2',position:'OH',label:'레프트 2'},
 {id:'MB2',position:seat==='MB'?'S':'MB',label:seat==='MB'?'세터':'센터 2',...(seat==='MB'?{seat:'MB' as const}:{})},
 {id:'OP2',position:seat==='OP'?'S':'OP',label:seat==='OP'?'세터':'라이트 2',...(seat==='OP'?{seat:'OP' as const}:{})}];
}
export function reconcileSlots(s:Session){
 s.setterSeats??=Array(s.teamCount).fill('OP');
 for(let i=0;i<s.teamCount;i++){
  const players=s.participants.filter(p=>p.team===i&&p.response==='yes');
  const knownSetter=players.find(p=>p.position==='S');if(knownSetter?.setterSeat&&!players.some(p=>p.slot))s.setterSeats[i]=knownSetter.setterSeat;
  const slots=courtSlots(s.setterSeats[i]??'OP'),used=new Set<string>();
  for(const p of players){
   if(p.slot==='rotation')continue;
   const exact=slots.find(x=>x.id===p.slot);
   if(exact&&!used.has(exact.id)){used.add(exact.id);continue}
   const match=slots.find(x=>!used.has(x.id)&&x.position===p.position);
   if(match){p.slot=match.id;p.position=match.position;p.setterSeat=match.seat;used.add(match.id)}else p.slot='rotation';
  }
 }
}
export function seedWorkspace(now=new Date(),clubId='seoul-demo'):Workspace {
 const club=structuredClone(EXAMPLE_CLUBS.find(c=>c.id===clubId)??EXAMPLE_CLUBS[0]);
 const date=nextDate(club.weekday,now),start=onDate(date,club.startTime);
 const names=['김도윤','이서준','박지훈','최민준','정하준','강현우','조시우','윤지호','장준서','임건우','한지민','오수빈','서유진','신하은','권서연','황예린','안지우','송채원','류민서','홍다은','전승호','김나래','배도현','백유나','문태영','양소연','남지안','성은우','유예진','하준혁'];
 const positions:Position[]=['S','MB','OH','OP','MB','OH'];
 const members:Member[]=names.map((name,i)=>({id:`m${i+1}`,name,homeClubId:i===29?null:(i<14||i===21||i===26?'seoul-demo':'heroes'),kind:i>=26?'new':'regular',main:positions[i%6],sub:positions[(i+2)%6],level:i===25?null:i%5+1}));
 const participants:Participant[]=members.slice(0,clubId==='heroes'?16:20).map((m,i)=>({id:m.id,memberId:m.id,response:'yes',category:'regular',source:'self',at:new Date(now.getTime()-86400000+i*1800000).toISOString(),team:null,position:m.main}));
 participants.push({id:'m27',memberId:'m27',response:'yes',category:'regular',source:'self',at:new Date(now.getTime()-1800000).toISOString(),team:null,position:'OH'});
 const session:Session={id:'s1',title:'정기 운동',entry:onDate(date,club.entryTime),start,end:onDate(date,club.endTime),deadline:new Date(Date.parse(start)-86400000).toISOString(),location:club.location,address:club.address,note:'입장 후 30분 동안 함께 몸을 풀어요. 실내 운동화와 개인 물을 챙겨 주세요.',cap:24,phase:'open',teamCount:4,teamSize:6,setterSeats:Array(4).fill('OP'),participants,published:null};
 return {schemaVersion:3,club,members,sessions:[session],posts:[{id:'p1',category:'notice',title:'코트에 들어가기 전, 함께 확인해요',body:'실내 전용 운동화를 준비해 주세요. 운동 시작 전에는 충분히 몸을 풀고, 사용한 공과 물품은 함께 정리해요.\n\n신청 변경이 어려운 경우 운영진에게 알려 주세요.',author:'운영진',at:new Date(now.getTime()-2*86400000).toISOString(),pinned:true,comments:[]},{id:'p2',category:'event',title:'이번 운동이 끝나면, 같이 밥 먹어요',body:'운동 후 함께 식사할 분들은 댓글로 이야기해 주세요. 장소는 당일 함께 정해요.',author:'운영진',at:new Date(now.getTime()-86400000).toISOString(),pinned:false,comments:[]},{id:'p3',category:'board',title:'처음 오시는 분들도 편하게 인사해요',body:'이름과 좋아하는 배구 이야기를 남겨 주세요. 코트에서 만나요!',author:'김도윤',at:now.toISOString(),pinned:false,comments:[]}],audit:[]};
}
// Upgrade the existing sample in place: keep all responses, teams, published snapshots and posts.
export function upgradeWorkspace(input:Workspace,clubId='seoul-demo'):Workspace {
 const w=structuredClone(input);
 if((w.schemaVersion??1)<2){
  const club=structuredClone(EXAMPLE_CLUBS.find(c=>c.id===clubId)??EXAMPLE_CLUBS[0]);w.club=club;
  for(const s of w.sessions){const date=kstDate(s.start);s.entry=onDate(date,club.entryTime);s.start=onDate(date,club.startTime);s.end=onDate(date,club.endTime);s.location=club.location;s.address=club.address;if(s.title==='일요일 정기 운동')s.title='정기 운동';if(s.note.includes('시작 10분 전부터'))s.note='입장 후 30분 동안 함께 몸을 풀어요. 실내 운동화와 개인 물을 챙겨 주세요.';}
  w.schemaVersion=2;
 }
 if((w.schemaVersion??1)<3){for(const m of w.members){const i=Number(m.id.slice(1))-1;if(m.homeClubId===undefined)m.homeClubId=i===29?null:(i<14||i===21||i===26?'seoul-demo':'heroes');}for(const s of w.sessions)s.priorityUntil??=null;w.schemaVersion=3;}
 for(const s of w.sessions)reconcileSlots(s);return w;
}
export function stage(s:Session,now=Date.now()){
 if(['draft','closed','ended','cancelled'].includes(s.phase))return s.phase;
 if(now>=Date.parse(s.start))return 'closed';
 if(s.phase==='candidates'||now>=Date.parse(s.deadline))return 'candidates';return 'open';
}
export function counts(s:Session){const yes=s.participants.filter(p=>p.response==='yes');return {regular:yes.filter(p=>!p.guest&&p.category==='regular').length,candidate:yes.filter(p=>!p.guest&&p.category==='candidate').length,guests:yes.filter(p=>p.guest).length,total:yes.length,assigned:yes.filter(p=>p.team!==null).length}}
export function priorityActive(s:Session,now=Date.now()){return stage(s,now)==='open'&&!!s.priorityUntil&&now<Date.parse(s.priorityUntil)}
export function effectiveRole(w:Workspace,role:Role,memberId=DEMO_MEMBER):Role {return role==='master'||w.members.find(m=>m.id===memberId)?.homeClubId===w.club.id?role:'member'}
export function projection(w:Workspace,requestedRole:Role,memberId:string,revision:number):View{
 return projectionForActor(w,{memberId,role:effectiveRole(w,requestedRole,memberId)},revision);
}
export function projectionForActor(w:Workspace,actor:BusinessActor,revision:number):View{
 const {role,memberId}=actor;
 if(!memberId||!w.members.some(member=>member.id===memberId)&&role!=='master')throw new Error('Unknown member');
 const admin=role!=='member',me=w.members.find(m=>m.id===memberId),own=me?.homeClubId===w.club.id;
 return {revision,role,memberId,homeClubId:me?.homeClubId??null,myKind:me?.kind,club:w.club,clubs:EXAMPLE_CLUBS.map(c=>c.id===w.club.id?w.club:c),myName:me?.name??'회원',members:admin?w.members:[],posts:w.posts,sessions:w.sessions.filter(s=>admin||s.phase!=='draft').map(s=>{
 if(admin)return s;
 const roster=own?s.participants.filter(p=>p.response==='yes'&&!p.guest&&w.members.find(m=>m.id===p.memberId)?.homeClubId===w.club.id).map(p=>({id:p.id,name:w.members.find(m=>m.id===p.memberId)!.name})).sort((a,b)=>a.name.localeCompare(b.name,'ko')):undefined;
 const ownEntry=s.participants.find(p=>p.memberId===memberId&&p.response==='yes');
 const maySeePublished=!!ownEntry&&(ownEntry.category==='regular'||ownEntry.team!==null||s.published?.people.some(p=>p.id===memberId&&p.team!==null));
 return {...s,roster,setterSeats:undefined,published:maySeePublished&&s.published?{...s.published,people:s.published.people.filter(p=>p.team!==null)}:null,participants:s.participants.filter(p=>p.memberId===memberId).map(p=>({id:p.id,memberId:p.memberId,response:p.response,category:p.category,at:'',source:'self',team:null})),counts:{regular:counts(s).regular,candidate:counts(s).candidate,total:counts(s).total}} as Session;
 })};
}
export function publicCounts(s:Session){return (s as Session&{counts?:ReturnType<typeof counts>}).counts??counts(s)}
export type DirectoryMember=Pick<Member,'id'|'name'|'homeClubId'|'kind'>;
export function seedDirectory():DirectoryMember[]{return seedWorkspace().members.map(({id,name,homeClubId,kind})=>({id,name,homeClubId,kind}))}
export function attendanceStep(n:number){const marks=[18,21,24,28],target=marks.find(x=>x>n)??28,completed=marks.filter(x=>x<=n),base=completed.at(-1)??0;return {target,completed,progress:n>=28?100:(n-base)/(target-base)*100,label:n>=28?'28명 달성':`${target}명까지 ${target-n}명`}}
