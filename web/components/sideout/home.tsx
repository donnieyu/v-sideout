'use client';
import {ParticipationButton} from './participation-button';
import {useCallback,useLayoutEffect,useRef} from 'react';
import {SideoutLink as Link} from './link';
import {useSearchParams} from 'next/navigation';
import {CalendarDays,ChevronLeft,ChevronRight,Star,MapPin,Pencil,Check,CircleCheck} from 'lucide-react';
import {Button} from '../ui/button';
import {addDays,kstDate,kstWeekStart,parseReadSelection} from '@/lib/sideout/calendar';
import type {ClubRecord,SessionCardView} from '@/lib/sideout/read-model';
import {ReadState,ReadWarning,useRead,useSideout} from './access';
import {SideoutShell} from './shell';
import {FavoriteEditor} from './favorite-editor';
import {RosterButton} from './roster-dialog';
import {NoticeButton,noticeEditHref} from './notice-dialog';
import {SessionTimeline} from './session-timeline';
import {enrollmentProgress} from './enrollment-progress';
import {WeekSchedule,type ScheduleItem} from './week-schedule';
import styles from './sideout.module.css';
export const dateLabel=(date:string)=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Seoul'}).format(new Date(date+'T00:00:00+09:00'));
export function attendanceLabel(c:SessionCardView){return c.session.phase==='draft'?'이어서 준비':c.selfStatus==='waiting'?'대기 등록 완료':c.selfStatus==='applied'?(c.teamPublished?'취소 불가':'참석 취소'):c.teamPublished?'접수 종료':'참석 신청'}
export function EventCard({card,club=card!.club,suffix,onOpen,past=false,date,serverNow}:{serverNow?:string;date?:string;card?:SessionCardView;club?:ClubRecord;suffix:string;onOpen:()=>void;past?:boolean}){
 const {session,directory}=useSideout(),own=club.id===session.me.homeClubId,preparing=!card||card.session.phase==='draft';
 const href=card?'/session/'+encodeURIComponent(card.session.id)+suffix:'';
 const createHref='/session/new?'+new URLSearchParams({...Object.fromEntries(new URLSearchParams(suffix.slice(1))),clubId:club.id,date:date??''});
 const deadlinePassed=!!card&&Date.parse(card.session.deadline)<=Date.parse(serverNow??directory?.serverNow??new Date().toISOString());
 // Use the same server eligibility as the action; deadline alone misses capacity/priority waitlists.
 const waitingOnly=card?.participation?card.participation.registerLabel==='대기자 등록':deadlinePassed;
 const status=preparing?{label:'모집 전',tone:'neutral'}:past?{label:'지난 운동',tone:'neutral'}:card.teamPublished?{label:'팀편성 공개',tone:'success'}:card.selfStatus==='applied'?{label:'참석 신청 완료',tone:'success'}:card.selfStatus==='waiting'?{label:'대기 등록 완료',tone:'waiting'}:card.participation?.canRegister===false?{label:'접수 종료',tone:'neutral'}:waitingOnly?{label:'대기 접수',tone:'waiting'}:{label:'접수 중',tone:'info'};
 const deadline=card&&!preparing&&!past&&!card.teamPublished?new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(new Date(card.session.deadline))+' 마감':null;
 return <article data-club-id={club.id} aria-label={preparing?'모집 전, 신청 인원 없음':undefined} className={`${styles.eventCard} ${preparing?styles.draft:''}`}>
  <div className={styles.eventStatus}><span className={styles.statusBadge} data-tone={status.tone}>{status.tone==='success'&&<CircleCheck aria-hidden="true"/>}{status.label}</span><small>{!past&&card?.teamPublished&&card.selfStatus==='applied'?'참석 신청 완료':deadline}</small></div>
  <header><div className={styles.clubIdentity}><span className={styles.mark} data-club-id={club.id}>{club.mark}</span><div><h3>{club.name}</h3>{own&&<small className={styles.ownLabel}>내 모임</small>}</div></div>{card&&!preparing&&<NoticeButton session={card.session} clubName={club.name} editHref={card.canManage&&Date.parse(card.session.date+'T'+card.session.start+':00+09:00')>Date.parse(serverNow??directory?.serverNow??new Date().toISOString())?noticeEditHref(card.session.id,suffix):undefined} onEdit={onOpen}/>}</header>
  <p className={styles.eventPlace}><MapPin aria-hidden="true"/>{card?.session.place??club.place}</p>
  <SessionTimeline session={card?.session??club}/>
  {preparing?<p className={styles.muted}>신청을 준비하고 있어요.</p>:<><div className={styles.rosterLine}><RosterButton card={card}/></div><div className={styles.progress} aria-hidden="true"><span style={{width:`${enrollmentProgress(card.counts.applicants)}%`}}/></div></>}
  <div className={styles.actions}>
   {past?<Button asChild variant="outline"><Link href={href} onClick={onOpen}>{card?.canViewPublishedTeams?'팀편성 · 경기 순서':'일정 확인'}</Link></Button>:!card?<Button asChild variant="outline"><Link href={createHref} onClick={onOpen}>모임 등록</Link></Button>:preparing?<Button asChild variant="outline"><Link href={href} onClick={onOpen}>이어서 준비</Link></Button>:card.canViewPublishedTeams?<Button asChild><Link href={href} onClick={onOpen}>팀편성 · 경기 순서</Link></Button>:<ParticipationButton card={card}/>}
  </div>
  {card?.canManage&&!past&&!preparing&&<Button asChild variant="ghost" className={styles.manageLink}><Link href={href} onClick={onOpen}><Pencil aria-hidden="true"/>일정 관리</Link></Button>}
 </article>;
}
export function HomeScreen(){
 const {directory,client,actions,scroll,session:viewer}=useSideout(),params=useSearchParams();
 const raw=params.toString();let selection;let invalidInput=false;
 try{selection=parseReadSelection(new URL('http://internal/?'+raw),new Date(directory.serverNow))}catch{selection={weekStart:kstWeekStart(new Date(directory.serverNow)),filter:'all'};invalidInput=true}
 const {weekStart,filter}=selection;
 const load=useCallback((signal:AbortSignal)=>client.home({weekStart,filter},signal),[client,weekStart,filter]);
 const refreshAccess=actions.refresh;const recheck=useCallback(()=>void refreshAccess(),[refreshAccess]);const {data,error,retry}=useRead(load,recheck,15000);
 const query=new URLSearchParams({weekStart,filter}),suffix='?'+query;
 const listRef=useRef<HTMLDivElement>(null),restoredKey=useRef<string|null>(null);
 const scrollKey=`sideout:list-scroll:${viewer.me.memberId}:${suffix}`;
 const open=useCallback(()=>{
  if(!data||restoredKey.current!==scrollKey)return;
  const y=listRef.current?.scrollTop??0;scroll.set(scrollKey,y);
  try{sessionStorage.setItem(scrollKey,String(y))}catch{}
 },[data,scroll,scrollKey]);
 useLayoutEffect(()=>{
  if(!data){restoredKey.current=null;return}
  // Restore once when content is ready. Polling must not rewind an active scroll.
  if(!listRef.current||restoredKey.current===scrollKey)return;
  let y=scroll.get(scrollKey);try{y??=Number(sessionStorage.getItem(scrollKey)??0)}catch{}
  listRef.current.scrollTop=Number.isFinite(y)?Math.max(0,y!):0;
  restoredKey.current=scrollKey;
 },[data,scroll,scrollKey]);
 const change=(week:string,choice=filter)=>{
  open();
  const nextSuffix='?'+new URLSearchParams({weekStart:week,filter:choice});
  const nextKey=`sideout:list-scroll:${viewer.me.memberId}:${nextSuffix}`;
  scroll.set(nextKey,0);try{sessionStorage.setItem(nextKey,'0')}catch{}
  window.location.assign('/home'+nextSuffix);
 };
 const referenceNow=data?.serverNow??directory.serverNow;
 const current=weekStart===kstWeekStart(new Date(referenceNow)),past=weekStart<kstWeekStart(new Date(referenceNow));
 const endDay=addDays(weekStart,6),weekLabel=`${Number(weekStart.slice(5,7))}월 ${Number(weekStart.slice(8,10))}일 – ${weekStart.slice(5,7)!==endDay.slice(5,7)?Number(endDay.slice(5,7))+"월 ":""}${Number(endDay.slice(8,10))}일`;
 const items:ScheduleItem[]=[...(data?.cards.map(card=>({id:card.session.id,date:card.session.date,entry:card.session.entry,isOpen:card.session.phase==='open',content:<EventCard card={card} suffix={suffix} onOpen={open} past={past} serverNow={referenceNow}/>}))??[]),...(data?.registrationOpportunities.flatMap(o=>{const club=directory.clubs.find(c=>c.id===o.clubId);return club?[{id:`register-${club.id}`,date:o.date,entry:club.entry,isOpen:false,content:<EventCard club={club} date={o.date} suffix={suffix} onOpen={open}/>}]:[]})??[])].sort((a,b)=>a.date.localeCompare(b.date)||a.entry.localeCompare(b.entry));
 const days=Array.from(new Set([...items.map(item=>item.date),...(filter==='all'?directory.clubs.map(c=>addDays(weekStart,c.weekday-1)):[])])).sort();
 return <SideoutShell title="운동 일정" schedule contentHeading><div className={styles.scheduleControls}><h1 className={styles.scheduleTitle}>운동 일정</h1><div className={styles.filters} aria-label="모임 필터"><Button variant={filter==='all'?'secondary':'outline'} aria-pressed={filter==='all'} onClick={()=>change(weekStart,'all')}>전체</Button><Button variant={filter==='favorites'?'secondary':'outline'} aria-pressed={filter==='favorites'} onClick={()=>change(weekStart,'favorites')}><Star/>즐겨찾기</Button><FavoriteEditor onSaved={retry}/>{directory.clubs.map(c=><Button key={c.id} variant={filter===c.id?'secondary':'outline'} aria-pressed={filter===c.id} onClick={()=>change(weekStart,c.id)}><span className={styles.mark} data-club-id={c.id}>{c.mark}</span>{c.name}</Button>)}</div><div className={styles.weekToolbar}><h2 aria-live="polite">{weekLabel}</h2><div><Button variant="outline" size="icon" aria-label="이전 주" onClick={()=>change(addDays(weekStart,-7))}><ChevronLeft/></Button><Button className={styles.currentWeek} variant={current?'secondary':'outline'} disabled={current} onClick={()=>change(kstWeekStart(new Date(directory.serverNow)))}>{current?'이번 주':'이번 주로'}</Button><Button variant="outline" size="icon" aria-label="다음 주" onClick={()=>change(addDays(weekStart,7))}><ChevronRight/></Button></div></div><div className={styles.weekStrip} role="list" aria-label="이번 주 일정 요약">{['월','화','수','목','금','토','일'].map((label,i)=>{const day=addDays(weekStart,i),today=day===kstDate(new Date(referenceNow)),count=data?.cards.filter(c=>c.session.date===day&&c.session.phase!=='draft').length??0;return <div key={day} role="listitem" aria-current={today?'date':undefined} aria-label={`${dateLabel(day)}${today?', 오늘':''}, 운동 ${count}개`} className={today?styles.today:''}><span className={styles.weekDayNumber} aria-hidden="true"><span>{label}</span><b>{Number(day.slice(8,10))}</b></span><span className={styles.weekDayDot} data-has-sessions={count>0} aria-hidden="true"/></div>})}</div></div><div ref={listRef} className={styles.scheduleList} role="region" aria-label="일정 목록" tabIndex={0} onScroll={open}>{data&&error&&<ReadWarning retry={retry}/>}{past&&<p className={styles.archiveLabel}><Check size={16}/>내가 참석한 운동</p>}{invalidInput?<section className={styles.empty}><h2>날짜와 모임 선택을 확인해 주세요.</h2><Button onClick={()=>window.location.replace('/home')}>이번 주 보기</Button></section>:!data?<ReadState error={error} retry={retry}/>:!items.length?<section className={styles.empty}><CalendarDays/><h2>{past?'이 주에는 참석한 운동이 없어요.':'이 주에는 등록된 운동이 없어요.'}</h2><p>이전·다음 주로 이동하거나 다른 모임을 선택해 보세요.</p></section>:<WeekSchedule items={items} days={days} showEmptyBands={filter==='all'}/>}</div></SideoutShell>;
}
