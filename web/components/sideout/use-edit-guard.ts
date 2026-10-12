'use client';
import {useCallback,useEffect,useLayoutEffect,useRef} from 'react';
import {useAppConfirm} from './confirm-dialog';
export function useEditGuard(dirty:boolean,options:{onLeave?:()=>void;blocked?:boolean}={}){
 const confirm=useAppConfirm();
 const active=useRef(dirty),leaving=useRef(false),onLeave=useRef(options.onLeave),blocked=useRef(options.blocked),mounted=useRef(true),asking=useRef(false);
 useLayoutEffect(()=>{active.current=dirty;onLeave.current=options.onLeave;blocked.current=options.blocked});
 const depart=useCallback(()=>{if(leaving.current)return;leaving.current=true;onLeave.current?.()},[]);
 const navigate=useCallback(async(url:string)=>{
  if(blocked.current||leaving.current||asking.current)return;
  asking.current=true;
  const accepted=!active.current||await confirm({title:'저장하지 않고 이동할까요?',description:'저장하지 않은 변경사항이 사라집니다.',confirmLabel:'이동',cancelLabel:'계속 수정'});
  asking.current=false;
  if(!accepted||!mounted.current||blocked.current)return;
  depart();window.location.assign(url);
 },[confirm,depart]);
 useEffect(()=>{
  mounted.current=true;
  const unload=(event:BeforeUnloadEvent)=>{if((active.current||blocked.current)&&!leaving.current){event.preventDefault();event.returnValue=''}};
  const click=(event:MouseEvent)=>{
   const a=(event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement|null;
   if(!a||a.target==='_blank'||a.hasAttribute('download')||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0||leaving.current||a.href===location.href)return;
   const destination=new URL(a.href);if(destination.origin===location.origin&&destination.pathname===location.pathname&&destination.search===location.search)return;
   if(blocked.current||active.current){event.preventDefault();event.stopImmediatePropagation();if(!blocked.current)void navigate(a.href)}else depart();
  };
  // Refresh/tab close/browser Back cannot await app UI. Keep the browser's
  // beforeunload data-loss guard; clear drafts only when departure is accepted.
  const hide=()=>depart();
  const show=(event:PageTransitionEvent)=>{if(!event.persisted)return;if(leaving.current&&onLeave.current){active.current=false;window.location.reload()}else leaving.current=false};
  addEventListener('beforeunload',unload);addEventListener('pagehide',hide);addEventListener('pageshow',show);document.addEventListener('click',click,true);
  return()=>{mounted.current=false;removeEventListener('beforeunload',unload);removeEventListener('pagehide',hide);removeEventListener('pageshow',show);document.removeEventListener('click',click,true)};
 },[depart,navigate]);
 return {cancel:navigate,saved:()=>{active.current=false}};
}
