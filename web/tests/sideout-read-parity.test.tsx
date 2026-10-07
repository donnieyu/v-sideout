// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,cleanup,within,fireEvent} from '@testing-library/react';
import {SideoutAccess} from '../components/sideout/access';
import {HomeScreen} from '../components/sideout/home';
import {SessionDetailScreen} from '../components/sideout/session-detail';
import {createMemberAccessClient} from '../lib/member-access-client';
import {createSideoutClient} from '../lib/sideout-client';
import {clubs,ids,session} from './fixtures/sideout';
import type {SessionDetailView,HomeView} from '../lib/sideout/read-model';
let query='';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),replace:vi.fn()}),usePathname:()=>'/home',useSearchParams:()=>new URLSearchParams(query)}));
vi.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=><a {...props}>{children}</a>}));
beforeEach(()=>{query='';vi.spyOn(window,'scrollTo').mockImplementation(()=>{})});
afterEach(()=>{cleanup();vi.restoreAllMocks()});
const detail=():SessionDetailView=>({session,club:clubs[0],sessionRevision:1,rosterRevision:1,counts:{applicants:2,waiting:1},selfStatus:'applied',teamPublished:false,canViewPublishedTeams:false,canManage:true,visibleApplicants:[],visibleWaiters:[],guestCount:0,publishedTeams:null,publishedMatches:null,capabilities:{canEditSchedule:false,canManageRoster:false,canCancelRoster:false,canEditTeams:false,canEditMatches:false,canPublish:false,canCancelSelf:false}});
function mount(data:HomeView|SessionDetailView,child:React.ReactNode){
 const auth=createMemberAccessClient(async()=>Response.json({state:'active',me:{memberId:ids.master,displayName:'시험 마스터',loginId:'test',homeClubId:null},authorizationVersion:1}));
 const client=createSideoutClient(async path=>Response.json({ok:true,data:String(path).startsWith('/api/clubs')?{serverNow:'2026-09-30T00:00:00Z',clubs,capabilities:{canManageMembers:true}}:data}));
 return render(<SideoutAccess authClient={auth} client={client}>{child}</SideoutAccess>);
}
it('renders an upcoming schedule in desktop time bands and mobile date groups, counting only open sessions',async()=>{
 const open=detail(),draft={...detail(),session:{...session,id:'prepared',phase:'draft' as const}};
 const {container}=mount({serverNow:'2026-09-30T00:00:00Z',weekStart:'2026-09-28',cards:[open,draft],registrationOpportunities:[{clubId:clubs[1].id,date:'2026-10-03'}]},<HomeScreen/>);
 await screen.findByText('1개');expect(screen.queryByText('2개')).toBeNull();
 expect(container.querySelector('[aria-label="요일과 시간대별 일정"]')).toBeTruthy();
 const mobile=container.querySelector('[aria-label="날짜별 일정"]') as HTMLElement;
 expect(within(mobile).getAllByRole('article')).toHaveLength(3);
 expect(within(mobile).getAllByLabelText('모집 전, 신청 인원 없음')).toHaveLength(2);
 expect(within(mobile).getByRole('link',{name:'모임 등록'}).getAttribute('href')).toContain('/session/new?');
 expect(within(mobile).queryByText('내 모임')).toBeNull();
});
it('shows an attendance archive with no application CTA, preserving the selected week in detail links',async()=>{
 query='weekStart=2026-09-21&filter=all';
 const past={...detail(),session:{...session,date:'2026-09-27'},teamPublished:true,canViewPublishedTeams:true};
 const {container}=mount({serverNow:'2026-09-30T00:00:00Z',weekStart:'2026-09-21',cards:[past],registrationOpportunities:[]},<HomeScreen/>);
 await screen.findByText('내가 참석한 운동');await screen.findAllByRole('link',{name:'팀편성 확인'});expect(screen.getByRole('heading',{name:'내가 함께했던 운동'})).toBeTruthy();
 const mobile=container.querySelector('[aria-label="날짜별 일정"]') as HTMLElement;
 expect(within(mobile).getByRole('link',{name:'팀편성 확인'}).getAttribute('href')).toContain('weekStart=2026-09-21&filter=all#teams');
 expect(within(mobile).queryByRole('button',{name:/참석 신청|참석 취소|취소 불가/})).toBeNull();
});
it('past detail keeps the published roster and order but removes deadlines and edit/application actions',async()=>{
 const data={...detail(),session:{...session,date:'2026-09-27'},teamPublished:true,canViewPublishedTeams:true,publishedTeams:[{id:'a',title:'A팀',players:[]}],publishedMatches:{teamCount:1,rookieTeamCount:0,matches:[]}};
 const {container}=mount(data,<SessionDetailScreen id={session.id}/>);
 await screen.findByRole('heading',{name:'당시 공개된 팀편성'});
 expect(screen.getByText('1팀 · 한 경기 20분')).toBeTruthy();
 expect(screen.queryByText('신청 마감')).toBeNull();expect(screen.queryByText(/ 마감/)).toBeNull();
 expect(screen.queryByRole('button',{name:/수정|참석 취소|취소 불가/})).toBeNull();
 expect(screen.getByRole('heading',{name:'일정 정보'}).compareDocumentPosition(container.querySelector('#teams')!)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(screen.queryByText('공개 완료')).toBeNull();
 expect(screen.queryByRole('heading',{name:'함께할 인원'})).toBeNull();
 expect(within(container.querySelector('#teams') as HTMLElement).getByRole('button',{name:'명단 확인'})).toBeTruthy();
});
it.each([{manager:true,status:null},{manager:false,status:'applied'}] as const)('shows a clearly labelled, anonymous prepublication layout for an authorized viewer %j',async({manager,status})=>{
 mount({...detail(),canManage:manager,selfStatus:status},<SessionDetailScreen id={session.id}/>);
 await screen.findByText('화면 구성 예시');expect(screen.getAllByRole('heading',{name:'팀 이름'})).toHaveLength(3);
 expect(screen.queryByText('A팀')).toBeNull();
});
it('does not replace restricted published teams with an apparent example roster',async()=>{
 mount({...detail(),canManage:false,selfStatus:'waiting',teamPublished:true},<SessionDetailScreen id={session.id}/>);
 await screen.findByText('참석 회원만 팀편성과 경기 순서를 확인할 수 있어요.');expect(screen.queryByText('화면 구성 예시')).toBeNull();
 expect(screen.getByRole('heading',{name:'함께할 인원'})).toBeTruthy();
});
it('keeps schedule first and shows the published roster directly inside the team section',async()=>{
 const data={...detail(),canManage:true,capabilities:{...detail().capabilities,canEditTeams:true},teamPublished:true,canViewPublishedTeams:true,publishedTeams:[{id:'A',title:'A팀',players:[{memberId:ids.master,displayName:'시험 마스터',homeClubId:clubs[0].id,clubName:clubs[0].name,slotId:'s',assignedPosition:'S' as const}]}]};
 const {container}=mount(data,<SessionDetailScreen id={session.id}/>);
 const teamHeading=await screen.findByRole('heading',{name:'팀편성'});
 expect(screen.getByText('공개 완료')).toBeTruthy();
 expect(screen.getByText('1팀 · 1명 배정')).toBeTruthy();
 expect(screen.getByText('내 팀')).toBeTruthy();
 expect(screen.getByRole('heading',{name:'일정 정보'}).compareDocumentPosition(container.querySelector('#teams')!)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(screen.queryByRole('heading',{name:'함께할 인원'})).toBeNull();
 expect(container.querySelector('[aria-label^="운동 일정 "]')).toBeNull();
 const team=within(container.querySelector('#teams') as HTMLElement);
 expect(team.getByText('시험 마스터')).toBeTruthy();
 fireEvent.click(team.getByRole('button',{name:'명단 확인'}));
 expect(await screen.findByRole('dialog')).toBeTruthy();
 expect(screen.getByRole('button',{name:'공개 취소'})).toBeTruthy();
 expect(teamHeading.closest('section')?.querySelectorAll('article')).toHaveLength(1);
});
it('renders the manager saved preview instead of old published teams and matching draft game order',async()=>{
 const data={...detail(),teamPublished:true,publishedTeams:[{id:'A',title:'이전 공개팀',players:[]}],managerTeamPreview:{teams:[{id:'B',title:'최근 저장팀',players:[{memberId:'x',displayName:'신규 선수',homeClubId:clubs[0].id,clubName:'뉴배동',slotId:'s',assignedPosition:'S' as const}]}],matches:{teamCount:1,rookieTeamCount:2,matches:[]},unpublishedChanges:true}};
 const {container}=mount(data,<SessionDetailScreen id={session.id}/>);await screen.findByRole('heading',{name:'최근 저장팀'});expect(screen.queryByRole('heading',{name:'이전 공개팀'})).toBeNull();expect(screen.getByText('신규 선수')).toBeTruthy();expect(screen.getByText('미공개 변경')).toBeTruthy();expect(screen.queryByText('공개 완료')).toBeNull();expect(screen.getByRole('heading',{name:'경기 순서'})).toBeTruthy();
 expect(screen.getByRole('heading',{name:'일정 정보'}).compareDocumentPosition(container.querySelector('#teams')!)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(screen.getByRole('heading',{name:'함께할 인원'})).toBeTruthy();
});

it('groups roster members by club ID rather than equal or outdated club labels',async()=>{
 const data={...detail(),visibleApplicants:[{memberId:'own',displayName:'우리회원',homeClubId:clubs[0].id,clubName:'이전 모임명'},{memberId:'guest',displayName:'동명모임회원',homeClubId:clubs[1].id,clubName:clubs[0].name},{memberId:'none',displayName:'무소속회원',homeClubId:null,clubName:null}],guestCount:2};
 mount(data,<SessionDetailScreen id={session.id}/>);fireEvent.click(await screen.findByRole('button',{name:'명단 확인'}));await screen.findByText('우리회원');
 const own=within(screen.getByRole('heading',{name:'소속 회원'}).closest('section')!),guest=within(screen.getByRole('heading',{name:'게스트'}).closest('section')!);
 expect(own.getByText('우리회원')).toBeTruthy();expect(own.queryByText('동명모임회원')).toBeNull();expect(guest.getByText('동명모임회원')).toBeTruthy();expect(guest.getByText('무소속회원')).toBeTruthy();expect(guest.getByText('소속 없음')).toBeTruthy();
});
