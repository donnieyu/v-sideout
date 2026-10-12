'use client';
import {ParticipationButton} from './participation-button';
import {useCallback,useEffect} from 'react';
import {useSearchParams} from 'next/navigation';
import {kstWeekStart} from '@/lib/sideout/calendar';
import {EditButton} from './editor-controls';
import {useRead,useSideout,ReadState,ReadWarning} from './access';
import {SideoutShell} from './shell';
import {dateLabel} from './home';
import {PublishedTeams} from './published-teams';
import {MatchList} from './match-list';
import {RosterButton} from './roster-dialog';
import {PreparedSessionDetail} from './prepared-session-detail';
import {ScheduleInformation} from './schedule-information';
import {enrollmentProgress} from './enrollment-progress';
import styles from './sideout.module.css';
export function SessionDetailScreen({id}:{id:string}){
 const {client,actions,directory,session:viewer}=useSideout(),params=useSearchParams();
 const load=useCallback((signal:AbortSignal)=>client.session(id,signal),[client,id]);const refreshAccess=actions.refresh;const recheck=useCallback(()=>void refreshAccess(),[refreshAccess]);const {data,error,retry}=useRead(load,recheck,15000);
 const query=new URLSearchParams();for(const key of ['weekStart','filter']){const value=params.get(key);if(value)query.set(key,value)}
 useEffect(()=>{if(data&&window.location.hash==='#teams')document.getElementById('teams')?.scrollIntoView()},[data]);
 if(!data)return <SideoutShell title="운동 상세" floatingReturn><ReadState error={error} retry={retry}/></SideoutShell>;
 if(data.session.phase==='draft')return <PreparedSessionDetail data={data} query={query.toString()} readError={Boolean(error)} retry={retry}/>;
 const {session,club}=data,past=session.date<kstWeekStart(new Date(directory.serverNow)),started=Date.parse(`${session.date}T${session.start}:00+09:00`)<=Date.parse(directory.serverNow),canEdit=data.canManage&&!started;
 const preview=data.canManage&&!started?data.managerTeamPreview:undefined,shownTeams=preview?.teams??data.publishedTeams,shownMatches=preview?preview.matches:data.publishedMatches;
 const showPublishedLineup=Boolean(data.teamPublished&&shownTeams?.length&&!preview?.unpublishedChanges);
 return <SideoutShell floatingReturn contentHeading title={data.canManage?'일정 관리':showPublishedLineup?'팀 · 경기':'일정 상세'}>{error&&<ReadWarning retry={retry}/>}<header className={styles.sessionContext}><h1 className={styles.detailTitle}>운동 상세</h1><div><span className={styles.mark} data-club-id={club.id}>{club.mark}</span><h2>{club.name} · {dateLabel(session.date)}</h2></div></header>
  <ScheduleInformation session={session} published={data.teamPublished} past={past} showApplication={data.canManage||!showPublishedLineup} editHref={data.capabilities.canEditSchedule?'/session/'+encodeURIComponent(id)+'/schedule/edit?'+query:undefined}/>
  {!showPublishedLineup&&<article className={styles.joinCard}><div className={styles.rosterLine}><RosterButton card={data} detail={data}/></div><div className={styles.progress} aria-hidden="true"><span style={{width:`${enrollmentProgress(data.counts.applicants)}%`}}/></div>{!past&&<ParticipationButton card={data}/>}</article>}
  {shownTeams?<PublishedTeams teams={shownTeams} rosterAction={showPublishedLineup?<RosterButton card={data} detail={data} placement="team"/>:undefined} published={data.teamPublished&&!preview?.unpublishedChanges} savedState={preview?(preview.unpublishedChanges?'changed':'published'):undefined} memberId={viewer.me.memberId} manager={canEdit} past={past} editHref={data.capabilities.canEditTeams?'/session/'+encodeURIComponent(id)+'/teams/edit?'+query:undefined}/>:<section className={styles.teamSection} id="teams"><div className={styles.sectionHeading}><h2>{past?'당시 공개된 팀편성':'팀편성'}</h2>{canEdit&&<EditButton href={data.capabilities.canEditTeams?'/session/'+encodeURIComponent(id)+'/teams/edit?'+query:undefined} label="팀편성 수정"/>}</div><div className={styles.pending}><p>{data.publicationWithdrawn?'팀편성 수정 중입니다. 다시 공개되면 팀편성과 경기 순서를 확인할 수 있습니다.':data.teamPublished?'참석 회원만 팀편성과 경기 순서를 확인할 수 있어요.':past?'당시 공개된 팀편성이 없습니다.':'아직 팀편성이 공개되지 않았어요.'}</p></div></section>}
  {shownTeams&&shownMatches&&<MatchList plan={shownMatches} teams={shownTeams} start={session.start} manager={canEdit} past={past} editHref={data.capabilities.canEditMatches?'/session/'+encodeURIComponent(id)+'/matches/edit?'+query:undefined}/>}
 </SideoutShell>;
}
