// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,within} from '@testing-library/react';
import {SideoutAccess} from '../components/sideout/access';
import {TeamEditorScreen} from '../components/sideout/team-editor';
import {createMemberAccessClient} from '../lib/member-access-client';
import {createSideoutClient} from '../lib/sideout-client';
import type {SessionView} from '../lib/auth/contracts';
import type {TeamEditorView} from '../lib/sideout/team-editor';
import {clubs,ids,session} from './fixtures/sideout';
vi.mock('next/navigation',()=>({usePathname:()=>'/session/test/teams/edit',useSearchParams:()=>new URLSearchParams()}));
afterEach(()=>{cleanup();vi.restoreAllMocks()});
function setup(){
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 let who:Extract<SessionView,{state:'active'}>={state:'active',me:{memberId:ids.master,loginId:'시험',displayName:'마스터',homeClubId:null},authorizationVersion:1};
 const auth={...createMemberAccessClient(),session:async()=>who};let fail=false,failRead=false,hold:Promise<void>|undefined,release:(()=>void)|undefined;
 let data:TeamEditorView={sessionId:session.id,sessionRevision:1,rosterRevision:1,teamPublished:false,hasSavedDraft:false,publishedLineup:null,draftMatches:null,draft:{teams:['A','B','C'].map((id,i)=>({id,title:id+'팀',players:[{memberId:['a','b','c'][i],slotId:'s',assignedPosition:'S'}]}))},people:['a','b','c'].map((id,i)=>({id,name:['김도윤','서유진','이도현'][i],club:'뉴배동',position:'S',secondary:'OP',status:'신청자'}))};
 const writes:{commandId:string;expectedRevision:number;payload:any}[]=[];
 const client=createSideoutClient(async(path,options)=>{
  if(options?.method==='POST'){const body=JSON.parse(options.body as string);writes.push(body);if(hold)await hold;if(fail)throw Error('offline');data=body.payload.action==='unpublish'?{...data,rosterRevision:data.rosterRevision+1,teamPublished:false}:{...data,rosterRevision:data.rosterRevision+1,draft:body.payload.lineup,hasSavedDraft:true,publishedLineup:body.payload.action==='publish'?body.payload.lineup:data.publishedLineup,teamPublished:body.payload.action==='publish'||data.teamPublished};return Response.json({ok:true,data:{resourceId:session.id,revision:data.rosterRevision}})}
  if(failRead&&String(path).endsWith('/teams'))throw Error('offline');
  return Response.json({ok:true,data:String(path).includes('/api/clubs')?{clubs,serverNow:'2026-10-02T00:00:00Z',capabilities:{canManageMembers:true,managedClubIds:[clubs[0].id]}}:String(path).endsWith('/teams')?data:{session,club:clubs[0]}});
 });
 render(<SideoutAccess authClient={auth} client={client}><TeamEditorScreen id={session.id}/></SideoutAccess>);return {writes,setReadFailure:(value:boolean)=>{failRead=value},publishElsewhere:()=>{data={...data,rosterRevision:data.rosterRevision+1,teamPublished:true,publishedLineup:structuredClone(data.draft)}},holdSave:()=>{hold=new Promise<void>(resolve=>{release=resolve})},releaseSave:()=>release?.(),setFail:(v:boolean)=>{fail=v},setIdentity:(memberId:string)=>{who={...who,me:{...who.me,memberId}}}};
}
it('retries failed save with same command and advances revision without leaving editor',async()=>{
 const f=setup();await screen.findByRole('region',{name:'팀별 포지션 배정표'});f.setFail(true);fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByText('연결을 확인하고 다시 시도해 주세요.');f.setFail(false);fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByText('저장됨');expect(f.writes[0].commandId).toBe(f.writes[1].commandId);fireEvent.click(screen.getByRole('button',{name:'저장'}));await waitFor(()=>expect(f.writes).toHaveLength(3));expect(f.writes[2].expectedRevision).toBe(2);expect(screen.getByRole('region',{name:'팀별 포지션 배정표'})).toBeTruthy();
});
it('confirms attendee-only publication, cancel does not post, confirm posts distinct publish action',async()=>{
 const f=setup();await screen.findByRole('region',{name:'팀별 포지션 배정표'});fireEvent.click(screen.getByRole('button',{name:'공개'}));await screen.findByText('공개하면 참석 회원에게 팀편성과 경기 순서가 함께 노출됩니다.');const dialog=screen.getByRole('dialog');fireEvent.click(dialog.querySelector('button')!);expect(f.writes).toHaveLength(0);
 if(!screen.queryByRole('dialog'))fireEvent.click(screen.getByRole('button',{name:'공개'}));fireEvent.click(screen.getByRole('button',{name:'확인'}));await screen.findByRole('button',{name:'공개 취소'});expect((screen.getByRole('button',{name:'저장'}) as HTMLButtonElement).disabled).toBe(true);expect(f.writes[0].payload.action).toBe('publish');expect(f.writes[0].payload.confirmed).toBe(true);
});

