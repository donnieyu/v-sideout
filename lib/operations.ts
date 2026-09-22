import { counts, stage, positionNames, type Workspace, type Role, type Session, type Participant, type Position, DEMO_MEMBER } from './model';
export class AppError extends Error { constructor(message:string,public status=400){super(message)} }
export type Action = {type:string; sessionId?:string; [key:string]:unknown};
const admin=(role:Role)=>{if(role==='member')throw new AppError('운영진만 사용할 수 있어요.',403)};
const leader=(role:Role)=>{if(!['master','chair'].includes(role))throw new AppError('마스터·회장만 사용할 수 있어요.',403)};
function str(v:unknown,max=200){if(typeof v!=='string'||!v.trim()||v.length>max)throw new AppError('입력 내용을 확인해 주세요.');return v.trim()}
function num(v:unknown,min:number,max:number){if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max)throw new AppError('숫자 범위를 확인해 주세요.');return v}
function pos(v:unknown):Position {if(typeof v!=='string'||!(v in positionNames))throw new AppError('포지션을 선택해 주세요.');return v as Position}
const nameOf=(w:Workspace,p:Participant)=>p.guest?p.name??'게스트':w.members.find(m=>m.id===p.memberId)?.name??'회원';
export function operate(w:Workspace,a:Action,role:Role,now=Date.now()):Workspace {
 const next=structuredClone(w);const at=new Date(now).toISOString();
 const session=next.sessions.find(s=>s.id===a.sessionId);
 function ses(){if(!session)throw new AppError('운동을 찾을 수 없어요.',404);return session}
 function editable(s:Session){if(['ended','cancelled'].includes(s.phase))throw new AppError('종료·취소된 운동은 변경할 수 없어요.')}
 function addMember(s:Session,id:string,source:'self'|'proxy',response:'yes'|'no'){
  const m=next.members.find(x=>x.id===id);if(!m)throw new AppError('이 모임의 회원을 선택해 주세요.');
  const current=s.participants.find(p=>p.memberId===id);if(current?.response===response)return;
  const full=s.cap!==null&&counts(s).regular>=s.cap;
  const category=stage(s,now)==='candidates'||full?'candidate':'regular';
  const entry:Participant={id,memberId:id,response,category,source,at,team:null,position:m.main,setterSeat:m.main==='S'?'OP':undefined};
  if(current)Object.assign(current,entry);else s.participants.push(entry);
 }
 switch(a.type){
 case 'respond':{
  if(role!=='member')throw new AppError('회원 화면에서 본인의 참석 여부를 선택해 주세요.');
  const s=ses(),st=stage(s,now);if(st!=='open'&&st!=='candidates')throw new AppError('지금은 신청을 받지 않아요.');
  if(a.response!=='yes'&&a.response!=='no')throw new AppError('응답을 확인해 주세요.');
  if(a.response==='no'&&st==='candidates')throw new AppError('마감 이후 변경은 운영진에게 연락해 주세요.');
  addMember(s,DEMO_MEMBER,'self',a.response);break;
 }
 case 'proxy':{leader(role);const s=ses();editable(s);addMember(s,str(a.memberId),'proxy','yes');break;}
 case 'guest':{admin(role);const s=ses();editable(s);s.participants.push({id:crypto.randomUUID(),guest:true,name:str(a.name,30),response:'yes',category:'regular',source:'guest',at,team:null});break;}
 case 'removeGuest':{admin(role);const s=ses();editable(s);const p=s.participants.find(p=>p.id===a.participantId);if(!p?.guest)throw new AppError('임시 게스트만 제거할 수 있어요.');if(p.team!==null)leader(role);s.participants=s.participants.filter(item=>item.id!==p.id);break;}
 case 'editGuest':{admin(role);const s=ses();editable(s);const p=s.participants.find(p=>p.id===a.participantId);if(!p?.guest)throw new AppError('임시 게스트를 찾을 수 없어요.');p.name=str(a.name,30);break;}
 case 'assign':{admin(role);const s=ses();editable(s);const p=s.participants.find(p=>p.id===a.participantId);if(!p||p.response!=='yes')throw new AppError('회차 참가 인원을 선택해 주세요.');const special=p.guest||next.members.find(m=>m.id===p.memberId)?.kind==='new';if(special)leader(role);p.team=a.team===null?null:num(a.team,0,s.teamCount-1);break;}
 case 'position':{admin(role);const s=ses();editable(s);const p=s.participants.find(p=>p.id===a.participantId);if(!p)throw new AppError('참가 인원을 찾을 수 없어요.');p.position=pos(a.position);p.setterSeat=p.position==='S'?(a.setterSeat==='MB'?'MB':'OP'):undefined;break;}
 case 'template':{admin(role);const s=ses();editable(s);s.teamCount=num(a.teamCount,2,6);s.teamSize=num(a.teamSize,6,7);s.participants.forEach(p=>{if(p.team!==null&&p.team>=s.teamCount)p.team=null});break;}
 case 'publish':{admin(role);const s=ses();editable(s);s.published={at,teams:s.teamCount,teamSize:s.teamSize,people:s.participants.filter(p=>p.response==='yes').map(p=>({id:p.id,name:nameOf(next,p),team:p.team,position:p.position,setterSeat:p.setterSeat})).sort((a,b)=>a.name.localeCompare(b.name,'ko'))};break;}
 case 'phase':{admin(role);const s=ses();const phase=str(a.phase);if(!['open','candidates','closed','ended','cancelled'].includes(phase))throw new AppError('상태를 확인해 주세요.');if(['open','candidates'].includes(phase)&&now>=Date.parse(s.start))throw new AppError('운동 시작 전 회차만 신청을 열 수 있어요.');if(phase==='open'&&now>=Date.parse(s.deadline))throw new AppError('다시 열려면 신청 마감 시각을 먼저 변경해 주세요.');s.phase=phase as Session['phase'];break;}
 case 'saveSession':{admin(role);const s=ses();editable(s);const start=str(a.start),end=str(a.end),deadline=str(a.deadline);if(!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))||!Number.isFinite(Date.parse(deadline))||Date.parse(start)>=Date.parse(end)||Date.parse(deadline)>=Date.parse(start))throw new AppError('신청 마감 → 운동 시작 → 종료 순서로 입력해 주세요.');Object.assign(s,{title:str(a.title,60),location:str(a.location,100),address:typeof a.address==='string'?a.address.slice(0,200):'',note:typeof a.note==='string'?a.note.slice(0,2000):'',start,end,deadline,cap:a.cap===null?null:num(a.cap,1,200)});break;}
 case 'clone':{admin(role);const s=ses();const shift=(d:string)=>new Date(Date.parse(d)+7*86400000).toISOString();const newSession:Session={...structuredClone(s),id:crypto.randomUUID(),start:shift(s.start),end:shift(s.end),deadline:shift(s.deadline),phase:'draft',participants:[],published:null};next.sessions.push(newSession);break;}
 case 'profile':{admin(role);const m=next.members.find(m=>m.id===a.memberId);if(!m)throw new AppError('회원을 찾을 수 없어요.');m.main=pos(a.main);m.sub=pos(a.sub);m.level=a.level===null?null:num(a.level,1,5);break;}
 case 'club':{leader(role);next.club={...next.club,name:str(a.name,40),location:str(a.location,100),address:str(a.address,200),weekday:num(a.weekday,0,6),startTime:str(a.startTime,5),endTime:str(a.endTime,5)};if(!/^\d{2}:\d{2}$/.test(next.club.startTime)||!/^\d{2}:\d{2}$/.test(next.club.endTime)||next.club.startTime>=next.club.endTime)throw new AppError('모임 기본 시간을 확인해 주세요.');break;}
 case 'post':{const category=str(a.category);if(!['notice','event','board'].includes(category))throw new AppError('게시판을 선택해 주세요.');if(role==='member'&&category!=='board')throw new AppError('공지·이벤트는 운영진이 작성해요.',403);next.posts.unshift({id:crypto.randomUUID(),category:category as 'notice',title:str(a.title,100),body:str(a.body,5000),author:role==='member'?next.members.find(m=>m.id===DEMO_MEMBER)!.name:'운영진',at,pinned:role!=='member'&&a.pinned===true,comments:[]});break;}
 case 'comment':{const post=next.posts.find(p=>p.id===a.postId);if(!post)throw new AppError('게시글을 찾을 수 없어요.');post.comments.push({id:crypto.randomUUID(),body:str(a.body,2000),author:role==='member'?next.members.find(m=>m.id===DEMO_MEMBER)!.name:'운영진',at});break;}
 default:throw new AppError('지원하지 않는 작업이에요.');
 }
 next.audit.push({at,actor:role,action:a.type,sessionId:a.sessionId});return next;
}
