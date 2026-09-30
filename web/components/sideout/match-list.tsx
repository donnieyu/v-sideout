import type {MatchPlanRecord,PublishedTeam} from '@/lib/sideout/read-model';
import styles from './sideout.module.css';
export function MatchList({plan,teams,start}:{plan:MatchPlanRecord;teams:PublishedTeam[];start:string}){
 const [h,m]=start.split(':').map(Number),at=(i:number)=>{const n=h*60+m+i*20;return `${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
 const label=(id:string,rookie:boolean)=>rookie?`신입 ${id.replace(/^R/,'')}팀`:teams.find(t=>t.id===id)?.title??'팀 확인 필요';
 return <section className={styles.teamSection}><h2>경기 순서</h2>{plan.matches.length?<div className={styles.matchTable}><table><thead><tr><th>순서</th><th>시간</th><th>경기</th></tr></thead><tbody>{plan.matches.map((game,i)=><tr key={game.id} className={game.kind==='rookie'?styles.rookie:''}><td>{i+1}</td><td><time>{at(i)}</time> – {at(i+1)}</td><td><strong>{label(game.home,game.kind==='rookie')}</strong><span> vs </span><strong>{label(game.away,game.kind==='rookie')}</strong></td></tr>)}</tbody></table></div>:<p className={styles.empty}>등록된 경기 순서가 없습니다.</p>}</section>;
}
