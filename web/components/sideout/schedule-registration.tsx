'use client';
import {useLayoutEffect,useRef} from 'react';
import {Input} from '../ui/input';
import {Textarea} from '../ui/textarea';
import type {ScheduleInput} from '@/lib/sideout/write-model';
import {DeadlineBadge} from './schedule-deadline';
import info from './schedule-information.module.css';
import styles from './schedule-registration.module.css';
export const localDateTime=(iso:string)=>iso&&Number.isFinite(Date.parse(iso))?new Date(Date.parse(iso)+9*3600000).toISOString().slice(0,16):'';
export const instantDateTime=(value:string)=>value&&Number.isFinite(Date.parse(value+':00+09:00'))?new Date(value+':00+09:00').toISOString():'';
export function RegistrationFields({value,onChange,invalidFields=[]}:{value:ScheduleInput;onChange:<K extends keyof ScheduleInput>(key:K,value:ScheduleInput[K])=>void;invalidFields?:string[]}){
 const invalid=(key:string)=>invalidFields.includes(key)||undefined;
 return <article className={`${info.card} ${styles.formCard}`} data-schedule-information aria-label="일정 정보">
  <div className={info.heading}><h2>일정 정보</h2></div>
  <section className={info.section} aria-labelledby="registration-place-title">
   <h3 id="registration-place-title">장소·시간</h3>
   <label className={styles.field}>장소<Input name="place" value={value.place} aria-invalid={invalid('place')} required maxLength={100} onChange={e=>onChange('place',e.target.value)}/></label>
   <div className={styles.times}>{([['entry','입장 · 몸풀기'],['start','운동 시작'],['end','종료']] as const).map(([key,label])=><label className={styles.field} key={key}>{label}<Input name={key} type="time" required aria-invalid={invalid(key)} value={value[key]} onChange={e=>onChange(key,e.target.value)}/></label>)}</div>
  </section>
  <section className={info.section} aria-labelledby="registration-settings-title">
   <h3 id="registration-settings-title">신청 정보</h3>
   <div className={info.deadlineHeading}><label htmlFor="schedule-deadline">신청 마감</label><DeadlineBadge deadline={value.deadline}/></div>
   <div className={styles.field}><Input id="schedule-deadline" name="deadline" type="datetime-local" required aria-invalid={invalid('deadline')} value={localDateTime(value.deadline)} onChange={e=>onChange('deadline',instantDateTime(e.target.value))}/></div>
   <div className={styles.settingFields}><label className={styles.check}><input type="checkbox" checked={value.priorityUntil!==null} onChange={e=>onChange('priorityUntil',e.target.checked?value.deadline:null)}/>소속 회원 우선 기간</label>{value.priorityUntil!==null&&<><label className={styles.field}>우선 신청 종료<Input name="priorityUntil" type="datetime-local" required aria-invalid={invalid('priorityUntil')} value={localDateTime(value.priorityUntil)} onChange={e=>onChange('priorityUntil',instantDateTime(e.target.value))}/></label><p className={styles.help}>다른 모임 회원은 대기 등록 후, 우선 기간이 끝나면 빈자리에 순서대로 전환됩니다.</p></>}</div>
   <div className={styles.settingFields}><label className={styles.check}><input type="checkbox" checked={value.cap!==null} onChange={e=>onChange('cap',e.target.checked?24:null)}/>정원 설정</label>{value.cap!==null?<><label className={styles.field}>정원 (명)<Input name="cap" type="number" required min={1} max={200} aria-invalid={invalid('cap')} value={value.cap||''} onChange={e=>onChange('cap',Number(e.target.value))}/></label><p className={styles.help}>정원을 넘으면 대기자로 등록됩니다.</p></>:<p className={styles.help}>인원 제한 없음</p>}</div>
  </section>
  <section className={info.section}><div className={styles.heading}><label htmlFor="registration-notice" className={styles.title}>운동 공지</label><small>선택</small></div><NoticeInput id="registration-notice" value={value.notice} onChange={text=>onChange('notice',text)}/></section>
 </article>;
}
function NoticeInput({id,value,onChange}:{id:string;value:string;onChange:(text:string)=>void}){
 const ref=useRef<HTMLTextAreaElement>(null);
 useLayoutEffect(()=>{const el=ref.current;if(el){el.style.height='auto';el.style.height=Math.max(120,el.scrollHeight)+'px'}},[value]);
 return <Textarea ref={ref} id={id} name="notice" className={styles.notice} rows={4} maxLength={2000} value={value} placeholder="준비물, 입장 방법 등 필요한 안내를 적어 주세요." onChange={e=>onChange(e.target.value)}/>;
}
