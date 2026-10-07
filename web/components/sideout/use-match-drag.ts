'use client';
import {useEffect,useLayoutEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import {dragScrollSpeed,matchDropTarget,type DropTarget} from '@/lib/sideout/match-drag';

type Drag={id:string;pointerId:number;from:number;x:number;y:number;startX:number;startY:number;offsetY:number;left:number;width:number;target:DropTarget|null;lineTop:number;phase:'drag'|'drop'};
type Pending=Omit<Drag,'phase'>&{phase:'pending'|'drag'|'drop'};
export function useMatchDrag(onMove:(id:string,index:number)=>void){
 const listRef=useRef<HTMLOListElement>(null),overlayRef=useRef<HTMLDivElement>(null),moveRef=useRef(onMove);moveRef.current=onMove;
 const pointer=useRef<Pending|null>(null),frame=useRef<number|null>(null),clock=useRef(0),animations=useRef<Animation[]>([]),timer=useRef<ReturnType<typeof setTimeout>|null>(null),before=useRef<Map<string,DOMRect>>(new Map());
 const [drag,setDrag]=useState<Drag|null>(null),[landed,setLanded]=useState<string|null>(null);
 const rows=()=>Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-match-id]')??[]);
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
 function stopFrame(){if(frame.current!==null)cancelAnimationFrame(frame.current);frame.current=null;clock.current=0}
 function cancel(){stopFrame();pointer.current=null;setDrag(null);for(const animation of animations.current)animation.cancel();animations.current=[]}
 function locate(p:Pending){
  const list=listRef.current;if(!list)return p;const box=list.getBoundingClientRect(),elements=rows();
  // offsetTop/offsetHeight ignore the visual insertion-gap transforms.
  const rects=elements.map(row=>({top:box.top+list.clientTop+row.offsetTop,bottom:box.top+list.clientTop+row.offsetTop+row.offsetHeight}));
  const next=matchDropTarget(rects,p.from,p.x,p.y,box);
  // Small hysteresis near a midpoint keeps a stationary finger from flickering.
  let target=next;
  if(next&&p.target&&next.boundary!==p.target.boundary){const i=Math.min(next.boundary,p.target.boundary),r=rects[i];if(r&&Math.abs(p.y-(r.top+r.bottom)/2)<4)target=p.target}
  const boundary=target?.boundary??0,lineTop=elements[boundary]?.offsetTop??(elements.at(-1)?elements.at(-1)!.offsetTop+elements.at(-1)!.offsetHeight:0);
  return {...p,target,lineTop};
 }
 function track(x:number,y:number){
  const p=pointer.current;if(!p||p.phase==='drop')return;
  if(p.phase==='pending'&&Math.hypot(x-p.startX,y-p.startY)<6)return;
  const next=locate({...p,x,y,phase:'drag'});pointer.current=next;setDrag(next as Drag);
 }
 function scroll(timestamp:number){
  const p=pointer.current;if(!p||p.phase==='drop')return;
  const elapsed=clock.current?Math.min(32,timestamp-clock.current):0;clock.current=timestamp;
  if(p.phase==='drag'){
   const top=document.querySelector('[data-match-actions]')?.getBoundingClientRect().bottom??80;
   const list=listRef.current?.getBoundingClientRect();
   const speed=list&&p.x>=list.left-16&&p.x<=list.right+16?dragScrollSpeed(p.y,top,window.innerHeight-12):0;
   if(speed&&elapsed){const old=window.scrollY;window.scrollBy(0,speed*elapsed/1000);if(window.scrollY!==old)track(p.x,p.y)}
  }
  frame.current=requestAnimationFrame(scroll);
 }
 function start(e:ReactPointerEvent<HTMLButtonElement>,id:string){
  if(e.button!==0||pointer.current)return;
  const elements=rows(),from=elements.findIndex(row=>row.dataset.matchId===id);if(from<0)return;
  for(const animation of animations.current)animation.cancel();animations.current=[];setLanded(null);
  const box=elements[from].getBoundingClientRect();e.preventDefault();e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);
  pointer.current={id,pointerId:e.pointerId,from,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,offsetY:84,left:box.left,width:box.width,target:{boundary:from,index:from},lineTop:elements[from].offsetTop,phase:'pending'};
  frame.current=requestAnimationFrame(scroll);
 }
 function finish(e:ReactPointerEvent<HTMLButtonElement>){
  if(pointer.current?.pointerId!==e.pointerId)return;track(e.clientX,e.clientY);const p=pointer.current!;stopFrame();
  if(p.phase!=='drag'||!p.target||p.target.index===p.from){cancel();return}
  before.current=new Map(rows().map(row=>[row.dataset.matchId!,row.getBoundingClientRect()]));
  pointer.current={...p,phase:'drop'};setDrag({...p,phase:'drop'});moveRef.current(p.id,p.target.index);
 }
 useLayoutEffect(()=>{
  if(drag?.phase==='drag'&&overlayRef.current&&pointer.current){
   // Keep the carried card above the finger so it cannot cover the insertion line.
   const offsetY=overlayRef.current.offsetHeight+16;
   if(offsetY!==pointer.current.offsetY){pointer.current={...pointer.current,offsetY};setDrag(pointer.current as Drag)}
  }
  if(drag?.phase!=='drop')return;
  const row=rows().find(row=>row.dataset.matchId===drag.id),overlay=overlayRef.current;
  let active=true;
  function done(){if(!active)return;pointer.current=null;setDrag(null);setLanded(drag!.id);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setLanded(null),700)}
  if(!row||!overlay||reduced()||!overlay.animate){done();return}
  const box=row.getBoundingClientRect();
  const animation=overlay.animate([{transform:`translate3d(${drag.left}px,${drag.y-drag.offsetY}px,0)`},{transform:`translate3d(${box.left}px,${box.top}px,0)`}],{duration:180,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'});animations.current.push(animation);
  for(const other of rows()){
   if(other===row)continue;const prev=before.current.get(other.dataset.matchId!);if(!prev)continue;
   const delta=prev.top-other.getBoundingClientRect().top;if(Math.abs(delta)<1||!other.animate)continue;
   animations.current.push(other.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.16,1,.3,1)'}));
  }
  void animation.finished.then(done,()=>{});
  return ()=>{active=false};
 },[drag?.phase]);
 useEffect(()=>{
  const abort=()=>cancel();const visibility=()=>{if(document.hidden)cancel()};
  window.addEventListener('blur',abort);window.addEventListener('resize',abort);document.addEventListener('visibilitychange',visibility);
  return ()=>{stopFrame();for(const animation of animations.current)animation.cancel();if(timer.current)clearTimeout(timer.current);window.removeEventListener('blur',abort);window.removeEventListener('resize',abort);document.removeEventListener('visibilitychange',visibility)};
 },[]);
 const gap=drag?.phase==='drag'&&drag.target&&drag.target.index!==drag.from?drag.target:null;
 return {listRef,overlayRef,drag,landed,gap,start,finish,cancel,isBusy:()=>!!pointer.current,
  move:(e:ReactPointerEvent<HTMLButtonElement>)=>{if(pointer.current?.pointerId===e.pointerId)track(e.clientX,e.clientY)},
  lost:()=>{if(pointer.current?.phase!=='drop')cancel()},
 };
}
