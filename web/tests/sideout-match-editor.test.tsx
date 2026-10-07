// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {SideoutAccess} from '../components/sideout/access';
import {MatchEditorScreen} from '../components/sideout/match-editor';
import {createMemberAccessClient} from '../lib/member-access-client';
import {createSideoutClient} from '../lib/sideout-client';
import {generateTeamMatches} from '../lib/sideout/match-plan';
import {safeReturnPath} from '../lib/sideout/navigation';
import {clubs,ids,session} from './fixtures/sideout';
vi.mock('next/navigation',()=>({usePathname:()=>'/session/test/matches/edit',useSearchParams:()=>new URLSearchParams('filter=favorites')}));
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()});
function setup(){
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{});let mode='ok',revision=1;
 const auth={...createMemberAccessClient(),session:async()=>({state:'active' as const,me:{memberId:ids.master,loginId:'시험',displayName:'마스터',homeClubId:null},authorizationVersion:1})};
 let plan=generateTeamMatches(['A','B','C'])!;const writes:any[]=[];
 const client=createSideoutClient(async(path,options)=>{if(options?.method==='POST'){const body=JSON.parse(options.body as string);writes.push(body);if(mode==='offline')throw Error();if(mode==='conflict')return Response.json({ok:false,error:{code:'CONFLICT',message:'최신 정보를 확인해 주세요.'}},{status:409});plan=body.payload.plan;revision++;return Response.json({ok:true,data:{resourceId:session.id,revision}})}return Response.json({ok:true,data:String(path).includes('/api/clubs')?{clubs,serverNow:'2026-10-02T00:00:00Z',capabilities:{canManageMembers:true,managedClubIds:[clubs[0].id]}}:{session:{...session,end:'09:00'},club:clubs[0],sessionRevision:1,rosterRevision:revision,teams:['A','B','C'].map(id=>({id,title:id+'팀'})),plan,saveVisibility:'attendees'}})});
 render(<SideoutAccess authClient={auth} client={client}><MatchEditorScreen id={session.id}/></SideoutAccess>);return {writes,setMode:(v:string)=>mode=v};
}
it('reorders with keyboard, controls rookie groups, recalculates times and saves while staying in editor',async()=>{
 const f=setup();await screen.findByRole('switch',{name:'신입 경기 포함'});
 fireEvent.keyDown(screen.getByRole('button',{name:'1번째 경기 순서 이동'}),{key:'ArrowDown'});
 fireEvent.change(screen.getByLabelText('신입팀 수'),{target:{value:'4'}});fireEvent.click(screen.getByRole('button',{name:'신입 경기 추가'}));
 expect(screen.getByText(/운동 종료 시각/)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByText('저장했습니다. 계속 수정할 수 있습니다.');
 expect(f.writes[0].payload.plan.matches[0]).toMatchObject({home:'B',away:'C'});expect(f.writes[0].payload.plan.rookieTeamCount).toBe(4);expect(f.writes[0].payload.plan.matches).toHaveLength(12);
 fireEvent.click(screen.getByRole('switch',{name:'신입 경기 포함'}));expect(screen.queryByLabelText('신입팀 수')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'저장'}));await waitFor(()=>expect(f.writes).toHaveLength(2));expect(f.writes[1].expectedRevision).toBe(2);expect(f.writes[1].payload.plan.matches).toHaveLength(9);
});
it('preserves edits on network failure and retries with the same idempotency key',async()=>{
 const f=setup();await screen.findByRole('switch',{name:'신입 경기 포함'});fireEvent.click(screen.getByRole('switch',{name:'신입 경기 포함'}));f.setMode('offline');fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByText('연결을 확인하고 다시 시도해 주세요.');f.setMode('ok');fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByText('저장했습니다. 계속 수정할 수 있습니다.');expect(f.writes[0].commandId).toBe(f.writes[1].commandId);expect(f.writes[1].payload.plan.matches).toHaveLength(9);
});
it('locks stale edits after conflict and explicitly reloads the authoritative plan',async()=>{
 const f=setup();await screen.findByRole('switch',{name:'신입 경기 포함'});fireEvent.click(screen.getByRole('switch',{name:'신입 경기 포함'}));f.setMode('conflict');fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByText('최신 정보를 확인해 주세요.');expect((screen.getByRole('button',{name:'저장'}) as HTMLButtonElement).disabled).toBe(true);vi.spyOn(window,'confirm').mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'최신 정보 불러오기'}));await waitFor(()=>expect(screen.getByRole('switch',{name:'신입 경기 포함'}).getAttribute('aria-checked')).toBe('true'));expect((screen.getByRole('button',{name:'저장'}) as HTMLButtonElement).disabled).toBe(false);
});
it('keeps dirty edits when cancel is dismissed; login return retains matches route context',async()=>{
 setup();await screen.findByRole('switch',{name:'신입 경기 포함'});fireEvent.click(screen.getByRole('switch',{name:'신입 경기 포함'}));vi.spyOn(window,'confirm').mockReturnValue(false);fireEvent.click(screen.getByRole('button',{name:'취소'}));expect(screen.getByRole('switch',{name:'신입 경기 포함'}).getAttribute('aria-checked')).toBe('false');expect(safeReturnPath('/session/id/matches/edit?filter=favorites')).toBe('/session/id/matches/edit?filter=favorites');
});
function pointerLayout(){
 class TestPointerEvent extends MouseEvent{pointerId:number;constructor(type:string,init:MouseEventInit&{pointerId?:number}={}){super(type,init);this.pointerId=init.pointerId??1}}
 vi.stubGlobal('PointerEvent',TestPointerEvent);
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){const index=[...document.querySelectorAll('[data-match-id]')].indexOf(this);const top=index>=0?100+index*100:100;return {x:20,y:top,left:20,right:380,top,bottom:index>=0?top+100:1200,width:360,height:index>=0?100:1100,toJSON(){}} as DOMRect});
 vi.spyOn(HTMLElement.prototype,'offsetTop','get').mockImplementation(function(this:HTMLElement){return Math.max(0,[...document.querySelectorAll('[data-match-id]')].indexOf(this))*100});
 vi.spyOn(HTMLElement.prototype,'offsetHeight','get').mockReturnValue(100);
 Object.defineProperty(HTMLElement.prototype,'setPointerCapture',{value:()=>{},configurable:true});
 Object.defineProperty(HTMLElement.prototype,'releasePointerCapture',{value:()=>{},configurable:true});
 vi.spyOn(window,'scrollBy').mockImplementation(()=>{});
}
it('shows a carried card and explicit insertion, then saves the indicated order',async()=>{
 const f=setup();await screen.findByRole('switch',{name:'신입 경기 포함'});pointerLayout();const handle=screen.getByRole('button',{name:'1번째 경기 순서 이동'});
 fireEvent.pointerDown(handle,{button:0,clientX:350,clientY:150,pointerId:1});expect(document.querySelector('[data-drag-overlay]')).toBeNull();
 fireEvent.pointerMove(handle,{clientX:350,clientY:280,pointerId:1});expect(document.querySelector('[data-drag-overlay]')).not.toBeNull();expect(document.querySelector('[data-drop-index="1"]')).not.toBeNull();expect((screen.getByRole('button',{name:'저장'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.pointerUp(handle,{clientX:350,clientY:280,pointerId:1});await waitFor(()=>expect((screen.getByRole('button',{name:'저장'}) as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByText('저장했습니다. 계속 수정할 수 있습니다.');expect(f.writes[0].payload.plan.matches[0]).toMatchObject({home:'B',away:'C'});vi.unstubAllGlobals();
});
it.each(['escape','cancel','outside'])('cancels %s dragging without changing the saved match order',async(reason)=>{
 const f=setup();await screen.findByRole('switch',{name:'신입 경기 포함'});pointerLayout();const handle=screen.getByRole('button',{name:'1번째 경기 순서 이동'});
 fireEvent.pointerDown(handle,{button:0,clientX:350,clientY:150,pointerId:1});fireEvent.pointerMove(handle,{clientX:350,clientY:280,pointerId:1});
 if(reason==='escape')fireEvent.keyDown(handle,{key:'Escape'});else if(reason==='cancel')fireEvent.pointerCancel(handle,{pointerId:1});else fireEvent.pointerUp(handle,{clientX:450,clientY:280,pointerId:1});
 await waitFor(()=>expect(document.querySelector('[data-drop-index]')).toBeNull());fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByText('저장했습니다. 계속 수정할 수 있습니다.');expect(f.writes[0].payload.plan.matches[0]).toMatchObject({home:'A',away:'B'});vi.unstubAllGlobals();
});
