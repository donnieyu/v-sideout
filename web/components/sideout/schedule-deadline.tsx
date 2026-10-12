'use client';
import {useEffect,useState} from 'react';
import styles from './schedule-information.module.css';
const day=(time:number)=>Math.floor((time+9*3600000)/86400000);
export function deadlineStatus(deadline:string,now:string|number,published=false){
 const end=Date.parse(deadline),current=typeof now==='number'?now:Date.parse(now);
 if(published)return {label:'접수 종료',tone:'neutral'};
 if(!Number.isFinite(end)||!Number.isFinite(current))return {label:'',tone:'neutral'};
 if(end<=current)return {label:'신청 마감',tone:'neutral'};
 const days=day(end)-day(current);return {label:days===0?'오늘 마감':`D-${days}`,tone:days===0?'today':'upcoming'};
}
export function DeadlineBadge({deadline,published=false}:{deadline:string;published?:boolean}){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const tick=()=>setNow(Date.now()),timer=setInterval(tick,1000);window.addEventListener('focus',tick);return()=>{clearInterval(timer);window.removeEventListener('focus',tick)}},[]);
 const state=deadlineStatus(deadline,now,published);return state.label?<span className={styles.deadlineBadge} data-tone={state.tone}>{state.label}</span>:null;
}
export const formatDeadline=(value:string)=>Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(new Date(value)):'';
