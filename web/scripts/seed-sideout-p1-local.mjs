import {build} from 'esbuild';
import {getPlatformProxy} from 'wrangler';
import {resolve,join} from 'node:path';
import {mkdir,readFile,readdir,writeFile,lstat,realpath} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';

async function main(){
 const args=process.argv.slice(2),target=resolve('.wrangler/sideout-p1');
 if(args.length!==2||args[0]!=='--state-path'||resolve(args[1])!==target)throw Error('허용된 로컬 시험 경로: .wrangler/sideout-p1');
 const parent=resolve('.wrangler');
 await mkdir(parent,{recursive:true});
 if((await lstat(parent)).isSymbolicLink()||await realpath(parent)!==parent)throw Error('허용된 로컬 시험 경로가 아닙니다.');
 const exists=await lstat(target).catch(()=>null);
 if(exists&&(exists.isSymbolicLink()||!exists.isDirectory()||(await readdir(target)).length))throw Error('시험 경로가 비어 있지 않아 중단합니다.');
 const {outputFiles}=await build({stdin:{contents:"export {accounts,clubs,session,roster,ids} from './tests/fixtures/sideout.ts'; export {hashPassword} from './lib/auth/credentials.ts'; export {makeAuthRepository} from './lib/auth/d1-repository.ts'; export {kstWeekStart,addDays} from './lib/sideout/calendar.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
 const lib=await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
 await mkdir(target,{recursive:true,mode:0o700});
 const proxy=await getPlatformProxy({configPath:resolve('dist/server/wrangler.json'),persist:{path:join(target,'v3')},remoteBindings:false,envFiles:[]});
 try{
  const db=proxy.env.DB;if(!db)throw Error('로컬 D1 바인딩이 없습니다.');
  for(const name of ['0000_windy_omega_red','0001_glamorous_iron_lad','0002_modern_triathlon']){
   const sql=await readFile(`drizzle/${name}.sql`,'utf8');
   for(const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
  }
  const auth=lib.makeAuthRepository(db),credentials=[];
  for(const account of lib.accounts()){
   const password=randomBytes(12).toString('hex')+'Aa1';
   const firstChange=account.id===lib.ids.outsider;
   const loginId='시험'+Object.entries(lib.ids).find(([,id])=>id===account.id)[0];
   await auth.createAccount({...account,loginId,loginIdKey:loginId.toLowerCase(),passwordHash:await lib.hashPassword(password),mustChangePassword:firstChange,temporaryExpiresAt:firstChange?new Date(Date.now()+7*86400000).toISOString():null});
   credentials.push({memberId:account.id,loginId,password,firstChange});
  }
  async function put(kind,id,data){await db.prepare('INSERT INTO workspaces(id,payload,revision) VALUES(?,?,1)').bind(`sideout:${kind}:${id}`,JSON.stringify({schemaVersion:1,data})).run()}
  for(const club of lib.clubs)await put('club',club.id,club);
  const week=lib.kstWeekStart(new Date()),date=lib.addDays(week,6);
  const s={...lib.session,date,deadline:new Date(date+'T00:00:00+09:00').toISOString()};
  await put('session',s.id,s);await put('roster',s.id,lib.roster);
  const second={...s,id:'session-test-heroes',clubId:lib.clubs[1].id,date:lib.addDays(week,5),place:lib.clubs[1].place};
  await put('session',second.id,second);await put('roster',second.id,{...lib.roster,sessionId:second.id,published:null,firstPublishedAt:null,publishedMatches:null});
  const draft={...s,id:'session-test-draft',date:lib.addDays(date,7),phase:'draft'};
  await put('session',draft.id,draft);await put('roster',draft.id,{...lib.roster,sessionId:draft.id,participants:{},published:null,firstPublishedAt:null,publishedMatches:null});
  for(const account of lib.accounts())await put('preferences',account.id,{favoriteClubIds:[lib.clubs[0].id]});
  await writeFile(join(target,'credentials.json'),JSON.stringify(credentials,null,2),{mode:0o600,flag:'wx'});
  console.log('로컬 합성 자료 준비 완료: 계정 8, 모임 2, 회차 3. 자격은 지정 경로의 credentials.json에만 저장했습니다.');
 }finally{await proxy.dispose()}
}
try{await main()}catch(error){console.error(error instanceof Error?error.message:'시험 자료 생성 실패');process.exitCode=1}
