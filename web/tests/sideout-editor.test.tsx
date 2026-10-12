// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor,act} from '@testing-library/react';
import {SideoutAccess} from '../components/sideout/access';
import {ScheduleEditorScreen} from '../components/sideout/schedule-editor';
import {FavoriteEditor} from '../components/sideout/favorite-editor';
import {createMemberAccessClient} from '../lib/member-access-client';
import {createSideoutClient} from '../lib/sideout-client';
import type {SessionView} from '../lib/auth/contracts';
import {clubs,ids,session} from './fixtures/sideout';
vi.mock('next/navigation',()=>({usePathname:()=>location.pathname,useSearchParams:()=>new URLSearchParams(location.search)}));
afterEach(()=>{cleanup();vi.restoreAllMocks();history.replaceState(null,'','/home')});
function setup(child=<ScheduleEditorScreen id={session.id}/>,phase:'draft'|'open'='open'){
 if(location.pathname==='/home'||location.pathname==='/')history.replaceState(null,'','/session/'+session.id+'/schedule/edit');
 let who:SessionView={state:'active',me:{memberId:ids.master,loginId:'시험',displayName:'마스터',homeClubId:null},authorizationVersion:1};
 let fail=false,conflict=false,serverPlace=session.place,revision=1,authFailure=false;
 const writes:Record<string,any>[]=[];
 const auth={...createMemberAccessClient(),session:vi.fn(async()=>{if(authFailure)throw Error('offline');return who})};
 const data={session:{...session,phase},club:clubs[0],sessionRevision:1,rosterRevision:1,counts:{applicants:2,waiting:1},selfStatus:null,teamPublished:false,canViewPublishedTeams:false,canManage:true,visibleApplicants:[],visibleWaiters:[],guestCount:0,publishedTeams:null,publishedMatches:null,capabilities:{canEditSchedule:true,canManageRoster:false,canCancelRoster:false,canEditTeams:false,canEditMatches:false,canPublish:false,canCancelSelf:false}};
 const client=createSideoutClient(async(path,options)=>{
  if(options?.method==='POST'){
   const body=JSON.parse(options.body as string);writes.push(body);
   if(fail)throw Error('offline');
   if(conflict)return Response.json({ok:false,error:{code:'CONFLICT',message:'최신 정보를 확인해 주세요.'}},{status:409});
   serverPlace=body.payload.place??serverPlace;return Response.json({ok:true,data:{resourceId:session.id,revision:++revision}});
  }
  return Response.json({ok:true,data:String(path).startsWith('/api/clubs')?{clubs,serverNow:'2026-10-02T00:00:00Z',capabilities:{canManageMembers:true,managedClubIds:[clubs[0].id]}}:String(path).includes('preferences')?{value:{favoriteClubIds:[]},revision:0}:{...data,session:{...session,phase,place:serverPlace},sessionRevision:revision}});
 });
 render(<SideoutAccess authClient={auth} client={client}>{child}</SideoutAccess>);
 return {writes,setFail:(v:boolean)=>{fail=v},setConflict:(v:boolean)=>{conflict=v},setAuthFailure:(v:boolean)=>{authFailure=v},switchAccount:()=>{who={...who as Extract<SessionView,{state:'active'}>,me:{memberId:ids.operator,loginId:'다른 계정',displayName:'운영자',homeClubId:clubs[0].id}}}};
}
it('keeps input on failed save, reuses the command on retry and stays in the editor after saving',async()=>{
 const f=setup();fireEvent.change(await screen.findByLabelText('장소'),{target:{value:'변경 장소'}});f.setFail(true);
 fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByRole('alert');expect((screen.getByLabelText('장소') as HTMLInputElement).value).toBe('변경 장소');
 f.setFail(false);fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByText('저장했어요. 계속 수정할 수 있습니다.');
 expect(f.writes[0].commandId).toBe(f.writes[1].commandId);expect(screen.getByRole('heading',{name:'일정 정보 수정'})).toBeTruthy();
 const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);expect(event.defaultPrevented).toBe(false);
 fireEvent.change(screen.getByLabelText('장소'),{target:{value:'두 번째'}});fireEvent.click(screen.getByRole('button',{name:'저장'}));await waitFor(()=>expect(f.writes).toHaveLength(3));expect(f.writes[2].expectedRevision).toBe(2);expect(f.writes[2].commandId).not.toBe(f.writes[1].commandId);
});
it('protects dirty navigation and keeps one action group when priority is toggled',async()=>{
 setup();fireEvent.change(await screen.findByLabelText('장소'),{target:{value:'작성 중'}});
 for(let i=0;i<4;i++)fireEvent.click(screen.getByLabelText('소속 회원 우선 기간'));
 expect(screen.getAllByRole('button',{name:'저장'})).toHaveLength(1);expect(screen.queryByRole('button',{name:'취소'})).toBeNull();
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);fireEvent.click(screen.getByRole('link',{name:'운동 상세로'}));expect(screen.getByRole('dialog',{name:'저장하지 않고 이동할까요?'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'계속 수정'}));expect(confirm).not.toHaveBeenCalled();
 const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);expect(event.defaultPrevented).toBe(true);
});
it('preserves edits across focus and a temporary connection failure, clears for another account',async()=>{
 const f=setup();fireEvent.change(await screen.findByLabelText('장소'),{target:{value:'작성 중'}});fireEvent.focus(window);
 expect(screen.queryByLabelText('장소')).toBeNull();await waitFor(()=>expect((screen.getByLabelText('장소') as HTMLInputElement).value).toBe('작성 중'));
 f.setAuthFailure(true);fireEvent.focus(window);await screen.findByRole('heading',{name:'접속 상태를 확인할 수 없습니다'});
 f.setAuthFailure(false);fireEvent.click(screen.getByRole('button',{name:'다시 시도'}));await waitFor(()=>expect((screen.getByLabelText('장소') as HTMLInputElement).value).toBe('작성 중'));
 f.switchAccount();fireEvent.focus(window);await waitFor(()=>expect((screen.getByLabelText('장소') as HTMLInputElement).value).toBe(session.place));
});
it('conflict keeps edited input and offers explicit reload',async()=>{
 const f=setup();fireEvent.change(await screen.findByLabelText('장소'),{target:{value:'작성 중'}});f.setConflict(true);fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByRole('button',{name:'최신 정보 다시 불러오기'});expect((screen.getByLabelText('장소') as HTMLInputElement).value).toBe('작성 중');
});
it('saves multi-select favorites, restores the open selection after focus and supports conflict reload',async()=>{
 const saved=vi.fn(),f=setup(<FavoriteEditor onSaved={saved}/>);fireEvent.click(await screen.findByRole('button',{name:'즐겨찾기 관리'}));
 fireEvent.click(await screen.findByRole('checkbox',{name:clubs[0].name}));fireEvent.click(screen.getByRole('checkbox',{name:clubs[1].name}));fireEvent.focus(window);
 await waitFor(()=>expect((screen.getByRole('checkbox',{name:clubs[1].name}) as HTMLInputElement).checked).toBe(true));
 f.setConflict(true);fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByRole('button',{name:'최신 정보 다시 불러오기'});expect((screen.getByRole('checkbox',{name:clubs[0].name}) as HTMLInputElement).checked).toBe(true);
 f.setConflict(false);fireEvent.click(screen.getByRole('button',{name:'저장'}));await waitFor(()=>expect(saved).toHaveBeenCalledTimes(1));expect(f.writes[1].payload.favoriteClubIds).toEqual(clubs.map(c=>c.id));expect(screen.queryByRole('dialog')).toBeNull();
});