it('restores an unsaved board and selected slot after same-account focus revalidation, but drops another account cache',async()=>{
 const f=setup();await screen.findByRole('region',{name:'팀별 포지션 배정표'});
 fireEvent.click(screen.getByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'해제'}));
 expect(within(screen.getByRole('dialog')).getByRole('button',{name:'김도윤 배정'})).toBeTruthy();
 fireEvent(window,new Event('focus'));
 await screen.findByRole('button',{name:'김도윤 배정'});
 f.setIdentity(ids.operator);fireEvent(window,new Event('focus'));
 await screen.findByRole('region',{name:'팀별 포지션 배정표'});
 expect(screen.getByRole('button',{name:'A팀 세터 김도윤 뉴배동 교체'})).toBeTruthy();
});

it('omits routine refresh and locks cancellation while a save is pending and keeps the same editor after completion',async()=>{
 const f=setup();await screen.findByRole('region',{name:'팀별 포지션 배정표'});f.holdSave();fireEvent.click(screen.getByRole('button',{name:'저장'}));
 await screen.findByRole('button',{name:'저장 중…'});expect((screen.getByRole('button',{name:'취소'}) as HTMLButtonElement).disabled).toBe(true);expect(screen.queryByRole('button',{name:'최신 정보 불러오기'})).toBeNull();
 f.releaseSave();await screen.findByText('저장됨');expect(screen.queryByRole('button',{name:'최신 정보 불러오기'})).toBeNull();
});

it('locks a restored stale editor after another operator publishes and unlocks only after confirmed withdrawal',async()=>{
 const f=setup();await screen.findByRole('region',{name:'팀별 포지션 배정표'});f.publishElsewhere();fireEvent(window,new Event('focus'));
 await screen.findByRole('button',{name:'공개 취소'});expect((screen.getByRole('button',{name:'저장'}) as HTMLButtonElement).disabled).toBe(true);expect(screen.queryByRole('button',{name:'자동 배치'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'공개 취소'}));const dialog=await screen.findByRole('dialog');fireEvent.click(dialog.querySelector('button:last-child')!);
 await screen.findByRole('button',{name:'다시 공개'});expect((screen.getByRole('button',{name:'저장'}) as HTMLButtonElement).disabled).toBe(false);expect(f.writes[0].payload).toMatchObject({action:'unpublish',confirmed:true});expect(screen.queryByText('공개를 취소했습니다. 수정 후 다시 공개해 주세요.')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByText('저장됨');expect(f.writes[1].payload.action).toBe('save');expect(screen.getByRole('region',{name:'팀별 포지션 배정표'})).toBeTruthy();
});

it('offers refresh only after a failed post-save read and removes recovery after success',async()=>{
 const f=setup();await screen.findByRole('region',{name:'팀별 포지션 배정표'});expect(screen.queryByRole('button',{name:'최신 명단 불러오기'})).toBeNull();
 f.setReadFailure(true);fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByText('저장은 완료됐지만 최신 명단을 확인하지 못했습니다. 다시 불러와 주세요.');expect(screen.getByRole('button',{name:'최신 명단 불러오기'})).toBeTruthy();
 f.setReadFailure(false);fireEvent.click(screen.getByRole('button',{name:'최신 명단 불러오기'}));await waitFor(()=>expect(screen.queryByRole('button',{name:'최신 명단 불러오기'})).toBeNull());expect(screen.queryByRole('alert')).toBeNull();expect(f.writes).toHaveLength(1);
});
