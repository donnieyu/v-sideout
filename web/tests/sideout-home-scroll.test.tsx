// @vitest-environment jsdom
import React from 'react';
import {AppConfirmProvider} from '../components/sideout/confirm-dialog';
const render=(ui:React.ReactElement)=>baseRender(ui,{wrapper:AppConfirmProvider});
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render as baseRender,screen,fireEvent,cleanup} from '@testing-library/react';
import {HomeScreen} from '../components/sideout/home';
import {clubs,ids,session} from './fixtures/sideout';
import type {HomeView} from '../lib/sideout/read-model';

const state=vi.hoisted(()=>({data:undefined as HomeView|undefined,scroll:new Map<string,number>(),memberId:'',query:'weekStart=2026-09-28&filter=all'}));
vi.mock('next/navigation',()=>({usePathname:()=>'/home',useSearchParams:()=>new URLSearchParams(state.query)}));
vi.mock('../components/sideout/access',()=>({
 useSideout:()=>({directory:{serverNow:'2026-09-30T00:00:00Z',clubs},session:{me:{memberId:state.memberId,displayName:'시험 회원',homeClubId:clubs[0].id}},client:{},actions:{refresh:()=>{}},scroll:state.scroll}),
 useRead:()=>({data:state.data,retry:()=>{}}),ReadState:()=> <p>불러오는 중</p>,ReadWarning:()=>null,
}));
vi.mock('../components/sideout/roster-dialog',()=>({RosterButton:()=> <button>명단 확인</button>}));
vi.mock('../components/sideout/favorite-editor',()=>({FavoriteEditor:()=> <button>즐겨찾기 관리</button>}));
const data=():HomeView=>({serverNow:'2026-09-30T00:00:00Z',weekStart:'2026-09-28',registrationOpportunities:[],cards:[{session,club:clubs[0],sessionRevision:1,counts:{applicants:18,waiting:0},selfStatus:null,teamPublished:false,canManage:true,canViewPublishedTeams:false}]});
beforeEach(()=>{state.data=data();state.scroll.clear();state.memberId=ids.master;state.query='weekStart=2026-09-28&filter=all';sessionStorage.clear();vi.spyOn(window,'scrollTo').mockImplementation(()=>{})});
afterEach(()=>{cleanup();vi.restoreAllMocks()});

it('keeps navigation outside the keyboard-scrollable schedule region',()=>{
 render(<HomeScreen/>);const list=screen.getByRole('region',{name:'일정 목록'});
 expect(list.tabIndex).toBe(0);
 expect(list.contains(screen.getByRole('button',{name:'이전 주'}))).toBe(false);
 expect(list.contains(screen.getByRole('heading',{name:'운동 일정'}))).toBe(false);
 expect(list.querySelector('article')).toBeTruthy();
});
it('restores the inner list after navigation/reload, waits for content, and does not jump on polling',()=>{
 let view=render(<HomeScreen/>);let list=screen.getByRole('region',{name:'일정 목록'});
 fireEvent.scroll(list,{target:{scrollTop:260}});view.unmount();state.scroll.clear();state.data=undefined;
 view=render(<HomeScreen/>);list=screen.getByRole('region',{name:'일정 목록'});expect(list.scrollTop).toBe(0);
 state.data=data();view.rerender(<HomeScreen/>);expect(list.scrollTop).toBe(260);
 list.scrollTop=340;state.data=data();view.rerender(<HomeScreen/>);expect(list.scrollTop).toBe(340);
 expect(window.scrollTo).not.toHaveBeenCalled();
});
it('keeps restoration private to the member and selected week/filter',()=>{
 let view=render(<HomeScreen/>);fireEvent.scroll(screen.getByRole('region',{name:'일정 목록'}),{target:{scrollTop:210}});view.unmount();
 state.memberId=ids.guest;view=render(<HomeScreen/>);expect(screen.getByRole('region',{name:'일정 목록'}).scrollTop).toBe(0);view.unmount();
 state.memberId=ids.master;state.query='weekStart=2026-09-28&filter=club-test-heroes';view=render(<HomeScreen/>);expect(screen.getByRole('region',{name:'일정 목록'}).scrollTop).toBe(0);
});
