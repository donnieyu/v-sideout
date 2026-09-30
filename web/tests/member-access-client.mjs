import assert from 'node:assert/strict';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-access-client-'));
try{
 const source=await readFile(new URL('../lib/member-access-client.ts',import.meta.url),'utf8').catch(()=> 'export {}');
 await writeFile(join(dir,'member-access-client.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
 const {createMemberAccessClient,MemberAccessError}=await import(pathToFileURL(join(dir,'member-access-client.mjs')));
 assert.equal(typeof createMemberAccessClient,'function');
 const calls=[];
 const member={memberId:'m2',loginId:'새회원',displayName:'새회원',homeClubId:null,kind:'regular',isMaster:false,homeRole:null,grants:[],active:true,mustChangePassword:true,temporaryExpiresAt:'2026-10-07T00:00:00.000Z',authorizationVersion:1};
 const responses=[
  Response.json({state:'anonymous'}),
  Response.json({state:'password_change_required'}),
  Response.json({state:'active',me:{memberId:'m1',loginId:'나래',displayName:'나래',homeClubId:null},authorizationVersion:2}),
  Response.json({state:'active',me:{memberId:'m1',loginId:'나래',displayName:'나래',homeClubId:null},authorizationVersion:2}),
  Response.json({members:[]}),
  Response.json({member,temporaryPassword:'Abc12345678'},{status:201}),
  Response.json({member}),
  Response.json({member,temporaryPassword:'New12345678'}),
  Response.json({member}),
  Response.json({member,temporaryPassword:'Again12345678'}),
  Response.json({state:'anonymous'}),
 ];
 const client=createMemberAccessClient(async(url,options)=>{calls.push({url,options});return responses.shift()});
 assert.deepEqual(await client.session(),{state:'anonymous'});
 assert.equal((await client.login('나래','Temp1234')).state,'password_change_required');
 assert.equal((await client.changePassword('Temp1234','Newpass123')).state,'active');
 assert.equal((await client.session()).state,'active');
 assert.deepEqual(await client.listMembers(),[]);
 const draft={loginId:'새회원',displayName:'새회원',homeClubId:null,homeRole:null,grants:[],isMaster:false};
 assert.equal((await client.createMember(draft)).temporaryPassword,'Abc12345678');
 assert.equal((await client.updateMember('m2',{displayName:'새 이름'})).member.memberId,'m2');
 assert.equal((await client.reissue('m2')).temporaryPassword,'New12345678');
 assert.equal((await client.deactivate('m2')).member.memberId,'m2');
 assert.equal((await client.reactivate('m2')).temporaryPassword,'Again12345678');
 assert.equal((await client.logout()).state,'anonymous');
 assert.deepEqual(calls.map(call=>call.url),[
  '/api/auth/session','/api/auth/login','/api/auth/password','/api/auth/session','/api/members',
  '/api/members','/api/members/m2','/api/members/m2/reissue','/api/members/m2/deactivate','/api/members/m2/reactivate','/api/auth/logout',
 ]);
 for(const {options} of calls){assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store')}
 assert.deepEqual(JSON.parse(calls[5].options.body),draft);
 assert.equal(JSON.stringify(calls).includes('Origin'),false,'browser supplies Origin, never forge it in the client');
 assert.equal(calls[1].options.method,'POST');
 assert.equal(calls[6].options.method,'PATCH');

 const errorClient=createMemberAccessClient(async()=>Response.json({error:{code:'CONFLICT',message:'아이디가 사용 중입니다.'}},{status:409}));
 await assert.rejects(()=>errorClient.createMember(draft),error=>error instanceof MemberAccessError&&error.code==='CONFLICT'&&error.status===409);
 const offline=createMemberAccessClient(async()=>{throw new TypeError('private network details')});
 await assert.rejects(()=>offline.session(),error=>error instanceof MemberAccessError&&error.code==='NETWORK_ERROR'&&!error.message.includes('private'));
 const malformed=createMemberAccessClient(async()=>new Response('broken',{status:200}));
 await assert.rejects(()=>malformed.session(),error=>error instanceof MemberAccessError&&error.code==='STORAGE_UNAVAILABLE');
 const invalidSession=createMemberAccessClient(async()=>Response.json({state:'unexpected'}));
 await assert.rejects(()=>invalidSession.session(),error=>error instanceof MemberAccessError&&error.code==='STORAGE_UNAVAILABLE');
 const invalidMembers=createMemberAccessClient(async()=>Response.json({members:{}}));
 await assert.rejects(()=>invalidMembers.listMembers(),error=>error instanceof MemberAccessError&&error.code==='STORAGE_UNAVAILABLE');
 const invalidMemberRow=createMemberAccessClient(async()=>Response.json({members:[null]}));
 await assert.rejects(()=>invalidMemberRow.listMembers(),error=>error instanceof MemberAccessError&&error.code==='STORAGE_UNAVAILABLE');
 const incompleteMember=createMemberAccessClient(async()=>Response.json({member:{memberId:'m2'}}));
 await assert.rejects(()=>incompleteMember.member('m2'),error=>error instanceof MemberAccessError&&error.code==='STORAGE_UNAVAILABLE');
 const missingCredential=createMemberAccessClient(async()=>Response.json({member}));
 await assert.rejects(()=>missingCredential.createMember(draft),error=>error instanceof MemberAccessError&&error.code==='STORAGE_UNAVAILABLE');
 console.log('PASS member access client: auth states, member commands, safe transport and errors');
}finally{await rm(dir,{recursive:true,force:true})}
