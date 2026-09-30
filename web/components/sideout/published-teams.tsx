'use client';
import {Pencil} from 'lucide-react';
import {Button} from '../ui/button';
import type {PublishedTeam,Position} from '@/lib/sideout/read-model';
import styles from './sideout.module.css';
const labels:Record<Position,string>={OH:'레프트',OP:'라이트',MB:'센터',S:'세터'};
const order:Record<Position,number>={S:0,OH:1,MB:2,OP:3};
export function PublishedTeams({teams,memberId,manager=false}:{teams:PublishedTeam[];memberId:string;manager?:boolean}){
 return <section id="teams" className={styles.teamSection}><div className={styles.sectionHeading}><h2>팀편성</h2>{manager&&<Button variant="outline" disabled><Pencil/>팀편성 수정</Button>}</div><div className={styles.publishedTeamGrid}>{teams.map(team=><article key={team.id} className={styles.publishedTeamCard}><header><h3>{team.title}</h3><small>{team.players.length}명</small></header><table aria-label={`${team.title} 공개 명단`}><thead><tr><th>이름</th><th>소속</th><th>포지션</th></tr></thead><tbody>{[...team.players].sort((a,b)=>order[a.assignedPosition]-order[b.assignedPosition]).map(p=><tr key={p.memberId} className={p.memberId===memberId?styles.myTeamRow:undefined}><td><strong>{p.displayName}</strong>{p.memberId===memberId&&<em>나</em>}</td><td>{p.clubName??'소속 없음'}</td><td>{labels[p.assignedPosition]}</td></tr>)}</tbody></table></article>)}</div></section>;
}
