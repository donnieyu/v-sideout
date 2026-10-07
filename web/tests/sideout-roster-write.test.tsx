// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,within} from '@testing-library/react';
import {SideoutAccess} from '../components/sideout/access';
import {WeekSchedule} from '../components/sideout/week-schedule';
import {RosterButton} from '../components/sideout/roster-dialog';
import {ParticipationButton} from '../components/sideout/participation-button';
import {createMemberAccessClient} from '../lib/member-access-client';
import {createSideoutClient} from '../lib/sideout-client';
import {clubs,ids,session} from './fixtures/sideout';
import type {SessionDetailView} from '../lib/sideout/read-model';
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()});
function setup(published=false,self=false,responsive=false){
 let error=false,holdWrites=false;let releaseWrite:()=>void=()=>{};const writes:any[]=[];
 const labels=[{memberId:ids.applicant,displayName:'한회원',homeClubId:clubs[0].id,clubName:clubs[0].name},{memberId:ids.guest,displayName:'게스트회원',homeClubId:clubs[1].id,clubName:clubs[1].name}];
 const data:SessionDetailView={session,club:clubs[0],sessionRevision:1,rosterRevision:1,counts:{applicants:0,waiting:0},selfStatus:null,teamPublished:published,canViewPublishedTeams:false,canManage:true,visibleApplicants:[],visibleWaiters:[],guestCount:0,publishedTeams:null,publishedMatches:null,capabilities:{canEditSchedule:true,canManageRoster:true,canCancelRoster:true,canEditTeams:false,canEditMatches:false,canPublish:false,canCancelSelf:!published},participation:{canRegister:true,canCancel:!published,registerLabel:published?'대기자 등록':'참석 신청'}};
 const auth=createMemberAccessClient(async()=>Response.json({state:'active',me:{memberId:ids.master,loginId:'시험',displayName:'마스터',homeClubId:null},authorizationVersion:1}));
 const client=createSideoutClient(async(path,options)=>{
  if(options?.method==='POST'){const command=JSON.parse(options.body as string);writes.push(command);if(holdWrites)await new Promise<void>(resolve=>{releaseWrite=resolve});if(error)throw Error('offline');if(command.payload.action==='add'){data.visibleApplicants=labels.filter(p=>command.payload.memberIds.includes(p.memberId));data.counts.applicants=data.visibleApplicants.length}else if(command.payload.action==='unpublish'){data.teamPublished=false;data.publicationWithdrawn=true;data.capabilities.canManageRoster=true;data.capabilities.canCancelRoster=true}else if(command.payload.action==='remove'){data.visibleApplicants=data.visibleApplicants.filter(p=>p.memberId!==command.payload.memberId)}data.rosterRevision++;return Response.json({ok:true,data:{resourceId:session.id,revision:data.rosterRevision}})}
  return Response.json({ok:true,data:String(path).endsWith('/teams')?{sessionId:session.id,sessionRevision:data.sessionRevision,rosterRevision:data.rosterRevision,teamPublished:data.teamPublished,draft:{teams:[]},publishedLineup:{teams:[]},draftMatches:null,publishedMatches:null,people:[],hasSavedDraft:true}:String(path).includes('/api/clubs')?{clubs,serverNow:'2026-10-02T00:00:00Z',capabilities:{canManageMembers:true}}:String(path).endsWith('/participants')?{members:labels.filter(p=>!data.visibleApplicants.some(x=>x.memberId===p.memberId)),sessionRevision:1,rosterRevision:data.rosterRevision}:data});
 });
 render(<SideoutAccess authClient={auth} client={client}>{self?<ParticipationButton card={data}/>:responsive?<WeekSchedule items={[{id:session.id,date:session.date,entry:session.entry,content:<RosterButton card={data}/>}]} days={[session.date]} showEmptyBands={false}/>:<RosterButton card={data}/>}</SideoutAccess>);return {writes,holdWrites:()=>{holdWrites=true},releaseWrite:()=>{holdWrites=false;releaseWrite()},setError:(value:boolean)=>{error=value},data};
}
it('retains multi-selection across search and failure, then updates the same roster and cancels explicitly',async()=>{
 const f=setup();fireEvent.click(await screen.findByRole('button',{name:'명단 확인'}));fireEvent.click(await screen.findByRole('button',{name:'참가자 추가'}));
 fireEvent.click(await screen.findByRole('checkbox',{name:/한회원/}));fireEvent.change(screen.getByLabelText('회원 이름 또는 소속 검색'),{target:{value:'게스트'}});fireEvent.click(screen.getByRole('checkbox',{name:/게스트회원/}));
 f.setError(true);fireEvent.click(screen.getByRole('button',{name:'2명 추가'}));await screen.findByRole('alert');expect((screen.getByRole('checkbox',{name:/게스트회원/}) as HTMLInputElement).checked).toBe(true);expect(screen.getByRole('button',{name:'2명 추가'})).toBeTruthy();
 f.setError(false);fireEvent.click(screen.getByRole('button',{name:'2명 추가'}));await screen.findByRole('heading',{name:'게스트'});expect(f.writes[0].commandId).toBe(f.writes[1].commandId);expect(screen.getByText('게스트회원')).toBeTruthy();
 vi.spyOn(window,'confirm').mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'한회원 참가 취소'}));await waitFor(()=>expect(screen.queryByText('한회원')).toBeNull());expect(f.writes[2].payload.action).toBe('remove');expect(f.writes[2].expectedRevision).toBe(2);
});
it('publication hides manager additions and cancellations',async()=>{
 setup(true);fireEvent.click(await screen.findByRole('button',{name:'명단 확인'}));await screen.findByRole('heading',{name:'소속 회원'});expect(screen.queryByRole('button',{name:'참가자 추가'})).toBeNull();expect(screen.queryByRole('button',{name:/참가 취소/})).toBeNull();
});
it('publication disables self registration even if a stale capability still permits it',async()=>{
 const f=setup(true,true);const button=await screen.findByRole('button',{name:'접수 종료'});expect((button as HTMLButtonElement).disabled).toBe(true);fireEvent.click(button);expect(f.writes).toHaveLength(0);
});
it('publication while the picker is open closes the add flow without losing roster access',async()=>{
 const f=setup();fireEvent.click(await screen.findByRole('button',{name:'명단 확인'}));fireEvent.click(await screen.findByRole('button',{name:'참가자 추가'}));fireEvent.click(await screen.findByRole('checkbox',{name:/한회원/}));
 f.data.teamPublished=true;fireEvent(window,new Event('sideout:roster'));
 await screen.findByRole('heading',{name:'함께하는 회원'});expect(screen.queryByRole('button',{name:'1명 추가'})).toBeNull();expect(screen.queryByRole('button',{name:'참가자 추가'})).toBeNull();expect(f.writes).toHaveLength(0);
});
it('self registration uses the server revision and retains a retry command',async()=>{
 const f=setup(false,true);f.setError(true);fireEvent.click(await screen.findByRole('button',{name:'참석 신청'}));await screen.findByRole('alert');f.setError(false);fireEvent.click(screen.getByRole('button',{name:'참석 신청'}));await waitFor(()=>expect(f.writes).toHaveLength(2));expect(f.writes[0]).toEqual(f.writes[1]);expect(f.writes[1].expectedRevision).toBe(1);
});

