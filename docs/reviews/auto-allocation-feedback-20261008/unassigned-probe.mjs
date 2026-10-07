import {createRequire} from 'node:module';import {readFile,writeFile} from 'node:fs/promises';
const web=process.cwd(),require=createRequire(web+'/package.json'),{build}=require('esbuild');
const r=await build({stdin:{contents:"export {autoFillBoard,allocationReducer,isPending} from './components/sideout/allocation/allocation-ab-model';export {createTeam,adjustExtraSlots,placeOnBoard} from './components/sideout/allocation/position-board-model'",resolveDir:web,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {autoFillBoard,allocationReducer,isPending,createTeam,adjustExtraSlots,placeOnBoard}=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
const people=(n,overrides={})=>Array.from({length:n},(_,i)=>({id:'p'+i,name:'선수'+i,club:'시험',position:'레프트',secondary:'레프트',status:'신청자',active:true,...overrides}));
const board=(n=18)=>adjustExtraSlots(['A','B','C'].map(id=>createTeam(id)),n);
const records=[];
function run(name,b,p,expected){const out=autoFillBoard(b,p),placed=new Set(out.flatMap(t=>t.slots.flatMap(s=>s.playerId?[s.playerId]:[])));const active=p.filter(p=>p.status==='신청자'&&p.active!==false),remaining=active.filter(p=>!placed.has(p.id));const row={name,applicants:active.length,assigned:active.length-remaining.length,remaining:remaining.length,empty:out.flatMap(t=>t.slots).filter(s=>!s.playerId).length};if(expected!==row.remaining)throw Error(JSON.stringify(row));records.push(row)}
run('18 all OH',board(),people(18),0);
run('18 only setters',board(),people(18,{position:'세터',secondary:'세터'}),0);
run('18 primary registered / secondary missing',board(),people(18,{secondary:'미등록'}),0);
run('18 with 4 missing profiles',board(),people(18).map((p,i)=>i<4?{...p,position:'미등록',secondary:'미등록'}:p),4);
run('21 / manual 18 seats',board(),people(21),3);
run('28 / auto 30 seats',board(28),people(28),0);
for(const status of ['대기자','미신청 회원']){
 const extras=people(3,{status}).map((p,i)=>({...p,id:'e'+i}));let b=board();for(let i=0;i<3;i++)b=placeOnBoard(b,b[i].id,'2',extras[i].id);
 run('18 / 3 existing '+status,b,[...people(18),...extras],3);
}
const inactive=people(3,{active:false}).map((p,i)=>({...p,id:'inactive'+i}));let b=board();for(let i=0;i<3;i++)b=placeOnBoard(b,b[i].id,'2',inactive[i].id);
run('18 active / 3 retained inactive occupied',b,[...people(18),...inactive],3);
run('18 includes 4 newly inactive',board(),people(18).map((p,i)=>i<4?{...p,active:false}:p),0);
run('14 registered + 4 missing, 4 waiting',board(),[...people(18).map((p,i)=>i<4?{...p,position:'미등록'}:p),...people(4,{status:'대기자'}).map((p,i)=>({...p,id:'w'+i}))],4);
run('18 eligible + unregistered outside pool',board(),[...people(18),...people(4,{status:'미신청 회원'}).map((p,i)=>({...p,id:'u'+i}))],0);
// Deterministic generated cases verify that eligible unassigned applicants do not coexist with empty valid slots.
let seed=811;const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n};const roles=['세터','레프트','센터','라이트','미등록'];
for(let i=0;i<2000;i++){
 const p=people(rnd(33)).map((p,j)=>({...p,position:roles[rnd(5)],secondary:roles[rnd(5)],active:rnd(10)!==0,status:rnd(5)===0?'대기자':'신청자'}));let b=board([18,21,24,27,30][rnd(5)]);
 for(const p0 of p)if(rnd(4)===0){const t=b[rnd(3)],s=t.slots[rnd(t.slots.length)];if(!s.playerId)b=placeOnBoard(b,t.id,s.id,p0.id)}
 const out=autoFillBoard(b,p),used=new Set(out.flatMap(t=>t.slots.flatMap(s=>s.playerId?[s.playerId]:[])));const eligible=p.filter(p=>p.active&&p.position!=='미등록'&&p.status==='신청자'&&!used.has(p.id));
 if(eligible.length&&out.some(t=>t.slots.some(s=>!s.playerId)))throw Error('Unexpected eligible candidates with vacancies in generated case '+i);
}
console.log(JSON.stringify({cases:records,generatedCases:2000,invariant:'No active profile-registered unassigned applicant coexists with a valid empty seat after autoFillBoard'},null,2));
