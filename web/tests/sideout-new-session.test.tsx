// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,within,fireEvent,cleanup,act} from '@testing-library/react';
import Page from '../app/session/new/page';
import {SideoutAccess} from '../components/sideout/access';
import {createMemberAccessClient} from '../lib/member-access-client';
import {createSideoutClient} from '../lib/sideout-client';
import {clubs,ids} from './fixtures/sideout';
vi.mock('next/navigation',()=>({usePathname:()=>location.pathname,useSearchParams:()=>new URLSearchParams(location.search)}));
beforeEach(()=>vi.spyOn(window,'confirm').mockReturnValue(true));
afterEach(()=>{cleanup();vi.restoreAllMocks();history.replaceState(null,'','/home')});
function setup({edit=false,allowed=true,date='2026-11-01',fail=false,pending=false}={}){
 history.replaceState(null,'','/session/new?clubId='+clubs[0].id+'&date='+date+'&weekStart=2026-10-26&filter=favorites'+(edit?'&edit=1':''));
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const writes:Record<string,any>[]=[];let release!:(r:Response)=>void;
 const auth=createMemberAccessClient(async()=>Response.json({state:'active',me:{memberId:ids.master,loginId:'시험',displayName:'마스터',homeClubId:clubs[0].id},authorizationVersion:1}));
 const client=createSideoutClient(async(path,options)=>{
  if(options?.method==='POST'){
   const body=JSON.parse(String(options.body));writes.push(body);
   if(pending)return new Promise(resolve=>{release=resolve});
   if(fail)throw Error('offline');
   return Response.json({ok:true,data:{resourceId:'new-test-session',revision:1}});
  }
  return Response.json({ok:true,data:{clubs,serverNow:'2026-10-02T00:00:00Z',capabilities:{canManageMembers:true,managedClubIds:allowed?[clubs[0].id]:[]}}});
 });
 render(<SideoutAccess authClient={auth} client={client}><Page/></SideoutAccess>);
 return {writes,release:(r:Response)=>release(r)};
}
it('opens new registration as read-only detail with club defaults and no writes on entry',async()=>{
 const {writes}=setup();await screen.findByText('모집 준비 중');
 expect(screen.getByRole('heading',{name:'운동 상세'})).toBeTruthy();expect(screen.getByText(clubs[0].place)).toBeTruthy();
 for(const time of [clubs[0].entry,clubs[0].start,clubs[0].end])expect(screen.getByText(time)).toBeTruthy();
 expect(screen.queryByRole('textbox')).toBeNull();expect(screen.getByRole('button',{name:'모집 시작'})).toBeTruthy();expect(writes).toHaveLength(0);
 const link=screen.getByRole('link',{name:'일정 수정'});const url=new URL(link.getAttribute('href')!,'http://localhost');expect(url.pathname).toBe('/session/new');expect(url.searchParams.get('edit')).toBe('1');expect(url.searchParams.get('clubId')).toBe(clubs[0].id);expect(url.searchParams.get('date')).toBe('2026-11-01');expect(url.searchParams.get('filter')).toBe('favorites');
});
it('opens editing only explicitly and returns to unsaved detail before a first save',async()=>{
 setup({edit:true});await screen.findByLabelText('장소');
 const url=new URL(screen.getByRole('link',{name:'운동 상세로'}).getAttribute('href')!,'http://localhost');expect(url.pathname).toBe('/session/new');expect(url.searchParams.get('edit')).toBeNull();expect(url.searchParams.get('clubId')).toBe(clubs[0].id);expect(url.searchParams.get('date')).toBe('2026-11-01');
});
it('creates recruitment with the displayed defaults and retries the same command after failure',async()=>{
 const {writes}=setup({fail:true});fireEvent.click(await screen.findByRole('button',{name:'모집 시작'}));fireEvent.click(screen.getByRole('button',{name:'확인'}));await screen.findByRole('alert');
 expect(writes[0]).toMatchObject({expectedRevision:0,payload:{clubId:clubs[0].id,date:'2026-11-01',place:clubs[0].place,entry:clubs[0].entry,start:clubs[0].start,end:clubs[0].end,phase:'open'}});
 fireEvent.click(screen.getByRole('button',{name:'모집 시작'}));fireEvent.click(screen.getByRole('button',{name:'확인'}));await screen.findByRole('alert');expect(writes).toHaveLength(2);expect(writes[1]).toEqual(writes[0]);expect(screen.getByText(clubs[0].place)).toBeTruthy();
});
it('blocks repeated starts and navigation while creating',async()=>{
 const f=setup({pending:true});const button=await screen.findByRole('button',{name:'모집 시작'});fireEvent.click(button);const confirm=screen.getByRole('button',{name:'확인'});fireEvent.click(confirm);fireEvent.click(confirm);expect(f.writes).toHaveLength(1);expect(screen.getByRole('button',{name:'돌아가기'}).hasAttribute('disabled')).toBe(true);
 await act(async()=>f.release(Response.json({error:{code:'CONFLICT',message:'이미 등록된 일정입니다.'}},{status:409})));await screen.findByRole('alert');
});
it.each([{allowed:false},{date:'2026-10-01'},{date:'invalid'}])('prevents unavailable new registration (%j)',async options=>{
 const {writes}=setup(options);await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'모집 시작'})).toBeNull();expect(writes).toHaveLength(0);
});

it('does not create a schedule when the initial recruitment confirmation is cancelled',async()=>{
 const {writes}=setup();
 fireEvent.click(await screen.findByRole('button',{name:'모집 시작'}));
 const dialog=screen.getByRole('dialog',{name:'모집을 시작할까요?'});expect(within(dialog).getByText('회원들에게 일정이 공개되며, 참석 신청을 받을 수 있습니다.')).toBeTruthy();expect(writes).toHaveLength(0);fireEvent.click(within(dialog).getByRole('button',{name:'취소'}));expect(window.confirm).not.toHaveBeenCalled();expect(writes).toHaveLength(0);expect(screen.getByText('모집 준비 중')).toBeTruthy();
});
