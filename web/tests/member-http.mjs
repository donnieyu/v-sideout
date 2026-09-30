import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-member-http-'));
try{
 const modules=['credentials','accounts','session-token','errors','auth-service','contracts','identity','policy','d1-repository','member-management','member-repository','member-http'];
 for(const name of modules){
  const source=await readFile(new URL(`../lib/auth/${name}.ts`,import.meta.url),'utf8').catch(()=> 'export {}');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
   .replaceAll(/from '\.\/(credentials|accounts|session-token|errors|auth-service|contracts|identity|policy|d1-repository|member-management|member-repository)'/g,"from './$1.mjs'");
  await writeFile(join(dir,`${name}.mjs`),code);
 }
 const {makeAuthRepository}=await import(pathToFileURL(join(dir,'d1-repository.mjs')));
 const {makeMemberRepository}=await import(pathToFileURL(join(dir,'member-repository.mjs')));
 const {hashSessionToken}=await import(pathToFileURL(join(dir,'session-token.mjs')));
 const {handleMemberRequest}=await import(pathToFileURL(join(dir,'member-http.mjs')));
 assert.equal(typeof handleMemberRequest,'function');
 const db=new DatabaseSync(':memory:');
 const migrations=(await readdir(new URL('../drizzle/',import.meta.url))).filter(name=>/^000[0-2]_.*\.sql$/.test(name)).sort();
 for(const name of migrations)db.exec((await readFile(new URL(`../drizzle/${name}`,import.meta.url),'utf8')).replaceAll('--> statement-breakpoint',''));
 let failWrites=false;
 const d1={prepare(sql){return {bind(...args){return {
  async first(){return db.prepare(sql).get(...args)??null},
  async all(){return {results:db.prepare(sql).all(...args)}},
  async run(){if(failWrites)throw new Error('synthetic storage outage');const result=db.prepare(sql).run(...args);return {meta:{changes:result.changes}}},
 }}}},async batch(statements){db.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(await s.run());db.exec('COMMIT');return rows}catch(error){db.exec('ROLLBACK');throw error}}};
 const authRepo=makeAuthRepository(d1),memberRepo=makeMemberRepository(d1);
 const clubIds={exists:async id=>['seoul-demo','heroes'].includes(id)};
 const deps={authRepo,memberRepo,directory:clubIds};
 const now=Date.parse('2026-09-30T00:00:00Z');
 const master={id:'master-1',loginId:'마스터',loginIdKey:'마스터',displayName:'마스터',homeClubId:null,kind:'regular',isMaster:true,
  homeRole:null,grants:[],active:true,passwordHash:'private',mustChangePassword:false,temporaryExpiresAt:null,authVersion:1};
 const regular={...master,id:'regular-1',loginId:'일반',loginIdKey:'일반',displayName:'일반',isMaster:false};
 const pending={...master,id:'pending-1',loginId:'임시',loginIdKey:'임시',isMaster:false,mustChangePassword:true,temporaryExpiresAt:new Date(now+120_000).toISOString()};
 await authRepo.createAccount(master);await authRepo.createAccount(regular);await authRepo.createAccount(pending);
 const masterToken='a'.repeat(64),regularToken='b'.repeat(64),restrictedToken='c'.repeat(64);
 for(const [token,id,restricted] of [[masterToken,master.id,false],[regularToken,regular.id,false],[restrictedToken,pending.id,true]]){
  await authRepo.putSession({tokenHash:await hashSessionToken(token),memberId:id,authVersion:1,restricted,expiresAt:now+60_000});
 }
 const url='https://sideout.example/api/members';
 const request=(method,path='',body=null,token=masterToken,origin='https://sideout.example')=>new Request(`${url}${path}`,{
  method,headers:{...(token?{Cookie:`sideout_session=${token}`}:{}) ,...(body?{'Content-Type':'application/json',Origin:origin}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),
 });
 const call=(action,req,id)=>handleMemberRequest(deps,action,req,id,now);
 const draft={loginId:'나래',displayName:'김나래',homeClubId:'seoul-demo',homeRole:'staff',grants:[],isMaster:false};
 let response=await call('list',request('GET','',null,null));
 assert.equal(response.status,401);
 response=await call('list',request('GET','',null,regularToken));
 assert.equal(response.status,403);
 response=await call('list',request('GET','',null,restrictedToken));
 assert.equal(response.status,403);
 response=await call('create',request('POST','',draft,masterToken,'https://attacker.example'));
 assert.equal(response.status,403);
 response=await call('create',new Request(url,{method:'POST',headers:{Cookie:`sideout_session=${masterToken}`,'Content-Type':'application/json'},body:JSON.stringify(draft)}));
 assert.equal(response.status,403,'member writes require a same-origin Origin header');
 response=await call('create',request('POST','',draft));
 assert.equal(response.status,201);
 const created=await response.json();
 assert.equal(created.member.loginId,'나래');
 assert.equal(created.member.homeClubId,'seoul-demo');
 assert.match(created.temporaryPassword,/^(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{20}$/);
 assert.equal(JSON.stringify(created).includes('passwordHash'),false);
 assert.equal(response.headers.get('Cache-Control'),'no-store');
 const memberId=created.member.memberId;
 response=await call('create',request('POST','',draft));
 assert.equal(response.status,409);
 assert.equal('temporaryPassword' in await response.json(),false);
 response=await call('list',request('GET'));
 const listed=await response.json();
 assert.equal(listed.members.length,4);
 assert.equal(JSON.stringify(listed).includes('private'),false);
 response=await call('detail',request('GET',`/${memberId}`),memberId);
 assert.equal((await response.json()).member.memberId,memberId);
 response=await call('update',request('PATCH',`/${memberId}`,{displayName:'새 나래'}),memberId);
 assert.equal(response.status,200);
 assert.equal((await response.json()).member.displayName,'새 나래');
 response=await call('update',request('PATCH',`/${memberId}`,{loginId:'바뀐아이디'}),memberId);
 assert.equal(response.status,400);
 response=await call('reissue',request('POST',`/${memberId}/reissue`,{}),memberId);
 assert.equal(response.status,200);
 const reissued=await response.json();
 assert.notEqual(reissued.temporaryPassword,created.temporaryPassword);
 assert.equal(reissued.member.mustChangePassword,true);
 response=await call('deactivate',request('POST',`/${memberId}/deactivate`,{}),memberId);
 assert.equal(response.status,200);
 response=await call('create',request('POST','',draft));
 assert.equal(response.status,409,'inactive member keeps the login ID');
 const noDirectory={...deps,directory:{exists:async()=>{throw new Error('club provider unavailable')}}};
 response=await handleMemberRequest(noDirectory,'reactivate',request('POST',`/${memberId}/reactivate`,{}),memberId,now);
 assert.equal(response.status,503,'reactivation checks that stored club rights still belong to known clubs');
 assert.equal('temporaryPassword' in await response.json(),false);
 response=await call('detail',request('GET',`/${memberId}`),memberId);
 assert.equal((await response.json()).member.active,false);
 response=await call('reactivate',request('POST',`/${memberId}/reactivate`,{}),memberId);
 assert.equal(response.status,200);
 const reactivated=await response.json();
 assert.equal(reactivated.member.memberId,memberId);
 assert.equal(reactivated.member.loginId,'나래');
 assert.equal(reactivated.member.active,true);
 assert.notEqual(reactivated.temporaryPassword,reissued.temporaryPassword);
 response=await call('deactivate',request('POST','/master-1/deactivate',{}),master.id);
 assert.equal(response.status,409,'last master cannot be disabled');
 response=await call('create',request('POST','',{...draft,loginId:'새회원',homeClubId:'missing'}));
 assert.equal(response.status,400);
 response=await call('create',request('POST','',{...draft,loginId:'무소속',homeClubId:null,homeRole:null},masterToken));
 assert.equal(response.status,201);
 response=await handleMemberRequest(noDirectory,'create',request('POST','',{...draft,loginId:'미설정'}),undefined,now);
 assert.equal(response.status,503);
 let factoryCalls=0;
 response=await handleMemberRequest(()=>{factoryCalls++;return deps},'list',request('GET'),undefined,now);
 assert.equal(response.status,200);
 assert.equal(factoryCalls,1);
 response=await handleMemberRequest(()=>{throw new Error('D1 binding unavailable')},'list',request('GET'),undefined,now);
 assert.equal(response.status,503);
 failWrites=true;
 response=await call('reissue',request('POST',`/${memberId}/reissue`,{}),memberId);
 assert.equal(response.status,503);
 assert.equal('temporaryPassword' in await response.json(),false);
 db.close();
 console.log('PASS member HTTP: master only, one-time credentials, CRUD, origin, conflicts and storage failure');
}finally{await rm(dir,{recursive:true,force:true})}
