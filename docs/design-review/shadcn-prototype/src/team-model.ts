import {teams,positions,memberAffiliations,type Session} from './model'
export type Position=typeof positions[number]
export type Player={id:string;name:string;club:string;position:Position;slotId?:string}
export type LineupTeam={id:string;title:string;players:Player[]}
export type Lineup={teams:LineupTeam[]}
export type TeamRecord={draft:Lineup;shared?:Lineup}
export const memberPool:Player[]=teams.flatMap(t=>positions.flatMap(position=>t.players[position].map(name=>({id:name,name,club:memberAffiliations[name]??'무소속',position}))))
export const copyLineup=(value:Lineup):Lineup=>structuredClone(value)
export const emptyLineup=():Lineup=>({teams:['A','B','C'].map(id=>({id,title:id+'팀',players:[]}))})
export const fixtureLineup=():Lineup=>({teams:teams.map((team,i)=>({id:String.fromCharCode(65+i),title:team.title,players:positions.flatMap(position=>team.players[position].map(name=>({...memberPool.find(p=>p.id===name)!,position})))}))})
export function assignPlayer(lineup:Lineup,teamId:string,player:Player):Lineup {if(!lineup.teams.some(t=>t.id===teamId))return lineup;return {teams:lineup.teams.map(t=>({...t,players:[...t.players.filter(p=>p.id!==player.id),...(t.id===teamId?[{...player}]:[])]}))}}
export function removePlayer(lineup:Lineup,id:string):Lineup{return {teams:lineup.teams.map(t=>({...t,players:t.players.filter(p=>p.id!==id)}))}}
export function validateLineup(lineup:Lineup){const players=lineup.teams.flatMap(t=>t.players);if(!players.length)return '공개할 팀에 인원을 배치해 주세요.';if(lineup.teams.some(t=>!t.players.length))return '비어 있는 팀에 인원을 배치하거나 팀을 삭제해 주세요.';if(new Set(players.map(p=>p.id)).size!==players.length)return '중복 배정된 인원을 확인해 주세요.';return ''}
export const orderedPlayers=(players:Player[])=>[...players].sort((a,b)=>positions.indexOf(a.position)-positions.indexOf(b.position))
// Local review applicants only. Saved assignments never rewrite a member's application.
export function applicantPool(session:Session,fixture:boolean,joined:boolean):Player[]{const others=memberPool.filter(p=>p.id!=='김나래');return [...(fixture?others.slice(0,session.count):[]),...(joined?[memberPool.find(p=>p.id==='김나래')!]:[])]}

export const isInLineup=(lineup:Lineup|undefined,playerId:string)=>!!lineup?.teams.some(t=>t.players.some(p=>p.id===playerId))
export function canReadTeams(manager:boolean,applied:boolean,lineup:Lineup|undefined,playerId:string){return manager||applied||isInLineup(lineup,playerId)}
export function registrationMode(published:boolean,deadline:string,now:string):'applied'|'waiting'{return published||deadline<=now?'waiting':'applied'}
export function groupCandidates(applicants:Player[],waiters:Player[],all:Player[],includeAll:boolean){const a=new Set(applicants.map(p=>p.id));const w=waiters.filter(p=>!a.has(p.id));const known=new Set([...a,...w.map(p=>p.id)]);return [{label:'신청자',players:applicants},{label:'대기자',players:w},...(includeAll?[{label:'미신청 회원',players:all.filter(p=>!known.has(p.id))}]:[])]}
