// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {useEditGuard} from '../components/sideout/use-edit-guard';
afterEach(()=>{cleanup();vi.restoreAllMocks()});
function Guard({leave}:{leave:()=>void}){useEditGuard(true,{onLeave:leave});return <a href="/session/test" onClick={e=>e.preventDefault()}>상세</a>}
it('preserves edits on cancelled navigation and discards cached edits only on confirmed departure',()=>{
 const leave=vi.fn(),confirm=vi.spyOn(window,'confirm').mockReturnValue(false);render(<Guard leave={leave}/>);
 fireEvent.click(screen.getByText('상세'));expect(leave).not.toHaveBeenCalled();
 const unload=new Event('beforeunload',{cancelable:true});dispatchEvent(unload);expect(unload.defaultPrevented).toBe(true);
 confirm.mockReturnValue(true);fireEvent.click(screen.getByText('상세'));expect(leave).toHaveBeenCalledTimes(1);
});
it('clears cached edits when a native browser navigation actually leaves, not merely when it prompts',()=>{
 const leave=vi.fn();render(<Guard leave={leave}/>);
 dispatchEvent(new Event('beforeunload',{cancelable:true}));expect(leave).not.toHaveBeenCalled();
 dispatchEvent(new Event('pagehide'));expect(leave).toHaveBeenCalledTimes(1);
});
function SharedEditor(){useEditGuard(true);return <input aria-label="일정 수정" defaultValue="작성 중"/>}
it('restores dirty-navigation protection after BFCache return for editors without an onLeave callback',()=>{
 render(<SharedEditor/>);
 const initial=new Event('beforeunload',{cancelable:true});dispatchEvent(initial);expect(initial.defaultPrevented).toBe(true);
 dispatchEvent(new Event('pagehide'));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
 const restored=new Event('beforeunload',{cancelable:true});dispatchEvent(restored);expect(restored.defaultPrevented).toBe(true);
});
