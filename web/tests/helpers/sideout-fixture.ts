import {testDatabase} from './sideout-d1';
import {makeAuthRepository} from '../../lib/auth/d1-repository';
import {makeSideoutStore} from '../../lib/server/sideout-store';
import {hashSessionToken} from '../../lib/auth/session-token';
import {accounts,clubs,session,roster,ids} from '../fixtures/sideout';
export async function queryFixture(){
 const f=testDatabase(),authRepo=makeAuthRepository(f.db);const now=new Date('2026-09-30T01:00:00Z');
 for(const a of accounts())await authRepo.createAccount(a);
 for(const c of clubs)f.put('club',c.id,c);
 f.put('session',session.id,session);f.put('roster',session.id,roster);
 f.put('session','hidden',{...session,id:'hidden',phase:'draft',date:'2026-10-03'});f.put('roster','hidden',{...roster,sessionId:'hidden'});
 const store=makeSideoutStore(f.db),deps={authRepo,store,now:()=>now};
 async function request(memberId:string|null=ids.applicant,url='http://local/api/sessions/session-test-open'){
  if(!memberId)return new Request(url);
  const token=memberId.replaceAll('-','').padEnd(64,'a');
  await authRepo.putSession({tokenHash:await hashSessionToken(token),memberId,authVersion:1,restricted:false,expiresAt:now.getTime()+60000});
  return new Request(url,{headers:{cookie:`sideout_session=${token}`}});
 }
 return {...f,deps,request,now};
}
