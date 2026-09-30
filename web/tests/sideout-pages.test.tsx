// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
import {MemberAccessGate} from '../components/member-access/access-gate';
import {SideoutAccess} from '../components/sideout/access';
import {HomeScreen} from '../components/sideout/home';
import {MatchList} from '../components/sideout/match-list';
import {PublishedTeams} from '../components/sideout/published-teams';
import {SessionDetailScreen} from '../components/sideout/session-detail';
import {createMemberAccessClient} from '../lib/member-access-client';
import {createSideoutClient} from '../lib/sideout-client';
import type {SessionView} from '../lib/auth/contracts';
import {clubs,ids,session as fixtureSession} from './fixtures/sideout';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),replace:vi.fn()}),usePathname:()=>'/home',useSearchParams:()=>new URLSearchParams()}));
vi.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=> <a {...props}>{children}</a>}));
beforeEach(()=>vi.spyOn(window,'scrollTo').mockImplementation(()=>{}));
afterEach(()=>{cleanup();vi.restoreAllMocks()});
it('renders stored match order and IDs, including rookies, at twenty minute intervals',()=>{
 render(<MatchList start="08:30" teams={[{id:'opaque-b',title:'B팀',players:[]},{id:'opaque-a',title:'A팀',players:[]}]} plan={{teamCount:2,rookieTeamCount:2,matches:[{id:'first',kind:'rookie',home:'R1',away:'R2'},{id:'second',kind:'regular',home:'opaque-a',away:'opaque-b'}]}}/>);
 const rows=screen.getAllByRole('row');expect(rows[1].textContent).toContain('08:30 – 08:50');expect(rows[1].textContent).toContain('신입 1팀 vs 신입 2팀');expect(rows[2].textContent).toContain('08:50 – 09:10');expect(rows[2].textContent).toContain('A팀 vs B팀');
});
const active=(name:string,id=ids.applicant):SessionView=>({state:'active',me:{memberId:id,displayName:name,loginId:'시험',homeClubId:clubs[0].id},authorizationVersion:1});
it.each(['anonymous','password_change_required','active'] as const)('preserves %s form input when returning from another app, and rechecks before leaving password edit',async state=>{
 let who:SessionView=state==='active'?active('계정 A'):state==='anonymous'?{state}:{state,expiresAt:'2026-10-07T00:00:00Z'};
 const client=createMemberAccessClient(async()=>Response.json(who));
 render(<MemberAccessGate client={client} revalidateOnFocus renderActive={(s,a)=><><p>{s.me.displayName}</p><button onClick={a.changePassword}>변경 열기</button></>}/>);
 if(state==='active')fireEvent.click(await screen.findByText('변경 열기'));
 const input=await screen.findByLabelText(state==='anonymous'?'비밀번호':state==='active'?'현재 비밀번호':'현재 임시 비밀번호',{exact:true});
 fireEvent.change(input,{target:{value:'Remembered123'}});
 fireEvent.focus(window);fireEvent(document,new Event('visibilitychange'));
 await act(async()=>{});
 expect((screen.getByLabelText(state==='anonymous'?'비밀번호':state==='active'?'현재 비밀번호':'현재 임시 비밀번호',{exact:true}) as HTMLInputElement).value).toBe('Remembered123');
 if(state==='active'){who=active('계정 B',ids.guest);fireEvent.click(screen.getByText('돌아가기'));expect(screen.queryByText('계정 A')).toBeNull();await screen.findByText('계정 B')}
});
it('shows the approved detail roster with name, club and position instead of editor preview controls',()=>{
 const player={memberId:'viewer',slotId:'s',assignedPosition:'S' as const,displayName:'시험회원',clubName:'시험 모임'};
 render(<PublishedTeams memberId="viewer" teams={[{id:'a',title:'A팀',players:[player]}]}/>);
 expect(screen.getByRole('columnheader',{name:'이름'})).toBeTruthy();expect(screen.getByRole('columnheader',{name:'소속'})).toBeTruthy();expect(screen.getByRole('columnheader',{name:'포지션'})).toBeTruthy();
 expect(screen.getByRole('cell',{name:'세터'})).toBeTruthy();expect(screen.getByText('나')).toBeTruthy();expect(screen.queryByRole('button',{name:'코트'})).toBeNull();
});
it('leaves the old route only after a successful explicit logout',async()=>{
 let fail=true;const signedOut=vi.fn();
 const client={...createMemberAccessClient(),session:async()=>active('계정 A'),logout:async()=>{if(fail)throw Error('offline');return {state:'anonymous' as const}}};
 render(<MemberAccessGate client={client} onSignedOut={signedOut} renderActive={(s,a)=><button onClick={()=>void a.logout()}>로그아웃</button>}/>);
 fireEvent.click(await screen.findByText('로그아웃'));await screen.findByRole('alert');expect(signedOut).not.toHaveBeenCalled();
 fail=false;fireEvent.click(screen.getByText('로그아웃'));await screen.findByRole('button',{name:'로그인'});expect(signedOut).toHaveBeenCalledTimes(1);
});
it('opens the shared roster overlay from detail and restores focus on closing',async()=>{
  const member=(memberId:string,clubName:string)=>({memberId,displayName:memberId,clubName});
  const data={session:fixtureSession,club:clubs[0],sessionRevision:1,rosterRevision:1,counts:{applicants:2,waiting:1},selfStatus:null,teamPublished:false,canViewPublishedTeams:false,canManage:true,visibleApplicants:[member('소속선수',clubs[0].name),member('게스트선수',clubs[1].name)],visibleWaiters:[member('대기선수',clubs[1].name)],guestCount:1,publishedTeams:null,publishedMatches:null,capabilities:{canEditSchedule:false,canManageRoster:false,canEditTeams:false,canEditMatches:false,canPublish:false,canCancelSelf:false}};
  const auth=createMemberAccessClient(async()=>Response.json(active('시험마스터',ids.master)));
  const client=createSideoutClient(async path=>Response.json({ok:true,data:String(path).startsWith('/api/clubs')?{serverNow:'2026-09-30T00:00:00Z',clubs,capabilities:{canManageMembers:true}}:data}));
  render(<SideoutAccess authClient={auth} client={client}><SessionDetailScreen id="session-test-open"/></SideoutAccess>);
  const button=await screen.findByRole('button',{name:'명단 확인'});button.focus();fireEvent.click(button);
  await screen.findByRole('dialog',{name:'함께하는 회원'});expect(screen.getByRole('heading',{name:'소속 회원'})).toBeTruthy();expect(screen.getByRole('heading',{name:'게스트'})).toBeTruthy();expect(screen.getByRole('heading',{name:'대기자'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'확인'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(document.activeElement).toBe(button);
});
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
it('keeps explicit logout authoritative when focus revalidation occurs while the request is pending',async()=>{
 let finish!:()=>void;const signedOut=vi.fn(),read=vi.fn(async()=>active('계정 A'));
 const client={...createMemberAccessClient(),session:read,logout:()=>new Promise<{state:'anonymous'}>(resolve=>{finish=()=>resolve({state:'anonymous'})})};
 render(<MemberAccessGate client={client} onSignedOut={signedOut} revalidateOnFocus renderActive={(s,a)=><button onClick={()=>void a.logout()}>로그아웃</button>}/>);
 fireEvent.click(await screen.findByText('로그아웃'));fireEvent.focus(window);fireEvent(document,new Event('visibilitychange'));
 await act(async()=>{finish()});await screen.findByRole('button',{name:'로그인'});expect(signedOut).toHaveBeenCalledTimes(1);expect(read).toHaveBeenCalledTimes(1);
});
