// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
import {MemberAccessGate} from '../components/member-access/access-gate';
import {SideoutAccess} from '../components/sideout/access';
import {HomeScreen} from '../components/sideout/home';
import {MatchList} from '../components/sideout/match-list';
import {createMemberAccessClient} from '../lib/member-access-client';
import {createSideoutClient} from '../lib/sideout-client';
import type {SessionView} from '../lib/auth/contracts';
import {clubs,ids} from './fixtures/sideout';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),replace:vi.fn()}),usePathname:()=>'/home',useSearchParams:()=>new URLSearchParams()}));
vi.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=> <a {...props}>{children}</a>}));
beforeEach(()=>vi.spyOn(window,'scrollTo').mockImplementation(()=>{}));
afterEach(()=>{cleanup();vi.restoreAllMocks()});
it('renders stored match order and IDs, including rookies, at twenty minute intervals',()=>{
 render(<MatchList start="08:30" teams={[{id:'opaque-b',title:'B팀',players:[]},{id:'opaque-a',title:'A팀',players:[]}]} plan={{teamCount:2,rookieTeamCount:2,matches:[{id:'first',kind:'rookie',home:'R1',away:'R2'},{id:'second',kind:'regular',home:'opaque-a',away:'opaque-b'}]}}/>);
 const rows=screen.getAllByRole('row');expect(rows[1].textContent).toContain('08:30 – 08:50');expect(rows[1].textContent).toContain('신입 1팀 vs 신입 2팀');expect(rows[2].textContent).toContain('08:50 – 09:10');expect(rows[2].textContent).toContain('A팀 vs B팀');
});
const active=(name:string,id=ids.applicant):SessionView=>({state:'active',me:{memberId:id,displayName:name,loginId:'시험',homeClubId:clubs[0].id},authorizationVersion:1});
it('login and first password change gate business content',async()=>{
 let session:SessionView={state:'anonymous'};
 const client=createMemberAccessClient(async(path)=>{if(String(path).endsWith('/login'))session={state:'password_change_required',expiresAt:'2026-10-07T00:00:00Z'};if(String(path).endsWith('/password'))session=active('시험회원');return Response.json(session)});
 render(<MemberAccessGate client={client} renderActive={()=> <p>허용된 홈</p>}/>);
 await screen.findByRole('button',{name:'로그인'});expect(screen.queryByText('허용된 홈')).toBeNull();
 fireEvent.change(screen.getByLabelText('로그인 아이디'),{target:{value:'시험'}});fireEvent.change(screen.getByLabelText('비밀번호'),{target:{value:'Temporary123'}});fireEvent.click(screen.getByRole('button',{name:'로그인'}));
 await screen.findByRole('heading',{name:'첫 비밀번호 변경'});expect(screen.queryByText('허용된 홈')).toBeNull();
 for(const label of ['현재 임시 비밀번호','새 비밀번호','새 비밀번호 확인'])fireEvent.change(screen.getByLabelText(label,{exact:false,selector:label==='새 비밀번호'?'input[minlength]':'input'}),{target:{value:label==='현재 임시 비밀번호'?'Temporary123':'ChangedPass123'}});
 fireEvent.click(screen.getByRole('button',{name:'비밀번호 변경'}));await screen.findByText('허용된 홈');
});
it('refresh on focus hides old account immediately and ignores an older session response',async()=>{
 let pending:((s:SessionView)=>void)|undefined,calls=0;
 const client={...createMemberAccessClient(),session:()=>{calls++;return calls===2?new Promise<SessionView>(r=>{pending=r}):Promise.resolve(active(calls===1?'계정 A':'계정 B',calls===1?ids.applicant:ids.guest))}};
 render(<MemberAccessGate client={client} revalidateOnFocus renderActive={s=><p>{s.me.displayName}</p>}/>);
 await screen.findByText('계정 A');fireEvent.focus(window);expect(screen.queryByText('계정 A')).toBeNull();fireEvent.focus(window);await screen.findByText('계정 B');await act(async()=>pending?.(active('계정 A')));expect(screen.queryByText('계정 A')).toBeNull();
});
it('home uses server clubs and shows an honest read-only empty state',async()=>{
 const client=createMemberAccessClient(async()=>Response.json(active('시험회원')));
 const data=createSideoutClient(async path=>Response.json({ok:true,data:String(path).startsWith('/api/clubs')?{serverNow:'2026-09-30T00:00:00Z',clubs,capabilities:{canManageMembers:false}}:{serverNow:'2026-09-30T00:00:00Z',weekStart:'2026-09-28',cards:[],registrationOpportunities:[]}}));
 render(<SideoutAccess authClient={client} client={data}><HomeScreen/></SideoutAccess>);
 await screen.findByText('이 주에는 등록된 운동이 없어요.');expect(screen.getByText('실제 계정 연결 시험 · 조회만 제공')).toBeTruthy();expect(screen.queryByText('김나래')).toBeNull();
});
it('an account switch cannot display a delayed prior account home response',async()=>{
 let who=active('계정 A'),resolveA:((r:Response)=>void)|undefined,homes=0;
 const auth=createMemberAccessClient(async()=>Response.json(who));
 const data=createSideoutClient(async path=>String(path).startsWith('/api/clubs')?Response.json({ok:true,data:{serverNow:'2026-09-30T00:00:00Z',clubs,capabilities:{canManageMembers:false}}}):++homes===1?new Promise<Response>(r=>{resolveA=r}):Response.json({ok:true,data:{serverNow:'2026-09-30T00:00:00Z',weekStart:'2026-09-28',cards:[],registrationOpportunities:[]}}));
 render(<SideoutAccess authClient={auth} client={data}><HomeScreen/></SideoutAccess>);await waitFor(()=>expect(homes).toBe(1));who=active('계정 B',ids.guest);fireEvent.focus(window);await screen.findByText('이 주에는 등록된 운동이 없어요.');await act(async()=>resolveA?.(Response.json({ok:true,data:{serverNow:'2026-09-30T00:00:00Z',weekStart:'2026-09-28',cards:[],registrationOpportunities:[{clubId:clubs[0].id,date:'2026-10-04'}]}})));expect(screen.queryByText('모임 등록')).toBeNull();
});
