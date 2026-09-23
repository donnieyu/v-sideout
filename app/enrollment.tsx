'use client';
import { useState, type ReactNode } from 'react';
import { Bell, CalendarDays, MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { EXAMPLE_CLUBS, attendanceStep, deadlineLabel, priorityActive, publicCounts, stage, type Session, type View } from '@/lib/model';

const date=(v:string)=>new Date(v).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'long'});
const time=(v:string)=>new Date(v).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false});
const short=(v:string)=>new Date(v).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric'});
export function ClubMark({id}:{id:string}){return <span className={`club-mark ${id==='heroes'?'heroes':''}`} aria-hidden="true">{id==='heroes'?'H':'N'}</span>}
type Props={view:View;s:Session;busy:boolean;respond:(response:'yes'|'no')=>void;manage:()=>void;teams:(s:Session,memberId:string)=>ReactNode};
export function EnrollmentCard({view,s,busy,respond,manage,teams}:Props){
 const [dialog,setDialog]=useState<'roster'|'notice'|'teams'|null>(null);
 const st=stage(s),c=publicCounts(s),n=c.total??c.regular+c.candidate,step=attendanceStep(n),me=s.participants.find(p=>p.memberId===view.memberId),applied=me?.response==='yes',own=view.homeClubId===view.club.id;
 const notices=view.posts.filter(p=>p.category==='notice').sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.at.localeCompare(a.at));
 const roster=s.roster??(view.role!=='member'?s.participants.filter(p=>p.response==='yes'&&!p.guest&&view.members.find(m=>m.id===p.memberId)?.homeClubId===view.club.id).map(p=>({id:p.id,name:view.members.find(m=>m.id===p.memberId)!.name})).sort((a,b)=>a.name.localeCompare(b.name,'ko')):[]);
 const stateLabel=s.published?'팀편성 공개':({draft:'준비 중',open:priorityActive(s)?'회원 우선 신청':'전체 신청',candidates:'후보 접수',closed:'접수 종료',ended:'운동 종료',cancelled:'운동 취소'}[st]);
 const cancelAllowed=st==='open',canApply=st==='open'||st==='candidates';
 return <article className={`enrollment-card ${view.club.id==='heroes'?'heroes':''}`}>
  <div className="enrollment-status"><span>{st==='cancelled'?'운동 취소':stateLabel}</span><span className="enrollment-deadline">{short(s.deadline)} {time(s.deadline)} 마감 <b>{deadlineLabel(s.deadline)}</b></span></div>
  <div className="enrollment-club"><ClubMark id={view.club.id}/><div><h2>{view.club.name}</h2><small>{view.club.english}</small></div>{own&&<span className="own-club">나의 모임</span>}</div>
  <div className="enrollment-details"><span><CalendarDays/><strong>{date(s.start)}</strong></span><span><MapPin/>{s.location}</span></div>
  <div className="enrollment-times"><span><strong>{time(s.entry??s.start)}</strong>입장 · 몸풀기</span><span><strong>{time(s.start)}</strong>운동 시작</span><span><strong>{time(s.end)}</strong>종료</span></div>
  <div className="enrollment-count"><strong>{n}<small>명</small></strong><span>함께할 인원</span>{own&&<button className="roster-link" onClick={()=>setDialog('roster')}>명단 확인</button>}</div>
  <div className="enrollment-meter"><div className="achieved-marks">{step.completed.map(v=><span key={v}>{v}<Check size={11}/></span>)}</div>{n<28&&<><Progress value={step.progress} aria-label={step.label}/><span>{step.target}명</span></>}{n>28&&<span>+{n-28}명</span>}</div>
  <p className="enrollment-remainder">{step.label}</p>
  <div className="enrollment-actions">{view.role==='member'?<><Button variant={applied?'outline':'default'} className={applied?'cancel-attendance':''} disabled={busy||(applied?!cancelAllowed:!canApply)} aria-label={applied&&!cancelAllowed?'참석 취소, 신청 마감 후 취소 불가':undefined} onClick={()=>respond(applied?'no':'yes')}>{applied?'참석 취소':st==='candidates'||(s.cap!==null&&c.regular>=s.cap&&!(priorityActive(s)&&own&&view.myKind==='regular'))?'후보 신청':'참석 신청'}</Button>{(applied||s.published)&&<Button disabled={!s.published} onClick={()=>setDialog('teams')} aria-label={!s.published?'팀편성 확인, 공개 대기 중':'팀편성 확인'}>팀편성 확인</Button>}</>:<Button onClick={manage} disabled={busy}>팀편성 관리</Button>}<Button variant="outline" size="icon" className="club-notice" onClick={()=>setDialog('notice')} aria-label={`${view.club.name} 공지 ${notices.length}개`}><Bell size={17}/>{notices.length>0&&<span/>}</Button></div>
  <Dialog open={dialog!==null} onOpenChange={v=>!v&&setDialog(null)}><DialogContent className={`dialog-scroll ${dialog==='teams'?'published-dialog':''}`}><DialogHeader><DialogTitle>{view.club.name} {dialog==='roster'?'신청 명단':dialog==='notice'?'공지':'팀편성'}</DialogTitle><DialogDescription>{dialog==='roster'?`소속 회원 ${roster.length}명 · 이름순`:date(s.start)}</DialogDescription></DialogHeader>{dialog==='roster'&&<div className="public-name-list">{roster.map(p=><span key={p.id}>{p.name}</span>)}{!roster.length&&<p>아직 신청한 소속 회원이 없어요.</p>}</div>}{dialog==='notice'&&<div className="club-notices">{s.note&&<section><h3>이번 운동 안내</h3><p>{s.note}</p></section>}{notices.map(p=><section key={p.id}><h3>{p.title}</h3><p>{p.body}</p></section>)}{!notices.length&&!s.note&&<p>등록된 공지가 없어요.</p>}</div>}{dialog==='teams'&&s.published&&teams(s,view.memberId)}</DialogContent></Dialog>
 </article>
}
export function EnrollmentHome({catalog,busy,respond,manage,teams}:{catalog:Record<string,View>;busy:boolean;respond:(club:string,s:Session,response:'yes'|'no')=>void;manage:(club:string,s:Session)=>void;teams:Props['teams']}){
 const [filter,setFilter]=useState('all');
 const views=Object.values(catalog),home=views[0]?.homeClubId;
 const events=views.flatMap(view=>view.sessions.filter(s=>!['ended','cancelled'].includes(s.phase)).map(s=>({view,s}))).sort((a,b)=>Number(b.view.club.id===home)-Number(a.view.club.id===home)||Date.parse(a.s.start)-Date.parse(b.s.start));
 const visible=events.filter(x=>filter==='all'||x.view.club.id===filter);
 return <><div className="club-filters" aria-label="운동 일정 모임 필터"><Button variant="outline" aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>All</Button>{EXAMPLE_CLUBS.map(club=><Button key={club.id} variant="outline" aria-pressed={filter===club.id} onClick={()=>setFilter(club.id)}><ClubMark id={club.id}/>{catalog[club.id]?.club.name??club.name}</Button>)}</div><div className="enrollment-list-heading"><h2>참석 신청</h2><span>{visible.length}개의 운동 일정</span></div><div className="enrollment-grid">{visible.map(({view,s})=><EnrollmentCard key={view.club.id+s.id} view={view} s={s} busy={busy} respond={response=>respond(view.club.id,s,response)} manage={()=>manage(view.club.id,s)} teams={teams}/>)}</div>{visible.length===0&&<div className="empty">열린 운동이 아직 없어요.</div>}</>
}
