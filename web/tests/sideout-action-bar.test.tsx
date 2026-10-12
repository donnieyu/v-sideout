// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {EditorActionBar,EditorNavigation} from '../components/sideout/editor-action-bar';
vi.mock('next/navigation',()=>({usePathname:()=>'/session/test',useSearchParams:()=>new URLSearchParams()}));
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
it('changes navigation only when a focused input has actually opened a keyboard',()=>{
 const viewport=Object.assign(new EventTarget(),{height:844,offsetTop:0,scale:1});
 vi.stubGlobal('visualViewport',viewport);vi.stubGlobal('innerHeight',844);vi.stubGlobal('innerWidth',390);
 render(<EditorNavigation.Provider value={{href:'/home',label:'운동 일정으로'}}><input aria-label="장소"/><EditorActionBar><button>저장</button></EditorActionBar></EditorNavigation.Provider>);
 act(()=>screen.getByLabelText('장소').focus());expect(screen.getByRole('link',{name:'운동 일정으로'})).toBeTruthy();expect(screen.queryByRole('button',{name:'키보드 닫기'})).toBeNull();
 act(()=>{viewport.height=460;viewport.dispatchEvent(new Event('resize'))});
 expect(screen.queryByRole('link',{name:'운동 일정으로'})).toBeNull();expect(screen.getByRole('button',{name:'저장'})).toBeTruthy();
 expect(document.querySelector('[data-floating-editor-actions]')?.getAttribute('style')).toContain('384px');
 expect(fireEvent.pointerDown(screen.getByRole('button',{name:'저장'}))).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'키보드 닫기'}));expect(document.activeElement).not.toBe(screen.getByLabelText('장소'));expect(screen.getByRole('link',{name:'운동 일정으로'})).toBeTruthy();
});
it('does not expose return navigation while saving',()=>{
 render(<EditorNavigation.Provider value={{href:'/home',label:'운동 일정으로'}}><EditorActionBar busy><button disabled>저장 중…</button></EditorActionBar></EditorNavigation.Provider>);
 expect(screen.queryByRole('link')).toBeNull();expect((screen.getByRole('button',{name:'돌아가기'}) as HTMLButtonElement).disabled).toBe(true);
});
