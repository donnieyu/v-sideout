// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {AppConfirmProvider,useAppConfirm} from '../components/sideout/confirm-dialog';
afterEach(cleanup);
function Action({result}:{result:(value:boolean)=>void}){
 const confirm=useAppConfirm();return <button onClick={async()=>result(await confirm({title:'참석 신청을 취소할까요?',description:'명단에서 제외됩니다.',confirmLabel:'신청 취소',destructive:true}))}>실행</button>;
}
it('requires explicit app confirmation; cancelling does not execute an action',async()=>{
 const result=vi.fn();render(<AppConfirmProvider><Action result={result}/></AppConfirmProvider>);
 fireEvent.click(screen.getByText('실행'));expect(screen.getByRole('dialog',{name:'참석 신청을 취소할까요?'})).toBeTruthy();expect(result).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'취소'}));await waitFor(()=>expect(result).toHaveBeenCalledWith(false));
 fireEvent.click(screen.getByText('실행'));fireEvent.click(screen.getByRole('button',{name:'신청 취소'}));await waitFor(()=>expect(result).toHaveBeenLastCalledWith(true));
});
it('dismisses with Escape and rejects a pending confirmation when its owner unmounts',async()=>{
 const result=vi.fn();const {unmount}=render(<AppConfirmProvider><Action result={result}/></AppConfirmProvider>);
 fireEvent.click(screen.getByText('실행'));fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});await waitFor(()=>expect(result).toHaveBeenCalledWith(false));
 fireEvent.click(screen.getByText('실행'));unmount();await waitFor(()=>expect(result).toHaveBeenCalledTimes(2));expect(result).toHaveBeenLastCalledWith(false);
});
it('does not queue extra destructive actions behind a confirmation',async()=>{
 const result=vi.fn();render(<AppConfirmProvider><Action result={result}/></AppConfirmProvider>);
 const button=screen.getByText('실행');fireEvent.click(button);fireEvent.click(button);await waitFor(()=>expect(result).toHaveBeenCalledWith(false));
 fireEvent.click(screen.getByRole('button',{name:'신청 취소'}));await waitFor(()=>expect(result).toHaveBeenCalledTimes(2));expect(result.mock.calls.filter(([value])=>value)).toHaveLength(1);
});
