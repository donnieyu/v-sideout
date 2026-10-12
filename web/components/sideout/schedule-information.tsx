'use client';
import {MapPin} from 'lucide-react';
import type {SessionRecord} from '@/lib/sideout/read-model';
import {EditButton} from './editor-controls';
import {SessionTimeline} from './session-timeline';
import {NoticeSection} from './notice-dialog';
import {DeadlineBadge,formatDeadline} from './schedule-deadline';
import styles from './schedule-information.module.css';
export function ScheduleInformation({session,editHref,published=false,showApplication=true,past=false}:{session:Omit<SessionRecord,'id'>;editHref?:string;published?:boolean;showApplication?:boolean;past?:boolean}){
 return <article className={styles.card} data-schedule-information aria-label="일정 정보">
  <div className={styles.heading}><h2>일정 정보</h2>{editHref&&<EditButton href={editHref} label="일정 수정"/>}</div>
  <section className={styles.section}><h3>장소·시간</h3><p className={styles.place}><MapPin aria-hidden="true"/>{session.place}</p><SessionTimeline session={session} className={styles.timeline}/></section>
  {showApplication&&!past&&<section className={styles.section}><h3>신청 정보</h3><div className={styles.deadlineHeading}><span>신청 마감</span><DeadlineBadge deadline={session.deadline} published={published}/></div><p className={styles.deadlineValue}>{formatDeadline(session.deadline)}</p><dl className={styles.settings}><div><dt>소속 회원 우선</dt><dd>{session.priorityUntil?formatDeadline(session.priorityUntil)+'까지':'사용 안 함'}</dd></div><div><dt>정원</dt><dd>{session.cap===null?'제한 없음':session.cap+'명'}</dd></div></dl></section>}
  {session.notice.trim()&&<section className={styles.section}><NoticeSection notice={session.notice} embedded/></section>}
 </article>;
}
