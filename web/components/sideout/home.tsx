'use client';
import {useCallback,useEffect} from 'react';
import {SideoutLink as Link} from './link';
import {useSearchParams} from 'next/navigation';
import {CalendarDays,ChevronLeft,ChevronRight,Star,SlidersHorizontal,Info,LockKeyhole} from 'lucide-react';
import {Button} from '../ui/button';
import {addDays,kstDate,kstWeekStart,parseReadSelection} from '@/lib/sideout/calendar';
import type {SessionCardView} from '@/lib/sideout/read-model';
import {ReadState,useRead,useSideout} from './access';
import {SideoutShell} from './shell';
import styles from './sideout.module.css';
export const dateLabel=(date:string)=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Seoul'}).format(new Date(date+'T00:00:00+09:00'));
export function attendanceLabel(c:SessionCardView){return c.session.phase==='draft'?'이어서 준비':c.selfStatus==='waiting'?'대기 등록 완료':c.selfStatus==='applied'?(c.teamPublished?'취소 불가':'참석 취소'):c.teamPublished?'대기자 등록':'참석 신청'}
function EventCard({card,suffix,onOpen}:{card:SessionCardView;suffix:string;onOpen:()=>void}){
 const {session}=useSideout(),own=card.club.id===session.me.homeClubId;
 const href='/session/'+encodeURIComponent(card.session.id)+suffix;
 return <article className={`${styles.eventCard} ${own?styles.own:''} ${card.session.phase==='draft'?styles.draft:''}`}><header><div><span className={styles.mark}>{card.club.mark}</span><h3>{card.club.name}</h3>{own&&<small className={styles.ownLabel}>내 모임</small>}</div><Button asChild variant="ghost" size="sm"><Link href={href} onClick={onOpen} aria-label={`${card.club.name} 상세 정보`}><Info/>상세</Link></Button></header><p className={styles.muted}>{card.session.place}</p><div className={styles.count}><strong>{card.session.phase==='draft'?'—':card.counts.applicants}<small>명</small></strong><span>{card.counts.waiting>0?`대기 ${card.counts.waiting}명`:''}</span></div><div className={styles.progress}><span style={{width:`${Math.min(100,card.counts.applicants/(card.session.cap??24)*100)}%`}}/></div><div className={styles.actions}><Button disabled variant="outline">{card.selfStatus==='applied'&&card.teamPublished&&<LockKeyhole/>}{attendanceLabel(card)}</Button>{card.canViewPublishedTeams&&<Button asChild><Link href={href+'#teams'} onClick={onOpen}>팀편성 확인</Link></Button>}</div></article>;
}
export function HomeScreen(){
 const {directory,client,actions,scroll,session:viewer}=useSideout(),params=useSearchParams();
 const raw=params.toString();let selection;let invalidInput=false;
 try{selection=parseReadSelection(new URL('http://internal/?'+raw),new Date(directory.serverNow))}catch{selection={weekStart:kstWeekStart(new Date(directory.serverNow)),filter:'all'};invalidInput=true}
 const {weekStart,filter}=selection;
 const load=useCallback((signal:AbortSignal)=>client.home({weekStart,filter},signal),[client,weekStart,filter]);
 const recheck=useCallback(()=>void actions.refresh(),[actions.refresh]);const {data,error,retry}=useRead(load,recheck);
 const query=new URLSearchParams({weekStart,filter}),suffix='?'+query;
 const scrollKey=`sideout:scroll:${viewer.me.memberId}:${suffix}`;
 const open=()=>{scroll.set(suffix,window.scrollY);try{sessionStorage.setItem(scrollKey,String(window.scrollY))}catch{}};
 useEffect(()=>{if(data){let y=scroll.get(suffix);try{y??=Number(sessionStorage.getItem(scrollKey)??0)}catch{};window.scrollTo(0,y??0)}},[data,scroll,suffix,scrollKey]);
 const change=(week:string,choice=filter)=>window.location.assign('/home?'+new URLSearchParams({weekStart:week,filter:choice}));
 const current=weekStart===kstWeekStart(new Date(directory.serverNow));
 const monthDay=addDays(weekStart,3),month=Number(monthDay.slice(5,7)),week=Math.ceil(Number(monthDay.slice(8,10))/7);
 const days=Array.from(new Set([...(data?.cards.map(c=>c.session.date)??[]),...(data?.registrationOpportunities.map(c=>c.date)??[])])).sort();
 return <SideoutShell><header className={styles.pageHeading}><h1>이번 주, 어느 코트에서 만날까요?</h1><p>다가오는 운동을 확인하고, 함께할 시간을 선택하세요.</p></header><div className={styles.filters} aria-label="모임 필터"><Button variant={filter==='all'?'secondary':'outline'} aria-pressed={filter==='all'} onClick={()=>change(weekStart,'all')}>All</Button><Button variant={filter==='favorites'?'secondary':'outline'} aria-pressed={filter==='favorites'} onClick={()=>change(weekStart,'favorites')}><Star/>즐겨찾기</Button>{directory.clubs.map(c=><Button key={c.id} variant={filter===c.id?'secondary':'outline'} aria-pressed={filter===c.id} onClick={()=>change(weekStart,c.id)}><span className={styles.mark}>{c.mark}</span>{c.name}</Button>)}</div><div className={styles.weekToolbar}><h2 aria-live="polite">{month}월 {week}째 주</h2><div><Button variant="outline" size="icon" aria-label="이전 주" onClick={()=>change(addDays(weekStart,-7))}><ChevronLeft/></Button><Button className={styles.currentWeek} variant={current?'secondary':'outline'} disabled={current} onClick={()=>change(kstWeekStart(new Date(directory.serverNow)))}>{current?'이번 주':'이번 주로'}</Button><Button variant="outline" size="icon" aria-label="다음 주" onClick={()=>change(addDays(weekStart,7))}><ChevronRight/></Button></div></div><div className={styles.weekStrip}>{['월','화','수','목','금','토','일'].map((label,i)=>{const day=addDays(weekStart,i);return <div key={day} className={day===kstDate(new Date(directory.serverNow))?styles.today:''}><span>{label}</span><b>{Number(day.slice(8,10))}</b><small>{day===kstDate(new Date(directory.serverNow))?'오늘':''}</small></div>})}</div>{filter==='favorites'&&<Button disabled variant="outline" className={styles.favoriteEdit}><SlidersHorizontal/>즐겨찾기 수정</Button>}{invalidInput?<section className={styles.empty}><h2>날짜와 모임 선택을 확인해 주세요.</h2><Button onClick={()=>window.location.replace('/home')}>이번 주 보기</Button></section>:!data?<ReadState error={error} retry={retry}/>:!days.length?<section className={styles.empty}><CalendarDays/><h2>이 주에는 등록된 운동이 없어요.</h2><p>이전·다음 주로 이동하거나 다른 모임을 선택해 보세요.</p></section>:<div className={styles.agenda}>{days.map(day=><section key={day}><h2>{dateLabel(day)}</h2>{data.cards.filter(c=>c.session.date===day).map(c=><div className={styles.eventRow} key={c.session.id}><p className={styles.entryTime}>{c.session.entry}<small>입장 가능</small></p><EventCard card={c} suffix={suffix} onOpen={open}/></div>)}{data.registrationOpportunities.filter(o=>o.date===day).map(o=>{const club=directory.clubs.find(c=>c.id===o.clubId)!;return <article className={`${styles.eventCard} ${styles.draft}`} key={o.clubId}><header><h3>{club.name}</h3></header><p>{club.place}</p><div className={styles.count}><strong>—<small>명</small></strong></div><Button variant="outline" disabled>모임 등록</Button></article>})}</section>)}</div>}</SideoutShell>;
}
