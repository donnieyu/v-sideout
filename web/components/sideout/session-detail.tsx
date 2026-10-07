'use client';
import {ParticipationButton} from './participation-button';
import {useCallback,useEffect,useState} from 'react';
import {SideoutLink as Link} from './link';
import {useSearchParams} from 'next/navigation';
import {kstWeekStart} from '@/lib/sideout/calendar';
import {EditButton} from './editor-controls';
import {useRead,useSideout,ReadState,ReadWarning} from './access';
import {SideoutShell} from './shell';
import {dateLabel} from './home';
import {PublishedTeams} from './published-teams';
import {MatchList} from './match-list';
import {RosterButton} from './roster-dialog';
import styles from './sideout.module.css';
export function SessionDetailScreen({id}:{id:string}){
 const {client,actions,directory,session:viewer}=useSideout(),params=useSearchParams();const [tab,setTab]=useState<'info'|'notice'>('info');
 const load=useCallback((signal:AbortSignal)=>client.session(id,signal),[client,id]);const recheck=useCallback(()=>void actions.refresh(),[actions.refresh]);const {data,error,retry}=useRead(load,recheck,15000);
 const query=new URLSearchParams();for(const key of ['weekStart','filter']){const value=params.get(key);if(value)query.set(key,value)}
 useEffect(()=>{if(data&&window.location.hash==='#teams')document.getElementById('teams')?.scrollIntoView()},[data]);
 if(!data)return <SideoutShell title="일정 상세"><ReadState error={error} retry={retry}/></SideoutShell>;
 const {session,club}=data,past=session.date<kstWeekStart(new Date(directory.serverNow)),started=Date.parse(`${session.date}T${session.start}:00+09:00`)<=Date.parse(directory.serverNow),canEdit=data.canManage&&!started;
 const preview=data.canManage&&!started?data.managerTeamPreview:undefined,shownTeams=preview?.teams??data.publishedTeams,shownMatches=preview?preview.matches:data.publishedMatches;
 const showPublishedLineup=Boolean(data.teamPublished&&shownTeams?.length&&!preview?.unpublishedChanges);
 const scheduleContent=<><div className={styles.sectionHeading}><h2>일정 정보</h2>{data.capabilities.canEditSchedule&&<EditButton href={'/session/'+encodeURIComponent(id)+'/schedule/edit?'+query} label="일정 수정"/>}</div><div className={`${styles.detailLayout} ${showPublishedLineup?styles.publishedSchedule:""}`}><article className={styles.infoCard}><div className={styles.tabs} role="tablist" aria-label="일정 정보"><button role="tab" aria-selected={tab==='info'} onClick={()=>setTab('info')}>정보</button><button role="tab" aria-selected={tab==='notice'} onClick={()=>setTab('notice')}>공지</button></div><div className={styles.infoContent} role="tabpanel">{tab==='info'?<><h2>운동 일정</h2><div className={styles.timeline}>{[[session.entry,'입장 · 몸풀기'],[session.start,'운동 시작'],[session.end,'종료']].map(([time,label])=><div key={label}><b>{time}</b><span>{label}</span></div>)}</div><dl><div><dt>장소</dt><dd>{session.place}</dd></div><div><dt>정기 운동</dt><dd>매주 {['','월','화','수','목','금','토','일'][club.weekday]}요일</dd></div>{!past&&<div><dt>신청 마감</dt><dd>{new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(session.deadline))}</dd></div>}</dl></>:<><h2>이번 운동 안내</h2><p>{session.notice||'등록된 공지가 없습니다.'}</p></>}</div></article>{!showPublishedLineup&&<article className={styles.joinCard}><h2>함께할 인원</h2><div className={styles.count}><strong>{data.counts.applicants}<small>명</small></strong><RosterButton card={data} detail={data}/></div><div className={styles.progress}><span style={{width:`${Math.min(100,data.counts.applicants/(session.cap??24)*100)}%`}}/></div><>{!past&&<p className={styles.muted}>{new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}).format(new Date(session.deadline))} 마감{data.counts.waiting>0&&` · 대기 ${data.counts.waiting}명`}</p>}{!past&&<ParticipationButton card={data}/>}</></article>}</div></>;
 const teamContent=shownTeams?<><PublishedTeams teams={shownTeams} rosterAction={showPublishedLineup?<RosterButton card={data} detail={data} placement="team"/>:undefined} published={data.teamPublished&&!preview?.unpublishedChanges} savedState={preview?(preview.unpublishedChanges?'changed':'published'):undefined} memberId={viewer.me.memberId} manager={canEdit} past={past} editHref={data.capabilities.canEditTeams?'/session/'+encodeURIComponent(id)+'/teams/edit?'+query:undefined}/></>:<section className={styles.teamSection} id="teams"><div className={styles.sectionHeading}><h2>{past?'당시 공개된 팀편성':'팀편성'}</h2>{canEdit&&<EditButton href={data.capabilities.canEditTeams?'/session/'+encodeURIComponent(id)+'/teams/edit?'+query:undefined} label="팀편성 수정"/>}</div><div className={styles.pending}><p>{data.publicationWithdrawn?'팀편성 수정 중입니다. 다시 공개되면 팀편성과 경기 순서를 확인할 수 있습니다.':data.teamPublished?'참석 회원만 팀편성과 경기 순서를 확인할 수 있어요.':past?'당시 공개된 팀편성이 없습니다.':'아직 팀편성이 공개되지 않았어요. 공개되면 이곳에서 팀과 경기 순서를 확인할 수 있어요.'}</p></div>{!past&&!data.teamPublished&&!data.publicationWithdrawn&&(data.canManage||data.selfStatus==='applied')&&<><p className={styles.previewNote}>화면 구성 예시</p><div className={styles.publishedTeamGrid} aria-label="공개 전 팀편성 화면 구성 예시">{['A','B','C'].map(team=><article className={styles.teamSkeleton} key={team}><h3>팀 이름</h3>{['세터','레프트','레프트','센터','센터','라이트','라이트'].map((pos,i)=><div key={i}><span aria-hidden="true"/><small>{pos}</small></div>)}</article>)}</div></>}</section>;
 const matchContent=shownTeams&&shownMatches&&<MatchList plan={shownMatches} teams={shownTeams} start={session.start} manager={canEdit} past={past} editHref={data.capabilities.canEditMatches?'/session/'+encodeURIComponent(id)+'/matches/edit?'+query:undefined}/>;
 return <SideoutShell title={club.name} subtitle={dateLabel(session.date)+' · 일정 상세'}>{error&&<ReadWarning retry={retry}/>}<header className={styles.detailHeader}><Link className={styles.breadcrumb} href={'/home?'+query}>모임 홈 <span>› 일정 상세</span></Link><div><span className={styles.mark}>{club.mark}</span><div><h1>{club.name}</h1><p>{dateLabel(session.date)}</p></div></div></header>
  {scheduleContent}
  {teamContent}
  {matchContent}
 </SideoutShell>;
}
