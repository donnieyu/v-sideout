import assert from 'node:assert/strict';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-auth-contract-'));
try{
 for(const name of ['credentials','accounts','session-token','errors','auth-service','contracts','identity']){
  const source=await readFile(new URL(`../lib/auth/${name}.ts`,import.meta.url),'utf8').catch(()=> 'export {}');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
   .replaceAll(/from '\.\/(credentials|accounts|session-token|errors|auth-service|contracts)'/g,"from './$1.mjs'");
  await writeFile(join(dir,`${name}.mjs`),code);
 }
 const {hashSessionToken}=await import(pathToFileURL(join(dir,'session-token.mjs')));
 const {effectiveClubGrants,getMemberIdentity,resolveVerifiedIdentity,toSessionView}=await import(pathToFileURL(join(dir,'identity.mjs')));
 const now=Date.parse('2026-09-30T00:00:00Z');
 const token='a'.repeat(64);
 const hash=await hashSessionToken(token);
 const account={id:'u1',loginId:'나래',loginIdKey:'나래',displayName:'김나래',homeClubId:'club-a',kind:'regular',isMaster:false,
  homeRole:'chair',grants:[{clubId:'club-b',role:'staff'}],active:true,passwordHash:'private-hash',email:'private@example.com',
  mustChangePassword:false,temporaryExpiresAt:null,authVersion:3};
 const members=new Map([[account.id,account]]);
 const sessions=new Map([[hash,{tokenHash:hash,memberId:account.id,authVersion:3,restricted:false,expiresAt:now+60_000}]]);
 const repo={getById:async id=>members.get(id)??null,getSession:async key=>sessions.get(key)??null};

 const active=await resolveVerifiedIdentity(repo,token,now);
 assert.equal(active.state,'active');
 assert.deepEqual(active.principal,{memberId:'u1',homeClubId:'club-a',isMaster:false,
  grants:[{clubId:'club-a',role:'chair'},{clubId:'club-b',role:'staff'}],authorizationVersion:3});
 assert.equal(JSON.stringify(active).includes('private'),false);
 const view=toSessionView({state:'active',account,expiresAt:now+60_000});
 assert.deepEqual(view,{state:'active',me:{memberId:'u1',loginId:'나래',displayName:'김나래',homeClubId:'club-a'},authorizationVersion:3});
 assert.deepEqual(Object.keys(view.me).sort(),['displayName','homeClubId','loginId','memberId']);
 assert.equal(JSON.stringify(view).includes('private'),false);

 assert.deepEqual(effectiveClubGrants({...account,grants:[{clubId:'club-a',role:'staff'},{clubId:'club-b',role:'chair'},{clubId:'club-a',role:'chair'}]}),
  [{clubId:'club-a',role:'staff'},{clubId:'club-b',role:'chair'}],'explicit role wins and duplicate clubs do not multiply grants');
 assert.deepEqual(effectiveClubGrants({...account,homeRole:null,grants:[]}),[],'membership alone gives no operator grant');
 assert.deepEqual(effectiveClubGrants({...account,homeClubId:null,homeRole:'chair',grants:[]}),[]);
 const master={...account,id:'master',homeClubId:null,homeRole:null,isMaster:true,grants:[]};
 assert.deepEqual(effectiveClubGrants(master),[],'master does not create synthetic club grants');
 members.set(account.id,{...account,homeClubId:null,homeRole:null,grants:[]});
 const unaffiliated=await resolveVerifiedIdentity(repo,token,now);
 assert.equal(unaffiliated.principal.homeClubId,null);
 assert.deepEqual(unaffiliated.principal.grants,[]);

 const temporaryExpiry=now+30_000;
 members.set(account.id,{...account,mustChangePassword:true,temporaryExpiresAt:new Date(temporaryExpiry).toISOString()});
 sessions.set(hash,{...sessions.get(hash),restricted:true,expiresAt:now+60_000});
 const restricted=await resolveVerifiedIdentity(repo,token,now);
 assert.deepEqual(restricted,{state:'password_change_required',expiresAt:new Date(temporaryExpiry).toISOString()});
 assert.deepEqual(toSessionView({state:'password_change_required',account:members.get(account.id),expiresAt:temporaryExpiry}),restricted);
 assert.equal((await resolveVerifiedIdentity(repo,token,temporaryExpiry)).state,'anonymous','temporary credential expires at exact instant');
 members.set(account.id,{...members.get(account.id),temporaryExpiresAt:new Date(now+120_000).toISOString()});
 assert.deepEqual(await resolveVerifiedIdentity(repo,token,now),{state:'password_change_required',expiresAt:new Date(now+60_000).toISOString()},'session expiry is the earlier limit');
 assert.equal((await resolveVerifiedIdentity(repo,token,now+60_000)).state,'anonymous','session expires at exact instant');
 members.set(account.id,{...members.get(account.id),temporaryExpiresAt:null});
 assert.equal((await resolveVerifiedIdentity(repo,token,now)).state,'anonymous','missing temporary expiry cannot grant a restricted session');

 sessions.set(hash,{...sessions.get(hash),restricted:false});
 members.set(account.id,{...account,active:false});
 assert.equal((await resolveVerifiedIdentity(repo,token,now)).state,'anonymous','inactive account cannot use a session');
 assert.deepEqual(await getMemberIdentity(repo,'u1'),{memberId:'u1',loginId:'나래',displayName:'김나래',homeClubId:'club-a'},'internal history lookup can identify inactive members');
 assert.equal(await getMemberIdentity(repo,'absent'),null);
 members.set(account.id,{...account,authVersion:4});
 assert.equal((await resolveVerifiedIdentity(repo,token,now)).state,'anonymous','old authorization version is revoked');
 await assert.rejects(()=>resolveVerifiedIdentity({...repo,getSession:async()=>{throw new Error('storage unavailable')}},token,now),/storage unavailable/,
  'storage failure must not be treated as an anonymous session');
 assert.deepEqual(await resolveVerifiedIdentity(repo,'invalid-token',now),{state:'anonymous'});
 assert.deepEqual(await resolveVerifiedIdentity(repo,null,now),{state:'anonymous'});
 console.log('PASS auth contract: minimal DTO, effective grants, restricted expiry, revocation and identity lookup');
}finally{await rm(dir,{recursive:true,force:true})}
