'use client';
import {useCallback,useEffect,useState} from 'react';
import {SideoutLink as Link} from './link';
import {useSearchParams} from 'next/navigation';
import {Button} from '../ui/button';
import {useRead,useSideout,ReadState} from './access';
import {SideoutShell} from './shell';
import {attendanceLabel,dateLabel} from './home';
import {PublishedTeams} from './published-teams';
import {MatchList} from './match-list';
import {RosterButton} from './roster-dialog';
import styles from './sideout.module.css';
export function SessionDetailScreen({id}:{id:string}){
 const {client,actions,session:viewer}=useSideout(),params=useSearchParams();const [tab,setTab]=useState<'info'|'notice'>('info');
 const load=useCallback((signal:AbortSignal)=>client.session(id,signal),[client,id]);const recheck=useCallback(()=>void actions.refresh(),[actions.refresh]);const {data,error,retry}=useRead(load,recheck);
 const query=new URLSearchParams();for(const key of ['weekStart','filter']){const value=params.get(key);if(value)query.set(key,value)}
 useEffect(()=>{if(data&&window.location.hash==='#teams')document.getElementById('teams')?.scrollIntoView()},[data]);
 if(!data)return <SideoutShell title="일정 상세"><ReadState error={error} retry={retry}/></SideoutShell>;
 const {session,club}=data;
 return <SideoutShell title={club.name} subtitle={dateLabel(session.date)+' · 일정 상세'}><header className={styles.detailHeader}><Link className={styles.breadcrumb} href={'/home?'+query}>모임 홈 <span>› 일정 상세</span></Link><div><span className={styles.mark}>{club.mark}</span><div><h1>{club.name}</h1><p>{dateLabel(session.date)}</p></div></div></header><div className={styles.sectionHeading}><h2>일정 정보</h2>{data.canManage&&<Button variant="outline" disabled>일정 수정</Button>}</div><div className={styles.detailLayout}><article className={styles.infoCard}><div className={styles.tabs} role="tablist" aria-label="일정 정보"><button role="tab" aria-selected={tab==='info'} onClick={()=>setTab('info')}>정보</button><button role="tab" aria-selected={tab==='notice'} onClick={()=>setTab('notice')}>공지</button></div><div className={styles.infoContent} role="tabpanel">{tab==='info'?<><h2>운동 일정</h2><div className={styles.timeline}>{[[session.entry,'입장 · 몸풀기'],[session.start,'운동 시작'],[session.end,'종료']].map(([time,label])=><div key={label}><b>{time}</b><span>{label}</span></div>)}</div><dl><div><dt>장소</dt><dd>{session.place}</dd></div><div><dt>정기 운동</dt><dd>매주 {['','월','화','수','목','금','토','일'][club.weekday]}요일</dd></div><div><dt>신청 마감</dt><dd>{new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(session.deadline))}</dd></div></dl></>:<><h2>이번 운동 안내</h2><p>{session.notice||'등록된 공지가 없습니다.'}</p></>}</div></article><article className={styles.joinCard}><h2>함께할 인원</h2><div className={styles.count}><strong>{data.counts.applicants}<small>명</small></strong><RosterButton card={data} detail={data}/></div><div className={styles.progress}><span style={{width:`${Math.min(100,data.counts.applicants/(session.cap??24)*100)}%`}}/></div><p className={styles.muted}>{new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}).format(new Date(session.deadline))} 마감{data.counts.waiting>0&&` · 대기 ${data.counts.waiting}명`}</p><Button disabled variant="outline">{attendanceLabel(data)}</Button></article></div>{data.publishedTeams?<><PublishedTeams teams={data.publishedTeams} memberId={viewer.me.memberId} manager={data.canManage}/>{data.publishedMatches&&<MatchList plan={data.publishedMatches} teams={data.publishedTeams} start={session.start}/>}</>:<section className={styles.teamSection} id="teams"><div className={styles.sectionHeading}><h2>팀편성</h2>{data.canManage&&<Button variant="outline" disabled>팀편성 수정</Button>}</div><div className={styles.pending}><p>{data.teamPublished?'참석 회원만 팀편성과 경기 순서를 확인할 수 있어요.':'팀편성이 공개되면 이곳에서 확인할 수 있어요.'}</p></div></section>}</SideoutShell>;
}
