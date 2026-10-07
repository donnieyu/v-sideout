'use client';
import {useState,type ReactNode} from 'react';
import {CircleCheck} from 'lucide-react';
import {EditButton} from './editor-controls';
import {Button} from '../ui/button';
import {COURT_SLOTS,type PublishedTeam,type Position} from '@/lib/sideout/read-model';
import styles from './sideout.module.css';
import views from './team-views.module.css';
const labels:Record<Position,string>={OH:'레프트',OP:'라이트',MB:'센터',S:'세터'};
const rowSlots=['s','oh1','oh2','mb1','mb2','op1'];
const rank=(slotId:string)=>{const index=rowSlots.indexOf(slotId);return index<0?rowSlots.length:index};
export function PublishedTeams({teams,memberId,manager=false,past=false,published=false,editHref,savedState,rosterAction}:{teams:PublishedTeam[];memberId:string;manager?:boolean;past?:boolean;published?:boolean;editHref?:string;savedState?:'changed'|'published';rosterAction?:ReactNode}){
 const [view,setView]=useState<'rows'|'court'>('rows');
 const assignedCount=teams.reduce((count,team)=>count+team.players.length,0);
 const status=past?'당시 공개':savedState==='changed'?'미공개 변경':published?'공개 완료':'저장본';
 function tile(team:PublishedTeam,slotId:string,position:Position){const p=team.players.find(p=>p.slotId===slotId);if(!p&&savedState!=='changed')return null;const courtIndex=COURT_SLOTS.findIndex(slot=>slot.id===slotId);return <div key={slotId} data-slot-id={slotId} style={courtIndex>=0?{gridColumn:courtIndex%3+1,gridRow:Math.floor(courtIndex/3)+1}:undefined} className={`${views.tile} ${p?views.assigned:views.empty} ${p?.memberId===memberId?views.mine:''}`}><small>{labels[position]}</small><strong>{p?.displayName??'미배정'}{p?.memberId===memberId&&<em>나</em>}</strong>{p&&<span>{p.clubName??'소속 없음'}</span>}</div>}
 return <section id="teams" className={`${styles.teamSection} ${published&&!past?views.featured:''}`}>
  <div className={`${views.heading} ${published&&!past?views.publishedHeading:''} ${savedState==='changed'?views.draftHeading:''}`}>
   <div className={views.headingCopy}><div className={views.title}><h2>{past?'당시 공개된 팀편성':'팀편성'}</h2><span className={`${views.stateBadge} ${published&&!past?views.publicBadge:''}`}>{published&&!past&&<CircleCheck aria-hidden="true"/>}{status}</span></div>
    <p className={views.meta}>{teams.length}팀 · {assignedCount}명 배정{savedState==='changed'&&<span> · 운영진만 열람 가능</span>}</p>
   </div>
   <div className={views.controls}>
    <div className={views.switch} role="group" aria-label="팀편성 보기 방식"><Button variant={view==='court'?'default':'ghost'} aria-pressed={view==='court'} onClick={()=>setView('court')}>코트</Button><Button variant={view==='rows'?'default':'ghost'} aria-pressed={view==='rows'} onClick={()=>setView('rows')}>행</Button></div>
    {rosterAction}
    {manager&&!past&&<EditButton href={editHref} label="팀편성 수정"/>}
   </div>
  </div>
  <div className={`${styles.publishedTeamGrid} ${view==='court'?views.courtGrid:''}`}>{teams.map(team=><article key={team.id} data-team-tone={team.id.toUpperCase()} className={`${styles.publishedTeamCard} ${views.teamCard} ${team.players.some(player=>player.memberId===memberId)?views.myTeamCard:''}`}><header><div className={views.teamIdentity}><h3>{team.title}</h3>{team.players.some(player=>player.memberId===memberId)&&<span className={views.myTeamBadge}>내 팀</span>}</div><small>{team.players.length}명</small></header>
   {view==='rows'?<table aria-label={`${team.title} ${published?'공개':'저장'} 명단`}><thead><tr><th>이름</th><th>소속</th><th>포지션</th></tr></thead><tbody>{[...team.players].sort((a,b)=>rank(a.slotId)-rank(b.slotId)).map(p=><tr key={p.memberId} className={p.memberId===memberId?styles.myTeamRow:undefined}><td><strong>{p.displayName}</strong>{p.memberId===memberId&&<em>나</em>}<span className={views.mobileClub}>{p.clubName??'소속 없음'}</span></td><td>{p.clubName??'소속 없음'}</td><td><span className={views.position}>{labels[p.assignedPosition]}</span></td></tr>)}</tbody></table>:<>
    <div className={views.court} role="group" aria-label={`${team.title} 코트`}><div className={views.net}>네트</div><div className={views.slots}>{COURT_SLOTS.map(slot=>tile(team,slot.id,slot.position))}</div></div>
    {team.players.some(p=>!COURT_SLOTS.some(s=>s.id===p.slotId))&&<div className={views.extras} role="group" aria-label={`${team.title} 추가 선수`}><h4>추가 인원</h4><div>{team.players.filter(p=>!COURT_SLOTS.some(s=>s.id===p.slotId)).map(p=>tile(team,p.slotId,p.assignedPosition))}</div></div>}
   </>}
  </article>)}</div>
 </section>;
}
