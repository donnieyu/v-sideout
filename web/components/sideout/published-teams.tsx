'use client';
import {useState} from 'react';
import {Button} from '../ui/button';
import type {PublishedTeam,Position} from '@/lib/sideout/read-model';
import {COURT_SLOTS} from '@/lib/sideout/read-model';
import styles from './sideout.module.css';
const labels:Record<Position,string>={OH:'레프트',OP:'라이트',MB:'센터',S:'세터'};
export function PublishedTeams({teams,memberId}:{teams:PublishedTeam[];memberId:string}){
 const [view,setView]=useState<'court'|'rows'>('court');
 return <section id="teams" className={styles.teamSection}><div className={styles.sectionHeading}><h2>팀편성</h2><div className={styles.segmented} aria-label="팀편성 보기">{(['court','rows'] as const).map(v=><Button key={v} variant={view===v?'default':'ghost'} aria-pressed={view===v} onClick={()=>setView(v)}>{v==='court'?'코트':'행'}</Button>)}</div></div><div className={styles.teamGrid}>{teams.map(team=>{
  const six=COURT_SLOTS.map(slot=>team.players.find(p=>p.slotId===slot.id));
  const additional=team.players.filter(p=>!six.includes(p));
  const player=(p:PublishedTeam['players'][number]|undefined,position:Position)=><><small>{labels[position]}</small><strong>{p?.displayName??'미배정'}{p?.memberId===memberId&&<em>나</em>}</strong>{p&&<small className={styles.affiliation}>{p.clubName??'소속 없음'}</small>}</>;
  return <article key={team.id} className={styles.teamCard}><header><h3>{team.title}</h3><small>{team.players.length}명</small></header>{view==='court'?<><div className={styles.court}><div className={styles.net}>네트</div><div className={styles.courtSlots}>{(['OH','MB','S','OH','MB','OP'] as Position[]).map((position,i)=><div key={i}>{player(six[i],position)}</div>)}</div></div>{additional.length>0&&<div className={styles.additional}>{additional.map(p=><div key={p.slotId}>{player(p,p.assignedPosition)}</div>)}</div>}</>:<div className={styles.teamRows}>{team.players.map(p=><div key={p.slotId}>{player(p,p.assignedPosition)}</div>)}</div>}</article>;
 })}</div></section>;
}
