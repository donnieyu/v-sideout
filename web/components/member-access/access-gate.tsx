'use client';

import {useCallback,useEffect,useState,type ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import {MemberAccessError,memberAccessClient,type MemberAccessClient} from '@/lib/member-access-client';
import type {SessionView} from '@/lib/auth/contracts';
import {LoginForm} from './login-form';
import {PasswordChangeForm} from './password-change-form';
import styles from './member-access.module.css';

type ActiveSession=Extract<SessionView,{state:'active'}>;
type ActiveActions={changePassword:()=>void;logout:()=>Promise<void>};
type Props={client?:MemberAccessClient;onJoinRequest?:()=>void;renderActive?:(session:ActiveSession,actions:ActiveActions)=>ReactNode};

export function MemberAccessGate({client=memberAccessClient,onJoinRequest,renderActive}:Props){
 const [session,setSession]=useState<SessionView|null>(null);
 const [checking,setChecking]=useState(true);
 const [error,setError]=useState('');
 const [changing,setChanging]=useState(false);
 const refresh=useCallback(async()=>{
  setChecking(true);setError('');
  try{setSession(await client.session())}
  catch(caught){setError(caught instanceof MemberAccessError?caught.message:'접속 상태를 확인하지 못했습니다.');setSession(null)}
  finally{setChecking(false)}
 },[client]);
 useEffect(()=>{
  let current=true;
  void client.session().then(value=>{if(current)setSession(value)})
   .catch(caught=>{if(current)setError(caught instanceof MemberAccessError?caught.message:'접속 상태를 확인하지 못했습니다.')})
   .finally(()=>{if(current)setChecking(false)});
  return()=>{current=false};
 },[client]);

 async function logout(){
  setError('');
  try{await client.logout();setChanging(false);setSession({state:'anonymous'})}
  catch(caught){setError(caught instanceof MemberAccessError?caught.message:'로그아웃하지 못했습니다. 다시 시도해 주세요.')}
 }

 if(checking)return <main className={styles.accessStage}><div className={styles.accessPanel}><p role="status" className={styles.loading}>접속 상태를 확인하고 있습니다…</p></div></main>;
 if(error&&!session)return <main className={styles.accessStage}><div className={styles.accessPanel}><div className={styles.brandRow}><span className={styles.brandMark} aria-hidden="true"/><span>SIDEOUT</span></div><h1>접속 상태를 확인할 수 없습니다</h1><p role="alert" className={styles.error}>{error}</p><Button onClick={()=>void refresh()} className={styles.primaryButton}>다시 시도</Button></div></main>;
 if(!session||session.state==='anonymous')return <main className={styles.accessStage}><LoginForm client={client} onSession={setSession} onJoinRequest={onJoinRequest}/></main>;
 if(session.state==='password_change_required')return <main className={styles.accessStage}><PasswordChangeForm client={client} firstLogin expiresAt={session.expiresAt} onChanged={()=>void refresh()} onLogout={()=>void logout()}/>{error&&<p role="alert" className={styles.floatingError}>{error}</p>}</main>;
 if(changing)return <main className={styles.accessStage}><PasswordChangeForm client={client} firstLogin={false} onChanged={()=>{setChanging(false);void refresh()}} onCancel={()=>setChanging(false)}/></main>;
 if(renderActive)return <>{renderActive(session,{changePassword:()=>setChanging(true),logout})}</>;
 return <main className={styles.accessStage}><div className={styles.accessPanel}>
  <div className={styles.brandRow}><span className={styles.brandMark} aria-hidden="true"/><span>SIDEOUT</span></div>
  <div className={styles.panelIntro}><h1>{session.me.displayName}님, 반갑습니다</h1><p>로그인이 완료되었습니다. 모임으로 이동할 준비가 되었습니다.</p></div>
  <div className={styles.accountSummary}><span>로그인 아이디</span><strong>{session.me.loginId}</strong><span>소속 모임</span><strong>{session.me.homeClubId??'무소속'}</strong></div>
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  <div className={styles.actionRow}><Button variant="outline" onClick={()=>setChanging(true)}>비밀번호 변경</Button><Button variant="ghost" onClick={()=>void logout()}>로그아웃</Button></div>
 </div></main>;
}
