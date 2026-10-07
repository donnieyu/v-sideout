'use client';
import {useEffect,useRef} from 'react';
const message='저장하지 않은 변경사항이 사라집니다. 이동할까요?';
export function useEditGuard(dirty:boolean,options:{onLeave?:()=>void}={}){
 const active=useRef(dirty),leaving=useRef(false),onLeave=useRef(options.onLeave);
 active.current=dirty;onLeave.current=options.onLeave;
 const depart=()=>{if(leaving.current)return;leaving.current=true;onLeave.current?.()};
 useEffect(()=>{
  const unload=(event:BeforeUnloadEvent)=>{if(active.current&&!leaving.current){event.preventDefault();event.returnValue=''}};
  const click=(event:MouseEvent)=>{const a=(event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement|null;if(!a||a.target==='_blank'||a.hasAttribute('download')||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0||leaving.current||a.href===location.href)return;if(active.current&&!window.confirm(message)){event.preventDefault();event.stopImmediatePropagation()}else depart()};
  // Native anchors and browser Back navigate documents. beforeunload protects edits;
  // pagehide runs only after that navigation is accepted, so cancelled prompts retain drafts.
  const hide=()=>depart();
  const show=(event:PageTransitionEvent)=>{if(!event.persisted)return;if(leaving.current&&onLeave.current){active.current=false;window.location.reload()}else leaving.current=false};
  addEventListener('beforeunload',unload);addEventListener('pagehide',hide);addEventListener('pageshow',show);document.addEventListener('click',click,true);
  return()=>{removeEventListener('beforeunload',unload);removeEventListener('pagehide',hide);removeEventListener('pageshow',show);document.removeEventListener('click',click,true)};
 },[]);
 return {cancel:(url:string)=>{if(!active.current||window.confirm(message)){depart();window.location.assign(url)}},saved:()=>{active.current=false}};
}
