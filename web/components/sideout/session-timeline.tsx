import type {SessionRecord} from '@/lib/sideout/read-model';
import styles from './sideout.module.css';
export function SessionTimeline({session,className=''}:{className?:string;session:Pick<SessionRecord,'entry'|'start'|'end'>}){
 return <div className={`${styles.sessionTimeline} ${className}`}>{[[session.entry,'입장 · 몸풀기'],[session.start,'운동 시작'],[session.end,'종료']].map(([time,label])=><div key={label}><b>{time}</b><span>{label}</span></div>)}</div>;
}
