'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {Button} from '../ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '../ui/dialog';
type Confirmation={title:string;description?:string;confirmLabel?:string;cancelLabel?:string;destructive?:boolean};
type Ask=(options:Confirmation)=>Promise<boolean>;
const Context=createContext<Ask|null>(null);
export function AppConfirmProvider({children}:{children:ReactNode}){
 const [request,setRequest]=useState<Confirmation|null>(null),[open,setOpen]=useState(false);
 const pending=useRef<((confirmed:boolean)=>void)|null>(null),alive=useRef(true),opener=useRef<HTMLElement|null>(null),fallback=useRef<HTMLElement|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;pending.current?.(false);pending.current=null}},[]);
 const ask=useCallback<Ask>(options=>{
  // A second click must never queue another destructive action. Unmount/account
  // revalidation dismisses pending work instead of continuing with stale access.
  if(!alive.current||pending.current)return Promise.resolve(false);
  opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  fallback.current=opener.current?.closest<HTMLElement>('[role="dialog"],[data-dialog-focus-return]')??null;
  return new Promise(resolve=>{pending.current=resolve;setRequest(options);setOpen(true)});
 },[]);
 const finish=(confirmed:boolean)=>{const resolve=pending.current;if(!resolve)return;pending.current=null;setOpen(false);resolve(confirmed)};
 return <Context.Provider value={ask}>{children}<Dialog open={open} onOpenChange={open=>{if(!open)finish(false)}}>
  <DialogContent onCloseAutoFocus={event=>{event.preventDefault();requestAnimationFrame(()=>{const target=opener.current?.isConnected&&!opener.current.matches(':disabled')?opener.current:fallback.current;if(target?.isConnected)target.focus({preventScroll:true})})}}>
   <DialogHeader><DialogTitle>{request?.title??'확인'}</DialogTitle><DialogDescription>{request?.description??'계속 진행하려면 확인해 주세요.'}</DialogDescription></DialogHeader>
   <DialogFooter className="flex-row justify-end [&>button]:min-h-11"><Button variant="outline" onClick={()=>finish(false)}>{request?.cancelLabel??'취소'}</Button><Button variant={request?.destructive?'destructive':'default'} onClick={()=>finish(true)}>{request?.confirmLabel??'확인'}</Button></DialogFooter>
  </DialogContent>
 </Dialog></Context.Provider>;
}
export function useAppConfirm(){const ask=useContext(Context);if(!ask)throw Error('AppConfirmProvider required');return ask}
