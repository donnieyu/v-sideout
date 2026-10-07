import type {MatchPlanRecord} from './read-model';
/** Approved default rounds, mapped to real team IDs rather than A/B/C placeholders. */
export function generateTeamMatches(teamIds:string[]):MatchPlanRecord|null{
 if(teamIds.length!==3&&teamIds.length!==4)return null;
 const pairs=teamIds.length===3?[[0,1],[1,2],[0,2]]:[[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
 const matches:MatchPlanRecord['matches']=[];
 const rookie=(number:number)=>matches.push({id:`rookie-${number}`,kind:'rookie',home:'R1',away:'R2'});
 if(teamIds.length===4)rookie(1);
 const rounds=teamIds.length===3?3:1;
 for(let round=0;round<rounds;round++){
  for(const [index,[a,b]] of pairs.entries())matches.push({id:`regular-${round*pairs.length+index+1}`,kind:'regular',home:teamIds[a],away:teamIds[b]});
  if(teamIds.length===3&&round<rounds-1)rookie(round+1);
 }
 if(teamIds.length===4)rookie(2);
 return {teamCount:teamIds.length,rookieTeamCount:2,matches};
}

export function toggleRookieMatches(plan:MatchPlanRecord,enabled:boolean):MatchPlanRecord{
 const regular=plan.matches.filter(match=>match.kind==='regular')
 if(!enabled)return {...plan,matches:regular}
 if(plan.matches.some(match=>match.kind==='rookie'))return plan
 const pairs=rookiePairs(plan.rookieTeamCount)
 if(plan.teamCount===4&&regular.length){
  const [home,away]=pairs[0], [lastHome,lastAway]=pairs[1%pairs.length]
  return {...plan,matches:[{id:'rookie-1',kind:'rookie',home,away},...regular,{id:'rookie-2',kind:'rookie',home:lastHome,away:lastAway}]}
 }
 const roundSize=plan.teamCount===3?3:regular.length
 const matches:MatchPlanRecord['matches']=[]
 for(let index=0;index<regular.length;index++){
  matches.push(regular[index])
  if((index+1)%roundSize===0&&index<regular.length-1){
   const rookieIndex=matches.filter(match=>match.kind==='rookie').length
   const [home,away]=pairs[rookieIndex%pairs.length]
   matches.push({id:`rookie-${rookieIndex+1}`,kind:'rookie',home,away})
  }
 }
 return {...plan,matches}
}

const rookiePairs=(count:number):[string,string][]=>{
 const patterns:Record<number,[number,number][]>={2:[[1,2]],3:[[1,2],[2,3],[1,3]],4:[[1,2],[3,4],[1,3],[2,4],[1,4],[2,3]]}
 return (patterns[count]??[]).map(([home,away])=>[`R${home}`,`R${away}`])
}
export const rookiePairOptions=(count:number)=>rookiePairs(count)

export function setRookieTeamCount(plan:MatchPlanRecord,count:number):MatchPlanRecord{
 if(!Number.isInteger(count)||count<2||count>4)return plan
 const pairs=rookiePairs(count)
 let index=0
 return {...plan,rookieTeamCount:count,matches:plan.matches.map(match=>{
  if(match.kind!=='rookie')return match
  const [home,away]=pairs[index++%pairs.length]
  return {...match,home,away}
 })}
}

export function addRookieMatch(plan:MatchPlanRecord):MatchPlanRecord{
 if(plan.matches.length>=100)return plan
 const pairs=rookiePairs(plan.rookieTeamCount)
 const count=plan.matches.filter(match=>match.kind==='rookie').length
 const next=1+Math.max(0,...plan.matches.filter(match=>match.id.startsWith('rookie-')).map(match=>Number(match.id.slice(7))||0))
 const [home,away]=pairs[count%pairs.length]
 return {...plan,matches:[...plan.matches,{id:`rookie-${next}`,kind:'rookie',home,away}]}
}

export function setRookieMatchPair(plan:MatchPlanRecord,id:string,home:string,away:string):MatchPlanRecord{
 if(home===away||!rookiePairs(plan.rookieTeamCount).some(pair=>pair.includes(home)&&pair.includes(away)))return plan
 return {...plan,matches:plan.matches.map(match=>match.id===id&&match.kind==='rookie'?{...match,home,away}:match)}
}

export function moveMatch(plan:MatchPlanRecord,id:string,direction:-1|1):MatchPlanRecord{
 const index=plan.matches.findIndex(match=>match.id===id),other=index+direction
 if(index<0||other<0||other>=plan.matches.length)return plan
 const matches=[...plan.matches]
 ;[matches[index],matches[other]]=[matches[other],matches[index]]
 return {...plan,matches}
}

export function moveMatchTo(plan:MatchPlanRecord,id:string,toIndex:number):MatchPlanRecord{
 const from=plan.matches.findIndex(match=>match.id===id)
 if(from<0||!Number.isInteger(toIndex)||toIndex<0||toIndex>=plan.matches.length||from===toIndex)return plan
 const matches=[...plan.matches]
 const [moved]=matches.splice(from,1)
 matches.splice(toIndex,0,moved)
 return {...plan,matches}
}

export function removeRookieMatch(plan:MatchPlanRecord,id:string):MatchPlanRecord{
 return {...plan,matches:plan.matches.filter(match=>match.id!==id||match.kind!=='rookie')}
}

export function matchTimes(plan:MatchPlanRecord,start:string,duration=20){
 const [hour,minute]=start.split(':').map(Number)
 const format=(minutes:number)=>`${minutes>=1440?'다음날 ':''}${String(Math.floor(minutes/60)%24).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`
 return plan.matches.map((_,index)=>({start:format(hour*60+minute+index*duration),end:format(hour*60+minute+(index+1)*duration)}))
}


/** Check team identity and the full regular round-robin multiset, not just lengths. */
export function validateMatchPlan(plan:MatchPlanRecord,teamIds:string[]):string{
 const base=generateTeamMatches(teamIds);
 if(!base||new Set(teamIds).size!==teamIds.length||plan.teamCount!==teamIds.length)return '저장된 3~4팀에 맞는 경기 순서를 다시 불러와 주세요.';
 if(!Number.isInteger(plan.rookieTeamCount)||plan.rookieTeamCount<2||plan.rookieTeamCount>4)return '신입팀 수는 2~4팀입니다.';
 if(!plan.matches.length||plan.matches.length>100||new Set(plan.matches.map(m=>m.id)).size!==plan.matches.length)return '경기는 1~100개이며 중복된 경기 번호가 없어야 합니다.';
 const rookies=new Set(Array.from({length:plan.rookieTeamCount},(_,i)=>`R${i+1}`)),regular=new Set(teamIds);
 if(plan.matches.some(m=>m.home===m.away||!['regular','rookie'].includes(m.kind)||!(m.kind==='regular'?regular:rookies).has(m.home)||!(m.kind==='regular'?regular:rookies).has(m.away)))return '대진의 팀을 확인해 주세요.';
 const pairs=(p:MatchPlanRecord)=>p.matches.filter(m=>m.kind==='regular').map(m=>JSON.stringify([m.home,m.away].sort())).sort();
 if(JSON.stringify(pairs(base))!==JSON.stringify(pairs(plan)))return '일반 경기의 대진이나 경기 수가 변경되었습니다. 최신 순서를 불러와 주세요.';
 return '';
}
