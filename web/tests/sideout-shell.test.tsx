// @vitest-environment jsdom
import React from 'react';
import {AppConfirmProvider} from '../components/sideout/confirm-dialog';
const render=(ui:React.ReactElement)=>baseRender(ui,{wrapper:AppConfirmProvider});
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render as baseRender,screen,within} from '@testing-library/react';
import {SideoutShell} from '../components/sideout/shell';
import {useEditGuard} from '../components/sideout/use-edit-guard';
let path='/home';
vi.mock('next/navigation',()=>({usePathname:()=>path,useSearchParams:()=>new URLSearchParams('weekStart=2026-10-12&filter=favorites')}));
vi.mock('../components/sideout/access',()=>({useSideout:()=>({session:{me:{displayName:'시험회원',homeClubId:'club'}},directory:{clubs:[{id:'club',name:'시험 모임'}]}})}));
afterEach(()=>{cleanup();vi.restoreAllMocks();path='/home'});
it('keeps global navigation separate from the content title and marks the actual current page',()=>{
 render(<SideoutShell title="운동 일정"><p>실제 일정</p></SideoutShell>);
 const header=screen.getByRole('banner'),main=screen.getByRole('main');
 expect(within(header).getByRole('button',{name:'메뉴 열기'})).toBeTruthy();
 expect(within(header).queryByText('운동 일정')).toBeNull();
 expect(within(main).getByRole('heading',{level:1,name:'운동 일정'})).toBeTruthy();
 expect(screen.getByRole('link',{name:'운동 일정'}).getAttribute('aria-current')).toBe('page');
 expect(within(main).queryByRole('link')).toBeNull();
});
it('returns to the parent with list context without claiming the parent is the current page',()=>{
 path='/session/test/teams';
 render(<SideoutShell title="팀편성 수정" backHref="/session/test?weekStart=2026-10-12&filter=favorites" backLabel="운동 상세로"><p>기존 편집기</p></SideoutShell>);
 expect(screen.getByRole('link',{name:'운동 상세로'}).getAttribute('href')).toBe('/session/test?weekStart=2026-10-12&filter=favorites');
 expect(screen.getByRole('link',{name:'운동 일정'}).hasAttribute('aria-current')).toBe(false);
 expect(screen.getByText('기존 편집기')).toBeTruthy();
});
it('opening the menu does not interrupt edits; cancelling a destination keeps the menu and draft open',()=>{
 path='/session/test/teams';const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
 function Editor(){useEditGuard(true);return <SideoutShell title="팀편성 수정"><input aria-label="편집 내용" defaultValue="보존할 편집"/></SideoutShell>}
 render(<Editor/>);fireEvent.click(screen.getByRole('button',{name:'메뉴 열기'}));
 expect(confirm).not.toHaveBeenCalled();
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('link',{name:/계정 정보/}));
 expect(screen.getByRole('dialog',{name:'저장하지 않고 이동할까요?'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'계속 수정'}));expect(confirm).not.toHaveBeenCalled();
 expect(screen.getByRole('dialog')).toBeTruthy();
 expect((screen.getByLabelText('편집 내용') as HTMLInputElement).value).toBe('보존할 편집');
});
it('opts read screens into floating return without opting editors in implicitly',()=>{
 path='/session/test';const {rerender}=render(<SideoutShell title="운동 상세" floatingReturn><p>일정</p></SideoutShell>);
 expect(screen.getByRole('link',{name:'운동 일정으로'}).getAttribute('data-return-placement')).toBe('floating');
 expect(screen.getByRole('link',{name:'운동 일정으로'}).getAttribute('href')).toBe('/home?weekStart=2026-10-12&filter=favorites');
 path='/session/test/teams/edit';rerender(<SideoutShell title="팀편성 수정" backHref="/session/test" backLabel="운동 상세로"><button>저장</button></SideoutShell>);
 expect(screen.getByRole('link',{name:'운동 상세로'}).getAttribute('data-return-placement')).toBe('inline');
 expect(screen.getByRole('button',{name:'저장'})).toBeTruthy();
});
