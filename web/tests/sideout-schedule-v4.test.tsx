// @vitest-environment jsdom
import React from 'react';
import {AppConfirmProvider} from '../components/sideout/confirm-dialog';
const render=(ui:React.ReactElement)=>baseRender(ui,{wrapper:AppConfirmProvider});
import {it,expect,vi,afterEach} from 'vitest';
import {render as baseRender,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {EventCard} from '../components/sideout/home';
import {enrollmentProgress} from '../components/sideout/enrollment-progress';
import {clubs,ids,session} from './fixtures/sideout';
import type {SessionCardView} from '../lib/sideout/read-model';
vi.mock('../components/sideout/access',()=>({useSideout:()=>({session:{me:{memberId:ids.applicant,homeClubId:clubs[0].id}},client:{},actions:{}})}));
vi.mock('../components/sideout/roster-dialog',()=>({RosterButton:()=> <button>명단 확인</button>}));
vi.mock('../components/sideout/link',()=>({SideoutLink:({href,children,...props}:React.ComponentProps<'a'>)=><a href={href} {...props}>{children}</a>}));
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams(),usePathname:()=>'/home'}));
afterEach(()=>{cleanup();vi.restoreAllMocks()});
const card=(overrides:Partial<SessionCardView>={}):SessionCardView=>({session,club:clubs[0],sessionRevision:1,rosterRevision:1,counts:{applicants:18,waiting:0},selfStatus:null,teamPublished:false,canViewPublishedTeams:false,canManage:false,participation:{canRegister:true,canCancel:true,registerLabel:'참석 신청'},...overrides});
function draw(data:SessionCardView){return render(<EventCard card={data} suffix="" onOpen={()=>{}}/>)}
it('shows waiting reception before the deadline when eligibility only permits a waitlist',()=>{
 draw(card({session:{...session,deadline:'2099-10-03T09:00:00Z'},participation:{canRegister:true,canCancel:false,registerLabel:'대기자 등록'}}));
 expect(screen.getByText('대기 접수')).toBeTruthy();
 expect(screen.getByRole('button',{name:'대기자 등록'}).hasAttribute('disabled')).toBe(false);
 expect(screen.queryByText('접수 중')).toBeNull();
});
it('does not advertise reception when the server blocks new registration',()=>{
 draw(card({session:{...session,deadline:'2099-10-03T09:00:00Z'},participation:{canRegister:false,canCancel:false,registerLabel:'접수 종료'}}));
 expect(screen.queryByText('접수 중')).toBeNull();
 expect(screen.getByRole('button',{name:'접수 종료'}).hasAttribute('disabled')).toBe(true);
 expect(screen.getAllByText('접수 종료')).toHaveLength(2);
});
it('uses current server eligibility even when the local deadline has passed',()=>{
 draw(card());
 expect(screen.getByText('접수 중')).toBeTruthy();
 expect(screen.queryByText('대기 접수')).toBeNull();
});
it('shows all three times and notice without an extra generic detail button',()=>{
 draw(card());expect(screen.getByText('08:00')).toBeTruthy();expect(screen.getByText('08:30')).toBeTruthy();expect(screen.getByText('13:00')).toBeTruthy();expect(screen.getByRole('button',{name:'운동 공지'})).toBeTruthy();expect(screen.queryByRole('link',{name:/상세 정보/})).toBeNull();expect(screen.getByText('내 모임')).toBeTruthy();
});
it('keeps cancellation in the main action after applying and keeps roster access',()=>{
 draw(card({selfStatus:'applied'}));expect(screen.getByRole('button',{name:'참석 취소'}).getAttribute('data-variant')).toBe('outline');expect(screen.getByRole('button',{name:'명단 확인'})).toBeTruthy();expect(screen.queryByText('팀편성 준비 중')).toBeNull();
});
it('offers team and match viewing after publication without a redundant disabled cancel',()=>{
 draw(card({teamPublished:true,canViewPublishedTeams:true,selfStatus:'applied'}));expect(screen.getByRole('link',{name:'팀편성 · 경기 순서'})).toBeTruthy();expect(screen.queryByRole('button',{name:'취소 불가'})).toBeNull();
});
it('opens persisted freeform notice with long lines preserved',()=>{
 draw(card({session:{...session,notice:'첫째 안내\n둘째 공지\n'+'긴 내용 '.repeat(80)}}));fireEvent.click(screen.getByRole('button',{name:'운동 공지'}));expect(screen.getByRole('dialog',{name:'운동 공지'})).toBeTruthy();expect(screen.getByText(/첫째 안내/).textContent).toContain('\n둘째 공지\n');
});

it.each([[0,0],[17,17/18*100],[18,100],[19,19/21*100],[21,100],[22,22/24*100],[24,100],[25,25/28*100],[28,100],[29,100]])('enrollment %s uses the next visual milestone, not session capacity',(count,percent)=>{expect(enrollmentProgress(count)).toBeCloseTo(percent)});

it('does not repeat time and place in the home notice and hides an empty notice',()=>{
 const {unmount}=draw(card());fireEvent.click(screen.getByRole('button',{name:'운동 공지'}));
 const dialog=screen.getByRole('dialog',{name:'운동 공지'});expect(within(dialog).queryByText(session.place)).toBeNull();expect(within(dialog).queryByText(/부터 입장/)).toBeNull();expect(within(dialog).queryByRole('link',{name:'공지 수정'})).toBeNull();
 unmount();draw(card({session:{...session,notice:'  '}}));expect(screen.queryByRole('button',{name:'운동 공지'})).toBeNull();
});
it('removes notice editing when a refreshed server time reaches session start',()=>{
 const data=card({canManage:true,session:{...session,notice:''}});
 const before=new Date(Date.parse(session.date+'T'+session.start+':00+09:00')-1000).toISOString(),after=new Date(Date.parse(before)+1000).toISOString();
 const {rerender}=render(<EventCard card={data} suffix="" onOpen={()=>{}} serverNow={before}/>);expect(screen.getByRole('link',{name:'공지 추가'})).toBeTruthy();
 rerender(<EventCard card={data} suffix="" onOpen={()=>{}} serverNow={after}/>);expect(screen.queryByRole('link',{name:'공지 추가'})).toBeNull();
});

it('continues a prepared schedule on detail, retaining the home selection',()=>{
 render(<EventCard card={card({session:{...session,phase:'draft'},canManage:true})} suffix="?weekStart=2026-09-28&filter=all" onOpen={()=>{}}/>);
 expect(screen.getByRole('link',{name:'이어서 준비'}).getAttribute('href')).toBe('/session/'+session.id+'?weekStart=2026-09-28&filter=all');
});
