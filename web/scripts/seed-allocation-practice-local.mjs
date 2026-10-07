// Adds explicitly synthetic allocation practice data to the existing local test DB.
// Never overwrites an existing session, roster, member or profile; never uses remote D1.
import {build} from 'esbuild';
import {getPlatformProxy} from 'wrangler';
import {resolve,join} from 'node:path';
import {readFile,writeFile,lstat,realpath} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const target=resolve('.wrangler/sideout-p1');
if(process.argv[2]!=='--state-path'||resolve(process.argv[3]??'')!==target)throw Error('허용된 시험 경로를 지정해 주세요.');
for(const path of [resolve('.wrangler'),target])if((await lstat(path)).isSymbolicLink()||await realpath(path)!==path)throw Error('허용된 로컬 경로가 아닙니다.');
const credentials=JSON.parse(await readFile(join(target,'credentials.json'),'utf8'));if(!credentials.some(c=>c.loginId==='시험master'))throw Error('시험 DB 표시가 없습니다.');
const bundle=await build({stdin:{contents:"export {hashPassword} from './lib/auth/credentials.ts';export {makeAuthRepository} from './lib/auth/d1-repository.ts';export {kstWeekStart,addDays} from './lib/sideout/calendar.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const lib=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const proxy=await getPlatformProxy({configPath:resolve('dist/server/wrangler.json'),persist:{path:join(target,'v3')},remoteBindings:false,envFiles:[]});
try{
 const db=proxy.env.DB,auth=lib.makeAuthRepository(db),clubRow=await db.prepare('SELECT payload FROM workspaces WHERE id=?').bind('sideout:club:club-test-nb').first();
 if(!clubRow)throw Error('뉴배동 시험 모임이 없습니다.');const club=JSON.parse(clubRow.payload).data;if(!club.name.includes('시험'))throw Error('실제 모임에는 시험 데이터를 넣지 않습니다.');
 const names=['강도윤','김서준','박시우','이하준','최지호','정예준','한도현','오수빈','윤지후','임건우','조시윤','신민준','서유진','장준서','김하늘빛','배서현','문지안','송하린','권예린','홍시온','유다은','안수호','차은우','백나린','노지안','심현우','전하윤','남도겸'];
 const main=['S','S','S',...Array(6).fill('OH'),...Array(6).fill('MB'),...Array(3).fill('OP'),'S','OH','OH','MB','MB',...Array(5).fill('OP')];
 const sub={S:'OP',OH:'MB',MB:'OP',OP:'OH'},members=[];
 for(let i=0;i<28;i++){
  const id='00000000-0000-4000-9000-'+String(i+1).padStart(12,'0'),loginId='배정시험'+String(i+1).padStart(2,'0');
  const old=await db.prepare('SELECT login_id FROM auth_members WHERE id=?').bind(id).first();
  if(old&&old.login_id!==loginId)throw Error('시험 회원 ID 충돌');
  if(!old)await auth.createAccount({id,loginId,loginIdKey:loginId,displayName:names[i],homeClubId:i<23?club.id:'club-test-heroes',kind:'regular',isMaster:false,homeRole:null,grants:[],active:true,passwordHash:await lib.hashPassword(randomBytes(24).toString('hex')+'Aa1'),mustChangePassword:false,temporaryExpiresAt:null,authVersion:1});
  await db.prepare('INSERT OR IGNORE INTO member_position_profiles(member_id,main_position,sub_position,created_at) VALUES(?,?,?,?)').bind(id,main[i],sub[main[i]],new Date().toISOString()).run();
  members.push({id,name:names[i],position:main[i],secondary:sub[main[i]],initialApplicant:i<18});
 }
 const id='session-allocation-practice-20261003';let existing=await db.prepare('SELECT payload FROM workspaces WHERE id=?').bind('sideout:session:'+id).first();
 let session;
 if(existing)session=JSON.parse(existing.payload).data;
 else{
  const sessions=(await db.prepare("SELECT payload FROM workspaces WHERE id LIKE 'sideout:session:%'").all()).results.map(r=>JSON.parse(r.payload).data);
  let date=lib.addDays(lib.kstWeekStart(new Date()),6);
  while(Date.parse(date+'T'+club.start+':00+09:00')<=Date.now()||sessions.some(s=>s.clubId===club.id&&s.date===date))date=lib.addDays(date,7);
  session={id,clubId:club.id,date,entry:club.entry,start:club.start,end:club.end,place:'팀편성 실습 · 가상 체육관',notice:'가상 선수 28명으로 팀편성을 시험하는 일정입니다. 최초 신청자는 18명이며 명단의 참가자 추가로 28명까지 늘릴 수 있습니다.',phase:'open',deadline:new Date(date+'T08:00:00+09:00').toISOString(),priorityUntil:null,cap:28};
  const roster={sessionId:id,participants:Object.fromEntries(members.slice(0,18).map((m,i)=>[m.id,{status:'applied',source:'manager',registeredAt:new Date().toISOString(),order:i+1}])),draft:{teams:[]},published:null,firstPublishedAt:null,draftMatches:null,publishedMatches:null};
  await db.batch([['session',session],['roster',roster]].map(([kind,data])=>db.prepare('INSERT INTO workspaces(id,payload,revision) VALUES(?,?,1)').bind(`sideout:${kind}:${id}`,JSON.stringify({schemaVersion:1,data}))));
 }
 const manifest={sessionId:id,date:session.date,weekStart:lib.kstWeekStart(new Date(session.date+'T12:00:00+09:00')),clubId:club.id,members};
 await writeFile(join(target,'allocation-practice.json'),JSON.stringify(manifest,null,2),{mode:0o600});
 console.log(JSON.stringify({sessionId:id,date:session.date,weekStart:manifest.weekStart,syntheticMembers:28,initialApplicants:18,additionalMembers:10,preservedExistingSession:!!existing}));
}finally{await proxy.dispose()}