it('adds participants on an HTTP LAN origin without crypto.randomUUID',async()=>{
 vi.stubGlobal('crypto',{getRandomValues:crypto.getRandomValues.bind(crypto)});
 const f=setup();fireEvent.click(await screen.findByRole('button',{name:'명단 확인'}));fireEvent.click(await screen.findByRole('button',{name:'참가자 추가'}));
 fireEvent.click(await screen.findByRole('checkbox',{name:/한회원/}));fireEvent.click(screen.getByRole('button',{name:'1명 추가'}));
 await screen.findByRole('heading',{name:'함께하는 회원'});expect(screen.getByText('한회원')).toBeTruthy();
 expect(f.writes[0].commandId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
it.each([0,1])('restores only the opened responsive roster after auth revalidation (surface %s)',async(index)=>{
 setup(false,false,true);fireEvent.click((await screen.findAllByRole('button',{name:'명단 확인'}))[index]);
 fireEvent.click(await screen.findByRole('button',{name:'참가자 추가'}));fireEvent.click(await screen.findByRole('checkbox',{name:/한회원/}));
 fireEvent.change(screen.getByLabelText('회원 이름 또는 소속 검색'),{target:{value:'한회원'}});
 fireEvent(window,new Event('focus'));
 await waitFor(()=>expect(screen.getAllByRole('dialog')).toHaveLength(1));
 await waitFor(()=>expect(screen.getAllByRole('checkbox',{name:/한회원/})).toHaveLength(1));
 expect((screen.getByRole('checkbox',{name:/한회원/}) as HTMLInputElement).checked).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'취소'}));fireEvent.click(await screen.findByRole('button',{name:'확인'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
});
it('releases the busy state and allows retry if command generation fails',async()=>{
 const getRandomValues=crypto.getRandomValues.bind(crypto);
 vi.stubGlobal('crypto',{getRandomValues:()=>{throw Error('난수 생성 실패')}});
 const f=setup();fireEvent.click(await screen.findByRole('button',{name:'명단 확인'}));fireEvent.click(await screen.findByRole('button',{name:'참가자 추가'}));
 fireEvent.click(await screen.findByRole('checkbox',{name:/한회원/}));fireEvent.click(screen.getByRole('button',{name:'1명 추가'}));
 expect((await screen.findByRole('alert')).textContent).toContain('난수 생성 실패');
 expect((screen.getByRole('button',{name:'1명 추가'}) as HTMLButtonElement).disabled).toBe(false);expect(f.writes).toHaveLength(0);
 vi.stubGlobal('crypto',{getRandomValues});fireEvent.click(screen.getByRole('button',{name:'1명 추가'}));
 await screen.findByRole('heading',{name:'함께하는 회원'});expect(screen.getByText('한회원')).toBeTruthy();
});

it('keeps the roster open across confirmation focus refresh and consecutive cancellations',async()=>{
 const f=setup();fireEvent.click(await screen.findByRole('button',{name:'명단 확인'}));fireEvent.click(await screen.findByRole('button',{name:'참가자 추가'}));
 fireEvent.click(await screen.findByRole('checkbox',{name:/한회원/}));fireEvent.click(screen.getByRole('checkbox',{name:/게스트회원/}));fireEvent.click(screen.getByRole('button',{name:'2명 추가'}));await screen.findByRole('button',{name:'한회원 참가 취소'});
 vi.spyOn(window,'confirm').mockReturnValue(true);f.holdWrites();const original=screen.getByRole('dialog');fireEvent.click(screen.getByRole('button',{name:'한회원 참가 취소'}));
 fireEvent(window,new Event('focus'));await waitFor(()=>expect(original.isConnected).toBe(false));await screen.findByRole('dialog');f.releaseWrite();
 await waitFor(()=>expect(screen.queryByText('한회원')).toBeNull());
 // Another native confirmation/focus cycle must restore the still-open roster.
 fireEvent(window,new Event('focus'));const next=await screen.findByRole('button',{name:'게스트회원 참가 취소'});fireEvent.click(next);
 await waitFor(()=>expect(screen.queryByText('게스트회원')).toBeNull());expect(screen.getByRole('dialog')).toBeTruthy();expect(f.writes.slice(1).map(w=>w.expectedRevision)).toEqual([2,3]);
 fireEvent.click(screen.getByRole('button',{name:'확인'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());fireEvent(window,new Event('focus'));await screen.findByRole('button',{name:'명단 확인'});expect(screen.queryByRole('dialog')).toBeNull();
});
it('allows additions and confirmed cancellation after withdrawal without closing the roster',async()=>{
 const f=setup();f.data.publicationWithdrawn=true;
 fireEvent.click(await screen.findByRole('button',{name:'명단 확인'}));fireEvent.click(await screen.findByRole('button',{name:'참가자 추가'}));fireEvent.click(await screen.findByRole('checkbox',{name:/한회원/}));fireEvent.click(screen.getByRole('button',{name:'1명 추가'}));
 await screen.findByRole('heading',{name:'함께하는 회원'});expect(screen.getByText('한회원')).toBeTruthy();expect(screen.getByRole('button',{name:'참가자 추가'})).toBeTruthy();vi.spyOn(window,'confirm').mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'한회원 참가 취소'}));await waitFor(()=>expect(screen.queryByText('한회원')).toBeNull());expect(screen.getByRole('dialog')).toBeTruthy();
});

it('withdraws publication from the roster with confirmation, then permits cancellation without closing the modal',async()=>{
 const f=setup(true);f.data.capabilities.canEditTeams=true;f.data.visibleApplicants=[{memberId:ids.applicant,displayName:'한회원',homeClubId:clubs[0].id,clubName:clubs[0].name}];
 fireEvent.click(await screen.findByRole('button',{name:'명단 확인'}));fireEvent.click(await screen.findByRole('button',{name:'공개 취소'}));
 let confirm=await screen.findByRole('dialog',{name:'팀편성 공개를 취소할까요?'});fireEvent.click(within(confirm).getByRole('button',{name:'공개 유지'}));expect(f.writes).toHaveLength(0);expect(screen.getByRole('dialog',{name:'함께하는 회원'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'공개 취소'}));confirm=await screen.findByRole('dialog',{name:'팀편성 공개를 취소할까요?'});fireEvent.click(within(confirm).getByRole('button',{name:'공개 취소'}));
 await screen.findByRole('button',{name:'참가자 추가'});expect(f.writes[0].payload).toMatchObject({action:'unpublish',confirmed:true,draftSource:'published'});expect(f.writes[0].expectedRevision).toBe(1);
 vi.spyOn(window,'confirm').mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'한회원 참가 취소'}));await waitFor(()=>expect(screen.queryByText('한회원')).toBeNull());expect(f.writes[1].expectedRevision).toBe(2);expect(screen.getByRole('dialog',{name:'함께하는 회원'})).toBeTruthy();
});
it('keeps public roster locked on failed withdrawal and retries the same command',async()=>{
 const f=setup(true);f.data.capabilities.canEditTeams=true;fireEvent.click(await screen.findByRole('button',{name:'명단 확인'}));fireEvent.click(await screen.findByRole('button',{name:'공개 취소'}));
 const confirm=await screen.findByRole('dialog',{name:'팀편성 공개를 취소할까요?'});f.setError(true);fireEvent.click(within(confirm).getByRole('button',{name:'공개 취소'}));await within(confirm).findByRole('alert');expect(f.data.teamPublished).toBe(true);
 f.setError(false);fireEvent.click(within(confirm).getByRole('button',{name:'공개 취소'}));await screen.findByRole('button',{name:'참가자 추가'});expect(f.writes[0]).toEqual(f.writes[1]);expect(screen.queryByRole('dialog',{name:'팀편성 공개를 취소할까요?'})).toBeNull();
});
it('does not offer withdrawal when the server disallows team editing',async()=>{
 setup(true);fireEvent.click(await screen.findByRole('button',{name:'명단 확인'}));await screen.findByRole('heading',{name:'소속 회원'});expect(screen.queryByRole('button',{name:'공개 취소'})).toBeNull();
});
