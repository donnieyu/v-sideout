'use client';
import {ParticipationButton} from './participation-button';
import {useCallback,useEffect} from 'react';
import {SideoutLink as Link} from './link';
import {useSearchParams} from 'next/navigation';
import {CalendarDays,ChevronLeft,ChevronRight,Star,SlidersHorizontal,Info,LockKeyhole,Check} from 'lucide-react';
import {Button} from '../ui/button';
import {addDays,kstDate,kstWeekStart,parseReadSelection} from '@/lib/sideout/calendar';
import type {ClubRecord,SessionCardView} from '@/lib/sideout/read-model';
import {ReadState,ReadWarning,useRead,useSideout} from './access';
import {SideoutShell} from './shell';
import {FavoriteEditor} from './favorite-editor';
import {RosterButton} from './roster-dialog';
import {WeekSchedule,type ScheduleItem} from './week-schedule';
import styles from './sideout.module.css';
export const dateLabel=(date:string)=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Seoul'}).format(new Date(date+'T00:00:00+09:00'));
export function attendanceLabel(c:SessionCardView){return c.session.phase==='draft'?'이어서 준비':c.selfStatus==='waiting'?'대기 등록 완료':c.selfStatus==='applied'?(c.teamPublished?'취소 불가':'참석 취소'):c.teamPublished?'접수 종료':'참석 신청'}
function EventCard({card,club=card!.club,suffix,onOpen,past=false,date}:{date?:string;card?:SessionCardView;club?:ClubRecord;suffix:string;onOpen:()=>void;past?:boolean}){
 const {session}=useSideout(),own=club.id===session.me.homeClubId,preparing=!card||card.session.phase==='draft';
 const href=card?'/session/'+encodeURIComponent(card.session.id)+suffix:'';
 const createHref='/session/new?'+new URLSearchParams({...Object.fromEntries(new URLSearchParams(suffix.slice(1))),clubId:club.id,date:date??''});
 return <article className={`${styles.eventCard} ${own?styles.own:''} ${preparing?styles.draft:''}`}>
  <header><div><span className={styles.mark}>{club.mark}</span><h3>{club.name}</h3>{own&&<small className={styles.ownLabel}>내 모임</small>}</div>
   {past?<span className={styles.attended}><Check size={14}/>참석</span>:card&&!preparing&&<Button asChild variant="ghost" size="sm"><Link href={href} onClick={onOpen} aria-label={`${club.name} 상세 정보`}><Info/>상세</Link></Button>}
  </header>
  <p className={styles.eventPlace}>{card?.session.place??club.place}</p>
  <div className={styles.count} aria-label={preparing?'모집 전, 신청 인원 없음':undefined}><strong>{preparing?'—':card.counts.applicants}<small>명</small></strong>{preparing?<span>모집 전</span>:<RosterButton card={card}/>}</div>
  <div className={styles.progress} aria-hidden="true"><span style={{width:`${preparing?0:Math.min(100,card.counts.applicants/(card.session.cap??24)*100)}%`}}/></div>
  {!!card&&card.counts.waiting>0&&<p className={styles.muted}>대기 {card.counts.waiting}명</p>}
  <div className={styles.actions}>
   {past?<Button asChild variant="secondary"><Link href={href+(card?.canViewPublishedTeams?'#teams':'')} onClick={onOpen}>{card?.canViewPublishedTeams?'팀편성 확인':'일정 상세'}</Link></Button>:<>
    {!card?<Button asChild variant="outline"><Link href={createHref} onClick={onOpen}>모임 등록</Link></Button>:card.session.phase==='draft'?<Button asChild variant="outline"><Link href={'/session/'+encodeURIComponent(card.session.id)+'/schedule/edit'+suffix} onClick={onOpen}>이어서 준비</Link></Button>:<ParticipationButton card={card}/>}
    {card?.canViewPublishedTeams&&<Button asChild><Link href={href+'#teams'} onClick={onOpen}>팀편성 확인</Link></Button>}
   </>}
  </div>
 </article>;
}
export function HomeScreen(){
 const {directory,client,actions,scroll,session:viewer}=useSideout(),params=useSearchParams();
 const raw=params.toString();let selection;let invalidInput=false;
 try{selection=parseReadSelection(new URL('http://internal/?'+raw),new Date(directory.serverNow))}catch{selection={weekStart:kstWeekStart(new Date(directory.serverNow)),filter:'all'};invalidInput=true}
 const {weekStart,filter}=selection;
 const load=useCallback((signal:AbortSignal)=>client.home({weekStart,filter},signal),[client,weekStart,filter]);
 const recheck=useCallback(()=>void actions.refresh(),[actions.refresh]);const {data,error,retry}=useRead(load,recheck,15000);
 const query=new URLSearchParams({weekStart,filter}),suffix='?'+query;
 const scrollKey=`sideout:scroll:${viewer.me.memberId}:${suffix}`;
 const open=()=>{scroll.set(suffix,window.scrollY);try{sessionStorage.setItem(scrollKey,String(window.scrollY))}catch{}};
 useEffect(()=>{if(data){let y=scroll.get(suffix);try{y??=Number(sessionStorage.getItem(scrollKey)??0)}catch{};window.scrollTo(0,y??0)}},[data,scroll,suffix,scrollKey]);
 const change=(week:string,choice=filter)=>window.location.assign('/home?'+new URLSearchParams({weekStart:week,filter:choice}));
 const referenceNow=data?.serverNow??directory.serverNow;
 const current=weekStart===kstWeekStart(new Date(referenceNow)),past=weekStart<kstWeekStart(new Date(referenceNow));
 const monthDay=addDays(weekStart,3),month=Number(monthDay.slice(5,7)),week=Math.ceil(Number(monthDay.slice(8,10))/7);
 const items:ScheduleItem[]=[...(data?.cards.map(card=>({id:card.session.id,date:card.session.date,entry:card.session.entry,content:<EventCard card={card} suffix={suffix} onOpen={open} past={past}/>}))??[]),...(data?.registrationOpportunities.flatMap(o=>{const club=directory.clubs.find(c=>c.id===o.clubId);return club?[{id:`register-${club.id}`,date:o.date,entry:club.entry,content:<EventCard club={club} date={o.date} suffix={suffix} onOpen={open}/>}]:[]})??[])].sort((a,b)=>a.date.localeCompare(b.date)||a.entry.localeCompare(b.entry));
 const days=Array.from(new Set([...items.map(item=>item.date),...(filter==='all'?directory.clubs.map(c=>addDays(weekStart,c.weekday-1)):[])])).sort();
 return <SideoutShell>{data&&error&&<ReadWarning retry={retry}/>}<header className={styles.pageHeading}><h1>{past?'내가 함께했던 운동':current?'이번 주, 어느 코트에서 만날까요?':'다음 운동을 미리 살펴보세요.'}</h1><p>{past?'참석했던 운동의 팀편성을 다시 확인하세요.':'다가오는 운동을 확인하고, 함께할 시간을 선택하세요.'}</p></header><div className={styles.filters} aria-label="모임 필터"><Button variant={filter==='all'?'secondary':'outline'} aria-pressed={filter==='all'} onClick={()=>change(weekStart,'all')}>All</Button><Button variant={filter==='favorites'?'secondary':'outline'} aria-pressed={filter==='favorites'} onClick={()=>change(weekStart,'favorites')}><Star/>즐겨찾기</Button><FavoriteEditor onSaved={retry}/>{directory.clubs.map(c=><Button key={c.id} variant={filter===c.id?'secondary':'outline'} aria-pressed={filter===c.id} onClick={()=>change(weekStart,c.id)}><span className={styles.mark}>{c.mark}</span>{c.name}</Button>)}</div><div className={styles.weekToolbar}><h2 aria-live="polite">{month}월 {week}째 주</h2><div><Button variant="outline" size="icon" aria-label="이전 주" onClick={()=>change(addDays(weekStart,-7))}><ChevronLeft/></Button><Button className={styles.currentWeek} variant={current?'secondary':'outline'} disabled={current} onClick={()=>change(kstWeekStart(new Date(directory.serverNow)))}>{current?'이번 주':'이번 주로'}</Button><Button variant="outline" size="icon" aria-label="다음 주" onClick={()=>change(addDays(weekStart,7))}><ChevronRight/></Button></div></div><div className={styles.weekStrip}>{['월','화','수','목','금','토','일'].map((label,i)=>{const day=addDays(weekStart,i),count=data?.cards.filter(c=>c.session.date===day&&c.session.phase!=='draft').length??0;return <div key={day} className={day===kstDate(new Date(directory.serverNow))?styles.today:''}><span>{label}</span><b>{Number(day.slice(8,10))}</b><small>{[day===kstDate(new Date(referenceNow))?'오늘':'',directory.clubs.some(c=>c.weekday===i+1)?`${count}개`:''].filter(Boolean).join(' · ')}</small></div>})}</div>{past&&<p className={styles.archiveLabel}><Check size={16}/>내가 참석한 운동</p>}{invalidInput?<section className={styles.empty}><h2>날짜와 모임 선택을 확인해 주세요.</h2><Button onClick={()=>window.location.replace('/home')}>이번 주 보기</Button></section>:!data?<ReadState error={error} retry={retry}/>:!items.length?<section className={styles.empty}><CalendarDays/><h2>{past?'이 주에는 참석한 운동이 없어요.':'이 주에는 등록된 운동이 없어요.'}</h2><p>이전·다음 주로 이동하거나 다른 모임을 선택해 보세요.</p></section>:<WeekSchedule items={items} days={days} showEmptyBands={filter==='all'}/>}</SideoutShell>;
}
