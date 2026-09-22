export type Role = 'master' | 'chair' | 'staff' | 'member';
export type Position = 'S' | 'MB' | 'OH' | 'OP';
export const positionNames: Record<Position, string> = { S: '세터', MB: '센터', OH: '레프트', OP: '라이트' };
export type Member = { id: string; name: string; kind: 'regular' | 'new'; main: Position; sub: Position; level: number | null };
export type Participant = { id: string; memberId?: string; name?: string; guest?: boolean; response: 'yes' | 'no'; category: 'regular' | 'candidate'; source: 'self' | 'proxy' | 'guest'; at: string; team: number | null; position?: Position; setterSeat?: 'MB' | 'OP' };
export type Published = { at: string; teams: number; teamSize: number; people: { id: string; name: string; team: number | null; position?: Position; setterSeat?: 'MB' | 'OP' }[] };
export type Session = { id: string; title: string; start: string; end: string; deadline: string; location: string; address: string; note: string; cap: number | null; phase: 'draft' | 'open' | 'candidates' | 'closed' | 'ended' | 'cancelled'; teamCount: number; teamSize: number; participants: Participant[]; published: Published | null };
export type Post = { id: string; category: 'notice' | 'event' | 'board'; title: string; body: string; author: string; at: string; pinned: boolean; comments: { id: string; body: string; author: string; at: string }[] };
export type Workspace = { club: { id: string; name: string; location: string; address: string; weekday: number; startTime: string; endTime: string }; members: Member[]; sessions: Session[]; posts: Post[]; audit: { at: string; actor: string; action: string; sessionId?: string }[] };
export type View = { revision: number; role: Role; memberId: string; club: Workspace['club']; sessions: Session[]; members: Member[]; posts: Post[]; myName: string };
export const DEMO_MEMBER = 'm22';
// Confirmed: leaders can add members and override the default separate group.
export const policies = { proxyByLeaders: true, specialTeamAssignment: true };
export function seedWorkspace(now = new Date()): Workspace {
  const kst = new Date(now.getTime() + 9 * 3600000);
  const sunday = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + ((7-kst.getUTCDay())%7 || 7), 5));
  const start = sunday.toISOString();
  const names = ['김도윤','이서준','박지훈','최민준','정하준','강현우','조시우','윤지호','장준서','임건우','한지민','오수빈','서유진','신하은','권서연','황예린','안지우','송채원','류민서','홍다은','전승호','김나래','배도현','백유나','문태영','양소연','남지안','성은우','유예진','하준혁'];
  const positions: Position[]=['S','MB','OH','OP','MB','OH'];
  const members: Member[]=names.map((name,i)=>({id:`m${i+1}`,name,kind:i>=26?'new':'regular',main:positions[i%6],sub:positions[(i+2)%6],level:i===25?null:(i%5)+1}));
  const participants: Participant[]=members.slice(0,20).map((m,i)=>({id:m.id,memberId:m.id,response:'yes',category:'regular',source:'self',at:new Date(sunday.getTime()-5*86400000+i*900000).toISOString(),team:null,position:m.main}));
  participants.push({id:'m27',memberId:'m27',response:'yes',category:'regular',source:'self',at:new Date(sunday.getTime()-3*86400000).toISOString(),team:null,position:'OH'});
  const session: Session={id:'s1',title:'일요일 정기 운동',start,end:new Date(sunday.getTime()+3*3600000).toISOString(),deadline:new Date(sunday.getTime()-86400000).toISOString(),location:'서울 체육관 · 샘플',address:'모임 장소를 설정해 주세요',note:'실내 운동화와 개인 물을 챙겨 주세요. 시작 10분 전부터 가볍게 몸을 풀어요.',cap:24,phase:'open',teamCount:4,teamSize:6,participants,published:null};
  return {club:{id:'seoul-demo',name:'사이드아웃 서울',location:session.location,address:session.address,weekday:0,startTime:'14:00',endTime:'17:00'},members,sessions:[session],posts:[{id:'p1',category:'notice',title:'코트에 들어가기 전, 함께 확인해요',body:'실내 전용 운동화를 준비해 주세요. 운동 시작 전에는 충분히 몸을 풀고, 사용한 공과 물품은 함께 정리해요.\n\n신청 변경이 어려운 경우 운영진에게 알려 주세요.',author:'운영진',at:new Date(sunday.getTime()-6*86400000).toISOString(),pinned:true,comments:[]},{id:'p2',category:'event',title:'이번 운동이 끝나면, 같이 밥 먹어요',body:'운동 후 함께 식사할 분들은 댓글로 이야기해 주세요. 장소는 당일 함께 정해요.',author:'운영진',at:new Date(sunday.getTime()-5*86400000).toISOString(),pinned:false,comments:[]},{id:'p3',category:'board',title:'처음 오시는 분들도 편하게 인사해요',body:'이름과 좋아하는 배구 이야기를 남겨 주세요. 코트에서 만나요!',author:'김도윤',at:new Date(sunday.getTime()-4*86400000).toISOString(),pinned:false,comments:[]}],audit:[]};
}
export function stage(s: Session, now=Date.now()) {
 if (['draft','closed','ended','cancelled'].includes(s.phase)) return s.phase;
 if(now>=Date.parse(s.start)) return 'closed';
 if(s.phase==='candidates'||now>=Date.parse(s.deadline)) return 'candidates';
 return 'open';
}
export function counts(s: Session) {
 const yes=s.participants.filter(p=>p.response==='yes');
 return { regular:yes.filter(p=>!p.guest&&p.category==='regular').length,candidate:yes.filter(p=>!p.guest&&p.category==='candidate').length,guests:yes.filter(p=>p.guest).length,total:yes.length,assigned:yes.filter(p=>p.team!==null).length };
}
export function projection(w: Workspace, role:Role, memberId:string, revision:number):View {
 const isAdmin=role!=='member';
 return {revision,role,memberId,club:w.club,myName:w.members.find(m=>m.id===memberId)?.name??'회원',members:isAdmin?w.members:[],posts:w.posts,sessions:w.sessions.filter(s=>isAdmin||s.phase!=='draft').map(s=>isAdmin?s:({...s,participants:s.participants.filter(p=>p.memberId===memberId).map(p=>({...p,at:'',source:'self',team:null,position:undefined,setterSeat:undefined})), counts:{regular:counts(s).regular,candidate:counts(s).candidate}} as Session))};
}
export function publicCounts(s:Session) {return (s as Session & {counts?:ReturnType<typeof counts>}).counts??counts(s)}
