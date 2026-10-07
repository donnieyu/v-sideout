import type {MatchPlanRecord,PublishedTeam} from '@/lib/sideout/read-model';
import {EditButton} from './editor-controls';
import {matchTimes} from '@/lib/sideout/match-plan';
import styles from './sideout.module.css';
export function MatchList({plan,teams,start,manager=false,past=false,editHref}:{plan:MatchPlanRecord;teams:PublishedTeam[];start:string;manager?:boolean;past?:boolean;editHref?:string}){
 const times=matchTimes(plan,start);
 const label=(id:string,rookie:boolean)=>rookie?`신입 ${id.replace(/^R/,'')}팀`:teams.find(t=>t.id===id)?.title??'팀 확인 필요';
 return <section className={styles.teamSection}><div className={styles.sectionHeading}><div><h2>경기 순서</h2><p className={styles.muted}>{plan.teamCount}팀 · 한 경기 20분</p></div>{manager&&!past&&<EditButton href={editHref} label="경기 순서 수정"/>}</div>{plan.matches.length?<div className={styles.matchTable}><table><thead><tr><th>순서</th><th>시간</th><th>경기</th></tr></thead><tbody>{plan.matches.map((game,i)=><tr key={game.id} className={game.kind==='rookie'?styles.rookie:''}><td>{i+1}</td><td><time>{times[i].start}</time> – {times[i].end}</td><td><strong>{label(game.home,game.kind==='rookie')}</strong><span> vs </span><strong>{label(game.away,game.kind==='rookie')}</strong></td></tr>)}</tbody></table></div>:<p className={styles.empty}>등록된 경기 순서가 없습니다.</p>}</section>;
}
