import {matchSchedule} from './model'
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui/table'

// Match order is a separate club template; player assignments never edit it.
export const matchOrderTemplates:Record<number,string[][]>={
 3:[['신입 a','신입 b'],['A팀','B팀'],['B팀','C팀'],['A팀','C팀']],
 4:[['A팀','B팀'],['C팀','D팀'],['A팀','C팀'],['B팀','D팀'],['A팀','D팀'],['B팀','C팀']],
}
export function MatchOrder({teamCount}:{teamCount:number}){
 const pairs=matchOrderTemplates[teamCount]
 const rounds=teamCount===3?matchSchedule().map(m=>({pair:m.rookie?['신입 a','신입 b']:m.pair.map(p=>p+'팀'),time:`${m.start}–${m.end}`})):pairs?.map(pair=>({pair,time:''}))
 return <section className="match-order-section" aria-label="경기 순서"><div className="section-heading match-heading"><h2>경기 순서</h2><span>{teamCount}팀 기준</span></div>{pairs?<><div className="match-schedule"><Table><TableHeader><TableRow><TableHead>순서</TableHead>{teamCount===3&&<TableHead>시간</TableHead>}<TableHead>대진</TableHead></TableRow></TableHeader><TableBody>{rounds?.map(({pair,time},i)=><TableRow key={i}><TableCell className="game-number">{i+1}</TableCell>{time&&<TableCell><time>{time}</time></TableCell>}<TableCell><div className="game-pair"><strong>{pair[0]}</strong><span>vs</span><strong>{pair[1]}</strong></div></TableCell></TableRow>)}</TableBody></Table></div><p className="fixture-note">{teamCount===3?'공유된 3팀 예시의 순서·시간입니다.':'4팀 대진은 검토용 기본안입니다.'} 경기 순서는 선수 배정과 별도로 관리합니다.</p></>:<p className="muted">이 팀 수의 경기 순서는 아직 등록되지 않았습니다.</p>}</section>
}
