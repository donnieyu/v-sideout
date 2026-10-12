// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render as baseRender,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {SideoutLink as Link} from '../components/sideout/link';
import {useEditGuard} from '../components/sideout/use-edit-guard';
import {AppConfirmProvider} from '../components/sideout/confirm-dialog';
const render=(ui:React.ReactElement)=>baseRender(ui,{wrapper:AppConfirmProvider});
afterEach(()=>{cleanup();vi.restoreAllMocks()});
function Guard({leave}:{leave:()=>void}){useEditGuard(true,{onLeave:leave});return <Link href="/session/test" onClick={e=>e.preventDefault()}>상세</Link>}
it('preserves edits on cancelled navigation and discards cached edits only on confirmed departure',async()=>{
 const leave=vi.fn();render(<Guard leave={leave}/>);
 fireEvent.click(screen.getByText('상세'));expect(leave).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'계속 수정'}));
 const unload=new Event('beforeunload',{cancelable:true});dispatchEvent(unload);expect(unload.defaultPrevented).toBe(true);
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());fireEvent.click(screen.getByText('상세'));fireEvent.click(screen.getByRole('button',{name:'이동'}));await waitFor(()=>expect(leave).toHaveBeenCalledTimes(1));
 const after=new Event('beforeunload',{cancelable:true});dispatchEvent(after);expect(after.defaultPrevented).toBe(false);
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
it('does not discard a draft or disable the guard when following a same-document skip link',async()=>{
 const leave=vi.fn();function WithSkip(){useEditGuard(true,{onLeave:leave});return <><Link href="#sideout-main" onClick={e=>e.preventDefault()}>본문으로 이동</Link><Link href="/session/elsewhere" onClick={e=>e.preventDefault()}>다른 일정</Link></>}
 render(<WithSkip/>);fireEvent.click(screen.getByText('본문으로 이동'));expect(screen.queryByRole('dialog')).toBeNull();expect(leave).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('다른 일정'));expect(screen.getByRole('dialog',{name:'저장하지 않고 이동할까요?'})).toBeTruthy();expect(leave).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'이동'}));await waitFor(()=>expect(leave).toHaveBeenCalledTimes(1));
});
it('blocks app navigation during an in-flight write without discarding cached input',()=>{
 const leave=vi.fn();function Busy(){useEditGuard(false,{onLeave:leave,blocked:true});return <Link href="/session/test" onClick={e=>e.preventDefault()}>상세</Link>}
 render(<Busy/>);fireEvent.click(screen.getByText('상세'));expect(leave).not.toHaveBeenCalled();expect(screen.queryByRole('dialog')).toBeNull();
 const event=new Event('beforeunload',{cancelable:true});dispatchEvent(event);expect(event.defaultPrevented).toBe(true);
});
