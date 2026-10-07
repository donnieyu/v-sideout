'use client';
import {createContext} from 'react';
import type {ReactNode,CSSProperties} from 'react';
import styles from './sideout.module.css';
// Keep draft restoration local to the trigger that opened a portaled dialog.
export const ScheduleSurface=createContext('detail');
export type ScheduleItem={id:string;date:string;entry:string;content:ReactNode};
const label=(date:string)=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Seoul'}).format(new Date(date+'T00:00:00+09:00'));
export function WeekSchedule({items,days,showEmptyBands}:{items:ScheduleItem[];days:string[];showEmptyBands:boolean}){
 const bands=[{name:'오전',matches:(item:ScheduleItem)=>item.entry<'12:00'},{name:'오후',matches:(item:ScheduleItem)=>item.entry>='12:00'}].filter(b=>showEmptyBands||items.some(b.matches));
 const renderItem=(item:ScheduleItem)=><div className={styles.eventRow} key={item.id}><p className={styles.entryTime}>{item.entry}<small>입장 가능</small></p>{item.content}</div>;
 return <>
  <ScheduleSurface.Provider value="desktop"><div className={`${styles.weekBoard} ${days.length===1?styles.oneDay:''}`} aria-label="요일과 시간대별 일정" style={{'--schedule-days':days.length} as CSSProperties}>
   <div className={styles.boardHeading}><span/>{days.map(day=><h2 key={day}>{label(day)}</h2>)}</div>
   {bands.map(band=><div className={styles.timeBand} key={band.name}><h3>{band.name}</h3>{days.map(day=>{const entries=items.filter(item=>item.date===day&&band.matches(item));return <section aria-label={`${label(day)} ${band.name}`} key={day} className={styles.dayEvents}>{entries.length?entries.map(renderItem):<p className={styles.blankCell}>표시할 운동 없음</p>}</section>})}</div>)}
  </div></ScheduleSurface.Provider>
  <ScheduleSurface.Provider value="mobile"><div className={styles.mobileAgenda} aria-label="날짜별 일정">{days.filter(day=>items.some(item=>item.date===day)).map(day=><section key={day}><h2>{label(day)}</h2>{items.filter(item=>item.date===day).map(renderItem)}</section>)}</div></ScheduleSurface.Provider>
 </>;
}