it('continues editing a newly saved schedule after the canonical URL changes and focus remounts',async()=>{
 history.replaceState(null,'','/session/new?clubId='+clubs[0].id+'&date=2026-11-01');
 const f=setup(<ScheduleEditorScreen/>);fireEvent.change(await screen.findByLabelText('장소'),{target:{value:'새 일정 장소'}});
 fireEvent.click(screen.getByRole('button',{name:'저장'}));await waitFor(()=>expect(f.writes).toHaveLength(1));
 await waitFor(()=>expect(location.pathname).toContain('/schedule/edit'));
 fireEvent.focus(window);await screen.findByDisplayValue('새 일정 장소');expect((screen.getByLabelText('장소') as HTMLInputElement).value).toBe('새 일정 장소');
 expect(screen.queryByText('수정할 수 있는 일정이 아닙니다.')).toBeNull();
 history.replaceState(null,'','/home');
});

it('edits registration defaults and keeps notice in the same form',async()=>{
 history.replaceState(null,'','/session/new?clubId='+clubs[0].id+'&date=2026-11-01&filter=favorites');
 const f=setup(<ScheduleEditorScreen/>);
 expect(await screen.findByRole('textbox',{name:'장소'})).toBeTruthy();
 expect(screen.queryByRole('tab',{name:'공지'})).toBeNull();
 expect(screen.getByRole('link',{name:'운동 상세로'}).getAttribute('href')).toBe('/session/new?filter=favorites&clubId='+clubs[0].id+'&date=2026-11-01');
 fireEvent.change(screen.getByLabelText('장소'),{target:{value:'이번 회차 장소'}});
 fireEvent.change(screen.getByLabelText('운동 공지'),{target:{value:'등록 공지'}});
 fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByText('준비로 저장했어요.');
 expect(f.writes[0].payload).toMatchObject({phase:'draft',place:'이번 회차 장소',notice:'등록 공지'});
 expect(screen.getByRole('link',{name:'운동 상세로'}).getAttribute('href')).toBe('/session/'+session.id+'?filter=favorites');
 fireEvent.change(screen.getByLabelText('운동 공지'),{target:{value:'모집 공지'}});
 expect(screen.queryByRole('button',{name:'모집 시작'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'저장'}));await waitFor(()=>expect(f.writes).toHaveLength(2));
 expect(f.writes[1].payload).toMatchObject({phase:'draft',notice:'모집 공지'});expect(f.writes[1].expectedRevision).toBe(2);
});
it('includes notice directly without tabs without losing the return week and filter',async()=>{
 history.replaceState(null,'','/session/'+session.id+'/schedule/edit?weekStart=2026-10-12&filter=favorites&section=notice');
 setup();expect(await screen.findByLabelText('운동 공지')).toBeTruthy();
 expect(screen.queryByRole('tab')).toBeNull();
 expect(screen.getByRole('link',{name:'운동 상세로'}).getAttribute('href')).toBe('/session/'+session.id+'?weekStart=2026-10-12&filter=favorites');
});
it('keeps invalid registration input available throughout correction',async()=>{
 history.replaceState(null,'','/session/new?clubId='+clubs[0].id+'&date=2026-11-01');setup(<ScheduleEditorScreen/>);
 fireEvent.click(await screen.findByLabelText('정원 설정'));
 fireEvent.change(screen.getByLabelText('정원 (명)'),{target:{value:'0'}});
 fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByRole('alert');
 expect(screen.getByLabelText('정원 (명)').getAttribute('aria-invalid')).toBe('true');
 fireEvent.change(screen.getByLabelText('정원 (명)'),{target:{value:'2'}});expect(screen.getByLabelText('정원 (명)')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('정원 (명)'),{target:{value:'24'}});fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByText('준비로 저장했어요.');
});
it('uses one directly editable information card for registration and existing schedules',async()=>{
 setup();await screen.findByLabelText('장소');
 expect(screen.queryByRole('tab')).toBeNull();expect(screen.getByLabelText('운동 공지')).toBeTruthy();
 expect(document.querySelectorAll('[data-schedule-information]')).toHaveLength(1);
 expect(document.querySelector('[data-floating-editor-actions]')).toBeTruthy();
});

