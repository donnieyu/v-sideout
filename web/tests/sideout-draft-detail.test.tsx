// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,within,fireEvent,cleanup,act} from '@testing-library/react';
import {SideoutAccess} from '../components/sideout/access';
import {SessionDetailScreen} from '../components/sideout/session-detail';
import {createMemberAccessClient} from '../lib/member-access-client';
import {createSideoutClient} from '../lib/sideout-client';
import {clubs,ids,session} from './fixtures/sideout';
vi.mock('next/navigation',()=>({usePathname:()=>'/session/'+session.id,useSearchParams:()=>new URLSearchParams('weekStart=2026-09-28&filter=all')}));
vi.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=><a {...props}>{children}</a>}));
beforeEach(()=>{vi.spyOn(window,'scrollTo').mockImplementation(()=>{});vi.spyOn(window,'confirm').mockReturnValue(true)});
afterEach(()=>{cleanup();vi.restoreAllMocks()});
function setup({canEdit=true,now='2026-09-30T00:00:00Z',post}:{canEdit?:boolean;now?:string;post?:(body:unknown)=>Promise<Response>}={}){
 const saved={...session,phase:'draft' as const,place:'저장해 둔 체육관',notice:'저장한 운동 공지',cap:28};
 let record={...saved,phase:'draft' as 'draft'|'open'};
 const writes:Record<string,unknown>[]=[];
 const client=createSideoutClient(async(path,init)=>{
  if(init?.method==='POST'){
   const body=JSON.parse(String(init.body));writes.push(body);
   if(post)return post(body);
   record={...record,phase:'open'};
   return Response.json({ok:true,data:{resourceId:session.id,revision:8}});
  }
  return Response.json({ok:true,data:String(path).startsWith('/api/clubs')?{serverNow:now,clubs,capabilities:{canManageMembers:true}}:{session:record,club:clubs[0],sessionRevision:7,rosterRevision:1,counts:{applicants:0,waiting:0},selfStatus:null,teamPublished:false,canViewPublishedTeams:false,canManage:true,visibleApplicants:[],guestCount:0,publishedTeams:null,publishedMatches:null,capabilities:{canEditSchedule:canEdit,canManageRoster:false,canCancelRoster:false,canEditTeams:false,canEditMatches:false,canPublish:false,canCancelSelf:false}}});
 });
 const auth=createMemberAccessClient(async()=>Response.json({state:'active',me:{memberId:ids.master,displayName:'시험 마스터',loginId:'시험',homeClubId:clubs[0].id},authorizationVersion:1}));
 render(<SideoutAccess authClient={auth} client={client}><SessionDetailScreen id={session.id}/></SideoutAccess>);
 return {writes,saved};
}
it('shows saved draft information on detail, with a private preparation state and explicit editing',async()=>{
 setup();await screen.findByText('모집 준비 중');
 expect(screen.getByText(/아직 회원에게 공개되지/)).toBeTruthy();
 expect(screen.getByText('저장해 둔 체육관')).toBeTruthy();expect(screen.getByText('저장한 운동 공지')).toBeTruthy();expect(screen.getByText('28명')).toBeTruthy();
 expect(screen.queryByRole('textbox')).toBeNull();expect(screen.queryByRole('button',{name:'명단 확인'})).toBeNull();expect(screen.queryByRole('heading',{name:'팀편성'})).toBeNull();
 expect(screen.getByRole('link',{name:'일정 수정'}).getAttribute('href')).toContain('/schedule/edit?weekStart=2026-09-28&filter=all');
 expect(screen.getByRole('button',{name:'모집 시작'})).toBeTruthy();expect(screen.getByRole('link',{name:'운동 일정으로'})).toBeTruthy();
});
it('starts recruitment once with the persisted fields and revision, then shows the open detail',async()=>{
 const {writes,saved}=setup();fireEvent.click(await screen.findByRole('button',{name:'모집 시작'}));fireEvent.click(screen.getByRole('button',{name:'확인'}));
 await screen.findByRole('button',{name:'명단 확인'});
 expect(writes).toHaveLength(1);const {id,...fields}=saved;expect(writes[0]).toMatchObject({expectedRevision:7,payload:{...fields,phase:'open'}});expect((writes[0].payload as object)).not.toHaveProperty('id');expect(id).toBe(session.id);
 expect(screen.queryByText('모집 준비 중')).toBeNull();expect(screen.queryByRole('button',{name:'모집 시작'})).toBeNull();expect(screen.getByText('아직 팀편성이 공개되지 않았어요.')).toBeTruthy();
});
it('blocks duplicate clicks and keeps saved information after failure, reusing the retry command',async()=>{
 let finish!:(r:Response)=>void;
 const {writes}=setup({post:()=>new Promise(resolve=>{finish=resolve})});
 const button=await screen.findByRole('button',{name:'모집 시작'});fireEvent.click(button);const confirm=screen.getByRole('button',{name:'확인'});fireEvent.click(confirm);fireEvent.click(confirm);
 expect(writes).toHaveLength(1);expect(screen.getByRole('button',{name:'돌아가기'}).hasAttribute('disabled')).toBe(true);
 await act(async()=>finish(Response.json({error:{code:'NETWORK_ERROR',message:'연결을 확인해 주세요.'}},{status:503})));
 await screen.findByRole('alert');expect(screen.getByText('저장해 둔 체육관')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'모집 시작'}));fireEvent.click(screen.getByRole('button',{name:'확인'}));expect(writes).toHaveLength(2);expect(writes[1]).toEqual(writes[0]);
 await act(async()=>finish(Response.json({error:{code:'NETWORK_ERROR',message:'연결을 확인해 주세요.'}},{status:503})));
});
it.each([{canEdit:false},{now:'2026-10-05T00:00:00Z'}])('does not offer recruitment without permission or after start (%j)',async options=>{
 setup(options);await screen.findByText('모집 준비 중');expect(screen.queryByRole('button',{name:'모집 시작'})).toBeNull();
});

it('explains recruitment visibility and sends no write when an existing draft start is cancelled',async()=>{
 const {writes}=setup();
 fireEvent.click(await screen.findByRole('button',{name:'모집 시작'}));
 const dialog=screen.getByRole('dialog',{name:'모집을 시작할까요?'});expect(within(dialog).getByText('회원들에게 일정이 공개되며, 참석 신청을 받을 수 있습니다.')).toBeTruthy();expect(writes).toHaveLength(0);fireEvent.click(within(dialog).getByRole('button',{name:'취소'}));expect(window.confirm).not.toHaveBeenCalled();
 expect(writes).toHaveLength(0);expect(screen.getByText('모집 준비 중')).toBeTruthy();expect(screen.getByRole('button',{name:'모집 시작'}).hasAttribute('disabled')).toBe(false);
});