it.each(['draft','open'] as const)('saves an existing %s schedule without changing recruitment via button or form submit',async phase=>{
 const f=setup(<ScheduleEditorScreen id={session.id}/>,phase);
 await screen.findByLabelText('장소');
 expect(screen.getAllByRole('button',{name:'저장'})).toHaveLength(1);
 expect(screen.queryByRole('button',{name:'모집 시작'})).toBeNull();expect(screen.queryByRole('button',{name:'준비로 저장'})).toBeNull();
 fireEvent.change(screen.getByLabelText('장소'),{target:{value:'일정 변경'}});fireEvent.click(screen.getByRole('button',{name:'저장'}));
 await waitFor(()=>expect(f.writes).toHaveLength(1));await screen.findByText(phase==='draft'?'준비로 저장했어요.':'저장했어요. 계속 수정할 수 있습니다.');
 fireEvent.submit(screen.getByLabelText('장소').closest('form')!);
 await waitFor(()=>expect(f.writes).toHaveLength(2));expect(f.writes.map(w=>w.payload.phase)).toEqual([phase,phase]);
 expect(screen.getByRole('heading',{name:'일정 정보 수정'})).toBeTruthy();
});

it('keeps favorite edits and the underlying dialog when discarding is cancelled',async()=>{
 const f=setup(<FavoriteEditor onSaved={()=>{}}/>);fireEvent.click(await screen.findByRole('button',{name:'즐겨찾기 관리'}));
 fireEvent.click(await screen.findByRole('checkbox',{name:clubs[0].name}));fireEvent.click(screen.getByRole('button',{name:'취소'}));
 expect(screen.getByRole('dialog',{name:'변경한 즐겨찾기를 저장하지 않고 닫을까요?'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'계속 수정'}));
 expect((screen.getByRole('checkbox',{name:clubs[0].name}) as HTMLInputElement).checked).toBe(true);expect(f.writes).toHaveLength(0);
 fireEvent.click(screen.getByRole('button',{name:'취소'}));fireEvent.click(screen.getByRole('button',{name:'변경사항 버리기'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(f.writes).toHaveLength(0);
});
